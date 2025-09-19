# @steam-sim/ecosystem

Comprehensive ecosystem simulation with species interaction, environmental modeling, and biodiversity tracking for Unity-based Steam games.

## Features

- **Species Modeling**: Complete lifecycle simulation with genetics, reproduction, and evolution
- **Food Web Dynamics**: Predator-prey relationships and energy flow through trophic levels
- **Habitat Management**: Multiple biome types with carrying capacity and resource competition
- **Climate Integration**: Weather effects on species behavior and ecosystem health
- **Conservation Science**: Population viability analysis and extinction risk modeling
- **Real-world Data**: Integration with actual species data and ecological research

## Installation

```bash
npm install @steam-sim/ecosystem
```

## Quick Start

```typescript
import { EcosystemSimulation, Species, Habitat } from '@steam-sim/ecosystem';

// Create forest ecosystem simulation
const simulation = new EcosystemSimulation({
  worldSize: { width: 1000, height: 1000 },
  climateType: 'temperate_forest',
  seasonalCycle: true,
  detailLevel: 'high'
});

// Define species with ecological traits
const whiteOak = new Species('white-oak', 'White Oak', 'producer', 'autotroph', {
  maxAge: 300, // years
  reproductionAge: 20,
  gestationTime: 1, // year (seed to sapling)
  offspringCount: 1000, // acorns per year
  energyConsumption: 10,
  movementSpeed: 0, // stationary
  territorySize: 15, // meters radius
  preySpecies: [],
  predatorSpecies: ['emerald-ash-borer'],
  requiredHabitat: ['forest'],
  climateTolerances: {
    minTemperature: -30,
    maxTemperature: 40,
    minHumidity: 0.3,
    maxHumidity: 0.9,
    minPrecipitation: 500, // mm/year
    maxPrecipitation: 1500
  }
});

const whitetailDeer = new Species('whitetail-deer', 'White-tailed Deer', 'primary_consumer', 'herbivore', {
  maxAge: 15,
  reproductionAge: 1.5,
  gestationTime: 0.7, // 7 months
  offspringCount: 2,
  energyConsumption: 50,
  movementSpeed: 15, // m/s max
  territorySize: 2000, // home range in meters
  preySpecies: ['white-oak', 'maple', 'wildflowers'],
  predatorSpecies: ['gray-wolf', 'mountain-lion'],
  requiredHabitat: ['forest', 'grassland'],
  climateTolerances: {
    minTemperature: -25,
    maxTemperature: 35,
    minHumidity: 0.2,
    maxHumidity: 0.95,
    minPrecipitation: 300,
    maxPrecipitation: 2000
  }
});

const grayWolf = new Species('gray-wolf', 'Gray Wolf', 'tertiary_consumer', 'carnivore', {
  maxAge: 13,
  reproductionAge: 2,
  gestationTime: 0.25, // 2.5 months
  offspringCount: 5,
  energyConsumption: 80,
  movementSpeed: 20,
  territorySize: 20000, // pack territory
  preySpecies: ['whitetail-deer', 'elk', 'rabbit'],
  predatorSpecies: [],
  requiredHabitat: ['forest', 'mountain'],
  climateTolerances: {
    minTemperature: -40,
    maxTemperature: 30,
    minHumidity: 0.2,
    maxHumidity: 0.9,
    minPrecipitation: 200,
    maxPrecipitation: 1800
  }
});

// Create habitat
const forestHabitat = new Habitat('temperate-forest', {
  size: { width: 800, height: 800 },
  carryingCapacity: {
    'producer': 10000,
    'primary_consumer': 500,
    'secondary_consumer': 50,
    'tertiary_consumer': 10
  },
  resources: {
    water: 0.8,
    sunlight: 0.7,
    nutrients: 0.6,
    shelter: 0.9
  },
  disturbanceLevel: 0.1 // Natural disturbance
});

// Add species to simulation
simulation.addSpecies(whiteOak);
simulation.addSpecies(whitetailDeer);
simulation.addSpecies(grayWolf);
simulation.addHabitat(forestHabitat);

// Initialize populations
simulation.populateHabitat('temperate-forest', 'white-oak', 1000);
simulation.populateHabitat('temperate-forest', 'whitetail-deer', 100);
simulation.populateHabitat('temperate-forest', 'gray-wolf', 8);

// Set environmental conditions
simulation.setClimate({
  temperature: 15, // Celsius
  humidity: 0.6,
  precipitation: 800, // mm/year
  season: 'spring'
});

// Run simulation for 10 years
simulation.start();
for (let year = 0; year < 10; year++) {
  for (let month = 0; month < 12; month++) {
    const monthlyReport = simulation.step(30); // 30 days

    if (month === 11) { // Annual report
      console.log(`Year ${year + 1} Summary:`);
      console.log(`- Oak Population: ${simulation.getSpeciesPopulation('white-oak')}`);
      console.log(`- Deer Population: ${simulation.getSpeciesPopulation('whitetail-deer')}`);
      console.log(`- Wolf Population: ${simulation.getSpeciesPopulation('gray-wolf')}`);
      console.log(`- Biodiversity Index: ${monthlyReport.biodiversityIndex.toFixed(3)}`);
      console.log(`- Ecosystem Stability: ${monthlyReport.stability.toFixed(3)}`);
    }
  }

  // Seasonal changes
  simulation.advanceSeason();
}

// Export ecosystem data
const ecosystemData = simulation.exportEcosystemState();
```

