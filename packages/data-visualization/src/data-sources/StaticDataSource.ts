/**
 * Static Data Source for Steam Simulation Toolkit
 * Provides static data sets for charts
 */

import { EventEmitter } from '../utils/EventEmitter';
import { DataSource } from './DataSourceManager';
import { DataSet, DataSourceConfig, DataSeries, DataPoint } from '../core/types';

export class StaticDataSource extends EventEmitter implements DataSource {
  public readonly id: string;
  public readonly config: DataSourceConfig;
  public readonly isConnected: boolean = true;
  public readonly lastUpdate: Date | null = null;

  private dataset: DataSet;

  constructor(id: string, config: DataSourceConfig, dataset: DataSet) {
    super();
    this.id = id;
    this.config = { ...config };
    this.dataset = this.processDataset(dataset);
    (this as any).lastUpdate = new Date();
  }

  public async connect(): Promise<void> {
    // Static data source is always connected
    this.emit('connection-changed', this, true);
    return Promise.resolve();
  }

  public async disconnect(): Promise<void> {
    // Static data source doesn't need disconnection
    this.emit('connection-changed', this, false);
    return Promise.resolve();
  }

  public async getData(): Promise<DataSet> {
    return Promise.resolve(this.dataset);
  }

  public updateConfig(config: Partial<DataSourceConfig>): void {
    Object.assign(this.config, config);
  }

  public setData(dataset: DataSet): void {
    this.dataset = this.processDataset(dataset);
    (this as any).lastUpdate = new Date();
    this.emit('data-updated', this, this.dataset);
  }

  public addSeries(series: DataSeries): void {
    const existingIndex = this.dataset.series.findIndex(s => s.id === series.id);

    if (existingIndex >= 0) {
      this.dataset.series[existingIndex] = series;
    } else {
      this.dataset.series.push(series);
    }

    (this as any).lastUpdate = new Date();
    this.emit('data-updated', this, this.dataset);
  }

