import { WeatherSimulator, WeatherUtils, AtmosphericModel, ClimateSystem } from '../src';

/**
 * Basic Weather Simulation Example
 *
 * This example demonstrates:
 * - Setting up a weather simulator
 * - Adding locations
 * - Monitoring weather updates
 * - Generating forecasts
 * - Handling alerts
 */

async function runBasicSimulation() {
  console.log('🌤️  Starting Basic Weather Simulation Example\n');

  // Create weather simulator with configuration
  const simulator = new WeatherSimulator({
    updateInterval: 5000,        // Update every 5 seconds for demo
    forecastHorizon: 24,         // 24-hour forecasts
    atmosphericLayers: 5,        // 5 atmospheric layers
    enableWeatherSystems: true,  // Enable weather systems
    enableClimateEffects: true,  // Enable climate effects
    randomSeed: 42              // Deterministic for reproducible results
  }, {
    minLatitude: -90,
    maxLatitude: 90,
    minLongitude: -180,
    maxLongitude: 180,
    minElevation: -500,
    maxElevation: 9000
  });

  // Define some interesting locations
  const locations = [
    {
      id: 'new_york',
      name: 'New York City',
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 10,
        timezone: 'America/New_York'
      }
    },
    {
      id: 'london',
      name: 'London',
      coords: {
        latitude: 51.5074,
        longitude: -0.1278,
        elevation: 35,
        timezone: 'Europe/London'
      }
    },
    {
      id: 'tokyo',
      name: 'Tokyo',
      coords: {
        latitude: 35.6762,
        longitude: 139.6503,
        elevation: 40,
        timezone: 'Asia/Tokyo'
      }
    },
    {
      id: 'sydney',
      name: 'Sydney',
      coords: {
        latitude: -33.8688,
        longitude: 151.2093,
        elevation: 58,
        timezone: 'Australia/Sydney'
      }
    }
  ];

  // Add event listeners
  setupEventListeners(simulator);

  // Add locations to simulator
  console.log('📍 Adding locations...');
  locations.forEach(location => {
    simulator.addLocation(location.id, location.coords);
    console.log(`   Added: ${location.name}`);
  });

  console.log('\n⏱️  Starting simulation...\n');
  simulator.start();

  // Display initial weather states
  console.log('🌡️  Initial Weather States:');
  console.log('=' .repeat(60));
  locations.forEach(location => {
    const weather = simulator.getWeatherState(location.id);
    if (weather) {
      displayWeatherState(location.name, weather);
    }
  });

  // Generate and display forecasts
  setTimeout(() => {
    console.log('\n🔮 24-Hour Forecasts:');
    console.log('=' .repeat(60));

    locations.forEach(location => {
      const forecast = simulator.generateForecast(location.id, 24);
      if (forecast) {
        displayForecast(location.name, forecast);
      }
    });
  }, 2000);

  // Add a weather system after a few seconds
  setTimeout(() => {
    console.log('\n🌪️  Adding Weather System (Thunderstorm near New York)...\n');

    const thunderstorm = {
      id: 'storm_001',
      type: 'thunderstorm' as const,
      intensity: 75,
      center: {
        latitude: 40.5,
        longitude: -74.2,
        elevation: 0,
        timezone: 'UTC'
      },
      radius: 100000, // 100km radius
      speed: 12,      // 12 m/s movement speed
      direction: 90,  // Moving east
      pressure: 985,
      lifecycle: {
        stage: 'developing' as const,
        age: 1,
        maxIntensity: 90,
        decayRate: 8,
        expectedLifetime: 8
      },
      effects: {
        temperatureChange: -8,
        humidityChange: 30,
        pressureChange: -20,
        windSpeedChange: 35,
        precipitationChange: 0.9,
        cloudCoverChange: 80
      }
    };

    simulator.addWeatherSystem(thunderstorm);
  }, 8000);

  // Show atmospheric profiles
  setTimeout(() => {
    console.log('\n🌫️  Atmospheric Profiles:');
    console.log('=' .repeat(60));

    const atmosphericModel = new AtmosphericModel({
      layers: 10,
      maxAltitude: 15000
    });

    locations.slice(0, 2).forEach(location => {
      const weather = simulator.getWeatherState(location.id);
      if (weather) {
        const profile = atmosphericModel.generateAtmosphericProfile(
          location.coords,
          weather,
          simulator.getWeatherSystems()
        );
        displayAtmosphericProfile(location.name, profile);
      }
    });
  }, 12000);

  // Stop simulation after 30 seconds
  setTimeout(() => {
    console.log('\n⏹️  Stopping simulation...');
    simulator.stop();

    // Show final summary
    console.log('\n📊 Final Weather Summary:');
    console.log('=' .repeat(60));
    locations.forEach(location => {
      const weather = simulator.getWeatherState(location.id);
      if (weather) {
        displayWeatherSummary(location.name, weather);
      }
    });

    console.log('\n✅ Basic simulation example completed!');
  }, 30000);
}

