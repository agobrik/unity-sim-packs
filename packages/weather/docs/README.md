# Weather System Package

Advanced weather simulation system with realistic atmospheric modeling for the Steam Simulation Toolkit.

## Features

- **Real-time Weather Simulation**: Comprehensive weather state modeling with atmospheric physics
- **Multi-layer Atmospheric Model**: Detailed atmospheric profiling with temperature inversions and stability analysis
- **Climate System Integration**: Long-term climate patterns, seasonal variations, and climate change effects
- **Weather System Tracking**: Dynamic weather systems (storms, fronts, pressure systems) with realistic movement
- **Forecast Generation**: Probabilistic weather forecasting with confidence intervals
- **Alert System**: Automated weather alert generation based on configurable thresholds
- **Comprehensive Utilities**: Weather calculations, conversions, and formatting tools

## Installation

```bash
npm install @steam-sim/weather
```

## Quick Start

```typescript
import { WeatherSimulator, WeatherUtils } from '@steam-sim/weather';

// Create simulator
const simulator = new WeatherSimulator({
  updateInterval: 60000,      // 1 minute updates
  forecastHorizon: 48,        // 48 hour forecasts
  atmosphericLayers: 10,      // 10 atmospheric layers
  enableWeatherSystems: true, // Enable weather systems
  enableClimateEffects: true, // Enable climate effects
  randomSeed: 12345          // Deterministic simulation
}, {
  minLatitude: -90,
  maxLatitude: 90,
  minLongitude: -180,
  maxLongitude: 180,
  minElevation: -500,
  maxElevation: 9000
});

// Add a location
const newYork = {
  latitude: 40.7128,
  longitude: -74.0060,
  elevation: 10,
  timezone: 'America/New_York'
};

simulator.addLocation('nyc', newYork);

// Start simulation
simulator.start();

// Get current weather
const currentWeather = simulator.getWeatherState('nyc');
console.log(`Temperature: ${WeatherUtils.formatTemperature(currentWeather.temperature)}`);
console.log(`Humidity: ${currentWeather.humidity.toFixed(1)}%`);
console.log(`Wind: ${WeatherUtils.formatWindSpeed(currentWeather.windSpeed)} ${WeatherUtils.formatWindDirection(currentWeather.windDirection)}`);

// Generate forecast
const forecast = simulator.generateForecast('nyc', 24);
console.log(`24-hour forecast: ${forecast.conditions.length} conditions`);
console.log(`Confidence: ${forecast.confidence.toFixed(1)}%`);
```

## Core Components

### WeatherSimulator

The main simulation engine that manages weather states, atmospheric layers, and weather systems.

```typescript
// Event handling
simulator.on('weatherStateUpdated', ({ locationId, state }) => {
  console.log(`Weather updated for ${locationId}:`, state);
});

simulator.on('weatherAlertIssued', (alert) => {
  console.log(`Alert issued: ${alert.title} (${alert.severity})`);
});

simulator.on('weatherEvent', (event) => {
  console.log(`Weather event: ${event.type}`, event);
});
```

### AtmosphericModel

Detailed atmospheric profiling with multi-layer calculations.

```typescript
import { AtmosphericModel } from '@steam-sim/weather';

const atmosphericModel = new AtmosphericModel({
  layers: 20,
  maxAltitude: 20000,
  temperatureLapseRate: 0.0065,
  pressureScaleHeight: 8400
});

const profile = atmosphericModel.generateAtmosphericProfile(
  newYork,
  currentWeather,
  weatherSystems
);

console.log(`Atmospheric stability: ${profile.stability.class}`);
console.log(`Mixing height: ${profile.mixingHeight}m`);
console.log(`Temperature inversions: ${profile.inversions.length}`);
```

### ClimateSystem

Long-term climate modeling with seasonal patterns and trends.

```typescript
import { ClimateSystem } from '@steam-sim/weather';

const climateSystem = new ClimateSystem({
  enableSeasonalVariation: true,
  enableElNinoEffect: true,
  enableClimateChange: true,
  climateChangeRate: 0.02
});

// Add climate zone
const temperateZone = {
  id: 'temperate_maritime',
  name: 'Temperate Maritime',
  type: 'temperate',
  characteristics: climateSystem.generateClimateCharacteristics(newYork),
  seasonalPatterns: climateSystem.generateSeasonalPatterns(zone),
  extremes: climateSystem.generateClimateExtremes(zone)
};

climateSystem.addClimateZone(temperateZone);

// Apply climate effects to weather
const modifiedWeather = climateSystem.applyClimateEffects(currentWeather, newYork);
```

### WeatherUtils

