
import * as THREE from 'three';
const yieldToPage = () => new Promise(resolve => setTimeout(resolve, 0));

// Wait (briefly) for the web fonts so canvas-baked text uses Geist instead of a fallback.
await Promise.race([
  Promise.all([document.fonts.load('700 60px "Geist"'), document.fonts.load('600 20px "Geist"'), document.fonts.load('700 20px "Geist Mono"'), document.fonts.load('600 16px "Geist Mono"')]).catch(() => {}),
  new Promise(r => setTimeout(r, 2500))
]);

/* ================= helpers ================= */
const canvas = document.getElementById('gl');
const loaderEl = document.getElementById('loader');
const hintEl = document.getElementById('hint');
const hudEl = document.getElementById('hud');
const hudScore = hudEl.querySelector('.score');
const hudMsg = hudEl.querySelector('.msg');
let seed = 1337;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rr = (a, b) => a + rand() * (b - a);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
  if (opts.nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; }
  t.anisotropy = 8;
  t.userData.canvas = c; t.userData.ctx = g;
  return t;
}
/* Sobel a blurred copy of a painted texture into a normal map, so grain and seams
   catch the raking sun. Blurring first is what keeps the speckle from turning the
   whole surface into noise. */
function reliefFrom(canvas, { strength = 2.6, blur = 1.2, size = 1024 } = {}) {
  const src = document.createElement('canvas'); src.width = src.height = size;
  const sc = src.getContext('2d');
  if (blur > 0) sc.filter = `blur(${blur}px)`;
  sc.drawImage(canvas, 0, 0, size, size);
  sc.filter = 'none';
  const d = sc.getImageData(0, 0, size, size).data;
  const lum = new Float32Array(size * size);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) lum[j] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
  const out = document.createElement('canvas'); out.width = out.height = size;
  const oc = out.getContext('2d'); const img = oc.createImageData(size, size);
  const at = (x, y) => lum[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -gx * strength, ny = -gy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const k = (y * size + x) * 4;
    img.data[k] = (nx * 0.5 + 0.5) * 255; img.data[k + 1] = (ny * 0.5 + 0.5) * 255;
    img.data[k + 2] = (nz * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function speckle(g, w, h, n, colors, r = 1.2) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(rand() * colors.length) | 0]; const s = r * (0.5 + rand()); g.fillRect(rand() * w, rand() * h, s, s); }
}
const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
const basic = (o) => new THREE.MeshBasicMaterial(o);
const scene = new THREE.Scene();
function add(mesh, parent) { (parent || scene).add(mesh); mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent); }
function plane(w, h, mat, x, y, z, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); return add(m, parent); }
function sphere(r, mat, x, y, z, parent, ws = 24, hs = 18) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.position.set(x, y, z); return add(m, parent); }
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, parent); }
function roundedBoxGeo(w, h, d, r, seg = 3) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const iw = w - 2 * r, ih = h - 2 * r, x = -iw / 2, y = -ih / 2;
  const sh = new THREE.Shape(); const cr = Math.min(r, iw / 2, ih / 2) * 0.999;
  sh.moveTo(x + cr, y); sh.lineTo(x + iw - cr, y); sh.quadraticCurveTo(x + iw, y, x + iw, y + cr); sh.lineTo(x + iw, y + ih - cr); sh.quadraticCurveTo(x + iw, y + ih, x + iw - cr, y + ih); sh.lineTo(x + cr, y + ih); sh.quadraticCurveTo(x, y + ih, x, y + ih - cr); sh.lineTo(x, y + cr); sh.quadraticCurveTo(x, y, x + cr, y);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: seg * 2 });
  g.center(); g.computeVertexNormals(); return g;
}
function rbox(w, h, d, r, mat, x = 0, y = 0, z = 0, parent, seg = 3) { const m = new THREE.Mesh(roundedBoxGeo(w, h, d, r, seg), mat); m.position.set(x, y, z); return add(m, parent); }
const UP = new THREE.Vector3(0, 1, 0);
function limb(r, a, b, mat, parent, caps = 6, rad = 16) {
  const d = b.clone().sub(a); const len = d.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.005, len - r), caps, rad), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize());
  return add(m, parent);
}

/* ================= renderer / post ================= */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let DPR = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.5);   // 1.5x on retina: the VHS pass + MSAA are fill-bound; the loop steps down further if frames run long

scene.background = new THREE.Color(0xb9b09d);
scene.fog = new THREE.FogExp2(0xb9b09d, 0.014);
const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 80);

