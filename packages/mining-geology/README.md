# @steam-sim/mining-geology

Comprehensive mining and geological simulation with resource exploration, extraction modeling, and environmental impact assessment for Unity-based Steam games.

## Features

- **Geological Modeling**: Realistic ore deposit formation and mineral distribution
- **Resource Exploration**: Geological surveys, sampling, and probability-based discoveries
- **Mining Operations**: Multiple extraction methods with equipment and workforce management
- **Environmental Impact**: Ecosystem disruption, water contamination, and restoration modeling
- **Economic Analysis**: Cost-benefit analysis, commodity pricing, and market dynamics
- **Safety Management**: Workplace hazards, accident modeling, and regulatory compliance

## Installation

```bash
npm install @steam-sim/mining-geology
```

## Quick Start

```typescript
import { MiningSimulation, GeologicalSurvey, Mine, Mineral } from '@steam-sim/mining-geology';

// Create mining simulation for a 100km² region
const simulation = new MiningSimulation({
  region: 'mountain_range',
  areaSize: { width: 10000, height: 10000 }, // meters
  geologicalComplexity: 'high',
  environmentalRegulation: 'strict'
});

// Define mineral resources
const copperOre = new Mineral('copper', {
  basePrice: 9500, // USD per ton
  priceVolatility: 0.15,
  gradeRange: { min: 0.5, max: 8.0 }, // percentage
  density: 8.96, // g/cm³
  hardness: 3.5, // Mohs scale
  processingComplexity: 'medium',
  environmentalImpact: 'moderate',
  marketDemand: 'high',
  strategicImportance: 0.8
});

const goldOre = new Mineral('gold', {
  basePrice: 65000000, // USD per ton (65k per ounce * 35,274 oz/ton)
  priceVolatility: 0.12,
  gradeRange: { min: 0.5, max: 15.0 }, // grams per ton
  density: 19.32,
  hardness: 2.5,
  processingComplexity: 'high',
  environmentalImpact: 'high', // Cyanide processing
  marketDemand: 'stable',
  strategicImportance: 0.9
});

const ironOre = new Mineral('iron', {
  basePrice: 120, // USD per ton
  priceVolatility: 0.20,
  gradeRange: { min: 30, max: 70 }, // percentage
  density: 7.87,
  hardness: 5.5,
  processingComplexity: 'low',
  environmentalImpact: 'low',
  marketDemand: 'very_high',
  strategicImportance: 1.0
});

// Add minerals to simulation
simulation.addMineral(copperOre);
simulation.addMineral(goldOre);
simulation.addMineral(ironOre);

// Generate geological formations
const geology = simulation.getGeology();
geology.generateFormations({
  primaryRock: 'granite',
  secondaryRock: 'metamorphic',
  sedimentaryLayers: true,
  volcanicActivity: 'historical',
  faultSystems: 'moderate',
  mineralizationEvents: [
    {
      type: 'hydrothermal',
      age: 150000000, // years ago
      intensity: 'high',
      associatedMinerals: ['copper', 'gold']
    },
    {
      type: 'sedimentary',
      age: 300000000,
      intensity: 'moderate',
      associatedMinerals: ['iron']
    }
  ]
});

// Conduct geological survey
const survey = new GeologicalSurvey('regional-survey', {
  surveyType: 'comprehensive',
  budget: 2000000, // USD
  duration: 12, // months
  methods: [
    'geological_mapping',
    'geochemical_sampling',
    'geophysical_surveys',
    'remote_sensing',
    'drill_sampling'
  ]
});

const surveyResults = simulation.conductSurvey(survey);
console.log('Survey Results:');
surveyResults.prospects.forEach(prospect => {
  console.log(`- ${prospect.name}: ${prospect.mineral} (${prospect.confidence.toFixed(1)}% confidence)`);
  console.log(`  Estimated resources: ${prospect.estimatedTonnage.toLocaleString()} tons`);
  console.log(`  Average grade: ${prospect.averageGrade.toFixed(2)}%`);
});

// Select most promising prospect for development
const bestProspect = surveyResults.prospects[0];
const copperMine = new Mine(`${bestProspect.name}-mine`, {
  location: bestProspect.location,
  mineral: bestProspect.mineral,
  miningMethod: 'open_pit', // open_pit, underground, placer
  capacity: 50000, // tons per day
  lifespan: 25, // years
  initialInvestment: 500000000, // USD
  operatingCost: 25, // USD per ton
  environmental: {
    waterUsage: 2.5, // m³ per ton ore
    energyUsage: 15, // kWh per ton ore
    wasteGeneration: 3.0, // tons waste per ton ore
    emissionsIntensity: 0.8 // kg CO2 per ton ore
  }
});

// Start mining operations
simulation.addMine(copperMine);
copperMine.startConstruction();

// Run simulation for 5 years of operation
simulation.start();
let totalProduction = 0;
let totalRevenue = 0;
let totalCosts = 0;

for (let year = 0; year < 5; year++) {
  for (let month = 0; month < 12; month++) {
    const monthlyStats = simulation.step(30); // 30 days

    totalProduction += monthlyStats.production.copper || 0;
    totalRevenue += monthlyStats.revenue.copper || 0;
    totalCosts += monthlyStats.operatingCosts.copper || 0;

    if (month === 11) { // Annual report
      console.log(`Year ${year + 1} Operations:`);
      console.log(`- Copper Production: ${(monthlyStats.annualProduction.copper / 1000).toFixed(1)}k tons`);
      console.log(`- Revenue: $${(monthlyStats.annualRevenue.copper / 1e6).toFixed(1)}M`);
      console.log(`- Operating Costs: $${(monthlyStats.annualCosts.copper / 1e6).toFixed(1)}M`);
      console.log(`- Profit Margin: ${((monthlyStats.annualRevenue.copper - monthlyStats.annualCosts.copper) / monthlyStats.annualRevenue.copper * 100).toFixed(1)}%`);
      console.log(`- Environmental Score: ${monthlyStats.environmentalImpact.toFixed(1)}/100`);
      console.log(`- Safety Record: ${monthlyStats.safetyIncidents} incidents`);
    }
  }
}

// Perform environmental impact assessment
const environmental = simulation.getEnvironmentalAssessment();
const impact = environmental.assessImpact(copperMine);
console.log('Environmental Impact Summary:');
console.log(`- Habitat Disruption: ${impact.habitatLoss.toFixed(1)} hectares`);
console.log(`- Water Quality Impact: ${impact.waterContamination.toFixed(3)}`);
console.log(`- Air Quality Impact: ${impact.airPollution.toFixed(3)}`);
console.log(`- Restoration Cost: $${(impact.restorationCost / 1e6).toFixed(1)}M`);

// Export for Unity visualization
const miningData = simulation.exportMiningState();
```

