import { EventEmitter } from '../utils/EventEmitter';
import {
  MemoryProfiler as IMemoryProfiler,
  MemoryProfilerOptions,
  MemoryAnalysis,
  MemorySnapshot,
  MemoryComparison,
  MemoryLeak,
  AllocationSummary,
  RetentionAnalysis,
  Retainer,
  DominatorNode,
  RetentionGraph,
  RetentionNode,
  RetentionEdge,
  EdgeType,
  ObjectDiff,
  MemoryComparisonSummary
} from '../types';

export class MemoryProfiler extends EventEmitter implements IMemoryProfiler {
  private isProfilingActive: boolean = false;
  private options: Required<MemoryProfilerOptions>;
  private snapshots: Map<string, MemorySnapshot> = new Map();
  private allocationTracker?: AllocationTracker;
  private leakDetector?: LeakDetector;

  constructor(options: MemoryProfilerOptions = {}) {
    super();
    this.options = {
      trackAllocations: options.trackAllocations || true,
      stackDepth: options.stackDepth || 10,
      sampleInterval: options.sampleInterval || 1000,
      includeObjectIds: options.includeObjectIds || false
    };
  }

  public async start(options?: MemoryProfilerOptions): Promise<void> {
    if (this.isProfilingActive) {
      throw new Error('Memory profiler is already running');
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.isProfilingActive = true;

    if (this.options.trackAllocations) {
      this.allocationTracker = new AllocationTracker(this.options);
      await this.allocationTracker.start();
    }

    this.leakDetector = new LeakDetector(this.options);
    await this.leakDetector.start();

    this.emit('profiling_started');
  }

  public async stop(): Promise<MemoryAnalysis> {
    if (!this.isProfilingActive) {
      throw new Error('Memory profiler is not running');
    }

    this.isProfilingActive = false;

    let allocations: AllocationSummary[] = [];
    if (this.allocationTracker) {
      allocations = await this.allocationTracker.getSummary();
      await this.allocationTracker.stop();
    }

    let leaks: MemoryLeak[] = [];
    let retentions: RetentionAnalysis[] = [];
    if (this.leakDetector) {
      leaks = await this.leakDetector.detectLeaks();
      retentions = await this.leakDetector.getRetentionAnalysis();
      await this.leakDetector.stop();
    }

    const analysis: MemoryAnalysis = {
      leaks,
      allocations,
      retentions,
      fragmentationIndex: this.calculateFragmentationIndex(),
      recommendations: this.generateRecommendations(leaks, allocations, retentions)
    };

    this.emit('profiling_stopped', analysis);
    return analysis;
  }

  public async takeSnapshot(): Promise<MemorySnapshot> {
    const id = this.generateSnapshotId();
    const timestamp = Date.now();

    // Force garbage collection before taking snapshot
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }

    const memoryUsage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    const objectCounts = await this.getObjectCounts();
    const retentionGraph = await this.buildRetentionGraph();

    const snapshot: MemorySnapshot = {
      id,
      timestamp,
      totalSize: memoryUsage.heapUsed,
      objectCounts,
      retentionGraph
    };

    this.snapshots.set(id, snapshot);
    this.emit('snapshot_taken', snapshot);

    return snapshot;
  }

  public async compareSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<MemoryComparison> {
    const snapshot1 = this.snapshots.get(snapshot1Id);
    const snapshot2 = this.snapshots.get(snapshot2Id);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const comparison = this.performSnapshotComparison(snapshot1, snapshot2);
    this.emit('snapshots_compared', comparison);

    return comparison;
  }

  public async detectLeaks(): Promise<MemoryLeak[]> {
    if (!this.leakDetector) {
      this.leakDetector = new LeakDetector(this.options);
      await this.leakDetector.start();
    }

    return await this.leakDetector.detectLeaks();
  }

  private async getObjectCounts(): Promise<Record<string, number>> {
    // In a real implementation, this would use V8 heap inspection
    // For now, we'll simulate with basic memory information
    const counts: Record<string, number> = {};

    // Simulate object type counting
    const memUsage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    counts['Object'] = Math.floor(memUsage.heapUsed / 1000);
    counts['Array'] = Math.floor(memUsage.heapUsed / 5000);
    counts['String'] = Math.floor(memUsage.heapUsed / 2000);
    counts['Function'] = Math.floor(memUsage.heapUsed / 10000);
    counts['Buffer'] = Math.floor(memUsage.external / 1024);

    return counts;
  }

