import { EventEmitter } from '../utils/EventEmitter';
import {
  CPUProfiler as ICPUProfiler,
  ProfileSnapshot,
  CallTreeNode,
  ProfileSample,
  StackFrame,
  ProfilerOptions,
  PerformanceReport,
  PerformanceMetrics
} from '../types';

export class CPUProfiler extends EventEmitter implements ICPUProfiler {
  private isProfileActive: boolean = false;
  private startTime: number = 0;
  private samples: ProfileSample[] = [];
  private sampleInterval?: any;
  private options: Required<ProfilerOptions>;
  private callTree: Map<string, CallTreeNode> = new Map();

  constructor(options: ProfilerOptions = {}) {
    super();
    this.options = {
      samplingInterval: options.samplingInterval || 1,
      includeLineNumbers: options.includeLineNumbers || true,
      includeColumns: options.includeColumns || false,
      stackDepth: options.stackDepth || 50,
      filterModules: options.filterModules || []
    };
  }

  public async start(options?: ProfilerOptions): Promise<void> {
    if (this.isProfileActive) {
      throw new Error('Profiler is already running');
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.isProfileActive = true;
    this.startTime = Date.now();
    this.samples = [];
    this.callTree.clear();

    // Start sampling
    this.sampleInterval = setInterval(() => {
      this.takeSample();
    }, this.options.samplingInterval);

    this.emit('profiling_started');
  }

  public async stop(): Promise<ProfileSnapshot> {
    if (!this.isProfileActive) {
      throw new Error('Profiler is not running');
    }

    this.isProfileActive = false;

    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = undefined;
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Build call tree from samples
    const callTree = this.buildCallTree();

    const snapshot: ProfileSnapshot = {
      id: this.generateSnapshotId(),
      name: `CPU Profile ${new Date().toISOString()}`,
      timestamp: this.startTime,
      duration,
      metrics: this.calculateMetrics(),
      callTree,
      samples: [...this.samples]
    };

    this.emit('profiling_stopped', snapshot);
    return snapshot;
  }

  public pause(): void {
    if (!this.isProfileActive) {
      return;
    }

    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = undefined;
    }

    this.emit('profiling_paused');
  }

  public resume(): void {
    if (!this.isProfileActive || this.sampleInterval) {
      return;
    }

    this.sampleInterval = setInterval(() => {
      this.takeSample();
    }, this.options.samplingInterval);

    this.emit('profiling_resumed');
  }

  public isRunning(): boolean {
    return this.isProfileActive;
  }

  private takeSample(): void {
    try {
      const stackTrace = this.captureStackTrace();
      const cpuUsage = this.getCurrentCPUUsage();
      const memoryUsage = this.getCurrentMemoryUsage();

      const sample: ProfileSample = {
        timestamp: Date.now(),
        stackTrace,
        cpuUsage,
        memoryUsage
      };

      this.samples.push(sample);
      this.updateCallTree(stackTrace);

    } catch (error) {
      this.emit('sampling_error', error);
    }
  }

  private captureStackTrace(): StackFrame[] {
    const stack: StackFrame[] = [];

    // Capture current stack trace
    const error = new Error();
    const stackLines = error.stack?.split('\n') || [];

    for (let i = 1; i < Math.min(stackLines.length, this.options.stackDepth + 1); i++) {
      const line = stackLines[i].trim();
      const frame = this.parseStackFrame(line);

      if (frame && this.shouldIncludeFrame(frame)) {
        stack.push(frame);
      }
    }

    return stack;
  }

