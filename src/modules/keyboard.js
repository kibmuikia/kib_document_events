/**
 * Keyboard event handlers
 */

export function setupKeyboardEvents(eventManager) {
  return {
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

      return eventManager._addListener("keydown", handler);
    },
  };
}
