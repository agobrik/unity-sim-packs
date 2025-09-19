import { NoiseGenerator } from '../generators/NoiseGenerator';
import { NoiseConfig } from '../types';

describe('NoiseGenerator', () => {
  let noiseGenerator: NoiseGenerator;
  let config: NoiseConfig;

  beforeEach(() => {
    config = {
      seed: 12345,
      octaves: 4,
      frequency: 0.01,
      amplitude: 1.0,
      persistence: 0.5,
      lacunarity: 2.0
    };
    noiseGenerator = new NoiseGenerator(config);
  });

  describe('Basic Noise Generation', () => {
    test('should generate deterministic noise with same seed', () => {
      const value1 = noiseGenerator.generate2D(10, 20);
      const value2 = noiseGenerator.generate2D(10, 20);
      expect(value1).toBe(value2);
    });

    test('should generate different values for different positions', () => {
      const value1 = noiseGenerator.generate2D(10, 20);
      const value2 = noiseGenerator.generate2D(15, 25);
      expect(value1).not.toBe(value2);
    });

    test('should generate different values with different seeds', () => {
      const value1 = noiseGenerator.generate2D(10, 20);

      noiseGenerator.setSeed(54321);
      const value2 = noiseGenerator.generate2D(10, 20);

      expect(value1).not.toBe(value2);
    });

    test('should generate values in reasonable range', () => {
      for (let i = 0; i < 100; i++) {
        const value = noiseGenerator.generate2D(i, i);
        expect(value).toBeGreaterThan(-5);
        expect(value).toBeLessThan(5);
      }
    });
  });

  describe('1D Noise', () => {
    test('should generate 1D noise', () => {
      const value = noiseGenerator.generate1D(50);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });

    test('should be continuous for 1D noise', () => {
      const values = [];
      for (let x = 0; x < 10; x += 0.1) {
        values.push(noiseGenerator.generate1D(x));
      }

      // Check that adjacent values don't differ too much (continuity)
      for (let i = 1; i < values.length; i++) {
        const diff = Math.abs(values[i] - values[i - 1]);
        expect(diff).toBeLessThan(1); // Reasonable continuity threshold
      }
    });
  });

  describe('2D Noise', () => {
    test('should generate 2D noise', () => {
      const value = noiseGenerator.generate2D(25, 35);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });

    test('should be continuous for 2D noise', () => {
      const baseValue = noiseGenerator.generate2D(50, 50);
      const neighbors = [
        noiseGenerator.generate2D(50.1, 50),
        noiseGenerator.generate2D(50, 50.1),
        noiseGenerator.generate2D(49.9, 50),
        noiseGenerator.generate2D(50, 49.9)
      ];

      neighbors.forEach(neighbor => {
        const diff = Math.abs(neighbor - baseValue);
        expect(diff).toBeLessThan(1);
      });
    });
  });

  describe('3D Noise', () => {
    test('should generate 3D noise', () => {
      const value = noiseGenerator.generate3D(10, 20, 30);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });

    test('should be continuous for 3D noise', () => {
      const baseValue = noiseGenerator.generate3D(25, 25, 25);
      const neighbors = [
        noiseGenerator.generate3D(25.1, 25, 25),
        noiseGenerator.generate3D(25, 25.1, 25),
        noiseGenerator.generate3D(25, 25, 25.1)
      ];

      neighbors.forEach(neighbor => {
        const diff = Math.abs(neighbor - baseValue);
        expect(diff).toBeLessThan(1);
      });
    });
  });

  describe('Fractal Noise Properties', () => {
    test('should respect octave count', () => {
      const lowOctave = new NoiseGenerator({ ...config, octaves: 1 });
      const highOctave = new NoiseGenerator({ ...config, octaves: 8 });

      const lowValues = [];
      const highValues = [];

      for (let i = 0; i < 50; i++) {
        lowValues.push(lowOctave.generate2D(i, i));
        highValues.push(highOctave.generate2D(i, i));
      }

      // Higher octaves should generally have more variation
      const lowVariance = this.calculateVariance(lowValues);
      const highVariance = this.calculateVariance(highValues);

      expect(highVariance).toBeGreaterThan(lowVariance * 0.5);
    });

    test('should respect frequency parameter', () => {
      const lowFreq = new NoiseGenerator({ ...config, frequency: 0.001 });
      const highFreq = new NoiseGenerator({ ...config, frequency: 0.1 });

      // Sample over a larger area to see frequency differences
      const lowFreqValues = [];
      const highFreqValues = [];

      for (let x = 0; x < 100; x += 10) {
        for (let y = 0; y < 100; y += 10) {
          lowFreqValues.push(lowFreq.generate2D(x, y));
          highFreqValues.push(highFreq.generate2D(x, y));
        }
      }

      // High frequency should have more variation over the same distance
      const lowVariance = this.calculateVariance(lowFreqValues);
      const highVariance = this.calculateVariance(highFreqValues);

      expect(highVariance).toBeGreaterThanOrEqual(lowVariance);
    });

    test('should respect amplitude parameter', () => {
      const lowAmp = new NoiseGenerator({ ...config, amplitude: 0.1 });
      const highAmp = new NoiseGenerator({ ...config, amplitude: 2.0 });

      const lowValues = [];
      const highValues = [];

      for (let i = 0; i < 100; i++) {
        lowValues.push(Math.abs(lowAmp.generate2D(i, i)));
        highValues.push(Math.abs(highAmp.generate2D(i, i)));
      }

      const avgLow = lowValues.reduce((sum, v) => sum + v, 0) / lowValues.length;
      const avgHigh = highValues.reduce((sum, v) => sum + v, 0) / highValues.length;

      expect(avgHigh).toBeGreaterThan(avgLow * 5);
    });
  });

  describe('Specialized Noise Types', () => {
    test('should generate ridged noise', () => {
      const value = noiseGenerator.generateRidgedNoise(10, 20);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0); // Ridged noise should be positive
    });

    test('should generate billow noise', () => {
      const value = noiseGenerator.generateBillowNoise(10, 20);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0); // Billow noise should be positive
    });

    test('should generate Worley noise', () => {
      const value = noiseGenerator.generateWorleyNoise(10, 20, 1.0);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0); // Distance should be positive
    });

    test('should generate turbulence', () => {
      const value = noiseGenerator.generateTurbulence(10, 20);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0); // Turbulence should be positive
    });

    test('should generate domain warping', () => {
      const value = noiseGenerator.generateDomainWarping(10, 20, 2.0);
      expect(typeof value).toBe('number');
      expect(isFinite(value)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should normalize values correctly', () => {
      const normalized = noiseGenerator.normalize(0.5, 0, 1);
      expect(normalized).toBeCloseTo(0.75, 5);

      const normalizedNegative = noiseGenerator.normalize(-0.5, -10, 10);
      expect(normalizedNegative).toBeCloseTo(7.5, 5);
    });

    test('should apply threshold correctly', () => {
      expect(noiseGenerator.threshold(0.8, 0.5)).toBe(1);
      expect(noiseGenerator.threshold(0.3, 0.5)).toBe(0);
      expect(noiseGenerator.threshold(0.5, 0.5)).toBe(1);
    });

    test('should apply smooth threshold correctly', () => {
      const smoothed = noiseGenerator.smoothThreshold(0.5, 0.5, 0.1);
      expect(smoothed).toBeCloseTo(0.5, 1);

      const smoothedLow = noiseGenerator.smoothThreshold(0.3, 0.5, 0.1);
      expect(smoothedLow).toBeLessThan(0.5);

      const smoothedHigh = noiseGenerator.smoothThreshold(0.7, 0.5, 0.1);
      expect(smoothedHigh).toBeGreaterThan(0.5);
    });
  });

  describe('Noise Maps', () => {
    test('should generate noise maps', () => {
      const map = noiseGenerator.generateNoiseMap(10, 8, 0, 0);

      expect(map).toHaveLength(8); // Height
      expect(map[0]).toHaveLength(10); // Width

      // Check all values are numbers
      for (const row of map) {
        for (const value of row) {
          expect(typeof value).toBe('number');
          expect(isFinite(value)).toBe(true);
        }
      }
    });

    test('should generate height maps with proper scaling', () => {
      const heightMultiplier = 100;
      const map = noiseGenerator.generateHeightMap(10, 8, heightMultiplier, 0, 0);

      expect(map).toHaveLength(8);
      expect(map[0]).toHaveLength(10);

      // Check all values are in expected range [0, heightMultiplier]
      for (const row of map) {
        for (const value of row) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(heightMultiplier);
        }
      }
    });

    test('should respect offset parameters', () => {
      const map1 = noiseGenerator.generateNoiseMap(5, 5, 0, 0);
      const map2 = noiseGenerator.generateNoiseMap(5, 5, 10, 10);

      // Maps with different offsets should be different
      let differences = 0;
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          if (Math.abs(map1[y][x] - map2[y][x]) > 0.001) {
            differences++;
          }
        }
      }

      expect(differences).toBeGreaterThan(20); // Most values should be different
    });
  });

  describe('Configuration Management', () => {
    test('should update frequency', () => {
      const originalValue = noiseGenerator.generate2D(10, 10);

      noiseGenerator.setFrequency(0.05);
      const newValue = noiseGenerator.generate2D(10, 10);

      expect(newValue).not.toBe(originalValue);
    });

    test('should update octaves', () => {
      const originalValue = noiseGenerator.generate2D(10, 10);

      noiseGenerator.setOctaves(8);
      const newValue = noiseGenerator.generate2D(10, 10);

      expect(newValue).not.toBe(originalValue);
    });

    test('should update amplitude', () => {
      const originalValue = noiseGenerator.generate2D(10, 10);

      noiseGenerator.setAmplitude(2.0);
      const newValue = noiseGenerator.generate2D(10, 10);

      expect(Math.abs(newValue)).toBeGreaterThan(Math.abs(originalValue) * 0.5);
    });

    test('should export and import configuration', () => {
      const exported = noiseGenerator.exportConfig();
      const newGenerator = new NoiseGenerator();

      newGenerator.importConfig(exported);
      const importedConfig = newGenerator.getConfig();

      expect(importedConfig.seed).toBe(config.seed);
      expect(importedConfig.octaves).toBe(config.octaves);
      expect(importedConfig.frequency).toBe(config.frequency);
      expect(importedConfig.amplitude).toBe(config.amplitude);
    });

    test('should handle invalid configuration import', () => {
      expect(() => {
        noiseGenerator.importConfig('invalid json');
      }).toThrow('Invalid configuration JSON');
    });
  });

  describe('Presets', () => {
    test('should create terrain noise preset', () => {
      const terrainNoise = NoiseGenerator.createTerrainNoise(12345);
      const config = terrainNoise.getConfig();

      expect(config.seed).toBe(12345);
      expect(config.octaves).toBe(6);
      expect(config.frequency).toBe(0.005);
    });

    test('should create cloud noise preset', () => {
      const cloudNoise = NoiseGenerator.createCloudNoise(12345);
      const config = cloudNoise.getConfig();

      expect(config.seed).toBe(12345);
      expect(config.octaves).toBe(4);
      expect(config.frequency).toBe(0.02);
    });

    test('should create detail noise preset', () => {
      const detailNoise = NoiseGenerator.createDetailNoise(12345);
      const config = detailNoise.getConfig();

      expect(config.seed).toBe(12345);
      expect(config.octaves).toBe(8);
      expect(config.frequency).toBe(0.1);
    });

    test('should create cave noise preset', () => {
      const caveNoise = NoiseGenerator.createCaveNoise(12345);
      const config = caveNoise.getConfig();

      expect(config.seed).toBe(12345);
      expect(config.octaves).toBe(3);
      expect(config.frequency).toBe(0.03);
    });
  });

  describe('Performance', () => {
    test('should generate noise efficiently', () => {
      const startTime = (globalThis as any).performance?.now() || Date.now();

      for (let i = 0; i < 10000; i++) {
        noiseGenerator.generate2D(i % 100, Math.floor(i / 100));
      }

      const endTime = (globalThis as any).performance?.now() || Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should generate large noise maps efficiently', () => {
      const startTime = (globalThis as any).performance?.now() || Date.now();

      noiseGenerator.generateNoiseMap(100, 100);

      const endTime = (globalThis as any).performance?.now() || Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });

  // Helper method for tests
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }
});