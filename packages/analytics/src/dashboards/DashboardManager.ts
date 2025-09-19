import { EventEmitter } from '../utils/EventEmitter';
import {
  Dashboard,
  Widget,
  WidgetType,
  WidgetData,
  DataSeries,
  DataPoint,
  ChartType,
  AggregationType,
  Filter,
  TimeRange,
  DashboardFilter,
  AnalyticsEvent,
  AnalyticsSession
} from '../types';

export class DashboardManager extends EventEmitter {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, Widget> = new Map();
  private dataCache: Map<string, CachedData> = new Map();
  private refreshTimers: Map<string, any> = new Map();
  private config: DashboardConfig;

  constructor(config: DashboardConfig) {
    super();
    this.config = { ...config };
  }

  public createDashboard(
    name: string,
    description: string,
    layout?: any
  ): Dashboard {
    const dashboard: Dashboard = {
      id: this.generateDashboardId(),
      name,
      description,
      widgets: [],
      layout: layout || this.getDefaultLayout(),
      filters: [],
      refreshInterval: 300000, // 5 minutes
      permissions: {
        view: ['*'],
        edit: ['admin'],
        share: ['admin'],
        delete: ['admin']
      }
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboard_created', dashboard);

    return dashboard;
  }

  public addWidget(
    dashboardId: string,
    type: WidgetType,
    title: string,
    config: any
  ): Widget {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widget: Widget = {
      id: this.generateWidgetId(),
      type,
      title,
      description: config.description,
      position: config.position || { x: 0, y: 0 },
      size: config.size || { width: 4, height: 3 },
      config: {
        metrics: config.metrics || [],
        timeRange: config.timeRange || this.getDefaultTimeRange(),
        filters: config.filters || [],
        visualization: config.visualization || this.getDefaultVisualization(type),
        refreshInterval: config.refreshInterval,
        realtime: config.realtime || false
      },
      data: {
        series: [],
        metadata: {
          queryTime: 0,
          resultCount: 0,
          cached: false,
          freshness: 0
        }
      },
      lastUpdated: Date.now()
    };

    this.widgets.set(widget.id, widget);
    dashboard.widgets.push(widget);

    // Setup auto-refresh if configured
    if (widget.config.refreshInterval) {
      this.setupWidgetRefresh(widget);
    }

    this.emit('widget_added', dashboardId, widget);
    return widget;
  }

  public updateWidget(widgetId: string, updates: Partial<Widget>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    Object.assign(widget, updates);
    widget.lastUpdated = Date.now();

    // Clear cache for this widget
    this.clearWidgetCache(widgetId);

    // Update refresh timer if interval changed
    if (updates.config?.refreshInterval) {
      this.clearWidgetRefresh(widgetId);
      this.setupWidgetRefresh(widget);
    }

    this.emit('widget_updated', widget);
  }

  public removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) {
      return false;
    }

    dashboard.widgets.splice(widgetIndex, 1);
    this.widgets.delete(widgetId);
    this.clearWidgetRefresh(widgetId);
    this.clearWidgetCache(widgetId);

