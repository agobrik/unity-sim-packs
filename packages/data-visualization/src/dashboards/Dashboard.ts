/**
 * Dashboard implementation for Steam Simulation Toolkit
 * Manages layout and coordination of multiple charts
 */

import { EventEmitter, timer } from '../utils/EventEmitter';
import { BaseChart } from '../charts/ChartFactory';
import { DashboardConfig, LayoutConfig, ChartInstance, FilterConfig, DataSet } from '../core/types';
import { DataSourceManager } from '../data-sources/DataSourceManager';

export interface DashboardChart {
  instance: ChartInstance;
  chart: BaseChart;
  element?: any;
  renderContext?: any;
}

export class Dashboard extends EventEmitter {
  public readonly id: string;
  private config: DashboardConfig;
  private charts: Map<string, DashboardChart> = new Map();
  private container: any = null;
  private dataSourceManager: DataSourceManager | null = null;
  private refreshTimer: any = null;
  private filters: Map<string, any> = new Map();
  private layout: {
    containerWidth: number;
    containerHeight: number;
    cellWidth: number;
    cellHeight: number;
    gap: number;
    padding: number;
  } | null = null;

  constructor(id: string, config: DashboardConfig) {
    super();
    this.id = id;
    this.config = { ...config };
  }

  public setContainer(container: any): void {
    this.container = container;
    this.setupContainer();
    this.calculateLayout();
    this.renderCharts();
  }

  public setDataSourceManager(manager: DataSourceManager): void {
    this.dataSourceManager = manager;

    // Subscribe to data updates
    manager.on('chart-data-updated', (chartId: string, dataSourceId: string, dataset: DataSet) => {
      this.handleDataUpdate(chartId, dataset);
    });
  }

  public addChart(chartInstance: ChartInstance, chart: BaseChart): void {
    const dashboardChart: DashboardChart = {
      instance: chartInstance,
      chart
    };

    this.charts.set(chartInstance.id, dashboardChart);

    // Subscribe to data source if specified
    if (chartInstance.dataSourceId && this.dataSourceManager) {
      this.dataSourceManager.subscribeChart(chartInstance.id, chartInstance.dataSourceId);
    }

    // Apply dashboard-level config to chart
    if (chartInstance.config) {
      chart.setConfig(chartInstance.config);
    }

    // Create chart element if container is available
    if (this.container) {
      this.createChartElement(dashboardChart);
      this.positionChart(dashboardChart);
    }

    this.emit('chart-added', chartInstance.id);
  }

  public removeChart(chartId: string): void {
    const dashboardChart = this.charts.get(chartId);
    if (!dashboardChart) return;

    // Unsubscribe from data source
    if (dashboardChart.instance.dataSourceId && this.dataSourceManager) {
      this.dataSourceManager.unsubscribeChart(chartId, dashboardChart.instance.dataSourceId);
    }

    // Remove chart element
    if (dashboardChart.element && dashboardChart.element.parentNode) {
      dashboardChart.element.parentNode.removeChild(dashboardChart.element);
    }

    this.charts.delete(chartId);
    this.emit('chart-removed', chartId);
  }

  public getChart(chartId: string): BaseChart | null {
    const dashboardChart = this.charts.get(chartId);
    return dashboardChart?.chart || null;
  }

  public getAllCharts(): BaseChart[] {
    return Array.from(this.charts.values()).map(dc => dc.chart);
  }

  public updateConfig(config: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.container) {
      this.calculateLayout();
      this.repositionCharts();
    }

    if (config.refreshInterval !== undefined) {
      this.setupAutoRefresh();
    }

