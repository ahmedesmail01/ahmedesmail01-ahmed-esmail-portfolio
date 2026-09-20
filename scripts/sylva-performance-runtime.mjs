import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

// Serialized into the generated document. Each scene owns its scheduling; no
// browser APIs are patched, and finite entrance effects retain their own timing.
export function installSylvaScheduler() {
  let hostVisible = true;
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type !== 'threeui:visibility') return;
    hostVisible = event.data.visible === true;
    notify();
  });
  document.addEventListener('visibilitychange', notify);

  window.__sylvaRuntime = {
    createLoop(draw, element) {
      let visible = true;
      let pending = true;
      let frame = 0;
      function schedule() {
        if (pending && visible && hostVisible && !document.hidden && !frame) {
          frame = requestAnimationFrame((now) => {
            frame = 0;
            pending = draw(now) !== false;
            schedule();
          });
        }
      }
      function invalidate() {
        pending = true;
        schedule();
      }
      function refresh() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        invalidate();
      }
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          visible = entries.some((entry) => entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0);
          refresh();
        });
        observer.observe(element);
      }
      listeners.add(refresh);
      return { invalidate };
    },
  };
}

export function optimizeSylvaRuntime(html) {
  const replace = (before, after) => {
    assert.equal(html.split(before).length, 2, `Expected one Sylva runtime anchor: ${before.slice(0, 90)}`);
    html = html.replace(before, () => after);
  };

  replace('<script src="inner-green-assets/three.min.js"></script>', `<script>${installSylvaScheduler.toString()}\ninstallSylvaScheduler();</script>\n<script src="inner-green-assets/three.min.js"></script>`);

  // A hidden mobile play button should not allocate WebGL targets or compile
  // shaders. Observe until visible, so changing orientation still enables it.
  replace('for (let i = 0; i < hosts.length; i++) mountLiquidMetal(hosts[i]);', `for (const host of hosts) {
    if (!('IntersectionObserver' in globalThis)) { mountLiquidMetal(host); continue; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0)) return;
      observer.disconnect();
      mountLiquidMetal(host);
    });
    observer.observe(host);
  }`);
  replace('new ResizeObserver(() => { needResize = true; }).observe(stage);', 'new ResizeObserver(() => { needResize = true; frameLoop.invalidate(); }).observe(stage);');
  replace('function addRipple(x, y){\n  const r', 'function addRipple(x, y){\n  if(calm.matches) return;\n  frameLoop.invalidate();\n  const r');
  replace('const calm = matchMedia(\'(prefers-reduced-motion: reduce)\');', `const calm = matchMedia('(prefers-reduced-motion: reduce)');
const frameLoop = hostWindow.__sylvaRuntime.createLoop(frame, host);
calm.addEventListener('change', () => {
  if(calm.matches) RIP.forEach(r => { r.on = 0; });
  drawn = null;
  frameLoop.invalidate();
});
let pendingPointer = null;`);
  replace('function frame(now){\n  const dtRaw', `function frame(now){
  if(pendingPointer){
    [ptr.x, ptr.y] = localPt(pendingPointer);
    pendingPointer = null;
  }
  const dtRaw`);
  replace('if(sig !== null && sig === drawn){ requestAnimationFrame(frame); return; }', 'if(sig !== null && sig === drawn) return false;');
  replace('const wantWell = (on.over || on.press) ? 1 : 0;', 'const wantWell = !calm.matches && (on.over || on.press) ? 1 : 0;');
  replace('if(idle && now - lastDraw < 1000 / IDLE_HZ){ requestAnimationFrame(frame); return; }', 'if(idle && now - lastDraw < 1000 / IDLE_HZ) return true;');
  // A throttled resize has not painted its new buffer yet. Record the signature
  // only after passing the throttle, or reduced motion can stop on a blank frame.
  replace('  drawn = sig;\n\n  const idle', '  const idle');
  replace('  lastDraw = now;\n\n  for(let i = 0;', '  lastDraw = now;\n  drawn = sig;\n\n  for(let i = 0;');
  replace('  requestAnimationFrame(frame);\n}\n\n/* ---------------- interaction', '  return true;\n}\n\n/* ---------------- interaction');
  replace("  document.body.classList.toggle('press', on.press);", "  document.body.classList.toggle('press', on.press);\n  frameLoop.invalidate();");
  replace('  if(!on.over && !on.press) return;\n  [ptr.x, ptr.y] = localPt(e);', '  if(!on.over && !on.press) return;\n  pendingPointer = { clientX: e.clientX, clientY: e.clientY };\n  frameLoop.invalidate();');
  replace('resize();\nrequestAnimationFrame(frame);', 'resize();\nframeLoop.invalidate();');
  replace('  drawn = null;\n};\nwindow.__hover', '  drawn = null;\n  frameLoop.invalidate();\n};\nwindow.__hover');
  replace('window.__seek   = v => { clock = v; drawn = null; };', 'window.__seek   = v => { clock = v; drawn = null; frameLoop.invalidate(); };');

  // Reduced-motion scenes render after setup, resize and preference changes,
  // then become fully idle. Normal motion pauses when the iframe leaves view.
  replace("  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;", `  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var REDUCED = motionPreference.matches;
  motionPreference.addEventListener('change', function () {
    REDUCED = motionPreference.matches;
    parOn = !REDUCED;
    if (REDUCED) {
      pointer.x = pointer.y = smooth.x = smooth.y = 0;
      heroEl.style.setProperty('--px', '0');
      heroEl.style.setProperty('--py', '0');
      lastX = lastY = 0;
      ndc.x = 10;
      scanning = false;
      if (uScanOn) uScanOn.value = uWire.value = 0;
    }
    measureDock();
    SPEC.on = fineHover();
    startTick();
  });`);
  replace('  var ticking = false, parOn = false;', '  var tickLoop, parallaxBound = false, parOn = false;\n  var pointerPosition = null;');
  replace(`  function startTick() {
    if (ticking) return;
    ticking = true;
    (function loop() { requestAnimationFrame(loop); tick(); })();
  }`, `  function startTick() {
    if (!tickLoop) tickLoop = window.__sylvaRuntime.createLoop(function () {
      tick();
      return !REDUCED || (renderer && frames < 2);
    }, heroEl);
    tickLoop.invalidate();
  }`);
  replace('    lastTick = now;\n    drawDock(dtUI);', `    lastTick = now;
    if (pointerPosition) {
      var bounds = hero.getBoundingClientRect();
      ndc.x = ((pointerPosition.x - bounds.left) / bounds.width) * 2 - 1;
      ndc.y = -((pointerPosition.y - bounds.top) / bounds.height) * 2 + 1;
      pointerPosition = null;
    }
    drawDock(dtUI);`);
  replace('    if (REDUCED || parOn) return;\n    parOn = true;', '    if (parallaxBound) return;\n    parallaxBound = true;\n    parOn = !REDUCED;');
  replace('      if (e.pointerType === \'touch\') return;\n      pointer.x', '      if (e.pointerType === \'touch\' || REDUCED) return;\n      pointer.x');
  replace(`      var r = hero.getBoundingClientRect();
      ndc.x =  ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;`, '      pointerPosition = { x: e.clientX, y: e.clientY };');
  replace('      pointer.x = pointer.y = 0; ndc.x = 10;', '      pointer.x = pointer.y = 0; ndc.x = 10; pointerPosition = null;');
  replace('  function build() {', '  async function build() {');
  replace('    var nearLimbs = buildNearRoot();', '    var nearLimbs = buildNearRoot();\n    await new Promise(resolve => setTimeout(resolve, 0));');
  replace('    if (!small) bf = buildButterfly(nearGroup, nearLimbs, nearGroup.userData.uni);', '    if (!small) bf = buildButterfly(nearGroup, nearLimbs, nearGroup.userData.uni);\n    await new Promise(resolve => setTimeout(resolve, 0));');
  replace("    window.addEventListener('resize', layout);", "    window.addEventListener('resize', function () { layout(); startTick(); });");
  replace('    try { build(); }\n    catch (err) { console.error(err); }', '    build().catch(function (err) { console.error(err); });');
  return html;
}

