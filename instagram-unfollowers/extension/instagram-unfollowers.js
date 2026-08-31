/*
 * Instagram Unfollowers by zeytokg — Chrome Extension build
 * https://github.com/zeytokg
 *
 * Runs locally in the Instagram tab and uses the Instagram session already
 * present in the browser. The extension popup injects this file only after
 * the user presses Start.
 */
(() => {
  "use strict";

  // If a previous scan/panel is still alive, stop it before starting a new one.
  try {
    if (typeof window.__iguCleanup === "function") window.__iguCleanup();
  } catch {}

  const ROOT_ID = "igu-root";
  const STYLE_ID = "igu-style";
  const STORAGE_KEY = "igu_unfollower_state_v2";
  const PANEL_POSITION_KEY = "igu-zeytokg-panel-position-v1";
  const LAUNCHER_ID = "igu-zeytokg-launcher";
  const LAUNCHER_POSITION_KEY = "igu-zeytokg-launcher-position-v1";
  const APP_ID_HEADER = "936619743392459";
  const MAX_RETRIES = 3;

  const DEFAULTS = {
    scanDelayMs: [900, 1700],
    scanBreakEvery: 6,
    scanBreakMs: 10000,
    unfollowDelayMs: [6000, 11000],
    unfollowBreakEvery: 5,
    unfollowBreakMs: 5 * 60 * 1000
  };

  const I18N = {
    en: {
      langButton: "TR",
      title: "Instagram Unfollowers",
      subtitle: "See who doesn't follow you back",
      close: "Close",
      scanBtn: "Start Scan",
      idleText: "We'll scan the accounts you follow and find the ones that don't follow you back. Nothing changes during the scan.",
      scanFailed: "Scan failed.",
      cookieMissing: "Couldn't read your Instagram login session. Log in to Instagram, then click the extension icon again.",
      csrfMissing: "Couldn't read the csrftoken cookie — check that you're logged in.",
      openInstagramFirst: "Open Instagram first, then click the extension icon again.",
      scanningTitle: "Scanning",
      unfollowingTitle: "Unfollowing",
      pause: "Pause",
      resume: "Resume",
      cancel: "Cancel",
      scannedSoFar: "{n} scanned so far...",
      loadingFollowing: "Loading the people you follow...",
      breakScan: "Taking a short break to be gentle with Instagram...",
      waitNext: "Waiting before the next action...",
      breakLong: "Long break to protect your account...",
      rateLimited: "Instagram is rate-limiting requests, retrying in a moment...",
      notFollowingBack: "{n} accounts don't follow you back",
      searchPlaceholder: "Search by username",
      filterVerified: "Verified",
      filterPrivate: "Private",
      selectAll: "Select all",
      clearSelection: "Clear selection",
      copy: "Copy",
      unfollow: "Unfollow",
      noMatch: "No users match your filters.",
      confirmUnfollow: "{n} accounts will be unfollowed. This runs slowly to reduce the chance of account restrictions. Continue?",
      copiedToast: "Copied {n} usernames.",
      copyFail: "Copy failed. Select the usernames and try again.",
      doneSummary: "{ok} unfollowed, {fail} failed.",
      backToResults: "Back to results",
      blockedMsg: "Instagram blocked this action: {reason}. Wait before trying again."
    },
    tr: {
      langButton: "EN",
      title: "Instagram Takip Etmeyenler",
      subtitle: "Seni geri takip etmeyenleri gör",
      close: "Kapat",
      scanBtn: "Taramayı Başlat",
      idleText: "Takip ettiklerini tarayıp seni geri takip etmeyenleri buluruz. Tarama sırasında hiçbir şey değişmez.",
      scanFailed: "Tarama başarısız oldu.",
      cookieMissing: "Instagram oturumu okunamadı. Instagram'a giriş yapıp eklenti simgesine tekrar tıkla.",
      csrfMissing: "csrftoken çerezi okunamadı — giriş yaptığından emin ol.",
      openInstagramFirst: "Önce Instagram'ı aç, sonra eklenti simgesine tekrar tıkla.",
      scanningTitle: "Taranıyor",
      unfollowingTitle: "Takip bırakılıyor",
      pause: "Duraklat",
      resume: "Devam et",
      cancel: "İptal",
      scannedSoFar: "Şu ana kadar {n} tarandı...",
      loadingFollowing: "Takip ettiklerin yükleniyor...",
      breakScan: "Instagram'ı yormamak için kısa bir mola...",
      waitNext: "Sıradaki işlem için bekleniyor...",
      breakLong: "Hesabı korumak için uzun mola...",
      rateLimited: "Instagram istekleri sınırlandırıyor, biraz sonra tekrar denenecek...",
      notFollowingBack: "{n} hesap seni geri takip etmiyor",
      searchPlaceholder: "Kullanıcı adına göre ara",
      filterVerified: "Onaylı",
      filterPrivate: "Gizli",
      selectAll: "Tümünü seç",
      clearSelection: "Seçimi temizle",
      copy: "Kopyala",
      unfollow: "Takibi bırak",
      noMatch: "Filtrelerine uyan kullanıcı yok.",
      confirmUnfollow: "{n} hesabın takibi bırakılacak. Hesap kısıtlaması riskini azaltmak için işlem yavaş çalışır. Devam edilsin mi?",
      copiedToast: "{n} kullanıcı adı kopyalandı.",
      copyFail: "Kopyalama başarısız oldu. Kullanıcı adlarını seçip tekrar dene.",
      doneSummary: "{ok} takipten çıkarıldı, {fail} başarısız.",
      backToResults: "Sonuçlara dön",
      blockedMsg: "Instagram bu işlemi engelledi: {reason}. Tekrar denemeden önce bekle."
    }
  };

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function detectLanguage(saved) {
    // Always starts in English; only switches to Turkish if the person
    // has explicitly toggled it before (remembered via localStorage).
    if (saved === "tr" || saved === "en") return saved;
    return "en";
  }

  const saved = safeParse(localStorage.getItem(STORAGE_KEY)) || {};
  const state = {
    view: "idle",
    error: "",
    users: [],
    selected: new Set(),
    hidden: new Set(saved.hidden || []),
    filters: saved.filters || { verified: true, private: true },
    search: "",
    settings: { ...DEFAULTS, ...(saved.settings || {}) },
    progress: { current: 0, total: 0, note: "" },
    paused: false,
    cancelled: false,
    log: [],
    language: detectLanguage(saved.language)
  };

  function t(key, vars) {
    const dict = I18N[state.language] || I18N.en;
    const template = dict[key] ?? I18N.en[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  if (location.hostname !== "www.instagram.com") {
    alert(t("openInstagramFirst"));
    return;
  }

  // Stop any previous injected instance before starting another one.
  window.__iguCleanup?.();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        hidden: [...state.hidden],
        filters: state.filters,
        settings: state.settings,
        language: state.language
      }));
    } catch { /* localStorage can be unavailable */ }
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[-.+*]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  }

  function randRange([min, max]) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }

  async function waitWhilePaused() {
    while (state.paused && !state.cancelled) await sleep(200);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  async function igGet(url) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "x-ig-app-id": APP_ID_HEADER,
          "x-requested-with": "XMLHttpRequest"
        }
      });

      if (res.ok) return res.json();

      const retryable = res.status === 429 || (res.status >= 500 && res.status < 600);
      if (!retryable || attempt >= MAX_RETRIES) {
        throw new Error(`Request failed (HTTP ${res.status})`);
      }

      const wait = Math.min(60000, 4000 * Math.pow(2, attempt));
      await countdownWait(wait, t("rateLimited"));
      if (state.cancelled) throw new Error(t("scanFailed"));
    }
  }

  async function igPost(url, csrf) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "x-ig-app-id": APP_ID_HEADER,
        "x-requested-with": "XMLHttpRequest",
        "x-csrftoken": csrf,
        "content-type": "application/x-www-form-urlencoded"
      }
    });

    const text = await res.text().catch(() => "");
    let payload = null;
    try { payload = JSON.parse(text); } catch { /* ignore */ }
    return { status: res.status, payload };
  }

  function normalizeUser(user) {
    return {
      id: String(user.id || user.pk || user.pk_id || ""),
      username: String(user.username || ""),
      fullName: String(user.full_name || ""),
      avatar: String(user.profile_pic_url || ""),
      isPrivate: Boolean(user.is_private),
      isVerified: Boolean(user.is_verified),
      followsBack: Boolean(user.follows_viewer ?? user.friendship_status?.followed_by ?? user.followed_by)
    };
  }

  async function fetchFollowing(viewerId, onProgress) {
    const out = [];
    const seen = new Set();
    let cursor = "";
    let page = 0;
    let totalGuess = 0;

    while (true) {
      await waitWhilePaused();
      if (state.cancelled) break;

      const variables = {
        id: viewerId,
        include_reel: true,
        fetch_mutual: false,
        first: 24
      };
      if (cursor) variables.after = cursor;

      const url = `/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      const json = await igGet(url);
      const edge = json?.data?.user?.edge_follow;
      if (!edge?.edges) throw new Error(t("scanFailed"));

      for (const item of edge.edges) {
        const user = normalizeUser(item.node);
        if (user.id && user.username && !seen.has(user.id)) {
          seen.add(user.id);
          out.push(user);
        }
      }

      if (!totalGuess && typeof edge.count === "number") totalGuess = edge.count;
      page += 1;
      onProgress(out.length, totalGuess);

      cursor = edge.page_info?.end_cursor || "";
      if (!edge.page_info?.has_next_page || !cursor) break;

      await sleep(randRange(state.settings.scanDelayMs));
      if (state.settings.scanBreakEvery > 0 && page % state.settings.scanBreakEvery === 0) {
        await countdownWait(state.settings.scanBreakMs, t("breakScan"));
      }
    }

    return out;
  }

  async function unfollowOne(userId, csrf) {
    const attempts = [
      `/api/v1/friendships/destroy/${userId}/`,
      `/web/friendships/${userId}/unfollow/`
    ];

    let last = { ok: false, blocked: false, reason: "" };

    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await sleep(randRange([1200, 2500]));

      let status;
      let payload;
      try {
        ({ status, payload } = await igPost(attempts[i], csrf));
      } catch (error) {
        last = { ok: false, blocked: false, reason: error?.message || "network error" };
        continue;
      }

      if (status === 429 || status === 401 || status === 403) {
        return { ok: false, blocked: true, reason: payload?.message || `HTTP ${status}` };
      }
      if (status >= 200 && status < 300 && payload?.status === "ok") {
        return { ok: true, blocked: false, reason: "" };
      }
      last = { ok: false, blocked: false, reason: payload?.message || `HTTP ${status}` };
    }

    return last;
  }

  async function countdownWait(ms, label) {
    let remaining = ms;
    updateNote(`${label} (${Math.ceil(remaining / 1000)}s)`);
    while (remaining > 0 && !state.cancelled) {
      await sleep(Math.min(1000, remaining));
      remaining -= 1000;
      updateNote(`${label} (${Math.max(0, Math.ceil(remaining / 1000))}s)`);
    }
  }

  function updateNote(note) {
    state.progress.note = note;
    const el = document.querySelector("#igu-note");
    if (el) el.textContent = note;
  }

  async function startScan() {
    state.view = "scanning";
    state.error = "";
    state.cancelled = false;
    state.paused = false;
    state.users = [];
    state.selected.clear();
    state.progress = { current: 0, total: 0, note: t("loadingFollowing") };
    render();

    try {
      const viewerId = getCookie("ds_user_id");
      if (!viewerId) throw new Error(t("cookieMissing"));

      const users = await fetchFollowing(viewerId, (current, totalGuess) => {
        state.progress = {
          current,
          total: totalGuess,
          note: t("scannedSoFar", { n: current })
        };
        renderProgressOnly();
      });

      if (state.cancelled) {
        state.view = "idle";
        render();
        return;
      }

      state.users = users;
      state.view = "results";
      render();
    } catch (error) {
      state.error = error?.message || t("scanFailed");
      state.view = "idle";
      render();
    }
  }

  function displayedUsers() {
    const query = state.search.trim().toLowerCase();
    return state.users
      .filter((user) => !user.followsBack)
      .filter((user) => !state.hidden.has(user.id))
      .filter((user) => state.filters.verified || !user.isVerified)
      .filter((user) => state.filters.private || !user.isPrivate)
      .filter((user) => !query || `${user.username} ${user.fullName}`.toLowerCase().includes(query))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async function startUnfollow(targets) {
    const csrf = getCookie("csrftoken");
    if (!csrf) {
      alert(t("csrfMissing"));
      return;
    }

    state.view = "unfollowing";
    state.cancelled = false;
    state.paused = false;
    state.log = [];
    state.progress = { current: 0, total: targets.length, note: "" };
    render();

    for (let i = 0; i < targets.length; i++) {
      await waitWhilePaused();
      if (state.cancelled) break;

      const user = targets[i];
      let outcome;
      try {
        outcome = await unfollowOne(user.id, csrf);
      } catch (error) {
        outcome = { ok: false, blocked: false, reason: error?.message || "network error" };
      }

      state.log.push({ user, ...outcome });
      if (outcome.ok) state.users = state.users.filter((item) => item.id !== user.id);

      state.progress.current = i + 1;
      renderProgressOnly();

      if (outcome.blocked) {
        state.error = t("blockedMsg", { reason: outcome.reason });
        break;
      }

      const isLast = i === targets.length - 1;
      if (!isLast) {
        await countdownWait(randRange(state.settings.unfollowDelayMs), t("waitNext"));
        if (state.settings.unfollowBreakEvery > 0 && (i + 1) % state.settings.unfollowBreakEvery === 0) {
          await countdownWait(state.settings.unfollowBreakMs, t("breakLong"));
        }
      }
    }

    state.view = "done";
    render();
  }

  function readPanelPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(PANEL_POSITION_KEY) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch {}
    return null;
  }

  function savePanelPosition(x, y) {
    try { localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify({ x, y })); } catch {}
  }

  function saveLauncherPosition(x, y) {
    try { localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify({ x, y })); } catch {}
  }

  function clampPanelPosition(root, x, y) {
    const margin = 10;
    const rect = root.getBoundingClientRect();
    const width = rect.width || Math.min(400, Math.max(280, window.innerWidth - 24));
    const height = rect.height || 320;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - Math.min(height, window.innerHeight - margin * 2) - margin);
    return {
      x: Math.min(Math.max(Math.round(x), margin), maxX),
      y: Math.min(Math.max(Math.round(y), margin), maxY)
    };
  }

  function setPanelPosition(root, x, y, shouldSave = false) {
    const next = clampPanelPosition(root, x, y);
    root.style.left = `${next.x}px`;
    root.style.top = `${next.y}px`;
    if (shouldSave) savePanelPosition(next.x, next.y);
    return next;
  }

  function positionPanelNearLauncher(root) {
    const saved = readPanelPosition();
    if (saved) {
      setPanelPosition(root, saved.x, saved.y, false);
      return;
    }

    const launcher = document.getElementById(LAUNCHER_ID);
    const launcherRect = launcher?.getBoundingClientRect();
    const panelRect = root.getBoundingClientRect();
    const gap = 6;
    const panelWidth = panelRect.width || 400;
    const panelHeight = panelRect.height || 320;

    if (!launcherRect) {
      setPanelPosition(root, Math.max(10, window.innerWidth - panelWidth - 24), 80, false);
      return;
    }

    let x = launcherRect.right + gap;
    if (x + panelWidth > window.innerWidth - 10) x = launcherRect.left - panelWidth - gap;

    let y = launcherRect.top;
    if (y + panelHeight > window.innerHeight - 10) y = window.innerHeight - panelHeight - 10;
    setPanelPosition(root, x, y, false);
  }

  function bindPanelDrag(root) {
    const handle = root.querySelector(".igu-header");
    if (!handle) return;

    let drag = null;

    const moveLauncher = (x, y) => {
      const launcher = document.getElementById(LAUNCHER_ID);
      if (!launcher) return null;
      const margin = 10;
      const width = launcher.getBoundingClientRect().width || 60;
      const height = launcher.getBoundingClientRect().height || 60;
      const nextX = Math.min(Math.max(Math.round(x), margin), Math.max(margin, window.innerWidth - width - margin));
      const nextY = Math.min(Math.max(Math.round(y), margin), Math.max(margin, window.innerHeight - height - margin));
      launcher.style.left = `${nextX}px`;
      launcher.style.top = `${nextY}px`;
      return { x: nextX, y: nextY };
    };

    const finish = (event) => {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      handle.classList.remove("igu-dragging");
      document.documentElement.style.removeProperty("user-select");
      const rect = root.getBoundingClientRect();
      setPanelPosition(root, rect.left, rect.top, true);
      const launcher = document.getElementById(LAUNCHER_ID);
      if (launcher) {
        const launcherRect = launcher.getBoundingClientRect();
        saveLauncherPosition(launcherRect.left, launcherRect.top);
      }
      drag = null;
    };

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, a, input, textarea, select, label")) return;

      const rect = root.getBoundingClientRect();
      const launcher = document.getElementById(LAUNCHER_ID);
      const launcherRect = launcher?.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        launcherX: launcherRect?.left ?? null,
        launcherY: launcherRect?.top ?? null
      };
      handle.classList.add("igu-dragging");
      document.documentElement.style.setProperty("user-select", "none", "important");
      handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const next = setPanelPosition(
        root,
        drag.originX + (event.clientX - drag.startX),
        drag.originY + (event.clientY - drag.startY),
        false
      );

      if (drag.launcherX !== null && drag.launcherY !== null) {
        moveLauncher(
          drag.launcherX + (next.x - drag.originX),
          drag.launcherY + (next.y - drag.originY)
        );
      }
      event.preventDefault();
    });

    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  const CSS = `
    #${ROOT_ID}{position:fixed;z-index:2147483647;width:min(400px,calc(100vw - 20px));font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#fdeef7;filter:drop-shadow(0 24px 44px rgba(0,0,0,.42))}
    #${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID}.igu-enter .igu-panel{animation:igu-panel-in .3s cubic-bezier(.16,1,.3,1) both}
    #${ROOT_ID}.igu-closing{pointer-events:none}
    #${ROOT_ID}.igu-closing .igu-panel{animation:igu-panel-out .17s cubic-bezier(.4,0,1,1) both}
    .igu-panel{width:100%;max-height:min(78vh,700px);background:linear-gradient(180deg,#20101d,#160b14);border-radius:22px;box-shadow:0 0 0 1px rgba(255,255,255,.05);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,110,170,.2);transform-origin:top left;will-change:transform,opacity}
    @keyframes igu-panel-in{0%{opacity:0;transform:translateY(8px) scale(.94)}65%{opacity:1;transform:translateY(-1px) scale(1.008)}100%{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes igu-panel-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(5px) scale(.97)}}
    .igu-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 14px 13px;background:linear-gradient(135deg,rgba(255,79,154,.16),transparent 65%);border-bottom:1px solid rgba(255,255,255,.06);cursor:grab;touch-action:none}
    .igu-header.igu-dragging{cursor:grabbing}
    .igu-header-actions,.igu-header-actions button{cursor:pointer}
    .igu-brand{display:flex;align-items:center;gap:11px;min-width:0;pointer-events:none}
    .igu-heart{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#ff3e91,#ff83ba);color:#fff;font-size:17px;box-shadow:0 8px 22px rgba(255,62,145,.28)}
    .igu-header strong{font-size:14px;letter-spacing:.01em;color:#fff;font-weight:700;display:block}
    .igu-header small{display:block;margin-top:2px;color:#c98ba9;font-size:10.5px}
    .igu-header small b{color:#ff9fc4;font-weight:700}
    .igu-header-actions{display:flex;align-items:center;gap:6px;flex:none}
    .igu-header-actions button{background:rgba(255,79,154,.1);border:1px solid rgba(255,79,154,.25);color:#ff9fc4;border-radius:10px;padding:6px 10px;font-size:11px;font-weight:700;letter-spacing:.04em;font-family:inherit}
    .igu-header-actions button:hover{background:rgba(255,79,154,.2)}
    .igu-close{width:32px;height:32px;padding:0!important;display:grid;place-items:center;font-size:18px;color:#e3b8cd!important;background:rgba(255,255,255,.05)!important;border-color:rgba(255,255,255,.08)!important}
    .igu-body{padding:16px;overflow-y:auto;background:transparent}
    .igu-btn{border:1px solid rgba(255,255,255,.08);background:#2a1526;color:#fdeef7;border-radius:12px;padding:9px 13px;cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;transition:filter .12s ease,transform .12s ease}
    .igu-btn:hover:not(:disabled){filter:brightness(1.15)}
    .igu-btn:active:not(:disabled){transform:translateY(1px)}
    .igu-btn--primary{background:linear-gradient(135deg,#ff3f91,#ff70ae);border-color:transparent;color:#fff;box-shadow:0 12px 28px rgba(255,63,145,.22)}
    .igu-btn--danger{background:linear-gradient(135deg,#e62b74,#ff4f8e);border-color:transparent;color:#fff}
    .igu-btn:disabled{opacity:.35;cursor:not-allowed}
    .igu-row{display:flex;align-items:center;gap:9px;padding:8px 6px;border-radius:12px}
    .igu-row:hover{background:rgba(255,79,154,.06)}
    .igu-row img{width:36px;height:36px;border-radius:12px;object-fit:cover;background:#2a1526}
    .igu-row .name{flex:1;min-width:0}
    .igu-row .name a{color:#fdeef7;text-decoration:none;font-weight:700}
    .igu-row .name a:hover{color:#ff9fc4}
    .igu-row .name div{font-size:11.5px;color:#a877a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .igu-search{width:100%;padding:9px 12px;border:1px solid rgba(255,255,255,.08);background:#2a1526;color:#fdeef7;border-radius:12px;margin-bottom:8px;font-size:12.5px;font-family:inherit}
    .igu-search:focus{outline:none;border-color:#ff4f9a}
    .igu-list{max-height:320px;overflow-y:auto;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);margin:8px 0}
    .igu-bar{height:5px;background:#2a1526;border-radius:99px;overflow:hidden;margin:10px 0}
    .igu-bar span{display:block;height:100%;background:linear-gradient(90deg,#ff3f91,#ff9fc4);transition:width .2s}
    .igu-muted{color:#b98aa8;font-size:11.5px}
    .igu-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    .igu-filters{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}
    .igu-chip{border:1px solid rgba(255,255,255,.08);border-radius:99px;padding:4px 11px;font-size:11.5px;cursor:pointer;background:#2a1526;color:#c98ba9}
    .igu-chip.on{background:rgba(255,79,154,.18);color:#ff9fc4;border-color:rgba(255,79,154,.45);font-weight:700}
    #igu-note{display:block;margin-top:6px}
    .igu-warn{background:rgba(255,64,132,.1);border:1px solid rgba(255,64,132,.3);color:#ffc1db;border-radius:12px;padding:9px 11px;font-size:11.5px;margin-bottom:10px;line-height:1.5}
    .igu-footer-credit{margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);color:#7a5468;font-size:10.5px;text-align:center}
    @media (max-width:520px){#${ROOT_ID}{width:calc(100vw - 20px)}.igu-panel{max-height:72vh;border-radius:18px}.igu-header{padding:12px}.igu-body{padding:14px}}
    @media (prefers-reduced-motion:reduce){#${ROOT_ID}.igu-enter .igu-panel,#${ROOT_ID}.igu-closing .igu-panel{animation-duration:.01ms!important}}
  `;
  function injectStyle() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function mount() {
    document.getElementById(ROOT_ID)?.remove();
    injectStyle();

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.classList.add("igu-enter");
    root.style.left = "10px";
    root.style.top = "10px";
    document.body.appendChild(root);

    let cleanupStarted = false;
    const onKeyDown = (event) => {
      if (event.key === "Escape") window.__iguCleanup?.();
    };
    const onResize = () => {
      if (!document.body.contains(root)) return;
      const rect = root.getBoundingClientRect();
      setPanelPosition(root, rect.left, rect.top, true);
    };

    window.__iguCleanup = () => {
      if (cleanupStarted) return;
      cleanupStarted = true;
      state.cancelled = true;
      state.paused = false;
      root.classList.remove("igu-enter");
      root.classList.add("igu-closing");
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", onResize);
      document.documentElement.style.removeProperty("user-select");

      window.setTimeout(() => {
        root.remove();
        document.getElementById(STYLE_ID)?.remove();
        window.__iguCleanup = null;
      }, 180);
    };

    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResize, { passive: true });

    render();
    requestAnimationFrame(() => positionPanelNearLauncher(root));
    window.setTimeout(() => root.classList.remove("igu-enter"), 330);
  }
  function render() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    let body = "";
    if (state.view === "idle") body = viewIdle();
    else if (state.view === "scanning") body = viewProgress(t("scanningTitle"), "cancel-scan");
    else if (state.view === "results") body = viewResults();
    else if (state.view === "unfollowing") body = viewProgress(t("unfollowingTitle"), "cancel-unfollow");
    else if (state.view === "done") body = viewDone();

    root.innerHTML = `
      <div class="igu-panel">
        <div class="igu-header">
          <div class="igu-brand">
            <span class="igu-heart">&#9829;</span>
            <div>
              <strong>Instagram Unfollowers</strong>
              <small>by <b>zeytokg</b> &middot; ${esc(t("subtitle"))}</small>
            </div>
          </div>
          <div class="igu-header-actions">
            <button data-lang type="button">${esc(t("langButton"))}</button>
            <button class="igu-close" data-close type="button" aria-label="${esc(t("close"))}">&times;</button>
          </div>
        </div>
        <div class="igu-body">${body}</div>
      </div>`;

    root.querySelector("[data-close]")?.addEventListener("click", () => window.__iguCleanup?.());
    root.querySelector("[data-lang]")?.addEventListener("click", () => {
      state.language = state.language === "en" ? "tr" : "en";
      persist();
      render();
    });

    bind(root);
    bindPanelDrag(root);
    requestAnimationFrame(() => {
      const rect = root.getBoundingClientRect();
      setPanelPosition(root, rect.left, rect.top, false);
    });
  }

  function renderProgressOnly() {
    const bar = document.querySelector("#igu-bar-fill");
    const label = document.querySelector("#igu-progress-label");
    const note = document.querySelector("#igu-note");
    if (!bar) return render();

    const { current, total } = state.progress;
    const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
    bar.style.width = `${pct}%`;
    if (label) label.textContent = total ? `${current} / ${total}` : t("scannedSoFar", { n: current });
    if (note) note.textContent = state.progress.note || "";
  }

  function viewIdle() {
    return `
      ${state.error ? `<div class="igu-warn">${esc(state.error)}</div>` : ""}
      <p class="igu-muted">${esc(t("idleText"))}</p>
      <button class="igu-btn igu-btn--primary" data-scan>${esc(t("scanBtn"))}</button>`;
  }

  function viewProgress(title, cancelAction) {
    const { current, total, note } = state.progress;
    const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
    return `
      <div id="igu-progress-label">${esc(title)}: ${total ? `${current} / ${total}` : `${current}...`}</div>
      <div class="igu-bar"><span id="igu-bar-fill" style="width:${pct}%"></span></div>
      <span id="igu-note" class="igu-muted">${esc(note)}</span>
      <div class="igu-actions">
        <button class="igu-btn" data-pause>${esc(state.paused ? t("resume") : t("pause"))}</button>
        <button class="igu-btn igu-btn--danger" data-${cancelAction}>${esc(t("cancel"))}</button>
      </div>`;
  }

  function userRowHTML(user) {
    return `
      <label class="igu-row">
        <input type="checkbox" data-select="${esc(user.id)}" ${state.selected.has(user.id) ? "checked" : ""}>
        <img src="${esc(user.avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="name">
          <a href="/${encodeURIComponent(user.username)}/" target="_blank" rel="noopener noreferrer">@${esc(user.username)}</a>
          <div>${esc(user.fullName)}</div>
        </div>
      </label>`;
  }

  function viewResults() {
    const list = displayedUsers();
    const rows = list.length ? list.map(userRowHTML).join("") : `<p class="igu-muted">${esc(t("noMatch"))}</p>`;
    const allSelected = list.length && list.every((user) => state.selected.has(user.id));

    return `
      <div class="igu-muted">${esc(t("notFollowingBack", { n: list.length }))}</div>
      <input class="igu-search" placeholder="${esc(t("searchPlaceholder"))}" value="${esc(state.search)}" data-search>
      <div class="igu-filters">
        <span class="igu-chip ${state.filters.verified ? "on" : ""}" data-filter="verified">${esc(t("filterVerified"))}</span>
        <span class="igu-chip ${state.filters.private ? "on" : ""}" data-filter="private">${esc(t("filterPrivate"))}</span>
      </div>
      <div class="igu-list">${rows}</div>
      <div class="igu-actions">
        <button class="igu-btn" data-select-all>${esc(allSelected ? t("clearSelection") : t("selectAll"))}</button>
        <button class="igu-btn" data-copy>${esc(t("copy"))}</button>
        <button class="igu-btn igu-btn--danger" data-unfollow ${state.selected.size ? "" : "disabled"}>${esc(t("unfollow"))} (${state.selected.size})</button>
      </div>`;
  }

  function viewDone() {
    const ok = state.log.filter((item) => item.ok).length;
    const fail = state.log.filter((item) => !item.ok).length;
    return `
      ${state.error ? `<div class="igu-warn">${esc(state.error)}</div>` : ""}
      <p>${esc(t("doneSummary", { ok, fail }))}</p>
      <div class="igu-actions">
        <button class="igu-btn igu-btn--primary" data-back>${esc(t("backToResults"))}</button>
      </div>
      <div class="igu-footer-credit">Instagram Unfollowers &middot; by <b>zeytokg</b></div>`;
  }

  function bind(root) {
    root.querySelector("[data-scan]")?.addEventListener("click", startScan);

    root.querySelector("[data-cancel-scan]")?.addEventListener("click", () => {
      state.cancelled = true;
      state.paused = false;
    });

    root.querySelector("[data-cancel-unfollow]")?.addEventListener("click", () => {
      state.cancelled = true;
      state.paused = false;
    });

    root.querySelector("[data-pause]")?.addEventListener("click", () => {
      state.paused = !state.paused;
      render();
    });

    const search = root.querySelector("[data-search]");
    search?.addEventListener("input", (event) => {
      state.search = event.target.value;
      const list = root.querySelector(".igu-list");
      if (list) {
        const rows = displayedUsers();
        list.innerHTML = rows.length ? rows.map(userRowHTML).join("") : `<p class="igu-muted">${esc(t("noMatch"))}</p>`;
      }
    });

    root.querySelectorAll("[data-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.getAttribute("data-filter");
        state.filters[key] = !state.filters[key];
        persist();
        render();
      });
    });

    root.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-select]");
      if (!checkbox) return;

      const id = checkbox.getAttribute("data-select");
      if (checkbox.checked) state.selected.add(id);
      else state.selected.delete(id);

      const button = root.querySelector("[data-unfollow]");
      if (button) {
        button.disabled = state.selected.size === 0;
        button.textContent = `${t("unfollow")} (${state.selected.size})`;
      }
    });

    root.querySelector("[data-select-all]")?.addEventListener("click", () => {
      const list = displayedUsers();
      const allSelected = list.length && list.every((user) => state.selected.has(user.id));
      if (allSelected) list.forEach((user) => state.selected.delete(user.id));
      else list.forEach((user) => state.selected.add(user.id));
      render();
    });

    root.querySelector("[data-copy]")?.addEventListener("click", async () => {
      const list = displayedUsers();
      const target = state.selected.size ? list.filter((user) => state.selected.has(user.id)) : list;
      const text = target.map((user) => user.username).join("\n");

      try {
        await navigator.clipboard.writeText(text);
        alert(t("copiedToast", { n: target.length }));
      } catch {
        alert(t("copyFail"));
      }
    });

    root.querySelector("[data-unfollow]")?.addEventListener("click", () => {
      const targets = state.users.filter((user) => state.selected.has(user.id));
      if (!targets.length) return;
      if (confirm(t("confirmUnfollow", { n: targets.length }))) startUnfollow(targets);
    });

    root.querySelector("[data-back]")?.addEventListener("click", () => {
      state.view = "results";
      state.log = [];
      state.error = "";
      render();
    });
  }

  mount();
})();