const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false, samples: 2 });
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// VHS post pass — port of Canvas UI "VHS" (tape wave, jitter, crease, head switching, bloom bleed,
// aberration, AC beat, grain, scanlines) applied to the rendered scene texture. Values = the docs demo.
const VHS = { speed: 0.5, wave: 1, jitter: 0.25, crease: 0.1, switching: 0.05, switchingHeight: 0.02, bloom: 0.4, aberration: 2, acBeat: 1, grain: 0.1, scanlines: 0.1, vignette: 0, barrel: 0, saturation: 1, exposure: 1 };
window.VHS ||= VHS;
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uFade: { value: 0 }, uTime: { value: 0 },
    uWave: { value: VHS.wave }, uJitter: { value: VHS.jitter }, uCrease: { value: VHS.crease }, uSwitching: { value: VHS.switching }, uSwitchHeight: { value: VHS.switchingHeight },
    uBloom: { value: VHS.bloom }, uAberration: { value: VHS.aberration }, uAcBeat: { value: VHS.acBeat }, uGrain: { value: VHS.grain }, uScanlines: { value: VHS.scanlines },
    uVignette: { value: VHS.vignette }, uBarrel: { value: VHS.barrel }, uSaturation: { value: VHS.saturation }, uExposure: { value: VHS.exposure }, uCreaseNoise: { value: 0 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFade; uniform float uTime;
    uniform float uWave, uJitter, uCrease, uSwitching, uSwitchHeight, uBloom, uAberration, uAcBeat, uGrain, uScanlines, uVignette, uBarrel, uSaturation, uExposure, uCreaseNoise;
    varying vec2 vUv;
    #define PI 3.14159265
    float hash(vec2 v){ return fract(sin(dot(v, vec2(89.44, 19.36))) * 22189.22); }
    float iHash(vec2 v, vec2 r){
      float h00 = hash(floor(v * r + vec2(0.0, 0.0)) / r); float h10 = hash(floor(v * r + vec2(1.0, 0.0)) / r);
      float h01 = hash(floor(v * r + vec2(0.0, 1.0)) / r); float h11 = hash(floor(v * r + vec2(1.0, 1.0)) / r);
      vec2 ip = smoothstep(vec2(0.0), vec2(1.0), mod(v * r, 1.0));
      return (h00 * (1.0 - ip.x) + h10 * ip.x) * (1.0 - ip.y) + (h01 * (1.0 - ip.x) + h11 * ip.x) * ip.y;
    }
    float noise(vec2 v){ float sum = 0.0; float s = 2.0; for (int i = 1; i < 7; i++) { sum += iHash(v + vec2(float(i)), vec2(2.0 * s)) / s; s *= 2.0; } return sum; }
    vec3 tape(vec2 p){ p = clamp(p, vec2(0.0005), vec2(0.9995)); return texture2D(tDiffuse, p).rgb; }
    float bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    void main(){
      vec2 uv = vUv;
      float edgeMask = 1.0;
      if (uBarrel > 0.0) {
        vec2 c = uv * 2.0 - 1.0; c *= 1.0 + uBarrel * 0.15 * dot(c, c);
        float m = max(abs(c.x), abs(c.y)); edgeMask = 1.0 - smoothstep(1.0 - 0.12 * uBarrel, 1.0, m);
        uv = c * 0.5 + 0.5;
      }
      vec2 uvn = uv; float t = uTime;
      float lineNoise = 0.0;
      if (uJitter + uCrease + uSwitching > 0.0) lineNoise = noise(vec2(uvn.y * 100.0, t * 10.0));
      if (uWave > 0.0) uvn.x += (noise(vec2(uvn.y, t)) - 0.5) * 0.005 * uWave;
      uvn.x += (lineNoise - 0.5) * 0.01 * uJitter;
      float tcPhase = clamp((sin(uvn.y * 8.0 - t * PI * 1.2) - 0.92) * uCreaseNoise, 0.0, 0.01) * 10.0 * uCrease;
      float tcNoise = max(lineNoise - 0.5, 0.0);
      uvn.x -= tcNoise * tcPhase;
      float snPhase = smoothstep(max(uSwitchHeight, 1e-4), 0.0, uvn.y) * uSwitching;
      uvn.y += snPhase * 0.3; uvn.x += snPhase * ((lineNoise - 0.5) * 0.2);
      vec3 col = tape(uvn);
      col *= 1.0 - tcPhase;
      col = mix(col, col.yzx, clamp(snPhase, 0.0, 1.0));
      if (uBloom > 0.0) {
        float px = uAberration / max(uRes.x, 1.0); vec3 bloomSum = vec3(0.0);
        for (int i = -8; i <= 2; i++) { vec3 s = tape(uvn + vec2(float(i) * px, 0.0)); if (i >= -4) bloomSum.r += s.r; if (i >= -6 && i <= 0) bloomSum.g += s.g; if (i <= -2) bloomSum.b += s.b; }
        bloomSum *= 0.1; col = mix(col, (col + bloomSum) / 1.7, clamp(uBloom, 0.0, 1.0));
      }
      if (uAcBeat > 0.0) col *= 1.0 + clamp(noise(vec2(0.0, uv.y + t * 0.2)) * 0.6 - 0.25, 0.0, 0.1) * uAcBeat;
      vec2 vd = (uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0);
      col *= 1.0 - uVignette * smoothstep(0.4, 1.1, length(vd));
      col *= (1.0 - dot(uv - 0.5, uv - 0.5) * 0.7) * uFade * edgeMask;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 o = gl_FragColor.rgb;
      float g = hash(uv * uRes + fract(t) * vec2(127.1, 311.7)) - 0.5;
      o += g * uGrain;
      float scan = sin(uv.y * uRes.y * PI) * 0.5;
      o *= 1.0 - uScanlines * 0.35 * scan;
      float lum = dot(o, vec3(0.299, 0.587, 0.114));
      o = mix(vec3(lum), o, clamp(uSaturation, 0.0, 2.0));
      o *= uExposure;
      float d = bayer4(floor(uv * uRes)) - 0.5;
      o = floor(o * 48.0 + d + 0.5) / 48.0;
      gl_FragColor.rgb = o;
    }`
});
// CPU twin of the shader noise for the travelling crease (as in the original component)
const vhsFract = (x) => x - Math.floor(x); const vhsHash2 = (x, y) => vhsFract(Math.sin(x * 89.44 + y * 19.36) * 22189.22); const vhsSmooth = (x) => x * x * (3 - 2 * x);
function vhsIHash(vx, vy, r) { const fx = Math.floor(vx * r), fy = Math.floor(vy * r); const h00 = vhsHash2(fx / r, fy / r), h10 = vhsHash2((fx + 1) / r, fy / r), h01 = vhsHash2(fx / r, (fy + 1) / r), h11 = vhsHash2((fx + 1) / r, (fy + 1) / r); const ix = vhsSmooth(vhsFract(vx * r)), iy = vhsSmooth(vhsFract(vy * r)); return (h00 * (1 - ix) + h10 * ix) * (1 - iy) + (h01 * (1 - ix) + h11 * ix) * iy; }
function vhsNoise(vx, vy) { let sum = 0, s = 2; for (let i = 1; i < 7; i++) { sum += vhsIHash(vx + i, vy + i, 2 * s) / s; s *= 2; } return sum; }
let vhsTime = 0;
function syncVHS(dt) {
  vhsTime += dt * VHS.speed; const u = postMat.uniforms;
  u.uTime.value = vhsTime; u.uCreaseNoise.value = vhsNoise(vhsTime, vhsTime);
  u.uWave.value = VHS.wave; u.uJitter.value = VHS.jitter; u.uCrease.value = VHS.crease; u.uSwitching.value = VHS.switching; u.uSwitchHeight.value = VHS.switchingHeight; u.uBloom.value = VHS.bloom;
  u.uAberration.value = VHS.aberration * DPR; u.uAcBeat.value = VHS.acBeat; u.uGrain.value = VHS.grain; u.uScanlines.value = VHS.scanlines; u.uVignette.value = VHS.vignette; u.uBarrel.value = VHS.barrel; u.uSaturation.value = VHS.saturation; u.uExposure.value = VHS.exposure;
}
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

await yieldToPage();
/* ================= textures ================= */
const woodTex = canvasTex(512, 1024, (g, w, h) => {
  g.fillStyle = '#5b3d27'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { const x = rand() * w; g.fillStyle = rand() < 0.5 ? 'rgba(40,24,12,0.35)' : 'rgba(150,100,60,0.22)'; g.fillRect(x, 0, rr(1, 9), h); }
  speckle(g, w, h, 6000, ['rgba(20,12,6,0.5)', 'rgba(170,120,80,0.3)'], 1.6);
}, { repeat: [1, 1] });
const woodDarkTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#3a2718'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 120; i++) { const x = rand() * w; g.fillStyle = rand() < 0.5 ? 'rgba(20,12,6,0.4)' : 'rgba(120,80,50,0.18)'; g.fillRect(x, 0, rr(1, 7), h); }
}, { repeat: [3, 3] });
/* ---- oak boarding. Painted as strokes rather than per-pixel noise so a 2048px
   tile costs milliseconds, then tiled 4x across the room and given a derived
   normal + roughness so the sun rakes across the grain. ---- */
function paintBoards(g, w, h, opt) {
  const { rows, base, spread, seam, ringAlpha, fleck } = opt;
  const RH = h / rows;
  // strokes that leave the tile are redrawn on the other side so it tiles across x
  const wrapPath = (draw) => { draw(0); draw(-w); draw(w); };
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let r = 0; r < rows; r++) {
    const y0 = r * RH, tone = rr(-spread, spread), warm = rr(-6, 10);
    g.fillStyle = `rgb(${base_r + tone + warm},${base_g + tone * 0.82},${base_b + tone * 0.6})`;
    g.fillRect(0, y0, w, RH);
    // cathedral figure: nested arcs sweeping down the board
    const arcs = 2 + ((rand() * 3) | 0);
    for (let a = 0; a < arcs; a++) {
      const cx = rand() * w, span = rr(w * 0.16, w * 0.55), lift = rr(RH * 0.25, RH * 0.95);
      for (let k = 0; k < 9; k++) {
        const t = k / 8, yy = y0 + RH * 0.5 + (t - 0.5) * RH * 0.9;
        g.strokeStyle = `rgba(${ring_r},${ring_g},${ring_b},${(ringAlpha * (0.35 + 0.65 * (1 - Math.abs(t - 0.5) * 2))).toFixed(3)})`;
        g.lineWidth = rr(1.0, 3.4);
        wrapPath((ox) => {
          g.beginPath();
          g.moveTo(cx - span / 2 + ox, yy);
          g.quadraticCurveTo(cx + ox, yy - lift * (1 - Math.abs(t - 0.5) * 1.4), cx + span / 2 + ox, yy);
          g.stroke();
        });
      }
    }
    // fine straight grain
    for (let n = 0; n < 150; n++) {
      const yy = y0 + rand() * RH;
      g.strokeStyle = rand() < 0.68 ? `rgba(${ring_r},${ring_g},${ring_b},${(0.05 + rand() * 0.16).toFixed(3)})`
                                    : `rgba(240,220,190,${(0.04 + rand() * 0.12).toFixed(3)})`;
      g.lineWidth = rr(0.6, 1.9);
      const x0 = rand() * w, len = rr(w * 0.1, w * 0.6);
      wrapPath((ox) => { g.beginPath(); g.moveTo(x0 + ox, yy);
        g.bezierCurveTo(x0 + len * 0.34 + ox, yy + rr(-2, 2), x0 + len * 0.68 + ox, yy + rr(-2, 2), x0 + len + ox, yy + rr(-1, 1)); g.stroke(); });
    }
    // medullary ray fleck: short pale slashes across the grain
    for (let n = 0; n < fleck; n++) {
      g.fillStyle = `rgba(246,230,204,${(0.05 + rand() * 0.13).toFixed(3)})`;
      g.save(); g.translate(rand() * w, y0 + rand() * RH); g.rotate(rr(-0.16, 0.16));
      g.fillRect(0, 0, rr(6, 30), rr(0.8, 2.2)); g.restore();
    }
    if (rand() < 0.28) {                                   // a knot every few boards
      const kx = rand() * w, ky = y0 + RH * rr(0.3, 0.7), kr = rr(2.5, 6);
      const gr = g.createRadialGradient(kx, ky, 0, kx, ky, kr * 3);
      gr.addColorStop(0, 'rgba(64,38,16,0.8)'); gr.addColorStop(0.5, 'rgba(96,62,30,0.35)'); gr.addColorStop(1, 'rgba(96,62,30,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(kx, ky, kr * 3, kr * 1.4, 0, 0, 6.3); g.fill();
    }
    // butt joints, staggered board to board
    for (let bx = rand() * w; bx < w; bx += rr(w * 0.3, w * 0.75)) {
      g.fillStyle = 'rgba(52,32,14,0.55)'; g.fillRect(bx, y0 + 1, 1.8, RH - 2);
      g.fillStyle = 'rgba(255,238,212,0.10)'; g.fillRect(bx + 1.8, y0 + 1, 1.2, RH - 2);
    }
    // the bevel that makes each board read as a separate piece of timber
    g.fillStyle = `rgba(255,240,214,0.13)`; g.fillRect(0, y0 + 1, w, 1.6);
    g.fillStyle = seam; g.fillRect(0, y0 + RH - 2.2, w, 2.2);
  }
}
let base_r = 176, base_g = 136, base_b = 92, ring_r = 104, ring_g = 68, ring_b = 32;
const floorTex = canvasTex(2048, 2048, (g, w, h) => {
  paintBoards(g, w, h, { rows: 40, base: '#b0885c', spread: 15, seam: 'rgba(58,36,16,0.6)', ringAlpha: 0.2, fleck: 90 });
  // a walked-in patina along the route between the stairs and the screens
  for (let n = 0; n < 26; n++) {
    const cx = rand() * w, cy = rand() * h, rx = rr(90, 320), ry = rr(60, 200);
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
    gr.addColorStop(0, `rgba(96,68,38,${(0.05 + rand() * 0.06).toFixed(3)})`); gr.addColorStop(1, 'rgba(96,68,38,0)');
    g.fillStyle = gr; g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx, 0, 6.3); g.fill(); g.restore();
  }
}, { repeat: [4, 4] });
const floorNormal = reliefFrom(floorTex.userData.canvas, { strength: 2.2, blur: 1.1, size: 1024 });
floorNormal.repeat.set(4, 4);
const floorRough = canvasTex(1024, 1024, (g, w, h) => {
  g.drawImage(floorTex.userData.canvas, 0, 0, w, h);
  g.globalCompositeOperation = 'saturation'; g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(150,150,150,0.55)'; g.fillRect(0, 0, w, h);   // lift into the satin range
}, { repeat: [4, 4], linear: true });

/* ---- tatami sheet for the screen room: mats laid in a proper six-mat grid ---- */
const tatamiTex = canvasTex(2048, 1024, (g, w, h) => {
  g.fillStyle = '#8f8248'; g.fillRect(0, 0, w, h);
  const mat = (x, y, mw, mh) => {
    g.save(); g.translate(x, y);
    g.fillStyle = '#c3bd7e'; g.fillRect(0, 0, mw, mh);
    const along = mw >= mh;                                  // weave runs the long way
    g.strokeStyle = 'rgba(146,138,84,0.55)'; g.lineWidth = 1.3;
    if (along) for (let yy = 3; yy < mh; yy += 5) { g.beginPath(); g.moveTo(0, yy); g.lineTo(mw, yy); g.stroke(); }
    else for (let xx = 3; xx < mw; xx += 5) { g.beginPath(); g.moveTo(xx, 0); g.lineTo(xx, mh); g.stroke(); }
    for (let n = 0; n < 900; n++) {
      g.fillStyle = `rgba(${rand() < 0.5 ? '112,104,58' : '218,212,160'},${(rand() * 0.18).toFixed(3)})`;
      g.fillRect(rand() * mw, rand() * mh, along ? rr(4, 22) : 1.4, along ? 1.4 : rr(4, 22));
    }
    const hb = Math.max(7, Math.min(mw, mh) * 0.055);        // heri: dark cloth on the long edges
    g.fillStyle = '#26303c';
    if (along) { g.fillRect(0, 0, mw, hb); g.fillRect(0, mh - hb, mw, hb); }
    else { g.fillRect(0, 0, hb, mh); g.fillRect(mw - hb, 0, hb, mh); }
    g.strokeStyle = 'rgba(30,24,10,0.6)'; g.lineWidth = 2.5; g.strokeRect(1, 1, mw - 2, mh - 2);
    g.restore();
  };
  /* the classic six-mat setting: no four corners ever meet */
  const U = w / 3;                 // one mat is 2 x 1 units
  const H = h / 2;
  mat(0, 0, U, H); mat(0, H, U, H);
  mat(U, 0, U * 2, H * 0.5); mat(U, H * 0.5, U * 2, H * 0.5);
  mat(U, H, U * 2, H * 0.5); mat(U, H * 1.5, U * 2, H * 0.5);
});
const stepTex = canvasTex(1024, 1024, (g, w, h) => {
  /* keyaki tread: one board per step, grain across the run */
  g.fillStyle = '#b58c56'; g.fillRect(0, 0, w, h);
  for (let n = 0; n < 1400; n++) {
    g.strokeStyle = rand() < 0.68 ? `rgba(96,62,30,${(0.08 + rand() * 0.26).toFixed(3)})`
                                  : `rgba(240,214,170,${(0.06 + rand() * 0.2).toFixed(3)})`;
    g.lineWidth = rr(0.8, 3.2);
    const y = rand() * h, x0 = rand() * w, len = rr(w * 0.2, w);
    g.beginPath(); g.moveTo(x0, y);
    g.bezierCurveTo(x0 + len * 0.35, y + rr(-4, 4), x0 + len * 0.7, y + rr(-4, 4), x0 + len, y + rr(-2, 2));
    g.stroke();
  }
  g.fillStyle = 'rgba(70,45,22,0.32)'; g.fillRect(0, h - 5, w, 5);
}, { repeat: [2, 2] });
/* shoji: washi paper on a kumiko lattice, lit from behind */
const shojiTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#f3ece0'; g.fillRect(0, 0, w, h);
  for (let n = 0; n < 4000; n++) { g.fillStyle = `rgba(200,186,162,${(rand() * 0.10).toFixed(3)})`; g.fillRect(rand() * w, rand() * h, rr(2, 14), 1); }
  g.fillStyle = '#4a3524';
  const cols = 4, rows = 6, t = 7;
  for (let i = 0; i <= cols; i++) g.fillRect(Math.min(i * w / cols, w - t), 0, t, h);
  for (let j = 0; j <= rows; j++) g.fillRect(0, Math.min(j * h / rows, h - t), w, t);
});
/* jurakukabe: the warm earthen plaster of a Kyoto interior */
const plasterTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#c2b096'; g.fillRect(0, 0, w, h);
  for (let n = 0; n < 9000; n++) {
    const a = (rand() * 0.14).toFixed(3);
    g.fillStyle = rand() < 0.5 ? `rgba(150,132,106,${a})` : `rgba(220,208,188,${a})`;
    g.fillRect(rand() * w, rand() * h, rr(3, 26), rr(2, 12));
  }
  for (let n = 0; n < 1400; n++) { g.fillStyle = `rgba(110,92,66,${(rand() * 0.3).toFixed(3)})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
}, { repeat: [4, 2] });
const meshTex = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(200,200,200,0.95)'; g.lineWidth = 4;
  g.beginPath();
  for (let i = -1; i <= 2; i++) { g.moveTo(i * w, 0); g.lineTo((i + 1) * w, h); g.moveTo(i * w, h); g.lineTo((i + 1) * w, 0); }
  g.stroke();
}, { repeat: [10, 15] });
const glowTex = canvasTex(64, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e6ad74'); gr.addColorStop(0.1, '#7a5030'); gr.addColorStop(0.42, '#22150c'); gr.addColorStop(1, '#100904');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const softTex = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const neonTex = canvasTex(2048, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = '700 300px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.shadowColor = 'rgba(255,255,255,0.95)'; g.shadowBlur = 60;
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 12; g.strokeText('ahmed.', w / 2, h / 2 + 8);
  g.shadowBlur = 0; g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeText('ahmed.', w / 2, h / 2 + 8);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillText('ahmed.', w / 2, h / 2 + 8);
});
const marqueeTex = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = '#0c0504'; g.fillRect(0, 0, w, h); });
function drawMarquee(t) {
  const g = marqueeTex.userData.ctx, w = 1024, h = 256;
  g.fillStyle = '#12060a'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0a06'); gr.addColorStop(0.5, '#4a1408'); gr.addColorStop(1, '#2a0a06'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,90,20,0.35)'; g.lineWidth = 2; for (let x = -200; x < w + 200; x += 46) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 120, 0); g.stroke(); }
  g.font = '700 132px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff3a00'; g.shadowBlur = 40; g.fillStyle = '#ff4d1a'; g.fillText('AHMED', w / 2, h / 2 + 6);
  g.shadowBlur = 0; g.fillStyle = '#ffd8c4'; g.fillText('AHMED', w / 2, h / 2 + 6);
  // light sweep
  const sx = ((t * 0.18) % 1.6 - 0.3) * w; const sg = g.createLinearGradient(sx - 160, 0, sx + 160, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = sg; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over';
  g.font = '600 22px "Geist Mono", monospace'; g.fillStyle = 'rgba(255,200,170,0.8)'; g.fillText('D E F E N D E R', w / 2, h - 30);
  marqueeTex.needsUpdate = true;
}
const backboardTex = canvasTex(1024, 768, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.beginPath(); g.moveTo(80, 120); g.quadraticCurveTo(512, -56, 944, 120); g.lineTo(944, 520); g.quadraticCurveTo(512, 840, 80, 520); g.closePath();
  g.fillStyle = 'rgba(20,20,20,0.82)'; g.fill(); g.lineWidth = 18; g.strokeStyle = '#d0d0d0'; g.stroke();
  g.fillStyle = '#ff5a12'; g.beginPath(); g.arc(512, 224, 86, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3a1a08'; g.lineWidth = 8; g.beginPath(); g.moveTo(426, 224); g.lineTo(598, 224); g.moveTo(512, 138); g.lineTo(512, 310); g.stroke();
  g.font = '700 104px "Geist", Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#e8e8e8'; g.strokeStyle = '#000'; g.lineWidth = 20; g.lineJoin = 'round';
  g.strokeText('AE', 412, 232); g.fillText('AE', 412, 232); g.textAlign = 'left'; g.strokeText('SHOT!', 612, 232); g.fillText('SHOT!', 612, 232);
  g.strokeStyle = '#e0e0e0'; g.lineWidth = 12; g.strokeRect(384, 368, 256, 200);
});
const tickerSrc = document.createElement('canvas'); tickerSrc.width = 4096; tickerSrc.height = 64;
{ const g = tickerSrc.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 4096, 64); g.font = '700 46px "Geist Mono", monospace'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('AHMED ESMAIL   ///   WEB APPS FOR YOUR BUSINESS   ///   DESIGN TO DEPLOYMENT   ///   NOW PLAYING: AE DEFENDER   ///   ', 0, 34); }
const tickerTex = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }, { nearest: true, repeat: [1, 1] });
const tickerMask = document.createElement('canvas'); tickerMask.width = 1024; tickerMask.height = 64;
{ const g = tickerMask.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 64); g.fillStyle = '#fff'; for (let y = 4; y < 64; y += 8) for (let x = 4; x < 1024; x += 8) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); } }
function drawTicker(t) {
  const g = tickerTex.userData.ctx, w = 1024, h = 64;
  const off = (t * 140) % 3300;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.drawImage(tickerSrc, off, 0, w, h, 0, 0, w, h); if (off + w > 3300) g.drawImage(tickerSrc, 0, 0, w, h, 3300 - off, 0, w, h);
  g.globalCompositeOperation = 'multiply'; g.drawImage(tickerMask, 0, 0); g.globalCompositeOperation = 'source-over';
  tickerTex.needsUpdate = true;
}
const phoneTex = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, w, h); }, { nearest: true });
function drawPhone(t) {
  const g = phoneTex.userData.ctx, w = 64, h = 128; g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, w, h);
  const y0 = -((t * 22) % 46);
  for (let i = 0; i < 5; i++) { const y = y0 + i * 46; g.fillStyle = i % 2 ? '#1c2540' : '#22304f'; g.fillRect(6, y + 6, 52, 34); g.fillStyle = '#9fb4ff'; g.fillRect(10, y + 12, 22, 4); g.fillRect(10, y + 20, 40, 3); g.fillStyle = '#ff4d00'; g.fillRect(10, y + 30, 12, 5); }
  g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, w, 10); g.fillStyle = '#9fb4ff'; g.fillRect(24, 3, 16, 3);
  phoneTex.needsUpdate = true;
}
const laminateTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#111111'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 30000, ['#161616', '#0c0c0c', '#191919', '#0e0e0e'], 1.6);
  g.fillStyle = 'rgba(255,255,255,0.02)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
}, { repeat: [2, 2] });
const sideArtTex = canvasTex(1024, 2048, (g, w, h) => {
  // u = depth (0 = back, 1 = front), v = height (canvas y flipped: top of canvas = top of cabinet)
  g.fillStyle = '#0f0f0f'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 60000, ['#141414', '#0a0a0a', '#181818'], 1.8);
  g.save(); g.translate(0, h); g.scale(1, -1); // now y up, matches UV v
  const band = (x0, y0, x1, y1, wdt, col) => { g.strokeStyle = col; g.lineWidth = wdt; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  band(w * 0.05, 0, w * 0.95, h * 0.62, 150, '#ff4d00');
  band(w * 0.05, -h * 0.12, w * 0.95, h * 0.5, 22, '#ffffff');
  band(w * 0.05, h * 0.16, w * 0.95, h * 0.78, 10, 'rgba(255,255,255,0.35)');
  g.fillStyle = '#ff4d00'; g.beginPath(); g.moveTo(w * 0.3, h * 0.82); g.lineTo(w * 0.42, h * 0.98); g.lineTo(w * 0.18, h * 0.98); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(w * 0.62, h * 0.86); g.lineTo(w * 0.7, h * 0.97); g.lineTo(w * 0.54, h * 0.97); g.closePath(); g.fill();
  g.restore();
  // vertical brand text along the back edge (drawn in canvas space; text reads bottom-to-top)
  g.save(); g.translate(150, h * 0.62); g.rotate(-Math.PI / 2);
  g.font = '700 190px "Geist", Arial, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = '#ffffff'; g.fillText('AHMED', 0, 0);
  g.font = '700 74px "Geist Mono", monospace'; g.fillStyle = '#ff4d00'; g.fillText('D E F E N D E R', 0, 150);
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
});
sideArtTex.repeat.set(1 / 0.91, 1 / 2.06); sideArtTex.offset.set(0.38 / 0.91, 0); sideArtTex.wrapS = sideArtTex.wrapT = THREE.ClampToEdgeWrapping;
const bezelTex = canvasTex(1024, 768, (g, w, h) => {
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 20000, ['#101010', '#060606'], 1.6);
  g.strokeStyle = '#ff4d00'; g.lineWidth = 6; g.strokeRect(70, 78, w - 140, h - 156);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(58, 66, w - 116, h - 132);
  g.font = '700 44px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff4d00'; g.fillText('AE DEFENDER', w / 2, 40);
  g.font = '600 26px "Geist Mono", monospace'; g.fillStyle = '#e6e6e6'; g.fillText('◀ ▶ MOVE      ● FIRE      1 PLAYER      ESC LEAVE', w / 2, h - 40);
  g.fillStyle = '#050505'; g.fillRect(76, 84, w - 152, h - 168);
});
const panelTex = canvasTex(1024, 320, (g, w, h) => {
  g.fillStyle = '#121212'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 12000, ['#181818', '#0c0c0c'], 1.6);
  g.strokeStyle = 'rgba(255,77,0,0.55)'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * 0.5 + Math.sin(x * 0.012 + i * 0.8) * (40 + i * 12); if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  g.font = '700 30px "Geist Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e6e6e6';
  g.fillText('MOVE', 190, h - 40); g.fillText('FIRE', 640, h - 40);
  g.font = '700 22px "Geist Mono", monospace'; g.fillStyle = '#ff4d00'; g.fillText('AHMED', 370, 28); g.fillStyle = '#e6e6e6'; g.fillText('1 PLAYER', 940, 28);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40);
});
const coinTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#080808'; g.fillRect(70, 30, 20, 50); g.fillRect(166, 30, 20, 50);
  g.fillStyle = '#ff4d00'; g.fillRect(40, 96, w - 80, 4); g.font = '700 16px "Geist Mono", monospace'; g.textAlign = 'center'; g.fillStyle = '#e6e6e6'; g.fillText('INSERT COIN', w / 2, 20);
});
const signTex = canvasTex(512, 768, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = '#e6e6e6';
  g.font = '700 84px "Geist", Arial, sans-serif'; g.fillText('2', 80, 240);
  g.font = '600 18px "Geist", Arial, sans-serif';
  ['OFFICES', 'SHOWCASE', 'THE BOARDROOM', '', 'MEETING ROOMS', 'CREATIVE FLOOR', 'ROOFTOP'].forEach((t, i) => g.fillText(t, 220, 184 + i * 24));
  g.font = '700 84px "Geist", Arial, sans-serif'; g.fillText('1', 80, 500);
  g.font = '600 18px "Geist", Arial, sans-serif';
  ['COMPANY STORE', 'CONFERENCE ROOM', 'LOUNGE', '', 'RESTROOMS', 'KITCHEN', 'LOBBY'].forEach((t, i) => g.fillText(t, 220, 444 + i * 24));
  g.strokeStyle = '#e6e6e6'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(280, 380); g.lineTo(232, 332); g.moveTo(232, 332); g.lineTo(232, 364); g.moveTo(232, 332); g.lineTo(264, 332); g.stroke();
  g.beginPath(); g.moveTo(224, 636); g.lineTo(280, 636); g.moveTo(260, 616); g.lineTo(280, 636); g.lineTo(260, 656); g.stroke();
});
const posterTex = canvasTex(256, 384, (g, w, h) => {
  g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, w, h); g.fillStyle = '#222';
  for (let i = 0; i < 1500; i++) g.fillRect(rand() * w, 80 + rand() * 220, 3, 3);
  g.fillRect(56, 52, 144, 12); g.fillRect(56, 320, 80, 8);
});
const ballTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#e8641c'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 9000, ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.08)'], 2);
  g.strokeStyle = '#1a0d06'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  for (const x of [0, w / 2, w]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.beginPath(); g.moveTo(w * 0.25, 0); g.quadraticCurveTo(w * 0.05, h / 2, w * 0.25, h); g.stroke();
  g.beginPath(); g.moveTo(w * 0.75, 0); g.quadraticCurveTo(w * 0.95, h / 2, w * 0.75, h); g.stroke();
});