    this.emit('widget_removed', dashboardId, widgetId);
    return true;
  }

  public async refreshWidget(widgetId: string, events: AnalyticsEvent[]): Promise<WidgetData> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const startTime = Date.now();

    try {
      const data = await this.generateWidgetData(widget, events);

      widget.data = data;
      widget.lastUpdated = Date.now();

      this.emit('widget_refreshed', widget);
      return data;

    } catch (error) {
      this.emit('widget_refresh_error', widgetId, error);
      throw error;
    }
  }

  private async generateWidgetData(widget: Widget, events: AnalyticsEvent[]): Promise<WidgetData> {
    // Check cache first
    const cacheKey = this.generateCacheKey(widget);
    const cached = this.dataCache.get(cacheKey);

    if (cached && this.isCacheValid(cached, widget)) {
      cached.data.metadata.cached = true;
      return cached.data;
    }

    // Filter events based on widget configuration
    const filteredEvents = this.filterEvents(events, widget.config.timeRange, widget.config.filters);

    // Generate data based on widget type
    const data = await this.generateDataByType(widget, filteredEvents);

    // Cache the result
    this.dataCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      widget: widget.id
    });

    return data;
  }

  private async generateDataByType(widget: Widget, events: AnalyticsEvent[]): Promise<WidgetData> {
    switch (widget.type) {
      case WidgetType.LINE_CHART:
        return this.generateTimeSeriesData(widget, events);

      case WidgetType.BAR_CHART:
        return this.generateCategoricalData(widget, events);

      case WidgetType.PIE_CHART:
        return this.generateProportionalData(widget, events);

      case WidgetType.TABLE:
        return this.generateTableData(widget, events);

      case WidgetType.METRIC:
        return this.generateMetricData(widget, events);

      case WidgetType.HEATMAP:
        return this.generateHeatmapData(widget, events);

      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  private generateTimeSeriesData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    const { timeRange } = widget.config;
    const series: DataSeries[] = [];

    for (const metric of widget.config.metrics) {
      const timeGroups = this.groupEventsByTime(events, timeRange.granularity);
      const dataPoints: DataPoint[] = [];

      for (const [timestamp, groupEvents] of timeGroups) {
        const value = this.calculateMetricValue(groupEvents, metric);
        dataPoints.push({ x: timestamp, y: value });
      }

      series.push({
        name: metric,
        data: dataPoints.sort((a, b) => (a.x as number) - (b.x as number)),
        metadata: {
          unit: this.getMetricUnit(metric),
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      });
    }

    return {
      series,
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private generateCategoricalData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    const series: DataSeries[] = [];

    for (const metric of widget.config.metrics) {
      const categories = this.extractCategories(events, metric);
      const dataPoints: DataPoint[] = [];

      for (const [category, categoryEvents] of categories) {
        const value = this.calculateMetricValue(categoryEvents, metric);
        dataPoints.push({ x: category, y: value });
      }

      series.push({
        name: metric,
        data: dataPoints.sort((a, b) => b.y - a.y), // Sort by value descending
        metadata: {
          unit: this.getMetricUnit(metric),
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      });
    }

    return {
      series,
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private generateProportionalData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    const metric = widget.config.metrics[0]; // Pie charts typically use one metric
    const categories = this.extractCategories(events, metric);
    const dataPoints: DataPoint[] = [];

    const total = events.length;

    for (const [category, categoryEvents] of categories) {
      const value = (categoryEvents.length / total) * 100; // Percentage
      dataPoints.push({ x: category, y: value });
    }

    return {
      series: [{
        name: metric,
        data: dataPoints.sort((a, b) => b.y - a.y),
        metadata: {
          unit: '%',
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      }],
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private generateTableData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    // For table widgets, we'll create a summary of recent events
    const recentEvents = events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100); // Latest 100 events

    const dataPoints: DataPoint[] = recentEvents.map((event, index) => ({
      x: index,
      y: 1,
      metadata: {
        timestamp: new Date(event.timestamp).toISOString(),
        type: event.type,
        category: event.category,
        sessionId: event.sessionId,
        data: event.data
      }
    }));

    return {
      series: [{
        name: 'events',
        data: dataPoints,
        metadata: {
          unit: 'events',
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      }],
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private generateMetricData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    const metric = widget.config.metrics[0];
    const value = this.calculateMetricValue(events, metric);

    return {
      series: [{
        name: metric,
        data: [{ x: 'current', y: value }],
        metadata: {
          unit: this.getMetricUnit(metric),
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      }],
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private generateHeatmapData(widget: Widget, events: AnalyticsEvent[]): WidgetData {
    // Generate hour-of-day vs day-of-week heatmap
    const heatmapData: DataPoint[] = [];

    const timeGroups = new Map<string, number>();

    for (const event of events) {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const key = `${day}-${hour}`;

      timeGroups.set(key, (timeGroups.get(key) || 0) + 1);
    }

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const value = timeGroups.get(key) || 0;

        heatmapData.push({
          x: hour,
          y: day,
          metadata: { value, day, hour }
        });
      }
    }

    return {
      series: [{
        name: 'activity',
        data: heatmapData,
        metadata: {
          unit: 'events',
          aggregation: AggregationType.COUNT,
          source: 'events'
        }
      }],
      metadata: {
        queryTime: Date.now(),
        resultCount: events.length,
        cached: false,
        freshness: Date.now()
      }
    };
  }

  private groupEventsByTime(events: AnalyticsEvent[], granularity: string): Map<number, AnalyticsEvent[]> {
    const groups = new Map<number, AnalyticsEvent[]>();

    let intervalMs: number;
    switch (granularity) {
      case 'minute': intervalMs = 60 * 1000; break;
      case 'hour': intervalMs = 60 * 60 * 1000; break;
      case 'day': intervalMs = 24 * 60 * 60 * 1000; break;
      default: intervalMs = 60 * 60 * 1000; // Default to hour
    }

    for (const event of events) {
      const bucket = Math.floor(event.timestamp / intervalMs) * intervalMs;

      if (!groups.has(bucket)) {
        groups.set(bucket, []);
      }
      groups.get(bucket)!.push(event);
    }

    return groups;
  }

  private extractCategories(events: AnalyticsEvent[], metric: string): Map<string, AnalyticsEvent[]> {
    const categories = new Map<string, AnalyticsEvent[]>();

    for (const event of events) {
      let category: string;

      switch (metric) {
        case 'event_type':
          category = event.type;
          break;
        case 'event_category':
          category = event.category;
          break;
        case 'source':
          category = event.metadata.source;
          break;
        case 'platform':
          category = event.metadata.platform;
          break;
        default:
          category = event.data[metric] || 'unknown';
      }

      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(event);
    }

    return categories;
  }

  private calculateMetricValue(events: AnalyticsEvent[], metric: string): number {
    switch (metric) {
      case 'event_count':
        return events.length;

      case 'unique_sessions':
        return new Set(events.map(e => e.sessionId)).size;

      case 'unique_users':
        return new Set(events.map(e => e.userId).filter(id => id)).size;

      case 'error_rate':
        const errorEvents = events.filter(e => e.type === 'error');
        return events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

      case 'avg_session_duration':
        // This would require session data, simplified for now
        return 0;

      default:
        // For custom metrics, try to extract from event data
        const values = events
          .map(e => e.data[metric])
          .filter(v => typeof v === 'number');

        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    }
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case 'event_count':
      case 'unique_sessions':
      case 'unique_users':
        return 'count';

      case 'error_rate':
        return '%';

      case 'avg_session_duration':
        return 'ms';

      default:
        return 'value';
    }
  }

  private filterEvents(events: AnalyticsEvent[], timeRange: TimeRange, filters: Filter[]): AnalyticsEvent[] {
    return events.filter(event => {
      // Time range filter
      if (event.timestamp < timeRange.start || event.timestamp > timeRange.end) {
        return false;
      }

      // Custom filters
      for (const filter of filters) {
        if (!this.applyFilter(event, filter)) {
          return false;
        }
      }

      return true;
    });
  }

  private applyFilter(event: AnalyticsEvent, filter: Filter): boolean {
    let value: any;

    // Extract value based on field
    switch (filter.field) {
      case 'type':
        value = event.type;
        break;
      case 'category':
        value = event.category;
        break;
      case 'sessionId':
        value = event.sessionId;
        break;
      case 'userId':
        value = event.userId;
        break;
      default:
        value = event.data[filter.field];
    }

    // Apply operator
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return typeof value === 'string' && value.includes(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'greater_than':
        return typeof value === 'number' && value > filter.value;
      case 'less_than':
        return typeof value === 'number' && value < filter.value;
      default:
        return true;
    }
  }

  private setupWidgetRefresh(widget: Widget): void {
    if (!widget.config.refreshInterval) return;

    const timer = (globalThis as any).setInterval(() => {
      this.emit('widget_refresh_needed', widget.id);
    }, widget.config.refreshInterval);

    this.refreshTimers.set(widget.id, timer);
  }

  private clearWidgetRefresh(widgetId: string): void {
    const timer = this.refreshTimers.get(widgetId);
    if (timer) {
      (globalThis as any).clearInterval(timer);
      this.refreshTimers.delete(widgetId);
    }
  }

  private clearWidgetCache(widgetId: string): void {
    for (const [key, cached] of this.dataCache) {
      if (cached.widget === widgetId) {
        this.dataCache.delete(key);
      }
    }
  }

  private generateCacheKey(widget: Widget): string {
    const keyData = {
      widgetId: widget.id,
      config: widget.config,
      lastUpdated: widget.lastUpdated
    };
    return JSON.stringify(keyData);
  }

  private isCacheValid(cached: CachedData, widget: Widget): boolean {
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = widget.config.refreshInterval || 300000; // 5 minutes default

    return cacheAge < maxAge;
  }

  private getDefaultLayout(): any {
    return {
      columns: 12,
      rowHeight: 30,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      responsive: true
    };
  }

  private getDefaultTimeRange(): TimeRange {
    const now = Date.now();
    return {
      start: now - 24 * 60 * 60 * 1000, // 24 hours ago
      end: now,
      granularity: 'hour' as any
    };
  }

  private getDefaultVisualization(type: WidgetType): any {
    return {
      chartType: this.getChartTypeForWidget(type),
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      axes: [],
      legend: { show: true, position: 'right', align: 'center' },
      annotations: []
    };
  }

  private getChartTypeForWidget(type: WidgetType): ChartType {
    switch (type) {
      case WidgetType.LINE_CHART: return ChartType.LINE;
      case WidgetType.BAR_CHART: return ChartType.BAR;
      case WidgetType.PIE_CHART: return ChartType.PIE;
      default: return ChartType.LINE;
    }
  }

  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  public getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getWidget(id: string): Widget | undefined {
    return this.widgets.get(id);
  }

  public deleteDashboard(id: string): boolean {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return false;
    }

    // Clean up widgets
    for (const widget of dashboard.widgets) {
      this.clearWidgetRefresh(widget.id);
      this.clearWidgetCache(widget.id);
      this.widgets.delete(widget.id);
    }

    this.dashboards.delete(id);
    this.emit('dashboard_deleted', id);
    return true;
  }

  public destroy(): void {
    // Clear all timers
    for (const timer of this.refreshTimers.values()) {
      (globalThis as any).clearInterval(timer);
    }

    this.refreshTimers.clear();
    this.dataCache.clear();
    this.removeAllListeners();
  }
}

interface DashboardConfig {
  defaultRefreshInterval: number;
  maxCacheSize: number;
  cacheTimeout: number;
}

interface CachedData {
  data: WidgetData;
  timestamp: number;
  widget: string;
}