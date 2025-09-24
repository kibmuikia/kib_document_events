/**
 * Basic tests for KibDocumentEvents
 */

import { KibDocumentEvents } from "../src/core/KibDocumentEvents.js";

// Mock DOM environment for Node.js testing
const mockDOM = {
  document: {
    readyState: "complete",
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    hidden: false,
    hasFocus: () => true,
  },
  window: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 1024,
    innerHeight: 768,
    scrollX: 0,
    scrollY: 0,
  },
  navigator: {
    onLine: true,
  },
};

// Setup global mocks
Object.assign(global, mockDOM);

describe("KibDocumentEvents", () => {
  let docEvents;

  beforeEach(() => {
    docEvents = new KibDocumentEvents();
  });

  afterEach(() => {
    docEvents.removeAllListeners();
  });

  test("should initialize correctly", () => {
    expect(docEvents.isReady).toBe(true);
    expect(docEvents.isLoaded).toBe(true);
    expect(docEvents.listeners).toBeInstanceOf(Map);
  });

  test("should have all module methods", () => {
    expect(typeof docEvents.ready).toBe("function");
    expect(typeof docEvents.onKeyboard).toBe("function");
    expect(typeof docEvents.onResize).toBe("function");
    expect(typeof docEvents.onScroll).toBe("function");
  });

  test("should track listeners", () => {
    const cleanup = docEvents.onKeyboard(() => {});
    expect(docEvents.listeners.size).toBe(1);

    cleanup();
    expect(docEvents.listeners.size).toBe(0);
  });

  test("should return current state", () => {
    const state = docEvents.getState();
    expect(state).toHaveProperty("isReady");
    expect(state).toHaveProperty("isLoaded");
    expect(state).toHaveProperty("viewport");
  });
});