// animated textures
const arcadeTex = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#100402'; g.fillRect(0, 0, w, h); });
const staticTexA = canvasTex(160, 120, (g, w, h) => { g.fillStyle = '#444'; g.fillRect(0, 0, w, h); }, { nearest: true });
const staticTexB = canvasTex(160, 120, (g, w, h) => { g.fillStyle = '#333'; g.fillRect(0, 0, w, h); }, { nearest: true });
function drawStatic(tex, t, blobs) {
  const g = tex.userData.ctx, w = tex.userData.canvas.width, h = tex.userData.canvas.height;
  const img = g.createImageData(w, h); const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const y = (i / w) | 0;
    let v = Math.random() * 255;
    const band = Math.sin(y * 0.25 + t * 9) * 30 + Math.sin(y * 0.04 - t * 2) * 40;
    v = v * 0.45 + band + 70; v = Math.max(0, Math.min(255, v));
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (blobs) {
    g.globalAlpha = 0.85;
    for (let k = 0; k < 4; k++) { const x = (Math.sin(t * 0.7 + k * 2.1) * 0.5 + 0.5) * w, y = (Math.cos(t * 0.5 + k * 1.3) * 0.5 + 0.5) * h; const gr = g.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, k % 2 ? '#f4f4f4' : '#101010'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.globalAlpha = 1;
  }
  tex.needsUpdate = true;
}

await yieldToPage();
/* ================= materials ================= */
const matWood = std({ map: woodTex, roughness: 0.75, color: 0x9a7d6a });
const matWoodDark = std({ map: woodDarkTex, roughness: 0.85 });
const matFloor = std({ map: floorTex, normalMap: floorNormal, roughnessMap: floorRough, roughness: 1, color: 0xffffff });
matFloor.normalScale.set(0.85, 0.85);
const matTatami = std({ map: tatamiTex, roughness: 0.94 });
const matStep = std({ map: stepTex, roughness: 0.66, color: 0xffffff });
const matShoji = std({ map: shojiTex, roughness: 0.95, emissive: 0xfff0d8, emissiveIntensity: 0.95, emissiveMap: shojiTex });
const matPlaster = std({ map: plasterTex, color: 0xa89882, roughness: 0.98 });
const matTimber = std({ map: woodDarkTex, color: 0x8a6742, roughness: 0.72 });
const matDark = std({ color: 0x3a2a1c, roughness: 0.85 });
const matWall = matPlaster;
const matWallR = std({ map: plasterTex, color: 0xd8cdb8, roughness: 0.98 });
const matMetal = std({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.4 });
const matSteel = std({ color: 0x5a5a5a, roughness: 0.35, metalness: 0.9 });
const matSlab = std({ color: 0x4a3826, roughness: 0.95 });
const matBlack = std({ color: 0x040404, roughness: 1 });
const matCeil = std({ map: woodDarkTex, color: 0x6b4f34, roughness: 0.9 });
const matCab = std({ color: 0x111111, roughness: 0.55 });
const matOrange = basic({ color: 0xff4d00 });
const matGlow = basic({ map: glowTex });
const matWhite = basic({ color: 0xffffff });

await yieldToPage();
/* ================= room ================= */
const floor = plane(34, 34, matFloor, 0, 0, -2); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
const ceil = plane(44, 44, matCeil, 0, 7.6, -3); ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;
plane(2.2, 8, matWall, -0.6, 3.8, -3.42);
box(1.4, 7.6, 0.6, matWall, 2.95, 3.8, -3.55);
plane(10, 8, matWallR, 8.6, 3.8, -5.85);
const bayL = plane(2.6, 8, matWallR, 3.65, 3.8, -4.65); bayL.rotation.y = Math.PI / 2;
const wallL = plane(24, 8, matWall, -11.6, 3.8, -1); wallL.rotation.y = Math.PI / 2;
const wallR = plane(24, 8, matWallR, 13.6, 3.8, -1); wallR.rotation.y = -Math.PI / 2;

/* ---------- the tatami setting under the screens ---------- */
(function tatamiRoom() {
  const x0 = 3.25, x1 = 8.0, z0 = -4.5, z1 = -1.25;         // the bay the CRTs stand in
  const g = new THREE.Group(); scene.add(g);
  const mats = plane(x1 - x0, z1 - z0, matTatami, (x0 + x1) / 2, 0.012, (z0 + z1) / 2, g);
  mats.rotation.x = -Math.PI / 2; mats.castShadow = false; mats.receiveShadow = true;
  /* kamachi: the timber lip that holds the mats and separates them from the boards */
  const T = 0.075, LIP = 0.055;
  box(x1 - x0 + T * 2, LIP, T, matTimber, (x0 + x1) / 2, LIP / 2, z0 - T / 2, g);
  box(x1 - x0 + T * 2, LIP, T, matTimber, (x0 + x1) / 2, LIP / 2, z1 + T / 2, g);
  box(T, LIP, z1 - z0 + T * 2, matTimber, x0 - T / 2, LIP / 2, (z0 + z1) / 2, g);
  box(T, LIP, z1 - z0 + T * 2, matTimber, x1 + T / 2, LIP / 2, (z0 + z1) / 2, g);
})();

/* ---------- shelf wall ---------- */
(function shelves() {
  const g = new THREE.Group(); scene.add(g);
  const x0 = -11.4, x1 = -1.62, y0 = 0.0, y1 = 7.5, z = -3.4, depth = 0.6;
  box(x1 - x0 + 0.2, y1 - y0, 0.12, matWoodDark, (x0 + x1) / 2, (y0 + y1) / 2, z - depth - 0.06, g);
  const cw = 0.815, ch = 0.83;
  const cols = Math.round((x1 - x0) / cw), rows = Math.round((y1 - y0) / ch);
  const divs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, y1 - y0, depth), matWood, cols + 1);
  const shelvesM = new THREE.InstancedMesh(new THREE.BoxGeometry(x1 - x0, 0.065, depth), matWood, rows + 1);
  const glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(cw - 0.09, ch - 0.09), matGlow, cols * rows);
  const m = new THREE.Matrix4();
  for (let i = 0; i <= cols; i++) { m.makeTranslation(x0 + i * cw, (y0 + y1) / 2, z - depth / 2); divs.setMatrixAt(i, m); }
  for (let j = 0; j <= rows; j++) { m.makeTranslation((x0 + x1) / 2, y0 + j * ch, z - depth / 2); shelvesM.setMatrixAt(j, m); }
  let k = 0;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { m.makeTranslation(x0 + (i + 0.5) * cw, y0 + (j + 0.5) * ch, z - depth + 0.02); glows.setMatrixAt(k++, m); }
  divs.castShadow = divs.receiveShadow = shelvesM.castShadow = shelvesM.receiveShadow = true;
  g.add(divs, shelvesM, glows);
  const items = [[9, 7, 'poster'], [10, 6, 'poster'], [8, 5, 'bag'], [11, 5, 'can'], [9, 4, 'poster'], [10, 3, 'poster'], [11, 7, 'dark'], [7, 8, 'poster'], [6, 6, 'bag'], [7, 4, 'poster'], [5, 7, 'can'], [8, 8, 'can'], [6, 3, 'poster'], [4, 5, 'dark'], [3, 7, 'poster'], [10, 8, 'can'], [11, 4, 'poster']];
  const posterMat = std({ map: posterTex, roughness: 0.8 }), bagMat = std({ color: 0xe48ab8, roughness: 0.6 }), canMat = std({ color: 0xcfcfcf, roughness: 0.4, metalness: 0.5 }), darkMat = std({ color: 0x0b0b0b });
  for (const [i, j, kind] of items) {
    if (i >= cols || j >= rows) continue;
    const cx = x0 + (i + 0.5) * cw, cy = y0 + j * ch + 0.035, cz = z - depth / 2;
    if (kind === 'poster') { const pl = plane(0.34, 0.5, posterMat, cx, cy + 0.3, cz + 0.02); pl.rotation.y = rr(-0.25, 0.25); }
    else if (kind === 'bag') { rbox(0.26, 0.2, 0.14, 0.04, bagMat, cx, cy + 0.12, cz); cyl(0.005, 0.005, 0.12, matSteel, cx, cy + 0.26, cz, undefined, 8).rotation.z = Math.PI / 2; }
    else if (kind === 'can') { cyl(0.07, 0.07, 0.28, canMat, cx, cy + 0.16, cz); }
    else { rbox(0.34, 0.34, 0.24, 0.03, darkMat, cx, cy + 0.19, cz); }
  }
  const bannerTex = canvasTex(256, 1536, (g, w, h) => { g.fillStyle = '#0f0f0f'; g.fillRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2); g.font = '700 150px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('AHMED', 0, 0); g.restore(); g.fillStyle = '#ff4d00'; g.fillRect(20, 40, w - 40, 6); g.fillRect(20, h - 46, w - 40, 6); });
  const banner = plane(0.4, 2.4, std({ map: bannerTex, roughness: 0.6 }), -4.05, 6.1, z - depth + 0.12); banner.rotation.y = 0.04;
})();

await yieldToPage();
/* ---------- stairs ---------- */
const RISE = 0.265, RUN = 0.6, STEPS = 14, X_BOTTOM = 0.0, Z0 = -2.7, Z1 = -0.45, BASE = 0.39;
const STEP_TOP = (i) => BASE + i * RISE;   // tread height of step i (0 = bottom plinth)
(function stairs() {
  /* Built as carpentry rather than extruded: a pair of inclined stringers carrying
     tread boards, with the riser boards set back so every tread throws its own
     shadow line. Nothing is a solid wedge, so you can see through the flight. */
  const matTread = std({ map: stepTex, color: 0xf2dfc2, roughness: 0.56 });
  const matStringer = std({ map: stepTex, color: 0xa07f56, roughness: 0.8 });
  const matRiserB = std({ map: stepTex, color: 0xb08a5c, roughness: 0.82 });
  const nosing = std({ color: 0x4b3520, roughness: 0.7 });
  const TREAD = 0.058, SETBACK = 0.055, SW = 0.085, OVER = 0.032;
  const len = STEPS * RUN, ang = Math.atan2(RISE, RUN);
  const diag = Math.hypot(len, STEPS * RISE);
  // the two stringers the whole flight sits on
  for (const zz of [Z0 + SW / 2 + 0.01, Z1 - SW / 2 - 0.01]) {
    const st = box(diag + 0.55, 0.36, SW, matStringer, 0, 0, 0);
    st.position.set(X_BOTTOM - len / 2, (STEP_TOP(0) + STEP_TOP(STEPS - 1)) / 2 - 0.14, zz);
    st.rotation.z = -ang;
  }
  for (let i = 0; i < STEPS; i++) {
    const top = STEP_TOP(i);
    const xa = X_BOTTOM - (i + 1) * RUN;
    const zA = Z0 + SW, zB = Z1 - SW, zc = (zA + zB) / 2, dz = zB - zA;
    // riser board, set back from the nosing
    const below = i === 0 ? 0 : STEP_TOP(i - 1);
    box(0.028, top - TREAD - below, dz, matRiserB, xa + SETBACK, (below + top - TREAD) / 2, zc);
    // tread board, overhanging the riser on the front and both ends
    box(RUN + OVER, TREAD, dz + 0.04, matTread, xa + RUN / 2 + OVER / 2, top - TREAD / 2, zc);
    box(0.024, 0.014, dz + 0.04, nosing, xa + RUN + OVER - 0.012, top - TREAD - 0.007, zc);
  }
  // the bottom step needs a footing, and the top a landing deck rather than a solid mass
  // the bottom step is built exactly like the rest: a set-back riser under an
  // overhanging tread, carried on the same stringers
  {
    const zA = Z0 + SW, zB = Z1 - SW, zc = (zA + zB) / 2, dz = zB - zA;
    box(0.028, BASE - TREAD, dz, matRiserB, X_BOTTOM - RUN + SETBACK, (BASE - TREAD) / 2, zc);
    box(RUN + OVER, TREAD, dz + 0.04, matTread, X_BOTTOM - RUN / 2 + OVER / 2, BASE - TREAD / 2, zc);
    box(0.024, 0.014, dz + 0.04, nosing, X_BOTTOM + OVER - 0.012, BASE - TREAD - 0.007, zc);

  }
  const LTOP = STEP_TOP(STEPS - 1);
  box(2.4, TREAD, Z1 - Z0, matTread, X_BOTTOM - len - 1.2, LTOP - TREAD / 2, (Z0 + Z1) / 2);
  box(2.4, 0.3, SW, matStringer, X_BOTTOM - len - 1.2, LTOP - 0.3 / 2 - TREAD, Z1 - SW / 2 - 0.01);
  box(2.4, 0.3, SW, matStringer, X_BOTTOM - len - 1.2, LTOP - 0.3 / 2 - TREAD, Z0 + SW / 2 + 0.01);
  for (let i = 0; i < 5; i++)                                   // posts holding the landing up
    box(0.12, LTOP - TREAD, 0.12, matStringer, X_BOTTOM - len - 0.15 - i * 0.52, (LTOP - TREAD) / 2, i % 2 ? Z0 + 0.4 : Z1 - 0.4);
  const rail = new THREE.Group(); scene.add(rail);
  const cx = X_BOTTOM - len / 2;

  const top = cyl(0.025, 0.025, Math.hypot(len, STEPS * RISE), matMetal, 0, 0, 0, rail, 12);
  top.position.set(cx, (STEP_TOP(0) + STEP_TOP(STEPS - 1)) / 2 + 1.05, Z1 - 0.02); top.rotation.z = Math.PI / 2 - ang;
  for (let i = 2; i < STEPS; i += 2) {
    const x = X_BOTTOM - (i + 0.5) * RUN; const y0 = STEP_TOP(i);
    cyl(0.018, 0.018, 1.05, matMetal, x, y0 + 0.52, Z1 - 0.02, rail, 10);
  }
  for (let i = 0; i < 5; i++) cyl(0.018, 0.018, 1.05, matMetal, X_BOTTOM - len - 0.3 - i * 0.5, STEP_TOP(STEPS) + 0.52, Z1 - 0.02, rail, 10);
})();

/* ---------- person on the stairs (smooth low-poly) ---------- */
const personGroup = new THREE.Group();
(function person() {
  const sitStep = 3;
  const g = personGroup; g.position.set(X_BOTTOM - sitStep * RUN + 0.02, STEP_TOP(sitStep - 1) + 0.02, Z1 - 0.3); g.rotation.y = 0.25; g.scale.setScalar(1.08); scene.add(g);
  const skin = std({ color: 0xd3a184, roughness: 0.65 }), tee = std({ color: 0x111111, roughness: 0.85 }), jeans = std({ color: 0x1a1b22, roughness: 0.9 }), hairM = std({ color: 0x0b0a0a, roughness: 0.9 }), shoeM = std({ color: 0x0a0a0a, roughness: 0.6 }), sole = std({ color: 0xcfcfcf, roughness: 0.8 });
  // pelvis + torso
  sphere(0.17, jeans, 0, 0.05, 0, g).scale.set(1, 0.7, 1.15);
  const prof = [[0.12, 0.0], [0.19, 0.06], [0.2, 0.2], [0.205, 0.36], [0.2, 0.46], [0.16, 0.53], [0.07, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = add(new THREE.Mesh(new THREE.LatheGeometry(prof, 28), tee), g); torso.position.set(0.02, 0.08, 0); torso.rotation.z = -0.16; torso.scale.set(0.72, 1, 1.05);
  sphere(0.075, tee, 0.04, 0.58, 0.2, g); sphere(0.075, tee, 0.04, 0.58, -0.2, g);
  cyl(0.05, 0.055, 0.1, skin, 0.08, 0.63, 0, g);
  // head
  sphere(0.12, skin, 0.1, 0.77, 0, g, 28, 20);
  const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.126, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), hairM), g); hair.position.set(0.075, 0.79, 0); hair.rotation.z = 0.35;
  sphere(0.026, skin, 0.09, 0.77, 0.12, g, 12, 10); sphere(0.026, skin, 0.09, 0.77, -0.12, g, 12, 10);
  sphere(0.02, skin, 0.215, 0.755, 0, g, 12, 10);
  const beard = sphere(0.085, hairM, 0.14, 0.7, 0, g, 20, 14); beard.scale.set(0.75, 0.55, 1.0);
  sphere(0.014, hairM, 0.2, 0.79, 0.045, g, 8, 6); sphere(0.014, hairM, 0.2, 0.79, -0.045, g, 8, 6);
  // arms
  for (const s of [-1, 1]) {
    const sh = V3(0.04, 0.55, s * 0.23), el = V3(0.2, 0.32, s * 0.25), hd = V3(0.42, 0.37, s * 0.1);
    limb(0.046, sh, el, tee, g); sphere(0.046, tee, el.x, el.y, el.z, g, 14, 10);
    limb(0.04, el, hd, skin, g); sphere(0.048, skin, hd.x, hd.y, hd.z, g, 14, 10);
  }
  const phone = rbox(0.075, 0.15, 0.012, 0.008, std({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.5 }), 0.46, 0.41, 0, g); phone.rotation.set(0, 0, 0.55); phone.rotation.x = 0.1;
  const scr = plane(0.062, 0.135, basic({ map: phoneTex, toneMapped: false }), 0.0, 0, 0.0075, phone); scr.castShadow = false;
  const phoneLight = new THREE.PointLight(0x9fb4ff, 0.5, 1.2, 2); phoneLight.position.set(0.4, 0.5, 0); g.add(phoneLight);
  // legs
  for (const s of [-1, 1]) {
    const hip = V3(0.04, 0.03, s * 0.11), knee = V3(0.5, 0.06, s * 0.13), ank = V3(0.56, -0.44, s * 0.13);
    limb(0.078, hip, knee, jeans, g); sphere(0.078, jeans, knee.x, knee.y, knee.z, g, 16, 12);
    limb(0.06, knee, ank, jeans, g);
    const shoe = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.16, 6, 16), shoeM), g); shoe.position.set(0.62, -0.49, s * 0.13); shoe.rotation.z = Math.PI / 2;
    rbox(0.3, 0.025, 0.12, 0.01, sole, 0.62, -0.548, s * 0.13, g);
  }
})();

