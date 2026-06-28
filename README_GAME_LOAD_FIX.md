# TonyST Game Load Fix v0.6.4

This patch keeps the v0.6 layout but changes the game loading method.

What changed:
- Keeps the maximised screen layout.
- Keeps the joystick, Fire and keyboard layout.
- Uses a more reliable iPhone method for local disk files.
- Stops passing parent blob URLs into the iframe.
- Sends the selected disk to the emulator iframe by postMessage as an ArrayBuffer.
- Temporarily disables BIOS/TOS loading so games boot disk-only while testing.

Upload these four files to the root of the gh-pages branch:
- index.html
- main.css
- app.js
- tonyst.html

Keep these where they already are:
- engine/hatari/hatari.js
- engine/hatari/hatari.wasm
- engine/hatari/hatari.data

Test URL:
https://awaterman78.github.io/atari-st/?v=64

Testing steps:
1. Open the site with ?v=64.
2. Menu.
3. Clean start.
4. Menu.
5. Load game or disk.
6. Pick a .st or .msa file.
7. If it boots to the Atari desktop, double tap Disk A.
8. If a crack intro asks for Spacebar, tap Fire.

Do not load TOS/BIOS in this build.
