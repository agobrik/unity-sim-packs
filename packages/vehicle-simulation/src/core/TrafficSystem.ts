import { Vehicle, VehicleType, Vector2D } from './Vehicle';

export interface TrafficLight {
  id: string;
  position: Vector2D;
  state: TrafficLightState;
  duration: number;
  timer: number;
  cycle: TrafficLightCycle[];
}

export enum TrafficLightState {
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green'
}

export interface TrafficLightCycle {
  state: TrafficLightState;
  duration: number;
}

export interface Road {
  id: string;
  start: Vector2D;
  end: Vector2D;
  lanes: number;
  speedLimit: number; // m/s
  trafficLights: string[];
  vehicles: string[];
}

export interface Intersection {
  id: string;
  position: Vector2D;
  roads: string[];
  trafficLights: string[];
  priority: IntersectionPriority;
}

export enum IntersectionPriority {
  STOP_SIGN = 'stop_sign',
  YIELD = 'yield',
  TRAFFIC_LIGHT = 'traffic_light',
  ROUNDABOUT = 'roundabout'
}

export class TrafficSystem {
  private vehicles: Map<string, Vehicle>;
  private roads: Map<string, Road>;
  private intersections: Map<string, Intersection>;
  private trafficLights: Map<string, TrafficLight>;
  private currentTime: number;

  constructor() {
    this.vehicles = new Map();
    this.roads = new Map();
    this.intersections = new Map();
    this.trafficLights = new Map();
    this.currentTime = 0;
  }

  addVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  removeVehicle(vehicleId: string): boolean {
    return this.vehicles.delete(vehicleId);
  }

  addRoad(road: Road): void {
    this.roads.set(road.id, road);
  }

  addIntersection(intersection: Intersection): void {
    this.intersections.set(intersection.id, intersection);
  }

  addTrafficLight(light: TrafficLight): void {
    this.trafficLights.set(light.id, light);
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime;

    // Update traffic lights
    this.updateTrafficLights(deltaTime);

    // Update vehicle behavior based on traffic rules
    this.updateVehicleTrafficBehavior();

    // Update vehicles
    for (const vehicle of this.vehicles.values()) {
      vehicle.update(deltaTime, { temperature: 20, airDensity: 1.225 });
    }

    // Handle collisions
    this.handleCollisions();
  }

  private updateTrafficLights(deltaTime: number): void {
    for (const light of this.trafficLights.values()) {
      light.timer += deltaTime;

      if (light.timer >= light.duration) {
        // Find current cycle index
        let currentIndex = -1;
        for (let i = 0; i < light.cycle.length; i++) {
          if (light.cycle[i].state === light.state) {
            currentIndex = i;
            break;
          }
        }

        // Move to next state
        const nextIndex = (currentIndex + 1) % light.cycle.length;
        light.state = light.cycle[nextIndex].state;
        light.duration = light.cycle[nextIndex].duration;
        light.timer = 0;
      }
    }
  }

  private updateVehicleTrafficBehavior(): void {
    for (const vehicle of this.vehicles.values()) {
      if (!vehicle.getController().isAutonomous) continue;

      // Find nearby traffic elements
      const nearbyLights = this.findNearbyTrafficLights(vehicle.getPosition(), 100);
      const nearbyVehicles = this.findNearbyVehicles(vehicle.id, 50);

      // Apply traffic rules
      this.applyTrafficLightBehavior(vehicle, nearbyLights);
      this.applyFollowingBehavior(vehicle, nearbyVehicles);
      this.applyLaneKeeping(vehicle);
    }
  }

  private findNearbyTrafficLights(position: Vector2D, radius: number): TrafficLight[] {
    const nearby: TrafficLight[] = [];

    for (const light of this.trafficLights.values()) {
      const distance = this.calculateDistance(position, light.position);
      if (distance <= radius) {
        nearby.push(light);
      }
    }

    return nearby;
  }

  private findNearbyVehicles(vehicleId: string, radius: number): Vehicle[] {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) return [];

    const nearby: Vehicle[] = [];
    const position = vehicle.getPosition();

    for (const otherVehicle of this.vehicles.values()) {
      if (otherVehicle.id === vehicleId) continue;

      const distance = this.calculateDistance(position, otherVehicle.getPosition());
      if (distance <= radius) {
        nearby.push(otherVehicle);
      }
    }

