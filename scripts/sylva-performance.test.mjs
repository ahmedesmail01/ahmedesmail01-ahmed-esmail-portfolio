import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import * as THREE from 'three';
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
    const script = await readFile(new URL(filename, assetDirectory), 'utf8');
    new vm.Script(script, { filename });
    for (const [, path] of script.matchAll(/["'](\/landing-pages\/assets\/[^"']+)["']/g)) {
      await readFile(new URL(`public${path}`, root));
    }
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

async function liquidFrameHarness() {
  const directory = new URL('../public/landing-pages/assets/', import.meta.url);
  const filename = (await readdir(directory)).find((name) => name.startsWith('sylva-runtime-2.') && name.endsWith('.js'));
  const script = await readFile(new URL(filename, directory), 'utf8');
  const start = script.indexOf('function frame(now){');
  const end = script.indexOf('/* ---------------- interaction', start);
  assert.ok(start > 0 && end > start, 'Expected the complete liquid-button frame function');
  const noop = () => {};
  const program = { p: {}, u: {} };
  const target = { tex: {}, w: 200, h: 100 };
  const context = vm.createContext({
    pendingPointer: null, last: 0, clock: 0,
    hover: 0, hoverTarget: 0, press: 0, pressTarget: 0,
    calm: { matches: false },
    RIP: [{ x: 0, y: 0, t: -99, on: 0 }], ripArr: new Float32Array(4),
    R: { ptrLag: 0.0016, ptrVref: 4.5 },
    ptr: { x: 0, y: 0 }, ptrS: { x: 0, y: 0 }, ptrSpeed: 0, ptrAmt: 0,
    on: { over: false, press: false, focus: false },
    needResize: false, W: 200, H: 100, BW: 160, BH: 50, CX: 100, CY: 50,
    drawn: null, lastDraw: 0, IDLE_HZ: 30,
    P: { dim: 1 }, E: {}, C: { soften: 0.24, glowR: 1 },
    uArr: [], eArr: [], DOWN: 1, GLOW_TEX: 129,
    gl: new Proxy({}, { get: () => noop }),
    pScene: program, pRim: program, pDown: program, pBlur: program, pComp: program,
    T_core: target, T_rim: target, T_s1: target, T_s2: target, T_a: target, T_b: target,
    passes: 0,
  });
  context.drawTo = () => { context.passes++; };
  vm.runInContext(script.slice(start, end), context);
  const scheduler = harness();
  const loop = scheduler.loop((now) => context.frame(now), {});
  return { context, scheduler, loop };
}

test('liquid controls paint once at rest and release their animation frames until interaction', async () => {
  const { context, scheduler, loop } = await liquidFrameHarness();
  loop.invalidate();
  scheduler.frame(50);
  const initialPasses = context.passes;
  assert.ok(initialPasses > 10, 'The real multipass pipeline should have painted its initial appearance');
  assert.equal(scheduler.scheduled.size, 0, 'An idle control must release the frame scheduler');
  scheduler.frame(1000);
  assert.equal(context.passes, initialPasses);

  context.on.over = true;
  context.hoverTarget = 1;
  loop.invalidate();
  scheduler.frame(17);
  assert.ok(context.passes > initialPasses, 'Hover must paint the resumed liquid effect');
  assert.equal(scheduler.scheduled.size, 1);
  assert.ok(context.hover > 0);

  context.on.over = false;
  context.hoverTarget = 0;
  loop.invalidate();
  for (let i = 0; i < 180 && scheduler.scheduled.size; i++) scheduler.frame(17);
  assert.equal(context.hover, 0, 'The exit transition should finish before freezing');
  assert.equal(context.ptrAmt, 0);
  assert.equal(scheduler.scheduled.size, 0);
  const settledPasses = context.passes;
  scheduler.frame(1000);
  assert.equal(context.passes, settledPasses);
});

test('keyboard focus and a press ripple wake idle liquid controls and finish before sleeping', async () => {
  const { context, scheduler, loop } = await liquidFrameHarness();
  loop.invalidate();
  scheduler.frame(50);
  context.on.focus = true;
  context.hoverTarget = 1;
  loop.invalidate();
  scheduler.frame(17);
  assert.equal(scheduler.scheduled.size, 1, 'Keyboard focus keeps the highlight animated');

  context.on.focus = false;
  context.hoverTarget = 0;
  context.RIP[0].on = 1;
  context.RIP[0].t = context.clock;
  const rippleStarted = context.clock;
  for (let i = 0; i < 235; i++) scheduler.frame(17);
  assert.equal(scheduler.scheduled.size, 1, 'The four-second ripple should remain live');
  assert.ok(context.clock - rippleStarted < 4);
  for (let i = 0; i < 10 && scheduler.scheduled.size; i++) scheduler.frame(17);
  assert.equal(context.RIP[0].on, 0);
  assert.equal(scheduler.scheduled.size, 0, 'A finished ripple must release all scheduled work');
});

