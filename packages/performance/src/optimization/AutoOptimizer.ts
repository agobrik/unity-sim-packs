import { EventEmitter } from '../utils/EventEmitter';
import {
  OptimizationStrategy,
  OptimizationContext,
  OptimizationResult,
  AutoOptimizationConfig,
  PerformanceMetrics,
  OptimizationSuggestion,
  OptimizationType,
  Priority,
  OptimizationImpact,
  Complexity,
  SystemInfo
} from '../types';

export class AutoOptimizer extends EventEmitter {
  private config: AutoOptimizationConfig;
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private activeOptimizations: Map<string, ActiveOptimization> = new Map();
  private optimizationHistory: OptimizationHistory[] = [];
  private isOptimizing: boolean = false;

  constructor(config: AutoOptimizationConfig) {
    super();
    this.config = { ...config };
    this.registerBuiltInStrategies();
  }

  public async optimize(context: OptimizationContext): Promise<OptimizationResult[]> {
    if (!this.config.enabled) {
      return [];
    }

    if (this.isOptimizing) {
      throw new Error('Optimization already in progress');
    }

    this.isOptimizing = true;
    const results: OptimizationResult[] = [];

    try {
      this.emit('optimization_started', context);

      // Analyze current performance and identify optimization opportunities
      const suggestions = await this.analyzePerformance(context);
      this.emit('analysis_completed', suggestions);

      // Apply optimizations based on configuration
      const applicableStrategies = this.selectStrategies(suggestions, context);

      for (const strategy of applicableStrategies) {
        if (this.activeOptimizations.size >= this.config.maxConcurrentOptimizations) {
          break;
        }

        try {
          const result = await this.applyOptimization(strategy, context);
          results.push(result);

          if (result.success) {
            this.emit('optimization_applied', strategy, result);
          } else {
            this.emit('optimization_failed', strategy, result);
          }

          // Check if we should rollback due to regression
          if (this.config.rollbackOnRegression && result.rollbackRequired) {
            await this.rollbackOptimization(strategy, context);
            this.emit('optimization_rolled_back', strategy);
          }

        } catch (error) {
          this.emit('optimization_error', strategy, error);
          results.push({
            success: false,
            estimatedImpact: 0,
            metricsChange: {},
            rollbackRequired: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.emit('optimization_completed', results);
      return results;

    } finally {
      this.isOptimizing = false;
    }
  }

  private async analyzePerformance(context: OptimizationContext): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    // Memory analysis
    suggestions.push(...this.analyzeMemoryPerformance(context));

    // CPU analysis
    suggestions.push(...this.analyzeCPUPerformance(context));

    // Frame rate analysis
    suggestions.push(...this.analyzeFrameRatePerformance(context));

    // Historical trend analysis
    suggestions.push(...this.analyzeHistoricalTrends(context));

    // Sort by priority and impact
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const impactOrder = { significant: 5, large: 4, moderate: 3, small: 2, minimal: 1 };

      const aScore = priorityOrder[a.priority] * impactOrder[a.impact];
      const bScore = priorityOrder[b.priority] * impactOrder[b.impact];

      return bScore - aScore;
    });
  }

  private analyzeMemoryPerformance(context: OptimizationContext): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const memory = context.metrics.memoryUsage;

    // High memory usage
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      suggestions.push({
        id: 'memory_cleanup',
        type: OptimizationType.MEMORY,
        priority: Priority.HIGH,
        description: 'High memory usage detected - implement memory cleanup',
        impact: OptimizationImpact.LARGE,
        implementation: 'Force garbage collection and implement object pooling',
        estimatedGain: (memoryUsagePercent - 70) / 100,
        complexity: Complexity.SIMPLE,
        relatedMetrics: ['memoryUsage.heapUsed', 'memoryUsage.heapTotal']
      });
    }

    // Memory leak detection
    if (this.detectMemoryLeak(context)) {
      suggestions.push({
        id: 'memory_leak_fix',
        type: OptimizationType.MEMORY,
        priority: Priority.CRITICAL,
        description: 'Memory leak detected - fix reference cleanup',
        impact: OptimizationImpact.SIGNIFICANT,
        implementation: 'Implement proper cleanup of event listeners and references',
        estimatedGain: 0.3,
        complexity: Complexity.MODERATE,
        relatedMetrics: ['memoryUsage.heapUsed']
      });
    }

    // Large external memory usage
    if (memory.external > 100 * 1024 * 1024) { // 100MB
      suggestions.push({
        id: 'external_memory_optimization',
        type: OptimizationType.MEMORY,
        priority: Priority.MEDIUM,
        description: 'High external memory usage - optimize buffer management',
        impact: OptimizationImpact.MODERATE,
        implementation: 'Implement buffer pooling and reduce buffer allocations',
        estimatedGain: 0.15,
        complexity: Complexity.MODERATE,
        relatedMetrics: ['memoryUsage.external']
      });
    }

