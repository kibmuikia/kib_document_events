/**
 * Drag and drop event handlers
 */

export function setupDragDropEvents() {
  return {
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
    },
  };
}
