/**
 * Dashboard Manager for Steam Simulation Toolkit
 * Manages multiple dashboards and their lifecycle
 */

import { EventEmitter } from '../utils/EventEmitter';
import { Dashboard } from './Dashboard';
import { ChartFactory, BaseChart } from '../charts/ChartFactory';
import { DataSourceManager } from '../data-sources/DataSourceManager';
import { DashboardConfig, ChartInstance, ChartType, Theme } from '../core/types';

export interface DashboardInfo {
  id: string;
  config: DashboardConfig;
  dashboard: Dashboard;
  container?: any;
  isActive: boolean;
  createdAt: Date;
  lastUpdated: Date;
}

export class DashboardManager extends EventEmitter {
  private dashboards: Map<string, DashboardInfo> = new Map();
  private dataSourceManager: DataSourceManager;
  private activeDashboardId: string | null = null;
  private themes: Map<string, Theme> = new Map();

  constructor(dataSourceManager: DataSourceManager) {
    super();
    this.dataSourceManager = dataSourceManager;
    this.setupDefaultThemes();
  }

  public createDashboard(config: DashboardConfig, container?: any): Dashboard {
    if (this.dashboards.has(config.id)) {
      throw new Error(`Dashboard with id '${config.id}' already exists`);
    }

    const dashboard = new Dashboard(config.id, config);
    dashboard.setDataSourceManager(this.dataSourceManager);

    if (container) {
      dashboard.setContainer(container);
    }

    const dashboardInfo: DashboardInfo = {
      id: config.id,
      config: { ...config },
      dashboard,
      container,
      isActive: false,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    this.dashboards.set(config.id, dashboardInfo);

    // Create charts for the dashboard
    this.createDashboardCharts(dashboard, config);

    // Set up event listeners
    dashboard.on('chart-added', (chartId: string) => {
      this.emit('dashboard-chart-added', config.id, chartId);
    });

    dashboard.on('chart-removed', (chartId: string) => {
      this.emit('dashboard-chart-removed', config.id, chartId);
    });

    dashboard.on('chart-error', (chartId: string, error: Error) => {
      this.emit('dashboard-chart-error', config.id, chartId, error);
    });

    this.emit('dashboard-created', config.id);
    return dashboard;
  }

  public removeDashboard(id: string): void {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) return;

    // Deactivate if active
    if (this.activeDashboardId === id) {
      this.activeDashboardId = null;
    }

    // Destroy dashboard
    dashboardInfo.dashboard.destroy();

    this.dashboards.delete(id);
    this.emit('dashboard-removed', id);
  }

  public getDashboard(id: string): Dashboard | null {
    const dashboardInfo = this.dashboards.get(id);
    return dashboardInfo?.dashboard || null;
  }

