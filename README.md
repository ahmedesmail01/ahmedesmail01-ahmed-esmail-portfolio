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

On Vercel, `vercel.json` redirects the iframe's `/landing-pages/sublevel-studio.html` URL to `/landing-pages/sublevel-studio/`. The deployed static export serves the document at that clean URL; requesting the `.html` URL otherwise displays the application's 404 inside the iframe. Keep this rule when deploying to Vercel. Local development and other static hosts continue using the original HTML path. Push configuration changes and redeploy for the rule to take effect.

## Edit content

- `app/page.tsx` uses the exact-source ThreeUI `SublevelStudioLandingPage`, customized for Ahmed. The previous homepage is preserved as `LegacyHomePage` in `components/home/legacy-home-page.tsx`.
- `scripts/build-sublevel.mjs` contains homepage copy and maps the shared content into the original project/service cells. `scripts/sublevel-runtime-content.mjs` customizes the 3D canvas labels and terminal index. Run `pnpm build:sublevel` after editing; `pnpm dev` and `pnpm build` also regenerate the page automatically.
- `vendor/threeui/upstream/` archives all four verified source files. See `vendor/threeui/README.md` for hashes and the small frame adaptations. Do not edit the generated `public/landing-pages/sublevel-studio.html` directly.
- `lib/content.ts`: profile links, projects, skills, services and article content.
- `components/video-project-card.tsx`: reusable `VideoProjectCard` and `ProjectVideo` components. Project props include title, description, techStack, loomVideoId, liveLink and githubLink, plus slug, image, category and color for presentation.
- Set `loomVideoId` to a real Loom ID or a supported HTTPS Loom / YouTube embed / Vimeo player URL. The iframe mounts only after Play, uses `loading="lazy"`, and reserves its aspect ratio. There are no third-party video requests on the initial page load.
- Add real `liveLink` and `githubLink` URLs to individual project records. Missing links are omitted.
- All 4 project detail routes and 3 article routes are statically generated; rebuild after adding records.

## Content status

The supplied profile is the source for experience and contact information. KeyBuilds, Sky Events and Job Elite are explicitly marked sample case studies as requested. Fittra is grounded in the profile. All covers are illustrative and are not actual application screenshots. No performance metrics, testimonials, client outcomes or project URLs were invented. Journal posts are starter editorial content to review before public use.

The new homepage enquiry form validates an email address and opens a populated email draft, with an accessible validation message and fallback email link. The preserved legacy form uses React Hook Form and Zod. Visitors must send the draft in their email client; neither form claims server delivery or stores inquiries. Static export currently has no server runtime.

The ThreeUI homepage retains its authored scene and interactions, with local fonts and pinned Three.js 0.160 dependencies. The older pages retain their self-hosted fonts and existing motion settings.

## Homepage performance

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

Next.js production export and TypeScript checks pass. The new homepage was checked in Chrome at desktop and mobile sizes: lobby rendering, arcade play, basketball shooting, CRT browsing, terminal open/close, animated menu navigation, email validation and draft construction, project navigation, and the existing `/#contact` deep link. Changed files pass ESLint; the full lint run still reports pre-existing errors in the older portfolio files. No Lighthouse score is claimed.