    this.emit('config-updated', this.config);
  }

  public getConfig(): DashboardConfig {
    return { ...this.config };
  }

  public applyFilter(filterId: string, value: any): void {
    this.filters.set(filterId, value);

    // Apply filter to all charts
    this.charts.forEach(dashboardChart => {
      this.applyFiltersToChart(dashboardChart);
    });

    this.emit('filter-applied', filterId, value);
  }

  public removeFilter(filterId: string): void {
    this.filters.delete(filterId);

    // Reapply remaining filters to all charts
    this.charts.forEach(dashboardChart => {
      this.applyFiltersToChart(dashboardChart);
    });

    this.emit('filter-removed', filterId);
  }

  public clearFilters(): void {
    this.filters.clear();

    // Refresh all charts with unfiltered data
    this.charts.forEach(dashboardChart => {
      this.refreshChartData(dashboardChart);
    });

    this.emit('filters-cleared');
  }

  public refreshData(): void {
    if (this.dataSourceManager) {
      this.dataSourceManager.refreshAllDataSources();
    }
  }

  public resizeCharts(): void {
    if (!this.container) return;

    this.calculateLayout();
    this.repositionCharts();
    this.renderCharts();
  }

  public exportData(): any {
    const data: any = {};

    this.charts.forEach((dashboardChart, chartId) => {
      const dataset = dashboardChart.chart.getDataSet();
      if (dataset) {
        data[chartId] = dataset;
      }
    });

    return data;
  }

  public exportImage(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.container) {
        reject(new Error('No container available for export'));
        return;
      }

      try {
        // Create a canvas for the entire dashboard
        const canvas = (globalThis as any).document?.createElement('canvas');
        if (!canvas) {
          reject(new Error('Canvas not available for export'));
          return;
        }

        const rect = this.container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render each chart to the canvas
        const promises: Promise<void>[] = [];

        this.charts.forEach(dashboardChart => {
          if (dashboardChart.element) {
            promises.push(this.renderChartToCanvas(ctx, dashboardChart));
          }
        });

        Promise.all(promises).then(() => {
          canvas.toBlob((blob: any) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          });
        }).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupContainer(): void {
    if (!this.container) return;

    // Set up container styles
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.overflow = 'auto';

    // Add dashboard class
    this.container.classList.add('steam-dashboard');

    // Set up auto-refresh if configured
    this.setupAutoRefresh();
  }

  private calculateLayout(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const layout = this.config.layout;
    const gap = layout.gap || 10;
    const padding = layout.padding || 20;

    let cellWidth: number;
    let cellHeight: number;

    if (layout.type === 'grid') {
      const cols = layout.columns || 2;
      const rows = layout.rows || 2;

      cellWidth = (containerWidth - padding * 2 - gap * (cols - 1)) / cols;
      cellHeight = (containerHeight - padding * 2 - gap * (rows - 1)) / rows;
    } else {
      // Flow layout - will be calculated per chart
      cellWidth = containerWidth / 2 - padding - gap / 2;
      cellHeight = containerHeight / 2 - padding - gap / 2;
    }

    this.layout = {
      containerWidth,
      containerHeight,
      cellWidth,
      cellHeight,
      gap,
      padding
    };
  }

  private createChartElement(dashboardChart: DashboardChart): void {
    if (!this.container || !this.layout) return;

    const element = (globalThis as any).document?.createElement('div');
    if (!element) return;

    element.style.position = 'absolute';
    element.style.backgroundColor = '#ffffff';
    element.style.border = '1px solid #e0e0e0';
    element.style.borderRadius = '4px';
    element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

    // Create canvas for chart rendering
    const canvas = (globalThis as any).document?.createElement('canvas');
    if (canvas) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      element.appendChild(canvas);
      dashboardChart.renderContext = canvas.getContext('2d');
    }

    this.container.appendChild(element);
    dashboardChart.element = element;
  }

  private positionChart(dashboardChart: DashboardChart): void {
    if (!dashboardChart.element || !this.layout) return;

    const instance = dashboardChart.instance;
    const position = instance.position;

    let x: number, y: number, width: number, height: number;

    if (this.config.layout.type === 'grid') {
      const cols = this.config.layout.columns || 2;

      x = this.layout.padding + position.column * (this.layout.cellWidth + this.layout.gap);
      y = this.layout.padding + position.row * (this.layout.cellHeight + this.layout.gap);

      width = this.layout.cellWidth * (position.columnSpan || 1) +
              this.layout.gap * Math.max(0, (position.columnSpan || 1) - 1);
      height = this.layout.cellHeight * (position.rowSpan || 1) +
               this.layout.gap * Math.max(0, (position.rowSpan || 1) - 1);
    } else {
      // Flow layout - simple positioning for now
      x = this.layout.padding + (position.column % 2) * (this.layout.cellWidth + this.layout.gap);
      y = this.layout.padding + Math.floor(position.column / 2) * (this.layout.cellHeight + this.layout.gap);
      width = this.layout.cellWidth;
      height = this.layout.cellHeight;
    }

    dashboardChart.element.style.left = `${x}px`;
    dashboardChart.element.style.top = `${y}px`;
    dashboardChart.element.style.width = `${width}px`;
    dashboardChart.element.style.height = `${height}px`;

    // Update chart config with new dimensions
    dashboardChart.chart.setConfig({
      width: width,
      height: height
    });
  }

  private repositionCharts(): void {
    this.charts.forEach(dashboardChart => {
      this.positionChart(dashboardChart);
    });
  }

  private renderCharts(): void {
    this.charts.forEach(dashboardChart => {
      this.renderChart(dashboardChart);
    });
  }

  private renderChart(dashboardChart: DashboardChart): void {
    if (!dashboardChart.renderContext) return;

    try {
      dashboardChart.chart.render(dashboardChart.renderContext);
    } catch (error) {
      (globalThis as any).console?.error(`Error rendering chart ${dashboardChart.instance.id}:`, error);
      this.emit('chart-error', dashboardChart.instance.id, error);
    }
  }

  private handleDataUpdate(chartId: string, dataset: DataSet): void {
    const dashboardChart = this.charts.get(chartId);
    if (!dashboardChart) return;

    // Apply filters to the dataset
    const filteredDataset = this.applyFiltersToDataset(dataset);

    // Update chart with new data
    dashboardChart.chart.setDataSet(filteredDataset);

    // Re-render chart
    this.renderChart(dashboardChart);

    this.emit('chart-data-updated', chartId, filteredDataset);
  }

  private applyFiltersToChart(dashboardChart: DashboardChart): void {
    if (!dashboardChart.instance.dataSourceId || !this.dataSourceManager) return;

    // Get fresh data from data source
    this.dataSourceManager.getData(dashboardChart.instance.dataSourceId)
      .then(dataset => {
        if (dataset) {
          this.handleDataUpdate(dashboardChart.instance.id, dataset);
        }
      })
      .catch(error => {
        (globalThis as any).console?.error(`Error applying filters to chart ${dashboardChart.instance.id}:`, error);
      });
  }

  private applyFiltersToDataset(dataset: DataSet): DataSet {
    if (this.filters.size === 0) return dataset;

    const filtered: DataSet = {
      ...dataset,
      series: dataset.series.map(series => ({
        ...series,
        data: series.data.filter(point => this.matchesFilters(point))
      }))
    };

    return filtered;
  }

  private matchesFilters(point: any): boolean {
    for (const [filterId, filterValue] of this.filters.entries()) {
      const filterConfig = this.config.globalFilters?.find(f => f.id === filterId);
      if (!filterConfig) continue;

      if (!this.matchesFilter(point, filterConfig, filterValue)) {
        return false;
      }
    }
    return true;
  }

  private matchesFilter(point: any, config: FilterConfig, value: any): boolean {
    const fieldValue = this.getFieldValue(point, config.field);

    switch (config.type) {
      case 'range':
        return fieldValue >= value.min && fieldValue <= value.max;
      case 'categorical':
        return Array.isArray(value) ? value.includes(fieldValue) : fieldValue === value;
      case 'search':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'date':
        const pointDate = new Date(fieldValue);
        const filterDate = new Date(value);
        return pointDate >= filterDate;
      default:
        return true;
    }
  }

  private getFieldValue(point: any, field: string): any {
    const parts = field.split('.');
    let value = point;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private refreshChartData(dashboardChart: DashboardChart): void {
    if (!dashboardChart.instance.dataSourceId || !this.dataSourceManager) return;

    this.dataSourceManager.refreshDataSource(dashboardChart.instance.dataSourceId)
      .catch(error => {
        (globalThis as any).console?.error(`Error refreshing chart ${dashboardChart.instance.id}:`, error);
      });
  }

  private setupAutoRefresh(): void {
    if (this.refreshTimer) {
      timer.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.config.autoRefresh && this.config.refreshInterval && this.config.refreshInterval > 0) {
      this.refreshTimer = timer.setInterval(() => {
        this.refreshData();
      }, this.config.refreshInterval);
    }
  }

  private async renderChartToCanvas(ctx: any, dashboardChart: DashboardChart): Promise<void> {
    if (!dashboardChart.element) return;

    const rect = dashboardChart.element.getBoundingClientRect();
    const canvas = dashboardChart.element.querySelector('canvas');

    if (canvas) {
      ctx.drawImage(canvas, rect.left, rect.top);
    }
  }

  public destroy(): void {
    // Stop auto-refresh
    if (this.refreshTimer) {
      timer.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Remove all charts
    Array.from(this.charts.keys()).forEach(chartId => {
      this.removeChart(chartId);
    });

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    // Remove all listeners
    this.removeAllListeners();
  }
}