## Core Classes

### MiningSimulation
Main simulation engine managing geological modeling, mining operations, and environmental systems.

### GeologicalSurvey
Exploration activities including mapping, sampling, and resource estimation with uncertainty modeling.

### Mine
Individual mining operations with equipment, workforce, production, and financial modeling.

### Mineral
Resource types with physical properties, market characteristics, and processing requirements.

### EnvironmentalSystem
Ecosystem impact modeling with mitigation and restoration planning.

## Game Integration

Perfect for:
- **Mining Tycoons**: Resource extraction and business management
- **Strategy Games**: Resource control and economic development
- **City Builders**: Industrial development and environmental planning
- **Educational Games**: Teaching geology, mining engineering, and environmental science
- **Survival Games**: Resource gathering and technological progression

## Geological Modeling

### Rock Formations
Realistic geological structure generation.

```typescript
const geologicalFormation = {
  primaryRock: {
    type: 'igneous_intrusive',
    composition: 'granitic',
    age: 250000000, // years
    mineralogy: ['quartz', 'feldspar', 'mica'],
    structure: 'massive',
    alterationZones: [
      {
        type: 'hydrothermal',
        extent: 500, // meters
        intensity: 'moderate',
        associatedMinerals: ['copper', 'molybdenum']
      }
    ]
  },

  metamorphic: {
    type: 'regional_metamorphism',
    grade: 'medium',
    protolith: 'sedimentary',
    foliation: 'strong',
    mineralAssemblage: ['garnet', 'biotite', 'plagioclase'],
    hostedMinerals: ['gold', 'silver']
  },

  sedimentary: {
    layers: [
      {
        type: 'sandstone',
        thickness: 200, // meters
        porosity: 0.15,
        permeability: 'moderate',
        mineralContent: ['quartz', 'feldspar']
      },
      {
        type: 'shale',
        thickness: 50,
        porosity: 0.05,
        permeability: 'low',
        organicContent: 0.02
      }
    ]
  }
};
```

