import { EventEmitter } from '../utils/EventEmitter';
import {
  AnalyticsEvent,
  AnalyticsSession,
  EventType,
  EventCategory,
  EventMetadata,
  SessionMetrics,
  SessionContext,
  AnalyticsEventHandler,
  SessionEventHandler,
  AnalyticsConfig
} from '../types';

export class AnalyticsEngine extends EventEmitter {
  private events: Map<string, AnalyticsEvent> = new Map();
  private sessions: Map<string, AnalyticsSession> = new Map();
  private currentSession?: AnalyticsSession;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private batchSize: number = 100;
  private flushInterval: number = 5000; // 5 seconds
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer?: any;
  private config: AnalyticsConfig & LocalAnalyticsConfig;

  constructor(config: AnalyticsConfig) {
    super();
    this.config = {
      ...config,
      startTime: Date.now(),
      source: config.apiKey || 'direct'
    };
    this.startFlushTimer();
  }

  public track(
    type: EventType,
    category: EventCategory,
    data: Record<string, any>,
    metadata?: Partial<EventMetadata>
  ): string {
    const event = this.createEvent(type, category, data, metadata);
    this.addEvent(event);
    return event.id;
  }

  public trackPageView(page: string, data: Record<string, any> = {}): string {
    return this.track(EventType.PAGE_VIEW, EventCategory.ENGAGEMENT, {
      page,
      ...data
    });
  }

  public trackUserAction(action: string, target: string, data: Record<string, any> = {}): string {
    return this.track(EventType.USER_ACTION, EventCategory.ENGAGEMENT, {
      action,
      target,
      ...data
    });
  }

  public trackConversion(
    type: string,
    value?: number,
    currency?: string,
    data: Record<string, any> = {}
  ): string {
    return this.track(EventType.CONVERSION, EventCategory.MONETIZATION, {
      type,
      value,
      currency,
      ...data
    });
  }

  public trackError(
    error: Error,
    context: string,
    data: Record<string, any> = {}
  ): string {
    return this.track(EventType.ERROR, EventCategory.TECHNICAL, {
      message: error.message,
      stack: error.stack,
      context,
      ...data
    });
  }

  public trackPerformance(
    metric: string,
    value: number,
    unit: string,
    data: Record<string, any> = {}
  ): string {
    return this.track(EventType.PERFORMANCE, EventCategory.TECHNICAL, {
      metric,
      value,
      unit,
      ...data
    });
  }

  private createEvent(
    type: EventType,
    category: EventCategory,
    data: Record<string, any>,
    metadata?: Partial<EventMetadata>
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category,
      timestamp: Date.now(),
      sessionId: this.getCurrentSessionId(),
      userId: this.config.userId,
      data,
      metadata: {
        source: this.config.source || 'unknown',
        version: this.config.version || '1.0.0',
        environment: this.config.environment || 'production',
        platform: this.detectPlatform(),
        location: this.getCurrentLocation(),
        device: this.getDeviceInfo(),
        performance: this.getPerformanceContext(),
        ...metadata
      }
    };

