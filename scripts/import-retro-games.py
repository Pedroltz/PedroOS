"""Import pinned local downloads/checkouts for the three classic browser games.

Download URLs and exact checksums are recorded in each game's UPSTREAM.md.
Run from the repository root: python scripts/import-retro-games.py
"""
from pathlib import Path
import hashlib
import io
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
downloads = root / '.local/retro-downloads'
games = root / 'src/PedroOS.Web/wwwroot/assets/games'
checksums = {
    'js-dos.js': '774742a2f89762b51497c6e060d7bace465470e7874a2810b59a21a0ec61a8a1',
    'wdosbox.js': '06feec57a69b93f84722c4d0c5ed483484052e6e1d144dc4a98ee10af1d82044',
    'wdosbox.wasm.js': '84b873c1e5484a0f1d1adb25871f0daa92f1efc0339a9b54e84e450062182fb0',
    'omf21cd.zip': '567bee1b6a71477da6777a8dbdd32bd78833bcdd88242e3df0579c38db889dff',
    'tyrian-engine.js': '53c4fcce61c9d6bdb1fbe996221d97c262866988d4fd782579072f0c5835a447',
    'tyrian-engine.wasm': '3ace423fed8a01e681a48da5bdeccd5f0c213521d80f71fd22a156e60f67792f',
    'tyrian-engine.data': '7225790237a624ead5ce5d6b01487614e288f849eec6a3096980a8462034aa1c',
}
for name, expected in checksums.items():
    if hashlib.sha256((downloads / name).read_bytes()).hexdigest() != expected:
        raise SystemExit('Unexpected download checksum: ' + name)


def source(name, checkout, revision):
    repo = root / '.local' / checkout
    actual = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != revision:
        raise SystemExit('Unexpected source revision: ' + checkout)
    target = games / name
    target.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git', '-C', str(repo), 'archive', '--format=tar.gz',
                    '--prefix=' + checkout + '/', '--output=' + str(target / 'source.tar.gz'), 'HEAD'], check=True)
    return repo, target


ski, target = source('skifree', 'skifree-upstream', 'a812f944f7420ab53374b6b983ef3eb54f8a26ce')
js = (ski / 'dist/skifree.js').read_text(encoding='utf-8')
js = js.replace('localStorage', 'window.RetroBridge.storage').replace('"highScore"', '"pedroos.skifree.highScore"')
(target / 'engine.js').write_text(js, encoding='utf-8')
for asset in ['sprite-characters.png', 'skifree-objects.png']:
    shutil.copyfile(ski / asset, target / asset)
shutil.copyfile(ski / 'license.md', target / 'LICENSE.txt')
(target / 'UPSTREAM.md').write_text('''# SkiFree.js

Source: https://github.com/basicallydan/skifree.js
Commit: a812f944f7420ab53374b6b983ef3eb54f8a26ce
Copyright (C) 2013 Daniel Hough. MIT, see LICENSE.txt.
Bundled engine includes Hammer.JS (MIT) and Mousetrap; upstream notices are retained.
The upstream README credits Chris Pirih and Wing Wang Wao for the original sprites.

PedroOS uses the upstream browser bundle, canvas and touch controls. Changes:
namespaced high score storage with an in-memory fallback, isolated window lifecycle,
no analytics or external banners. Source snapshot: source.tar.gz.
Reproduce: clone the source at the commit above, then run scripts/import-retro-games.py.
''', encoding='utf-8')

tyrian, target = source('opentyrian', 'opentyrian-upstream', '2ffb8d8d4b8b83f774450db320dcad984030acd6')
for ext in ['js', 'wasm', 'data']:
    shutil.copyfile(downloads / ('tyrian-engine.' + ext), target / ('index.' + ext))