### Ore Deposit Models
Different types of mineral deposits with formation mechanisms.

```typescript
const depositTypes = {
  porphyry_copper: {
    hostRock: 'granitic_intrusion',
    formationProcess: 'hydrothermal',
    geometry: 'cylindrical',
    size: { diameter: 2000, depth: 1500 }, // meters
    gradeDistribution: 'normal_log',
    averageGrade: 0.6, // % copper
    tonnage: 500000000, // tons
    associatedMinerals: ['molybdenum', 'gold', 'silver'],
    alterationHalo: 3000 // meters
  },

  epithermal_gold: {
    hostRock: 'volcanic',
    formationProcess: 'hot_springs',
    geometry: 'vein_system',
    structure: 'fault_controlled',
    gradeDistribution: 'lognormal',
    highGradeShots: true,
    averageGrade: 3.5, // g/t gold
    tonnage: 25000000,
    depth: { min: 50, max: 300 },
    oxidationZone: 150 // meters
  },

  sedimentary_iron: {
    hostRock: 'banded_iron_formation',
    formationProcess: 'chemical_precipitation',
    geometry: 'stratiform',
    lateralExtent: 15000, // meters
    thickness: 300,
    ironContent: 35, // %
    mineralogy: ['hematite', 'magnetite', 'goethite'],
    tonnage: 2000000000,
    weatheringProfile: 'deep'
  }
};
```

## Exploration Methods

### Geological Mapping
Surface and subsurface structure identification.

```typescript
const mappingMethods = {
  surface_mapping: {
    scale: '1:10000',
    detail_level: 'formation',
    cost: 100, // USD per km²
    accuracy: 0.85,
    coverage: 'complete',
    deliverables: ['geological_map', 'structure_interpretation', 'alteration_zones']
  },

  remote_sensing: {
    satellite_imagery: {
      resolution: '30m_multispectral',
      cost: 5, // USD per km²
      applications: ['lithology', 'alteration', 'structure'],
      accuracy: 0.70
    },
    airborne_geophysics: {
      methods: ['magnetic', 'electromagnetic', 'radiometric'],
      line_spacing: 200, // meters
      cost: 500, // USD per line-km
      penetration_depth: 200, // meters
      accuracy: 0.80
    }
  },

  drilling: {
    diamond_drilling: {
      cost: 150, // USD per meter
      core_recovery: 0.95,
      sample_quality: 'excellent',
      applications: ['grade', 'structure', 'geotechnical']
    },
    reverse_circulation: {
      cost: 80,
      sample_recovery: 0.90,
      sample_quality: 'good',
      speed: 'fast',
      applications: ['grade', 'lithology']
    }
  }
};
```

### Resource Estimation
Statistical modeling of ore reserves.

