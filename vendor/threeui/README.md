# ThreeUI exact-source integrations

This local `@designcodeio/threeui` package exposes the registered
`SylvaHero` (Living Green) and `SublevelStudioLandingPage` components and their
shared frame. They use locally served, customized canonical HTML documents;
neither embeds the ThreeUI documentation site.

The source bundle was retrieved from
<https://threeui.com/source-code/sublevel-studio-landing-page.json>. The complete,
unmodified registered files are archived in `upstream/`; TypeScript and CSS use
`.txt` suffixes so the unused catalog does not enter the application build.

| Registered file | SHA-256 |
| --- | --- |
| `src/shaders/landing-pages/LandingPages.tsx` | `4d379461ad00eb4de7900df312878035383de7e1ed4e13283b8143a2eea9d30a` |
| `src/shaders/landing-pages/LandingPageFrame.tsx` | `61de2cc50888aac4ac5557420b07fa47ed3543bb57c1e0055fafdefa53dbaa78` |
| `public/landing-pages/sublevel-studio.html` | `91db5c1bb779687990b01f226a02d7fe7cf7954a40ba8053c4d6b7abf82232e3` |
| `src/shaders/threeui.css` | `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf` |

Integration changes:

- `index.tsx` extracts the authored Sublevel export, adds the Next.js client
  boundary, and changes its accessible frame title to Ahmed Esmail.
- `LandingPageFrame.tsx` preserves the authored frame and presentation behavior.
  The registered typography customization wiring is restored for Sylva.
  The URL frame additionally permits user-activated top navigation
  and popups that leave the sandbox so project links and email actions work.
  The original `srcDoc` sandbox remains unchanged.
- `style.css` contains the applicable `.threeui-background` rules from the shared
  stylesheet. Unrelated catalog styles and their unused font dependency are
  excluded.
- `scripts/build-sublevel.mjs` generates the public document from the archived
  HTML with Ahmed's business content and links. The archive remains unchanged.
- `scripts/sublevel-performance-runtime.mjs` derives visibility-aware playback,
  lower touch-device pixel ratios, and cached particle calculations from that
  source. `scripts/sublevel-assets.mjs` separates styles, scripts, images, and
  binary models into cacheable files, loads optional effects on demand, and
  shows a scene capture while the interactive lobby initializes. The local
  dependencies and their provenance are in `runtime/`. The menu retains its
  authored r149 engine; the lobby retains Three.js 0.160.0.

## Sylva — Living Green

The complete bundle was retrieved from
<https://threeui.com/source-code/sylva-hero.json> for requested revision
`05f359ce157a`. `sylva-source.json` records every registered file and binary hash.
Shared catalog, frame, and stylesheet hashes match the archive above.

| Additional registered file | SHA-256 |
| --- | --- |
| `pageTypography.ts` | `809cc65797d531cd3b3ca5a56815d55d24b3ee8d293e4e4bad6fdfe6c83244cc` |
| `pageRecipes.ts` | `c9d9849cc255bac2d1d938d088c50917f84916f1c516d2bbb27fcfd803523233` |
| `inner-green-3d.html` | `69c3694bd63f44ef9f007ebe4dac57a83e4402e0cdf6b54dd10b96dd4f05e197` |
| `inner-green-assets/three.min.js` | `8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271` |

`index.tsx` extracts the selected Living Green execution path of `SylvaHero`;
other catalog variants are not exported. `pageRecipes.ts` contains the exact
Sylva recipe and its helpers. `pageTypography.ts` retains the complete registered
implementation, with two `head.append` calls changed to equivalent `appendChild`
calls to avoid this project's Cloudflare/DOM type collision. The unmodified
typography and recipe sources remain in `upstream/`.

`scripts/build-sylva.mjs` starts from the verified canonical HTML, changes business
copy and destinations, and appends the application's native dialog panels. Every
authored script and stylesheet is asserted unchanged. A base URL makes the original
relative assets work with Vercel's clean URL redirect. The two photographs, local
Three runtime, and Lexend WOFF2 in `public/landing-pages/inner-green-assets/` are
verified byte-for-byte on every generation.

The MIT license is copied from the published `@designcodeio/threeui@1.2.0`
package. The registered source hashes above identify the actual implementation
used here; the local version is deliberately `0.0.0-vendored`.
