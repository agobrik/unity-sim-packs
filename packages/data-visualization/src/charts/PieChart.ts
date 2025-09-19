/**
 * Pie Chart implementation for Steam Simulation Toolkit
 */

import { BaseChart } from './ChartFactory';
import { ChartConfig, DataPoint, DataSeries, Point2D } from '../core/types';
import { EventEmitter } from '../utils/EventEmitter';

interface PieSlice {
  startAngle: number;
  endAngle: number;
  value: number;
  label: string;
  color: { r: number; g: number; b: number; a?: number };
  centerX: number;
  centerY: number;
  radius: number;
}

export class PieChart extends BaseChart {
  private slices: PieSlice[] = [];
  private layout: {
    centerX: number;
    centerY: number;
    radius: number;
    labelRadius: number;
  } | null = null;

  public render(context: any): void {
    if (!this.validateData() || !context) return;

    this.calculateLayout();
    this.renderBackground(context);
    this.renderSlices(context);
    this.renderLabels(context);
    this.renderLegend(context);

    this.markClean();
  }

  public calculateLayout(): void {
    const margins = this.config.margins || { top: 40, right: 100, bottom: 40, left: 100 };

    const availableWidth = this.config.width - margins.left - margins.right;
    const availableHeight = this.config.height - margins.top - margins.bottom;
    const radius = Math.min(availableWidth, availableHeight) / 2 * 0.8;

    const centerX = margins.left + availableWidth / 2;
    const centerY = margins.top + availableHeight / 2;
    const labelRadius = radius * 1.2;

    this.layout = { centerX, centerY, radius, labelRadius };

    // Calculate slices from first visible series
    this.slices = [];
    const visibleSeries = this.getVisibleSeries();
    if (visibleSeries.length === 0) return;

    const series = visibleSeries[0]; // Pie chart typically shows one series
    const total = series.data.reduce((sum, point) => sum + Math.abs(point.value), 0);

    if (total === 0) return;

    let currentAngle = -Math.PI / 2; // Start from top

    series.data.forEach((point, index) => {
      const value = Math.abs(point.value);
      const sliceAngle = (value / total) * 2 * Math.PI;
      const color = this.getSliceColor(index);

      this.slices.push({
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        value,
        label: point.label || point.id || `Slice ${index + 1}`,
        color,
        centerX,
        centerY,
        radius
      });

      currentAngle += sliceAngle;
    });
  }

  public getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    // Pie charts don't have traditional X/Y bounds
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }

  private renderBackground(context: any): void {
    if (!context.fillRect) return;

    context.fillStyle = this.config.backgroundColor
      ? `rgba(${this.config.backgroundColor.r}, ${this.config.backgroundColor.g}, ${this.config.backgroundColor.b}, ${this.config.backgroundColor.a || 1})`
      : '#ffffff';

    context.fillRect(0, 0, this.config.width, this.config.height);
  }

  private renderSlices(context: any): void {
    if (!context.arc || !this.layout || this.slices.length === 0) return;

    const { centerX, centerY, radius } = this.layout;

    this.slices.forEach(slice => {
      // Fill slice
      context.fillStyle = `rgba(${slice.color.r}, ${slice.color.g}, ${slice.color.b}, ${slice.color.a || 1})`;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, slice.startAngle, slice.endAngle);
      context.closePath();
      context.fill();

      // Add gradient effect
      const gradient = context.createRadialGradient(
        centerX - radius * 0.3, centerY - radius * 0.3, 0,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, `rgba(${Math.min(255, slice.color.r + 40)}, ${Math.min(255, slice.color.g + 40)}, ${Math.min(255, slice.color.b + 40)}, ${slice.color.a || 1})`);
      gradient.addColorStop(1, `rgba(${slice.color.r}, ${slice.color.g}, ${slice.color.b}, ${slice.color.a || 1})`);

      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, slice.startAngle, slice.endAngle);
      context.closePath();
      context.fill();

      // Stroke slice border
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, slice.startAngle, slice.endAngle);
      context.closePath();
      context.stroke();
    });
  }

  private renderLabels(context: any): void {
    if (!context.fillText || !this.layout || this.slices.length === 0) return;

    const { centerX, centerY, labelRadius } = this.layout;

    context.font = '12px sans-serif';
    context.fillStyle = '#333333';

    this.slices.forEach(slice => {
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;

      // Calculate percentage
      const total = this.slices.reduce((sum, s) => sum + s.value, 0);
      const percentage = ((slice.value / total) * 100).toFixed(1);

      // Position text based on angle
      if (Math.cos(midAngle) >= 0) {
        context.textAlign = 'left';
      } else {
        context.textAlign = 'right';
      }
      context.textBaseline = 'middle';

      // Draw label with percentage
      const label = `${slice.label} (${percentage}%)`;
      context.fillText(label, labelX, labelY);

      // Draw leader line
      const lineStartX = centerX + Math.cos(midAngle) * ((this.layout?.radius || 0) + 10);
      const lineStartY = centerY + Math.sin(midAngle) * ((this.layout?.radius || 0) + 10);
      const lineEndX = centerX + Math.cos(midAngle) * (labelRadius - 10);
      const lineEndY = centerY + Math.sin(midAngle) * (labelRadius - 10);

      context.strokeStyle = '#999999';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(lineStartX, lineStartY);
      context.lineTo(lineEndX, lineEndY);
      context.stroke();
    });
  }

  private renderLegend(context: any): void {
    if (!context.fillText || this.slices.length === 0) return;

    const legendX = this.config.width - 90;
    const legendY = 60;
    const itemHeight = 20;

    context.font = '12px sans-serif';
    context.textAlign = 'left';

    // Legend background
    const legendHeight = this.slices.length * itemHeight + 20;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(legendX - 10, legendY - 10, 80, legendHeight);
    context.strokeStyle = '#cccccc';
    context.lineWidth = 1;
    context.strokeRect(legendX - 10, legendY - 10, 80, legendHeight);

    this.slices.forEach((slice, index) => {
      const y = legendY + index * itemHeight;

      // Draw color box
      context.fillStyle = `rgba(${slice.color.r}, ${slice.color.g}, ${slice.color.b}, ${slice.color.a || 1})`;
      context.fillRect(legendX, y - 6, 12, 12);

      // Draw border around color box
      context.strokeStyle = '#333333';
      context.lineWidth = 1;
      context.strokeRect(legendX, y - 6, 12, 12);

      // Draw text
      context.fillStyle = '#333333';
      const shortLabel = slice.label.length > 8 ? slice.label.substring(0, 8) + '...' : slice.label;
      context.fillText(shortLabel, legendX + 18, y + 4);
    });
  }

  private getSliceColor(index: number) {
    const colors = [
      { r: 66, g: 133, b: 244 },   // Blue
      { r: 34, g: 197, b: 94 },    // Green
      { r: 251, g: 191, b: 36 },   // Yellow
      { r: 239, g: 68, b: 68 },    // Red
      { r: 168, g: 85, b: 247 },   // Purple
      { r: 6, g: 182, b: 212 },    // Cyan
      { r: 245, g: 101, b: 101 },  // Light Red
      { r: 132, g: 204, b: 22 },   // Lime
      { r: 255, g: 152, b: 0 },    // Orange
      { r: 96, g: 125, b: 139 },   // Blue Grey
      { r: 121, g: 85, b: 72 },    // Brown
      { r: 255, g: 193, b: 7 }     // Amber
    ];
    return colors[index % colors.length];
  }
}