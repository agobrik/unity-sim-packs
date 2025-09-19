/**
 * Data Source Manager for Steam Simulation Toolkit
 * Manages real-time data sources and data flow to charts
 */

import { EventEmitter, timer } from '../utils/EventEmitter';
import { DataSet, DataSourceConfig, DataSeries, DataPoint } from '../core/types';

export interface DataSource extends EventEmitter {
  readonly id: string;
  readonly config: DataSourceConfig;
  readonly isConnected: boolean;
  readonly lastUpdate: Date | null;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getData(): Promise<DataSet>;
  updateConfig(config: Partial<DataSourceConfig>): void;
}

export interface DataSourceEvents {
  'data-updated': (dataSource: DataSource, dataset: DataSet) => void;
  'connection-changed': (dataSource: DataSource, connected: boolean) => void;
  'error': (dataSource: DataSource, error: Error) => void;
  'status-changed': (dataSource: DataSource, status: string) => void;
}

export class DataSourceManager extends EventEmitter {
  private dataSources: Map<string, DataSource> = new Map();
  private dataCache: Map<string, DataSet> = new Map();
  private updateIntervals: Map<string, any> = new Map();
  private subscribers: Map<string, Set<string>> = new Map(); // chartId -> dataSourceIds

  public registerDataSource(dataSource: DataSource): void {
    if (this.dataSources.has(dataSource.id)) {
      throw new Error(`Data source with id '${dataSource.id}' already exists`);
    }

    this.dataSources.set(dataSource.id, dataSource);

    // Set up event listeners
    dataSource.on('data-updated', (ds: DataSource, dataset: DataSet) => {
      this.handleDataUpdate(ds, dataset);
    });

    dataSource.on('connection-changed', (ds: DataSource, connected: boolean) => {
      this.emit('data-source-connection-changed', ds.id, connected);
    });

    dataSource.on('error', (ds: DataSource, error: Error) => {
      (globalThis as any).console?.error(`Data source ${ds.id} error:`, error);
      this.emit('data-source-error', ds.id, error);
    });

    this.emit('data-source-registered', dataSource.id);
  }

  public unregisterDataSource(id: string): void {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return;

    // Stop updates
    this.stopAutoUpdate(id);

    // Disconnect
    dataSource.disconnect().catch(error => {
      (globalThis as any).console?.error(`Error disconnecting data source ${id}:`, error);
    });

    // Clean up
    this.dataSources.delete(id);
    this.dataCache.delete(id);
    this.subscribers.delete(id);

    this.emit('data-source-unregistered', id);
  }

  public getDataSource(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }

