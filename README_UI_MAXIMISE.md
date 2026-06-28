# TonyST v0.6 screen and controls update

This patch gives TonyST a more console-like layout.

Upload these four files to the root of your `gh-pages` branch, replacing the existing versions:

- index.html
- main.css
- app.js
- tonyst.html

Keep your engine files exactly where they are:

- engine/hatari/hatari.js
- engine/hatari/hatari.wasm
- engine/hatari/hatari.data

What changed:

- Maximised the emulator screen area.
- Removed the big visible settings buttons from the main screen.
- Added a compact menu button for load game, load BIOS/TOS, reset, pause and fullscreen.
- Added a round joystick-style control.
- Added a single large Fire button mapped to Space.
- Added a virtual keyboard drawer.
- Removed page scrolling so the screen and controls stay in view.

After upload, test:

https://awaterman78.github.io/atari-st/?v=60

If it still shows the old layout, clear Safari website data for awaterman78.github.io or change the query string again, for example `?v=61`.
