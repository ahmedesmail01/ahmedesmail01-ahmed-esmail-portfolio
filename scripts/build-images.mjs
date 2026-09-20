import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { posts, projects } from '../lib/content.ts';

const root = new URL('../', import.meta.url);
const outputDirectory = new URL('public/images/responsive/', root);
const manifestPath = new URL('lib/generated/responsive-images.json', root);
const widths = [384, 640, 768, 1024, 1280];
const options = { quality: 82, effort: 5 };
const sources = [...new Set([
  ...projects.map(({ image }) => image),
  ...posts.map(({ image }) => image),
  '/landing-pages/inner-green-assets/card-ethos.jpg',
  '/landing-pages/inner-green-assets/card-ecostove.jpg',
])].sort();

await mkdir(outputDirectory, { recursive: true });
await mkdir(new URL('lib/generated/', root), { recursive: true });

const manifest = {};
const expectedFiles = new Set();
let generated = 0;

for (const src of sources) {
  if (!src.startsWith('/') || src.includes('..')) {
    throw new Error(`Responsive image sources must be local public assets: ${src}`);
  }
  const input = await readFile(new URL(`public${src}`, root));
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) {
    throw new Error(`Expected a single image with intrinsic dimensions: ${src}`);
  }
  // autoOrient also normalizes any camera orientation before deriving dimensions.
  const { width, height } = metadata.autoOrient ?? metadata;
  const maximumWidth = Math.min(width, 1600);
  const outputWidths = [...new Set([...widths.filter((size) => size < maximumWidth), maximumWidth])];
  const hash = createHash('sha256')
    .update(src)
    .update(input)
    .update(JSON.stringify({ options, versions: sharp.versions, maximumWidth }))
    .digest('hex').slice(0, 12);
  const name = basename(src, extname(src));
  const variants = [];

  for (const outputWidth of outputWidths) {
    const filename = `${name}-${hash}-${outputWidth}.webp`;
    expectedFiles.add(filename);
    const outputPath = new URL(filename, outputDirectory);
    try {
      await access(outputPath);
    } catch {
      await sharp(input).autoOrient().resize({ width: outputWidth, withoutEnlargement: true })
        .webp(options).toFile(fileURLToPath(outputPath));
      generated += 1;
    }
    variants.push({ width: outputWidth, src: `/images/responsive/${filename}` });
  }

  manifest[src] = {
    width,
    height,
    src: (variants.find((variant) => variant.width >= 768) ?? variants.at(-1)).src,
    variants,
  };
}

// Only this generated directory is pruned when source images or settings change.
for (const filename of await readdir(outputDirectory)) {
  if (!expectedFiles.has(filename) && filename.endsWith('.webp')) {
    await unlink(new URL(filename, outputDirectory));
  }
}

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
const previous = await readFile(manifestPath, 'utf8').catch(() => '');
if (previous !== serialized) await writeFile(manifestPath, serialized);
console.log(`Responsive images: ${sources.length} sources, ${expectedFiles.size} variants (${generated} generated).`);
