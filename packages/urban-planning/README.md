# @steam-sim/urban-planning

Comprehensive urban planning and smart city simulation with zoning, infrastructure, and citizen happiness modeling for Unity-based Steam games.

## Features

- **Smart Zoning System**: Residential, commercial, industrial, and mixed-use zone planning
- **Infrastructure Management**: Roads, utilities, public transportation, and smart city systems
- **Population Dynamics**: Citizen satisfaction, demographics, and migration patterns
- **Traffic Simulation**: Realistic traffic flow with congestion modeling and optimization
- **Environmental Impact**: Pollution tracking, green spaces, and sustainability metrics
- **Economic Development**: Tax revenue, property values, and economic growth modeling

## Installation

```bash
npm install @steam-sim/urban-planning
```

## Quick Start

```typescript
import { UrbanPlanningSimulation, CityGrid, ZoningSystem } from '@steam-sim/urban-planning';

// Create a 50x50 city grid
const simulation = new UrbanPlanningSimulation({
  gridSize: { width: 50, height: 50 },
  startingBudget: 5000000,
  difficulty: 'medium'
});

const cityGrid = simulation.getCityGrid();
const zoning = simulation.getZoningSystem();
const infrastructure = simulation.getInfrastructureManager();

// Plan residential district
zoning.setZone(10, 10, 20, 15, 'residential');
cityGrid.buildStructure(12, 12, 'apartment');
cityGrid.buildStructure(15, 13, 'house');

// Add commercial center
zoning.setZone(25, 20, 35, 30, 'commercial');
cityGrid.buildStructure(28, 25, 'office');
cityGrid.buildStructure(30, 27, 'shop');

// Industrial zone
zoning.setZone(5, 35, 15, 45, 'industrial');
cityGrid.buildStructure(8, 38, 'factory');

// Build infrastructure
infrastructure.buildRoad(10, 10, 35, 10); // Main street
infrastructure.buildRoad(20, 5, 20, 45);  // Cross street

// Add utilities
infrastructure.installPowerGrid(0, 0, 50, 50);
infrastructure.installWaterSystem(0, 0, 50, 50);

// Public transportation
const busRoute = infrastructure.addBusRoute([
  { x: 10, y: 10 },
  { x: 25, y: 20 },
  { x: 35, y: 30 }
]);

// Smart city features
infrastructure.installSmartTrafficLights();
infrastructure.deployIoTSensors(['air_quality', 'noise', 'traffic']);

// Run simulation
simulation.start();
for (let month = 0; month < 12; month++) {
  const monthlyStats = simulation.step(30); // 30 days

  console.log(`Month ${month + 1}:`);
  console.log(`- Population: ${monthlyStats.population.toLocaleString()}`);
  console.log(`- Happiness: ${(monthlyStats.averageHappiness * 100).toFixed(1)}%`);
  console.log(`- Tax Revenue: $${monthlyStats.taxRevenue.toLocaleString()}`);
  console.log(`- Traffic Efficiency: ${(monthlyStats.trafficEfficiency * 100).toFixed(1)}%`);
  console.log(`- Environmental Score: ${monthlyStats.environmentalScore.toFixed(1)}/100`);
}

// Export for Unity
const cityData = simulation.exportCityState();
```

## Core Classes

### UrbanPlanningSimulation
Main city simulation orchestrator managing all urban systems and their interactions.

### CityGrid
Grid-based city representation with cells containing buildings, infrastructure, and zoning information.

### ZoningSystem
Advanced zoning management with density controls, mixed-use planning, and regulatory compliance.

### InfrastructureManager
Comprehensive infrastructure planning including transportation, utilities, and smart city systems.

### CityAnalytics
Data-driven city analysis with performance metrics, predictive modeling, and optimization recommendations.

## Game Integration

Perfect for:
- **City Builders**: Complete urban planning and management simulation
- **Strategy Games**: Territory development and resource allocation
- **Educational Games**: Teaching urban planning principles and smart city concepts
- **Management Sims**: Municipal governance and policy implementation
- **Puzzle Games**: Urban optimization and constraint satisfaction challenges

## Zoning Types

### Residential Zones
Population housing with density and income level variations.

