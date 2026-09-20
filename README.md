# Ahmed Esmail — Portfolio

A Next.js App Router portfolio using TypeScript, Tailwind CSS, Shadcn UI, Lucide, Framer Motion, GSAP, React Hook Form and Zod. Static export for inexpensive hosting, with click-to-load video embeds.

## Run on Windows, macOS or Linux

Install Node.js 22.13+ and pnpm 11.25.0. In PowerShell or your terminal:

```text
npm install -g pnpm@11.25.0
pnpm install
pnpm dev
```

Open http://localhost:5173. Use `pnpm build` to generate the deployable `out` directory. Scripts use Node.js and work in Windows PowerShell without Bash, Unix environment assignments or shell utilities. Any unused inherited infrastructure helpers are not required for the Next.js workflow.

On Vercel, `vercel.json` redirects the Sylva and preserved Sublevel iframe HTML URLs to their clean, trailing-slash URLs. Keep these rules when deploying to Vercel to avoid a 404 inside the iframe. Sylva's generated document includes a `/landing-pages/` base URL so its original relative asset paths work after the redirect. Local development and other static hosts continue using the original HTML paths. Push configuration changes and redeploy for the rules to take effect.

## Edit content

- `app/page.tsx` includes the exact-source ThreeUI `SylvaHero`, Living Green, followed by work, services, about, toolkit, process, journal, FAQ, and contact sections. `components/sylva/` contains the shared olive/cream design, navigation, cards, email form, and footer used by every route. Most content is server-rendered; the FAQ uses native disclosure controls and images below the hero load lazily.
- Previous homepage versions remain in `components/home/legacy-home-page.tsx`, `sublevel-home-page.tsx`, and `sylva-hero-home-page.tsx` (the hero-only version). Previous blog index, article, project detail, services, and 404 pages are archived in `components/legacy/pages/`; its README maps each component to its original route.
- `scripts/build-sylva.mjs` customizes hero copy and verifies the original source and binary asset hashes. `scripts/sylva-business.js` connects hero controls to real homepage sections; standalone template use retains the accessible work, about, and contact dialogs. Run `pnpm build:sylva` after editing. Authored scene scripts and styles are asserted unchanged.
- `scripts/build-sublevel.mjs` and `scripts/sublevel-runtime-content.mjs` retain the old template's content generation. `pnpm dev` and `pnpm build` regenerate both templates automatically.
- `vendor/threeui/upstream/` archives the verified registered source files. See `vendor/threeui/README.md` for hashes and frame adaptations. Do not edit the generated `public/landing-pages/inner-green-3d.html` or `sublevel-studio.html` directly.
- `lib/content.ts`: profile links, projects, skills, services and article content.
- `components/video-project-card.tsx`: reusable `VideoProjectCard` and `ProjectVideo` components. Project props include title, description, techStack, loomVideoId, liveLink and githubLink, plus slug, image, category and color for presentation.
- Set `loomVideoId` to a real Loom ID or a supported HTTPS Loom / YouTube embed / Vimeo player URL. The iframe mounts only after Play, uses `loading="lazy"`, and reserves its aspect ratio. There are no third-party video requests on the initial page load.
- Add real `liveLink` and `githubLink` URLs to individual project records. Missing links are omitted.
- All 4 project detail routes and 3 article routes are statically generated; rebuild after adding records.

## Content status

The supplied profile is the source for experience and contact information. KeyBuilds, Sky Events and Job Elite are explicitly marked sample case studies as requested. Fittra is grounded in the profile. All covers are illustrative and are not actual application screenshots. No performance metrics, testimonials, client outcomes or project URLs were invented. Journal posts are starter editorial content to review before public use.

The contact section includes Ahmed's email, GitHub, LinkedIn, and a form that prepares an email draft with native field validation. The visitor reviews and sends the draft in their email client; the site does not claim to deliver a message. Sylva's play-shaped control opens the Fittra case study. The preserved standalone hero keeps its contact dialog; older homepages keep their original forms. Static export has no server runtime or inquiry storage.