shutil.copyfile(tyrian / 'COPYING', target / 'LICENSE.txt')
(target / 'UPSTREAM.md').write_text('''# OpenTyrian WebAssembly

Browser build: https://midzer.de/wasm/opentyrian/
Source: https://github.com/midzer/opentyrian
Source snapshot: 2ffb8d8d4b8b83f774450db320dcad984030acd6, source.tar.gz.
This matches the g2ffb8d8 revision displayed by the web engine.
OpenTyrian is GPL-2.0, see LICENSE.txt. Tyrian 2.1 game data is freeware and
has its own original copyrights; it is not relicensed as GPL by PedroOS.
Source/data details: https://github.com/opentyrian/opentyrian

The browser engine files are mirrored unmodified from the author's web build.
PedroOS supplies a separate canvas shell, keyboard/touch controls, audio unlock,
pause/resume on focus changes and disposal on close. No external requests at runtime.
Download index.js, index.wasm and index.data from the browser build above into
.local/retro-downloads as tyrian-engine.js/.wasm/.data. Exact SHA-256 values are
pinned in scripts/import-retro-games.py.
The author's build instructions: https://github.com/midzer/opentyrian/blob/emscripten/EMSCRIPTEN.md
Build with Emscripten using emmake make; the engine uses SDL2, Asyncify and
preloaded freeware data. The source snapshot includes the web Makefile.
''', encoding='utf-8')

dos, target = source('omf2097', 'js-dos-upstream', 'd9d1045ef321bcde3f061dc8e686ded890147d6a')
for asset in ['js-dos.js', 'wdosbox.js']:
    shutil.copyfile(downloads / asset, target / asset)
shutil.copyfile(downloads / 'wdosbox.wasm.js', target / 'wdosbox.wasm')
shutil.copyfile(dos / 'LICENSE', target / 'DOSBOX-LICENSE.txt')
with zipfile.ZipFile(downloads / 'omf21cd.zip') as cd:
    with zipfile.ZipFile(io.BytesIO(cd.read('OMF/OMF21.EXE'))) as installed:
        with zipfile.ZipFile(target / 'game.zip', 'w', zipfile.ZIP_DEFLATED) as bundle:
            for entry in installed.infolist():
                if entry.is_dir():
                    continue
                if Path(entry.filename).is_absolute() or '..' in Path(entry.filename).parts:
                    raise SystemExit('Unsafe upstream archive member')
                info = zipfile.ZipInfo(entry.filename, date_time=(1995, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                bundle.writestr(info, installed.read(entry))
        (target / 'ORIGINAL-LICENSE.txt').write_bytes(installed.read('LICENSE.DOC'))
        (target / 'MANUAL.txt').write_text(cd.read('MANUAL/MANUAL.DOC').decode('cp437').replace('\r\r\n', '\n'), encoding='utf-8')
(target / 'UPSTREAM.md').write_text('''# One Must Fall 2097 + js-dos 6.22.60

Game: One Must Fall 2097 v2.1, Diversions Entertainment / Epic MegaGames (1994).
The game was subsequently released as freeware; the original license and manual
are preserved as ORIGINAL-LICENSE.txt and MANUAL.txt. The game is not open source.
Distribution: https://www.omf2097.com/pub/files/omf/omf21cd.zip
Project/distribution information: https://openomf.org/ and https://www.omf2097.com/wiki/doku.php?id=download
game.zip contains the files from the CD's OMF/OMF21.EXE self-extracting ZIP.

Runtime: https://github.com/caiiiycuk/js-dos/tree/6.22.60
Source snapshot: d9d1045ef321bcde3f061dc8e686ded890147d6a, source.tar.gz.
DOSBox and js-dos source/license: DOSBOX-LICENSE.txt; full engine, dependencies
and build scripts are in source.tar.gz. Browser files mirrored from:
https://js-dos.com/6.22/current/js-dos.js
https://js-dos.com/6.22/current/wdosbox.js
https://js-dos.com/6.22/current/wdosbox.wasm.js (renamed wdosbox.wasm)

The runtime is unmodified. PedroOS preloads the JS and WASM through ordinary script
elements/WebAssembly APIs, bypassing the legacy eval loader; no unsafe-eval policy
is needed. Local DOSBox configuration starts OMF.EXE without networking. A separate
player shell provides touch keys, audio unlock, pause/resume and window lifecycle,
including suspension of the engine's private sync_sleep_message wakeup loop.
Download inputs to .local/retro-downloads; checksums and import steps are in
scripts/import-retro-games.py. Default controls: arrows, Enter (punch/confirm),
right Shift (kick), Escape (menu).
''', encoding='utf-8')
print('Imported SkiFree, OpenTyrian and One Must Fall browser assets.')
