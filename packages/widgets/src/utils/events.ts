/**
 * Event Utilities
 * Simple event emitter implementation for widgets
 */

import type { WidgetEventListener, WidgetEventData } from '../types';

/**
 * Simple EventEmitter class for widget events
 */
export class SimpleEventEmitter {
  private listeners: Map<string, Set<WidgetEventListener>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Add event listener
   */
  on<T = unknown>(eventName: string, listener: WidgetEventListener<T>): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener as WidgetEventListener);
  }

  /**
   * Remove event listener
   */
  off<T = unknown>(eventName: string, listener: WidgetEventListener<T>): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener as WidgetEventListener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit<T = unknown>(eventName: string, data: WidgetEventData & { data?: T }): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      const event = new CustomEvent(eventName, { detail: data });
      eventListeners.forEach((listener) => {
        try {
          listener(event as any);
        } catch (error) {
          console.error(`[Flowsta Widgets] Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size || 0;
  }
}

/**
 * Create a custom event with typed detail
 */
export function createWidgetEvent<T = unknown>(
  eventName: string,
  data: WidgetEventData & { data?: T }
): CustomEvent {
  return new CustomEvent(eventName, {
    detail: data,
    bubbles: false,
    cancelable: false,
  });
}

/**
 * Dispatch event on element
 */
export function dispatchWidgetEvent(
  element: EventTarget,
  eventName: string,
  data: WidgetEventData
): boolean {
  const event = createWidgetEvent(eventName, data);
  return element.dispatchEvent(event);
}

