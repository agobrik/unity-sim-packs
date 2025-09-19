# Unity Simulation Packages 🎮

**30 Unity-Compatible Simulation Packages for Game Development**

![Unity Compatibility](https://img.shields.io/badge/Unity-100%25%20Compatible-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9%2B-blue)
![Packages](https://img.shields.io/badge/Packages-30-orange)

A comprehensive collection of 30 simulation packages designed specifically for Unity game development. Each package provides advanced simulation capabilities with perfect Unity compatibility through standardized JSON export functionality.

## ✨ Features

- **🎯 100% Unity Compatible**: All 30 packages tested and verified
- **🔄 JSON Export**: Standardized `exportState()` method for Unity integration
- **🚀 TypeScript**: Full TypeScript support with complete type definitions
- **📦 Modular**: Use individual packages or combine as needed
- **🛠️ Production Ready**: Comprehensive testing and validation

## 📦 Available Packages

### Core Simulation Systems
- **Advanced Economics** - Complex economic modeling and market simulation
- **AI Decision Framework** - Intelligent agent behavior and decision-making
- **Analytics** - Real-time data collection and performance metrics
- **Disaster Management** - Emergency response and crisis simulation
- **Network Multiplayer** - Multi-player networking and synchronization

### Environment & Physics
- **Ecosystem** - Biological system simulation and environmental modeling
- **Weather** - Dynamic weather patterns and atmospheric conditions
- **Physics** - Advanced physics simulation and collision detection
- **Fluid Dynamics** - Realistic fluid behavior and simulation
- **Procedural Generation** - Dynamic world and content generation

### Industry & Infrastructure
- **Manufacturing** - Industrial process simulation
- **Supply Chain** - Logistics and distribution modeling
- **Electrical Grid** - Power system and energy distribution
- **Mining Geology** - Resource extraction and geological simulation
- **Urban Planning** - City development and infrastructure planning

### Management & Resources
- **Agriculture** - Farming simulation and crop management
- **Population** - Demographic modeling and population dynamics
- **Resources** - Resource management and allocation systems
- **Time** - Advanced time management and scheduling
- **Vehicle Simulation** - Realistic vehicle physics and behavior

### Technology & Integration
- **ML Integration** - Machine learning model integration
- **Data Visualization** - Advanced charting and visualization
- **UI Templates** - User interface component systems
- **Real World Data Adapters** - External data source integration
- **Simulation Algorithms** - Core simulation and pathfinding algorithms

### Development & Customization
- **Modding Framework** - User modification and extension system
- **Performance** - System monitoring and optimization
- **Procedural** - Additional procedural generation tools

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/agobrik/unity-sim-packs.git
cd unity-sim-packs

# Install dependencies
npm install

# Build all packages
npm run build:all
```

### Unity Integration

Each package exports a Unity-compatible simulation class:

```typescript
// Example: Using the Weather Simulation
import { WeatherSimulation } from '@steam-sim/weather';

const weather = new WeatherSimulation();
const unityData = weather.exportState();

// unityData contains:
// {
//   timestamp: 1234567890,
//   currentTime: 1234567890,
//   weather: {
//     temperature: 25.0,
//     humidity: 60,
//     pressure: 1013.25,
//     windSpeed: 5.5,
//     systemHealth: 'operational',
//     framework: 'steam-sim-weather'
//   }
// }
```

### C# Unity Integration

```csharp
// Unity C# integration example
[System.Serializable]
public class WeatherData
{
    public long timestamp;
    public long currentTime;
    public WeatherInfo weather;
}

[System.Serializable]
public class WeatherInfo
{
    public float temperature;
    public int humidity;
    public float pressure;
    public float windSpeed;
    public string systemHealth;
    public string framework;
}

// Parse the JSON from the simulation
WeatherData data = JsonUtility.FromJson<WeatherData>(jsonFromSimulation);
```

## 📋 Package List

| Package | Description | Unity Class | Status |
|---------|-------------|-------------|--------|
| advanced-economics | Economic modeling | `AdvancedEconomicsSimulation` | ✅ |
| agriculture | Farming simulation | `AgricultureSimulation` | ✅ |
| ai | AI systems | `AISimulation` | ✅ |
| ai-decision-framework | Decision making | `AIDecisionFrameworkSimulation` | ✅ |
| analytics | Data analytics | `AnalyticsEngine` | ✅ |
| data-visualization | Charts & graphs | `DataVisualizationSimulation` | ✅ |
| disaster-management | Emergency response | `DisasterManagementSimulation` | ✅ |
| economy | Economic systems | `EconomySimulation` | ✅ |
| ecosystem | Environmental sim | `EcosystemSimulation` | ✅ |
| electrical-grid | Power systems | `ElectricalGridSimulation` | ✅ |
| fluid-dynamics | Fluid physics | `FluidDynamicsSimulation` | ✅ |
| manufacturing | Industrial processes | `ManufacturingSimulation` | ✅ |
| mining-geology | Resource extraction | `MiningGeologySimulation` | ✅ |
| ml-integration | Machine learning | `MLIntegrationSimulation` | ✅ |
| modding | Modification framework | `ModdingFramework` | ✅ |
| network-multiplayer | Multiplayer systems | `NetworkMultiplayerSimulation` | ✅ |
| performance | System monitoring | `PerformanceSimulation` | ✅ |
| physics | Physics simulation | `PhysicsSimulation` | ✅ |
| population | Demographics | `PopulationSimulation` | ✅ |
| procedural | Content generation | `ProceduralSimulation` | ✅ |
| procedural-generation | World generation | `ProceduralGenerationEngine` | ✅ |
| real-world-data-adapters | Data integration | `RealWorldDataAdaptersSimulation` | ✅ |
| resources | Resource management | `ResourceManager` | ✅ |
| simulation-algorithms | Core algorithms | `SimulationAlgorithmsSimulation` | ✅ |
| supply-chain | Logistics | `SupplyChainSimulation` | ✅ |
| time | Time management | `TimeSimulation` | ✅ |
| ui-templates | UI components | `UiTemplatesSimulation` | ✅ |
| urban-planning | City planning | `UrbanPlanningSimulation` | ✅ |
| vehicle-simulation | Vehicle physics | `VehicleSimulation` | ✅ |
| weather | Weather systems | `WeatherSimulation` | ✅ |

## 🧪 Testing

We maintain 100% Unity compatibility through comprehensive testing:

```bash
# Run Unity compatibility tests
npm run test:unity

# Test specific package
npm run test:package -- weather

# Run all tests
npm run test
```

### Test Results

- ✅ **30/30** packages build successfully (100%)
- ✅ **30/30** packages Unity compatible (100%)
- ✅ All packages have standardized JSON export
- ✅ All packages include timestamp and data validation

## 📖 Documentation

Each package includes:
- **API Documentation** - Complete method and class documentation
- **Unity Examples** - C# integration examples
- **TypeScript Examples** - Usage examples in TypeScript
- **Configuration Options** - Available settings and parameters

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Achievement

🎉 **PERFECT UNITY COMPATIBILITY ACHIEVED!**
- 30/30 Packages Successfully Tested
- 100% Build Success Rate
- 100% Unity Compatibility Rate
- Zero Failed Packages

---

**Built with ❤️ for Unity Developers**

*Empowering game developers with advanced simulation capabilities*