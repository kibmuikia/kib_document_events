/* kib-event-dock.js
   Vanilla ES module. Auto-initializes window.KibEventDock = instance.
   Usage:
     import './kib-event-dock.js'; // auto init
   or
     import { KibEventDock, defaultDock } from './kib-event-dock.js';
*/

const DEFAULTS = {
  position: "bottom-right", // 'bottom-left' | 'bottom-center' | 'bottom-right'
  fabColor: "#0ea5e9", // default: sky-500
  fabTextColor: "#fff",
  modalBg: "#0f172a", // slate-900
  modalTextColor: "#e6eef8",
  maxEntries: 2000, // chosen default (safe)
  maxStorageBytes: 2_000_000, // ~2 MB safe default (avoid 5MB limits)
  storageKey: "kibEventDock:logs:v1",
  showNotificationBadge: true,
  autoInit: true,
};

function nowISO() {
  return new Date().toISOString();
}

/* Simple safe localStorage wrapper */
class SafeStorage {
  constructor(key) {
    this.key = key;
  }
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn("kib-event-dock: load error", err);
      return [];
    }
  }
  save(arr) {
    try {
      localStorage.setItem(this.key, JSON.stringify(arr));
      return true;
    } catch (err) {
      console.warn("kib-event-dock: save error", err);
      return false;
    }
  }
  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (err) {}
  }
}

/* Simple size estimator for JSON string */
function bytesOf(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return JSON.stringify(obj).length;
  }
}

export class KibEventDock {
  constructor(opts = {}) {
    this.opts = Object.assign({}, DEFAULTS, opts);
    this.storage = new SafeStorage(this.opts.storageKey);
    this.logs = this.storage.load();
    this.unreadCount = 0;
    this._listeners = [];
    this._initDOM();
    this._bindEvents();
    this._updateBadge();
    this._observeOnlineStatus();
  }

  /* ----------- Public API ---------- */
  open() {
    this._showModal();
  }
  close() {
    this._hideModal();
  }
  toggle() {
    this._isOpen ? this.close() : this.open();
  }
  clear() {
    this.logs = [];
    this.storage.clear();
    this._renderLogs();
    this._updateBadge();
  }
  getAll() {
    return Array.from(this.logs);
  }
  exportJSON() {
    return JSON.stringify(this.logs, null, 2);
  }
  addLog(entry) {
    const e = this._normalizeEntry(entry);
    this.logs.push(e);
    this._enforceLimits();
    this.storage.save(this.logs);
    this._renderNewLog(e);
    this._updateBadge(1);
  }

