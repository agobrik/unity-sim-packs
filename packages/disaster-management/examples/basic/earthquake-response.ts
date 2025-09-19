import { DisasterManagementSimulation } from '../../src/index';

console.log('🌍 Starting Earthquake Emergency Response Simulation...');

// Create a magnitude 7.2 earthquake simulation
const simulation = new DisasterManagementSimulation(
  'earthquake',
  { x: 50, y: 50 }, // Epicenter at city center
  {
    intensity: 7.2,
    duration: 2, // 2 time units of shaking
    affectedRadius: 25,
    growthRate: 0.1,
    decayRate: 0.05
  },
  { x: 20, y: 20 }, // Emergency command center
  { width: 100, height: 100 }
);

// Setup earthquake-specific scenario
simulation.setupEarthquakeScenario(7.2);

console.log('\n📊 Initial Situation:');
const disaster = simulation.getDisaster();
const response = simulation.getEmergencyResponse();

console.log(`Disaster Type: ${disaster.type}`);
console.log(`Magnitude: ${disaster.config.intensity}`);
console.log(`Epicenter: (${disaster.position.x}, ${disaster.position.y})`);
console.log(`Affected Radius: ${disaster.config.affectedRadius} km`);
console.log(`Emergency Resources: ${response.resources.length}`);
console.log(`Evacuation Zones: ${response.evacuationZones.length}`);

// Get disaster warning
const warning = simulation.getDisasterWarning();
console.log('\n⚠️ Disaster Warning:');
console.log(`Confidence: ${(warning.confidence * 100).toFixed(1)}%`);
console.log('Recommended Actions:');
warning.recommendedActions.forEach((action: string) => console.log(`  - ${action}`));

// Start simulation
simulation.start(2000); // Update every 2 seconds

console.log('\n🚨 Starting Real-Time Emergency Response...');

// Simulate emergency response timeline
setTimeout(() => {
  console.log('\n=== T+0: Earthquake Begins ===');
  const status = simulation.getSimulationStatus();
  console.log(`Phase: ${status.disasterPhase}`);
  console.log(`Current Time: ${status.currentTime}`);

  // Issue immediate evacuation orders
  const zones = simulation.getEmergencyResponse().evacuationZones;
  zones.forEach(zone => {
    simulation.issueEvacuationOrder(zone.id);
    console.log(`📢 Evacuation order issued for ${zone.id} (${zone.population} people)`);
  });

}, 3000);

setTimeout(() => {
  console.log('\n=== T+5: Initial Response Deployed ===');
  const disaster = simulation.getDisaster();
  console.log(`Earthquake Intensity: ${disaster.currentIntensity.toFixed(1)}`);
  console.log(`Current Phase: ${disaster.phase}`);

  // Deploy additional search and rescue teams
  const resources = simulation.getEmergencyResponse().resources;
  const searchRescue = resources.filter(r => r.type === 'search-rescue');

  if (searchRescue.length > 0) {
    simulation.deployResource(searchRescue[0].id, { x: 55, y: 55 });
    console.log(`🚑 Search & Rescue team deployed to coordinates (55, 55)`);
  }

  // Request additional resources due to severity
  simulation.requestAdditionalResources();
  console.log('📞 Additional resources requested - Response level escalated');

}, 8000);

setTimeout(() => {
  console.log('\n=== T+10: Peak Response Operations ===');
  const response = simulation.getEmergencyResponse();
  const effectiveness = response.getResponseEffectiveness();
  const utilization = response.getResourceUtilization();

  console.log(`Response Effectiveness: ${(effectiveness * 100).toFixed(1)}%`);
  console.log(`Resource Utilization: ${(utilization * 100).toFixed(1)}%`);
  console.log(`Response Level: ${response.responseLevel}/5`);

  // Check evacuation progress
  const zones = response.evacuationZones;
  zones.forEach(zone => {
    console.log(`📊 ${zone.id}: ${zone.evacuatedPopulation}/${zone.population} evacuated (${(zone.evacuationProgress * 100).toFixed(1)}%)`);
  });

}, 15000);

setTimeout(() => {
  console.log('\n=== T+20: Damage Assessment ===');
  const assessment = simulation.getDamageAssessment();

  console.log('💥 Damage Assessment Results:');
  console.log(`Affected Area: ${assessment.affectedArea.toFixed(1)} km²`);
  console.log(`Estimated Casualties: ${assessment.estimatedCasualties}`);
  console.log(`Infrastructure Damage: ${(assessment.infrastructureDamage * 100).toFixed(1)}%`);
  console.log(`Economic Impact: $${(assessment.economicImpact / 1000000).toFixed(1)}M`);

}, 25000);

