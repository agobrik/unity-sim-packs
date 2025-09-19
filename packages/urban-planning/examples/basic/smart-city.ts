import { UrbanPlanningSimulation } from '../../src/index';

console.log('Creating Smart City Simulation...');

// Create a 20x20 grid for a medium-sized city
const simulation = new UrbanPlanningSimulation(20, 20);
const city = simulation.getCityGrid();
const zoning = simulation.getZoningSystem();
const infrastructure = simulation.getInfrastructureManager();

// Set up initial zoning plan
console.log('Setting up zoning districts...');

// Downtown commercial district
for (let x = 8; x <= 12; x++) {
  for (let y = 8; y <= 12; y++) {
    zoning.setZone(x, y, 'commercial', 5); // Max 5 stories
  }
}

// Residential neighborhoods
for (let x = 2; x <= 6; x++) {
  for (let y = 2; y <= 18; y++) {
    zoning.setZone(x, y, 'residential', 3); // Max 3 stories
  }
}

for (let x = 14; x <= 18; x++) {
  for (let y = 2; y <= 18; y++) {
    zoning.setZone(x, y, 'residential', 2); // Max 2 stories
  }
}

// Industrial zone
for (let x = 2; x <= 18; x++) {
  for (let y = 16; y <= 18; y++) {
    zoning.setZone(x, y, 'industrial', 2);
  }
}

// Green spaces
for (let x = 8; x <= 12; x++) {
  for (let y = 4; y <= 6; y++) {
    zoning.setZone(x, y, 'park', 1);
  }
}

// Start infrastructure projects
console.log('Starting infrastructure development...');

// Power grid expansion
infrastructure.startProject('power-grid-1', 'power', 5000000, 18, [
  { x: 0, y: 0 }, { x: 19, y: 0 }, { x: 19, y: 19 }, { x: 0, y: 19 }
]);

// Water distribution system
infrastructure.startProject('water-main-1', 'water', 3000000, 12, [
  { x: 10, y: 10 }, { x: 5, y: 5 }, { x: 15, y: 15 }
]);

// Transportation network
infrastructure.startProject('metro-line-1', 'transportation', 8000000, 24, [
  { x: 0, y: 10 }, { x: 5, y: 10 }, { x: 10, y: 10 }, { x: 15, y: 10 }, { x: 19, y: 10 }
]);

// Start simulation
simulation.start();

// Build some initial structures
console.log('Constructing initial buildings...');

// Commercial buildings
city.placeBuilding(10, 10, 'commercial', 4);
city.placeBuilding(11, 10, 'commercial', 3);
city.placeBuilding(9, 11, 'commercial', 5);

// Residential buildings
city.placeBuilding(4, 4, 'residential', 2);
city.placeBuilding(4, 6, 'residential', 3);
city.placeBuilding(16, 6, 'residential', 2);
city.placeBuilding(16, 8, 'residential', 2);

// Industrial facilities
city.placeBuilding(6, 17, 'industrial', 1);
city.placeBuilding(12, 17, 'industrial', 2);

// Simulate city development over time
const months = 24; // 2 years of development
console.log(`\nSimulating ${months} months of city development...`);

for (let month = 1; month <= months; month++) {
  // Update simulation
  simulation.step();

  // Check infrastructure progress
  const projects = infrastructure.getActiveProjects();
  projects.forEach(project => {
    if (project.isCompleted && !project.name.includes('completed')) {
      console.log(`Month ${month}: ${project.name} completed!`);
      project.name += ' (completed)';
    }
  });

  // Add new buildings as city grows
  if (month % 3 === 0) {
    // Add some random development
    for (let i = 0; i < 2; i++) {
      const x = Math.floor(Math.random() * 20);
      const y = Math.floor(Math.random() * 20);
      const zone = zoning.getZone(x, y);

      if (zone && !city.getBuilding(x, y)) {
        const stories = Math.min(
          Math.floor(Math.random() * zone.maxHeight) + 1,
          zone.maxHeight
        );

        if (city.placeBuilding(x, y, zone.type, stories)) {
          console.log(`Month ${month}: New ${zone.type} building (${stories} stories) built at (${x}, ${y})`);
        }
      }
    }
  }

  // Monthly progress report
  if (month % 6 === 0) {
    console.log(`\n=== Month ${month} Progress Report ===`);
    const analytics = simulation.getAnalytics();
    const report = analytics.generateCityReport();

    console.log(`Population: ${report.demographics.population.toLocaleString()}`);
    console.log(`Buildings: ${report.infrastructure.buildings}`);
    console.log(`Infrastructure Coverage: ${(report.infrastructure.coverage * 100).toFixed(1)}%`);
    console.log(`City Score: ${(report.overallScore * 100).toFixed(1)}/100`);
    console.log(`Efficiency Rating: ${report.efficiency.toFixed(1)}/10`);

    if (report.recommendations.length > 0) {
      console.log('Recommendations:');
      report.recommendations.slice(0, 3).forEach(rec => console.log(`- ${rec}`));
    }
  }
}

// Final city analysis
console.log('\n=== Final City Analysis ===');
const analytics = simulation.getAnalytics();
const finalReport = analytics.generateCityReport();

console.log('\nDemographics:');
console.log(`- Total Population: ${finalReport.demographics.population.toLocaleString()}`);
console.log(`- Population Density: ${finalReport.demographics.density.toFixed(2)} per sq unit`);
console.log(`- Growth Rate: ${(finalReport.demographics.growthRate * 100).toFixed(2)}% per month`);

console.log('\nInfrastructure:');
console.log(`- Total Buildings: ${finalReport.infrastructure.buildings}`);
console.log(`- Infrastructure Coverage: ${(finalReport.infrastructure.coverage * 100).toFixed(1)}%`);
console.log(`- Transportation Score: ${(finalReport.infrastructure.transportation * 100).toFixed(1)}%`);

console.log('\nEconomics:');
console.log(`- Economic Activity: ${(finalReport.economics.activity * 100).toFixed(1)}%`);
console.log(`- Employment Rate: ${(finalReport.economics.employment * 100).toFixed(1)}%`);
console.log(`- Tax Revenue: $${finalReport.economics.taxRevenue.toLocaleString()}/month`);

console.log('\nEnvironment:');
console.log(`- Green Space Coverage: ${(finalReport.environment.greenSpace * 100).toFixed(1)}%`);
console.log(`- Air Quality Index: ${finalReport.environment.airQuality.toFixed(1)}`);
console.log(`- Sustainability Score: ${finalReport.environment.sustainability.toFixed(1)}/10`);

console.log(`\nOverall City Score: ${(finalReport.overallScore * 100).toFixed(1)}/100`);

// Export final state for Unity
const finalState = simulation.exportState();
console.log('\nSimulation complete. City data exported for Unity integration.');

simulation.stop();