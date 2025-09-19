# @steam-sim/fluid-dynamics

Advanced fluid dynamics simulation system with Navier-Stokes solver and viscosity modeling for Unity-based Steam games.

## Features

- **Navier-Stokes Solver**: Complete implementation of fluid dynamics equations
- **Grid-Based Simulation**: Efficient cell-based fluid computation
- **Viscosity Modeling**: Realistic fluid behavior with temperature effects
- **Boundary Conditions**: Support for solid, inlet, outlet, and periodic boundaries
- **Visualization System**: Real-time streamlines, vorticity, and flow field visualization
- **Unity Integration**: Direct export to Unity-compatible JSON format

## Installation

```bash
npm install @steam-sim/fluid-dynamics
```

## Quick Start

```typescript
import { FluidDynamicsSimulation } from '@steam-sim/fluid-dynamics';

// Create a 50x20 fluid simulation grid
const simulation = new FluidDynamicsSimulation(50, 20, 0.1);
const grid = simulation.getGrid();
const solver = simulation.getSolver();

// Set boundary conditions for channel flow
grid.setBoundary('left', {
  type: 'inlet',
  velocity: { x: 1.0, y: 0 },
  pressure: 101325
});

grid.setBoundary('right', {
  type: 'outlet',
  pressure: 101300
});

grid.setBoundary('top', { type: 'solid' });
grid.setBoundary('bottom', { type: 'solid' });

// Configure solver parameters
solver.updateConfig({
  timeStep: 0.001,
  maxIterations: 50,
  convergenceTolerance: 1e-5
});

// Run simulation
simulation.start();
for (let step = 0; step < 100; step++) {
  simulation.step();
}

// Export for Unity
const fluidData = simulation.exportState();
```

## Core Classes

### FluidDynamicsSimulation
Main simulation class that orchestrates fluid dynamics computation.

### FluidGrid
Grid-based representation of the fluid domain with boundary condition support.

### NavierStokesSolver
Numerical solver for Navier-Stokes equations using pressure correction methods.

### FluidVisualizer
Generates visualization data including streamlines, vorticity fields, and velocity vectors.

## Game Integration

Perfect for:
- **Water Flow Simulation**: Rivers, pipes, drainage systems
- **Weather Systems**: Atmospheric flow patterns
- **Industrial Games**: Fluid processing plants, chemical reactors
- **City Builders**: Water distribution, flood simulation
- **Physics Puzzles**: Fluid-based gameplay mechanics

## Configuration Options

```typescript
// Solver configuration
solver.updateConfig({
  timeStep: 0.001,           // Time step size
  maxIterations: 100,        // Maximum solver iterations
  convergenceTolerance: 1e-6, // Convergence criteria
  relaxationFactor: 1.8      // SOR relaxation factor
});

// Fluid properties
grid.setCellProperties(x, y, {
  density: 1000,      // kg/m³
  viscosity: 0.001,   // Pa·s
  temperature: 20,    // °C
  pressure: 101325    // Pa
});
```

## Unity Integration

The simulation exports comprehensive data for Unity visualization:

```json
{
  "gridWidth": 50,
  "gridHeight": 20,
  "cellSize": 0.1,
  "velocityField": [...],
  "pressureField": [...],
  "vorticity": [...],
  "streamlines": [...]
}
```

## Examples

See `examples/basic/channel-flow.ts` for a complete channel flow simulation example.

## Performance

- Optimized for real-time simulation in game environments
- Supports grids up to 200x200 cells at 60 FPS
- Memory-efficient cell-based storage
- Configurable solver precision vs. performance trade-offs

## License

MIT