setTimeout(() => {
  console.log('\n=== T+30: Recovery Phase Begins ===');
  const disaster = simulation.getDisaster();
  const response = simulation.getEmergencyResponse();

  console.log(`Disaster Phase: ${disaster.phase}`);
  console.log(`Current Intensity: ${disaster.currentIntensity.toFixed(1)}`);

  // Check ongoing actions
  const activeActions = response.actions.filter(a => a.status === 'in-progress');
  const completedActions = response.actions.filter(a => a.status === 'completed');

  console.log(`Active Operations: ${activeActions.length}`);
  console.log(`Completed Operations: ${completedActions.length}`);

  console.log('\nOngoing Operations:');
  activeActions.forEach(action => {
    const progress = action.estimatedDuration > 0 ?
      (action.actualDuration / action.estimatedDuration * 100).toFixed(1) : 0;
    console.log(`  - ${action.type}: ${progress}% complete`);
  });

}, 35000);

setTimeout(() => {
  console.log('\n=== FINAL REPORT ===');

  // Generate final statistics
  const finalStatus = simulation.getSimulationStatus();
  const finalAssessment = simulation.getDamageAssessment();
  const response = simulation.getEmergencyResponse();

  console.log('\n📈 Response Performance:');
  console.log(`Overall Effectiveness: ${(response.getResponseEffectiveness() * 100).toFixed(1)}%`);
  console.log(`Total Response Cost: $${(response.totalCost / 1000000).toFixed(1)}M`);
  console.log(`Response Level Reached: ${response.responseLevel}/5`);

  console.log('\n🏥 Casualty & Damage Summary:');
  console.log(`People Affected: ${finalAssessment.estimatedCasualties.toLocaleString()}`);
  console.log(`Infrastructure Damage: ${(finalAssessment.infrastructureDamage * 100).toFixed(1)}%`);
  console.log(`Total Economic Impact: $${(finalAssessment.economicImpact / 1000000).toFixed(1)}M`);

  // Evacuation success rate
  const zones = response.evacuationZones;
  const totalPopulation = zones.reduce((sum, zone) => sum + zone.population, 0);
  const totalEvacuated = zones.reduce((sum, zone) => sum + zone.evacuatedPopulation, 0);
  const evacuationRate = totalPopulation > 0 ? (totalEvacuated / totalPopulation * 100) : 0;

  console.log(`\n🚁 Evacuation Success Rate: ${evacuationRate.toFixed(1)}%`);
  console.log(`Total Evacuated: ${totalEvacuated.toLocaleString()} / ${totalPopulation.toLocaleString()}`);

  // Resource deployment summary
  console.log('\n🚒 Resource Deployment:');
  const resourceTypes = [...new Set(response.resources.map(r => r.type))];
  resourceTypes.forEach(type => {
    const count = response.resources.filter(r => r.type === type).length;
    console.log(`  ${type}: ${count} units`);
  });

  // Actions summary
  const actionTypes = [...new Set(response.actions.map(a => a.type))];
  console.log('\n⚡ Operations Completed:');
  actionTypes.forEach(type => {
    const completed = response.actions.filter(a => a.type === type && a.status === 'completed').length;
    const total = response.actions.filter(a => a.type === type).length;
    console.log(`  ${type}: ${completed}/${total}`);
  });

  // Export final state for Unity
  const unityData = simulation.exportState();
  console.log('\n💾 Simulation data exported for Unity integration');
  console.log(`Export size: ${(unityData.length / 1024).toFixed(1)} KB`);

  // Lessons learned
  console.log('\n📚 Key Lessons:');
  if (response.getResponseEffectiveness() > 0.8) {
    console.log('✅ Excellent response coordination saved many lives');
  } else if (response.getResponseEffectiveness() > 0.6) {
    console.log('⚠️ Good response but room for improvement in coordination');
  } else {
    console.log('❌ Response coordination needs significant improvement');
  }

  if (evacuationRate > 90) {
    console.log('✅ Evacuation procedures were highly effective');
  } else if (evacuationRate > 70) {
    console.log('⚠️ Evacuation was partially successful but could be faster');
  } else {
    console.log('❌ Evacuation procedures need major improvements');
  }

  simulation.stop();
  console.log('\n🏁 Earthquake response simulation completed.');

}, 45000);