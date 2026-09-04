/*
 * Instagram Unfollowers Finder
 * by Zeynep Tokgözlü — English / Turkish
 * ----------------------------
 * A small, self-contained tool you paste into your browser's console while
 * logged into Instagram. It scans the accounts you follow, shows you which
 * ones don't follow you back, and optionally helps you unfollow a selection
 * of them slowly and safely.
 *
 * IMPORTANT
 *  - Nothing leaves your browser. Every request goes directly from your
 *    browser to Instagram, using the session you're already logged into.
 *  - Instagram has no official public API for this. This tool relies on
 *    endpoints Instagram's own web client uses internally; Instagram can
 *    change or restrict them at any time without notice.
 *  - Sending too many requests too quickly can get your account
 *    temporarily rate-limited or action-blocked. The default delays below
 *    are intentionally conservative — lowering them is your own risk.
 *
 * Usage:
 *  1) Log into https://www.instagram.com and open DevTools console
 *     (Windows/Linux: Ctrl+Shift+J, macOS: Cmd+Option+J).
 *  2) Paste this entire file into the console and press Enter.
 *     (If Chrome blocks pasting, type `allow pasting` first, press Enter,
 *     then paste again.)
 *  3) Click "Scan now" in the panel that appears.
 */
(() => {
  "use strict";

  const ROOT_ID = "igu-root";
  const STYLE_ID = "igu-style";
  const STORAGE_KEY = "igu_unfollower_state_v3"; // v3: reset legacy filter/hidden state that could hide private accounts
  const APP_ID_HEADER = "936619743392459"; // Instagram web's public app id
  const MAX_RETRIES = 3;

  const DEFAULTS = {
    scanDelayMs: [900, 1700],        // pause between scan pages
    scanBreakEvery: 6,               // long break every N pages
    scanBreakMs: 10000,
    unfollowDelayMs: [6000, 11000],  // pause between each unfollow
    unfollowBreakEvery: 5,
    unfollowBreakMs: 5 * 60 * 1000,  // 5 min
  };

  // ---------- translations ----------

  const I18N = {
    en: {
      langButton: "TR",
      title: "Instagram Unfollowers",
      subtitle: "See who doesn't follow you back",
      close: "Close",
      scanBtn: "Scan now",
      idleText: "We'll scan the accounts you follow and find the ones that don't follow you back. Nothing changes during the scan.",
      retry: "Try again",
      scanFailed: "Scan failed.",
      cookieMissing: "Couldn't read your login cookie. Make sure you're signed into Instagram.",
      csrfMissing: "Couldn't read the csrftoken cookie — check that you're logged in.",
      openInstagramFirst: "Open https://www.instagram.com first, log in, then paste this script again.",
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
      confirmUnfollow: "{n} accounts will be unfollowed. This runs slowly to protect your account, and completed unfollows can't be undone from this tool. Continue?",
      copiedToast: "Copied {n} usernames.",
      copyFail: "Copy failed.",
      doneSummary: "{ok} unfollowed, {fail} failed.",
      backToResults: "Back to results",
      blockedMsg: "Instagram blocked this action: {reason}. Wait a few hours before trying again.",
    },
    tr: {
      langButton: "EN",
      title: "Instagram Takip Etmeyenler",
      subtitle: "Seni geri takip etmeyenleri gör",
      close: "Kapat",
      scanBtn: "Taramayı başlat",
      idleText: "Takip ettiğin hesapları tarayıp seni geri takip etmeyenleri buluruz. Tarama sırasında hiçbir şey değişmez.",
      retry: "Tekrar dene",
      scanFailed: "Tarama başarısız oldu.",
      cookieMissing: "Giriş çerezi okunamadı. Instagram'a giriş yaptığından emin ol.",
      csrfMissing: "csrftoken çerezi okunamadı — giriş yaptığından emin ol.",
      openInstagramFirst: "Önce https://www.instagram.com adresini aç, giriş yap, sonra bu betiği tekrar yapıştır.",
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
      confirmUnfollow: "{n} hesabın takibi bırakılacak. Hesabını korumak için işlem yavaş çalışır ve tamamlanan işlemler bu araçtan geri alınamaz. Devam edilsin mi?",
      copiedToast: "{n} kullanıcı adı kopyalandı.",
      copyFail: "Kopyalama başarısız oldu.",
      doneSummary: "{ok} takipten çıkarıldı, {fail} başarısız.",
      backToResults: "Sonuçlara dön",
      blockedMsg: "Instagram bu işlemi engelledi: {reason}. Tekrar denemeden önce birkaç saat bekle.",
    },
  };

  function t(key, vars) {
    const dict = I18N[state.language] || I18N.en;
    const template = dict[key] ?? I18N.en[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
  }

  function detectLanguage(saved) {
    // Always starts in English; only switches to Turkish if the person
    // has explicitly toggled it before (remembered via localStorage).
    if (saved === "tr" || saved === "en") return saved;
    return "en";
  }

  // `state` has to exist before we can call t() (it reads state.language),
  // so build it first and only then bail out if we're on the wrong page.
  const saved = safeParse(localStorage.getItem(STORAGE_KEY)) || {};

  const state = {
    view: "idle",              // idle | scanning | results | unfollowing | done
    error: "",
    users: [],                 // everyone you follow, after scanning
    selected: new Set(),
    hidden: new Set(saved.hidden || []),
    filters: { verified: true, private: true, ...(saved.filters || {}) },
    search: "",
    settings: { ...DEFAULTS, ...(saved.settings || {}) },
    progress: { current: 0, total: 0, note: "" },
    paused: false,
    cancelled: false,
    log: [],
    language: detectLanguage(saved.language),
  };

  if (location.hostname !== "www.instagram.com") {
    alert(t("openInstagramFirst"));
    return;
  }

  // If it's already running on this page, tear down the previous instance.
  window.__iguCleanup?.();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        hidden: [...state.hidden],
        filters: state.filters,
        settings: state.settings,
        language: state.language,
      }));
    } catch { /* localStorage may be disabled, that's fine */ }
  }

  // ---------- helpers ----------

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[-.+*]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, Math.max(0, ms))); }

  function randRange([min, max]) {
    const lo = Math.min(min, max), hi = Math.max(min, max);
    return Math.floor(lo + Math.random() * (hi - lo + 1));
  }

  async function waitWhilePaused() {
    while (state.paused && !state.cancelled) await sleep(200);
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------- talking to Instagram ----------
  // These endpoints are the ones Instagram's own web client uses in the
  // browser (the following-list GraphQL query backs the "Following" modal
  // on your profile; the destroy endpoint is what the unfollow button
  // calls). They've been documented independently across many open-source
  // projects for years — this is not a private or reverse-engineered secret,
  // just how the web app itself works.

  async function igGet(url) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        credentials: "include",
        headers: { "x-ig-app-id": APP_ID_HEADER, "x-requested-with": "XMLHttpRequest" },
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

  async function igPost(url, csrf, extraHeaders) {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "x-ig-app-id": APP_ID_HEADER,
        "x-requested-with": "XMLHttpRequest",
        "x-csrftoken": csrf,
        "content-type": "application/x-www-form-urlencoded",
        ...(extraHeaders || {}),
      },
    });
    const text = await res.text().catch(() => "");
    let payload = null;
    try { payload = JSON.parse(text); } catch { /* ignore */ }
    return { status: res.status, payload };
  }

  function normalizeUser(u) {
    return {
      id: String(u.id || u.pk || u.pk_id || ""),
      username: String(u.username || ""),
      fullName: String(u.full_name || ""),
      avatar: String(u.profile_pic_url || ""),
      isPrivate: Boolean(u.is_private),
      isVerified: Boolean(u.is_verified),
      followsBack: Boolean(u.follows_viewer ?? u.friendship_status?.followed_by ?? u.followed_by),
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

      const variables = { id: viewerId, include_reel: true, fetch_mutual: false, first: 24 };
      if (cursor) variables.after = cursor;
      const url = `/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables=${encodeURIComponent(JSON.stringify(variables))}`;
      const json = await igGet(url);
      const edge = json?.data?.user?.edge_follow;
      if (!edge?.edges) throw new Error(t("scanFailed"));

      for (const item of edge.edges) {
        const u = normalizeUser(item.node);
        if (u.id && u.username && !seen.has(u.id)) {
          seen.add(u.id);
          out.push(u);
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
    // Try the primary endpoint first, then a fallback, in case Instagram
    // rejects one of them for a given account/session.
    const attempts = [
      { url: `/api/v1/friendships/destroy/${userId}/`, headers: {} },
      { url: `/web/friendships/${userId}/unfollow/`, headers: {} },
    ];

    let last = { ok: false, blocked: false, reason: "" };
    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await sleep(randRange([1200, 2500]));
      let status, payload;
      try {
        ({ status, payload } = await igPost(attempts[i].url, csrf, attempts[i].headers));
      } catch (err) {
        last = { ok: false, blocked: false, reason: err?.message || "network error" };
        continue;
      }
      if (status === 429 || status === 401 || status === 403) {
        return { ok: false, blocked: true, reason: payload?.message || `HTTP ${status}` };
      }
      if (status >= 200 && status < 300 && payload && payload.status === "ok") {
        return { ok: true, blocked: false, reason: "" };
      }
      last = { ok: false, blocked: false, reason: payload?.message || `HTTP ${status}` };
    }
    return last;
  }

  async function countdownWait(ms, label) {
    let remaining = ms;
    updateNote(label + ` (${Math.ceil(remaining / 1000)}s)`);
    while (remaining > 0 && !state.cancelled) {
      await sleep(1000);
      remaining -= 1000;
      updateNote(label + ` (${Math.max(0, Math.ceil(remaining / 1000))}s)`);
    }
  }

  function updateNote(note) {
    state.progress.note = note;
    const el = document.querySelector("#igu-note");
    if (el) el.textContent = note;
  }

  // ---------- flows ----------

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
        state.progress = { current, total: totalGuess, note: t("scannedSoFar", { n: current }) };
        renderProgressOnly();
      });

      if (state.cancelled) { state.view = "idle"; render(); return; }

      state.users = users;
      state.view = "results";
      render();
    } catch (err) {
      state.error = err?.message || t("scanFailed");
      state.view = "idle";
      render();
    }
  }

  function displayedUsers() {
    const q = state.search.trim().toLowerCase();
    return state.users
      .filter((u) => !u.followsBack)
      .filter((u) => !state.hidden.has(u.id))
      .filter((u) => state.filters.verified || !u.isVerified)
      .filter((u) => state.filters.private || !u.isPrivate)
      .filter((u) => !q || (u.username + " " + u.fullName).toLowerCase().includes(q))
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async function startUnfollow(targets) {
    const csrf = getCookie("csrftoken");
    if (!csrf) { alert(t("csrfMissing")); return; }

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
      } catch (err) {
        outcome = { ok: false, blocked: false, reason: err?.message || "network error" };
      }
      state.log.push({ user, ...outcome });
      if (outcome.ok) {
        state.users = state.users.filter((u) => u.id !== user.id);
      }
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

  // ---------- UI ----------

  const CSS = `
  #${ROOT_ID}{position:fixed;top:18px;right:18px;z-index:2147483647;
    font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#fdeef7}
  #${ROOT_ID} *{box-sizing:border-box}
  .igu-panel{width:372px;max-height:82vh;background:linear-gradient(180deg,#20101d,#160b14);
    border-radius:22px;box-shadow:0 26px 70px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05);
    display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,110,170,.18)}
  .igu-header{display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:16px 16px;background:linear-gradient(135deg,rgba(255,79,154,.16),transparent 65%);
    border-bottom:1px solid rgba(255,255,255,.06)}
  .igu-brand{display:flex;align-items:center;gap:11px;min-width:0}
  .igu-heart{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;
    background:linear-gradient(135deg,#ff3e91,#ff83ba);color:#fff;font-size:17px;
    box-shadow:0 8px 22px rgba(255,62,145,.28)}
  .igu-header strong{font-size:14px;letter-spacing:.01em;color:#fff;font-weight:700;display:block}
  .igu-header small{display:block;margin-top:2px;color:#c98ba9;font-size:10.5px}
  .igu-header small b{color:#ff9fc4;font-weight:700}
  .igu-header-actions{display:flex;align-items:center;gap:6px;flex:none}
  .igu-header-actions button{background:rgba(255,79,154,.1);border:1px solid rgba(255,79,154,.25);
    color:#ff9fc4;border-radius:10px;padding:6px 10px;cursor:pointer;font-size:11px;font-weight:700;
    letter-spacing:.04em;font-family:inherit}
  .igu-header-actions button:hover{background:rgba(255,79,154,.2)}
  .igu-close{width:32px;height:32px;padding:0 !important;display:grid;place-items:center;
    font-size:18px;color:#e3b8cd !important;background:rgba(255,255,255,.05) !important;
    border-color:rgba(255,255,255,.08) !important}
  .igu-close:hover{color:#fff !important;background:rgba(255,255,255,.1) !important}
  .igu-body{padding:16px;overflow-y:auto;background:transparent}
  .igu-btn{border:1px solid rgba(255,255,255,.08);background:#2a1526;color:#fdeef7;border-radius:12px;
    padding:9px 13px;cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;
    transition:filter .12s ease,transform .12s ease}
  .igu-btn:hover:not(:disabled){filter:brightness(1.15)}
  .igu-btn:active:not(:disabled){transform:translateY(1px)}
  .igu-btn--primary{background:linear-gradient(135deg,#ff3f91,#ff70ae);border-color:transparent;color:#fff;
    box-shadow:0 12px 28px rgba(255,63,145,.22)}
  .igu-btn--danger{background:linear-gradient(135deg,#e62b74,#ff4f8e);border-color:transparent;color:#fff}
  .igu-btn:disabled{opacity:.35;cursor:not-allowed}
  .igu-row{display:flex;align-items:center;gap:9px;padding:8px 6px;border-radius:12px}
  .igu-row:hover{background:rgba(255,79,154,.06)}
  .igu-row img{width:36px;height:36px;border-radius:12px;object-fit:cover;background:#2a1526}
  .igu-row .name{flex:1;min-width:0}
  .igu-row .name a{color:#fdeef7;text-decoration:none;font-weight:700}
  .igu-row .name a:hover{color:#ff9fc4}
  .igu-row .name div{font-size:11.5px;color:#a877a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .igu-search{width:100%;padding:9px 12px;border:1px solid rgba(255,255,255,.08);background:#2a1526;
    color:#fdeef7;border-radius:12px;margin-bottom:8px;font-size:12.5px;font-family:inherit}
  .igu-search:focus{outline:none;border-color:#ff4f9a}
  .igu-list{max-height:320px;overflow-y:auto;border-top:1px solid rgba(255,255,255,.06);
    border-bottom:1px solid rgba(255,255,255,.06);margin:8px 0}
  .igu-bar{height:5px;background:#2a1526;border-radius:99px;overflow:hidden;margin:10px 0}
  .igu-bar span{display:block;height:100%;background:linear-gradient(90deg,#ff3f91,#ff9fc4);transition:width .2s}
  .igu-muted{color:#b98aa8;font-size:11.5px}
  .igu-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
  .igu-filters{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}
  .igu-chip{border:1px solid rgba(255,255,255,.08);border-radius:99px;padding:4px 11px;font-size:11.5px;
    cursor:pointer;background:#2a1526;color:#c98ba9}
  .igu-chip.on{background:rgba(255,79,154,.18);color:#ff9fc4;border-color:rgba(255,79,154,.45);font-weight:700}
  #igu-note{display:block;margin-top:6px}
  .igu-warn{background:rgba(255,64,132,.1);border:1px solid rgba(255,64,132,.3);color:#ffc1db;
    border-radius:12px;padding:9px 11px;font-size:11.5px;margin-bottom:10px;line-height:1.5}
  .igu-footer-credit{margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);
    color:#7a5468;font-size:10.5px;text-align:center}
  .igu-footer-credit b{color:#ff9fc4}
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
    document.body.appendChild(root);
    window.__iguCleanup = () => {
      root.remove();
      document.getElementById(STYLE_ID)?.remove();
      window.__iguCleanup = null;
    };
    render();
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
              <strong>${esc(t("title"))}</strong>
              <small>${esc(t("subtitle"))} &middot; by <b>Zeynep Tokgözlü</b></small>
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
  }

  function renderProgressOnly() {
    const bar = document.querySelector("#igu-bar-fill");
    const label = document.querySelector("#igu-progress-label");
    const note = document.querySelector("#igu-note");
    if (!bar) return render();
    const { current, total } = state.progress;
    const pct = total ? Math.min(100, Math.round((current / total) * 100)) : 0;
    bar.style.width = pct + "%";
    if (label) label.textContent = total ? `${current} / ${total}` : t("scannedSoFar", { n: current });
    if (note) note.textContent = state.progress.note || "";
  }

  function viewIdle() {
    return `
      ${state.error ? `<div class="igu-warn">${esc(state.error)}</div>` : ""}
      <p class="igu-muted">${esc(t("idleText"))}</p>
      <button class="igu-btn igu-btn--primary" data-scan>${esc(t("scanBtn"))}</button>
    `;
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
      </div>
    `;
  }

  function userRowHTML(u) {
    return `
      <label class="igu-row">
        <input type="checkbox" data-select="${esc(u.id)}" ${state.selected.has(u.id) ? "checked" : ""}>
        <img src="${esc(u.avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="name">
          <a href="/${encodeURIComponent(u.username)}/" target="_blank" rel="noopener noreferrer">@${esc(u.username)}</a>
          <div>${esc(u.fullName)}</div>
        </div>
      </label>`;
  }

  function viewResults() {
    const list = displayedUsers();
    const rows = list.length ? list.map(userRowHTML).join("") : `<p class="igu-muted">${esc(t("noMatch"))}</p>`;
    // Keep the headline count independent from display filters. In the old
    // version, turning the Private chip off made private non-followers vanish
    // from both the list and the count, which looked like the scan missed them.
    const total = state.users
      .filter((u) => !u.followsBack)
      .filter((u) => !state.hidden.has(u.id))
      .length;
    const allSelected = list.length && list.every((u) => state.selected.has(u.id));
    return `
      <div class="igu-muted">${esc(t("notFollowingBack", { n: total }))}</div>
      <input class="igu-search" placeholder="${esc(t("searchPlaceholder"))}" value="${esc(state.search)}" data-search>
      <div class="igu-filters">
        <span class="igu-chip ${state.filters.verified ? "on" : ""}" data-filter="verified">${esc(t("filterVerified"))}</span>
        <span class="igu-chip ${state.filters.private ? "on" : ""}" data-filter="private">${esc(t("filterPrivate"))}</span>
      </div>
      <div class="igu-list">${rows}</div>
      <div class="igu-actions">
        <button class="igu-btn" data-select-all>${esc(allSelected ? t("clearSelection") : t("selectAll"))}</button>
        <button class="igu-btn" data-copy>${esc(t("copy"))}</button>
        <button class="igu-btn igu-btn--danger" data-unfollow ${state.selected.size ? "" : "disabled"}>
          ${esc(t("unfollow"))} (${state.selected.size})
        </button>
      </div>
    `;
  }

  function viewDone() {
    const ok = state.log.filter((l) => l.ok).length;
    const fail = state.log.filter((l) => !l.ok).length;
    return `
      ${state.error ? `<div class="igu-warn">${esc(state.error)}</div>` : ""}
      <p>${esc(t("doneSummary", { ok, fail }))}</p>
      <div class="igu-actions">
        <button class="igu-btn igu-btn--primary" data-back>${esc(t("backToResults"))}</button>
      </div>
      <div class="igu-footer-credit">instagram-unfollower &middot; by <b>Zeynep Tokgözlü</b></div>
    `;
  }

  function bind(root) {
    root.querySelector("[data-scan]")?.addEventListener("click", startScan);

    root.querySelector("[data-cancel-scan]")?.addEventListener("click", () => {
      state.cancelled = true; state.paused = false;
    });
    root.querySelector("[data-cancel-unfollow]")?.addEventListener("click", () => {
      state.cancelled = true; state.paused = false;
    });
    root.querySelector("[data-pause]")?.addEventListener("click", () => {
      state.paused = !state.paused;
      render();
    });

    const search = root.querySelector("[data-search]");
    search?.addEventListener("input", (e) => {
      state.search = e.target.value;
      const list = root.querySelector(".igu-list");
      if (list) {
        // Only refresh the list, so the input doesn't lose focus on a full render.
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

    root.addEventListener("change", (e) => {
      const cb = e.target.closest("[data-select]");
      if (!cb) return;
      const id = cb.getAttribute("data-select");
      if (cb.checked) state.selected.add(id); else state.selected.delete(id);
      const btn = root.querySelector("[data-unfollow]");
      if (btn) {
        btn.disabled = state.selected.size === 0;
        btn.textContent = `${t("unfollow")} (${state.selected.size})`;
      }
    });

    root.querySelector("[data-select-all]")?.addEventListener("click", () => {
      const list = displayedUsers();
      const allSelected = list.length && list.every((u) => state.selected.has(u.id));
      if (allSelected) list.forEach((u) => state.selected.delete(u.id));
      else list.forEach((u) => state.selected.add(u.id));
      render();
    });

    root.querySelector("[data-copy]")?.addEventListener("click", async () => {
      const list = displayedUsers();
      const target = state.selected.size ? list.filter((u) => state.selected.has(u.id)) : list;
      const text = target.map((u) => u.username).join("\n");
      try { await navigator.clipboard.writeText(text); alert(t("copiedToast", { n: target.length })); }
      catch { alert(t("copyFail")); }
    });

    root.querySelector("[data-unfollow]")?.addEventListener("click", () => {
      const targets = state.users.filter((u) => state.selected.has(u.id));
      if (!targets.length) return;
      const ok = confirm(t("confirmUnfollow", { n: targets.length }));
      if (ok) startUnfollow(targets);
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
