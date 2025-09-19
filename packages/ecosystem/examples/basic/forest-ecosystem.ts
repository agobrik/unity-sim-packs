import { EcosystemSimulation } from '../../src/index';

console.log('Creating Forest Ecosystem Simulation...');

// Create a 100x100 forest ecosystem
const simulation = new EcosystemSimulation(100, 100, {
  temperature: 15, // 15°C average
  humidity: 0.7,   // 70% humidity
  lightLevel: 0.8  // 80% light (forest canopy)
});

const ecosystem = simulation.getEcosystem();

console.log('Introducing species to the ecosystem...');

// Primary Producers (Plants)
const oakTrees = ecosystem.addSpecies('oak-tree', 'producer', {
  populationSize: 200,
  reproductionRate: 0.05,  // 5% chance per cycle
  mortalityRate: 0.01,     // 1% natural death rate
  carryingCapacity: 300,
  energyRequired: 0,       // Producers don't consume energy
  energyProvided: 10,      // Energy given to ecosystem
  matureAge: 10,           // 10 cycles to mature
  maxAge: 100,             // Live up to 100 cycles
  habitatPreferences: {
    temperature: { min: 5, max: 25, optimal: 15 },
    humidity: { min: 0.4, max: 0.9, optimal: 0.7 },
    lightLevel: { min: 0.6, max: 1.0, optimal: 0.8 }
  }
});

const berryBushes = ecosystem.addSpecies('berry-bush', 'producer', {
  populationSize: 150,
  reproductionRate: 0.08,
  mortalityRate: 0.02,
  carryingCapacity: 250,
  energyRequired: 0,
  energyProvided: 5,
  matureAge: 3,
  maxAge: 20,
  habitatPreferences: {
    temperature: { min: 0, max: 20, optimal: 12 },
    humidity: { min: 0.5, max: 0.8, optimal: 0.6 },
    lightLevel: { min: 0.4, max: 0.9, optimal: 0.7 }
  }
});

// Primary Consumers (Herbivores)
const rabbits = ecosystem.addSpecies('rabbit', 'primary-consumer', {
  populationSize: 80,
  reproductionRate: 0.15,  // High reproduction rate
  mortalityRate: 0.05,
  carryingCapacity: 150,
  energyRequired: 2,       // Need 2 energy units per cycle
  energyProvided: 3,       // Provide 3 energy when consumed
  matureAge: 2,
  maxAge: 8,
  habitatPreferences: {
    temperature: { min: -5, max: 30, optimal: 18 },
    humidity: { min: 0.3, max: 0.8, optimal: 0.5 },
    lightLevel: { min: 0.2, max: 1.0, optimal: 0.6 }
  },
  dietPreferences: ['berry-bush'] // Prefer berry bushes
});

const deer = ecosystem.addSpecies('deer', 'primary-consumer', {
  populationSize: 40,
  reproductionRate: 0.08,
  mortalityRate: 0.03,
  carryingCapacity: 60,
  energyRequired: 4,
  energyProvided: 8,
  matureAge: 4,
  maxAge: 15,
  habitatPreferences: {
    temperature: { min: -10, max: 25, optimal: 10 },
    humidity: { min: 0.4, max: 0.8, optimal: 0.6 },
    lightLevel: { min: 0.3, max: 1.0, optimal: 0.5 }
  },
  dietPreferences: ['oak-tree', 'berry-bush']
});

// Secondary Consumers (Carnivores)
const foxes = ecosystem.addSpecies('fox', 'secondary-consumer', {
  populationSize: 15,
  reproductionRate: 0.06,
  mortalityRate: 0.04,
  carryingCapacity: 25,
  energyRequired: 3,
  energyProvided: 5,
  matureAge: 3,
  maxAge: 12,
  habitatPreferences: {
    temperature: { min: -15, max: 20, optimal: 8 },
    humidity: { min: 0.3, max: 0.9, optimal: 0.5 },
    lightLevel: { min: 0.1, max: 1.0, optimal: 0.4 }
  },
  dietPreferences: ['rabbit'] // Primarily hunt rabbits
});

// Apex Predator
const wolves = ecosystem.addSpecies('wolf', 'tertiary-consumer', {
  populationSize: 8,
  reproductionRate: 0.04,
  mortalityRate: 0.03,
  carryingCapacity: 12,
  energyRequired: 6,
  energyProvided: 10,
  matureAge: 5,
  maxAge: 20,
  habitatPreferences: {
    temperature: { min: -20, max: 15, optimal: 5 },
    humidity: { min: 0.3, max: 0.8, optimal: 0.4 },
    lightLevel: { min: 0.1, max: 1.0, optimal: 0.3 }
  },
  dietPreferences: ['deer', 'rabbit'] // Hunt larger herbivores
});

// Decomposers
const mushrooms = ecosystem.addSpecies('mushroom', 'decomposer', {
  populationSize: 300,
  reproductionRate: 0.12,
  mortalityRate: 0.08,
  carryingCapacity: 500,
  energyRequired: 1,
  energyProvided: 2,
  matureAge: 1,
  maxAge: 4,
  habitatPreferences: {
    temperature: { min: 5, max: 20, optimal: 12 },
    humidity: { min: 0.6, max: 0.9, optimal: 0.8 },
    lightLevel: { min: 0.0, max: 0.5, optimal: 0.2 }
  }
});

console.log('\nStarting ecosystem simulation...');
simulation.start();

// Set up predation relationships
ecosystem.setPredationRelationship('fox', 'rabbit', 0.3);    // 30% hunting success
ecosystem.setPredationRelationship('wolf', 'deer', 0.25);    // 25% hunting success
ecosystem.setPredationRelationship('wolf', 'rabbit', 0.4);   // 40% hunting success (easier prey)

