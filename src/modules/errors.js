/**
 * Error handling event handlers
 */

export function setupErrorEvents() {
  return {
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
    },
  };
}
