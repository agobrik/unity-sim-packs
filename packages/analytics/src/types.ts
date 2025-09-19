export interface AnalyticsConfig {
  apiKey?: string;
  endpoint?: string;
  environment: string;
  batchSize?: number;
  flushInterval?: number;
  sessionTimeout?: number;
}

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  timestamp: number;
  sessionId: string;
  userId?: string;
  data: Record<string, any>;
  metadata: EventMetadata;
}

export interface EventMetadata {
  source: string;
  version: string;
  environment: string;
  platform: string;
  location?: GeolocationData;
  device?: DeviceInfo;
  performance?: PerformanceContext;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface DeviceInfo {
  userAgent: string;
  screen: ScreenInfo;
  memory: number;
  cores: number;
  connection?: ConnectionInfo;
}

export interface ScreenInfo {
  width: number;
  height: number;
  pixelRatio: number;
  colorDepth: number;
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface PerformanceContext {
  frameRate: number;
  memoryUsage: number;
  cpuUsage: number;
  loadTime: number;
}

export interface AnalyticsSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  events: AnalyticsEvent[];
  metrics: SessionMetrics;
  context: SessionContext;
}

export interface SessionMetrics {
  eventCount: number;
  errorCount: number;
  averageEventFrequency: number;
  totalEngagementTime: number;
  bounceRate: number;
  conversionEvents: number;
  customMetrics: Record<string, number>;
}

export interface SessionContext {
  source: string;
  campaign?: string;
  medium?: string;
  referrer?: string;
  landingPage?: string;
  userAgent: string;
  ip?: string;
  country?: string;
  city?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  recommendations: string[];
  data: InsightData;
  confidence: number;
  impact: InsightImpact;
  timeframe: TimeRange;
  tags: string[];
}

export interface InsightData {
  metrics: Record<string, number>;
  trends: TrendData[];
  comparisons: ComparisonData[];
  segments: SegmentData[];
  correlations: CorrelationData[];
}

export interface TrendData {
  metric: string;
  values: TimeSeriesPoint[];
  direction: TrendDirection;
  magnitude: number;
  significance: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface ComparisonData {
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  period: TimeRange;
}

export interface SegmentData {
  name: string;
  criteria: SegmentCriteria;
  size: number;
  metrics: Record<string, number>;
  characteristics: Record<string, any>;
}

export interface SegmentCriteria {
  filters: Filter[];
  logic: 'AND' | 'OR';
}

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
}

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
  sampleSize: number;
}

export interface TimeRange {
  start: number;
  end: number;
  granularity: TimeGranularity;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: LayoutConfig;
  filters: DashboardFilter[];
  refreshInterval: number;
  permissions: DashboardPermissions;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  data: WidgetData;
  lastUpdated: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  metrics: string[];
  timeRange: TimeRange;
  filters: Filter[];
  visualization: VisualizationConfig;
  refreshInterval?: number;
  realtime?: boolean;
}

export interface VisualizationConfig {
  chartType: ChartType;
  colors: string[];
  axes: AxisConfig[];
  legend: LegendConfig;
  annotations: AnnotationConfig[];
}

export interface AxisConfig {
  type: 'x' | 'y';
  label: string;
  scale: ScaleType;
  min?: number;
  max?: number;
  format?: string;
}

export interface LegendConfig {
  show: boolean;
  position: LegendPosition;
  align: LegendAlign;
}

export interface AnnotationConfig {
  type: AnnotationType;
  value: any;
  label: string;
  color: string;
}

export interface WidgetData {
  series: DataSeries[];
  metadata: DataMetadata;
}

export interface DataSeries {
  name: string;
  data: DataPoint[];
  metadata: SeriesMetadata;
}

export interface DataPoint {
  x: any;
  y: number;
  metadata?: Record<string, any>;
}

export interface SeriesMetadata {
  unit: string;
  aggregation: AggregationType;
  source: string;
}

export interface DataMetadata {
  queryTime: number;
  resultCount: number;
  cached: boolean;
  freshness: number;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  margin: MarginConfig;
  responsive: boolean;
}

export interface MarginConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: FilterType;
  values: any[];
  defaultValue?: any;
  multiple: boolean;
}

export interface DashboardPermissions {
  view: string[];
  edit: string[];
  share: string[];
  delete: string[];
}

export interface Report {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  schedule: ReportSchedule;
  parameters: ReportParameter[];
  template: ReportTemplate;
  lastGenerated?: number;
  status: ReportStatus;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time: string;
  timezone: string;
  recipients: string[];
}

export interface ReportParameter {
  name: string;
  type: ParameterType;
  required: boolean;
  defaultValue?: any;
  options?: any[];
}

export interface ReportTemplate {
  sections: ReportSection[];
  styling: ReportStyling;
  format: ReportFormat;
}

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  content: SectionContent;
  order: number;
}