  private parseStackFrame(line: string): StackFrame | null {
    // Parse stack frame line (format: "at functionName (file:line:column)")
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)|at\s+(.+?):(\d+):(\d+)|at\s+(.+)/);

    if (!match) {
      return null;
    }

    let functionName = '';
    let fileName: string | undefined;
    let lineNumber: number | undefined;
    let columnNumber: number | undefined;

    if (match[1] && match[2]) {
      // Format: "at functionName (file:line:column)"
      functionName = match[1];
      fileName = match[2];
      lineNumber = this.options.includeLineNumbers ? parseInt(match[3]) : undefined;
      columnNumber = this.options.includeColumns ? parseInt(match[4]) : undefined;
    } else if (match[5]) {
      // Format: "at file:line:column"
      functionName = '<anonymous>';
      fileName = match[5];
      lineNumber = this.options.includeLineNumbers ? parseInt(match[6]) : undefined;
      columnNumber = this.options.includeColumns ? parseInt(match[7]) : undefined;
    } else if (match[8]) {
      // Format: "at functionName"
      functionName = match[8];
    }

    return {
      functionName: functionName || '<anonymous>',
      fileName,
      lineNumber,
      columnNumber
    };
  }

  private shouldIncludeFrame(frame: StackFrame): boolean {
    if (!frame.fileName) {
      return true;
    }

    // Filter out modules if specified
    if (this.options.filterModules.length > 0) {
      return !this.options.filterModules.some(module =>
        frame.fileName?.includes(module)
      );
    }

    // Filter out Node.js internals by default
    return !frame.fileName.includes('node_modules') &&
           !frame.fileName.includes('internal/');
  }

  private updateCallTree(stackTrace: StackFrame[]): void {
    if (stackTrace.length === 0) {
      return;
    }

    let currentNode: CallTreeNode | undefined;
    let parentNode: CallTreeNode | undefined;

    for (let i = stackTrace.length - 1; i >= 0; i--) {
      const frame = stackTrace[i];
      const nodeKey = this.getNodeKey(frame);

      let node = this.callTree.get(nodeKey);
      if (!node) {
        node = {
          functionName: frame.functionName,
          fileName: frame.fileName,
          lineNumber: frame.lineNumber,
          columnNumber: frame.columnNumber,
          selfTime: 0,
          totalTime: 0,
          callCount: 0,
          children: [],
          parent: parentNode
        };
        this.callTree.set(nodeKey, node);

        if (parentNode) {
          parentNode.children.push(node);
        }
      }

      node.callCount++;

      if (i === 0) {
        // This is the top of the stack (currently executing function)
        node.selfTime += this.options.samplingInterval;
      }

      node.totalTime += this.options.samplingInterval;

      parentNode = node;
      currentNode = node;
    }
  }

  private getNodeKey(frame: StackFrame): string {
    const parts = [frame.functionName];

    if (frame.fileName) {
      parts.push(frame.fileName);
    }

    if (this.options.includeLineNumbers && frame.lineNumber) {
      parts.push(frame.lineNumber.toString());
    }

    if (this.options.includeColumns && frame.columnNumber) {
      parts.push(frame.columnNumber.toString());
    }

    return parts.join('|');
  }

  private getCurrentCPUUsage(): number {
    // Simplified CPU usage calculation
    // In a real implementation, this would use more sophisticated methods
    const usage = (globalThis as any).process?.cpuUsage?.() || { user: 0, system: 0 };
    return ((usage.user + usage.system) / 1000000) * 100; // Convert to percentage
  }

  private getCurrentMemoryUsage(): number {
    const usage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    return usage.heapUsed;
  }

  private buildCallTree(): CallTreeNode {
    // Find the root nodes (functions with no parent)
    const rootNodes = Array.from(this.callTree.values()).filter(node => !node.parent);

    if (rootNodes.length === 0) {
      return {
        functionName: '<root>',
        selfTime: 0,
        totalTime: 0,
        callCount: 0,
        children: []
      };
    }

    // If there's only one root, return it
    if (rootNodes.length === 1) {
      return rootNodes[0];
    }

    // Multiple roots - create a synthetic root
    const syntheticRoot: CallTreeNode = {
      functionName: '<root>',
      selfTime: 0,
      totalTime: 0,
      callCount: 0,
      children: rootNodes
    };

    // Update parent references
    rootNodes.forEach(node => {
      node.parent = syntheticRoot;
    });

    // Calculate synthetic root stats
    syntheticRoot.totalTime = rootNodes.reduce((sum, node) => sum + node.totalTime, 0);
    syntheticRoot.callCount = rootNodes.reduce((sum, node) => sum + node.callCount, 0);

    return syntheticRoot;
  }

  private calculateMetrics(): PerformanceMetrics {
    const now = Date.now();
    const memoryUsage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };

    return {
      timestamp: now,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        arrayBuffers: memoryUsage.arrayBuffers || 0
      },
      cpuUsage: {
        user: 0,
        system: 0,
        percent: this.getCurrentCPUUsage(),
        loadAverage: []
      },
      frameTime: this.calculateAverageFrameTime(),
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
      custom: {
        samplesCollected: this.samples.length,
        profilingDuration: now - this.startTime
      }
    };
  }

  private calculateAverageFrameTime(): number {
    if (this.samples.length < 2) {
      return 0;
    }

    const intervals = [];
    for (let i = 1; i < this.samples.length; i++) {
      intervals.push(this.samples[i].timestamp - this.samples[i - 1].timestamp);
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  public async generateReport(): Promise<PerformanceReport> {
    if (this.isProfileActive) {
      throw new Error('Cannot generate report while profiling is active');
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const report: PerformanceReport = {
      id: this.generateReportId(),
      title: 'CPU Profiling Report',
      timestamp: this.startTime,
      duration,
      summary: this.generateSummary(),
      sections: this.generateSections(),
      recommendations: this.generateRecommendations(),
      charts: this.generateCharts()
    };

    return report;
  }

  private generateSummary(): any {
    const totalSamples = this.samples.length;
    const duration = this.samples.length > 0 ?
      this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp : 0;

    return {
      totalSamples,
      duration,
      samplingRate: duration > 0 ? (totalSamples / duration) * 1000 : 0,
      topFunctions: this.getTopFunctions(10),
      averageCPU: this.calculateAverageCPU(),
      averageMemory: this.calculateAverageMemory()
    };
  }

  private generateSections(): any[] {
    return [
      {
        title: 'Call Tree Analysis',
        content: this.analyzeCallTree(),
        charts: ['call-tree-chart'],
        tables: [this.generateCallTreeTable()],
        insights: this.generateCallTreeInsights()
      },
      {
        title: 'Hot Spots',
        content: this.analyzeHotSpots(),
        charts: ['hotspots-chart'],
        tables: [this.generateHotSpotsTable()],
        insights: this.generateHotSpotInsights()
      },
      {
        title: 'Memory Analysis',
        content: this.analyzeMemoryUsage(),
        charts: ['memory-timeline'],
        tables: [this.generateMemoryTable()],
        insights: this.generateMemoryInsights()
      }
    ];
  }

  private generateRecommendations(): any[] {
    const recommendations = [];

    // Analyze call tree for optimization opportunities
    const hotFunctions = this.getTopFunctions(5);
    for (const func of hotFunctions) {
      if (func.selfTime > 100) { // More than 100ms total self time
        recommendations.push({
          id: `optimize_${func.functionName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          type: 'cpu',
          priority: 'high',
          description: `Optimize ${func.functionName} - high CPU usage detected`,
          impact: 'large',
          implementation: 'Consider algorithmic improvements or caching',
          estimatedGain: func.selfTime / this.getTotalProfileTime(),
          complexity: 'moderate',
          relatedMetrics: ['cpuUsage', 'frameTime']
        });
      }
    }

    return recommendations;
  }

  private generateCharts(): any[] {
    return [
      {
        id: 'cpu-timeline',
        type: 'line',
        title: 'CPU Usage Over Time',
        data: this.samples.map(sample => ({
          x: sample.timestamp,
          y: sample.cpuUsage
        })),
        options: {
          xAxis: { label: 'Time', format: 'timestamp' },
          yAxis: { label: 'CPU Usage (%)', min: 0, max: 100 },
          colors: ['#ff6b6b'],
          showLegend: false,
          showGrid: true
        }
      },
      {
        id: 'memory-timeline',
        type: 'line',
        title: 'Memory Usage Over Time',
        data: this.samples.map(sample => ({
          x: sample.timestamp,
          y: sample.memoryUsage / 1024 / 1024 // Convert to MB
        })),
        options: {
          xAxis: { label: 'Time', format: 'timestamp' },
          yAxis: { label: 'Memory Usage (MB)', min: 0 },
          colors: ['#4ecdc4'],
          showLegend: false,
          showGrid: true
        }
      }
    ];
  }

  private getTopFunctions(count: number): any[] {
    const functions = Array.from(this.callTree.values())
      .sort((a, b) => b.selfTime - a.selfTime)
      .slice(0, count);

    return functions.map(func => ({
      functionName: func.functionName,
      fileName: func.fileName,
      selfTime: func.selfTime,
      totalTime: func.totalTime,
      callCount: func.callCount,
      averageTime: func.totalTime / func.callCount
    }));
  }

  private calculateAverageCPU(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, sample) => sum + sample.cpuUsage, 0) / this.samples.length;
  }

  private calculateAverageMemory(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, sample) => sum + sample.memoryUsage, 0) / this.samples.length;
  }

  private getTotalProfileTime(): number {
    return Array.from(this.callTree.values())
      .reduce((sum, node) => sum + node.selfTime, 0);
  }

  private analyzeCallTree(): string {
    const totalFunctions = this.callTree.size;
    const maxDepth = this.calculateMaxCallDepth();
    const avgCallsPerFunction = this.calculateAverageCallsPerFunction();

    return `Call tree contains ${totalFunctions} unique functions with a maximum depth of ${maxDepth}. ` +
           `Average calls per function: ${avgCallsPerFunction.toFixed(2)}.`;
  }

  private analyzeHotSpots(): string {
    const hotFunctions = this.getTopFunctions(3);
    const totalTime = this.getTotalProfileTime();

    const hotSpotPercentage = hotFunctions.reduce((sum, func) => sum + func.selfTime, 0) / totalTime * 100;

    return `Top 3 functions account for ${hotSpotPercentage.toFixed(1)}% of total execution time. ` +
           `Primary hot spot: ${hotFunctions[0]?.functionName || 'None'}.`;
  }

  private analyzeMemoryUsage(): string {
    const avgMemory = this.calculateAverageMemory();
    const maxMemory = Math.max(...this.samples.map(s => s.memoryUsage));
    const minMemory = Math.min(...this.samples.map(s => s.memoryUsage));

    return `Memory usage ranged from ${(minMemory / 1024 / 1024).toFixed(1)}MB to ${(maxMemory / 1024 / 1024).toFixed(1)}MB, ` +
           `with an average of ${(avgMemory / 1024 / 1024).toFixed(1)}MB.`;
  }

  private generateCallTreeTable(): any {
    const topFunctions = this.getTopFunctions(20);
    return {
      headers: ['Function', 'Self Time (ms)', 'Total Time (ms)', 'Call Count', 'Avg Time (ms)'],
      rows: topFunctions.map(func => [
        func.functionName,
        func.selfTime.toFixed(2),
        func.totalTime.toFixed(2),
        func.callCount,
        func.averageTime.toFixed(2)
      ]),
      sortable: true,
      filterable: true
    };
  }

  private generateHotSpotsTable(): any {
    const hotFunctions = this.getTopFunctions(10);
    const totalTime = this.getTotalProfileTime();

    return {
      headers: ['Function', 'Self Time (%)', 'Total Time (%)', 'Call Count'],
      rows: hotFunctions.map(func => [
        func.functionName,
        ((func.selfTime / totalTime) * 100).toFixed(1) + '%',
        ((func.totalTime / totalTime) * 100).toFixed(1) + '%',
        func.callCount
      ]),
      sortable: true,
      filterable: false
    };
  }

  private generateMemoryTable(): any {
    const memoryStats = this.calculateMemoryStats();

    return {
      headers: ['Metric', 'Value'],
      rows: [
        ['Average Usage', `${(memoryStats.average / 1024 / 1024).toFixed(1)} MB`],
        ['Peak Usage', `${(memoryStats.peak / 1024 / 1024).toFixed(1)} MB`],
        ['Minimum Usage', `${(memoryStats.minimum / 1024 / 1024).toFixed(1)} MB`],
        ['Growth Rate', `${memoryStats.growthRate.toFixed(2)} MB/s`]
      ],
      sortable: false,
      filterable: false
    };
  }

  private calculateMemoryStats(): any {
    if (this.samples.length === 0) {
      return { average: 0, peak: 0, minimum: 0, growthRate: 0 };
    }

    const memoryValues = this.samples.map(s => s.memoryUsage);
    const average = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;
    const peak = Math.max(...memoryValues);
    const minimum = Math.min(...memoryValues);

    const duration = (this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp) / 1000;
    const growthRate = duration > 0 ? (peak - minimum) / 1024 / 1024 / duration : 0;

    return { average, peak, minimum, growthRate };
  }

  private calculateMaxCallDepth(): number {
    let maxDepth = 0;

    const calculateDepth = (node: CallTreeNode, depth: number = 0): void => {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of node.children) {
        calculateDepth(child, depth + 1);
      }
    };

    for (const node of this.callTree.values()) {
      if (!node.parent) {
        calculateDepth(node);
      }
    }

    return maxDepth;
  }

  private calculateAverageCallsPerFunction(): number {
    if (this.callTree.size === 0) return 0;

    const totalCalls = Array.from(this.callTree.values())
      .reduce((sum, node) => sum + node.callCount, 0);

    return totalCalls / this.callTree.size;
  }

  private generateCallTreeInsights(): string[] {
    const insights = [];
    const maxDepth = this.calculateMaxCallDepth();
    const avgCalls = this.calculateAverageCallsPerFunction();

    if (maxDepth > 20) {
      insights.push('Deep call stack detected - consider reducing recursion or call depth');
    }

    if (avgCalls > 100) {
      insights.push('High call frequency - look for opportunities to reduce function calls');
    }

    const leafFunctions = Array.from(this.callTree.values()).filter(node => node.children.length === 0);
    const leafPercentage = (leafFunctions.length / this.callTree.size) * 100;

    if (leafPercentage < 30) {
      insights.push('Low percentage of leaf functions - call tree may be too shallow');
    }

    return insights;
  }

  private generateHotSpotInsights(): string[] {
    const insights = [];
    const hotFunctions = this.getTopFunctions(5);
    const totalTime = this.getTotalProfileTime();

    if (hotFunctions.length > 0) {
      const topFunction = hotFunctions[0];
      const percentage = (topFunction.selfTime / totalTime) * 100;

      if (percentage > 30) {
        insights.push(`Single function dominates execution time (${percentage.toFixed(1)}%)`);
      }

      if (topFunction.callCount > 10000) {
        insights.push(`High-frequency function detected (${topFunction.callCount} calls)`);
      }
    }

    return insights;
  }

  private generateMemoryInsights(): string[] {
    const insights = [];
    const stats = this.calculateMemoryStats();

    if (stats.growthRate > 1) {
      insights.push(`Significant memory growth detected (${stats.growthRate.toFixed(2)} MB/s)`);
    }

    const memoryVariance = this.calculateMemoryVariance();
    if (memoryVariance > 10 * 1024 * 1024) { // 10MB variance
      insights.push('High memory usage variance - potential memory allocation issues');
    }

    return insights;
  }

  private calculateMemoryVariance(): number {
    if (this.samples.length === 0) return 0;

    const average = this.calculateAverageMemory();
    const variance = this.samples.reduce((sum, sample) => {
      const diff = sample.memoryUsage - average;
      return sum + (diff * diff);
    }, 0) / this.samples.length;

    return Math.sqrt(variance);
  }

  private generateSnapshotId(): string {
    return `cpu_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `cpu_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getCallTree(): CallTreeNode {
    return this.buildCallTree();
  }

  public getSamples(): ProfileSample[] {
    return [...this.samples];
  }

  public exportProfile(format: 'json' | 'flamegraph' = 'json'): string {
    if (format === 'flamegraph') {
      return this.exportAsFlamegraph();
    }

    return JSON.stringify({
      options: this.options,
      startTime: this.startTime,
      samples: this.samples,
      callTree: this.buildCallTree()
    }, null, 2);
  }

  private exportAsFlamegraph(): string {
    // Generate flamegraph format data
    const stacks: string[] = [];

    const generateStacks = (node: CallTreeNode, stack: string[] = []): void => {
      const currentStack = [...stack, node.functionName];

      if (node.selfTime > 0) {
        stacks.push(`${currentStack.join(';')} ${node.selfTime}`);
      }

      for (const child of node.children) {
        generateStacks(child, currentStack);
      }
    };

    const root = this.buildCallTree();
    generateStacks(root);

    return stacks.join('\n');
  }
}