Comprehensive utility functions for weather calculations and formatting.

```typescript
import { WeatherUtils } from '@steam-sim/weather';

// Distance and bearing
const distance = WeatherUtils.calculateDistance(newYork, losAngeles);
const bearing = WeatherUtils.calculateBearing(newYork, losAngeles);

// Atmospheric calculations
const dewPoint = WeatherUtils.calculateDewPoint(temperature, humidity);
const heatIndex = WeatherUtils.calculateHeatIndex(temperature, humidity);
const windChill = WeatherUtils.calculateWindChill(temperature, windSpeed);
const feelsLike = WeatherUtils.calculateFeelsLike(temperature, humidity, windSpeed);

// Weather categorization
const windCategory = WeatherUtils.categorizeWindSpeed(windSpeed);
const tempCategory = WeatherUtils.categorizeTemperature(temperature);

// Formatting
const formattedTemp = WeatherUtils.formatTemperature(20, 'F'); // "68.0°F"
const formattedWind = WeatherUtils.formatWindSpeed(10, 'mph'); // "22.4 mph"
const windDir = WeatherUtils.formatWindDirection(180); // "S"

// Validation
const validation = WeatherUtils.validateWeatherState(weatherState);
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

## Weather Systems

Add and manage dynamic weather systems:

```typescript
// Create a thunderstorm system
const thunderstorm = {
  id: 'storm_001',
  type: 'thunderstorm',
  intensity: 75,
  center: { latitude: 40.5, longitude: -74.2, elevation: 0, timezone: 'UTC' },
  radius: 50000, // 50km radius
  speed: 15,     // 15 m/s movement speed
  direction: 90, // Moving east
  pressure: 995,
  lifecycle: {
    stage: 'developing',
    age: 2,
    maxIntensity: 90,
    decayRate: 5,
    expectedLifetime: 12
  },
  effects: {
    temperatureChange: -5,
    humidityChange: 25,
    pressureChange: -15,
    windSpeedChange: 30,
    precipitationChange: 0.8,
    cloudCoverChange: 60
  }
};

simulator.addWeatherSystem(thunderstorm);
```

## Alerts and Events

Automatic alert generation and event tracking:

```typescript
// Monitor alerts
simulator.on('weatherAlertIssued', (alert) => {
  console.log(`${alert.severity.toUpperCase()}: ${alert.title}`);
  console.log(`Area: ${alert.area.type} (${alert.area.radius}m radius)`);
  console.log(`Valid: ${new Date(alert.validFrom)} to ${new Date(alert.validUntil)}`);
  console.log(`Recommendations: ${alert.recommendations.join(', ')}`);
});

// Monitor weather events
simulator.on('weatherEvent', (event) => {
  console.log(`Event: ${event.type} at ${event.location.latitude}, ${event.location.longitude}`);
  console.log(`Confidence: ${event.confidence * 100}%`);
});

// Get active alerts
const activeAlerts = simulator.getActiveAlerts();
const sortedAlerts = WeatherUtils.sortAlertsByPriority(activeAlerts);
```

## Forecasting

Generate detailed weather forecasts:

```typescript
// Generate 48-hour forecast
const forecast = simulator.generateForecast('nyc', 48);

forecast.conditions.forEach((condition, index) => {
  const time = new Date(condition.time);
  console.log(`Hour ${index + 1} (${time.toLocaleString()}):`);
  console.log(`  Temperature: ${condition.temperature.min}°C to ${condition.temperature.max}°C`);
  console.log(`  Feels like: ${condition.temperature.feelsLike}°C`);
  console.log(`  Wind: ${condition.wind.speed} m/s ${WeatherUtils.formatWindDirection(condition.wind.direction)}`);
  console.log(`  Precipitation: ${condition.precipitation.probability}% chance`);
  console.log(`  Phenomena: ${condition.phenomena.map(p => p.type).join(', ')}`);
});

