/**
 * Event Emitter - Cross-platform event system for supply chain simulation
 * Provides a consistent event interface for both browser and Node.js environments
 */

export type EventListener = (...args: any[]) => void;

export interface EventEmitterInterface {
  on(event: string, listener: EventListener): this;
  once(event: string, listener: EventListener): this;
  off(event: string, listener: EventListener): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
  listenerCount(event: string): number;
  listeners(event: string): EventListener[];
}

export class EventEmitter implements EventEmitterInterface {
  private events: Map<string, EventListener[]> = new Map();
  private onceEvents: Map<string, Set<EventListener>> = new Map();
  private maxListeners = 100;

  /**
   * Add an event listener
   */
  on(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event)!;

    if (listeners.length >= this.maxListeners) {
      (globalThis as any).console.warn(`Max listeners (${this.maxListeners}) exceeded for event "${event}"`);
    }

    listeners.push(listener);
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once(event: string, listener: EventListener): this {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }

    this.onceEvents.get(event)!.add(listener);
    return this.on(event, listener);
  }

  /**
   * Remove an event listener
   */
  off(event: string, listener: EventListener): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    const onceListeners = this.onceEvents.get(event);
    if (onceListeners) {
      onceListeners.delete(listener);
    }

    return this;
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    const onceListeners = this.onceEvents.get(event);

    for (const listener of listeners) {
      try {
        listener.apply(this, args);

        // Remove once listeners after execution
        if (onceListeners && onceListeners.has(listener)) {
          this.off(event, listener);
        }
      } catch (error) {
        (globalThis as any).console.error(`Error in event listener for "${event}":`, error instanceof Error ? error.message : String(error));
      }
    }

    return true;
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
      this.onceEvents.delete(event);
    } else {
      this.events.clear();
      this.onceEvents.clear();
    }

    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all listeners for an event
   */
  listeners(event: string): EventListener[] {
    const listeners = this.events.get(event);
    return listeners ? [...listeners] : [];
  }

  /**
   * Get all event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Set maximum number of listeners per event
   */
  setMaxListeners(max: number): this {
    this.maxListeners = max;
    return this;
  }

  /**
   * Get maximum number of listeners per event
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Add listener to beginning of listeners array
   */
  prependListener(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)!.unshift(listener);
    return this;
  }

  /**
   * Add one-time listener to beginning of listeners array
   */
  prependOnceListener(event: string, listener: EventListener): this {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }

    this.onceEvents.get(event)!.add(listener);
    return this.prependListener(event, listener);
  }

  /**
   * Create a promise that resolves when the event is emitted
   */
  waitFor(event: string, timeout?: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: any;

      const cleanup = () => {
        if (timeoutHandle) {
          (globalThis as any).clearTimeout(timeoutHandle);
        }
      };

      const listener = (...args: any[]) => {
        cleanup();
        resolve(args);
      };

      this.once(event, listener);

      if (timeout) {
        timeoutHandle = (globalThis as any).setTimeout(() => {
          this.off(event, listener);
          reject(new Error(`Timeout waiting for event "${event}"`));
        }, timeout);
      }
    });
  }

  /**
   * Pipe events from another emitter
   */
  pipe(sourceEmitter: EventEmitterInterface, events: string[] = []): this {
    const eventsToMonitor = events.length > 0 ? events : (sourceEmitter as any).eventNames ? (sourceEmitter as any).eventNames() : [];

    for (const event of eventsToMonitor) {
      sourceEmitter.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
    }

    return this;
  }

  /**
   * Create a child emitter that forwards events to this emitter
   */
  createChild(): EventEmitter {
    const child = new EventEmitter();
    child.pipe(this);
    return child;
  }

  /**
   * Check if emitter has any listeners
   */
  hasListeners(event?: string): boolean {
    if (event) {
      return this.listenerCount(event) > 0;
    }

    return this.events.size > 0;
  }

  /**
   * Dispose of the event emitter
   */
  dispose(): void {
    this.removeAllListeners();
  }
}