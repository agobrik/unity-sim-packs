import { NoiseGenerator, NoiseConfig } from './NoiseGenerator';

export interface TerrainConfig {
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
  seaLevel: number;
  noiseConfig: NoiseConfig;
  erosionStrength: number;
  riversEnabled: boolean;
  lakesEnabled: boolean;
}

export interface BiomeConfig {
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  elevation: { min: number; max: number };
  name: string;
  color: string;
  vegetation: number; // 0-1 density
  fertility: number; // 0-1 soil quality
  resources: string[];
}

export interface HeightmapData {
  width: number;
  height: number;
  elevations: number[][];
  temperatures: number[][];
  humidity: number[][];
  biomes: string[][];
  rivers: { x: number; y: number }[][];
  lakes: { x: number; y: number; radius: number }[];
}

export type TerrainFeature = 'mountain' | 'valley' | 'plateau' | 'canyon' | 'ridge' | 'crater';

export class TerrainGenerator {
  private noise: NoiseGenerator;
  private biomes: BiomeConfig[] = [];

  constructor(seed: number = 0) {
    this.noise = new NoiseGenerator(seed);
    this.initializeBiomes();
  }

  private initializeBiomes(): void {
    this.biomes = [
      {
        name: 'arctic',
        temperature: { min: -20, max: 0 },
        humidity: { min: 0, max: 0.3 },
        elevation: { min: -1, max: 1 },
        color: '#E8F4F8',
        vegetation: 0.1,
        fertility: 0.2,
        resources: ['ice', 'fish', 'seals']
      },
      {
        name: 'tundra',
        temperature: { min: -10, max: 5 },
        humidity: { min: 0.2, max: 0.6 },
        elevation: { min: 0, max: 0.3 },
        color: '#B8C6A0',
        vegetation: 0.3,
        fertility: 0.4,
        resources: ['caribou', 'lichens', 'peat']
      },
      {
        name: 'taiga',
        temperature: { min: -5, max: 15 },
        humidity: { min: 0.4, max: 0.8 },
        elevation: { min: 0, max: 0.6 },
        color: '#4A6741',
        vegetation: 0.7,
        fertility: 0.6,
        resources: ['timber', 'fur', 'berries', 'minerals']
      },
      {
        name: 'temperate_grassland',
        temperature: { min: 0, max: 25 },
        humidity: { min: 0.3, max: 0.7 },
        elevation: { min: 0, max: 0.4 },
        color: '#7FB069',
        vegetation: 0.6,
        fertility: 0.8,
        resources: ['wheat', 'cattle', 'horses']
      },
      {
        name: 'temperate_forest',
        temperature: { min: 5, max: 25 },
        humidity: { min: 0.5, max: 0.9 },
        elevation: { min: 0, max: 0.7 },
        color: '#355E3B',
        vegetation: 0.9,
        fertility: 0.9,
        resources: ['hardwood', 'game', 'mushrooms', 'herbs']
      },
      {
        name: 'subtropical_desert',
        temperature: { min: 15, max: 45 },
        humidity: { min: 0, max: 0.2 },
        elevation: { min: 0, max: 0.5 },
        color: '#FAD5A5',
        vegetation: 0.1,
        fertility: 0.2,
        resources: ['sand', 'cacti', 'oil', 'salt']
      },
      {
        name: 'tropical_rainforest',
        temperature: { min: 20, max: 35 },
        humidity: { min: 0.8, max: 1.0 },
        elevation: { min: 0, max: 0.6 },
        color: '#013220',
        vegetation: 1.0,
        fertility: 0.7,
        resources: ['exotic_timber', 'rubber', 'coffee', 'spices', 'medicines']
      },
      {
        name: 'tropical_savanna',
        temperature: { min: 20, max: 35 },
        humidity: { min: 0.3, max: 0.8 },
        elevation: { min: 0, max: 0.4 },
        color: '#DAA520',
        vegetation: 0.5,
        fertility: 0.6,
        resources: ['acacia', 'wildlife', 'gold', 'diamonds']
      },
      {
        name: 'mountain',
        temperature: { min: -15, max: 10 },
        humidity: { min: 0.2, max: 0.8 },
        elevation: { min: 0.6, max: 1.0 },
        color: '#8B7765',
        vegetation: 0.3,
        fertility: 0.3,
        resources: ['stone', 'metals', 'gems', 'snow']
      },
      {
        name: 'coastal',
        temperature: { min: 5, max: 25 },
        humidity: { min: 0.6, max: 1.0 },
        elevation: { min: -0.1, max: 0.1 },
        color: '#87CEEB',
        vegetation: 0.4,
        fertility: 0.5,
        resources: ['fish', 'salt', 'seaweed', 'shells']
      }
    ];
  }

