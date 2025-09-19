export interface Vector2D {
  x: number;
  y: number;
}

export interface VehiclePhysics {
  mass: number; // kg
  engine: EngineSpecs;
  transmission: TransmissionSpecs;
  brakes: BrakeSpecs;
  tires: TireSpecs;
  aerodynamics: AerodynamicsSpecs;
}

export interface EngineSpecs {
  maxPower: number; // kW
  maxTorque: number; // Nm
  redlineRPM: number;
  idleRPM: number;
  torqueCurve: Array<{ rpm: number; torque: number }>;
}

export interface TransmissionSpecs {
  type: 'manual' | 'automatic' | 'cvt' | 'electric';
  gearRatios: number[];
  finalDriveRatio: number;
  efficiency: number; // 0-1
}

export interface BrakeSpecs {
  maxForce: number; // N
  efficiency: number; // 0-1
  heatCapacity: number;
  coolingRate: number;
}

export interface TireSpecs {
  gripCoefficient: number; // 0-1
  rollingResistance: number;
  optimalTemperature: number; // Celsius
  wearRate: number;
}

export interface AerodynamicsSpecs {
  dragCoefficient: number;
  frontalArea: number; // m²
  downforceCoefficient: number;
}

export enum VehicleType {
  CAR = 'car',
  TRUCK = 'truck',
  BUS = 'bus',
  MOTORCYCLE = 'motorcycle',
  BICYCLE = 'bicycle',
  EMERGENCY = 'emergency'
}

export enum VehicleState {
  IDLE = 'idle',
  ACCELERATING = 'accelerating',
  CRUISING = 'cruising',
  BRAKING = 'braking',
  TURNING = 'turning',
  PARKED = 'parked',
  EMERGENCY_STOP = 'emergency_stop'
}

export interface VehicleController {
  targetSpeed: number; // m/s
  targetDirection: number; // radians
  throttleInput: number; // 0-1
  brakeInput: number; // 0-1
  steeringInput: number; // -1 to 1
  isAutonomous: boolean;
}

export class Vehicle {
  public readonly id: string;
  public readonly type: VehicleType;
  public position: Vector2D;
  public velocity: Vector2D;
  public acceleration: Vector2D;
  public rotation: number; // radians
  public angularVelocity: number;

  private physics: VehiclePhysics;
  private controller: VehicleController;
  private state: VehicleState;
  private fuel: number; // 0-1 (or battery for electric)
  private health: number; // 0-1
  private currentGear: number;
  private rpm: number;
  private temperature: number; // Engine/motor temperature
  private brakeTemperature: number;
  private tireWear: number; // 0-1

  constructor(
    id: string,
    type: VehicleType,
    position: Vector2D,
    physics?: Partial<VehiclePhysics>
  ) {
    this.id = id;
    this.type = type;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };
    this.rotation = 0;
    this.angularVelocity = 0;

