export { NoiseGenerator, NoiseConfig, NoiseType } from './core/NoiseGenerator';
export {
  TerrainGenerator,
  TerrainConfig,
  BiomeConfig,
  HeightmapData,
  TerrainFeature
} from './core/TerrainGenerator';
export {
  CityGenerator,
  CityConfig,
  District,
  Building,
  Road,
  UtilityNetwork,
  CityLayout
} from './core/CityGenerator';
export {
  UnityExporter,
  UnityTerrainData,
  UnityCityData,
  UnityMeshData,
  ProceduralGenerationUnityExport
} from './utils/UnityExporter';

import { NoiseGenerator } from './core/NoiseGenerator';
import { TerrainGenerator, TerrainConfig, HeightmapData } from './core/TerrainGenerator';
import { CityGenerator, CityConfig, CityLayout } from './core/CityGenerator';
import { UnityExporter } from './utils/UnityExporter';

// Main procedural generation simulation class
export class ProceduralGenerationSimulation {
  private terrainGenerator: TerrainGenerator;
  private cityGenerator: CityGenerator;
  private unityExporter: UnityExporter;
  private seed: number;
  private generatedTerrain?: HeightmapData;
  private generatedCity?: CityLayout;

  constructor(config?: { worldSize?: { width: number; height: number }; seed?: number }) {
    this.seed = config?.seed || Date.now();
    this.terrainGenerator = new TerrainGenerator(this.seed);
    this.cityGenerator = new CityGenerator(this.seed);
    this.unityExporter = new UnityExporter(this.seed);

    // Generate default terrain on construction for Unity compatibility
    this.generateDefaultWorld(config?.worldSize);
  }

  // Generate complete world with terrain and cities
  generateWorld(
    terrainConfig: TerrainConfig,
    cityConfigs: CityConfig[] = []
  ): {
    terrain: HeightmapData;
    cities: CityLayout[];
  } {
    console.log(`🌍 Starting world generation with seed: ${this.seed}`);

    // Generate terrain first
    console.log('🏔️ Generating terrain...');
    this.generatedTerrain = this.terrainGenerator.generateTerrain(terrainConfig);

    // Generate cities on the terrain
    const cities: CityLayout[] = [];
    console.log(`🏙️ Generating ${cityConfigs.length} cities...`);

    for (let i = 0; i < cityConfigs.length; i++) {
      const config = cityConfigs[i];
      console.log(`  📍 Generating ${config.name} (${config.size} ${config.economicFocus} city)...`);

      const city = this.cityGenerator.generateCity(config, this.generatedTerrain.elevations);
      cities.push(city);

      if (i === 0) {
        this.generatedCity = city; // Store first city for exports
      }
    }

    console.log(`✅ World generation complete!`);
    console.log(`   - Terrain: ${terrainConfig.width}x${terrainConfig.height}`);
    console.log(`   - Cities: ${cities.length}`);
    console.log(`   - Total districts: ${cities.reduce((sum, city) => sum + city.districts.length, 0)}`);
    console.log(`   - Total buildings: ${cities.reduce((sum, city) => sum + city.buildings.length, 0)}`);

    return {
      terrain: this.generatedTerrain,
      cities
    };
  }

  // Generate just terrain
  generateTerrain(config: TerrainConfig): HeightmapData {
    console.log('🏔️ Generating terrain only...');
    this.generatedTerrain = this.terrainGenerator.generateTerrain(config);
    return this.generatedTerrain;
  }

  // Generate just a city
  generateCity(config: CityConfig, terrainData?: HeightmapData): CityLayout {
    console.log(`🏙️ Generating city: ${config.name}`);
    const elevations = terrainData?.elevations;
    this.generatedCity = this.cityGenerator.generateCity(config, elevations);
    return this.generatedCity;
  }

  // Add terrain features to existing terrain
  addTerrainFeature(
    feature: 'mountain' | 'valley' | 'plateau' | 'canyon' | 'ridge' | 'crater',
    x: number,
    y: number,
    size: number,
    intensity: number = 1
  ): void {
    if (!this.generatedTerrain) {
      throw new Error('No terrain generated yet. Call generateTerrain() first.');
    }

    this.terrainGenerator.addTerrainFeature(
      this.generatedTerrain.elevations,
      feature,
      x,
      y,
      size,
      intensity
    );
  }

