/**
 * Data Processing Utilities for Steam Simulation Toolkit
 * Utilities for data transformation, cleaning, and analysis
 */

import { DataSet, DataSeries, DataPoint } from '../core/types';
import { MathUtils } from './MathUtils';

export interface DataSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q1: number;
  q3: number;
  outliers: number[];
}

export interface GroupedData {
  [key: string]: DataPoint[];
}

export class DataUtils {
  // Data validation and cleaning
  public static validateDataPoint(point: any): point is DataPoint {
    return point &&
           typeof point === 'object' &&
           typeof point.value === 'number' &&
           !isNaN(point.value) &&
           isFinite(point.value);
  }

  public static validateDataSeries(series: any): series is DataSeries {
    return series &&
           typeof series === 'object' &&
           typeof series.id === 'string' &&
           typeof series.name === 'string' &&
           Array.isArray(series.data) &&
           series.data.every((point: any) => DataUtils.validateDataPoint(point));
  }

  public static validateDataSet(dataset: any): dataset is DataSet {
    return dataset &&
           typeof dataset === 'object' &&
           typeof dataset.id === 'string' &&
           typeof dataset.name === 'string' &&
           Array.isArray(dataset.series) &&
           dataset.series.every((series: any) => DataUtils.validateDataSeries(series));
  }

  public static cleanDataPoint(point: any): DataPoint | null {
    if (!point || typeof point.value !== 'number') return null;

    // Handle invalid numbers
    if (isNaN(point.value) || !isFinite(point.value)) return null;

    const cleaned: DataPoint = {
      id: point.id || `point_${Date.now()}_${Math.random()}`,
      value: point.value,
      label: point.label,
      timestamp: point.timestamp ? new Date(point.timestamp) : undefined,
      metadata: point.metadata
    };

    return cleaned;
  }

  public static cleanDataSeries(series: DataSeries): DataSeries {
    const cleanedData = series.data
      .map(point => DataUtils.cleanDataPoint(point))
      .filter(point => point !== null) as DataPoint[];

    return {
      ...series,
      data: cleanedData
    };
  }

  public static cleanDataSet(dataset: DataSet): DataSet {
    return {
      ...dataset,
      series: dataset.series.map(series => DataUtils.cleanDataSeries(series))
    };
  }

  // Data transformation
  public static mapValues(series: DataSeries, mapFn: (value: number, index: number) => number): DataSeries {
    return {
      ...series,
      data: series.data.map((point, index) => ({
        ...point,
        value: mapFn(point.value, index)
      }))
    };
  }

  public static scaleValues(series: DataSeries, factor: number): DataSeries {
    return DataUtils.mapValues(series, value => value * factor);
  }

  public static offsetValues(series: DataSeries, offset: number): DataSeries {
    return DataUtils.mapValues(series, value => value + offset);
  }

  public static normalizeValues(series: DataSeries, method: 'minmax' | 'zscore' = 'minmax'): DataSeries {
    const values = series.data.map(point => point.value);

    if (method === 'minmax') {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      if (range === 0) return series;

      return DataUtils.mapValues(series, value => (value - min) / range);
    } else {
      const mean = MathUtils.mean(values);
      const std = MathUtils.standardDeviation(values);

      if (std === 0) return series;

      return DataUtils.mapValues(series, value => (value - mean) / std);
    }
  }

  public static logTransform(series: DataSeries, base: number = Math.E): DataSeries {
    const logFn = base === Math.E ? Math.log : (x: number) => Math.log(x) / Math.log(base);

    return DataUtils.mapValues(series, value => {
      if (value <= 0) return NaN;
      return logFn(value);
    });
  }

  public static powerTransform(series: DataSeries, exponent: number): DataSeries {
    return DataUtils.mapValues(series, value => Math.pow(value, exponent));
  }

  // Data filtering
  public static filterByValue(series: DataSeries, predicate: (value: number) => boolean): DataSeries {
    return {
      ...series,
      data: series.data.filter(point => predicate(point.value))
    };
  }

  public static filterByRange(series: DataSeries, min: number, max: number): DataSeries {
    return DataUtils.filterByValue(series, value => value >= min && value <= max);
  }

  public static filterByTimeRange(series: DataSeries, startTime: Date, endTime: Date): DataSeries {
    return {
      ...series,
      data: series.data.filter(point => {
        if (!point.timestamp) return true;
        return point.timestamp >= startTime && point.timestamp <= endTime;
      })
    };
  }

  public static removeOutliers(series: DataSeries, method: 'iqr' | 'zscore' = 'iqr'): DataSeries {
    const values = series.data.map(point => point.value);
    const outlierValues = new Set(MathUtils.outliers(values, method));

    return {
      ...series,
      data: series.data.filter(point => !outlierValues.has(point.value))
    };
  }

