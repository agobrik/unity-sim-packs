/**
 * Supply Chain Node - Base class for all nodes in the supply chain network
 * Represents any location or facility that can process, store, or transfer products
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  NodeId,
  EntityId,
  NodeType,
  NodeStatus,
  NodeCapabilities,
  Coordinates,
  TimeStamp,
  EventType,
  OperationResult,
  SupplyChainError
} from '../core/types';

export interface NodeConfiguration {
  id: NodeId;
  name: string;
  type: NodeType;
  coordinates: Coordinates;
  capabilities: NodeCapabilities;
  maxConnections?: number;
  operatingHours?: {
    start: number;
    end: number;
    daysOfWeek: number[];
  };
  maintenanceSchedule?: {
    interval: number;
    duration: number;
    lastMaintenance: TimeStamp;
  };
}

export interface NodeMetrics {
  utilization: number;
  throughput: number;
  efficiency: number;
  uptime: number;
  errorRate: number;
  lastUpdated: TimeStamp;
}

export interface ConnectionInfo {
  targetNodeId: NodeId;
  routeId: string;
  weight: number;
  capacity: number;
  bidirectional: boolean;
}

export class Node extends EventEmitter {
  protected config: NodeConfiguration;
  protected status: NodeStatus = NodeStatus.INACTIVE;
  protected connections: Map<NodeId, ConnectionInfo> = new Map();
  protected metrics: NodeMetrics;
  protected eventBus: EventBus;
  protected lastActivity: TimeStamp;
  protected errors: SupplyChainError[] = [];

  constructor(config: NodeConfiguration, eventBus: EventBus) {
    super();
    this.config = config;
    this.eventBus = eventBus;
    this.lastActivity = { gameTime: 0, realTime: Date.now() };
    this.metrics = {
      utilization: 0,
      throughput: 0,
      efficiency: 0,
      uptime: 0,
      errorRate: 0,
      lastUpdated: this.lastActivity
    };

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for node events
   */
  private setupEventHandlers(): void {
    this.on('status-changed', (data) => {
      this.eventBus.publishEvent(EventType.PRODUCTION_STARTED, this.config.id, {
        nodeType: this.config.type,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus
      });
    });

    this.on('connection-added', (data) => {
      this.eventBus.publishEvent(EventType.PRODUCTION_STARTED, this.config.id, {
        action: 'connection-added',
        targetNodeId: data.targetNodeId
      });
    });

    this.on('error', (error) => {
      this.handleError(error);
    });
  }

  /**
   * Initialize the node
   */
  async initialize(): Promise<OperationResult<void>> {
    try {
      this.setStatus(NodeStatus.ACTIVE);

      await this.eventBus.publishEvent(
        EventType.PRODUCTION_STARTED,
        this.config.id,
        {
          nodeType: this.config.type,
          coordinates: this.config.coordinates
        }
      );

      return { success: true, warnings: [] };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_FAILED',
          message: `Failed to initialize node: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          context: { nodeId: this.config.id, nodeType: this.config.type },
          timestamp: this.getCurrentTimestamp(),
          recoverable: true
        },
        warnings: []
      };
    }
  }

  /**
   * Update node state
   */
  async update(currentTime: TimeStamp): Promise<void> {
    this.lastActivity = currentTime;

    // Check if node should be active based on operating hours
    if (!this.isWithinOperatingHours(currentTime)) {
      if (this.status === NodeStatus.ACTIVE) {
        this.setStatus(NodeStatus.INACTIVE);
      }
      return;
    }

    // Check for scheduled maintenance
    if (this.isMaintenanceDue(currentTime)) {
      this.setStatus(NodeStatus.MAINTENANCE);
      await this.performMaintenance(currentTime);
      return;
    }

    // Resume normal operations if in maintenance and maintenance is complete
    if (this.status === NodeStatus.MAINTENANCE && !this.isMaintenanceDue(currentTime)) {
      this.setStatus(NodeStatus.ACTIVE);
    }

    // Update metrics
    await this.updateMetrics(currentTime);

    // Perform node-specific updates
    await this.performUpdate(currentTime);
  }

  /**
   * Node-specific update logic (to be overridden by subclasses)
   */
  protected async performUpdate(currentTime: TimeStamp): Promise<void> {
    // Default implementation - override in subclasses
  }

  /**
   * Add connection to another node
   */
  addConnection(connectionInfo: ConnectionInfo): OperationResult<void> {
    if (this.config.maxConnections && this.connections.size >= this.config.maxConnections) {
      return {
        success: false,
        error: {
          code: 'MAX_CONNECTIONS_EXCEEDED',
          message: `Node ${this.config.id} has reached maximum connections limit`,
          severity: 'warning',
          context: {
            currentConnections: this.connections.size,
            maxConnections: this.config.maxConnections
          },
          timestamp: this.getCurrentTimestamp(),
          recoverable: true
        },
        warnings: []
      };
    }

    this.connections.set(connectionInfo.targetNodeId, connectionInfo);

    this.emit('connection-added', {
      targetNodeId: connectionInfo.targetNodeId,
      routeId: connectionInfo.routeId
    });

    return { success: true, warnings: [] };
  }

  /**
   * Remove connection to another node
   */
  removeConnection(targetNodeId: NodeId): OperationResult<void> {
    if (!this.connections.has(targetNodeId)) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_NOT_FOUND',
          message: `No connection found to node ${targetNodeId}`,
          severity: 'warning',
          context: { targetNodeId },
          timestamp: this.getCurrentTimestamp(),
          recoverable: true
        },
        warnings: []
      };
    }

    const connectionInfo = this.connections.get(targetNodeId)!;
    this.connections.delete(targetNodeId);

    this.emit('connection-removed', {
      targetNodeId,
      routeId: connectionInfo.routeId
    });

    return { success: true, warnings: [] };
  }

  /**
   * Get all connections
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection to specific node
   */
  getConnection(targetNodeId: NodeId): ConnectionInfo | undefined {
    return this.connections.get(targetNodeId);
  }

  /**
   * Check if node is connected to target
   */
  isConnectedTo(targetNodeId: NodeId): boolean {
    return this.connections.has(targetNodeId);
  }

  /**
   * Get node capacity for specific operation
   */
  getCapacity(operationType: 'production' | 'storage' | 'processing' | 'transport'): number {
    const capabilities = this.config.capabilities;

    switch (operationType) {
      case 'production':
        return capabilities.production.reduce((total, cap) => total + cap.capacity, 0);
      case 'storage':
        return capabilities.storage.reduce((total, cap) => total + cap.capacity, 0);
      case 'processing':
        return capabilities.processing.reduce((total, cap) => total + cap.throughput, 0);
      case 'transport':
        return capabilities.transport.reduce((total, cap) => total + cap.loadingCapacity, 0);
      default:
        return 0;
    }
  }

  /**
   * Check if node can perform specific operation
   */
  canPerform(operationType: 'production' | 'storage' | 'processing' | 'transport'): boolean {
    const capabilities = this.config.capabilities;

    switch (operationType) {
      case 'production':
        return capabilities.production.length > 0;
      case 'storage':
        return capabilities.storage.length > 0;
      case 'processing':
        return capabilities.processing.length > 0;
      case 'transport':
        return capabilities.transport.length > 0;
      default:
        return false;
    }
  }

  /**
   * Set node status
   */
  protected setStatus(newStatus: NodeStatus): void {
    const oldStatus = this.status;
    this.status = newStatus;

    this.emit('status-changed', {
      oldStatus,
      newStatus,
      timestamp: this.getCurrentTimestamp()
    });
  }

  /**
   * Check if current time is within operating hours
   */
  private isWithinOperatingHours(currentTime: TimeStamp): boolean {
    if (!this.config.operatingHours) {
      return true; // 24/7 operation
    }

    const date = new Date(currentTime.realTime);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    return this.config.operatingHours.daysOfWeek.includes(dayOfWeek) &&
           hour >= this.config.operatingHours.start &&
           hour < this.config.operatingHours.end;
  }

  /**
   * Check if maintenance is due
   */
  private isMaintenanceDue(currentTime: TimeStamp): boolean {
    if (!this.config.maintenanceSchedule) {
      return false;
    }

    const timeSinceLastMaintenance =
      currentTime.gameTime - this.config.maintenanceSchedule.lastMaintenance.gameTime;

    return timeSinceLastMaintenance >= this.config.maintenanceSchedule.interval;
  }

  /**
   * Perform maintenance operations
   */
  private async performMaintenance(currentTime: TimeStamp): Promise<void> {
    if (!this.config.maintenanceSchedule) {
      return;
    }

    // Simulate maintenance duration
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 100)); // Minimal delay for simulation

    // Update last maintenance time
    this.config.maintenanceSchedule.lastMaintenance = currentTime;

    // Reset error count and improve efficiency
    this.errors = [];
    this.metrics.errorRate = 0;
    this.metrics.efficiency = Math.min(100, this.metrics.efficiency + 5);

    this.emit('maintenance-completed', {
      timestamp: currentTime,
      duration: this.config.maintenanceSchedule.duration
    });
  }

  /**
   * Update node metrics
   */
  private async updateMetrics(currentTime: TimeStamp): Promise<void> {
    // Calculate uptime
    const totalTime = currentTime.gameTime;
    const downtime = this.calculateDowntime();
    this.metrics.uptime = totalTime > 0 ? ((totalTime - downtime) / totalTime) * 100 : 100;

    // Update error rate
    this.metrics.errorRate = this.errors.length / Math.max(1, totalTime / 3600); // errors per hour

    // Update timestamp
    this.metrics.lastUpdated = currentTime;

    this.emit('metrics-updated', {
      metrics: { ...this.metrics },
      timestamp: currentTime
    });
  }

  /**
   * Calculate total downtime
   */
  private calculateDowntime(): number {
    // Simplified downtime calculation
    let downtime = 0;

    if (this.status === NodeStatus.MAINTENANCE && this.config.maintenanceSchedule) {
      downtime += this.config.maintenanceSchedule.duration;
    }

    if (this.status === NodeStatus.FAILED) {
      downtime += 3600; // Assume 1 hour recovery time
    }

    return downtime;
  }

  /**
   * Handle error
   */
  private handleError(error: SupplyChainError): void {
    this.errors.push(error);

    // If too many errors, set status to failed
    if (this.errors.length > 10) {
      this.setStatus(NodeStatus.FAILED);
    }

    this.eventBus.publishEvent(EventType.MAINTENANCE_REQUIRED, this.config.id, {
      error: error instanceof Error ? error.message : String(error),
      errorCount: this.errors.length
    });
  }

  /**
   * Get current timestamp
   */
  private getCurrentTimestamp(): TimeStamp {
    return {
      gameTime: this.lastActivity.gameTime,
      realTime: Date.now()
    };
  }

  // Getters
  getId(): NodeId {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getType(): NodeType {
    return this.config.type;
  }

  getStatus(): NodeStatus {
    return this.status;
  }

  getCoordinates(): Coordinates {
    return { ...this.config.coordinates };
  }

  getCapabilities(): NodeCapabilities {
    return { ...this.config.capabilities };
  }

  getMetrics(): NodeMetrics {
    return { ...this.metrics };
  }

  getErrors(): SupplyChainError[] {
    return [...this.errors];
  }

  /**
   * Dispose of the node and clean up resources
   */
  dispose(): void {
    this.connections.clear();
    this.errors = [];
    this.removeAllListeners();
  }
}