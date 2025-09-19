/**
 * Heatmap Chart implementation for Steam Simulation Toolkit
 */

import { BaseChart } from './ChartFactory';
import { ChartConfig, DataPoint, DataSeries, Point2D, Color } from '../core/types';
import { EventEmitter } from '../utils/EventEmitter';

interface HeatmapCell {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  color: Color;
  rowIndex: number;
  colIndex: number;
  label: string;
}

export class HeatmapChart extends BaseChart {
  private cells: HeatmapCell[] = [];
  private layout: {
    plotArea: { x: number; y: number; width: number; height: number };
    cellWidth: number;
    cellHeight: number;
    rows: number;
    cols: number;
  } | null = null;
  private colorScale: (value: number) => Color;

  constructor(id: string, config: ChartConfig) {
    super(id, config);
    this.colorScale = this.defaultColorScale;
  }

  public render(context: any): void {
    if (!this.validateData() || !context) return;

    this.calculateLayout();
    this.renderBackground(context);
    this.renderCells(context);
    this.renderGrid(context);
    this.renderLabels(context);
    this.renderColorBar(context);

    this.markClean();
  }

  public calculateLayout(): void {
    const margins = this.config.margins || { top: 60, right: 100, bottom: 80, left: 80 };

    const plotArea = {
      x: margins.left,
      y: margins.top,
      width: this.config.width - margins.left - margins.right - 60, // Reserve space for color bar
      height: this.config.height - margins.top - margins.bottom
    };

    // Determine grid dimensions from data
    const visibleSeries = this.getVisibleSeries();
    if (visibleSeries.length === 0) return;

    // For heatmap, we expect data to have row/col metadata or we'll create a grid
    const { rows, cols } = this.determineGridDimensions(visibleSeries);

    const cellWidth = plotArea.width / cols;
    const cellHeight = plotArea.height / rows;

    this.layout = { plotArea, cellWidth, cellHeight, rows, cols };

    // Calculate cells
    this.cells = [];
    const bounds = this.getDataBounds();

    visibleSeries.forEach(series => {
      series.data.forEach((point, index) => {
        const { row, col } = this.getGridPosition(point, index, rows, cols);

        const cell: HeatmapCell = {
          x: plotArea.x + col * cellWidth,
          y: plotArea.y + row * cellHeight,
          width: cellWidth,
          height: cellHeight,
          value: point.value,
          color: this.colorScale(this.normalizeValue(point.value, bounds.minY, bounds.maxY)),
          rowIndex: row,
          colIndex: col,
          label: point.label || `(${row}, ${col})`
        };

        this.cells.push(cell);
      });
    });
  }