```typescript
// Low-density residential
zoning.setZone(10, 10, 20, 20, 'residential', {
  density: 'low',
  allowedBuildings: ['house', 'duplex'],
  maxHeight: 2,
  minLotSize: 500 // square meters
});

// High-density residential
zoning.setZone(30, 30, 40, 40, 'residential', {
  density: 'high',
  allowedBuildings: ['apartment', 'condo', 'tower'],
  maxHeight: 25,
  minLotSize: 100
});
```

### Commercial Districts
Business and retail areas with specialization options.

```typescript
// Central business district
zoning.setZone(20, 20, 30, 30, 'commercial', {
  type: 'central_business',
  allowedBuildings: ['office', 'bank', 'corporate_tower'],
  maxHeight: 50,
  parkingRequirements: 0.8 // spaces per worker
});

// Neighborhood retail
zoning.setZone(5, 25, 15, 35, 'commercial', {
  type: 'neighborhood_retail',
  allowedBuildings: ['shop', 'restaurant', 'service'],
  maxHeight: 3,
  walkabilityFocus: true
});
```

### Industrial Areas
Manufacturing and logistics with environmental considerations.

```typescript
// Heavy industry
zoning.setZone(0, 40, 20, 50, 'industrial', {
  type: 'heavy',
  allowedBuildings: ['factory', 'warehouse', 'power_plant'],
  environmentalBuffer: 200, // meters
  truckAccess: true
});

// Technology park
zoning.setZone(35, 0, 50, 15, 'industrial', {
  type: 'technology',
  allowedBuildings: ['tech_office', 'research_lab', 'data_center'],
  greenSpaceRequirement: 0.3,
  parkingRatio: 1.2
});
```

## Infrastructure Systems

### Transportation Network
Multi-modal transportation with traffic optimization.

```typescript
const transport = simulation.getTransportationSystem();

// Road hierarchy
transport.buildRoad(start, end, {
  type: 'arterial',
  lanes: 4,
  speedLimit: 60, // km/h
  trafficLights: true
});

// Public transit
const metroLine = transport.addMetroLine([
  { x: 5, y: 25, name: 'Downtown' },
  { x: 25, y: 25, name: 'City Center' },
  { x: 45, y: 25, name: 'Uptown' }
], {
  capacity: 1000, // passengers per train
  frequency: 3, // minutes between trains
  fare: 2.50
});

// Bike infrastructure
transport.buildBikeLane(start, end, {
  separated: true,
  connectivity: 'high',
  safetyRating: 0.95
});
```

### Utility Systems
Essential services with smart grid capabilities.

```typescript
const utilities = simulation.getUtilityManager();

// Smart electrical grid
utilities.installPowerGrid({
  sources: [
    { type: 'solar', capacity: 100, efficiency: 0.22 },
    { type: 'wind', capacity: 150, efficiency: 0.35 },
    { type: 'natural_gas', capacity: 300, efficiency: 0.60 }
  ],
  smartMeters: true,
  demandResponse: true,
  batteryStorage: 50 // MWh
});

// Water management
utilities.installWaterSystem({
  sources: ['reservoir', 'groundwater'],
  treatment: 'advanced',
  recycling: true,
  smartSensors: true,
  leakDetection: 'real_time'
});

// Waste management
utilities.installWasteSystem({
  collection: 'automated',
  recyclingRate: 0.65,
  organicWaste: 'composting',
  wasteToEnergy: true
});
```

## Smart City Features

### IoT Sensor Network
City-wide monitoring and data collection.

```typescript
const smartCity = simulation.getSmartCityManager();

// Deploy sensor network
smartCity.deploySensors({
  airQuality: { density: 'high', accuracy: 0.95 },
  noise: { density: 'medium', accuracy: 0.90 },
  traffic: { density: 'high', realTime: true },
  parking: { coverage: 0.80, dynamicPricing: true },
  lighting: { adaptive: true, energyEfficient: true }
});

// Data analytics platform
smartCity.enableAnalytics({
  predictiveModeling: true,
  anomalyDetection: true,
  citizenFeedback: true,
  performanceDashboard: true
});
```

### Citizen Services
Digital government and e-services.

```typescript
const services = simulation.getCitizenServices();

// Digital services
services.enableOnlineServices([
  'permit_applications',
  'tax_payments',
  'service_requests',
  'public_records',
  'transit_planning'
]);

// Civic engagement
services.enableCivicEngagement({
  digitalVoting: true,
  publicConsultations: true,
  budgetParticipation: true,
  issueReporting: 'mobile_app'
});
```

## Performance Metrics