## Core Classes

### EcosystemSimulation
Main simulation engine managing species interactions, environmental conditions, and ecosystem dynamics.

### Species
Individual species with complete biological modeling including genetics, behavior, and ecological niches.

### Habitat
Environmental regions with resource availability, carrying capacity, and disturbance patterns.

### FoodWeb
Dynamic food web management with energy flow and trophic level interactions.

### ClimateSystem
Weather and climate modeling affecting species behavior and ecosystem processes.

## Game Integration

Perfect for:
- **Conservation Games**: Wildlife management and ecosystem protection
- **Educational Simulations**: Teaching ecology and environmental science
- **City Builders**: Environmental impact of urban development
- **Strategy Games**: Resource management with ecological consequences
- **Survival Games**: Realistic wildlife behavior and ecosystem balance

## Species Types

### Producers (Plants)
Foundation species providing energy for the ecosystem.

```typescript
const redwoodTree = new Species('coastal-redwood', 'Coastal Redwood', 'producer', 'autotroph', {
  maxAge: 2000,
  reproductionAge: 50,
  gestationTime: 2, // seed to mature tree
  offspringCount: 50000, // seeds per year
  energyConsumption: 100, // photosynthesis rate
  territorySize: 30, // canopy spread
  carbonSequestration: 250, // kg CO2 per year
  oxygenProduction: 180, // kg O2 per year
  requiredHabitat: ['coastal_forest'],
  climateTolerances: {
    minTemperature: 5,
    maxTemperature: 25,
    minHumidity: 0.7,
    maxHumidity: 0.95,
    minPrecipitation: 1000,
    maxPrecipitation: 2500
  }
});
```

### Primary Consumers (Herbivores)
Species that feed on producers.

```typescript
const monarch = new Species('monarch-butterfly', 'Monarch Butterfly', 'primary_consumer', 'herbivore', {
  maxAge: 0.7, // 8 months
  reproductionAge: 0.08, // 1 month
  gestationTime: 0.08,
  offspringCount: 400,
  energyConsumption: 5,
  movementSpeed: 8, // migration speed
  migrationDistance: 4000, // km
  preySpecies: ['milkweed'],
  predatorSpecies: ['birds', 'spiders'],
  requiredHabitat: ['grassland', 'garden'],
  lifecycleStages: ['egg', 'larva', 'pupa', 'adult'],
  climateTolerances: {
    minTemperature: 10,
    maxTemperature: 35,
    minHumidity: 0.3,
    maxHumidity: 0.8,
    minPrecipitation: 200,
    maxPrecipitation: 1200
  }
});
```

### Secondary/Tertiary Consumers (Carnivores)
Predator species maintaining ecosystem balance.