  public static removeDuplicates(series: DataSeries, keyFn?: (point: DataPoint) => string): DataSeries {
    const seen = new Set<string>();
    const filtered: DataPoint[] = [];

    for (const point of series.data) {
      const key = keyFn ? keyFn(point) : point.id || point.value.toString();
      if (!seen.has(key)) {
        seen.add(key);
        filtered.push(point);
      }
    }

    return {
      ...series,
      data: filtered
    };
  }

  // Data aggregation
  public static groupBy(series: DataSeries, keyFn: (point: DataPoint) => string): GroupedData {
    const groups: GroupedData = {};

    series.data.forEach(point => {
      const key = keyFn(point);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(point);
    });

    return groups;
  }

  public static groupByTimeInterval(
    series: DataSeries,
    intervalMs: number,
    aggregation: 'sum' | 'mean' | 'min' | 'max' | 'count' = 'mean'
  ): DataSeries {
    const groups = DataUtils.groupBy(series, point => {
      if (!point.timestamp) return '0';
      const bucket = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      return bucket.toString();
    });

    const aggregatedData: DataPoint[] = [];

    Object.entries(groups).forEach(([bucket, points]) => {
      const bucketTime = new Date(parseInt(bucket));
      const values = points.map(p => p.value);

      let aggregatedValue: number;
      switch (aggregation) {
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        case 'mean':
        default:
          aggregatedValue = MathUtils.mean(values);
          break;
      }

      aggregatedData.push({
        id: `agg_${bucket}`,
        value: aggregatedValue,
        timestamp: bucketTime,
        metadata: {
          aggregation,
          originalCount: points.length
        }
      });
    });

    // Sort by timestamp
    aggregatedData.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    return {
      ...series,
      data: aggregatedData
    };
  }

  public static aggregate(
    series: DataSeries,
    aggregation: 'sum' | 'mean' | 'min' | 'max' | 'count' | 'std'
  ): number {
    const values = series.data.map(point => point.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'mean':
        return MathUtils.mean(values);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'std':
        return MathUtils.standardDeviation(values);
      default:
        return 0;
    }
  }

  // Data analysis
  public static getSummary(series: DataSeries): DataSummary {
    const values = series.data.map(point => point.value);

    if (values.length === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        std: 0,
        q1: 0,
        q3: 0,
        outliers: []
      };
    }

