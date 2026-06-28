(() => {
  const frame = document.getElementById("emulatorFrame");
  const overlay = document.getElementById("loadingOverlay");
  const engineStatus = document.getElementById("engineStatus");
  const engineLabel = document.getElementById("engineLabel");
  const fileLabel = document.getElementById("fileLabel");

  const tosInput = document.getElementById("tosInput");
  const diskInput = document.getElementById("diskInput");
  const tosButton = document.getElementById("tosButton");
  const diskButton = document.getElementById("diskButton");
  const runButton = document.getElementById("runButton");
  const pauseButton = document.getElementById("pauseButton");
  const resetButton = document.getElementById("resetButton");
  const fullscreenButton = document.getElementById("fullscreenButton");

  let tosUrl = "";
  let diskUrl = "";
  let tosName = "";
  let diskName = "";
  let isPaused = false;

  const revoke = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  const status = (label, detail) => {
    engineLabel.textContent = label;
    if (detail) engineStatus.textContent = detail;
  };

  const setFileLabel = () => {
    if (diskName && tosName) {
      fileLabel.textContent = `${diskName}, ${tosName}`;
    } else if (diskName) {
      fileLabel.textContent = diskName;
    } else if (tosName) {
      fileLabel.textContent = tosName;
    } else {
      fileLabel.textContent = "Built in demo disk";
    }
  };

  const buildSrc = () => {
    const params = new URLSearchParams();
    if (tosUrl) params.set("tos", tosUrl);
    if (diskUrl) params.set("disk", diskUrl);
    if (diskName) params.set("diskName", diskName);
    if (tosName) params.set("tosName", tosName);
    const qs = params.toString();
    return `tonyst.html${qs ? `?${qs}` : ""}`;
  };

  const reboot = () => {
    overlay.classList.remove("is-hidden");
    status("Engine, starting", diskName ? "Booting selected disk" : "Starting Hatari WebAssembly");
    setFileLabel();
    frame.src = buildSrc();
  };

  const focusEmulator = () => {
    try {
      frame.focus();
      const win = frame.contentWindow;
      const canvas = win?.document?.getElementById("canvas");
      canvas?.focus();
    } catch (_) {}
  };

  const sendKey = (code, down) => {
    focusEmulator();
    const key = code === "Space" ? " " : code.replace("Arrow", "");
    const eventInit = {
      key,
      code,
      bubbles: true,
      cancelable: true,
      composed: true,
    };
    try {
      const win = frame.contentWindow;
      const target = win?.document?.getElementById("canvas") || win?.document || win;
      const event = new KeyboardEvent(down ? "keydown" : "keyup", eventInit);
      target.dispatchEvent(event);
      win?.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", eventInit));
    } catch (_) {}
  };

  frame.addEventListener("load", () => {
    status("Engine, loaded", diskName ? "Selected disk sent to Hatari" : "Built in Hatari demo loaded");
    setTimeout(() => overlay.classList.add("is-hidden"), 900);
    setTimeout(focusEmulator, 1000);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "tonyst-status") {
      status(event.data.label || "Engine, loaded", event.data.detail || "Hatari ready");
      if (event.data.hideOverlay) overlay.classList.add("is-hidden");
    }
    if (event.data?.type === "tonyst-error") {
      status("Engine, error", event.data.detail || "Hatari error");
      overlay.classList.remove("is-hidden");
    }
  });

  tosButton.addEventListener("click", () => tosInput.click());
  diskButton.addEventListener("click", () => diskInput.click());

  tosInput.addEventListener("change", () => {
    const file = tosInput.files?.[0];
    if (!file) return;
    revoke(tosUrl);
    tosUrl = URL.createObjectURL(file);
    tosName = file.name;
    reboot();
  });

  diskInput.addEventListener("change", () => {
    const file = diskInput.files?.[0];
    if (!file) return;
    revoke(diskUrl);
    diskUrl = URL.createObjectURL(file);
    diskName = file.name;
    reboot();
  });

  runButton.addEventListener("click", focusEmulator);

  pauseButton.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    try {
      frame.contentWindow?.postMessage({ type: "tonyst-pause", paused: isPaused }, window.location.origin);
    } catch (_) {}
  });

  resetButton.addEventListener("click", reboot);

  fullscreenButton.addEventListener("click", async () => {
    try {
      await (frame.requestFullscreen?.() || frame.webkitRequestFullscreen?.());
    } catch (_) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch (_) {}
    }
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const down = (e) => {
      e.preventDefault();
      sendKey(code, true);
    };
    const up = (e) => {
      e.preventDefault();
      sendKey(code, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  });
})();
