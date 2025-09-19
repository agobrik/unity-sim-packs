/**
 * Scatter Chart implementation for Steam Simulation Toolkit
 */

import { BaseChart } from './ChartFactory';
import { ChartConfig, DataPoint, DataSeries, Point2D } from '../core/types';
import { EventEmitter } from '../utils/EventEmitter';

interface ScatterPoint {
  x: number;
  y: number;
  size: number;
  color: { r: number; g: number; b: number; a?: number };
  originalData: DataPoint;
  seriesId: string;
}

export class ScatterChart extends BaseChart {
  private points: ScatterPoint[] = [];
  private layout: {
    plotArea: { x: number; y: number; width: number; height: number };
    xScale: (value: number) => number;
    yScale: (value: number) => number;
  } | null = null;

  public render(context: any): void {
    if (!this.validateData() || !context) return;

    this.calculateLayout();
    this.renderBackground(context);
    this.renderGrid(context);
    this.renderAxes(context);
    this.renderPoints(context);
    this.renderTrendLine(context);
    this.renderLegend(context);

    this.markClean();
  }

  public calculateLayout(): void {
    const margins = this.config.margins || { top: 20, right: 20, bottom: 60, left: 60 };

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

    this.layout = { plotArea, xScale, yScale };

    // Calculate points for each series
    this.points = [];
    const visibleSeries = this.getVisibleSeries();

    visibleSeries.forEach((series, seriesIndex) => {
      const color = series.color || this.getDefaultColor(seriesIndex);

      series.data.forEach(point => {
        const xValue = this.getXValue(point);
        const yValue = point.value;
        const size = this.getPointSize(point);

        this.points.push({
          x: xScale(xValue),
          y: yScale(yValue),
          size,
          color,
          originalData: point,
          seriesId: series.id
        });
      });
    });
  }

