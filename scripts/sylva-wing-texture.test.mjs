import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import sharp from 'sharp';
import { optimizeSylvaRuntime, splitSylvaAssets } from './sylva-performance-runtime.mjs';
import { splitAssets } from './sublevel-assets.mjs';
import { optimizeRuntime } from './sublevel-performance-runtime.mjs';
import { buildSylvaWingTexture, renderSylvaWingTexturePixels } from './sylva-wing-texture.mjs';

test('the prebuilt wing texture preserves all four original noise channels exactly', async () => {
  const source = await readFile(new URL('../vendor/threeui/upstream/inner-green-3d.html', import.meta.url), 'utf8');
  const { data, width, height } = renderSylvaWingTexturePixels(source);
  assert.equal(width, 256);
  assert.equal(height, 256);
  assert.equal(createHash('sha256').update(data).digest('hex'), 'e3ff3d025f5d56d860da8a6c9a682d44997262f2102d2b9fce6b846f63001676');

  const directory = await mkdtemp(join(tmpdir(), 'sylva-wing-texture-'));
  try {
    const root = pathToFileURL(`${directory}/`);
    const src = await buildSylvaWingTexture(source, root);
    const encoded = await readFile(new URL(`public${src}`, root));
    const decoded = await sharp(encoded).raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.channels, 4, 'Alpha is shader data and must not be discarded');
    assert.deepEqual(decoded.data, data, 'Lossless decoding must reproduce every original pixel');
    assert.ok(encoded.length < 120000, 'Baking should keep the new image transfer smaller than a raw RGBA texture');
    assert.match(src, new RegExp(`/sylva-wing\\.${createHash('sha256').update(encoded).digest('hex').slice(0, 12)}\\.webp$`));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the runtime waits for decoded wing data and a failed image does not block the hero', async () => {
  const source = await readFile(new URL('../vendor/threeui/upstream/inner-green-3d.html', import.meta.url), 'utf8');
  const url = '/landing-pages/assets/sylva-wing.test.webp';
  const optimized = optimizeSylvaRuntime(source, { wingTextureUrl: url });
  const start = optimized.indexOf('  function wingTexture() {');
  const end = optimized.indexOf('\n  function wingMaterial(', start);
  let load;
  const loadTexture = vm.runInNewContext(`${optimized.slice(start, end)}\nwingTexture;`, {
    THREE: {
      ClampToEdgeWrapping: 1001,
      TextureLoader: class {
        load(src, success, progress, error) { load = { src, success, error }; }
      },
    },
  });
  const pending = loadTexture();
  assert.equal(load.src, url);
  const texture = {};
  load.success(texture);
  assert.equal(await pending, texture);
  assert.equal(texture.flipY, false, 'Keep the original procedural texture orientation');
  assert.equal(texture.premultiplyAlpha, false, 'Keep the independent alpha noise channel');
  assert.equal(texture.wrapS, 1001);
  assert.equal(texture.wrapT, 1001);
  const failed = loadTexture();
  load.error();
  assert.equal(await failed, null, 'An unavailable wing asset must let the hero render without the butterfly');
});

test('rebuilding either scene preserves the baked texture in their shared asset directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sylva-shared-assets-'));
  try {
    const root = pathToFileURL(`${directory}/`);
    const assets = new URL('public/landing-pages/assets/', root);
    await mkdir(assets, { recursive: true });
    const texture = new URL('sylva-wing.keep.webp', assets);
    const sentinel = Buffer.from('wing texture owned by the texture generator');
    await writeFile(texture, sentinel);
    // The Sublevel generator copies its local engine and scene poster.
    await cp(new URL('../vendor/threeui/runtime/', import.meta.url), new URL('vendor/threeui/runtime/', root), { recursive: true });
    const sublevel = await readFile(new URL('../vendor/threeui/upstream/sublevel-studio.html', import.meta.url), 'utf8');
    await splitAssets(optimizeRuntime(sublevel), root);
    assert.deepEqual(await readFile(texture), sentinel, 'Sublevel rebuild must preserve Sylva texture files');

    const generated = new URL('lib/generated/', root);
    await mkdir(generated, { recursive: true });
    await cp(new URL('../lib/generated/responsive-images.json', import.meta.url), new URL('responsive-images.json', generated));
    const sylva = await readFile(new URL('../vendor/threeui/upstream/inner-green-3d.html', import.meta.url), 'utf8');
    await splitSylvaAssets(sylva, root);
    assert.deepEqual(await readFile(texture), sentinel, 'The runtime generator must leave texture pruning to its owner');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
