# @steam-sim/agriculture

Advanced agricultural simulation with crop modeling, livestock management, and sustainable farming practices for Unity-based Steam games.

## Features

- **Crop Production**: Realistic plant growth cycles with variety-specific characteristics
- **Livestock Management**: Animal husbandry with breeding, health, and production systems
- **Soil Science**: Nutrient cycling, pH management, and soil health modeling
- **Weather Integration**: Climate effects on crop yields and animal welfare
- **Market Dynamics**: Commodity pricing, supply chains, and economic optimization
- **Sustainable Practices**: Organic farming, precision agriculture, and environmental stewardship

## Installation

```bash
npm install @steam-sim/agriculture
```

## Quick Start

```typescript
import { AgriculturalSimulation, Farm, Crop, Livestock } from '@steam-sim/agriculture';

// Create agricultural simulation for a 1000-acre farm
const simulation = new AgriculturalSimulation({
  region: 'midwest_usa',
  climate: 'continental',
  farmSize: 405, // hectares (1000 acres)
  soilType: 'loam',
  practiceLevel: 'conventional'
});

// Create diversified farm operation
const cornBeltFarm = new Farm('heritage-farm', {
  location: { latitude: 42.5, longitude: -93.5 }, // Iowa
  elevation: 320, // meters
  landUse: {
    cropland: 0.75, // 75% crops
    pasture: 0.15, // 15% grazing
    farmstead: 0.05, // 5% buildings/yards
    conservation: 0.05 // 5% CRP/wetlands
  },
  soilProperties: {
    type: 'mollisol',
    texture: 'silty_clay_loam',
    drainage: 'well_drained',
    ph: 6.8,
    organicMatter: 0.035, // 3.5%
    cationExchangeCapacity: 18.5,
    phosphorus: 25, // ppm
    potassium: 185 // ppm
  }
});

// Define crop rotation system
const corn = new Crop('corn', 'field_corn', {
  variety: 'Pioneer_P1197AM',
  maturityDays: 115,
  plantingWindow: { start: 'april_15', end: 'may_31' },
  harvestWindow: { start: 'october_1', end: 'november_15' },
  yieldPotential: 11.3, // metric tons per hectare
  nutrientRequirements: {
    nitrogen: 180, // kg/ha
    phosphorus: 40,
    potassium: 60
  },
  waterRequirements: {
    totalSeason: 600, // mm
    criticalPeriods: ['tasseling', 'grain_filling']
  },
  marketPrice: 165 // USD per metric ton
});

const soybeans = new Crop('soybeans', 'commodity_soybeans', {
  variety: 'Asgrow_AG3032',
  maturityDays: 105,
  plantingWindow: { start: 'may_1', end: 'june_15' },
  harvestWindow: { start: 'september_15', end: 'november_1' },
  yieldPotential: 3.4, // metric tons per hectare
  nitrogenFixation: 150, // kg/ha fixed from atmosphere
  nutrientRequirements: {
    nitrogen: 0, // fixes its own
    phosphorus: 35,
    potassium: 55
  },
  waterRequirements: {
    totalSeason: 450,
    criticalPeriods: ['flowering', 'pod_filling']
  },
  marketPrice: 440 // USD per metric ton
});

// Set up crop rotation
const rotation = cornBeltFarm.createRotation('corn-soy-rotation', {
  pattern: ['corn', 'soybeans'], // 2-year rotation
  fields: [
    { id: 'field_1', area: 80, currentCrop: 'corn', year: 1 },
    { id: 'field_2', area: 85, currentCrop: 'soybeans', year: 2 },
    { id: 'field_3', area: 75, currentCrop: 'corn', year: 1 },
    { id: 'field_4', area: 90, currentCrop: 'soybeans', year: 2 }
  ]
});

// Add livestock operation
const beefCattle = new Livestock('beef_cattle', 'angus_cross', {
  herdSize: 150,
  breedingStock: 120, // cows
  averageWeight: 550, // kg
  breedingEfficiency: 0.90, // 90% pregnancy rate
  calvingInterval: 365, // days
  weaningWeight: 250, // kg
  marketWeight: 590, // kg
  dailyGain: 1.2, // kg per day
  feedConversion: 7.5, // kg feed per kg gain
  mortalityRate: 0.02, // 2% annual
  marketPrice: 4.85 // USD per kg live weight
});

const dairyCows = new Livestock('dairy_cattle', 'holstein', {
  herdSize: 80,
  milkingCows: 72,
  averageWeight: 650,
  milkProduction: 32, // kg per cow per day
  lactationLength: 305, // days
  dryPeriod: 60, // days
  cullingRate: 0.25, // 25% annual replacement
  feedIntake: 22, // kg dry matter per day
  milkPrice: 0.42 // USD per kg
});

// Add to farm
cornBeltFarm.addCrop(corn);
cornBeltFarm.addCrop(soybeans);
cornBeltFarm.addLivestock(beefCattle);
cornBeltFarm.addLivestock(dairyCows);

// Configure management practices
const management = cornBeltFarm.getManagementSystem();
management.configureFieldOperations({
  tillage: {
    corn: ['fall_chisel_plow', 'spring_field_cultivator', 'planting'],
    soybeans: ['no_till_planting'] // Reduced tillage for soybeans
  },
  fertilization: {
    soilTesting: 'annual',
    nitrogenApplication: 'variable_rate',
    precisionAgriculture: true,
    organicMatter: 'manure_application'
  },
  pestManagement: {
    strategy: 'integrated_pest_management',
    scouting: 'weekly_during_season',
    thresholds: 'economic_injury_level',
    resistance_management: true
  }
});

// Set up precision agriculture
const precisionAg = cornBeltFarm.getPrecisionAgriculture();
precisionAg.enableTechnologies({
  gps_guidance: { accuracy: 'rtk', coverage: 'full_farm' },
  variable_rate: ['seeding', 'fertilizer', 'lime'],
  yield_monitoring: { combine_mounted: true, moisture_correction: true },
  soil_sampling: { grid_size: '1_acre', frequency: 'every_3_years' },
  drone_scouting: { frequency: 'bi_weekly', analysis: 'ndvi_stress_detection' }
});

// Add farm to simulation
simulation.addFarm(cornBeltFarm);

// Run simulation for 5 years
simulation.start();
let totalCornYield = 0;
let totalSoyYield = 0;
let totalMilkProduction = 0;
let totalBeefProduction = 0;

for (let year = 0; year < 5; year++) {
  // Set annual weather pattern
  simulation.setWeatherPattern(year, {
    springRainfall: 'normal', // can be 'drought', 'normal', 'wet'
    summerTemperature: 'normal', // can be 'cool', 'normal', 'hot'
    fallHarvest: 'favorable', // can be 'poor', 'favorable', 'excellent'
    winterSeverity: 'moderate' // can be 'mild', 'moderate', 'severe'
  });

  const yearlyStats = simulation.stepYear();

  totalCornYield += yearlyStats.cropProduction.corn.totalYield;
  totalSoyYield += yearlyStats.cropProduction.soybeans.totalYield;
  totalMilkProduction += yearlyStats.livestockProduction.dairyCattle.milkYield;
  totalBeefProduction += yearlyStats.livestockProduction.beefCattle.liveWeight;

  console.log(`Year ${year + 1} Results:`);
  console.log(`- Corn Yield: ${yearlyStats.cropProduction.corn.yieldPerHa.toFixed(1)} t/ha`);
  console.log(`- Soybean Yield: ${yearlyStats.cropProduction.soybeans.yieldPerHa.toFixed(1)} t/ha`);
  console.log(`- Milk Production: ${(yearlyStats.livestockProduction.dairyCattle.milkYield / 1000).toFixed(0)}k kg`);
  console.log(`- Beef Production: ${(yearlyStats.livestockProduction.beefCattle.liveWeight / 1000).toFixed(0)}k kg`);
  console.log(`- Total Revenue: $${(yearlyStats.grossRevenue / 1000).toFixed(0)}k`);
  console.log(`- Operating Costs: $${(yearlyStats.operatingCosts / 1000).toFixed(0)}k`);
  console.log(`- Net Farm Income: $${(yearlyStats.netIncome / 1000).toFixed(0)}k`);
  console.log(`- Soil Health Index: ${yearlyStats.soilHealth.toFixed(2)}`);
  console.log(`- Environmental Score: ${yearlyStats.environmentalImpact.toFixed(1)}/100`);
}

// Generate sustainability report
const sustainability = simulation.generateSustainabilityReport();
console.log('5-Year Sustainability Summary:');
console.log(`- Soil Organic Matter Change: ${sustainability.soilOrganicMatterTrend.toFixed(3)}`);
console.log(`- Carbon Sequestration: ${sustainability.carbonSequestration.toFixed(1)} tons CO2/year`);
console.log(`- Water Use Efficiency: ${sustainability.waterUseEfficiency.toFixed(2)} kg grain/mm water`);
console.log(`- Biodiversity Index: ${sustainability.biodiversityIndex.toFixed(3)}`);
console.log(`- Economic Sustainability: ${sustainability.economicViability.toFixed(2)}/10`);

// Export for Unity visualization
const farmData = simulation.exportFarmState();
```

