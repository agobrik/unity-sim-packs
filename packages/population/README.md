# @steam-sim/population

Advanced demographic simulation with population dynamics, migration patterns, and social behavior modeling for Unity-based Steam games.

## Features

- **Demographic Modeling**: Age, gender, education, income, and family structure simulation
- **Migration Dynamics**: Internal and international migration with push/pull factors
- **Social Networks**: Relationship formation, community bonds, and social influence
- **Economic Behavior**: Employment, consumption patterns, and economic mobility
- **Cultural Evolution**: Language, customs, and belief system changes over time
- **Policy Impact**: Government policies affecting population growth and behavior

## Installation

```bash
npm install @steam-sim/population
```

## Quick Start

```typescript
import { PopulationSimulation, Demographic, SocialNetwork } from '@steam-sim/population';

// Create population simulation for a metropolitan area
const simulation = new PopulationSimulation({
  region: 'metro-area',
  startingPopulation: 500000,
  timeScale: 'monthly',
  culturalDiversity: true,
  economicMobility: true
});

// Define demographic groups
const urbanProfessionals = new Demographic('urban-professionals', {
  ageRange: { min: 25, max: 45 },
  educationLevel: 'higher',
  incomeRange: { min: 60000, max: 150000 },
  familyStructure: 'nuclear_small',
  culturalBackground: 'diverse',
  migrationTendency: 0.15, // 15% likely to move annually
  fertilityRate: 1.8,
  mortalityRate: 0.005,
  socialConnectivity: 0.7
});

const workingClass = new Demographic('working-class', {
  ageRange: { min: 18, max: 65 },
  educationLevel: 'secondary',
  incomeRange: { min: 25000, max: 55000 },
  familyStructure: 'nuclear_traditional',
  culturalBackground: 'local',
  migrationTendency: 0.08,
  fertilityRate: 2.1,
  mortalityRate: 0.008,
  socialConnectivity: 0.85
});

const retirees = new Demographic('retirees', {
  ageRange: { min: 65, max: 95 },
  educationLevel: 'mixed',
  incomeRange: { min: 30000, max: 80000 },
  familyStructure: 'elderly',
  culturalBackground: 'established',
  migrationTendency: 0.12, // Migration to retirement areas
  fertilityRate: 0,
  mortalityRate: 0.025,
  socialConnectivity: 0.6
});

// Add demographics to simulation
simulation.addDemographic(urbanProfessionals, 150000);
simulation.addDemographic(workingClass, 280000);
simulation.addDemographic(retirees, 70000);

// Configure migration patterns
const migration = simulation.getMigrationSystem();
migration.addMigrationFlow({
  origin: 'rural-areas',
  destination: 'metro-area',
  demographic: 'young-adults',
  pushFactors: ['limited_opportunities', 'low_wages'],
  pullFactors: ['job_market', 'education', 'amenities'],
  strength: 0.8,
  seasonality: 'spring_peak'
});

migration.addMigrationFlow({
  origin: 'metro-area',
  destination: 'suburbs',
  demographic: 'families',
  pushFactors: ['cost_of_living', 'crowding'],
  pullFactors: ['schools', 'space', 'safety'],
  strength: 0.6,
  seasonality: 'summer_peak'
});

// Set up social networks
const socialNetwork = simulation.getSocialNetwork();
socialNetwork.configureNetworkFormation({
  proximityWeight: 0.4, // Geographic proximity
  homophilyWeight: 0.3, // Similarity attraction
  randomWeight: 0.2, // Random connections
  institutionalWeight: 0.1, // Workplace, school connections
  networkDecay: 0.05, // Annual relationship decay
  maxConnections: 150 // Dunbar's number
});

// Configure economic behavior
const economy = simulation.getEconomicBehavior();
economy.setConsumptionPatterns({
  'urban-professionals': {
    housing: 0.35, // 35% of income
    transportation: 0.15,
    food: 0.12,
    entertainment: 0.08,
    savings: 0.20,
    other: 0.10
  },
  'working-class': {
    housing: 0.30,
    transportation: 0.18,
    food: 0.15,
    entertainment: 0.05,
    savings: 0.12,
    other: 0.20
  },
  'retirees': {
    housing: 0.25,
    transportation: 0.10,
    food: 0.18,
    healthcare: 0.25,
    entertainment: 0.12,
    other: 0.10
  }
});

// Run simulation for 10 years
simulation.start();
for (let year = 0; year < 10; year++) {
  for (let month = 0; month < 12; month++) {
    const monthlyStats = simulation.step(1); // 1 month

    if (month === 11) { // Annual report
      console.log(`Year ${year + 1} Demographics:`);
      console.log(`- Total Population: ${monthlyStats.totalPopulation.toLocaleString()}`);
      console.log(`- Urban Professionals: ${monthlyStats.demographics['urban-professionals'].toLocaleString()}`);
      console.log(`- Working Class: ${monthlyStats.demographics['working-class'].toLocaleString()}`);
      console.log(`- Retirees: ${monthlyStats.demographics['retirees'].toLocaleString()}`);
      console.log(`- Population Growth Rate: ${(monthlyStats.growthRate * 100).toFixed(2)}%`);
      console.log(`- Migration Balance: ${monthlyStats.netMigration.toLocaleString()}`);
      console.log(`- Social Cohesion Index: ${monthlyStats.socialCohesion.toFixed(3)}`);
      console.log(`- Economic Inequality: ${monthlyStats.giniCoefficient.toFixed(3)}`);
    }
  }
}

// Generate demographic forecast
const forecast = simulation.generateForecast(20); // 20 years ahead
console.log('Population Forecast:');
console.log(`- 2030 Population: ${forecast.projections[5].total.toLocaleString()}`);
console.log(`- 2040 Population: ${forecast.projections[15].total.toLocaleString()}`);
console.log(`- Aging Index: ${forecast.agingTrend.toFixed(2)}`);

// Export for Unity
const populationData = simulation.exportPopulationState();
```