/* ---------- dog (smooth low-poly) ---------- */
const dogGroup = new THREE.Group();
(function dog() {
  const g = dogGroup; g.position.set(-0.05, 0, -0.95); g.rotation.y = 0.7; g.scale.setScalar(0.95); scene.add(g);
  const tan = std({ color: 0xc39a5e, roughness: 0.85 }), dk = std({ color: 0x2a1d12, roughness: 0.9 }), blk = std({ color: 0x0a0a0a, roughness: 0.5 });
  const body = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.36, 6, 20), tan), g); body.position.set(0, 0.2, 0); body.rotation.z = Math.PI / 2;
  const saddle = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.125, 0.3, 6, 20), dk), g); saddle.position.set(-0.02, 0.265, 0); saddle.rotation.z = Math.PI / 2; saddle.scale.set(1, 1.05, 0.8);
  sphere(0.16, tan, 0.2, 0.2, 0, g); sphere(0.15, tan, -0.22, 0.19, 0, g);
  limb(0.09, V3(0.28, 0.25, 0), V3(0.42, 0.48, 0), tan, g);
  const head = sphere(0.11, tan, 0.46, 0.52, 0, g, 24, 18); head.scale.set(1.1, 1, 0.95);
  const muzzle = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 16), dk), g); muzzle.position.set(0.58, 0.48, 0); muzzle.rotation.z = Math.PI / 2;
  sphere(0.028, blk, 0.645, 0.5, 0, g, 12, 10);
  for (const s of [-1, 1]) {
    const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 10), dk), g); ear.position.set(0.42, 0.65, s * 0.065); ear.rotation.x = -s * 0.3; ear.rotation.z = 0.15;
    sphere(0.015, blk, 0.54, 0.55, s * 0.055, g, 8, 6);
    limb(0.04, V3(0.26, 0.12, s * 0.1), V3(0.55, 0.06, s * 0.12), tan, g); sphere(0.045, tan, 0.57, 0.045, s * 0.12, g, 12, 10);
    sphere(0.09, tan, -0.2, 0.12, s * 0.14, g, 16, 12);
    const paw = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 4, 12), tan), g); paw.position.set(0.0, 0.045, s * 0.17); paw.rotation.z = Math.PI / 2;
  }
  limb(0.03, V3(-0.36, 0.2, 0), V3(-0.55, 0.06, 0.15), dk, g);
  const harness = add(new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.012, 8, 32), blk), g); harness.position.set(0.12, 0.2, 0); harness.rotation.y = Math.PI / 2;
  limb(0.012, V3(0.12, 0.36, 0), V3(0.3, 0.3, 0), blk, g);
})();

/* ---------- photoreal characters: image-to-3D meshes generated with Higgsfield (Tripo/Hunyuan), embedded as GLB ---------- */
const GLBS = {"person":"/landing-pages/assets/person.1dd5a833d3c4.glb","dog":"/landing-pages/assets/dog.00de2ffc1b5d.glb"};
const characters = [];
function b64ToBuf(b64) { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8.buffer; }

/* GLTFLoader loads a GLB's embedded images by wrapping each one in a Blob and handing
   URL.createObjectURL(...) to an <img>. Inside the desktop preview that call is shimmed
   to a blob-request:// pseudo-URL the loader cannot fetch, so every texture failed and
   both characters rendered white. So the images never go near a URL here: the container
   is split by hand, each image is decoded straight from its bytes with createImageBitmap,
   and the texture records are stripped from the JSON before parsing so the loader never
   asks for them. Everything else (geometry, material graph, the scene tree) is still
   GLTFLoader's. */
function glbSplit(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) return null;      // 'glTF'
  const total = dv.getUint32(8, true);
  let off = 12, json = null, bin = null;
  while (off + 8 <= total) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len)));
    else if (type === 0x004E4942) bin = { offset: off + 8, length: len };
    off += 8 + len;                                            // chunk lengths include their own padding
  }
  return json ? { json, bin } : null;
}
function glbJoin(json, buf, bin) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jPad = (4 - (jsonBytes.length % 4)) % 4;
  const jLen = jsonBytes.length + jPad;
  const bLen = bin ? bin.length + ((4 - (bin.length % 4)) % 4) : 0;
  const total = 12 + 8 + jLen + (bin ? 8 + bLen : 0);
  const out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jLen, true); dv.setUint32(16, 0x4E4F534A, true);
  u8.set(jsonBytes, 20); u8.fill(0x20, 20 + jsonBytes.length, 20 + jLen);   // JSON pads with spaces
  if (bin) {
    const at = 20 + jLen;
    dv.setUint32(at, bLen, true); dv.setUint32(at + 4, 0x004E4942, true);
    u8.set(new Uint8Array(buf, bin.offset, bin.length), at + 8);
  }
  return out;
}
/* the source image index, whether it is declared plainly or through EXT_texture_webp */
function texSource(json, index) {
  const t = json.textures && json.textures[index];
  if (!t) return undefined;
  if (t.source !== undefined) return t.source;
  const ext = t.extensions || {};
  for (const k of ['EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu']) if (ext[k]) return ext[k].source;
  return undefined;
}
const WRAP = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
async function decodeGlbImages(json, buf, bin) {
  const images = json.images || [];
  return Promise.all(images.map(async (im) => {
    if (im.bufferView === undefined || !bin) return null;
    const bv = json.bufferViews[im.bufferView];
    const bytes = new Uint8Array(buf, bin.offset + (bv.byteOffset || 0), bv.byteLength);
    const blob = new Blob([bytes], { type: im.mimeType || 'image/png' });
    try {
      if (typeof createImageBitmap === 'function') return await createImageBitmap(blob);   // no URL involved
    } catch (e) { /* fall through to the data-URL path */ }
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    const url = `data:${im.mimeType || 'image/png'};base64,${btoa(s)}`;
    return await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url; });
  }));
}
function makeTexture(json, bitmaps, texIndex, srgb) {
  const src = texSource(json, texIndex);
  const img = src === undefined ? null : bitmaps[src];
  if (!img) return null;
  const tex = new THREE.Texture(img);
  const sampler = (json.samplers || [])[(json.textures[texIndex] || {}).sampler] || {};
  tex.wrapS = WRAP[sampler.wrapS] || THREE.RepeatWrapping;
  tex.wrapT = WRAP[sampler.wrapT] || THREE.RepeatWrapping;
  tex.flipY = false;                                   // glTF images are already top-left
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

async function loadCharacter(url, opts) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Character request failed');
    const buf = await response.arrayBuffer();
    const split = glbSplit(buf);
    if (!split) { console.warn('character: not a GLB'); return; }
    const { json, bin } = split;
    const original = JSON.parse(JSON.stringify(json));    // keep the texture graph for later
    const bitmaps = await decodeGlbImages(json, buf, bin);

    // strip every image and texture record so GLTFLoader never reaches for a URL
    const stripped = json;
    delete stripped.images; delete stripped.textures; delete stripped.samplers;
    if (stripped.extensionsUsed) stripped.extensionsUsed = stripped.extensionsUsed.filter((e) => !/texture/i.test(e));
    if (stripped.extensionsRequired) stripped.extensionsRequired = stripped.extensionsRequired.filter((e) => !/texture/i.test(e));
    for (const m of stripped.materials || []) {
      const pbr = m.pbrMetallicRoughness;
      if (pbr) { delete pbr.baseColorTexture; delete pbr.metallicRoughnessTexture; }
      delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture;
      if (m.extensions) delete m.extensions.KHR_materials_pbrSpecularGlossiness;
    }

    const { GLTFLoader } = await import('/landing-pages/runtime/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    loader.parse(glbJoin(stripped, buf, bin), '', (gltf) => {
      const root = gltf.scene;
      const assoc = gltf.parser && gltf.parser.associations;
      root.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        const mat = o.material; if (!mat) return;
        const mi = (assoc && assoc.get(mat) && assoc.get(mat).materials) ?? 0;
        const src = (original.materials || [])[mi];
        if (src) {
          const pbr = src.pbrMetallicRoughness || {};
          if (pbr.baseColorTexture) mat.map = makeTexture(original, bitmaps, pbr.baseColorTexture.index, true);
          if (pbr.metallicRoughnessTexture) {
            const t = makeTexture(original, bitmaps, pbr.metallicRoughnessTexture.index, false);
            mat.roughnessMap = t; mat.metalnessMap = t;      // G = roughness, B = metalness
          }
          if (src.normalTexture) {
            mat.normalMap = makeTexture(original, bitmaps, src.normalTexture.index, false);
            if (src.normalTexture.scale !== undefined) mat.normalScale.setScalar(src.normalTexture.scale);
          }
        }
        mat.side = THREE.FrontSide;
        mat.roughness = mat.roughnessMap ? 1 : Math.max(0.55, mat.roughness ?? 0.8);
        mat.metalness = 0;
        mat.needsUpdate = true;
      });
      const box = new THREE.Box3().setFromObject(root); const size = box.getSize(new THREE.Vector3()); const ctr = box.getCenter(new THREE.Vector3());
      const dim = opts.axis === 'max' ? Math.max(size.x, size.y, size.z) : size.y; const sc = opts.size / dim;
      const g = new THREE.Group(); g.add(root);
      root.position.set(-ctr.x * sc, -box.min.y * sc, -ctr.z * sc); root.scale.setScalar(sc);
      g.position.set(opts.x, opts.y, opts.z); g.rotation.y = opts.yaw; scene.add(g); characters.push(g);
      if (opts.hide) opts.hide.visible = false;
      if (window.markShadows) window.markShadows();
    }, (err) => console.warn('character parse failed', err));
  } catch (e) { console.warn('character load failed', e); }
}
// Tripo (orientation: align_image) puts the subject's front on its local -z. rotation.y = -PI/2 faces +x (down the flight, to the right).
// Person: sits on the front edge of step 1 (tread top 0.53) facing right, feet on the floor just past the bottom step.
loadCharacter(GLBS.person, { size: 1.32, axis: 'y', x: 0.05, y: 0.0, z: -1.05, yaw: -1.0, hide: personGroup });   // seat underside = 0.389 m above soles (measured) = plinth height   // measured: model front = (0.71, 0, -0.71) local
loadCharacter(GLBS.dog, { size: 1.05, axis: 'max', x: 1.05, y: 0.0, z: -1.25, yaw: -1.56, hide: dogGroup });               // measured: model front = (0.81, 0, -0.59) local

/* ---------- arcade cabinet: extruded side profile, side art, backlit marquee ---------- */
const arcadeGroup = new THREE.Group();
const arcadeHit = [];
const ARC = { screenPos: V3(), screenNormal: V3() };
(function arcade() {
  const g = arcadeGroup; g.position.set(-0.3, 0, -2.95); g.rotation.y = 0.12; scene.add(g);
  const W = 0.76;
  // side profile: x = depth (front is +x → world +z after rotation), y = height
  const P = [[-0.38, 0], [0.36, 0], [0.36, 0.84], [0.53, 0.96], [0.53, 1.06], [0.31, 1.15], [0.31, 1.21], [0.21, 1.73], [0.36, 1.77], [0.36, 2.02], [0.12, 2.06], [-0.38, 2.06]];
  const shape = new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false, steps: 1 });
  const matSideArt = std({ map: sideArtTex, roughness: 0.5 });
  const matLaminate = std({ map: laminateTex, roughness: 0.55 });
  const body = new THREE.Mesh(geo, [matSideArt, matLaminate]); body.rotation.y = -Math.PI / 2; body.position.x = W / 2; add(body, g); arcadeHit.push(body);
  // helper: plane on a profile face (from point i to i+1), inset by `off` along the outward normal
  const face = (i, off) => { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); const n = V3(0, -dx / L, dy / L); /* outward normal in group coords (y, z) */ const c = V3(0, (y0 + y1) / 2, (x0 + x1) / 2).addScaledVector(n, off); return { c, n, L, rx: -Math.atan2(n.y, n.z) }; };
  // screen face (P[6] -> P[7])
  const sf = face(6, 0);
  ARC.screenPos.copy(sf.c); ARC.screenNormal.copy(sf.n);
  const bez = plane(0.72, sf.L + 0.02, std({ map: bezelTex, roughness: 0.6 }), 0, 0, 0, g); bez.position.copy(sf.c).addScaledVector(sf.n, 0.004); bez.rotation.x = sf.rx; bez.castShadow = false;
  const scr = plane(0.56, 0.42, basic({ map: arcadeTex, toneMapped: false }), 0, 0, 0, g); scr.position.copy(sf.c).addScaledVector(sf.n, 0.009); scr.rotation.x = sf.rx; scr.castShadow = false;
  const glass = plane(0.72, sf.L + 0.02, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.1 }), 0, 0, 0, g); glass.position.copy(sf.c).addScaledVector(sf.n, 0.013); glass.rotation.x = sf.rx; glass.castShadow = false;
  const screenLight = new THREE.PointLight(0xff5a1a, 1.4, 2.2, 2); screenLight.position.copy(sf.c).addScaledVector(sf.n, 0.3); g.add(screenLight);
  // marquee (P[8] -> P[9]) vertical face, backlit
  const mf = face(8, 0);
  const mq = plane(0.68, mf.L - 0.02, basic({ map: marqueeTex, toneMapped: false }), 0, 0, 0, g); mq.position.copy(mf.c).addScaledVector(mf.n, 0.004); mq.rotation.x = mf.rx; mq.castShadow = false;
  const mqGlass = plane(0.7, mf.L, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.05, transparent: true, opacity: 0.1, clearcoat: 1 }), 0, 0, 0, g); mqGlass.position.copy(mf.c).addScaledVector(mf.n, 0.009); mqGlass.rotation.x = mf.rx; mqGlass.castShadow = false;
  const marqueeLight = new THREE.PointLight(0xff5a20, 2.0, 2.4, 2); marqueeLight.position.copy(mf.c).addScaledVector(mf.n, 0.25); g.add(marqueeLight);
  // speaker grille on the small ledge under the marquee (P[7] -> P[8])
  const gf = face(7, 0.003);
  const grille = plane(0.5, gf.L - 0.01, std({ color: 0x060606, roughness: 0.9 }), 0, 0, 0, g); grille.position.copy(gf.c); grille.rotation.x = gf.rx;
  // control panel top (P[4] -> P[5]) with overlay art, joystick and 6 buttons
  const cf = face(4, 0.003);
  const ov = plane(0.72, cf.L - 0.01, std({ map: panelTex, roughness: 0.5 }), 0, 0, 0, g); ov.position.copy(cf.c); ov.rotation.x = cf.rx; ov.castShadow = false;
  const onPanel = (u, v, out) => out.copy(cf.c).addScaledVector(V3(1, 0, 0), u).addScaledVector(V3(0, cf.n.z, -cf.n.y).normalize(), v); // u across width, v along the face (toward the back is +)
  const alongUp = V3(0, cf.n.z, -cf.n.y).normalize().negate(); // toward the player
  const qN = new THREE.Quaternion().setFromUnitVectors(UP, cf.n.clone());
  const btnBase = std({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.3 });
  const btnCols = [0xff2a2a, 0x2a6cff, 0xffffff, 0xff2a2a, 0x2a6cff, 0xffffff];
  btnCols.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3); const pos = onPanel(0.02 + col * 0.085 + row * 0.02, 0.055 - row * 0.075, V3());
    const ring = cyl(0.03, 0.03, 0.012, btnBase, 0, 0, 0, g, 24); ring.position.copy(pos).addScaledVector(cf.n, 0.004); ring.quaternion.copy(qN);
    const cap = cyl(0.023, 0.025, 0.014, std({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.35 }), 0, 0, 0, g, 24); cap.position.copy(pos).addScaledVector(cf.n, 0.014); cap.quaternion.copy(qN);
    const dome = sphere(0.023, std({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.35 }), 0, 0, 0, g, 20, 14); dome.position.copy(pos).addScaledVector(cf.n, 0.02); dome.scale.set(1, 0.45, 1); dome.quaternion.copy(qN);
  });
  const jp = onPanel(-0.24, 0.0, V3());
  const jb = cyl(0.045, 0.05, 0.01, btnBase, 0, 0, 0, g, 24); jb.position.copy(jp).addScaledVector(cf.n, 0.004); jb.quaternion.copy(qN);
  const jd = sphere(0.032, std({ color: 0x0a0a0a, roughness: 0.7 }), 0, 0, 0, g, 20, 14); jd.position.copy(jp).addScaledVector(cf.n, 0.012); jd.scale.set(1, 0.6, 1); jd.quaternion.copy(qN);
  const js = cyl(0.008, 0.009, 0.11, matSteel, 0, 0, 0, g, 12); js.position.copy(jp).addScaledVector(cf.n, 0.065).addScaledVector(alongUp, 0.02); js.quaternion.copy(qN); js.rotateX(0.25);
  const jball = sphere(0.03, std({ color: 0xff2a2a, roughness: 0.25 }), 0, 0, 0, g, 24, 18); jball.position.copy(jp).addScaledVector(cf.n, 0.125).addScaledVector(alongUp, 0.035);
  // coin door on the lower front (P[1] -> P[2]), kick plate with vents
  const ff = face(1, 0.0);
  const coin = rbox(0.28, 0.24, 0.02, 0.008, std({ map: coinTex, roughness: 0.45, metalness: 0.4 }), 0, 0, 0, g); coin.position.copy(ff.c).addScaledVector(ff.n, 0.008).add(V3(0, 0.02, 0)); coin.rotation.x = ff.rx;
  for (const sx of [-0.05, 0.05]) { const slot = cyl(0.012, 0.012, 0.03, matSteel, 0, 0, 0, g, 16); slot.position.copy(coin.position).add(V3(sx, 0.045, 0.012)); slot.rotation.x = Math.PI / 2; }
  const ret = rbox(0.09, 0.045, 0.012, 0.005, std({ color: 0x050505 }), 0, 0, 0, g); ret.position.copy(coin.position).add(V3(0, -0.075, 0.012));
  const kick = rbox(0.72, 0.13, 0.016, 0.006, std({ color: 0x0c0c0c, roughness: 0.6, metalness: 0.4 }), 0, 0, 0, g); kick.position.copy(ff.c).addScaledVector(ff.n, 0.006).setY(0.075);
  for (let i = 0; i < 5; i++) box(0.5, 0.008, 0.02, std({ color: 0x000000 }), 0, 0.045 + i * 0.016, ff.c.z + 0.02, g);
  // orange T-molding along the side edges (front + top) and across the front lip
  const trim = std({ color: 0xff4d00, emissive: 0xff4d00, emissiveIntensity: 0.55, roughness: 0.5 });
  for (const sgn of [-1, 1]) for (let i = 1; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; limb(0.0085, V3(sgn * W / 2, y0, x0), V3(sgn * W / 2, y1, x1), trim, g, 3, 10); }
  const lip = cyl(0.0085, 0.0085, W, trim, 0, 0, 0, g, 10); lip.position.set(0, P[3][1], P[3][0]); lip.rotation.z = Math.PI / 2;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xff4d00, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.set(0, 1.4, 0.4); glow.scale.set(1.5, 1.4, 1); g.add(glow);
})();

