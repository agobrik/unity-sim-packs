# @steam-sim/vehicle-simulation

Realistic vehicle physics simulation with advanced automotive modeling for Unity-based Steam games.

## Features

- **Realistic Physics Engine**: Comprehensive vehicle dynamics with suspension, aerodynamics, and tire modeling
- **Multi-Vehicle Support**: Cars, trucks, motorcycles, buses, and emergency vehicles
- **Advanced Drivetrain**: Engine modeling with torque curves, transmissions, and fuel consumption
- **Traffic System**: Intelligent traffic flow with AI drivers and traffic management
- **Weather Integration**: Dynamic weather effects on vehicle handling and visibility
- **Damage System**: Realistic collision detection with component-based damage modeling

## Installation

```bash
npm install @steam-sim/vehicle-simulation
```

## Quick Start

```typescript
import { VehicleSimulation, Vehicle, TrafficSystem } from '@steam-sim/vehicle-simulation';

// Create vehicle simulation environment
const simulation = new VehicleSimulation({
  worldSize: { width: 5000, height: 5000 },
  weatherSystem: true,
  trafficEnabled: true,
  physicsAccuracy: 'high'
});

// Create a sports car
const sportsCar = new Vehicle('sports-car-1', 'car', { x: 100, y: 100 }, {
  mass: 1200,
  engine: {
    maxPower: 400, // kW
    maxTorque: 550, // Nm
    redlineRPM: 8000,
    torqueCurve: [
      { rpm: 1000, torque: 300 },
      { rpm: 3000, torque: 550 },
      { rpm: 6000, torque: 520 },
      { rpm: 8000, torque: 350 }
    ]
  },
  transmission: {
    type: 'manual',
    gearRatios: [3.5, 2.1, 1.4, 1.0, 0.8, 0.6],
    finalDriveRatio: 3.9
  },
  aerodynamics: {
    dragCoefficient: 0.28,
    frontalArea: 2.1,
    downforceCoefficient: 0.3
  }
});

// Set up traffic system
const traffic = simulation.getTrafficSystem();
traffic.addRoad({
  id: 'highway-1',
  startPoint: { x: 0, y: 0 },
  endPoint: { x: 2000, y: 0 },
  lanes: 3,
  speedLimit: 120, // km/h
  type: 'highway'
});

// Add AI vehicles
for (let i = 0; i < 50; i++) {
  const aiVehicle = traffic.spawnVehicle({
    type: 'random',
    position: 'random',
    behavior: 'normal_driver',
    destination: 'random'
  });
}

// Configure player vehicle controls
sportsCar.setController({
  throttleInput: 0.8,
  steeringInput: 0.1,
  isAutonomous: false
});

// Add vehicle to simulation
simulation.addVehicle(sportsCar);

// Run simulation with real-time physics
simulation.start();
let totalDistance = 0;

for (let second = 0; second < 300; second++) { // 5 minutes
  const deltaTime = 1.0; // 1 second
  const environment = {
    temperature: 25,
    airDensity: 1.225,
    windSpeed: { x: 5, y: 0 },
    roadCondition: 'dry'
  };

  simulation.step(deltaTime, environment);

  const speed = sportsCar.getSpeed();
  const rpm = sportsCar.getRPM();
  const gear = sportsCar.getCurrentGear();

  totalDistance += speed * deltaTime;

  if (second % 30 === 0) { // Log every 30 seconds
    console.log(`Time: ${second}s`);
    console.log(`- Speed: ${(speed * 3.6).toFixed(1)} km/h`);
    console.log(`- RPM: ${rpm.toFixed(0)}`);
    console.log(`- Gear: ${gear}`);
    console.log(`- Distance: ${(totalDistance / 1000).toFixed(1)} km`);
    console.log(`- Fuel: ${(sportsCar.getFuel() * 100).toFixed(1)}%`);
  }
}

// Export for Unity visualization
const simulationData = simulation.exportState();
```

## Core Classes

### VehicleSimulation
Main simulation environment managing vehicles, traffic, and environmental conditions.

### Vehicle
Individual vehicle with realistic physics including engine, transmission, suspension, and aerodynamics.

### TrafficSystem
Advanced traffic management with AI drivers, traffic lights, and flow optimization.

### WeatherSystem
Dynamic weather effects influencing vehicle handling, visibility, and road conditions.

## Game Integration

