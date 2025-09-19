# Supply Chain Package

A comprehensive supply chain management library designed specifically for game development, providing factory automation, inventory systems, transportation networks, and logistics optimization for Unity, Godot, and Unreal Engine.

## Features

- **Real-time Simulation**: Support real-time updates and simulations with configurable time scaling
- **Scalability**: Handle large supply chain networks efficiently with optimized algorithms
- **Game Integration**: Perfect for Unity/Unreal/Godot integration with cross-platform compatibility
- **Event-Driven**: Everything emits events for seamless game system integration
- **Advanced Optimization**: Include pathfinding, flow optimization, and scheduling algorithms
- **Rich Analytics**: Comprehensive analytics and reporting capabilities with KPI tracking
- **Flexibility**: Support various supply chain models and configurations
- **High Performance**: Optimized for game engine performance requirements

## Core Capabilities

### 🏭 Multi-Level Supply Chains
- Raw materials → Manufacturing → Distribution → Retail
- Complex product dependencies and production recipes
- Quality control and defect tracking throughout the chain

### 📊 Real-Time Analytics
- Performance metrics and KPI tracking
- Supply/demand forecasting with seasonality
- Cost analysis and optimization suggestions
- Environmental impact tracking

### 🚛 Transportation & Logistics
- Multiple vehicle types (trucks, trains, ships, planes, drones)
- Route optimization with dynamic congestion handling
- Fleet management and capacity planning
- Multi-modal transportation support

### 📦 Inventory Management
- Real-time inventory tracking and alerts
- Automated reorder points and safety stock calculations
- Warehouse management with location tracking
- Batch tracking and expiry date management

### 🎯 Production Planning
- Advanced production scheduling algorithms
- Resource allocation and capacity planning
- Quality standards enforcement
- Maintenance scheduling integration

## Quick Start

### Installation

```bash
npm install @steamproject/supply-chain
```

## Game Engine Integration

This package provides seamless integration with major game engines through JavaScript bridge implementations:

- **Unity**: Uses ClearScript V8 or Jint for JavaScript execution
- **Godot**: Uses built-in JavaScript/V8 integration
- **Unreal Engine**: Uses V8 JavaScript engine embedding

## Examples

### Unity Integration
See [Unity Examples](./examples/unity/README.md) for comprehensive Unity integration guide.

### Godot Integration
See [Godot Examples](./examples/godot/README.md) for comprehensive Godot integration guide.

### Unreal Engine Integration
See [Unreal Examples](./examples/unreal/README.md) for comprehensive Unreal Engine integration guide.

### Basic Usage

```typescript
import { createSupplyChainEngine, createBasicSupplyNetwork } from '@supply-chain/simulation';

// Create a basic supply chain network
const { engine, nodes } = createBasicSupplyNetwork();

// Start the simulation
await engine.start();

// Access individual systems
const network = engine.getNetwork();
const inventory = engine.getInventoryManager();
const production = engine.getProductionScheduler();
const transport = engine.getTransportManager();
const analytics = engine.getAnalytics();

// Monitor events
const eventBus = engine.getEventBus();
eventBus.subscribe('production_completed', (event) => {
  console.log('Production completed:', event.data);
});

eventBus.subscribe('inventory_low', (event) => {
  console.log('Low inventory alert:', event.data);
});

// Get real-time metrics
const metrics = await analytics.getSupplyChainMetrics();
console.log('Current efficiency:', metrics.efficiency.overallEquipmentEffectiveness);

// Get performance KPIs
const kpis = await analytics.getKPIs();
console.log('Key Performance Indicators:', kpis);
```

### Advanced Configuration

```typescript
import { createSupplyChainEngine, SupplyChainConfig } from '@supply-chain/simulation';

const config: SupplyChainConfig = {
  id: 'my-supply-chain',
  name: 'Advanced Factory Simulation',
  description: 'Complex multi-tier manufacturing network',
  simulation: {
    timeStep: 500,        // 500ms per simulation step
    realTimeMode: true,   // Real-time simulation
    eventLogging: true    // Enable event logging
  },
  optimization: [
    {
      type: 'minimize',
      metric: 'cost',
      weight: 0.5,
      constraints: []
    },
    {
      type: 'maximize',
      metric: 'efficiency',
      weight: 0.3,
      constraints: []
    },
    {
      type: 'maximize',
      metric: 'service',
      weight: 0.2,
      constraints: []
    }
  ],
  analytics: {
    metricsEnabled: true,
    forecastingEnabled: true,
    reportingEnabled: true,
    dataRetentionDays: 30
  }
};

const engine = createSupplyChainEngine(config);
```

### Creating Custom Entities

