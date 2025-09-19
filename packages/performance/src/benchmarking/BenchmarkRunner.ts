import { EventEmitter } from '../utils/EventEmitter';
import {
  PerformanceBenchmark,
  BenchmarkResult,
  BenchmarkStatistics,
  PerformanceTestCase,
  BenchmarkCategory,
  ExpectedMetrics,
  PerformanceMetrics,
  TestCategory
} from '../types';

export class BenchmarkRunner extends EventEmitter {
  private testCases: Map<string, PerformanceTestCase> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private running: boolean = false;

  public registerTestCase(testCase: PerformanceTestCase): void {
    this.testCases.set(testCase.id, testCase);
    this.emit('test_case_registered', testCase);
  }

  public unregisterTestCase(testId: string): boolean {
    const removed = this.testCases.delete(testId);
    if (removed) {
      this.emit('test_case_unregistered', testId);
    }
    return removed;
  }

  public async runBenchmark(
    testId: string,
    iterations: number = 100,
    warmupIterations: number = 10
  ): Promise<PerformanceBenchmark> {
    const testCase = this.testCases.get(testId);
    if (!testCase) {
      throw new Error(`Test case '${testId}' not found`);
    }

    if (this.running) {
      throw new Error('Another benchmark is already running');
    }

    this.running = true;

    try {
      const benchmark = await this.executeBenchmark(testCase, iterations, warmupIterations);
      this.benchmarks.set(benchmark.id, benchmark);
      this.emit('benchmark_completed', benchmark);
      return benchmark;
    } finally {
      this.running = false;
    }
  }