// Run simulation for 2 years (104 weeks)
const totalCycles = 104;
const reportInterval = 13; // Report every quarter (13 weeks)

console.log('Simulating forest ecosystem over 2 years...');

for (let cycle = 1; cycle <= totalCycles; cycle++) {
  // Seasonal environment changes
  const season = Math.floor((cycle % 52) / 13); // 0=spring, 1=summer, 2=autumn, 3=winter

  switch (season) {
    case 0: // Spring
      simulation.updateEnvironment({ temperature: 12, humidity: 0.8, lightLevel: 0.9 });
      break;
    case 1: // Summer
      simulation.updateEnvironment({ temperature: 22, humidity: 0.6, lightLevel: 1.0 });
      break;
    case 2: // Autumn
      simulation.updateEnvironment({ temperature: 8, humidity: 0.7, lightLevel: 0.7 });
      break;
    case 3: // Winter
      simulation.updateEnvironment({ temperature: -2, humidity: 0.8, lightLevel: 0.5 });
      break;
  }

  // Random environmental events
  if (Math.random() < 0.02) { // 2% chance per cycle
    const events = ['drought', 'flood', 'disease', 'fire'];
    const event = events[Math.floor(Math.random() * events.length)];

    console.log(`\nWeek ${cycle}: Environmental event - ${event}!`);

    switch (event) {
      case 'drought':
        simulation.updateEnvironment({ humidity: 0.3 });
        ecosystem.applyMortalityIncrease(0.02); // 2% additional mortality
        break;
      case 'flood':
        ecosystem.applyMortalityIncrease(0.03, ['rabbit', 'mushroom']); // Affects ground species
        break;
      case 'disease':
        const affectedSpecies = Math.random() < 0.5 ? 'deer' : 'rabbit';
        ecosystem.applyMortalityIncrease(0.05, [affectedSpecies]);
        console.log(`  Disease outbreak affects ${affectedSpecies} population`);
        break;
      case 'fire':
        ecosystem.applyMortalityIncrease(0.04, ['oak-tree', 'berry-bush']);
        console.log('  Forest fire damages plant populations');
        break;
    }
  }

  // Run simulation step
  simulation.step();

  // Quarterly reports
  if (cycle % reportInterval === 0) {
    const quarter = Math.floor(cycle / reportInterval);
    const year = Math.floor(quarter / 4) + 1;
    const seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const currentSeason = seasonNames[quarter % 4];

    console.log(`\n=== Year ${year}, ${currentSeason} (Week ${cycle}) ===`);

    const populations = ecosystem.getPopulations();
    console.log('Population Status:');

    Object.entries(populations).forEach(([species, data]) => {
      const trend = data.populationChange > 0 ? '↗' : data.populationChange < 0 ? '↘' : '→';
      console.log(`  ${species}: ${data.population} ${trend} (${data.populationChange >= 0 ? '+' : ''}${data.populationChange})`);
    });

    const stats = ecosystem.getEcosystemStats();
    console.log(`\nEcosystem Health: ${(stats.stability * 100).toFixed(1)}%`);
    console.log(`Biodiversity Index: ${stats.biodiversityIndex.toFixed(2)}`);
    console.log(`Energy Flow Efficiency: ${(stats.energyFlowEfficiency * 100).toFixed(1)}%`);

    // Check for species extinction
    Object.entries(populations).forEach(([species, data]) => {
      if (data.population === 0) {
        console.log(`⚠️  ${species} has gone extinct!`);
      }
    });

    // Check for population explosions
    Object.entries(populations).forEach(([species, data]) => {
      if (data.population > ecosystem.getSpecies(species)?.carryingCapacity * 1.2) {
        console.log(`📈 ${species} population explosion detected!`);
      }
    });
  }
}

// Final ecosystem analysis
console.log('\n=== Final Ecosystem Analysis ===');

const finalPopulations = ecosystem.getPopulations();
const finalStats = ecosystem.getEcosystemStats();

console.log('\nFinal Population Counts:');
Object.entries(finalPopulations).forEach(([species, data]) => {
  const initialPop = ecosystem.getSpecies(species)?.populationSize || 0;
  const change = ((data.population - initialPop) / initialPop * 100).toFixed(1);
  console.log(`  ${species}: ${data.population} (${change >= '0' ? '+' : ''}${change}% change)`);
});

console.log('\nEcosystem Metrics:');
console.log(`  Stability: ${(finalStats.stability * 100).toFixed(1)}%`);
console.log(`  Biodiversity: ${finalStats.biodiversityIndex.toFixed(2)}`);
console.log(`  Energy Efficiency: ${(finalStats.energyFlowEfficiency * 100).toFixed(1)}%`);
console.log(`  Trophic Levels: ${finalStats.trophicLevels}`);

// Generate food web analysis
const foodWeb = ecosystem.analyzeFoodWeb();
console.log('\nFood Web Analysis:');
console.log(`  Total Connections: ${foodWeb.totalConnections}`);
console.log(`  Average Connections per Species: ${foodWeb.averageConnections.toFixed(1)}`);
console.log(`  Most Connected Species: ${foodWeb.mostConnectedSpecies}`);

if (foodWeb.keyStoneSpecies.length > 0) {
  console.log(`  Keystone Species: ${foodWeb.keyStoneSpecies.join(', ')}`);
}

// Export final state
const exportData = simulation.exportState();
console.log('\nEcosystem simulation complete. Data exported for Unity integration.');

simulation.stop();