Perfect for:
- **Racing Games**: Realistic vehicle physics and competitive racing
- **Driving Simulators**: Educational and training applications
- **City Builders**: Traffic simulation and transportation planning
- **Action Games**: Vehicle-based gameplay with realistic handling
- **Open World Games**: Immersive driving experiences with traffic

## Vehicle Types

### Cars
Standard passenger vehicles with various configurations.

```typescript
// Compact car
const compactCar = new Vehicle('compact-1', 'car', position, {
  mass: 1100,
  engine: {
    maxPower: 85,
    maxTorque: 140,
    fuelType: 'gasoline',
    efficiency: 0.35
  },
  transmission: {
    type: 'automatic',
    gearRatios: [3.2, 1.9, 1.3, 1.0, 0.8]
  }
});

// Electric vehicle
const electricCar = new Vehicle('electric-1', 'car', position, {
  mass: 1600,
  engine: {
    maxPower: 250,
    maxTorque: 400,
    type: 'electric',
    batteryCapacity: 75, // kWh
    efficiency: 0.90
  },
  transmission: {
    type: 'direct_drive',
    gearRatios: [9.0] // Single reduction gear
  }
});
```

### Trucks
Heavy vehicles with cargo simulation.

```typescript
const deliveryTruck = new Vehicle('truck-1', 'truck', position, {
  mass: 8000, // Empty weight
  cargoCapacity: 5000, // kg
  engine: {
    maxPower: 350,
    maxTorque: 1800,
    fuelType: 'diesel',
    turbocharger: true
  },
  transmission: {
    type: 'manual',
    gearRatios: [8.5, 6.2, 4.1, 2.9, 2.1, 1.5, 1.0, 0.8]
  },
  brakes: {
    airBrakes: true,
    antiLockSystem: true,
    maxForce: 80000
  }
});
```

### Motorcycles
Two-wheeled vehicles with unique physics.

```typescript
const motorcycle = new Vehicle('bike-1', 'motorcycle', position, {
  mass: 180,
  engine: {
    maxPower: 120,
    maxTorque: 90,
    configuration: 'inline-4'
  },
  aerodynamics: {
    dragCoefficient: 0.6,
    frontalArea: 0.5,
    riderPosition: 'sport'
  },
  stability: {
    wheelbase: 1.4, // meters
    centerOfGravity: { x: 0, y: 0.6, z: 0 },
    gyroscopicEffect: true
  }
});
```

## Advanced Physics

### Suspension System
Realistic suspension modeling with different configurations.

```typescript
const suspension = {
  front: {
    type: 'MacPherson_strut',
    springRate: 25000, // N/m
    damping: 3000, // N·s/m
    antiRollBar: 2000,
    travel: 0.15 // meters
  },
  rear: {
    type: 'multi_link',
    springRate: 30000,
    damping: 3500,
    antiRollBar: 1500,
    travel: 0.12
  }
};
```

### Tire Modeling
Advanced tire physics with temperature and wear simulation.

```typescript
const tireModel = {
  compound: 'performance',
  size: { width: 245, profile: 40, diameter: 18 },
  pressures: { front: 2.3, rear: 2.5 }, // bar
  temperatures: {
    optimal: 80, // Celsius
    overheating: 120,
    currentTemp: 25
  },
  wear: {
    current: 0.15, // 0-1 scale
    wearRate: 0.0001,
    grippingeffect: true
  },
  compounds: {
    dry: { gripCoefficient: 1.1, wearRate: 0.0002 },
    wet: { gripCoefficient: 0.7, wearRate: 0.0001 },
    winter: { gripCoefficient: 0.9, wearRate: 0.00015 }
  }
};
```

## Traffic AI

### Driver Behavior
Realistic AI driver personalities and behaviors.

```typescript
const driverProfiles = {
  aggressive: {
    followingDistance: 1.0, // seconds
    accelerationRate: 0.8,
    brakingThreshold: 0.9,
    laneChangeFrequency: 'high',
    speedingTendency: 1.2
  },

  cautious: {
    followingDistance: 3.0,
    accelerationRate: 0.4,
    brakingThreshold: 0.3,
    laneChangeFrequency: 'low',
    speedingTendency: 0.9
  },

  normal: {
    followingDistance: 2.0,
    accelerationRate: 0.6,
    brakingThreshold: 0.6,
    laneChangeFrequency: 'medium',
    speedingTendency: 1.05
  }
};
```

### Traffic Management
Intelligent traffic flow optimization.