  private async buildRetentionGraph(): Promise<RetentionGraph> {
    // Simplified retention graph building
    const nodes: RetentionNode[] = [];
    const edges: RetentionEdge[] = [];

    // In a real implementation, this would traverse the actual object graph
    // For now, we'll create a simplified example
    const objectTypes = ['Object', 'Array', 'String', 'Function', 'Buffer'];
    let nodeId = 0;

    for (const type of objectTypes) {
      const count = Math.floor(Math.random() * 1000) + 100;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const id = `${type}_${nodeId++}`;
        const size = Math.floor(Math.random() * 1024) + 64;

        nodes.push({
          id,
          type,
          size,
          retainedSize: size + Math.floor(Math.random() * 512)
        });
      }
    }

    // Create some example edges
    for (let i = 0; i < Math.min(nodes.length - 1, 50); i++) {
      edges.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        property: 'reference',
        type: EdgeType.PROPERTY
      });
    }

    return { nodes, edges };
  }

  private performSnapshotComparison(snapshot1: MemorySnapshot, snapshot2: MemorySnapshot): MemoryComparison {
    const added: ObjectDiff[] = [];
    const removed: ObjectDiff[] = [];
    const changed: ObjectDiff[] = [];

    // Compare object counts
    const allTypes = new Set([
      ...Object.keys(snapshot1.objectCounts),
      ...Object.keys(snapshot2.objectCounts)
    ]);

    for (const type of allTypes) {
      const count1 = snapshot1.objectCounts[type] || 0;
      const count2 = snapshot2.objectCounts[type] || 0;
      const countDiff = count2 - count1;

      if (countDiff !== 0) {
        const diff: ObjectDiff = {
          type,
          countDiff,
          sizeDiff: countDiff * 64, // Estimate size difference
          examples: [] // Would contain actual object examples
        };

        if (count1 === 0) {
          added.push(diff);
        } else if (count2 === 0) {
          removed.push(diff);
        } else {
          changed.push(diff);
        }
      }
    }

    const summary: MemoryComparisonSummary = {
      totalSizeDiff: snapshot2.totalSize - snapshot1.totalSize,
      totalCountDiff: this.getTotalObjectCount(snapshot2) - this.getTotalObjectCount(snapshot1),
      largestGrowth: this.findLargestChange(changed, false),
      largestShrinkage: this.findLargestChange(changed, true)
    };

    return {
      added,
      removed,
      changed,
      summary
    };
  }

  private getTotalObjectCount(snapshot: MemorySnapshot): number {
    return Object.values(snapshot.objectCounts).reduce((sum, count) => sum + count, 0);
  }

  private findLargestChange(changes: ObjectDiff[], findShrinkage: boolean): ObjectDiff {
    if (changes.length === 0) {
      return { type: 'none', countDiff: 0, sizeDiff: 0, examples: [] };
    }

    return changes.reduce((largest, current) => {
      const currentChange = findShrinkage ? -current.sizeDiff : current.sizeDiff;
      const largestChange = findShrinkage ? -largest.sizeDiff : largest.sizeDiff;
      return currentChange > largestChange ? current : largest;
    });
  }

  private calculateFragmentationIndex(): number {
    // Simplified fragmentation calculation
    const memUsage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    const utilizationRatio = memUsage.heapUsed / memUsage.heapTotal;

    // Higher fragmentation = lower utilization efficiency
    return Math.max(0, 1 - utilizationRatio);
  }

  private generateRecommendations(
    leaks: MemoryLeak[],
    allocations: AllocationSummary[],
    retentions: RetentionAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Leak-based recommendations
    if (leaks.length > 0) {
      recommendations.push('Memory leaks detected - review object lifecycle management');

      const highConfidenceLeaks = leaks.filter(leak => leak.confidence > 0.8);
      if (highConfidenceLeaks.length > 0) {
        recommendations.push('High-confidence leaks found - prioritize fixing these first');
      }
    }

    // Allocation-based recommendations
    const largeAllocations = allocations.filter(alloc => alloc.averageSize > 1024 * 1024); // 1MB
    if (largeAllocations.length > 0) {
      recommendations.push('Large object allocations detected - consider object pooling');
    }

    const frequentAllocations = allocations.filter(alloc => alloc.count > 10000);
    if (frequentAllocations.length > 0) {
      recommendations.push('High-frequency allocations found - consider caching or reduction strategies');
    }

    // Retention-based recommendations
    const largeRetentions = retentions.filter(ret => ret.retainedSize > 10 * 1024 * 1024); // 10MB
    if (largeRetentions.length > 0) {
      recommendations.push('Large retained object graphs detected - review reference management');
    }

    // Fragmentation recommendations
    const fragmentationIndex = this.calculateFragmentationIndex();
    if (fragmentationIndex > 0.3) {
      recommendations.push('High memory fragmentation - consider periodic garbage collection');
    }

    return recommendations;
  }

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getSnapshots(): MemorySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  public getSnapshot(id: string): MemorySnapshot | undefined {
    return this.snapshots.get(id);
  }

  public deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  public clearSnapshots(): void {
    this.snapshots.clear();
    this.emit('snapshots_cleared');
  }
}

