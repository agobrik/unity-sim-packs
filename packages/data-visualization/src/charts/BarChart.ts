/**
 * Bar Chart implementation for Steam Simulation Toolkit
 */

import { BaseChart } from './ChartFactory';
import { ChartConfig, DataPoint, DataSeries, Point2D } from '../core/types';
import { EventEmitter } from '../utils/EventEmitter';

export class BarChart extends BaseChart {
  private bars: Map<string, { x: number; y: number; width: number; height: number }[]> = new Map();
  private layout: {
    plotArea: { x: number; y: number; width: number; height: number };
    xScale: (index: number) => number;
    yScale: (value: number) => number;
    barWidth: number;
    categorySpacing: number;
  } | null = null;

  public render(context: any): void {
    if (!this.validateData() || !context) return;

    this.calculateLayout();
    this.renderBackground(context);
    this.renderGrid(context);
    this.renderAxes(context);
    this.renderBars(context);
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
    const visibleSeries = this.getVisibleSeries();
    const maxDataPoints = Math.max(...visibleSeries.map(s => s.data.length));

    const categorySpacing = plotArea.width / maxDataPoints;
    const barWidth = categorySpacing * 0.8 / visibleSeries.length;

    const xScale = (index: number) => {
      return plotArea.x + index * categorySpacing + categorySpacing * 0.1;
    };

    const yScale = (value: number) => {
      const normalizedValue = (value - bounds.minY) / (bounds.maxY - bounds.minY);
      return plotArea.y + plotArea.height - (normalizedValue * plotArea.height);
    };

    this.layout = { plotArea, xScale, yScale, barWidth, categorySpacing };

    // Calculate bars for each series
    this.bars.clear();
    visibleSeries.forEach((series, seriesIndex) => {
      const seriesBars = series.data.map((point, pointIndex) => ({
        x: xScale(pointIndex) + seriesIndex * barWidth,
        y: yScale(Math.max(0, point.value)),
        width: barWidth,
        height: Math.abs(yScale(point.value) - yScale(0))
      }));
      this.bars.set(series.id, seriesBars);
    });
  }

  public getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    if (!this.dataset) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    const visibleSeries = this.getVisibleSeries();
    let minY = 0; // Bar charts typically start from 0
    let maxY = -Infinity;

    visibleSeries.forEach(series => {
      series.data.forEach(point => {
        minY = Math.min(minY, point.value);
        maxY = Math.max(maxY, point.value);
      });
    });

    // Add some padding to the top
    const yPadding = (maxY - minY) * 0.1;

    return {
      minX: 0,
      maxX: Math.max(...visibleSeries.map(s => s.data.length)) - 1,
      minY: minY - (minY < 0 ? yPadding : 0),
      maxY: maxY + yPadding
    };
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

    // Horizontal grid lines only (more appropriate for bar charts)
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

    const { plotArea, categorySpacing } = this.layout;
    const bounds = this.getDataBounds();
    const visibleSeries = this.getVisibleSeries();

    context.fillStyle = '#666666';
    context.font = '12px sans-serif';

    // X-axis labels (categories)
    context.textAlign = 'center';
    if (visibleSeries.length > 0) {
      const firstSeries = visibleSeries[0];
      firstSeries.data.forEach((point, index) => {
        const x = plotArea.x + index * categorySpacing + categorySpacing * 0.5;
        const y = plotArea.y + plotArea.height + 20;

        const label = point.label || point.id || `Item ${index + 1}`;
        context.fillText(label, x, y);
      });
    }

    // Y-axis labels
    context.textAlign = 'right';
    const yLabels = 6;
    for (let i = 0; i <= yLabels; i++) {
      const value = bounds.minY + (i / yLabels) * (bounds.maxY - bounds.minY);
      const x = plotArea.x - 10;
      const y = plotArea.y + plotArea.height - (i / yLabels) * plotArea.height + 4;

      context.fillText(this.formatValue(value), x, y);
    }
  }

  private formatValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(1);
  }

  private renderBars(context: any): void {
    if (!context.fillRect || !this.layout) return;

    const visibleSeries = this.getVisibleSeries();

    visibleSeries.forEach((series, seriesIndex) => {
      const bars = this.bars.get(series.id);
      if (!bars) return;

      const color = series.color || this.getDefaultColor(seriesIndex);
      context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color as any).a || 1})`;

      // Add subtle gradient effect
      bars.forEach(bar => {
        if (bar.height > 0) {
          // Create gradient for 3D effect
          const gradient = context.createLinearGradient(bar.x, bar.y, bar.x + bar.width, bar.y);
          gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${((color as any).a || 1) * 0.9})`);
          gradient.addColorStop(1, `rgba(${Math.max(0, color.r - 30)}, ${Math.max(0, color.g - 30)}, ${Math.max(0, color.b - 30)}, ${(color as any).a || 1})`);

          context.fillStyle = gradient;
          context.fillRect(bar.x, bar.y, bar.width, bar.height);

          // Add border
          context.strokeStyle = `rgba(${Math.max(0, color.r - 50)}, ${Math.max(0, color.g - 50)}, ${Math.max(0, color.b - 50)}, 0.8)`;
          context.lineWidth = 1;
          context.strokeRect(bar.x, bar.y, bar.width, bar.height);
        }
      });
    });
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

      // Draw color box
      context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(color as any).a || 1})`;
      context.fillRect(x, legendY - 6, 12, 12);

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