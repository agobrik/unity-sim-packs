/**
 * Supply Chain Engine - Main orchestrator for the entire supply chain simulation
 * Manages all subsystems and coordinates the simulation lifecycle
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from './EventBus';
import {
  SupplyChainConfig,
  SimulationConfig,
  TimeStamp,
  EntityId,
  EventType,
  OperationResult,
  SupplyChainMetrics,
  PerformanceKPI
} from './types';

// Import subsystem managers (these will be created next)
import { SupplyNetwork } from '../networks/SupplyNetwork';
import { InventoryManager } from '../inventory/InventoryManager';
import { ProductionScheduler } from '../production/ProductionScheduler';
import { TransportManager } from '../transportation/TransportManager';
import { SupplyChainAnalytics } from '../analytics/SupplyChainAnalytics';

export enum EngineState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  ERROR = 'error'
}

export interface EngineStatus {
  state: EngineState;
  currentTime: TimeStamp;
  tickCount: number;
  performance: {
    tickDuration: number;
    averageTickTime: number;
    memoryUsage: number;
    eventsProcessed: number;
  };
  subsystems: {
    network: boolean;
    inventory: boolean;
    production: boolean;
    transportation: boolean;
    analytics: boolean;
  };
}

export class SupplyChainEngine extends EventEmitter {
  private config: SupplyChainConfig;
  private eventBus: EventBus;
  private state: EngineState = EngineState.STOPPED;
  private currentTime: TimeStamp;
  private tickCount = 0;
  private tickInterval: any = null;
  private lastTickTime = 0;
  private tickTimes: number[] = [];

  // Subsystem managers
  private network!: SupplyNetwork;
  private inventoryManager!: InventoryManager;
  private productionScheduler!: ProductionScheduler;
  private transportManager!: TransportManager;
  private analytics!: SupplyChainAnalytics;

  // Performance tracking
  private performanceMetrics: Map<string, number> = new Map();
  private errorCount = 0;

  constructor(config: SupplyChainConfig) {
    super();
    this.config = config;
    this.currentTime = { gameTime: 0, realTime: Date.now() };

    // Initialize event bus
    this.eventBus = new EventBus(config.events);
    this.setupEventBusHandlers();

    // Initialize subsystems
    this.initializeSubsystems();

    // Setup error handling
    this.setupErrorHandling();
  }

  /**
   * Initialize all subsystem managers
   */
  private initializeSubsystems(): void {
    try {
      this.network = new SupplyNetwork(this.eventBus);
      this.inventoryManager = new InventoryManager(this.eventBus);
      this.productionScheduler = new ProductionScheduler(this.eventBus);
      this.transportManager = new TransportManager(this.eventBus);
      this.analytics = new SupplyChainAnalytics(this.eventBus, this.config.analytics);

      this.emit('subsystems-initialized');
    } catch (error) {
      this.setState(EngineState.ERROR);
      throw new Error(`Failed to initialize subsystems: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup event bus handlers for engine events
   */
  private setupEventBusHandlers(): void {
    this.eventBus.subscribe(EventType.PRODUCTION_COMPLETED, async (event) => {
      await this.handleProductionCompleted(event);
    });

    this.eventBus.subscribe(EventType.SHIPMENT_DELIVERED, async (event) => {
      await this.handleShipmentDelivered(event);
    });

    this.eventBus.subscribe(EventType.INVENTORY_CRITICAL, async (event) => {
      await this.handleCriticalInventory(event);
    });

    this.eventBus.subscribe(EventType.SUPPLY_DISRUPTION, async (event) => {
      await this.handleSupplyDisruption(event);
    });
  }

  /**
   * Setup error handling and recovery
   */
  private setupErrorHandling(): void {
    if (typeof (globalThis as any).process !== 'undefined') {
      (globalThis as any).process.on('uncaughtException', (error: any) => {
        this.handleCriticalError('Uncaught Exception', error);
      });

      (globalThis as any).process.on('unhandledRejection', (reason: any, promise: any) => {
        this.handleCriticalError('Unhandled Rejection', reason);
      });
    }
  }

  /**
   * Start the supply chain simulation
   */
  async start(): Promise<OperationResult<void>> {
    if (this.state !== EngineState.STOPPED) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot start engine in state: ${this.state}`,
          severity: 'error',
          context: { currentState: this.state },
          timestamp: this.currentTime,
          recoverable: true
        },
        warnings: []
      };
    }

    try {
      this.setState(EngineState.STARTING);

      // Initialize all subsystems
      await this.startSubsystems();

      // Start simulation loop
      this.startSimulationLoop();

      this.setState(EngineState.RUNNING);

      await this.eventBus.publishEvent(
        EventType.PRODUCTION_STARTED,
        'supply-chain-engine',
        { engineState: this.state }
      );

      return {
        success: true,
        warnings: [],
        metrics: this.getPerformanceMetrics()
      };

    } catch (error) {
      this.setState(EngineState.ERROR);
      return {
        success: false,
        error: {
          code: 'START_FAILED',
          message: `Failed to start engine: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'critical',
          context: { error: error instanceof Error ? error.stack : String(error) },
          timestamp: this.currentTime,
          recoverable: false
        },
        warnings: []
      };
    }
  }

  /**
   * Stop the supply chain simulation
   */
  async stop(): Promise<OperationResult<void>> {
    if (this.state === EngineState.STOPPED) {
      return { success: true, warnings: [] };
    }

    try {
      this.setState(EngineState.STOPPING);

      // Stop simulation loop
      this.stopSimulationLoop();

      // Stop all subsystems
      await this.stopSubsystems();

      this.setState(EngineState.STOPPED);

      return { success: true, warnings: [] };

    } catch (error) {
      this.setState(EngineState.ERROR);
      return {
        success: false,
        error: {
          code: 'STOP_FAILED',
          message: `Failed to stop engine: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          context: { error: error instanceof Error ? error.stack : String(error) },
          timestamp: this.currentTime,
          recoverable: true
        },
        warnings: []
      };
    }
  }

  /**
   * Pause the simulation
   */
  pause(): OperationResult<void> {
    if (this.state !== EngineState.RUNNING) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot pause engine in state: ${this.state}`,
          severity: 'warning',
          context: { currentState: this.state },
          timestamp: this.currentTime,
          recoverable: true
        },
        warnings: []
      };
    }

    this.setState(EngineState.PAUSED);
    this.stopSimulationLoop();

    return { success: true, warnings: [] };
  }

  /**
   * Resume the simulation from pause
   */
  resume(): OperationResult<void> {
    if (this.state !== EngineState.PAUSED) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: `Cannot resume engine in state: ${this.state}`,
          severity: 'warning',
          context: { currentState: this.state },
          timestamp: this.currentTime,
          recoverable: true
        },
        warnings: []
      };
    }

    this.setState(EngineState.RUNNING);
    this.startSimulationLoop();

    return { success: true, warnings: [] };
  }

  /**
   * Start all subsystems
   */
  private async startSubsystems(): Promise<void> {
    await this.network.initialize();
    await this.inventoryManager.initialize();
    await this.productionScheduler.initialize();
    await this.transportManager.initialize();
    await this.analytics.initialize();
  }

  /**
   * Stop all subsystems
   */
  private async stopSubsystems(): Promise<void> {
    await this.analytics.shutdown();
    await this.transportManager.shutdown();
    await this.productionScheduler.shutdown();
    await this.inventoryManager.shutdown();
    await this.network.shutdown();
  }

  /**
   * Start the main simulation loop
   */
  private startSimulationLoop(): void {
    if (this.config.simulation.realTimeMode) {
      // Real-time mode
      this.tickInterval = (globalThis as any).setInterval(() => {
        this.executeTick();
      }, this.config.simulation.timeStep);
    } else {
      // Fast simulation mode
      this.scheduleNextTick();
    }
  }

  /**
   * Stop the simulation loop
   */
  private stopSimulationLoop(): void {
    if (this.tickInterval) {
      (globalThis as any).clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /**
   * Schedule the next tick in fast mode
   */
  private scheduleNextTick(): void {
    if (this.state === EngineState.RUNNING) {
      (globalThis as any).setImmediate(() => this.executeTick());
    }
  }

  /**
   * Execute a single simulation tick
   */
  private async executeTick(): Promise<void> {
    const tickStartTime = Date.now();

    try {
      // Update simulation time
      this.updateTime();

      // Execute subsystem updates
      await this.updateSubsystems();

      // Process analytics
      await this.analytics.processTick(this.currentTime);

      // Update performance metrics
      this.updatePerformanceMetrics(tickStartTime);

      // Emit tick event
      this.emit('tick', {
        tickCount: this.tickCount,
        currentTime: this.currentTime,
        duration: Date.now() - tickStartTime
      });

      // Schedule next tick if in fast mode
      if (!this.config.simulation.realTimeMode && this.state === EngineState.RUNNING) {
        this.scheduleNextTick();
      }

    } catch (error) {
      this.handleTickError(error);
    }
  }

  /**
   * Update simulation time
   */
  private updateTime(): void {
    this.tickCount++;
    this.currentTime.gameTime += this.config.simulation.timeStep;
    this.currentTime.realTime = Date.now();
  }

  /**
   * Update all subsystems
   */
  private async updateSubsystems(): Promise<void> {
    const promises = [
      this.network.update(this.currentTime),
      this.inventoryManager.update(this.currentTime),
      this.productionScheduler.update(this.currentTime),
      this.transportManager.update(this.currentTime)
    ];

    await Promise.allSettled(promises);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(tickStartTime: number): void {
    const tickDuration = Date.now() - tickStartTime;
    this.tickTimes.push(tickDuration);

    // Keep only last 100 tick times for average calculation
    if (this.tickTimes.length > 100) {
      this.tickTimes.shift();
    }

    this.performanceMetrics.set('tickDuration', tickDuration);
    this.performanceMetrics.set('averageTickTime',
      this.tickTimes.reduce((a, b) => a + b, 0) / this.tickTimes.length);
    this.performanceMetrics.set('eventsProcessed', this.eventBus.getMetrics().totalEvents);
  }

  /**
   * Handle tick execution errors
   */
  private handleTickError(error: any): void {
    this.errorCount++;
    (globalThis as any).console.error(`Tick ${this.tickCount} error:`, error instanceof Error ? error.message : String(error));

    if (this.errorCount > 10) {
      this.setState(EngineState.ERROR);
      this.stopSimulationLoop();
    }

    this.eventBus.publishEvent('event-error' as EventType, 'supply-chain-engine', {
      error: error instanceof Error ? error.message : String(error),
      tickCount: this.tickCount
    });
  }

  /**
   * Handle critical system errors
   */
  private handleCriticalError(type: string, error: any): void {
    (globalThis as any).console.error(`Critical Error [${type}]:`, error instanceof Error ? error.message : String(error));
    this.setState(EngineState.ERROR);
    this.stopSimulationLoop();

    this.emit('critical-error', { type, error });
  }

  /**
   * Set engine state and emit events
   */
  private setState(newState: EngineState): void {
    const oldState = this.state;
    this.state = newState;

    this.emit('state-changed', {
      oldState,
      newState,
      timestamp: this.currentTime
    });
  }

  /**
   * Get current engine status
   */
  getStatus(): EngineStatus {
    return {
      state: this.state,
      currentTime: this.currentTime,
      tickCount: this.tickCount,
      performance: {
        tickDuration: this.performanceMetrics.get('tickDuration') || 0,
        averageTickTime: this.performanceMetrics.get('averageTickTime') || 0,
        memoryUsage: this.getMemoryUsage(),
        eventsProcessed: this.performanceMetrics.get('eventsProcessed') || 0
      },
      subsystems: {
        network: (this.network as any)?.isInitialized?.() || false,
        inventory: this.inventoryManager?.isInitialized() || false,
        production: this.productionScheduler?.isInitialized() || false,
        transportation: this.transportManager?.isInitialized() || false,
        analytics: this.analytics?.isInitialized() || false
      }
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const [key, value] of this.performanceMetrics.entries()) {
      metrics[key] = value;
    }
    return metrics;
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    try {
      if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.memoryUsage) {
        return (globalThis as any).process.memoryUsage().heapUsed;
      }
    } catch {
      // Fallback for browser environments
    }
    return 0;
  }

  /**
   * Get supply chain metrics
   */
  async getMetrics(): Promise<SupplyChainMetrics> {
    return await this.analytics.getSupplyChainMetrics();
  }

  /**
   * Get key performance indicators
   */
  async getKPIs(): Promise<PerformanceKPI[]> {
    return await this.analytics.getKPIs();
  }

  /**
   * Get the event bus instance
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get network manager
   */
  getNetwork(): SupplyNetwork {
    return this.network;
  }

  /**
   * Get inventory manager
   */
  getInventoryManager(): InventoryManager {
    return this.inventoryManager;
  }

  /**
   * Get production scheduler
   */
  getProductionScheduler(): ProductionScheduler {
    return this.productionScheduler;
  }

  /**
   * Get transport manager
   */
  getTransportManager(): TransportManager {
    return this.transportManager;
  }

  /**
   * Get analytics engine
   */
  getAnalytics(): SupplyChainAnalytics {
    return this.analytics;
  }

  // Event handlers for major supply chain events
  private async handleProductionCompleted(event: any): Promise<void> {
    // Handle production completion logic
  }

  private async handleShipmentDelivered(event: any): Promise<void> {
    // Handle shipment delivery logic
  }

  private async handleCriticalInventory(event: any): Promise<void> {
    // Handle critical inventory alerts
  }

  private async handleSupplyDisruption(event: any): Promise<void> {
    // Handle supply chain disruptions
  }

  /**
   * Dispose of the engine and clean up resources
   */
  async dispose(): Promise<void> {
    await this.stop();

    // Dispose subsystems
    this.analytics?.dispose();
    this.transportManager?.dispose();
    this.productionScheduler?.dispose();
    this.inventoryManager?.dispose();
    this.network?.dispose();

    // Dispose event bus
    this.eventBus?.dispose();

    // Clear performance data
    this.performanceMetrics.clear();
    this.tickTimes = [];

    this.removeAllListeners();
  }
}