const doorHit = [];
const slider = { front: null, shut: 0, open: 0, t: 0, want: 0 };
/* ---------- sliding door, standing open onto the play room ---------- */
(function door() {
  const g = new THREE.Group(); g.position.set(1.35, 0, -3.5); scene.add(g);
  const fw = 1.98, fh = 2.62, DEPTH = 3.1;

  /* the room beyond: the opening has to look into somewhere, or a sliding door
     is just a lighter shade of the black wall it replaced */
  const room = new THREE.Group(); g.add(room);
  const rw = 1.55;
  const tat = plane(rw * 2, DEPTH, matTatami, 0, 0.02, -DEPTH / 2 - 0.15, room);
  tat.rotation.x = -Math.PI / 2; tat.receiveShadow = true;
  plane(rw * 2, 2.7, matPlaster, 0, 1.35, -DEPTH - 0.15, room);                       // back
  const wl = plane(DEPTH, 2.7, matPlaster, -rw, 1.35, -DEPTH / 2 - 0.15, room); wl.rotation.y = Math.PI / 2;
  const wr = plane(DEPTH, 2.7, matPlaster, rw, 1.35, -DEPTH / 2 - 0.15, room); wr.rotation.y = -Math.PI / 2;
  const cl = plane(rw * 2, DEPTH, matCeil, 0, 2.7, -DEPTH / 2 - 0.15, room); cl.rotation.x = Math.PI / 2;
  // low table, two cushions and a floor lamp: somebody plays in here
  box(0.86, 0.055, 0.56, matTimber, 0.05, 0.3, -1.5, room);
  for (const [cx, cz] of [[-0.28, -1.5], [0.42, -1.5]]) cyl(0.05, 0.05, 0.26, matTimber, cx, 0.16, cz, room, 8);
  const zab = std({ color: 0x2f4a6b, roughness: 0.95 });
  rbox(0.5, 0.09, 0.5, 0.03, zab, -0.62, 0.07, -1.35, room);
  rbox(0.5, 0.09, 0.5, 0.03, zab, 0.72, 0.07, -1.72, room);
  // a chochin lantern, the warm source that makes the doorway glow
  const lant = cyl(0.16, 0.16, 0.36, std({ color: 0xfff0d2, emissive: 0xffd9a0, emissiveIntensity: 2.4, roughness: 1 }), 0.1, 1.62, -1.5, room, 18);
  lant.castShadow = false;
  const lampL = new THREE.PointLight(0xffd6a0, 11, 6.5, 2); lampL.position.set(0.1, 1.5, -1.5); room.add(lampL);
  const glowL = new THREE.PointLight(0xffe4bc, 6, 5, 2); glowL.position.set(0.2, 1.4, -1.1); room.add(glowL);
  // a hanging scroll on the end wall
  const kake = canvasTex(256, 640, (c, w, h) => {
    c.fillStyle = '#e7dcc6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3d3226'; c.fillRect(0, 0, w, 46); c.fillRect(0, h - 46, w, 46);
    c.fillStyle = '#20242c'; c.font = '600 130px "Geist", serif'; c.textAlign = 'center';
    c.fillText('遊', w / 2, h * 0.46); c.fillText('場', w / 2, h * 0.72);
  });
  plane(0.42, 1.05, std({ map: kake, roughness: 0.95 }), -0.72, 1.5, -DEPTH - 0.13, room).castShadow = false;

  /* frame: post, head and a double track */
  box(0.13, fh + 0.34, 0.16, matTimber, -fw / 2 - 0.06, (fh + 0.34) / 2, 0, g);
  box(0.13, fh + 0.34, 0.16, matTimber, fw / 2 + 0.06, (fh + 0.34) / 2, 0, g);
  box(fw + 0.38, 0.15, 0.17, matTimber, 0, fh + 0.075, 0, g);                          // kamoi
  box(fw + 0.38, 0.07, 0.17, matTimber, 0, 0.052, 0, g);                               // shikii
  box(fw + 0.38, 0.5, 0.14, matTimber, 0, fh + 0.4, 0, g);                             // ranma panel above
  box(fw + 0.3, 7.6 - fh - 0.9, 0.14, matWall, 0, fh + 0.65 + (7.6 - fh - 0.9) / 2, 0, g);

  /* two panels on the track: the left one shut, the right slid behind it, so the
     opening sits on the camera side and the room reads through it */
  const panel = (cx, z) => {
    const pg = new THREE.Group(); pg.position.set(cx, 0, z); g.add(pg);
    const pw = fw / 2 - 0.01, ph = fh - 0.12;
    const sh = plane(pw - 0.05, ph - 0.05, matShoji, 0, ph / 2 + 0.07, 0, pg); sh.castShadow = false;
    box(0.035, ph, 0.045, matTimber, -pw / 2 + 0.017, ph / 2 + 0.07, 0.01, pg);
    box(0.035, ph, 0.045, matTimber, pw / 2 - 0.017, ph / 2 + 0.07, 0.01, pg);
    box(pw, 0.05, 0.045, matTimber, 0, ph + 0.045, 0.01, pg);
    box(pw, 0.07, 0.045, matTimber, 0, 0.105, 0.01, pg);
    box(pw, 0.035, 0.045, matTimber, 0, ph * 0.55, 0.01, pg);                          // mid rail
    cyl(0.035, 0.035, 0.012, matDark, pw / 2 - 0.12, ph * 0.42, 0.03, pg, 12).rotation.x = Math.PI / 2;  // hikite
    return pg;
  };
  // a single leaf on its track, parked to the left so the room shows through
  const front = panel(-fw / 4, 0.02);
  // hovering the doorway runs it the rest of the way open
  slider.front = front; slider.shut = -fw / 4; slider.open = -fw / 4 - (fw / 2 - 0.06);
  front.traverse(o => { if (o.isMesh) doorHit.push(o); });
  doorHit.push(plane(fw, fh, basic({ visible: false }), 0, fh / 2, 0.12, g));   // a catcher over the whole opening
  plane(1.0, 1.4, basic({ map: signTex, transparent: true }), fw / 2 + 0.72, 1.6, 0.02, g).castShadow = false;
})();

/* ---------- shoji bay, timber frame and noren ---------- */
(function kyoto() {
  const g = new THREE.Group(); scene.add(g);
  const Z = -3.34, SILL = 0.085, HEAD = 2.62;              // paper sits between the track and the kamoi
  const matTrack = std({ map: stepTex, color: 0xd8b98a, roughness: 0.7 });
  const bays = [[-1.62, 0.30], [2.42, 3.42]];              // either side of the doorway
  for (const [x0, x1] of bays) {
    const panels = Math.max(2, Math.round((x1 - x0) / 0.62));
    const pw = (x1 - x0) / panels;
    for (let i = 0; i < panels; i++) {
      const cx = x0 + (i + 0.5) * pw;
      const sh = plane(pw - 0.035, HEAD - SILL, matShoji, cx, (SILL + HEAD) / 2, Z, g);
      sh.castShadow = false;
      // the mullion between panels
      box(0.035, HEAD - SILL, 0.05, matTimber, x0 + i * pw, (SILL + HEAD) / 2, Z + 0.03, g);

    }
    box(x1 - x0 + 0.14, 0.11, 0.12, matTimber, (x0 + x1) / 2, HEAD + 0.055, Z + 0.02, g);   // kamoi
    box(x1 - x0 + 0.14, SILL, 0.16, matTrack, (x0 + x1) / 2, SILL / 2, Z + 0.02, g);        // shikii
    for (const px of [x0, x1]) box(0.13, HEAD + 0.5, 0.13, matTimber, px, (HEAD + 0.5) / 2, Z + 0.03, g);  // hashira
  }
  // nageshi: the rail that ties the posts together across the whole bay
  box(5.4, 0.09, 0.1, matTimber, 0.9, HEAD + 0.42, Z + 0.05, g);
})();

/* ---------- mezzanine slab, railing, hoop ---------- */
const HOOP = { x: 1.9, rimY: 2.74, rimZ: -0.95 + 0.21, R: 0.19, tube: 0.017, boardZ: -0.95, boardY: 3.0, boardHalfW: 0.5, boardHalfH: 0.37 };
const hoopHit = [];
const pendants = [], pendantHit = [];
(function mezz() {
  const zF = -1.4;
  box(15.4, 0.4, 4.6, matSlab, 6.1, 3.75, zF - 2.3);
  box(15.4, 0.5, 0.12, matBlack, 6.1, 3.3, zF + 0.02);
  for (let i = 0; i < 30; i++) cyl(0.018, 0.018, 1.0, matMetal, -1.4 + i * 0.52, 4.45, zF + 0.05, undefined, 10);
  const r1 = cyl(0.025, 0.025, 15.4, matMetal, 6.1, 4.97, zF + 0.05, undefined, 12); r1.rotation.z = Math.PI / 2;
  const r2 = cyl(0.015, 0.015, 15.4, matMetal, 6.1, 4.5, zF + 0.05, undefined, 10); r2.rotation.z = Math.PI / 2;
  const hx = HOOP.x, hz = HOOP.boardZ;
  cyl(0.03, 0.03, 0.55, matMetal, hx, 3.3, hz - 0.25, undefined, 10);
  const arm = box(0.04, 0.04, 0.5, matMetal, hx, 3.05, hz - 0.25);
  // backboard: glass panel + frame + printed graphic
  const glass = rbox(1.02, 0.76, 0.02, 0.01, std({ color: 0xdddddd, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35 }), hx, HOOP.boardY, hz, undefined, 2); glass.castShadow = false; hoopHit.push(glass);
  hoopHit.push(plane(1.0, 0.74, basic({ map: backboardTex, transparent: true, side: THREE.DoubleSide }), hx, HOOP.boardY, hz + 0.012));
  for (const [w, h, x, y] of [[1.06, 0.03, 0, 0.385], [1.06, 0.03, 0, -0.385], [0.03, 0.8, -0.515, 0], [0.03, 0.8, 0.515, 0]]) box(w, h, 0.035, matSteel, hx + x, HOOP.boardY + y, hz);
  const rim = add(new THREE.Mesh(new THREE.TorusGeometry(HOOP.R, HOOP.tube, 12, 48), std({ color: 0xff5a12, roughness: 0.4, metalness: 0.3 }))); rim.position.set(hx, HOOP.rimY, HOOP.rimZ); rim.rotation.x = Math.PI / 2; hoopHit.push(rim);
  box(0.08, 0.05, 0.2, std({ color: 0xff5a12, roughness: 0.4 }), hx, HOOP.rimY, hz + 0.1);
  const netPts = []; const N = 16;
  const tiers = [[HOOP.R, HOOP.rimY], [0.155, HOOP.rimY - 0.14], [0.12, HOOP.rimY - 0.27], [0.1, HOOP.rimY - 0.38]];
  for (let t = 0; t < tiers.length - 1; t++) for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2, a2 = (i + 0.5) / N * Math.PI * 2, a3 = (i + 1) / N * Math.PI * 2;
    const P = (an, r, y) => V3(hx + Math.cos(an) * r, y, HOOP.rimZ + Math.sin(an) * r);
    const [r0, y0] = tiers[t], [r1n, y1] = tiers[t + 1];
    netPts.push(P(a, r0, y0), P(a2, r1n, y1), P(a2, r1n, y1), P(a3, r0, y0));
  }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(netPts), new THREE.LineBasicMaterial({ color: 0xdddddd })));
  // Pendants, each hung from a pivot at the ceiling so the whole fitting can swing.
  // Everything below is positioned relative to that pivot rather than in world space.
  [[1.3, 3.5, -0.5], [1.55, 3.42, -0.85], [1.8, 3.34, -1.2]].forEach(([x, y, z]) => {
    const CEIL = 7.6, drop = CEIL - y;
    const pv = new THREE.Group(); pv.position.set(x, CEIL, z); scene.add(pv);
    const shade = add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 20, 1, true), std({ color: 0x151515, roughness: 0.6, side: THREE.DoubleSide })), pv);
    shade.position.set(0, -drop + 0.06, 0);
    const bulb = sphere(0.035, matWhite, 0, -drop, 0, pv, 12, 10); bulb.castShadow = false;
    cyl(0.004, 0.004, drop - 0.12, matDark, 0, -0.12 - (drop - 0.12) / 2, 0, pv, 6).castShadow = false;
    const l = new THREE.PointLight(0xfff1d6, 1.2, 4.0, 2); l.position.set(0, -drop - 0.08, 0); pv.add(l);
    pendants.push({ pv, ax: 0, az: 0, vx: 0, vz: 0 });
    pendantHit.push(shade, bulb);
  });
  // speakers
  for (const [x, y, z] of [[0.2, 2.85, -3.15], [4.9, 3.05, -1.6]]) {
    rbox(0.3, 0.42, 0.3, 0.02, std({ color: 0x1e1c1a, roughness: 0.8 }), x, y, z);
    const w = cyl(0.09, 0.09, 0.02, std({ color: 0x0a0a0a, roughness: 0.9 }), x, y - 0.06, z + 0.155, undefined, 24); w.rotation.x = Math.PI / 2;
    const tw = cyl(0.03, 0.03, 0.02, std({ color: 0x222222, roughness: 0.5, metalness: 0.5 }), x, y + 0.13, z + 0.155, undefined, 16); tw.rotation.x = Math.PI / 2;
  }
})();



