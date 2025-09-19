export interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: MemoryUsage;
  cpuUsage: CPUUsage;
  frameTime: number;
  frameRate: number;
  renderTime: number;
  updateTime: number;
  gcStats: GCStats;
  custom: Record<string, number>;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface CPUUsage {
  user: number;
  system: number;
  percent: number;
  loadAverage: number[];
}

export interface GCStats {
  collections: number;
  pauseTime: number;
  heapSizeBefore: number;
  heapSizeAfter: number;
  freed: number;
}

export interface ProfileSnapshot {
  id: string;
  name: string;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetrics;
  callTree: CallTreeNode;
  samples: ProfileSample[];
}

export interface CallTreeNode {
  functionName: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  selfTime: number;
  totalTime: number;
  callCount: number;
  children: CallTreeNode[];
  parent?: CallTreeNode;
}

export interface ProfileSample {
  timestamp: number;
  stackTrace: StackFrame[];
  cpuUsage: number;
  memoryUsage: number;
}

export interface StackFrame {
  functionName: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: number;
  message: string;
  metrics: Partial<PerformanceMetrics>;
  threshold: number;
  value: number;
  source: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  priority: Priority;
  description: string;
  impact: OptimizationImpact;
  implementation: string;
  estimatedGain: number;
  complexity: Complexity;
  relatedMetrics: string[];
}

export interface PerformanceBenchmark {
  id: string;
  name: string;
  description: string;
  category: BenchmarkCategory;
  duration: number;
  iterations: number;
  warmupIterations: number;
  results: BenchmarkResult[];
  statistics: BenchmarkStatistics;
}

export interface BenchmarkResult {
  iteration: number;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetrics;
  success: boolean;
  error?: string;
}

export interface BenchmarkStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
  variance: number;
  percentiles: Record<number, number>;
  outliers: number[];
}

export interface PerformanceReport {
  id: string;
  title: string;
  timestamp: number;
  duration: number;
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: OptimizationSuggestion[];
  charts: ChartData[];
}

export interface ReportSummary {
  averageFrameRate: number;
  averageFrameTime: number;
  memoryPeakUsage: number;
  cpuAverageUsage: number;
  alertCount: number;
  optimizationOpportunities: number;
  performanceScore: number;
}

export interface ReportSection {
  title: string;
  content: string;
  charts: string[];
  tables: TableData[];
  insights: string[];
}

export interface ChartData {
  id: string;
  type: ChartType;
  title: string;
  data: ChartDataPoint[];
  options: ChartOptions;
}

export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartOptions {
  xAxis: AxisOptions;
  yAxis: AxisOptions;
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
}

export interface AxisOptions {
  label: string;
  min?: number;
  max?: number;
  format?: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
  sortable: boolean;
  filterable: boolean;
}

export interface PerformanceTestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  setup: () => Promise<void>;
  execute: () => Promise<any>;
  teardown: () => Promise<void>;
  expectedMetrics: ExpectedMetrics;
  timeout: number;
}

export interface ExpectedMetrics {
  maxFrameTime?: number;
  minFrameRate?: number;
  maxMemoryUsage?: number;
  maxCPUUsage?: number;
  customThresholds?: Record<string, number>;
}

export interface PerformanceComparison {
  baselineId: string;
  currentId: string;
  comparison: MetricComparison[];
  summary: ComparisonSummary;
  regressions: PerformanceRegression[];
  improvements: PerformanceImprovement[];
}

export interface MetricComparison {
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  significance: Significance;
}

export interface ComparisonSummary {
  overallChange: number;
  overallChangePercent: number;
  regressionCount: number;
  improvementCount: number;
  significantChanges: number;
}

export interface PerformanceRegression {
  metric: string;
  baseline: number;
  current: number;
  impact: RegressionImpact;
  possibleCauses: string[];
}

export interface PerformanceImprovement {
  metric: string;
  baseline: number;
  current: number;
  impact: ImprovementImpact;
  possibleReasons: string[];
}

export interface MemoryAnalysis {
  leaks: MemoryLeak[];
  allocations: AllocationSummary[];
  retentions: RetentionAnalysis[];
  fragmentationIndex: number;
  recommendations: string[];
}

export interface MemoryLeak {
  type: string;
  size: number;
  growthRate: number;
  stackTrace: StackFrame[];
  firstSeen: number;
  lastSeen: number;
  confidence: number;
}

export interface AllocationSummary {
  type: string;
  count: number;
  totalSize: number;
  averageSize: number;
  stackTraces: StackFrame[][];
}

export interface RetentionAnalysis {
  objectType: string;
  retainedCount: number;
  retainedSize: number;
  retainers: Retainer[];
  dominatorTree: DominatorNode[];
}

export interface Retainer {
  type: string;
  property: string;
  retainedSize: number;
}

export interface DominatorNode {
  id: string;
  size: number;
  type: string;
  children: DominatorNode[];
  parent?: DominatorNode;
}

export interface CPUProfiler {
  start(options?: ProfilerOptions): Promise<void>;
  stop(): Promise<ProfileSnapshot>;
  pause(): void;
  resume(): void;
  isRunning(): boolean;
  generateReport(): Promise<PerformanceReport>;
}