## Core Classes

### AgriculturalSimulation
Main simulation engine managing weather, markets, and agricultural systems across multiple farms.

### Farm
Individual farm operations with land management, crop rotations, and livestock systems.

### Crop
Plant species with growth modeling, nutrient requirements, and yield determination.

### Livestock
Animal production systems with breeding, feeding, and health management.

### SoilSystem
Soil chemistry, biology, and physics with nutrient cycling and erosion modeling.

## Game Integration

Perfect for:
- **Farming Simulators**: Realistic agricultural operations and management
- **Strategy Games**: Food production and resource management
- **City Builders**: Agricultural zones and food supply chains
- **Educational Games**: Teaching sustainable agriculture and food systems
- **Economic Simulations**: Commodity markets and agricultural policy effects

## Crop Production

### Plant Growth Modeling
Detailed crop development with physiological processes.

```typescript
const cropGrowthModel = {
  phenology: {
    stages: [
      {
        name: 'germination',
        duration: 7, // days
        temperature_requirement: { base: 10, optimum: 25, maximum: 35 },
        moisture_requirement: 'field_capacity',
        factors: ['seed_quality', 'planting_depth', 'soil_temperature']
      },
      {
        name: 'vegetative_growth',
        duration: 45,
        photoperiod_sensitive: false,
        nutrient_demand: 'high_nitrogen',
        water_stress_sensitivity: 'moderate'
      },
      {
        name: 'reproductive',
        duration: 30,
        temperature_sensitivity: 'high',
        water_requirement: 'critical',
        nutrient_demand: 'phosphorus_potassium'
      },
      {
        name: 'grain_filling',
        duration: 25,
        yield_determination: 'primary',
        stress_impact: 'severe',
        harvest_moisture: { target: 15.5, range: [14, 18] }
      }
    ]
  },

  yield_components: {
    plants_per_area: {
      target: 79000, // plants per hectare
      factors: ['seeding_rate', 'germination_percent', 'survival_rate']
    },
    ears_per_plant: {
      potential: 1.0,
      stress_reduction: 'drought_nitrogen_deficiency'
    },
    kernels_per_ear: {
      determination_period: 'silking_plus_14_days',
      environmental_sensitivity: 'very_high',
      typical_range: [400, 800]
    },
    kernel_weight: {
      determination_period: 'grain_filling',
      factors: ['photosynthesis_rate', 'temperature', 'water_availability'],
      genetic_potential: 350 // mg per kernel
    }
  }
};
```

