/**
 * Supply Chain Event Bus System
 * Manages event communication across the entire supply chain simulation
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  SupplyChainEvent,
  EventType,
  TimeStamp,
  EntityId,
  EventConfiguration
} from './types';

export interface EventHandler<T = any> {
  (event: SupplyChainEvent, data?: T): void | Promise<void>;
}

export interface EventSubscription {
  id: string;
  eventType: EventType;
  handler: EventHandler;
  priority: number;
  once: boolean;
  filter?: (event: SupplyChainEvent) => boolean;
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  averageProcessingTime: number;
  errorCount: number;
  lastProcessed: TimeStamp;
}

export class EventBus extends EventEmitter {
  private subscriptions: Map<EventType, EventSubscription[]> = new Map();
  private eventHistory: SupplyChainEvent[] = [];
  private eventMetrics: EventMetrics;
  private config: EventConfiguration;
  private isProcessing = false;
  private eventQueue: SupplyChainEvent[] = [];
  private processingPromises: Map<string, Promise<void>> = new Map();

  constructor(config: EventConfiguration) {
    super();
    this.config = config;
    this.eventMetrics = {
      totalEvents: 0,
      eventsByType: {} as Record<EventType, number>,
      averageProcessingTime: 0,
      errorCount: 0,
      lastProcessed: { gameTime: 0, realTime: Date.now() }
    };

    // Initialize event type counters
    Object.values(EventType).forEach(type => {
      this.eventMetrics.eventsByType[type] = 0;
    });
  }

  /**
   * Subscribe to events with optional filtering and priority
   */
  subscribe<T = any>(
    eventType: EventType,
    handler: EventHandler<T>,
    options: {
      priority?: number;
      once?: boolean;
      filter?: (event: SupplyChainEvent) => boolean;
    } = {}
  ): string {
    if (!this.config.enabledTypes.includes(eventType)) {
      (globalThis as any).console.warn(`Event type ${eventType} is not enabled in configuration`);
      return '';
    }

    const subscription: EventSubscription = {
      id: this.generateSubscriptionId(),
      eventType,
      handler: handler as EventHandler,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      filter: options.filter
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const typeSubscriptions = this.subscriptions.get(eventType)!;
    typeSubscriptions.push(subscription);

    // Sort by priority (higher priority first)
    typeSubscriptions.sort((a, b) => b.priority - a.priority);

    super.emit('subscription-added', eventType, subscription.id);
    return subscription.id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        super.emit('subscription-removed', eventType, subscriptionId);
        return true;
      }
    }
    return false;
  }

  /**
   * Publish an event to all subscribers
   */
  async publish(event: SupplyChainEvent): Promise<void> {
    if (!this.config.enabledTypes.includes(event.type)) {
      return;
    }

    // Add to history if configured
    if (this.config.persistEvents) {
      this.addToHistory(event);
    }

    // Add to queue for processing
    this.eventQueue.push(event);

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processEventQueue();
    }
  }

  /**
   * Create and publish a new event
   */
  async publishEvent(
    type: EventType,
    sourceId: EntityId,
    data: Record<string, any>,
    options: {
      targetId?: EntityId;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<void> {
    const event: SupplyChainEvent = {
      id: this.generateEventId(),
      type,
      timestamp: this.getCurrentTimestamp(),
      sourceId,
      targetId: options.targetId,
      severity: options.severity ?? 'medium',
      data,
      handled: false
    };

    await this.publish(event);
  }

  /**
   * Process the event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } catch (error) {
      (globalThis as any).console.error('Error processing event queue:', error instanceof Error ? error.message : String(error));
      this.eventMetrics.errorCount++;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: SupplyChainEvent): Promise<void> {
    const startTime = Date.now();

    try {
      const subscriptions = this.subscriptions.get(event.type) || [];
      const promises: Promise<void>[] = [];

      for (const subscription of subscriptions) {
        // Apply filter if provided
        if (subscription.filter && !subscription.filter(event)) {
          continue;
        }

        // Create processing promise
        const promise = this.executeHandler(subscription, event);
        promises.push(promise);

        // Remove one-time subscriptions
        if (subscription.once) {
          this.unsubscribe(subscription.id);
        }
      }

      // Wait for all handlers to complete
      await Promise.allSettled(promises);

      // Update metrics
      this.updateEventMetrics(event, Date.now() - startTime);
      event.handled = true;

      // Emit completion event
      super.emit('event-processed', {
        eventId: event.id,
        processingTime: Date.now() - startTime
      });

    } catch (error) {
      (globalThis as any).console.error(`Error processing event ${event.id}:`, error instanceof Error ? error.message : String(error));
      this.eventMetrics.errorCount++;

      super.emit('event-error', {
        eventId: event.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute a single event handler
   */
  private async executeHandler(
    subscription: EventSubscription,
    event: SupplyChainEvent
  ): Promise<void> {
    try {
      const result = subscription.handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      (globalThis as any).console.error(`Error in event handler ${subscription.id}:`, error instanceof Error ? error.message : String(error));
      this.eventMetrics.errorCount++;
      throw error;
    }
  }

  /**
   * Get event history with optional filtering
   */
  getEventHistory(
    filter?: {
      eventType?: EventType;
      sourceId?: EntityId;
      targetId?: EntityId;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      timeRange?: { start: TimeStamp; end: TimeStamp };
      limit?: number;
    }
  ): SupplyChainEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      if (filter.eventType) {
        events = events.filter(e => e.type === filter.eventType);
      }
      if (filter.sourceId) {
        events = events.filter(e => e.sourceId === filter.sourceId);
      }
      if (filter.targetId) {
        events = events.filter(e => e.targetId === filter.targetId);
      }
      if (filter.severity) {
        events = events.filter(e => e.severity === filter.severity);
      }
      if (filter.timeRange) {
        events = events.filter(e =>
          e.timestamp.gameTime >= filter.timeRange!.start.gameTime &&
          e.timestamp.gameTime <= filter.timeRange!.end.gameTime
        );
      }
      if (filter.limit) {
        events = events.slice(-filter.limit);
      }
    }

    return events;
  }

  /**
   * Get current event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.eventMetrics };
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    super.emit('history-cleared', {});
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const subscriptions of this.subscriptions.values()) {
      count += subscriptions.length;
    }
    return count;
  }

  /**
   * Get subscriptions for a specific event type
   */
  getSubscriptions(eventType: EventType): EventSubscription[] {
    return [...(this.subscriptions.get(eventType) || [])];
  }

  /**
   * Wait for a specific event with optional timeout
   */
  async waitForEvent(
    eventType: EventType,
    filter?: (event: SupplyChainEvent) => boolean,
    timeout?: number
  ): Promise<SupplyChainEvent> {
    return new Promise((resolve, reject) => {
      let subscriptionId: string;
      let timeoutHandle: any;

      const cleanup = () => {
        if (subscriptionId) {
          this.unsubscribe(subscriptionId);
        }
        if (timeoutHandle) {
          (globalThis as any).clearTimeout(timeoutHandle);
        }
      };

      subscriptionId = this.subscribe(
        eventType,
        (event) => {
          cleanup();
          resolve(event);
        },
        { once: true, filter }
      );

      if (timeout) {
        timeoutHandle = (globalThis as any).setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event ${eventType}`));
        }, timeout);
      }
    });
  }

  /**
   * Add event to history with buffer management
   */
  private addToHistory(event: SupplyChainEvent): void {
    this.eventHistory.push(event);

    // Maintain buffer size
    if (this.eventHistory.length > this.config.bufferSize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Update event processing metrics
   */
  private updateEventMetrics(event: SupplyChainEvent, processingTime: number): void {
    this.eventMetrics.totalEvents++;
    this.eventMetrics.eventsByType[event.type]++;

    // Update average processing time
    const total = this.eventMetrics.averageProcessingTime * (this.eventMetrics.totalEvents - 1);
    this.eventMetrics.averageProcessingTime = (total + processingTime) / this.eventMetrics.totalEvents;

    this.eventMetrics.lastProcessed = event.timestamp;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current timestamp
   */
  private getCurrentTimestamp(): TimeStamp {
    return {
      gameTime: 0, // This should be injected by the simulation engine
      realTime: Date.now()
    };
  }

  /**
   * Dispose of the event bus and clean up resources
   */
  dispose(): void {
    // Clear all subscriptions
    this.subscriptions.clear();

    // Clear event history
    this.eventHistory = [];

    // Clear event queue
    this.eventQueue = [];

    // Clear processing promises
    this.processingPromises.clear();

    // Remove all listeners
    this.removeAllListeners();

    super.emit('event-bus-disposed', {});
  }
}