# Economy System Package

A sophisticated Unity C# economic simulation system for the Unity Simulation Framework.

## Overview

The Economy System provides comprehensive economic modeling with GDP tracking, inflation simulation, unemployment rates, market values, and economic indicators. Ideal for strategy games, city builders, and economic simulations.

## Features

- **GDP Simulation**: Dynamic gross domestic product calculations with growth/decline
- **Inflation Tracking**: Real-time inflation rate simulation with fluctuations
- **Unemployment Monitoring**: Labor market simulation with unemployment percentages
- **Market Value Tracking**: Stock market and economic value simulation
- **Consumer Spending**: Consumer spending pattern analysis
- **Business Investment**: Investment tracking and economic indicators
- **Economic Health**: Overall economic system health monitoring
- **Event System**: Subscribe to economic changes and data exports
- **JSON Export**: Complete economic data serialization
- **Unity Inspector Integration**: Easy configuration through Unity Editor

## Installation

1. Copy the `packages/economy` folder to your Unity project
2. Ensure Newtonsoft.Json is installed in your project
3. Add the EconomySystem component to a GameObject in your scene

## Quick Start

```csharp
using UnitySim.Economy;

public class EconomyExample : MonoBehaviour
{
    public EconomySystem economySystem;

    void Start()
    {
        // Subscribe to economic changes
        economySystem.OnEconomyChanged += OnEconomicUpdate;

        // Configure update interval
        economySystem.SetUpdateInterval(3.0f);
    }

    void OnEconomicUpdate(EconomyData data)
    {
        Debug.Log($"GDP: ${data.economy.gdp:F0}");
        Debug.Log($"Inflation: {data.economy.inflation:F1}%");
        Debug.Log($"Unemployment: {data.economy.unemployment:F1}%");
    }
}
```

## API Reference

### EconomySystem Class

**Public Properties:**
- `float updateInterval`: Update frequency in seconds (default: 1.0f)
- `bool enableLogging`: Enable debug logging (default: false)
- `bool enableEvents`: Enable event broadcasting (default: true)
- `bool enableOptimization`: Enable performance optimizations (default: true)

**Public Methods:**
- `string ExportState()`: Export current economic data as JSON
- `EconomyData GetData()`: Get current economic data object
- `void SetUpdateInterval(float interval)`: Set update frequency
- `void ResetData()`: Reset economy system to default state

**Events:**
- `System.Action<EconomyData> OnEconomyChanged`: Triggered when economy updates
- `System.Action<string> OnDataExported`: Triggered when data is exported

### EconomyData Class

```csharp
public class EconomyData
{
    public long timestamp;        // Unix timestamp
    public long currentTime;      // Current system time
    public EconomyInfo economy;   // Economic information object
}
```

### EconomyInfo Class

```csharp
public class EconomyInfo
{
    public float gdp;                  // Gross Domestic Product (default: 50000)
    public float inflation;            // Inflation rate % (default: 2.5%)
    public float unemployment;         // Unemployment rate % (default: 6.2%)
    public float marketValue;          // Market value index (default: 8500)
    public float consumerSpending;     // Consumer spending % (default: 75%)
    public float businessInvestment;   // Business investment % (default: 23%)
    public string systemHealth;       // System status (default: "operational")
    public string framework;          // Framework identifier
}
```

## Configuration

The Economy System can be configured through the Unity Inspector:

### Economy Settings
- **Update Interval**: How often the economy updates (seconds)
- **Enable Logging**: Show debug messages in console
- **Enable Events**: Broadcast economic change events

### Performance Settings
- **Enable Optimization**: Use performance optimizations
- **Max Updates Per Frame**: Limit concurrent updates

## Context Menu Actions

Right-click the EconomySystem component in the Inspector to access:
- **Export Economy Data**: Print current economic data to console
- **Reset Economy Data**: Reset to default economic conditions
- **Force Update**: Immediately update economy system

## Economic Indicators

### GDP (Gross Domestic Product)
- Represents total economic output
- Updates with realistic growth/decline patterns
- Affected by random market fluctuations

### Inflation Rate
- Tracks price level changes over time
- Fluctuates within realistic economic ranges
- Impacts overall economic health

### Unemployment Rate
- Monitors labor market conditions
- Clamped between 0% and 25% for realism
- Correlates with overall economic performance

### Market Value
- Represents stock market or economic index
- Updates based on economic conditions
- Useful for trading simulations

## Usage Examples

### Economic Dashboard
```csharp
void UpdateEconomicDashboard(EconomyData data)
{
    gdpText.text = $"GDP: ${data.economy.gdp:F0}M";
    inflationText.text = $"Inflation: {data.economy.inflation:F1}%";
    unemploymentText.text = $"Unemployment: {data.economy.unemployment:F1}%";
}
```

### Economic Decision Making
```csharp
void MakeEconomicDecision(EconomyData data)
{
    if (data.economy.inflation > 5.0f)
    {
        // Implement anti-inflation measures
        ImplementEconomicPolicy("reduce_spending");
    }

    if (data.economy.unemployment > 10.0f)
    {
        // Create job programs
        ImplementEconomicPolicy("job_creation");
    }
}
```

### Economic Data Export
```csharp
void SaveEconomicReport()
{
    string economicJson = economySystem.ExportState();
    System.IO.File.WriteAllText("economic_report.json", economicJson);
}
```

## Integration with Other Systems

The Economy System integrates with other Unity Simulation packages:
- **Population System**: Population affects economic growth
- **Agriculture System**: Agricultural output impacts GDP
- **Manufacturing System**: Industrial production drives economy
- **Transportation System**: Infrastructure affects economic efficiency

## Performance Considerations

- Default update interval of 1 second suitable for real-time games
- Increase interval for historical/turn-based simulations
- Economic calculations are lightweight and optimized
- Use events for UI updates instead of polling

## Economic Modeling

The system uses simplified but realistic economic models:
- GDP growth follows market volatility patterns
- Inflation has natural fluctuation ranges
- Unemployment correlates with economic cycles
- All values include realistic constraints and bounds

## Troubleshooting

**Economy not updating:**
- Verify GameObject is active
- Check updateInterval > 0
- Ensure system initialization completed

**Unrealistic economic values:**
- Values are clamped to realistic ranges
- Random fluctuations simulate market volatility
- Use ResetData() to restore defaults

**Events not triggering:**
- Ensure enableEvents is true
- Check event subscription syntax
- Verify system is actively updating

## Version Information

- **Framework**: unity-sim-economy
- **Namespace**: UnitySim.Economy
- **Unity Version**: 2020.3 LTS or higher
- **Dependencies**: Newtonsoft.Json

## License

Part of the Unity Simulation Framework. See main project license for details.