// Helper classes for memory profiling

class AllocationTracker {
  private isTracking: boolean = false;
  private allocations: Map<string, AllocationSummary> = new Map();
  private options: Required<MemoryProfilerOptions>;

  constructor(options: Required<MemoryProfilerOptions>) {
    this.options = options;
  }

  public async start(): Promise<void> {
    this.isTracking = true;
    this.allocations.clear();

    // In a real implementation, this would hook into V8's allocation tracking
    // For now, we'll simulate allocation tracking
    this.simulateAllocations();
  }

  public async stop(): Promise<void> {
    this.isTracking = false;
  }

  public async getSummary(): Promise<AllocationSummary[]> {
    return Array.from(this.allocations.values());
  }

  private simulateAllocations(): void {
    // Simulate different types of allocations
    const objectTypes = ['Object', 'Array', 'String', 'Buffer', 'Function'];

    for (const type of objectTypes) {
      const count = Math.floor(Math.random() * 5000) + 1000;
      const totalSize = Math.floor(Math.random() * 10 * 1024 * 1024) + 1024 * 1024; // 1-10MB
      const averageSize = totalSize / count;

      // Generate some example stack traces
      const stackTraces = this.generateStackTraces(Math.min(count, 10));

      this.allocations.set(type, {
        type,
        count,
        totalSize,
        averageSize,
        stackTraces
      });
    }
  }

  private generateStackTraces(count: number): any[][] {
    const stackTraces = [];
    const functions = ['allocateObject', 'createArray', 'processData', 'handleRequest', 'initializeComponent'];

    for (let i = 0; i < count; i++) {
      const stackTrace = [];
      const depth = Math.floor(Math.random() * this.options.stackDepth) + 1;

      for (let j = 0; j < depth; j++) {
        stackTrace.push({
          functionName: functions[Math.floor(Math.random() * functions.length)],
          fileName: `file${j}.js`,
          lineNumber: Math.floor(Math.random() * 100) + 1
        });
      }

      stackTraces.push(stackTrace);
    }

    return stackTraces;
  }
}

class LeakDetector {
  private isDetecting: boolean = false;
  private options: Required<MemoryProfilerOptions>;
  private baselineSnapshot?: MemorySnapshot;
  private leakCandidates: Map<string, LeakCandidate> = new Map();

  constructor(options: Required<MemoryProfilerOptions>) {
    this.options = options;
  }

  public async start(): Promise<void> {
    this.isDetecting = true;
    this.leakCandidates.clear();

    // Take baseline snapshot
    this.baselineSnapshot = await this.takeInternalSnapshot();

    // Start monitoring for potential leaks
    this.startMonitoring();
  }

  public async stop(): Promise<void> {
    this.isDetecting = false;
  }

  public async detectLeaks(): Promise<MemoryLeak[]> {
    const leaks: MemoryLeak[] = [];

    for (const candidate of this.leakCandidates.values()) {
      if (this.isLikelyLeak(candidate)) {
        leaks.push(this.candidateToLeak(candidate));
      }
    }

    return leaks;
  }

  public async getRetentionAnalysis(): Promise<RetentionAnalysis[]> {
    // Simplified retention analysis
    const analysis: RetentionAnalysis[] = [];

    const objectTypes = ['Object', 'Array', 'String', 'Buffer'];
    for (const type of objectTypes) {
      const retainedCount = Math.floor(Math.random() * 1000) + 100;
      const retainedSize = retainedCount * (Math.floor(Math.random() * 1024) + 64);

      const retainers: Retainer[] = [
        {
          type: 'Window',
          property: 'global',
          retainedSize: retainedSize * 0.3
        },
        {
          type: 'Closure',
          property: 'scope',
          retainedSize: retainedSize * 0.7
        }
      ];

      const dominatorTree: DominatorNode[] = [
        {
          id: `${type}_dominator`,
          size: retainedSize,
          type,
          children: []
        }
      ];

      analysis.push({
        objectType: type,
        retainedCount,
        retainedSize,
        retainers,
        dominatorTree
      });
    }

    return analysis;
  }