  private async executeBenchmark(
    testCase: PerformanceTestCase,
    iterations: number,
    warmupIterations: number
  ): Promise<PerformanceBenchmark> {
    const benchmarkId = this.generateBenchmarkId(testCase.id);
    const startTime = Date.now();

    this.emit('benchmark_started', testCase.id);

    // Setup phase
    await this.executeSetup(testCase);

    // Warmup phase
    this.emit('warmup_started', warmupIterations);
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await this.executeTestIteration(testCase, i, true);
      } catch (error) {
        this.emit('warmup_iteration_failed', i, error);
      }
    }
    this.emit('warmup_completed');

    // Benchmark phase
    const results: BenchmarkResult[] = [];
    this.emit('benchmark_iterations_started', iterations);

    for (let i = 0; i < iterations; i++) {
      try {
        const result = await this.executeTestIteration(testCase, i, false);
        results.push(result);
        this.emit('iteration_completed', i, result);

        // Check if we should stop early due to consistent failures
        if (this.shouldStopEarly(results, i)) {
          this.emit('benchmark_stopped_early', i, results.length);
          break;
        }
      } catch (error) {
        const failedResult: BenchmarkResult = {
          iteration: i,
          timestamp: Date.now(),
          duration: 0,
          metrics: this.getEmptyMetrics(),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
        results.push(failedResult);
        this.emit('iteration_failed', i, error);
      }
    }

    // Teardown phase
    await this.executeTeardown(testCase);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    const statistics = this.calculateStatistics(results.filter(r => r.success));

    const benchmark: PerformanceBenchmark = {
      id: benchmarkId,
      name: testCase.name,
      description: testCase.description,
      category: this.mapTestCategoryToBenchmarkCategory(testCase.category),
      duration: totalDuration,
      iterations: results.length,
      warmupIterations,
      results,
      statistics
    };

    // Validate results against expected metrics
    this.validateBenchmarkResults(benchmark, testCase.expectedMetrics);

    return benchmark;
  }

  private async executeSetup(testCase: PerformanceTestCase): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Setup timeout')), testCase.timeout);
    });

    try {
      await Promise.race([testCase.setup(), timeoutPromise]);
    } catch (error) {
      throw new Error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeTestIteration(
    testCase: PerformanceTestCase,
    iteration: number,
    isWarmup: boolean
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const startMetrics = this.captureMetrics();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Test iteration timeout')), testCase.timeout);
    });

    try {
      await Promise.race([testCase.execute(), timeoutPromise]);

      const endTime = Date.now();
      const endMetrics = this.captureMetrics();
      const duration = endTime - startTime;

      // Calculate metrics difference
      const metrics = this.calculateMetricsDiff(startMetrics, endMetrics, duration);

      return {
        iteration,
        timestamp: startTime,
        duration,
        metrics,
        success: true
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        iteration,
        timestamp: startTime,
        duration,
        metrics: this.getEmptyMetrics(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeTeardown(testCase: PerformanceTestCase): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Teardown timeout')), testCase.timeout);
    });

    try {
      await Promise.race([testCase.teardown(), timeoutPromise]);
    } catch (error) {
      this.emit('teardown_failed', error);
      // Don't throw here, as teardown failure shouldn't fail the benchmark
    }
  }

  private captureMetrics(): PerformanceMetrics {
    const memoryUsage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    const cpuUsage = (globalThis as any).process?.cpuUsage?.() || { user: 0, system: 0 };

    return {
      timestamp: Date.now(),
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        arrayBuffers: memoryUsage.arrayBuffers || 0
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        percent: 0, // Will be calculated in diff
        loadAverage: []
      },
      frameTime: 0,
      frameRate: 0,
      renderTime: 0,
      updateTime: 0,
      gcStats: {
        collections: 0,
        pauseTime: 0,
        heapSizeBefore: 0,
        heapSizeAfter: 0,
        freed: 0
      },
      custom: {}
    };
  }

  private calculateMetricsDiff(
    startMetrics: PerformanceMetrics,
    endMetrics: PerformanceMetrics,
    duration: number
  ): PerformanceMetrics {
    const memoryDiff = endMetrics.memoryUsage.heapUsed - startMetrics.memoryUsage.heapUsed;
    const cpuUserDiff = endMetrics.cpuUsage.user - startMetrics.cpuUsage.user;
    const cpuSystemDiff = endMetrics.cpuUsage.system - startMetrics.cpuUsage.system;

    // Calculate CPU percentage for this iteration
    const cpuPercent = duration > 0 ? ((cpuUserDiff + cpuSystemDiff) / (duration * 1000)) * 100 : 0;

    return {
      timestamp: endMetrics.timestamp,
      memoryUsage: {
        heapUsed: memoryDiff,
        heapTotal: endMetrics.memoryUsage.heapTotal,
        external: endMetrics.memoryUsage.external - startMetrics.memoryUsage.external,
        rss: endMetrics.memoryUsage.rss - startMetrics.memoryUsage.rss,
        arrayBuffers: endMetrics.memoryUsage.arrayBuffers - startMetrics.memoryUsage.arrayBuffers
      },
      cpuUsage: {
        user: cpuUserDiff,
        system: cpuSystemDiff,
        percent: Math.min(cpuPercent, 100),
        loadAverage: []
      },
      frameTime: duration,
      frameRate: duration > 0 ? 1000 / duration : 0,
      renderTime: 0,
      updateTime: duration,
      gcStats: {
        collections: 0,
        pauseTime: 0,
        heapSizeBefore: 0,
        heapSizeAfter: 0,
        freed: 0
      },
      custom: {
        iterationDuration: duration
      }
    };
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0
      },
      cpuUsage: {
        user: 0,
        system: 0,
        percent: 0,
        loadAverage: []
      },
      frameTime: 0,
      frameRate: 0,
      renderTime: 0,
      updateTime: 0,
      gcStats: {
        collections: 0,
        pauseTime: 0,
        heapSizeBefore: 0,
        heapSizeAfter: 0,
        freed: 0
      },
      custom: {}
    };
  }

  private shouldStopEarly(results: BenchmarkResult[], currentIteration: number): boolean {
    const minIterations = 10;
    const maxFailureRate = 0.5; // 50% failure rate

    if (currentIteration < minIterations) {
      return false;
    }

    const recentResults = results.slice(-minIterations);
    const failureCount = recentResults.filter(r => !r.success).length;
    const failureRate = failureCount / recentResults.length;

    return failureRate > maxFailureRate;
  }

  private calculateStatistics(successfulResults: BenchmarkResult[]): BenchmarkStatistics {
    if (successfulResults.length === 0) {
      return {
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        variance: 0,
        percentiles: {},
        outliers: []
      };
    }

    const durations = successfulResults.map(r => r.duration).sort((a, b) => a - b);

    const mean = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    const median = this.calculateMedian(durations);
    const min = durations[0];
    const max = durations[durations.length - 1];

    const variance = durations.reduce((sum, duration) => {
      const diff = duration - mean;
      return sum + (diff * diff);
    }, 0) / durations.length;

    const standardDeviation = Math.sqrt(variance);

    const percentiles = this.calculatePercentiles(durations);
    const outliers = this.detectOutliers(durations, mean, standardDeviation);

    return {
      mean,
      median,
      min,
      max,
      standardDeviation,
      variance,
      percentiles,
      outliers
    };
  }

  private calculateMedian(sortedValues: number[]): number {
    const length = sortedValues.length;
    if (length % 2 === 0) {
      return (sortedValues[length / 2 - 1] + sortedValues[length / 2]) / 2;
    } else {
      return sortedValues[Math.floor(length / 2)];
    }
  }

  private calculatePercentiles(sortedValues: number[]): Record<number, number> {
    const percentiles: Record<number, number> = {};
    const percentilePoints = [50, 75, 90, 95, 99];

    for (const p of percentilePoints) {
      const index = Math.ceil((p / 100) * sortedValues.length) - 1;
      percentiles[p] = sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
    }

    return percentiles;
  }

  private detectOutliers(values: number[], mean: number, standardDeviation: number): number[] {
    const threshold = 2; // 2 standard deviations
    const outliers: number[] = [];

    for (const value of values) {
      const zScore = Math.abs(value - mean) / standardDeviation;
      if (zScore > threshold) {
        outliers.push(value);
      }
    }

    return outliers;
  }

  private validateBenchmarkResults(benchmark: PerformanceBenchmark, expectedMetrics: ExpectedMetrics): void {
    const successfulResults = benchmark.results.filter(r => r.success);

    if (successfulResults.length === 0) {
      this.emit('validation_failed', benchmark.id, 'No successful iterations');
      return;
    }

    const violations: string[] = [];

    // Check frame time
    if (expectedMetrics.maxFrameTime !== undefined) {
      const avgFrameTime = benchmark.statistics.mean;
      if (avgFrameTime > expectedMetrics.maxFrameTime) {
        violations.push(`Average frame time ${avgFrameTime.toFixed(2)}ms exceeds limit ${expectedMetrics.maxFrameTime}ms`);
      }
    }

    // Check frame rate
    if (expectedMetrics.minFrameRate !== undefined) {
      const avgFrameRate = successfulResults.reduce((sum, r) => sum + r.metrics.frameRate, 0) / successfulResults.length;
      if (avgFrameRate < expectedMetrics.minFrameRate) {
        violations.push(`Average frame rate ${avgFrameRate.toFixed(2)} below minimum ${expectedMetrics.minFrameRate}`);
      }
    }

    // Check memory usage
    if (expectedMetrics.maxMemoryUsage !== undefined) {
      const maxMemoryUsed = Math.max(...successfulResults.map(r => r.metrics.memoryUsage.heapUsed));
      if (maxMemoryUsed > expectedMetrics.maxMemoryUsage) {
        violations.push(`Peak memory usage ${(maxMemoryUsed / 1024 / 1024).toFixed(2)}MB exceeds limit ${(expectedMetrics.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
    }

    // Check CPU usage
    if (expectedMetrics.maxCPUUsage !== undefined) {
      const avgCPUUsage = successfulResults.reduce((sum, r) => sum + r.metrics.cpuUsage.percent, 0) / successfulResults.length;
      if (avgCPUUsage > expectedMetrics.maxCPUUsage) {
        violations.push(`Average CPU usage ${avgCPUUsage.toFixed(2)}% exceeds limit ${expectedMetrics.maxCPUUsage}%`);
      }
    }

    // Check custom thresholds
    if (expectedMetrics.customThresholds) {
      for (const [metric, threshold] of Object.entries(expectedMetrics.customThresholds)) {
        const avgCustomValue = successfulResults.reduce((sum, r) => sum + (r.metrics.custom[metric] || 0), 0) / successfulResults.length;
        if (avgCustomValue > threshold) {
          violations.push(`Custom metric '${metric}' average ${avgCustomValue.toFixed(2)} exceeds threshold ${threshold}`);
        }
      }
    }

    if (violations.length > 0) {
      this.emit('validation_failed', benchmark.id, violations);
    } else {
      this.emit('validation_passed', benchmark.id);
    }
  }

  public async runMultipleBenchmarks(
    testIds: string[],
    iterations: number = 100,
    warmupIterations: number = 10,
    parallel: boolean = false
  ): Promise<PerformanceBenchmark[]> {
    if (parallel) {
      const promises = testIds.map(id => this.runBenchmark(id, iterations, warmupIterations));
      return Promise.all(promises);
    } else {
      const results: PerformanceBenchmark[] = [];
      for (const testId of testIds) {
        const benchmark = await this.runBenchmark(testId, iterations, warmupIterations);
        results.push(benchmark);
      }
      return results;
    }
  }

  public async runBenchmarkSuite(
    category?: BenchmarkCategory,
    iterations: number = 100,
    warmupIterations: number = 10
  ): Promise<PerformanceBenchmark[]> {
    let testIds = Array.from(this.testCases.keys());

    if (category) {
      testIds = testIds.filter(id => {
        const testCase = this.testCases.get(id);
        return testCase && this.mapTestCategoryToBenchmarkCategory(testCase.category) === category;
      });
    }

    return this.runMultipleBenchmarks(testIds, iterations, warmupIterations, false);
  }

  public compareBenchmarks(benchmark1Id: string, benchmark2Id: string): BenchmarkComparison {
    const benchmark1 = this.benchmarks.get(benchmark1Id);
    const benchmark2 = this.benchmarks.get(benchmark2Id);

    if (!benchmark1 || !benchmark2) {
      throw new Error('One or both benchmarks not found');
    }

    return {
      baseline: benchmark1,
      current: benchmark2,
      meanDiff: benchmark2.statistics.mean - benchmark1.statistics.mean,
      meanDiffPercent: ((benchmark2.statistics.mean - benchmark1.statistics.mean) / benchmark1.statistics.mean) * 100,
      medianDiff: benchmark2.statistics.median - benchmark1.statistics.median,
      medianDiffPercent: ((benchmark2.statistics.median - benchmark1.statistics.median) / benchmark1.statistics.median) * 100,
      isRegression: benchmark2.statistics.mean > benchmark1.statistics.mean * 1.05, // 5% regression threshold
      isImprovement: benchmark2.statistics.mean < benchmark1.statistics.mean * 0.95, // 5% improvement threshold
      significance: this.calculateSignificance(benchmark1, benchmark2)
    };
  }

  private calculateSignificance(benchmark1: PerformanceBenchmark, benchmark2: PerformanceBenchmark): 'low' | 'medium' | 'high' {
    const diff = Math.abs(benchmark2.statistics.mean - benchmark1.statistics.mean);
    const avgStdDev = (benchmark1.statistics.standardDeviation + benchmark2.statistics.standardDeviation) / 2;

    if (diff > avgStdDev * 2) {
      return 'high';
    } else if (diff > avgStdDev) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private mapTestCategoryToBenchmarkCategory(testCategory: TestCategory): BenchmarkCategory {
    switch (testCategory) {
      case TestCategory.UNIT:
        return BenchmarkCategory.MICRO;
      case TestCategory.INTEGRATION:
        return BenchmarkCategory.INTEGRATION;
      case TestCategory.LOAD:
      case TestCategory.STRESS:
        return BenchmarkCategory.STRESS;
      case TestCategory.MEMORY:
      case TestCategory.CPU:
        return BenchmarkCategory.COMPONENT;
      default:
        return BenchmarkCategory.MICRO;
    }
  }

  private generateBenchmarkId(testId: string): string {
    return `benchmark_${testId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getBenchmark(id: string): PerformanceBenchmark | undefined {
    return this.benchmarks.get(id);
  }

  public getAllBenchmarks(): PerformanceBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  public getTestCases(): PerformanceTestCase[] {
    return Array.from(this.testCases.values());
  }

  public getTestCase(id: string): PerformanceTestCase | undefined {
    return this.testCases.get(id);
  }

  public clearBenchmarks(): void {
    this.benchmarks.clear();
    this.emit('benchmarks_cleared');
  }

  public exportBenchmarks(format: 'json' | 'csv' = 'json'): string {
    const benchmarks = this.getAllBenchmarks();

    if (format === 'csv') {
      return this.exportBenchmarksAsCSV(benchmarks);
    } else {
      return JSON.stringify(benchmarks, null, 2);
    }
  }

  private exportBenchmarksAsCSV(benchmarks: PerformanceBenchmark[]): string {
    if (benchmarks.length === 0) {
      return '';
    }

    const headers = [
      'id',
      'name',
      'category',
      'iterations',
      'mean',
      'median',
      'min',
      'max',
      'standardDeviation',
      'successRate'
    ];

    const rows = [headers.join(',')];

    for (const benchmark of benchmarks) {
      const successRate = (benchmark.results.filter(r => r.success).length / benchmark.results.length) * 100;

      const row = [
        benchmark.id,
        `"${benchmark.name}"`,
        benchmark.category,
        benchmark.iterations,
        benchmark.statistics.mean.toFixed(2),
        benchmark.statistics.median.toFixed(2),
        benchmark.statistics.min.toFixed(2),
        benchmark.statistics.max.toFixed(2),
        benchmark.statistics.standardDeviation.toFixed(2),
        successRate.toFixed(2)
      ];

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  public isRunning(): boolean {
    return this.running;
  }
}

interface BenchmarkComparison {
  baseline: PerformanceBenchmark;
  current: PerformanceBenchmark;
  meanDiff: number;
  meanDiffPercent: number;
  medianDiff: number;
  medianDiffPercent: number;
  isRegression: boolean;
  isImprovement: boolean;
  significance: 'low' | 'medium' | 'high';
}