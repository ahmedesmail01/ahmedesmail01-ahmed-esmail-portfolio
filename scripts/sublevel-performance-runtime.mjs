/**
 * Playback-only optimizations for the archived ThreeUI source.
 * The upstream file stays byte-for-byte intact. Every replacement deliberately
 * asserts its source anchor so a future source revision cannot silently drift.
 */
export function optimizeRuntime(source) {
  let html = source;
  const replace = (label, before, after) => {
    const first = html.indexOf(before);
    if (first === -1 || html.indexOf(before, first + before.length) !== -1) {
      throw new Error(`Sublevel runtime: expected one ${label} anchor`);
    }
    html = html.slice(0, first) + after + html.slice(first + before.length);
  };

  // Mobile fill rate matters more than supersampling these intentionally noisy
  // effects. Desktop retains the authored limits, geometry, and shader programs.
  replace("lobby pixel ratio", "let DPR = Math.min(window.devicePixelRatio || 1, 1.5);", "let DPR = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);");
  replace("paper pixel ratio", "renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));", "renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));");
  replace("particle pixel ratio", "function syncCanvasSize() {\n    const dpr = Math.min(window.devicePixelRatio || 1, 2);", "function syncCanvasSize() {\n    const dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);");
  replace("VHS pixel ratio", "const dpr = Math.min(devicePixelRatio || 1, 2); const w = Math.round(innerWidth * dpr)", "const dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 2); const w = Math.round(innerWidth * dpr)");

  replace("lobby loop", `function loop(now) {
  // the lobby is the backdrop for the machine screen now, so it keeps drawing there
  const visible = (window.scrollY || 0) < lastH * 1.05 || document.body.classList.contains('machine');
  if (visible) {
    if (ball.live || shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; if (!ball.live) shadowDirty--; }
    const a = performance.now(); render(now); const cost = performance.now() - a;
    if (cost > 22) { if (++slowFrames > 60 && DPR > 1) { DPR = Math.max(1, DPR - 0.5); slowFrames = 0; } } else slowFrames = Math.max(0, slowFrames - 1);
  }
  requestAnimationFrame(loop);
}`, `let lobbyRaf = 0;
function lobbyVisible() {
  return !document.hidden && !document.body.classList.contains('menu-open') &&
    ((window.scrollY || 0) < lastH * 1.05 || document.body.classList.contains('machine'));
}
function loop(now) {
  lobbyRaf = 0;
  if (!lobbyVisible()) return;
  if (ball.live || shadowDirty > 0) { renderer.shadowMap.needsUpdate = true; if (!ball.live) shadowDirty--; }
  const a = performance.now(); render(now); const cost = performance.now() - a;
  if (cost > 22) { if (++slowFrames > 60 && DPR > 1) { DPR = Math.max(1, DPR - 0.5); slowFrames = 0; } } else slowFrames = Math.max(0, slowFrames - 1);
  lobbyRaf = requestAnimationFrame(loop);
}
function syncLobbyPlayback() {
  if (!lobbyVisible()) { cancelAnimationFrame(lobbyRaf); lobbyRaf = 0; return; }
  if (!lobbyRaf) { lastNow = performance.now(); lobbyRaf = requestAnimationFrame(loop); }
}
document.addEventListener('visibilitychange', syncLobbyPlayback);
window.addEventListener('scroll', syncLobbyPlayback, { passive: true });
window.addEventListener('resize', syncLobbyPlayback);
new MutationObserver(syncLobbyPlayback).observe(document.body, { attributes: true, attributeFilter: ['class'] });`);
  replace("lobby startup", "loaderEl.classList.add('done');\nrequestAnimationFrame(loop);", "loaderEl.classList.add('done');\nsyncLobbyPlayback();");

  replace("CRT playback", `  let frame = 0, visible = true;
  const resize = () => { renderer.resize(); renderer.render(performance.now()); };
  const tick = (now) => { renderer.render(now); frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0; };
  const resizeObserver = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; if (visible && !frame) frame = requestAnimationFrame(tick); if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } });
  resizeObserver.observe(host); intersection.observe(host); resize(); frame = requestAnimationFrame(tick);`, `  let frame = 0, visible = true;
  const resize = () => { renderer.resize(); if (visible && !document.hidden) renderer.render(performance.now()); };
  const tick = (now) => { frame = 0; if (!visible || document.hidden) return; renderer.render(now); frame = requestAnimationFrame(tick); };
  const syncPlayback = () => {
    if (!visible || document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (!frame) frame = requestAnimationFrame(tick);
  };
  const resizeObserver = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; syncPlayback(); });
  document.addEventListener('visibilitychange', syncPlayback);
  resizeObserver.observe(host); intersection.observe(host); resize(); syncPlayback();`);
  replace("CRT cleanup", "resizeObserver.disconnect(); intersection.disconnect(); renderer.dispose(); canvas.remove();", "resizeObserver.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', syncPlayback); renderer.dispose(); canvas.remove();");

  // Looking up a block by scanning all units for every row made particle work
  // grow with both document height and block count. Cache the exact first match.
  replace("particle row target measurements", `  function rowTargetFor(docRowY) {
    if (reducedMotion || !introDone) return 1;
    const h = Math.max(output.clientHeight, 1), band = Math.max(config.band, 1), max = content.scrollHeight - content.clientHeight;
    let line = Math.min(Math.max(config.point, 0), 1) * h;
    if (max <= 1) line = h + band; else { const endP = Math.min(Math.max((scrollSmooth - (max - h * 0.5)) / (h * 0.5), 0), 1); line += (h + band - line) * endP * endP; }
    const vy = docRowY - scrollSmooth;
    return Math.min(Math.max((line + band - vy) / band, 0), 1);
  }`, `  let rowLine = 0, rowBand = 1;
  function syncRowTargets() {
    const h = Math.max(output.clientHeight, 1), max = content.scrollHeight - content.clientHeight;
    rowBand = Math.max(config.band, 1);
    rowLine = Math.min(Math.max(config.point, 0), 1) * h;
    if (max <= 1) rowLine = h + rowBand;
    else { const endP = Math.min(Math.max((scrollSmooth - (max - h * 0.5)) / (h * 0.5), 0), 1); rowLine += (h + rowBand - rowLine) * endP * endP; }
  }
  function rowTargetFor(docRowY) {
    if (reducedMotion || !introDone) return 1;
    return Math.min(Math.max((rowLine + rowBand - (docRowY - scrollSmooth)) / rowBand, 0), 1);
  }`);
  replace("particle row lookup", `  function unitAt(i) { for (let u = 0; u < units.length; u++) { const r = units[u]; if (i >= r.from && i <= r.to) return r; } return null; }
  function targetForRow(i, density) { const u = unitAt(i); return rowTargetFor(u ? u.anchor : (i + 0.5) * density); }`, `  let rowUnits = new Int32Array(0), rowUnitsDirty = true;
  function syncRowUnits(count) {
    if (!rowUnitsDirty && rowUnits.length === count) return;
    rowUnits = new Int32Array(count); rowUnits.fill(-1);
    for (let u = 0; u < units.length; u++) {
      const unit = units[u], from = Math.max(0, Math.ceil(unit.from)), to = Math.min(count - 1, Math.floor(unit.to));
      for (let i = from; i <= to; i++) if (rowUnits[i] === -1) rowUnits[i] = u;
    }
    rowUnitsDirty = false;
  }
  function targetForRow(i, density) { const u = units[rowUnits[i]]; return Math.fround(rowTargetFor(u ? u.anchor : (i + 0.5) * density)); }`);
  replace("particle row cache refresh", "const docRows = Math.max(1, Math.ceil(content.scrollHeight / density));\n    if (rowProgress.length", "const docRows = Math.max(1, Math.ceil(content.scrollHeight / density));\n    syncRowTargets(); syncRowUnits(docRows);\n    if (rowProgress.length");
  replace("particle unit invalidation", "setUnits(next) { units = next || []; start(); }", "setUnits(next) { units = next || []; rowUnitsDirty = true; start(); }");
  replace("particle committed precision", "const next = Math.min(1, Math.max(Math.min(target, p + cap), p + dt / hold));", "const next = Math.fround(Math.min(1, Math.max(Math.min(target, p + cap), p + dt / hold)));");
  replace("particle forming precision", "const next = Math.min(p + cap, target);", "const next = Math.fround(Math.min(p + cap, target));");
  replace("particle dissolving precision", "const next = Math.max(p - dt / (settle * 0.6), target);", "const next = Math.fround(Math.max(p - dt / (settle * 0.6), target));");
  // Empty rows below the formation line are never "assembled", even when all
  // actual copy has landed. Track the painter's content separately so those
  // blank rows do not keep a transparent point cloud running forever. An
  // unspecified return value preserves the behavior of other custom painters.
  replace("particle painted content state", "  let contentDirty = false;\n  let wake = () => {};\n  const requestPaint = () => { try { paint(source, sourceCtx); contentDirty = true; wake(); } catch (e) { console.warn(e); } };", "  let contentDirty = false, hasPendingContent = true, uploadedContent = false;\n  let wake = () => {};\n  const requestPaint = () => { try { hasPendingContent = paint(source, sourceCtx) !== false; contentDirty = true; wake(); } catch (e) { console.warn(e); } };");
  replace("particle uploaded content state", "function uploadContent() { if (!contentDirty) return; contentDirty = false; introReady = true;", "function uploadContent() { if (!contentDirty) return; contentDirty = false; uploadedContent = hasPendingContent; introReady = true;");
  replace("particle empty point draw", "if (rowsAssembled) { gl.disable(gl.BLEND); return; }", "if (rowsAssembled || !uploadedContent) { gl.disable(gl.BLEND); return; }");
  replace("particle idle condition", "!rowsAnimating && rowsAssembled && introDone && lag === 0", "!rowsAnimating && (rowsAssembled || !uploadedContent) && introDone && lag === 0");
  replace("particle raster bounds", "  const vh = window.innerHeight, margin = 600;\n  for (const t of tracked) {", "  const vh = window.innerHeight, vw = window.innerWidth, margin = 600;\n  let hasPendingContent = false;\n  for (const t of tracked) {");
  replace("particle raster content detection", "    t.el.classList.add('ps-hidden');\n    paintElement(t.el, ctx);\n  }\n}\nfunction paintElement", "    if (box.bottom > 0 && box.top < vh && box.right > 0 && box.left < vw && box.width > 0 && box.height > 0) hasPendingContent = true;\n    t.el.classList.add('ps-hidden');\n    paintElement(t.el, ctx);\n  }\n  return hasPendingContent;\n}\nfunction paintElement");
  replace("particle playback", `  function start() { if (destroyed || running || !visible) return; running = true; lastTime = performance.now(); raf = requestAnimationFrame(frame); }
  wake = start; start();`, `  function start() { if (destroyed || running || !visible) return; running = true; lastTime = performance.now(); raf = requestAnimationFrame(frame); }
  function syncParticlePlayback() {
    visible = !document.hidden && !document.body.classList.contains('menu-open') && !document.body.classList.contains('machine');
    if (!visible) { cancelAnimationFrame(raf); raf = 0; running = false; }
    else start();
  }
  const playbackObserver = new MutationObserver(syncParticlePlayback);
  playbackObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', syncParticlePlayback);
  wake = start; syncParticlePlayback();`);
  replace("particle cleanup", "destroy() { destroyed = true; cancelAnimationFrame(raf);", "destroy() { destroyed = true; cancelAnimationFrame(raf); playbackObserver.disconnect(); document.removeEventListener('visibilitychange', syncParticlePlayback);");

  replace("paper playback", `let paperVisible = false;
new IntersectionObserver((es)=>{ paperVisible = es.some(e=>e.isIntersecting); }, {threshold:0}).observe(HOST);
function frame(){
  requestAnimationFrame(frame);
  if(!paperVisible || document.hidden) return;`, `let paperVisible = false, paperRaf = 0, paperReady = false;
const paperMenu = document.querySelector('.menu');
function paperActive() { return paperReady && paperVisible && !document.hidden && paperMenu.classList.contains('open'); }
function syncPaperPlayback() {
  if (!paperActive()) { cancelAnimationFrame(paperRaf); paperRaf = 0; return; }
  if (!paperRaf) { clock.getDelta(); paperRaf = requestAnimationFrame(frame); }
}
new IntersectionObserver((es)=>{ paperVisible = es.some(e=>e.isIntersecting); syncPaperPlayback(); }, {threshold:0}).observe(HOST);
new MutationObserver(syncPaperPlayback).observe(paperMenu, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', syncPaperPlayback);
function frame(){
  paperRaf = 0;
  if (!paperActive()) return;
  paperRaf = requestAnimationFrame(frame);`);
  replace("paper startup", "  mat.opacity = 1;\n  frame();\n}", "  mat.opacity = 1;\n  paperReady = true; syncPaperPlayback();\n}");

  replace("terrain playback entry", `  function frame(now) {
    const dt = last ? Math.min(48, now - last) : 16;`, `  function terrainActive() { return inView && !document.hidden && !document.body.classList.contains('menu-open') && !document.body.classList.contains('machine'); }
  function syncTerrainPlayback() {
    if (!terrainActive() || reduced) { cancelAnimationFrame(rafId); rafId = 0; return; }
    if (!rafId) { last = 0; rafId = requestAnimationFrame(frame); }
  }
  function frame(now) {
    rafId = 0;
    if (!terrainActive()) return;
    const dt = last ? Math.min(48, now - last) : 16;`);
  replace("terrain intersection", "        inView = entry.isIntersecting;\n        if (!entry.isIntersecting && REPLAY)", "        inView = entry.isIntersecting;\n        syncTerrainPlayback();\n        if (!entry.isIntersecting && REPLAY)");
  replace("terrain startup", "    rafId = requestAnimationFrame(frame);\n  }\n\n  const boxObserver", "    syncTerrainPlayback();\n  }\n\n  document.addEventListener('visibilitychange', syncTerrainPlayback);\n  const terrainPlaybackObserver = new MutationObserver(syncTerrainPlayback);\n  terrainPlaybackObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });\n  const boxObserver");
  replace("terrain cleanup", "    if (viewObserver) viewObserver.disconnect();\n    if (startObserver) startObserver.disconnect();", "    if (viewObserver) viewObserver.disconnect();\n    if (startObserver) startObserver.disconnect();\n    terrainPlaybackObserver.disconnect();\n    document.removeEventListener('visibilitychange', syncTerrainPlayback);");
  replace("plume visibility", "const shouldAnimate = isVisible && !document.hidden && !reducedMotion.matches;", "const shouldAnimate = isVisible && !document.hidden && !reducedMotion.matches && !document.body.classList.contains('menu-open') && !document.body.classList.contains('machine');");
  replace("plume observer", 'document.addEventListener("visibilitychange", syncPlayback);\n      reducedMotion', 'document.addEventListener("visibilitychange", syncPlayback);\n      new MutationObserver(syncPlayback).observe(document.body, { attributes: true, attributeFilter: ["class"] });\n      reducedMotion');

  replace("VHS playback entry", `    let time = 0, last = performance.now();
    function frame(now) {
      const dpr`, `    let time = 0, last = performance.now(), vhsRaf = 0;
    function syncVhsPlayback() {
      if (document.hidden) { cancelAnimationFrame(vhsRaf); vhsRaf = 0; return; }
      if (!vhsRaf) { last = performance.now(); vhsRaf = requestAnimationFrame(frame); }
    }
    function frame(now) {
      vhsRaf = 0;
      if (document.hidden) return;
      const dpr`);
  replace("VHS scheduling", `      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);`, `      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      vhsRaf = requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', syncVhsPlayback);
    syncVhsPlayback();`);

  replace("menu projection loop", `    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const sheet = window.__sheet;
      if (!menu.classList.contains('open') || !sheet) return;`, `    let raf = 0;
    const tick = () => {
      raf = 0;
      if (document.hidden || !menu.classList.contains('open')) return;
      raf = requestAnimationFrame(tick);
      const sheet = window.__sheet;
      if (!sheet) return;`);
  replace("menu projection startup", "    tick();\n    menu.addEventListener('transitionend'", `    const syncProjection = () => {
      if (document.hidden || !menu.classList.contains('open')) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) raf = requestAnimationFrame(tick);
    };
    new MutationObserver(syncProjection).observe(menu, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncProjection);
    syncProjection();
    menu.addEventListener('transitionend'`);

  replace("wave loop entry", `    function frame(now) {
      const r = cv.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && r.width > 0) {
        size(); const t = (now - t0) / 1000;`, `    let waveVisible = false, waveRaf = 0;
    const waveActive = () => waveVisible && !document.hidden && !document.body.classList.contains('menu-open') && !document.body.classList.contains('machine');
    function syncWavePlayback() {
      if (!waveActive()) { cancelAnimationFrame(waveRaf); waveRaf = 0; }
      else if (!waveRaf) waveRaf = requestAnimationFrame(frame);
    }
    function frame(now) {
      waveRaf = 0;
      if (!waveActive()) return;
      if (w > 0 && h > 0) {
        const t = (now - t0) / 1000;`);
  replace("wave scheduling", `      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();`, `      waveRaf = requestAnimationFrame(frame);
    }
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(([entry]) => { waveVisible = entry.isIntersecting; syncWavePlayback(); }).observe(cv);
    new MutationObserver(syncWavePlayback).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncWavePlayback);
    size();
  }
})();`);

  return html;
}