function setupEventListeners(simulator: WeatherSimulator) {
  let updateCount = 0;

  simulator.on('weatherStateUpdated', ({ locationId, state }) => {
    updateCount++;
    if (updateCount % 20 === 0) { // Show every 20th update
      console.log(`🔄 Update #${updateCount}: ${locationId} - ${WeatherUtils.formatTemperature(state.temperature)}, ${state.humidity.toFixed(1)}% humidity`);
    }
  });

  simulator.on('weatherAlertIssued', (alert) => {
    console.log(`\n🚨 WEATHER ALERT: ${alert.title}`);
    console.log(`   Severity: ${alert.severity.toUpperCase()}`);
    console.log(`   Description: ${alert.description}`);
    console.log(`   Recommendations: ${alert.recommendations.join(', ')}`);
  });

  simulator.on('weatherEvent', (event) => {
    console.log(`\n⚡ Weather Event: ${event.type} at ${event.location.latitude.toFixed(2)}, ${event.location.longitude.toFixed(2)}`);
    console.log(`   Confidence: ${(event.confidence * 100).toFixed(1)}%`);
  });

  simulator.on('weatherSystemAdded', (system) => {
    console.log(`🌀 Weather System Added: ${system.type} (intensity: ${system.intensity}%)`);
  });

  simulator.on('weatherSystemUpdated', (system) => {
    if (system.intensity > 70) {
      console.log(`🌀 Strong Weather System: ${system.type} at ${system.center.latitude.toFixed(2)}, ${system.center.longitude.toFixed(2)} (${system.intensity}% intensity)`);
    }
  });
}

function displayWeatherState(locationName: string, weather: any) {
  console.log(`\n📍 ${locationName}:`);
  console.log(`   Temperature: ${WeatherUtils.formatTemperature(weather.temperature)} (feels like ${WeatherUtils.formatTemperature(WeatherUtils.calculateFeelsLike(weather.temperature, weather.humidity, weather.windSpeed))})`);
  console.log(`   Humidity: ${weather.humidity.toFixed(1)}%`);
  console.log(`   Pressure: ${WeatherUtils.formatPressure(weather.pressure)}`);
  console.log(`   Wind: ${WeatherUtils.formatWindSpeed(weather.windSpeed)} ${WeatherUtils.formatWindDirection(weather.windDirection)}`);
  console.log(`   Cloud Cover: ${weather.cloudCover.toFixed(1)}%`);
  console.log(`   Visibility: ${(weather.visibility / 1000).toFixed(1)} km`);
  console.log(`   Precipitation: ${WeatherUtils.formatPrecipitationType(weather.precipitation.type)} (${weather.precipitation.probability.toFixed(1)}% chance)`);
  console.log(`   UV Index: ${weather.uvIndex.toFixed(1)}`);
  console.log(`   Weather Icon: ${WeatherUtils.getWeatherIcon(weather)}`);
}

function displayForecast(locationName: string, forecast: any) {
  console.log(`\n🔮 ${locationName} (${forecast.confidence.toFixed(1)}% confidence):`);

  // Show first 6 hours
  forecast.conditions.slice(0, 6).forEach((condition: any, index: number) => {
    const time = new Date(condition.time);
    console.log(`   Hour ${index + 1} (${time.getHours()}:00):`);
    console.log(`     Temp: ${condition.temperature.min.toFixed(1)}°C - ${condition.temperature.max.toFixed(1)}°C`);
    console.log(`     Wind: ${condition.wind.speed.toFixed(1)} m/s ${WeatherUtils.formatWindDirection(condition.wind.direction)}`);
    console.log(`     Precip: ${condition.precipitation.probability.toFixed(1)}%`);
  });
}

function displayAtmosphericProfile(locationName: string, profile: any) {
  console.log(`\n🌫️ ${locationName} Atmospheric Profile:`);
  console.log(`   Stability: ${profile.stability.class} (${profile.stability.description})`);
  console.log(`   Mixing Height: ${(profile.mixingHeight / 1000).toFixed(1)} km`);
  console.log(`   Tropopause: ${(profile.tropopauseHeight / 1000).toFixed(1)} km`);
  console.log(`   Temperature Inversions: ${profile.inversions.length}`);

  // Show first few layers
  console.log(`   Layers (first 5):`);
  profile.layers.slice(0, 5).forEach((layer: any, index: number) => {
    console.log(`     ${(layer.altitude / 1000).toFixed(1)} km: ${layer.temperature.toFixed(1)}°C, ${layer.pressure.toFixed(1)} hPa, ${layer.windSpeed.toFixed(1)} m/s`);
  });
}

function displayWeatherSummary(locationName: string, weather: any) {
  const tempCategory = WeatherUtils.categorizeTemperature(weather.temperature);
  const windCategory = WeatherUtils.categorizeWindSpeed(weather.windSpeed);

  console.log(`\n📍 ${locationName}:`);
  console.log(`   Temperature: ${WeatherUtils.formatTemperature(weather.temperature)} (${tempCategory.description})`);
  console.log(`   Wind: ${WeatherUtils.formatWindSpeed(weather.windSpeed)} (${windCategory.description})`);
  console.log(`   Conditions: ${WeatherUtils.formatPrecipitationType(weather.precipitation.type)}`);
  console.log(`   Overall: ${WeatherUtils.getWeatherIcon(weather)}`);
}

// Export for use in other examples
export { runBasicSimulation };

// Run if this file is executed directly
if (require.main === module) {
  runBasicSimulation().catch(console.error);
}