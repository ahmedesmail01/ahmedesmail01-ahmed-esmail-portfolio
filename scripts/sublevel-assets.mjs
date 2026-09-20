import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const replace = (text, before, after) => {
  assert.equal(text.split(before).length, 2, `Expected one loading anchor: ${before.slice(0, 90)}`);
  return text.replace(before, () => after);
};

// Preserve intrinsic dimensions when moving inline WebP images to lazy files.
// Reserving their space keeps section anchors stable before the image arrives.
function imageDimensions(bytes) {
  if (bytes.toString('ascii', 8, 12) !== 'WEBP') return '';
  for (let offset = 12; offset + 18 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    let width, height;
    if (kind === 'VP8X') {
      width = bytes.readUIntLE(data + 4, 3) + 1;
      height = bytes.readUIntLE(data + 7, 3) + 1;
    } else if (kind === 'VP8 ') {
      width = bytes.readUInt16LE(data + 6) & 0x3fff;
      height = bytes.readUInt16LE(data + 8) & 0x3fff;
    } else if (kind === 'VP8L') {
      const bits = bytes.readUInt32LE(data + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    }
    if (width && height) return `width="${width}" height="${height}" `;
    offset += 8 + size + (size % 2);
  }
  return '';
}

// Preserve the authored source in upstream; publish cacheable, independently
// loaded files instead of making every visit parse all media and every effect.
export async function splitAssets(html, root) {
  const directory = new URL('public/landing-pages/assets/', root);
  await mkdir(directory, { recursive: true });
  await cp(new URL('vendor/threeui/runtime/', root), new URL('public/landing-pages/runtime/', root), { recursive: true });
  const published = new Set();
  async function asset(name, data, extension) {
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
    const filename = `${name}.${hash}.${extension}`;
    published.add(filename);
    await writeFile(new URL(filename, directory), data);
    return `/landing-pages/assets/${filename}`;
  }

  // The decorative media is below the lobby or inside the closed menu.
  const embedded = [...html.matchAll(/src="data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)"/g)];
  for (const match of embedded) {
    const bytes = Buffer.from(match[2], 'base64');
    const url = await asset('illustration', bytes, match[1].split('/')[1]);
    html = html.replace(match[0], `${imageDimensions(bytes)}loading="lazy" decoding="async" src="${url}"`);
  }
  html = html.replace(/<img alt="Illustrative cover/g, '<img loading="lazy" decoding="async" alt="Illustrative cover');
  for (const match of [...html.matchAll(/src="(\/images\/[^\"]+)"/g)]) {
    const bytes = await readFile(new URL(`public${match[1]}`, root));
    html = html.replace(match[0], `${imageDimensions(bytes)}${match[0]}`);
  }

  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 8, 'Expected the eight registered script blocks');
  let [, lobby, crt, particles, legacyThree, paper, terrain, page] = scripts.map((match) => match[2]);
  const models = lobby.match(/const GLBS = \{ person: '([^']+)', dog: '([^']+)' \};/);
  assert.ok(models, 'Expected embedded character models');
  const person = await asset('person', Buffer.from(models[1], 'base64'), 'glb');
  const dog = await asset('dog', Buffer.from(models[2], 'base64'), 'glb');
  lobby = replace(lobby, models[0], `const GLBS = ${JSON.stringify({ person, dog })};`);
  lobby = replace(lobby, "async function loadCharacter(b64, opts) {\n  if (!b64 || b64.length < 100) return;\n  try {\n    const buf = b64ToBuf(b64);", "async function loadCharacter(url, opts) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) throw new Error('Character request failed');\n    const buf = await response.arrayBuffer();");
  lobby = replace(lobby, "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js", '/landing-pages/runtime/examples/jsm/loaders/GLTFLoader.js');
  // A visitor can open the terminal before the deferred scene initializes.
  lobby = replace(lobby, 'window.VHS = VHS;', 'window.VHS ||= VHS;');

  // Give the browser opportunities to paint the poster and respond to controls
  // between the authored procedural texture and geometry construction stages.
  lobby = replace(lobby, "import * as THREE from 'three';", "import * as THREE from 'three';\nconst yieldToPage = () => new Promise(resolve => setTimeout(resolve, 0));");
  for (const marker of ['/* ================= textures ================= */', '/* ================= materials ================= */', '/* ================= room ================= */', '/* ---------- stairs ---------- */', '/* ================= retro CRT builder ================= */', '/* ---------- lights ---------- */']) {
    lobby = replace(lobby, marker, `await yieldToPage();\n${marker}`);
  }
  lobby = replace(lobby, "loaderEl.classList.add('done');", "loaderEl.classList.add('done');\ncanvas.style.opacity = '1';\ndocument.getElementById('lobby-poster')?.remove();\nwindow.dispatchEvent(new Event('lobby-ready'));");

  // Keep the original menu engine for exact lighting; download and initialize
  // it only when the menu opens, instead of running two Three engines at boot.
  const threeUrl = await asset('menu-three-r149', legacyThree, 'js');
  paper = replace(paper, 'paperReady = true; syncPaperPlayback();', "paperReady = true; syncPaperPlayback();\n  document.querySelector('.menu').dataset.paperReady = 'true';");
  const paperUrl = await asset('paper-menu', paper, 'js');
  const crtUrl = await asset('terminal', crt, 'js');
  const particleUrl = await asset('particles', particles, 'js');
  const terrainUrl = await asset('terrain', terrain, 'js');

  const terminal = page.match(/  const SUBLEVEL_LOG = ([^\n]+);/);
  assert.ok(terminal, 'Expected terminal data');
  page = replace(page, terminal[0], `  const terminalLog = () => ${terminal[1]};`);
  page = replace(page, 'function setMode(m) {', 'async function setMode(m) {');
  page = replace(page, '    if (machine && !crt) { try {', `    if (machine && !window.ThreeUICrt) {\n      try { await import(${JSON.stringify(crtUrl)}); }\n      catch (error) { console.warn('Terminal unavailable', error); return; }\n      if (!document.body.classList.contains('machine')) return;\n    }\n    if (machine && !crt) { try {`);
  page = replace(page, '}, SUBLEVEL_LOG);', '}, terminalLog());');

  const vhsStart = page.indexOf('  // VHS overlay for the DOM:');
  const vhsEnd = page.indexOf('  // Canvas UI Particle Scroll', vhsStart);
  assert.ok(vhsStart > 0 && vhsEnd > vhsStart, 'Expected overlay block');
  const vhsUrl = await asset('vhs-overlay', page.slice(vhsStart, vhsEnd), 'js');
  page = page.slice(0, vhsStart) + page.slice(vhsEnd);

  const particleMount = page.match(/  if \(window\.ParticleScroll[\s\S]*?\n  }/);
  const terrainMount = page.match(/  if \(window\.ThreeUITerrainPlume[\s\S]*?\n  }/);
  assert.ok(particleMount && terrainMount, 'Expected effect mount blocks');
  page = replace(page, particleMount[0], `  whenNear(document.querySelector('#layout'), async () => {\n    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;\n    await import(${JSON.stringify(particleUrl)});\n${particleMount[0]}\n  });`);
  page = replace(page, terrainMount[0], `  whenNear(document.querySelector('footer'), async () => {\n    await import(${JSON.stringify(terrainUrl)});\n${terrainMount[0]}\n  });`);
  page = replace(page, "      if (open) {\n        menu.hidden = false;", "      if (open) {\n        loadPaper();\n        menu.hidden = false;");

  const lobbyUrl = await asset('lobby', lobby, 'js');
  const boot = `
// Keep navigation and the enquiry form usable while optional GPU scenes load.
function whenNear(element, mount) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    mount().catch(error => console.warn('Optional visual unavailable', error));
  }, { rootMargin: '240px 0px' });
  observer.observe(element);
}
let paperPromise;
function loadPaper() {
  if (!paperPromise) paperPromise = import(${JSON.stringify(threeUrl)})
    .then(() => import(${JSON.stringify(paperUrl)}))
    .catch(error => { paperPromise = null; console.warn('Paper visual unavailable', error); });
  return paperPromise;
}
${page}
let lobbyPromise;
function loadLobby() {
  if (lobbyPromise || document.hidden || scrollY >= innerHeight) return;
  lobbyPromise = import(${JSON.stringify(lobbyUrl)}).catch(error => {
    document.querySelector('#loader').classList.add('done');
    console.warn('Interactive lobby unavailable', error);
  });
}
// Two frames give the HTML, local fonts and preview a paint before scene setup.
requestAnimationFrame(() => requestAnimationFrame(loadLobby));
addEventListener('scroll', loadLobby, { passive: true });
document.addEventListener('visibilitychange', loadLobby);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('lobby-ready', () => import(${JSON.stringify(vhsUrl)}), { once: true });
}
`;
  const bootUrl = await asset('page', boot, 'js');
  for (const script of scripts) html = html.replace(script[0], '');
  html = html.replace('</body>', `<script type="module" src="${bootUrl}"></script>\n</body>`);
  html = html.replace('</head>', `<script type="importmap">{"imports":{"three":"/landing-pages/runtime/build/three.module.min.js"}}</script>\n</head>`);

  html = html.replace(/<link[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\n?/g, '');
  html = html.replace('</head>', '<link rel="stylesheet" href="/landing-pages/runtime/fonts.css">\n</head>');
  const poster = await asset('lobby-preview', await readFile(new URL('vendor/threeui/runtime/lobby-poster.webp', root)), 'webp');
  html = replace(html, '<canvas id="gl"></canvas>', `<img id="lobby-poster" src="${poster}" width="960" height="600" alt="" fetchpriority="high"><canvas id="gl"></canvas>`);
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
  let css = styles.map(match => match[1]).join('\n');
  css += `
#lobby-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#gl{opacity:0}
.menu:not([data-paper-ready]) .menu-links{opacity:1;left:50%;top:50%;width:min(560px,calc(100% - 48px));height:min(790px,calc(100svh - 64px));transform:translate(-50%,-50%)}
@media(max-width:600px){.menu:not([data-paper-ready]) .menu-links{padding:28px}.menu:not([data-paper-ready]) .menu-nav{margin-top:120px}.menu:not([data-paper-ready]) .menu-nav a{font-size:26px}}
`;
  const cssUrl = await asset('page', css, 'css');
  for (const style of styles) html = html.replace(style[0], '');
  html = html.replace('</head>', `<link rel="stylesheet" href="${cssUrl}">\n<link rel="preload" as="image" href="${poster}" fetchpriority="high">\n</head>`);
  // Sylva owns its prefixed files in this shared directory. Remove only old
  // Sublevel hashes so rebuilding one scene preserves the other's assets.
  for (const file of await readdir(directory)) {
    if (!file.startsWith('sylva-') && !published.has(file)) await rm(new URL(file, directory));
  }
  return html;
}
