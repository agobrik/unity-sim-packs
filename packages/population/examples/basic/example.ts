import { PopulationSimulation } from '../../src/index';

export function runPopulationExample(): void {
  console.log('👥 Starting Population Simulation...');

  const simulation = new PopulationSimulation();

  simulation.addGroup({
    id: 'urban',
    name: 'Urban Population',
    size: 1000000,
    birthRate: 0.015,
    deathRate: 0.008,
    migrationRate: 0.002,
    ageDistribution: { 'young': 0.3, 'adult': 0.5, 'elderly': 0.2 },
    education: 0.8,
    income: 0.7,
    happiness: 0.6
  });

  // Run simulation
  for (let i = 0; i < 50; i++) {
    simulation.step(1);
    if (i % 10 === 0) {
      console.log(`Year ${i}: Population = ${simulation.getTotalPopulation().toLocaleString()}`);
    }
  }

  console.log('✅ Population Simulation Complete!');
}

export default runPopulationExample;