## Core Classes

### PopulationSimulation
Main simulation engine managing demographics, migration, and social dynamics.

### Demographic
Population segments with specific characteristics, behaviors, and life patterns.

### SocialNetwork
Relationship networks and social influence modeling within the population.

### MigrationSystem
Population movement dynamics with push/pull factors and flow patterns.

### EconomicBehavior
Economic decision-making and consumption patterns by demographic groups.

## Game Integration

Perfect for:
- **City Builders**: Realistic population dynamics and neighborhood development
- **Strategy Games**: Demographic-based policy making and resource planning
- **Management Sims**: Social planning and community development
- **Educational Games**: Teaching demography, sociology, and urban planning
- **Historical Simulations**: Population changes over time periods

## Demographic Modeling

### Life Course Simulation
Individual and household lifecycle progression.

```typescript
const lifeCourse = {
  stages: [
    {
      name: 'young_adult',
      ageRange: { min: 18, max: 30 },
      characteristics: {
        education: 'in_progress_or_completed',
        employment: 'entry_level_or_student',
        housing: 'rental_shared',
        mobility: 'high',
        socialConnections: 'expanding',
        riskTaking: 'high'
      },
      transitions: {
        to_established_adult: {
          triggers: ['career_establishment', 'relationship_formation'],
          probability: 0.15 // per year
        }
      }
    },
    {
      name: 'established_adult',
      ageRange: { min: 25, max: 50 },
      characteristics: {
        education: 'completed',
        employment: 'career_peak',
        housing: 'ownership_family',
        mobility: 'moderate',
        socialConnections: 'stable',
        riskTaking: 'moderate'
      },
      familyFormation: {
        marriageProbability: 0.08,
        childrenProbability: 0.12,
        averageChildren: 2.1
      }
    }
  ]
};
```

### Cultural Groups
Ethnic, religious, and cultural community modeling.

