// PedroOS 95 — static export for GitHub Pages.
//
// Starts the ASP.NET Core app, crawls every public route and window fragment, and
// writes a fully static site (HTML + assets) that behaves like the server version.
//
// Usage: node scripts/export-static.mjs [--base /PedroOS] [--site https://user.github.io] [--out dist/pages]
// Requires the frontend bundle (npm run build) and a built .NET project (dotnet build -c Release).
import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webProject = join(root, 'src', 'PedroOS.Web');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const base = arg('base', '/PedroOS').replace(/\/+$/, '');
const site = arg('site', 'https://pedroltz.github.io').replace(/\/+$/, '');
const out = resolve(root, arg('out', 'dist/pages'));
const port = Number(arg('port', '5199'));
const origin = `http://localhost:${port}`;
const publicBase = `${site}${base}`;
const PDF_NAME = 'Pedro-Tunin-Resume.pdf';

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${origin}/healthz`);
      if (res.ok) return;
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('PedroOS.Web did not start in time.');
}

async function get(path, { binary = false, allow404 = false } = {}) {
  const res = await fetch(`${origin}${path}`);
  if (!res.ok && !(allow404 && res.status === 404)) {
    throw new Error(`GET ${path} -> HTTP ${res.status}`);
  }
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function write(rel, data) {
  const target = join(out, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
}

/** Rewrites root-relative URLs (HTML attributes, inline CSS, boot JSON) for the deployment base path. */
function rewriteHtml(html, { fragment = false } = {}) {
  let result = html
    .replaceAll(origin, publicBase)
    .replace(/\b(href|src|action|poster|data-src)="\/(?!\/)/g, `$1="${base}/`)
    .replace(/url\((['"]?)\/(?!\/)/g, `url($1${base}/`)
    .replaceAll('"/assets/', `"${base}/assets/`)
    .replaceAll(`${base}/resume/pdf"`, `${base}/resume/${PDF_NAME}"`);
  if (!fragment) {
    const metas =
      `    <meta name="pedroos-base" content="${base}" />\n` +
      `    <meta name="pedroos-static" content="true" />\n`;
    result = result.replace('</head>', `${metas}</head>`);
  }
  return result;
}

function rewriteCss(css) {
  return css.replace(/url\((['"]?)\/(?!\/)/g, `url($1${base}/`);
}

function copyWwwroot() {
  const src = join(webProject, 'wwwroot');
  cpSync(src, out, { recursive: true, filter: (p) => !p.endsWith('.map') });
  const cssDir = join(out, 'css');
  for (const file of readdirSync(cssDir)) {
    if (extname(file) === '.css') {
      const p = join(cssDir, file);
      writeFileSync(p, rewriteCss(readFileSync(p, 'utf8')));
    }
  }
}

function extractBootData(html) {
  const match = /<script[^>]*id="pedroos-boot-data"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match) throw new Error('Boot data not found in index page.');
  return JSON.parse(match[1]);
}

async function main() {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  console.log(`Starting PedroOS.Web on ${origin} ...`);
  const server = spawn(
    'dotnet',
    ['run', '--no-build', '-c', 'Release', '--no-launch-profile', '--project', webProject, '--urls', origin],
    { env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Production' }, stdio: 'inherit' },
  );
  const stop = () => server.kill();
  process.on('exit', stop);

  try {
    await waitForServer();

    copyWwwroot();

    const indexHtml = await get('/');
    const boot = extractBootData(indexHtml);
    const slugs = boot.projects.map((p) => p.slug);
    const fragmentApps = boot.apps.filter((a) => a.content === 'fragment').map((a) => a.id);

    // Pages (each route is pre-rendered, so deep links and SEO keep working).
    const routes = ['/', '/projects', '/resume', '/skills', ...slugs.map((s) => `/projects/${s}`)];
    for (const route of routes) {
      const html = rewriteHtml(await get(route));
      write(route === '/' ? 'index.html' : join(route.slice(1), 'index.html'), html);
    }
    write('404.html', rewriteHtml(await get('/not-found', { allow404: true })));

    // Window fragments fetched by the WindowManager.
    let fragmentCount = 0;
    for (const id of fragmentApps) {
      if (id === 'project') {
        for (const slug of slugs) {
          write(join('fragments', id, `${slug}.html`), rewriteHtml(await get(`/fragments/${id}?slug=${encodeURIComponent(slug)}`), { fragment: true }));
          fragmentCount++;
        }
      } else {
        write(join('fragments', `${id}.html`), rewriteHtml(await get(`/fragments/${id}`), { fragment: true }));
        fragmentCount++;
      }
    }

    // Resume PDF and SEO files.
    write(join('resume', PDF_NAME), await get('/resume/pdf', { binary: true }));
    write('sitemap.xml', (await get('/sitemap.xml')).replaceAll(origin, publicBase));
    write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${publicBase}/sitemap.xml\n`);
    write('.nojekyll', '');

    console.log(`Static export ready: ${out}`);
    console.log(`  ${routes.length} pages, ${fragmentCount} fragments, base "${base}"`);
    if (!statSync(join(out, 'index.html')).isFile()) throw new Error('index.html missing');
  } finally {
    stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