export interface SectionContent {
  text?: string;
  widgets?: string[];
  insights?: string[];
  tables?: TableConfig[];
  charts?: ChartConfig[];
}

export interface TableConfig {
  columns: TableColumn[];
  data: any[][];
  pagination: boolean;
  sorting: boolean;
  filtering: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  type: ColumnType;
  format?: string;
  sortable: boolean;
}

export interface ChartConfig {
  type: ChartType;
  data: any[];
  options: ChartOptions;
}

export interface ChartOptions {
  title?: string;
  subtitle?: string;
  legend: LegendConfig;
  axes: AxisConfig[];
  colors: string[];
  responsive: boolean;
}

export interface ReportStyling {
  theme: string;
  colors: ColorPalette;
  fonts: FontConfig;
  spacing: SpacingConfig;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  grid: string;
}

export interface FontConfig {
  primary: string;
  secondary: string;
  sizes: Record<string, number>;
}

export interface SpacingConfig {
  margin: number;
  padding: number;
  gap: number;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  timeWindow: number;
  filters: Filter[];
  analysis: FunnelAnalysis;
}

export interface FunnelStep {
  id: string;
  name: string;
  event: EventMatcher;
  order: number;
  optional: boolean;
}

export interface EventMatcher {
  type: string;
  filters: Filter[];
  properties: Record<string, any>;
}

export interface FunnelAnalysis {
  totalSessions: number;
  conversionRate: number;
  stepConversions: StepConversion[];
  dropoffPoints: DropoffPoint[];
  avgTimeToComplete: number;
  insights: FunnelInsight[];
}

export interface StepConversion {
  stepId: string;
  entrances: number;
  exits: number;
  conversionRate: number;
  avgTimeInStep: number;
}

export interface DropoffPoint {
  fromStep: string;
  toStep: string;
  dropoffRate: number;
  dropoffCount: number;
  reasons: DropoffReason[];
}

export interface DropoffReason {
  type: string;
  probability: number;
  description: string;
}

export interface FunnelInsight {
  type: string;
  title: string;
  description: string;
  impact: number;
  recommendations: string[];
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  definition: CohortDefinition;
  metrics: CohortMetrics;
  analysis: CohortAnalysis;
}

export interface CohortDefinition {
  dateRange: TimeRange;
  criteria: SegmentCriteria;
  retentionMetric: string;
  periods: number;
  periodType: PeriodType;
}

export interface CohortMetrics {
  totalUsers: number;
  avgCohortSize: number;
  retentionRates: number[][];
  lifetimeValue: number[];
  churnRates: number[];
}

export interface CohortAnalysis {
  trends: CohortTrend[];
  segments: CohortSegment[];
  insights: CohortInsight[];
}

export interface CohortTrend {
  metric: string;
  direction: TrendDirection;
  strength: number;
  periods: number[];
  values: number[];
}

export interface CohortSegment {
  name: string;
  criteria: SegmentCriteria;
  retentionRate: number;
  churnRate: number;
  lifetimeValue: number;
}

export interface CohortInsight {
  type: string;
  title: string;
  description: string;
  recommendations: string[];
  confidence: number;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  status: TestStatus;
  config: TestConfig;
  results: TestResults;
  analysis: TestAnalysis;
}

export interface TestConfig {
  startDate: number;
  endDate?: number;
  targetMetric: string;
  variants: TestVariant[];
  trafficSplit: number[];
  minimumSampleSize: number;
  confidenceLevel: number;
  powerAnalysis: PowerAnalysis;
}

export interface TestVariant {
  id: string;
  name: string;
  description: string;
  changes: VariantChange[];
  allocation: number;
}

export interface VariantChange {
  type: ChangeType;
  target: string;
  value: any;
  description: string;
}

export interface PowerAnalysis {
  effect: number;
  alpha: number;
  beta: number;
  requiredSampleSize: number;
}

export interface TestResults {
  participants: number;
  conversions: VariantResult[];
  statistical: StatisticalResults;
  timeline: TestTimelinePoint[];
}

