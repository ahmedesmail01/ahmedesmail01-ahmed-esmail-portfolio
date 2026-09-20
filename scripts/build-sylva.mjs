import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { profile, projects, services, skills } from '../lib/content.ts';
import { optimizeSylvaRuntime, splitSylvaAssets } from './sylva-performance-runtime.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('vendor/threeui/sylva-source.json', root), 'utf8'));
let html = await readFile(new URL('vendor/threeui/upstream/inner-green-3d.html', root), 'utf8');
const hash = (data) => createHash('sha256').update(data).digest('hex');
const canonical = manifest.files.find((file) => file.role === 'canonical-source');
assert.equal(hash(html), canonical.sha256, 'The archived Sylva source must remain unchanged');
const authoredBlocks = [...html.matchAll(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g)].map((match) => match[0]);
for (const asset of [...manifest.assets, ...manifest.files.filter((file) => file.role === 'three-runtime')]) {
  const bytes = await readFile(new URL(asset.path, root));
  assert.equal(bytes.length, asset.bytes, `Asset size changed: ${asset.path}`);
  assert.equal(hash(bytes), asset.sha256, `Asset hash changed: ${asset.path}`);
}
function replace(before, after) {
  assert.equal(html.split(before).length, 2, `Expected one Sylva content anchor: ${before.slice(0, 80)}`);
  html = html.replace(before, () => after);
}

replace('<head>', '<head>\n<base href="/landing-pages/">');
replace('<main class="hero" id="hero">', '<main class="hero sylva-mobile-hero" id="hero">');
replace('<title>Sylva — Into the living world</title>', '<title>Ahmed Esmail — Full-Stack &amp; Frontend Engineer</title>');
replace('Restoring wild places through patient design, native planting, and a deeper kind of stewardship.', 'Ahmed Esmail builds thoughtful websites, learning platforms, commerce experiences and custom web applications. Based in Cairo, working worldwide.');
replace('aria-label="Sylva — home"', 'aria-label="Ahmed Esmail — home" data-business-home');
replace('href="#" style="--d:180ms"', 'href="#work" data-business-panel="work" aria-label="Selected work" style="--d:180ms"');
replace('<span>Grove</span>', '<span>Work</span>');
replace('href="#" style="--d:230ms"', 'href="/services/" target="_top" data-business-route="/services/" aria-label="Services" style="--d:230ms"');
replace('<span>Habitats</span>', '<span>Services</span>');
replace('href="#" style="--d:280ms"', 'href="/blogs/" target="_top" data-business-route="/blogs/" aria-label="Journal" style="--d:280ms"');
replace('href="#" style="--d:330ms"', 'href="#contact" data-business-panel="contact" aria-label="Contact Ahmed" style="--d:330ms"');
replace('<span>Enter</span>', '<span>Contact</span>');
replace('aria-hidden="true">SYLVA</div>', 'aria-hidden="true">AHMED</div>');
replace('<p class="label">Our Ethos</p>', '<p class="label">My approach</p>');
replace('<h2>Let the wild lead.</h2>', '<h2>Built with purpose.</h2>');
replace('aria-label="Read about Sylva"', 'aria-label="About Ahmed Esmail" data-business-panel="about"');
replace('style="--d:260ms">Step into', 'style="--d:260ms">Good ideas.');
replace('style="--d:360ms">the living world', 'style="--d:360ms">Built to grow.');
replace('We restore wild places through patient design, native planting, and a deeper kind of stewardship.', 'I’m Ahmed Esmail, a full-stack engineer building thoughtful websites and reliable web applications.');
replace('class="liquid-button liquid-button--explore btn" type="button"', 'class="liquid-button liquid-button--explore btn" type="button" data-business-panel="work"');
replace('aria-label="Play the film"', 'aria-label="View the Fittra Training case study" data-business-route="/project/fittra-training/"');
replace('<dt>Canopy restored</dt><dd>282 ha</dd>', '<dt>Based in</dt><dd>Cairo, Egypt</dd>');
replace('<dt>Native species</dt><dd>43 mapped</dd>', '<dt>Engineering</dt><dd>Full-stack</dd>');
replace('<p class="label">Field Note 07</p>', '<p class="label">Selected work</p>');
replace('<h2>After the Rain</h2>', '<h2>Fittra Training</h2>');
replace('aria-label="Open field note: After the Rain"', 'aria-label="View the Fittra Training case study" data-business-route="/project/fittra-training/"');
replace('href="#">Discover', 'href="#work" data-business-panel="work">Discover');

// Verify the unmodified authored blocks before deriving runtime scheduling and
// cacheable assets. Shaders and geometry stay in the checked-in archive.
const mobileDimensions = await readFile(new URL('components/sylva/mobile-hero.css', root), 'utf8');
const css = `${mobileDimensions}\n${await readFile(new URL('scripts/sylva-business.css', root), 'utf8')}`;
const script = await readFile(new URL('scripts/sylva-business.js', root), 'utf8');
const data = JSON.stringify({ profile, projects, services, skills }).replaceAll('<', '\\u003c');
replace('</head>', `<style id="ahmed-business-styles">\n${css}\n</style>\n</head>`);
replace('</body>', `<dialog id="business-dialog" aria-labelledby="business-title">
  <div class="business-heading"><p id="business-kicker"></p><button class="business-close" type="button" aria-label="Close panel">×</button></div>
  <h2 id="business-title" tabindex="-1"></h2>
  <div id="business-content"></div>
</dialog>
<script id="business-data" type="application/json">${data}</script>
<script>\n${script}\n</script>
</body>`);
await mkdir(new URL('public/landing-pages/', root), { recursive: true });
for (const block of authoredBlocks) assert.ok(html.includes(block), 'An authored Sylva script or stylesheet changed');
html = optimizeSylvaRuntime(html);
html = await splitSylvaAssets(html, root);
await writeFile(new URL('public/landing-pages/inner-green-3d.html', root), html);
console.log('Generated Ahmed’s Sylva homepage from verified source and assets.');