  // Scenario generators
  generateIslandScenario(size: 'small' | 'medium' | 'large' = 'medium'): {
    terrain: HeightmapData;
    cities: CityLayout[];
  } {
    const dimensions = {
      small: { width: 512, height: 512 },
      medium: { width: 1024, height: 1024 },
      large: { width: 2048, height: 2048 }
    };

    const dim = dimensions[size];

    const terrainConfig: TerrainConfig = {
      width: dim.width,
      height: dim.height,
      minElevation: -50,
      maxElevation: 500,
      seaLevel: 0,
      noiseConfig: {
        seed: this.seed,
        octaves: 6,
        persistence: 0.5,
        scale: 0.01,
        lacunarity: 2.0,
        amplitude: 1.0,
        frequency: 1.0
      },
      erosionStrength: 0.3,
      riversEnabled: true,
      lakesEnabled: true
    };

    const cityConfigs: CityConfig[] = [
      {
        name: 'Port City',
        size: size === 'large' ? 'large' : 'medium',
        population: size === 'large' ? 500000 : size === 'medium' ? 200000 : 50000,
        economicFocus: 'mixed',
        terrainFactor: 0.7,
        gridLayout: false,
        riverPresent: true,
        coastalCity: true
      }
    ];

    if (size === 'large') {
      cityConfigs.push({
        name: 'Mountain Town',
        size: 'small',
        population: 25000,
        economicFocus: 'industrial',
        terrainFactor: 0.9,
        gridLayout: false,
        riverPresent: false,
        coastalCity: false
      });
    }

    return this.generateWorld(terrainConfig, cityConfigs);
  }

  generateContinentalScenario(): {
    terrain: HeightmapData;
    cities: CityLayout[];
  } {
    const terrainConfig: TerrainConfig = {
      width: 2048,
      height: 1536,
      minElevation: -100,
      maxElevation: 1000,
      seaLevel: 0,
      noiseConfig: {
        seed: this.seed,
        octaves: 8,
        persistence: 0.6,
        scale: 0.005,
        lacunarity: 2.2,
        amplitude: 1.0,
        frequency: 1.0
      },
      erosionStrength: 0.4,
      riversEnabled: true,
      lakesEnabled: true
    };

    const cityConfigs: CityConfig[] = [
      {
        name: 'Capital City',
        size: 'metropolis',
        population: 2000000,
        economicFocus: 'mixed',
        terrainFactor: 0.3,
        gridLayout: true,
        riverPresent: true,
        coastalCity: false
      },
      {
        name: 'Harbor City',
        size: 'large',
        population: 800000,
        economicFocus: 'commercial',
        terrainFactor: 0.5,
        gridLayout: false,
        riverPresent: false,
        coastalCity: true
      },
      {
        name: 'Industrial Center',
        size: 'medium',
        population: 300000,
        economicFocus: 'industrial',
        terrainFactor: 0.6,
        gridLayout: true,
        riverPresent: true,
        coastalCity: false
      },
      {
        name: 'Resort Town',
        size: 'small',
        population: 50000,
        economicFocus: 'residential',
        terrainFactor: 0.8,
        gridLayout: false,
        riverPresent: false,
        coastalCity: true
      }
    ];

    return this.generateWorld(terrainConfig, cityConfigs);
  }

  generateArchiapelagoScenario(): {
    terrain: HeightmapData;
    cities: CityLayout[];
  } {
    const terrainConfig: TerrainConfig = {
      width: 1536,
      height: 1536,
      minElevation: -200,
      maxElevation: 800,
      seaLevel: 0,
      noiseConfig: {
        seed: this.seed,
        octaves: 7,
        persistence: 0.4,
        scale: 0.008,
        lacunarity: 2.5,
        amplitude: 1.2,
        frequency: 0.8
      },
      erosionStrength: 0.2,
      riversEnabled: true,
      lakesEnabled: false
    };

    const world = this.generateWorld(terrainConfig, []);

    // Add volcanic islands
    const islandCenters = [
      { x: 400, y: 400 },
      { x: 800, y: 300 },
      { x: 1200, y: 600 },
      { x: 600, y: 900 },
      { x: 1000, y: 1100 }
    ];

    for (const center of islandCenters) {
      this.addTerrainFeature('mountain', center.x, center.y, 150, 1.5);

      // Add crater on top
      this.addTerrainFeature('crater', center.x, center.y, 50, 0.8);
    }

    // Generate cities on larger islands
    const cities: CityLayout[] = [
      this.generateCity({
        name: 'Main Port',
        size: 'large',
        population: 400000,
        economicFocus: 'commercial',
        terrainFactor: 0.7,
        gridLayout: false,
        riverPresent: false,
        coastalCity: true
      }, world.terrain),

      this.generateCity({
        name: 'Island Village',
        size: 'small',
        population: 15000,
        economicFocus: 'residential',
        terrainFactor: 0.9,
        gridLayout: false,
        riverPresent: false,
        coastalCity: true
      }, world.terrain)
    ];

    return {
      terrain: world.terrain,
      cities
    };
  }