export interface MemoryProfiler {
  start(options?: MemoryProfilerOptions): Promise<void>;
  stop(): Promise<MemoryAnalysis>;
  takeSnapshot(): Promise<MemorySnapshot>;
  compareSnapshots(snapshot1: string, snapshot2: string): Promise<MemoryComparison>;
  detectLeaks(): Promise<MemoryLeak[]>;
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  totalSize: number;
  objectCounts: Record<string, number>;
  retentionGraph: RetentionGraph;
}

export interface RetentionGraph {
  nodes: RetentionNode[];
  edges: RetentionEdge[];
}

export interface RetentionNode {
  id: string;
  type: string;
  size: number;
  retainedSize: number;
}

export interface RetentionEdge {
  from: string;
  to: string;
  property: string;
  type: EdgeType;
}

export interface MemoryComparison {
  added: ObjectDiff[];
  removed: ObjectDiff[];
  changed: ObjectDiff[];
  summary: MemoryComparisonSummary;
}

export interface ObjectDiff {
  type: string;
  countDiff: number;
  sizeDiff: number;
  examples: any[];
}

export interface MemoryComparisonSummary {
  totalSizeDiff: number;
  totalCountDiff: number;
  largestGrowth: ObjectDiff;
  largestShrinkage: ObjectDiff;
}

export interface ProfilerOptions {
  samplingInterval?: number;
  includeLineNumbers?: boolean;
  includeColumns?: boolean;
  stackDepth?: number;
  filterModules?: string[];
}

export interface MemoryProfilerOptions {
  trackAllocations?: boolean;
  stackDepth?: number;
  sampleInterval?: number;
  includeObjectIds?: boolean;
}

export interface PerformanceMonitorConfig {
  enabled: boolean;
  samplingInterval: number;
  metricsRetention: number;
  alertThresholds: AlertThresholds;
  profilingOptions: ProfilerOptions;
  memoryOptions: MemoryProfilerOptions;
  autoOptimization: AutoOptimizationConfig;
}

export interface AlertThresholds {
  frameTime: number;
  frameRate: number;
  memoryUsage: number;
  cpuUsage: number;
  gcPauseTime: number;
  custom: Record<string, number>;
}

export interface AutoOptimizationConfig {
  enabled: boolean;
  conservative: boolean;
  maxConcurrentOptimizations: number;
  rollbackOnRegression: boolean;
  testDuration: number;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: OptimizationCategory;
  apply: (context: OptimizationContext) => Promise<OptimizationResult>;
  rollback: (context: OptimizationContext) => Promise<void>;
  validate: (context: OptimizationContext) => Promise<boolean>;
}

export interface OptimizationContext {
  metrics: PerformanceMetrics;
  historicalData: PerformanceMetrics[];
  systemInfo: SystemInfo;
  applicationState: any;
}

export interface OptimizationResult {
  success: boolean;
  estimatedImpact: number;
  actualImpact?: number;
  metricsChange: Record<string, number>;
  rollbackRequired: boolean;
  error?: string;
}

export interface SystemInfo {
  platform: string;
  architecture: string;
  cpuCores: number;
  totalMemory: number;
  nodeVersion: string;
  v8Version: string;
}

export enum AlertType {
  FRAME_TIME = 'frame_time',
  FRAME_RATE = 'frame_rate',
  MEMORY_USAGE = 'memory_usage',
  MEMORY_LEAK = 'memory_leak',
  CPU_USAGE = 'cpu_usage',
  GC_PRESSURE = 'gc_pressure',
  CUSTOM = 'custom'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum OptimizationType {
  MEMORY = 'memory',
  CPU = 'cpu',
  RENDERING = 'rendering',
  IO = 'io',
  ALGORITHM = 'algorithm',
  CACHING = 'caching',
  BATCHING = 'batching'
}

export enum OptimizationCategory {
  AUTOMATIC = 'automatic',
  SUGGESTED = 'suggested',
  MANUAL = 'manual'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum Complexity {
  TRIVIAL = 'trivial',
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex'
}

export enum OptimizationImpact {
  MINIMAL = 'minimal',
  SMALL = 'small',
  MODERATE = 'moderate',
  LARGE = 'large',
  SIGNIFICANT = 'significant'
}

export enum BenchmarkCategory {
  MICRO = 'micro',
  COMPONENT = 'component',
  INTEGRATION = 'integration',
  STRESS = 'stress',
  REGRESSION = 'regression'
}

export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  LOAD = 'load',
  STRESS = 'stress',
  MEMORY = 'memory',
  CPU = 'cpu'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  SCATTER = 'scatter',
  HISTOGRAM = 'histogram',
  HEATMAP = 'heatmap',
  PIE = 'pie'
}

export enum Significance {
  INSIGNIFICANT = 'insignificant',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export enum RegressionImpact {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

export enum ImprovementImpact {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  SIGNIFICANT = 'significant',
  MAJOR = 'major'
}

export enum EdgeType {
  PROPERTY = 'property',
  ELEMENT = 'element',
  CONTEXT = 'context',
  INTERNAL = 'internal',
  WEAK = 'weak'
}

export type PerformanceEventHandler = (metrics: PerformanceMetrics) => void;
export type AlertHandler = (alert: PerformanceAlert) => void;
export type OptimizationHandler = (suggestion: OptimizationSuggestion) => void;
export type ProfileCompletionHandler = (snapshot: ProfileSnapshot) => void;