import { FluidCell, Vector2D, FluidProperties } from './FluidCell';

export interface GridBoundary {
  type: 'solid' | 'inlet' | 'outlet' | 'periodic';
  velocity?: Vector2D;
  pressure?: number;
}

export class FluidGrid {
  private _cells: FluidCell[][];
  private _width: number;
  private _height: number;
  private _cellSize: number;
  private _boundaries: Map<string, GridBoundary>;

  constructor(width: number, height: number, cellSize: number = 1.0) {
    this._width = width;
    this._height = height;
    this._cellSize = cellSize;
    this._boundaries = new Map();
    this._cells = [];

    this.initializeGrid();
    this.setupNeighbors();
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get cellSize(): number {
    return this._cellSize;
  }

  private initializeGrid(): void {
    for (let i = 0; i < this._width; i++) {
      this._cells[i] = [];
      for (let j = 0; j < this._height; j++) {
        this._cells[i][j] = new FluidCell(i * this._cellSize, j * this._cellSize);
      }
    }
  }

  private setupNeighbors(): void {
    for (let i = 0; i < this._width; i++) {
      for (let j = 0; j < this._height; j++) {
        const cell = this._cells[i][j];

        // Add 4-directional neighbors
        if (i > 0) cell.addNeighbor(this._cells[i - 1][j]);
        if (i < this._width - 1) cell.addNeighbor(this._cells[i + 1][j]);
        if (j > 0) cell.addNeighbor(this._cells[i][j - 1]);
        if (j < this._height - 1) cell.addNeighbor(this._cells[i][j + 1]);
      }
    }
  }

  getCell(x: number, y: number): FluidCell | null {
    if (x >= 0 && x < this._width && y >= 0 && y < this._height) {
      return this._cells[x][y];
    }
    return null;
  }

  setCellProperties(x: number, y: number, properties: Partial<FluidProperties>): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.properties = properties;
    }
  }

  setCellVelocity(x: number, y: number, velocity: Vector2D): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.velocity = velocity;
    }
  }

  setBoundary(side: 'top' | 'bottom' | 'left' | 'right', boundary: GridBoundary): void {
    this._boundaries.set(side, boundary);
  }

  applyBoundaryConditions(): void {
    // Top boundary
    if (this._boundaries.has('top')) {
      const boundary = this._boundaries.get('top')!;
      for (let i = 0; i < this._width; i++) {
        this.applyBoundaryToCell(i, this._height - 1, boundary);
      }
    }

    // Bottom boundary
    if (this._boundaries.has('bottom')) {
      const boundary = this._boundaries.get('bottom')!;
      for (let i = 0; i < this._width; i++) {
        this.applyBoundaryToCell(i, 0, boundary);
      }
    }

    // Left boundary
    if (this._boundaries.has('left')) {
      const boundary = this._boundaries.get('left')!;
      for (let j = 0; j < this._height; j++) {
        this.applyBoundaryToCell(0, j, boundary);
      }
    }

    // Right boundary
    if (this._boundaries.has('right')) {
      const boundary = this._boundaries.get('right')!;
      for (let j = 0; j < this._height; j++) {
        this.applyBoundaryToCell(this._width - 1, j, boundary);
      }
    }
  }

  private applyBoundaryToCell(x: number, y: number, boundary: GridBoundary): void {
    const cell = this.getCell(x, y);
    if (!cell) return;

    switch (boundary.type) {
      case 'solid':
        cell.velocity = { x: 0, y: 0 };
        break;
      case 'inlet':
        if (boundary.velocity) {
          cell.velocity = boundary.velocity;
        }
        if (boundary.pressure !== undefined) {
          cell.properties = { pressure: boundary.pressure };
        }
        break;
      case 'outlet':
        if (boundary.pressure !== undefined) {
          cell.properties = { pressure: boundary.pressure };
        }
        break;
    }
  }

  getAllCells(): FluidCell[] {
    const allCells: FluidCell[] = [];
    for (let i = 0; i < this._width; i++) {
      for (let j = 0; j < this._height; j++) {
        allCells.push(this._cells[i][j]);
      }
    }
    return allCells;
  }

  getVelocityField(): Vector2D[][] {
    const field: Vector2D[][] = [];
    for (let i = 0; i < this._width; i++) {
      field[i] = [];
      for (let j = 0; j < this._height; j++) {
        field[i][j] = this._cells[i][j].velocity;
      }
    }
    return field;
  }

  getPressureField(): number[][] {
    const field: number[][] = [];
    for (let i = 0; i < this._width; i++) {
      field[i] = [];
      for (let j = 0; j < this._height; j++) {
        field[i][j] = this._cells[i][j].properties.pressure;
      }
    }
    return field;
  }
}