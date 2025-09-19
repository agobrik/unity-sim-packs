import { ElectricalGridSimulation } from '../../src/index';

// Create a simulation for a small power grid
const simulation = new ElectricalGridSimulation({
  enableAutoBalance: true,
  targetFrequency: 50,
  frequencyTolerance: 0.5,
  voltageRegulation: true,
  emergencyShutdown: true
});

console.log('Setting up electrical grid simulation...');

// Add power generators
const generator1 = simulation.addGenerator('gen1', { x: 0, y: 0 }, 100); // 100 MW coal plant
const generator2 = simulation.addGenerator('gen2', { x: 10, y: 0 }, 50);  // 50 MW gas plant
const generator3 = simulation.addGenerator('gen3', { x: 20, y: 0 }, 25);  // 25 MW renewable

// Add transformers and distribution
const transformer1 = simulation.addTransformer('trans1', { x: 5, y: 10 }, 200);
const transformer2 = simulation.addTransformer('trans2', { x: 15, y: 10 }, 100);

// Add distribution buses
const bus1 = simulation.addBus('bus1', { x: 5, y: 20 }, 150);
const bus2 = simulation.addBus('bus2', { x: 15, y: 20 }, 100);
const bus3 = simulation.addBus('bus3', { x: 25, y: 20 }, 75);

// Add loads (cities/industrial areas)
const cityLoad1 = simulation.addLoad('city1', { x: 0, y: 30 }, 60);  // 60 MW city
const cityLoad2 = simulation.addLoad('city2', { x: 10, y: 30 }, 40); // 40 MW city
const industrialLoad = simulation.addLoad('industry1', { x: 20, y: 30 }, 80); // 80 MW industrial

// Connect the grid
const grid = simulation.getGrid();

// Connect generators to transformers
grid.connectNodes('gen1', 'trans1');
grid.connectNodes('gen2', 'trans1');
grid.connectNodes('gen3', 'trans2');

// Connect transformers to buses
grid.connectNodes('trans1', 'bus1');
grid.connectNodes('trans2', 'bus2');
grid.connectNodes('bus1', 'bus3');

// Connect loads to buses
grid.connectNodes('bus1', 'city1');
grid.connectNodes('bus2', 'city2');
grid.connectNodes('bus3', 'industry1');

// Set initial generation
generator1.generatePower(80);
generator2.generatePower(35);
generator3.generatePower(20);

// Set initial loads
cityLoad1.consumePower(50);
cityLoad2.consumePower(35);
industrialLoad.consumePower(70);

console.log('Grid connected. Starting simulation...');

// Run simulation
simulation.start(2000); // Update every 2 seconds

// Simulate for 30 seconds
setTimeout(() => {
  console.log('\n=== Simulation Results ===');

  const stats = simulation.step();
  console.log('Grid Statistics:');
  console.log(`- Total Generation: ${stats.totalGeneration.toFixed(2)} MW`);
  console.log(`- Total Consumption: ${stats.totalConsumption.toFixed(2)} MW`);
  console.log(`- Transmission Losses: ${stats.totalLoss.toFixed(2)} MW`);
  console.log(`- Average Voltage: ${stats.averageVoltage.toFixed(2)} V`);
  console.log(`- Grid Frequency: ${stats.frequency.toFixed(3)} Hz`);
  console.log(`- Grid Stability: ${(stats.gridStability * 100).toFixed(1)}%`);
  console.log(`- Active Nodes: ${stats.nodesCount.active}/${stats.nodesCount.total}`);

  // Get analysis
  const analyzer = simulation.getAnalyzer();
  const analysis = analyzer.analyzeGrid();

  console.log('\nGrid Analysis:');
  console.log(`- Efficiency: ${(analysis.efficiency * 100).toFixed(1)}%`);
  console.log(`- Reliability: ${(analysis.reliability * 100).toFixed(1)}%`);
  console.log(`- Carbon Footprint: ${analysis.carbonFootprint.toFixed(2)} kg CO2`);
  console.log(`- Operating Cost: $${analysis.economicMetrics.operatingCost.toFixed(2)}`);
  console.log(`- Revenue: $${analysis.economicMetrics.revenueGenerated.toFixed(2)}`);
  console.log(`- Profit Margin: ${analysis.economicMetrics.profitMargin.toFixed(1)}%`);

  if (analysis.criticalIssues.length > 0) {
    console.log('\nCritical Issues:');
    analysis.criticalIssues.forEach(issue => console.log(`- ${issue}`));
  }

  if (analysis.recommendations.length > 0) {
    console.log('\nRecommendations:');
    analysis.recommendations.forEach(rec => console.log(`- ${rec}`));
  }

  // Simulate an outage
  console.log('\n=== Simulating Generator Outage ===');
  simulation.simulateOutage('gen1');

  const outageStats = simulation.step();
  console.log(`After generator outage - Grid Stable: ${simulation.getStatus().isStable}`);
  console.log(`New total generation: ${outageStats.totalGeneration.toFixed(2)} MW`);

  // Restore generator
  setTimeout(() => {
    console.log('\n=== Restoring Generator ===');
    simulation.restoreNode('gen1');
    const restoreStats = simulation.step();
    console.log(`After restoration - Grid Stable: ${simulation.getStatus().isStable}`);
    console.log(`Restored total generation: ${restoreStats.totalGeneration.toFixed(2)} MW`);

    simulation.stop();
    console.log('\nSimulation completed.');
  }, 5000);

}, 30000);