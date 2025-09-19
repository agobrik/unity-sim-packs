import { AtmosphericModel, WeatherSimulator, WeatherUtils } from '../src';

/**
 * Atmospheric Modeling Example
 *
 * This example demonstrates:
 * - Multi-layer atmospheric modeling
 * - Temperature inversion detection
 * - Atmospheric stability analysis
 * - Weather system effects on atmosphere
 * - Vertical wind profiles
 */

async function runAtmosphericModeling() {
  console.log('🌫️  Starting Atmospheric Modeling Example\n');

  // Create atmospheric model with detailed configuration
  const atmosphericModel = new AtmosphericModel({
    layers: 20,                    // 20 atmospheric layers
    maxAltitude: 20000,           // Up to 20km altitude
    temperatureLapseRate: 0.0065, // Standard atmosphere lapse rate
    pressureScaleHeight: 8400,    // Standard scale height
    humidityDecayRate: 0.5,       // Humidity decay with altitude
    windShearFactor: 0.15         // Wind shear coefficient
  });

  // Create weather simulator for surface conditions
  const simulator = new WeatherSimulator({
    updateInterval: 3000,
    forecastHorizon: 12,
    atmosphericLayers: 20,
    enableWeatherSystems: true,
    enableClimateEffects: false,
    randomSeed: 789
  }, {
    minLatitude: -90,
    maxLatitude: 90,
    minLongitude: -180,
    maxLongitude: 180,
    minElevation: 0,
    maxElevation: 3000
  });

  // Define test locations with different characteristics
  const locations = [
    {
      id: 'mountain_station',
      name: 'Mountain Weather Station',
      coords: {
        latitude: 46.5197,
        longitude: 7.4815,
        elevation: 2500, // High elevation
        timezone: 'Europe/Zurich'
      }
    },
    {
      id: 'coastal_station',
      name: 'Coastal Weather Station',
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        elevation: 16, // Sea level
        timezone: 'America/Los_Angeles'
      }
    },
    {
      id: 'continental_station',
      name: 'Continental Weather Station',
      coords: {
        latitude: 41.8781,
        longitude: -87.6298,
        elevation: 180, // Moderate elevation
        timezone: 'America/Chicago'
      }
    }
  ];

  // Add locations to simulator
  console.log('📍 Setting up weather stations...');
  locations.forEach(location => {
    simulator.addLocation(location.id, location.coords);
    console.log(`   Added: ${location.name} (${location.coords.elevation}m elevation)`);
  });

  // Set up event monitoring
  setupAtmosphericEventListeners(simulator, atmosphericModel);

  console.log('\n🌡️  Starting atmospheric analysis...\n');
  simulator.start();

  // Analyze initial atmospheric profiles
  setTimeout(() => {
    console.log('📊 Initial Atmospheric Profiles:');
    console.log('=' .repeat(80));

    locations.forEach(location => {
      analyzeAtmosphericProfile(location, simulator, atmosphericModel);
    });
  }, 2000);

  // Add weather systems to see their effects
  setTimeout(() => {
    console.log('\n🌀 Adding Weather Systems...\n');

    // Add a high-pressure system
    const highPressure = {
      id: 'high_001',
      type: 'high_pressure' as const,
      intensity: 65,
      center: {
        latitude: 46.0,
        longitude: 7.0,
        elevation: 0,
        timezone: 'UTC'
      },
      radius: 200000, // 200km radius
      speed: 5,       // Slow moving
      direction: 45,  // Northeast
      pressure: 1025,
      lifecycle: {
        stage: 'mature' as const,
        age: 24,
        maxIntensity: 70,
        decayRate: 2,
        expectedLifetime: 120
      },
      effects: {
        temperatureChange: 3,
        humidityChange: -15,
        pressureChange: 12,
        windSpeedChange: -5,
        precipitationChange: -0.6,
        cloudCoverChange: -30
      }
    };

    simulator.addWeatherSystem(highPressure);

    // Add a low-pressure system
    const lowPressure = {
      id: 'low_001',
      type: 'low_pressure' as const,
      intensity: 80,
      center: {
        latitude: 37.5,
        longitude: -122.0,
        elevation: 0,
        timezone: 'UTC'
      },
      radius: 150000, // 150km radius
      speed: 8,       // Moderate speed
      direction: 270, // West
      pressure: 990,
      lifecycle: {
        stage: 'developing' as const,
        age: 12,
        maxIntensity: 85,
        decayRate: 6,
        expectedLifetime: 72
      },
      effects: {
        temperatureChange: -2,
        humidityChange: 25,
        pressureChange: -18,
        windSpeedChange: 20,
        precipitationChange: 0.7,
        cloudCoverChange: 50
      }
    };

    simulator.addWeatherSystem(lowPressure);
  }, 5000);

  // Analyze atmospheric changes after weather systems
  setTimeout(() => {
    console.log('\n🌪️  Atmospheric Profiles with Weather Systems:');
    console.log('=' .repeat(80));

    locations.forEach(location => {
      analyzeAtmosphericProfile(location, simulator, atmosphericModel);
    });
  }, 8000);

  // Demonstrate atmospheric interpolation
  setTimeout(() => {
    console.log('\n🔍 Atmospheric Interpolation Examples:');
    console.log('=' .repeat(80));
    demonstrateInterpolation(simulator, atmosphericModel);
  }, 12000);

  // Analyze atmospheric stability over time
  setTimeout(() => {
    console.log('\n📈 Atmospheric Stability Analysis:');
    console.log('=' .repeat(80));
    analyzeStabilityOverTime(simulator, atmosphericModel);
  }, 15000);

  // Stop and summarize
  setTimeout(() => {
    simulator.stop();
    console.log('\n📋 Atmospheric Modeling Summary:');
    console.log('=' .repeat(80));
    summarizeAtmosphericAnalysis(atmosphericModel);

    console.log('\n✅ Atmospheric modeling example completed!');
  }, 20000);
}