test('yielding geometry keeps every shell and blade attribute identical to the archived recipe', async () => {
  const root = new URL('../', import.meta.url);
  const archived = await readFile(new URL('vendor/threeui/upstream/inner-green-3d.html', root), 'utf8');
  const directory = new URL('public/landing-pages/assets/', root);
  const filename = (await readdir(directory)).find((name) => name.startsWith('sylva-runtime-3.') && name.endsWith('.js'));
  const generated = await readFile(new URL(filename, directory), 'utf8');

  async function geometry(script, nativeYield) {
    let elapsed = 0;
    let yields = 0;
    const context = vm.createContext({
      THREE, Math, REDUCED: false,
      ARCH: { aspect: 2800 / 1377 }, FAR: { aspect: 1600 / 757 },
      performance: { now: () => { elapsed += 2; return elapsed; } },
      scheduler: nativeYield ? { yield: () => { yields++; return Promise.resolve(); } } : undefined,
      setTimeout(callback) { yields++; setTimeout(callback, 0); },
    });
    const start = script.indexOf('  var rng =');
    const end = script.indexOf('  async function build() {', start) === -1
      ? script.indexOf('  function build() {', start)
      : script.indexOf('  async function build() {', start);
    assert.ok(start > 0 && end > start, 'Expected the complete geometry recipe');
    vm.runInContext(script.slice(start, end), context);
    const attributes = await vm.runInContext(`(async function () {
      var limb = makeLimb(makeP(2), [[0, 0.6, 0], [0.5, 0.4, 0.1], [1, 0.6, 0]], {
        segs: 20, radial: 12, rw: function () { return 0.3; },
        moss: function () { return 0.2; }, vScale: 1
      });
      var shell = { pos: [], nor: [], inf: [], idx: [] };
      var fur = { off: [], nrm: [], rnd: [], aux: [] };
      await tessellate(limb, shell);
      var planted = await plantBlades(limb, 2048, fur);
      return JSON.stringify({ shell: shell, fur: fur, planted: planted });
    })()`, context);
    return { attributes, yields };
  }

  const baseline = await geometry(archived, true);
  const native = await geometry(generated, true);
  const fallback = await geometry(generated, false);
  assert.equal(baseline.yields, 0);
  assert.ok(native.yields > 1, 'The inner loops must yield when their time budget is spent');
  assert.ok(fallback.yields > 1, 'Browsers without scheduler.yield need real task boundaries too');
  assert.equal(native.attributes, baseline.attributes);
  assert.equal(fallback.attributes, baseline.attributes);
});

test('a delayed optional butterfly image never blocks scene construction and wakes the scene when ready', async () => {
  const directory = new URL('../public/landing-pages/assets/', import.meta.url);
  const filename = (await readdir(directory)).find((name) => name.startsWith('sylva-runtime-3.') && name.endsWith('.js'));
  const script = await readFile(new URL(filename, directory), 'utf8');
  const start = script.indexOf('  function buildButterfly(host, limbs, uni, textureReady) {');
  const end = script.indexOf('    var foreG = wingGeometry(false)', start);
  assert.ok(start > 0 && end > start, 'Expected the synchronous butterfly setup');
  let wakes = 0;
  const context = vm.createContext({ THREE, startTick: () => { wakes++; } });
  vm.runInContext(`${script.slice(start, end)}return { group: group, texture: tex }; }`, context);

  let resolveImage;
  const pendingImage = new Promise((resolve) => { resolveImage = resolve; });
  const butterfly = context.buildButterfly(null, null, null, pendingImage);
  assert.ok(butterfly.group, 'The builder must return synchronously before its image loads');
  assert.equal(butterfly.group.visible, false);
  assert.equal(wakes, 0);

  let disposed = false;
  const image = { width: 256, height: 256 };
  const loaded = new THREE.Texture(image);
  loaded.flipY = false;
  loaded.premultiplyAlpha = false;
  loaded.wrapS = loaded.wrapT = THREE.ClampToEdgeWrapping;
  loaded.addEventListener('dispose', () => { disposed = true; });
  resolveImage(loaded);
  await pendingImage;
  assert.equal(butterfly.group.visible, true);
  assert.equal(butterfly.texture.image, image);
  assert.equal(butterfly.texture.flipY, false);
  assert.equal(butterfly.texture.premultiplyAlpha, false);
  assert.ok(butterfly.texture.version > 0, 'The loaded image must be uploaded on the next render');
  assert.equal(wakes, 1, 'An image arriving after a reduced-motion scene sleeps needs a new frame');
  assert.equal(disposed, true, 'The temporary loader texture should be released');

  let rejectImage;
  const failedImage = new Promise((resolve) => { rejectImage = resolve; });
  const failed = context.buildButterfly(null, null, null, failedImage);
  rejectImage(null);
  await failedImage;
  assert.equal(failed.group.visible, false, 'A failed optional image keeps only the butterfly hidden');
  assert.equal(wakes, 1);
});


test('desktop high-refresh displays render at most 60 frames per second', () => {
  const h = harness();
  let draws = 0;
  h.loop(() => { draws++; return true; }, {}).invalidate();
  for (let i = 0; i < 240; i++) h.frame(1000 / 240);
  assert.equal(draws, 60);
});

test('video occlusion pauses rendering independently of viewport visibility', () => {
  const h = harness();
  let draws = 0;
  h.loop(() => { draws++; return true; }, {}).invalidate();
  h.frame();
  const occlude = (occluded, origin = h.window.location.origin) => h.window.emit('message', {
    source: h.parent, origin, data: { type: 'threeui:occlusion', occluded },
  });
  occlude(true, 'https://unrelated.test');
  assert.equal(h.scheduled.size, 1);
  occlude(true);
  assert.equal(h.scheduled.size, 0);
  h.host(true);
  h.frame();
  assert.equal(draws, 1, 'Viewport updates must not restart a covered hero');
  h.host(false);
  occlude(false);
  assert.equal(h.scheduled.size, 0, 'Closing video must not restart an offscreen hero');
  h.host(true);
  h.frame();
  assert.equal(draws, 2);
});
