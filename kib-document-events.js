/**
 * DocumentEvents - A utility for managing document and window events
 * @version 1.0.0
 * @author kibmuikia
 * @license MIT
 */

class KibDocumentEvents {
  constructor() {
    this.listeners = new Map();
    this.isReady = document.readyState !== "loading";
    this.isLoaded = document.readyState === "complete";

    // Initialize ready state tracking
    if (!this.isReady) {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          this.isReady = true;
        },
        { once: true }
      );
    }

    if (!this.isLoaded) {
      window.addEventListener(
        "load",
        () => {
          this.isLoaded = true;
        },
        { once: true }
      );
    }
  }

  /**
   * Execute callback when DOM is ready
   */
  ready(callback) {
    if (this.isReady) {
      callback();
    } else {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    }
    return this;
  }

  /**
   * Execute callback when all resources are loaded
   */
  loaded(callback) {
    if (this.isLoaded) {
      callback();
    } else {
      window.addEventListener("load", callback, { once: true });
    }
    return this;
  }

  /**
   * Handle page visibility changes
   */
  onVisibilityChange(callback) {
    return this._addListener("visibilitychange", () => {
      callback(document.hidden, document.visibilityState);
    });
  }

  /**
   * Handle window focus/blur
   */
  onFocusChange(callback) {
    const focusHandler = () => callback(true);
    const blurHandler = () => callback(false);

    window.addEventListener("focus", focusHandler);
    window.addEventListener("blur", blurHandler);

    return () => {
      window.removeEventListener("focus", focusHandler);
      window.removeEventListener("blur", blurHandler);
    };
  }

  /**
   * Handle window resize with optional debouncing
   */
  onResize(callback, debounceMs = 100) {
    const handler = this._debounce(() => {
      callback({
        width: window.innerWidth,
        height: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
      });
    }, debounceMs);

    return this._addListener("resize", handler, window);
  }

  /**
   * Handle scroll with optional throttling
   */
  onScroll(callback, throttleMs = 16) {
    const handler = this._throttle(() => {
      callback({
        x: window.scrollX,
        y: window.scrollY,
        maxX: document.documentElement.scrollWidth - window.innerWidth,
        maxY: document.documentElement.scrollHeight - window.innerHeight,
      });
    }, throttleMs);

    return this._addListener("scroll", handler);
  }

  /**
   * Handle global keyboard shortcuts
   */
  onKeyboard(callback) {
    const handler = (e) => {
      const combo = {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        preventDefault: () => e.preventDefault(),
      };
      callback(combo, e);
    };

    return this._addListener("keydown", handler);
  }

  /**
   * Handle navigation events (back/forward)
   */
  onNavigation(callback) {
    return this._addListener(
      "popstate",
      (e) => {
        callback({
          state: e.state,
          url: window.location.href,
          pathname: window.location.pathname,
          hash: window.location.hash,
        });
      },
      window
    );
  }

  /**
   * Handle hash changes
   */
  onHashChange(callback) {
    return this._addListener(
      "hashchange",
      (e) => {
        callback({
          oldURL: e.oldURL,
          newURL: e.newURL,
          hash: window.location.hash,
        });
      },
      window
    );
  }

  /**
   * Handle online/offline status
   */
  onConnectionChange(callback) {
    const onlineHandler = () => callback(true);
    const offlineHandler = () => callback(false);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }

  /**
   * Handle clipboard events
   */
  onClipboard(callback) {
    const handler = (e) => {
      const data =
        e.type === "paste"
          ? e.clipboardData?.getData("text") || ""
          : window.getSelection()?.toString() || "";

      callback({
        type: e.type,
        data,
        preventDefault: () => e.preventDefault(),
      });
    };

    document.addEventListener("copy", handler);
    document.addEventListener("cut", handler);
    document.addEventListener("paste", handler);

    return () => {
      document.removeEventListener("copy", handler);
      document.removeEventListener("cut", handler);
      document.removeEventListener("paste", handler);
    };
  }

  /**
   * Handle drag and drop
   */
  onDragDrop(callback) {
    const dragoverHandler = (e) => {
      e.preventDefault();
    };

    const dropHandler = (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files || []);
      const text = e.dataTransfer?.getData("text") || "";

      callback({
        files,
        text,
        x: e.clientX,
        y: e.clientY,
      });
    };

    document.addEventListener("dragover", dragoverHandler);
    document.addEventListener("drop", dropHandler);

    return () => {
      document.removeEventListener("dragover", dragoverHandler);
      document.removeEventListener("drop", dropHandler);
    };
  }

  /**
   * Handle page unload with warning
   */
  onBeforeUnload(callback) {
    const handler = (e) => {
      const message = callback();
      if (message) {
        e.returnValue = message;
        return message;
      }
    };

    return this._addListener("beforeunload", handler, window);
  }

  /**
   * Handle global errors
   */
  onError(callback) {
    const errorHandler = (e) => {
      callback({
        type: "javascript",
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error,
      });
    };

    const rejectionHandler = (e) => {
      callback({
        type: "promise",
        reason: e.reason,
        promise: e.promise,
      });
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }

  /**
   * Event delegation helper
   */
  delegate(selector, event, callback) {
    const handler = (e) => {
      const target = e.target.closest(selector);
      if (target) {
        callback(e, target);
      }
    };

    return this._addListener(event, handler);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners.clear();
    return this;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isReady: this.isReady,
      isLoaded: this.isLoaded,
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
      hasFocus: document.hasFocus(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY,
      },
    };
  }

  // Private methods
  _addListener(event, handler, target = document) {
    target.addEventListener(event, handler);

    const key = Symbol();
    this.listeners.set(key, { target, event, handler });

    return () => {
      target.removeEventListener(event, handler);
      this.listeners.delete(key);
    };
  }

  _debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  _throttle(func, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Create and export singleton instance
const docEvents = new KibDocumentEvents();

export default docEvents;
export { KibDocumentEvents };
