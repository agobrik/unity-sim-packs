# @steam-sim/disaster-management

Comprehensive disaster management and emergency response simulation with natural disasters, crisis management, and recovery systems for Unity-based Steam games.

## Features

- **13 Disaster Types**: Earthquake, flood, fire, hurricane, tornado, volcanic, tsunami, blizzard, drought, pandemic, industrial accidents, cyber attacks, power outages
- **Real-time Emergency Response**: Resource deployment, evacuation management, search & rescue operations
- **Advanced Crisis Management**: Multi-level response escalation, coordination systems, communication networks
- **Damage Assessment**: Structural damage, infrastructure disruption, population impact, economic loss tracking
- **Recovery Systems**: Post-disaster assessment, infrastructure repair, community support
- **Unity Integration**: Complete visualization data with disaster effects, response animations, evacuation routes

## Installation

```bash
npm install @steam-sim/disaster-management
```

## Quick Start

```typescript
import { DisasterManagementSimulation } from '@steam-sim/disaster-management';

// Create a magnitude 7.0 earthquake simulation
const simulation = new DisasterManagementSimulation(
  'earthquake',
  { x: 50, y: 50 }, // Epicenter
  {
    intensity: 7.0,
    duration: 2,
    affectedRadius: 25,
    growthRate: 0.1,
    decayRate: 0.05
  },
  { x: 20, y: 20 }, // Command center
  { width: 100, height: 100 } // Grid size
);

// Setup earthquake-specific emergency response
simulation.setupEarthquakeScenario(7.0);

// Start real-time simulation
simulation.start(1000); // Update every second

// Monitor disaster progress
const status = simulation.getSimulationStatus();
console.log(`Phase: ${status.disasterPhase}, Effectiveness: ${status.effectiveness}`);

// Player interactions
simulation.issueEvacuationOrder('high-risk-zone');
simulation.deployResource('search-rescue-1', { x: 55, y: 55 });
simulation.requestAdditionalResources();

// Export for Unity visualization
const unityData = simulation.exportState();
```

## Core Classes

### DisasterManagementSimulation
Main simulation orchestrator with disaster lifecycle and emergency response coordination.

### Disaster
Individual disaster modeling with:
- **Realistic Physics**: Intensity curves, growth/decay patterns, affected radius calculation
- **Phase Management**: Prediction → Warning → Impact → Response → Recovery → Ended
- **Impact Assessment**: Real-time damage calculation across multiple categories
- **Warning Systems**: Early warning generation with confidence levels and recommended actions

### EmergencyResponse
Comprehensive emergency management system:
- **Resource Management**: Fire departments, police, ambulances, search & rescue, military units
- **Action Coordination**: 13 response action types with priority and effectiveness tracking
- **Evacuation Systems**: Zone-based evacuation with route planning and shelter management
- **Communication Networks**: Multi-modal emergency communications with coverage areas

### DisasterVisualizer
Unity-ready visualization with:
- **Impact Mapping**: Real-time intensity maps with color coding
- **Resource Tracking**: Emergency vehicle positions, deployment status, efficiency monitoring
- **Evacuation Visualization**: Progress tracking, route animation, shelter locations
- **Hazard Zones**: Dynamic danger/warning/watch/safe zone display

## Disaster Types & Scenarios

### Natural Disasters
- **Earthquake**: Magnitude-based intensity, aftershock modeling, structural damage assessment
- **Flood**: Water level simulation, evacuation zone calculation, boat rescue coordination
- **Fire**: Spread modeling, firefighting resource allocation, hazmat response
- **Hurricane**: Category-based impact, mass evacuation, pre-positioning strategies
- **Tornado**: Path prediction, shelter-in-place protocols, damage assessment
- **Volcanic**: Ash cloud modeling, long-term evacuation, air quality monitoring
- **Tsunami**: Wave modeling, coastal evacuation, emergency warning systems

### Human-Caused Disasters
- **Industrial Accident**: Chemical spill response, hazmat protocols, community protection
- **Cyber Attack**: Infrastructure protection, communication backup, service restoration
- **Power Outage**: Grid failure management, essential services prioritization

### Health Emergencies
- **Pandemic**: Containment strategies, medical resource allocation, social distancing coordination

## Game Integration

Perfect for:
- **Crisis Management Games**: City-scale disaster response with real consequences
- **Emergency Simulation**: Training scenarios for disaster preparedness
- **City Builders**: Natural disaster events with infrastructure impact
- **Strategy Games**: Resource allocation under pressure, multi-objective planning
- **Educational Games**: Disaster preparedness training and awareness

## Response Actions

### Emergency Operations
- **Evacuation**: Zone-based population movement with route optimization
- **Search & Rescue**: Survivor location, extraction operations, medical triage
- **Firefighting**: Fire suppression, hazmat containment, aerial operations
- **Medical Aid**: Emergency medical response, hospital coordination, casualty management

### Infrastructure Operations
- **Debris Removal**: Road clearance, infrastructure access restoration
- **Infrastructure Repair**: Utility restoration, critical system repair
- **Communication Setup**: Emergency network deployment, public information systems
- **Supply Distribution**: Emergency supplies, food/water distribution, logistics coordination

## Unity Integration

### Visualization Components
```json
{
  "disaster": {
    "type": "earthquake",
    "phase": "impact",
    "intensity": 7.2,
    "currentRadius": 25.0,
    "position": { "x": 50, "y": 50 }
  },
  "emergencyResponse": {
    "resources": [
      {
        "id": "fire-dept-1",
        "type": "fire-department",
        "position": { "x": 45, "y": 55 },
        "status": "deployed",
        "efficiency": 0.85,
        "color": "#FF4444"
      }
    ],
    "evacuationZones": [
      {
        "area": { "x": 50, "y": 50, "radius": 15 },
        "progress": 0.75,
        "routes": [...],
        "status": "active"
      }
    ]
  },
  "visualization": {
    "impactMap": [...],
    "hazardZones": [...],
    "evacuationRoutes": [...]
  }
}
```

### Gameplay Systems
- **Objective Management**: Dynamic objectives based on disaster phase and severity
- **Player Actions**: Emergency response decisions with immediate consequences
- **Scoring System**: Effectiveness measurement based on lives saved, damage minimized
- **Challenge Scaling**: Adaptive difficulty based on disaster intensity and available resources

## Performance Characteristics

- **Real-time Simulation**: Optimized for 60fps gameplay with 100+ emergency resources
- **Scalable Disasters**: Support for city-wide disasters affecting 100,000+ simulated population
- **Memory Efficient**: Optimized data structures for large-scale emergency response
- **Network Ready**: State synchronization support for multiplayer emergency response

## Configuration Options

```typescript
// Disaster configuration
const disasterConfig = {
  intensity: 8.5,           // 1-10 scale
  duration: 4,              // Time units of impact
  affectedRadius: 30,       // Area of effect
  growthRate: 0.15,         // How fast disaster spreads
  decayRate: 0.08           // How fast disaster diminishes
};

// Emergency response configuration
const commandCenter = { x: 10, y: 10 };
const gridSize = { width: 200, height: 200 };

// Scenario setup
simulation.setupEarthquakeScenario(8.5);    // Magnitude-based setup
simulation.setupFloodScenario(6);           // Water level setup
simulation.setupFireScenario(9);            // Fire intensity setup
simulation.setupHurricaneScenario(4);       // Hurricane category setup
```

## Examples

See `examples/basic/earthquake-response.ts` for a complete earthquake emergency response simulation with:
- Real-time disaster progression
- Multi-phase emergency response
- Resource deployment and coordination
- Evacuation management
- Damage assessment and recovery planning

## License

MIT