export async function splitSylvaAssets(html, root) {
  const directory = new URL('public/landing-pages/assets/', root);
  await mkdir(directory, { recursive: true });
  const published = new Set();
  async function asset(name, data, extension) {
    const digest = createHash('sha256').update(data).digest('hex').slice(0, 12);
    const filename = `sylva-${name}.${digest}.${extension}`;
    published.add(filename);
    await writeFile(new URL(filename, directory), data);
    return `/landing-pages/assets/${filename}`;
  }

  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  const css = styles.map((match) => match[1]).join('\n')
    .replaceAll("url('inner-green-assets/", "url('/landing-pages/inner-green-assets/");
  const stylesheet = await asset('page', css, 'css');
  for (const [index, style] of styles.entries()) {
    html = html.replace(style[0], index === 0 ? `<link rel="stylesheet" href="${stylesheet}">` : '');
  }

  let index = 0;
  for (const script of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]) {
    if (script[1].includes('application/json') || script[2].length < 100) continue;
    const src = await asset(`runtime-${++index}`, script[2], 'js');
    html = html.replace(script[0], `<script defer src="${src}"></script>`);
  }
  html = html.replace('<script src="inner-green-assets/three.min.js"></script>', '<script defer src="inner-green-assets/three.min.js"></script>');
  html = html.replace('</head>', '<link rel="preload" href="/landing-pages/inner-green-assets/lexend-latin.woff2" as="font" type="font/woff2" crossorigin>\n</head>');

  const images = JSON.parse(await readFile(new URL('lib/generated/responsive-images.json', root), 'utf8'));
  for (const name of ['card-ethos', 'card-ecostove']) {
    const image = images[`/landing-pages/inner-green-assets/${name}.jpg`];
    assert.ok(image, `Missing responsive Sylva image: ${name}`);
    const srcset = image.variants.map(({ src, width }) => `${src} ${width}w`).join(', ');
    const sizes = name === 'card-ethos'
      ? '(max-width: 600px) 104px, (max-width: 900px) 30vw, (min-width: 1900px) 235px, 13vw'
      : '(max-width: 600px) 104px, (max-width: 900px) 40vw, (min-width: 1900px) 310px, 17vw';
    html = html.replace(`src="inner-green-assets/${name}.jpg"`, `src="${image.src}" srcset="${srcset}" sizes="${sizes}" width="${image.width}" height="${image.height}"`);
  }
  // Only prune this generator's own assets; Sublevel shares the directory.
  for (const filename of await readdir(directory)) {
    if (filename.startsWith('sylva-') && !published.has(filename)) await rm(new URL(filename, directory));
  }
  return html;
}
