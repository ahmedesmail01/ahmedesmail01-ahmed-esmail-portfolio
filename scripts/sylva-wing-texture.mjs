import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import sharp from 'sharp';

/** Evaluate the archived pixel recipe at build time, without a browser canvas. */
export function renderSylvaWingTexturePixels(html) {
  const startMarker = '  function wingTexture() {';
  const endMarker = '\n  function wingMaterial(';
  assert.equal(html.split(startMarker).length, 2, 'Expected one archived butterfly texture recipe');
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(end > start, 'Expected the end of the archived butterfly texture recipe');

  let pixels;
  const canvas = {
    width: 0,
    height: 0,
    getContext(kind) {
      assert.equal(kind, '2d');
      return {
        createImageData(width, height) {
          return { data: new Uint8ClampedArray(width * height * 4) };
        },
        putImageData(image) { pixels = Buffer.from(image.data); },
      };
    },
  };
  vm.runInNewContext(`(function (document, THREE, Math) {\n${html.slice(start, end)}\nwingTexture();\n})(document, THREE, Math);`, {
    // Bind native math locally instead of resolving cross-context globals in
    // millions of noise calculations. The verified recipe remains unchanged.
    Math,
    document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } },
    THREE: { CanvasTexture: class {}, ClampToEdgeWrapping: 1001 },
  }, { timeout: 10000 });
  assert.ok(pixels && pixels.length === canvas.width * canvas.height * 4, 'Expected complete RGBA texture pixels');
  return { data: pixels, width: canvas.width, height: canvas.height };
}

/** Publish a cacheable, lossless copy of the original procedural texture. */
export async function buildSylvaWingTexture(html, root) {
  const { data, width, height } = renderSylvaWingTexturePixels(html);
  // Every channel, including alpha, is shader data. Lossy encoding would alter
  // the butterfly's pattern and shimmer even when the picture looked similar.
  const encoded = await sharp(data, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true, effort: 6 }).toBuffer();
  const digest = createHash('sha256').update(encoded).digest('hex').slice(0, 12);
  const filename = `sylva-wing.${digest}.webp`;
  const directory = new URL('public/landing-pages/assets/', root);
  await mkdir(directory, { recursive: true });
  const destination = new URL(filename, directory);
  try { await access(destination); }
  catch { await writeFile(destination, encoded); }
  // This generator owns only this prefix; the hero and preserved Sublevel
  // generators share the remaining content-hashed asset directory.
  for (const previous of await readdir(directory)) {
    if ((previous.startsWith('sylva-wing.') || previous.startsWith('butterfly-wing.')) && previous.endsWith('.webp') && previous !== filename) {
      await rm(new URL(previous, directory));
    }
  }
  return `/landing-pages/assets/${filename}`;
}