  public getAllDataSources(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  public async connectDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source with id '${id}' not found`);
    }

    await dataSource.connect();

    // Start auto-update if configured
    if (dataSource.config.updateInterval && dataSource.config.updateInterval > 0) {
      this.startAutoUpdate(id, dataSource.config.updateInterval);
    }
  }

  public async disconnectDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return;

    this.stopAutoUpdate(id);
    await dataSource.disconnect();
  }

  public async getData(id: string, forceRefresh: boolean = false): Promise<DataSet | null> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return null;

    // Return cached data if available and not forcing refresh
    if (!forceRefresh && this.dataCache.has(id)) {
      return this.dataCache.get(id)!;
    }

    try {
      const dataset = await dataSource.getData();
      this.dataCache.set(id, dataset);
      return dataset;
    } catch (error) {
      (globalThis as any).console?.error(`Error getting data from source ${id}:`, error);
      throw error;
    }
  }

  public subscribeChart(chartId: string, dataSourceId: string): void {
    if (!this.subscribers.has(chartId)) {
      this.subscribers.set(chartId, new Set());
    }
    this.subscribers.get(chartId)!.add(dataSourceId);

    this.emit('chart-subscribed', chartId, dataSourceId);
  }

  public unsubscribeChart(chartId: string, dataSourceId?: string): void {
    if (!this.subscribers.has(chartId)) return;

    if (dataSourceId) {
      this.subscribers.get(chartId)!.delete(dataSourceId);
    } else {
      this.subscribers.delete(chartId);
    }

    this.emit('chart-unsubscribed', chartId, dataSourceId);
  }

  public getChartSubscriptions(chartId: string): string[] {
    const subscriptions = this.subscribers.get(chartId);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  public startAutoUpdate(dataSourceId: string, interval: number): void {
    this.stopAutoUpdate(dataSourceId);

    const intervalId = timer.setInterval(async () => {
      try {
        await this.refreshDataSource(dataSourceId);
      } catch (error) {
        (globalThis as any).console?.error(`Auto-update failed for data source ${dataSourceId}:`, error);
      }
    }, interval);

    this.updateIntervals.set(dataSourceId, intervalId);
  }

  public stopAutoUpdate(dataSourceId: string): void {
    const intervalId = this.updateIntervals.get(dataSourceId);
    if (intervalId) {
      timer.clearInterval(intervalId);
      this.updateIntervals.delete(dataSourceId);
    }
  }

  public async refreshDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource || !dataSource.isConnected) return;

    try {
      const dataset = await dataSource.getData();
      this.handleDataUpdate(dataSource, dataset);
    } catch (error) {
      this.emit('data-source-error', id, error);
      throw error;
    }
  }

  public async refreshAllDataSources(): Promise<void> {
    const promises = Array.from(this.dataSources.keys()).map(id =>
      this.refreshDataSource(id).catch(error => {
        (globalThis as any).console?.error(`Failed to refresh data source ${id}:`, error);
      })
    );

    await Promise.all(promises);
  }

  public getCachedData(id: string): DataSet | null {
    return this.dataCache.get(id) || null;
  }

  public clearCache(id?: string): void {
    if (id) {
      this.dataCache.delete(id);
    } else {
      this.dataCache.clear();
    }
  }

  public getDataSourceStatus(id: string): {
    connected: boolean;
    lastUpdate: Date | null;
    cacheSize: number;
    hasSubscribers: boolean;
  } | null {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return null;

    const cachedData = this.dataCache.get(id);
    const hasSubscribers = Array.from(this.subscribers.values()).some(set => set.has(id));

    return {
      connected: dataSource.isConnected,
      lastUpdate: dataSource.lastUpdate,
      cacheSize: cachedData ? this.calculateDataSize(cachedData) : 0,
      hasSubscribers
    };
  }

  public getMetrics(): {
    totalDataSources: number;
    connectedDataSources: number;
    totalSubscriptions: number;
    cacheSize: number;
  } {
    const totalDataSources = this.dataSources.size;
    const connectedDataSources = Array.from(this.dataSources.values())
      .filter(ds => ds.isConnected).length;

    const totalSubscriptions = Array.from(this.subscribers.values())
      .reduce((sum, set) => sum + set.size, 0);

    const cacheSize = Array.from(this.dataCache.values())
      .reduce((sum, dataset) => sum + this.calculateDataSize(dataset), 0);

    return {
      totalDataSources,
      connectedDataSources,
      totalSubscriptions,
      cacheSize
    };
  }

  private handleDataUpdate(dataSource: DataSource, dataset: DataSet): void {
    // Update cache
    this.dataCache.set(dataSource.id, dataset);

    // Notify subscribers
    this.notifySubscribers(dataSource.id, dataset);

    // Emit global event
    this.emit('data-updated', dataSource.id, dataset);
  }

  private notifySubscribers(dataSourceId: string, dataset: DataSet): void {
    // Find all charts subscribed to this data source
    for (const [chartId, dataSourceIds] of this.subscribers.entries()) {
      if (dataSourceIds.has(dataSourceId)) {
        this.emit('chart-data-updated', chartId, dataSourceId, dataset);
      }
    }
  }

  private calculateDataSize(dataset: DataSet): number {
    return dataset.series.reduce((sum, series) => sum + series.data.length, 0);
  }

  public destroy(): void {
    // Stop all auto-updates
    for (const dataSourceId of this.updateIntervals.keys()) {
      this.stopAutoUpdate(dataSourceId);
    }

    // Disconnect all data sources
    const disconnectPromises = Array.from(this.dataSources.values()).map(ds =>
      ds.disconnect().catch(error => {
        (globalThis as any).console?.error(`Error disconnecting data source ${ds.id}:`, error);
      })
    );

    Promise.all(disconnectPromises).then(() => {
      // Clear all collections
      this.dataSources.clear();
      this.dataCache.clear();
      this.updateIntervals.clear();
      this.subscribers.clear();

      // Remove all listeners
      this.removeAllListeners();
    });
  }
}