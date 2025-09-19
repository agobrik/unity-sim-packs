/**
 * Core types and interfaces for Steam Simulation Toolkit Data Visualization
 */

// Basic geometric types
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1, default 1
}

export interface ColorHSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
  a?: number; // 0-1, default 1
}

// Data types
export interface DataPoint {
  id?: string;
  value: number;
  label?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface DataSeries {
  id: string;
  name: string;
  data: DataPoint[];
  color?: Color;
  visible?: boolean;
  metadata?: Record<string, any>;
}

export interface DataSet {
  id: string;
  name: string;
  series: DataSeries[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

// Chart types
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  AREA = 'area',
  HEATMAP = 'heatmap',
  HISTOGRAM = 'histogram',
  BOX_PLOT = 'box_plot',
  CANDLESTICK = 'candlestick',
  RADAR = 'radar',
  SANKEY = 'sankey',
  TREEMAP = 'treemap',
  GAUGE = 'gauge',
  FUNNEL = 'funnel',
  WATERFALL = 'waterfall'
}

export enum RenderMode {
  CANVAS_2D = 'canvas_2d',
  WEBGL = 'webgl',
  SVG = 'svg',
  CSS = 'css'
}

export enum InteractionType {
  HOVER = 'hover',
  CLICK = 'click',
  DRAG = 'drag',
  ZOOM = 'zoom',
  PAN = 'pan',
  SELECT = 'select',
  BRUSH = 'brush'
}

export enum AnimationType {
  FADE = 'fade',
  SLIDE = 'slide',
  GROW = 'grow',
  BOUNCE = 'bounce',
  MORPH = 'morph',
  PROGRESSIVE = 'progressive'
}

// Configuration interfaces
export interface ChartConfig {
  type: ChartType;
  title?: string;
  subtitle?: string;
  width: number;
  height: number;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  backgroundColor?: Color;
  theme?: string;
  renderMode?: RenderMode;
  responsive?: boolean;
  animations?: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  interactions?: {
    enabled: boolean;
    types: InteractionType[];
  };
}

export interface AxisConfig {
  id: string;
  type: 'linear' | 'logarithmic' | 'categorical' | 'time';
  position: 'top' | 'bottom' | 'left' | 'right';
  title?: string;
  min?: number;
  max?: number;
  tickCount?: number;
  tickFormat?: string;
  gridLines?: {
    enabled: boolean;
    color?: Color;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  labels?: {
    enabled: boolean;
    rotation?: number;
    color?: Color;
    fontSize?: number;
  };
}

export interface LegendConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'inside';
  align?: 'start' | 'center' | 'end';
  itemSpacing?: number;
  markerSize?: number;
  backgroundColor?: Color;
  borderColor?: Color;
}

export interface TooltipConfig {
  enabled: boolean;
  trigger: 'hover' | 'click';
  format?: string;
  backgroundColor?: Color;
  borderColor?: Color;
  fontSize?: number;
  followCursor?: boolean;
}

// Renderer interfaces
export interface RenderContext {
  width: number;
  height: number;
  pixelRatio: number;
  renderMode: RenderMode;
  target?: any; // Canvas element, WebGL context, etc.
}

export interface RenderCommand {
  type: string;
  data: any;
  transform?: Transform2D;
  style?: RenderStyle;
}

export interface Transform2D {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX?: number;
  skewY?: number;
}

export interface RenderStyle {
  fillColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBaseline?: 'top' | 'middle' | 'bottom';
}

// Animation interfaces
export interface AnimationFrame {
  timestamp: number;
  progress: number; // 0-1
  values: Record<string, any>;
}

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing: EasingFunction;
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export type EasingFunction = (t: number) => number;

// Event interfaces
export interface ChartEvent {
  type: string;
  target: any;
  data?: any;
  position?: Point2D;
  timestamp: number;
}

export interface InteractionEvent extends ChartEvent {
  interactionType: InteractionType;
  modifiers?: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
  };
}

// Dashboard interfaces
export interface DashboardConfig {
  id: string;
  title: string;
  layout: LayoutConfig;
  charts: ChartInstance[];
  globalFilters?: FilterConfig[];
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export interface LayoutConfig {
  type: 'grid' | 'flow' | 'absolute';
  columns?: number;
  rows?: number;
  gap?: number;
  padding?: number;
}

export interface ChartInstance {
  id: string;
  chartId: string;
  position: {
    row: number;
    column: number;
    rowSpan?: number;
    columnSpan?: number;
  };
  config?: Partial<ChartConfig>;
  dataSourceId?: string;
}

export interface FilterConfig {
  id: string;
  type: 'range' | 'categorical' | 'search' | 'date';
  field: string;
  label: string;
  defaultValue?: any;
  options?: any[];
}

// Data source interfaces
export interface DataSourceConfig {
  id: string;
  type: 'static' | 'websocket' | 'rest' | 'streaming' | 'file';
  url?: string;
  updateInterval?: number;
  format?: 'json' | 'csv' | 'xml';
  authentication?: {
    type: 'bearer' | 'basic' | 'apikey';
    credentials: Record<string, string>;
  };
  transform?: DataTransformConfig;
}

export interface DataTransformConfig {
  operations: TransformOperation[];
}

export interface TransformOperation {
  type: 'filter' | 'map' | 'aggregate' | 'sort' | 'group';
  config: Record<string, any>;
}

// Theme interfaces
export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: Color;
    secondary: Color;
    accent: Color;
    background: Color;
    surface: Color;
    text: Color;
    textSecondary: Color;
    border: Color;
    grid: Color;
    palette: Color[];
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    light: string;
    medium: string;
    heavy: string;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

// Performance monitoring
export interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  memoryUsage: number;
  drawCalls: number;
  dataPointsRendered: number;
}

// Export collections
export interface VisualizationState {
  charts: Map<string, any>;
  datasets: Map<string, DataSet>;
  themes: Map<string, Theme>;
  dashboards: Map<string, DashboardConfig>;
  performance: PerformanceMetrics;
}