  generateTerrain(config: TerrainConfig): HeightmapData {
    const elevations: number[][] = [];
    const temperatures: number[][] = [];
    const humidity: number[][] = [];
    const biomes: string[][] = [];

    // Generate base heightmap
    this.generateHeightmap(config, elevations);

    // Apply erosion
    if (config.erosionStrength > 0) {
      this.applyErosion(elevations, config);
    }

    // Generate climate data
    this.generateTemperatureMap(elevations, temperatures, config);
    this.generateHumidityMap(elevations, humidity, config);

    // Determine biomes
    this.generateBiomeMap(elevations, temperatures, humidity, biomes, config);

    // Generate rivers and lakes
    const rivers: { x: number; y: number }[][] = [];
    const lakes: { x: number; y: number; radius: number }[] = [];

    if (config.riversEnabled) {
      this.generateRivers(elevations, rivers, config);
    }

    if (config.lakesEnabled) {
      this.generateLakes(elevations, lakes, config);
    }

    return {
      width: config.width,
      height: config.height,
      elevations,
      temperatures,
      humidity,
      biomes,
      rivers,
      lakes
    };
  }

  private generateHeightmap(config: TerrainConfig, elevations: number[][]): void {
    for (let y = 0; y < config.height; y++) {
      elevations[y] = [];
      for (let x = 0; x < config.width; x++) {
        // Base terrain using FBM
        let height = this.noise.fbm2D(x, y, config.noiseConfig);

        // Add continental shelf effect (higher in center, lower at edges)
        const centerX = config.width / 2;
        const centerY = config.height / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        const continentalFactor = 1 - Math.pow(distanceFromCenter / maxDistance, 2);

        height *= continentalFactor;

        // Normalize to elevation range
        height = (height + 1) / 2; // Convert from [-1, 1] to [0, 1]
        height = config.minElevation + height * (config.maxElevation - config.minElevation);

        elevations[y][x] = height;
      }
    }
  }

