/**
 * Route Entity - Represents transportation routes between nodes
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  RouteId,
  NodeId,
  RouteType,
  RouteSpec,
  VehicleType,
  ConditionState,
  TimeStamp,
  RouteRestriction
} from '../core/types';

export class Route extends EventEmitter {
  private spec: RouteSpec;
  private actualTravelTime: number;
  private actualCost: number;
  private congestionLevel: number = 0;
  private maintenanceHistory: MaintenanceRecord[] = [];
  private usageHistory: UsageRecord[] = [];

  constructor(spec: RouteSpec) {
    super();
    this.spec = spec;
    this.actualTravelTime = spec.travelTime;
    this.actualCost = spec.cost;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('congestion-changed', (data) => {
      this.actualTravelTime = this.spec.travelTime * (1 + data.congestionLevel * 0.5);
    });

    this.on('condition-changed', (data) => {
      if (data.newCondition === ConditionState.POOR) {
        this.actualCost = this.spec.cost * 1.3;
        this.actualTravelTime = this.spec.travelTime * 1.2;
      }
    });
  }

  /**
   * Update route congestion
   */
  updateCongestion(level: number): void {
    const oldLevel = this.congestionLevel;
    this.congestionLevel = Math.max(0, Math.min(1, level));

    if (Math.abs(oldLevel - this.congestionLevel) > 0.1) {
      this.emit('congestion-changed', {
        oldLevel,
        newLevel: this.congestionLevel
      });
    }
  }

  /**
   * Check if vehicle type is allowed
   */
  isVehicleAllowed(vehicleType: VehicleType): boolean {
    return this.spec.restrictions.some(restriction =>
      restriction.vehicleTypes.includes(vehicleType)
    );
  }

  /**
   * Calculate dynamic travel time
   */
  calculateTravelTime(congestionFactor: number = 1): number {
    return this.actualTravelTime * congestionFactor;
  }

  /**
   * Record route usage
   */
  recordUsage(vehicleId: string, startTime: TimeStamp, endTime: TimeStamp): void {
    const usage: UsageRecord = {
      vehicleId,
      startTime,
      endTime,
      actualDuration: endTime.realTime - startTime.realTime,
      congestionLevel: this.congestionLevel
    };

    this.usageHistory.push(usage);
    if (this.usageHistory.length > 1000) {
      this.usageHistory.shift();
    }

    this.emit('route-used', usage);
  }

  // Getters
  getId(): RouteId { return this.spec.id; }
  getType(): RouteType { return this.spec.type; }
  getFromNodeId(): NodeId { return this.spec.fromNodeId; }
  getToNodeId(): NodeId { return this.spec.toNodeId; }
  getDistance(): number { return this.spec.distance; }
  getCapacity(): number { return this.spec.capacity; }
  getCost(): number { return this.actualCost; }
  getTravelTime(): number { return this.actualTravelTime; }
  getReliability(): number { return this.spec.condition === ConditionState.NEW ? 0.95 : 0.8; }
  isBidirectional(): boolean { return true; } // Simplified
  getCondition(): ConditionState { return this.spec.condition; }
  getCongestion(): number { return this.congestionLevel; }
  getRestrictions(): RouteRestriction[] { return this.spec.restrictions; }

  dispose(): void {
    this.usageHistory = [];
    this.maintenanceHistory = [];
    this.removeAllListeners();
  }
}

interface MaintenanceRecord {
  date: TimeStamp;
  type: string;
  cost: number;
  duration: number;
}

interface UsageRecord {
  vehicleId: string;
  startTime: TimeStamp;
  endTime: TimeStamp;
  actualDuration: number;
  congestionLevel: number;
}