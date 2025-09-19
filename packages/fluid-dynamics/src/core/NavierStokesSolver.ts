import { FluidGrid } from './FluidGrid';
import { FluidCell, Vector2D } from './FluidCell';

export interface SolverConfig {
  timeStep: number;
  maxIterations: number;
  convergenceTolerance: number;
  relaxationFactor: number;
}

export class NavierStokesSolver {
  private _config: SolverConfig;
  private _grid: FluidGrid;

  constructor(grid: FluidGrid, config: Partial<SolverConfig> = {}) {
    this._grid = grid;
    this._config = {
      timeStep: config.timeStep ?? 0.001,
      maxIterations: config.maxIterations ?? 100,
      convergenceTolerance: config.convergenceTolerance ?? 1e-6,
      relaxationFactor: config.relaxationFactor ?? 1.8
    };
  }

  get config(): SolverConfig {
    return { ...this._config };
  }

  updateConfig(newConfig: Partial<SolverConfig>): void {
    this._config = { ...this._config, ...newConfig };
  }

  solveStep(): boolean {
    // Apply boundary conditions
    this._grid.applyBoundaryConditions();

    // Solve momentum equations
    this.solveMomentum();

    // Solve pressure correction
    const converged = this.solvePressureCorrection();

    // Update velocities with pressure correction
    this.correctVelocities();

    return converged;
  }

  private solveMomentum(): void {
    const cells = this._grid.getAllCells();
    const dt = this._config.timeStep;

    for (const cell of cells) {
      const velocity = cell.velocity;
      const properties = cell.properties;

      // Calculate pressure gradient force
      const pressureGradient = cell.calculatePressureGradient();
      const pressureForce: Vector2D = {
        x: -pressureGradient.x / properties.density,
        y: -pressureGradient.y / properties.density
      };

      // Calculate viscosity force
      const viscosityForce = cell.calculateViscosityForce();

      // Calculate convective acceleration
      const convectiveAccel = this.calculateConvectiveAcceleration(cell);

      // Update velocity using explicit time stepping
      const newVelocity: Vector2D = {
        x: velocity.x + dt * (pressureForce.x + viscosityForce.x - convectiveAccel.x),
        y: velocity.y + dt * (pressureForce.y + viscosityForce.y - convectiveAccel.y)
      };

      cell.velocity = newVelocity;
    }
  }

  private calculateConvectiveAcceleration(cell: FluidCell): Vector2D {
    const velocity = cell.velocity;
    const neighbors = cell.neighbors;

    if (neighbors.length === 0) {
      return { x: 0, y: 0 };
    }

    let dudx = 0, dudy = 0, dvdx = 0, dvdy = 0;
    const position = cell.position;

    // Calculate velocity gradients using finite differences
    for (const neighbor of neighbors) {
      const neighborPos = neighbor.position;
      const neighborVel = neighbor.velocity;

      const dx = neighborPos.x - position.x;
      const dy = neighborPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const dudn = (neighborVel.x - velocity.x) / distance;
        const dvdn = (neighborVel.y - velocity.y) / distance;

        dudx += dudn * (dx / distance);
        dudy += dudn * (dy / distance);
        dvdx += dvdn * (dx / distance);
        dvdy += dvdn * (dy / distance);
      }
    }

    // Normalize by number of neighbors
    dudx /= neighbors.length;
    dudy /= neighbors.length;
    dvdx /= neighbors.length;
    dvdy /= neighbors.length;

    // Calculate convective acceleration: u∇u
    return {
      x: velocity.x * dudx + velocity.y * dudy,
      y: velocity.x * dvdx + velocity.y * dvdy
    };
  }

  private solvePressureCorrection(): boolean {
    const cells = this._grid.getAllCells();
    const dt = this._config.timeStep;
    let maxResidual = 0;

    for (let iteration = 0; iteration < this._config.maxIterations; iteration++) {
      maxResidual = 0;

      for (const cell of cells) {
        const continuityResidual = this.calculateContinuityResidual(cell);

        if (Math.abs(continuityResidual) > maxResidual) {
          maxResidual = Math.abs(continuityResidual);
        }

        // Apply pressure correction
        const pressureCorrection = continuityResidual * this._config.relaxationFactor * dt;
        const properties = cell.properties;
        cell.properties = {
          pressure: properties.pressure + pressureCorrection
        };
      }

      if (maxResidual < this._config.convergenceTolerance) {
        return true;
      }
    }

    return false;
  }

  private calculateContinuityResidual(cell: FluidCell): number {
    const neighbors = cell.neighbors;

    if (neighbors.length === 0) {
      return 0;
    }

    let divergence = 0;
    const position = cell.position;

    for (const neighbor of neighbors) {
      const neighborPos = neighbor.position;
      const neighborVel = neighbor.velocity;

      const dx = neighborPos.x - position.x;
      const dy = neighborPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        // Calculate velocity component normal to the face
        const normalX = dx / distance;
        const normalY = dy / distance;
        const normalVelocity = neighborVel.x * normalX + neighborVel.y * normalY;

        divergence += normalVelocity / distance;
      }
    }

    return divergence / neighbors.length;
  }

  private correctVelocities(): void {
    const cells = this._grid.getAllCells();
    const dt = this._config.timeStep;

    for (const cell of cells) {
      const pressureGradient = cell.calculatePressureGradient();
      const properties = cell.properties;
      const velocity = cell.velocity;

      // Apply pressure correction to velocity
      const velocityCorrection: Vector2D = {
        x: -dt * pressureGradient.x / properties.density,
        y: -dt * pressureGradient.y / properties.density
      };

      cell.velocity = {
        x: velocity.x + velocityCorrection.x,
        y: velocity.y + velocityCorrection.y
      };
    }
  }

  getMaxVelocityMagnitude(): number {
    const cells = this._grid.getAllCells();
    let maxMagnitude = 0;

    for (const cell of cells) {
      const velocity = cell.velocity;
      const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (magnitude > maxMagnitude) {
        maxMagnitude = magnitude;
      }
    }

    return maxMagnitude;
  }

  calculateReynoldsNumber(): number {
    const cells = this._grid.getAllCells();
    if (cells.length === 0) return 0;

    let avgDensity = 0;
    let avgViscosity = 0;
    let maxVelocity = 0;

    for (const cell of cells) {
      const properties = cell.properties;
      avgDensity += properties.density;
      avgViscosity += properties.viscosity;

      const velocity = cell.velocity;
      const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      if (magnitude > maxVelocity) {
        maxVelocity = magnitude;
      }
    }

    avgDensity /= cells.length;
    avgViscosity /= cells.length;

    const characteristicLength = this._grid.cellSize;

    return (avgDensity * maxVelocity * characteristicLength) / avgViscosity;
  }
}