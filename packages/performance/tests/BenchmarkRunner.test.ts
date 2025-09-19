import { BenchmarkRunner } from '../src/benchmarking/BenchmarkRunner';
import { PerformanceTestCase, BenchmarkCategory, TestCategory } from '../src/types';

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner();
  });

  const createTestCase = (id: string, overrides: Partial<PerformanceTestCase> = {}): PerformanceTestCase => ({
    id,
    name: `Test Case ${id}`,
    description: `Test case for ${id}`,
    category: TestCategory.UNIT,
    setup: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue(undefined),
    teardown: jest.fn().mockResolvedValue(undefined),
    expectedMetrics: {
      maxFrameTime: 100,
      minFrameRate: 30,
      maxMemoryUsage: 100 * 1024 * 1024,
      maxCPUUsage: 80
    },
    timeout: 5000,
    ...overrides
  });

  describe('test case management', () => {
    it('should register test case', () => {
      const testCase = createTestCase('test1');
      const registeredSpy = jest.fn();

      runner.on('test_case_registered', registeredSpy);
      runner.registerTestCase(testCase);

      expect(runner.getTestCase('test1')).toBe(testCase);
      expect(registeredSpy).toHaveBeenCalledWith(testCase);
    });

    it('should unregister test case', () => {
      const testCase = createTestCase('test1');
      const unregisteredSpy = jest.fn();

      runner.registerTestCase(testCase);
      runner.on('test_case_unregistered', unregisteredSpy);

      const result = runner.unregisterTestCase('test1');

      expect(result).toBe(true);
      expect(runner.getTestCase('test1')).toBeUndefined();
      expect(unregisteredSpy).toHaveBeenCalledWith('test1');
    });

    it('should return false when unregistering non-existent test case', () => {
      const result = runner.unregisterTestCase('nonexistent');
      expect(result).toBe(false);
    });

    it('should get all test cases', () => {
      const testCase1 = createTestCase('test1');
      const testCase2 = createTestCase('test2');

      runner.registerTestCase(testCase1);
      runner.registerTestCase(testCase2);

      const testCases = runner.getTestCases();
      expect(testCases).toHaveLength(2);
      expect(testCases).toContain(testCase1);
      expect(testCases).toContain(testCase2);
    });
  });

  describe('benchmark execution', () => {
    it('should run benchmark successfully', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      const startedSpy = jest.fn();
      const completedSpy = jest.fn();

      runner.on('benchmark_started', startedSpy);
      runner.on('benchmark_completed', completedSpy);

      const benchmark = await runner.runBenchmark('test1', 5, 2);

      expect(benchmark).toBeDefined();
      expect(benchmark.name).toBe('Test Case test1');
      expect(benchmark.iterations).toBe(5);
      expect(benchmark.warmupIterations).toBe(2);
      expect(benchmark.results).toHaveLength(5);
      expect(benchmark.statistics).toBeDefined();

      expect(startedSpy).toHaveBeenCalledWith('test1');
      expect(completedSpy).toHaveBeenCalledWith(benchmark);

      // Verify setup, execute, and teardown were called
      expect(testCase.setup).toHaveBeenCalledTimes(1);
      expect(testCase.execute).toHaveBeenCalledTimes(7); // 2 warmup + 5 actual
      expect(testCase.teardown).toHaveBeenCalledTimes(1);
    });

    it('should handle test case not found', async () => {
      await expect(runner.runBenchmark('nonexistent')).rejects.toThrow(
        "Test case 'nonexistent' not found"
      );
    });

    it('should prevent concurrent benchmarks', async () => {
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      });
      runner.registerTestCase(testCase);

      const promise1 = runner.runBenchmark('test1', 2);

      await expect(runner.runBenchmark('test1', 2)).rejects.toThrow(
        'Another benchmark is already running'
      );

      await promise1; // Clean up
    });

    it('should handle setup failures', async () => {
      const testCase = createTestCase('test1', {
        setup: jest.fn().mockRejectedValue(new Error('Setup failed'))
      });
      runner.registerTestCase(testCase);

      await expect(runner.runBenchmark('test1')).rejects.toThrow('Setup failed');
    });

    it('should handle execute failures', async () => {
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockRejectedValue(new Error('Execute failed'))
      });
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 3);

      expect(benchmark.results).toHaveLength(3);
      expect(benchmark.results.every(r => !r.success)).toBe(true);
      expect(benchmark.results.every(r => r.error === 'Execute failed')).toBe(true);
    });

    it('should handle timeouts', async () => {
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10000))),
        timeout: 100
      });
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 2);

      expect(benchmark.results).toHaveLength(2);
      expect(benchmark.results.every(r => !r.success)).toBe(true);
      expect(benchmark.results.every(r => r.error === 'Test iteration timeout')).toBe(true);
    });

    it('should stop early on high failure rate', async () => {
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockRejectedValue(new Error('Always fails'))
      });
      runner.registerTestCase(testCase);

      const stoppedEarlySpy = jest.fn();
      runner.on('benchmark_stopped_early', stoppedEarlySpy);

      const benchmark = await runner.runBenchmark('test1', 100); // Request many iterations

      expect(benchmark.results.length).toBeLessThan(100);
      expect(stoppedEarlySpy).toHaveBeenCalled();
    });
  });

  describe('warmup phase', () => {
    it('should execute warmup iterations', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      const warmupStartedSpy = jest.fn();
      const warmupCompletedSpy = jest.fn();

      runner.on('warmup_started', warmupStartedSpy);
      runner.on('warmup_completed', warmupCompletedSpy);

      await runner.runBenchmark('test1', 3, 5);

      expect(warmupStartedSpy).toHaveBeenCalledWith(5);
      expect(warmupCompletedSpy).toHaveBeenCalled();
      expect(testCase.execute).toHaveBeenCalledTimes(8); // 5 warmup + 3 actual
    });

    it('should handle warmup failures gracefully', async () => {
      let callCount = 0;
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 2) { // Fail first 2 warmup calls
            throw new Error('Warmup failure');
          }
          return Promise.resolve();
        })
      });
      runner.registerTestCase(testCase);

      const warmupFailedSpy = jest.fn();
      runner.on('warmup_iteration_failed', warmupFailedSpy);

      const benchmark = await runner.runBenchmark('test1', 3, 5);

      expect(warmupFailedSpy).toHaveBeenCalledTimes(2);
      expect(benchmark.results).toHaveLength(3);
      expect(benchmark.results.every(r => r.success)).toBe(true);
    });
  });

  describe('statistics calculation', () => {
    it('should calculate correct statistics', async () => {
      const durations = [10, 15, 20, 25, 30];
      let callIndex = 0;

      const testCase = createTestCase('test1', {
        execute: jest.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(resolve, durations[callIndex++]);
          });
        })
      });
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 5, 0);

      const stats = benchmark.statistics;
      expect(stats.mean).toBeCloseTo(20, 0); // Average of [10,15,20,25,30]
      expect(stats.median).toBe(20);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.standardDeviation).toBeGreaterThan(0);
      expect(stats.percentiles[50]).toBe(20);
      expect(stats.percentiles[95]).toBe(30);
    });

    it('should handle empty results', async () => {
      const testCase = createTestCase('test1', {
        execute: jest.fn().mockRejectedValue(new Error('Always fails'))
      });
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 3, 0);

      const stats = benchmark.statistics;
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.standardDeviation).toBe(0);
    });

    it('should detect outliers', async () => {
      const durations = [10, 10, 10, 10, 100]; // Last one is outlier
      let callIndex = 0;

      const testCase = createTestCase('test1', {
        execute: jest.fn().mockImplementation(() => {
          return new Promise(resolve => {
            setTimeout(resolve, durations[callIndex++]);
          });
        })
      });
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 5, 0);

      expect(benchmark.statistics.outliers.length).toBeGreaterThan(0);
    });
  });

  describe('multiple benchmarks', () => {
    it('should run multiple benchmarks sequentially', async () => {
      const testCase1 = createTestCase('test1');
      const testCase2 = createTestCase('test2');

      runner.registerTestCase(testCase1);
      runner.registerTestCase(testCase2);

      const benchmarks = await runner.runMultipleBenchmarks(['test1', 'test2'], 3, 1, false);

      expect(benchmarks).toHaveLength(2);
      expect(benchmarks[0].name).toBe('Test Case test1');
      expect(benchmarks[1].name).toBe('Test Case test2');
    });

    it('should run multiple benchmarks in parallel', async () => {
      const testCase1 = createTestCase('test1');
      const testCase2 = createTestCase('test2');

      runner.registerTestCase(testCase1);
      runner.registerTestCase(testCase2);

      const startTime = Date.now();
      const benchmarks = await runner.runMultipleBenchmarks(['test1', 'test2'], 3, 1, true);
      const endTime = Date.now();

      expect(benchmarks).toHaveLength(2);
      // Parallel execution should be faster than sequential
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should run benchmark suite by category', async () => {
      const testCase1 = createTestCase('test1', { category: TestCategory.UNIT });
      const testCase2 = createTestCase('test2', { category: TestCategory.INTEGRATION });
      const testCase3 = createTestCase('test3', { category: TestCategory.UNIT });

      runner.registerTestCase(testCase1);
      runner.registerTestCase(testCase2);
      runner.registerTestCase(testCase3);

      const benchmarks = await runner.runBenchmarkSuite(TestCategory.UNIT as any, 2, 1);

      expect(benchmarks).toHaveLength(2);
      expect(benchmarks.every(b => b.name.includes('test1') || b.name.includes('test3'))).toBe(true);
    });
  });

  describe('benchmark comparison', () => {
    it('should compare benchmarks', async () => {
      const fastTestCase = createTestCase('fast', {
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)))
      });
      const slowTestCase = createTestCase('slow', {
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)))
      });

      runner.registerTestCase(fastTestCase);
      runner.registerTestCase(slowTestCase);

      const fastBenchmark = await runner.runBenchmark('fast', 5, 0);
      const slowBenchmark = await runner.runBenchmark('slow', 5, 0);

      const comparison = runner.compareBenchmarks(fastBenchmark.id, slowBenchmark.id);

      expect(comparison.baseline).toBe(fastBenchmark);
      expect(comparison.current).toBe(slowBenchmark);
      expect(comparison.meanDiff).toBeGreaterThan(0);
      expect(comparison.meanDiffPercent).toBeGreaterThan(0);
      expect(comparison.isRegression).toBe(true);
      expect(comparison.isImprovement).toBe(false);
    });

    it('should handle comparison with non-existent benchmarks', () => {
      expect(() => runner.compareBenchmarks('nonexistent1', 'nonexistent2'))
        .toThrow('One or both benchmarks not found');
    });
  });

  describe('validation', () => {
    it('should validate benchmark results against expected metrics', async () => {
      const testCase = createTestCase('test1', {
        expectedMetrics: {
          maxFrameTime: 20,
          minFrameRate: 50
        },
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 30))) // Exceeds max frame time
      });
      runner.registerTestCase(testCase);

      const validationFailedSpy = jest.fn();
      runner.on('validation_failed', validationFailedSpy);

      await runner.runBenchmark('test1', 3, 0);

      expect(validationFailedSpy).toHaveBeenCalled();
      const [benchmarkId, violations] = validationFailedSpy.mock.calls[0];
      expect(typeof benchmarkId).toBe('string');
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should pass validation when metrics are within thresholds', async () => {
      const testCase = createTestCase('test1', {
        expectedMetrics: {
          maxFrameTime: 100,
          minFrameRate: 10
        },
        execute: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)))
      });
      runner.registerTestCase(testCase);

      const validationPassedSpy = jest.fn();
      runner.on('validation_passed', validationPassedSpy);

      await runner.runBenchmark('test1', 3, 0);

      expect(validationPassedSpy).toHaveBeenCalled();
    });
  });

  describe('data management', () => {
    it('should store and retrieve benchmarks', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      const benchmark = await runner.runBenchmark('test1', 3, 1);

      expect(runner.getBenchmark(benchmark.id)).toBe(benchmark);
      expect(runner.getAllBenchmarks()).toContain(benchmark);
    });

    it('should clear benchmarks', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      await runner.runBenchmark('test1', 3, 1);

      const clearedSpy = jest.fn();
      runner.on('benchmarks_cleared', clearedSpy);

      runner.clearBenchmarks();

      expect(runner.getAllBenchmarks()).toHaveLength(0);
      expect(clearedSpy).toHaveBeenCalled();
    });

    it('should export benchmarks as JSON', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      await runner.runBenchmark('test1', 3, 1);

      const jsonExport = runner.exportBenchmarks('json');
      expect(jsonExport).toBeDefined();
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const parsed = JSON.parse(jsonExport);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should export benchmarks as CSV', async () => {
      const testCase = createTestCase('test1');
      runner.registerTestCase(testCase);

      await runner.runBenchmark('test1', 3, 1);

      const csvExport = runner.exportBenchmarks('csv');
      expect(csvExport).toBeDefined();
      expect(csvExport).toContain('id,name,category');
      expect(csvExport.split('\n')).toHaveLength(2); // Header + 1 data row
    });
  });

  describe('teardown handling', () => {
    it('should handle teardown failures gracefully', async () => {
      const testCase = createTestCase('test1', {
        teardown: jest.fn().mockRejectedValue(new Error('Teardown failed'))
      });
      runner.registerTestCase(testCase);

      const teardownFailedSpy = jest.fn();
      runner.on('teardown_failed', teardownFailedSpy);

      // Should not throw despite teardown failure
      const benchmark = await runner.runBenchmark('test1', 3, 1);

      expect(benchmark).toBeDefined();
      expect(teardownFailedSpy).toHaveBeenCalled();
    });
  });
});