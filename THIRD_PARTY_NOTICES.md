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

The visual audit adds original artwork in `scripts/icon-drawings.mjs`: native 16px toolbar glyphs and separate 32px compositions for AnyComic, 2091 RetroGame and AutoApply. The established desktop/application artwork is preserved at the user's request, including its integer-scaled variants. The registry records attribution and native sizes. Runtime toolbar references use original artwork; existing Pixelarticons SVG files are retained with their MIT notice.

The Windows 95-inspired cursors in `wwwroot/assets/cursors/` are original monochrome pixel drawings generated by `scripts/generate-cursors.mjs` (`npm run cursors`). No Microsoft cursor files are redistributed. Matching PNG and CUR files use 32px transparent canvases with explicit CSS hotspots. The website prefers PNG for browser compatibility, with CUR and system-cursor fallbacks. Clickable surfaces show the classic hand; text, busy, move and resize states have their own cursors.

Sources reviewed on 2026-10-22, without importing their artwork:

- [Memphis](https://github.com/infofintech/memphis/blob/main/LICENSE.md): repository declares MIT.
- [ChiDoors](https://github.com/DawnVespero/ChiDoors/blob/main/LICENSE): CC BY-SA 4.0; reuse requires attribution and compliance with share-alike terms for adapted artwork.
- [Pixelarticons](https://pixelarticons.com/): free base set declares MIT; paid styles have separate commercial terms. Its 24px source grid is unsuitable for direct fractional reduction to 16px toolbars.
- [Windows Icon Archive](https://limehawk.github.io/windows-icon-archive/): historical visual reference only; no redistribution permission was established or relied upon.

- No proprietary Microsoft binaries, DLLs, or copyrighted ICO files were copied into this repository.
- Reference projects researched: Memphis (infofintech/memphis), ChiDoors (DawnVespero/ChiDoors), React95 (react95/react95), Windows Icon Archive (limehawk.github.io/windows-icon-archive).
- Windows, Windows 95, and related brand names are trademarks of Microsoft Corporation. This project is a non-commercial personal portfolio simulation and is not affiliated with or endorsed by Microsoft Corporation.

## xterm.js

- **Project:** xterm.js 6.0.0 — https://github.com/xtermjs/xterm.js
- **Authors:** The xterm.js authors; SourceLair Private Company; Christopher Jeffrey.
- **License:** MIT. The full license is distributed at `wwwroot/js/vendor/xterm-LICENSE.txt`.
- Used only to render and relay the original C# console inside MS-DOS Prompt; no game rules execute in xterm.js.

## Newtonsoft.Json

- **Project:** Json.NET 13.0.3 — https://github.com/JamesNK/Newtonsoft.Json
- **Author:** James Newton-King.
- **License:** MIT. Used by the original 2091 C# sources; the license is included with the native runtime.

A integração local do 2091 inclui a faixa usada no projeto original: “Cyberpunk 2077 - Never Fade Away __ Knight972 ret..mp3”, copiada para `assets/games/2091/title.mp3`. Os direitos da gravação e da composição pertencem aos respectivos titulares.
