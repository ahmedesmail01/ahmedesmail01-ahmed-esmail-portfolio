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

- `lib/content.ts`: profile links, projects, skills, services and article content.
- `components/video-project-card.tsx`: reusable `VideoProjectCard` and `ProjectVideo` components. Project props include title, description, techStack, loomVideoId, liveLink and githubLink, plus slug, image, category and color for presentation.
- Set `loomVideoId` to a real Loom ID or a supported HTTPS Loom / YouTube embed / Vimeo player URL. The iframe mounts only after Play, uses `loading="lazy"`, and reserves its aspect ratio. There are no third-party video requests on the initial page load.
- Add real `liveLink` and `githubLink` URLs to individual project records. Missing links are omitted.
- All 4 project detail routes and 3 article routes are statically generated; rebuild after adding records.

## Content status

The supplied profile is the source for experience and contact information. KeyBuilds, Sky Events and Job Elite are explicitly marked sample case studies as requested. Fittra is grounded in the profile. All covers are illustrative and are not actual application screenshots. No performance metrics, testimonials, client outcomes or project URLs were invented. Journal posts are starter editorial content to review before public use.

The form validates using React Hook Form and Zod, then opens a populated email draft. Visitors must send it in their email client. It does not claim server delivery or store inquiries. To support direct delivery, add an authenticated server-side email provider endpoint and replace the mailto handler; do not expose provider secrets in browser code. Static export currently has no server runtime.

Reduced-motion settings disable GSAP parallax, reveal movement and marquee animation. Custom fonts are self-hosted. Images reserve dimensions and below-fold media is lazy loaded.

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

Next.js production export and TypeScript checks pass. Project navigation and image loading were inspected in the preview. The preview did not reliably hydrate the contact interaction, so end-to-end client validation was not confirmed there. Native required, email and length constraints supplement the React Hook Form / Zod validation. No Lighthouse score is claimed.