await yieldToPage();
/* ================= retro CRT builder ================= */
const plasticTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); speckle(g, w, h, 40000, ['#e9e9e9', '#f4f4f4', '#dcdcdc', '#ffffff'], 1.5); g.fillStyle = 'rgba(0,0,0,0.035)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); }, { repeat: [2, 2] });
const grilleTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { g.fillStyle = '#050505'; g.fillRect(0, y, w, 6); g.fillStyle = '#2a2a2a'; g.fillRect(0, y + 6, w, 1); } }, { repeat: [1, 1] });
const ventTex = grilleTex.clone(); ventTex.repeat.set(3, 1); ventTex.wrapS = ventTex.wrapT = THREE.RepeatWrapping; ventTex.needsUpdate = true;
const brandTex = canvasTex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = '700 58px "Geist"'; g.fillStyle = '#d8d8d8'; g.fillText('AE', 18, 50); g.font = '600 24px "Geist Mono"'; g.fillStyle = '#9a9a9a'; g.fillText('VISION · COLOR 14"', 20, 100); g.fillStyle = '#ff4d00'; g.fillRect(232, 30, 44, 40); g.fillStyle = '#000'; g.font = '700 30px "Geist"'; g.fillText('A', 244, 51); });
const dialTex = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#cfcfcf'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#e6e6e6'; g.font = '700 22px "Geist Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + k / 12 * Math.PI * 2; g.fillText(String(k + 2), 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); g.fillRect(128 + Math.cos(a) * 116 - 2, 128 + Math.sin(a) * 116 - 2, 4, 4); } });
const crtStyles = {
  wood: { body: std({ map: woodTex, color: 0x9c7150, roughness: 0.6 }), bezel: std({ color: 0xa89c86, roughness: 0.6 }), panel: std({ color: 0x9d9280, roughness: 0.6 }) },
  beige: { body: std({ map: plasticTex, color: 0xb2a88f, roughness: 0.55 }), bezel: std({ color: 0x8f8570, roughness: 0.55 }), panel: std({ color: 0x9a8f7a, roughness: 0.55 }) },
  black: { body: std({ map: plasticTex, color: 0x1b1b1b, roughness: 0.5 }), bezel: std({ color: 0x0f0f0f, roughness: 0.45 }), panel: std({ color: 0x141414, roughness: 0.5 }) },
  grey: { body: std({ map: plasticTex, color: 0x7f7f7b, roughness: 0.55 }), bezel: std({ color: 0x5a5a57, roughness: 0.5 }), panel: std({ color: 0x66665f, roughness: 0.55 }) },
};
const knobM = std({ color: 0x1b1b1b, roughness: 0.4 }), knobCapM = std({ color: 0x8a8a8a, roughness: 0.3, metalness: 0.8 });
function rrPath(P, w, h, r) { const x = -w / 2, y = -h / 2; P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.quadraticCurveTo(x + w, y, x + w, y + r); P.lineTo(x + w, y + h - r); P.quadraticCurveTo(x + w, y + h, x + w - r, y + h); P.lineTo(x + r, y + h); P.quadraticCurveTo(x, y + h, x, y + h - r); P.lineTo(x, y + r); P.quadraticCurveTo(x, y, x + r, y); return P; }
function frameGeo(ow, oh, iw, ih, r, depth) { const sh = rrPath(new THREE.Shape(), ow, oh, r); sh.holes.push(rrPath(new THREE.Path(), iw, ih, r * 0.9)); const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 3, curveSegments: 10 }); g.computeVertexNormals(); return g; }
function crtScreenGeo(sw, sh, bulge) { const geo = new THREE.PlaneGeometry(sw, sh, 32, 24); const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k) / (sw / 2), y = p.getY(k) / (sh / 2); p.setZ(k, bulge * (1 - 0.28 * (x * x + y * y))); } geo.computeVertexNormals(); return geo; }
function knob(g, x, y, z, r) {
  const base = cyl(r, r * 1.06, 0.016, knobM, x, y, z + 0.008, g, 28); base.rotation.x = Math.PI / 2;
  const cap = cyl(r * 0.6, r * 0.6, 0.006, knobCapM, x, y, z + 0.019, g, 24); cap.rotation.x = Math.PI / 2;
  box(0.0035, r * 0.62, 0.003, std({ color: 0xff4d00 }), x, y + r * 0.31, z + 0.0235, g);
}
function makeCRT(g, w, h, d, style, ctex, i) {
  const S = crtStyles[style] || crtStyles.black; const zf = d / 2 - 0.05;   // body front face; the bezel frame and screen sit in front of it
  const body = rbox(w, h, d * 0.64, 0.035, S.body, 0, 0, zf - d * 0.32, g, 4);
  rbox(w * 0.8, h * 0.82, d * 0.46, 0.06, S.body, 0, -h * 0.03, zf - d * 0.64 - d * 0.14, g, 4);  // tube hump
  const right = w >= 0.76; const m = 0.035;                                  // body edge margin
  const sw = right ? w * 0.62 : w * 0.8, sh = right ? h * 0.72 : h * 0.58;
  const sx = right ? -w * 0.5 + m + 0.055 + sw / 2 : 0, sy = right ? h * 0.02 : h / 2 - m - 0.055 - sh / 2;
  const sgeo = crtScreenGeo(sw, sh, 0.024);
  const screen = new THREE.Mesh(sgeo, basic({ map: ctex, toneMapped: false })); screen.position.set(sx, sy, zf + 0.006); g.add(screen);
  const snow = new THREE.Mesh(sgeo, basic({ transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false })); snow.position.set(sx, sy, zf + 0.009); g.add(snow);
  const glass = new THREE.Mesh(sgeo, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 })); glass.position.set(sx, sy, zf + 0.012); g.add(glass);
  const bezel = new THREE.Mesh(frameGeo(sw + 0.11, sh + 0.11, sw - 0.012, sh - 0.012, 0.045, 0.028), S.bezel); bezel.position.set(sx, sy, zf + 0.009); add(bezel, g);
  const bezelR = sx + sw / 2 + 0.055, bezelB = sy - sh / 2 - 0.055;         // bezel outer right / bottom edges
  const pz = zf + 0.012;                                                     // raised control panel plate
  const brandM = basic({ map: brandTex, transparent: true }), dialM = basic({ map: dialTex, transparent: true }), grilleM = std({ map: grilleTex, roughness: 0.9 });
  if (right) {
    // control column between the bezel and the body's right edge, elements stacked top → bottom inside it
    const px0 = bezelR + 0.015, px1 = w / 2 - m, pw = px1 - px0, cx = (px0 + px1) / 2;
    rbox(pw, h - 2 * m, 0.012, 0.008, S.panel, cx, 0, pz - 0.003, g);
    let cur = h / 2 - m - 0.012;
    const bw = Math.min(0.12, pw * 0.9); plane(bw, bw * 0.25, brandM, cx, cur - bw * 0.125, pz + 0.004, g).castShadow = false; cur -= bw * 0.25 + 0.022;
    const dd = Math.min(0.1, pw * 0.86); plane(dd, dd, dialM, cx, cur - dd / 2, pz + 0.004, g).castShadow = false; knob(g, cx, cur - dd / 2, pz + 0.003, dd * 0.23); cur -= dd + 0.018;
    knob(g, cx, cur - 0.02, pz + 0.003, 0.017); cur -= 0.055;
    const bs = Math.min(0.026, pw / 4.2); for (let k = 0; k < 3; k++) rbox(bs * 0.75, 0.01, 0.01, 0.003, knobM, cx - bs + k * bs, cur - 0.006, pz + 0.006, g);
    sphere(0.0035, basic({ color: 0xff2020 }), cx + bs * 1.55, cur - 0.006, pz + 0.006, g, 8, 6).castShadow = false; cur -= 0.03;
    const gh = Math.max(0.03, cur - (-h / 2 + m + 0.012)); plane(pw * 0.86, gh, grilleM, cx, cur - gh / 2, pz + 0.004, g).castShadow = false;
  } else {
    // control strip under the bezel, elements laid left → right inside it
    const py1 = bezelB - 0.012, py0 = -h / 2 + m, ph = py1 - py0, cy = (py0 + py1) / 2, x0 = -w / 2 + m, x1 = w / 2 - m;
    rbox(x1 - x0, ph, 0.012, 0.008, S.panel, 0, cy, pz - 0.003, g);
    const bw = Math.min(0.1, ph * 3.2); plane(bw, bw * 0.25, brandM, x0 + 0.012 + bw / 2, cy, pz + 0.004, g).castShadow = false;
    const kr = Math.min(0.016, ph * 0.3); knob(g, x0 + bw + 0.05, cy, pz + 0.003, kr); knob(g, x0 + bw + 0.05 + kr * 4, cy, pz + 0.003, kr * 0.8);
    const bx = x0 + bw + 0.05 + kr * 7; for (let k = 0; k < 3; k++) rbox(0.016, 0.009, 0.01, 0.003, knobM, bx + k * 0.022, cy, pz + 0.006, g);
    sphere(0.003, basic({ color: 0xff2020 }), bx + 3 * 0.022 - 0.004, cy + 0.012, pz + 0.006, g, 8, 6).castShadow = false;
    const gw = Math.max(0.04, x1 - 0.012 - (bx + 3 * 0.022 + 0.012)); plane(gw, ph * 0.72, grilleM, x1 - 0.012 - gw / 2, cy, pz + 0.004, g).castShadow = false;
  }
  const vents = plane(w * 0.6, d * 0.3, std({ map: ventTex, roughness: 0.9 }), 0, h / 2 + 0.002, zf - d * 0.3, g); vents.rotation.x = -Math.PI / 2; vents.castShadow = false;
  for (const fx of [-1, 1]) for (const fz of [0.12, 0.5]) cyl(0.012, 0.014, 0.022, knobM, fx * (w / 2 - 0.05), -h / 2 - 0.011, zf - d * fz, g, 12);
  return { body, bezel, screen, snow, glass, screenX: sx, screenY: sy };
}

/* ================= CRT portfolio: seven sites / demos drawn on canvases ================= */
const PORTFOLIO = [
  { title: "Sky Events", kind: "Concept · Event experience", desc: "Sample digital invitation: venue, schedule and guest journeys.", draw(g, w, h, t) {
    g.fillStyle = '#070707'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e6e6e6'; g.font = '700 14px "Geist"'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText("Sky Events", 24, 18); g.font = '600 11px "Geist"'; g.fillStyle = '#9a9a9a'; ['Schedule', 'Details', 'Invite', 'Venue'].forEach((s, i) => g.fillText(s, 300 + i * 74, 20)); g.fillStyle = '#ff4d00'; g.fillRect(24, 40, w - 48, 1);
    g.fillStyle = '#e6e6e6'; g.font = '700 74px "Geist"'; g.fillText('EVENTS', 22, 62); g.fillText('DEMO', 22, 134); g.fillStyle = '#ff4d00'; g.font = '600 13px "Geist Mono"'; g.fillText('DIGITAL INVITATION CONCEPT', 24, 220);
    const rows = ['09:00  ARRIVAL — WELCOME', '10:30  OPENING — MAIN STAGE', '13:00  BREAK — MEET AND CONNECT', '15:00  SESSION — THE AFTERNOON', '17:30  CLOSING — SEE YOU SOON', '19:00  SAMPLE SCHEDULE'];
    const off = (t * 22) % 30; g.save(); g.beginPath(); g.rect(24, 250, w - 48, 200); g.clip();
    rows.forEach((r, i) => { const y = 256 + i * 30 - off; g.fillStyle = i % 2 ? '#0f0f0f' : '#141414'; g.fillRect(24, y, w - 48, 26); g.fillStyle = '#e6e6e6'; g.font = '600 12px "Geist Mono"'; g.fillText(r, 34, y + 7); g.fillStyle = '#ff4d00'; g.fillText('DEMO', w - 76, y + 7); });
    g.restore();
    const cx = 420 + Math.sin(t * 0.7) * 120, cy = 150 + Math.cos(t * 0.9) * 40; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 12, cy + 10); g.lineTo(cx + 5, cy + 11); g.lineTo(cx + 2, cy + 18); g.closePath(); g.fill();
  } },
  { title: "KeyBuilds", kind: "Concept · Interactive commerce", desc: "Sample 3D keyboard configurator and responsive storefront.", draw(g, w, h, t) {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f6f0e8'); gr.addColorStop(1, '#e2d8cc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 18; for (let x = -200; x < w + 200; x += 70) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 240, 0); g.stroke(); }
    g.fillStyle = '#141414'; g.font = '600 12px "Geist"'; g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText("KeyBuilds", 24, 18); g.fillStyle = '#777'; ['Product', 'Options', 'Demo'].forEach((s, i) => g.fillText(s, 450 + i * 58, 18));
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 30; g.shadowOffsetY = 18; g.fillStyle = '#141414'; g.beginPath(); g.roundRect(70, 120, 250, 170, 22); g.fill(); g.restore();
    g.fillStyle = '#f0e9df'; g.beginPath(); g.roundRect(90, 140, 210, 130, 14); g.fill(); g.fillStyle = '#141414'; g.font = '700 22px "Geist"'; g.fillText("KeyBuilds", 106, 152); g.font = '500 11px "Geist"'; g.fillText('your keys. your way.', 106, 182);
    g.fillStyle = '#141414'; g.font = '700 44px "Geist"'; g.fillText('Build your', 350, 130); g.fillText('next board.', 350, 176); g.font = '500 13px "Geist"'; g.fillStyle = '#444'; g.fillText('Interactive keyboard concept.', 350, 240);
    g.fillStyle = '#141414'; g.beginPath(); g.roundRect(350, 270, 130, 36, 18); g.fill(); g.fillStyle = '#fff'; g.font = '600 12px "Geist"'; g.fillText('Explore concept', 366, 281);
    const sx = ((t * 0.12) % 1.5 - 0.25) * w; const sg = g.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
  } },
  { title: "Job Elite", kind: "Concept · Backend & DevOps", desc: "Sample release architecture with staging, production and CI/CD.", draw(g, w, h, t) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fa8e6'); gr.addColorStop(0.6, '#a9cdf2'); gr.addColorStop(1, '#dbe9f7'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const cloud = (x, y, r) => { for (let k = 0; k < 5; k++) { const rg = g.createRadialGradient(x + k * r * 0.5, y + (k % 2) * r * 0.2, 0, x + k * r * 0.5, y, r); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 4, r * 2); } };
    cloud(60 + Math.sin(t * 0.2) * 30, 140, 60); cloud(330 + Math.cos(t * 0.15) * 40, 90, 50); cloud(480 + Math.sin(t * 0.25) * 25, 330, 70);
    g.fillStyle = '#fff'; g.strokeStyle = '#1a2b4a'; g.lineWidth = 5; g.lineJoin = 'round'; g.font = '700 84px "Geist"'; g.textBaseline = 'top'; g.textAlign = 'left'; g.strokeText('JOB ELITE', 40, 170); g.fillText('JOB ELITE', 40, 170);
    g.font = '600 12px "Geist"'; g.fillStyle = '#1a2b4a'; g.fillText('DEPLOYMENT CONCEPT — BUILD TO RELEASE', 44, 262);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 116 - ((t * 30) % 116); g.fillStyle = ['#e36a3f', '#1a2b4a', '#f2c94c', '#8ab4d8', '#f0f0f0'][i]; g.fillRect(x, 300, 100, 140); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 410, 100, 30); g.fillStyle = '#fff'; g.font = '600 10px "Geist Mono"'; g.fillText('STEP 0' + (i + 1), x + 8, 420); }
  } },
  { title: "Commerce", kind: "Capability · Commerce", desc: "Storefronts, checkout, subscriptions and member access. Illustrative UI.", draw(g, w, h, t) {
    g.fillStyle = '#ff8fc4'; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2); g.rotate(t * 0.15); for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#ff5fae' : '#ffb1d6'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 700, i * Math.PI / 12, (i + 1) * Math.PI / 12); g.closePath(); g.fill(); } g.restore();
    g.font = '700 82px "Geist"'; g.textBaseline = 'top'; g.textAlign = 'center'; g.lineJoin = 'round'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 8; g.strokeText('Commerce', w / 2, 60); g.fillStyle = '#ffe45c'; g.fillText('Commerce', w / 2, 60);
    g.fillStyle = '#7a4bff'; g.fillRect(200, 40, 90, 32); g.fillStyle = '#fff'; g.font = '700 18px "Geist"'; g.fillText('DEMO', 245, 46);
    for (let i = 0; i < 4; i++) { const x = 60 + i * 135, y = 200 + Math.sin(t * 2 + i) * 6; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x, y, 115, 150, 12); g.fill(); g.fillStyle = ['#ffe45c', '#1a1a1a', '#7a4bff', '#ff5fae'][i]; g.beginPath(); g.roundRect(x + 14, y + 14, 87, 80, 8); g.fill(); g.fillStyle = '#1a1a1a'; g.font = '700 12px "Geist"'; g.textAlign = 'left'; g.fillText(['CATALOG', 'CHECKOUT', 'MEMBERS', 'BILLING'][i], x + 14, y + 106); g.font = '600 11px "Geist"'; g.fillText('UI DEMO', x + 14, y + 124); g.textAlign = 'center'; }
    g.fillStyle = '#1a1a1a'; g.font = '700 13px "Geist Mono"'; g.fillText('UI PREVIEW ' + String(59 - Math.floor(t) % 60).padStart(2, '0') + ':' + String(59 - Math.floor(t * 7) % 60).padStart(2, '0'), w / 2, 400);
  } },
  { title: "Fittra Training", kind: "Project · Learning platform", desc: "Frontend, live-session integrations and payment journeys. Illustrative UI.", draw(g, w, h, t) {
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, w, h); g.fillStyle = '#10131a'; g.fillRect(0, 0, 150, h);
    g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = '#e6e6e6'; g.font = '700 13px "Geist"'; g.fillText('fittra · UI sketch', 18, 18);
    ['Overview', 'Courses', 'Sessions', 'Access', 'Billing'].forEach((m, i) => { g.fillStyle = i === 1 ? '#1d2230' : 'transparent'; g.fillRect(10, 56 + i * 30, 130, 26); g.fillStyle = i === 1 ? '#fff' : '#8a8f9c'; g.font = '500 12px "Geist"'; g.fillText(m, 20, 62 + i * 30); });
    const card = (x, y, cw, ch, label, val, col) => { g.fillStyle = '#12161f'; g.beginPath(); g.roundRect(x, y, cw, ch, 8); g.fill(); g.fillStyle = '#8a8f9c'; g.font = '500 11px "Geist"'; g.fillText(label, x + 14, y + 12); g.fillStyle = col; g.font = '700 24px "Geist"'; g.fillText(val, x + 14, y + 30); };
    card(170, 20, 140, 70, 'Learning UI', 'COURSES', '#e6e6e6'); card(322, 20, 140, 70, 'Live sessions', 'ZOOM', '#5ee0a0'); card(474, 20, 140, 70, 'Access flows', 'PAID', '#ff4d00');
    g.fillStyle = '#12161f'; g.beginPath(); g.roundRect(170, 106, 444, 200, 8); g.fill(); g.fillStyle = '#8a9f9c'; g.font = '500 11px "Geist"'; g.fillText('Session activity · UI sketch', 184, 118);
    g.strokeStyle = '#2a3040'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(184, 150 + i * 36); g.lineTo(600, 150 + i * 36); g.stroke(); }
    g.strokeStyle = '#5ee0a0'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 40; i++) { const x = 184 + i * 10.4, y = 230 - (Math.sin(i * 0.4 + t) * 0.5 + 0.5) * 60 - Math.sin(i * 0.13 + t * 0.3) * 20; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    g.strokeStyle = '#ff4d00'; g.beginPath(); for (let i = 0; i <= 40; i++) { const x = 184 + i * 10.4, y = 250 - (Math.cos(i * 0.3 + t * 1.3) * 0.5 + 0.5) * 40; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    for (let i = 0; i < 12; i++) { const bh = 30 + (Math.sin(i * 1.7 + t * 0.8) * 0.5 + 0.5) * 90; g.fillStyle = i === 7 ? '#ff4d00' : '#2f6df6'; g.fillRect(184 + i * 36, 440 - bh, 24, bh); }
    g.fillStyle = '#8a8f9c'; g.font = '500 11px "Geist"'; g.fillText('Course overview · UI sketch', 184, 318);
  } },
  { title: "AE Defender", kind: "Lab · Interactive demo", desc: "A playable demo from this ThreeUI template. Click the cabinet to play.", draw(g, w, h, t) {
    g.fillStyle = '#12050a'; g.fillRect(0, 0, w, h); const cx = 320, cy = 200;
    g.strokeStyle = '#ff4a10'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { const k = ((t * 0.5 + i / 8) % 1); const s = Math.pow(k, 2.2); g.globalAlpha = 0.2 + s * 0.8; g.strokeRect(cx - (20 + s * 700) / 2, cy - (14 + s * 520) / 2, 20 + s * 700, 14 + s * 520); } g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#ff4d00'; g.font = '700 54px "Geist"'; g.fillText('AHMED', cx, 110); g.fillText('DEFENDER', cx, 166);
    g.fillStyle = '#ffb090'; g.font = '700 16px "Geist Mono"'; if (Math.floor(t * 2) % 2 === 0) g.fillText('PLAYABLE ON THE CABINET', cx, 300);
    for (let i = 0; i < 6; i++) { const ex = 80 + i * 96 + Math.sin(t * 2 + i) * 20, ey = 380 + Math.cos(t * 1.5 + i) * 10; g.fillStyle = '#ff4d00'; g.fillRect(ex, ey, 26, 26); g.fillStyle = '#12050a'; g.fillRect(ex + 6, ey + 8, 4, 6); g.fillRect(ex + 16, ey + 8, 4, 6); }
  } },
  { title: "Business Portals", kind: "Capability · CRM & portals", desc: "Client portals, dashboards, approvals and connected workflows. Illustrative UI.", draw(g, w, h, t) {
    g.fillStyle = '#1230d0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.save(); g.translate(200, 230); g.rotate(t * 0.3); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -120); g.lineTo(104, 60); g.lineTo(-104, 60); g.closePath(); g.fill(); g.fillStyle = '#1230d0'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.textBaseline = 'top'; g.textAlign = 'left'; g.font = '700 64px "Geist"'; g.fillText('Portals', 330, 150); g.font = '500 14px "Geist"'; g.fillText('YOUR TEAM, CONNECTED.', 334, 222);
    const off = (t * 60) % 400; g.font = '700 22px "Geist Mono"'; for (let i = -1; i < 3; i++) g.fillText('PORTALS — CAPABILITY DEMO —', i * 400 - off, 430);
  } },
];