```typescript
const culturalGroups = [
  {
    name: 'hispanic_latino',
    size: 0.18, // 18% of population
    characteristics: {
      language: ['spanish', 'english'],
      familySize: 3.2,
      generationPatterns: {
        first: 0.3,
        second: 0.4,
        third_plus: 0.3
      },
      culturalRetention: {
        first_generation: 0.9,
        second_generation: 0.6,
        third_generation: 0.3
      },
      intermarriageRate: 0.25,
      religiosity: 0.8,
      entrepreneurship: 0.15
    }
  },
  {
    name: 'asian_american',
    size: 0.12,
    characteristics: {
      educationLevel: 'high',
      incomeLevel: 'above_average',
      familyStructure: 'multigenerational_tendency',
      culturalValues: ['education', 'family', 'achievement'],
      languageMaintenance: 0.7,
      residentialClustering: 0.4
    }
  }
];
```

## Migration Dynamics

### Internal Migration
Population movement within regions.

```typescript
const internalMigration = {
  ruralToUrban: {
    demographicProfile: 'young_adults',
    motivations: {
      economic: 0.6, // Job opportunities
      educational: 0.25, // Higher education
      lifestyle: 0.15 // Urban amenities
    },
    barriers: {
      cost: 0.4,
      socialNetworks: 0.3,
      culturalAttachment: 0.3
    },
    seasonalPattern: 'summer_peak',
    returnMigration: 0.15 // Percentage who eventually return
  },

  urbanToSuburban: {
    demographicProfile: 'families_with_children',
    motivations: {
      housing: 0.5, // Larger, affordable housing
      schools: 0.3, // Better schools
      safety: 0.2 // Lower crime
    },
    lifecycle_trigger: 'first_child',
    distance_tolerance: 45 // minutes commute
  },

  suburbanToRural: {
    demographicProfile: 'pre_retirees_retirees',
    motivations: {
      cost_of_living: 0.4,
      lifestyle: 0.35,
      health: 0.25
    },
    infrastructure_needs: ['healthcare', 'internet', 'transportation']
  }
};
```

### International Migration
Cross-border population flows.

```typescript
const internationalMigration = {
  immigration: {
    sources: [
      {
        country: 'mexico',
        volume: 15000, // annual
        demographics: 'working_age_families',
        skillLevel: 'mixed',
        networkEffect: 0.8, // Chain migration
        temporaryVsPermanent: { temporary: 0.3, permanent: 0.7 }
      },
      {
        country: 'india',
        volume: 8000,
        demographics: 'highly_skilled_young',
        skillLevel: 'high',
        visaCategory: 'employment_based',
        familyReunification: 0.6
      }
    ],
    integration: {
      languageAcquisition: {
        timeToFluency: 5, // years
        ageEffect: 'negative_correlation',
        educationEffect: 'positive_correlation'
      },
      laborMarketIntegration: {
        timeToCareerJob: 3,
        credentialRecognition: 0.4,
        networkImportance: 0.7
      },
      culturalAssimilation: {
        firstGeneration: 0.3,
        secondGeneration: 0.7,
        intermarriageRate: 0.25
      }
    }
  },

  emigration: {
    destinations: ['canada', 'europe', 'australia'],
    demographics: 'highly_educated_young',
    motivations: ['career', 'lifestyle', 'family'],
    brainDrain: 0.05 // 5% of graduates
  }
};
```

## Social Networks

### Network Formation
Relationship and community building patterns.

```typescript
const networkFormation = {
  principles: {
    homophily: {
      age: 0.4, // Preference for similar age
      education: 0.3,
      income: 0.25,
      ethnicity: 0.2,
      religion: 0.15
    },
    proximity: {
      neighborhood: 0.6,
      workplace: 0.5,
      school: 0.7,
      recreationalVenues: 0.3
    },
    transitivity: 0.4, // Friends of friends become friends
    preferentialAttachment: 0.2 // Popular people attract more connections
  },

  networkTypes: {
    family: {
      strength: 'strong',
      decay: 0.01,
      supportType: ['emotional', 'financial', 'instrumental'],
      influence: 'high'
    },
    friends: {
      strength: 'medium',
      decay: 0.05,
      supportType: ['emotional', 'social'],
      influence: 'medium'
    },
    acquaintances: {
      strength: 'weak',
      decay: 0.15,
      supportType: ['informational'],
      influence: 'low',
      bridgingValue: 'high' // Connect different groups
    }
  }
};
```

