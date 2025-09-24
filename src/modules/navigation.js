/**
 * Navigation event handlers
 */

export function setupNavigationEvents(eventManager) {
  return {
    /**
     * Handle navigation events (back/forward)
     */
    onNavigation(callback) {
      return eventManager._addListener(
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
    },

    /**
     * Handle hash changes
     */
    onHashChange(callback) {
      return eventManager._addListener(
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
    },
  };
}