/* ---------- neon sign, TVs, scribble ---------- */
const tvTextures = [];
const TV = [];
const tvHit = [];
const neon = { plane: null, light: null, glow: null, off: 0 };
// LED ticker on the mezzanine fascia
const ticker = plane(6.0, 0.28, basic({ map: tickerTex, color: 0xff4d00, toneMapped: false }), 5.6, 3.3, -1.27); ticker.castShadow = false;
rbox(6.1, 0.36, 0.05, 0.01, std({ color: 0x0a0a0a, roughness: 0.6 }), 5.6, 3.3, -1.3);
const tickerLight = new THREE.PointLight(0xff4d00, 2.5, 4, 2); tickerLight.position.set(5.6, 3.15, -0.9); scene.add(tickerLight);
(function rightWall() {
  const z = -5.8;
  const np = plane(3.3, 0.83, basic({ map: neonTex, transparent: true, depthWrite: false, toneMapped: false }), 5.75, 2.85, z + 0.06); np.castShadow = false; neon.plane = np;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffffff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.set(5.75, 2.8, z + 0.1); glow.scale.set(5.0, 2.5, 1); scene.add(glow);
  const nl = new THREE.PointLight(0xffffff, 7, 9, 2); nl.position.set(5.7, 2.8, z + 0.8); scene.add(nl);
  neon.light = nl; neon.glow = glow;
  /* The heights used to be hand-set, which left the upper sets hanging in the air.
     Each box is now dropped instead: it falls until it lands on the tatami or on
     whatever it overlaps below, and a box that leans is lifted by the drop of its
     low corner so it rests on that corner rather than sinking through. */
  const tvs = [                       // ground row first, then the ones that stack
    [4.05, 0.70, 0.58, 'black'], [4.85, 0.86, 0.68, 'wood'],
    [5.80, 0.80, 0.62, 'beige'], [6.65, 0.70, 0.55, 'beige'],
    [4.35, 0.62, 0.50, 'grey'],  [5.20, 0.76, 0.60, 'black'], [6.10, 0.80, 0.64, 'wood'],
  ];
  const TATAMI = 0.012, rested = [];
  tvs.forEach(([x, w, h, style], i) => {
    const d = 0.62; const rot = rr(-0.2, 0.2); const tilt = rr(-0.02, 0.02);
    let base = TATAMI, z = -2.75 + rr(-0.15, 0.15), support = null;
    for (const r of rested) {
      const ov = Math.min(x + w / 2, r.x + r.w / 2) - Math.max(x - w / 2, r.x - r.w / 2);
      if (ov > 0.08 && r.top > base) { base = r.top; support = r; }
    }
    if (support) z = support.z + rr(-0.04, 0.04);      // sit square on the box below
    const lift = Math.abs(Math.sin(tilt)) * w / 2;     // a leaning box stands on one corner
    const y = base + h / 2 + lift;
    rested.push({ x, w, z, top: base + h + lift });
    const g = new THREE.Group(); g.position.set(x - 0.15, y, z); g.rotation.y = rot; g.rotation.z = tilt; scene.add(g);
    const site = PORTFOLIO[i % PORTFOLIO.length];
    const ctex = canvasTex(640, 480, (gg, cw, ch) => { gg.fillStyle = '#000'; gg.fillRect(0, 0, cw, ch); });
    const built = makeCRT(g, w, h, d, style, ctex, i);
    built.body.userData.tv = i; built.bezel.userData.tv = i; tvHit.push(built.body, built.bezel);
    const stex = (i % 2 ? staticTexB : staticTexA).clone(); stex.offset.set(rand(), rand()); stex.wrapS = stex.wrapT = THREE.RepeatWrapping; stex.repeat.set(0.9, 0.9); tvTextures.push(stex);
    built.snow.material.map = stex; built.snow.material.needsUpdate = true;
    const sl = new THREE.PointLight(0xdfe8ff, 0.7, 2.2, 2); sl.position.set(built.screenX, built.screenY, d / 2 + 0.25); g.add(sl);
    TV.push({ group: g, body: built.body, screen: built.screen, snow: built.snow, tex: ctex, ctx: ctex.userData.ctx, site, light: sl, w, h, d, snowLevel: 0.7, screenPos: V3(built.screenX, built.screenY, d / 2 - 0.03) });
  });
  rbox(0.08, 0.03, 0.06, 0.01, knobM, 5.05, 1.4, -2.85); const ant = cyl(0.004, 0.003, 0.55, matSteel, 4.93, 1.64, -2.85, undefined, 6); ant.rotation.z = 0.45; const ant2 = cyl(0.004, 0.003, 0.55, matSteel, 5.17, 1.64, -2.85, undefined, 6); ant2.rotation.z = -0.45;
  const tl = new THREE.PointLight(0xdfe8ff, 3, 6, 2); tl.position.set(5.2, 1.0, -1.7); scene.add(tl);
  const pts = [[5.0, 4.6, -2.4], [5.5, 5.3, -2.5], [6.2, 4.8, -2.4], [6.0, 5.7, -2.6], [6.8, 5.2, -2.5], [7.3, 6.0, -2.6], [7.1, 4.9, -2.4]].map(p => V3(...p));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.035, 10, false), matWhite); scene.add(tube);
  const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xffffff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })); sg.position.set(6.2, 5.3, -2.5); sg.scale.set(3.4, 2.4, 1); scene.add(sg);
  const sl = new THREE.PointLight(0xffffff, 3, 6, 2); sl.position.set(6.2, 5.2, -2.0); scene.add(sl);
})();

/* ---------- basketball ---------- */
const ball = { mesh: null, v: new THREE.Vector3(), held: true, live: false, scored: false, timer: 0, prevY: 0, score: 0, shots: 0 };
ball.mesh = sphere(0.12, std({ map: ballTex, roughness: 0.75 }), 0, -5, 0, undefined, 36, 28);
ball.mesh.visible = false;

await yieldToPage();
/* ---------- lights ---------- */
/* Daylight: a low sun raking in from the courtyard side, a bright sky dome and a
   warm bounce off all that timber. The old rig was three warm lamps in the dark. */
scene.add(new THREE.AmbientLight(0xdde4ec, 0.5));
scene.add(new THREE.HemisphereLight(0xcfe0f2, 0x8a6a44, 0.85));
const sun = new THREE.DirectionalLight(0xffeccd, 2.7);
sun.position.set(7.5, 9.5, 6.0); sun.target.position.set(-1.0, 0.6, -2.4); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -6;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 34;
sun.shadow.bias = -0.0016; sun.shadow.normalBias = 0.075; sun.shadow.radius = 3;
const warm1 = new THREE.PointLight(0xffd7a8, 7, 16, 2); warm1.position.set(-5.0, 4.5, -1.6); scene.add(warm1);
const warm2 = new THREE.PointLight(0xffe0bc, 4, 12, 2); warm2.position.set(-2.2, 2.4, -1.9); scene.add(warm2);
const warm3 = new THREE.PointLight(0xffe6c8, 5, 12, 2); warm3.position.set(-8.5, 6.2, -1.9); scene.add(warm3);
const arcadeLight = new THREE.PointLight(0xff4d00, 7, 6, 2); arcadeLight.position.set(-0.1, 1.35, -2.2); scene.add(arcadeLight);
function spot(color, intensity, pos, target, angle, dist, shadow) {
  const s = new THREE.SpotLight(color, intensity, dist, angle, 0.6, 1.4); s.position.set(...pos); s.target.position.set(...target); scene.add(s, s.target);
  if (shadow) { s.castShadow = true; s.shadow.mapSize.set(shadow, shadow); s.shadow.bias = -0.0006; s.shadow.normalBias = 0.02; s.shadow.camera.near = 0.5; s.shadow.camera.far = dist; s.shadow.radius = 4; }
  return s;
}
const key = spot(0xf3ecdc, 9, [2.6, 3.35, 0.9], [2.0, 0, -2.2], 0.95, 14, 2048);         // floor / dog / patches
const stairSpot = spot(0xffe8cc, 13, [1.4, 5.8, 1.6], [-2.4, 0.9, -1.6], 0.8, 18, 2048);   // person + stairs
const hoopSpot = spot(0xfff6ec, 7, [2.4, 6.9, 1.2], [1.7, 1.6, -2.6], 0.62, 14, 1024);    // hoop, arcade, door
const tvSpot = spot(0xeef2ff, 6, [6.5, 5.5, 0.5], [5.0, 0.6, -2.7], 0.6, 14, 1024);       // TV pile
const railSpot = spot(0xdfe6f0, 4, [8, 7.2, 1.5], [3.5, 4.5, -1.5], 0.7, 16, 0);           // mezzanine railing
const fill = new THREE.PointLight(0xcfd8e6, 3.5, 16, 2); fill.position.set(4, 3.0, 3.5); scene.add(fill);
const stairLight = new THREE.PointLight(0xffe2c0, 2.4, 8, 2); stairLight.position.set(-1.0, 2.3, 0.9); scene.add(stairLight);
const doorLight = new THREE.PointLight(0xffffff, 2.2, 5, 2); doorLight.position.set(1.35, 1.7, -2.3); scene.add(doorLight);

/* ================= arcade game (runs on the cabinet screen) ================= */
const game = { on: false, running: false, over: false, px: 256, bullets: [], enemies: [], parts: [], score: 0, best: 0, lives: 3, spawnT: 0, fireT: 0, time: 0, keys: {} };
const G = arcadeTex.userData.ctx, GW = 512, GH = 384;
function gameStart() { Object.assign(game, { running: true, over: false, px: 256, bullets: [], enemies: [], parts: [], score: 0, lives: 3, spawnT: 0, fireT: 0, time: 0 }); }
function gameStep(dt) {
  if (!game.running) return;
  game.time += dt;
  const sp = 300;
  if (game.keys.left) game.px -= sp * dt; if (game.keys.right) game.px += sp * dt;
  game.px = Math.max(24, Math.min(GW - 24, game.px));
  game.fireT -= dt;
  if (game.keys.fire && game.fireT <= 0) { game.bullets.push({ x: game.px, y: GH - 58 }); game.fireT = 0.22; }
  for (const b of game.bullets) b.y -= 480 * dt;
  game.bullets = game.bullets.filter(b => b.y > -10);
  game.spawnT -= dt;
  if (game.spawnT <= 0) { game.enemies.push({ x: 30 + Math.random() * (GW - 60), y: -20, s: 24 + Math.random() * 12, v: 55 + Math.random() * 50 + game.score * 0.4, w: (Math.random() - 0.5) * 60 }); game.spawnT = Math.max(0.35, 1.0 - game.score * 0.004); }
  for (const e of game.enemies) { e.y += e.v * dt; e.x += Math.sin(game.time * 2 + e.s) * e.w * dt; }
  for (const e of game.enemies) for (const b of game.bullets) {
    if (!e.dead && !b.dead && Math.abs(e.x - b.x) < e.s / 2 + 3 && Math.abs(e.y - b.y) < e.s / 2 + 6) { e.dead = b.dead = true; game.score += 10; for (let k = 0; k < 10; k++) game.parts.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, l: 0.5 }); }
  }
  for (const e of game.enemies) if (!e.dead && e.y > GH - 40) { e.dead = true; game.lives--; if (game.lives <= 0) { game.running = false; game.over = true; game.best = Math.max(game.best, game.score); } }
  game.enemies = game.enemies.filter(e => !e.dead); game.bullets = game.bullets.filter(b => !b.dead);
  for (const p of game.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; }
  game.parts = game.parts.filter(p => p.l > 0);
}
function gameDraw(t) {
  const g = G;
  g.fillStyle = '#1a0805'; g.fillRect(0, 0, GW, GH);
  g.strokeStyle = 'rgba(255,77,0,0.18)'; g.lineWidth = 1;
  for (let x = 0; x <= GW; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GH); g.stroke(); }
  for (let y = (t * 40) % 32; y <= GH; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(GW, y); g.stroke(); }
  g.font = '700 16px "Geist Mono", monospace'; g.textBaseline = 'top'; g.textAlign = 'left';
  if (!game.on) {
    // attract mode
    const cx = 256, cy = 180;
    g.strokeStyle = '#ff4a10'; g.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const k = ((t * 0.5 + i / 7) % 1); const s = Math.pow(k, 2.2); const rw = 20 + s * 520, rh = 14 + s * 380; g.globalAlpha = 0.2 + s * 0.8; g.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh); }
    g.globalAlpha = 0.9; g.beginPath();
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) { g.moveTo(cx, cy); g.lineTo(cx + dx * 320, cy + dy * 240); }
    g.stroke(); g.globalAlpha = 1;
    g.fillStyle = '#ff4d00'; g.font = '700 54px "Geist", Arial, sans-serif'; g.textAlign = 'center'; g.font = '700 46px "Geist", Arial, sans-serif'; g.fillText('AHMED', cx, 118); g.fillText('DEFENDER', cx, 166);
    if (Math.floor(t * 2) % 2 === 0) { g.font = '700 22px "Geist Mono", monospace'; g.fillStyle = '#ffb090'; g.fillText('INSERT COIN  ·  CLICK TO PLAY', cx, 300); }
    g.font = '700 14px "Geist Mono", monospace'; g.fillStyle = '#ff6a2a'; g.fillText('HI-SCORE ' + String(game.best).padStart(5, '0'), cx, 340);
  } else {
    g.fillStyle = '#ff6a2a'; g.fillText('SCORE ' + String(game.score).padStart(5, '0'), 16, 12);
    g.textAlign = 'right'; g.fillText('LIVES ' + '♥'.repeat(Math.max(0, game.lives)), GW - 16, 12); g.textAlign = 'left';
    // player ship
    const px = game.px, py = GH - 44;
    g.fillStyle = '#ff4d00'; g.beginPath(); g.moveTo(px, py - 18); g.lineTo(px + 18, py + 12); g.lineTo(px, py + 4); g.lineTo(px - 18, py + 12); g.closePath(); g.fill();
    g.fillStyle = '#ffd0b0'; g.fillRect(px - 3, py - 6, 6, 10);
    g.fillStyle = '#ffb090'; for (const b of game.bullets) g.fillRect(b.x - 2, b.y - 8, 4, 12);
    for (const e of game.enemies) { g.fillStyle = '#ff4d00'; g.fillRect(e.x - e.s / 2, e.y - e.s / 2, e.s, e.s); g.fillStyle = '#0c0302'; g.fillRect(e.x - e.s / 4, e.y - e.s / 6, e.s / 8, e.s / 5); g.fillRect(e.x + e.s / 8, e.y - e.s / 6, e.s / 8, e.s / 5); }
    for (const p of game.parts) { g.fillStyle = `rgba(255,120,60,${p.l * 2})`; g.fillRect(p.x, p.y, 4, 4); }
    g.strokeStyle = 'rgba(255,77,0,0.5)'; g.beginPath(); g.moveTo(0, GH - 24); g.lineTo(GW, GH - 24); g.stroke();
    g.textAlign = 'center';
    if (!game.running && !game.over) { g.font = '900 40px "Geist", Arial, sans-serif'; g.fillStyle = '#ff4d00'; g.fillText('AE DEFENDER', 256, 130); g.font = '700 18px "Geist Mono", monospace'; g.fillStyle = '#ffb090'; if (Math.floor(t * 2) % 2 === 0) g.fillText('PRESS SPACE TO START', 256, 200); g.font = '700 13px "Geist Mono", monospace'; g.fillStyle = '#ff6a2a'; g.fillText('← →  MOVE     SPACE  FIRE     ESC  LEAVE', 256, 240); }
    if (game.over) { g.font = '900 44px "Geist", Arial, sans-serif'; g.fillStyle = '#ff4d00'; g.fillText('GAME OVER', 256, 130); g.font = '700 18px "Geist Mono", monospace'; g.fillStyle = '#ffb090'; g.fillText('SCORE ' + game.score + '   BEST ' + game.best, 256, 190); if (Math.floor(t * 2) % 2 === 0) g.fillText('SPACE TO RESTART', 256, 230); }
  }
  // scanlines + vignette
  g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < GH; y += 4) g.fillRect(0, y, GW, 2);
  arcadeTex.needsUpdate = true;
}

