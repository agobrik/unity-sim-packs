import { ProceduralGenerator } from '../core/ProceduralGenerator';
import { GenerationOptions } from '../types';

describe('ProceduralGenerator', () => {
  let generator: ProceduralGenerator;

  beforeEach(() => {
    generator = new ProceduralGenerator({ seed: 12345 });
  });

  afterEach(() => {
    generator.dispose();
  });

  describe('Basic Functionality', () => {
    test('should initialize with correct seed', () => {
      expect(generator.getSeed()).toBe(12345);
    });

    test('should generate deterministic results with same seed', async () => {
      const result1 = await generator.generate('test', (ctx) => ctx.random());

      generator.setSeed(12345);
      const result2 = await generator.generate('test', (ctx) => ctx.random());

      expect(result1).toBe(result2);
    });

    test('should generate different results with different seeds', async () => {
      const result1 = await generator.generate('test', (ctx) => ctx.random());

      generator.setSeed(54321);
      const result2 = await generator.generate('test', (ctx) => ctx.random());

      expect(result1).not.toBe(result2);
    });

    test('should handle async generators', async () => {
      const result = await generator.generate('async-test', async (ctx) => {
        return new Promise(resolve => {
          (globalThis as any).setTimeout(() => resolve(ctx.random() * 100), 10);
        });
      });

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(100);
    });
  });

  describe('Caching', () => {
    test('should cache results by default', async () => {
      let callCount = 0;
      const testGenerator = (ctx: any) => {
        callCount++;
        return ctx.random();
      };

      const result1 = await generator.generate('cached-test', testGenerator);
      const result2 = await generator.generate('cached-test', testGenerator);

      expect(callCount).toBe(1);
      expect(result1).toBe(result2);

      const stats = generator.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('should bypass cache when disabled', async () => {
      let callCount = 0;
      const testGenerator = (ctx: any) => {
        callCount++;
        return ctx.random();
      };

      await generator.generate('no-cache-test', testGenerator, false);
      await generator.generate('no-cache-test', testGenerator, false);

      expect(callCount).toBe(2);
    });

    test('should clear cache properly', async () => {
      await generator.generate('cache-clear-test', (ctx) => ctx.random());

      let stats = generator.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      generator.clearCache();
      stats = generator.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should retry failed generations', async () => {
      let attempts = 0;
      const failingGenerator = () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Generation failed');
        }
        return 'success';
      };

      const result = await generator.generate('retry-test', failingGenerator);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('should fail after max retries', async () => {
      const alwaysFailingGenerator = () => {
        throw new Error('Always fails');
      };

      await expect(
        generator.generate('always-fail-test', alwaysFailingGenerator)
      ).rejects.toThrow('Always fails');
    });

    test('should handle timeout', async () => {
      const slowGenerator = new ProceduralGenerator({
        seed: 12345,
        timeout: 100
      });

      const timeoutGenerator = () => {
        return new Promise(resolve => {
          (globalThis as any).setTimeout(() => resolve('too-slow'), 200);
        });
      };

      await expect(
        slowGenerator.generate('timeout-test', timeoutGenerator)
      ).rejects.toThrow('Generation timeout');

      slowGenerator.dispose();
    });

    test('should call error callback on failures', async () => {
      const errorCallback = jest.fn();
      const errorGenerator = new ProceduralGenerator({
        seed: 12345,
        errorCallback,
        maxRetries: 2
      });

      const failingGenerator = () => {
        throw new Error('Test error');
      };

      try {
        await errorGenerator.generate('error-callback-test', failingGenerator);
      } catch (error) {
        // Expected to fail
      }

      expect(errorCallback).toHaveBeenCalledTimes(2);
      errorGenerator.dispose();
    });
  });

  describe('Batch Generation', () => {
    test('should generate multiple items in parallel', async () => {
      const generators = [
        { key: 'item1', generator: (ctx: any) => ctx.random() * 10 },
        { key: 'item2', generator: (ctx: any) => ctx.random() * 20 },
        { key: 'item3', generator: (ctx: any) => ctx.random() * 30 }
      ];

      const results = await generator.generateBatch(generators, true);

      expect(results.size).toBe(3);
      expect(results.has('item1')).toBe(true);
      expect(results.has('item2')).toBe(true);
      expect(results.has('item3')).toBe(true);
      expect(results.get('item1')).toBeLessThan(10);
      expect(results.get('item2')).toBeLessThan(20);
      expect(results.get('item3')).toBeLessThan(30);
    });

    test('should generate multiple items sequentially', async () => {
      const executionOrder: string[] = [];
      const generators = [
        {
          key: 'seq1',
          generator: () => {
            executionOrder.push('seq1');
            return 1;
          }
        },
        {
          key: 'seq2',
          generator: () => {
            executionOrder.push('seq2');
            return 2;
          }
        }
      ];

      await generator.generateBatch(generators, false);

      expect(executionOrder).toEqual(['seq1', 'seq2']);
    });
  });

  describe('Queue Management', () => {
    test('should queue generations', async () => {
      const promise1 = generator.queueGeneration('queue1', (ctx) => ctx.random());
      const promise2 = generator.queueGeneration('queue2', (ctx) => ctx.random());

      expect(generator.getQueueLength()).toBe(2);

      const results = await Promise.all([promise1, promise2]);
      expect(results).toHaveLength(2);
      expect(generator.getQueueLength()).toBe(0);
    });

    test('should clear queue', async () => {
      generator.queueGeneration('clear1', (ctx) => ctx.random());
      generator.queueGeneration('clear2', (ctx) => ctx.random());

      expect(generator.getQueueLength()).toBe(2);

      generator.clearQueue();
      expect(generator.getQueueLength()).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    test('should generate random numbers in range', () => {
      for (let i = 0; i < 100; i++) {
        const value = generator.randomFloat(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      }
    });

    test('should generate random integers', () => {
      for (let i = 0; i < 100; i++) {
        const value = generator.randomInt(5, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    test('should choose random array elements', () => {
      const array = ['a', 'b', 'c', 'd'];
      for (let i = 0; i < 20; i++) {
        const choice = generator.randomChoice(array);
        expect(array).toContain(choice);
      }
    });

    test('should shuffle arrays deterministically', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled1 = generator.shuffle(array);

      generator.setSeed(12345); // Reset to same seed
      const shuffled2 = generator.shuffle(array);

      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).toHaveLength(array.length);
      expect(shuffled1.sort()).toEqual(array.sort());
    });

    test('should perform weighted choice correctly', () => {
      const items = [
        { item: 'rare', weight: 1 },
        { item: 'common', weight: 99 }
      ];

      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(generator.weightedChoice(items));
      }

      const commonCount = results.filter(r => r === 'common').length;
      expect(commonCount).toBeGreaterThan(80); // Should be mostly common
    });

    test('should generate normal distribution', () => {
      const values: number[] = [];
      for (let i = 0; i < 1000; i++) {
        values.push(generator.normalDistribution(0, 1));
      }

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      expect(Math.abs(mean)).toBeLessThan(0.1); // Should be close to 0

      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      expect(Math.abs(variance - 1)).toBeLessThan(0.2); // Should be close to 1
    });

    test('should interpolate values correctly', () => {
      expect(generator.lerp(0, 10, 0)).toBe(0);
      expect(generator.lerp(0, 10, 1)).toBe(10);
      expect(generator.lerp(0, 10, 0.5)).toBe(5);
    });

    test('should apply smoothstep correctly', () => {
      expect(generator.smoothstep(0, 10, 0)).toBe(0);
      expect(generator.smoothstep(0, 10, 10)).toBe(1);
      expect(generator.smoothstep(0, 10, 5)).toBe(0.5);
    });

    test('should clamp values correctly', () => {
      expect(generator.clamp(-5, 0, 10)).toBe(0);
      expect(generator.clamp(15, 0, 10)).toBe(10);
      expect(generator.clamp(5, 0, 10)).toBe(5);
    });

    test('should map values correctly', () => {
      expect(generator.map(5, 0, 10, 0, 100)).toBe(50);
      expect(generator.map(0, 0, 10, 0, 100)).toBe(0);
      expect(generator.map(10, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe('Child Generators', () => {
    test('should create child generators', () => {
      const child = generator.createChildGenerator({ seed: 99999 });

      expect(child.getSeed()).toBe(99999);
      expect(child.getSeed()).not.toBe(generator.getSeed());

      child.dispose();
    });

    test('should inherit parent options', () => {
      const parent = new ProceduralGenerator({
        seed: 12345,
        useCache: false,
        maxRetries: 5
      });

      const child = parent.createChildGenerator();
      const childContext = child.getContext();

      expect(childContext.options.useCache).toBe(false);
      expect(childContext.options.maxRetries).toBe(5);

      parent.dispose();
      child.dispose();
    });
  });

  describe('Metadata Management', () => {
    test('should store and retrieve metadata', () => {
      generator.setMetadata('testKey', 'testValue');
      expect(generator.getMetadata('testKey')).toBe('testValue');

      generator.setMetadata('numberKey', 42);
      expect(generator.getMetadata('numberKey')).toBe(42);

      generator.setMetadata('objectKey', { nested: true });
      expect(generator.getMetadata('objectKey')).toEqual({ nested: true });
    });

    test('should return undefined for non-existent metadata', () => {
      expect(generator.getMetadata('nonExistent')).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    test('should track generation statistics', async () => {
      await generator.generate('stats-test-1', (ctx) => ctx.random());
      await generator.generate('stats-test-2', (ctx) => ctx.random());

      const stats = generator.getStats();
      expect(stats.iterationsCount).toBe(2);
      expect(stats.totalTime).toBeGreaterThan(0);
      expect(stats.successRate).toBe(1);
    });

    test('should track failure statistics', async () => {
      try {
        await generator.generate('fail-stats-test', () => {
          throw new Error('Test failure');
        });
      } catch (error) {
        // Expected failure
      }

      const stats = generator.getStats();
      expect(stats.failureReasons).toContain('Test failure');
      expect(stats.successRate).toBeLessThan(1);
    });
  });

  describe('Event Emission', () => {
    test('should emit generation events', (done) => {
      let eventCount = 0;

      generator.on('generation_started', () => {
        eventCount++;
      });

      generator.on('generation_completed', () => {
        eventCount++;
        expect(eventCount).toBe(2);
        done();
      });

      generator.generate('event-test', (ctx) => ctx.random());
    });

    test('should emit cache events', (done) => {
      generator.on('cache_miss', () => {
        generator.on('cache_hit', () => {
          done();
        });

        // Generate same key again to trigger cache hit
        generator.generate('cache-event-test', (ctx) => ctx.random());
      });

      // First generation should trigger cache miss
      generator.generate('cache-event-test', (ctx) => ctx.random());
    });

    test('should emit failure events', (done) => {
      generator.on('generation_failed', (event) => {
        expect(event.data.error).toContain('Event test failure');
        done();
      });

      generator.generate('failure-event-test', () => {
        throw new Error('Event test failure');
      }).catch(() => {
        // Expected failure
      });
    });
  });

  describe('Performance', () => {
    test('should handle large batch generations efficiently', async () => {
      const batchSize = 100;
      const generators = Array.from({ length: batchSize }, (_, i) => ({
        key: `perf-test-${i}`,
        generator: (ctx: any) => ctx.random() * i
      }));

      const startTime = (globalThis as any).performance?.now() || Date.now();
      const results = await generator.generateBatch(generators, true);
      const endTime = (globalThis as any).performance?.now() || Date.now();

      expect(results.size).toBe(batchSize);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should manage memory efficiently with cache', async () => {
      // Generate many cached items
      for (let i = 0; i < 200; i++) {
        await generator.generate(`memory-test-${i}`, (ctx) => ctx.random());
      }

      const stats = generator.getCacheStats();
      expect(stats.size).toBeLessThan(150); // Should have cleaned up some entries
    });
  });
});