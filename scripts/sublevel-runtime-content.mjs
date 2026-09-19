import assert from "node:assert/strict";

// Content-only adaptations of the verified ThreeUI source. The canvas painters,
// scene geometry, shaders, controls and public runtime hooks stay authored.
function replaceOnce(source, before, after, label = before.slice(0, 72)) {
  assert.equal(source.split(before).length - 1, 1, `Expected one ThreeUI anchor: ${label}`);
  return source.replace(before, () => after);
}

function replaceLiteral(source, before, after) {
  assert.ok(source.includes(before), `Missing ThreeUI content anchor: ${before}`);
  return source.replaceAll(before, after);
}

function scriptString(value) {
  return JSON.stringify(String(value)).replaceAll("<", "\\u003c");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function wrapLine(value, width = 76) {
  const lines = [];
  let current = "";
  for (const word of value.split(/\s+/)) {
    if (current && current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
    } else current += `${current ? " " : ""}${word}`;
  }
  if (current) lines.push(current);
  return lines;
}

export function customizeRuntime(html, { profile, projects, services }) {
  assert.ok(profile?.name && profile?.email, "A business name and contact email are required");
  assert.ok(Array.isArray(projects) && Array.isArray(services), "Projects and services are required");
  const project = (slug) => {
    const found = projects.find((item) => item.slug === slug);
    assert.ok(found, `Missing portfolio content for ${slug}`);
    return found;
  };
  const sky = project("sky-events"), keys = project("keybuilds");
  const jobs = project("job-elite"), fittra = project("fittra-training");

  const runtimeStart = html.indexOf("import * as THREE from 'three';");
  assert.ok(runtimeStart >= 0, "Missing authored lobby module");
  const runtimeEnd = html.indexOf("</script>", runtimeStart);
  assert.ok(runtimeEnd > runtimeStart, "Missing lobby module closing tag");
  let runtime = html.slice(runtimeStart, runtimeEnd);

  const stories = [
    ["Halide Launch", "Website · Event", "Real-time summit site with live schedule and ticket drop.", sky.title, "Concept · Event experience", "Sample digital invitation: venue, schedule and guest journeys."],
    ["Lumenary", "Website · Product launch", "Story-driven launch site for a first hardware release.", keys.title, "Concept · Interactive commerce", "Sample 3D keyboard configurator and responsive storefront."],
    ["Kestrel Studios", "Website · Lookbook", "A seasonal lookbook turned into a browsable world.", jobs.title, "Concept · Backend & DevOps", "Sample release architecture with staging, production and CI/CD."],
    ["Shop Moonrake", "Storefront", "A creator storefront that feels like the videos.", "Commerce", "Capability · Commerce", "Storefronts, checkout, subscriptions and member access. Illustrative UI."],
    ["Northwind Labs", "Product UI · Dashboard", "Operations console for a logistics platform.", fittra.title, "Project · Learning platform", "Frontend, live-session integrations and payment journeys. Illustrative UI."],
    ["Sublevel Defender", "Lab · Game", "The lobby arcade game. Click the cabinet to play.", "AE Defender", "Lab · Interactive demo", "A playable demo from this ThreeUI template. Click the cabinet to play."],
    ["Cobaltine", "Brand identity", "Visual identity and motion system for a data company.", "Business Portals", "Capability · CRM & portals", "Client portals, dashboards, approvals and connected workflows. Illustrative UI."],
  ];
  for (const [title, kind, desc, nextTitle, nextKind, nextDesc] of stories) {
    runtime = replaceOnce(runtime,
      `{ title: '${title}', kind: '${kind}', desc: '${desc}', draw(g, w, h, t) {`,
      `{ title: ${scriptString(nextTitle)}, kind: ${scriptString(nextKind)}, desc: ${scriptString(nextDesc)}, draw(g, w, h, t) {`,
      `PORTFOLIO story ${title}`);
  }

  // Short wordmarks fit the exact authored canvas allocations.
  for (const [before, after] of [
    ["'sublevel.'", "'ahmed.'"],
    ["'SUBLEVEL DEFENDER'", "'AE DEFENDER'"],
    ["'SUBLEVEL'", "'AHMED'"],
    ["'SBLVL'", "'AE'"],
    ["'SUBLEVEL   ///   WE BUILD THE STUFF PEOPLE REMEMBER   ///   OPEN LATE   ///   NOW PLAYING: SUBLEVEL DEFENDER   ///   '", "'AHMED ESMAIL   ///   WEB APPS FOR YOUR BUSINESS   ///   DESIGN TO DEPLOYMENT   ///   NOW PLAYING: AE DEFENDER   ///   '"],
    ["g.fillText('S', 244, 51)", "g.fillText('A', 244, 51)"],
    ["'halide'", scriptString(sky.title)],
    ["['Schedule', 'Speakers', 'Tickets', 'Venue']", "['Schedule', 'Details', 'Invite', 'Venue']"],
    ["'LAUNCH'", "'EVENTS'"],
    ["\"'26\"", "'DEMO'"],
    ["'SEP 24 — SAN FRANCISCO'", "'DIGITAL INVITATION CONCEPT'"],
    ["['09:00  KEYNOTE — THE NEXT RUNTIME', '10:30  WORKSHOP — EDGE FIRST', '13:00  PANEL — SHIPPING AT SCALE', '15:00  DEMO — LIVE BUILDS', '17:30  PARTY — PIER 27', '19:00  AFTERGLOW']", "['09:00  ARRIVAL — WELCOME', '10:30  OPENING — MAIN STAGE', '13:00  BREAK — MEET AND CONNECT', '15:00  SESSION — THE AFTERNOON', '17:30  CLOSING — SEE YOU SOON', '19:00  SAMPLE SCHEDULE']"],
    ["g.fillText('LIVE', w - 76, y + 7)", "g.fillText('DEMO', w - 76, y + 7)"],
    ["'lumenary'", scriptString(keys.title)],
    ["['Product', 'Story', 'Order']", "['Product', 'Options', 'Demo']"],
    ["'one light. no apps.'", "'your keys. your way.'"],
    ["'Daylight,'", "'Build your'"],
    ["'on demand.'", "'next board.'"],
    ["'Ships this spring. Reserve yours.'", "'Interactive keyboard concept.'"],
    ["'Reserve — $299'", "'Explore concept'"],
    ["'KESTREL'", "'JOB ELITE'"],
    ["'SS26 LOOKBOOK — SCROLL TO EXPLORE'", "'DEPLOYMENT CONCEPT — BUILD TO RELEASE'"],
    ["'LOOK 0'", "'STEP 0'"],
    ["'Moonrake'", "'Commerce'"],
    ["g.fillText('SHOP', 245, 46)", "g.fillText('DEMO', 245, 46)"],
    ["['HOODIE', 'TEE', 'CAP', 'DROP 04']", "['CATALOG', 'CHECKOUT', 'MEMBERS', 'BILLING']"],
    ["'$' + [64, 32, 28, 89][i]", "'UI DEMO'"],
    ["'NEW DROP IN '", "'UI PREVIEW '"],
    ["'northwind'", "'fittra · UI sketch'"],
    ["['Overview', 'Fleet', 'Routes', 'Alerts', 'Billing']", "['Overview', 'Courses', 'Sessions', 'Access', 'Billing']"],
    ["card(170, 20, 140, 70, 'Active vehicles', String(412 + Math.floor(Math.sin(t) * 6)), '#e6e6e6'); card(322, 20, 140, 70, 'On-time', (96.2 + Math.sin(t * 0.5) * 0.4).toFixed(1) + '%', '#5ee0a0'); card(474, 20, 140, 70, 'Alerts', String(3 + (Math.floor(t / 4) % 3)), '#ff4d00');", "card(170, 20, 140, 70, 'Learning UI', 'COURSES', '#e6e6e6'); card(322, 20, 140, 70, 'Live sessions', 'ZOOM', '#5ee0a0'); card(474, 20, 140, 70, 'Access flows', 'PAID', '#ff4d00');"],
    ["'Deliveries per hour'", "'Session activity · UI sketch'"],
    ["'Load by hub'", "'Course overview · UI sketch'"],
    ["'Cobaltine'", "'Portals'"],
    ["'DATA, MADE LEGIBLE.'", "'YOUR TEAM, CONNECTED.'"],
    ["'COBALTINE — IDENTITY 2026 —'", "'PORTALS — CAPABILITY DEMO —'"],
  ]) runtime = replaceLiteral(runtime, before, after);

  assert.ok(!/sublevel|sblvl|halide|lumenary|kestrel|moonrake|northwind|cobaltine/i.test(
    runtime.replaceAll("__sblvl", "__runtime")
  ), "Unadapted business branding remains in the lobby runtime");
  html = html.slice(0, runtimeStart) + runtime + html.slice(runtimeEnd);

  const lines = [];
  const line = (text = "", tone = "p") => lines.push([text, tone]);
  const paragraph = (text, tone = "p") => wrapLine(text).forEach((part) => line(part, tone));
  const section = (title) => { line(); line(`── ${title} ${"─".repeat(Math.max(0, 65 - title.length))}`, "d"); };
  line(profile.name.toUpperCase(), "h");
  line("FULL-STACK DEVELOPER · BUSINESS APPLICATIONS", "a");
  line();
  line("PORTFOLIO :: MACHINE-READABLE INDEX");
  paragraph("A plain-text view of the same portfolio, services and contact information.", "d");
  section("ABOUT");
  line(`NAME .......... ${profile.name}`);
  line("FOCUS ......... Websites, commerce, learning and business platforms");
  paragraph("I build responsive interfaces, reliable backends and connected workflows, from product planning through deployment.");
  section("SERVICES");
  for (const service of services) {
    line(`* ${service.title}`, "a");
    paragraph(service.description);
    paragraph(service.items.join(" · "), "d");
    line();
  }
  section("PROJECTS & CONCEPTS");
  for (const item of projects) {
    line(`${item.sample ? "[CONCEPT]" : "[PROJECT]"} ${item.title}`, "a");
    paragraph(item.overview);
    paragraph(`STACK: ${item.techStack.join(" · ")}`, "d");
    line(`CASE STUDY: /project/${item.slug}`, "d");
    line();
  }
  paragraph("Concept case studies are labeled samples. The animated lobby screens are illustrative previews, not project screenshots or performance metrics.", "d");
  section("INTERACTIVE LAB");
  line("AE DEFENDER — click the arcade cabinet to play.");
  line("AE SHOT — click the hoop, then drag the ball upward to shoot.");
  paragraph("Interactive lobby demos are included from the authored ThreeUI template.", "d");
  section("CONTACT");
  line(`EMAIL ......... ${profile.email}`);
  if (profile.github) paragraph(`GITHUB ........ ${profile.github}`);
  if (profile.linkedin) paragraph(`LINKEDIN ...... ${profile.linkedin}`);
  paragraph("Tell me about your business, the problem to solve and the product you want to build.");

  const mirror = html.match(/<pre class="sr-only">[\s\S]*?<\/pre>/g);
  assert.equal(mirror?.length, 1, "Expected one authored machine-readable text mirror");
  html = replaceOnce(html, mirror[0], `<pre class="sr-only">${escapeHtml(lines.map(([text]) => text).join("\n"))}</pre>`, "machine-readable text mirror");
  const terminal = html.match(/  const SUBLEVEL_LOG = [^\n]+/g);
  assert.equal(terminal?.length, 1, "Expected one authored terminal log");
  html = replaceOnce(html, terminal[0], `  const SUBLEVEL_LOG = ${JSON.stringify(lines).replaceAll("<", "\\u003c")}.map(([t, c]) => [seg(t, c)]);`, "terminal log");
  html = replaceOnce(html,
    "const STATUS = ['online', 'rendering lobby', 'watching the hoop', 'idle', '2 jobs queued', 'online'];",
    "const STATUS = ['online', 'rendering lobby', 'building web apps', 'explore the work', 'design to deployment', 'online'];",
    "utility dock status copy");
  return html;
}
