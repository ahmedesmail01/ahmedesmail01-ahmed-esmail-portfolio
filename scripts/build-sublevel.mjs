import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { profile, projects, services, skills } from '../lib/content.ts';
import { customizeRuntime } from './sublevel-runtime-content.mjs';
import { optimizeRuntime } from './sublevel-performance-runtime.mjs';
import { splitAssets } from './sublevel-assets.mjs';

// Start from the verified, unmodified source every time. Only business content
// and the explicitly documented application integration are changed.
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('vendor/threeui/upstream/sublevel-studio.html', root), 'utf8');
const expected = '91db5c1bb779687990b01f226a02d7fe7cf7954a40ba8053c4d6b7abf82232e3';
if (createHash('sha256').update(source).digest('hex') !== expected) {
  throw new Error('The canonical Sublevel source no longer matches the registered revision.');
}
let html = customizeRuntime(source, { profile, projects, services });
const escape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function replace(before, after) {
  if (!html.includes(before)) throw new Error(`Missing content anchor: ${before.slice(0, 90)}`);
  html = html.replaceAll(before, after);
}
function replacePattern(pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`Missing source pattern: ${pattern}`);
  html = html.replace(pattern, replacement);
}

replace('<title>sublevel.studio | We build the stuff people remember.</title>', '<title>Ahmed Esmail | Full-Stack &amp; Frontend Engineer</title>');
replace('sublevel. is a digital studio & brand workshop building the stuff people remember. A single-file Three.js experience.', 'Ahmed Esmail builds expressive websites, commerce experiences, learning platforms, and dependable business applications. Based in Cairo, working worldwide.');
replace('loading sublevel', 'loading ahmed esmail');
replace('aria-label="sublevel.studio"', 'aria-label="Ahmed Esmail home"');
replace('sublevel<i>.</i>', 'ahmed<i>.</i>');
replace('agent@sublevel', 'hello@ahmed');
replace('hello@sublevel.studio', profile.email);
replace(`href="mailto:${profile.email}">Contact</a>`, `href="mailto:${profile.email}">Email Ahmed</a>`);
replace('Contact us', 'Contact Ahmed');
replace('Contact Us', 'Contact Ahmed');
replace('Kyoto &amp; remote · open late', 'Cairo, Egypt · working worldwide');
replace('Est. 2019 · dispatch 026', 'Full-stack &amp; frontend engineering');
replace('Sublevel — studio index', 'Ahmed Esmail — engineer &amp; builder');
replace('Est. 2019', 'Cairo · Worldwide');
replace('A digital studio &amp; brand workshop building the stuff people remember', 'Thoughtful interfaces. Reliable engineering. Software that works for you.');
replace('We team up with ambitious founders, scale-ups and brands to turn strategy into products, identities and experiences that actually ship.', 'I’m Ahmed Esmail, a full-stack and frontend engineer. I help businesses turn ideas into websites, commerce experiences, learning platforms, and dependable applications.');

// Retain all twelve authored cells, replacing fictional clients with real skills.
replace('Trusted by the builders', 'Tools I build with');
const tech = skills.flatMap((group) => group.items).filter((name) => ['React.js', 'Next.js', 'Vue.js', 'TypeScript', 'Tailwind CSS', 'Zustand', 'Node.js', 'NestJS', 'Java', 'PostgreSQL', 'Docker', 'CI/CD'].includes(name));
let cell = 0;
replacePattern(/<a href="#showcase" aria-label="[^"]+"><div class="cell with-dots">[\s\S]*?<\/div><\/a>/g, () => {
  const name = tech[cell++];
  if (!name) throw new Error('Unexpected skill cell count');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90"><text x="150" y="55" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="600" fill="#e6e6e6">${escape(name)}</text></svg>`;
  return `<a href="#services" aria-label="${escape(name)}"><div class="cell with-dots"><div class="lines with-diagonal-lines"></div><img alt="${escape(name)}" data-ps src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></div></a>`;
});
if (cell !== 12) throw new Error(`Expected twelve authored skill cells, found ${cell}`);

replace('Featured Projects', 'Selected work &amp; concepts');
replace('Eight selected builds from the last eighteen months — brand systems, product launches and a few experiments that got out of hand.', 'Frontend work from the Fittra ecosystem, alongside three clearly labeled concept case studies. Covers are illustrative; explore each project for the details.');
const originalCards = html.match(/<article class="card">[\s\S]*?<\/article>/g);
if (originalCards?.length !== 8) throw new Error('Expected eight original project cells');
const orderedProjects = [...projects.filter((p) => !p.sample), ...projects.filter((p) => p.sample)];
let projectIndex = 0;
replacePattern(/<article class="card">[\s\S]*?<\/article>/g, (card) => {
  const project = orderedProjects[projectIndex++];
  if (!project) return '';
  const url = `/project/${project.slug}/`;
  return card
    .replaceAll('href="#work"', `href="${url}" target="_top"`)
    .replace(/aria-label="[^"]+"/, `aria-label="View ${escape(project.title)}${project.sample ? ' concept case study' : ''}"`)
    .replace(/<img alt="" src="[^"]+">/, `<img alt="Illustrative cover for ${escape(project.title)}" src="${project.image}">`)
    .replace(/(<p class="cats" data-ps>)[\s\S]*?(<\/p>)/, `$1${escape(project.category)} · ${project.sample ? 'CONCEPT STUDY' : 'FRONTEND CONTRIBUTION'}$2`)
    .replace(/(<h3 class="f-h3" data-ps>)[\s\S]*?(<\/h3>)/, `$1${escape(project.title)}$2`)
    .replace(/(<p class="desc f-p" data-ps>)[\s\S]*?(<\/p>)/, `$1${escape(project.overview)}$2`);
});