### City Health Indicators
Comprehensive urban performance tracking.

```typescript
const analytics = simulation.getCityAnalytics();

const healthReport = analytics.generateHealthReport();
console.log(`Livability Index: ${healthReport.livabilityIndex.toFixed(1)}/100`);
console.log(`Economic Vitality: ${healthReport.economicVitality.toFixed(1)}/100`);
console.log(`Environmental Sustainability: ${healthReport.sustainability.toFixed(1)}/100`);
console.log(`Infrastructure Quality: ${healthReport.infrastructure.toFixed(1)}/100`);
console.log(`Social Equity: ${healthReport.socialEquity.toFixed(1)}/100`);
```

### Traffic Analysis
Advanced transportation performance metrics.

```typescript
const trafficAnalysis = analytics.analyzeTraffic();
console.log(`Average Commute Time: ${trafficAnalysis.averageCommuteTime.toFixed(1)} minutes`);
console.log(`Congestion Index: ${trafficAnalysis.congestionIndex.toFixed(2)}`);
console.log(`Public Transit Usage: ${(trafficAnalysis.transitUsage * 100).toFixed(1)}%`);
console.log(`Walkability Score: ${trafficAnalysis.walkabilityScore.toFixed(1)}/100`);
```

## Environmental Simulation

### Climate and Pollution
Environmental impact modeling with mitigation strategies.

```typescript
const environment = simulation.getEnvironmentalManager();

// Air quality monitoring
const airQuality = environment.getAirQuality();
console.log(`PM2.5: ${airQuality.pm25.toFixed(1)} μg/m³`);
console.log(`NO2: ${airQuality.no2.toFixed(1)} ppb`);
console.log(`Ozone: ${airQuality.ozone.toFixed(1)} ppb`);

// Green infrastructure
environment.addGreenInfrastructure({
  parks: { coverage: 0.15, biodiversity: 'high' },
  greenRoofs: { coverage: 0.10, stormwater: true },
  urbanForest: { canopyCover: 0.30, carbonSequestration: true },
  greenCorridors: { connectivity: 'high', wildlifePassage: true }
});
```

## Economic Modeling

### Financial Management
Municipal finance with revenue optimization.

```typescript
const finance = simulation.getFinanceManager();

// Tax policy
finance.setTaxRates({
  property: 0.012, // 1.2%
  sales: 0.08, // 8%
  income: 0.05, // 5%
  business: 0.10 // 10%
});

// Revenue analysis
const revenue = finance.getRevenueAnalysis();
console.log(`Property Tax: $${revenue.propertyTax.toLocaleString()}`);
console.log(`Development Fees: $${revenue.developmentFees.toLocaleString()}`);
console.log(`Grant Funding: $${revenue.grants.toLocaleString()}`);
```

## Configuration Options

```typescript
const config = {
  // Simulation parameters
  timeScale: 1, // 1 day = 1 minute real time
  populationGrowth: 0.02, // 2% annual growth
  economicCycle: 'normal', // recession, normal, boom

  // Planning constraints
  zoning: {
    mixedUseEncouragement: true,
    densityBonuses: true,
    affordableHousingRequirement: 0.15
  },

  // Infrastructure standards
  infrastructure: {
    levelOfService: 'C', // Traffic level of service
    utilityReliability: 0.995,
    maintenanceStandard: 'preventive'
  },

  // Smart city features
  smartCity: {
    digitalization: 0.8, // 0-1 scale
    sensorCoverage: 0.7,
    dataSharing: true,
    citizenEngagement: 'high'
  }
};
```

## Unity Integration

Export detailed city data for 3D visualization:

```json
{
  "cityGrid": {
    "dimensions": { "width": 50, "height": 50 },
    "cells": [...],
    "buildings": [...],
    "infrastructure": [...]
  },
  "realTimeData": {
    "population": 125000,
    "trafficFlow": {...},
    "utilityUsage": {...},
    "environmentalData": {...}
  },
  "analytics": {
    "demographics": {...},
    "economicIndicators": {...},
    "performanceMetrics": {...}
  }
}
```

## Examples

See `examples/basic/smart-city.ts` for a complete smart city simulation with mixed-use development, public transportation, and IoT integration.

## Performance

- Supports cities up to 100x100 grid cells with real-time simulation
- Optimized pathfinding for traffic simulation
- Multi-threaded processing for large population modeling
- Configurable detail levels for performance optimization

## License

MIT