  public removeSeries(seriesId: string): void {
    const index = this.dataset.series.findIndex(s => s.id === seriesId);
    if (index >= 0) {
      this.dataset.series.splice(index, 1);
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public updateSeries(seriesId: string, data: DataPoint[]): void {
    const series = this.dataset.series.find(s => s.id === seriesId);
    if (series) {
      series.data = [...data];
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public addDataPoint(seriesId: string, dataPoint: DataPoint): void {
    const series = this.dataset.series.find(s => s.id === seriesId);
    if (series) {
      series.data.push(dataPoint);
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public addDataPoints(seriesId: string, dataPoints: DataPoint[]): void {
    const series = this.dataset.series.find(s => s.id === seriesId);
    if (series) {
      series.data.push(...dataPoints);
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public clearSeries(seriesId: string): void {
    const series = this.dataset.series.find(s => s.id === seriesId);
    if (series) {
      series.data = [];
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public filterData(predicate: (point: DataPoint, series: DataSeries) => boolean): void {
    let changed = false;

    this.dataset.series.forEach(series => {
      const originalLength = series.data.length;
      series.data = series.data.filter(point => predicate(point, series));
      if (series.data.length !== originalLength) {
        changed = true;
      }
    });

    if (changed) {
      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public sortSeries(seriesId: string, compareFn?: (a: DataPoint, b: DataPoint) => number): void {
    const series = this.dataset.series.find(s => s.id === seriesId);
    if (series) {
      if (compareFn) {
        series.data.sort(compareFn);
      } else {
        // Default sort by timestamp, then by value
        series.data.sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return a.timestamp.getTime() - b.timestamp.getTime();
          }
          return a.value - b.value;
        });
      }

      (this as any).lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);
    }
  }

  public getSeriesCount(): number {
    return this.dataset.series.length;
  }

  public getDataPointCount(): number {
    return this.dataset.series.reduce((total, series) => total + series.data.length, 0);
  }

  public getSeriesById(seriesId: string): DataSeries | undefined {
    return this.dataset.series.find(s => s.id === seriesId);
  }

  public getTimeRange(): { start: Date; end: Date } | null {
    let minTime: Date | null = null;
    let maxTime: Date | null = null;

    this.dataset.series.forEach(series => {
      series.data.forEach(point => {
        if (point.timestamp) {
          if (!minTime || point.timestamp < minTime) {
            minTime = point.timestamp;
          }
          if (!maxTime || point.timestamp > maxTime) {
            maxTime = point.timestamp;
          }
        }
      });
    });

    return minTime && maxTime ? { start: minTime, end: maxTime } : null;
  }

  public getValueRange(): { min: number; max: number } | null {
    let min: number | null = null;
    let max: number | null = null;

    this.dataset.series.forEach(series => {
      series.data.forEach(point => {
        if (min === null || point.value < min) {
          min = point.value;
        }
        if (max === null || point.value > max) {
          max = point.value;
        }
      });
    });

    return min !== null && max !== null ? { min, max } : null;
  }

  public clone(): StaticDataSource {
    const clonedDataset: DataSet = {
      ...this.dataset,
      series: this.dataset.series.map(series => ({
        ...series,
        data: series.data.map(point => ({ ...point }))
      }))
    };

    return new StaticDataSource(this.id + '_clone', this.config, clonedDataset);
  }

  private processDataset(dataset: DataSet): DataSet {
    // Apply any transformations specified in config
    const processed: DataSet = {
      ...dataset,
      series: dataset.series.map(series => this.processSeries(series))
    };

    return processed;
  }

  private processSeries(series: DataSeries): DataSeries {
    let processedData = [...series.data];

    // Apply transformations if specified in config
    if (this.config.transform?.operations) {
      this.config.transform.operations.forEach(operation => {
        processedData = this.applyTransformation(processedData, operation);
      });
    }

    return {
      ...series,
      data: processedData
    };
  }

  private applyTransformation(data: DataPoint[], operation: any): DataPoint[] {
    switch (operation.type) {
      case 'filter':
        return this.applyFilter(data, operation.config);
      case 'sort':
        return this.applySort(data, operation.config);
      case 'map':
        return this.applyMap(data, operation.config);
      case 'aggregate':
        return this.applyAggregate(data, operation.config);
      default:
        return data;
    }
  }

  private applyFilter(data: DataPoint[], config: any): DataPoint[] {
    if (config.minValue !== undefined) {
      data = data.filter(point => point.value >= config.minValue);
    }
    if (config.maxValue !== undefined) {
      data = data.filter(point => point.value <= config.maxValue);
    }
    if (config.startTime !== undefined) {
      const startTime = new Date(config.startTime);
      data = data.filter(point => !point.timestamp || point.timestamp >= startTime);
    }
    if (config.endTime !== undefined) {
      const endTime = new Date(config.endTime);
      data = data.filter(point => !point.timestamp || point.timestamp <= endTime);
    }
    return data;
  }

  private applySort(data: DataPoint[], config: any): DataPoint[] {
    const sorted = [...data];
    if (config.field === 'value') {
      sorted.sort((a, b) => config.direction === 'desc' ? b.value - a.value : a.value - b.value);
    } else if (config.field === 'timestamp') {
      sorted.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        const diff = a.timestamp.getTime() - b.timestamp.getTime();
        return config.direction === 'desc' ? -diff : diff;
      });
    }
    return sorted;
  }

  private applyMap(data: DataPoint[], config: any): DataPoint[] {
    return data.map(point => {
      const mapped = { ...point };
      if (config.scaleValue) {
        mapped.value = point.value * config.scaleValue;
      }
      if (config.offsetValue) {
        mapped.value = point.value + config.offsetValue;
      }
      return mapped;
    });
  }

  private applyAggregate(data: DataPoint[], config: any): DataPoint[] {
    if (config.groupBy === 'time' && config.interval) {
      return this.aggregateByTime(data, config.interval, config.aggregation || 'avg');
    }
    return data;
  }

  private aggregateByTime(data: DataPoint[], intervalMs: number, aggregation: string): DataPoint[] {
    const groups = new Map<number, DataPoint[]>();

    data.forEach(point => {
      if (point.timestamp) {
        const bucket = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
        if (!groups.has(bucket)) {
          groups.set(bucket, []);
        }
        groups.get(bucket)!.push(point);
      }
    });

    const aggregated: DataPoint[] = [];
    groups.forEach((points, bucket) => {
      let value: number;

      switch (aggregation) {
        case 'sum':
          value = points.reduce((sum, p) => sum + p.value, 0);
          break;
        case 'max':
          value = Math.max(...points.map(p => p.value));
          break;
        case 'min':
          value = Math.min(...points.map(p => p.value));
          break;
        case 'count':
          value = points.length;
          break;
        case 'avg':
        default:
          value = points.reduce((sum, p) => sum + p.value, 0) / points.length;
          break;
      }

      aggregated.push({
        id: `agg_${bucket}`,
        value,
        timestamp: new Date(bucket),
        metadata: {
          aggregation,
          pointCount: points.length
        }
      });
    });

    return aggregated.sort((a, b) =>
      (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0)
    );
  }
}