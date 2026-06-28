const TonyST = (() => {
  const state = {
    tos: null,
    disk: null,
    engineReady: false,
    module: null
  };

  const screen = document.getElementById('screen');
  const overlayStatus = document.getElementById('overlayStatus');
  const engineStatus = document.getElementById('engineStatus');
  const fileStatus = document.getElementById('fileStatus');

  function setStatus(message) {
    overlayStatus.textContent = message;
    console.log(`[TonyST] ${message}`);
  }

  function setEngineStatus(message) {
    engineStatus.textContent = message;
  }

  function updateFileStatus() {
    const bits = [];
    if (state.tos) bits.push(`TOS: ${state.tos.name}`);
    if (state.disk) bits.push(`Disk: ${state.disk.name}`);
    fileStatus.textContent = bits.length ? bits.join('  |  ') : 'No files loaded';
  }

  async function readFile(file) {
    return {
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer())
    };
  }

  async function handleTosFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    state.tos = await readFile(file);
    updateFileStatus();
    setStatus(`Loaded ${state.tos.name}. Now load a disk image.`);
    pushFilesToHatariIfReady();
  }

  async function handleDiskFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    state.disk = await readFile(file);
    updateFileStatus();
    setStatus(`Loaded ${state.disk.name}. Press Run when the engine is wired in.`);
    pushFilesToHatariIfReady();
  }

  function pushFilesToHatariIfReady() {
    if (!state.engineReady || !state.module || !state.module.FS) {
      return;
    }

    const FS = state.module.FS;
    try {
      try { FS.mkdir('/tonyst'); } catch (_) {}

      if (state.tos) {
        FS.writeFile(`/tonyst/${state.tos.name}`, state.tos.bytes);
      }

      if (state.disk) {
        FS.writeFile(`/tonyst/${state.disk.name}`, state.disk.bytes);
      }

      setStatus('Files copied into Hatari virtual file system.' );
    } catch (error) {
      setStatus(`Could not copy files into Hatari: ${error.message}`);
    }
  }

  function attachHatariModule(module) {
    state.module = module;
    state.engineReady = true;
    setEngineStatus('Engine, ready');
    setStatus('Hatari WebAssembly module attached. Load files, then run.');
    pushFilesToHatariIfReady();
  }

  function run() {
    if (!state.engineReady) {
      setStatus('Run requested, but Hatari is not loaded yet. Add engine/hatari/hatari.js and wire attachHatariModule.');
      drawPlaceholder('TonyST Web', 'Hatari engine required');
      return;
    }

    setStatus('Run sent to Hatari. Add the exported Hatari start call in app.js.' );
  }

  function pause() {
    if (!state.engineReady) {
      setStatus('Pause requested, but Hatari is not loaded yet.' );
      return;
    }

    setStatus('Pause sent to Hatari. Add the exported Hatari pause call in app.js.' );
  }

  function reset() {
    if (!state.engineReady) {
      setStatus('Reset requested, but Hatari is not loaded yet.' );
      return;
    }

    setStatus('Reset sent to Hatari. Add the exported Hatari reset call in app.js.' );
  }

  function drawPlaceholder(title, subtitle) {
    const ctx = screen.getContext('2d');
    ctx.clearRect(0, 0, screen.width, screen.height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.fillStyle = '#f5f7fb';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(title, 38, 86);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(subtitle, 38, 124);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Load TOS or EmuTOS, load disk, add Hatari WASM engine.', 38, 176);
  }

  function keyboardEvent(key, type) {
    window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
  }

  function wireControls() {
    document.getElementById('tosInput').addEventListener('change', handleTosFile);
    document.getElementById('diskInput').addEventListener('change', handleDiskFile);
    document.getElementById('runButton').addEventListener('click', run);
    document.getElementById('pauseButton').addEventListener('click', pause);
    document.getElementById('resetButton').addEventListener('click', reset);

    document.querySelectorAll('[data-key]').forEach(button => {
      const key = button.getAttribute('data-key');
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        keyboardEvent(key, 'keydown');
      });
      button.addEventListener('pointerup', event => {
        event.preventDefault();
        keyboardEvent(key, 'keyup');
      });
      button.addEventListener('pointercancel', event => {
        event.preventDefault();
        keyboardEvent(key, 'keyup');
      });
    });

    document.getElementById('fullscreenButton').addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (_) {
        setStatus('Full screen is limited on some iPhone Safari versions. Add to Home Screen for the best result.');
      }
    });
  }

  function boot() {
    wireControls();
    drawPlaceholder('TonyST Web', 'Ready for Hatari WebAssembly');
    setEngineStatus('Engine, waiting');
    updateFileStatus();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  return {
    boot,
    attachHatariModule,
    run,
    pause,
    reset,
    state
  };
})();

window.TonyST = TonyST;
window.addEventListener('DOMContentLoaded', TonyST.boot);