    return event;
  }

  private addEvent(event: AnalyticsEvent): void {
    this.events.set(event.id, event);
    this.eventQueue.push(event);

    // Update current session
    this.updateCurrentSession(event);

    // Emit event for real-time processing
    this.emit('event', event);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }

  private updateCurrentSession(event: AnalyticsEvent): void {
    if (!this.currentSession || this.isSessionExpired(this.currentSession)) {
      this.startNewSession(event);
    } else {
      this.addEventToSession(this.currentSession, event);
    }
  }

  private startNewSession(event: AnalyticsEvent): void {
    // End previous session if exists
    if (this.currentSession) {
      this.endSession(this.currentSession);
    }

    // Create new session
    this.currentSession = {
      id: this.generateSessionId(),
      userId: event.userId,
      startTime: event.timestamp,
      events: [event],
      metrics: this.initializeSessionMetrics(),
      context: this.createSessionContext()
    };

    this.sessions.set(this.currentSession.id, this.currentSession);
    this.emit('session_started', this.currentSession);
  }

  private addEventToSession(session: AnalyticsSession, event: AnalyticsEvent): void {
    session.events.push(event);
    this.updateSessionMetrics(session, event);
    this.emit('session_updated', session);
  }

  private endSession(session: AnalyticsSession): void {
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Final metrics calculation
    this.finalizeSessionMetrics(session);

    this.emit('session_ended', session);
  }

  private isSessionExpired(session: AnalyticsSession): boolean {
    const lastEventTime = session.events.length > 0
      ? session.events[session.events.length - 1].timestamp
      : session.startTime;

    return Date.now() - lastEventTime > this.sessionTimeout;
  }

  private initializeSessionMetrics(): SessionMetrics {
    return {
      eventCount: 0,
      errorCount: 0,
      averageEventFrequency: 0,
      totalEngagementTime: 0,
      bounceRate: 0,
      conversionEvents: 0,
      customMetrics: {}
    };
  }

  private updateSessionMetrics(session: AnalyticsSession, event: AnalyticsEvent): void {
    const metrics = session.metrics;

    metrics.eventCount = session.events.length;

    if (event.type === EventType.ERROR) {
      metrics.errorCount++;
    }

    if (event.type === EventType.CONVERSION) {
      metrics.conversionEvents++;
    }

    // Calculate engagement time (simplified)
    if (session.events.length > 1) {
      const totalTime = event.timestamp - session.startTime;
      metrics.totalEngagementTime = totalTime;
      metrics.averageEventFrequency = metrics.eventCount / (totalTime / 60000); // events per minute
    }

    // Update custom metrics from event data
    for (const [key, value] of Object.entries(event.data)) {
      if (typeof value === 'number') {
        metrics.customMetrics[key] = (metrics.customMetrics[key] || 0) + value;
      }
    }
  }

  private finalizeSessionMetrics(session: AnalyticsSession): void {
    const metrics = session.metrics;

    // Calculate bounce rate (simplified: single page view session)
    const pageViews = session.events.filter(e => e.type === EventType.PAGE_VIEW);
    metrics.bounceRate = pageViews.length <= 1 ? 1 : 0;

    // Final engagement time calculation
    if (session.endTime) {
      metrics.totalEngagementTime = session.endTime - session.startTime;
    }
  }

  private createSessionContext(): SessionContext {
    return {
      source: this.config.source || 'direct',
      campaign: this.config.campaign,
      medium: this.config.medium,
      referrer: this.config.referrer,
      landingPage: this.config.landingPage,
      userAgent: this.getUserAgent(),
      ip: this.config.ip,
      country: this.config.country,
      city: this.config.city
    };
  }

  private detectPlatform(): string {
    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process?.versions?.node) {
      return 'node';
    } else if (typeof (globalThis as any).window !== 'undefined') {
      return 'web';
    }
    return 'game-engine';
  }

  private getCurrentLocation(): any {
    // In a real implementation, this would use geolocation API
    return undefined;
  }

  private getDeviceInfo(): any {
    const navigator = (globalThis as any).navigator;
    const screen = (globalThis as any).screen;
    const window = (globalThis as any).window;
    if (navigator) {
      return {
        userAgent: navigator.userAgent || 'Game Engine',
        screen: screen ? {
          width: screen.width || 1920,
          height: screen.height || 1080,
          pixelRatio: (window && window.devicePixelRatio) || 1,
          colorDepth: screen.colorDepth || 24
        } : { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
        memory: navigator.deviceMemory || 0,
        cores: navigator.hardwareConcurrency || 0,
        connection: this.getConnectionInfo()
      };
    }
    return {
      userAgent: 'Game Engine',
      screen: { width: 1920, height: 1080, pixelRatio: 1, colorDepth: 24 },
      memory: 0,
      cores: 0,
      connection: undefined
    };
  }

  private getConnectionInfo(): any {
    const navigator = (globalThis as any).navigator;
    if (navigator && navigator.connection) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    return undefined;
  }

  private getPerformanceContext(): any {
    const performance = (globalThis as any).performance;
    if (performance) {
      const memory = performance.memory;
      return {
        frameRate: 0, // Would be calculated from requestAnimationFrame
        memoryUsage: memory ? memory.usedJSHeapSize : 0,
        cpuUsage: 0, // Would need to be calculated
        loadTime: performance.now()
      };
    }
    return {
      frameRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      loadTime: Date.now()
    };
  }

  private getUserAgent(): string {
    const navigator = (globalThis as any).navigator;
    return navigator ? navigator.userAgent : 'Game Engine';
  }

  private getCurrentSessionId(): string {
    return this.currentSession?.id || this.generateSessionId();
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = (globalThis as any).setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private flush(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    this.emit('batch_ready', eventsToFlush);

    // Send to configured destinations
    this.sendToDestinations(eventsToFlush);
  }

  private sendToDestinations(events: AnalyticsEvent[]): void {
    for (const destination of this.config.destinations || []) {
      this.sendToDestination(destination, events);
    }
  }

  private async sendToDestination(destination: any, events: AnalyticsEvent[]): Promise<void> {
    try {
      switch (destination.type) {
        case 'console':
          this.sendToConsole(events);
          break;
        case 'http':
          await this.sendToHttp(destination.config, events);
          break;
        case 'storage':
          await this.sendToStorage(destination.config, events);
          break;
        default:
          (globalThis as any).console?.warn(`Unknown destination type: ${destination.type}`);
      }
    } catch (error) {
      this.emit('destination_error', destination, error);
    }
  }

  private sendToConsole(events: AnalyticsEvent[]): void {
    (globalThis as any).console?.log('Analytics Events:', events);
  }

  private async sendToHttp(config: any, events: AnalyticsEvent[]): Promise<void> {
    const payload = {
      events,
      timestamp: Date.now(),
      source: this.config.source
    };

    // In a real implementation, this would use fetch or HTTP client
    (globalThis as any).console?.log(`Would send ${events.length} events to ${config.url}`);
  }

  private async sendToStorage(config: any, events: AnalyticsEvent[]): Promise<void> {
    // In a real implementation, this would save to local storage, IndexedDB, etc.
    (globalThis as any).console?.log(`Would store ${events.length} events to ${config.type}`);
  }

  public getEvents(filters?: EventFilters): AnalyticsEvent[] {
    let events = Array.from(this.events.values());

    if (filters) {
      events = this.filterEvents(events, filters);
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getSessions(filters?: SessionFilters): AnalyticsSession[] {
    let sessions = Array.from(this.sessions.values());

    if (filters) {
      sessions = this.filterSessions(sessions, filters);
    }

    return sessions.sort((a, b) => b.startTime - a.startTime);
  }

  private filterEvents(events: AnalyticsEvent[], filters: EventFilters): AnalyticsEvent[] {
    return events.filter(event => {
      if (filters.type && event.type !== filters.type) {
        return false;
      }

      if (filters.category && event.category !== filters.category) {
        return false;
      }

      if (filters.sessionId && event.sessionId !== filters.sessionId) {
        return false;
      }

      if (filters.userId && event.userId !== filters.userId) {
        return false;
      }

      if (filters.startTime && event.timestamp < filters.startTime) {
        return false;
      }

      if (filters.endTime && event.timestamp > filters.endTime) {
        return false;
      }

      return true;
    });
  }

  private filterSessions(sessions: AnalyticsSession[], filters: SessionFilters): AnalyticsSession[] {
    return sessions.filter(session => {
      if (filters.userId && session.userId !== filters.userId) {
        return false;
      }

      if (filters.startTime && session.startTime < filters.startTime) {
        return false;
      }

      if (filters.endTime && session.startTime > filters.endTime) {
        return false;
      }

      if (filters.minDuration && session.duration && session.duration < filters.minDuration) {
        return false;
      }

      if (filters.maxDuration && session.duration && session.duration > filters.maxDuration) {
        return false;
      }

      return true;
    });
  }

  public getCurrentSession(): AnalyticsSession | undefined {
    return this.currentSession;
  }

  public setUserId(userId: string): void {
    this.config.userId = userId;

    if (this.currentSession) {
      this.currentSession.userId = userId;
    }
  }

  public setSessionTimeout(timeout: number): void {
    this.sessionTimeout = timeout;
  }

  public setBatchSize(size: number): void {
    this.batchSize = size;
  }

  public setFlushInterval(interval: number): void {
    this.flushInterval = interval;

    if (this.flushTimer) {
      (globalThis as any).clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
  }

  public forceFlush(): void {
    this.flush();
  }

  public clearEvents(): void {
    this.events.clear();
    this.eventQueue = [];
    this.emit('events_cleared');
  }

  public clearSessions(): void {
    this.sessions.clear();
    this.currentSession = undefined;
    this.emit('sessions_cleared');
  }

  public getMetrics(): EngineMetrics {
    return {
      totalEvents: this.events.size,
      totalSessions: this.sessions.size,
      queuedEvents: this.eventQueue.length,
      currentSessionId: this.currentSession?.id,
      uptime: Date.now() - this.config.startTime
    };
  }

  // Unity export functionality
  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      analytics: {
        totalEvents: this.events.size,
        totalSessions: this.sessions.size,
        queuedEvents: this.eventQueue.length,
        currentSessionId: this.currentSession?.id,
        recentEvents: Array.from(this.events.values()).slice(-10),
        activeSessions: Array.from(this.sessions.values()).filter(s => !s.endTime),
        metrics: this.getMetrics()
      },
      config: {
        environment: this.config.environment,
        batchSize: this.batchSize,
        flushInterval: this.flushInterval,
        sessionTimeout: this.sessionTimeout
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  public destroy(): void {
    if (this.flushTimer) {
      (globalThis as any).clearInterval(this.flushTimer);
    }

    // Flush remaining events
    this.flush();

    // End current session
    if (this.currentSession) {
      this.endSession(this.currentSession);
    }

    this.removeAllListeners();
  }

  public on(event: 'event', listener: AnalyticsEventHandler): this;
  public on(event: 'session_started' | 'session_updated' | 'session_ended', listener: SessionEventHandler): this;
  public on(event: 'batch_ready', listener: (events: AnalyticsEvent[]) => void): this;
  public on(event: 'destination_error', listener: (destination: any, error: Error) => void): this;
  public on(event: 'events_cleared' | 'sessions_cleared', listener: () => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

interface LocalAnalyticsConfig {
  source?: string;
  version?: string;
  environment?: string;
  userId?: string;
  campaign?: string;
  medium?: string;
  referrer?: string;
  landingPage?: string;
  ip?: string;
  country?: string;
  city?: string;
  destinations?: DestinationConfig[];
  startTime: number;
}

interface DestinationConfig {
  type: 'console' | 'http' | 'storage';
  config: any;
}

interface EventFilters {
  type?: EventType;
  category?: EventCategory;
  sessionId?: string;
  userId?: string;
  startTime?: number;
  endTime?: number;
}

interface SessionFilters {
  userId?: string;
  startTime?: number;
  endTime?: number;
  minDuration?: number;
  maxDuration?: number;
}

interface EngineMetrics {
  totalEvents: number;
  totalSessions: number;
  queuedEvents: number;
  currentSessionId?: string;
  uptime: number;
}