replace("We're here to make the extraordinary.", 'Your business. Built to work.');
replace('No shortcuts — just bold, precise work that raises the bar &amp; leaves a mark.', 'From the first interface to the systems behind it, I build around what your customers and team need.');
const groups = [
  { title: 'Websites &amp; commerce', description: 'Responsive websites, landing pages, and storefronts that give your business a clear digital presence and a thoughtful path to purchase.', tags: ['Next.js', 'React', 'Payments', 'Multilingual &amp; RTL'] },
  { title: 'Learning &amp; business platforms', description: 'Connected learning experiences, client portals, CRM tools, and focused operational workflows shaped around the way your team works.', tags: ['LMS', 'Dashboards', 'Live sessions', 'Workflows'] },
  { title: 'APIs &amp; integrations', description: 'Reliable application backends and integrations that connect your product to payments, live sessions, maps, and the tools you depend on.', tags: ['NestJS', 'REST APIs', 'PostgreSQL', 'Integrations'] },
  { title: 'Delivery &amp; performance', description: 'MVP implementation, frontend improvements, and dependable deployment pipelines that help your product launch and keep evolving.', tags: ['TypeScript', 'Docker', 'CI/CD', 'Performance'] },
];
let capability = 0;
replacePattern(/<div class="cap framed">[\s\S]*?<div class="tags f-p">[\s\S]*?<\/div>\s*<\/div>/g, (card) => {
  const group = groups[capability++];
  return card
    .replace('href="#showcase"', 'href="/services/" target="_top"')
    .replace(/(<a class="actionable"[^>]*>)[\s\S]*?(<\/a>)/, `$1${group.title}$2`)
    .replace(/(<p class="f-h4" data-ps>)[\s\S]*?(<\/p>)/, `$1${group.description}$2`)
    .replace(/(<div class="tags f-p">)[\s\S]*?(<\/div>)/, `$1${group.tags.map((tag) => `<span>${tag}</span>`).join('')}$2`);
});
if (capability !== 4) throw new Error('Expected four authored service cells');

replace('id="people"', 'id="contact"');
replace('href="#people">People', 'href="#contact">Contact');
replace("Let's build something loud.", 'Have an idea? Let’s build it.');
replace('Newsletter — dispatch 026', 'New project — let’s talk');
replace('Want the good stuff first?', 'A good project starts with a conversation.');
replace('Drops, experiments and the occasional bad idea, sent no more than once a month.', 'Tell me what you’re building. Share your email below to open a project enquiry in your email app.');
replace('you@studio.com', 'you@company.com');
replace('Count me in', 'Let’s talk');
replace('>Monthly<', '>Email me<');
replace('No spam. Unsubscribe in one click.', 'Opens your email app. Nothing is sent until you send it.');
replace('SUBLEVEL.26', 'AHMED.ESMAIL');
replace('© sublevel.studio LLC 2026 all rights reserved', '© Ahmed Esmail 2026 · Full-stack &amp; frontend engineering');
replace('href="#blog">Blog', 'href="/blogs/" target="_top">Journal');
replace('href="#showcase">Work', 'href="#work">Work');
replace('href="#showcase">Showcase', 'href="#work">Work');
// Keep the existing social SVGs for Ahmed’s actual accounts.
replacePattern(/<a href="#lab" aria-label="(?:X|Instagram)"[\s\S]*?<\/a>/g, '');
replace('href="#lab" aria-label="GitHub"', `href="${profile.github}" target="_blank" rel="noopener noreferrer" aria-label="GitHub"`);
replace('href="#lab" aria-label="LinkedIn"', `href="${profile.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"`);

// The authored newsletter is a simulated signup. Replace just that handler with
// a real mailto enquiry; keep its original form and animated button structure.
const contactScript = await readFile(new URL('scripts/sublevel-contact.js', root), 'utf8');
replacePattern(/  \/\/ Newsletter form\n[\s\S]*?\n  \/\/ ThreeUI <TerrainPlumeCanvas/, `${contactScript}\n\n  // ThreeUI <TerrainPlumeCanvas`);
replace('<body>', '<body>\n<div id="lab" aria-hidden="true" style="position:absolute;top:0"></div>');
replace('</head>', `<style id="ahmed-content-fit">\n/* Fit Ahmed’s contact address while retaining the authored layout. */\n.contact .mail{font-size:clamp(18px,3.5vw,52px);line-height:1.2;white-space:normal;overflow-wrap:anywhere}\n.menu-foot p{overflow-wrap:anywhere}\n.form-feedback{font-family:var(--mono);font-size:12px;line-height:1.5;color:var(--w2)}\n:focus-visible{outline:2px solid var(--o);outline-offset:4px}\n</style>\n</head>`);

await mkdir(new URL('public/landing-pages/', root), { recursive: true });
html = await splitAssets(optimizeRuntime(html), root);
await writeFile(new URL('public/landing-pages/sublevel-studio.html', root), html);
console.log('Generated Ahmed’s homepage from verified Sublevel source.');