```typescript
const eagle = new Species('bald-eagle', 'Bald Eagle', 'tertiary_consumer', 'carnivore', {
  maxAge: 28,
  reproductionAge: 5,
  gestationTime: 0.12, // 1.5 months incubation
  offspringCount: 2,
  energyConsumption: 120,
  movementSpeed: 30, // diving speed
  territorySize: 10000, // nesting territory
  huntingSuccess: 0.7,
  preySpecies: ['salmon', 'duck', 'rabbit'],
  requiredHabitat: ['coastal', 'lake', 'river'],
  nestingRequirements: ['tall_trees', 'water_access'],
  climateTolerances: {
    minTemperature: -20,
    maxTemperature: 35,
    minHumidity: 0.3,
    maxHumidity: 0.9,
    minPrecipitation: 300,
    maxPrecipitation: 2000
  }
});
```

## Ecosystem Dynamics

### Population Dynamics
Realistic population modeling with growth and decline patterns.

```typescript
const populationModel = {
  growthModel: 'logistic', // exponential, logistic, beverton_holt
  carryingCapacity: 1000,
  intrinsicGrowthRate: 0.1,
  densityDependence: true,
  stochasticity: 0.1, // Environmental variation
  metapopulation: {
    patches: 5,
    migrationRate: 0.05,
    extinctionRisk: 0.01,
    recolonizationRate: 0.1
  }
};
```

### Predator-Prey Interactions
Dynamic predation modeling with realistic hunting behavior.

```typescript
const predationModel = {
  huntingSuccess: {
    baseRate: 0.3,
    experienceBonus: 0.1,
    groupHuntingBonus: 0.2,
    preyDensityEffect: 'type_II', // type_I, type_II, type_III
    environmentalEffects: {
      weather: -0.1,
      moonPhase: 0.05,
      vegetation: -0.15
    }
  },
  energeticCosts: {
    searchTime: 2, // energy per hour
    pursuitEnergy: 50, // per chase
    successReward: 500, // energy gained
    failureCost: 20
  }
};
```

### Competition and Coexistence
Resource competition and niche partitioning.

```typescript
const competitionMatrix = {
  interspecific: {
    'deer-elk': 0.7, // High competition for browse
    'hawk-owl': 0.3, // Moderate competition for prey
    'oak-maple': 0.5 // Competition for sunlight
  },
  intraspecific: {
    'deer': 0.9, // High within-species competition
    'wolf': 0.4, // Pack cooperation reduces competition
    'oak': 0.6 // Moderate tree competition
  },
  resourcePartitioning: {
    temporal: true, // Different feeding times
    spatial: true, // Different habitat zones
    dietary: true // Different prey preferences
  }
};
```

## Environmental Modeling

### Climate Effects
Comprehensive climate influence on ecosystem processes.

```typescript
const climateEffects = {
  temperature: {
    metabolicRate: 'exponential',
    reproductionTiming: 'temperature_cues',
    hibernation: { threshold: 5, duration: 120 }, // 4 months
    heatStress: { threshold: 35, mortality: 0.1 }
  },
  precipitation: {
    plantGrowth: 'liebig_law',
    waterStress: { threshold: 200, effect: -0.3 },
    floodingRisk: { threshold: 2000, mortality: 0.05 },
    droughtResponse: { triggers: 'physiological_adaptation' }
  },
  seasonality: {
    photoperiod: 'reproduction_trigger',
    migration: 'calendar_based',
    phenology: 'temperature_accumulation',
    foodAvailability: 'seasonal_cycles'
  }
};
```

### Habitat Fragmentation
Landscape connectivity and edge effects.

```typescript
const fragmentationModel = {
  patches: [
    {
      id: 'forest-core',
      area: 10000, // hectares
      shape: 'circular',
      edgeRatio: 0.1,
      connectivity: 0.9
    },
    {
      id: 'forest-fragment',
      area: 500,
      shape: 'irregular',
      edgeRatio: 0.6,
      connectivity: 0.3
    }
  ],
  corridors: [
    {
      width: 100, // meters
      length: 2000,
      quality: 0.7,
      permeability: { deer: 0.9, wolf: 0.6, birds: 0.95 }
    }
  ],
  edgeEffects: {
    penetrationDistance: 200, // meters
    microclimate: { temperature: +2, humidity: -0.1 },
    invasiveSpecies: 0.3,
    predationRisk: 0.2
  }
};
```

## Conservation Applications

### Population Viability Analysis
Extinction risk assessment and management planning.

