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

The ThreeUI homepage preserves its authored animation and reduced-motion behavior. Its fonts load from Google Fonts; the lobby uses Three.js 0.160 and GLTFLoader from the original CDN paths, alongside the authored inlined media and runtimes. The older pages retain their self-hosted fonts and existing motion settings.

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
