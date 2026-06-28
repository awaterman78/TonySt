# TonyST UI Touch Fix v0.6.2

This patch keeps the v0.6 layout but fixes two issues:

1. The app can get stuck on a black screen if a bare TOS file is loaded on its own. TOS is now treated as an advanced option and is saved for the next disk instead of instantly booting to a black screen.
2. iPhone touch input now uses true multi touch handlers, so the joystick can be held while Fire is pressed.

## Upload to GitHub

Upload these files to the root of the `gh-pages` branch, replacing the existing files:

- index.html
- main.css
- app.js
- tonyst.html

Keep the engine files here:

- engine/hatari/hatari.js
- engine/hatari/hatari.wasm
- engine/hatari/hatari.data

## Test URL

Open:

https://awaterman78.github.io/atari-st/?v=62

## If the screen is black

Tap Menu, then Clean start. Then load the game disk only. Do not load a TOS file unless a game specifically needs it.
