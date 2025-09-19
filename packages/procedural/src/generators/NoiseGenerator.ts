import {
  NoiseConfig,
  NoiseGenerator as INoiseGenerator,
  NoiseType,
  InterpolationType
} from '../types';

export class NoiseGenerator implements INoiseGenerator {
  private config: NoiseConfig;
  private permutation: number[] = [];
  private gradients: number[][] = [];

  constructor(config: Partial<NoiseConfig> = {}) {
    this.config = {
      seed: 1337,
      octaves: 4,
      frequency: 0.01,
      amplitude: 1.0,
      persistence: 0.5,
      lacunarity: 2.0,
      ...config
    };

    this.initializePermutationTable();
    this.initializeGradients();
  }

  private initializePermutationTable(): void {
    // Create permutation table based on seed
    const p = Array.from({ length: 256 }, (_, i) => i);

    // Shuffle using seeded random
    let seed = this.config.seed;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate for easier lookup
    this.permutation = [...p, ...p];
  }

  private initializeGradients(): void {
    this.gradients = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
      [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]
    ];
  }

  public setSeed(seed: number): void {
    this.config.seed = seed;
    this.initializePermutationTable();
  }

  public setFrequency(frequency: number): void {
    this.config.frequency = frequency;
  }

  public setOctaves(octaves: number): void {
    this.config.octaves = octaves;
  }

  public setAmplitude(amplitude: number): void {
    this.config.amplitude = amplitude;
  }

  public setPersistence(persistence: number): void {
    this.config.persistence = persistence;
  }

  public setLacunarity(lacunarity: number): void {
    this.config.lacunarity = lacunarity;
  }

  public getConfig(): NoiseConfig {
    return { ...this.config };
  }

  public generate(x: number, y?: number, z?: number): number {
    if (z !== undefined) {
      return this.generate3D(x, y || 0, z);
    } else if (y !== undefined) {
      return this.generate2D(x, y);
    } else {
      return this.generate1D(x);
    }
  }

  public generate1D(x: number): number {
    return this.fractalNoise1D(x);
  }

  public generate2D(x: number, y: number): number {
    return this.fractalNoise2D(x, y);
  }

  public generate3D(x: number, y: number, z: number): number {
    return this.fractalNoise3D(x, y, z);
  }

  private fractalNoise1D(x: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      value += this.perlinNoise1D(x * frequency) * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  private fractalNoise2D(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      value += this.perlinNoise2D(x * frequency, y * frequency) * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  private fractalNoise3D(x: number, y: number, z: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      value += this.perlinNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  private perlinNoise1D(x: number): number {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);

    const u = this.fade(xf);

    const a = this.permutation[xi];
    const b = this.permutation[xi + 1];

    const g1 = this.grad1D(a, xf);
    const g2 = this.grad1D(b, xf - 1);

    return this.lerp(u, g1, g2);
  }

  private perlinNoise2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.permutation[this.permutation[xi] + yi];
    const ab = this.permutation[this.permutation[xi] + yi + 1];
    const ba = this.permutation[this.permutation[xi + 1] + yi];
    const bb = this.permutation[this.permutation[xi + 1] + yi + 1];

    const g1 = this.grad2D(aa, xf, yf);
    const g2 = this.grad2D(ba, xf - 1, yf);
    const g3 = this.grad2D(ab, xf, yf - 1);
    const g4 = this.grad2D(bb, xf - 1, yf - 1);

    const lerp1 = this.lerp(u, g1, g2);
    const lerp2 = this.lerp(u, g3, g4);

    return this.lerp(v, lerp1, lerp2);
  }

  private perlinNoise3D(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const aaa = this.permutation[this.permutation[this.permutation[xi] + yi] + zi];
    const aba = this.permutation[this.permutation[this.permutation[xi] + yi + 1] + zi];
    const aab = this.permutation[this.permutation[this.permutation[xi] + yi] + zi + 1];
    const abb = this.permutation[this.permutation[this.permutation[xi] + yi + 1] + zi + 1];
    const baa = this.permutation[this.permutation[this.permutation[xi + 1] + yi] + zi];
    const bba = this.permutation[this.permutation[this.permutation[xi + 1] + yi + 1] + zi];
    const bab = this.permutation[this.permutation[this.permutation[xi + 1] + yi] + zi + 1];
    const bbb = this.permutation[this.permutation[this.permutation[xi + 1] + yi + 1] + zi + 1];

    const g1 = this.grad3D(aaa, xf, yf, zf);
    const g2 = this.grad3D(baa, xf - 1, yf, zf);
    const g3 = this.grad3D(aba, xf, yf - 1, zf);
    const g4 = this.grad3D(bba, xf - 1, yf - 1, zf);
    const g5 = this.grad3D(aab, xf, yf, zf - 1);
    const g6 = this.grad3D(bab, xf - 1, yf, zf - 1);
    const g7 = this.grad3D(abb, xf, yf - 1, zf - 1);
    const g8 = this.grad3D(bbb, xf - 1, yf - 1, zf - 1);

    const lerp1 = this.lerp(u, g1, g2);
    const lerp2 = this.lerp(u, g3, g4);
    const lerp3 = this.lerp(u, g5, g6);
    const lerp4 = this.lerp(u, g7, g8);

    const lerp5 = this.lerp(v, lerp1, lerp2);
    const lerp6 = this.lerp(v, lerp3, lerp4);

    return this.lerp(w, lerp5, lerp6);
  }

  private grad1D(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x;
  }

  private grad2D(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private grad3D(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  // Specialized noise types
  public generateRidgedNoise(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      let signal = Math.abs(this.perlinNoise2D(x * frequency, y * frequency));
      signal = 1 - signal;
      signal *= signal;
      value += signal * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  public generateBillowNoise(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      let signal = Math.abs(this.perlinNoise2D(x * frequency, y * frequency));
      value += signal * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  public generateWorleyNoise(x: number, y: number, cellDensity: number = 1.0): number {
    const cellSize = 1.0 / cellDensity;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);

    let minDistance = Infinity;

    // Check surrounding cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cellPosX = cellX + dx;
        const cellPosY = cellY + dy;

        // Generate random point in cell using seed
        const seed1 = this.hashCell(cellPosX, cellPosY);
        const seed2 = this.hashCell(cellPosX, cellPosY + 1000);

        const pointX = cellPosX * cellSize + (seed1 / 233280) * cellSize;
        const pointY = cellPosY * cellSize + (seed2 / 233280) * cellSize;

        const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance;
  }

  private hashCell(x: number, y: number): number {
    let hash = (x * 73856093) ^ (y * 19349663);
    hash = (hash * 9301 + 49297) % 233280;
    return hash;
  }

  public generateTurbulence(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      value += Math.abs(this.perlinNoise2D(x * frequency, y * frequency)) * amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value;
  }

  public generateDomainWarping(x: number, y: number, warpStrength: number = 1.0): number {
    const warpX = this.perlinNoise2D(x * 0.1, y * 0.1) * warpStrength;
    const warpY = this.perlinNoise2D((x + 100) * 0.1, (y + 100) * 0.1) * warpStrength;

    return this.generate2D(x + warpX, y + warpY);
  }

  // Utility methods for noise operations
  public normalize(value: number, min: number = -1, max: number = 1): number {
    return (value + 1) * 0.5 * (max - min) + min;
  }

  public threshold(value: number, threshold: number): number {
    return value > threshold ? 1 : 0;
  }

  public smoothThreshold(value: number, threshold: number, smoothness: number = 0.1): number {
    const edge0 = threshold - smoothness;
    const edge1 = threshold + smoothness;
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  public generateNoiseMap(
    width: number,
    height: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): number[][] {
    const map: number[][] = [];

    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        map[y][x] = this.generate2D(x + offsetX, y + offsetY);
      }
    }

    return map;
  }

  public generateHeightMap(
    width: number,
    height: number,
    heightMultiplier: number = 1.0,
    offsetX: number = 0,
    offsetY: number = 0
  ): number[][] {
    const map: number[][] = [];

    for (let y = 0; y < height; y++) {
      map[y] = [];
      for (let x = 0; x < width; x++) {
        const noiseValue = this.generate2D(x + offsetX, y + offsetY);
        const normalizedValue = this.normalize(noiseValue, 0, 1);
        map[y][x] = normalizedValue * heightMultiplier;
      }
    }

    return map;
  }

  // Export/import configuration
  public exportConfig(): string {
    return JSON.stringify(this.config);
  }

  public importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.config = { ...this.config, ...config };
      this.initializePermutationTable();
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }

  // Presets for common noise configurations
  public static createTerrainNoise(seed: number = 1337): NoiseGenerator {
    return new NoiseGenerator({
      seed,
      octaves: 6,
      frequency: 0.005,
      amplitude: 1.0,
      persistence: 0.6,
      lacunarity: 2.0
    });
  }

  public static createCloudNoise(seed: number = 1337): NoiseGenerator {
    return new NoiseGenerator({
      seed,
      octaves: 4,
      frequency: 0.02,
      amplitude: 1.0,
      persistence: 0.5,
      lacunarity: 2.0
    });
  }

  public static createDetailNoise(seed: number = 1337): NoiseGenerator {
    return new NoiseGenerator({
      seed,
      octaves: 8,
      frequency: 0.1,
      amplitude: 0.5,
      persistence: 0.4,
      lacunarity: 2.5
    });
  }

  public static createCaveNoise(seed: number = 1337): NoiseGenerator {
    return new NoiseGenerator({
      seed,
      octaves: 3,
      frequency: 0.03,
      amplitude: 1.0,
      persistence: 0.7,
      lacunarity: 1.8
    });
  }
}