  private async takeInternalSnapshot(): Promise<MemorySnapshot> {
    // Simplified snapshot taking
    return {
      id: `internal_${Date.now()}`,
      timestamp: Date.now(),
      totalSize: ((globalThis as any).process?.memoryUsage?.() || { heapUsed: 0 }).heapUsed,
      objectCounts: {
        'Object': 1000,
        'Array': 500,
        'String': 2000
      },
      retentionGraph: { nodes: [], edges: [] }
    };
  }

  private startMonitoring(): void {
    // Simulate leak detection by tracking object growth
    const checkInterval = setInterval(() => {
      if (!this.isDetecting) {
        clearInterval(checkInterval);
        return;
      }

      this.checkForLeaks();
    }, this.options.sampleInterval);
  }

  private checkForLeaks(): void {
    // Simulate leak candidate detection
    const objectTypes = ['Object', 'Array', 'String', 'Buffer'];

    for (const type of objectTypes) {
      const existingCandidate = this.leakCandidates.get(type);
      const currentSize = Math.floor(Math.random() * 1024 * 1024) + 512 * 1024;

      if (existingCandidate) {
        existingCandidate.sizes.push(currentSize);
        existingCandidate.lastSeen = Date.now();
        this.calculateGrowthRate(existingCandidate);
      } else {
        const candidate: LeakCandidate = {
          type,
          sizes: [currentSize],
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          growthRate: 0,
          confidence: 0
        };
        this.leakCandidates.set(type, candidate);
      }
    }
  }

  private calculateGrowthRate(candidate: LeakCandidate): void {
    if (candidate.sizes.length < 2) {
      return;
    }

    const recentSizes = candidate.sizes.slice(-10); // Last 10 measurements
    const timeSpan = (candidate.lastSeen - candidate.firstSeen) / 1000; // seconds

    if (timeSpan > 0) {
      const totalGrowth = recentSizes[recentSizes.length - 1] - recentSizes[0];
      candidate.growthRate = totalGrowth / timeSpan; // bytes per second
    }

    this.calculateConfidence(candidate);
  }

  private calculateConfidence(candidate: LeakCandidate): void {
    // Simple confidence calculation based on consistent growth
    if (candidate.sizes.length < 5) {
      candidate.confidence = 0;
      return;
    }

    const recentSizes = candidate.sizes.slice(-5);
    let growthConsistent = true;

    for (let i = 1; i < recentSizes.length; i++) {
      if (recentSizes[i] < recentSizes[i - 1]) {
        growthConsistent = false;
        break;
      }
    }

    if (growthConsistent && candidate.growthRate > 1024) { // 1KB/s growth
      candidate.confidence = Math.min(0.9, candidate.sizes.length / 20);
    } else {
      candidate.confidence = 0;
    }
  }

  private isLikelyLeak(candidate: LeakCandidate): boolean {
    return candidate.confidence > 0.5 && candidate.growthRate > 1024; // 1KB/s
  }

  private candidateToLeak(candidate: LeakCandidate): MemoryLeak {
    return {
      type: candidate.type,
      size: candidate.sizes[candidate.sizes.length - 1],
      growthRate: candidate.growthRate,
      stackTrace: this.generateLeakStackTrace(),
      firstSeen: candidate.firstSeen,
      lastSeen: candidate.lastSeen,
      confidence: candidate.confidence
    };
  }

  private generateLeakStackTrace(): any[] {
    // Generate a simulated stack trace for the leak
    return [
      { functionName: 'leakyFunction', fileName: 'leaky.js', lineNumber: 42 },
      { functionName: 'processData', fileName: 'processor.js', lineNumber: 123 },
      { functionName: 'handleRequest', fileName: 'server.js', lineNumber: 456 }
    ];
  }
}

interface LeakCandidate {
  type: string;
  sizes: number[];
  firstSeen: number;
  lastSeen: number;
  growthRate: number;
  confidence: number;
}