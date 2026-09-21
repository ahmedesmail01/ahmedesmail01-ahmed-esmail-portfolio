import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { installSylvaScheduler } from './sylva-performance-runtime.mjs';

function harness(mobile = false) {
  const scheduled = new Map();
  const observers = [];
  const timers = new Map();
  let nextId = 0;
  let now = 0;
  function eventTarget() {
    const handlers = new Map();
    return {
      addEventListener(name, handler) { handlers.set(name, handler); },
      removeEventListener(name) { handlers.delete(name); },
      emit(name, event) { handlers.get(name)?.(event); },
    };
  }
  const parent = { ...eventTarget(), document: {} };
  const window = { ...eventTarget(), location: { origin: 'https://portfolio.test' }, parent, matchMedia: () => ({ matches: mobile }) };
  const document = { ...eventTarget(), hidden: false };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
  }
  window.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(`(${installSylvaScheduler.toString()})();`, {
    window, document, IntersectionObserver,
    requestAnimationFrame(callback) { scheduled.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { scheduled.delete(id); },
    setTimeout(callback) { timers.set(++nextId, callback); return nextId; },
    clearTimeout(id) { timers.delete(id); },
  });
  return {
    window, parent, document, observers, scheduled, timers,
    settleScroll() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(callback => callback());
    },
    loop: window.__sylvaRuntime.createLoop,
    frame(elapsed = 17) {
      now += elapsed;
      const callbacks = [...scheduled.values()];
      scheduled.clear();
      callbacks.forEach((callback) => callback(now));
    },
    host(visible, origin = window.location.origin) {
      window.emit('message', { source: window.parent, origin, data: { type: 'threeui:visibility', visible } });
    },
  };
}

test('mobile scroll pauses all scene work until scrolling settles', () => {
  const h = harness(true);
  let draws = 0;
  const loop = h.loop(() => { draws++; return true; }, {});
  loop.invalidate();
  h.frame();
  h.parent.emit('scroll');
  assert.equal(h.scheduled.size, 0);
  loop.invalidate();
  h.window.emit('touchmove');
  h.parent.emit('scroll');
  h.frame();
  assert.equal(draws, 1);
  assert.equal(h.timers.size, 1, 'Repeated events replace the resume timer');
  h.settleScroll();
  h.frame();
  assert.equal(draws, 2);
  h.parent.emit('scroll');
  h.host(false);
  h.settleScroll();
  assert.equal(h.scheduled.size, 0, 'Finishing a scroll cannot wake an offscreen hero');
});

test('desktop scroll keeps playback running and mobile cleanup removes parent listeners', () => {
  const desktop = harness();
  desktop.loop(() => true, {}).invalidate();
  desktop.parent.emit('scroll');
  assert.equal(desktop.scheduled.size, 1);
  assert.equal(desktop.timers.size, 0);
  const mobile = harness(true);
  mobile.parent.emit('scroll');
  mobile.window.emit('pagehide', { persisted: false });
  mobile.parent.emit('scroll');
  assert.equal(mobile.timers.size, 0);
});

test('mobile playback caps draws at 30 FPS even with repeated invalidation', () => {
  const h = harness(true);
  let draws = 0;
  const loop = h.loop(() => { draws++; return true; }, {});
  loop.invalidate();
  for (let i = 0; i < 120; i++) {
    loop.invalidate();
    h.frame(1000 / 120);
  }
  assert.equal(draws, 30);
  h.host(false);
  assert.equal(h.scheduled.size, 0);
  h.host(true);
  h.frame(1);
  assert.equal(draws, 31, 'Resuming visibility should paint immediately');
});

test('mobile static scenes stop scheduling and redraw after invalidation', () => {
  const h = harness(true);
  let draws = 0;
  const loop = h.loop(() => { draws++; return false; }, {});
  loop.invalidate();
  h.frame();
  assert.equal(h.scheduled.size, 0);
  loop.invalidate();
  h.frame();
  assert.equal(draws, 1, 'Invalidation must respect the mobile frame budget');
  h.frame();
  assert.equal(draws, 2);
  assert.equal(h.scheduled.size, 0);
});

