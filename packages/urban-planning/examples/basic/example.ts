import {
  UrbanPlanningSimulation,
  ZoneType,
  BuildingType,
  InfrastructureType,
  LayerType
} from '../../src/index';

// Create a basic urban planning simulation example
export function runUrbanPlanningExample(): void {
  console.log('🏙️ Starting Urban Planning Simulation...');

  // Create a 50x50 city grid with initial budget of 2 million
  const simulation = new UrbanPlanningSimulation(50, 50, 2000000);

  console.log('📋 Setting up basic city layout...');

  // Create the basic city structure
  simulation.createBasicCity();

  // Get references to the main systems
  const cityGrid = simulation.getCityGrid();
  const zoningSystem = simulation.getZoningSystem();
  const infrastructureManager = simulation.getInfrastructureManager();
  const visualizer = simulation.getVisualizer();

  // Create a more complex zoning plan
  console.log('🗺️ Creating comprehensive zoning plan...');

  const masterPlan = zoningSystem.createZoningPlan(
    'Downtown Expansion',
    'A comprehensive plan for expanding the downtown core with mixed-use development'
  );

  // Add mixed-use development zone
  const mixedUsePositions = [];
  for (let x = 20; x <= 30; x++) {
    for (let y = 20; y <= 30; y++) {
      mixedUsePositions.push({ x, y });
    }
  }

  const mixedUseZone = zoningSystem.createCommercialZone(mixedUsePositions, 'mixed');
  zoningSystem.addZoningArea('Downtown Expansion', mixedUseZone);

  // Add green spaces
  const parkPositions = [
    { x: 15, y: 15 }, { x: 16, y: 15 }, { x: 15, y: 16 }, { x: 16, y: 16 },
    { x: 35, y: 35 }, { x: 36, y: 35 }, { x: 35, y: 36 }, { x: 36, y: 36 }
  ];
  const greenSpace = zoningSystem.createGreenSpace(parkPositions);
  zoningSystem.addZoningArea('Downtown Expansion', greenSpace);

  // Apply the zoning plan
  zoningSystem.applyZoningPlan('Downtown Expansion');

  console.log('🏗️ Planning infrastructure projects...');

  // Create major infrastructure projects
  const highwayPositions = [];
  for (let x = 0; x < 50; x++) {
    highwayPositions.push({ x, y: 10 });
  }

  const highwayProject = infrastructureManager.createProject(
    'Main Highway',
    InfrastructureType.HIGHWAY,
    highwayPositions
  );

  // Create subway line
  const subwayPositions = [];
  for (let y = 0; y < 50; y++) {
    subwayPositions.push({ x: 25, y });
  }

  const subwayProject = infrastructureManager.createProject(
    'Metro Line 1',
    InfrastructureType.SUBWAY,
    subwayPositions
  );

  // Create power plant
  const powerPlantProject = infrastructureManager.createProject(
    'Central Power Plant',
    InfrastructureType.POWER_PLANT,
    [{ x: 5, y: 5 }]
  );

  console.log('💰 Current budget:', infrastructureManager.getBudget().toLocaleString());

  // Approve and start construction of affordable projects
  const projects = [highwayProject, powerPlantProject];
  let approvedProjects = 0;

  for (const projectId of projects) {
    const project = infrastructureManager.getProject(projectId);
    if (project && infrastructureManager.getBudget() >= project.cost) {
      if (infrastructureManager.approveProject(projectId)) {
        if (infrastructureManager.startConstruction(projectId)) {
          console.log(`✅ Started construction of ${project.name} (Cost: $${project.cost.toLocaleString()})`);
          approvedProjects++;
        }
      }
    } else if (project) {
      console.log(`❌ Cannot afford ${project.name} (Cost: $${project.cost.toLocaleString()})`);
    }
  }

  console.log(`🏗️ Started construction on ${approvedProjects} projects`);

  // Add some buildings
  console.log('🏢 Constructing buildings...');

  const buildingPlacements = [
    { x: 22, y: 22, type: BuildingType.APARTMENT },
    { x: 24, y: 24, type: BuildingType.OFFICE },
    { x: 26, y: 26, type: BuildingType.SHOP },
    { x: 15, y: 15, type: BuildingType.PARK },
    { x: 35, y: 35, type: BuildingType.PARK }
  ];

  let buildingsConstructed = 0;
  for (const building of buildingPlacements) {
    if (cityGrid.buildStructure(building.x, building.y, building.type)) {
      buildingsConstructed++;
    }
  }

  console.log(`🏗️ Constructed ${buildingsConstructed} buildings`);

  // Set up visualization layers
  console.log('🎨 Setting up visualization...');
  visualizer.setLayerVisible(LayerType.ZONES, true);
  visualizer.setLayerVisible(LayerType.BUILDINGS, true);
  visualizer.setLayerVisible(LayerType.POPULATION, true);
  visualizer.setLayerVisible(LayerType.INFRASTRUCTURE, true);

  // Start the simulation
  console.log('▶️ Starting simulation...');
  simulation.start();

  // Run simulation for several time steps
  console.log('⏰ Running simulation steps...');
  for (let i = 0; i < 100; i++) {
    simulation.step(1);

    // Log progress every 25 steps
    if (i % 25 === 0) {
      const report = simulation.generateReport();
      console.log(`\n📊 Time Step ${i}:`);
      console.log(`   Population: ${report.metrics.population.total}`);
      console.log(`   Average Happiness: ${(report.metrics.quality.averageHappiness * 100).toFixed(1)}%`);
      console.log(`   GDP: $${report.metrics.economy.gdp.toLocaleString()}`);
      console.log(`   Air Quality: ${(report.metrics.environment.airQuality * 100).toFixed(1)}%`);

      // Show construction progress
      const inProgressProjects = infrastructureManager.getProjectsByStatus('in_construction');
      if (inProgressProjects.length > 0) {
        console.log('   🚧 Construction Progress:');
        for (const project of inProgressProjects) {
          console.log(`     ${project.name}: ${(project.progress * 100).toFixed(1)}%`);
        }
      }
    }
  }

  // Generate final report
  console.log('\n📈 Generating final city report...');
  const finalReport = simulation.generateReport();

  console.log('\n🏆 FINAL CITY STATISTICS:');
  console.log('=' .repeat(50));
  console.log(`Total Population: ${finalReport.metrics.population.total.toLocaleString()}`);
  console.log(`Population Density: ${finalReport.metrics.population.density.toFixed(2)} people/cell`);
  console.log(`GDP: $${finalReport.metrics.economy.gdp.toLocaleString()}`);
  console.log(`Unemployment Rate: ${(finalReport.metrics.economy.unemploymentRate * 100).toFixed(1)}%`);
  console.log(`Average Happiness: ${(finalReport.metrics.quality.averageHappiness * 100).toFixed(1)}%`);
  console.log(`Air Quality Index: ${(finalReport.metrics.environment.airQuality * 100).toFixed(1)}%`);
  console.log(`Infrastructure Efficiency: ${(finalReport.metrics.infrastructure.efficiency * 100).toFixed(1)}%`);
  console.log(`Traffic Level: ${(finalReport.metrics.quality.traffic * 100).toFixed(1)}%`);

  // Show zone distribution
  console.log('\n🗺️ ZONE DISTRIBUTION:');
  console.log('=' .repeat(30));
  Object.entries(finalReport.metrics.population.distribution).forEach(([zone, population]) => {
    if (population > 0) {
      console.log(`${zone}: ${population.toLocaleString()} people`);
    }
  });

  // Show recommendations
  if (finalReport.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(40));
    finalReport.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   Cost: $${rec.estimatedCost.toLocaleString()}`);
      console.log(`   Benefit: ${rec.expectedBenefit}\n`);
    });
  }

  // Show alerts
  if (finalReport.alerts.length > 0) {
    console.log('🚨 CITY ALERTS:');
    console.log('=' .repeat(25));
    finalReport.alerts.forEach(alert => {
      const icon = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
      console.log(`${icon} [${alert.level.toUpperCase()}] ${alert.category}: ${alert.message}`);
      if (alert.affectedAreas.length > 0) {
        console.log(`   Affected areas: ${alert.affectedAreas.length} locations`);
      }
    });
  }

  // Export final state
  console.log('\n💾 Exporting final state for Unity integration...');
  const unityData = visualizer.exportToUnity();
  console.log(`   Unity visualization data: ${unityData.length} characters`);

  console.log('\n✅ Urban Planning Simulation Complete!');
  console.log('   Final budget remaining:', infrastructureManager.getBudget().toLocaleString());

  // Show completed projects
  const completedProjects = infrastructureManager.getProjectsByStatus('completed');
  if (completedProjects.length > 0) {
    console.log('\n🎉 COMPLETED PROJECTS:');
    completedProjects.forEach(project => {
      console.log(`   ✅ ${project.name} - Cost: $${project.cost.toLocaleString()}`);
    });
  }

  console.log('\n📊 Run analytics.generateReport() for detailed city analysis');
  console.log('🎨 Use visualizer.exportToUnity() to get Unity-compatible visualization data');
  console.log('🗺️ Access zoningSystem.getZoningAnalysis() for zoning compliance reports');
}

// Export the example function for use in tests or other modules
export default runUrbanPlanningExample;

// If running this file directly, execute the example
if (require.main === module) {
  runUrbanPlanningExample();
}