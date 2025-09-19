# @steam-sim/manufacturing

Advanced manufacturing simulation with production lines, quality control, and supply chain management for Unity-based Steam games.

## Features

- **Production Line Simulation**: Complex multi-stage manufacturing processes with realistic timing
- **Quality Control Systems**: Defect detection, inspection stations, and statistical quality control
- **Supply Chain Management**: Raw material sourcing, inventory optimization, and logistics
- **Equipment Modeling**: Machine breakdowns, maintenance schedules, and efficiency tracking
- **Worker Management**: Skill levels, training programs, and productivity optimization
- **Cost Analysis**: Real-time profitability tracking and operational expense monitoring

## Installation

```bash
npm install @steam-sim/manufacturing
```

## Quick Start

```typescript
import { ManufacturingSimulation, ProductionLine, Machine } from '@steam-sim/manufacturing';

// Create manufacturing facility
const simulation = new ManufacturingSimulation({
  facilitySize: { width: 100, height: 50 },
  initialCapital: 1000000,
  qualityTargets: { defectRate: 0.02, efficiency: 0.85 }
});

// Set up production line for car manufacturing
const productionLine = new ProductionLine('car-assembly', {
  product: 'sedan',
  capacity: 100, // units per day
  cycleTime: 8.5 // hours per unit
});

// Add manufacturing stages
const stampingPress = new Machine('stamping-press', {
  type: 'stamping',
  capacity: 120,
  efficiency: 0.92,
  maintenanceInterval: 168, // hours
  operatingCost: 50 // per hour
});

const weldingStation = new Machine('welding-robot', {
  type: 'welding',
  capacity: 110,
  efficiency: 0.88,
  defectRate: 0.015,
  operatingCost: 75
});

productionLine.addMachine(stampingPress);
productionLine.addMachine(weldingStation);

// Configure supply chain
const steelSupplier = simulation.addSupplier('steel-corp', {
  material: 'steel',
  pricePerUnit: 500,
  deliveryTime: 24, // hours
  reliability: 0.95,
  minimumOrder: 1000
});

productionLine.addMaterialRequirement('steel', 2.5); // tons per unit

// Start production
simulation.addProductionLine(productionLine);
simulation.start();

// Run simulation for 30 days
for (let day = 0; day < 30; day++) {
  const dailyStats = simulation.step(24); // 24 hours

  console.log(`Day ${day + 1}:`);
  console.log(`- Units produced: ${dailyStats.unitsProduced}`);
  console.log(`- Quality rate: ${(dailyStats.qualityRate * 100).toFixed(1)}%`);
  console.log(`- Operating cost: $${dailyStats.operatingCost.toFixed(2)}`);
  console.log(`- Profit: $${dailyStats.profit.toFixed(2)}`);
}

// Export for Unity visualization
const factoryData = simulation.exportState();
```

## Core Classes

### ManufacturingSimulation
Main orchestrator managing production facilities, supply chains, and financial metrics.

### ProductionLine
Individual production sequences with machines, workers, and quality control stations.

### Machine
Manufacturing equipment with maintenance needs, efficiency curves, and breakdown modeling.

### QualityControl
Inspection systems with statistical sampling, defect detection, and improvement protocols.

### SupplyChain
Material sourcing with vendor management, inventory optimization, and logistics coordination.

### Worker
Human resource modeling with skills, training, productivity, and labor costs.

## Game Integration

Perfect for:
- **Factory Builders**: Design and optimize manufacturing facilities
- **City Builders**: Industrial zones and economic simulation
- **Management Games**: Production planning and resource optimization
- **Strategy Games**: Industrial development and supply chain warfare
- **Educational Games**: Teaching lean manufacturing and industrial engineering

## Production Types

### Discrete Manufacturing
Build individual products like cars, electronics, or furniture.

```typescript
const electronicsLine = new ProductionLine('smartphone-assembly', {
  product: 'smartphone',
  billOfMaterials: {
    'circuit-board': 1,
    'battery': 1,
    'screen': 1,
    'case': 1
  },
  assemblySteps: [
    'component-insertion',
    'soldering',
    'testing',
    'final-assembly',
    'quality-check'
  ]
});
```

### Process Manufacturing
Continuous production like chemicals, food processing, or oil refining.

```typescript
const chemicalPlant = new ProcessLine('polymer-production', {
  inputMaterials: {
    'ethylene': 1000, // kg/hour
    'catalyst': 5
  },
  outputProduct: 'polyethylene',
  outputRate: 800, // kg/hour
  operatingTemperature: 200, // Celsius
  pressure: 15 // bar
});
```

### Batch Manufacturing
Recipe-based production with discrete batches and changeover times.

