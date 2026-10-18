# Performance audit — 18 October 2026

The remaining cost is concentrated in the procedural WebGL hero. The page is already statically exported, card images are responsive and lazy loaded, detail routes do not prefetch large covers, and both video players use `preload="none"`. Removing unused package dependencies would not reduce the JavaScript actually loaded by this page.

## Findings and changes

| Finding | Change | Verification |
| --- | --- | --- |
| Two liquid-metal controls continued rendering up to 21 GPU passes each, at 30 FPS, while idle. | Paint a settled frame, then stop each control's scheduler. Hover, keyboard focus, press, ripples, resize and motion-preference changes wake it. The idle travelling rim is now still. | Execute the real generated frame function against a mock GPU; verify idle scheduling stops, interactions wake it and effects settle again. |
| Geometry tessellation and grass planting ran large synchronous loops. | Yield when an 8 ms task budget expires, using `scheduler.yield()` where available and a timer otherwise. | Compare generated geometry attributes to the archived synchronous recipe and verify both continuation paths. This is a cooperative budget, not a guarantee that every task finishes in 8 ms. |
| Butterfly noise texture was recalculated on every desktop visit. | Generate a lossless, content-hashed WebP during build; download it only for layouts that show the butterfly. Its download does not block the rest of the scene. | All 262,144 decoded RGBA bytes match the original procedural recipe; loader failure is covered. The new desktop-only asset is 107,282 bytes and can be cached. |
| Specular highlight measurements followed dock width/height changes in an active pointer frame. | Measure highlight targets before dock dimension writes. | Generated scripts parse and existing interaction/scheduler tests pass. Browser tracing remains necessary to quantify layout savings. |
| Almost-opaque card badges used a backdrop blur. | Remove the redundant backdrop filter. | Small visual change; no added JavaScript. |
| Development mode was the only documented local server. | Add `npm run preview`, serving the production export with compression, caching and video byte ranges. Preserve `dev` and the workspace's `start` alias. | HTTP tests cover compressed responses, conditional requests, navigation, errors and video seeking. |

The earlier optimizations remain: desktop grass density reduced from 250,000 to 125,000 blades, render pixel ratio capped at 1.25 on desktop and 1 on touch devices, desktop rendering capped at 60 FPS, and offscreen/hidden/covered heroes paused.

## Evidence and limits

The original butterfly texture calculation took **171, 150 and 147 ms** in three runs of a local Node benchmark of the archived function with a canvas-data stub. Those numbers isolate CPU work removed from browser startup; they are not browser timings or Lighthouse scores.

The initial inventory before this pass was approximately **143 KB gzip** of parent-page JavaScript and **207 KB gzip** of iframe JavaScript (including about 153 KB for the pinned Three.js engine). These are sums of gzip-compressed file sizes, not measured network transfers. Geometry and shader work matter in addition to download size. The video is about 7 MB but is not fetched eagerly; its MP4 metadata already supports fast startup.

There was no connected browser surface available for a fresh browser trace or visual comparison in this session. Tests validate scheduling, geometry, texture source pixels, asset integrity, serving behavior and the production build. They do not establish a measured FPS, LCP, INP or Lighthouse improvement. The prebuilt texture should receive a browser visual check because image/canvas decoding can differ slightly in alpha rounding.

## Reproduce production checks

```sh
npm run build
npm run test:performance
npm run test:preview
npm run preview -- --port 5174
```

Open `http://127.0.0.1:5174` rather than the development server. Use Chrome DevTools with cache disabled for a cold-load trace, then repeat with cache enabled. Record desktop and mobile traces with the hero idle, while hovering controls, while scrolling below the hero, and with the video popup open. Check reduced motion, keyboard controls, failed butterfly-image loading, anchor navigation and video seeking. Compare the same viewport, throttling and hardware when measuring before and after.