export interface VariantResult {
  variantId: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  confidence: ConfidenceInterval;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

export interface StatisticalResults {
  pValue: number;
  significant: boolean;
  winner?: string;
  liftPercent: number;
  confidenceLevel: number;
}

export interface TestTimelinePoint {
  timestamp: number;
  participants: number;
  conversions: VariantResult[];
  significance: number;
}

export interface TestAnalysis {
  conclusions: TestConclusion[];
  recommendations: TestRecommendation[];
  followUpTests: FollowUpTest[];
}

export interface TestConclusion {
  type: ConclusionType;
  statement: string;
  confidence: number;
  evidence: string[];
}

export interface TestRecommendation {
  action: RecommendationAction;
  reasoning: string;
  priority: Priority;
  effort: EffortLevel;
}

export interface FollowUpTest {
  name: string;
  hypothesis: string;
  justification: string;
  priority: Priority;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number;
  frequency: number;
  enabled: boolean;
  recipients: string[];
  actions: AlertAction[];
}

export interface AlertCondition {
  operator: AlertOperator;
  aggregation: AggregationType;
  comparisonType: ComparisonType;
  baseline?: BaselineConfig;
}

export interface BaselineConfig {
  type: BaselineType;
  period: number;
  offset: number;
}

export interface AlertAction {
  type: ActionType;
  config: ActionConfig;
}

export interface ActionConfig {
  webhook?: WebhookConfig;
  email?: EmailConfig;
  slack?: SlackConfig;
}

export interface WebhookConfig {
  url: string;
  headers: Record<string, string>;
  payload: Record<string, any>;
}

export interface EmailConfig {
  to: string[];
  subject: string;
  template: string;
}

export interface SlackConfig {
  webhook: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
}

export interface DataPipeline {
  id: string;
  name: string;
  description: string;
  source: DataSource;
  processors: DataProcessor[];
  destination: DataDestination;
  schedule: PipelineSchedule;
  status: PipelineStatus;
  metrics: PipelineMetrics;
}

export interface DataSource {
  type: SourceType;
  config: SourceConfig;
  schema: DataSchema;
}

export interface SourceConfig {
  connection?: ConnectionConfig;
  query?: QueryConfig;
  file?: FileConfig;
  api?: ApiConfig;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface QueryConfig {
  sql: string;
  parameters: Record<string, any>;
  timeout: number;
}

export interface FileConfig {
  path: string;
  format: FileFormat;
  delimiter?: string;
  encoding?: string;
}

export interface ApiConfig {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: AuthType;
  token?: string;
  username?: string;
  password?: string;
}

export interface DataSchema {
  fields: SchemaField[];
  primaryKey?: string[];
  indexes?: IndexConfig[];
}

export interface SchemaField {
  name: string;
  type: FieldType;
  nullable: boolean;
  defaultValue?: any;
  constraints?: FieldConstraint[];
}

export interface FieldConstraint {
  type: ConstraintType;
  value: any;
}

export interface IndexConfig {
  name: string;
  fields: string[];
  unique: boolean;
}

export interface DataProcessor {
  id: string;
  type: ProcessorType;
  config: ProcessorConfig;
  order: number;
}

export interface ProcessorConfig {
  transformation?: TransformationConfig;
  validation?: ValidationConfig;
  enrichment?: EnrichmentConfig;
  aggregation?: AggregationConfig;
}

export interface TransformationConfig {
  rules: TransformationRule[];
}

export interface TransformationRule {
  field: string;
  operation: TransformOperation;
  parameters: Record<string, any>;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  onError: ErrorHandling;
}

export interface ValidationRule {
  field: string;
  type: ValidationType;
  parameters: Record<string, any>;
}

export interface EnrichmentConfig {
  sources: EnrichmentSource[];
  joinKeys: string[];
}

export interface EnrichmentSource {
  type: SourceType;
  config: SourceConfig;
  mappings: FieldMapping[];
}

export interface FieldMapping {
  source: string;
  target: string;
  transformation?: TransformOperation;
}

export interface AggregationConfig {
  groupBy: string[];
  metrics: AggregationMetric[];
  timeWindow?: number;
}

export interface AggregationMetric {
  field: string;
  operation: AggregationType;
  alias: string;
}

export interface DataDestination {
  type: DestinationType;
  config: DestinationConfig;
}

export interface DestinationConfig {
  connection?: ConnectionConfig;
  table?: string;
  file?: FileConfig;
  api?: ApiConfig;
}

export interface PipelineSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  cron?: string;
  timezone: string;
}

export interface PipelineMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  lastRun?: PipelineRun;
  dataQuality: DataQualityMetrics;
}

export interface PipelineRun {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: RunStatus;
  recordsProcessed: number;
  errors: PipelineError[];
}

export interface PipelineError {
  stage: string;
  message: string;
  details: Record<string, any>;
  timestamp: number;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
}

export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  CONVERSION = 'conversion',
  CUSTOM = 'custom'
}

export enum EventCategory {
  ENGAGEMENT = 'engagement',
  ACQUISITION = 'acquisition',
  RETENTION = 'retention',
  MONETIZATION = 'monetization',
  TECHNICAL = 'technical',
  BUSINESS = 'business'
}

export enum InsightType {
  TREND = 'trend',
  ANOMALY = 'anomaly',
  CORRELATION = 'correlation',
  SEGMENTATION = 'segmentation',
  PREDICTION = 'prediction',
  RECOMMENDATION = 'recommendation'
}

export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InsightImpact {
  MINIMAL = 'minimal',
  SMALL = 'small',
  MODERATE = 'moderate',
  LARGE = 'large',
  SIGNIFICANT = 'significant'
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  VOLATILE = 'volatile'
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null'
}

