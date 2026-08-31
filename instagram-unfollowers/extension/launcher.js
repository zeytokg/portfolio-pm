(() => {
  "use strict";

  const HOST_ID = "igu-zeytokg-launcher";
  const PANEL_ID = "igu-root";
  const STORAGE_KEY = "igu-zeytokg-launcher-position-v1";
  const PANEL_POSITION_KEY = "igu-zeytokg-panel-position-v1";
  const SIZE = 50;
  const HOST_SIZE = 60;
  const MARGIN = 10;
  const DEFAULT_X = 150;
  const DEFAULT_Y = 24;

  if (document.getElementById(HOST_ID)) return;

  let dismissed = false;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const readPosition = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch {}
    return { x: DEFAULT_X, y: DEFAULT_Y };
  };

  const savePosition = (x, y) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })); } catch {}
  };

  const savePanelPosition = (x, y) => {
    try { localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify({ x, y })); } catch {}
  };

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = [
    "all:initial",
    "position:fixed",
    "z-index:2147483646",
    `width:${HOST_SIZE}px`,
    `height:${HOST_SIZE}px`,
    "touch-action:none",
    "user-select:none"
  ].join(";");

  const setPosition = (x, y, persist = false) => {
    const maxX = Math.max(MARGIN, window.innerWidth - HOST_SIZE - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - HOST_SIZE - MARGIN);
    const nextX = clamp(Math.round(x), MARGIN, maxX);
    const nextY = clamp(Math.round(y), MARGIN, maxY);
    host.style.left = `${nextX}px`;
    host.style.top = `${nextY}px`;
    if (persist) savePosition(nextX, nextY);
    return { x: nextX, y: nextY };
  };

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .wrap {
        position: relative;
        width: ${HOST_SIZE}px;
        height: ${HOST_SIZE}px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .main {
        appearance: none;
        position: absolute;
        left: 0;
        bottom: 0;
        width: ${SIZE}px;
        height: ${SIZE}px;
        padding: 0;
        border: 1px solid rgba(255,255,255,.25);
        border-radius: 17px;
        cursor: grab;
        display: grid;
        place-items: center;
        color: white;
        background: linear-gradient(145deg,#ff398f 0%,#ff5da2 45%,#a855f7 100%);
        box-shadow: 0 10px 28px rgba(0,0,0,.28), 0 5px 18px rgba(255,57,143,.28);
        transition: transform .16s cubic-bezier(.2,.8,.2,1), filter .16s ease, box-shadow .16s ease;
        will-change: transform;
      }
      .main:hover {
        transform: translateY(-2px) scale(1.04);
        filter: brightness(1.06);
        box-shadow: 0 14px 34px rgba(0,0,0,.32), 0 8px 24px rgba(255,57,143,.34);
      }
      .main:active { transform: scale(.97); }
      .main.dragging {
        cursor: grabbing;
        transform: scale(1.045);
        filter: brightness(1.08);
      }
      .main:disabled { cursor: wait; opacity: .72; }
      .main.open {
        box-shadow: 0 0 0 3px rgba(255,91,161,.22), 0 14px 34px rgba(0,0,0,.32);
      }
      .heart {
        font-size: 25px;
        line-height: 1;
        transform: translateY(-1px);
        text-shadow: 0 2px 8px rgba(0,0,0,.18);
        pointer-events: none;
      }
      .badge {
        position: absolute;
        right: -3px;
        bottom: -3px;
        min-width: 19px;
        height: 19px;
        padding: 0 4px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: #151017;
        border: 1px solid rgba(255,255,255,.22);
        color: #ff91c0;
        font-size: 10px;
        font-weight: 800;
        pointer-events: none;
      }
      .dismiss {
        appearance: none;
        position: absolute;
        top: 0;
        right: 0;
        z-index: 3;
        width: 22px;
        height: 22px;
        padding: 0;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.17);
        display: grid;
        place-items: center;
        background: #1b1118;
        color: #ffd8e8;
        box-shadow: 0 5px 14px rgba(0,0,0,.32);
        font: 700 15px/1 Arial, sans-serif;
        cursor: pointer;
        transition: transform .12s ease, background .12s ease;
      }
      .dismiss:hover { transform: scale(1.09); background: #35202d; }
      .tip {
        position: absolute;
        top: 66px;
        left: 25px;
        width: max-content;
        max-width: 240px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(20,13,18,.96);
        border: 1px solid rgba(255,255,255,.1);
        box-shadow: 0 10px 26px rgba(0,0,0,.28);
        color: #fff7fb;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
        opacity: 0;
        transform: translate(-50%,-4px) scale(.98);
        pointer-events: none;
        transition: opacity .14s ease, transform .14s ease;
        white-space: nowrap;
      }
      .tip small { display:block; margin-top:2px; color:#c18aa8; font-size:9px; font-weight:600; }
      .wrap:hover .tip { opacity:1; transform:translate(-50%,0) scale(1); }
      .wrap.is-dragging .tip { opacity:0; }
      @media (prefers-reduced-motion: reduce) {
        .main, .dismiss, .tip { transition:none !important; }
      }
    </style>
    <div class="wrap">
      <button class="main" type="button" aria-label="Instagram Unfollowers by zeytokg" title="Sürükle: panelle birlikte taşı · Tıkla: aç/kapat">
        <span class="heart">♥</span>
        <span class="badge">z</span>
      </button>
      <button class="dismiss" type="button" aria-label="zeytokg aracını bu sayfadan kaldır" title="Bu sayfadan tamamen kaldır">×</button>
      <div class="tip">Instagram Unfollowers<small>by zeytokg · kalpten birlikte taşı</small></div>
    </div>
  `;

  const wrap = shadow.querySelector(".wrap");
  const button = shadow.querySelector(".main");
  const dismissButton = shadow.querySelector(".dismiss");
  let drag = null;
  let suppressClick = false;

  const syncOpenState = () => {
    const open = Boolean(document.getElementById(PANEL_ID));
    button?.classList.toggle("open", open);
    if (button) {
      button.setAttribute("aria-label", open
        ? "Instagram Unfollowers panelini kapat — by zeytokg"
        : "Instagram Unfollowers panelini aç — by zeytokg");
    }
  };

  button?.addEventListener("pointerdown", (event) => {
    if (button.disabled || event.button !== 0) return;
    const rect = host.getBoundingClientRect();
    const panel = document.getElementById(PANEL_ID);
    const panelRect = panel?.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      panel,
      panelX: panelRect?.left ?? 0,
      panelY: panelRect?.top ?? 0,
      moved: false
    };
    button.setPointerCapture?.(event.pointerId);
  });

  button?.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;

    drag.moved = true;
    wrap?.classList.add("is-dragging");
    button.classList.add("dragging");
    const pos = setPosition(drag.originX + dx, drag.originY + dy, false);

    if (drag.panel?.isConnected) {
      const actualDx = pos.x - drag.originX;
      const actualDy = pos.y - drag.originY;
      drag.panel.style.left = `${Math.round(drag.panelX + actualDx)}px`;
      drag.panel.style.top = `${Math.round(drag.panelY + actualDy)}px`;
    }
    event.preventDefault();
  });

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      const rect = host.getBoundingClientRect();
      setPosition(rect.left, rect.top, true);
      if (drag.panel?.isConnected) {
        const panelRect = drag.panel.getBoundingClientRect();
        savePanelPosition(panelRect.left, panelRect.top);
      }
      suppressClick = true;
    }
    wrap?.classList.remove("is-dragging");
    button?.classList.remove("dragging");
    drag = null;
  };

  button?.addEventListener("pointerup", finishDrag);
  button?.addEventListener("pointercancel", finishDrag);

  button?.addEventListener("click", (event) => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (!button || button.disabled) return;
    button.disabled = true;

    chrome.runtime.sendMessage({ type: "IGU_TOGGLE_PANEL" }, (response) => {
      button.disabled = false;
      if (chrome.runtime.lastError || !response?.ok) {
        console.error("Instagram Unfollowers by zeytokg:", chrome.runtime.lastError?.message || response?.error || "Panel açılamadı");
        return;
      }
      button.classList.toggle("open", Boolean(response.open));
    });
  });

  const removeLauncher = () => {
    dismissed = true;
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pageshow", onPageShow);
    host.remove();
  };

  dismissButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissButton.disabled = true;
    chrome.runtime.sendMessage({ type: "IGU_CLOSE_PANEL" }, () => {
      removeLauncher();
    });
  });

  const attach = () => {
    if (dismissed) return;
    if (!document.documentElement.contains(host)) document.documentElement.appendChild(host);
    const saved = readPosition();
    setPosition(saved.x, saved.y, false);
    syncOpenState();
  };

  const observerTarget = document.body || document.documentElement;
  const observer = new MutationObserver(syncOpenState);
  observer.observe(observerTarget, { childList: true });

  const onResize = () => {
    if (dismissed) return;
    const rect = host.getBoundingClientRect();
    setPosition(rect.left, rect.top, true);
  };

  const onPageShow = () => attach();

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pageshow", onPageShow);
  attach();
})();