  // Analysis and statistics
  getTerrainStatistics(): {
    totalArea: number;
    landArea: number;
    waterArea: number;
    averageElevation: number;
    highestPoint: number;
    lowestPoint: number;
    biomeDistribution: { [biome: string]: number };
  } | null {
    if (!this.generatedTerrain) {
      return null;
    }

    const terrain = this.generatedTerrain;
    const totalCells = terrain.width * terrain.height;
    let landCells = 0;
    let totalElevation = 0;
    let highest = -Infinity;
    let lowest = Infinity;
    const biomeCount: { [biome: string]: number } = {};

    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        const elevation = terrain.elevations[y][x];
        const biome = terrain.biomes[y][x];

        totalElevation += elevation;
        highest = Math.max(highest, elevation);
        lowest = Math.min(lowest, elevation);

        if (elevation > 0) landCells++;

        biomeCount[biome] = (biomeCount[biome] || 0) + 1;
      }
    }

    // Convert counts to percentages
    const biomeDistribution: { [biome: string]: number } = {};
    for (const biome in biomeCount) {
      biomeDistribution[biome] = (biomeCount[biome] / totalCells) * 100;
    }

    return {
      totalArea: totalCells,
      landArea: landCells,
      waterArea: totalCells - landCells,
      averageElevation: totalElevation / totalCells,
      highestPoint: highest,
      lowestPoint: lowest,
      biomeDistribution
    };
  }

  getCityStatistics(): {
    totalCities: number;
    totalPopulation: number;
    totalBuildings: number;
    totalDistricts: number;
    economicBreakdown: { [focus: string]: number };
    sizeBreakdown: { [size: string]: number };
  } | null {
    if (!this.generatedCity) {
      return null;
    }

    // For now, return stats for the single stored city
    // In a full implementation, this would track all cities
    const city = this.generatedCity;

    const economicBreakdown: { [focus: string]: number } = {};
    economicBreakdown[city.config.economicFocus] = 1;

    const sizeBreakdown: { [size: string]: number } = {};
    sizeBreakdown[city.config.size] = 1;

    return {
      totalCities: 1,
      totalPopulation: city.config.population,
      totalBuildings: city.buildings.length,
      totalDistricts: city.districts.length,
      economicBreakdown,
      sizeBreakdown
    };
  }

  // Export functionality
  exportState(): string {
    if (!this.generatedTerrain) {
      throw new Error('No terrain to export. Generate terrain first.');
    }

    const data = this.unityExporter.exportComplete(
      this.generatedTerrain,
      this.generatedCity || this.generateDefaultCity()
    );

    // Add Unity-compatible timestamp fields
    (data as any).timestamp = Date.now();
    (data as any).currentTime = Date.now();

    return JSON.stringify(data, null, 2);
  }

  exportTerrain(): string {
    if (!this.generatedTerrain) {
      throw new Error('No terrain to export. Generate terrain first.');
    }

    const terrainData = this.unityExporter.exportTerrain(this.generatedTerrain);
    return JSON.stringify(terrainData, null, 2);
  }

  exportCity(): string {
    if (!this.generatedCity) {
      throw new Error('No city to export. Generate city first.');
    }

    const cityData = this.unityExporter.exportCity(this.generatedCity);
    return JSON.stringify(cityData, null, 2);
  }

  private generateDefaultCity(): CityLayout {
    return this.cityGenerator.generateCity({
      name: 'Default City',
      size: 'medium',
      population: 100000,
      economicFocus: 'mixed',
      terrainFactor: 0.5,
      gridLayout: true,
      riverPresent: false,
      coastalCity: false
    });
  }

  // Utility methods
  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.terrainGenerator.setSeed(seed);
    this.cityGenerator.setSeed(seed);
    this.unityExporter.setSeed(seed);
  }

  getGeneratedTerrain(): HeightmapData | null {
    return this.generatedTerrain || null;
  }

  getGeneratedCity(): CityLayout | null {
    return this.generatedCity || null;
  }

  reset(): void {
    this.generatedTerrain = undefined;
    this.generatedCity = undefined;
  }

  private generateDefaultWorld(worldSize?: { width: number; height: number }): void {
    const size = worldSize || { width: 64, height: 64 };

    const terrainConfig: TerrainConfig = {
      width: size.width,
      height: size.height,
      minElevation: -50,
      maxElevation: 200,
      seaLevel: 0,
      noiseConfig: {
        seed: this.seed,
        octaves: 6,
        persistence: 0.5,
        scale: 0.01,
        lacunarity: 2.0,
        amplitude: 1.0,
        frequency: 1.0
      },
      erosionStrength: 0.3,
      riversEnabled: true,
      lakesEnabled: true
    };

    const cityConfig: CityConfig = {
      name: 'Default City',
      size: 'medium',
      population: 50000,
      economicFocus: 'mixed',
      terrainFactor: 0.5,
      gridLayout: true,
      riverPresent: false,
      coastalCity: false
    };

    const world = this.generateWorld(terrainConfig, [cityConfig]);
    this.generatedTerrain = world.terrain;
    this.generatedCity = world.cities[0];
  }
}

// Main class alias for Unity compatibility
export class ProceduralGenerationEngine extends ProceduralGenerationSimulation {}