console.log(`Forecast confidence: ${forecast.confidence}%`);
console.log(`Valid until: ${new Date(forecast.validUntil)}`);
```

## Configuration Options

### WeatherSimulator Config

```typescript
interface WeatherSimulatorConfig {
  updateInterval: number;        // Update frequency (ms)
  forecastHorizon: number;       // Forecast length (hours)
  atmosphericLayers: number;     // Number of atmospheric layers
  enableWeatherSystems: boolean; // Enable weather system tracking
  enableClimateEffects: boolean; // Enable climate zone effects
  randomSeed?: number;          // Seed for deterministic simulation
}
```

### AtmosphericModel Config

```typescript
interface AtmosphericConfig {
  layers: number;               // Number of atmospheric layers
  maxAltitude: number;          // Maximum altitude (meters)
  temperatureLapseRate: number; // Temperature lapse rate (°C/m)
  pressureScaleHeight: number;  // Pressure scale height (m)
  humidityDecayRate: number;    // Humidity decay with altitude
  windShearFactor: number;      // Wind shear coefficient
}
```

### ClimateSystem Config

```typescript
interface ClimateSystemConfig {
  timeAcceleration: number;      // Time acceleration factor
  enableSeasonalVariation: boolean; // Enable seasonal effects
  enableElNinoEffect: boolean;   // Enable ENSO effects
  enableClimateChange: boolean;  // Enable climate change trends
  climateChangeRate: number;     // Climate change rate (°C/year)
  randomSeed?: number;          // Seed for deterministic climate
}
```

## Data Structures

### WeatherState

Complete weather conditions at a specific location and time:

```typescript
interface WeatherState {
  temperature: number;        // °C
  humidity: number;          // 0-100%
  pressure: number;          // hPa
  windSpeed: number;         // m/s
  windDirection: number;     // 0-359°
  cloudCover: number;        // 0-100%
  precipitation: Precipitation;
  visibility: number;        // meters
  dewPoint: number;         // °C
  uvIndex: number;          // 0-15
  timestamp: number;        // Unix timestamp
  location: GeographicLocation;
}
```

### WeatherForecast

Multi-condition weather forecast:

```typescript
interface WeatherForecast {
  timestamp: number;            // Forecast generation time
  location: GeographicLocation; // Forecast location
  conditions: WeatherCondition[]; // Hourly conditions
  confidence: number;           // 0-100% confidence
  validUntil: number;          // Forecast expiry time
}
```

### WeatherAlert

Automated weather alert with conditions and recommendations:

```typescript
interface WeatherAlert {
  id: string;
  type: AlertType;              // temperature, wind, precipitation, etc.
  severity: AlertSeverity;      // advisory, watch, warning, emergency
  title: string;
  description: string;
  area: GeographicArea;         // Affected area
  validFrom: number;
  validUntil: number;
  conditions: AlertCondition[]; // Trigger conditions
  recommendations: string[];    // Safety recommendations
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Watch mode for development:

```bash
npm run test:watch
```

## Performance Considerations

- **Update Frequency**: Lower update intervals provide smoother simulation but use more CPU
- **Atmospheric Layers**: More layers provide better accuracy but increase memory usage
- **Weather Systems**: Each active system adds computational overhead
- **Forecast Horizon**: Longer forecasts require more calculations

## Example Applications

### Real-time Weather Display

```typescript
// Simple weather station display
simulator.on('weatherStateUpdated', ({ locationId, state }) => {
  updateWeatherDisplay(locationId, {
    temperature: WeatherUtils.formatTemperature(state.temperature),
    humidity: `${state.humidity.toFixed(1)}%`,
    pressure: WeatherUtils.formatPressure(state.pressure),
    wind: `${WeatherUtils.formatWindSpeed(state.windSpeed)} ${WeatherUtils.formatWindDirection(state.windDirection)}`,
    conditions: WeatherUtils.formatPrecipitationType(state.precipitation.type),
    icon: WeatherUtils.getWeatherIcon(state)
  });
});
```

### Weather-based Game Events

```typescript
// Trigger game events based on weather
simulator.on('weatherEvent', (event) => {
  switch (event.type) {
    case 'storm_formation':
      gameEvents.triggerStorm(event.location, event.data.intensity);
      break;
    case 'temperature_extreme':
      gameEvents.adjustNPCBehavior(event.location, event.data.newTemperature);
      break;
    case 'precipitation_start':
      gameEvents.enableWeatherEffects(event.location, event.data.precipitationType);
      break;
  }
});
```

### Climate Analysis

```typescript
// Long-term climate monitoring
setInterval(() => {
  const zones = climateSystem.getAllClimateZones();

  zones.forEach(zone => {
    const trends = climateSystem.analyzeClimateTrends(zone.id, 50); // 50 years
    const events = climateSystem.detectClimateEvents(zone.id);

    console.log(`Zone ${zone.name}:`);
    trends.forEach(trend => {
      console.log(`  ${trend.parameter}: ${trend.trend} (${trend.confidence * 100}% confidence)`);
    });

    events.forEach(event => {
      console.log(`  Event: ${event.type} (intensity: ${event.intensity})`);
    });
  });
}, 24 * 60 * 60 * 1000); // Daily analysis
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests to the main repository.

## Support

For questions and support, please open an issue in the main Steam Simulation Toolkit repository.