### Variety Selection
Crop cultivars with specific adaptation traits.

```typescript
const cropVarieties = {
  corn: {
    'Pioneer_P1197AM': {
      maturity: 110, // relative maturity
      yield_potential: 'high',
      standability: 'excellent',
      disease_resistance: {
        northern_corn_leaf_blight: 'good',
        gray_leaf_spot: 'excellent',
        stalk_rot: 'good'
      },
      stress_tolerance: {
        drought: 'good',
        heat: 'excellent',
        cold: 'fair'
      },
      grain_quality: {
        test_weight: 'high',
        oil_content: 3.8,
        protein_content: 8.2
      }
    },
    'DeKalb_DKC64-87RIB': {
      maturity: 114,
      yield_potential: 'very_high',
      technology: ['roundup_ready', 'bt_corn_borer', 'bt_rootworm'],
      adaptation: 'high_management',
      nitrogen_use_efficiency: 'improved'
    }
  },

  soybeans: {
    'Asgrow_AG3032': {
      maturity_group: 3.0,
      yield_potential: 'high',
      disease_resistance: {
        soybean_cyst_nematode: 'races_3_14',
        brown_stem_rot: 'resistant',
        phytophthora: 'races_1a_1c_3a'
      },
      herbicide_tolerance: 'roundup_ready_2_xtend',
      protein_content: 34.5, // percent
      oil_content: 18.8
    }
  }
};
```

