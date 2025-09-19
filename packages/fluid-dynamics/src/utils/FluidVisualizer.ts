import { FluidGrid } from '../core/FluidGrid';
import { Vector2D } from '../core/FluidCell';

export interface VisualizationData {
  velocityField: Vector2D[][];
  pressureField: number[][];
  streamlines: Vector2D[][];
  vorticity: number[][];
}

export class FluidVisualizer {
  private _grid: FluidGrid;

  constructor(grid: FluidGrid) {
    this._grid = grid;
  }

  generateVisualizationData(): VisualizationData {
    return {
      velocityField: this._grid.getVelocityField(),
      pressureField: this._grid.getPressureField(),
      streamlines: this.calculateStreamlines(),
      vorticity: this.calculateVorticity()
    };
  }

  private calculateStreamlines(): Vector2D[][] {
    const streamlines: Vector2D[][] = [];
    const velocityField = this._grid.getVelocityField();
    const stepSize = 0.1;
    const maxSteps = 1000;

    // Create streamlines starting from inlet boundaries
    for (let i = 0; i < this._grid.width; i += 2) {
      for (let j = 0; j < this._grid.height; j += 2) {
        const streamline = this.traceStreamline(
          { x: i, y: j },
          velocityField,
          stepSize,
          maxSteps
        );
        if (streamline.length > 5) {
          streamlines.push(streamline);
        }
      }
    }

    return streamlines;
  }

  private traceStreamline(
    start: Vector2D,
    velocityField: Vector2D[][],
    stepSize: number,
    maxSteps: number
  ): Vector2D[] {
    const streamline: Vector2D[] = [{ ...start }];
    let current = { ...start };

    for (let step = 0; step < maxSteps; step++) {
      const velocity = this.interpolateVelocity(current, velocityField);
      const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

      if (magnitude < 1e-6) break;

      // Normalize velocity and apply step size
      const direction = {
        x: (velocity.x / magnitude) * stepSize,
        y: (velocity.y / magnitude) * stepSize
      };

      current = {
        x: current.x + direction.x,
        y: current.y + direction.y
      };

      // Check bounds
      if (current.x < 0 || current.x >= this._grid.width - 1 ||
          current.y < 0 || current.y >= this._grid.height - 1) {
        break;
      }

      streamline.push({ ...current });
    }

    return streamline;
  }

  private interpolateVelocity(position: Vector2D, velocityField: Vector2D[][]): Vector2D {
    const x = Math.max(0, Math.min(this._grid.width - 2, position.x));
    const y = Math.max(0, Math.min(this._grid.height - 2, position.y));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const fx = x - x0;
    const fy = y - y0;

    // Bilinear interpolation
    const v00 = velocityField[x0][y0];
    const v10 = velocityField[x1][y0];
    const v01 = velocityField[x0][y1];
    const v11 = velocityField[x1][y1];

    return {
      x: v00.x * (1 - fx) * (1 - fy) + v10.x * fx * (1 - fy) +
         v01.x * (1 - fx) * fy + v11.x * fx * fy,
      y: v00.y * (1 - fx) * (1 - fy) + v10.y * fx * (1 - fy) +
         v01.y * (1 - fx) * fy + v11.y * fx * fy
    };
  }

  private calculateVorticity(): number[][] {
    const vorticity: number[][] = [];
    const velocityField = this._grid.getVelocityField();

    for (let i = 0; i < this._grid.width; i++) {
      vorticity[i] = [];
      for (let j = 0; j < this._grid.height; j++) {
        vorticity[i][j] = this.calculateVorticityAtPoint(i, j, velocityField);
      }
    }

    return vorticity;
  }

  private calculateVorticityAtPoint(x: number, y: number, velocityField: Vector2D[][]): number {
    const dx = this._grid.cellSize;
    const dy = this._grid.cellSize;

    // Calculate velocity gradients using finite differences
    let dvdx = 0;
    let dudy = 0;

    // dv/dx
    if (x > 0 && x < this._grid.width - 1) {
      dvdx = (velocityField[x + 1][y].y - velocityField[x - 1][y].y) / (2 * dx);
    } else if (x === 0) {
      dvdx = (velocityField[x + 1][y].y - velocityField[x][y].y) / dx;
    } else {
      dvdx = (velocityField[x][y].y - velocityField[x - 1][y].y) / dx;
    }

    // du/dy
    if (y > 0 && y < this._grid.height - 1) {
      dudy = (velocityField[x][y + 1].x - velocityField[x][y - 1].x) / (2 * dy);
    } else if (y === 0) {
      dudy = (velocityField[x][y + 1].x - velocityField[x][y].x) / dy;
    } else {
      dudy = (velocityField[x][y].x - velocityField[x][y - 1].x) / dy;
    }

    // Vorticity = dv/dx - du/dy
    return dvdx - dudy;
  }

  exportToUnity(): string {
    const data = this.generateVisualizationData();

    return JSON.stringify({
      gridWidth: this._grid.width,
      gridHeight: this._grid.height,
      cellSize: this._grid.cellSize,
      velocityField: data.velocityField,
      pressureField: data.pressureField,
      vorticity: data.vorticity,
      streamlines: data.streamlines.map(line =>
        line.map(point => ({ x: point.x, y: point.y }))
      ),
      timestamp: Date.now()
    }, null, 2);
  }

  getVelocityMagnitudeField(): number[][] {
    const velocityField = this._grid.getVelocityField();
    const magnitudeField: number[][] = [];

    for (let i = 0; i < this._grid.width; i++) {
      magnitudeField[i] = [];
      for (let j = 0; j < this._grid.height; j++) {
        const velocity = velocityField[i][j];
        magnitudeField[i][j] = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      }
    }

    return magnitudeField;
  }

  getNormalizedPressureField(): number[][] {
    const pressureField = this._grid.getPressureField();
    const flatPressures = pressureField.flat();
    const minPressure = Math.min(...flatPressures);
    const maxPressure = Math.max(...flatPressures);
    const pressureRange = maxPressure - minPressure;

    if (pressureRange === 0) {
      return pressureField.map(row => row.map(() => 0.5));
    }

    const normalizedField: number[][] = [];
    for (let i = 0; i < this._grid.width; i++) {
      normalizedField[i] = [];
      for (let j = 0; j < this._grid.height; j++) {
        normalizedField[i][j] = (pressureField[i][j] - minPressure) / pressureRange;
      }
    }

    return normalizedField;
  }
}