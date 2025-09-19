/**
 * Connection Manager - Manages network connections and routing
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  NodeId,
  RouteId,
  TimeStamp,
  OperationResult
} from '../core/types';
import { Route } from './Route';

export interface ConnectionConfig {
  maxConnectionsPerNode: number;
  allowDuplicateRoutes: boolean;
  autoOptimize: boolean;
  optimizationInterval: number;
}

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Set<RouteId>> = new Map();
  private routes: Map<RouteId, Route> = new Map();
  private eventBus: EventBus;
  private config: ConnectionConfig;

  constructor(eventBus: EventBus, config: ConnectionConfig) {
    super();
    this.eventBus = eventBus;
    this.config = config;
  }

  /**
   * Add connection between nodes
   */
  addConnection(route: Route): OperationResult<void> {
    const routeId = route.getId();
    const connectionKey = this.getConnectionKey(route.getFromNodeId(), route.getToNodeId());

    if (!this.config.allowDuplicateRoutes && this.connections.has(connectionKey)) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_CONNECTION',
          message: 'Connection already exists',
          severity: 'warning',
          context: { connectionKey },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    if (!this.connections.has(connectionKey)) {
      this.connections.set(connectionKey, new Set());
    }

    this.connections.get(connectionKey)!.add(routeId);
    this.routes.set(routeId, route);

    this.emit('connection-added', { routeId, connectionKey });
    return { success: true, warnings: [] };
  }

  /**
   * Remove connection
   */
  removeConnection(routeId: RouteId): OperationResult<void> {
    const route = this.routes.get(routeId);
    if (!route) {
      return {
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'Route not found',
          severity: 'error',
          context: { routeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const connectionKey = this.getConnectionKey(route.getFromNodeId(), route.getToNodeId());
    const routeSet = this.connections.get(connectionKey);

    if (routeSet) {
      routeSet.delete(routeId);
      if (routeSet.size === 0) {
        this.connections.delete(connectionKey);
      }
    }

    this.routes.delete(routeId);
    this.emit('connection-removed', { routeId, connectionKey });
    return { success: true, warnings: [] };
  }

  /**
   * Get routes between nodes
   */
  getRoutesBetween(fromNodeId: NodeId, toNodeId: NodeId): Route[] {
    const connectionKey = this.getConnectionKey(fromNodeId, toNodeId);
    const routeIds = this.connections.get(connectionKey);

    if (!routeIds) return [];

    return Array.from(routeIds)
      .map(id => this.routes.get(id))
      .filter(route => route !== undefined) as Route[];
  }

  /**
   * Get best route between nodes
   */
  getBestRoute(fromNodeId: NodeId, toNodeId: NodeId, metric: 'time' | 'cost' | 'distance' = 'time'): Route | null {
    const routes = this.getRoutesBetween(fromNodeId, toNodeId);
    if (routes.length === 0) return null;

    return routes.reduce((best, current) => {
      let bestValue: number;
      let currentValue: number;

      switch (metric) {
        case 'time':
          bestValue = best.getTravelTime();
          currentValue = current.getTravelTime();
          break;
        case 'cost':
          bestValue = best.getCost();
          currentValue = current.getCost();
          break;
        case 'distance':
          bestValue = best.getDistance();
          currentValue = current.getDistance();
          break;
      }

      return currentValue < bestValue ? current : best;
    });
  }

  /**
   * Update all connections
   */
  update(currentTime: TimeStamp): void {
    for (const route of this.routes.values()) {
      // Update route congestion based on usage
      const congestion = this.calculateRouteCongestion(route);
      route.updateCongestion(congestion);
    }

    if (this.config.autoOptimize) {
      this.optimizeConnections();
    }
  }

  private getConnectionKey(fromNodeId: NodeId, toNodeId: NodeId): string {
    return `${fromNodeId}->${toNodeId}`;
  }

  private calculateRouteCongestion(route: Route): number {
    // Simplified congestion calculation
    return Math.random() * 0.3; // 0-30% congestion
  }

  private optimizeConnections(): void {
    // Simplified optimization logic
    this.emit('connections-optimized');
  }

  dispose(): void {
    this.connections.clear();
    this.routes.clear();
    this.removeAllListeners();
  }
}