    return suggestions;
  }

  private analyzeCPUPerformance(context: OptimizationContext): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const cpu = context.metrics.cpuUsage;

    // High CPU usage
    if (cpu.percent > 80) {
      suggestions.push({
        id: 'cpu_optimization',
        type: OptimizationType.CPU,
        priority: Priority.HIGH,
        description: 'High CPU usage detected - optimize computation',
        impact: OptimizationImpact.LARGE,
        implementation: 'Implement algorithmic optimizations and caching',
        estimatedGain: (cpu.percent - 60) / 100,
        complexity: Complexity.COMPLEX,
        relatedMetrics: ['cpuUsage.percent']
      });
    }

    // High system load
    if (cpu.loadAverage.length > 0 && cpu.loadAverage[0] > context.systemInfo.cpuCores * 2) {
      suggestions.push({
        id: 'load_balancing',
        type: OptimizationType.CPU,
        priority: Priority.MEDIUM,
        description: 'High system load - implement load balancing',
        impact: OptimizationImpact.MODERATE,
        implementation: 'Distribute work across multiple processes or workers',
        estimatedGain: 0.2,
        complexity: Complexity.VERY_COMPLEX,
        relatedMetrics: ['cpuUsage.loadAverage']
      });
    }

    return suggestions;
  }

  private analyzeFrameRatePerformance(context: OptimizationContext): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Low frame rate
    if (context.metrics.frameRate < 30) {
      suggestions.push({
        id: 'framerate_optimization',
        type: OptimizationType.RENDERING,
        priority: Priority.HIGH,
        description: 'Low frame rate detected - optimize rendering pipeline',
        impact: OptimizationImpact.LARGE,
        implementation: 'Implement frame rate limiting and rendering optimizations',
        estimatedGain: (30 - context.metrics.frameRate) / 30,
        complexity: Complexity.MODERATE,
        relatedMetrics: ['frameRate', 'frameTime']
      });
    }

    // High frame time variance
    const frameTimeVariance = this.calculateFrameTimeVariance(context);
    if (frameTimeVariance > 5) { // 5ms variance
      suggestions.push({
        id: 'frame_consistency',
        type: OptimizationType.RENDERING,
        priority: Priority.MEDIUM,
        description: 'Inconsistent frame times - stabilize rendering',
        impact: OptimizationImpact.MODERATE,
        implementation: 'Implement frame time smoothing and update scheduling',
        estimatedGain: 0.15,
        complexity: Complexity.MODERATE,
        relatedMetrics: ['frameTime']
      });
    }

    return suggestions;
  }

  private analyzeHistoricalTrends(context: OptimizationContext): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (context.historicalData.length < 10) {
      return suggestions; // Need more data
    }

    // Analyze performance degradation trends
    const degradationTrend = this.calculatePerformanceTrend(context.historicalData);

    if (degradationTrend.frameTime > 0.1) { // 10% degradation
      suggestions.push({
        id: 'performance_regression',
        type: OptimizationType.ALGORITHM,
        priority: Priority.HIGH,
        description: 'Performance regression detected - investigate recent changes',
        impact: OptimizationImpact.LARGE,
        implementation: 'Profile recent code changes and revert problematic optimizations',
        estimatedGain: degradationTrend.frameTime,
        complexity: Complexity.COMPLEX,
        relatedMetrics: ['frameTime', 'cpuUsage.percent']
      });
    }

    return suggestions;
  }

  private selectStrategies(
    suggestions: OptimizationSuggestion[],
    context: OptimizationContext
  ): OptimizationStrategy[] {
    const selectedStrategies: OptimizationStrategy[] = [];

    for (const suggestion of suggestions) {
      const strategy = this.strategies.get(suggestion.id);
      if (!strategy) {
        continue;
      }

      // Skip if complexity is too high for conservative mode
      if (this.config.conservative && suggestion.complexity === Complexity.VERY_COMPLEX) {
        continue;
      }

      // Skip if estimated gain is too low
      if (suggestion.estimatedGain < 0.05) { // 5% minimum gain
        continue;
      }

      selectedStrategies.push(strategy);

      // Limit number of strategies
      if (selectedStrategies.length >= this.config.maxConcurrentOptimizations) {
        break;
      }
    }

    return selectedStrategies;
  }

  private async applyOptimization(
    strategy: OptimizationStrategy,
    context: OptimizationContext
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Validate strategy can be applied
    const canApply = await strategy.validate(context);
    if (!canApply) {
      return {
        success: false,
        estimatedImpact: 0,
        metricsChange: {},
        rollbackRequired: false,
        error: 'Strategy validation failed'
      };
    }

    // Record baseline metrics
    const baselineMetrics = { ...context.metrics };

    // Apply the optimization
    const result = await strategy.apply(context);

    if (result.success) {
      // Start tracking this optimization
      const activeOptimization: ActiveOptimization = {
        strategy,
        context,
        startTime,
        baselineMetrics,
        result
      };

      this.activeOptimizations.set(strategy.id, activeOptimization);

      // Schedule validation after test duration
      setTimeout(() => {
        this.validateOptimization(strategy.id);
      }, this.config.testDuration);
    }

    // Record in history
    this.optimizationHistory.push({
      strategyId: strategy.id,
      timestamp: startTime,
      result,
      context: { ...context }
    });

    return result;
  }

  private async validateOptimization(strategyId: string): Promise<void> {
    const activeOptimization = this.activeOptimizations.get(strategyId);
    if (!activeOptimization) {
      return;
    }

    // Get current metrics to compare with baseline
    const currentMetrics = this.getCurrentMetrics();
    const improvement = this.calculateImprovement(
      activeOptimization.baselineMetrics,
      currentMetrics
    );

    // Check if optimization is still beneficial
    if (improvement < 0.05) { // Less than 5% improvement
      activeOptimization.result.rollbackRequired = true;

      if (this.config.rollbackOnRegression) {
        await this.rollbackOptimization(activeOptimization.strategy, activeOptimization.context);
        this.emit('optimization_auto_rolled_back', activeOptimization.strategy);
      }
    }

    this.activeOptimizations.delete(strategyId);
    this.emit('optimization_validated', strategyId, improvement);
  }

  private async rollbackOptimization(
    strategy: OptimizationStrategy,
    context: OptimizationContext
  ): Promise<void> {
    try {
      await strategy.rollback(context);
      this.emit('rollback_completed', strategy);
    } catch (error) {
      this.emit('rollback_failed', strategy, error);
    }
  }

  private calculateImprovement(baseline: PerformanceMetrics, current: PerformanceMetrics): number {
    // Calculate overall performance improvement
    const frameTimeImprovement = (baseline.frameTime - current.frameTime) / baseline.frameTime;
    const cpuImprovement = (baseline.cpuUsage.percent - current.cpuUsage.percent) / baseline.cpuUsage.percent;
    const memoryImprovement = (baseline.memoryUsage.heapUsed - current.memoryUsage.heapUsed) / baseline.memoryUsage.heapUsed;

    // Weighted average (frame time is most important)
    return (frameTimeImprovement * 0.5) + (cpuImprovement * 0.3) + (memoryImprovement * 0.2);
  }

  private getCurrentMetrics(): PerformanceMetrics {
    // In a real implementation, this would get current metrics from the monitor
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
        percent: 0, // Would be calculated from monitoring
        loadAverage: []
      },
      frameTime: 16.67, // Placeholder
      frameRate: 60, // Placeholder
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

  private detectMemoryLeak(context: OptimizationContext): boolean {
    if (context.historicalData.length < 5) {
      return false;
    }

    // Check for consistent memory growth
    const recentData = context.historicalData.slice(-5);
    let consistentGrowth = true;

    for (let i = 1; i < recentData.length; i++) {
      if (recentData[i].memoryUsage.heapUsed <= recentData[i - 1].memoryUsage.heapUsed) {
        consistentGrowth = false;
        break;
      }
    }

    // Check growth rate
    const growthRate = (recentData[recentData.length - 1].memoryUsage.heapUsed - recentData[0].memoryUsage.heapUsed) /
                      recentData[0].memoryUsage.heapUsed;

    return consistentGrowth && growthRate > 0.1; // 10% growth
  }

  private calculateFrameTimeVariance(context: OptimizationContext): number {
    if (context.historicalData.length < 10) {
      return 0;
    }

    const frameTimes = context.historicalData.slice(-10).map(m => m.frameTime);
    const average = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;

    const variance = frameTimes.reduce((sum, time) => {
      const diff = time - average;
      return sum + (diff * diff);
    }, 0) / frameTimes.length;

    return Math.sqrt(variance);
  }

  private calculatePerformanceTrend(historicalData: PerformanceMetrics[]): any {
    if (historicalData.length < 10) {
      return { frameTime: 0, cpuUsage: 0, memoryUsage: 0 };
    }

    const recent = historicalData.slice(-5);
    const older = historicalData.slice(-10, -5);

    const recentAvg = {
      frameTime: recent.reduce((sum, m) => sum + m.frameTime, 0) / recent.length,
      cpuUsage: recent.reduce((sum, m) => sum + m.cpuUsage.percent, 0) / recent.length,
      memoryUsage: recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length
    };

    const olderAvg = {
      frameTime: older.reduce((sum, m) => sum + m.frameTime, 0) / older.length,
      cpuUsage: older.reduce((sum, m) => sum + m.cpuUsage.percent, 0) / older.length,
      memoryUsage: older.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / older.length
    };

    return {
      frameTime: (recentAvg.frameTime - olderAvg.frameTime) / olderAvg.frameTime,
      cpuUsage: (recentAvg.cpuUsage - olderAvg.cpuUsage) / olderAvg.cpuUsage,
      memoryUsage: (recentAvg.memoryUsage - olderAvg.memoryUsage) / olderAvg.memoryUsage
    };
  }

  private registerBuiltInStrategies(): void {
    // Memory cleanup strategy
    this.registerStrategy({
      id: 'memory_cleanup',
      name: 'Memory Cleanup',
      description: 'Force garbage collection and clear caches',
      category: 'automatic' as any,
      apply: async (context: OptimizationContext) => {
        // Force garbage collection if available
        if ((globalThis as any).gc) {
          (globalThis as any).gc();
        }

        return {
          success: true,
          estimatedImpact: 0.1,
          metricsChange: { 'memoryUsage.heapUsed': -0.1 },
          rollbackRequired: false
        };
      },
      rollback: async (context: OptimizationContext) => {
        // No rollback needed for GC
      },
      validate: async (context: OptimizationContext) => {
        return context.metrics.memoryUsage.heapUsed > 50 * 1024 * 1024; // 50MB minimum
      }
    });

    // CPU optimization strategy
    this.registerStrategy({
      id: 'cpu_optimization',
      name: 'CPU Optimization',
      description: 'Reduce CPU intensive operations',
      category: 'automatic' as any,
      apply: async (context: OptimizationContext) => {
        // Placeholder for CPU optimization
        return {
          success: true,
          estimatedImpact: 0.15,
          metricsChange: { 'cpuUsage.percent': -0.15 },
          rollbackRequired: false
        };
      },
      rollback: async (context: OptimizationContext) => {
        // Restore previous CPU settings
      },
      validate: async (context: OptimizationContext) => {
        return context.metrics.cpuUsage.percent > 50;
      }
    });

    // Frame rate optimization strategy
    this.registerStrategy({
      id: 'framerate_optimization',
      name: 'Frame Rate Optimization',
      description: 'Optimize rendering pipeline for better frame rates',
      category: 'automatic' as any,
      apply: async (context: OptimizationContext) => {
        // Placeholder for frame rate optimization
        return {
          success: true,
          estimatedImpact: 0.2,
          metricsChange: { 'frameTime': -0.2, 'frameRate': 0.2 },
          rollbackRequired: false
        };
      },
      rollback: async (context: OptimizationContext) => {
        // Restore previous rendering settings
      },
      validate: async (context: OptimizationContext) => {
        return context.metrics.frameRate < 45;
      }
    });
  }

  public registerStrategy(strategy: OptimizationStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.emit('strategy_registered', strategy);
  }

  public unregisterStrategy(strategyId: string): boolean {
    const removed = this.strategies.delete(strategyId);
    if (removed) {
      this.emit('strategy_unregistered', strategyId);
    }
    return removed;
  }

  public getStrategies(): OptimizationStrategy[] {
    return Array.from(this.strategies.values());
  }

  public getOptimizationHistory(): OptimizationHistory[] {
    return [...this.optimizationHistory];
  }

  public clearHistory(): void {
    this.optimizationHistory = [];
    this.emit('history_cleared');
  }

  public updateConfig(newConfig: Partial<AutoOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  public getConfig(): AutoOptimizationConfig {
    return { ...this.config };
  }

  public isOptimizationActive(): boolean {
    return this.isOptimizing;
  }

  public getActiveOptimizations(): ActiveOptimization[] {
    return Array.from(this.activeOptimizations.values());
  }

  public async forceRollback(strategyId: string): Promise<void> {
    const activeOptimization = this.activeOptimizations.get(strategyId);
    if (activeOptimization) {
      await this.rollbackOptimization(activeOptimization.strategy, activeOptimization.context);
      this.activeOptimizations.delete(strategyId);
      this.emit('optimization_force_rolled_back', strategyId);
    }
  }
}

interface ActiveOptimization {
  strategy: OptimizationStrategy;
  context: OptimizationContext;
  startTime: number;
  baselineMetrics: PerformanceMetrics;
  result: OptimizationResult;
}

interface OptimizationHistory {
  strategyId: string;
  timestamp: number;
  result: OptimizationResult;
  context: OptimizationContext;
}