/**
 * Clipboard event handlers
 */

export function setupClipboardEvents() {
  return {
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
    },
  };
}
