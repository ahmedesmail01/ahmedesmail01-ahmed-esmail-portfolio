# ThreeUI Sublevel Studio source integration

This local `@designcodeio/threeui` package exposes the registered
`SublevelStudioLandingPage` component and its frame, using the canonical HTML
document at `/landing-pages/sublevel-studio.html`. It does not embed the ThreeUI
documentation site.

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
  The unused typography customization option and helper calls are omitted: the
  registered bundle does not contain `pageTypography`, and Sublevel never sets
  that option. The URL frame additionally permits user-activated top navigation
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

The MIT license is copied from the published `@designcodeio/threeui@1.2.0`
package. The registered source hashes above identify the actual implementation
used here; the local version is deliberately `0.0.0-vendored`.
