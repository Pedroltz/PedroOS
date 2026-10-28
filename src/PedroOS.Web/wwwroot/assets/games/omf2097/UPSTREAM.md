# One Must Fall 2097 + js-dos 6.22.60

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
