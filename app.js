(() => {
  const VERSION = "65";

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

  let diskUrl = "";
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

  for (let i = 1; i <= 10; i += 1) keyMap[`F${i}`] = { key: `F${i}`, code: `F${i}`, keyCode: 111 + i };
  for (let i = 0; i <= 9; i += 1) keyMap[`Digit${i}`] = { key: String(i), code: `Digit${i}`, keyCode: 48 + i };
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
    keyMap[`Key${letter}`] = { key: letter.toLowerCase(), code: `Key${letter}`, keyCode: letter.charCodeAt(0) };
  });

  const revoke = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  const status = (label, detail) => {
    if (engineLabel) engineLabel.textContent = label;
    if (detail && engineStatus) engineStatus.textContent = detail;
  };

  const setFileLabel = () => {
    if (fileLabel) fileLabel.textContent = diskName || "Built in boot";
  };

  const buildSrc = () => {
    const params = new URLSearchParams();
    params.set("v", VERSION);
    if (diskUrl) params.set("disk", diskUrl);
    if (diskName) params.set("diskName", diskName);
    const qs = params.toString();
    return `tonyst.html${qs ? `?${qs}` : ""}`;
  };

  const closeMenu = () => {
    if (menuBackdrop) menuBackdrop.hidden = true;
  };

  const openMenu = () => {
    if (keyboardPanel) keyboardPanel.hidden = true;
    if (menuBackdrop) menuBackdrop.hidden = false;
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

  const reboot = () => {
    releaseJoystick();
    releaseHeldButtons();
    if (overlay) overlay.classList.remove("is-hidden");
    status("Engine, starting", diskName ? "Booting selected game" : "Starting Hatari WebAssembly");
    setFileLabel();
    if (frame) frame.src = buildSrc();

    // Fallback, because the emulator can be loaded even if Safari swallows a status message.
    window.clearTimeout(reboot._fallback);
    reboot._fallback = window.setTimeout(() => {
      if (overlay) overlay.classList.add("is-hidden");
      status("Engine, loaded", diskName ? "Game sent to Hatari" : "Hatari ready");
      focusEmulator();
    }, diskName ? 5000 : 3500);
  };

  const cleanStart = () => {
    revoke(diskUrl);
    diskUrl = "";
    diskName = "";
    if (diskInput) diskInput.value = "";
    if (tosInput) tosInput.value = "";
    isPaused = false;
    if (pauseButton) pauseButton.textContent = "Pause";
    reboot();
  };

  const focusEmulator = () => {
    try {
      frame?.focus();
      const win = frame?.contentWindow;
      const canvas = win?.document?.getElementById("canvas");
      canvas?.focus();
    } catch (_) {}
  };

  const getKeyInfo = (code) => keyMap[code] || { key: code, code, keyCode: 0 };

  const dispatchKeyboard = (target, type, info) => {
    if (!target) return;
    const event = new KeyboardEvent(type, {
      key: info.key,
      code: info.code,
      keyCode: info.keyCode,
      which: info.keyCode,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    target.dispatchEvent(event);
  };

  function sendKey(code, down) {
    focusEmulator();
    const info = getKeyInfo(code);
    const type = down ? "keydown" : "keyup";
    try {
      const win = frame?.contentWindow;
      const doc = win?.document;
      const canvas = doc?.getElementById("canvas");
      dispatchKeyboard(canvas, type, info);
      dispatchKeyboard(doc, type, info);
      dispatchKeyboard(win, type, info);
    } catch (_) {}
  }

  function holdButtonKey(code) {
    if (heldButtonKeys.has(code)) return;
    heldButtonKeys.add(code);
    sendKey(code, true);
  }

  function releaseButtonKey(code) {
    if (!heldButtonKeys.has(code)) return;
    heldButtonKeys.delete(code);
    sendKey(code, false);
  }

  const updateJoystickFromPoint = (clientX, clientY) => {
    if (!joystick || !stickThumb) return;
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

  frame?.addEventListener("load", () => {
    status("Engine, loading", diskName ? "Selected game sent to Hatari" : "Starting Hatari");
    setTimeout(focusEmulator, 800);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === "tonyst-status") {
      status(event.data.label || "Engine, loaded", event.data.detail || "Hatari ready");
      if (event.data.hideOverlay && overlay) overlay.classList.add("is-hidden");
    }

    if (event.data?.type === "tonyst-error") {
      status(event.data.label || "Engine, error", event.data.detail || "Hatari error");
      // Show the emulator anyway where possible, instead of blocking the screen forever.
      setTimeout(() => overlay?.classList.add("is-hidden"), 1200);
    }
  });

  menuButton?.addEventListener("click", openMenu);
  closeMenuButton?.addEventListener("click", closeMenu);
  menuBackdrop?.addEventListener("click", (event) => {
    if (event.target === menuBackdrop) closeMenu();
  });

  keyboardButton?.addEventListener("click", () => {
    closeMenu();
    if (keyboardPanel) keyboardPanel.hidden = !keyboardPanel.hidden;
  });
  closeKeyboardButton?.addEventListener("click", () => {
    if (keyboardPanel) keyboardPanel.hidden = true;
  });

  // TOS is intentionally disabled in this stable build.
  tosButton?.addEventListener("click", () => {
    closeMenu();
    status("TOS disabled", "Use Load game or disk for now");
  });
  clearTosButton?.addEventListener("click", () => {
    closeMenu();
    cleanStart();
  });

  diskButton?.addEventListener("click", () => {
    closeMenu();
    diskInput?.click();
  });

  cleanStartButton?.addEventListener("click", () => {
    closeMenu();
    cleanStart();
  });

  diskInput?.addEventListener("change", () => {
    const file = diskInput.files?.[0];
    if (!file) return;
    revoke(diskUrl);
    diskUrl = URL.createObjectURL(file);
    diskName = file.name;
    reboot();
  });

  runButton?.addEventListener("click", () => {
    closeMenu();
    focusEmulator();
  });

  pauseButton?.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "Resume" : "Pause";
    try {
      frame.contentWindow?.postMessage({ type: "tonyst-pause", paused: isPaused }, window.location.origin);
    } catch (_) {}
  });

  resetButton?.addEventListener("click", () => {
    closeMenu();
    reboot();
  });

  fullscreenButton?.addEventListener("click", async () => {
    closeMenu();
    try {
      await (frame.requestFullscreen?.() || frame.webkitRequestFullscreen?.());
    } catch (_) {
      try { await document.documentElement.requestFullscreen?.(); } catch (_) {}
    }
  });

  if (isTouchDevice && joystick) {
    joystick.addEventListener("touchstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (keyboardPanel) keyboardPanel.hidden = true;
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
  } else if (joystick) {
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (keyboardPanel) keyboardPanel.hidden = true;
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
        if (button.id === "fireButton" && keyboardPanel) keyboardPanel.hidden = true;
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
        if (button.id === "fireButton" && keyboardPanel) keyboardPanel.hidden = true;
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