  /* Share: returns a Promise that resolves to {method:'share'|'clipboard'|'copy-fallback',ok:boolean} */
  async share(options = { preferShareApi: true }) {
    const payload = this.exportJSON();
    // Offer native share first if supported and requested
    if (options.preferShareApi && navigator.share) {
      try {
        await navigator.share({
          title: "Document / Window Event Logs",
          text: "Event logs (JSON)",
          files: [
            // attempt to use a Blob file for share targets that accept files
            new File([payload], "event-logs.json", {
              type: "application/json",
            }),
          ],
        });
        return { method: "share", ok: true };
      } catch (err) {
        // user canceled or failed -> fall back
        console.warn("kib-event-dock share failed:", err);
      }
    }
    // Fallback: copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(payload);
        return { method: "clipboard", ok: true };
      } catch (err) {
        console.warn("kib-event-dock clipboard failed:", err);
      }
    }
    // Fallback: create a temp textarea and select
    try {
      const ta = document.createElement("textarea");
      ta.value = payload;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return { method: "copy-fallback", ok: true };
    } catch (err) {
      console.error("kib-event-dock share fallback failed", err);
      return { method: "none", ok: false };
    }
  }

  /* ----------- Internal methods ---------- */

  _normalizeEntry(entry) {
    const base = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ts: nowISO(),
      type: "custom",
      payload: null,
      summary: "",
    };
    if (typeof entry === "string") {
      base.summary = entry;
    } else if (entry instanceof Event) {
      base.type = entry.type;
      base.summary = entry.type;
      base.payload = this._serializeEvent(entry);
    } else if (entry && typeof entry === "object") {
      base.type = entry.type || base.type;
      base.payload = entry.payload ?? entry;
      base.summary =
        entry.summary ?? (entry.type || JSON.stringify(entry).slice(0, 120));
    }
    return base;
  }

  _enforceLimits() {
    const maxEntries = this.opts.maxEntries;
    const maxBytes = this.opts.maxStorageBytes;

    // Trim by entries
    if (this.logs.length > maxEntries) {
      this.logs = this.logs.slice(this.logs.length - maxEntries);
    }

    // Trim by total bytes (approximate)
    let total = bytesOf(this.logs);
    while (total > maxBytes && this.logs.length > 0) {
      this.logs.shift();
      total = bytesOf(this.logs);
    }
    // persist trimmed logs
    this.storage.save(this.logs);
  }

  _serializeEvent(ev) {
    // friendly shallow serializer to avoid circular issues
    const out = { type: ev.type, timeStamp: ev.timeStamp || null };
    // copy known properties safely
    const props = [
      "key",
      "code",
      "clientX",
      "clientY",
      "button",
      "target",
      "deltaY",
      "detail",
    ];
    props.forEach((p) => {
      if (p in ev) {
        try {
          out[p] = ev[p];
        } catch {}
      }
    });
    // target summary
    try {
      if (ev.target && ev.target instanceof Element) {
        out.target =
          ev.target.tagName.toLowerCase() +
          (ev.target.id ? `#${ev.target.id}` : "") +
          (ev.target.className
            ? `.${String(ev.target.className).split(" ").join(".")}`
            : "");
      }
    } catch {}
    return out;
  }

  _initDOM() {
    // root container
    this.root = document.createElement("div");
    this.root.className = "kib-event-dock-root";
    this.root.setAttribute("aria-hidden", "false");
    // inject styles (scoped)
    if (!document.getElementById("kib-event-dock-styles")) {
      const s = document.createElement("style");
      s.id = "kib-event-dock-styles";
      s.textContent = this._css();
      document.head.appendChild(s);
    }
    document.body.appendChild(this.root);

    // build FAB
    this.fab = document.createElement("button");
    this.fab.className = `kib-fab ${this._posClass(this.opts.position)}`;
    this.fab.setAttribute("aria-label", "Event log (open)");
    this.fab.innerHTML = `<span class="kib-fab-emoji">📋</span><span class="kib-fab-badge" aria-hidden="true"></span>`;
    document.body.appendChild(this.fab);

    // overlay + modal
    this.overlay = document.createElement("div");
    this.overlay.className = "kib-overlay hidden";
    this.overlay.innerHTML = `
      <div class="kib-panel" role="dialog" aria-modal="true" aria-label="Event log panel">
        <header class="kib-header">
          <div class="kib-title">Event Log</div>
          <div class="kib-status" title="connection status"></div>
          <div class="kib-actions">
            <button class="kib-btn kib-share">Share</button>
            <button class="kib-btn kib-copy">Copy</button>
            <button class="kib-btn kib-clear">Clear</button>
            <button class="kib-close" aria-label="Close">&times;</button>
          </div>
        </header>
        <main class="kib-main">
          <div class="kib-list" role="list"></div>
        </main>
        <footer class="kib-footer">Logs persisted to localStorage (<code>${this.opts.storageKey}</code>)</footer>
      </div>
    `;
    this.root.appendChild(this.overlay);

    // query nodes
    this.panel = this.overlay.querySelector(".kib-panel");
    this.listEl = this.overlay.querySelector(".kib-list");
    this.statusEl = this.overlay.querySelector(".kib-status");
    this.closeBtn = this.overlay.querySelector(".kib-close");
    this.shareBtn = this.overlay.querySelector(".kib-share");
    this.copyBtn = this.overlay.querySelector(".kib-copy");
    this.clearBtn = this.overlay.querySelector(".kib-clear");

    // initial render
    this._renderLogs();
    this._isOpen = false;
  }

  _posClass(pos) {
    switch (pos) {
      case "bottom-left":
        return "kib-pos-left";
      case "bottom-center":
        return "kib-pos-center";
      default:
        return "kib-pos-right";
    }
  }

  _renderLogs() {
    this.listEl.innerHTML = "";
    if (!this.logs.length) {
      const empty = document.createElement("div");
      empty.className = "kib-empty";
      empty.textContent = "No events recorded yet.";
      this.listEl.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = this.logs.length - 1; i >= 0; i--) {
      frag.appendChild(this._renderLogItem(this.logs[i]));
    }
    this.listEl.appendChild(frag);
  }

  _renderNewLog(log) {
    // prepend to start
    const node = this._renderLogItem(log);
    const first = this.listEl.firstElementChild;
    if (first && first.classList.contains("kib-empty")) first.remove();
    this.listEl.prepend(node);
  }

  _renderLogItem(log) {
    const item = document.createElement("div");
    item.className = "kib-item";
    item.dataset.id = log.id;
    item.innerHTML = `
      <div class="kib-item-head">
        <span class="kib-type">${this._escape(log.type)}</span>
        <span class="kib-ts">${this._escape(log.ts)}</span>
      </div>
      <div class="kib-summary">${this._escape(log.summary)}</div>
      <details class="kib-details"><summary>Details</summary><pre>${this._escape(
        JSON.stringify(log.payload, null, 2)
      )}</pre></details>
    `;
    return item;
  }

  _escape(s) {
    return String(s === null || s === void 0 ? "" : s);
  }

  _bindEvents() {
    // FAB click toggles modal
    this.fab.addEventListener("click", () => this.toggle());

    // overlay close by clicking outside the panel
    this.overlay.addEventListener("click", (ev) => {
      if (ev.target === this.overlay) this.close();
    });

    // close top-right
    this.closeBtn.addEventListener("click", () => this.close());

    // copy and share
    this.copyBtn.addEventListener("click", async () => {
      const res = await this.share({ preferShareApi: false });
      if (res.ok) this._flash("Copied JSON to clipboard");
    });
    this.shareBtn.addEventListener("click", async () => {
      const res = await this.share({ preferShareApi: true });
      if (res.ok) this._flash("Shared / copied logs");
    });

    // clear
    this.clearBtn.addEventListener("click", () => {
      if (!confirm("Clear all logs?")) return;
      this.clear();
      this._flash("Logs cleared");
    });

    // keyboard: esc to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._isOpen) this.close();
    });

    // capture many events by default
    this._captureDefaults();
  }

  _captureDefaults() {
    const add = (t, tgt = window, opts) => {
      const h = (ev) => this.addLog(ev);
      tgt.addEventListener(t, h, opts);
      this._listeners.push({ t, tgt, h });
    };

    // visibility, online/offline
    add("visibilitychange", document);
    add("online", window);
    add("offline", window);

    // navigation events
    add("popstate", window);
    add("hashchange", window);

    // keyboard & pointer & click
    add("keydown", window);
    add("keyup", window);
    add("keypress", window);
    add("click", document, true); // capture mode
    add("dblclick", document, true);
    add("contextmenu", document, true);

    // resize & scroll
    add("resize", window);
    add("scroll", window);

    // clipboard
    add("copy", document, true);
    add("cut", document, true);
    add("paste", document, true);

    // drag/drop
    add("dragstart", document, true);
    add("dragend", document, true);
    add("drop", document, true);

    // lifecycle & errors
    add("error", window, true);
    add("unhandledrejection", window);
    add("pagehide", window);
    add("pageshow", window);
    add("beforeunload", window);

    // pointer events
    add("pointerdown", document, true);
    add("pointerup", document, true);

    // touch
    add("touchstart", document, true);
    add("touchend", document, true);
  }

  _observeOnlineStatus() {
    const setStatus = () => {
      const online = navigator.onLine;
      this._renderConnection(online);
    };
    window.addEventListener("online", setStatus);
    window.addEventListener("offline", setStatus);
    setStatus();
  }

  _renderConnection(isOnline) {
    const s = this.statusEl;
    s.textContent = isOnline ? "● Online" : "● Offline";
    s.className = "kib-status " + (isOnline ? "kib-online" : "kib-offline");
  }

  _updateBadge(increment = 0) {
    if (!this.opts.showNotificationBadge) return;
    this.unreadCount =
      typeof increment === "number" && increment > 0
        ? this.unreadCount + increment
        : this.logs.length;
    const badge = document.querySelector(".kib-fab-badge");
    if (!badge) return;
    if (this.unreadCount > 0) {
      badge.textContent =
        this.unreadCount > 99 ? "99+" : String(this.unreadCount);
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  _showModal() {
    this.overlay.classList.remove("hidden");
    this._isOpen = true;
    this.unreadCount = 0;
    this._updateBadge();
    // focus trap (basic)
    const firstFocus = this.overlay.querySelector(".kib-close");
    if (firstFocus) firstFocus.focus();
  }

  _hideModal() {
    this.overlay.classList.add("hidden");
    this._isOpen = false;
  }

  _flash(msg) {
    // small transient toast on the panel
    const t = document.createElement("div");
    t.className = "kib-toast";
    t.textContent = msg;
    this.panel.appendChild(t);
    setTimeout(() => t.classList.add("kib-toast-show"), 10);
    setTimeout(() => t.classList.remove("kib-toast-show"), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  _css() {
    // lightweight scoped CSS. uses CSS variables to allow user customisation.
    return `
.kib-event-dock-root { --keb-fab-size:56px; --keb-fab-bg:${this.opts.fabColor}; --keb-fab-color:${this.opts.fabTextColor}; --keb-modal-bg:${this.opts.modalBg}; --keb-modal-text:${this.opts.modalTextColor}; font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
.kib-fab { position: fixed; bottom: 16px; z-index: 99999; width: var(--keb-fab-size); height: var(--keb-fab-size); border-radius: 999px; background: var(--keb-fab-bg); color: var(--keb-fab-color); display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 28px rgba(2,6,23,0.35); border: none; cursor:pointer; font-size:18px;}
.kib-pos-left { left: 16px; }
.kib-pos-right { right: 16px; }
.kib-pos-center { left: 50%; transform: translateX(-50%); }

.kib-fab-emoji { font-size:18px; margin-right:6px; }
.kib-fab-badge { display:none; position:absolute; top:-6px; right:-6px; background:#ef4444; color:#fff; min-width:20px; height:20px; padding:0 6px; border-radius:999px; font-size:12px; display:flex; align-items:center; justify-content:center; }

.kib-overlay { position: fixed; inset:0; display:flex; align-items:flex-end; justify-content:center; background: rgba(2,6,23,0.35); z-index: 99998; padding: 24px; box-sizing:border-box; }
.kib-overlay.hidden { display:none; }
.kib-panel { width: min(960px, 96%); max-height: 80vh; border-radius: 12px 12px 8px 8px; overflow:hidden; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); color: var(--keb-modal-text); background-color: var(--keb-modal-bg); box-shadow: 0 18px 60px rgba(2,6,23,0.6); display:flex; flex-direction:column; }

.kib-header { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04); }
.kib-title { font-weight:600; font-size:16px; }
.kib-status { margin-left:6px; font-size:13px; opacity:0.95; }
.kib-status.kib-online { color: #34d399; } /* green */
.kib-status.kib-offline { color: #f97316; } /* orange */

.kib-actions { margin-left:auto; display:flex; align-items:center; gap:8px; }
.kib-btn { background:transparent; color:var(--keb-modal-text); border:1px solid rgba(255,255,255,0.04); padding:6px 10px; border-radius:8px; cursor:pointer; font-size:13px; }
.kib-close { background:transparent; border:none; color:var(--keb-modal-text); font-size:20px; padding:6px 8px; cursor:pointer; }

.kib-main { overflow:auto; padding:12px; flex:1 1 auto; background:linear-gradient(180deg, rgba(255,255,255,0.01), transparent); }
.kib-list { display:flex; flex-direction:column; gap:8px; }

.kib-empty { color:rgba(255,255,255,0.7); padding:24px; text-align:center; }

.kib-item { background: rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.02); padding:12px; border-radius:8px; font-size:13px; color:var(--keb-modal-text); }
.kib-item-head { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
.kib-type { font-weight:600; font-size:13px; color: #9ae6b4; } /* greenish */
.kib-ts { margin-left:auto; font-size:12px; color:rgba(255,255,255,0.6); }
.kib-summary { color:rgba(255,255,255,0.85); margin-bottom:8px; white-space:pre-wrap; word-break:break-word; }
.kib-details pre { white-space:pre-wrap; max-height:200px; overflow:auto; background: rgba(0,0,0,0.15); padding:8px; border-radius:8px; color:#e6eef8; font-size:12px; }

.kib-footer { padding:8px 12px; font-size:12px; color:rgba(255,255,255,0.6); border-top:1px solid rgba(255,255,255,0.02); }

.kib-toast { position:absolute; right:12px; top:12px; background:rgba(255,255,255,0.06); padding:8px 12px; border-radius:8px; opacity:0; transform:translateY(-6px); transition: all 220ms ease; color:var(--keb-modal-text); }
.kib-toast-show { opacity:1; transform:none; }
      `;
  }
}

/* Auto-init if requested */
const defaultDock = (function () {
  if (typeof window === "undefined") return null;
  if (
    window.__kibEventDockInstance &&
    window.__kibEventDockInstance instanceof KibEventDock
  ) {
    return window.__kibEventDockInstance;
  }
  try {
    const inst = new KibEventDock();
    window.__kibEventDockInstance = inst;
    window.KibEventDock = inst;
    return inst;
  } catch (err) {
    console.error("kib-event-dock init failed", err);
    return null;
  }
})();

export default defaultDock;