### Social Capital
Community bonds and collective efficacy.

```typescript
const socialCapital = {
  bonding: {
    // Connections within similar groups
    measurement: 'network_density',
    benefits: ['emotional_support', 'identity', 'solidarity'],
    risks: ['isolation', 'groupthink']
  },
  bridging: {
    // Connections across different groups
    measurement: 'network_diversity',
    benefits: ['information_access', 'opportunities', 'tolerance'],
    factors: ['education', 'urbanization', 'mobility']
  },
  linking: {
    // Connections to power and authority
    measurement: 'vertical_connections',
    benefits: ['access_to_resources', 'political_influence'],
    determinants: ['social_class', 'education', 'occupation']
  }
};
```

## Economic Behavior

### Consumer Patterns
Spending and saving behaviors by demographic.

```typescript
const consumerBehavior = {
  lifecycle_spending: {
    young_adults: {
      priorities: ['education', 'experiences', 'mobility'],
      debt_tolerance: 'high',
      savings_rate: 'low',
      brand_loyalty: 'low',
      technology_adoption: 'early'
    },
    families: {
      priorities: ['children', 'housing', 'security'],
      debt_tolerance: 'moderate',
      savings_rate: 'moderate',
      quality_focus: 'high',
      bulk_purchasing: 'high'
    },
    retirees: {
      priorities: ['healthcare', 'comfort', 'legacy'],
      debt_tolerance: 'low',
      savings_rate: 'negative', // Dissaving
      brand_loyalty: 'high',
      price_sensitivity: 'high'
    }
  },

  cultural_preferences: {
    hispanic_families: {
      food_spending: 'above_average',
      family_remittances: 0.08, // 8% of income
      extended_family_support: 'high',
      cultural_products: 'specialized_demand'
    },
    asian_households: {
      education_investment: 'very_high',
      savings_rate: 'above_average',
      homeownership: 'high_priority',
      technology_adoption: 'early'
    }
  }
};
```

### Labor Market Participation
Employment patterns and job mobility.

```typescript
const laborMarket = {
  participation_rates: {
    by_demographic: {
      'men_prime_age': 0.89,
      'women_prime_age': 0.78,
      'young_adults': 0.65,
      'older_workers': 0.45
    },
    factors: {
      education: 'positive_correlation',
      childcare: 'barrier_for_women',
      health: 'strong_predictor',
      discrimination: 'barrier_for_minorities'
    }
  },

  job_mobility: {
    voluntary_turnover: {
      young_workers: 0.15, // 15% annually
      experienced_workers: 0.08,
      factors: ['career_advancement', 'compensation', 'work_life_balance']
    },
    geographic_mobility: {
      college_educated: 0.12,
      high_school_educated: 0.06,
      barriers: ['family_ties', 'homeownership', 'local_networks']
    }
  }
};
```

## Policy Impact Modeling

### Government Interventions
Policy effects on population dynamics.