  public getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    if (!this.dataset) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    const visibleSeries = this.getVisibleSeries();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    visibleSeries.forEach(series => {
      series.data.forEach(point => {
        const x = this.getXValue(point);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, point.value);
        maxY = Math.max(maxY, point.value);
      });
    });

    // Add some padding
    const xPadding = (maxX - minX) * 0.05;
    const yPadding = (maxY - minY) * 0.1;

    return {
      minX: minX - xPadding,
      maxX: maxX + xPadding,
      minY: minY - yPadding,
      maxY: maxY + yPadding
    };
  }

  private getXValue(point: DataPoint): number {
    // Check for X coordinate in metadata
    if (point.metadata?.x !== undefined) {
      return point.metadata.x;
    }
    // Use timestamp if available
    if (point.timestamp) {
      return point.timestamp.getTime();
    }
    // Use index-based value
    return point.metadata?.index || 0;
  }

  private getPointSize(point: DataPoint): number {
    // Check for size in metadata, default to 4
    const baseSize = point.metadata?.size || 4;
    // Scale based on value magnitude if desired
    const valueScale = Math.abs(point.value) > 0 ? Math.log10(Math.abs(point.value) + 1) : 1;
    return Math.max(2, Math.min(12, baseSize * valueScale * 0.5));
  }

  private renderBackground(context: any): void {
    if (!context.fillRect) return;

    context.fillStyle = this.config.backgroundColor
      ? `rgba(${this.config.backgroundColor.r}, ${this.config.backgroundColor.g}, ${this.config.backgroundColor.b}, ${(this.config.backgroundColor as any).a || 1})`
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
    const horizontalLines = 8;
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
    const xLabels = 6;
    for (let i = 0; i <= xLabels; i++) {
      const value = bounds.minX + (i / xLabels) * (bounds.maxX - bounds.minX);
      const x = plotArea.x + (i / xLabels) * plotArea.width;
      const y = plotArea.y + plotArea.height + 20;

      context.fillText(this.formatXValue(value), x, y);
    }

    // Y-axis labels
    context.textAlign = 'right';
    const yLabels = 8;
    for (let i = 0; i <= yLabels; i++) {
      const value = bounds.minY + (i / yLabels) * (bounds.maxY - bounds.minY);
      const x = plotArea.x - 10;
      const y = plotArea.y + plotArea.height - (i / yLabels) * plotArea.height + 4;

      context.fillText(this.formatYValue(value), x, y);
    }

    // Axis titles
    context.fillStyle = '#333333';
    context.font = 'bold 14px sans-serif';
    context.textAlign = 'center';

    // X-axis title
    const xTitle = this.config.title || 'X Values';
    context.fillText(xTitle, plotArea.x + plotArea.width / 2, plotArea.y + plotArea.height + 50);

    // Y-axis title (rotated)
    context.save();
    context.translate(plotArea.x - 40, plotArea.y + plotArea.height / 2);
    context.rotate(-Math.PI / 2);
    const yTitle = 'Y Values';
    context.fillText(yTitle, 0, 0);
    context.restore();
  }

  private formatXValue(value: number): string {
    // Check if this looks like a timestamp
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

  private renderPoints(context: any): void {
    if (!context.arc || !this.layout) return;

    // Group points by series for better rendering
    const pointsBySeries = new Map<string, ScatterPoint[]>();
    this.points.forEach(point => {
      if (!pointsBySeries.has(point.seriesId)) {
        pointsBySeries.set(point.seriesId, []);
      }
      pointsBySeries.get(point.seriesId)!.push(point);
    });

    // Render points with transparency for overlapping
    pointsBySeries.forEach(seriesPoints => {
      seriesPoints.forEach(point => {
        const alpha = ((point.color as any).a || 1) * 0.7; // Add some transparency

        // Draw point shadow
        context.fillStyle = `rgba(0, 0, 0, 0.2)`;
        context.beginPath();
        context.arc(point.x + 1, point.y + 1, point.size, 0, 2 * Math.PI);
        context.fill();

        // Draw main point
        context.fillStyle = `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${alpha})`;
        context.beginPath();
        context.arc(point.x, point.y, point.size, 0, 2 * Math.PI);
        context.fill();

        // Draw point border
        context.strokeStyle = `rgba(${Math.max(0, point.color.r - 40)}, ${Math.max(0, point.color.g - 40)}, ${Math.max(0, point.color.b - 40)}, ${(point.color as any).a || 1})`;
        context.lineWidth = 1;
        context.stroke();
      });
    });
  }

  private renderTrendLine(context: any): void {
    if (!context.stroke || !this.layout || this.points.length < 2) return;

    // Simple linear regression for trend line
    const { plotArea } = this.layout;
    const bounds = this.getDataBounds();

    // Convert screen coordinates back to data coordinates for calculation
    const dataPoints = this.points.map(p => ({
      x: bounds.minX + ((p.x - plotArea.x) / plotArea.width) * (bounds.maxX - bounds.minX),
      y: bounds.minY + ((plotArea.y + plotArea.height - p.y) / plotArea.height) * (bounds.maxY - bounds.minY)
    }));

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    if (!isFinite(slope) || !isFinite(intercept)) return;

    // Draw trend line
    const startX = plotArea.x;
    const endX = plotArea.x + plotArea.width;
    const startDataX = bounds.minX;
    const endDataX = bounds.maxX;

    const startY = this.layout.yScale(slope * startDataX + intercept);
    const endY = this.layout.yScale(slope * endDataX + intercept);

    context.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.setLineDash([]);
  }

  private renderLegend(context: any): void {
    if (!context.fillText || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();
    if (visibleSeries.length <= 1) return;

    const legendY = 20;
    const legendItemWidth = 120;
    let legendX = this.config.width - (visibleSeries.length * legendItemWidth) - 20;

    context.font = '12px sans-serif';
    context.textAlign = 'left';

    visibleSeries.forEach((series, index) => {
      const color = series.color || this.getDefaultColor(index);
      const x = legendX + index * legendItemWidth;

      // Draw color circle
      context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color as any).a || 1})`;
      context.beginPath();
      context.arc(x + 6, legendY, 6, 0, 2 * Math.PI);
      context.fill();

      // Draw border
      context.strokeStyle = '#333333';
      context.lineWidth = 1;
      context.stroke();

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