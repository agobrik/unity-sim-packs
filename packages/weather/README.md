# Weather System Package

A comprehensive Unity C# weather simulation system for the Unity Simulation Framework.

## Overview

The Weather System provides real-time weather simulation with dynamic environmental conditions, temperature variations, precipitation tracking, and atmospheric pressure monitoring. Perfect for games, simulations, and educational applications.

## Features

- **Real-time Weather Updates**: Dynamic weather conditions that change over time
- **Temperature Simulation**: Realistic temperature fluctuations with random variations
- **Wind System**: Wind speed monitoring and simulation
- **Humidity Tracking**: Environmental humidity levels with realistic ranges
- **Atmospheric Pressure**: Barometric pressure simulation
- **Precipitation System**: Rain/snow precipitation tracking
- **Health Monitoring**: System health status and operational state
- **Event System**: Subscribe to weather changes and data exports
- **JSON Export**: Complete weather data serialization
- **Unity Inspector Integration**: Easy configuration through Unity Editor

## Installation

1. Copy the `packages/weather` folder to your Unity project
2. Ensure Newtonsoft.Json is installed in your project
3. Add the WeatherSystem component to a GameObject in your scene

## Quick Start

```csharp
using UnitySim.Weather;

public class WeatherExample : MonoBehaviour
{
    public WeatherSystem weatherSystem;

    void Start()
    {
        // Subscribe to weather changes
        weatherSystem.OnWeatherChanged += OnWeatherUpdate;

        // Configure update interval
        weatherSystem.SetUpdateInterval(2.0f);
    }

    void OnWeatherUpdate(WeatherData data)
    {
        Debug.Log($"Temperature: {data.weather.temperature}°C");
        Debug.Log($"Conditions: {data.weather.conditions}");
        Debug.Log($"Wind Speed: {data.weather.windSpeed} m/s");
    }
}
```

## API Reference

### WeatherSystem Class

**Public Properties:**
- `float updateInterval`: Update frequency in seconds (default: 1.0f)
- `bool enableLogging`: Enable debug logging (default: false)
- `bool enableEvents`: Enable event broadcasting (default: true)
- `bool enableOptimization`: Enable performance optimizations (default: true)

**Public Methods:**
- `string ExportState()`: Export current weather data as JSON
- `WeatherData GetData()`: Get current weather data object
- `void SetUpdateInterval(float interval)`: Set update frequency
- `void ResetData()`: Reset weather system to default state

**Events:**
- `System.Action<WeatherData> OnWeatherChanged`: Triggered when weather updates
- `System.Action<string> OnDataExported`: Triggered when data is exported

### WeatherData Class

```csharp
public class WeatherData
{
    public long timestamp;        // Unix timestamp
    public long currentTime;      // Current system time
    public WeatherInfo weather;   // Weather information object
}
```

### WeatherInfo Class

```csharp
public class WeatherInfo
{
    public float temperature;     // Temperature in Celsius (default: 25°C)
    public int humidity;          // Humidity percentage (default: 60%)
    public float pressure;        // Atmospheric pressure in hPa (default: 1013.25)
    public float windSpeed;       // Wind speed in m/s (default: 5.5)
    public string conditions;     // Weather conditions (default: "partly_cloudy")
    public float precipitation;   // Precipitation amount (default: 0)
    public string systemHealth;   // System status (default: "operational")
    public string framework;      // Framework identifier
}
```

## Configuration

The Weather System can be configured through the Unity Inspector:

### Weather Settings
- **Update Interval**: How often the weather updates (seconds)
- **Enable Logging**: Show debug messages in console
- **Enable Events**: Broadcast weather change events

### Performance Settings
- **Enable Optimization**: Use performance optimizations
- **Max Updates Per Frame**: Limit concurrent updates

## Context Menu Actions

Right-click the WeatherSystem component in the Inspector to access:
- **Export Weather Data**: Print current weather data to console
- **Reset Weather Data**: Reset to default weather conditions
- **Force Update**: Immediately update weather system

## Usage Examples

### Basic Weather Monitoring
```csharp
// Get current weather
WeatherData data = weatherSystem.GetData();
Debug.Log($"Current temperature: {data.weather.temperature}°C");
```

### Event-Driven Weather System
```csharp
void Start()
{
    weatherSystem.OnWeatherChanged += (data) => {
        UpdateUI(data.weather);
        CheckWeatherAlerts(data.weather);
    };
}
```

### Export Weather Data
```csharp
string weatherJson = weatherSystem.ExportState();
// Save to file or send to server
```

## Integration with Other Systems

The Weather System integrates seamlessly with other Unity Simulation packages:
- **Agriculture System**: Weather affects crop growth
- **Ecosystem System**: Weather influences animal behavior
- **Disaster Management**: Weather triggers natural disasters
- **Physics System**: Wind affects object movement

## Performance Considerations

- Default update interval of 1 second is suitable for most applications
- Increase interval for better performance in large simulations
- Enable optimization for reduced memory allocation
- Use events instead of polling GetData() every frame

## Troubleshooting

**Weather data not updating:**
- Ensure the GameObject is active
- Check that updateInterval > 0
- Verify the system is initialized

**Events not firing:**
- Check enableEvents is true
- Ensure event subscribers are properly registered
- Verify the system is updating

**JSON export returns empty:**
- System may not be initialized
- Check for initialization errors in console

## Version Information

- **Framework**: unity-sim-weather
- **Namespace**: UnitySim.Weather
- **Unity Version**: 2020.3 LTS or higher
- **Dependencies**: Newtonsoft.Json

## License

Part of the Unity Simulation Framework. See main project license for details.