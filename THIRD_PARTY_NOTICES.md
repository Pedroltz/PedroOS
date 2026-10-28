# Third-Party Notices & Licenses

PedroOS 95 incorporates open-source software and resources subject to the following notices and licenses:

## Oldschool PC Font Pack — IBM VGA 8x16

- **Author:** VileR, copyright (c) 2016-2020
- **Project:** The Ultimate Oldschool PC Font Pack v2.2, https://int10h.org/oldschool-pc-fonts/
- **Font:** `WebPlus_IBM_VGA_8x16.woff`, redistributed without modification.
- **License:** Creative Commons Attribution-ShareAlike 4.0 International, https://creativecommons.org/licenses/by-sa/4.0/
- **Local license:** `src/PedroOS.Web/wwwroot/assets/fonts/oldschool-pc-fonts-LICENSE.txt`.
- Used by the MS-DOS Prompt at its original 16px size. The remaining application chrome uses the existing Pixelated MS Sans Serif font.

---

## 1. 98.css

- **Project:** 98.css
- **Author:** Jordan Scales
- **Repository:** https://github.com/jdan/98.css
- **License:** MIT License

```
MIT License

Copyright (c) 2020 Jordan Scales

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. interact.js

- **Project:** interact.js
- **Author:** Taye Adeyemi
- **Repository:** https://github.com/taye/interact.js
- **License:** MIT License

```
Copyright (c) 2012-present Taye Adeyemi <dev@taye.me>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## 3. Pixelarticons

- **Project:** Pixelarticons (Free Set)
- **Author:** Gerrit Halfmann
- **Repository:** https://github.com/halfmage/pixelarticons
- **License:** MIT License

```
MIT License

Copyright (c) 2019 Gerrit Halfmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 4. Desktop & Application Icons Notice

All desktop, application, and project pixel-art icons included in `wwwroot/assets/icons/` were generated specifically for PedroOS 95 using original code (`scripts/generate-icons.mjs`) based on the classic 16-color VGA/Windows 95 palette.

The visual audit adds original artwork in `scripts/icon-drawings.mjs`: native 16px toolbar glyphs and separate 32px compositions for AnyComic, the generic gamepad and AutoApply. The established desktop/application artwork is preserved at the user's request, including its integer-scaled variants. The registry records attribution and native sizes. Runtime toolbar references use original artwork; existing Pixelarticons SVG files are retained with their MIT notice.

The Windows 95-inspired cursors in `wwwroot/assets/cursors/` are original monochrome pixel drawings generated by `scripts/generate-cursors.mjs` (`npm run cursors`). No Microsoft cursor files are redistributed. Matching PNG and CUR files use 32px transparent canvases with explicit CSS hotspots. The website prefers PNG for browser compatibility, with CUR and system-cursor fallbacks. Clickable surfaces show the classic hand; text, busy, move and resize states have their own cursors.

Sources reviewed on 2026-10-22, without importing their artwork:

- [Memphis](https://github.com/infofintech/memphis/blob/main/LICENSE.md): repository declares MIT.
- [ChiDoors](https://github.com/DawnVespero/ChiDoors/blob/main/LICENSE): CC BY-SA 4.0; reuse requires attribution and compliance with share-alike terms for adapted artwork.
- [Pixelarticons](https://pixelarticons.com/): free base set declares MIT; paid styles have separate commercial terms. Its 24px source grid is unsuitable for direct fractional reduction to 16px toolbars.
- [Windows Icon Archive](https://limehawk.github.io/windows-icon-archive/): historical visual reference only; no redistribution permission was established or relied upon.

- No Microsoft executables, DLLs, or copyrighted ICO files were copied into this repository. The startup recording is attributed separately below.
- Reference projects researched: Memphis (infofintech/memphis), ChiDoors (DawnVespero/ChiDoors), React95 (react95/react95), Windows Icon Archive (limehawk.github.io/windows-icon-archive).
- Windows, Windows 95, and related brand names are trademarks of Microsoft Corporation. This project is a non-commercial personal portfolio simulation and is not affiliated with or endorsed by Microsoft Corporation.

## Classic games: SkiFree, OpenTyrian and One Must Fall 2097

- **SkiFree.js:** Copyright (C) 2013 Daniel Hough, MIT. Source revision `a812f944f7420ab53374b6b983ef3eb54f8a26ce` from https://github.com/basicallydan/skifree.js. The original upstream sprite and bundled dependency credits are retained. License and source snapshot are shipped under `wwwroot/assets/games/skifree/`.
- **OpenTyrian:** GPL-2.0 source port; the browser engine is mirrored from https://midzer.de/wasm/opentyrian/ with hashes pinned in `scripts/import-retro-games.py`. Source snapshot from https://github.com/midzer/opentyrian at `2ffb8d8d4b8b83f774450db320dcad984030acd6` matches the revision displayed by the browser engine. Source, full GPL notice and build provenance are shipped under `wwwroot/assets/games/opentyrian/`. The included Tyrian data remains freeware under its original copyrights, separate from the engine license.
- **One Must Fall 2097:** Original game by Diversions Entertainment / Epic MegaGames, subsequently released as freeware; the game is not open source. Distribution from https://www.omf2097.com/pub/files/omf/omf21cd.zip; original license and manual are preserved under `wwwroot/assets/games/omf2097/`.
- **js-dos / DOSBox:** Runtime 6.22.60, source revision `d9d1045ef321bcde3f061dc8e686ded890147d6a` from https://github.com/caiiiycuk/js-dos/tree/6.22.60. Complete source archive, third-party source notices and GPL-2.0 license are shipped alongside the runtime. The PedroOS loader preloads the published JS/WASM without evaluating downloaded script strings.
- **PedroOS adapters:** Separate original window/player shells add local keyboard/touch input, namespaced SkiFree score storage, lifecycle pause and audio suspension. Third-party engines are isolated in their own documents. See each `UPSTREAM.md` for import steps and exact versions.

## Neon Fist

- **Project:** [Neon Fist](https://github.com/developerrutu/neon-fist), commit `c28ffb7e7e81ed8f9cec274772c43c30d2876d42`.
- **Author:** Copyright (c) 2026 Rutu (developerrutu).
- **License:** MIT; complete notice in `wwwroot/assets/games/neon-fist/LICENSE.txt`.
- **PedroOS adaptation:** CPU gameplay in the visitor's browser, local configuration, host-controlled pause and disposal, Portuguese touch labels. Online play, telemetry, persistent player IDs, remote configuration and service worker registration are removed. Import instructions and changes are recorded in `UPSTREAM.md` beside the player.

## Windows 95 startup audio

- **Recording:** “The Microsoft Sound”, composed by Brian Eno for Microsoft Windows 95.
- **Source:** https://www.winhistory.de/more/winstart/winstart_en.htm (Windows 95 section), downloaded from https://www.winhistory.de/more/winstart/down/o95.wav.
- **Local asset:** `wwwroot/assets/boot/windows-95-startup.wav`; unmodified mono PCM WAV, 22050 Hz, approximately 6.12 seconds.
- **SHA-256:** `9d667f61d830fc908405d2392a2d695abd046437a2859e9289984fae2e62c0a2`.
- Rights in this composition and recording remain with their respective owners; this audio is not covered by the repository's MIT license. No affiliation with Microsoft is implied.
- **Splash artwork:** New artwork generated for PedroOS with the built-in image generation tool. Prompt and provenance in `wwwroot/assets/boot/ARTWORK.md`; it uses an original terminal-monitor emblem and the PedroOS name.
