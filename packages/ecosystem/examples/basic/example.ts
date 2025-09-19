import { EcosystemSimulation, Species, SpeciesType, Diet, HabitatType } from '../../src/index';

export function runEcosystemExample(): void {
  console.log('🌿 Starting Ecosystem Simulation...');

  const simulation = new EcosystemSimulation();

  // Create plant species (producers)
  console.log('🌱 Creating plant species...');
  const grass = new Species(
    'grass',
    'Grass',
    SpeciesType.PRODUCER,
    Diet.AUTOTROPH,
    {
      maxAge: 50,
      reproductionAge: 5,
      gestationTime: 2,
      offspringCount: 3,
      energyConsumption: 0.1,
      movementSpeed: 0,
      territorySize: 5,
      preySpecies: [],
      predatorSpecies: ['rabbit', 'deer'],
      requiredHabitat: [HabitatType.GRASSLAND],
      climateTolerances: {
        minTemperature: -5,
        maxTemperature: 35,
        minHumidity: 0.3,
        maxHumidity: 0.9,
        minPrecipitation: 50,
        maxPrecipitation: 300
      }
    }
  );

  // Create herbivore species
  console.log('🐰 Creating herbivore species...');
  const rabbit = new Species(
    'rabbit',
    'Rabbit',
    SpeciesType.PRIMARY_CONSUMER,
    Diet.HERBIVORE,
    {
      maxAge: 15,
      reproductionAge: 1,
      gestationTime: 1,
      offspringCount: 4,
      energyConsumption: 2,
      movementSpeed: 15,
      territorySize: 50,
      preySpecies: ['grass'],
      predatorSpecies: ['fox', 'hawk'],
      requiredHabitat: [HabitatType.GRASSLAND, HabitatType.FOREST],
      climateTolerances: {
        minTemperature: -10,
        maxTemperature: 30,
        minHumidity: 0.2,
        maxHumidity: 0.8,
        minPrecipitation: 30,
        maxPrecipitation: 250
      }
    }
  );

  const deer = new Species(
    'deer',
    'Deer',
    SpeciesType.PRIMARY_CONSUMER,
    Diet.HERBIVORE,
    {
      maxAge: 25,
      reproductionAge: 2,
      gestationTime: 7,
      offspringCount: 2,
      energyConsumption: 5,
      movementSpeed: 25,
      territorySize: 200,
      preySpecies: ['grass'],
      predatorSpecies: ['wolf'],
      requiredHabitat: [HabitatType.FOREST, HabitatType.GRASSLAND],
      climateTolerances: {
        minTemperature: -15,
        maxTemperature: 25,
        minHumidity: 0.3,
        maxHumidity: 0.8,
        minPrecipitation: 40,
        maxPrecipitation: 200
      }
    }
  );

  // Create carnivore species
  console.log('🦊 Creating carnivore species...');
  const fox = new Species(
    'fox',
    'Fox',
    SpeciesType.SECONDARY_CONSUMER,
    Diet.CARNIVORE,
    {
      maxAge: 20,
      reproductionAge: 1,
      gestationTime: 2,
      offspringCount: 3,
      energyConsumption: 8,
      movementSpeed: 20,
      territorySize: 300,
      preySpecies: ['rabbit'],
      predatorSpecies: [],
      requiredHabitat: [HabitatType.FOREST],
      climateTolerances: {
        minTemperature: -20,
        maxTemperature: 30,
        minHumidity: 0.2,
        maxHumidity: 0.9,
        minPrecipitation: 20,
        maxPrecipitation: 300
      }
    }
  );

  const wolf = new Species(
    'wolf',
    'Wolf',
    SpeciesType.TERTIARY_CONSUMER,
    Diet.CARNIVORE,
    {
      maxAge: 30,
      reproductionAge: 2,
      gestationTime: 2.5,
      offspringCount: 4,
      energyConsumption: 15,
      movementSpeed: 30,
      territorySize: 1000,
      preySpecies: ['deer', 'rabbit'],
      predatorSpecies: [],
      requiredHabitat: [HabitatType.FOREST],
      climateTolerances: {
        minTemperature: -30,
        maxTemperature: 25,
        minHumidity: 0.3,
        maxHumidity: 0.8,
        minPrecipitation: 30,
        maxPrecipitation: 250
      }
    }
  );

  // Add species to simulation
  simulation.addSpecies(grass);
  simulation.addSpecies(rabbit);
  simulation.addSpecies(deer);
  simulation.addSpecies(fox);
  simulation.addSpecies(wolf);

  // Populate ecosystem with initial individuals
  console.log('🌍 Populating ecosystem...');

  // Add grass across the area
  for (let i = 0; i < 200; i++) {
    grass.addIndividual({
      x: (Math.random() - 0.5) * 1000,
      y: (Math.random() - 0.5) * 1000
    });
  }

  // Add herbivores
  for (let i = 0; i < 50; i++) {
    rabbit.addIndividual({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 800
    });
  }

  for (let i = 0; i < 20; i++) {
    deer.addIndividual({
      x: (Math.random() - 0.5) * 600,
      y: (Math.random() - 0.5) * 600
    });
  }

  // Add carnivores
  for (let i = 0; i < 10; i++) {
    fox.addIndividual({
      x: (Math.random() - 0.5) * 400,
      y: (Math.random() - 0.5) * 400
    });
  }

  for (let i = 0; i < 5; i++) {
    wolf.addIndividual({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200
    });
  }

  console.log('📊 Initial ecosystem state:');
  console.log(`  Grass: ${grass.getPopulation()}`);
  console.log(`  Rabbits: ${rabbit.getPopulation()}`);
  console.log(`  Deer: ${deer.getPopulation()}`);
  console.log(`  Foxes: ${fox.getPopulation()}`);
  console.log(`  Wolves: ${wolf.getPopulation()}`);
  console.log(`  Total Biomass: ${simulation.getTotalBiomass()}`);
  console.log(`  Biodiversity Index: ${simulation.getBiodiversityIndex().toFixed(3)}`);

  // Start simulation
  console.log('\n▶️ Starting ecosystem simulation...');
  simulation.start();

  // Run simulation for 100 time units
  console.log('⏰ Running ecosystem dynamics...');
  for (let time = 0; time < 100; time++) {
    simulation.step(1);

    // Log ecosystem state every 10 time units
    if (time % 10 === 0) {
      const environment = simulation.getEnvironment();
      console.log(`\n📅 Time: ${time} (${environment.season}) - Temp: ${environment.temperature.toFixed(1)}°C`);
      console.log(`  Grass: ${grass.getPopulation()} (avg health: ${grass.getAverageHealth().toFixed(1)})`);
      console.log(`  Rabbits: ${rabbit.getPopulation()} (avg age: ${rabbit.getAverageAge().toFixed(1)})`);
      console.log(`  Deer: ${deer.getPopulation()} (avg age: ${deer.getAverageAge().toFixed(1)})`);
      console.log(`  Foxes: ${fox.getPopulation()} (avg health: ${fox.getAverageHealth().toFixed(1)})`);
      console.log(`  Wolves: ${wolf.getPopulation()} (avg health: ${wolf.getAverageHealth().toFixed(1)})`);
      console.log(`  Biodiversity: ${simulation.getBiodiversityIndex().toFixed(3)}`);

      // Check for extinctions
      const species = simulation.getAllSpecies();
      const extinctSpecies = species.filter(s => s.getPopulation() === 0);
      if (extinctSpecies.length > 0) {
        console.log(`  ⚠️ Extinctions: ${extinctSpecies.map(s => s.name).join(', ')}`);
      }
    }
  }

  // Final analysis
  console.log('\n🔬 FINAL ECOSYSTEM ANALYSIS:');
  console.log('=' .repeat(50));

  const finalSpecies = simulation.getAllSpecies();
  finalSpecies.forEach(species => {
    const population = species.getPopulation();
    const health = species.getAverageHealth();
    const age = species.getAverageAge();
    const diversity = species.getGeneticDiversity();

    console.log(`\n${species.name} (${species.type}):`);
    console.log(`  Population: ${population}`);
    console.log(`  Average Health: ${health.toFixed(1)}%`);
    console.log(`  Average Age: ${age.toFixed(1)} time units`);
    console.log(`  Genetic Diversity: ${diversity.toFixed(4)}`);

    if (population === 0) {
      console.log(`  ❌ EXTINCT`);
    } else if (population < 5) {
      console.log(`  ⚠️ CRITICALLY ENDANGERED`);
    } else if (population < 15) {
      console.log(`  ⚠️ ENDANGERED`);
    } else {
      console.log(`  ✅ STABLE`);
    }
  });

  console.log(`\n🌍 ECOSYSTEM METRICS:`);
  console.log(`  Final Biodiversity Index: ${simulation.getBiodiversityIndex().toFixed(3)}`);
  console.log(`  Total Biomass: ${simulation.getTotalBiomass()}`);
  console.log(`  Simulation Time: ${simulation.getCurrentTime()} units`);

  // Population history analysis
  console.log(`\n📈 POPULATION TRENDS:`);
  finalSpecies.forEach(species => {
    const history = species.getPopulationHistory();
    if (history.length > 1) {
      const initial = history[0].count;
      const final = history[history.length - 1].count;
      const change = final - initial;
      const changePercent = initial > 0 ? (change / initial) * 100 : 0;

      console.log(`  ${species.name}: ${initial} → ${final} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
    }
  });

  console.log('\n✅ Ecosystem Simulation Complete!');
  console.log('💾 Use simulation.exportState() to get full ecosystem data for Unity integration');
}

export default runEcosystemExample;