  public getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values()).map(info => info.dashboard);
  }

  public getDashboardInfo(id: string): DashboardInfo | null {
    const info = this.dashboards.get(id);
    return info ? { ...info } : null;
  }

  public getAllDashboardInfo(): DashboardInfo[] {
    return Array.from(this.dashboards.values()).map(info => ({ ...info }));
  }

  public setActiveDashboard(id: string): void {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) {
      throw new Error(`Dashboard with id '${id}' not found`);
    }

    // Deactivate current dashboard
    if (this.activeDashboardId) {
      const currentInfo = this.dashboards.get(this.activeDashboardId);
      if (currentInfo) {
        currentInfo.isActive = false;
      }
    }

    // Activate new dashboard
    dashboardInfo.isActive = true;
    this.activeDashboardId = id;

    this.emit('dashboard-activated', id);
  }

  public getActiveDashboard(): Dashboard | null {
    if (!this.activeDashboardId) return null;
    return this.getDashboard(this.activeDashboardId);
  }

  public updateDashboardConfig(id: string, config: Partial<DashboardConfig>): void {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) {
      throw new Error(`Dashboard with id '${id}' not found`);
    }

    // Update config
    Object.assign(dashboardInfo.config, config);
    dashboardInfo.lastUpdated = new Date();

    // Update dashboard
    dashboardInfo.dashboard.updateConfig(config);

    this.emit('dashboard-updated', id);
  }

  public addChartToDashboard(dashboardId: string, chartInstance: ChartInstance, chartType?: ChartType): BaseChart {
    const dashboardInfo = this.dashboards.get(dashboardId);
    if (!dashboardInfo) {
      throw new Error(`Dashboard with id '${dashboardId}' not found`);
    }

    // Create chart
    const type = chartType || chartInstance.config?.type || ChartType.LINE;
    const chart = ChartFactory.createChart(type, chartInstance.chartId, {
      type,
      width: 400,
      height: 300,
      ...chartInstance.config
    });

    // Add to dashboard
    dashboardInfo.dashboard.addChart(chartInstance, chart);

    // Update dashboard config
    dashboardInfo.config.charts.push(chartInstance);
    dashboardInfo.lastUpdated = new Date();

    return chart;
  }

  public removeChartFromDashboard(dashboardId: string, chartId: string): void {
    const dashboardInfo = this.dashboards.get(dashboardId);
    if (!dashboardInfo) return;

    // Remove from dashboard
    dashboardInfo.dashboard.removeChart(chartId);

    // Update dashboard config
    dashboardInfo.config.charts = dashboardInfo.config.charts.filter(c => c.id !== chartId);
    dashboardInfo.lastUpdated = new Date();
  }

  public setDashboardContainer(id: string, container: any): void {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) {
      throw new Error(`Dashboard with id '${id}' not found`);
    }

    dashboardInfo.container = container;
    dashboardInfo.dashboard.setContainer(container);
  }

  public refreshDashboard(id: string): void {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) return;

    dashboardInfo.dashboard.refreshData();
    dashboardInfo.lastUpdated = new Date();
  }

  public refreshAllDashboards(): void {
    this.dashboards.forEach(dashboardInfo => {
      dashboardInfo.dashboard.refreshData();
      dashboardInfo.lastUpdated = new Date();
    });
  }

  public exportDashboard(id: string): Promise<{
    config: DashboardConfig;
    data: any;
    image?: any;
  }> {
    return new Promise(async (resolve, reject) => {
      const dashboardInfo = this.dashboards.get(id);
      if (!dashboardInfo) {
        reject(new Error(`Dashboard with id '${id}' not found`));
        return;
      }

      try {
        const data = dashboardInfo.dashboard.exportData();
        let image: any;

        try {
          image = await dashboardInfo.dashboard.exportImage();
        } catch (error) {
          (globalThis as any).console?.warn('Failed to export dashboard image:', error);
        }

        resolve({
          config: dashboardInfo.config,
          data,
          image
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public importDashboard(exportData: { config: DashboardConfig; data?: any }, container?: any): Dashboard {
    const dashboard = this.createDashboard(exportData.config, container);

    // Import data if available
    if (exportData.data) {
      Object.keys(exportData.data).forEach(chartId => {
        const chart = dashboard.getChart(chartId);
        if (chart) {
          chart.setDataSet(exportData.data[chartId]);
        }
      });
    }

    return dashboard;
  }

  public cloneDashboard(id: string, newId: string, container?: any): Dashboard {
    const dashboardInfo = this.dashboards.get(id);
    if (!dashboardInfo) {
      throw new Error(`Dashboard with id '${id}' not found`);
    }

    const clonedConfig: DashboardConfig = {
      ...dashboardInfo.config,
      id: newId,
      title: `${dashboardInfo.config.title} (Copy)`,
      charts: dashboardInfo.config.charts.map(chart => ({
        ...chart,
        id: `${chart.id}_clone`
      }))
    };

    return this.createDashboard(clonedConfig, container);
  }

  public applyTheme(dashboardId: string, themeId: string): void {
    const dashboardInfo = this.dashboards.get(dashboardId);
    const theme = this.themes.get(themeId);

    if (!dashboardInfo || !theme) return;

    // Apply theme to all charts in dashboard
    dashboardInfo.dashboard.getAllCharts().forEach(chart => {
      chart.setConfig({
        backgroundColor: theme.colors.background,
        theme: themeId
      });
    });

    this.emit('dashboard-theme-applied', dashboardId, themeId);
  }

  public addTheme(theme: Theme): void {
    this.themes.set(theme.id, theme);
    this.emit('theme-added', theme.id);
  }

  public getTheme(id: string): Theme | null {
    return this.themes.get(id) || null;
  }

  public getAllThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  public getMetrics(): {
    totalDashboards: number;
    activeDashboards: number;
    totalCharts: number;
    oldestDashboard: Date | null;
    newestDashboard: Date | null;
  } {
    const infos = Array.from(this.dashboards.values());

    const totalDashboards = infos.length;
    const activeDashboards = infos.filter(info => info.isActive).length;
    const totalCharts = infos.reduce((sum, info) => sum + info.config.charts.length, 0);

    const dates = infos.map(info => info.createdAt);
    const oldestDashboard = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const newestDashboard = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    return {
      totalDashboards,
      activeDashboards,
      totalCharts,
      oldestDashboard,
      newestDashboard
    };
  }

  private createDashboardCharts(dashboard: Dashboard, config: DashboardConfig): void {
    config.charts.forEach(chartInstance => {
      try {
        const chart = ChartFactory.createChart(
          chartInstance.config?.type || ChartType.LINE,
          chartInstance.chartId,
          {
            type: chartInstance.config?.type || ChartType.LINE,
            width: 400,
            height: 300,
            ...chartInstance.config
          }
        );

        dashboard.addChart(chartInstance, chart);
      } catch (error) {
        (globalThis as any).console?.error(`Failed to create chart ${chartInstance.id}:`, error);
        this.emit('dashboard-chart-error', config.id, chartInstance.id, error);
      }
    });
  }

  private setupDefaultThemes(): void {
    // Light theme
    this.addTheme({
      id: 'light',
      name: 'Light',
      colors: {
        primary: { r: 66, g: 133, b: 244 },
        secondary: { r: 52, g: 168, b: 83 },
        accent: { r: 251, g: 188, b: 5 },
        background: { r: 255, g: 255, b: 255 },
        surface: { r: 248, g: 249, b: 250 },
        text: { r: 33, g: 37, b: 41 },
        textSecondary: { r: 108, g: 117, b: 125 },
        border: { r: 222, g: 226, b: 230 },
        grid: { r: 240, g: 240, b: 240 },
        palette: [
          { r: 66, g: 133, b: 244 },
          { r: 52, g: 168, b: 83 },
          { r: 251, g: 188, b: 5 },
          { r: 234, g: 67, b: 53 },
          { r: 156, g: 39, b: 176 },
          { r: 0, g: 150, b: 136 },
          { r: 255, g: 87, b: 34 },
          { r: 96, g: 125, b: 139 }
        ]
      },
      fonts: {
        primary: 'Segoe UI, Roboto, sans-serif',
        secondary: 'Arial, sans-serif',
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
        light: '0 1px 3px rgba(0,0,0,0.12)',
        medium: '0 4px 6px rgba(0,0,0,0.16)',
        heavy: '0 10px 20px rgba(0,0,0,0.19)'
      },
      borderRadius: {
        sm: 2,
        md: 4,
        lg: 8
      }
    });

    // Dark theme
    this.addTheme({
      id: 'dark',
      name: 'Dark',
      colors: {
        primary: { r: 138, g: 180, b: 248 },
        secondary: { r: 102, g: 187, b: 106 },
        accent: { r: 255, g: 213, b: 79 },
        background: { r: 18, g: 18, b: 18 },
        surface: { r: 33, g: 37, b: 41 },
        text: { r: 248, g: 249, b: 250 },
        textSecondary: { r: 173, g: 181, b: 189 },
        border: { r: 73, g: 80, b: 87 },
        grid: { r: 52, g: 58, b: 64 },
        palette: [
          { r: 138, g: 180, b: 248 },
          { r: 102, g: 187, b: 106 },
          { r: 255, g: 213, b: 79 },
          { r: 248, g: 113, b: 113 },
          { r: 186, g: 104, b: 200 },
          { r: 77, g: 182, b: 172 },
          { r: 255, g: 138, b: 101 },
          { r: 144, g: 164, b: 174 }
        ]
      },
      fonts: {
        primary: 'Segoe UI, Roboto, sans-serif',
        secondary: 'Arial, sans-serif',
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
        light: '0 1px 3px rgba(0,0,0,0.4)',
        medium: '0 4px 6px rgba(0,0,0,0.5)',
        heavy: '0 10px 20px rgba(0,0,0,0.6)'
      },
      borderRadius: {
        sm: 2,
        md: 4,
        lg: 8
      }
    });
  }

  public destroy(): void {
    // Remove all dashboards
    Array.from(this.dashboards.keys()).forEach(id => {
      this.removeDashboard(id);
    });

    // Clear collections
    this.dashboards.clear();
    this.themes.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}