/**
 * Chart Factory for creating different types of charts
 */

import { ChartType, ChartConfig, DataSet } from '../core/types';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ScatterChart } from './ScatterChart';
import { AreaChart } from './AreaChart';
import { HeatmapChart } from './HeatmapChart';

export class ChartFactory {
  public static createChart(type: ChartType, id: string, config: ChartConfig): BaseChart {
    switch (type) {
      case ChartType.LINE:
        return new LineChart(id, config);
      case ChartType.BAR:
        return new BarChart(id, config);
      case ChartType.PIE:
        return new PieChart(id, config);
      case ChartType.SCATTER:
        return new ScatterChart(id, config);
      case ChartType.AREA:
        return new AreaChart(id, config);
      case ChartType.HEATMAP:
        return new HeatmapChart(id, config);
      default:
        throw new Error(`Unsupported chart type: ${type}`);
    }
  }

  public static getSupportedTypes(): ChartType[] {
    return [
      ChartType.LINE,
      ChartType.BAR,
      ChartType.PIE,
      ChartType.SCATTER,
      ChartType.AREA,
      ChartType.HEATMAP
    ];
  }

  public static isTypeSupported(type: ChartType): boolean {
    return this.getSupportedTypes().includes(type);
  }
}

export abstract class BaseChart {
  public readonly id: string;
  protected config: ChartConfig;
  protected dataset?: DataSet;
  protected isDirty = true;

  constructor(id: string, config: ChartConfig) {
    this.id = id;
    this.config = config;
  }

  public abstract render(context: any): void;
  public abstract calculateLayout(): void;
  public abstract getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number };

  public setConfig(config: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...config };
    this.isDirty = true;
  }

  public getConfig(): ChartConfig {
    return { ...this.config };
  }

  public setDataSet(dataset: DataSet): void {
    this.dataset = dataset;
    this.isDirty = true;
  }

  public getDataSet(): DataSet | undefined {
    return this.dataset;
  }

  public needsUpdate(): boolean {
    return this.isDirty;
  }

  public markClean(): void {
    this.isDirty = false;
  }

  protected validateData(): boolean {
    return this.dataset !== undefined && this.dataset.series.length > 0;
  }

  protected getVisibleSeries() {
    if (!this.dataset) return [];
    return this.dataset.series.filter(series => series.visible !== false);
  }
}