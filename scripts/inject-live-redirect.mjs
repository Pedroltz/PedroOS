// Injects the live phone server redirect script into the static GitHub Pages export.
// If the phone's Cloudflare Tunnel is online, visitors to https://pedroltz.github.io/PedroOS
// are automatically redirected to the live container on the phone; if the phone is offline,
// the static GitHub Pages site remains active as an automatic fallback.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv[2] || 'dist/pages');
const gistId = process.argv[3] || 'f2c4bf1b6963b96f45da7b3e006ba8b6';
if (!/^[a-f0-9]+$/i.test(gistId)) throw new Error('Invalid Gist ID');

const redirectScript = `<script>
(function() {
  if (new URLSearchParams(location.search).get('static') === '1') return;
  function getJson(url) {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, 8000);
    return fetch(url, { mode: 'cors', cache: 'no-store', signal: ctrl.signal })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function() { clearTimeout(timer); });
  }
  getJson('https://api.github.com/gists/${gistId}')
    .then(function(d) {
      var raw = d && d.files && d.files['pedroos-tunnel.json'] && d.files['pedroos-tunnel.json'].content;
      if (!raw) return;
      var info = JSON.parse(raw);
      if (!info || !info.url) return;
      var target = new URL(info.url);
      if (target.protocol !== 'https:' || target.username || target.password) return;
      var targetBase = target.origin;
      if (targetBase === location.origin) return;
      var meta = document.querySelector('meta[name="pedroos-base"]');
      var base = meta ? meta.content.replace(/\\/+$/, '') : '/PedroOS';
      var subPath = location.pathname;
      if (base && (subPath === base || subPath.indexOf(base + '/') === 0)) {
        subPath = subPath.slice(base.length) || '/';
      }
      return getJson(targetBase + '/healthz').then(function(health) {
        if (health.status === 'ok' && health.os === 'PedroOS 95') {
          location.replace(targetBase + subPath + location.search + location.hash);
        }
      });
    })
    .catch(function() {});
})();
</script>`;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (entry.endsWith('.html')) {
      const html = readFileSync(full, 'utf8');
      if (html.includes('<head>') && !html.includes(gistId)) {
        writeFileSync(full, html.replace('<head>', `<head>\n${redirectScript}`));
      }
    }
  }
}

walk(outDir);
console.log(`Injected live-phone redirect script (Gist ${gistId}) into ${outDir}`);
