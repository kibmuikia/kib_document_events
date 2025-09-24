/**
 * KibDocumentEvents - Core event management class
 * @version 2.0.0
 * @author kibmuikia
 * @license MIT
 */

import { setupDOMEvents } from "../modules/dom.js";
import { setupViewportEvents } from "../modules/viewport.js";
import { setupKeyboardEvents } from "../modules/keyboard.js";
import { setupNavigationEvents } from "../modules/navigation.js";
import { setupNetworkEvents } from "../modules/network.js";
import { setupClipboardEvents } from "../modules/clipboard.js";
import { setupDragDropEvents } from "../modules/dragdrop.js";
import { setupLifecycleEvents } from "../modules/lifecycle.js";
import { setupErrorEvents } from "../modules/errors.js";

export class KibDocumentEvents {
  constructor() {
    this.listeners = new Map();
    this.isReady = document.readyState !== "loading";
    this.isLoaded = document.readyState === "complete";

    this._initializeReadyState();
    this._setupModules();
  }

  /**
   * Initialize ready state tracking
   */
  _initializeReadyState() {
    if (!this.isReady) {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          this.isReady = true;
        },
        { once: true }
      );
    }

    if (!this.isLoaded) {
      window.addEventListener(
        "load",
        () => {
          this.isLoaded = true;
        },
        { once: true }
      );
    }
  }

  /**
   * Setup all event modules
   */
  _setupModules() {
    // Mix in all module methods
    Object.assign(this, setupDOMEvents(this));
    Object.assign(this, setupViewportEvents(this));
    Object.assign(this, setupKeyboardEvents(this));
    Object.assign(this, setupNavigationEvents(this));
    Object.assign(this, setupNetworkEvents());
    Object.assign(this, setupClipboardEvents());
    Object.assign(this, setupDragDropEvents());
    Object.assign(this, setupLifecycleEvents(this));
    Object.assign(this, setupErrorEvents());
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners.clear();
    return this;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isReady: this.isReady,
      isLoaded: this.isLoaded,
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
      hasFocus: document.hasFocus(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scroll: {
        x: window.scrollX,
        y: window.scrollY,
      },
    };
  }

  /**
   * Internal method to add event listeners with tracking
   */
  _addListener(event, handler, target = document) {
    target.addEventListener(event, handler);

    const key = Symbol();
    this.listeners.set(key, { target, event, handler });

    return () => {
      target.removeEventListener(event, handler);
      this.listeners.delete(key);
    };
  }
}
