/**
 * KibDocumentEvents - Main export
 * @version 2.0.0
 * @author kibmuikia
 * @license MIT
 */

import { KibDocumentEvents } from "./core/KibDocumentEvents.js";

// Create and export singleton instance
const docEvents = new KibDocumentEvents();

export default docEvents;
export { KibDocumentEvents };
