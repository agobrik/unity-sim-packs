const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 PERFECT UNITY COMPATIBILITY TEST (30/30)\n');

// Get all package directories
const packagesDir = path.join(__dirname, 'packages');
const allPackages = fs.readdirSync(packagesDir).filter(dir => {
  const packagePath = path.join(packagesDir, dir);
  return fs.statSync(packagePath).isDirectory() &&
         fs.existsSync(path.join(packagePath, 'package.json'));
});

console.log(`Testing ALL ${allPackages.length} packages for perfect Unity compatibility:\n`);

const testResults = {};
let totalBuildSuccess = 0;
let totalUnityCompatible = 0;

for (let i = 0; i < allPackages.length; i++) {
  const packageName = allPackages[i];
  console.log(`📦 Testing ${packageName.toUpperCase()} [${String(i+1).padStart(2)}/${allPackages.length}]...`);
  const packagePath = path.join('packages', packageName);

  try {
    // Build test
    console.log(`  ⏳ Building...`);
    execSync(`cd ${packagePath} && npm run build`, { stdio: 'pipe', timeout: 30000 });
    console.log(`  ✅ Build successful`);

    // Unity export test
    console.log(`  ⏳ Testing Unity export...`);
    const packageDist = path.resolve(packagePath, 'dist', 'index.js');

    if (fs.existsSync(packageDist)) {
      const packageModule = require(packageDist);

      // Find main simulation class with all possible names
      let SimulationClass = null;
      const possibleNames = [
        'DisasterManagementSimulation',
        'ProceduralGenerationEngine', 'ProceduralGenerationSimulation',
        'NetworkMultiplayerSimulation',
        'AIDecisionFrameworkSimulation',
        'AdvancedEconomicsSimulation',
        'SupplyChainSimulation',
        'EconomySimulation',
        'AISimulation',
        'WeatherSimulation',
        'FluidDynamicsSimulation',
        'ElectricalGridSimulation',
        'ManufacturingSimulation',
        'UrbanPlanningSimulation',
        'VehicleSimulation',
        'PopulationSimulation',
        'EcosystemSimulation',
        'AgricultureSimulation',
        'MiningGeologySimulation',
        'PhysicsSimulation',
        'PerformanceSimulation',
        'PerformanceMonitor',
        'TimeSimulation',
        'TimeManager',
        'ResourceManager',
        'ModdingFramework',
        'AnalyticsEngine',
        'ProceduralSimulation',
        'MLIntegrationSimulation',
        'UiTemplatesSimulation',
        'RealWorldDataAdaptersSimulation',
        'SimulationAlgorithmsSimulation',
        'DataVisualizationSimulation'
      ];

      for (const name of possibleNames) {
        if (packageModule[name]) {
          SimulationClass = packageModule[name];
          console.log(`    🎯 Found: ${name}`);
          break;
        }
      }

      if (SimulationClass) {
        let simulation;
        try {
          // Create instance with simplified constructors
          if (packageName === 'disaster-management') {
            simulation = new SimulationClass(
              'earthquake',
              { x: 10, y: 10 },
              { intensity: 5.0, duration: 2, affectedRadius: 15, growthRate: 0.1, decayRate: 0.05 }
            );
          } else if (packageName === 'procedural-generation') {
            simulation = new SimulationClass({
              worldSize: { width: 32, height: 32 },
              seed: 12345
            });
          } else if (packageName === 'network-multiplayer') {
            simulation = new SimulationClass({
              isHost: true,
              maxPlayers: 4
            });
          } else if (packageName === 'ai-decision-framework') {
            simulation = new SimulationClass({
              maxAgents: 5
            });
          } else if (packageName === 'analytics') {
            simulation = new SimulationClass({
              environment: 'test'
            });
          } else {
            simulation = new SimulationClass();
          }

          // Test export method
          const exportData = simulation.exportState();
          const parsed = JSON.parse(exportData);

          // Validate Unity-compatible structure
          const hasTimestamp = parsed.timestamp && typeof parsed.timestamp === 'number';
          const hasData = Object.keys(parsed).length > 1;

          console.log(`    📊 Export: ${hasTimestamp ? '✅' : '❌'} timestamp, ${hasData ? '✅' : '❌'} data (${Object.keys(parsed).length} fields)`);

          if (hasTimestamp && hasData) {
            testResults[packageName] = {
              buildSuccess: true,
              unityCompatible: true,
              simulationClass: SimulationClass.name
            };
            console.log(`  ✅ Unity export successful`);
            totalBuildSuccess++;
            totalUnityCompatible++;
          } else {
            testResults[packageName] = {
              buildSuccess: true,
              unityCompatible: false,
              error: 'Invalid export format'
            };
            console.log(`  ❌ Unity export format invalid`);
            totalBuildSuccess++;
          }

        } catch (instanceError) {
          testResults[packageName] = {
            buildSuccess: true,
            unityCompatible: false,
            error: 'Instance/Export failed: ' + instanceError.message.slice(0, 50)
          };
          console.log(`  ❌ Instance failed: ${instanceError.message.slice(0, 50)}`);
          totalBuildSuccess++;
        }
      } else {
        testResults[packageName] = {
          buildSuccess: true,
          unityCompatible: false,
          error: 'Simulation class not found'
        };
        console.log(`  ❌ Simulation class not found`);
        totalBuildSuccess++;
      }
    } else {
      testResults[packageName] = {
        buildSuccess: false,
        unityCompatible: false,
        error: 'Dist folder missing'
      };
      console.log(`  ❌ Dist folder missing`);
    }

  } catch (error) {
    testResults[packageName] = {
      buildSuccess: false,
      unityCompatible: false,
      error: error.message.slice(0, 50)
    };
    console.log(`  ❌ Error: ${error.message.slice(0, 50)}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('🎯 PERFECT UNITY COMPATIBILITY RESULTS');
console.log('='.repeat(80));
console.log(`Total Packages: ${allPackages.length}`);
console.log(`Build Success: ${totalBuildSuccess}/${allPackages.length} (${(totalBuildSuccess/allPackages.length*100).toFixed(1)}%)`);
console.log(`Unity Compatible: ${totalUnityCompatible}/${allPackages.length} (${(totalUnityCompatible/allPackages.length*100).toFixed(1)}%)`);

if (totalUnityCompatible === allPackages.length) {
  console.log('\n🎉🎉 PERFECT! ALL 30/30 PACKAGES UNITY-COMPATIBLE! 🎉🎉');
} else if (totalUnityCompatible >= 28) {
  console.log('\n🔥 EXCELLENT! 28+ packages Unity-compatible!');
} else if (totalUnityCompatible >= 25) {
  console.log('\n✅ GREAT PROGRESS! 25+ packages Unity-compatible!');
}

// Show failed packages if any
const failedPackages = Object.entries(testResults).filter(([name, result]) => !result.unityCompatible);
if (failedPackages.length > 0) {
  console.log('\n❌ FAILED PACKAGES:');
  failedPackages.forEach(([name, result]) => {
    console.log(`  - ${name}: ${result.error}`);
  });
}

const report = {
  testDate: new Date().toISOString(),
  totalPackages: allPackages.length,
  buildSuccessCount: totalBuildSuccess,
  unityCompatibleCount: totalUnityCompatible,
  successRate: (totalUnityCompatible/allPackages.length*100).toFixed(1) + '%',
  results: testResults
};

fs.writeFileSync('perfect-unity-test-results.json', JSON.stringify(report, null, 2));
console.log('\n📄 Results saved to perfect-unity-test-results.json');