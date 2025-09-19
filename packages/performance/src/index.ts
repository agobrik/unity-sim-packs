export { PerformanceMonitor } from './core/PerformanceMonitor';
export { CPUProfiler } from './profiling/CPUProfiler';
export { MemoryProfiler } from './profiling/MemoryProfiler';
export { BenchmarkRunner } from './benchmarking/BenchmarkRunner';
export { AutoOptimizer } from './optimization/AutoOptimizer';

export * from './types';

export const VERSION = '1.0.0';

// Unity-compatible wrapper
export class PerformanceSimulation {
  constructor() {}

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      performance: {
        cpuUsage: 15.5,
        memoryUsage: 128.7,
        frameRate: 60,
        systemHealth: 'operational',
        framework: 'steam-sim-performance'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}