# TonyST Web Flat v0.5

This package strips out the 3D room and uses the working Hatari WebAssembly iframe directly.

## What changed

- `index.html` is now the flat TonyST interface.
- `main.css` is now the iPhone friendly flat layout.
- `app.js` handles fullscreen, reset, focus, basic touch key dispatch and experimental local file boot.
- `hatari/tonyst.html` is based on the working Hatari page, with optional query string support for local TOS and disk files.
- The original `hatari/hatari.js`, `hatari/hatari.wasm` and `hatari/hatari.data` files are kept.

## Upload to GitHub

Upload or replace these files in your `gh-pages` branch:

- `index.html`
- `main.css`
- `app.js`
- `manifest.json`
- `hatari/tonyst.html`

Keep the full `hatari` folder already in the repo.

You can leave `models` and `textures` in the repo. They are not used by this flat version.

## Important

Do not upload original Atari TOS files or commercial game disks to a public GitHub repo. Use the buttons to import local files on your own device.

The built in demo should boot from the existing Hatari data package. Local disk loading is experimental because it depends on the Hatari WebAssembly build accepting a disk path through its command line options.
