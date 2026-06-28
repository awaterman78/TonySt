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

  const menuButton = document.getElementById("menuButton");
  const closeMenuButton = document.getElementById("closeMenuButton");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const keyboardButton = document.getElementById("keyboardButton");
  const keyboardPanel = document.getElementById("keyboardPanel");
  const closeKeyboardButton = document.getElementById("closeKeyboardButton");

  const joystick = document.getElementById("joystick");
  const stickThumb = document.getElementById("stickThumb");

  let tosUrl = "";
  let diskUrl = "";
  let tosName = "";
  let diskName = "";
  let isPaused = false;
  let joystickKeys = new Set();

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

  const closeMenu = () => {
    menuBackdrop.hidden = true;
  };

  const openMenu = () => {
    keyboardPanel.hidden = true;
    menuBackdrop.hidden = false;
  };

  const reboot = () => {
    releaseJoystick();
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

  const tapKey = (code) => {
    sendKey(code, true);
    window.setTimeout(() => sendKey(code, false), 70);
  };

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
    if (stickThumb) stickThumb.style.transform = "translate(-50%, -50%)";
  }

  const updateJoystick = (event) => {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rawX = event.clientX - cx;
    const rawY = event.clientY - cy;
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

  tosButton.addEventListener("click", () => {
    closeMenu();
    tosInput.click();
  });
  diskButton.addEventListener("click", () => {
    closeMenu();
    diskInput.click();
  });

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

  joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keyboardPanel.hidden = true;
    joystick.setPointerCapture?.(event.pointerId);
    updateJoystick(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (!joystick.hasPointerCapture?.(event.pointerId)) return;
    event.preventDefault();
    updateJoystick(event);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
    joystick.addEventListener(type, (event) => {
      event.preventDefault();
      releaseJoystick();
    });
  });

  document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    const down = (event) => {
      event.preventDefault();
      keyboardPanel.hidden = button.id === "fireButton" ? true : keyboardPanel.hidden;
      sendKey(code, true);
    };
    const up = (event) => {
      event.preventDefault();
      sendKey(code, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) releaseJoystick();
  });
})();
