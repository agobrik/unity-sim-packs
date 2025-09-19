# @steam-sim/electrical-grid

Comprehensive electrical grid simulation with power flow analysis and load balancing for Unity-based Steam games.

## Features

- **Power Grid Modeling**: Complete electrical network simulation
- **Load Balancing**: Automatic generation-demand balancing with frequency control
- **Grid Analysis**: Real-time efficiency, reliability, and stability monitoring
- **Fault Simulation**: Outage scenarios and emergency response systems
- **Economic Modeling**: Operating costs, revenue calculation, and profit analysis
- **Unity Integration**: Real-time grid visualization and monitoring data

## Installation

```bash
npm install @steam-sim/electrical-grid
```

## Quick Start

```typescript
import { ElectricalGridSimulation } from '@steam-sim/electrical-grid';

// Create electrical grid simulation
const simulation = new ElectricalGridSimulation({
  enableAutoBalance: true,
  targetFrequency: 50,
  voltageRegulation: true
});

// Add power infrastructure
const generator = simulation.addGenerator('coal-plant-1', { x: 0, y: 0 }, 100); // 100 MW
const transformer = simulation.addTransformer('substation-1', { x: 10, y: 0 }, 120);
const cityLoad = simulation.addLoad('city-center', { x: 20, y: 0 }, 80); // 80 MW demand

// Connect grid components
const grid = simulation.getGrid();
grid.connectNodes('coal-plant-1', 'substation-1');
grid.connectNodes('substation-1', 'city-center');

// Set generation and load
generator.generatePower(85);
cityLoad.consumePower(75);

// Run simulation
simulation.start();
const stats = simulation.step();

console.log(`Grid frequency: ${stats.frequency.toFixed(2)} Hz`);
console.log(`Grid stability: ${(stats.gridStability * 100).toFixed(1)}%`);
```

## Core Classes

### ElectricalGridSimulation
Main simulation orchestrator with automated load balancing and frequency control.

### PowerGrid
Grid network management with nodes, connections, and power flow analysis.

### GridNode
Individual grid components (generators, loads, transformers, buses) with electrical properties.

### GridAnalyzer
Advanced analytics for efficiency, reliability, and economic performance analysis.

## Game Integration

Perfect for:
- **City Builders**: Power grid planning and management
- **Industrial Games**: Factory power distribution
- **Strategy Games**: Infrastructure development and resource management
- **Simulation Games**: Power company management, grid optimization
- **Educational Games**: Teaching electrical engineering concepts

## Node Types

### Generators
Power production facilities with capacity and efficiency modeling.

```typescript
const coalPlant = simulation.addGenerator('coal-1', position, 200); // 200 MW capacity
coalPlant.generatePower(150); // Set output to 150 MW
```

### Loads
Power consumption points representing cities, industries, or facilities.

```typescript
const factory = simulation.addLoad('factory-1', position, 50); // 50 MW max demand
factory.consumePower(35); // Current consumption: 35 MW
```

### Transformers
Voltage transformation and power distribution nodes.

```typescript
const substation = simulation.addTransformer('sub-1', position, 300); // 300 MW capacity
```

### Buses
Power distribution and switching nodes for grid interconnection.

```typescript
const distributionBus = simulation.addBus('bus-1', position, 150);
```

## Advanced Features

### Load Forecasting
Predict future power demand based on historical patterns and growth trends.

```typescript
const analyzer = simulation.getAnalyzer();
const forecast = analyzer.generateLoadForecast(24); // 24-hour forecast

console.log(`Peak demand: ${forecast.peakDemand.toFixed(1)} MW`);
console.log(`Average demand: ${forecast.averageDemand.toFixed(1)} MW`);
```

### Economic Analysis
Comprehensive financial modeling for grid operations.

```typescript
const analysis = analyzer.analyzeGrid();
console.log(`Operating cost: $${analysis.economicMetrics.operatingCost.toFixed(2)}`);
console.log(`Revenue: $${analysis.economicMetrics.revenueGenerated.toFixed(2)}`);
console.log(`Profit margin: ${analysis.economicMetrics.profitMargin.toFixed(1)}%`);
```

### Outage Simulation
Test grid resilience with component failures.

```typescript
// Simulate generator outage
simulation.simulateOutage('coal-plant-1');
const outageStats = simulation.step();

// Check grid stability after outage
if (!simulation.getStatus().isStable) {
  console.log('Grid unstable - emergency procedures activated');
}

// Restore component
simulation.restoreNode('coal-plant-1');
```

## Configuration Options

```typescript
const simulation = new ElectricalGridSimulation({
  enableAutoBalance: true,        // Automatic load balancing
  targetFrequency: 50,           // Target grid frequency (Hz)
  frequencyTolerance: 0.5,       // Acceptable frequency deviation
  voltageRegulation: true,       // Enable voltage regulation
  emergencyShutdown: true        // Auto-shutdown on critical issues
});
```

## Unity Integration

Real-time grid data export for visualization:

```json
{
  "nodes": [
    {
      "id": "generator-1",
      "type": "generator",
      "position": { "x": 0, "y": 0 },
      "properties": {
        "voltage": 400,
        "current": 250,
        "power": 100000,
        "frequency": 50.1
      },
      "healthStatus": "healthy",
      "loadFactor": 0.75
    }
  ],
  "gridStats": {
    "totalGeneration": 300000,
    "totalConsumption": 285000,
    "gridStability": 0.95,
    "frequency": 50.05
  }
}
```

## Performance Metrics

The system tracks comprehensive grid performance:

- **Efficiency**: Transmission losses and generation efficiency
- **Reliability**: Uptime and component health statistics
- **Stability**: Frequency control and voltage regulation
- **Economics**: Cost analysis and revenue optimization

## Examples

See `examples/basic/power-plant.ts` for a complete power grid simulation with generators, loads, and outage scenarios.

## License

MIT