  public getDataBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    if (!this.dataset) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }

    const visibleSeries = this.getVisibleSeries();
    let minY = Infinity, maxY = -Infinity;

    visibleSeries.forEach(series => {
      series.data.forEach(point => {
        minY = Math.min(minY, point.value);
        maxY = Math.max(maxY, point.value);
      });
    });

    return {
      minX: 0,
      maxX: 1,
      minY: minY,
      maxY: maxY
    };
  }

  private determineGridDimensions(series: DataSeries[]): { rows: number; cols: number } {
    // Try to get dimensions from metadata
    const firstSeries = series[0];
    const maxRow = Math.max(...firstSeries.data.map(p => p.metadata?.row || 0));
    const maxCol = Math.max(...firstSeries.data.map(p => p.metadata?.col || 0));

    if (maxRow > 0 || maxCol > 0) {
      return { rows: maxRow + 1, cols: maxCol + 1 };
    }

    // Fallback: create a square-ish grid
    const totalPoints = firstSeries.data.length;
    const cols = Math.ceil(Math.sqrt(totalPoints));
    const rows = Math.ceil(totalPoints / cols);

    return { rows, cols };
  }

  private getGridPosition(point: DataPoint, index: number, rows: number, cols: number): { row: number; col: number } {
    // Use metadata if available
    if (point.metadata?.row !== undefined && point.metadata?.col !== undefined) {
      return { row: point.metadata.row, col: point.metadata.col };
    }

    // Fallback: calculate from index
    const row = Math.floor(index / cols);
    const col = index % cols;

    return { row, col };
  }

  private normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }

  private defaultColorScale = (normalizedValue: number): Color => {
    // Blue to red heat scale
    const value = Math.max(0, Math.min(1, normalizedValue));

    if (value < 0.25) {
      // Blue to cyan
      const t = value * 4;
      return {
        r: Math.round(0 * (1 - t) + 0 * t),
        g: Math.round(0 * (1 - t) + 255 * t),
        b: Math.round(255 * (1 - t) + 255 * t)
      };
    } else if (value < 0.5) {
      // Cyan to green
      const t = (value - 0.25) * 4;
      return {
        r: Math.round(0 * (1 - t) + 0 * t),
        g: Math.round(255 * (1 - t) + 255 * t),
        b: Math.round(255 * (1 - t) + 0 * t)
      };
    } else if (value < 0.75) {
      // Green to yellow
      const t = (value - 0.5) * 4;
      return {
        r: Math.round(0 * (1 - t) + 255 * t),
        g: Math.round(255 * (1 - t) + 255 * t),
        b: Math.round(0 * (1 - t) + 0 * t)
      };
    } else {
      // Yellow to red
      const t = (value - 0.75) * 4;
      return {
        r: Math.round(255 * (1 - t) + 255 * t),
        g: Math.round(255 * (1 - t) + 0 * t),
        b: Math.round(0 * (1 - t) + 0 * t)
      };
    }
  };

  private renderBackground(context: any): void {
    if (!context.fillRect) return;

    context.fillStyle = this.config.backgroundColor
      ? `rgba(${this.config.backgroundColor.r}, ${this.config.backgroundColor.g}, ${this.config.backgroundColor.b}, ${this.config.backgroundColor.a || 1})`
      : '#ffffff';

    context.fillRect(0, 0, this.config.width, this.config.height);
  }

  private renderCells(context: any): void {
    if (!context.fillRect || !this.layout) return;

    this.cells.forEach(cell => {
      // Fill cell with data color
      context.fillStyle = `rgba(${cell.color.r}, ${cell.color.g}, ${cell.color.b}, ${cell.color.a || 1})`;
      context.fillRect(cell.x, cell.y, cell.width, cell.height);

      // Add subtle border
      context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      context.lineWidth = 1;
      context.strokeRect(cell.x, cell.y, cell.width, cell.height);
    });
  }

  private renderGrid(context: any): void {
    if (!context.strokeStyle || !this.layout) return;

    const { plotArea, cellWidth, cellHeight, rows, cols } = this.layout;

    context.strokeStyle = '#333333';
    context.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = plotArea.x + i * cellWidth;
      context.beginPath();
      context.moveTo(x, plotArea.y);
      context.lineTo(x, plotArea.y + plotArea.height);
      context.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = plotArea.y + i * cellHeight;
      context.beginPath();
      context.moveTo(plotArea.x, y);
      context.lineTo(plotArea.x + plotArea.width, y);
      context.stroke();
    }
  }

  private renderLabels(context: any): void {
    if (!context.fillText || !this.layout) return;

    const { plotArea, cellWidth, cellHeight, rows, cols } = this.layout;

    context.fillStyle = '#333333';
    context.font = '12px sans-serif';

    // Row labels (left side)
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    for (let i = 0; i < rows; i++) {
      const y = plotArea.y + i * cellHeight + cellHeight / 2;
      context.fillText(`Row ${i}`, plotArea.x - 10, y);
    }

    // Column labels (top)
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    for (let i = 0; i < cols; i++) {
      const x = plotArea.x + i * cellWidth + cellWidth / 2;
      context.save();
      context.translate(x, plotArea.y - 10);
      context.rotate(-Math.PI / 4); // 45 degree rotation
      context.fillText(`Col ${i}`, 0, 0);
      context.restore();
    }

    // Value labels on cells (if cells are large enough)
    if (cellWidth > 40 && cellHeight > 20) {
      context.fillStyle = '#000000';
      context.font = '10px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      this.cells.forEach(cell => {
        const x = cell.x + cell.width / 2;
        const y = cell.y + cell.height / 2;

        // Choose text color based on background brightness
        const brightness = (cell.color.r * 299 + cell.color.g * 587 + cell.color.b * 114) / 1000;
        context.fillStyle = brightness > 128 ? '#000000' : '#ffffff';

        context.fillText(cell.value.toFixed(1), x, y);
      });
    }
  }

  private renderColorBar(context: any): void {
    if (!context.fillRect || !this.layout) return;

    const colorBarX = this.config.width - 80;
    const colorBarY = this.layout.plotArea.y;
    const colorBarWidth = 20;
    const colorBarHeight = this.layout.plotArea.height;

    const bounds = this.getDataBounds();
    const steps = 100;

    // Draw color gradient
    for (let i = 0; i < steps; i++) {
      const normalizedValue = i / (steps - 1);
      const color = this.colorScale(normalizedValue);

      context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      context.fillRect(
        colorBarX,
        colorBarY + colorBarHeight - (i + 1) * (colorBarHeight / steps),
        colorBarWidth,
        colorBarHeight / steps + 1
      );
    }

    // Draw color bar border
    context.strokeStyle = '#333333';
    context.lineWidth = 1;
    context.strokeRect(colorBarX, colorBarY, colorBarWidth, colorBarHeight);

    // Draw scale labels
    context.fillStyle = '#333333';
    context.font = '10px sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    const labelSteps = 5;
    for (let i = 0; i <= labelSteps; i++) {
      const value = bounds.minY + (i / labelSteps) * (bounds.maxY - bounds.minY);
      const y = colorBarY + colorBarHeight - (i / labelSteps) * colorBarHeight;

      context.fillText(this.formatValue(value), colorBarX + colorBarWidth + 5, y);
    }

    // Color bar title
    context.font = 'bold 12px sans-serif';
    context.textAlign = 'center';
    context.save();
    context.translate(colorBarX + colorBarWidth / 2, colorBarY - 10);
    context.fillText('Values', 0, 0);
    context.restore();
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
}