## Livestock Management

### Animal Production Systems
Comprehensive livestock modeling with biological processes.

```typescript
const livestockSystems = {
  dairy_cattle: {
    lactation_curve: {
      peak_milk: 45, // kg per day
      peak_timing: 60, // days in milk
      persistency: 0.92, // monthly decline rate
      lactation_length: 305,
      dry_period: 60,
      milk_composition: {
        fat: 0.037, // 3.7%
        protein: 0.031,
        lactose: 0.048,
        solids_not_fat: 0.087
      }
    },

    reproduction: {
      breeding_program: 'artificial_insemination',
      conception_rate: 0.35, // per service
      services_per_conception: 2.1,
      calving_interval: 395, // days
      replacement_rate: 0.28, // annual
      genetic_improvement: 0.02 // annual gain
    },

    nutrition: {
      dry_matter_intake: {
        formula: '0.372 * fat_corrected_milk + 0.0968 * body_weight^0.75',
        maximum: 4.0, // percent of body weight
        factors: ['milk_production', 'body_condition', 'environment']
      },
      ration_composition: {
        forage: 0.55, // percent of dry matter
        concentrate: 0.40,
        minerals_vitamins: 0.05,
        crude_protein: 0.16,
        net_energy_lactation: 1.65 // Mcal per kg
      }
    }
  },

  beef_cattle: {
    growth_phases: {
      calf: {
        age_range: [0, 205], // days
        average_daily_gain: 0.9, // kg
        feed_conversion: 4.5,
        mortality_rate: 0.03
      },
      backgrounding: {
        age_range: [205, 365],
        average_daily_gain: 1.1,
        feed_conversion: 6.2,
        target_weight: 340 // kg
      },
      finishing: {
        age_range: [365, 485],
        average_daily_gain: 1.6,
        feed_conversion: 7.8,
        market_weight: 590,
        carcass_grade: 'choice'
      }
    },

    breeding: {
      breeding_season: 60, // days
      pregnancy_rate: 0.92,
      calving_rate: 0.88,
      weaning_rate: 0.85,
      bull_to_cow_ratio: 25, // cows per bull
      heifer_development: {
        target_breeding_weight: 0.65, // of mature weight
        conception_rate: 0.85
      }
    }
  }
};
```

### Feed and Nutrition
Ration formulation and feeding systems.

