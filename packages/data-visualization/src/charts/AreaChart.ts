/**
 * Area Chart implementation for Steam Simulation Toolkit
 */

import { BaseChart } from './ChartFactory';
import { ChartConfig, DataPoint, DataSeries, Point2D } from '../core/types';
import { EventEmitter } from '../utils/EventEmitter';

export class AreaChart extends BaseChart {
  private areas: Map<string, Point2D[]> = new Map();
  private layout: {
    plotArea: { x: number; y: number; width: number; height: number };
    xScale: (value: number) => number;
    yScale: (value: number) => number;
    baselineY: number;
  } | null = null;

  public render(context: any): void {
    if (!this.validateData() || !context) return;

    this.calculateLayout();
    this.renderBackground(context);
    this.renderGrid(context);
    this.renderAxes(context);
    this.renderAreas(context);
    this.renderLines(context);
    this.renderPoints(context);
    this.renderLegend(context);

    this.markClean();
  }

  public calculateLayout(): void {
    const margins = this.config.margins || { top: 20, right: 20, bottom: 40, left: 60 };

    const plotArea = {
      x: margins.left,
      y: margins.top,
      width: this.config.width - margins.left - margins.right,
      height: this.config.height - margins.top - margins.bottom
    };

    const bounds = this.getDataBounds();

    const xScale = (value: number) => {
      return plotArea.x + ((value - bounds.minX) / (bounds.maxX - bounds.minX)) * plotArea.width;
    };

    const yScale = (value: number) => {
      return plotArea.y + plotArea.height - ((value - bounds.minY) / (bounds.maxY - bounds.minY)) * plotArea.height;
    };

    const baselineY = yScale(Math.max(0, bounds.minY));

    this.layout = { plotArea, xScale, yScale, baselineY };

    // Calculate area paths for each series
    this.areas.clear();
    const visibleSeries = this.getVisibleSeries();

    // For stacked areas, we need to calculate cumulative values
    const stackedData = this.calculateStackedData(visibleSeries);

    visibleSeries.forEach((series, seriesIndex) => {
      const seriesPoints: Point2D[] = [];

      // Add points for the area path
      series.data.forEach((point, pointIndex) => {
        const xValue = this.getXValue(point);
        const baseValue = stackedData[pointIndex]?.[seriesIndex]?.base || 0;
        const topValue = (stackedData[pointIndex]?.[seriesIndex]?.base || 0) + point.value;

        // Top edge of area
        seriesPoints.push({
          x: xScale(xValue),
          y: yScale(topValue)
        });
      });

      // Add points for bottom edge (in reverse order)
      for (let i = series.data.length - 1; i >= 0; i--) {
        const point = series.data[i];
        const xValue = this.getXValue(point);
        const baseValue = stackedData[i]?.[seriesIndex]?.base || 0;

        seriesPoints.push({
          x: xScale(xValue),
          y: yScale(baseValue)
        });
      }

      this.areas.set(series.id, seriesPoints);
    });
  }

  public getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    if (!this.dataset) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    const visibleSeries = this.getVisibleSeries();
    let minX = Infinity, maxX = -Infinity, minY = 0, maxY = -Infinity;

    // Calculate stacked bounds
    const stackedData = this.calculateStackedData(visibleSeries);

    stackedData.forEach((pointStack, pointIndex) => {
      const totalValue = pointStack.reduce((sum, stack) => sum + stack.value, 0);
      maxY = Math.max(maxY, totalValue);

      // Get X value from first series
      if (visibleSeries.length > 0 && visibleSeries[0].data[pointIndex]) {
        const x = this.getXValue(visibleSeries[0].data[pointIndex]);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    });

    // Add some padding
    const xPadding = (maxX - minX) * 0.05;
    const yPadding = (maxY - minY) * 0.1;

    return {
      minX: minX - xPadding,
      maxX: maxX + xPadding,
      minY: minY,
      maxY: maxY + yPadding
    };
  }

