# SkiFree.js

Source: https://github.com/basicallydan/skifree.js
Commit: a812f944f7420ab53374b6b983ef3eb54f8a26ce
Copyright (C) 2013 Daniel Hough. MIT, see LICENSE.txt.
Bundled engine includes Hammer.JS (MIT) and Mousetrap; upstream notices are retained.
The upstream README credits Chris Pirih and Wing Wang Wao for the original sprites.

PedroOS uses the upstream browser bundle, canvas and touch controls. Changes:
namespaced high score storage with an in-memory fallback, isolated window lifecycle,
no analytics or external banners. Source snapshot: source.tar.gz.
Reproduce: clone the source at the commit above, then run scripts/import-retro-games.py.
