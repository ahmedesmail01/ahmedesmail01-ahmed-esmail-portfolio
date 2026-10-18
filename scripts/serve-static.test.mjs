import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { createStaticServer } from './serve-static.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-preview-'));
  const root = join(directory, 'out');
  await mkdir(join(root, 'work'), { recursive: true });
  await mkdir(join(root, '_next', 'static'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Portfolio</title>'.repeat(100));
  await writeFile(join(root, 'work', 'index.html'), '<title>Work</title>');
  await writeFile(join(root, '404.html'), '<title>Not found</title>');
  await writeFile(join(root, 'flat.html'), '<title>Flat</title>');
  await writeFile(join(root, 'movie.mp4'), Buffer.from('0123456789'));
  await writeFile(join(root, '_next', 'static', 'app-abc123.js'), 'console.log("loaded");'.repeat(200));
  await writeFile(join(root, 'portrait-abc123456789-640.webp'), 'image');
  await writeFile(join(directory, 'secret.txt'), 'private');
  await writeFile(join(root, '.env'), 'secret');
  await symlink(join(directory, 'secret.txt'), join(root, 'escape.txt'));
  const server = await createStaticServer({ root });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return (path = '/', options = {}) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path, agent: false, ...options }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('production preview serves HTML routes, safe redirects, HEAD and real 404s', async (t) => {
  const get = await fixture(t);
  const home = await get();
  assert.equal(home.status, 200);
  assert.equal(home.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(home.headers['cache-control'], 'public, max-age=0, must-revalidate');
  const redirect = await get('/work?source=home');
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.location, '/work/?source=home');
  assert.equal((await get('/work/')).body.toString(), '<title>Work</title>');
  assert.equal((await get('/flat')).body.toString(), '<title>Flat</title>');
  const head = await get('/', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], home.headers['content-length']);
  const missing = await get('/missing');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.toString(), '<title>Not found</title>');
  const post = await get('/', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});

test('text compression negotiates encoding and preserves conditional cache headers', async (t) => {
  const get = await fixture(t);
  const raw = await get('/');
  for (const [encoding, decompress] of [['br', brotliDecompressSync], ['gzip', gunzipSync]]) {
    const compressed = await get('/', { headers: { 'Accept-Encoding': encoding } });
    assert.equal(compressed.headers['content-encoding'], encoding);
    assert.equal(compressed.headers.vary, 'Accept-Encoding');
    assert.ok(compressed.body.length < raw.body.length);
    assert.deepEqual(decompress(compressed.body), raw.body);
    const cached = await get('/', { headers: { 'Accept-Encoding': encoding, 'If-None-Match': compressed.headers.etag } });
    assert.equal(cached.status, 304);
    assert.equal(cached.body.length, 0);
  }
  assert.equal((await get('/', { headers: { 'Accept-Encoding': 'br;q=0, gzip;q=0' } })).headers['content-encoding'], undefined);
  assert.equal((await get('/', { headers: { 'Accept-Encoding': 'br;q=0.3, gzip;q=1' } })).headers['content-encoding'], 'gzip');
  assert.match((await get('/_next/static/app-abc123.js')).headers['cache-control'], /immutable/);
  assert.match((await get('/portrait-abc123456789-640.webp')).headers['cache-control'], /immutable/);
});

test('video supports full, partial, suffix and open byte ranges without compression', async (t) => {
  const get = await fixture(t);
  const full = await get('/movie.mp4');
  assert.equal(full.headers['content-type'], 'video/mp4');
  assert.equal(full.headers['accept-ranges'], 'bytes');
  for (const [range, expected, contentRange] of [['bytes=2-5', '2345', 'bytes 2-5/10'], ['bytes=6-', '6789', 'bytes 6-9/10'], ['bytes=-3', '789', 'bytes 7-9/10'], ['bytes=8-999', '89', 'bytes 8-9/10']]) {
    const partial = await get('/movie.mp4', { headers: { Range: range, 'Accept-Encoding': 'br,gzip' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers['content-range'], contentRange);
    assert.equal(partial.headers['content-encoding'], undefined);
    assert.equal(partial.body.toString(), expected);
  }
  const head = await get('/movie.mp4', { method: 'HEAD', headers: { Range: 'bytes=1-3' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers['content-length'], '3');
  assert.equal(head.body.length, 0);
  for (const range of ['bytes=10-', 'bytes=4-1', 'bytes=-0', 'bytes=0-1,4-5', 'nonsense']) {
    const invalid = await get('/movie.mp4', { headers: { Range: range } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers['content-range'], 'bytes */10');
  }
  const stale = await get('/movie.mp4', { headers: { Range: 'bytes=1-3', 'If-Range': 'Wed, 01 Jan 2020 00:00:00 GMT' } });
  assert.equal(stale.status, 200);
  assert.equal(stale.body.toString(), '0123456789');
});

test('encoded traversal, hidden files, malformed URLs and escaping symlinks never expose files', async (t) => {
  const get = await fixture(t);
  for (const path of ['/../secret.txt', '/%2e%2e/secret.txt', '/%2e%2e%2fsecret.txt', '/..%5csecret.txt', '/.env', '/%00', '/%', '//example.com/work']) {
    const result = await get(path);
    assert.equal(result.status, 400, path);
    assert.ok(!result.body.toString().includes('private'), path);
  }
  assert.equal((await get('/escape.txt')).status, 404);
});

test('missing export explains the required production build', async () => {
  await assert.rejects(createStaticServer({ root: join(tmpdir(), 'portfolio-preview-no-such-output') }), /Run "npm run build" before "npm run preview"/);
});
