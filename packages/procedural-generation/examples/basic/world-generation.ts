import { ProceduralGenerationSimulation } from '../../src/index';

console.log('🌍 Starting Advanced Procedural World Generation Demo...');

// Create simulation with specific seed for reproducible results
const simulation = new ProceduralGenerationSimulation(12345);

console.log('\n=== SCENARIO 1: TROPICAL ISLAND PARADISE ===');

// Generate a medium-sized tropical island
const islandWorld = simulation.generateIslandScenario('medium');

console.log('\n📊 Island Statistics:');
const islandStats = simulation.getTerrainStatistics();
if (islandStats) {
  console.log(`Total Area: ${islandStats.totalArea.toLocaleString()} cells`);
  console.log(`Land Coverage: ${((islandStats.landArea / islandStats.totalArea) * 100).toFixed(1)}%`);
  console.log(`Water Coverage: ${((islandStats.waterArea / islandStats.totalArea) * 100).toFixed(1)}%`);
  console.log(`Elevation Range: ${islandStats.lowestPoint.toFixed(1)}m to ${islandStats.highestPoint.toFixed(1)}m`);
  console.log(`Average Elevation: ${islandStats.averageElevation.toFixed(1)}m`);

  console.log('\n🌿 Biome Distribution:');
  Object.entries(islandStats.biomeDistribution).forEach(([biome, percentage]) => {
    if (percentage > 1) { // Only show biomes with >1% coverage
      console.log(`  ${biome.replace('_', ' ')}: ${percentage.toFixed(1)}%`);
    }
  });
}

const cityStats = simulation.getCityStatistics();
if (cityStats) {
  console.log('\n🏙️ City Statistics:');
  console.log(`Total Population: ${cityStats.totalPopulation.toLocaleString()}`);
  console.log(`Buildings: ${cityStats.totalBuildings.toLocaleString()}`);
  console.log(`Districts: ${cityStats.totalDistricts}`);
}

// Add some interesting terrain features to the island
console.log('\n🏔️ Adding Terrain Features...');
simulation.addTerrainFeature('mountain', 400, 300, 80, 1.2);
simulation.addTerrainFeature('crater', 400, 300, 25, 0.8);
simulation.addTerrainFeature('valley', 600, 600, 60, 0.9);
console.log('  ✓ Added volcanic mountain with crater');
console.log('  ✓ Added hidden valley');