    const quartiles = MathUtils.quartiles(values);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: MathUtils.mean(values),
      median: MathUtils.median(values),
      std: MathUtils.standardDeviation(values),
      q1: quartiles.q1,
      q3: quartiles.q3,
      outliers: MathUtils.outliers(values)
    };
  }

  public static getCorrelation(series1: DataSeries, series2: DataSeries): number {
    const values1 = series1.data.map(point => point.value);
    const values2 = series2.data.map(point => point.value);
    const minLength = Math.min(values1.length, values2.length);

    return MathUtils.correlation(
      values1.slice(0, minLength),
      values2.slice(0, minLength)
    );
  }

  public static getTrend(series: DataSeries): { slope: number; intercept: number; r2: number } {
    const x = series.data.map((_, index) => index);
    const y = series.data.map(point => point.value);

    return MathUtils.linearRegression(x, y);
  }

  // Data interpolation
  public static interpolateLinear(series: DataSeries, targetPoints: number): DataSeries {
    if (series.data.length < 2) return series;

    const interpolated: DataPoint[] = [];
    const step = (series.data.length - 1) / (targetPoints - 1);

    for (let i = 0; i < targetPoints; i++) {
      const index = i * step;
      const lowerIndex = Math.floor(index);
      const upperIndex = Math.ceil(index);

      if (lowerIndex === upperIndex) {
        interpolated.push({ ...series.data[lowerIndex] });
      } else {
        const t = index - lowerIndex;
        const lowerPoint = series.data[lowerIndex];
        const upperPoint = series.data[upperIndex];

        const interpolatedValue = MathUtils.lerp(lowerPoint.value, upperPoint.value, t);

        interpolated.push({
          id: `interp_${i}`,
          value: interpolatedValue,
          timestamp: lowerPoint.timestamp && upperPoint.timestamp
            ? new Date(MathUtils.lerp(
                lowerPoint.timestamp.getTime(),
                upperPoint.timestamp.getTime(),
                t
              ))
            : undefined,
          metadata: {
            interpolated: true,
            originalIndices: [lowerIndex, upperIndex],
            t
          }
        });
      }
    }

    return {
      ...series,
      data: interpolated
    };
  }

  public static fillMissingValues(
    series: DataSeries,
    method: 'forward' | 'backward' | 'linear' | 'mean' = 'linear'
  ): DataSeries {
    const data = [...series.data];

    // Find missing value indices (NaN or undefined)
    const missingIndices: number[] = [];
    data.forEach((point, index) => {
      if (isNaN(point.value) || point.value === undefined) {
        missingIndices.push(index);
      }
    });

    if (missingIndices.length === 0) return series;

    const values = data.map(point => point.value);

    missingIndices.forEach(index => {
      let fillValue: number;

      switch (method) {
        case 'forward':
          fillValue = index > 0 ? values[index - 1] : 0;
          break;

        case 'backward':
          fillValue = index < values.length - 1 ? values[index + 1] : 0;
          break;

        case 'mean':
          const validValues = values.filter(v => !isNaN(v) && v !== undefined);
          fillValue = validValues.length > 0 ? MathUtils.mean(validValues) : 0;
          break;

        case 'linear':
        default:
          // Find nearest valid values
          let prevIndex = index - 1;
          let nextIndex = index + 1;

          while (prevIndex >= 0 && (isNaN(values[prevIndex]) || values[prevIndex] === undefined)) {
            prevIndex--;
          }

          while (nextIndex < values.length && (isNaN(values[nextIndex]) || values[nextIndex] === undefined)) {
            nextIndex++;
          }

          if (prevIndex >= 0 && nextIndex < values.length) {
            const t = (index - prevIndex) / (nextIndex - prevIndex);
            fillValue = MathUtils.lerp(values[prevIndex], values[nextIndex], t);
          } else if (prevIndex >= 0) {
            fillValue = values[prevIndex];
          } else if (nextIndex < values.length) {
            fillValue = values[nextIndex];
          } else {
            fillValue = 0;
          }
          break;
      }

      data[index] = {
        ...data[index],
        value: fillValue,
        metadata: {
          ...data[index].metadata,
          filled: true,
          fillMethod: method
        }
      };
    });

    return {
      ...series,
      data
    };
  }

  // Data sampling
  public static sample(series: DataSeries, count: number, method: 'random' | 'uniform' = 'uniform'): DataSeries {
    if (count >= series.data.length) return series;

    let sampledData: DataPoint[];

    if (method === 'random') {
      const indices = Array.from({ length: series.data.length }, (_, i) => i);
      const shuffled = indices.sort(() => Math.random() - 0.5);
      sampledData = shuffled.slice(0, count).map(i => series.data[i]);
    } else {
      const step = series.data.length / count;
      sampledData = Array.from({ length: count }, (_, i) => {
        const index = Math.floor(i * step);
        return series.data[index];
      });
    }

    return {
      ...series,
      data: sampledData
    };
  }

  // Data merging
  public static mergeSeries(series1: DataSeries, series2: DataSeries, mergeStrategy: 'append' | 'interleave' | 'timestamp' = 'append'): DataSeries {
    let mergedData: DataPoint[];

    switch (mergeStrategy) {
      case 'append':
        mergedData = [...series1.data, ...series2.data];
        break;

      case 'interleave':
        mergedData = [];
        const maxLength = Math.max(series1.data.length, series2.data.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < series1.data.length) mergedData.push(series1.data[i]);
          if (i < series2.data.length) mergedData.push(series2.data[i]);
        }
        break;

      case 'timestamp':
        mergedData = [...series1.data, ...series2.data].sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });
        break;

      default:
        mergedData = [...series1.data, ...series2.data];
    }

    return {
      id: `${series1.id}_${series2.id}`,
      name: `${series1.name} + ${series2.name}`,
      data: mergedData,
      visible: series1.visible !== false || series2.visible !== false
    };
  }

  // Data export
  public static toCSV(dataset: DataSet): string {
    if (dataset.series.length === 0) return '';

    const headers = ['timestamp', 'label'];
    dataset.series.forEach(series => headers.push(series.name));

    // Get all unique timestamps/labels
    const allPoints = new Map<string, Record<string, any>>();

    dataset.series.forEach(series => {
      series.data.forEach(point => {
        const key = point.timestamp?.toISOString() || point.label || point.id || '';
        if (!allPoints.has(key)) {
          allPoints.set(key, {
            timestamp: point.timestamp?.toISOString() || '',
            label: point.label || ''
          });
        }
        allPoints.get(key)![series.name] = point.value;
      });
    });

    const rows = [headers.join(',')];

    allPoints.forEach(row => {
      const values = headers.map(header => row[header] ?? '');
      rows.push(values.join(','));
    });

    return rows.join('\n');
  }

  public static toJSON(dataset: DataSet): string {
    return JSON.stringify(dataset, null, 2);
  }

  // Utility functions
  public static isEmpty(series: DataSeries): boolean {
    return series.data.length === 0;
  }

  public static getLength(series: DataSeries): number {
    return series.data.length;
  }

  public static getTimeRange(series: DataSeries): { start: Date; end: Date } | null {
    const timestamps = series.data
      .map(point => point.timestamp)
      .filter(timestamp => timestamp !== undefined) as Date[];

    if (timestamps.length === 0) return null;

    return {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };
  }

  public static getValueRange(series: DataSeries): { min: number; max: number } {
    const values = series.data.map(point => point.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  public static clone(series: DataSeries): DataSeries {
    return {
      ...series,
      data: series.data.map(point => ({ ...point }))
    };
  }
}