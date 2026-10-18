import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { constants, createBrotliCompress, createGzip } from 'node:zlib';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../out');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
};

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function findFile(root, candidate) {
  if (!inside(root, candidate)) return null;
  try {
    const path = await realpath(candidate);
    if (!inside(root, path)) return null;
    return { path, info: await stat(path) };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function encodingFor(header = '') {
  const entries = new Map(header.toLowerCase().split(',').map((entry) => {
    const [name, ...parameters] = entry.trim().split(';');
    const quality = parameters.find((value) => value.trim().startsWith('q='));
    return [name, quality ? Number(quality.trim().slice(2)) : 1];
  }));
  const quality = (name) => entries.get(name) ?? entries.get('*') ?? 0;
  const br = quality('br');
  const gzip = quality('gzip');
  return br > 0 && br >= gzip ? 'br' : gzip > 0 ? 'gzip' : null;
}

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  const start = first ?? Math.max(0, size - last);
  const end = first === null || last === null ? size - 1 : Math.min(last, size - 1);
  return start < size && end >= start ? { start, end } : null;
}

function plainResponse(request, response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(message), 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : message);
}

/** Serve an existing Next.js static export without starting development tooling. */
export async function createStaticServer({ root = defaultRoot } = {}) {
  let exportRoot;
  try {
    exportRoot = await realpath(root);
    const index = await findFile(exportRoot, resolve(exportRoot, 'index.html'));
    if (!index?.info.isFile()) throw new Error('Missing index.html');
  } catch {
    throw new Error(`Production export missing in ${resolve(root)}. Run "npm run build" before "npm run preview".`);
  }

  return createServer((request, response) => {
    serve(request, response).catch((error) => {
      if (response.destroyed) return;
      if (response.headersSent) response.destroy(error);
      else plainResponse(request, response, 500, 'Unable to serve this file.');
    });
  });

  async function serve(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      return plainResponse(request, response, 405, 'Method not allowed.');
    }
    const rawPath = (request.url || '/').split('?')[0];
    let pathname;
    try { pathname = decodeURIComponent(rawPath); }
    catch { return plainResponse(request, response, 400, 'Malformed URL.'); }
    if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\x00-\x1f\\]/.test(pathname) || pathname.split('/').some((part) => part.startsWith('.'))) {
      return plainResponse(request, response, 400, 'Invalid path.');
    }

    let file = await findFile(exportRoot, resolve(exportRoot, `.${pathname}`));
    if (file?.info.isDirectory()) {
      const index = await findFile(exportRoot, resolve(file.path, 'index.html'));
      if (index?.info.isFile()) {
        if (!pathname.endsWith('/')) {
          const query = request.url.slice(rawPath.length);
          response.writeHead(308, { Location: `${rawPath}/${query}`, 'Cache-Control': 'no-cache', 'Content-Length': 0 });
          return response.end();
        }
        file = index;
      } else file = null;
    } else if (!file && !extname(pathname) && !pathname.endsWith('/')) {
      file = await findFile(exportRoot, resolve(exportRoot, `.${pathname}.html`));
    }

    let status = 200;
    if (!file?.info.isFile()) {
      status = 404;
      file = await findFile(exportRoot, resolve(exportRoot, '404.html'));
      if (!file?.info.isFile()) return plainResponse(request, response, 404, 'Page not found.');
    }

    const { path, info } = file;
    const type = mimeTypes[extname(path).toLowerCase()] || 'application/octet-stream';
    const compressible = /^(text\/|application\/(json|xml)|image\/svg\+xml)/.test(type);
    const encoding = !request.headers.range && compressible && info.size >= 1024 ? encodingFor(request.headers['accept-encoding']) : null;
    const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${encoding || 'identity'}"`;
    const immutable = status === 200 && extname(path) !== '.html' && (pathname.startsWith('/_next/static/') || /[.-][a-f0-9]{8,}(?:[.-]|$)/i.test(pathname));
    response.setHeader('Content-Type', type);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate');
    response.setHeader('Last-Modified', info.mtime.toUTCString());
    response.setHeader('ETag', etag);
    response.setHeader('Accept-Ranges', 'bytes');
    if (compressible) response.setHeader('Vary', 'Accept-Encoding');
    if (encoding) response.setHeader('Content-Encoding', encoding);
    if (status === 200 && request.headers['if-none-match']?.split(/,\s*/).some((value) => value === etag || value === '*')) {
      response.writeHead(304);
      return response.end();
    }

    let range;
    if (status === 200 && request.headers.range && (!request.headers['if-range'] || request.headers['if-range'] === info.mtime.toUTCString())) {
      range = byteRange(request.headers.range, info.size);
      if (!range) {
        response.setHeader('Content-Range', `bytes */${info.size}`);
        response.setHeader('Content-Length', 0);
        response.writeHead(416);
        return response.end();
      }
      status = 206;
      response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
    }
    if (!encoding) response.setHeader('Content-Length', range ? range.end - range.start + 1 : info.size);
    response.writeHead(status);
    if (request.method === 'HEAD') return response.end();
    const stream = createReadStream(path, range);
    if (encoding === 'br') await pipeline(stream, createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }), response);
    else if (encoding === 'gzip') await pipeline(stream, createGzip(), response);
    else await pipeline(stream, response);
  }
}

async function start() {
  let port = Number(process.env.PORT || 5173);
  let hostname = '127.0.0.1';
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === '--port' && args[index + 1]) port = Number(args[++index]);
    else if (option === '--hostname' && args[index + 1]) hostname = args[++index];
    else throw new Error(`Unknown or incomplete option: ${option}. Use --port <number> or --hostname <host>.`);
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer between 0 and 65535.');
  const server = await createStaticServer();
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, hostname, () => {
    const host = hostname.includes(':') ? `[${hostname}]` : hostname;
    console.log(`Production preview: http://${host}:${server.address().port} (serving out/)`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