```typescript
const resourceEstimation = {
  methods: {
    kriging: {
      type: 'geostatistical',
      accuracy: 'high',
      uncertainty_quantification: true,
      block_size: '10x10x10', // meters
      search_ellipse: { major: 100, minor: 50, vertical: 25 }
    },
    inverse_distance: {
      type: 'deterministic',
      power: 2,
      accuracy: 'medium',
      computational_speed: 'fast',
      suitable_for: 'preliminary_estimates'
    }
  },

  classification: {
    measured: {
      confidence: 0.90,
      drill_spacing: '50x50',
      geological_continuity: 'proven',
      modifying_factors: 'applied'
    },
    indicated: {
      confidence: 0.80,
      drill_spacing: '100x100',
      geological_continuity: 'assumed',
      modifying_factors: 'preliminary'
    },
    inferred: {
      confidence: 0.60,
      drill_spacing: '200x200',
      geological_continuity: 'conceptual',
      modifying_factors: 'not_applied'
    }
  }
};
```

## Mining Methods

### Open Pit Mining
Large-scale surface extraction operations.

```typescript
const openPitOperation = {
  design: {
    bench_height: 15, // meters
    bench_angle: 65, // degrees
    haul_road_gradient: 8, // percent
    overall_slope_angle: 45,
    pit_bottom_width: 200,
    final_depth: 400,
    stripping_ratio: 2.5 // waste:ore
  },

  equipment: {
    excavators: [
      {
        model: 'CAT_6020B',
        bucket_capacity: 23, // m³
        operating_weight: 580, // tons
        hourly_rate: 450, // USD
        fuel_consumption: 120, // L/hour
        availability: 0.85
      }
    ],
    haul_trucks: [
      {
        model: 'CAT_793F',
        payload: 240, // tons
        operating_weight: 387,
        hourly_rate: 280,
        fuel_consumption: 180,
        cycle_time: 35 // minutes
      }
    ],
    drill_rigs: [
      {
        type: 'rotary_blast_hole',
        hole_diameter: 311, // mm
        drilling_rate: 25, // m/hour
        pattern: '7x8', // meters
        explosive_type: 'ANFO'
      }
    ]
  },

  production_process: {
    drilling_blasting: {
      hole_spacing: 7, // meters
      burden: 8,
      explosive_factor: 0.8, // kg/m³
      fragmentation_size: 'P80_200mm'
    },
    loading_hauling: {
      truck_fleet_size: 25,
      load_time: 3.5, // minutes
      haul_distance: 2.5, // km average
      dump_time: 1.5
    },
    crushing_screening: {
      primary_crusher: 'jaw_crusher',
      capacity: 4000, // tons/hour
      product_size: 'minus_150mm',
      availability: 0.90
    }
  }
};
```

### Underground Mining
Subsurface extraction methods.

```typescript
const undergroundOperation = {
  access_development: {
    shaft: {
      diameter: 6, // meters
      depth: 800,
      sinking_rate: 3, // m/day
      cost: 15000, // USD per meter
      equipment: 'skip_hoist_system'
    },
    decline: {
      gradient: -15, // percent
      width: 5,
      development_rate: 8, // m/day
      cost: 8000,
      ventilation: 'exhaust_system'
    }
  },

  mining_methods: {
    room_and_pillar: {
      applicable_to: 'flat_deposits',
      extraction_ratio: 0.65,
      pillar_dimensions: '20x20',
      room_width: 15,
      support_requirements: 'minimal',
      mechanization: 'high'
    },
    sublevel_stoping: {
      applicable_to: 'steep_deposits',
      extraction_ratio: 0.85,
      sublevel_interval: 25,
      stope_dimensions: '25x25x50',
      fill_requirements: 'paste_fill',
      drilling: 'long_hole'
    },
    block_caving: {
      applicable_to: 'large_low_grade',
      extraction_ratio: 0.90,
      block_size: '350x350',
      caving_height: 200,
      infrastructure: 'extensive',
      production_rate: 'very_high'
    }
  },

  support_systems: {
    rock_bolts: {
      type: 'resin_anchored',
      length: 2.4, // meters
      spacing: '1.5x1.5',
      capacity: 20, // tons
      cost: 25 // USD per bolt
    },
    mesh: {
      type: 'welded_wire',
      gauge: '6mm',
      coverage: 'complete',
      cost: 15 // USD per m²
    },
    shotcrete: {
      thickness: 75, // mm
      compressive_strength: 25, // MPa
      fiber_reinforced: true,
      cost: 45 // USD per m²
    }
  }
};
```

