# Local Sublevel runtime dependencies

The JavaScript files and `LICENSE` are unmodified extracts from the published
`three@0.160.0` package. They are separate from the application's own Three.js
dependency. Keep the `examples/jsm` directory structure: `GLTFLoader.js` imports
`../utils/BufferGeometryUtils.js`, and both modules import the bare `three`
specifier.

The generated import map maps `three` to `build/three.module.min.js` under
`/landing-pages/runtime/`. The lobby imports the loader directly from the local
`examples/jsm/loaders/GLTFLoader.js` path.

`fonts.css` retains the Google Fonts definitions for Geist weights 400–700 and
Geist Mono weights 400, 600, and 700, with local URLs. The eleven WOFF2 files are
the exact Google Fonts responses; repeated weights share the same variable font
assets. Unicode ranges allow browsers to fetch only the needed subsets.

Font definitions were fetched using a modern Chrome user agent. Their original
URLs and SHA-256 digests are recorded in `sources.json`. The font licenses in
`fonts/LICENSE.txt` and `fonts/OFL.txt` were copied from the
[official Geist repository](https://github.com/vercel/geist-font).

`lobby-poster.webp` is a 960×600 capture of the authored, customized lobby canvas.
The generator publishes a content-hashed copy as the temporary scene preview.
