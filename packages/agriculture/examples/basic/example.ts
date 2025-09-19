import { AgricultureSimulation } from '../../src/index';

export function runAgricultureExample(): void {
  console.log('🚜 Starting Agriculture Simulation...');

  const simulation = new AgricultureSimulation();

  simulation.addFarm({
    id: 'farm1',
    size: 100,
    soilQuality: 0.8,
    crops: [{
      id: 'wheat1',
      name: 'Wheat',
      growthTime: 90,
      yieldPerUnit: 50,
      waterRequirement: 20,
      temperature: { min: 5, max: 25 },
      currentGrowth: 0,
      health: 1.0
    }],
    livestock: [{
      id: 'cattle1',
      type: 'Cattle',
      count: 50,
      age: 2,
      health: 0.9,
      feedRequirement: 10,
      production: 20
    }],
    equipment: ['tractor', 'harvester'],
    waterLevel: 0.7
  });

  // Run simulation for a full year
  for (let day = 0; day < 365; day++) {
    simulation.step(1);
    if (day % 90 === 0) {
      console.log(`Day ${day}: Yield = ${simulation.getTotalYield().toLocaleString()}`);
    }
  }

  console.log('✅ Agriculture Simulation Complete!');
}

export default runAgricultureExample;