```typescript
import { Node, NodeType, Product, Resource, Supplier } from '@supply-chain/simulation';

// Create a custom manufacturing node
const factory = new Node({
  id: 'factory-001',
  name: 'Electronics Manufacturing Plant',
  type: NodeType.MANUFACTURER,
  coordinates: { x: 100, y: 200 },
  capabilities: {
    production: [{
      productId: 'smartphone',
      capacity: 1000,
      efficiency: 92,
      qualityRating: QualityLevel.EXCELLENT,
      setupTime: 120,
      operatingCost: 50
    }],
    storage: [{
      capacity: 10000,
      temperatureControlled: true,
      securityLevel: 9,
      accessTime: 5,
      storageCost: 2
    }],
    processing: [{
      inputTypes: [ResourceType.COMPONENT],
      outputTypes: [ResourceType.FINISHED_GOOD],
      throughput: 800,
      efficiency: 90,
      processingTime: 180
    }],
    transport: [{
      vehicleTypes: [VehicleType.TRUCK, VehicleType.DRONE],
      loadingCapacity: 2000,
      loadingTime: 15,
      supportedRoutes: [RouteType.ROAD, RouteType.AIR]
    }]
  }
}, eventBus);

// Create custom products with complex recipes
const smartphone = new Product({
  id: 'smartphone-x1',
  name: 'Smartphone X1',
  type: ResourceType.FINISHED_GOOD,
  properties: {
    weight: 0.2,
    volume: 0.0001,
    value: 800,
    perishable: false,
    hazardous: false,
    fragile: true,
    stackable: true,
    maxStackSize: 100
  },
  requirements: [
    { resourceId: 'cpu-chip', quantity: 1, qualityMin: QualityLevel.GOOD },
    { resourceId: 'battery', quantity: 1, qualityMin: QualityLevel.GOOD },
    { resourceId: 'screen', quantity: 1, qualityMin: QualityLevel.EXCELLENT },
    { resourceId: 'case', quantity: 1, qualityMin: QualityLevel.FAIR }
  ],
  qualityStandards: [{
    metric: 'functionality',
    target: 98,
    tolerance: 2,
    critical: true
  }],
  marketData: {
    basePrice: 800,
    demand: 150,
    seasonality: {
      pattern: 'seasonal',
      amplitude: 0.4,
      period: 365,
      offset: 270 // Peak during holiday season
    },
    elasticity: 1.5,
    competition: 0.8
  }
});
```

## API Reference

### Core Classes

- **`SupplyChainEngine`** - Main orchestrator for the simulation
- **`EventBus`** - Event communication system
- **`SupplyNetwork`** - Network topology and pathfinding
- **`InventoryManager`** - Inventory tracking and optimization
- **`ProductionScheduler`** - Production planning and execution
- **`TransportManager`** - Vehicle fleet and route management
- **`SupplyChainAnalytics`** - Metrics, reporting, and forecasting

### Entity Classes

- **`Node`** - Base class for all supply chain nodes
- **`Product`** - Finished goods and intermediate products
- **`Resource`** - Raw materials and resources
- **`Facility`** - Production and storage facilities
- **`Supplier`** - Supplier entities with capabilities
- **`Consumer`** - Consumer demand modeling

### Utility Classes

- **`EventEmitter`** - Cross-platform event system
- **`MathUtils`** - Mathematical utilities for calculations
- **`ValidationUtils`** - Input validation utilities
- **`TimeUtils`** - Time management utilities
- **`PathFinding`** - Advanced pathfinding algorithms

## Game Integration Examples

### Unity Integration

```csharp
// C# Unity integration example
using System;
using Microsoft.ClearScript.V8;

public class SupplyChainManager : MonoBehaviour
{
    private V8ScriptEngine scriptEngine;

    void Start()
    {
        scriptEngine = new V8ScriptEngine();

        // Load the supply chain package
        scriptEngine.Execute(@"
            const { createSupplyChainEngine } = require('@supply-chain/simulation');
            const engine = createSupplyChainEngine();

            engine.start().then(() => {
                console.log('Supply chain simulation started');
            });
        ");

        // Subscribe to events
        scriptEngine.Execute(@"
            const eventBus = engine.getEventBus();
            eventBus.subscribe('production_completed', (event) => {
                host.onProductionCompleted(event.data);
            });
        ");

        // Expose callback to script
        scriptEngine.AddHostObject("host", this);
    }

    public void OnProductionCompleted(object data)
    {
        // Handle production completion in Unity
        Debug.Log($"Production completed: {data}");
    }
}
```

### Godot Integration

```gdscript
# GDScript Godot integration example
extends Node

var js_context
var supply_chain_engine

func _ready():
    # Initialize JavaScript context
    js_context = JavaScript.create_runtime()

    # Load and initialize supply chain
    var script = """
        const { createSupplyChainEngine } = require('@supply-chain/simulation');
        const engine = createSupplyChainEngine({
            simulation: { realTimeMode: false, timeStep: 100 }
        });

        engine.start();

        // Export for Godot access
        globalThis.supplyChain = engine;
    """

    js_context.eval(script)

    # Set up periodic updates
    var timer = Timer.new()
    timer.wait_time = 0.1  # 10 FPS updates
    timer.timeout.connect(_update_simulation)
    add_child(timer)
    timer.start()

func _update_simulation():
    # Update the simulation
    js_context.eval("supplyChain.update()")

    # Get metrics
    var metrics = js_context.eval("supplyChain.getAnalytics().getSupplyChainMetrics()")
    update_ui_metrics(metrics)
```

## Performance Considerations

### Optimization Tips

1. **Time Scaling**: Use appropriate time scaling for your game's pace
2. **Event Filtering**: Only subscribe to events you need to handle
3. **Batch Updates**: Process multiple simulation steps in batches for better performance
4. **Memory Management**: Regularly clean up completed orders and old analytics data
5. **Network Size**: Consider network complexity vs. performance trade-offs

### Memory Usage

The simulation maintains various data structures in memory:
- Node and route networks
- Inventory levels and history
- Production schedules and queues
- Analytics data and metrics
- Event history (configurable retention)

Monitor memory usage with:

```typescript
import { getPackageHealth } from '@supply-chain/simulation';

const health = getPackageHealth();
console.log('Memory usage:', health.memoryUsage);
console.log('Package status:', health.status);
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://supply-chain-simulation.readthedocs.io/)
- 🐛 [Issue Tracker](https://github.com/supply-chain/simulation/issues)
- 💬 [Discussions](https://github.com/supply-chain/simulation/discussions)
- 📧 Email: support@supply-chain-simulation.com

---

**Perfect for**: Factorio-like games, Transport Tycoon clones, Cities Skylines mods, Industrial simulation games, Educational supply chain software

**Compatibility**: Unity, Unreal Engine, Godot, Custom game engines, Node.js, Browser environments