Sylva retains the authored moss, flowers, ferns, pollen, butterfly, liquid-metal controls, and responsive behavior. Its local Three.js runtime, Lexend font, and two atmospheric nature photographs are copied byte-for-byte from the registered source. The photographs illustrate the theme; they are not project screenshots. The author's narrow-screen layout intentionally omits the butterfly. Sublevel retains its pinned Three.js 0.160 dependencies; older pages retain their own motion settings.

## Preserved Sublevel performance

The generator splits the former 2.46 MB inline document into approximately 30 KB of HTML and separate cacheable assets. A small preview captured from the actual scene appears while the interactive lobby initializes. Models load as binary GLB files; below-the-fold images load lazily with their dimensions reserved.

`scripts/sublevel-assets.mjs` handles asset extraction and loading. The paper menu and its original engine load on first open, the terminal loads on demand, and particles and footer effects load near their sections. No third-party font or engine requests are needed. `vendor/threeui/runtime/` holds the pinned dependencies and licenses; builds work without fetching them again.

`scripts/sublevel-performance-runtime.mjs` pauses render loops when hidden, offscreen, or covered by the menu, caches particle row lookups, and lets settled particles stop rendering. Touch devices use lower canvas pixel ratios. Reduced-motion visitors skip the particle and VHS overlays. The verified upstream archive remains untouched; source replacements assert their anchors when generating the optimized runtime.

`public/_headers` enables long-lived caching for content-hashed assets on hosts that support that file, including Cloudflare Pages and Netlify. Other hosts need equivalent cache rules and gzip/Brotli configured in their hosting settings. Deploy the complete `out` directory after `pnpm build`.

Local production spot checks used cold Chrome contexts, an uncompressed localhost server, desktop 1440×900/DPR 1 and mobile emulation 390×844/DPR 2. These are individual measurements, not a Lighthouse score or a prediction for every device:

| Metric | Desktop before → after | Mobile before → after |
| --- | --- | --- |
| Landing document first contentful paint | 1,840 → 388 ms | 2,940 → 248 ms |
| Total transfer including a footer visit | 3.74 → 3.32 MB | 3.74 → 3.06 MB |
| Third-party requests | 8 → 0 | 8 → 0 |
| Main-thread work over 2.5 seconds after leaving the lobby | 816 → 292 ms | 1,258 → 455 ms |

The HTML reduction comes from extracting assets; it does not mean the entire application is 99% smaller. Full 3D startup remained variable in headless Chrome: desktop 12.3 → 14.0 seconds, mobile 19.1 → 3.2 seconds. The preview and DOM controls are available before the scene finishes initializing.

## Service research and scope

Offers reflect Ahmed's supplied skill set. ERP is positioned as focused modules and integration work, not an unsupported claim of complete enterprise ERP implementation. Supporting product references:
- https://stripe.com/payments — online payment integrations.
- https://www.oracle.com/apex/ — database-backed business applications and reporting.

## Asset sources

Hero sculpture: https://www.lummi.ai/3d/iridescent-3d-sculpture-froya
Keyboard: https://images.unsplash.com/photo-1672211775632-bcb4b68eb2bd
Workspace: https://unsplash.com/photos/a-computer-monitor-sitting-on-top-of-a-wooden-desk-WOgCbmxdbg4
Event venue: https://www.tauberphilharmonie.de/mieten
Learning photograph (Kelly Sikkema): https://www.theroompsy.com/psychology-psychology-society/how-do-i-study-the-effects-of-spaced-out-learning-vs-cramming-on-academic-achievements

Images are concept covers; confirm third-party usage rights or replace them with owned project captures before public commercial launch.

## Verification

Next.js production export and TypeScript checks pass. The expanded site was checked in Chrome at 1440px, 390px, and 320px widths: rendered hero, section navigation and focus, contact deep links, FAQ disclosures, all project/article routes, and article contents links. Mobile menu selection, Escape/focus return, contact validation, populated email drafts, and fallback links also passed; email app launches were intercepted during testing. The mobile hero fits its frame without a nested vertical scroll. A local server emulated the Vercel redirects; route checks found no horizontal overflow, failed requests, or JavaScript errors. Standalone hero dialogs were also checked with a parent-frame fixture. Every generation verifies the source and binary hashes and preserves all authored script/style blocks. Changed files pass ESLint; previously recorded lint errors in older portfolio files remain outside this change. No Lighthouse score is claimed.