```typescript
const policyEffects = {
  housing_policy: {
    affordable_housing: {
      target: 'low_income_families',
      effect: 'reduced_migration_pressure',
      magnitude: 0.15,
      timelag: 2 // years
    },
    zoning_reform: {
      target: 'young_professionals',
      effect: 'increased_density',
      magnitude: 0.25,
      spillovers: ['transportation', 'schools']
    }
  },

  immigration_policy: {
    skilled_worker_visas: {
      target: 'high_skilled_immigrants',
      effect: 'increased_immigration',
      economic_impact: 'positive',
      magnitude: 0.3
    },
    refugee_resettlement: {
      target: 'forced_migrants',
      effect: 'humanitarian_intake',
      integration_challenges: 'high',
      support_needed: ['language', 'employment', 'social']
    }
  },

  family_policy: {
    childcare_support: {
      target: 'working_mothers',
      effect: 'increased_participation',
      fertility_effect: 'positive',
      magnitude: 0.12
    },
    parental_leave: {
      target: 'new_parents',
      effect: 'improved_outcomes',
      gender_equality: 'promoted'
    }
  }
};
```

## Performance Metrics

### Demographic Indicators
Population health and development metrics.

```typescript
const indicators = simulation.calculateDemographicIndicators();
console.log(`Birth Rate: ${indicators.births_per_1000.toFixed(1)} per 1,000`);
console.log(`Death Rate: ${indicators.deaths_per_1000.toFixed(1)} per 1,000`);
console.log(`Total Fertility Rate: ${indicators.total_fertility_rate.toFixed(2)}`);
console.log(`Life Expectancy: ${indicators.life_expectancy.toFixed(1)} years`);
console.log(`Dependency Ratio: ${indicators.dependency_ratio.toFixed(1)}`);
console.log(`Median Age: ${indicators.median_age.toFixed(1)} years`);
```

### Social Well-being
Community health and social cohesion measures.

```typescript
const wellbeing = simulation.assessSocialWellbeing();
console.log(`Social Cohesion Index: ${wellbeing.social_cohesion.toFixed(3)}`);
console.log(`Community Engagement: ${(wellbeing.civic_participation * 100).toFixed(1)}%`);
console.log(`Social Mobility: ${wellbeing.mobility_index.toFixed(3)}`);
console.log(`Income Inequality: ${wellbeing.gini_coefficient.toFixed(3)}`);
console.log(`Residential Segregation: ${wellbeing.segregation_index.toFixed(3)}`);
```

## Configuration Options

```typescript
const config = {
  // Simulation parameters
  timeHorizon: 50, // years
  timeStep: 'monthly',
  spatialScale: 'metropolitan',
  populationDetail: 'individual', // aggregate, household, individual

  // Demographic processes
  fertility: {
    model: 'age_specific_rates',
    culturalVariation: true,
    policyResponsive: true
  },
  mortality: {
    model: 'life_table',
    improvementTrend: 0.01, // annual improvement
    inequalityFactors: ['income', 'education', 'race']
  },
  migration: {
    internal: true,
    international: true,
    returnMigration: true,
    networkEffects: true
  },

  // Social dynamics
  socialNetworks: {
    formationModel: 'homophily_proximity',
    networkDecay: true,
    influenceSpread: true
  },
  culturalChange: {
    assimilation: 'segmented',
    languageShift: true,
    valueChange: 'gradual'
  }
};
```

## Unity Integration

Export detailed population data for visualization:

```json
{
  "population": {
    "total": 567890,
    "demographics": {...},
    "ageDistribution": [...],
    "spatialDistribution": {...}
  },
  "households": [
    {
      "id": "hh_12345",
      "size": 3,
      "composition": "couple_with_child",
      "income": 75000,
      "location": { "x": 123.45, "y": 67.89 }
    }
  ],
  "socialNetworks": {
    "nodes": [...],
    "edges": [...],
    "communities": [...]
  },
  "migration": {
    "flows": [...],
    "patterns": {...}
  },
  "indicators": {
    "growthRate": 0.012,
    "agingIndex": 0.456,
    "diversityIndex": 0.789
  }
}
```

## Examples

See `examples/basic/metropolitan-population.ts` for a complete metropolitan area population simulation with migration, social networks, and policy scenarios.

## Performance

- Scales from neighborhoods (1,000s) to metropolitan areas (millions)
- Individual-level modeling with efficient aggregation
- Real-time demographic process simulation
- Memory-optimized for large-scale population tracking

## License

MIT