import { VehicleSimulation, Vehicle, VehicleType, TrafficLightState } from '../../src/index';

export function runVehicleSimulationExample(): void {
  console.log('🚗 Starting Vehicle Simulation...');

  const simulation = new VehicleSimulation();
  const trafficSystem = simulation.getTrafficSystem();

  // Create vehicles
  console.log('🏗️ Creating vehicles...');

  const car1 = new Vehicle('car1', VehicleType.CAR, { x: 0, y: 0 });
  car1.setController({ isAutonomous: true, targetSpeed: 15 });

  const truck1 = new Vehicle('truck1', VehicleType.TRUCK, { x: 50, y: 0 });
  truck1.setController({ isAutonomous: true, targetSpeed: 12 });

  const motorcycle1 = new Vehicle('moto1', VehicleType.MOTORCYCLE, { x: 100, y: 0 });
  motorcycle1.setController({ isAutonomous: true, targetSpeed: 20 });

  trafficSystem.addVehicle(car1);
  trafficSystem.addVehicle(truck1);
  trafficSystem.addVehicle(motorcycle1);

  // Create road infrastructure
  console.log('🛣️ Creating road infrastructure...');

  const mainRoad = trafficSystem.createRoad({ x: 0, y: 0 }, { x: 1000, y: 0 }, 2, 16.7); // 60 km/h
  const intersection = trafficSystem.createIntersection({ x: 200, y: 0 }, [mainRoad], 'traffic_light');
  const trafficLight = trafficSystem.createTrafficLight({ x: 200, y: 0 });

  console.log(`Created road: ${mainRoad}`);
  console.log(`Created intersection: ${intersection}`);
  console.log(`Created traffic light: ${trafficLight}`);

  // Start simulation
  console.log('▶️ Starting simulation...');
  simulation.start();

  // Run simulation for 60 seconds (60fps)
  console.log('⏰ Running simulation...');
  const totalSteps = 60 * 60; // 60 seconds at 60fps
  const deltaTime = 1/60;

  for (let step = 0; step < totalSteps; step++) {
    simulation.step(deltaTime);

    // Log status every 5 seconds
    if (step % (5 * 60) === 0) {
      const time = step / 60;
      console.log(`\n📊 Time: ${time.toFixed(1)}s`);

      // Vehicle status
      const vehicles = trafficSystem.getAllVehicles();
      vehicles.forEach(vehicle => {
        const pos = vehicle.getPosition();
        const speed = vehicle.getSpeed();
        const state = vehicle.getState();
        console.log(`  ${vehicle.id}: pos(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) speed=${speed.toFixed(1)}m/s state=${state}`);
      });

      // Traffic light status
      const lights = trafficSystem.getAllTrafficLights();
      lights.forEach(light => {
        console.log(`  Light ${light.id}: ${light.state} (${light.timer.toFixed(1)}s)`);
      });
    }
  }

  console.log('\n✅ Vehicle Simulation Complete!');
}

export default runVehicleSimulationExample;