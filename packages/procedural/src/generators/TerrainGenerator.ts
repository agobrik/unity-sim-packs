import { NoiseGenerator } from './NoiseGenerator';
import {
  TerrainConfig,
  TerrainPoint,
  BiomeDefinition,
  BiomeType,
  TerrainType,
  VegetationInstance,
  StructureInstance,
  ErosionSettings,
  GenerationContext
} from '../types';

export class TerrainGenerator {
  private config: TerrainConfig;
  private elevationNoise!: NoiseGenerator;
  private temperatureNoise!: NoiseGenerator;
  private humidityNoise!: NoiseGenerator;
  private detailNoise!: NoiseGenerator;

  constructor(config: TerrainConfig) {
    this.config = config;
    this.initializeNoiseGenerators();
  }

  private initializeNoiseGenerators(): void {
    const baseSeed = this.config.noiseConfig.seed;

    this.elevationNoise = new NoiseGenerator({
      ...this.config.noiseConfig,
      seed: baseSeed
    });

    this.temperatureNoise = new NoiseGenerator({
      ...this.config.noiseConfig,
      seed: baseSeed + 1000,
      frequency: this.config.noiseConfig.frequency * 0.5,
      octaves: 3
    });

    this.humidityNoise = new NoiseGenerator({
      ...this.config.noiseConfig,
      seed: baseSeed + 2000,
      frequency: this.config.noiseConfig.frequency * 0.7,
      octaves: 4
    });

    this.detailNoise = new NoiseGenerator({
      ...this.config.noiseConfig,
      seed: baseSeed + 3000,
      frequency: this.config.noiseConfig.frequency * 4,
      octaves: 2,
      amplitude: 0.1
    });
  }

  public generate(context?: GenerationContext): TerrainPoint[][] {
    const terrain: TerrainPoint[][] = [];

    // Generate base terrain
    for (let y = 0; y < this.config.height; y++) {
      terrain[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        terrain[y][x] = this.generatePoint(x, y);
      }

      // Report progress if context is provided
      if (context?.options.progressCallback) {
        const progress = y / this.config.height;
        context.options.progressCallback(progress * 0.5, 'Generating base terrain');
      }
    }

    // Apply erosion if configured
    if (this.config.erosionSettings) {
      this.applyErosion(terrain, this.config.erosionSettings);
    }

    // Generate vegetation and structures
    this.populateTerrain(terrain, context);

    return terrain;
  }

  private generatePoint(x: number, y: number): TerrainPoint {
    // Generate base elevation
    const rawElevation = this.elevationNoise.generate2D(x, y);
    const normalizedElevation = this.elevationNoise.normalize(rawElevation, 0, 1);
    const elevation = normalizedElevation * this.config.heightMultiplier;

    // Generate temperature (affected by elevation and latitude)
    const latitudeFactor = Math.abs((y - this.config.height / 2) / (this.config.height / 2));
    const elevationFactor = Math.max(0, 1 - elevation / this.config.heightMultiplier);
    const rawTemperature = this.temperatureNoise.generate2D(x, y);
    const baseTemperature = this.temperatureNoise.normalize(rawTemperature, -1, 1);
    const temperature = baseTemperature * elevationFactor * (1 - latitudeFactor * 0.7);

    // Generate humidity (affected by elevation and distance from water)
    const rawHumidity = this.humidityNoise.generate2D(x, y);
    const baseHumidity = this.humidityNoise.normalize(rawHumidity, -1, 1);
    const humidity = baseHumidity * (1 - elevation / this.config.heightMultiplier * 0.3);

    // Determine biome
    const biome = this.determineBiome(elevation, temperature, humidity);

    return {
      x,
      y,
      elevation,
      temperature,
      humidity,
      biome: biome.id,
      vegetation: [],
      structures: []
    };
  }