```typescript
const pva = simulation.runPopulationViabilityAnalysis('gray-wolf', {
  timeHorizon: 100, // years
  simulations: 1000,
  catastropheFrequency: 0.05, // once per 20 years
  geneticDrift: true,
  inbreeding: true,
  minimumViablePopulation: 50,
  managementScenarios: [
    'status_quo',
    'habitat_restoration',
    'corridor_creation',
    'captive_breeding'
  ]
});

console.log(`Extinction probability: ${pva.extinctionProbability.toFixed(3)}`);
console.log(`Mean time to extinction: ${pva.meanTimeToExtinction.toFixed(1)} years`);
```

### Habitat Restoration
Ecosystem restoration modeling and planning.

```typescript
const restoration = simulation.planRestoration({
  targetHabitat: 'prairie',
  currentState: 'agricultural',
  restorationMethods: [
    'seed_mix_planting',
    'invasive_removal',
    'prescribed_burning',
    'livestock_grazing'
  ],
  timeline: 10, // years
  budget: 500000,
  successMetrics: {
    nativeSpeciesCover: 0.8,
    biodiversityIndex: 2.5,
    carbonSequestration: 5 // tons/hectare/year
  }
});
```

## Performance Metrics

### Ecosystem Health Indicators
Comprehensive ecosystem assessment metrics.

```typescript
const ecosystemHealth = simulation.assessEcosystemHealth();
console.log(`Biodiversity Index: ${ecosystemHealth.biodiversity.shannon.toFixed(3)}`);
console.log(`Ecosystem Integrity: ${ecosystemHealth.integrity.toFixed(3)}`);
console.log(`Resilience Score: ${ecosystemHealth.resilience.toFixed(3)}`);
console.log(`Carbon Storage: ${ecosystemHealth.carbonStorage.toFixed(1)} tons/hectare`);
console.log(`Nutrient Cycling: ${ecosystemHealth.nutrientCycling.toFixed(3)}`);
```

### Species Interactions
Network analysis of ecological relationships.

```typescript
const networkAnalysis = simulation.analyzeInteractionNetwork();
console.log(`Food Web Complexity: ${networkAnalysis.complexity.toFixed(3)}`);
console.log(`Keystone Species: ${networkAnalysis.keystoneSpecies.join(', ')}`);
console.log(`Trophic Levels: ${networkAnalysis.trophicLevels}`);
console.log(`Energy Flow Efficiency: ${networkAnalysis.energyEfficiency.toFixed(3)}`);
```

## Configuration Options

```typescript
const config = {
  // Simulation parameters
  timeStep: 'daily', // hourly, daily, monthly
  spatialResolution: 'high', // low, medium, high
  stochasticity: 0.1, // Environmental randomness

  // Biological processes
  evolution: {
    enabled: true,
    mutationRate: 0.001,
    selection: 'natural',
    geneticDrift: true
  },

  // Environmental variability
  climate: {
    variability: 'realistic',
    extremeEvents: true,
    longTermTrends: 'stable', // warming, cooling, stable
    noiseLevel: 0.1
  },

  // Human impacts
  anthropogenic: {
    habitatLoss: 0.02, // per year
    pollution: 0.1,
    climateChange: 0.01,
    conservation: 0.05
  }
};
```

## Unity Integration

Export detailed ecosystem data for visualization:

```json
{
  "species": [
    {
      "id": "whitetail-deer",
      "population": 127,
      "distribution": {...},
      "individuals": [...],
      "genetics": {...}
    }
  ],
  "habitats": [...],
  "interactions": {
    "predation": [...],
    "competition": [...],
    "mutualism": [...]
  },
  "environmental": {
    "climate": {...},
    "resources": {...},
    "disturbances": [...]
  },
  "metrics": {
    "biodiversity": 2.347,
    "stability": 0.823,
    "health": 0.765
  }
}
```

## Examples

See `examples/basic/forest-ecosystem.ts` for a complete temperate forest simulation with multiple trophic levels, seasonal cycles, and conservation scenarios.

## Performance

- Supports ecosystems with 10,000+ individual organisms
- Scalable from local habitats to landscape-level simulations
- Optimized genetic algorithms for evolution modeling
- Real-time ecological process simulation

## License

MIT