test('continuous playback suspends offscreen and resumes once without duplicate frames', () => {
  const h = harness();
  let draws = 0;
  const loop = h.loop(() => { draws++; }, {});
  loop.invalidate();
  loop.invalidate();
  assert.equal(h.scheduled.size, 1);
  h.frame();
  assert.equal(draws, 1);
  h.host(false);
  assert.equal(h.scheduled.size, 0);
  loop.invalidate();
  assert.equal(h.scheduled.size, 0);
  h.host(true);
  h.frame();
  assert.equal(draws, 2);
  assert.equal(h.scheduled.size, 1);
});

test('a reduced-motion scene stays idle until explicitly invalidated', () => {
  const h = harness();
  let draws = 0;
  const loop = h.loop(() => { draws++; return false; }, {});
  loop.invalidate();
  h.frame();
  assert.equal(h.scheduled.size, 0);
  loop.invalidate();
  h.frame();
  assert.equal(draws, 2);
  assert.equal(h.scheduled.size, 0);
});

test('document visibility and element visibility both gate playback', () => {
  const h = harness();
  const loop = h.loop(() => true, {});
  loop.invalidate();
  h.document.hidden = true;
  h.document.emit('visibilitychange');
  assert.equal(h.scheduled.size, 0);
  h.observers[0].callback([{ isIntersecting: false, boundingClientRect: { width: 0, height: 0 } }]);
  h.document.hidden = false;
  h.document.emit('visibilitychange');
  assert.equal(h.scheduled.size, 0);
  h.observers[0].callback([{ isIntersecting: true, boundingClientRect: { width: 300, height: 200 } }]);
  assert.equal(h.scheduled.size, 1);
});

test('messages from a different origin cannot change playback', () => {
  const h = harness();
  h.loop(() => true, {}).invalidate();
  h.host(false, 'https://unrelated.test');
  assert.equal(h.scheduled.size, 1);
});

test('generated scripts parse and all local script, style and image URLs resolve', async () => {
  const root = new URL('../', import.meta.url);
  const assetDirectory = new URL('public/landing-pages/assets/', root);
  for (const filename of await readdir(assetDirectory)) {
    if (!filename.startsWith('sylva-') || !filename.endsWith('.js')) continue;
    new vm.Script(await readFile(new URL(filename, assetDirectory), 'utf8'), { filename });
  }
  const html = await readFile(new URL('public/landing-pages/inner-green-3d.html', root), 'utf8');
  for (const [, path] of html.matchAll(/(?:src|href)="(\/(?:landing-pages|images)\/[^"#]+)"/g)) {
    await readFile(new URL(`public${path}`, root));
  }
  assert.ok(html.includes('srcset='), 'The hero cards should use responsive images');
  assert.ok(html.includes('<script defer'), 'The scene scripts should not block HTML parsing');
});

test('a reduced-motion resize skipped by the idle throttle is painted on the next eligible frame', async () => {
  const directory = new URL('../public/landing-pages/assets/', import.meta.url);
  const filename = (await readdir(directory)).find((name) => name.startsWith('sylva-runtime-2.') && name.endsWith('.js'));
  const script = await readFile(new URL(filename, directory), 'utf8');
  const start = script.indexOf('function frame(now){');
  const end = script.indexOf('  for(let i = 0; i < uArr.length;', start);
  assert.ok(start > 0 && end > start, 'Expected the liquid-button scheduling and throttle block');
  const context = vm.createContext({
    pendingPointer: null,
    last: 100, clock: 0,
    hover: 0, hoverTarget: 0, press: 0, pressTarget: 0,
    calm: { matches: true }, RIP: [], ripArr: [],
    R: { ptrLag: 0.5, ptrVref: 1 },
    ptr: { x: 0, y: 0 }, ptrS: { x: 0, y: 0 }, ptrSpeed: 0, ptrAmt: 0,
    on: { over: false, press: false, focus: false },
    needResize: false, W: 200, H: 100,
    drawn: '0|0|100|100', lastDraw: 100, IDLE_HZ: 30, draws: 0,
  });
  vm.runInContext(`${script.slice(start, end)}draws++; return true; }`, context);
  assert.equal(vm.runInContext('frame(110)', context), true);
  assert.equal(context.draws, 0);
  assert.equal(context.drawn, '0|0|100|100', 'A skipped draw must not claim the resized buffer was painted');
  vm.runInContext('frame(140)', context);
  assert.equal(context.draws, 1);
  assert.equal(context.drawn, '0|0|200|100');
  assert.equal(vm.runInContext('frame(157)', context), false);
  assert.equal(context.draws, 1);
});