  private applyErosion(elevations: number[][], config: TerrainConfig): void {
    const erosionIterations = Math.floor(config.erosionStrength * 10);

    for (let i = 0; i < erosionIterations; i++) {
      const newElevations = elevations.map(row => [...row]);

      for (let y = 1; y < config.height - 1; y++) {
        for (let x = 1; x < config.width - 1; x++) {
          // Thermal erosion - material flows to lower neighbors
          const current = elevations[y][x];
          let sediment = 0;
          let flow = 0;

          // Check all 8 neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;

              const neighbor = elevations[y + dy][x + dx];
              const heightDiff = current - neighbor;

              if (heightDiff > 0.01) { // Threshold for erosion
                const erosionRate = config.erosionStrength * 0.1 * heightDiff;
                sediment += erosionRate;
                flow++;
              }
            }
          }

          if (flow > 0) {
            newElevations[y][x] = current - sediment * 0.5;

            // Distribute sediment to lower neighbors
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                const neighbor = elevations[y + dy][x + dx];
                if (current > neighbor) {
                  newElevations[y + dy][x + dx] += (sediment / flow) * 0.3;
                }
              }
            }
          }
        }
      }

      // Copy back the eroded values
      for (let y = 0; y < config.height; y++) {
        for (let x = 0; x < config.width; x++) {
          elevations[y][x] = newElevations[y][x];
        }
      }
    }
  }

  private generateTemperatureMap(elevations: number[][], temperatures: number[][], config: TerrainConfig): void {
    for (let y = 0; y < config.height; y++) {
      temperatures[y] = [];
      for (let x = 0; x < config.width; x++) {
        // Base temperature based on latitude (y coordinate)
        const latitude = (y / config.height) * 180 - 90; // -90 to +90 degrees
        let baseTemp = 30 - Math.abs(latitude) * 0.8; // Warmer at equator, cooler at poles

        // Elevation affects temperature (lapse rate)
        const elevation = elevations[y][x];
        const temperatureLapse = elevation > config.seaLevel ?
          (elevation - config.seaLevel) * 6.5 : 0; // 6.5°C per 1000m

        // Seasonal and random variation
        const tempVariation = this.noise.perlin2D(x * 0.01, y * 0.01) * 10;

        let temperature = baseTemp - temperatureLapse + tempVariation;

        // Ocean moderation effect
        if (elevation <= config.seaLevel) {
          temperature += 5; // Oceans moderate temperature
        }

        temperatures[y][x] = temperature;
      }
    }
  }

  private generateHumidityMap(elevations: number[][], humidity: number[][], config: TerrainConfig): void {
    for (let y = 0; y < config.height; y++) {
      humidity[y] = [];
      for (let x = 0; x < config.width; x++) {
        const elevation = elevations[y][x];

        // Base humidity using noise
        let humidityValue = (this.noise.perlin2D(x * 0.005, y * 0.005) + 1) / 2;

        // Distance from water increases aridity
        let distanceFromWater = this.calculateDistanceFromWater(x, y, elevations, config);
        const waterEffect = Math.exp(-distanceFromWater / 20); // Exponential decay
        humidityValue *= (0.3 + 0.7 * waterEffect);

        // Elevation affects humidity (rain shadow effect)
        if (elevation > config.seaLevel + 100) {
          const elevationEffect = Math.max(0.2, 1 - (elevation - config.seaLevel - 100) / 500);
          humidityValue *= elevationEffect;
        }

        // Wind patterns (simplified)
        const windEffect = this.noise.perlin2D(x * 0.02, y * 0.01) * 0.3;
        humidityValue += windEffect;

        humidity[y][x] = Math.max(0, Math.min(1, humidityValue));
      }
    }
  }

  private calculateDistanceFromWater(x: number, y: number, elevations: number[][], config: TerrainConfig): number {
    let minDistance = Infinity;

    // Check in expanding radius until we find water
    for (let radius = 1; radius <= 50; radius++) {
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
        const checkX = Math.round(x + radius * Math.cos(angle));
        const checkY = Math.round(y + radius * Math.sin(angle));

        if (checkX >= 0 && checkX < config.width && checkY >= 0 && checkY < config.height) {
          if (elevations[checkY][checkX] <= config.seaLevel) {
            minDistance = Math.min(minDistance, radius);
          }
        }
      }

      if (minDistance < Infinity) break;
    }

    return minDistance === Infinity ? 100 : minDistance;
  }

  private generateBiomeMap(elevations: number[][], temperatures: number[][], humidity: number[][], biomes: string[][], config: TerrainConfig): void {
    for (let y = 0; y < config.height; y++) {
      biomes[y] = [];
      for (let x = 0; x < config.width; x++) {
        const elevation = elevations[y][x];
        const temp = temperatures[y][x];
        const hum = humidity[y][x];

        let bestBiome = 'temperate_grassland';
        let bestScore = -Infinity;

        for (const biome of this.biomes) {
          let score = 0;

          // Temperature fit
          if (temp >= biome.temperature.min && temp <= biome.temperature.max) {
            score += 100;
          } else {
            const tempDistance = Math.min(
              Math.abs(temp - biome.temperature.min),
              Math.abs(temp - biome.temperature.max)
            );
            score -= tempDistance * 2;
          }

          // Humidity fit
          if (hum >= biome.humidity.min && hum <= biome.humidity.max) {
            score += 100;
          } else {
            const humDistance = Math.min(
              Math.abs(hum - biome.humidity.min),
              Math.abs(hum - biome.humidity.max)
            );
            score -= humDistance * 100;
          }

          // Elevation fit
          const normalizedElevation = (elevation - config.minElevation) / (config.maxElevation - config.minElevation);
          if (normalizedElevation >= biome.elevation.min && normalizedElevation <= biome.elevation.max) {
            score += 50;
          } else {
            const elevDistance = Math.min(
              Math.abs(normalizedElevation - biome.elevation.min),
              Math.abs(normalizedElevation - biome.elevation.max)
            );
            score -= elevDistance * 50;
          }

          if (score > bestScore) {
            bestScore = score;
            bestBiome = biome.name;
          }
        }

        biomes[y][x] = bestBiome;
      }
    }
  }

  private generateRivers(elevations: number[][], rivers: { x: number; y: number }[][], config: TerrainConfig): void {
    const numRivers = Math.floor((config.width * config.height) / 10000);

    for (let r = 0; r < numRivers; r++) {
      const riverPath: { x: number; y: number }[] = [];

      // Start from a high elevation point
      let startX = Math.floor(Math.random() * config.width);
      let startY = Math.floor(Math.random() * config.height);
      let maxTries = 100;

      // Find a starting point above sea level
      while (elevations[startY][startX] <= config.seaLevel + 50 && maxTries > 0) {
        startX = Math.floor(Math.random() * config.width);
        startY = Math.floor(Math.random() * config.height);
        maxTries--;
      }

      if (maxTries === 0) continue;

      let currentX = startX;
      let currentY = startY;
      let currentElevation = elevations[currentY][currentX];

      // Trace river path downhill
      while (currentElevation > config.seaLevel && riverPath.length < 1000) {
        riverPath.push({ x: currentX, y: currentY });

        // Find lowest neighbor
        let bestX = currentX;
        let bestY = currentY;
        let lowestElevation = currentElevation;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const newX = currentX + dx;
            const newY = currentY + dy;

            if (newX >= 0 && newX < config.width && newY >= 0 && newY < config.height) {
              const neighborElevation = elevations[newY][newX];
              if (neighborElevation < lowestElevation) {
                lowestElevation = neighborElevation;
                bestX = newX;
                bestY = newY;
              }
            }
          }
        }

        // If no lower neighbor found, break
        if (bestX === currentX && bestY === currentY) {
          break;
        }

        currentX = bestX;
        currentY = bestY;
        currentElevation = lowestElevation;
      }

      if (riverPath.length > 10) {
        rivers.push(riverPath);
      }
    }
  }

  private generateLakes(elevations: number[][], lakes: { x: number; y: number; radius: number }[], config: TerrainConfig): void {
    const numLakes = Math.floor((config.width * config.height) / 50000);

    for (let l = 0; l < numLakes; l++) {
      // Find a low-lying area for the lake
      let bestX = 0;
      let bestY = 0;
      let lowestElevation = Infinity;

      // Sample random points to find good lake locations
      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * config.width);
        const y = Math.floor(Math.random() * config.height);

        if (elevations[y][x] < lowestElevation && elevations[y][x] > config.seaLevel) {
          // Check if it's in a depression (surrounded by higher ground)
          let isDepression = true;
          let avgNeighborHeight = 0;
          let neighborCount = 0;

          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nx = x + dx;
              const ny = y + dy;

              if (nx >= 0 && nx < config.width && ny >= 0 && ny < config.height) {
                avgNeighborHeight += elevations[ny][nx];
                neighborCount++;
              }
            }
          }

          if (neighborCount > 0) {
            avgNeighborHeight /= neighborCount;
            if (avgNeighborHeight > elevations[y][x] + 10) {
              lowestElevation = elevations[y][x];
              bestX = x;
              bestY = y;
            }
          }
        }
      }

      if (lowestElevation < Infinity) {
        const radius = 5 + Math.random() * 15;
        lakes.push({
          x: bestX,
          y: bestY,
          radius: radius
        });
      }
    }
  }

  // Add special terrain features
  addTerrainFeature(elevations: number[][], feature: TerrainFeature, x: number, y: number, size: number, intensity: number = 1): void {
    switch (feature) {
      case 'mountain':
        this.addMountain(elevations, x, y, size, intensity);
        break;
      case 'valley':
        this.addValley(elevations, x, y, size, intensity);
        break;
      case 'plateau':
        this.addPlateau(elevations, x, y, size, intensity);
        break;
      case 'canyon':
        this.addCanyon(elevations, x, y, size, intensity);
        break;
      case 'ridge':
        this.addRidge(elevations, x, y, size, intensity);
        break;
      case 'crater':
        this.addCrater(elevations, x, y, size, intensity);
        break;
    }
  }

  private addMountain(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    for (let y = Math.max(0, centerY - size); y < Math.min(elevations.length, centerY + size); y++) {
      for (let x = Math.max(0, centerX - size); x < Math.min(elevations[0].length, centerX + size); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < size) {
          const factor = (1 - distance / size) * intensity;
          elevations[y][x] += factor * 200; // Height increase
        }
      }
    }
  }

  private addValley(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    for (let y = Math.max(0, centerY - size); y < Math.min(elevations.length, centerY + size); y++) {
      for (let x = Math.max(0, centerX - size); x < Math.min(elevations[0].length, centerX + size); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < size) {
          const factor = (1 - distance / size) * intensity;
          elevations[y][x] -= factor * 100; // Height decrease
        }
      }
    }
  }

  private addPlateau(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    for (let y = Math.max(0, centerY - size); y < Math.min(elevations.length, centerY + size); y++) {
      for (let x = Math.max(0, centerX - size); x < Math.min(elevations[0].length, centerX + size); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < size * 0.8) {
          elevations[y][x] = Math.max(elevations[y][x], elevations[centerY][centerX] + intensity * 50);
        }
      }
    }
  }

  private addCanyon(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    const direction = Math.random() * Math.PI * 2;
    const length = size * 2;

    for (let i = 0; i < length; i++) {
      const x = Math.round(centerX + Math.cos(direction) * i);
      const y = Math.round(centerY + Math.sin(direction) * i);

      if (x >= 0 && x < elevations[0].length && y >= 0 && y < elevations.length) {
        const width = size * (1 - Math.abs(i - length / 2) / (length / 2));
        for (let w = -width; w <= width; w++) {
          const wx = Math.round(x + Math.cos(direction + Math.PI / 2) * w);
          const wy = Math.round(y + Math.sin(direction + Math.PI / 2) * w);

          if (wx >= 0 && wx < elevations[0].length && wy >= 0 && wy < elevations.length) {
            const factor = (1 - Math.abs(w) / width) * intensity;
            elevations[wy][wx] -= factor * 80;
          }
        }
      }
    }
  }

  private addRidge(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    const direction = Math.random() * Math.PI * 2;
    const length = size * 3;

    for (let i = 0; i < length; i++) {
      const x = Math.round(centerX + Math.cos(direction) * i);
      const y = Math.round(centerY + Math.sin(direction) * i);

      if (x >= 0 && x < elevations[0].length && y >= 0 && y < elevations.length) {
        const width = size * 0.3;
        for (let w = -width; w <= width; w++) {
          const wx = Math.round(x + Math.cos(direction + Math.PI / 2) * w);
          const wy = Math.round(y + Math.sin(direction + Math.PI / 2) * w);

          if (wx >= 0 && wx < elevations[0].length && wy >= 0 && wy < elevations.length) {
            const factor = (1 - Math.abs(w) / width) * intensity;
            elevations[wy][wx] += factor * 60;
          }
        }
      }
    }
  }

  private addCrater(elevations: number[][], centerX: number, centerY: number, size: number, intensity: number): void {
    for (let y = Math.max(0, centerY - size); y < Math.min(elevations.length, centerY + size); y++) {
      for (let x = Math.max(0, centerX - size); x < Math.min(elevations[0].length, centerX + size); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < size) {
          const normalizedDistance = distance / size;
          let factor: number;

          if (normalizedDistance < 0.3) {
            // Inner crater - depression
            factor = -intensity * (1 - normalizedDistance / 0.3);
          } else if (normalizedDistance < 0.7) {
            // Crater rim - elevation
            factor = intensity * 1.5 * (1 - Math.abs(normalizedDistance - 0.5) / 0.2);
          } else {
            // Outer slope - gradual decrease
            factor = intensity * 0.5 * (1 - (normalizedDistance - 0.7) / 0.3);
          }

          elevations[y][x] += factor * 120;
        }
      }
    }
  }

  // Utility methods
  getBiome(name: string): BiomeConfig | undefined {
    return this.biomes.find(b => b.name === name);
  }

  getAllBiomes(): BiomeConfig[] {
    return [...this.biomes];
  }

  setSeed(seed: number): void {
    this.noise.setSeed(seed);
  }
}