  private calculateStackedData(series: DataSeries[]): Array<Array<{ value: number; base: number }>> {
    if (series.length === 0) return [];

    const maxLength = Math.max(...series.map(s => s.data.length));
    const stackedData: Array<Array<{ value: number; base: number }>> = [];

    for (let i = 0; i < maxLength; i++) {
      const pointStack: Array<{ value: number; base: number }> = [];
      let cumulativeBase = 0;

      series.forEach(s => {
        const point = s.data[i];
        const value = point ? Math.max(0, point.value) : 0; // Only positive values for stacking

        pointStack.push({
          value,
          base: cumulativeBase
        });

        cumulativeBase += value;
      });

      stackedData.push(pointStack);
    }

    return stackedData;
  }

  private getXValue(point: DataPoint): number {
    if (point.timestamp) {
      return point.timestamp.getTime();
    }
    return point.metadata?.index || 0;
  }

  private renderBackground(context: any): void {
    if (!context.fillRect) return;

    context.fillStyle = this.config.backgroundColor
      ? `rgba(${this.config.backgroundColor.r}, ${this.config.backgroundColor.g}, ${this.config.backgroundColor.b}, ${this.config.backgroundColor.a || 1})`
      : '#ffffff';

    context.fillRect(0, 0, this.config.width, this.config.height);
  }

  private renderGrid(context: any): void {
    if (!context.strokeStyle || !this.layout) return;

    const { plotArea } = this.layout;

    context.strokeStyle = '#f0f0f0';
    context.lineWidth = 1;
    context.setLineDash([2, 2]);

    // Vertical grid lines
    const verticalLines = 10;
    for (let i = 0; i <= verticalLines; i++) {
      const x = plotArea.x + (i / verticalLines) * plotArea.width;
      context.beginPath();
      context.moveTo(x, plotArea.y);
      context.lineTo(x, plotArea.y + plotArea.height);
      context.stroke();
    }

    // Horizontal grid lines
    const horizontalLines = 6;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = plotArea.y + (i / horizontalLines) * plotArea.height;
      context.beginPath();
      context.moveTo(plotArea.x, y);
      context.lineTo(plotArea.x + plotArea.width, y);
      context.stroke();
    }