```typescript
const nutritionManagement = {
  feed_ingredients: {
    corn_silage: {
      dry_matter: 0.35,
      crude_protein: 0.08, // percent of DM
      net_energy_lactation: 1.55, // Mcal per kg DM
      neutral_detergent_fiber: 0.42,
      starch: 0.28,
      cost: 45 // USD per ton as fed
    },
    alfalfa_hay: {
      dry_matter: 0.88,
      crude_protein: 0.19,
      net_energy_lactation: 1.45,
      relative_feed_value: 155,
      cost: 185 // USD per ton
    },
    corn_grain: {
      dry_matter: 0.86,
      crude_protein: 0.09,
      net_energy_lactation: 2.05,
      starch: 0.72,
      cost: 165 // USD per ton
    }
  },

  ration_formulation: {
    optimization_criteria: ['cost_minimization', 'nutrient_requirements'],
    constraints: {
      dry_matter_intake: { min: 20, max: 28 }, // kg per day
      crude_protein: { min: 0.16, max: 0.20 },
      net_energy: { min: 1.60, max: 1.75 },
      fiber: { min: 0.28, max: 0.35 },
      forage_minimum: 0.50 // percent of DM
    },
    mixing_accuracy: 0.95,
    feed_delivery: 'total_mixed_ration'
  }
};
```

## Soil Management

### Soil Health Assessment
Comprehensive soil quality monitoring.

```typescript
const soilHealthIndicators = {
  physical_properties: {
    bulk_density: {
      measurement: 'core_sampling',
      frequency: 'annual',
      target_range: [1.2, 1.4], // g/cm³ for loam soils
      factors: ['compaction', 'organic_matter', 'tillage']
    },
    aggregate_stability: {
      test_method: 'wet_sieving',
      score_range: [0, 100],
      interpretation: {
        excellent: [75, 100],
        good: [50, 74],
        fair: [25, 49],
        poor: [0, 24]
      }
    },
    infiltration_rate: {
      measurement: 'ring_infiltrometer',
      units: 'mm_per_hour',
      adequate_minimum: 25,
      factors: ['compaction', 'surface_crusting', 'organic_matter']
    }
  },

  chemical_properties: {
    ph_management: {
      target_range: [6.0, 7.0], // for most crops
      testing_frequency: 'every_3_years',
      amendment_options: ['agricultural_lime', 'wood_ash', 'sulfur'],
      buffer_ph: 'SMP_buffer'
    },
    nutrient_availability: {
      phosphorus: {
        test_method: 'bray_p1',
        sufficiency_level: 30, // ppm
        buildup_level: 50,
        environmental_threshold: 100
      },
      potassium: {
        test_method: 'ammonium_acetate',
        sufficiency_level: 150, // ppm
        cation_exchange_relationship: true
      },
      micronutrients: ['zinc', 'iron', 'manganese', 'boron']
    }
  },

  biological_properties: {
    organic_matter: {
      target_minimum: 0.025, // 2.5%
      change_rate: 0.1, // percent per year with good management
      carbon_to_nitrogen_ratio: [10, 12],
      active_fraction: 'particulate_organic_matter'
    },
    microbial_activity: {
      indicators: ['respiration', 'biomass_carbon', 'enzyme_activity'],
      seasonal_variation: 'spring_peak',
      management_effects: ['tillage', 'crop_rotation', 'cover_crops']
    }
  }
};
```

### Nutrient Cycling
Complex nutrient transformation and availability modeling.

```typescript
const nutrientCycling = {
  nitrogen_cycle: {
    mineralization: {
      from_organic_matter: 'temperature_moisture_dependent',
      rate: 0.02, // fraction of organic N released annually
      timing: 'spring_summer_peak',
      factors: ['temperature', 'moisture', 'pH', 'C_N_ratio']
    },
    nitrification: {
      process: 'NH4_to_NO3',
      rate_constant: 0.1, // per day at optimal conditions
      inhibitors: ['temperature_below_5C', 'waterlogged_soils'],
      loss_potential: 'leaching_denitrification'
    },
    denitrification: {
      conditions: 'anaerobic_high_moisture',
      loss_rate: 'variable_0_to_50_percent',
      environmental_factors: ['soil_temperature', 'nitrate_concentration', 'carbon_availability']
    },
    immobilization: {
      trigger: 'wide_C_N_ratio_residues',
      duration: 'temporary_weeks_to_months',
      release: 'gradual_as_residues_decompose'
    }
  },

  phosphorus_cycle: {
    soil_forms: {
      available: 'solution_plus_labile',
      slowly_available: 'moderately_labile',
      unavailable: 'non_labile_occluded'
    },
    transformations: {
      adsorption: 'pH_and_clay_dependent',
      precipitation: 'aluminum_iron_calcium_compounds',
      mineralization: 'from_organic_phosphorus',
      plant_uptake: 'mycorrhizal_enhanced'
    }
  }
};
```

