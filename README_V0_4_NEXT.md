# TonyST v0.4 engine loader

This version changes the app from a placeholder shell to an engine loader.

Upload these root files to GitHub, replacing the old ones:

- index.html
- app.js
- sw.js

Keep your existing folders and engine files:

- engine/hatari/hatari.data
- engine/hatari/hatari.js
- engine/hatari/hatari.wasm

Then open your GitHub Pages URL with `?v=4` at the end, for example:

https://awaterman78.github.io/?v=4

Refresh twice on iPhone Safari. If the old screen is still cached, go to iPhone Settings, Safari, Advanced, Website Data, search github.io, delete it, then reopen the site.

This v0.4 build proves Hatari loads and boots from the data pack. Loading your own disk as an actual floppy is the next stage.
