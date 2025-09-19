export { FluidCell, Vector2D, FluidProperties } from './core/FluidCell';
export { FluidGrid, GridBoundary } from './core/FluidGrid';
export { NavierStokesSolver, SolverConfig } from './core/NavierStokesSolver';
export { FluidVisualizer, VisualizationData } from './utils/FluidVisualizer';

import { FluidGrid } from './core/FluidGrid';
import { NavierStokesSolver } from './core/NavierStokesSolver';
import { FluidVisualizer } from './utils/FluidVisualizer';

// Main simulation class that combines all components
export class FluidDynamicsSimulation {
  private grid: FluidGrid;
  private solver: NavierStokesSolver;
  private visualizer: FluidVisualizer;
  private isRunning: boolean = false;

  constructor(width: number, height: number, cellSize: number = 1.0) {
    this.grid = new FluidGrid(width, height, cellSize);
    this.solver = new NavierStokesSolver(this.grid);
    this.visualizer = new FluidVisualizer(this.grid);
  }

  getGrid(): FluidGrid {
    return this.grid;
  }

  getSolver(): NavierStokesSolver {
    return this.solver;
  }

  getVisualizer(): FluidVisualizer {
    return this.visualizer;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(): boolean {
    if (!this.isRunning) return false;
    return this.solver.solveStep();
  }

  reset(): void {
    this.stop();
    this.grid = new FluidGrid(this.grid.width, this.grid.height, this.grid.cellSize);
    this.solver = new NavierStokesSolver(this.grid);
    this.visualizer = new FluidVisualizer(this.grid);
  }

  exportState(): string {
    return this.visualizer.exportToUnity();
  }
}