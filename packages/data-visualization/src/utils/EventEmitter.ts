/**
 * Simple EventEmitter implementation for Steam Simulation Toolkit Data Visualization
 */

export class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  emit(event: string, ...args: any[]): boolean {
    const handlers = this.listeners.get(event);
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          (globalThis as any).console?.error(`EventEmitter error in handler for event '${event}':`, error);
        }
      });
      return true;
    }
    return false;
  }

  on(event: string, handler: Function): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    return this;
  }

  off(event: string, handler?: Function): this {
    if (!this.listeners.has(event)) return this;

    if (handler) {
      const handlers = this.listeners.get(event)!;
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  once(event: string, handler: Function): this {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    return this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }

  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}

export const timer = {
  setInterval: (callback: (...args: any[]) => void, delay: number): any => {
    return (globalThis as any).setInterval(callback, delay);
  },

  clearInterval: (id: any): void => {
    (globalThis as any).clearInterval(id);
  },

  setTimeout: (callback: (...args: any[]) => void, delay: number): any => {
    return (globalThis as any).setTimeout(callback, delay);
  },

  clearTimeout: (id: any): void => {
    (globalThis as any).clearTimeout(id);
  }
};

export const perf = {
  now: (): number => {
    const globalPerf = (globalThis as any).performance;
    if (typeof globalPerf !== 'undefined' && globalPerf?.now) {
      return globalPerf.now();
    }
    return Date.now();
  }
};