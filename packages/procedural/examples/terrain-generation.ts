/**
 * Terrain Generation Example
 * Demonstrates comprehensive terrain generation with multiple biomes,
 * vegetation, structures, and erosion simulation
 */

import { ProceduralGenerator, TerrainGenerator, NoiseGenerator } from '../src';
import { TerrainConfig, BiomeDefinition } from '../src/types';

async function terrainGenerationExample() {
  console.log('🌍 Terrain Generation Example\n');
  console.log('==============================\n');

  const generator = new ProceduralGenerator({
    seed: 12345,
    progressCallback: (progress, stage) => {
      console.log(`📊 ${stage}: ${(progress * 100).toFixed(1)}%`);
    }
  });

  // Create advanced biome definitions
  const advancedBiomes: BiomeDefinition[] = [
    {
      id: 'deep_ocean',
      name: 'Deep Ocean',
      temperature: { min: -0.3, max: 0.5 },
      humidity: { min: 0.9, max: 1.0 },
      elevation: { min: 0, max: 0.05 },
      color: { r: 0, g: 50, b: 150 },
      vegetation: [],
      structures: []
    },
    {
      id: 'shallow_ocean',
      name: 'Shallow Ocean',
      temperature: { min: 0.0, max: 0.7 },
      humidity: { min: 0.8, max: 1.0 },
      elevation: { min: 0.05, max: 0.1 },
      color: { r: 0, g: 100, b: 200 },
      vegetation: [
        {
          type: 'kelp',
          density: 0.5,
          minSize: 0.3,
          maxSize: 1.5,
          probability: 0.6,
          conditions: []
        }
      ],
      structures: []
    },
    {
      id: 'beach',
      name: 'Sandy Beach',
      temperature: { min: 0.4, max: 0.9 },
      humidity: { min: 0.3, max: 0.7 },
      elevation: { min: 0.1, max: 0.15 },
      color: { r: 255, g: 255, b: 200 },
      vegetation: [
        {
          type: 'beach_grass',
          density: 0.8,
          minSize: 0.1,
          maxSize: 0.4,
          probability: 0.4,
          conditions: []
        },
        {
          type: 'palm_tree',
          density: 0.1,
          minSize: 0.8,
          maxSize: 1.5,
          probability: 0.3,
          conditions: [
            { property: 'humidity', min: 0.4, max: 0.8 }
          ]
        }
      ],
      structures: [
        {
          type: 'driftwood',
          probability: 0.1,
          minDistance: 5,
          size: { width: 2, height: 1, depth: 1 },
          conditions: []
        }
      ]
    },
    {
      id: 'coastal_plains',
      name: 'Coastal Plains',
      temperature: { min: 0.2, max: 0.8 },
      humidity: { min: 0.4, max: 0.8 },
      elevation: { min: 0.15, max: 0.3 },
      color: { r: 120, g: 200, b: 120 },
      vegetation: [
        {
          type: 'grass',
          density: 2.5,
          minSize: 0.1,
          maxSize: 0.3,
          probability: 0.9,
          conditions: []
        },
        {
          type: 'wildflowers',
          density: 0.8,
          minSize: 0.1,
          maxSize: 0.2,
          probability: 0.5,
          conditions: [
            { property: 'temperature', min: 0.3, max: 0.8 }
          ]
        },
        {
          type: 'oak_tree',
          density: 0.2,
          minSize: 0.8,
          maxSize: 2.0,
          probability: 0.3,
          conditions: []
        }
      ],
      structures: [
        {
          type: 'farmhouse',
          probability: 0.02,
          minDistance: 20,
          size: { width: 8, height: 6, depth: 6 },
          conditions: [
            { property: 'elevation', value: 0.2, operator: 'greater' }
          ]
        }
      ]
    },
    {
      id: 'deciduous_forest',
      name: 'Deciduous Forest',
      temperature: { min: 0.0, max: 0.7 },
      humidity: { min: 0.5, max: 0.9 },
      elevation: { min: 0.2, max: 0.7 },
      color: { r: 60, g: 150, b: 60 },
      vegetation: [
        {
          type: 'oak_tree',
          density: 1.2,
          minSize: 1.0,
          maxSize: 2.5,
          probability: 0.7,
          conditions: []
        },
        {
          type: 'maple_tree',
          density: 0.8,
          minSize: 0.8,
          maxSize: 2.0,
          probability: 0.5,
          conditions: []
        },
        {
          type: 'fern',
          density: 1.5,
          minSize: 0.2,
          maxSize: 0.6,
          probability: 0.8,
          conditions: [
            { property: 'humidity', min: 0.6, max: 1.0 }
          ]
        },
        {
          type: 'mushroom',
          density: 0.3,
          minSize: 0.05,
          maxSize: 0.15,
          probability: 0.4,
          conditions: [
            { property: 'humidity', min: 0.7, max: 1.0 }
          ]
        }
      ],
      structures: [
        {
          type: 'cabin',
          probability: 0.01,
          minDistance: 30,
          size: { width: 6, height: 4, depth: 4 },
          conditions: []
        },
        {
          type: 'ancient_ruins',
          probability: 0.005,
          minDistance: 50,
          size: { width: 12, height: 8, depth: 12 },
          conditions: []
        }
      ]
    },
    {
      id: 'coniferous_forest',
      name: 'Coniferous Forest',
      temperature: { min: -0.3, max: 0.4 },
      humidity: { min: 0.4, max: 0.8 },
      elevation: { min: 0.3, max: 0.8 },
      color: { r: 40, g: 100, b: 40 },
      vegetation: [
        {
          type: 'pine_tree',
          density: 1.8,
          minSize: 1.2,
          maxSize: 3.0,
          probability: 0.8,
          conditions: []
        },
        {
          type: 'spruce_tree',
          density: 1.0,
          minSize: 1.0,
          maxSize: 2.5,
          probability: 0.6,
          conditions: []
        },
        {
          type: 'moss',
          density: 2.0,
          minSize: 0.1,
          maxSize: 0.3,
          probability: 0.7,
          conditions: []
        }
      ],
      structures: [
        {
          type: 'logging_camp',
          probability: 0.008,
          minDistance: 40,
          size: { width: 15, height: 5, depth: 10 },
          conditions: []
        }
      ]
    },
    {
      id: 'mountain_peaks',
      name: 'Mountain Peaks',
      temperature: { min: -1.0, max: 0.1 },
      humidity: { min: 0.2, max: 0.6 },
      elevation: { min: 0.8, max: 1.0 },
      color: { r: 180, g: 180, b: 180 },
      vegetation: [
        {
          type: 'alpine_flowers',
          density: 0.3,
          minSize: 0.05,
          maxSize: 0.15,
          probability: 0.3,
          conditions: [
            { property: 'elevation', min: 0.8, max: 0.95 }
          ]
        }
      ],
      structures: [
        {
          type: 'watch_tower',
          probability: 0.003,
          minDistance: 100,
          size: { width: 4, height: 12, depth: 4 },
          conditions: [
            { property: 'elevation', value: 0.9, operator: 'greater' }
          ]
        }
      ]
    },
    {
      id: 'desert',
      name: 'Arid Desert',
      temperature: { min: 0.6, max: 1.0 },
      humidity: { min: -1.0, max: 0.1 },
      elevation: { min: 0.1, max: 0.6 },
      color: { r: 255, g: 200, b: 100 },
      vegetation: [
        {
          type: 'cactus',
          density: 0.2,
          minSize: 0.3,
          maxSize: 1.5,
          probability: 0.4,
          conditions: []
        },
        {
          type: 'desert_shrub',
          density: 0.1,
          minSize: 0.2,
          maxSize: 0.8,
          probability: 0.3,
          conditions: []
        }
      ],
      structures: [
        {
          type: 'oasis',
          probability: 0.002,
          minDistance: 80,
          size: { width: 20, height: 2, depth: 20 },
          conditions: []
        },
        {
          type: 'ancient_temple',
          probability: 0.001,
          minDistance: 120,
          size: { width: 25, height: 15, depth: 25 },
          conditions: []
        }
      ]
    },
    {
      id: 'tundra',
      name: 'Arctic Tundra',
      temperature: { min: -1.0, max: -0.2 },
      humidity: { min: 0.1, max: 0.5 },
      elevation: { min: 0.1, max: 0.4 },
      color: { r: 200, g: 220, b: 255 },
      vegetation: [
        {
          type: 'lichen',
          density: 0.8,
          minSize: 0.05,
          maxSize: 0.2,
          probability: 0.6,
          conditions: []
        },
        {
          type: 'arctic_grass',
          density: 0.5,
          minSize: 0.1,
          maxSize: 0.25,
          probability: 0.4,
          conditions: []
        }
      ],
      structures: [
        {
          type: 'ice_cave',
          probability: 0.01,
          minDistance: 25,
          size: { width: 8, height: 6, depth: 12 },
          conditions: []
        }
      ]
    }
  ];

  // Configure terrain generation
  const terrainConfig: TerrainConfig = {
    width: 256,
    height: 256,
    scale: 1.0,
    heightMultiplier: 150,
    noiseConfig: {
      seed: 12345,
      octaves: 7,
      frequency: 0.008,
      amplitude: 1.0,
      persistence: 0.55,
      lacunarity: 2.1
    },
    biomes: advancedBiomes,
    erosionSettings: {
      iterations: 100,
      evaporationRate: 0.02,
      sedimentCapacity: 4.5,
      erosionRadius: 3,
      erosionSpeed: 0.4,
      depositionSpeed: 0.2
    }
  };

  console.log('🏗️ Generating terrain...');
  const terrainGen = new TerrainGenerator(terrainConfig);

  const terrain = await generator.generate('main-terrain', (context) => {
    return terrainGen.generate(context);
  });

  console.log('✅ Terrain generation completed!\n');

  // Analyze the generated terrain
  console.log('📊 Analyzing terrain...');
  const stats = terrainGen.getTerrainStats(terrain);

  console.log('\n🌍 Terrain Statistics:');
  console.log(`   Dimensions: ${terrainConfig.width} x ${terrainConfig.height}`);
  console.log(`   Elevation Range: ${stats.minElevation.toFixed(2)} - ${stats.maxElevation.toFixed(2)}m`);
  console.log(`   Average Elevation: ${stats.avgElevation.toFixed(2)}m`);
  console.log(`   Total Vegetation: ${stats.vegetationCount} instances`);
  console.log(`   Total Structures: ${stats.structureCount} structures`);

  console.log('\n🌿 Biome Distribution:');
  const totalCells = terrainConfig.width * terrainConfig.height;
  Object.entries(stats.biomeDistribution).forEach(([biome, count]) => {
    const percentage = (count / totalCells * 100).toFixed(1);
    const biomeName = advancedBiomes.find(b => b.id === biome)?.name || biome;
    console.log(`   ${biomeName}: ${count} cells (${percentage}%)`);
  });

  // Generate detailed report for specific regions
  console.log('\n🔍 Regional Analysis:');

  // Coastal analysis
  const coastalCells = terrain.flat().filter(cell =>
    ['shallow_ocean', 'beach', 'coastal_plains'].includes(cell.biome)
  );
  console.log(`   Coastal Region: ${coastalCells.length} cells`);
  console.log(`   Avg. Coastal Elevation: ${(coastalCells.reduce((sum, cell) => sum + cell.elevation, 0) / coastalCells.length).toFixed(2)}m`);

  // Mountain analysis
  const mountainCells = terrain.flat().filter(cell =>
    cell.biome === 'mountain_peaks'
  );
  if (mountainCells.length > 0) {
    console.log(`   Mountain Region: ${mountainCells.length} cells`);
    console.log(`   Avg. Mountain Elevation: ${(mountainCells.reduce((sum, cell) => sum + cell.elevation, 0) / mountainCells.length).toFixed(2)}m`);
  }

  // Forest analysis
  const forestCells = terrain.flat().filter(cell =>
    ['deciduous_forest', 'coniferous_forest'].includes(cell.biome)
  );
  const forestVegetation = forestCells.reduce((sum, cell) => sum + cell.vegetation.length, 0);
  console.log(`   Forest Region: ${forestCells.length} cells`);
  console.log(`   Forest Vegetation Density: ${forestCells.length > 0 ? (forestVegetation / forestCells.length).toFixed(2) : 0} per cell`);

  // Generate heightmap visualization data
  console.log('\n🗺️ Generating visualization data...');
  const heightmapData = terrain.map(row =>
    row.map(cell => ({
      x: cell.x,
      y: cell.y,
      elevation: cell.elevation,
      biome: cell.biome,
      temperature: cell.temperature,
      humidity: cell.humidity,
      vegetationCount: cell.vegetation.length,
      structureCount: cell.structures.length
    }))
  );

  // Find interesting locations
  console.log('\n🎯 Points of Interest:');

  // Highest peak
  const highestPeak = terrain.flat().reduce((highest, cell) =>
    cell.elevation > highest.elevation ? cell : highest
  );
  console.log(`   🏔️ Highest Peak: (${highestPeak.x}, ${highestPeak.y}) at ${highestPeak.elevation.toFixed(2)}m`);

  // Deepest ocean
  const deepestOcean = terrain.flat().filter(cell => cell.biome.includes('ocean'))
    .reduce((deepest, cell) => cell.elevation < deepest.elevation ? cell : deepest, { elevation: Infinity, x: 0, y: 0 });
  if (deepestOcean.elevation !== Infinity) {
    console.log(`   🌊 Deepest Ocean: (${deepestOcean.x}, ${deepestOcean.y}) at ${deepestOcean.elevation.toFixed(2)}m`);
  }

  // Most vegetated area
  const mostVegetated = terrain.flat().reduce((most, cell) =>
    cell.vegetation.length > most.vegetation.length ? cell : most
  );
  console.log(`   🌳 Most Vegetated: (${mostVegetated.x}, ${mostVegetated.y}) with ${mostVegetated.vegetation.length} plants`);

  // Structure locations
  const allStructures = terrain.flat().filter(cell => cell.structures.length > 0);
  console.log(`   🏗️ Structures Found: ${allStructures.length} locations`);

  allStructures.slice(0, 5).forEach(cell => {
    cell.structures.forEach(structure => {
      console.log(`      ${structure.type} at (${cell.x}, ${cell.y}) in ${cell.biome}`);
    });
  });

  // Performance metrics
  const generationStats = generator.getStats();
  console.log('\n⚡ Performance Metrics:');
  console.log(`   Generation Time: ${generationStats.totalTime.toFixed(2)}ms`);
  console.log(`   Memory Usage: ${generationStats.memoryUsage.toFixed(2)}MB`);
  console.log(`   Success Rate: ${(generationStats.successRate * 100).toFixed(1)}%`);

  const cacheStats = generator.getCacheStats();
  console.log(`   Cache Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
  console.log(`   Cache Size: ${cacheStats.size} entries`);

  // Export terrain data
  console.log('\n💾 Exporting terrain data...');
  const exportedTerrain = terrainGen.exportTerrain(terrain);

  console.log('✅ Terrain generation example completed!');
  console.log(`📄 Exported data size: ${(exportedTerrain.length / 1024).toFixed(2)} KB`);

  generator.dispose();

  return {
    terrain,
    stats,
    heightmapData,
    exported: exportedTerrain
  };
}

// Advanced terrain analysis
function analyzeTerrainConnectivity(terrain: any[][], biome: string): {
  regions: number;
  largestRegion: number;
  connectivity: number;
} {
  const visited = terrain.map(row => row.map(() => false));
  const regions: number[] = [];

  function floodFill(startX: number, startY: number): number {
    const stack = [{ x: startX, y: startY }];
    let size = 0;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;

      if (x < 0 || x >= terrain[0].length || y < 0 || y >= terrain.length) continue;
      if (visited[y][x] || terrain[y][x].biome !== biome) continue;

      visited[y][x] = true;
      size++;

      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }

    return size;
  }

  for (let y = 0; y < terrain.length; y++) {
    for (let x = 0; x < terrain[y].length; x++) {
      if (!visited[y][x] && terrain[y][x].biome === biome) {
        const regionSize = floodFill(x, y);
        if (regionSize > 0) {
          regions.push(regionSize);
        }
      }
    }
  }

  const largestRegion = regions.length > 0 ? Math.max(...regions) : 0;
  const totalCells = regions.reduce((sum, size) => sum + size, 0);
  const connectivity = totalCells > 0 ? largestRegion / totalCells : 0;

  return {
    regions: regions.length,
    largestRegion,
    connectivity
  };
}

// Climate analysis
function analyzeClimate(terrain: any[][]): {
  temperatureZones: Record<string, number>;
  humidityZones: Record<string, number>;
  elevationZones: Record<string, number>;
} {
  const temperatureZones = { arctic: 0, temperate: 0, tropical: 0 };
  const humidityZones = { arid: 0, moderate: 0, humid: 0 };
  const elevationZones = { lowland: 0, highland: 0, mountain: 0 };

  for (const row of terrain) {
    for (const cell of row) {
      // Temperature zones
      if (cell.temperature < -0.3) temperatureZones.arctic++;
      else if (cell.temperature < 0.5) temperatureZones.temperate++;
      else temperatureZones.tropical++;

      // Humidity zones
      if (cell.humidity < 0.2) humidityZones.arid++;
      else if (cell.humidity < 0.7) humidityZones.moderate++;
      else humidityZones.humid++;

      // Elevation zones
      if (cell.elevation < 0.3) elevationZones.lowland++;
      else if (cell.elevation < 0.7) elevationZones.highland++;
      else elevationZones.mountain++;
    }
  }

  return { temperatureZones, humidityZones, elevationZones };
}

// Run the example if this file is executed directly
if (require.main === module) {
  terrainGenerationExample().then(result => {
    console.log('\n🎉 Example completed successfully!');

    // Additional analysis
    console.log('\n🔬 Advanced Analysis:');

    const forestConnectivity = analyzeTerrainConnectivity(result.terrain, 'deciduous_forest');
    console.log(`Forest Connectivity: ${forestConnectivity.regions} regions, largest: ${forestConnectivity.largestRegion} cells`);

    const oceanConnectivity = analyzeTerrainConnectivity(result.terrain, 'deep_ocean');
    console.log(`Ocean Connectivity: ${oceanConnectivity.regions} regions, largest: ${oceanConnectivity.largestRegion} cells`);

    const climate = analyzeClimate(result.terrain);
    console.log('Climate Distribution:');
    console.log(`  Temperature: Arctic ${climate.temperatureZones.arctic}, Temperate ${climate.temperatureZones.temperate}, Tropical ${climate.temperatureZones.tropical}`);
    console.log(`  Humidity: Arid ${climate.humidityZones.arid}, Moderate ${climate.humidityZones.moderate}, Humid ${climate.humidityZones.humid}`);
    console.log(`  Elevation: Lowland ${climate.elevationZones.lowland}, Highland ${climate.elevationZones.highland}, Mountain ${climate.elevationZones.mountain}`);
  }).catch(console.error);
}

export { terrainGenerationExample, analyzeTerrainConnectivity, analyzeClimate };