    return nearby;
  }

  private applyTrafficLightBehavior(vehicle: Vehicle, lights: TrafficLight[]): void {
    const position = vehicle.getPosition();
    const velocity = vehicle.getVelocity();
    const speed = vehicle.getSpeed();

    for (const light of lights) {
      const distance = this.calculateDistance(position, light.position);
      const timeToReach = speed > 0 ? distance / speed : Infinity;

      // Check if vehicle is approaching the light
      const direction = Math.atan2(light.position.y - position.y, light.position.x - position.x);
      const vehicleDirection = Math.atan2(velocity.y, velocity.x);
      const angleDiff = Math.abs(direction - vehicleDirection);

      if (angleDiff < Math.PI / 4 && distance < 50) { // Approaching light
        if (light.state === TrafficLightState.RED ||
           (light.state === TrafficLightState.YELLOW && timeToReach > 3)) {
          // Stop for red light or yellow if too far
          const controller = vehicle.getController();
          controller.throttleInput = 0;
          controller.brakeInput = Math.min(1, distance < 20 ? 0.8 : 0.3);
          vehicle.setController(controller);
        }
      }
    }
  }

  private applyFollowingBehavior(vehicle: Vehicle, nearbyVehicles: Vehicle[]): void {
    const position = vehicle.getPosition();
    const velocity = vehicle.getVelocity();
    let leadVehicle: Vehicle | null = null;
    let minDistance = Infinity;

    // Find the closest vehicle in front
    for (const other of nearbyVehicles) {
      const otherPos = other.getPosition();
      const distance = this.calculateDistance(position, otherPos);

      // Check if vehicle is in front
      const direction = Math.atan2(otherPos.y - position.y, otherPos.x - position.x);
      const vehicleDirection = Math.atan2(velocity.y, velocity.x);
      const angleDiff = Math.abs(direction - vehicleDirection);

      if (angleDiff < Math.PI / 3 && distance < minDistance) {
        leadVehicle = other;
        minDistance = distance;
      }
    }

    if (leadVehicle) {
      const safeDistance = Math.max(10, vehicle.getSpeed() * 2); // 2-second rule
      const controller = vehicle.getController();

      if (minDistance < safeDistance) {
        // Too close, slow down
        controller.throttleInput = 0;
        controller.brakeInput = Math.min(1, (safeDistance - minDistance) / safeDistance);
      } else if (minDistance < safeDistance * 1.5) {
        // Moderate distance, maintain speed
        controller.throttleInput = 0.3;
        controller.brakeInput = 0;
      } else {
        // Safe distance, can accelerate
        controller.throttleInput = 0.6;
        controller.brakeInput = 0;
      }

      vehicle.setController(controller);
    }
  }

  private applyLaneKeeping(vehicle: Vehicle): void {
    // Simple lane keeping - could be enhanced with actual road data
    const controller = vehicle.getController();

    // Add small random steering adjustments to simulate lane keeping
    const adjustment = (Math.random() - 0.5) * 0.1;
    controller.steeringInput = Math.max(-1, Math.min(1, controller.steeringInput + adjustment));

    vehicle.setController(controller);
  }

  private handleCollisions(): void {
    const vehicles = Array.from(this.vehicles.values());

    for (let i = 0; i < vehicles.length; i++) {
      for (let j = i + 1; j < vehicles.length; j++) {
        const vehicle1 = vehicles[i];
        const vehicle2 = vehicles[j];

        const distance = this.calculateDistance(vehicle1.getPosition(), vehicle2.getPosition());
        const collisionRadius = this.getVehicleRadius(vehicle1) + this.getVehicleRadius(vehicle2);

        if (distance < collisionRadius) {
          this.handleCollision(vehicle1, vehicle2);
        }
      }
    }
  }

  private handleCollision(vehicle1: Vehicle, vehicle2: Vehicle): void {
    // Simple collision response - both vehicles emergency stop
    vehicle1.emergencyStop();
    vehicle2.emergencyStop();

    // Could add more sophisticated collision physics here
  }

  private getVehicleRadius(vehicle: Vehicle): number {
    // Approximate vehicle radius based on type
    switch (vehicle.type) {
      case VehicleType.CAR:
        return 2.0;
      case VehicleType.TRUCK:
        return 4.0;
      case VehicleType.BUS:
        return 3.5;
      case VehicleType.MOTORCYCLE:
        return 1.0;
      case VehicleType.BICYCLE:
        return 0.8;
      default:
        return 2.0;
    }
  }

  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Factory methods for common traffic scenarios
  createTrafficLight(position: Vector2D, cycle?: TrafficLightCycle[]): string {
    const id = `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const defaultCycle: TrafficLightCycle[] = cycle || [
      { state: TrafficLightState.GREEN, duration: 30 },
      { state: TrafficLightState.YELLOW, duration: 5 },
      { state: TrafficLightState.RED, duration: 30 }
    ];

    const light: TrafficLight = {
      id,
      position,
      state: TrafficLightState.GREEN,
      duration: defaultCycle[0].duration,
      timer: 0,
      cycle: defaultCycle
    };

    this.addTrafficLight(light);
    return id;
  }

  createRoad(start: Vector2D, end: Vector2D, lanes: number = 1, speedLimit: number = 13.9): string {
    const id = `road_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const road: Road = {
      id,
      start,
      end,
      lanes,
      speedLimit,
      trafficLights: [],
      vehicles: []
    };

    this.addRoad(road);
    return id;
  }

  createIntersection(position: Vector2D, roads: string[], priority: IntersectionPriority): string {
    const id = `intersection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const intersection: Intersection = {
      id,
      position,
      roads,
      trafficLights: [],
      priority
    };

    this.addIntersection(intersection);
    return id;
  }

  // Getters
  getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  getRoad(id: string): Road | undefined {
    return this.roads.get(id);
  }

  getAllRoads(): Road[] {
    return Array.from(this.roads.values());
  }

  getTrafficLight(id: string): TrafficLight | undefined {
    return this.trafficLights.get(id);
  }

  getAllTrafficLights(): TrafficLight[] {
    return Array.from(this.trafficLights.values());
  }

  getIntersection(id: string): Intersection | undefined {
    return this.intersections.get(id);
  }

  getAllIntersections(): Intersection[] {
    return Array.from(this.intersections.values());
  }

  exportTrafficData(): string {
    const data = {
      currentTime: this.currentTime,
      vehicles: Array.from(this.vehicles.entries()),
      roads: Array.from(this.roads.entries()),
      intersections: Array.from(this.intersections.entries()),
      trafficLights: Array.from(this.trafficLights.entries())
    };
    return JSON.stringify(data, null, 2);
  }
}