```typescript
const brewery = new BatchLine('beer-production', {
  batchSize: 5000, // liters
  recipe: {
    'malt': 800, // kg
    'hops': 15,
    'yeast': 2,
    'water': 4000 // liters
  },
  processingTime: 168, // hours (7 days)
  changeoverTime: 4 // hours between batches
});
```

## Quality Management

### Statistical Process Control
Monitor production quality with control charts and process capability analysis.

```typescript
const qualitySystem = new QualityControl({
  samplingRate: 0.1, // Test 10% of products
  controlLimits: {
    upperLimit: 105,
    lowerLimit: 95,
    target: 100
  },
  statisticalMethods: ['xbar-r', 'p-chart', 'cpk-analysis']
});

productionLine.addQualityStation(qualitySystem);
```

### Six Sigma Integration
Implement DMAIC methodology for continuous improvement.

```typescript
const sixSigmaProject = simulation.startImprovementProject({
  target: 'reduce-defects',
  currentDefectRate: 0.05,
  targetDefectRate: 0.01,
  methodology: 'dmaic',
  budget: 50000,
  timeline: 90 // days
});
```

## Supply Chain Features

### Vendor Management
Multiple suppliers with reliability ratings and performance tracking.

```typescript
const supplier = simulation.addSupplier('acme-parts', {
  materials: ['steel', 'aluminum', 'plastic'],
  leadTimes: { steel: 48, aluminum: 72, plastic: 24 }, // hours
  pricing: { steel: 500, aluminum: 1200, plastic: 200 }, // per ton
  qualityRating: 0.98,
  deliveryReliability: 0.95,
  minimumOrders: { steel: 10, aluminum: 5, plastic: 2 }
});
```

### Inventory Optimization
Just-in-time delivery with safety stock calculations.

```typescript
const inventory = new InventoryManager({
  reorderPoints: {
    'steel': { min: 50, max: 200, target: 100 },
    'aluminum': { min: 20, max: 80, target: 40 }
  },
  storageCapacity: 1000, // total tons
  storageCost: 10, // per ton per day
  orderCosts: { steel: 500, aluminum: 300 } // fixed cost per order
});
```

## Performance Metrics

### Key Performance Indicators
Track critical manufacturing metrics in real-time.

```typescript
const kpis = simulation.getKPIs();
console.log(`Overall Equipment Effectiveness: ${kpis.oee.toFixed(1)}%`);
console.log(`First Pass Yield: ${kpis.firstPassYield.toFixed(1)}%`);
console.log(`Cycle Time: ${kpis.cycleTime.toFixed(1)} hours`);
console.log(`Cost per Unit: $${kpis.costPerUnit.toFixed(2)}`);
console.log(`Throughput: ${kpis.throughput.toFixed(0)} units/day`);
```

### Financial Analysis
Comprehensive cost accounting and profitability analysis.

```typescript
const financials = simulation.getFinancialAnalysis();
console.log(`Revenue: $${financials.revenue.toFixed(2)}`);
console.log(`Material Costs: $${financials.materialCosts.toFixed(2)}`);
console.log(`Labor Costs: $${financials.laborCosts.toFixed(2)}`);
console.log(`Overhead: $${financials.overhead.toFixed(2)}`);
console.log(`Profit Margin: ${financials.profitMargin.toFixed(1)}%`);
```

## Configuration Options

```typescript
const config = {
  // Production settings
  shiftSchedule: {
    shiftsPerDay: 3,
    hoursPerShift: 8,
    daysPerWeek: 5
  },

  // Quality parameters
  qualityTargets: {
    defectRate: 0.02,
    customerSatisfaction: 0.95,
    firstPassYield: 0.90
  },

  // Maintenance strategy
  maintenance: {
    strategy: 'predictive', // preventive, corrective, predictive
    scheduleOptimization: true,
    spareParts: { stock: 'optimal', cost: 0.05 }
  },

  // Automation level
  automation: {
    level: 0.7, // 0-1 scale
    robotics: true,
    aiQualityControl: true,
    predictiveAnalytics: true
  }
};
```

## Unity Integration

Export comprehensive factory data for 3D visualization:

```json
{
  "facility": {
    "layout": {...},
    "productionLines": [...],
    "machines": [...],
    "workers": [...]
  },
  "realTimeData": {
    "throughput": 85.3,
    "efficiency": 0.87,
    "qualityRate": 0.96,
    "alerts": [...]
  },
  "analytics": {
    "trends": {...},
    "predictions": {...},
    "recommendations": [...]
  }
}
```

## Examples

See `examples/basic/car-factory.ts` for a complete automotive manufacturing simulation with multi-stage assembly, quality control, and supply chain management.

## Performance

- Handles facilities with 1000+ machines in real-time
- Optimized discrete event simulation engine
- Configurable detail levels for performance tuning
- Memory-efficient batch processing for large-scale operations

## License

MIT