/**
 * Network event handlers
 */

export function setupNetworkEvents() {
  return {
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
    },
  };
}