## Precision Agriculture

### Technology Integration
Advanced farming technologies and data analytics.

```typescript
const precisionTechnologies = {
  variable_rate_application: {
    seeding: {
      technology: 'prescription_maps',
      rate_variation: [28000, 84000], // seeds per hectare
      factors: ['yield_potential', 'soil_type', 'water_availability'],
      economic_return: 15 // USD per hectare
    },
    fertilizer: {
      nutrient_mapping: 'soil_grid_sampling',
      application_methods: ['spinner_spreader', 'pneumatic_applicator'],
      rate_precision: 0.95, // 95% accuracy
      environmental_benefit: 'reduced_runoff_risk'
    },
    pesticides: {
      spot_spraying: 'camera_guided',
      savings: 0.3, // 30% reduction in pesticide use
      target_detection: 'machine_learning_algorithms'
    }
  },

  data_management: {
    yield_monitoring: {
      combine_sensors: ['load_cells', 'moisture_sensor', 'gps'],
      data_resolution: '1_second_intervals',
      processing: 'real_time_calibration',
      accuracy: 0.98
    },
    field_mapping: {
      boundary_definition: 'rtk_gps',
      elevation_modeling: 'lidar_data',
      soil_sampling: 'grid_based_adaptive',
      update_frequency: 'annual_or_as_needed'
    },
    analytics_platform: {
      data_integration: 'weather_soil_yield_management',
      decision_support: 'ai_enhanced_recommendations',
      benchmarking: 'peer_farm_comparison',
      profitability_analysis: 'field_by_field'
    }
  }
};
```

## Market Economics

### Commodity Markets
Price formation and market dynamics.

```typescript
const marketDynamics = {
  price_formation: {
    fundamental_factors: {
      supply_factors: [
        'domestic_production',
        'global_production',
        'stocks_to_use_ratio',
        'weather_conditions'
      ],
      demand_factors: [
        'domestic_consumption',
        'export_demand',
        'livestock_feeding',
        'industrial_uses',
        'biofuel_demand'
      ]
    },
    technical_factors: {
      futures_market: 'chicago_board_of_trade',
      basis_relationships: 'local_elevator_minus_futures',
      seasonality: 'harvest_pressure_spring_rally',
      speculation: 'fund_positioning_effects'
    }
  },

  price_volatility: {
    corn: {
      historical_volatility: 0.25, // annual
      seasonal_pattern: 'harvest_low_spring_high',
      weather_sensitivity: 'july_august_critical',
      government_policy: 'renewable_fuel_standard',
      international_trade: 'export_competition'
    },
    soybeans: {
      historical_volatility: 0.22,
      demand_drivers: 'china_imports_crushing_margins',
      competition: 'south_america_production',
      oilseed_complex: 'soybean_oil_meal_ratios'
    }
  },

  risk_management: {
    hedging_strategies: [
      'futures_contracts',
      'basis_contracts',
      'minimum_price_contracts',
      'crop_insurance'
    ],
    marketing_windows: {
      pre_plant: 'price_discovery',
      growing_season: 'weather_market_monitoring',
      harvest: 'storage_vs_immediate_sale',
      post_harvest: 'carry_charges_analysis'
    }
  }
};
```

## Environmental Impact

### Sustainability Metrics
Environmental performance indicators and assessment.

