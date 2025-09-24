/**
 * Page lifecycle event handlers
 */

export function setupLifecycleEvents(eventManager) {
  return {
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

      return eventManager._addListener("beforeunload", handler, window);
    },
  };
}
