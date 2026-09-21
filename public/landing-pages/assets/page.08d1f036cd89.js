
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
  if (!paperPromise) paperPromise = import("/landing-pages/assets/menu-three-r149.526ad711e46a.js")
    .then(() => import("/landing-pages/assets/paper-menu.655c3751d795.js"))
    .catch(error => { paperPromise = null; console.warn('Paper visual unavailable', error); });
  return paperPromise;
}

(function () {
  const term = document.getElementById('termstatus'), txt = term.querySelector('.txt');
  const STATUS = ['online', 'rendering lobby', 'building web apps', 'explore the work', 'design to deployment', 'online'];
  let si = 0, typing = null;
  function type(str) { clearInterval(typing); let k = 0; typing = setInterval(() => { txt.textContent = str.slice(0, ++k); if (k >= str.length) clearInterval(typing); }, 28); }
  setInterval(() => { if (!document.body.classList.contains('machine')) { si = (si + 1) % STATUS.length; type(STATUS[si]); } }, 4200);
  let crt = null; const seg = (t, c) => window.ThreeUICrt.segment(t, c);
  // the machine index (same text as before) as terminal lines: role p = orange, d = dim, a = accent, h = bright
  const terminalLog = () => [["AHMED ESMAIL","h"],["FULL-STACK DEVELOPER · BUSINESS APPLICATIONS","a"],["","p"],["PORTFOLIO :: MACHINE-READABLE INDEX","p"],["A plain-text view of the same portfolio, services and contact information.","d"],["","p"],["── ABOUT ────────────────────────────────────────────────────────────","d"],["NAME .......... Ahmed Esmail","p"],["FOCUS ......... Websites, commerce, learning and business platforms","p"],["I build responsive interfaces, reliable backends and connected workflows,","p"],["from product planning through deployment.","p"],["","p"],["── SERVICES ─────────────────────────────────────────────────────────","d"],["* Websites & landing pages","a"],["Distinctive, responsive websites that turn your business into a clear and","p"],["compelling digital experience.","p"],["Business and personal websites · Conversion-focused landing pages ·","d"],["Multilingual & RTL experiences · Technical SEO and accessibility","d"],["","p"],["* E-commerce & subscriptions","a"],["Commerce experiences that make finding, buying and managing products feel","p"],["effortless.","p"],["Product catalogs and storefronts · Checkout and payment integrations ·","d"],["Subscriptions and member access · Order management dashboards","d"],["","p"],["* LMS & learning platforms","a"],["Bring your courses, learners and live sessions into one connected platform.","p"],["Courses and progress tracking · Zoom-powered live sessions · Paid content","d"],["and memberships · Learner and instructor dashboards","d"],["","p"],["* CRM & business portals","a"],["Custom tools that connect your customers, processes and business","p"],["information.","p"],["Customer and lead management · Role-based client portals · Reporting and","d"],["data dashboards · Appointment and clinic workflows","d"],["","p"],["* ERP modules & workflows","a"],["Focused operational modules scoped around your existing systems and the way","p"],["your team works.","p"],["Inventory and order workflows · Approval and request management · ServiceNow","d"],["catalog workflows · Oracle APEX forms and reports","d"],["","p"],["* SaaS & custom applications","a"],["End-to-end product development, with a thoughtful interface and an","p"],["architecture that can evolve.","p"],["MVP planning and implementation · Authentication and access control · Admin","d"],["panels and customer journeys · Real-estate and event platforms","d"],["","p"],["* APIs & integrations","a"],["Reliable backends and integrations that connect your product to the tools it","p"],["depends on.","p"],["NestJS and Node.js REST APIs · PostgreSQL data modeling · Stripe, Paymob,","d"],["Tabby & Tamara · Zoom, Google Maps and Auth0","d"],["","p"],["* Performance & deployment","a"],["Improve an existing application or create a dependable path from development","p"],["to production.","p"],["Frontend performance audits · Next.js migrations and refactoring · Docker","d"],["and GitHub Actions CI/CD · Staging and production setup","d"],["","p"],["","p"],["── PROJECTS & CONCEPTS ──────────────────────────────────────────────","d"],["[CONCEPT] KeyBuilds","a"],["A sample case study for an interactive mechanical keyboard configurator. The","p"],["concept brings product exploration into three dimensions, connecting a","p"],["responsive storefront to a configurable product experience.","p"],["STACK: Next.js 14 · Supabase · Three.js","d"],["CASE STUDY: /project/keybuilds","d"],["","p"],["[CONCEPT] Sky Events","a"],["A sample digital invitation experience that gives an event its own","p"],["destination. A mobile-first presentation brings the venue, schedule and","p"],["invitation details together.","p"],["STACK: Next.js · Vercel","d"],["CASE STUDY: /project/sky-events","d"],["","p"],["[CONCEPT] Job Elite","a"],["A sample infrastructure case study focused on the path from a development","p"],["change to a production release. The proposed architecture separates staging","p"],["and production and makes deployment repeatable.","p"],["STACK: Backend architecture · CI/CD · Hostinger","d"],["CASE STUDY: /project/job-elite","d"],["","p"],["[PROJECT] Fittra Training","a"],["Part of the Fittra ecosystem: an interconnected suite of training, streaming","p"],["and clinic applications. My work includes frontend development, state","p"],["management, live-session integrations and payment-gated experiences.","p"],["STACK: Next.js · Zustand · Zoom SDK · Stripe","d"],["CASE STUDY: /project/fittra-training","d"],["","p"],["Concept case studies are labeled samples. The animated lobby screens are","d"],["illustrative previews, not project screenshots or performance metrics.","d"],["","p"],["── INTERACTIVE LAB ──────────────────────────────────────────────────","d"],["AE DEFENDER — click the arcade cabinet to play.","p"],["AE SHOT — click the hoop, then drag the ball upward to shoot.","p"],["Interactive lobby demos are included from the authored ThreeUI template.","d"],["","p"],["── CONTACT ──────────────────────────────────────────────────────────","d"],["EMAIL ......... ahmedesmailofficial01@gmail.com","p"],["GITHUB ........ https://github.com/ahmedesmail01","p"],["LINKEDIN ...... https://linkedin.com/in/ahmed-esmail-a28152239","p"],["Tell me about your business, the problem to solve and the product you want","p"],["to build.","p"]].map(([t, c]) => [seg(t, c)]);
  const ORANGE = { p: { fill: '#ff5a10', glow: 'rgba(255,90,16,0.9)' }, d: { fill: '#a8400f', glow: 'rgba(255,90,16,0.4)' }, a: { fill: '#ffd2b8', glow: 'rgba(255,170,120,0.9)' }, h: { fill: '#fff1e8', glow: 'rgba(255,200,160,0.95)' } };
  const SOFT_CRT = { scanDepth: 0.16, grille: 0.18, chroma: 0.6, bar: 0.03, flicker: 0.018, grain: 0.02, vignette: 0.5, gain: 1.22, halo: 0.08, sheen: [1.0, 0.62, 0.38], room: [0.03, 0.015, 0.008], background: '#050200', curve: [0.10, 0.145] };
  async function setMode(m) {
    const machine = m === 'machine';
    document.body.classList.toggle('machine', machine);
    window.VHS = machine
      ? { speed: .75, switching: .09, switchingHeight: .035, acBeat: 1.4, grain: .22, scanlines: .5, jitter: .4 }
      : { speed: .5, switching: .05, switchingHeight: .02, acBeat: 1, grain: .1, scanlines: .1, jitter: .25 };
    if (machine && !window.ThreeUICrt) {
      try { await import("/landing-pages/assets/terminal.c6e5580c9b34.js"); }
      catch (error) { console.warn('Terminal unavailable', error); return; }
      if (!document.body.classList.contains('machine')) return;
    }
    if (machine && !crt) { try { crt = window.ThreeUICrt.mountCrt(document.getElementById('crt-host'), { variant: 'terminal', speed: 1, typeSpeed: 14, motion: 1, hue: 0, saturation: 1, brightness: 1, opacity: 1, fixedFont: 17, colors: ORANGE, styleOverrides: SOFT_CRT }, terminalLog()); } catch (e) { console.warn('CRT unavailable', e); } }
    if (!machine && crt) { crt.destroy(); crt = null; }
    term.setAttribute('aria-pressed', String(machine));
    type(machine ? 'machine view · esc' : STATUS[si]);
    window.scrollTo(0, 0);
  }
  term.addEventListener('click', () => setMode(document.body.classList.contains('machine') ? 'human' : 'machine'));
  document.getElementById('machine-close').addEventListener('click', () => setMode('human'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('machine')) setMode('human'); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); location.href = 'mailto:ahmedesmailofficial01@gmail.com'; } });


  // Canvas UI Particle Scroll over the page content: text and images below the formation line dissolve
  // into orange/yellow grains and reassemble as they scroll up; the live DOM blurs in once a block has landed.
  whenNear(document.querySelector('#layout'), async () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    await import("/landing-pages/assets/particles.7fcdef3680ec.js");
  if (window.ParticleScroll && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.__ps = window.ParticleScroll.mountParticleScroll('[data-ps]', { point: 0.68, band: 330, density: 2, size: 1.25, spread: 200, gravity: 0.35, drift: 0.9, swirl: 70, stagger: 0.55, fade: 0.42, settle: 0.7, hold: 1.15, smoothing: 0.26, tintA: [1.0, 0.3, 0.0], tintB: [1.0, 0.82, 0.2] });
  }
  });
  // A project enquiry using the visitor's email app, with no simulated signup.
  (function contact() {
    const form = document.querySelector('footer .signup');
    if (!form) return;
    const input = form.querySelector('input');
    const feedback = document.createElement('p');
    feedback.className = 'form-feedback';
    feedback.id = 'contact-feedback';
    feedback.setAttribute('role', 'status');
    input.setAttribute('aria-describedby', feedback.id);
    form.after(feedback);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        input.setAttribute('aria-invalid', 'true');
        feedback.textContent = 'Enter a valid email address to start your enquiry.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      const email = document.querySelector('.contact .mail a').getAttribute('href');
      const body = `Hi Ahmed,\n\nI’d like to discuss a project.\n\nMy email: ${input.value.trim()}\nProject overview: \nTimeline: \n\nThanks!`;
      const href = `${email}?subject=${encodeURIComponent('New project enquiry')}&body=${encodeURIComponent(body)}`;
      feedback.replaceChildren('Continue in your email app, or ');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'open the email draft again';
      link.className = 'actionable';
      feedback.append(link, '.');
      link.click();
    });

    // Existing detail pages link to /#work and /#contact. Forward those hashes
    // into the authored document without adding another scrolling container.
    if (window.parent !== window) {
      const followHash = () => {
        const hash = window.parent.location.hash;
        const aliases = { '#about': '#top', '#people': '#contact', '#skills': '#showcase' };
        const target = aliases[hash] || hash;
        if (target) document.getElementById(target.slice(1))?.scrollIntoView();
      };
      window.parent.addEventListener('hashchange', followHash);
      window.addEventListener('load', followHash, { once: true });
      window.addEventListener('pagehide', () => window.parent.removeEventListener('hashchange', followHash), { once: true });
    }
  })();


  // ThreeUI <TerrainPlumeCanvas variant="sunset-drive" /> behind the footer copy.
  whenNear(document.querySelector('footer'), async () => {
    await import("/landing-pages/assets/terrain.034215713598.js");
  if (window.ThreeUITerrainPlume) {
    window.__plume = window.ThreeUITerrainPlume.mountTerrainPlume(document.getElementById('blog'), {
      variant: 'sunset-drive',
      speed: 1.00, size: 1.00, thickness: 1.00, strength: 1.00, softness: 0.00,
      opacity: 1.00, hue: 0, saturation: 1.00, brightness: 1.00,
    });
  }
  });

  // Scroll parallax on the marginalia: each drawing drifts at its own rate against
  // the copy. Gated on visibility and written only when the value actually moves,
  // since a transform write every scroll event is an easy way to lose frames.
  (function illParallax() {
    const els = [...document.querySelectorAll('.ill')];
    if (!els.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const SPEED = { 'ill-lantern': 0.20, 'ill-cat': -0.13, 'ill-joystick': 0.30, 'ill-crt': 0.14 };
    const items = els.map((el) => {
      const key = [...el.classList].find((c) => c.startsWith('ill-'));
      const it = { el, speed: SPEED[key] ?? 0.16, last: null, live: false };
      new IntersectionObserver(([e]) => { it.live = e.isIntersecting; }, { rootMargin: '25% 0px' }).observe(el);
      return it;
    });
    let queued = false;
    const frame = () => {
      queued = false;
      const mid = innerHeight / 2;
      for (const it of items) {
        if (!it.live) continue;
        const r = it.el.getBoundingClientRect();
        const v = Math.round(((r.top + r.height / 2) - mid) * it.speed * 10) / 10;
        if (v !== it.last) { it.last = v; it.el.style.transform = `translate3d(0,${v}px,0)`; }
      }
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
    addEventListener('resize', frame, { passive: true });
    frame();
  })();

  // Pin the menu to the sheet. The card reports its four projected corners, so a
  // projective transform from a flat reference box onto those corners puts real
  // anchors on the paper — they bend and turn with it and stay clickable.
  (function menuOnCard() {
    const links = document.querySelector('.menu-links');
    const menu = document.querySelector('.menu');
    if (!links || !menu) return;
    const W = 560, H = 790;
    // solve the 8 unknowns of a projective map from the reference box to the quad
    function homography(dst) {
      const src = [[0, 0], [W, 0], [W, H], [0, H]];
      const A = [], b = [];
      for (let i = 0; i < 4; i++) {
        const [x, y] = src[i], [X, Y] = dst[i];
        A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
        A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
      }
      for (let c = 0; c < 8; c++) {                       // gaussian elimination
        let piv = c;
        for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
        if (Math.abs(A[piv][c]) < 1e-9) return null;
        [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
        for (let r = 0; r < 8; r++) {
          if (r === c) continue;
          const f = A[r][c] / A[c][c];
          for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
          b[r] -= f * b[c];
        }
      }
      return b.map((v, i) => v / A[i][i]);
    }
    let raf = 0;
    const tick = () => {
      raf = 0;
      if (document.hidden || !menu.classList.contains('open')) return;
      raf = requestAnimationFrame(tick);
      const sheet = window.__sheet;
      if (!sheet) return;
      const q = sheet.state().quad;
      if (!q) return;
      // the reported quad is expanded 1.07x for hit testing; step back to the real face
      const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
      const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
      const face = q.map(([x, y]) => [cx + (x - cx) / 1.07, cy + (y - cy) / 1.07]);
      // A homography only holds while the face is toward us. Turn the sheet past
      // edge-on and the quad's winding inverts, which sent the card off as a stray
      // slab. The signed area tells us which way the face points: hide it once it
      // turns away, and fade it out as it goes edge-on rather than popping.
      let area = 0;
      for (let i = 0; i < 4; i++) {
        const [x1, y1] = face[i], [x2, y2] = face[(i + 1) % 4];
        area += x1 * y2 - x2 * y1;
      }
      area /= 2;
      if (area <= 0) { links.style.visibility = 'hidden'; return; }
      const faceOn = Math.min(1, Math.abs(area) / (W * H * 0.16));
      links.style.visibility = '';
      links.style.opacity = faceOn.toFixed(3);
      const h = homography(face);
      if (!h) return;
      const [a, bb, c, d, e, f, g, hh] = h;
      links.style.transform = `matrix3d(${a},${d},0,${g},${bb},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
      if (!links.classList.contains('on')) links.classList.add('on');
    };
    const syncProjection = () => {
      if (document.hidden || !menu.classList.contains('open')) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) raf = requestAnimationFrame(tick);
    };
    new MutationObserver(syncProjection).observe(menu, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncProjection);
    syncProjection();
    menu.addEventListener('transitionend', () => { if (!menu.classList.contains('open')) links.classList.remove('on'); });
  })();

  // Hover flashlight across the header, rAF-throttled so a fast pointer cannot
  // queue more style writes than there are frames to paint them.
  (function headlight() {
    const bar = document.querySelector('#topnav .pillbar');
    if (!bar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let px = 0, py = 0, queued = false;
    const apply = () => {
      queued = false;
      bar.style.setProperty('--mx', px.toFixed(1) + 'px');
      bar.style.setProperty('--my', py.toFixed(1) + 'px');
    };
    bar.addEventListener('pointermove', (e) => {
      const r = bar.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });
    bar.addEventListener('pointerenter', () => bar.style.setProperty('--lit', '1'));
    bar.addEventListener('pointerleave', () => bar.style.setProperty('--lit', '0'));
  })();

  // Hamburger menu
  (function burgerMenu() {
    const burger = document.querySelector('#topnav .burger');
    const menu = document.querySelector('.menu');
    if (!burger || !menu) return;
    const set = (open) => {
      if (open) {
        loadPaper();
        menu.hidden = false;
        requestAnimationFrame(() => {
          menu.classList.add('open');
          // the panel was display:none, so the paper measured 0x0 until now
          window.dispatchEvent(new Event('resize'));
        });
      } else {
        menu.classList.remove('open');
        setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 450);
      }
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      document.body.classList.toggle('menu-open', open);
    };
    menu.querySelector('.menu-close')?.addEventListener('click', () => set(false));
    burger.addEventListener('click', (e) => { e.stopPropagation(); set(!menu.classList.contains('open')); });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) set(false); });
  })();

  // Hairlines draw themselves in as they enter the viewport; the vertical container
  // lines unroll from the top once the page content is reached.
  (function lines() {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    document.querySelectorAll('[data-line]').forEach(el => io.observe(el));
    const vr = document.querySelector('.vrules');
    if (vr) { const vio = new IntersectionObserver((en) => { if (en[0].isIntersecting) { vr.classList.add('in'); vio.disconnect(); } }, { threshold: 0 }); vio.observe(document.querySelector('main')); }
  })();

  // Featured project 1: animated dotted wave (2D canvas)
  const cv = document.querySelector('.art-wave canvas');
  if (cv) {
    const ctx = cv.getContext('2d'); let w = 0, h = 0, t0 = performance.now();
    function size() { const r = cv.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); const nw = Math.round(r.width * d), nh = Math.round(r.height * d); if (nw !== w || nh !== h) { w = cv.width = nw; h = cv.height = nh; } }
    let waveVisible = false, waveRaf = 0;
    const waveActive = () => waveVisible && !document.hidden && !document.body.classList.contains('menu-open') && !document.body.classList.contains('machine');
    function syncWavePlayback() {
      if (!waveActive()) { cancelAnimationFrame(waveRaf); waveRaf = 0; }
      else if (!waveRaf) waveRaf = requestAnimationFrame(frame);
    }
    function frame(now) {
      waveRaf = 0;
      if (!waveActive()) return;
      if (w > 0 && h > 0) {
        const t = (now - t0) / 1000;
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
        const N = 90, M = 46; const f = w * 0.9;
        for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
          const u = (i / (N - 1) - 0.5) * 2.2, v = (j / (M - 1)) * 2.4 + 0.4;
          const y = Math.sin(u * 2.6 + t * 0.9) * 0.16 * Math.exp(-Math.abs(u) * 0.6) + Math.sin(v * 3.1 - t * 0.7) * 0.07 + Math.sin((u + v) * 1.7 + t * 0.5) * 0.05 - 0.22;
          const z = v + 0.35, sx = w / 2 + (u * f) / z, sy = h * 0.66 - ((y + 0.15) * f) / z;
          const a = Math.min(1, 1.6 / z) * (0.35 + 0.65 * (0.5 + y * 2));
          ctx.fillStyle = `rgba(230,230,230,${Math.max(0.05, a)})`; const s = Math.max(1, 2.2 * w / 1600 / z * 1.4); ctx.fillRect(sx, sy, s, s);
        }
      }
      waveRaf = requestAnimationFrame(frame);
    }
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(([entry]) => { waveVisible = entry.isIntersecting; syncWavePlayback(); }).observe(cv);
    new MutationObserver(syncWavePlayback).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', syncWavePlayback);
    size();
  }
})();

let lobbyPromise;
function loadLobby() {
  if (lobbyPromise || document.hidden || scrollY >= innerHeight) return;
  lobbyPromise = import("/landing-pages/assets/lobby.0070fa82a233.js").catch(error => {
    document.querySelector('#loader').classList.add('done');
    console.warn('Interactive lobby unavailable', error);
  });
}
// Two frames give the HTML, local fonts and preview a paint before scene setup.
requestAnimationFrame(() => requestAnimationFrame(loadLobby));
addEventListener('scroll', loadLobby, { passive: true });
document.addEventListener('visibilitychange', loadLobby);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('lobby-ready', () => import("/landing-pages/assets/vhs-overlay.88f332f8613f.js"), { once: true });
}