function setupAtmosphericEventListeners(simulator: any, atmosphericModel: AtmosphericModel) {
  let profileCount = 0;

  simulator.on('weatherStateUpdated', ({ locationId, state }: any) => {
    profileCount++;

    // Update atmospheric profile periodically
    if (profileCount % 10 === 0) {
      const profile = atmosphericModel.updateProfile(
        state.location,
        state,
        simulator.getWeatherSystems()
      );

      if (profile.inversions.length > 0) {
        console.log(`🌡️  Temperature inversion detected at ${locationId}: ${profile.inversions.length} layers`);
      }

      if (profile.stability.class === 'very_unstable') {
        console.log(`⚡ Very unstable atmosphere at ${locationId}: convection likely`);
      }
    }
  });

  simulator.on('weatherSystemAdded', (system: any) => {
    console.log(`🌀 Weather system added: ${system.type} (will affect atmospheric profiles)`);
  });
}

function analyzeAtmosphericProfile(location: any, simulator: any, atmosphericModel: AtmosphericModel) {
  const weather = simulator.getWeatherState(location.id);
  if (!weather) return;

  const weatherSystems = simulator.getWeatherSystems();
  const profile = atmosphericModel.generateAtmosphericProfile(
    location.coords,
    weather,
    weatherSystems
  );

  console.log(`\n🏔️  ${location.name}:`);
  console.log(`   Surface conditions:`);
  console.log(`     Temperature: ${WeatherUtils.formatTemperature(weather.temperature)}`);
  console.log(`     Pressure: ${WeatherUtils.formatPressure(weather.pressure)}`);
  console.log(`     Wind: ${WeatherUtils.formatWindSpeed(weather.windSpeed)} ${WeatherUtils.formatWindDirection(weather.windDirection)}`);

  console.log(`   Atmospheric profile:`);
  console.log(`     Stability: ${profile.stability.class} (${profile.stability.description})`);
  console.log(`     Mixing potential: ${(profile.stability.mixingPotential * 100).toFixed(1)}%`);
  console.log(`     Convection likelihood: ${(profile.stability.convectionLikelihood * 100).toFixed(1)}%`);
  console.log(`     Mixing height: ${(profile.mixingHeight / 1000).toFixed(1)} km`);
  console.log(`     Tropopause height: ${(profile.tropopauseHeight / 1000).toFixed(1)} km`);

  if (profile.inversions.length > 0) {
    console.log(`   Temperature inversions (${profile.inversions.length}):`);
    profile.inversions.forEach((inversion, index) => {
      console.log(`     #${index + 1}: ${(inversion.baseAltitude / 1000).toFixed(1)} - ${(inversion.topAltitude / 1000).toFixed(1)} km (${inversion.strength.toFixed(1)}°C, ${inversion.type})`);
    });
  }

  // Show detailed layer information for first few layers
  console.log(`   Detailed layers (first 5):`);
  profile.layers.slice(0, 5).forEach((layer, index) => {
    console.log(`     ${(layer.altitude / 1000).toFixed(1)} km: ${layer.temperature.toFixed(1)}°C, ${layer.pressure.toFixed(1)} hPa, ${layer.windSpeed.toFixed(1)} m/s ${WeatherUtils.formatWindDirection(layer.windDirection)}, ${(layer.visibility / 1000).toFixed(1)} km vis`);
  });

  // Analyze wind shear
  const windShear = calculateWindShear(profile.layers);
  if (windShear > 10) {
    console.log(`   ⚠️  Significant wind shear detected: ${windShear.toFixed(1)} m/s per km`);
  }

  // Check for jet stream
  const jetStreamLayer = findJetStream(profile.layers);
  if (jetStreamLayer) {
    console.log(`   ✈️  Jet stream detected at ${(jetStreamLayer.altitude / 1000).toFixed(1)} km: ${jetStreamLayer.windSpeed.toFixed(1)} m/s`);
  }
}

