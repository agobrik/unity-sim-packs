/**
 * Core Visualization Engine for Steam Simulation Toolkit
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  ChartConfig,
  ChartType,
  DataSet,
  DataSeries,
  RenderMode,
  Theme,
  VisualizationState,
  PerformanceMetrics,
  DashboardConfig,
  ChartEvent
} from './types';

export class VisualizationEngine extends EventEmitter {
  private state: VisualizationState;
  private isInitialized = false;
  private animationFrameId: any = null;
  private lastFrameTime = 0;
  private frameCount = 0;

  constructor() {
    super();
    this.state = {
      charts: new Map(),
      datasets: new Map(),
      themes: new Map(),
      dashboards: new Map(),
      performance: {
        renderTime: 0,
        frameRate: 0,
        memoryUsage: 0,
        drawCalls: 0,
        dataPointsRendered: 0
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize default themes
      this.loadDefaultThemes();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      this.emit('engine_initialized');

      (globalThis as any).console?.log('Visualization Engine initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Visualization Engine: ${errorMessage}`);
    }
  }

  public async dispose(): Promise<void> {
    if (!this.isInitialized) return;

    // Stop performance monitoring
    this.stopPerformanceMonitoring();

    // Clear all charts and data
    this.state.charts.clear();
    this.state.datasets.clear();
    this.state.dashboards.clear();

    // Clear event listeners
    this.removeAllListeners();

    this.isInitialized = false;
    this.emit('engine_disposed');
  }

  // Chart Management
  public createChart(id: string, config: ChartConfig): string {
    if (!this.isInitialized) {
      throw new Error('Visualization Engine not initialized');
    }

    const chart = new Chart(id, config, this);
    this.state.charts.set(id, chart);

    this.emit('chart_created', { chartId: id, config });
    return id;
  }

  public removeChart(id: string): boolean {
    const chart = this.state.charts.get(id);
    if (!chart) return false;

    chart.dispose();
    this.state.charts.delete(id);

    this.emit('chart_removed', { chartId: id });
    return true;
  }

  public getChart(id: string): any {
    return this.state.charts.get(id);
  }

  public getAllCharts(): Map<string, any> {
    return new Map(this.state.charts);
  }

  // Data Management
  public addDataSet(dataset: DataSet): void {
    this.state.datasets.set(dataset.id, dataset);
    this.emit('dataset_added', { datasetId: dataset.id });
  }

  public updateDataSet(id: string, dataset: Partial<DataSet>): boolean {
    const existing = this.state.datasets.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...dataset };
    this.state.datasets.set(id, updated);

    this.emit('dataset_updated', { datasetId: id });
    return true;
  }

  public removeDataSet(id: string): boolean {
    const removed = this.state.datasets.delete(id);
    if (removed) {
      this.emit('dataset_removed', { datasetId: id });
    }
    return removed;
  }

  public getDataSet(id: string): DataSet | undefined {
    return this.state.datasets.get(id);
  }

  public bindChartToDataSet(chartId: string, datasetId: string): boolean {
    const chart = this.getChart(chartId);
    const dataset = this.getDataSet(datasetId);

    if (!chart || !dataset) return false;

    chart.setDataSet(dataset);
    this.emit('chart_data_bound', { chartId, datasetId });
    return true;
  }

  // Theme Management
  public addTheme(theme: Theme): void {
    this.state.themes.set(theme.id, theme);
    this.emit('theme_added', { themeId: theme.id });
  }

  public getTheme(id: string): Theme | undefined {
    return this.state.themes.get(id);
  }

  public applyTheme(chartId: string, themeId: string): boolean {
    const chart = this.getChart(chartId);
    const theme = this.getTheme(themeId);

    if (!chart || !theme) return false;

    chart.applyTheme(theme);
    this.emit('theme_applied', { chartId, themeId });
    return true;
  }

  // Dashboard Management
  public createDashboard(config: DashboardConfig): string {
    this.state.dashboards.set(config.id, config);
    this.emit('dashboard_created', { dashboardId: config.id });
    return config.id;
  }

  public getDashboard(id: string): DashboardConfig | undefined {
    return this.state.dashboards.get(id);
  }

  public updateDashboard(id: string, config: Partial<DashboardConfig>): boolean {
    const existing = this.state.dashboards.get(id);
    if (!existing) return false;

    const updated = { ...existing, ...config };
    this.state.dashboards.set(id, updated);

    this.emit('dashboard_updated', { dashboardId: id });
    return true;
  }

  // Rendering
  public render(): void {
    if (!this.isInitialized) return;

    const startTime = (globalThis as any).performance?.now() || 0;

    // Render all charts
    this.state.charts.forEach(chart => {
      if (chart.isVisible() && chart.needsUpdate()) {
        chart.render();
      }
    });

    // Update performance metrics
    const renderTime = ((globalThis as any).performance?.now() || 0) - startTime;
    this.updatePerformanceMetrics(renderTime);

    this.emit('render_complete', { renderTime });
  }

  public renderChart(chartId: string): boolean {
    const chart = this.getChart(chartId);
    if (!chart) return false;

    chart.render();
    return true;
  }

  // Performance Monitoring
  private startPerformanceMonitoring(): void {
    const updatePerformance = () => {
      this.calculateFrameRate();
      this.animationFrameId = (globalThis as any).requestAnimationFrame(updatePerformance);
    };

    if (typeof (globalThis as any).requestAnimationFrame !== 'undefined') {
      this.animationFrameId = (globalThis as any).requestAnimationFrame(updatePerformance);
    } else {
      // Fallback for environments without requestAnimationFrame
      this.animationFrameId = (globalThis as any).setInterval(() => {
        this.calculateFrameRate();
      }, 16); // ~60fps
    }
  }

  private stopPerformanceMonitoring(): void {
    if (this.animationFrameId) {
      if (typeof (globalThis as any).cancelAnimationFrame !== 'undefined') {
        (globalThis as any).cancelAnimationFrame(this.animationFrameId);
      } else {
        (globalThis as any).clearInterval(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
  }

  private calculateFrameRate(): void {
    const currentTime = (globalThis as any).performance?.now() || 0;

    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime;
      this.frameCount++;

      if (this.frameCount >= 60) {
        this.state.performance.frameRate = 1000 / (deltaTime / this.frameCount);
        this.frameCount = 0;
      }
    }

    this.lastFrameTime = currentTime;
  }

  private updatePerformanceMetrics(renderTime: number): void {
    this.state.performance.renderTime = renderTime;

    // Update memory usage if available
    if ((globalThis as any).performance?.memory) {
      this.state.performance.memoryUsage = (globalThis as any).performance.memory.usedJSHeapSize;
    }
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.state.performance };
  }

  // Utility methods
  public getState(): VisualizationState {
    return {
      charts: new Map(this.state.charts),
      datasets: new Map(this.state.datasets),
      themes: new Map(this.state.themes),
      dashboards: new Map(this.state.dashboards),
      performance: { ...this.state.performance }
    };
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private loadDefaultThemes(): void {
    // Load default light theme
    const lightTheme: Theme = {
      id: 'light',
      name: 'Light Theme',
      colors: {
        primary: { r: 66, g: 133, b: 244 },
        secondary: { r: 156, g: 163, b: 175 },
        accent: { r: 34, g: 197, b: 94 },
        background: { r: 255, g: 255, b: 255 },
        surface: { r: 248, g: 250, b: 252 },
        text: { r: 17, g: 24, b: 39 },
        textSecondary: { r: 107, g: 114, b: 128 },
        border: { r: 229, g: 231, b: 235 },
        grid: { r: 243, g: 244, b: 246 },
        palette: [
          { r: 66, g: 133, b: 244 },
          { r: 34, g: 197, b: 94 },
          { r: 251, g: 191, b: 36 },
          { r: 239, g: 68, b: 68 },
          { r: 168, g: 85, b: 247 },
          { r: 6, g: 182, b: 212 },
          { r: 245, g: 101, b: 101 },
          { r: 132, g: 204, b: 22 }
        ]
      },
      fonts: {
        primary: 'system-ui, -apple-system, sans-serif',
        secondary: 'system-ui, -apple-system, sans-serif',
        monospace: 'Consolas, Monaco, monospace'
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
      },
      shadows: {
        light: '0 1px 3px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
        heavy: '0 10px 15px rgba(0, 0, 0, 0.1)'
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 12
      }
    };

    // Load default dark theme
    const darkTheme: Theme = {
      id: 'dark',
      name: 'Dark Theme',
      colors: {
        primary: { r: 96, g: 165, b: 250 },
        secondary: { r: 156, g: 163, b: 175 },
        accent: { r: 52, g: 211, b: 153 },
        background: { r: 17, g: 24, b: 39 },
        surface: { r: 31, g: 41, b: 55 },
        text: { r: 248, g: 250, b: 252 },
        textSecondary: { r: 156, g: 163, b: 175 },
        border: { r: 75, g: 85, b: 99 },
        grid: { r: 55, g: 65, b: 81 },
        palette: [
          { r: 96, g: 165, b: 250 },
          { r: 52, g: 211, b: 153 },
          { r: 251, g: 191, b: 36 },
          { r: 248, g: 113, b: 113 },
          { r: 196, g: 181, b: 253 },
          { r: 34, g: 211, b: 238 },
          { r: 252, g: 165, b: 165 },
          { r: 163, g: 230, b: 53 }
        ]
      },
      fonts: {
        primary: 'system-ui, -apple-system, sans-serif',
        secondary: 'system-ui, -apple-system, sans-serif',
        monospace: 'Consolas, Monaco, monospace'
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32
      },
      shadows: {
        light: '0 1px 3px rgba(0, 0, 0, 0.3)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.3)',
        heavy: '0 10px 15px rgba(0, 0, 0, 0.3)'
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 12
      }
    };

    this.addTheme(lightTheme);
    this.addTheme(darkTheme);
  }
}

// Base Chart class
class Chart extends EventEmitter {
  public readonly id: string;
  private config: ChartConfig;
  private dataset?: DataSet;
  private theme?: Theme;
  private needsRender = true;
  private engine: VisualizationEngine;

  constructor(id: string, config: ChartConfig, engine: VisualizationEngine) {
    super();
    this.id = id;
    this.config = config;
    this.engine = engine;
  }

  public setDataSet(dataset: DataSet): void {
    this.dataset = dataset;
    this.needsRender = true;
    this.emit('data_changed');
  }

  public getDataSet(): DataSet | undefined {
    return this.dataset;
  }

  public applyTheme(theme: Theme): void {
    this.theme = theme;
    this.needsRender = true;
    this.emit('theme_changed');
  }

  public getTheme(): Theme | undefined {
    return this.theme;
  }

  public updateConfig(config: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...config };
    this.needsRender = true;
    this.emit('config_changed');
  }

  public getConfig(): ChartConfig {
    return { ...this.config };
  }

  public render(): void {
    if (!this.needsRender) return;

    const startTime = (globalThis as any).performance?.now() || 0;

    // Emit pre-render event
    this.emit('pre_render');

    // Perform actual rendering based on chart type
    this.performRender();

    const renderTime = ((globalThis as any).performance?.now() || 0) - startTime;
    this.needsRender = false;

    // Emit post-render event
    this.emit('post_render', { renderTime });
  }

  private performRender(): void {
    // This would be implemented by specific chart type renderers
    // For now, just log the render action
    (globalThis as any).console?.log(`Rendering ${this.config.type} chart: ${this.id}`);
  }

  public needsUpdate(): boolean {
    return this.needsRender;
  }

  public isVisible(): boolean {
    return true; // Could be extended to check visibility state
  }

  public dispose(): void {
    this.removeAllListeners();
    this.dataset = undefined;
    this.theme = undefined;
  }
}