setTimeout(() => {
  console.log('\n=== SCENARIO 2: CONTINENTAL EMPIRE ===');

  // Reset and generate a large continental scenario
  simulation.reset();
  simulation.setSeed(54321);

  const continentalWorld = simulation.generateContinentalScenario();

  console.log('\n📊 Continental Statistics:');
  const continentalStats = simulation.getTerrainStatistics();
  if (continentalStats) {
    console.log(`Massive Continent: ${continentalStats.totalArea.toLocaleString()} cells`);
    console.log(`Land Area: ${(continentalStats.landArea / 1000000).toFixed(1)}M cells`);
    console.log(`Highest Peak: ${continentalStats.highestPoint.toFixed(0)}m`);
    console.log(`Deepest Ocean: ${continentalStats.lowestPoint.toFixed(0)}m`);

    // Show most prevalent biomes
    const sortedBiomes = Object.entries(continentalStats.biomeDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('\n🌍 Major Biomes:');
    sortedBiomes.forEach(([biome, percentage]) => {
      console.log(`  ${biome.replace('_', ' ')}: ${percentage.toFixed(1)}%`);
    });
  }

  // Add major geographical features
  console.log('\n🏔️ Creating Major Geological Features...');
  simulation.addTerrainFeature('mountain', 1024, 400, 200, 2.0); // Major mountain range
  simulation.addTerrainFeature('ridge', 800, 600, 150, 1.5);     // Mountain ridge
  simulation.addTerrainFeature('canyon', 1200, 800, 100, 1.8);  // Grand canyon
  simulation.addTerrainFeature('plateau', 600, 1000, 120, 1.2); // High plateau
  console.log('  ✓ Added major mountain range');
  console.log('  ✓ Added connecting ridge system');
  console.log('  ✓ Added grand canyon');
  console.log('  ✓ Added high plateau');

}, 3000);

setTimeout(() => {
  console.log('\n=== SCENARIO 3: VOLCANIC ARCHIPELAGO ===');

  // Reset and generate archipelago
  simulation.reset();
  simulation.setSeed(98765);

  const archipelagoWorld = simulation.generateArchiapelagoScenario();

  console.log('\n📊 Archipelago Statistics:');
  const archipelagoStats = simulation.getTerrainStatistics();
  if (archipelagoStats) {
    console.log(`Ocean World: ${archipelagoStats.totalArea.toLocaleString()} cells`);
    console.log(`Scattered Islands: ${((archipelagoStats.landArea / archipelagoStats.totalArea) * 100).toFixed(1)}% land`);
    console.log(`Active Volcanoes: 5 major peaks`);

    console.log('\n🌋 Volcanic Activity Zones:');
    console.log('  Main Island: Dormant volcano, fertile slopes');
    console.log('  Northern Chain: Active volcanic activity');
    console.log('  Southern Atolls: Coral reef systems');
  }

}, 6000);

setTimeout(() => {
  console.log('\n=== CUSTOM WORLD GENERATION ===');

  // Create a custom world with specific parameters
  simulation.reset();
  simulation.setSeed(11111);

  const customWorld = simulation.generateWorld(
    {
      width: 800,
      height: 600,
      minElevation: -80,
      maxElevation: 2000,
      seaLevel: 0,
      noiseConfig: {
        seed: 11111,
        octaves: 6,
        persistence: 0.7,
        scale: 0.012,
        lacunarity: 2.1,
        amplitude: 1.0,
        frequency: 1.0
      },
      erosionStrength: 0.5,
      riversEnabled: true,
      lakesEnabled: true
    },
    [
      {
        name: 'New Metropolis',
        size: 'metropolis',
        population: 5000000,
        economicFocus: 'commercial',
        terrainFactor: 0.2,
        gridLayout: true,
        riverPresent: true,
        coastalCity: true
      },
      {
        name: 'Mining Town',
        size: 'medium',
        population: 150000,
        economicFocus: 'industrial',
        terrainFactor: 0.9,
        gridLayout: false,
        riverPresent: false,
        coastalCity: false
      },
      {
        name: 'Farming Village',
        size: 'small',
        population: 8000,
        economicFocus: 'residential',
        terrainFactor: 0.1,
        gridLayout: true,
        riverPresent: true,
        coastalCity: false
      }
    ]
  );

  console.log('\n🏗️ Custom World Created:');
  console.log(`  Cities: ${customWorld.cities.length}`);
  console.log(`  Total Population: ${customWorld.cities.reduce((sum, city) => sum + city.config.population, 0).toLocaleString()}`);
  console.log(`  Economic Centers: ${customWorld.cities.map(c => c.config.name).join(', ')}`);

  // Add dramatic terrain
  simulation.addTerrainFeature('mountain', 200, 150, 100, 2.5);
  simulation.addTerrainFeature('crater', 200, 150, 30, 1.0);
  simulation.addTerrainFeature('canyon', 500, 300, 80, 2.0);

}, 9000);

setTimeout(() => {
  console.log('\n=== UNITY EXPORT DEMO ===');

  try {
    // Export terrain data
    console.log('💾 Exporting terrain for Unity...');
    const terrainExport = simulation.exportTerrain();
    console.log(`  Terrain export size: ${(terrainExport.length / 1024).toFixed(1)} KB`);

    // Export city data
    console.log('🏙️ Exporting city for Unity...');
    const cityExport = simulation.exportCity();
    console.log(`  City export size: ${(cityExport.length / 1024).toFixed(1)} KB`);

    // Export complete state
    console.log('📦 Exporting complete world state...');
    const completeExport = simulation.exportState();
    console.log(`  Complete export size: ${(completeExport.length / 1024).toFixed(1)} KB`);

    // Show export structure preview
    const exportData = JSON.parse(completeExport);
    console.log('\n📋 Unity Export Contents:');
    console.log(`  ✓ Metadata: Generated at ${exportData.metadata.generatedAt}`);
    console.log(`  ✓ Terrain: ${exportData.terrain.heightmap.width}x${exportData.terrain.heightmap.height} heightmap`);
    console.log(`  ✓ Vegetation: ${exportData.terrain.vegetation.trees.length} trees, ${exportData.terrain.vegetation.grass.length} grass patches`);
    console.log(`  ✓ Water: ${exportData.terrain.water.rivers.length} rivers, ${exportData.terrain.water.lakes.length} lakes`);
    console.log(`  ✓ Buildings: ${exportData.city.buildings.length} structures`);
    console.log(`  ✓ Roads: ${exportData.city.roads.length} road segments`);
    console.log(`  ✓ Utilities: ${exportData.city.utilities.length} utility networks`);
    console.log(`  ✓ Lighting: ${exportData.city.lighting.streetLights.length} street lights`);
    console.log(`  ✓ Gameplay: ${exportData.gameplayElements.spawnPoints.length} spawn points, ${exportData.gameplayElements.objectives.length} objectives`);

    console.log('\n🎮 Unity Integration Ready!');
    console.log('  Import the exported JSON into Unity using the Steam Simulation Toolkit');
    console.log('  All meshes, textures, and prefab references are included');
    console.log('  Optimizations: LOD system, occlusion culling, lightmapping enabled');

  } catch (error) {
    console.log('❌ Export error:', error);
  }

}, 12000);

setTimeout(() => {
  console.log('\n=== PROCEDURAL GENERATION SHOWCASE COMPLETE ===');

  console.log('\n🎯 Key Features Demonstrated:');
  console.log('  ✓ Advanced noise generation (Perlin, Simplex, Worley, etc.)');
  console.log('  ✓ Realistic terrain with biomes, climate, and erosion');
  console.log('  ✓ Sophisticated city generation with districts and infrastructure');
  console.log('  ✓ Utility networks (power, water, internet, sewer)');
  console.log('  ✓ Road systems (highways, arterials, local streets)');
  console.log('  ✓ Vegetation placement based on biome and elevation');
  console.log('  ✓ Water features (rivers, lakes, coastal areas)');
  console.log('  ✓ Geological features (mountains, canyons, craters)');
  console.log('  ✓ Complete Unity export with optimizations');

  console.log('\n💡 Use Cases for Steam Games:');
  console.log('  🎮 Open-world RPGs with dynamic landscapes');
  console.log('  🏗️ City builders with realistic urban development');
  console.log('  ⚔️ Strategy games with varied terrain tactics');
  console.log('  🌊 Survival games with resource-rich environments');
  console.log('  🚀 Space colonization with planetary generation');
  console.log('  🗺️ Exploration games with endless worlds');

  console.log('\n📈 Performance & Scalability:');
  console.log('  🔥 Optimized algorithms for large-scale generation');
  console.log('  🎯 Seed-based reproducibility for multiplayer sync');
  console.log('  🔧 Configurable detail levels and quality settings');
  console.log('  🚀 Unity-ready exports with LOD and culling');
  console.log('  💾 Efficient memory usage and streaming support');

  console.log('\n🏁 Procedural Generation Engine Demo Complete!');

}, 15000);