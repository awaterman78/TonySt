# Build Hatari for WebAssembly

This is the hard part.

The app shell is already here. To make it a working emulator, Hatari needs to be compiled to WebAssembly using Emscripten, usually with SDL2 support.

Broad route:

1. Install Emscripten.
2. Get the Hatari source code.
3. Build Hatari using the Emscripten compiler.
4. Output hatari.js and hatari.wasm.
5. Put those files into engine/hatari.
6. Connect the exported Hatari run, pause, reset and file loading functions in app.js.

Useful build concept:

emcmake cmake path/to/hatari/source
emmake make

That will probably not work untouched. Hatari is a proper native emulator and may need build flags, SDL2 handling and file system wiring.

The sensible next milestone is not perfection. It is one known public domain disk image booting in Safari on a Mac. Once that works, test iPhone Safari.