function calculateWindShear(layers: any[]): number {
  if (layers.length < 2) return 0;

  let maxShear = 0;
  for (let i = 1; i < layers.length; i++) {
    const layer1 = layers[i - 1];
    const layer2 = layers[i];
    const altitudeDiff = (layer2.altitude - layer1.altitude) / 1000; // km
    const windSpeedDiff = Math.abs(layer2.windSpeed - layer1.windSpeed);
    const shear = windSpeedDiff / altitudeDiff;
    maxShear = Math.max(maxShear, shear);
  }

  return maxShear;
}

function findJetStream(layers: any[]): any | null {
  return layers.find(layer =>
    layer.altitude > 8000 && // Above 8km
    layer.altitude < 15000 && // Below 15km
    layer.windSpeed > 25 // Strong winds
  ) || null;
}

function demonstrateInterpolation(simulator: any, atmosphericModel: AtmosphericModel) {
  const location = simulator.getWeatherState('mountain_station');
  if (!location) return;

  const profile = atmosphericModel.getProfile(location.location);
  if (!profile) return;

  console.log('🔍 Interpolation at specific altitudes:');

  const testAltitudes = [1000, 3500, 7500, 12000]; // meters

  testAltitudes.forEach(altitude => {
    const interpolatedLayer = atmosphericModel.interpolateLayer(altitude, profile.layers);
    if (interpolatedLayer) {
      console.log(`   ${(altitude / 1000).toFixed(1)} km: ${interpolatedLayer.temperature.toFixed(1)}°C, ${interpolatedLayer.pressure.toFixed(1)} hPa, ${interpolatedLayer.windSpeed.toFixed(1)} m/s`);
    }
  });

  // Demonstrate vertical profile analysis
  console.log('\n📊 Vertical temperature profile:');
  const temperatureProfile = profile.layers.map(layer => ({
    altitude: layer.altitude / 1000,
    temperature: layer.temperature
  }));

  temperatureProfile.slice(0, 10).forEach(point => {
    const bar = '█'.repeat(Math.max(1, Math.floor((point.temperature + 50) / 5))); // Simple visualization
    console.log(`   ${point.altitude.toFixed(1)} km: ${point.temperature.toFixed(1)}°C ${bar}`);
  });
}

function analyzeStabilityOverTime(simulator: any, atmosphericModel: AtmosphericModel) {
  const stabilityHistory: { [key: string]: string[] } = {};

  // Collect stability data for each location
  ['mountain_station', 'coastal_station', 'continental_station'].forEach(locationId => {
    const weather = simulator.getWeatherState(locationId);
    if (weather) {
      const profile = atmosphericModel.generateAtmosphericProfile(
        weather.location,
        weather,
        simulator.getWeatherSystems()
      );

      if (!stabilityHistory[locationId]) {
        stabilityHistory[locationId] = [];
      }
      stabilityHistory[locationId].push(profile.stability.class);
    }
  });

  // Analyze stability patterns
  Object.entries(stabilityHistory).forEach(([locationId, stability]) => {
    const locationName = {
      'mountain_station': 'Mountain Station',
      'coastal_station': 'Coastal Station',
      'continental_station': 'Continental Station'
    }[locationId] || locationId;

    console.log(`\n📈 ${locationName} stability pattern:`);

    const stableCounts = stability.reduce((counts: { [key: string]: number }, s) => {
      counts[s] = (counts[s] || 0) + 1;
      return counts;
    }, {});

    Object.entries(stableCounts).forEach(([stability, count]) => {
      const percentage = ((count / stability.length) * 100).toFixed(1);
      console.log(`   ${stability}: ${percentage}% (${count} observations)`);
    });

    // Identify most common stability class
    const mostCommon = Object.entries(stableCounts).reduce((a, b) => a[1] > b[1] ? a : b);
    console.log(`   Predominant: ${mostCommon[0]}`);
  });
}

function summarizeAtmosphericAnalysis(atmosphericModel: AtmosphericModel) {
  const config = atmosphericModel.getConfig();
  const profileCount = atmosphericModel.getProfileCount();

  console.log('Model configuration:');
  console.log(`   Layers: ${config.layers}`);
  console.log(`   Max altitude: ${(config.maxAltitude / 1000).toFixed(1)} km`);
  console.log(`   Temperature lapse rate: ${config.temperatureLapseRate} °C/m`);
  console.log(`   Pressure scale height: ${(config.pressureScaleHeight / 1000).toFixed(1)} km`);

  console.log(`\nAnalysis results:`);
  console.log(`   Profiles generated: ${profileCount}`);
  console.log(`   Memory usage: ${(profileCount * config.layers * 8 * 4 / 1024).toFixed(1)} KB (estimated)`);

  console.log('\nKey findings:');
  console.log('   • Temperature inversions common in stable conditions');
  console.log('   • Wind shear increases with altitude and weather systems');
  console.log('   • Atmospheric stability varies significantly by location and time');
  console.log('   • Weather systems have measurable effects on atmospheric profiles');
  console.log('   • Interpolation allows analysis at any altitude within the profile');
}

// Export for use in other examples
export { runAtmosphericModeling };

// Run if this file is executed directly
if (require.main === module) {
  runAtmosphericModeling().catch(console.error);
}