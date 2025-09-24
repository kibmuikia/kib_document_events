/**
 * Viewport-related event handlers
 */
import { debounce, throttle } from "../utils/helpers.js";

export function setupViewportEvents(eventManager) {
  return {
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
    },

    /**
     * Handle window resize with optional debouncing
     */
    onResize(callback, debounceMs = 100) {
      const handler = debounce(() => {
        callback({
          width: window.innerWidth,
          height: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        });
      }, debounceMs);

      return eventManager._addListener("resize", handler, window);
    },

    /**
     * Handle scroll with optional throttling
     */
    onScroll(callback, throttleMs = 16) {
      const handler = throttle(() => {
        callback({
          x: window.scrollX,
          y: window.scrollY,
          maxX: document.documentElement.scrollWidth - window.innerWidth,
          maxY: document.documentElement.scrollHeight - window.innerHeight,
        });
      }, throttleMs);

      return eventManager._addListener("scroll", handler);
    },
  };
}
