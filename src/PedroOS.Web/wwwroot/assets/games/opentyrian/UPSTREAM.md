# OpenTyrian WebAssembly

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
