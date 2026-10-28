/**
 * OMNI PROTOCOL FORGE — TYPED SHARED EVENT BUS
 * High-performance, lifecycle-safe, loop-protected event distribution system for cross-model intelligence.
 */

import { ProtocolEvent, ProtocolEventName, ProtocolEventPayloads } from './types';

export type ProtocolEventListener<T extends ProtocolEventName = ProtocolEventName> = (
  event: ProtocolEvent<T>
) => void;

interface Subscription {
  id: string;
  eventName: ProtocolEventName | '*';
  listener: ProtocolEventListener<any>;
  subscriberModule: string;
  once?: boolean;
}

export class ProtocolEventBus {
  private static instance: ProtocolEventBus | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private eventHistory: ProtocolEvent<any>[] = [];
  private maxHistorySize = 100;
  private recursionDepth = 0;
  private maxRecursionDepth = 5;
  private isMuted = false;

  private constructor() {}

  static getInstance(): ProtocolEventBus {
    if (!ProtocolEventBus.instance) {
      ProtocolEventBus.instance = new ProtocolEventBus();
    }
    return ProtocolEventBus.instance;
  }

  /**
   * Subscribe to a typed protocol event.
   * Returns a cleanup function that automatically unregisters the listener.
   */
  subscribe<T extends ProtocolEventName>(
    eventName: T | '*',
    listener: ProtocolEventListener<T>,
    subscriberModule = 'anonymous',
    once = false
  ): () => void {
    const id = `sub-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    this.subscriptions.set(id, {
      id,
      eventName,
      listener,
      subscriberModule,
      once,
    });

    return () => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Subscribe to a typed event only once.
   */
  subscribeOnce<T extends ProtocolEventName>(
    eventName: T,
    listener: ProtocolEventListener<T>,
    subscriberModule = 'anonymous'
  ): () => void {
    return this.subscribe(eventName, listener, subscriberModule, true);
  }

  /**
   * Publish a typed event to all active listeners.
   * Enforces recursion bounds, bounds history, and safely executes callbacks.
   */
  publish<T extends ProtocolEventName>(
    name: T,
    payload: ProtocolEventPayloads[T],
    sourceModule: string,
    confidence?: number
  ): ProtocolEvent<T> | null {
    if (this.isMuted) return null;

    if (this.recursionDepth >= this.maxRecursionDepth) {
      console.warn(
        `[ProtocolEventBus] Event loop cascade suppressed: depth ${this.recursionDepth} on event ${name}`
      );
      return null;
    }

    const event: ProtocolEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      sourceModule,
      timestamp: performance.now(),
      payload,
      confidence,
    };

    // Store bounded history for diagnostics and inspectability
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    this.recursionDepth++;
    const toRemove: string[] = [];

    try {
      this.subscriptions.forEach((sub, id) => {
        if (sub.eventName === '*' || sub.eventName === name) {
          try {
            sub.listener(event);
          } catch (err) {
            console.error(
              `[ProtocolEventBus] Error in listener for "${name}" from module "${sub.subscriberModule}":`,
              err
            );
          }
          if (sub.once) {
            toRemove.push(id);
          }
        }
      });
    } finally {
      this.recursionDepth--;
      for (const id of toRemove) {
        this.subscriptions.delete(id);
      }
    }

    return event;
  }

  /**
   * Returns recent event history for diagnostics
   */
  getHistory(limit = 20): ProtocolEvent<any>[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clears event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Clears all subscriptions
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  /**
   * Removes all active subscriptions associated with a given module.
   * Essential for lifecycle cleanup when a route or module unmounts.
   */
  unsubscribeAllForModule(moduleName: string): number {
    let removed = 0;
    this.subscriptions.forEach((sub, id) => {
      if (sub.subscriberModule === moduleName) {
        this.subscriptions.delete(id);
        removed++;
      }
    });
    return removed;
  }

  /**
   * Returns active subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Mute or unmute event broadcasting
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Full reset for testing or teardown
   */
  reset(): void {
    this.subscriptions.clear();
    this.eventHistory = [];
    this.recursionDepth = 0;
    this.isMuted = false;
  }
}
