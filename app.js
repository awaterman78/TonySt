(() => {
  const VERSION = "64";

  // GitHub Pages and Safari can hang on old service worker caches while testing.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => regs.forEach((reg) => reg.unregister())).catch(() => {});
  }

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
  const cleanStartButton = document.getElementById("cleanStartButton");
  const clearTosButton = document.getElementById("clearTosButton");

  const menuButton = document.getElementById("menuButton");
  const closeMenuButton = document.getElementById("closeMenuButton");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const keyboardButton = document.getElementById("keyboardButton");
  const keyboardPanel = document.getElementById("keyboardPanel");
  const closeKeyboardButton = document.getElementById("closeKeyboardButton");

  const joystick = document.getElementById("joystick");
  const stickThumb = document.getElementById("stickThumb");

  let diskFile = null;
  let diskName = "";
  let isPaused = false;
  let joystickKeys = new Set();
  let activeJoyTouchId = null;
  const heldButtonKeys = new Set();
  const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;

  const keyMap = {
    Space: { key: " ", code: "Space", keyCode: 32 },
    Enter: { key: "Enter", code: "Enter", keyCode: 13 },
    Backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
    Escape: { key: "Escape", code: "Escape", keyCode: 27 },
    Tab: { key: "Tab", code: "Tab", keyCode: 9 },
    ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
    ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
    ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
    ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  };

  for (let i = 1; i <= 10; i += 1) {
    keyMap[`F${i}`] = { key: `F${i}`, code: `F${i}`, keyCode: 111 + i };
  }
  for (let i = 0; i <= 9; i += 1) {
    keyMap[`Digit${i}`] = { key: String(i), code: `Digit${i}`, keyCode: 48 + i };
  }
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
    keyMap[`Key${letter}`] = { key: letter.toLowerCase(), code: `Key${letter}`, keyCode: letter.charCodeAt(0) };
  });

  const status = (label, detail) => {
    engineLabel.textContent = label;
    if (detail) engineStatus.textContent = detail;
  };

  const setFileLabel = () => {
    fileLabel.textContent = diskName || "Built in boot";
  };

  const clearAllFiles = () => {
    diskFile = null;
    diskName = "";
    diskInput.value = "";
    if (tosInput) tosInput.value = "";
    isPaused = false;
    if (pauseButton) pauseButton.textContent = "Pause";
    setFileLabel();
  };

  const buildSrc = () => {
    const params = new URLSearchParams();
    params.set("v", VERSION);
    params.set("r", String(Date.now()));

    // v0.6.4 deliberately does NOT use blob URLs for disk files.
    // iPhone Safari can be awkward fetching a parent-created blob from inside an iframe.
    // Instead the iframe asks the parent for the ArrayBuffer by postMessage.
    if (diskFile) {
      params.set("hasDisk", "1");
      params.set("diskName", diskName || diskFile.name || "disk.st");
    }

    return `tonyst.html?${params.toString()}`;
  };

  const closeMenu = () => {
    menuBackdrop.hidden = true;
  };

  const openMenu = () => {
    keyboardPanel.hidden = true;
    menuBackdrop.hidden = false;
  };

  const reboot = () => {
    releaseJoystick();
    releaseHeldButtons();
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

  async function sendDiskToFrame() {
    if (!diskFile || !frame.contentWindow) return;
    try {
      status("Engine, loading", `Sending ${diskName || diskFile.name} to Hatari`);
      const buffer = await diskFile.arrayBuffer();
      frame.contentWindow.postMessage({
        type: "tonyst-file-data",
        diskName: diskName || diskFile.name || "disk.st",
        diskBuffer: buffer,
      }, window.location.origin, [buffer]);
    } catch (err) {
      status("Engine, error", `Could not send disk: ${err?.message || err}`);
      overlay.classList.remove("is-hidden");
    }
  }

  const getKeyInfo = (code) => keyMap[code] || { key: code, code, keyCode: 0 };

  const dispatchKeyboard = (target, type, info) => {
    const event = new KeyboardEvent(type, {
      key: info.key,
      code: info.code,
      keyCode: info.keyCode,
      which: info.keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    target?.dispatchEvent(event);
  };

  const sendKey = (code, down) => {
    focusEmulator();
    const info = getKeyInfo(code);
    const type = down ? "keydown" : "keyup";
    try {
      const win = frame.contentWindow;
      const doc = win?.document;
      const canvas = doc?.getElementById("canvas");
      dispatchKeyboard(canvas, type, info);
      dispatchKeyboard(doc, type, info);
      dispatchKeyboard(win, type, info);
    } catch (_) {}
  };

  const holdButtonKey = (code) => {
    if (heldButtonKeys.has(code)) return;
    heldButtonKeys.add(code);
    sendKey(code, true);
  };

  const releaseButtonKey = (code) => {
    if (!heldButtonKeys.has(code)) return;
    heldButtonKeys.delete(code);
    sendKey(code, false);
  };

  function releaseHeldButtons() {
    Array.from(heldButtonKeys).forEach((code) => releaseButtonKey(code));
    document.querySelectorAll(".is-pressed").forEach((button) => button.classList.remove("is-pressed"));
  }

  const setJoystickKeys = (nextKeys) => {
    joystickKeys.forEach((code) => {
      if (!nextKeys.has(code)) sendKey(code, false);
    });
    nextKeys.forEach((code) => {
      if (!joystickKeys.has(code)) sendKey(code, true);
    });
    joystickKeys = nextKeys;
  };

  function releaseJoystick() {
    setJoystickKeys(new Set());
    activeJoyTouchId = null;
    if (stickThumb) stickThumb.style.transform = "translate(-50%, -50%)";
  }

  const updateJoystickFromPoint = (clientX, clientY) => {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rawX = clientX - cx;
    const rawY = clientY - cy;
    const max = rect.width * 0.28;
    const distance = Math.hypot(rawX, rawY);
    const scale = distance > max ? max / distance : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    const dead = rect.width * 0.12;
    const next = new Set();

    if (rawX < -dead) next.add("ArrowLeft");
    if (rawX > dead) next.add("ArrowRight");
    if (rawY < -dead) next.add("ArrowUp");
    if (rawY > dead) next.add("ArrowDown");

    stickThumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    setJoystickKeys(next);
  };

  const findTouch = (touchList, id) => Array.from(touchList || []).find((touch) => touch.identifier === id);

  frame.addEventListener("load", () => {
    status("Engine, loading", diskName ? "Waiting for Hatari to request the disk" : "Starting Hatari");
    setTimeout(focusEmulator, 1000);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === "tonyst-ready-for-files") {
      if (event.data.wantsDisk) sendDiskToFrame();
    }

    if (event.data?.type === "tonyst-status") {
      status(event.data.label || "Engine, loaded", event.data.detail || "Hatari ready");
      if (event.data.hideOverlay) overlay.classList.add("is-hidden");
    }

    if (event.data?.type === "tonyst-error") {
      status("Engine, error", event.data.detail || "Hatari error");
      overlay.classList.remove("is-hidden");
    }
  });

  menuButton.addEventListener("click", openMenu);
  closeMenuButton.addEventListener("click", closeMenu);
  menuBackdrop.addEventListener("click", (event) => {
    if (event.target === menuBackdrop) closeMenu();
  });

  keyboardButton.addEventListener("click", () => {
    closeMenu();
    keyboardPanel.hidden = !keyboardPanel.hidden;
  });
  closeKeyboardButton.addEventListener("click", () => {
    keyboardPanel.hidden = true;
  });

  tosButton?.addEventListener("click", () => {
    closeMenu();
    status("BIOS/TOS paused", "Use Load game or disk only for this build");
    overlay.classList.add("is-hidden");
  });

  diskButton.addEventListener("click", () => {
    closeMenu();
    diskInput.click();
  });

  cleanStartButton?.addEventListener("click", () => {
    closeMenu();
    clearAllFiles();
    reboot();
  });

  clearTosButton?.addEventListener("click", () => {
    closeMenu();
    clearAllFiles();
    reboot();
  });

  tosInput?.addEventListener("change", () => {
    tosInput.value = "";
    status("BIOS/TOS paused", "Use Load game or disk only for this build");
  });

  diskInput.addEventListener("change", () => {
    const file = diskInput.files?.[0];
    if (!file) return;
    diskFile = file;
    diskName = file.name;
    reboot();
  });

  runButton.addEventListener("click", () => {
    closeMenu();
    focusEmulator();
  });

  pauseButton.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    try {
      frame.contentWindow?.postMessage({ type: "tonyst-pause", paused: isPaused }, window.location.origin);
    } catch (_) {}
  });

  resetButton.addEventListener("click", () => {
    closeMenu();
    reboot();
  });

  fullscreenButton.addEventListener("click", async () => {
    closeMenu();
    try {
      await (frame.requestFullscreen?.() || frame.webkitRequestFullscreen?.());
    } catch (_) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch (_) {}
    }
  });

  if (isTouchDevice) {
    joystick.addEventListener("touchstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
      keyboardPanel.hidden = true;
      if (activeJoyTouchId !== null || !event.changedTouches.length) return;
      const touch = event.changedTouches[0];
      activeJoyTouchId = touch.identifier;
      updateJoystickFromPoint(touch.clientX, touch.clientY);
    }, { passive: false });

    joystick.addEventListener("touchmove", (event) => {
      if (activeJoyTouchId === null) return;
      const touch = findTouch(event.changedTouches, activeJoyTouchId) || findTouch(event.touches, activeJoyTouchId);
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      updateJoystickFromPoint(touch.clientX, touch.clientY);
    }, { passive: false });

    ["touchend", "touchcancel"].forEach((type) => {
      joystick.addEventListener(type, (event) => {
        if (activeJoyTouchId === null) return;
        const touch = findTouch(event.changedTouches, activeJoyTouchId);
        if (!touch) return;
        event.preventDefault();
        event.stopPropagation();
        releaseJoystick();
      }, { passive: false });
    });
  } else {
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      keyboardPanel.hidden = true;
      joystick.setPointerCapture?.(event.pointerId);
      updateJoystickFromPoint(event.clientX, event.clientY);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (!joystick.hasPointerCapture?.(event.pointerId)) return;
      event.preventDefault();
      updateJoystickFromPoint(event.clientX, event.clientY);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      joystick.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        releaseJoystick();
      });
    });
  }

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;

    if (isTouchDevice) {
      const activeTouches = new Set();

      button.addEventListener("touchstart", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.id === "fireButton") keyboardPanel.hidden = true;
        Array.from(event.changedTouches).forEach((touch) => activeTouches.add(touch.identifier));
        button.classList.add("is-pressed");
        holdButtonKey(code);
      }, { passive: false });

      const touchEnd = (event) => {
        let changed = false;
        Array.from(event.changedTouches).forEach((touch) => {
          if (activeTouches.delete(touch.identifier)) changed = true;
        });
        if (!changed) return;
        event.preventDefault();
        event.stopPropagation();
        if (activeTouches.size === 0) {
          button.classList.remove("is-pressed");
          releaseButtonKey(code);
        }
      };

      button.addEventListener("touchend", touchEnd, { passive: false });
      button.addEventListener("touchcancel", touchEnd, { passive: false });
    } else {
      const down = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.id === "fireButton") keyboardPanel.hidden = true;
        button.classList.add("is-pressed");
        holdButtonKey(code);
      };
      const up = (event) => {
        event.preventDefault();
        button.classList.remove("is-pressed");
        releaseButtonKey(code);
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("pointerleave", up);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      releaseJoystick();
      releaseHeldButtons();
    }
  });
})();
