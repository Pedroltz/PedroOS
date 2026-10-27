// Injects the live phone server redirect script into the static GitHub Pages export.
// If the phone's Cloudflare Tunnel is online, visitors to https://pedroltz.github.io/PedroOS
// are automatically redirected to the live container on the phone; if the phone is offline,
// the static GitHub Pages site remains active as an automatic fallback.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outDir = resolve(process.argv[2] || 'dist/pages');
const gistId = process.argv[3] || 'f2c4bf1b6963b96f45da7b3e006ba8b6';

const redirectScript = `<script>
(function() {
  if (location.search.indexOf('static=1') !== -1) return;
  fetch('https://api.github.com/gists/${gistId}', { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var raw = d && d.files && d.files['pedroos-tunnel.json'] && d.files['pedroos-tunnel.json'].content;
      if (!raw) return;
      var info = JSON.parse(raw);
      if (!info || !info.url) return;
      var targetBase = info.url.replace(/\\/+$/, '');
      var subPath = location.pathname.replace(/^\\/PedroOS/i, '') || '/';
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 3500);
      fetch(targetBase + '/healthz', { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
        .then(function() {
          clearTimeout(timer);
          location.replace(targetBase + subPath + location.search + location.hash);
        })
        .catch(function() { clearTimeout(timer); });
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