```typescript
const sustainabilityAssessment = {
  carbon_footprint: {
    sources: {
      fuel_use: 'tractors_combines_trucks',
      fertilizer_production: 'nitrogen_synthesis_energy',
      lime_application: 'calcination_co2_release',
      land_use_change: 'soil_carbon_loss_gain'
    },
    sinks: {
      photosynthesis: 'crop_biomass_accumulation',
      soil_sequestration: 'cover_crops_reduced_tillage',
      perennial_systems: 'grassland_trees_carbon_storage'
    },
    net_calculation: 'lifecycle_assessment_approach'
  },

  water_management: {
    use_efficiency: {
      metric: 'crop_per_drop',
      calculation: 'yield_divided_by_water_input',
      improvement_practices: [
        'deficit_irrigation',
        'drought_tolerant_varieties',
        'soil_moisture_monitoring',
        'cover_crop_water_conservation'
      ]
    },
    quality_protection: {
      nutrient_management: 'right_rate_time_place_source',
      buffer_strips: 'waterway_protection',
      controlled_drainage: 'tile_drain_management',
      integrated_pest_management: 'reduced_pesticide_loading'
    }
  },

  biodiversity_conservation: {
    habitat_provision: {
      field_margins: 'pollinator_strips',
      wetland_restoration: 'waterfowl_habitat',
      cover_crops: 'soil_organism_diversity',
      crop_rotation: 'pest_natural_enemy_enhancement'
    },
    pollinator_support: {
      flowering_plants: 'season_long_nectar_sources',
      nesting_sites: 'ground_cavity_wood_nesting',
      pesticide_stewardship: 'pollinator_protection_protocols'
    }
  }
};
```

## Configuration Options

```typescript
const config = {
  // Simulation parameters
  timeStep: 'daily', // hourly, daily, weekly
  weatherDetail: 'comprehensive', // basic, detailed, comprehensive
  soilResolution: 'field_level', // uniform, management_zone, field_level

  // Production systems
  crops: {
    growthModeling: 'physiological', // empirical, physiological
    stressResponse: 'detailed',
    varietalDifferences: true,
    pestDiseaseModeling: true
  },

  livestock: {
    individualAnimals: false, // true for small herds
    nutritionModeling: 'detailed',
    reproductionCycles: true,
    healthManagement: true
  },

  // Economic modeling
  markets: {
    priceVolatility: 'realistic',
    basisRelationships: true,
    contractOptions: true,
    riskManagement: true
  },

  // Environmental systems
  environment: {
    carbonCycling: 'full_lifecycle',
    waterQuality: 'detailed',
    biodiversity: 'indicator_species',
    climateChange: 'adaptation_scenarios'
  }
};
```

## Unity Integration

Export comprehensive agricultural data for visualization:

```json
{
  "farms": [
    {
      "id": "heritage_farm",
      "location": { "lat": 42.5, "lng": -93.5 },
      "fields": [
        {
          "id": "field_1",
          "crop": "corn",
          "area": 80,
          "growth_stage": "grain_filling",
          "yield_estimate": 11.2,
          "soil_moisture": 0.65
        }
      ],
      "livestock": [...],
      "equipment": [...],
      "buildings": [...]
    }
  ],
  "weather": {
    "current": {...},
    "forecast": [...],
    "seasonal": {...}
  },
  "markets": {
    "corn": { "price": 165.50, "trend": "stable" },
    "soybeans": { "price": 445.25, "trend": "rising" }
  },
  "sustainability": {
    "carbonBalance": 1250,
    "waterUseEfficiency": 2.1,
    "biodiversityIndex": 0.78
  }
}
```

## Examples

See `examples/basic/diversified-farm.ts` for a complete agricultural simulation with crop rotation, livestock integration, and precision agriculture technologies.

## Performance

- Supports multi-farm operations with thousands of fields
- Real-time crop growth simulation with daily time steps
- Comprehensive livestock herd management
- Advanced economic and environmental modeling

## License

MIT