import { FluidDynamicsSimulation } from '../../src/index';

const simulation = new FluidDynamicsSimulation(50, 20, 0.1);
const grid = simulation.getGrid();
const solver = simulation.getSolver();

// Set up channel flow boundary conditions
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

// Configure solver
solver.updateConfig({
  timeStep: 0.001,
  maxIterations: 50,
  convergenceTolerance: 1e-5
});

// Initialize fluid properties
for (let i = 0; i < grid.width; i++) {
  for (let j = 0; j < grid.height; j++) {
    grid.setCellProperties(i, j, {
      density: 1000,
      viscosity: 0.001,
      temperature: 20,
      pressure: 101325
    });
  }
}

simulation.start();

// Run simulation for 100 time steps
console.log('Starting channel flow simulation...');
for (let step = 0; step < 100; step++) {
  const converged = simulation.step();

  if (step % 10 === 0) {
    const maxVel = solver.getMaxVelocityMagnitude();
    const reynolds = solver.calculateReynoldsNumber();
    console.log(`Step ${step}: Max velocity = ${maxVel.toFixed(4)}, Re = ${reynolds.toFixed(2)}, Converged = ${converged}`);
  }
}

// Export final state
const finalState = simulation.exportState();
console.log('Simulation complete. Final state exported.');