  private determineBiome(elevation: number, temperature: number, humidity: number): BiomeDefinition {
    // Find the best matching biome based on conditions
    let bestBiome = this.config.biomes[0];
    let bestScore = -Infinity;

    for (const biome of this.config.biomes) {
      let score = 0;

      // Check elevation
      if (elevation >= biome.elevation.min && elevation <= biome.elevation.max) {
        score += 100;
      } else {
        const elevationDistance = Math.min(
          Math.abs(elevation - biome.elevation.min),
          Math.abs(elevation - biome.elevation.max)
        );
        score -= elevationDistance * 10;
      }

      // Check temperature
      if (temperature >= biome.temperature.min && temperature <= biome.temperature.max) {
        score += 100;
      } else {
        const temperatureDistance = Math.min(
          Math.abs(temperature - biome.temperature.min),
          Math.abs(temperature - biome.temperature.max)
        );
        score -= temperatureDistance * 10;
      }

      // Check humidity
      if (humidity >= biome.humidity.min && humidity <= biome.humidity.max) {
        score += 100;
      } else {
        const humidityDistance = Math.min(
          Math.abs(humidity - biome.humidity.min),
          Math.abs(humidity - biome.humidity.max)
        );
        score -= humidityDistance * 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestBiome = biome;
      }
    }

    return bestBiome;
  }

  private populateTerrain(terrain: TerrainPoint[][], context?: GenerationContext): void {
    for (let y = 0; y < terrain.length; y++) {
      for (let x = 0; x < terrain[y].length; x++) {
        const point = terrain[y][x];
        const biome = this.config.biomes.find(b => b.id === point.biome);

        if (biome) {
          // Generate vegetation
          point.vegetation = this.generateVegetation(point, biome, context);

          // Generate structures
          point.structures = this.generateStructures(point, biome, terrain, context);
        }
      }

      // Report progress
      if (context?.options.progressCallback) {
        const progress = 0.5 + (y / terrain.length) * 0.5;
        context.options.progressCallback(progress, 'Populating terrain');
      }
    }
  }

  private generateVegetation(
    point: TerrainPoint,
    biome: BiomeDefinition,
    context?: GenerationContext
  ): VegetationInstance[] {
    const vegetation: VegetationInstance[] = [];
    const random = context?.random || Math.random;

    for (const rule of biome.vegetation) {
      // Check conditions
      if (!this.checkVegetationConditions(point, rule)) {
        continue;
      }

      // Roll for generation
      if (random() > rule.probability) {
        continue;
      }

      // Generate multiple instances based on density
      const count = Math.floor(rule.density * (0.5 + random() * 0.5));

      for (let i = 0; i < count; i++) {
        const instance: VegetationInstance = {
          type: rule.type,
          x: point.x + (random() - 0.5) * 0.8, // Slight position variation
          y: point.y + (random() - 0.5) * 0.8,
          size: rule.minSize + random() * (rule.maxSize - rule.minSize),
          health: 0.8 + random() * 0.2, // 80-100% health
          age: random() * 100 // Random age 0-100
        };

        vegetation.push(instance);
      }
    }

    return vegetation;
  }

  private checkVegetationConditions(point: TerrainPoint, rule: any): boolean {
    for (const condition of rule.conditions) {
      let value: number;

      switch (condition.property) {
        case 'elevation':
          value = point.elevation;
          break;
        case 'temperature':
          value = point.temperature;
          break;
        case 'humidity':
          value = point.humidity;
          break;
        case 'slope':
          value = this.calculateSlope(point);
          break;
        default:
          continue;
      }

      if (value < condition.min || value > condition.max) {
        return false;
      }
    }

    return true;
  }

  private generateStructures(
    point: TerrainPoint,
    biome: BiomeDefinition,
    terrain: TerrainPoint[][],
    context?: GenerationContext
  ): StructureInstance[] {
    const structures: StructureInstance[] = [];
    const random = context?.random || Math.random;

    for (const rule of biome.structures) {
      // Check conditions
      if (!this.checkStructureConditions(point, rule, terrain)) {
        continue;
      }

      // Roll for generation
      if (random() > rule.probability) {
        continue;
      }

      // Check minimum distance from other structures
      if (!this.checkMinimumDistance(point, terrain, rule.minDistance)) {
        continue;
      }

      const structure: StructureInstance = {
        type: rule.type,
        x: point.x,
        y: point.y,
        z: point.elevation,
        width: rule.size.width,
        height: rule.size.height,
        depth: rule.size.depth,
        rotation: random() * 360,
        metadata: {
          biome: biome.id,
          generatedAt: Date.now()
        }
      };

      structures.push(structure);
    }

    return structures;
  }