    context.setLineDash([]);
  }

  private renderAxes(context: any): void {
    if (!context.strokeStyle || !this.layout) return;

    const { plotArea } = this.layout;

    context.strokeStyle = '#333333';
    context.lineWidth = 2;

    // X-axis
    context.beginPath();
    context.moveTo(plotArea.x, plotArea.y + plotArea.height);
    context.lineTo(plotArea.x + plotArea.width, plotArea.y + plotArea.height);
    context.stroke();

    // Y-axis
    context.beginPath();
    context.moveTo(plotArea.x, plotArea.y);
    context.lineTo(plotArea.x, plotArea.y + plotArea.height);
    context.stroke();

    this.renderAxisLabels(context);
  }

  private renderAxisLabels(context: any): void {
    if (!context.fillText || !this.layout) return;

    const { plotArea } = this.layout;
    const bounds = this.getDataBounds();

    context.fillStyle = '#666666';
    context.font = '12px sans-serif';
    context.textAlign = 'center';

    // X-axis labels
    const xLabels = 5;
    for (let i = 0; i <= xLabels; i++) {
      const value = bounds.minX + (i / xLabels) * (bounds.maxX - bounds.minX);
      const x = plotArea.x + (i / xLabels) * plotArea.width;
      const y = plotArea.y + plotArea.height + 20;

      context.fillText(this.formatXValue(value), x, y);
    }

    // Y-axis labels
    context.textAlign = 'right';
    const yLabels = 6;
    for (let i = 0; i <= yLabels; i++) {
      const value = bounds.minY + (i / yLabels) * (bounds.maxY - bounds.minY);
      const x = plotArea.x - 10;
      const y = plotArea.y + plotArea.height - (i / yLabels) * plotArea.height + 4;

      context.fillText(this.formatYValue(value), x, y);
    }
  }

  private formatXValue(value: number): string {
    if (value > 1000000000000) {
      return new Date(value).toLocaleDateString();
    }
    return value.toFixed(1);
  }

  private formatYValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(1);
  }

  private renderAreas(context: any): void {
    if (!context.fill || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();

    // Render areas from bottom to top for proper stacking
    visibleSeries.forEach((series, seriesIndex) => {
      const areaPoints = this.areas.get(series.id);
      if (!areaPoints || areaPoints.length < 3) return;

      const color = series.color || this.getDefaultColor(seriesIndex);

      // Create gradient fill
      const gradient = context.createLinearGradient(
        0, this.layout?.plotArea.y || 0,
        0, (this.layout?.plotArea.y || 0) + (this.layout?.plotArea.height || 0)
      );
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);

      context.fillStyle = gradient;

      // Draw area path
      context.beginPath();
      context.moveTo(areaPoints[0].x, areaPoints[0].y);

      for (let i = 1; i < areaPoints.length; i++) {
        context.lineTo(areaPoints[i].x, areaPoints[i].y);
      }

      context.closePath();
      context.fill();
    });
  }

  private renderLines(context: any): void {
    if (!context.stroke || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();
    const stackedData = this.calculateStackedData(visibleSeries);

    visibleSeries.forEach((series, seriesIndex) => {
      const color = series.color || this.getDefaultColor(seriesIndex);
      context.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      context.beginPath();
      let firstPoint = true;

      series.data.forEach((point, pointIndex) => {
        const xValue = this.getXValue(point);
        const baseValue = stackedData[pointIndex]?.[seriesIndex]?.base || 0;
        const topValue = baseValue + point.value;

        const x = this.layout!.xScale(xValue);
        const y = this.layout!.yScale(topValue);

        if (firstPoint) {
          context.moveTo(x, y);
          firstPoint = false;
        } else {
          context.lineTo(x, y);
        }
      });

      context.stroke();
    });
  }

  private renderPoints(context: any): void {
    if (!context.arc || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();
    const stackedData = this.calculateStackedData(visibleSeries);

    visibleSeries.forEach((series, seriesIndex) => {
      const color = series.color || this.getDefaultColor(seriesIndex);
      context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;

      series.data.forEach((point, pointIndex) => {
        const xValue = this.getXValue(point);
        const baseValue = stackedData[pointIndex]?.[seriesIndex]?.base || 0;
        const topValue = baseValue + point.value;

        const x = this.layout!.xScale(xValue);
        const y = this.layout!.yScale(topValue);

        context.beginPath();
        context.arc(x, y, 3, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
      });
    });
  }

  private renderLegend(context: any): void {
    if (!context.fillText || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();
    if (visibleSeries.length <= 1) return;

    const legendY = 20;
    const legendItemWidth = 100;
    let legendX = this.config.width - (visibleSeries.length * legendItemWidth) - 20;

    context.font = '12px sans-serif';
    context.textAlign = 'left';

    visibleSeries.forEach((series, index) => {
      const color = series.color || this.getDefaultColor(index);
      const x = legendX + index * legendItemWidth;

      // Draw color box with gradient
      const gradient = context.createLinearGradient(x, legendY - 6, x, legendY + 6);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);

      context.fillStyle = gradient;
      context.fillRect(x, legendY - 6, 12, 12);

      // Draw border
      context.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      context.lineWidth = 1;
      context.strokeRect(x, legendY - 6, 12, 12);

      // Draw text
      context.fillStyle = '#333333';
      context.fillText(series.name, x + 18, legendY + 4);
    });
  }

  private getDefaultColor(index: number) {
    const colors = [
      { r: 66, g: 133, b: 244 },   // Blue
      { r: 34, g: 197, b: 94 },    // Green
      { r: 251, g: 191, b: 36 },   // Yellow
      { r: 239, g: 68, b: 68 },    // Red
      { r: 168, g: 85, b: 247 },   // Purple
      { r: 6, g: 182, b: 212 },    // Cyan
      { r: 245, g: 101, b: 101 },  // Light Red
      { r: 132, g: 204, b: 22 }    // Lime
    ];
    return colors[index % colors.length];
  }
}