export enum FilterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object'
}

export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  METRIC = 'metric',
  GAUGE = 'gauge',
  FUNNEL = 'funnel',
  COHORT = 'cohort'
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  COLUMN = 'column',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  SCATTER = 'scatter',
  BUBBLE = 'bubble',
  AREA = 'area',
  HISTOGRAM = 'histogram',
  HEATMAP = 'heatmap'
}

export enum ScaleType {
  LINEAR = 'linear',
  LOGARITHMIC = 'logarithmic',
  TIME = 'time',
  CATEGORY = 'category'
}

export enum LegendPosition {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left'
}

export enum LegendAlign {
  START = 'start',
  CENTER = 'center',
  END = 'end'
}

export enum AnnotationType {
  LINE = 'line',
  BAND = 'band',
  POINT = 'point',
  TEXT = 'text'
}

export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  DISTINCT = 'distinct',
  FIRST = 'first',
  LAST = 'last'
}

export enum ReportType {
  SCHEDULED = 'scheduled',
  ON_DEMAND = 'on_demand',
  AUTOMATED = 'automated'
}

export enum ReportStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ScheduleFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select'
}

export enum ReportFormat {
  HTML = 'html',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export enum SectionType {
  TEXT = 'text',
  WIDGETS = 'widgets',
  INSIGHTS = 'insights',
  TABLE = 'table',
  CHART = 'chart'
}

export enum ColumnType {
  STRING = 'string',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  BOOLEAN = 'boolean'
}

export enum PeriodType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export enum TestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ChangeType {
  CONTENT = 'content',
  STYLE = 'style',
  BEHAVIOR = 'behavior',
  FEATURE = 'feature'
}

export enum ConclusionType {
  SIGNIFICANT = 'significant',
  INCONCLUSIVE = 'inconclusive',
  NO_EFFECT = 'no_effect'
}

export enum RecommendationAction {
  IMPLEMENT = 'implement',
  REJECT = 'reject',
  INVESTIGATE = 'investigate',
  RETEST = 'retest'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum EffortLevel {
  TRIVIAL = 'trivial',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum AlertOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  INCREASE = 'increase',
  DECREASE = 'decrease'
}

export enum ComparisonType {
  ABSOLUTE = 'absolute',
  RELATIVE = 'relative',
  BASELINE = 'baseline'
}

export enum BaselineType {
  HISTORICAL = 'historical',
  MOVING_AVERAGE = 'moving_average',
  SEASONAL = 'seasonal'
}

export enum ActionType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  SMS = 'sms'
}

export enum SourceType {
  DATABASE = 'database',
  FILE = 'file',
  API = 'api',
  STREAM = 'stream',
  WEBHOOK = 'webhook'
}

export enum DestinationType {
  DATABASE = 'database',
  FILE = 'file',
  API = 'api',
  STREAM = 'stream'
}

export enum FileFormat {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  PARQUET = 'parquet',
  AVRO = 'avro'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

export enum AuthType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  API_KEY = 'api_key',
  OAUTH = 'oauth'
}

export enum FieldType {
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
  BOOLEAN = 'boolean',
  DATE = 'date',
  TIMESTAMP = 'timestamp',
  JSON = 'json',
  ARRAY = 'array'
}

export enum ConstraintType {
  NOT_NULL = 'not_null',
  UNIQUE = 'unique',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  PATTERN = 'pattern'
}

export enum ProcessorType {
  TRANSFORMATION = 'transformation',
  VALIDATION = 'validation',
  ENRICHMENT = 'enrichment',
  AGGREGATION = 'aggregation',
  FILTERING = 'filtering'
}

export enum TransformOperation {
  CONVERT_TYPE = 'convert_type',
  EXTRACT = 'extract',
  REPLACE = 'replace',
  SPLIT = 'split',
  CONCAT = 'concat',
  LOWERCASE = 'lowercase',
  UPPERCASE = 'uppercase',
  TRIM = 'trim',
  ROUND = 'round',
  HASH = 'hash'
}

export enum ValidationType {
  REQUIRED = 'required',
  TYPE = 'type',
  RANGE = 'range',
  PATTERN = 'pattern',
  ENUM = 'enum',
  CUSTOM = 'custom'
}

export enum ErrorHandling {
  SKIP = 'skip',
  FAIL = 'fail',
  DEFAULT = 'default'
}

export enum PipelineStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  FAILED = 'failed',
  MAINTENANCE = 'maintenance'
}

export enum RunStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export type AnalyticsEventHandler = (event: AnalyticsEvent) => void;
export type SessionEventHandler = (session: AnalyticsSession) => void;
export type InsightHandler = (insight: Insight) => void;
export type AlertHandler = (alert: AlertRule, value: number) => void;