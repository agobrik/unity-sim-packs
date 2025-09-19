import { ClimateSystem, WeatherSimulator, WeatherUtils } from '../src';

/**
 * Climate Analysis Example
 *
 * This example demonstrates:
 * - Setting up climate zones
 * - Long-term climate simulation
 * - Climate trend analysis
 * - Seasonal pattern modeling
 * - Climate event detection
 */

async function runClimateAnalysis() {
  console.log('🌍 Starting Climate Analysis Example\n');

  // Create climate system
  const climateSystem = new ClimateSystem({
    timeAcceleration: 1000,        // Accelerate time for demo
    enableSeasonalVariation: true,
    enableElNinoEffect: true,
    enableClimateChange: true,
    climateChangeRate: 0.02,      // 0.02°C per year
    randomSeed: 123
  });

  // Create weather simulator for generating climate data
  const simulator = new WeatherSimulator({
    updateInterval: 1000,
    forecastHorizon: 24,
    atmosphericLayers: 3,
    enableWeatherSystems: true,
    enableClimateEffects: true,
    randomSeed: 123
  }, {
    minLatitude: -90,
    maxLatitude: 90,
    minLongitude: -180,
    maxLongitude: 180,
    minElevation: 0,
    maxElevation: 5000
  });

  // Define climate zones with different characteristics
  const climateZones = [
    {
      id: 'tropical_rainforest',
      name: 'Amazon Rainforest',
      location: { latitude: -3.4653, longitude: -62.2159, elevation: 100, timezone: 'America/Manaus' },
      type: 'tropical' as const
    },
    {
      id: 'temperate_oceanic',
      name: 'British Isles',
      location: { latitude: 53.4084, longitude: -2.9916, elevation: 50, timezone: 'Europe/London' },
      type: 'temperate' as const
    },
    {
      id: 'continental_humid',
      name: 'Central Canada',
      location: { latitude: 53.9333, longitude: -116.5765, elevation: 600, timezone: 'America/Edmonton' },
      type: 'continental' as const
    },
    {
      id: 'arid_desert',
      name: 'Sahara Desert',
      location: { latitude: 23.8859, longitude: 2.2574, elevation: 400, timezone: 'Africa/Algiers' },
      type: 'dry' as const
    },
    {
      id: 'polar_tundra',
      name: 'Arctic Tundra',
      location: { latitude: 71.0275, longitude: -8.0502, elevation: 200, timezone: 'Arctic/Longyearbyen' },
      type: 'polar' as const
    }
  ];

  console.log('🗺️  Creating Climate Zones:');
  console.log('=' .repeat(60));

  // Create and add climate zones
  for (const zoneInfo of climateZones) {
    const characteristics = climateSystem.generateClimateCharacteristics(zoneInfo.location, 30);
    const zone = {
      id: zoneInfo.id,
      name: zoneInfo.name,
      type: zoneInfo.type,
      characteristics,
      seasonalPatterns: climateSystem.generateSeasonalPatterns({
        id: zoneInfo.id,
        name: zoneInfo.name,
        type: zoneInfo.type,
        characteristics,
        seasonalPatterns: [],
        extremes: climateSystem.generateClimateExtremes({
          id: zoneInfo.id,
          name: zoneInfo.name,
          type: zoneInfo.type,
          characteristics,
          seasonalPatterns: [],
          extremes: {
            maxTemperature: 0,
            minTemperature: 0,
            maxWindSpeed: 0,
            maxPrecipitation: 0,
            droughtProbability: 0,
            floodProbability: 0
          }
        })
      }),
      extremes: climateSystem.generateClimateExtremes({
        id: zoneInfo.id,
        name: zoneInfo.name,
        type: zoneInfo.type,
        characteristics,
        seasonalPatterns: [],
        extremes: {
          maxTemperature: 0,
          minTemperature: 0,
          maxWindSpeed: 0,
          maxPrecipitation: 0,
          droughtProbability: 0,
          floodProbability: 0
        }
      })
    };

    climateSystem.addClimateZone(zone);
    simulator.addLocation(zoneInfo.id, zoneInfo.location);

    displayClimateZone(zone);
  }

  // Start simulation and collect climate data
  console.log('\n⏰ Simulating Climate Data Collection...');
  console.log('=' .repeat(60));

  simulator.start();

  // Collect data for simulated years
  let dataPoints = 0;
  const maxDataPoints = 100; // Simulate 100 data points
  const dataCollectionInterval = 500; // Collect every 500ms

  const dataCollection = setInterval(() => {
    // Record climate data for each zone
    climateZones.forEach(zoneInfo => {
      const weather = simulator.getWeatherState(zoneInfo.id);
      if (weather) {
        climateSystem.recordClimateData(zoneInfo.id, weather);
      }
    });

    dataPoints++;
    if (dataPoints % 20 === 0) {
      console.log(`📊 Collected ${dataPoints}/${maxDataPoints} data points...`);
    }

    if (dataPoints >= maxDataPoints) {
      clearInterval(dataCollection);
      simulator.stop();
      analyzeClimateData();
    }
  }, dataCollectionInterval);

  function analyzeClimateData() {
    console.log('\n📈 Climate Trend Analysis:');
    console.log('=' .repeat(60));

    climateZones.forEach(zoneInfo => {
      const trends = climateSystem.analyzeClimateTrends(zoneInfo.id, 10);
      displayClimateTrends(zoneInfo.name, trends);
    });

    console.log('\n🌡️  Climate Change Projections:');
    console.log('=' .repeat(60));

    climateZones.forEach(zoneInfo => {
      displayClimateProjections(zoneInfo, climateSystem);
    });

    console.log('\n⚠️  Climate Event Detection:');
    console.log('=' .repeat(60));

    climateZones.forEach(zoneInfo => {
      const events = climateSystem.detectClimateEvents(zoneInfo.id);
      displayClimateEvents(zoneInfo.name, events);
    });

    console.log('\n🌍 Climate Zone Comparison:');
    console.log('=' .repeat(60));
    compareClimateZones();

    console.log('\n📤 Climate Data Export:');
    console.log('=' .repeat(60));
    demonstrateDataExport();

    console.log('\n✅ Climate analysis example completed!');
  }

  function displayClimateZone(zone: any) {
    console.log(`\n🌡️ ${zone.name} (${zone.type}):`);

    // Show annual averages
    const tempValues = Object.values(zone.characteristics.averageTemperature) as number[];
    const precipValues = Object.values(zone.characteristics.precipitation) as number[];
    const humidityValues = Object.values(zone.characteristics.humidity) as number[];

    const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;
    const totalPrecip = precipValues.reduce((a, b) => a + b, 0);
    const avgHumidity = humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length;

    console.log(`   Annual avg temp: ${WeatherUtils.formatTemperature(avgTemp)}`);
    console.log(`   Annual precipitation: ${totalPrecip.toFixed(0)} mm`);
    console.log(`   Annual avg humidity: ${avgHumidity.toFixed(1)}%`);
    console.log(`   Storm frequency: ${zone.characteristics.stormFrequency} events/year`);

    // Show extremes
    console.log(`   Temperature range: ${WeatherUtils.formatTemperature(zone.extremes.minTemperature)} to ${WeatherUtils.formatTemperature(zone.extremes.maxTemperature)}`);
    console.log(`   Max wind speed: ${WeatherUtils.formatWindSpeed(zone.extremes.maxWindSpeed)}`);
    console.log(`   Drought probability: ${(zone.extremes.droughtProbability * 100).toFixed(1)}%`);
    console.log(`   Flood probability: ${(zone.extremes.floodProbability * 100).toFixed(1)}%`);

    // Show seasonal patterns
    console.log(`   Seasonal patterns:`);
    zone.seasonalPatterns.forEach((pattern: any) => {
      console.log(`     ${pattern.season}: temp ${pattern.temperatureModifier > 0 ? '+' : ''}${(pattern.temperatureModifier * 100).toFixed(1)}%, precip ${pattern.precipitationModifier > 0 ? '+' : ''}${(pattern.precipitationModifier * 100).toFixed(1)}%`);
    });
  }

  function displayClimateTrends(zoneName: string, trends: any[]) {
    console.log(`\n📊 ${zoneName}:`);
    if (trends.length === 0) {
      console.log('   Insufficient data for trend analysis');
      return;
    }

    trends.forEach(trend => {
      const direction = trend.trend > 0 ? '↗️' : trend.trend < 0 ? '↘️' : '➡️';
      const confidence = (trend.confidence * 100).toFixed(1);
      console.log(`   ${trend.parameter}: ${direction} ${Math.abs(trend.trend).toFixed(4)}/year (${confidence}% confidence)`);
    });
  }

  function displayClimateProjections(zoneInfo: any, climateSystem: ClimateSystem) {
    const currentTime = climateSystem.getCurrentTime();
    const zone = climateSystem.getClimateZone(zoneInfo.id);

    if (!zone) return;

    console.log(`\n🔮 ${zoneInfo.name} Projections (next 50 years):`);

    // Simple projection based on current trends
    const trends = climateSystem.analyzeClimateTrends(zoneInfo.id, 10);
    const tempTrend = trends.find(t => t.parameter === 'temperature');
    const precipTrend = trends.find(t => t.parameter === 'precipitation');

    if (tempTrend) {
      const tempChange = tempTrend.trend * 50;
      console.log(`   Temperature change: ${tempChange > 0 ? '+' : ''}${tempChange.toFixed(2)}°C`);
    }

    if (precipTrend) {
      const precipChange = precipTrend.trend * 50;
      console.log(`   Precipitation change: ${precipChange > 0 ? '+' : ''}${precipChange.toFixed(1)}mm/year`);
    }

    // Risk assessment
    const tempValues = Object.values(zone.characteristics.averageTemperature) as number[];
    const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;

    if (tempTrend && tempTrend.trend > 0.02) {
      console.log(`   ⚠️  High warming risk: ${(tempTrend.trend * 100).toFixed(2)}°C/decade`);
    }

    if (zone.extremes.droughtProbability > 0.3) {
      console.log(`   🏜️  Drought risk: ${(zone.extremes.droughtProbability * 100).toFixed(1)}%`);
    }

    if (zone.extremes.floodProbability > 0.3) {
      console.log(`   🌊 Flood risk: ${(zone.extremes.floodProbability * 100).toFixed(1)}%`);
    }
  }

  function displayClimateEvents(zoneName: string, events: any[]) {
    console.log(`\n⚡ ${zoneName}:`);
    if (events.length === 0) {
      console.log('   No significant climate events detected');
      return;
    }

    events.forEach(event => {
      console.log(`   ${event.type}: intensity ${(event.intensity * 100).toFixed(1)}%, duration ${event.duration} days`);
      console.log(`     Period: ${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`);
    });
  }

  function compareClimateZones() {
    const zones = climateSystem.getAllClimateZones();
    console.log('Temperature ranges by zone:');

    zones.forEach(zone => {
      const tempValues = Object.values(zone.characteristics.averageTemperature) as number[];
      const minTemp = Math.min(...tempValues);
      const maxTemp = Math.max(...tempValues);
      const avgTemp = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;

      console.log(`   ${zone.name}: avg ${WeatherUtils.formatTemperature(avgTemp)}, range ${WeatherUtils.formatTemperature(minTemp)} to ${WeatherUtils.formatTemperature(maxTemp)}`);
    });

    console.log('\nPrecipitation totals by zone:');
    zones.forEach(zone => {
      const precipValues = Object.values(zone.characteristics.precipitation) as number[];
      const totalPrecip = precipValues.reduce((a, b) => a + b, 0);
      console.log(`   ${zone.name}: ${totalPrecip.toFixed(0)} mm/year`);
    });
  }

  function demonstrateDataExport() {
    // Export data for one zone
    const sampleZone = climateZones[0];
    const exportedData = climateSystem.exportClimateData(sampleZone.id);

    console.log(`Exported data for ${sampleZone.name}:`);
    console.log(`   Zone info: ${exportedData.zone?.name} (${exportedData.zone?.type})`);
    console.log(`   Data points: ${exportedData.data?.length || 0}`);
    console.log(`   Trends: ${exportedData.trends?.length || 0}`);

    // Export all data
    const allData = climateSystem.exportClimateData();
    const zoneCount = Object.keys(allData).length;
    console.log(`\nFull export contains ${zoneCount} climate zones`);

    // Demonstrate import (would typically be from file)
    console.log('Data export/import functionality available for persistence');
  }
}

// Export for use in other examples
export { runClimateAnalysis };

// Run if this file is executed directly
if (require.main === module) {
  runClimateAnalysis().catch(console.error);
}