  private checkStructureConditions(
    point: TerrainPoint,
    rule: any,
    terrain: TerrainPoint[][]
  ): boolean {
    for (const condition of rule.conditions) {
      switch (condition.property) {
        case 'elevation':
          if (condition.operator === 'greater' && point.elevation <= condition.value) return false;
          if (condition.operator === 'less' && point.elevation >= condition.value) return false;
          if (condition.operator === 'equals' && Math.abs(point.elevation - condition.value) > 0.1) return false;
          break;

        case 'biome':
          if (condition.operator === 'equals' && point.biome !== condition.value) return false;
          if (condition.operator === 'contains' && !point.biome.includes(condition.value)) return false;
          break;

        case 'proximity':
          // Check proximity to other features (simplified)
          const proximityMet = this.checkProximityCondition(point, terrain, condition);
          if (!proximityMet) return false;
          break;
      }
    }

    return true;
  }

  private checkProximityCondition(
    point: TerrainPoint,
    terrain: TerrainPoint[][],
    condition: any
  ): boolean {
    // Simplified proximity check - could be expanded
    return true;
  }

  private checkMinimumDistance(
    point: TerrainPoint,
    terrain: TerrainPoint[][],
    minDistance: number
  ): boolean {
    const searchRadius = Math.ceil(minDistance);

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const checkX = point.x + dx;
        const checkY = point.y + dy;

        if (checkX < 0 || checkX >= terrain[0].length || checkY < 0 || checkY >= terrain.length) {
          continue;
        }

        const checkPoint = terrain[checkY][checkX];
        if (checkPoint.structures.length > 0) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private calculateSlope(point: TerrainPoint): number {
    // Simplified slope calculation - would need neighboring points in real implementation
    return 0;
  }

  private applyErosion(terrain: TerrainPoint[][], erosionSettings: ErosionSettings): void {
    // Simplified hydraulic erosion simulation
    for (let iteration = 0; iteration < erosionSettings.iterations; iteration++) {
      for (let y = 1; y < terrain.length - 1; y++) {
        for (let x = 1; x < terrain[y].length - 1; x++) {
          this.simulateWaterDrop(terrain, x, y, erosionSettings);
        }
      }
    }
  }

  private simulateWaterDrop(
    terrain: TerrainPoint[][],
    startX: number,
    startY: number,
    settings: ErosionSettings
  ): void {
    let x = startX;
    let y = startY;
    let water = 1.0;
    let sediment = 0.0;
    let velocity = 1.0;

    // Simulate water drop movement
    for (let step = 0; step < 100; step++) {
      const currentHeight = terrain[y][x].elevation;

      // Find steepest descent
      let bestX = x;
      let bestY = y;
      let bestHeight = currentHeight;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const newX = x + dx;
          const newY = y + dy;

          if (newX < 0 || newX >= terrain[0].length || newY < 0 || newY >= terrain.length) {
            continue;
          }

          const height = terrain[newY][newX].elevation;
          if (height < bestHeight) {
            bestX = newX;
            bestY = newY;
            bestHeight = height;
          }
        }
      }

      // If no lower point found, deposit sediment and stop
      if (bestX === x && bestY === y) {
        terrain[y][x].elevation += sediment * settings.depositionSpeed;
        break;
      }

      // Calculate erosion capacity
      const heightDiff = currentHeight - bestHeight;
      const capacity = Math.max(0.01, velocity * water * heightDiff * settings.sedimentCapacity);

      // Erode or deposit
      if (sediment > capacity) {
        // Deposit excess sediment
        const deposit = (sediment - capacity) * settings.depositionSpeed;
        terrain[y][x].elevation += deposit;
        sediment -= deposit;
      } else {
        // Pick up sediment
        const pickup = Math.min(capacity - sediment, settings.erosionSpeed);
        terrain[y][x].elevation -= pickup;
        sediment += pickup;
      }

      // Update position and properties
      x = bestX;
      y = bestY;
      velocity = Math.sqrt(velocity * velocity + heightDiff);
      water *= (1 - settings.evaporationRate);

      // Stop if water evaporated
      if (water < 0.01) break;
    }
  }

  // Utility methods
  public getTerrainStats(terrain: TerrainPoint[][]): {
    minElevation: number;
    maxElevation: number;
    avgElevation: number;
    biomeDistribution: Record<string, number>;
    vegetationCount: number;
    structureCount: number;
  } {
    let minElevation = Infinity;
    let maxElevation = -Infinity;
    let totalElevation = 0;
    let totalPoints = 0;
    let vegetationCount = 0;
    let structureCount = 0;
    const biomeDistribution: Record<string, number> = {};

    for (const row of terrain) {
      for (const point of row) {
        minElevation = Math.min(minElevation, point.elevation);
        maxElevation = Math.max(maxElevation, point.elevation);
        totalElevation += point.elevation;
        totalPoints++;

        biomeDistribution[point.biome] = (biomeDistribution[point.biome] || 0) + 1;
        vegetationCount += point.vegetation.length;
        structureCount += point.structures.length;
      }
    }

    return {
      minElevation,
      maxElevation,
      avgElevation: totalElevation / totalPoints,
      biomeDistribution,
      vegetationCount,
      structureCount
    };
  }

  public exportTerrain(terrain: TerrainPoint[][]): string {
    return JSON.stringify({
      config: this.config,
      terrain: terrain.map(row =>
        row.map(point => ({
          x: point.x,
          y: point.y,
          elevation: point.elevation,
          temperature: point.temperature,
          humidity: point.humidity,
          biome: point.biome
          // Note: Vegetation and structures omitted for size
        }))
      )
    });
  }

  public static createDefaultBiomes(): BiomeDefinition[] {
    return [
      {
        id: 'ocean',
        name: 'Ocean',
        temperature: { min: -0.2, max: 0.8 },
        humidity: { min: 0.8, max: 1.0 },
        elevation: { min: 0, max: 0.1 },
        color: { r: 0, g: 100, b: 200 },
        vegetation: [],
        structures: []
      },
      {
        id: 'beach',
        name: 'Beach',
        temperature: { min: 0.3, max: 0.9 },
        humidity: { min: 0.4, max: 0.8 },
        elevation: { min: 0.1, max: 0.15 },
        color: { r: 255, g: 255, b: 200 },
        vegetation: [
          {
            type: 'palm_tree',
            density: 0.3,
            minSize: 0.8,
            maxSize: 1.2,
            probability: 0.4,
            conditions: []
          }
        ],
        structures: []
      },
      {
        id: 'grassland',
        name: 'Grassland',
        temperature: { min: 0.0, max: 0.7 },
        humidity: { min: 0.3, max: 0.8 },
        elevation: { min: 0.15, max: 0.6 },
        color: { r: 100, g: 200, b: 100 },
        vegetation: [
          {
            type: 'grass',
            density: 2.0,
            minSize: 0.1,
            maxSize: 0.3,
            probability: 0.9,
            conditions: []
          },
          {
            type: 'tree',
            density: 0.1,
            minSize: 0.8,
            maxSize: 1.5,
            probability: 0.2,
            conditions: []
          }
        ],
        structures: []
      },
      {
        id: 'forest',
        name: 'Forest',
        temperature: { min: -0.1, max: 0.6 },
        humidity: { min: 0.5, max: 1.0 },
        elevation: { min: 0.2, max: 0.8 },
        color: { r: 50, g: 150, b: 50 },
        vegetation: [
          {
            type: 'tree',
            density: 1.5,
            minSize: 1.0,
            maxSize: 2.0,
            probability: 0.8,
            conditions: []
          },
          {
            type: 'bush',
            density: 0.8,
            minSize: 0.3,
            maxSize: 0.8,
            probability: 0.6,
            conditions: []
          }
        ],
        structures: []
      },
      {
        id: 'mountain',
        name: 'Mountain',
        temperature: { min: -1.0, max: 0.2 },
        humidity: { min: 0.1, max: 0.7 },
        elevation: { min: 0.8, max: 1.0 },
        color: { r: 150, g: 150, b: 150 },
        vegetation: [
          {
            type: 'pine_tree',
            density: 0.2,
            minSize: 0.5,
            maxSize: 1.0,
            probability: 0.3,
            conditions: [
              { property: 'elevation', min: 0.8, max: 0.9 }
            ]
          }
        ],
        structures: []
      },
      {
        id: 'desert',
        name: 'Desert',
        temperature: { min: 0.5, max: 1.0 },
        humidity: { min: -1.0, max: 0.2 },
        elevation: { min: 0.1, max: 0.7 },
        color: { r: 255, g: 200, b: 100 },
        vegetation: [
          {
            type: 'cactus',
            density: 0.1,
            minSize: 0.3,
            maxSize: 1.2,
            probability: 0.3,
            conditions: []
          }
        ],
        structures: []
      }
    ];
  }
}