```typescript
const trafficManager = simulation.getTrafficManager();

// Smart traffic lights
trafficManager.addTrafficLight({
  position: { x: 500, y: 500 },
  type: 'adaptive',
  sensors: ['induction_loop', 'camera', 'radar'],
  optimization: 'flow_based',
  coordinatedSignals: true
});

// Traffic flow analysis
const flowAnalysis = trafficManager.analyzeTraffic();
console.log(`Average Speed: ${flowAnalysis.averageSpeed.toFixed(1)} km/h`);
console.log(`Congestion Level: ${flowAnalysis.congestionLevel.toFixed(2)}`);
console.log(`Throughput: ${flowAnalysis.vehiclesPerHour} vehicles/hour`);
```

## Weather Effects

### Dynamic Weather System
Real-time weather changes affecting vehicle performance.

```typescript
const weather = simulation.getWeatherSystem();

// Rain simulation
weather.setConditions({
  precipitation: 0.7, // 0-1 scale
  temperature: 12,
  windSpeed: 15, // m/s
  visibility: 200, // meters
  roadSurface: {
    wetness: 0.8,
    temperature: 8,
    iceFormation: false
  }
});

// Weather effects on vehicles
const weatherEffects = {
  tireGrip: -0.3, // 30% reduction
  visibility: -0.6, // 60% reduction
  brakingDistance: +0.4, // 40% increase
  aquaplaningRisk: 0.2 // Above 80 km/h
};
```

### Road Conditions
Dynamic road surface simulation.

```typescript
const roadConditions = {
  surface: 'asphalt', // asphalt, concrete, gravel, dirt
  quality: 0.8, // 0-1 scale
  banking: 0.05, // radians
  camber: 0.02,
  roughness: 0.1,
  drainage: 0.9,
  temperature: 25,
  grip: {
    dry: 1.0,
    wet: 0.7,
    snow: 0.4,
    ice: 0.1
  }
};
```

## Performance Optimization

### Level of Detail (LOD)
Configurable simulation accuracy for performance scaling.

```typescript
const lodSettings = {
  // High detail for player vehicle
  playerVehicle: {
    physicsSteps: 120, // Hz
    aerodynamicsDetail: 'high',
    suspensionModel: 'full',
    tireModel: 'advanced'
  },

  // Medium detail for nearby AI
  nearbyAI: {
    physicsSteps: 60,
    aerodynamicsDetail: 'medium',
    suspensionModel: 'simplified',
    tireModel: 'basic'
  },

  // Low detail for distant vehicles
  distantAI: {
    physicsSteps: 30,
    aerodynamicsDetail: 'low',
    suspensionModel: 'basic',
    tireModel: 'simplified'
  }
};
```

## Configuration Options

```typescript
const config = {
  // Physics settings
  physics: {
    timeStep: 1/120, // 120 Hz
    iterations: 10,
    gravity: 9.81,
    airDensity: 1.225
  },

  // Simulation quality
  quality: {
    vehicleDetail: 'high', // low, medium, high
    trafficDensity: 0.7, // 0-1 scale
    weatherComplexity: 'full',
    collisionAccuracy: 'precise'
  },

  // Performance optimization
  optimization: {
    cullingDistance: 1000, // meters
    lodTransitions: true,
    multiThreading: true,
    memoryPool: 'large'
  }
};
```

## Unity Integration

Export comprehensive vehicle and traffic data:

```json
{
  "vehicles": [
    {
      "id": "sports-car-1",
      "position": { "x": 1250.5, "y": 200.3 },
      "rotation": 0.785,
      "velocity": { "x": 25.6, "y": 8.2 },
      "engineRPM": 4200,
      "gear": 3,
      "speed": 88.5,
      "fuel": 0.73,
      "wheelPositions": [...],
      "suspensionStates": [...]
    }
  ],
  "traffic": {
    "flowRate": 1250,
    "congestionLevel": 0.3,
    "averageSpeed": 65.2,
    "incidents": [...]
  },
  "environment": {
    "weather": {...},
    "roadConditions": {...},
    "visibility": 500
  }
}
```

## Examples

See `examples/basic/racing-simulation.ts` for a complete racing game setup with multiple vehicle types, weather effects, and AI opponents.

## Performance

- Supports 200+ simultaneous vehicles with full physics
- Scalable LOD system for large-scale traffic simulation
- Optimized for 60+ FPS on modern hardware
- Memory-efficient vehicle pooling and state management

## License

MIT