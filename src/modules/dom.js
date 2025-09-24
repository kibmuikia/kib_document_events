/**
 * DOM-related event handlers
 */

export function setupDOMEvents(eventManager) {
  return {
    /**
     * Execute callback when DOM is ready
     */
    ready(callback) {
      if (eventManager.isReady) {
        callback();
      } else {
        document.addEventListener("DOMContentLoaded", callback, { once: true });
      }
      return eventManager;
    },

    /**
     * Execute callback when all resources are loaded
     */
    loaded(callback) {
      if (eventManager.isLoaded) {
        callback();
      } else {
        window.addEventListener("load", callback, { once: true });
      }
      return eventManager;
    },

    /**
     * Handle page visibility changes
     */
    onVisibilityChange(callback) {
      return eventManager._addListener("visibilitychange", () => {
        callback(document.hidden, document.visibilityState);
      });
    },

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
      return eventManager._addListener(event, handler);
    },
  };
}
