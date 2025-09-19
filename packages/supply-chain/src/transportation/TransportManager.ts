/**
 * Transport Manager - Manages vehicle fleets and transportation
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import { TimeStamp, VehicleId, NodeId } from '../core/types';

export interface Vehicle {
  id: VehicleId;
  type: string;
  capacity: number;
  currentLoad: number;
  location: NodeId;
  status: 'idle' | 'loading' | 'in_transit' | 'unloading' | 'maintenance';
  route?: VehicleRoute;
}

export interface VehicleRoute {
  id: string;
  from: NodeId;
  to: NodeId;
  startTime: TimeStamp;
  estimatedArrival: TimeStamp;
  cargo: CargoItem[];
}

export interface CargoItem {
  resourceId: string;
  quantity: number;
  destination: NodeId;
}

export class TransportManager extends EventEmitter {
  private vehicles: Map<VehicleId, Vehicle> = new Map();
  private routes: Map<string, VehicleRoute> = new Map();
  private eventBus: EventBus;
  private initialized = false;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('transport-initialized');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.vehicles.clear();
    this.routes.clear();
  }

  async update(currentTime: TimeStamp): Promise<void> {
    // Update vehicle positions and handle arrivals
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.status === 'in_transit' && vehicle.route) {
        if (currentTime.realTime >= vehicle.route.estimatedArrival.realTime) {
          this.handleVehicleArrival(vehicle, currentTime);
        }
      }
    }
  }

  addVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
    this.emit('vehicle-added', vehicle);
  }

  scheduleTransport(from: NodeId, to: NodeId, cargo: CargoItem[]): string | null {
    // Find available vehicle
    const availableVehicle = this.findAvailableVehicle(cargo);
    if (!availableVehicle) {
      return null;
    }

    const route: VehicleRoute = {
      id: this.generateRouteId(),
      from,
      to,
      startTime: { gameTime: 0, realTime: Date.now() },
      estimatedArrival: {
        gameTime: 0,
        realTime: Date.now() + 60000 // 1 minute travel time
      },
      cargo
    };

    availableVehicle.route = route;
    availableVehicle.status = 'in_transit';
    availableVehicle.currentLoad = cargo.reduce((sum, item) => sum + item.quantity, 0);

    this.routes.set(route.id, route);
    this.emit('transport-scheduled', { vehicle: availableVehicle, route });

    return route.id;
  }

  private findAvailableVehicle(cargo: CargoItem[]): Vehicle | null {
    const requiredCapacity = cargo.reduce((sum, item) => sum + item.quantity, 0);

    for (const vehicle of this.vehicles.values()) {
      if (vehicle.status === 'idle' && vehicle.capacity >= requiredCapacity) {
        return vehicle;
      }
    }

    return null;
  }

  private handleVehicleArrival(vehicle: Vehicle, currentTime: TimeStamp): void {
    if (!vehicle.route) return;

    vehicle.location = vehicle.route.to;
    vehicle.status = 'idle';
    vehicle.currentLoad = 0;

    this.emit('vehicle-arrived', { vehicle, route: vehicle.route });

    this.routes.delete(vehicle.route.id);
    vehicle.route = undefined;
  }

  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.vehicles.clear();
    this.routes.clear();
    this.removeAllListeners();
  }
}