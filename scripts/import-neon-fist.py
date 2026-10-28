"""Import the pinned Neon Fist checkout as a local-only PedroOS game.

Usage: python scripts/import-neon-fist.py <upstream checkout>
"""
from pathlib import Path
import re
import shutil
import subprocess
import sys

REVISION = "c28ffb7e7e81ed8f9cec274772c43c30d2876d42"
source = Path(sys.argv[1]).resolve()
revision = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
if revision != REVISION:
    raise SystemExit("Expected upstream revision " + REVISION)
target = Path(__file__).resolve().parents[1] / "src/PedroOS.Web/wwwroot/assets/games/neon-fist"
target.mkdir(parents=True, exist_ok=True)
html = (source / "public/index.html").read_text(encoding="utf-8")
css = re.search(r"<style>([\s\S]*?)</style>", html)[1]
js = re.search(r'<script type="module">([\s\S]*?)</script>', html)[1]


def section(text, start, end, replacement=""):
    left = text.index(start)
    right = text.index(end, left)
    return text[:left] + replacement + text[right:]


js = re.sub(r"import \{ (LiveConfig|Telemetry, FUNNEL) \} from '[^']+';\n", "", js)
js = section(js, "let LIVE = null, TEL = null;", "/* =====================================================================")
js = section(js, "const Net = (()=>{", "/* ============================ RENDERING", "const Net = { active: false };\n\n")
js = section(js, "function stepNet(){", "function frame(now){")
js = js.replace("if(Net.active) stepNet(); else stepLocal();", "stepLocal();")
js = section(js, "const tBox=document.getElementById('tBox')", "function rematchIfDone()", "function syncToggles() {}\n\n")
js = section(js, "    /* ---- Phase 16:", "    await loader.runStep('atlas.p1'", "    applyStage(loader.assets.stage);\n    applyConfig(loader.assets.fighter, loader.assets.rules, loader.assets.stage);\n    resize();\n\n")
js = re.sub(r"      get (live|telemetry)\(\)\{ return (LIVE|TEL); \},\n", "", js)
js = js[:js.index("/* ---------------- PWA registration")]
js = js.replace("if(e.code==='KeyH'){ DEBUG.boxes=!DEBUG.boxes; syncToggles(); }", "")
js = js.replace("if(e.code==='KeyG'){ DEBUG.diag=!DEBUG.diag; syncToggles(); }", "")
js = js.replace("resume(){ if(ac && ac.state==='suspended') ac.resume(); }", "resume(){ if(ac && ac.state==='suspended' && !hostPaused) ac.resume().catch(()=>{}); },\n    suspend(){ if(ac) ac.suspend().catch(()=>{}); }")
js = js.replace("function frame(now){\n  requestAnimationFrame(frame);", "function frame(now){\n  if(hostPaused || document.hidden) return;\n  animation = requestAnimationFrame(frame);")
js = js.replace("    requestAnimationFrame(frame);", "    if(!hostPaused) animation = requestAnimationFrame(frame);")
js = js.replace("  startMatch();\n});", "  startMatch();\n  report('running');\n});")
js = js.replace("document.getElementById('boot').classList.add('ready');", "document.getElementById('boot').classList.add('ready');\n    readyForFrames = true;\n    report('ready');")
js = js.replace("    console.error(err);", "    report('error');\n    console.error(err);")
bridge = '''
// PedroOS host lifecycle: local CPU only, no networking or persistent state.
let hostPaused = true, animation = 0;
const session = new URLSearchParams(location.search).get('session');
const report = type => parent.postMessage({source:'pedroos-neon-fist', session, type}, location.origin);
window.addEventListener('message', event => {
  if(event.source !== parent || event.origin !== location.origin || event.data?.source !== 'pedroos-neon-host') return;
  if(event.data.type !== 'pause') return;
  const paused = !!event.data.value;
  if(paused === hostPaused) return;
  hostPaused = paused;
  LiveInput[0] = LiveInput[1] = TouchMask = 0;
  touchOwner.clear(); recomputeTouchMask();
  cancelAnimationFrame(animation);
  if(paused) Audio5.suspend();
  else { Audio5.resume(); last = performance.now(); acc = 0; if(readyForFrames) animation = requestAnimationFrame(frame); }
});
document.addEventListener('pointerdown', () => report('focus'), {capture:true});
window.addEventListener('keydown', event => {
  if(event.altKey && event.key === 'F4') { event.preventDefault(); event.stopImmediatePropagation(); report('close'); }
}, {capture:true});
report('loaded');
'''
# Define lifecycle state before boot begins; report loaded after declarations initialize.
js = js.replace('"use strict";', '"use strict";\nlet hostPaused = true, animation = 0, readyForFrames = false;\nconst session = new URLSearchParams(location.search).get("session");\nconst report = type => parent.postMessage({source:"pedroos-neon-fist", session, type}, location.origin);')
bridge = bridge[bridge.index("window.addEventListener('message'"):]
js += bridge
html = re.sub(r"<style>[\s\S]*?</style>", '<link rel="stylesheet" href="player.css">', html)
html = re.sub(r'<script type="module">[\s\S]*?</script>', '<script type="module" src="player.js"></script>', html)
html = section(html, '  <div id="topbar">', '  <div id="touch">')
html = section(html, '  <div id="netui">', '  <div id="loading">')
html = re.sub(r'<link[^>]+(?:manifest|icon)[^>]*>\n', '', html)
html = html.replace('<html lang="en">', '<html lang="pt-BR">')
html = html.replace('ENTER THE RING', 'Jogar').replace('PLAYER 1', 'JOGADOR')
html = html.replace('PUNCH</div>', 'SOCO</div>').replace('KICK</div>', 'CHUTE</div>').replace('BLOCK</div>', 'DEFESA</div>').replace('JUMP</div>', 'PULAR</div>').replace('DOWN</div>', '↓</div>')
html = html.replace('P2 uses arrows + 1/2/3.', 'P: pausar · Enter: revanche.')
css += '\n/* The host window supplies the application chrome. */\n#topbar,#netui{display:none}\n'
for name, data in [("player.html", html), ("player.css", css), ("player.js", js)]:
    (target / name).write_text(data, encoding="utf-8")
shutil.copytree(source / "public/data", target / "data", dirs_exist_ok=True)
(target / "shared").mkdir(exist_ok=True)
for name in ["configLoader.js", "integrity.js"]:
    shutil.copyfile(source / "public/shared" / name, target / "shared" / name)
shutil.copyfile(source / "LICENSE", target / "LICENSE.txt")
(target / "UPSTREAM.md").write_text(
    "# Neon Fist — PedroOS adaptation\n\n"
    "Upstream: https://github.com/developerrutu/neon-fist\n\nCommit: " + REVISION + "\n\n"
    "Copyright (c) 2026 Rutu (developerrutu), MIT; see LICENSE.txt.\n\n"
    "Imported with scripts/import-neon-fist.py. Changes: local CPU mode, bundled configuration; "
    "removed WebRTC/netplay, telemetry, player IDs, remote configuration and PWA registration; "
    "externalized CSS and JS for CSP; removed debug toolbar; added host pause/focus/close lifecycle "
    "and Portuguese touch labels. Original engine, procedural art and audio retained.\n",
    encoding="utf-8")
print("Imported Neon Fist " + REVISION)