## Environmental Management

### Impact Assessment
Comprehensive environmental effect modeling.

```typescript
const environmentalImpacts = {
  water_resources: {
    acid_mine_drainage: {
      risk_factors: ['sulfide_minerals', 'oxygen_exposure', 'water_contact'],
      pH_prediction: 'kinetic_testing',
      treatment_methods: ['lime_neutralization', 'constructed_wetlands'],
      monitoring: 'continuous',
      cost: 2000000 // USD annual treatment
    },
    groundwater_drawdown: {
      cone_of_depression: {
        radius: 5000, // meters
        depth: 150,
        affected_wells: 45,
        compensation: 500000 // USD
      },
      water_supply_impact: 'moderate',
      mitigation: 'alternative_supply'
    }
  },

  air_quality: {
    particulate_matter: {
      pm10_emissions: 250, // tons/year
      pm25_emissions: 45,
      control_measures: ['water_spraying', 'dust_suppressants', 'windbreaks'],
      monitoring_stations: 8,
      compliance_cost: 150000 // USD annually
    },
    noise_pollution: {
      blast_noise: {
        peak_level: 115, // dB
        frequency: 'twice_daily',
        affected_distance: 2000,
        complaints: 'moderate'
      },
      equipment_noise: {
        continuous_level: 85,
        operating_hours: '6am_6pm',
        mitigation: 'noise_barriers'
      }
    }
  },

  biodiversity: {
    habitat_loss: {
      area_affected: 1200, // hectares
      ecosystem_type: 'temperate_forest',
      species_impact: {
        endangered: 2,
        threatened: 5,
        common: 127
      },
      restoration_potential: 0.70
    },
    wildlife_corridors: {
      fragmentation: 'moderate',
      crossing_structures: 3,
      monitoring: 'camera_traps',
      effectiveness: 0.65
    }
  }
};
```

### Restoration Planning
Post-mining land rehabilitation.

```typescript
const restorationPlan = {
  phases: {
    concurrent_reclamation: {
      percentage: 0.30, // of disturbed area
      activities: ['topsoil_replacement', 'revegetation', 'erosion_control'],
      cost_per_hectare: 15000,
      timeline: 'ongoing'
    },
    final_reclamation: {
      target_land_use: 'grassland_wildlife',
      soil_replacement: {
        topsoil_depth: 0.5, // meters
        subsoil_depth: 1.0,
        amendment: 'organic_compost'
      },
      vegetation: {
        species_mix: 'native_grasses_shrubs',
        seeding_rate: 25, // kg/hectare
        success_criteria: '70_percent_cover'
      },
      monitoring_period: 5, // years
      bond_amount: 25000000 // USD
    }
  },

  water_management: {
    pit_lake: {
      final_volume: 150000000, // m³
      water_quality: 'treatment_required',
      use: 'wildlife_habitat',
      monitoring: 'perpetual'
    },
    drainage_systems: {
      interceptor_drains: 'upstream',
      collection_ponds: 'treatment_before_discharge',
      pumping_stations: 'as_required'
    }
  }
};
```

## Economic Analysis

### Cost Modeling
Comprehensive financial analysis.

```typescript
const economicModel = {
  capital_costs: {
    mine_development: 350000000, // USD
    processing_plant: 450000000,
    infrastructure: 200000000,
    equipment: 300000000,
    working_capital: 75000000,
    contingency: 137500000, // 10%
    total: 1512500000
  },

  operating_costs: {
    mining: {
      labor: 12.50, // USD per ton ore
      equipment: 8.75,
      explosives: 1.25,
      fuel: 3.50,
      maintenance: 4.25,
      total: 30.25
    },
    processing: {
      labor: 2.50,
      energy: 6.25,
      reagents: 3.75,
      maintenance: 2.25,
      total: 14.75
    },
    general_admin: 3.50,
    total_cash_cost: 48.50
  },

  revenue_model: {
    production_profile: [
      { year: 1, tons: 15000000, grade: 0.65 },
      { year: 2, tons: 18000000, grade: 0.62 },
      // ... annual production forecast
    ],
    commodity_price: {
      base_case: 9500, // USD per ton
      upside: 11000,
      downside: 8000,
      long_term: 9200
    },
    price_participation: 0.85 // after smelting charges
  },

  financial_metrics: {
    npv: {
      discount_rate: 0.08,
      base_case: 890000000, // USD
      sensitivity: {
        price_10_percent: 450000000,
        cost_10_percent: 650000000,
        grade_10_percent: 720000000
      }
    },
    irr: 0.165, // 16.5%
    payback_period: 5.2, // years
    lom_cash_flow: 2100000000 // life of mine
  }
};
```

