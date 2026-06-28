# TonyST v0.5.4 file picker fix

This patch fixes the iPhone Files picker being too strict.

Upload these three files to the root of your `gh-pages` branch, replacing the existing versions:

- index.html
- app.js
- tonyst.html

Do not move or delete the engine files. Keep them here:

- engine/hatari/hatari.js
- engine/hatari/hatari.wasm
- engine/hatari/hatari.data

What changed:

- Removed the `accept` filters from the hidden file inputs so iPhone will allow all files to be selected.
- Changed the buttons to clearer wording.
- Set the iframe default source to root `tonyst.html` to match the current working structure.

After uploading, test:

https://awaterman78.github.io/atari-st/?v=54

Notes:

- Atari ST games are usually disk images such as .st, .msa, .stx, .dim, .ipf or zipped versions.
- Original Atari TOS/BIOS files are usually used via the BIOS/TOS button, not the game/disk button.
- Commercial games and original Atari TOS should not be uploaded publicly to GitHub. Import them locally from your iPhone only.
