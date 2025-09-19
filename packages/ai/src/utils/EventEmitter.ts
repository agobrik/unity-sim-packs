/**
 * Simple EventEmitter implementation for Steam Simulation Toolkit
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

  once(event: string, handler: Function): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper);
      handler(...args);
    };
    return this.on(event, onceWrapper);
  }

  off(event: string, handler?: Function): this {
    if (!handler) {
      this.listeners.delete(event);
      return this;
    }

    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
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
    if (typeof globalPerf !== 'undefined' && globalPerf.now) {
      return globalPerf.now();
    }
    return Date.now();
  }
};