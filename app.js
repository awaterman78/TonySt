const TonyST = (() => {
  const state = {
    tos: null,
    disk: null,
    engineReady: false,
    engineLoading: false,
    module: null
  };

  const screen = document.getElementById('screen');
  const overlayStatus = document.getElementById('overlayStatus');
  const engineStatus = document.getElementById('engineStatus');
  const fileStatus = document.getElementById('fileStatus');

  function setStatus(message) {
    if (overlayStatus) overlayStatus.textContent = message;
    console.log(`[TonyST] ${message}`);
  }

  function setEngineStatus(message) {
    if (engineStatus) engineStatus.textContent = message;
  }

  function updateFileStatus() {
    const bits = [];
    if (state.tos) bits.push(`TOS: ${state.tos.name}`);
    if (state.disk) bits.push(`Disk: ${state.disk.name}`);
    if (fileStatus) fileStatus.textContent = bits.length ? bits.join('  |  ') : 'No files loaded';
  }

  async function readFile(file) {
    return {
      name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      bytes: new Uint8Array(await file.arrayBuffer())
    };
  }

  async function handleTosFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    state.tos = await readFile(file);
    updateFileStatus();
    setStatus(`Loaded ${state.tos.name}. This v0.4 test build boots from the TOS inside hatari.data. Custom TOS boot wiring is next.`);
    pushFilesToHatariIfReady();
  }

  async function handleDiskFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    state.disk = await readFile(file);
    updateFileStatus();
    setStatus(`Loaded ${state.disk.name}. I will copy it into Hatari's virtual drive if the engine is ready.`);
    pushFilesToHatariIfReady();
  }

  function mkdirp(FS, path) {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      try { FS.mkdir(current); } catch (_) {}
    }
  }

  function pushFilesToHatariIfReady() {
    if (!state.engineReady || !state.module || !state.module.FS) {
      return;
    }

    const FS = state.module.FS;
    try {
      mkdirp(FS, '/share/hatari/fs/TONYST');

      if (state.tos) {
        FS.writeFile(`/share/hatari/fs/TONYST/${state.tos.name}`, state.tos.bytes);
      }

      if (state.disk) {
        FS.writeFile(`/share/hatari/fs/TONYST/${state.disk.name}`, state.disk.bytes);
      }

      setStatus('Files copied into Hatari virtual drive under TONYST. Full floppy mounting is the next boss fight.');
    } catch (error) {
      setStatus(`Could not copy files into Hatari: ${error.message}`);
    }
  }

  function attachHatariModule(module) {
    state.module = module;
    state.engineReady = true;
    setEngineStatus('Engine, ready');
    setStatus('Hatari engine loaded. If the screen is blank for a few seconds, give it a moment, it is very 1985.');
    pushFilesToHatariIfReady();
  }

  function loadHatariEngine() {
    if (state.engineLoading || state.engineReady) return;
    state.engineLoading = true;
    setEngineStatus('Engine, loading');
    setStatus('Loading engine/hatari/hatari.js...');

    const args = [
      '--desktop', 'false',
      '--machine', 'megaste',
      '--statusbar', 'false',
      '--memsize', '4',
      '--cpuclock', '16'
    ];

    window.Module = {
      preRun: [],
      postRun: [],
      canvas: screen,
      totalDependencies: 0,
      print: text => console.log('[Hatari]', text),
      printErr: text => console.error('[Hatari]', text),
      locateFile: path => `engine/hatari/${path}`,
      setStatus: text => {
        console.log('[Hatari]', text);
        if (text) setStatus(text);
      },
      monitorRunDependencies: function (remaining) {
        this.totalDependencies = Math.max(this.totalDependencies, remaining);
        if (remaining) {
          setEngineStatus('Engine, preparing');
          setStatus(`Preparing Hatari... (${this.totalDependencies - remaining}/${this.totalDependencies})`);
        } else {
          setEngineStatus('Engine, starting');
          setStatus('All Hatari downloads complete. Starting...');
        }
      },
      onRuntimeInitialized: () => {
        attachHatariModule(window.Module);
      },
      get arguments() {
        return args;
      },
      set arguments(value) {
        for (let i = 0; i < value.length; i += 2) {
          if (args.indexOf(value[i]) === -1) {
            args.push(value[i], value[i + 1]);
          }
        }
        console.log('[Hatari args]', args);
      }
    };

    window.onerror = message => {
      setEngineStatus('Engine, error');
      setStatus(`Error: ${message}`);
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'engine/hatari/hatari.js?v=0.4';
    script.onload = () => setStatus('Hatari script loaded. Waiting for WebAssembly runtime...');
    script.onerror = () => {
      setEngineStatus('Engine, missing');
      setStatus('Could not load engine/hatari/hatari.js. Check the file path on GitHub Pages.');
    };
    document.body.appendChild(script);
  }

  function run() {
    if (!state.engineReady) {
      setStatus('Engine is still loading. Wait a few seconds, then refresh once if it sticks.');
      return;
    }

    setStatus('Hatari should already be running. The Run button is now just a status check.');
    if (screen) screen.focus();
  }

  function pause() {
    setStatus('Pause is not wired yet. Engine loading is the current win.');
  }

  function reset() {
    setStatus('Reset is not wired yet. Refresh the page to restart this v0.4 test build.');
  }

  function drawPlaceholder(title, subtitle) {
    if (!screen) return;
    const ctx = screen.getContext('2d');
    ctx.clearRect(0, 0, screen.width, screen.height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.fillStyle = '#f5f7fb';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, 48, 100);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText(subtitle, 48, 146);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Loading engine/hatari/hatari.js, hatari.wasm and hatari.data.', 48, 208);
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
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
        keyboardEvent(key, 'keydown');
        if (screen) screen.focus();
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
    drawPlaceholder('TonyST Web', 'Loading Hatari WebAssembly');
    setEngineStatus('Engine, loading');
    updateFileStatus();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js?v=0.4').catch(() => {});
    }

    loadHatariEngine();
  }

  return {
    boot,
    attachHatariModule,
    loadHatariEngine,
    pushFilesToHatariIfReady,
    run,
    pause,
    reset,
    state
  };
})();

window.TonyST = TonyST;
window.addEventListener('DOMContentLoaded', TonyST.boot);