/* ================= modes / camera ================= */
const state = { mode: 'home', tvIndex: 0, transT: 1, camFrom: new THREE.Vector3(), lookFrom: new THREE.Vector3(), lookCur: new THREE.Vector3(0.25, 2.15, -4.5), hover: null, dragStart: null };
const camBase = new THREE.Vector3(2.4, 1.9, 4.8);
const camLook = new THREE.Vector3(0.25, 2.15, -4.5);
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
function arcadeCam() { const look = arcadeGroup.localToWorld(ARC.screenPos.clone()); const pos = arcadeGroup.localToWorld(ARC.screenPos.clone().addScaledVector(ARC.screenNormal, 1.3).add(V3(0, 0.1, 0))); look.y += 0.12; return [pos, look]; }
function hoopCam() { return [V3(HOOP.x + 0.05, 1.75, 3.0), V3(HOOP.x, HOOP.rimY - 0.25, HOOP.rimZ)]; }
function tvCam() { const tv = TV[state.tvIndex]; const c = tv.group.localToWorld(tv.screenPos.clone()); const n = V3(Math.sin(tv.group.rotation.y), 0, Math.cos(tv.group.rotation.y)); return [c.clone().addScaledVector(n, 0.5 + tv.w * 0.5), c]; }
function targets() {
  if (state.mode === 'arcade') return arcadeCam();
  if (state.mode === 'hoop') return hoopCam();
  if (state.mode === 'tv') return tvCam();
  return [tmpA.set(camBase.x + mouse.x * 0.38, camBase.y - mouse.y * 0.14, camBase.z), tmpB.set(camLook.x + mouse.x * 0.12, camLook.y - mouse.y * 0.05, camLook.z)];
}
const HINTS = { home: 'Click the arcade to play &nbsp;·&nbsp; the hoop to shoot &nbsp;·&nbsp; a CRT to browse the work', arcade: '← → move &nbsp;·&nbsp; SPACE fire &nbsp;·&nbsp; ESC leave', hoop: 'Drag up on the ball to shoot &nbsp;·&nbsp; ESC leave', tv: '← → browse the screens &nbsp;·&nbsp; click another CRT &nbsp;·&nbsp; ESC leave' };
const tvcap = document.getElementById('tvcap');
function showTV(i) {
  state.tvIndex = (i + TV.length) % TV.length; const site = TV[state.tvIndex].site;
  tvcap.querySelector('.idx').textContent = String(state.tvIndex + 1).padStart(2, '0') + ' / ' + String(TV.length).padStart(2, '0') + ' · ' + site.kind;
  tvcap.querySelector('.ttl').textContent = site.title; tvcap.querySelector('.desc').textContent = site.desc; tvcap.hidden = false;
  state.camFrom.copy(camera.position); state.lookFrom.copy(state.lookCur); state.transT = 0;
}
function setMode(m, arg) {
  if (window.markShadows) window.markShadows();
  if (m === 'tv' && arg !== undefined && state.mode === 'tv') { showTV(arg); return; }
  if (m === state.mode) return;
  state.camFrom.copy(camera.position); state.lookFrom.copy(state.lookCur); state.transT = 0; state.mode = m;
  hintEl.innerHTML = HINTS[m]; hintEl.classList.toggle('show', m !== 'home');
  document.documentElement.style.overflow = m === 'home' ? '' : 'hidden';
  if (m !== 'home') window.scrollTo(0, 0);
  game.on = m === 'arcade'; if (game.on) { game.running = false; game.over = false; } 
  ball.mesh.visible = m === 'hoop'; ball.held = true; ball.live = false;
  hudEl.hidden = m !== 'hoop'; hudMsg.textContent = '';
  canvas.style.cursor = m === 'home' ? '' : (m === 'hoop' ? 'grab' : 'default');
  canvas.classList.toggle('mode', m !== 'home');
  if (m === 'tv') showTV(arg === undefined ? state.tvIndex : arg); else tvcap.hidden = true;
}


// picking
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.intersectObjects(arcadeHit, false).length) return 'arcade';
  if (ray.intersectObjects(hoopHit, false).length) return 'hoop';
  const tvI = ray.intersectObjects(tvHit, false); if (tvI.length) { state.pickTV = tvI[0].object.userData.tv; return 'tv'; }
  return null;
}
/* the pendants and the sliding door react to the pointer without being clickable */
let lastPtr = null;
function hoverProps(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  slider.want = ray.intersectObjects(doorHit, false).length ? 1 : 0;
  const hits = ray.intersectObjects(pendantHit, false);
  if (hits.length && lastPtr) {
    // push the fitting the way the pointer is travelling, scaled by how fast
    const dx = (e.clientX - lastPtr.x) / r.width, dy = (e.clientY - lastPtr.y) / r.height;
    const hit = hits[0].object;
    const p = pendants.find(q => q.pv === hit.parent);
    if (p) { p.vx += Math.max(-0.9, Math.min(0.9, dx * 9)); p.vz += Math.max(-0.9, Math.min(0.9, dy * 6)); }
  }
  lastPtr = { x: e.clientX, y: e.clientY };
}
window.addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1;
  if ((state.mode === 'home' || state.mode === 'tv') && (window.scrollY || 0) < 40 && e.target === canvas) { state.hover = pick(e); canvas.style.cursor = state.hover ? 'pointer' : ''; hoverProps(e); }
  else { slider.want = 0; lastPtr = null; }
}, { passive: true });
canvas.addEventListener('pointerdown', (e) => {
  if (state.mode === 'home') { const h = pick(e); if (h) setMode(h, h === 'tv' ? state.pickTV : undefined); return; }
  if (state.mode === 'tv') { const h = pick(e); if (h === 'tv') showTV(state.pickTV); return; }
  if (state.mode === 'hoop' && ball.held) { state.dragStart = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.style.cursor = 'grabbing'; }
  if (state.mode === 'arcade' && !game.running) gameStart();
});
window.addEventListener('pointerup', (e) => {
  if (state.mode === 'hoop' && state.dragStart && ball.held) {
    const dx = e.clientX - state.dragStart.x, dy = e.clientY - state.dragStart.y;
    canvas.style.cursor = 'grab';
    if (-dy > 18) throwBall(dx, -dy, performance.now() - state.dragStart.t);
    state.dragStart = null;
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.mode !== 'home') { setMode('home'); return; }
  if (state.mode === 'arcade') {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) game.keys.left = true;
    if (['ArrowRight', 'd', 'D'].includes(e.key)) game.keys.right = true;
    if (e.key === ' ' || e.key === 'ArrowUp') { game.keys.fire = true; if (!game.running) gameStart(); }
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  }
  if (state.mode === 'hoop' && e.key === ' ') { e.preventDefault(); if (ball.held) throwBall(0, 150, 250); }
  if (state.mode === 'tv') { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); showTV(state.tvIndex + 1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); showTV(state.tvIndex - 1); } }
});
window.addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) game.keys.left = false;
  if (['ArrowRight', 'd', 'D'].includes(e.key)) game.keys.right = false;
  if (e.key === ' ' || e.key === 'ArrowUp') game.keys.fire = false;
});
window.addEventListener('scroll', () => { if (state.mode !== 'home' && (window.scrollY || 0) > 60) setMode('home'); }, { passive: true });

/* ---------- basketball physics ---------- */
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3();
function heldPos(out) {
  camera.getWorldDirection(fwd); right.crossVectors(fwd, UP).normalize(); upv.crossVectors(right, fwd).normalize();
  return out.copy(camera.position).addScaledVector(fwd, 0.95).addScaledVector(upv, -0.32).addScaledVector(right, 0.06);
}
function throwBall(dx, dyUp, ms) {
  ball.held = false; ball.live = true; ball.scored = false; ball.timer = 0; ball.shots++;
  const p = ball.mesh.position;
  const target = V3(HOOP.x, HOOP.rimY + 0.05, HOOP.rimZ);
  const horiz = V3(target.x - p.x, 0, target.z - p.z); const dist = horiz.length(); horiz.normalize();
  const T = 1.05; const power = Math.min(1.12, Math.max(0.8, 0.86 + 0.14 * (dyUp / 150)));
  const vh = dist / T * power, vy = ((target.y - p.y) + 0.5 * 9.8 * T * T) / T * (0.85 + 0.15 * power);
  ball.v.copy(horiz).multiplyScalar(vh).addScaledVector(right, dx * 0.0022); ball.v.y = vy;
  ball.prevY = p.y; hudMsg.textContent = ''; hudScore.textContent = 'SCORE ' + ball.score + '  ·  SHOTS ' + ball.shots;
}
function ballStep(dt) {
  const p = ball.mesh.position, v = ball.v, r = 0.12;
  if (ball.held) { heldPos(tmpA); p.lerp(tmpA, 0.35); ball.mesh.rotation.y += dt * 0.5; return; }
  ball.timer += dt;
  v.y -= 9.8 * dt; p.addScaledVector(v, dt);
  ball.mesh.rotation.x -= v.z * dt * 4; ball.mesh.rotation.z += v.x * dt * 4;
  // floor
  if (p.y < r) { p.y = r; if (Math.abs(v.y) > 0.4) v.y = -v.y * 0.58; else v.y = 0; v.x *= 0.88; v.z *= 0.88; }
  // backboard
  if (v.z < 0 && p.z - r < HOOP.boardZ + 0.02 && p.z > HOOP.boardZ - 0.3 && Math.abs(p.x - HOOP.x) < HOOP.boardHalfW + r && Math.abs(p.y - HOOP.boardY) < HOOP.boardHalfH + r) { p.z = HOOP.boardZ + 0.02 + r; v.z = -v.z * 0.62; v.x *= 0.85; }
  // back wall / column behind the hoop
  if (p.z < -3.3 + r) { p.z = -3.3 + r; v.z = -v.z * 0.5; }
  // rim: closest point on the ring
  const dx = p.x - HOOP.x, dz = p.z - HOOP.rimZ; const hd = Math.hypot(dx, dz) || 1e-6;
  const qx = HOOP.x + dx / hd * HOOP.R, qz = HOOP.rimZ + dz / hd * HOOP.R;
  const nx = p.x - qx, ny = p.y - HOOP.rimY, nz = p.z - qz; const nd = Math.hypot(nx, ny, nz);
  const minD = r + HOOP.tube;
  if (nd < minD && nd > 1e-6) { const k = (minD - nd); p.x += nx / nd * k; p.y += ny / nd * k; p.z += nz / nd * k; const vn = (v.x * nx + v.y * ny + v.z * nz) / nd; if (vn < 0) { v.x -= 1.5 * vn * nx / nd; v.y -= 1.5 * vn * ny / nd; v.z -= 1.5 * vn * nz / nd; v.multiplyScalar(0.92); } }
  // score
  if (!ball.scored && ball.prevY > HOOP.rimY && p.y <= HOOP.rimY && v.y < 0 && hd < HOOP.R - 0.03) { ball.scored = true; ball.score += 2; hudScore.textContent = 'SCORE ' + ball.score + '  ·  SHOTS ' + ball.shots; hudMsg.textContent = hd < 0.06 ? 'SWISH!' : 'BUCKET!'; }
  ball.prevY = p.y;
  const slow = p.y <= r + 0.001 && v.length() < 0.35;
  if (slow || ball.timer > 6 || p.z > camera.position.z + 1 || p.y < -1) { ball.held = true; ball.live = false; if (!ball.scored) { hudScore.textContent = 'SCORE ' + ball.score + '  ·  SHOTS ' + ball.shots; } }
}

/* ================= sizing / loop ================= */
let lastW = 0, lastH = 0, lastDPR = 0;
function viewport() {
  let w = innerWidth || document.documentElement.clientWidth || 0, h = innerHeight || document.documentElement.clientHeight || 0;
  if (!w || !h) { w = Math.min(screen.width || 1440, 1600); h = Math.min(screen.height || 900, 900); }
  return [Math.max(1, w), Math.max(1, h)];
}
function resize() {
  const [w, h] = viewport(); if (w === lastW && h === lastH && DPR === lastDPR) return; lastW = w; lastH = h; lastDPR = DPR;
  renderer.setPixelRatio(DPR); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const rw = Math.max(2, Math.floor(w * DPR)), rh = Math.max(2, Math.floor(h * DPR));
  rt.setSize(rw, rh); postMat.uniforms.uRes.value.set(rw, rh);
}
new ResizeObserver(() => resize()).observe(document.documentElement);
window.addEventListener('resize', resize);

const t0 = performance.now();
let frame = 0, lastNow = t0, slowFrames = 0;
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function render(now) {
  resize();
  const t = (now - t0) / 1000; const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;
  mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
  const [cp, cl] = targets();
  state.transT = Math.min(1, state.transT + dt / 1.15); const e = ease(state.transT);
  camera.position.lerpVectors(state.camFrom, cp, e); state.lookCur.lerpVectors(state.lookFrom, cl, e); camera.lookAt(state.lookCur);
  // damped pendulums: they keep swinging after the pointer has gone
  for (const p of pendants) {
    p.vx += (-2.6 * p.ax - 0.62 * p.vx) * dt;
    p.vz += (-2.6 * p.az - 0.62 * p.vz) * dt;
    p.ax += p.vx * dt; p.az += p.vz * dt;
    p.pv.rotation.z = -p.ax; p.pv.rotation.x = p.az;
  }
  if (slider.front) {
    slider.t += ((state.mode === 'home' ? slider.want : 0) - slider.t) * Math.min(1, dt * 5);
    slider.front.position.x = slider.shut + (slider.open - slider.shut) * slider.t;
  }
  gameStep(dt); gameDraw(t);
  if (frame % 2 === 1) { drawMarquee(t); drawTicker(t); }
  if (frame % 4 === 2) drawPhone(t);
  // neon buzz + occasional dropout
  if (neon.plane) { if (neon.off > 0) neon.off--; else if (Math.random() < 0.006) neon.off = 2 + ((Math.random() * 6) | 0); const buzz = 0.93 + 0.07 * Math.sin(t * 60) * Math.sin(t * 7.3); const lvl = neon.off ? 0.35 : buzz; neon.plane.material.opacity = lvl; neon.light.intensity = 7 * lvl; neon.glow.material.opacity = 0.12 * lvl; }
  if (state.mode === 'hoop') ballStep(dt);
  if (frame % 2 === 0) { drawStatic(staticTexA, t, false); drawStatic(staticTexB, t, true); for (const tx of tvTextures) tx.needsUpdate = true; }
  TV.forEach((tv, i) => {
    const focused = state.mode === 'tv' && state.tvIndex === i;
    if (focused || (frame + i) % 6 === 0) { tv.site.draw(tv.ctx, 640, 480, t); tv.tex.needsUpdate = true; }
    const target = state.mode === 'tv' ? (focused ? 0.05 : 0.45) : 0.7;
    tv.snowLevel += (target - tv.snowLevel) * 0.08; tv.snow.material.opacity = tv.snowLevel; tv.light.intensity = 0.7 + (1 - tv.snowLevel) * 0.8;
  });
  arcadeLight.intensity = 6 + Math.sin(t * 6) * 1.2 + Math.sin(t * 17) * 0.5;
  postMat.uniforms.uFade.value = Math.min(1, Math.max(0, (t - 0.25) / 1.4));
  syncVHS(dt);
  renderer.setRenderTarget(rt); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  frame++;
}
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
let shadowDirty = 2;
window.markShadows = () => { shadowDirty = 2; };
let lobbyRaf = 0;
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
new MutationObserver(syncLobbyPlayback).observe(document.body, { attributes: true, attributeFilter: ['class'] });
state.camFrom.copy(camBase); state.lookFrom.copy(camLook); camera.position.copy(camBase);
resize();
render(performance.now());
loaderEl.classList.add('done');
canvas.style.opacity = '1';
document.getElementById('lobby-poster')?.remove();
window.dispatchEvent(new Event('lobby-ready'));
syncLobbyPlayback();

window.__slider = slider; window.__pend = () => pendants.map(p => ({ x: +p.ax.toFixed(4), z: +p.az.toFixed(4) }));
window.__sblvl = { scene, camera, renderer, state, game, ball, TV, characters, bounds() { return characters.map(g => { const b = new THREE.Box3().setFromObject(g); return { min: b.min.toArray().map(v => +v.toFixed(3)), max: b.max.toArray().map(v => +v.toFixed(3)) }; }); }, steps: Array.from({ length: STEPS }, (_, i) => ({ min: [X_BOTTOM - (i + 1) * RUN, 0, Z0], max: [X_BOTTOM - i * RUN, STEP_TOP(i), i < 3 ? Z1 + 0.55 - i * 0.12 : Z1] })), setMode, showTV, throwBall, render: () => render(performance.now()), setMouse(x, y) { mouse.x = mouse.tx = x; mouse.y = mouse.ty = y; }, step(n) { for (let i = 0; i < n; i++) { gameStep(1 / 60); if (state.mode === 'hoop') ballStep(1 / 60); state.transT = Math.min(1, state.transT + 1 / 69); } }, get dpr() { return DPR; }, set dpr(v) { DPR = v; }, rt };