    this.physics = this.getDefaultPhysics(type, physics);
    this.controller = this.getDefaultController();
    this.state = VehicleState.IDLE;
    this.fuel = 1.0;
    this.health = 1.0;
    this.currentGear = 1;
    this.rpm = this.physics.engine.idleRPM;
    this.temperature = 20; // Ambient temperature
    this.brakeTemperature = 20;
    this.tireWear = 0;
  }

  private getDefaultPhysics(type: VehicleType, overrides?: Partial<VehiclePhysics>): VehiclePhysics {
    const defaults = {
      [VehicleType.CAR]: {
        mass: 1500,
        engine: {
          maxPower: 150,
          maxTorque: 300,
          redlineRPM: 6000,
          idleRPM: 800,
          torqueCurve: [
            { rpm: 800, torque: 200 },
            { rpm: 2000, torque: 300 },
            { rpm: 4000, torque: 280 },
            { rpm: 6000, torque: 200 }
          ]
        },
        transmission: {
          type: 'automatic' as const,
          gearRatios: [3.5, 2.1, 1.4, 1.0, 0.8],
          finalDriveRatio: 3.7,
          efficiency: 0.9
        },
        brakes: {
          maxForce: 12000,
          efficiency: 0.85,
          heatCapacity: 500,
          coolingRate: 50
        },
        tires: {
          gripCoefficient: 0.8,
          rollingResistance: 0.015,
          optimalTemperature: 80,
          wearRate: 0.0001
        },
        aerodynamics: {
          dragCoefficient: 0.3,
          frontalArea: 2.2,
          downforceCoefficient: 0.1
        }
      },
      [VehicleType.TRUCK]: {
        mass: 8000,
        engine: {
          maxPower: 300,
          maxTorque: 1500,
          redlineRPM: 2500,
          idleRPM: 600,
          torqueCurve: [
            { rpm: 600, torque: 800 },
            { rpm: 1200, torque: 1500 },
            { rpm: 1800, torque: 1400 },
            { rpm: 2500, torque: 1000 }
          ]
        },
        transmission: {
          type: 'manual' as const,
          gearRatios: [6.0, 3.5, 2.1, 1.4, 1.0, 0.8],
          finalDriveRatio: 5.2,
          efficiency: 0.85
        },
        brakes: {
          maxForce: 40000,
          efficiency: 0.8,
          heatCapacity: 2000,
          coolingRate: 100
        },
        tires: {
          gripCoefficient: 0.7,
          rollingResistance: 0.008,
          optimalTemperature: 70,
          wearRate: 0.00005
        },
        aerodynamics: {
          dragCoefficient: 0.6,
          frontalArea: 8.0,
          downforceCoefficient: 0.05
        }
      },
      [VehicleType.MOTORCYCLE]: {
        mass: 200,
        engine: {
          maxPower: 100,
          maxTorque: 80,
          redlineRPM: 12000,
          idleRPM: 1000,
          torqueCurve: [
            { rpm: 1000, torque: 50 },
            { rpm: 4000, torque: 80 },
            { rpm: 8000, torque: 75 },
            { rpm: 12000, torque: 40 }
          ]
        },
        transmission: {
          type: 'manual' as const,
          gearRatios: [2.8, 1.9, 1.4, 1.1, 0.9, 0.8],
          finalDriveRatio: 2.5,
          efficiency: 0.95
        },
        brakes: {
          maxForce: 3000,
          efficiency: 0.9,
          heatCapacity: 100,
          coolingRate: 80
        },
        tires: {
          gripCoefficient: 0.9,
          rollingResistance: 0.012,
          optimalTemperature: 90,
          wearRate: 0.0002
        },
        aerodynamics: {
          dragCoefficient: 0.5,
          frontalArea: 0.6,
          downforceCoefficient: 0.02
        }
      },
      [VehicleType.BUS]: {
        mass: 12000,
        engine: {
          maxPower: 250,
          maxTorque: 1200,
          redlineRPM: 2200,
          idleRPM: 600,
          torqueCurve: [
            { rpm: 600, torque: 700 },
            { rpm: 1000, torque: 1200 },
            { rpm: 1600, torque: 1100 },
            { rpm: 2200, torque: 800 }
          ]
        },
        transmission: {
          type: 'automatic' as const,
          gearRatios: [4.0, 2.5, 1.6, 1.0],
          finalDriveRatio: 4.8,
          efficiency: 0.8
        },
        brakes: {
          maxForce: 50000,
          efficiency: 0.75,
          heatCapacity: 3000,
          coolingRate: 120
        },
        tires: {
          gripCoefficient: 0.65,
          rollingResistance: 0.007,
          optimalTemperature: 75,
          wearRate: 0.00003
        },
        aerodynamics: {
          dragCoefficient: 0.7,
          frontalArea: 10.5,
          downforceCoefficient: 0.03
        }
      },
      [VehicleType.BICYCLE]: {
        mass: 15,
        engine: {
          maxPower: 0.3,
          maxTorque: 20,
          redlineRPM: 120,
          idleRPM: 0,
          torqueCurve: [
            { rpm: 0, torque: 0 },
            { rpm: 60, torque: 20 },
            { rpm: 90, torque: 15 },
            { rpm: 120, torque: 10 }
          ]
        },
        transmission: {
          type: 'manual' as const,
          gearRatios: [3.0, 2.0, 1.5, 1.0, 0.8],
          finalDriveRatio: 1.0,
          efficiency: 0.98
        },
        brakes: {
          maxForce: 800,
          efficiency: 0.7,
          heatCapacity: 20,
          coolingRate: 10
        },
        tires: {
          gripCoefficient: 0.6,
          rollingResistance: 0.003,
          optimalTemperature: 25,
          wearRate: 0.0001
        },
        aerodynamics: {
          dragCoefficient: 0.9,
          frontalArea: 0.4,
          downforceCoefficient: 0.0
        }
      },
      [VehicleType.EMERGENCY]: {
        mass: 2500,
        engine: {
          maxPower: 250,
          maxTorque: 450,
          redlineRPM: 6500,
          idleRPM: 800,
          torqueCurve: [
            { rpm: 800, torque: 300 },
            { rpm: 2500, torque: 450 },
            { rpm: 4500, torque: 400 },
            { rpm: 6500, torque: 250 }
          ]
        },
        transmission: {
          type: 'automatic' as const,
          gearRatios: [3.2, 2.0, 1.3, 1.0, 0.7],
          finalDriveRatio: 3.4,
          efficiency: 0.9
        },
        brakes: {
          maxForce: 18000,
          efficiency: 0.9,
          heatCapacity: 800,
          coolingRate: 70
        },
        tires: {
          gripCoefficient: 0.85,
          rollingResistance: 0.014,
          optimalTemperature: 85,
          wearRate: 0.00008
        },
        aerodynamics: {
          dragCoefficient: 0.35,
          frontalArea: 2.8,
          downforceCoefficient: 0.08
        }
      }
    };

    const defaultPhysics = defaults[type] || defaults[VehicleType.CAR];
    return { ...defaultPhysics, ...overrides };
  }

  private getDefaultController(): VehicleController {
    return {
      targetSpeed: 0,
      targetDirection: 0,
      throttleInput: 0,
      brakeInput: 0,
      steeringInput: 0,
      isAutonomous: false
    };
  }

  update(deltaTime: number, environment: { temperature: number; airDensity: number }): void {
    // Update engine RPM and gear selection
    this.updateEngine(deltaTime, environment);

    // Calculate forces
    const forces = this.calculateForces(environment, deltaTime);

    // Apply physics integration
    this.integratePhysics(forces, deltaTime);

    // Update vehicle systems
    this.updateSystems(deltaTime, environment);

    // Update state
    this.updateState();
  }

  private updateEngine(deltaTime: number, environment: { temperature: number; airDensity: number }): void {
    const speed = this.getSpeed();

    // Automatic transmission logic
    if (this.physics.transmission.type === 'automatic') {
      const targetGear = this.calculateOptimalGear(speed, this.controller.throttleInput);
      if (targetGear !== this.currentGear) {
        this.currentGear = targetGear;
      }
    }

    // Calculate engine RPM from wheel speed
    const gearRatio = this.physics.transmission.gearRatios[this.currentGear - 1] || 1;
    const wheelRPM = (speed * 60) / (Math.PI * 0.3); // Assuming 0.3m wheel radius
    this.rpm = wheelRPM * gearRatio * this.physics.transmission.finalDriveRatio;

    // Engine temperature simulation
    const heatGeneration = this.controller.throttleInput * 50 + 20;
    const cooling = Math.max(0, (this.temperature - environment.temperature) * 0.1);
    this.temperature += (heatGeneration - cooling) * deltaTime;
  }

  private calculateForces(environment: { temperature: number; airDensity: number }, deltaTime: number): Vector2D {
    let totalForce = { x: 0, y: 0 };

    // Engine force
    if (this.controller.throttleInput > 0 && this.fuel > 0) {
      const engineTorque = this.getEngineTorque();
      const gearRatio = this.physics.transmission.gearRatios[this.currentGear - 1] || 1;
      const wheelTorque = engineTorque * gearRatio * this.physics.transmission.finalDriveRatio * this.physics.transmission.efficiency;
      const engineForce = wheelTorque / 0.3; // Wheel radius

      totalForce.x += Math.cos(this.rotation) * engineForce;
      totalForce.y += Math.sin(this.rotation) * engineForce;
    }

    // Aerodynamic drag
    const speed = this.getSpeed();
    const dragForce = 0.5 * environment.airDensity * this.physics.aerodynamics.dragCoefficient *
                     this.physics.aerodynamics.frontalArea * speed * speed;

    if (speed > 0.1) {
      const dragDirection = Math.atan2(this.velocity.y, this.velocity.x);
      totalForce.x -= Math.cos(dragDirection) * dragForce;
      totalForce.y -= Math.sin(dragDirection) * dragForce;
    }

    // Rolling resistance
    const normalForce = this.physics.mass * 9.81; // Weight
    const rollingForce = normalForce * this.physics.tires.rollingResistance;

    if (speed > 0.1) {
      const velocityDirection = Math.atan2(this.velocity.y, this.velocity.x);
      totalForce.x -= Math.cos(velocityDirection) * rollingForce;
      totalForce.y -= Math.sin(velocityDirection) * rollingForce;
    }

    // Braking force
    if (this.controller.brakeInput > 0) {
      const maxBrakeForce = this.physics.brakes.maxForce * this.physics.brakes.efficiency;
      const brakeForce = maxBrakeForce * this.controller.brakeInput;

      if (speed > 0.1) {
        const velocityDirection = Math.atan2(this.velocity.y, this.velocity.x);
        totalForce.x -= Math.cos(velocityDirection) * brakeForce;
        totalForce.y -= Math.sin(velocityDirection) * brakeForce;
      }

      // Brake heating
      this.brakeTemperature += brakeForce * speed * deltaTime * 0.001;
    }

    return totalForce;
  }

  private integratePhysics(force: Vector2D, deltaTime: number): void {
    // Linear motion
    this.acceleration.x = force.x / this.physics.mass;
    this.acceleration.y = force.y / this.physics.mass;

    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Angular motion (simplified steering)
    if (Math.abs(this.controller.steeringInput) > 0.01 && this.getSpeed() > 0.5) {
      const steeringAngle = this.controller.steeringInput * 0.5; // Max 0.5 rad
      const wheelbase = 2.7; // Typical car wheelbase in meters
      const angularVelocityTarget = (this.getSpeed() * Math.tan(steeringAngle)) / wheelbase;

      this.angularVelocity = angularVelocityTarget;
      this.rotation += this.angularVelocity * deltaTime;

      // Normalize rotation
      while (this.rotation > Math.PI) this.rotation -= 2 * Math.PI;
      while (this.rotation < -Math.PI) this.rotation += 2 * Math.PI;
    } else {
      this.angularVelocity *= 0.9; // Damping
    }
  }

  private updateSystems(deltaTime: number, environment: { temperature: number; airDensity: number }): void {
    // Fuel consumption
    if (this.controller.throttleInput > 0) {
      const consumption = this.controller.throttleInput * 0.001 * deltaTime;
      this.fuel = Math.max(0, this.fuel - consumption);
    }

    // Tire wear
    const speed = this.getSpeed();
    const wear = speed * this.physics.tires.wearRate * deltaTime;
    this.tireWear = Math.min(1, this.tireWear + wear);

    // System cooling
    this.brakeTemperature = Math.max(environment.temperature,
      this.brakeTemperature - this.physics.brakes.coolingRate * deltaTime);

    // Health degradation
    if (this.temperature > 120) {
      this.health -= 0.001 * deltaTime; // Overheating damage
    }
    if (this.tireWear > 0.8) {
      this.health -= 0.0005 * deltaTime; // Tire wear damage
    }
  }

  private updateState(): void {
    const speed = this.getSpeed();

    if (speed < 0.1) {
      this.state = VehicleState.IDLE;
    } else if (this.controller.brakeInput > 0.5) {
      this.state = VehicleState.BRAKING;
    } else if (this.controller.throttleInput > 0.3) {
      this.state = VehicleState.ACCELERATING;
    } else if (Math.abs(this.controller.steeringInput) > 0.3) {
      this.state = VehicleState.TURNING;
    } else {
      this.state = VehicleState.CRUISING;
    }
  }

  private getEngineTorque(): number {
    const torqueCurve = this.physics.engine.torqueCurve;

    // Find the two closest RPM points
    let lowerPoint = torqueCurve[0];
    let upperPoint = torqueCurve[torqueCurve.length - 1];

    for (let i = 0; i < torqueCurve.length - 1; i++) {
      if (this.rpm >= torqueCurve[i].rpm && this.rpm <= torqueCurve[i + 1].rpm) {
        lowerPoint = torqueCurve[i];
        upperPoint = torqueCurve[i + 1];
        break;
      }
    }

    // Linear interpolation
    const ratio = (this.rpm - lowerPoint.rpm) / (upperPoint.rpm - lowerPoint.rpm);
    const torque = lowerPoint.torque + ratio * (upperPoint.torque - lowerPoint.torque);

    return torque * this.controller.throttleInput;
  }

  private calculateOptimalGear(speed: number, throttle: number): number {
    const gearRatios = this.physics.transmission.gearRatios;

    // Simple gear selection based on speed
    const speedThresholds = [5, 15, 25, 35, 50]; // m/s

    for (let i = 0; i < speedThresholds.length; i++) {
      if (speed < speedThresholds[i]) {
        return Math.min(i + 1, gearRatios.length);
      }
    }

    return gearRatios.length; // Top gear
  }

  // Public methods
  setController(controller: Partial<VehicleController>): void {
    Object.assign(this.controller, controller);
  }

  getSpeed(): number {
    return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
  }

  getPosition(): Vector2D {
    return { ...this.position };
  }

  getVelocity(): Vector2D {
    return { ...this.velocity };
  }

  getRotation(): number {
    return this.rotation;
  }

  getState(): VehicleState {
    return this.state;
  }

  getFuel(): number {
    return this.fuel;
  }

  getHealth(): number {
    return this.health;
  }

  getRPM(): number {
    return this.rpm;
  }

  getCurrentGear(): number {
    return this.currentGear;
  }

  getTemperature(): number {
    return this.temperature;
  }

  getBrakeTemperature(): number {
    return this.brakeTemperature;
  }

  getTireWear(): number {
    return this.tireWear;
  }

  getPhysics(): VehiclePhysics {
    return { ...this.physics };
  }

  getController(): VehicleController {
    return { ...this.controller };
  }

  refuel(amount: number = 1.0): void {
    this.fuel = Math.min(1.0, this.fuel + amount);
  }

  repair(amount: number = 1.0): void {
    this.health = Math.min(1.0, this.health + amount);
    this.tireWear = Math.max(0, this.tireWear - amount);
  }

  emergencyStop(): void {
    this.controller.throttleInput = 0;
    this.controller.brakeInput = 1;
    this.state = VehicleState.EMERGENCY_STOP;
  }

  exportState(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      position: this.position,
      velocity: this.velocity,
      rotation: this.rotation,
      state: this.state,
      fuel: this.fuel,
      health: this.health,
      rpm: this.rpm,
      gear: this.currentGear,
      temperature: this.temperature,
      controller: this.controller
    }, null, 2);
  }
}