// Plain file server for preview/CI: no ASP.NET process or API fallback.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const arg = (key, fallback) => {
  const i = process.argv.indexOf('--' + key);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const root = resolve(arg('dir', 'dist/pages'));
const base = arg('base', '/PedroOS').replace(/\/+$/, '');
const port = Number(arg('port', '5170'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.cur': 'image/x-icon', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.pdf': 'application/pdf', '.zip': 'application/zip', '.gz': 'application/gzip',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const server = createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  if (base && path === base) { res.writeHead(302, { Location: base + '/' }).end(); return; }
  if (base && !path.startsWith(base + '/')) { res.writeHead(404).end(); return; }
  let file = resolve(root, '.' + (path.slice(base.length) || '/'));
  const rel = relative(root, file);
  if (rel.startsWith('..') || rel.includes(':')) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  let status = 200;
  if (!existsSync(file) || !statSync(file).isFile()) { file = join(root, '404.html'); status = 404; }
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  const size = statSync(file).size;
  const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Content-Length': size, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  let start = 0, end = size - 1;
  if (req.headers.range && status === 200) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
    start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    headers['Content-Length'] = end - start + 1;
    status = 206;
  }
  res.writeHead(status, headers);
  if (req.method === 'HEAD') res.end();
  else createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`Static PedroOS: http://127.0.0.1:${port}${base}/`));