## Safety Management

### Hazard Identification
Workplace safety and risk management.

```typescript
const safetyProgram = {
  hazard_categories: {
    mechanical: {
      risks: ['equipment_failure', 'crushing', 'falling_objects'],
      controls: ['lockout_tagout', 'guards', 'hard_hats'],
      frequency: 'daily_inspection',
      severity: 'high'
    },
    chemical: {
      risks: ['dust_exposure', 'chemical_burns', 'toxic_gases'],
      controls: ['ventilation', 'ppe', 'gas_detection'],
      monitoring: 'continuous',
      training: 'quarterly'
    },
    geotechnical: {
      risks: ['slope_failure', 'rockfall', 'ground_collapse'],
      controls: ['slope_monitoring', 'scaling', 'support_systems'],
      inspection: 'daily',
      expertise: 'geotechnical_engineer'
    }
  },

  safety_metrics: {
    ltifr: 0.85, // Lost time injury frequency rate per million hours
    trifr: 3.2, // Total recordable injury frequency rate
    fatality_rate: 0, // Target zero
    near_miss_reporting: 'encouraged',
    safety_training_hours: 40 // annual per employee
  },

  emergency_procedures: {
    evacuation_plans: 'surface_underground',
    rescue_teams: 'trained_onsite',
    medical_facilities: 'first_aid_hospital',
    emergency_equipment: 'self_rescuers_breathing_apparatus',
    communication: 'redundant_systems'
  }
};
```

## Configuration Options

```typescript
const config = {
  // Geological parameters
  geology: {
    complexity: 'high', // low, medium, high
    deposit_distribution: 'realistic',
    grade_continuity: 'moderate',
    structural_controls: true
  },

  // Mining operations
  mining: {
    method_selection: 'optimized', // manual, optimized
    equipment_aging: true,
    maintenance_scheduling: 'predictive',
    weather_effects: true
  },

  // Environmental modeling
  environment: {
    impact_detail: 'comprehensive',
    monitoring_frequency: 'continuous',
    restoration_success: 'variable',
    climate_change: 'included'
  },

  // Economic modeling
  economics: {
    price_volatility: 'realistic',
    inflation: 0.025, // annual
    discount_rate: 0.08,
    tax_rate: 0.30
  }
};
```

## Unity Integration

Export detailed mining operation data:

```json
{
  "geology": {
    "formations": [...],
    "deposits": [...],
    "structure": {...}
  },
  "mines": [
    {
      "id": "copper_mine_1",
      "location": { "x": 5000, "y": 3000 },
      "type": "open_pit",
      "production": 45000,
      "grade": 0.62,
      "equipment": [...],
      "environmental": {...}
    }
  ],
  "exploration": {
    "surveys": [...],
    "drill_holes": [...],
    "prospects": [...]
  },
  "environment": {
    "air_quality": {...},
    "water_quality": {...},
    "restoration": {...}
  }
}
```

## Examples

See `examples/basic/copper-mine-development.ts` for a complete mining operation simulation from exploration through production and closure.

## Performance

- Supports regional-scale geological modeling (1000+ km²)
- Real-time mining operation simulation with equipment tracking
- Comprehensive environmental impact modeling
- Financial analysis with Monte Carlo uncertainty assessment

## License

MIT