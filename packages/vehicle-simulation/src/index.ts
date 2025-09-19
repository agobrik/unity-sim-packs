// Core exports
export {
  Vehicle,
  VehicleType,
  VehicleState,
  VehiclePhysics,
  VehicleController,
  Vector2D,
  EngineSpecs,
  TransmissionSpecs,
  BrakeSpecs,
  TireSpecs,
  AerodynamicsSpecs
} from './core/Vehicle';

export {
  TrafficSystem,
  TrafficLight,
  TrafficLightState,
  TrafficLightCycle,
  Road,
  Intersection,
  IntersectionPriority
} from './core/TrafficSystem';

// Main simulation class
import { Vehicle, VehicleType, VehicleState, VehiclePhysics, VehicleController, Vector2D, EngineSpecs, TransmissionSpecs, BrakeSpecs, TireSpecs, AerodynamicsSpecs } from './core/Vehicle';
import { TrafficSystem, TrafficLight, TrafficLightState, TrafficLightCycle, Road, Intersection, IntersectionPriority } from './core/TrafficSystem';

export class VehicleSimulation {
  private trafficSystem: TrafficSystem;
  private environment: { temperature: number; airDensity: number };
  private isRunning: boolean = false;
  private currentTime: number = 0;

  constructor() {
    this.trafficSystem = new TrafficSystem();
    this.environment = { temperature: 20, airDensity: 1.225 };
  }

  getTrafficSystem(): TrafficSystem {
    return this.trafficSystem;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(deltaTime: number = 0.016): boolean {
    if (!this.isRunning) return false;

    this.currentTime += deltaTime;
    this.trafficSystem.update(deltaTime);
    return true;
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.trafficSystem = new TrafficSystem();
  }

  setEnvironment(temperature: number, airDensity: number): void {
    this.environment = { temperature, airDensity };
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  exportState(): string {
    const trafficData = JSON.parse(this.trafficSystem.exportTrafficData());
    const state = {
      ...trafficData,
      currentTime: this.currentTime,
      timestamp: Date.now()
    };

    return JSON.stringify(state, null, 2);
  }
}