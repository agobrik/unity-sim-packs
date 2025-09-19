#!/usr/bin/env node

/**
 * Unity Package Manager Definition Creator
 * Creates package.json files for all Unity simulation packages
 * Makes packages easily importable via Unity Package Manager
 */

const fs = require('fs');
const path = require('path');

// Package configurations for Unity Package Manager
const packageConfigs = {
    'weather': {
        displayName: 'Unity Sim - Weather System',
        description: 'Advanced weather simulation system for Unity with real-time weather patterns, climate modeling, and atmospheric effects.',
        keywords: ['weather', 'simulation', 'climate', 'atmosphere', 'unity'],
        category: 'Simulation'
    },
    'economy': {
        displayName: 'Unity Sim - Economy System',
        description: 'Comprehensive economic simulation system with market dynamics, GDP tracking, inflation modeling, and economic indicators.',
        keywords: ['economy', 'simulation', 'market', 'gdp', 'finance', 'unity'],
        category: 'Simulation'
    },
    'physics': {
        displayName: 'Unity Sim - Physics System',
        description: 'Enhanced physics simulation system with rigidbody tracking, collision detection, and physics performance monitoring.',
        keywords: ['physics', 'simulation', 'rigidbody', 'collision', 'unity'],
        category: 'Simulation'
    },
    'ai': {
        displayName: 'Unity Sim - AI System',
        description: 'Intelligent agent simulation system with behavior trees, decision making, and AI performance analytics.',
        keywords: ['ai', 'simulation', 'agents', 'behavior', 'intelligence', 'unity'],
        category: 'AI & Machine Learning'
    },
    'analytics': {
        displayName: 'Unity Sim - Analytics System',
        description: 'Comprehensive analytics and data collection system for tracking simulation metrics and performance data.',
        keywords: ['analytics', 'data', 'metrics', 'tracking', 'simulation', 'unity'],
        category: 'Analytics'
    },
    'modding': {
        displayName: 'Unity Sim - Modding System',
        description: 'Flexible modding framework enabling runtime modifications, script loading, and community content integration.',
        keywords: ['modding', 'framework', 'runtime', 'scripting', 'community', 'unity'],
        category: 'Framework'
    },
    'disaster-management': {
        displayName: 'Unity Sim - Disaster Management',
        description: 'Natural disaster simulation and emergency response system with crisis management and resource allocation.',
        keywords: ['disaster', 'emergency', 'crisis', 'management', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'procedural-generation': {
        displayName: 'Unity Sim - Procedural Generation',
        description: 'Advanced procedural generation system for creating dynamic worlds, terrains, and environmental content.',
        keywords: ['procedural', 'generation', 'terrain', 'world', 'dynamic', 'unity'],
        category: 'Procedural Generation'
    },
    'network-multiplayer': {
        displayName: 'Unity Sim - Network Multiplayer',
        description: 'Scalable multiplayer networking system with real-time synchronization and distributed simulation support.',
        keywords: ['networking', 'multiplayer', 'synchronization', 'distributed', 'simulation', 'unity'],
        category: 'Networking'
    },
    'supply-chain': {
        displayName: 'Unity Sim - Supply Chain',
        description: 'Complex supply chain simulation with logistics, inventory management, and production flow optimization.',
        keywords: ['supply-chain', 'logistics', 'inventory', 'production', 'optimization', 'unity'],
        category: 'Simulation'
    },
    'urban-planning': {
        displayName: 'Unity Sim - Urban Planning',
        description: 'City planning and urban development simulation with infrastructure, zoning, and population dynamics.',
        keywords: ['urban', 'planning', 'city', 'infrastructure', 'zoning', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'vehicle-simulation': {
        displayName: 'Unity Sim - Vehicle Simulation',
        description: 'Realistic vehicle physics and traffic simulation with autonomous driving and transportation systems.',
        keywords: ['vehicle', 'traffic', 'transportation', 'autonomous', 'driving', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'advanced-economics': {
        displayName: 'Unity Sim - Advanced Economics',
        description: 'Sophisticated economic modeling with complex market mechanisms, trade systems, and financial instruments.',
        keywords: ['economics', 'markets', 'trade', 'finance', 'modeling', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'agriculture': {
        displayName: 'Unity Sim - Agriculture System',
        description: 'Agricultural simulation with crop management, livestock, seasonal cycles, and farming economics.',
        keywords: ['agriculture', 'farming', 'crops', 'livestock', 'seasons', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'ai-decision-framework': {
        displayName: 'Unity Sim - AI Decision Framework',
        description: 'Advanced AI decision-making framework with machine learning integration and behavioral modeling.',
        keywords: ['ai', 'decision', 'framework', 'machine-learning', 'behavior', 'simulation', 'unity'],
        category: 'AI & Machine Learning'
    },
    'data-visualization': {
        displayName: 'Unity Sim - Data Visualization',
        description: 'Real-time data visualization system with charts, graphs, heatmaps, and interactive analytics displays.',
        keywords: ['visualization', 'charts', 'graphs', 'analytics', 'data', 'simulation', 'unity'],
        category: 'Visualization'
    },
    'ecosystem': {
        displayName: 'Unity Sim - Ecosystem System',
        description: 'Ecological simulation with biodiversity, food chains, environmental interactions, and conservation modeling.',
        keywords: ['ecosystem', 'ecology', 'biodiversity', 'environment', 'conservation', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'electrical-grid': {
        displayName: 'Unity Sim - Electrical Grid',
        description: 'Power grid simulation with electricity distribution, load balancing, renewable energy, and grid stability.',
        keywords: ['electrical', 'grid', 'power', 'energy', 'renewable', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'fluid-dynamics': {
        displayName: 'Unity Sim - Fluid Dynamics',
        description: 'Advanced fluid simulation with particle systems, flow dynamics, and computational fluid dynamics (CFD).',
        keywords: ['fluid', 'dynamics', 'flow', 'particles', 'cfd', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'manufacturing': {
        displayName: 'Unity Sim - Manufacturing System',
        description: 'Industrial manufacturing simulation with production lines, quality control, and efficiency optimization.',
        keywords: ['manufacturing', 'production', 'industry', 'quality', 'optimization', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'mining-geology': {
        displayName: 'Unity Sim - Mining & Geology',
        description: 'Mining and geological simulation with resource extraction, geological modeling, and environmental impact.',
        keywords: ['mining', 'geology', 'resources', 'extraction', 'geological', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'ml-integration': {
        displayName: 'Unity Sim - ML Integration',
        description: 'Machine learning integration system with neural networks, training pipelines, and AI model deployment.',
        keywords: ['machine-learning', 'neural-networks', 'ai', 'training', 'ml', 'simulation', 'unity'],
        category: 'AI & Machine Learning'
    },
    'performance': {
        displayName: 'Unity Sim - Performance System',
        description: 'Performance monitoring and optimization system with profiling, benchmarking, and resource management.',
        keywords: ['performance', 'optimization', 'profiling', 'benchmarking', 'monitoring', 'unity'],
        category: 'Performance'
    },
    'population': {
        displayName: 'Unity Sim - Population System',
        description: 'Population dynamics simulation with demographics, migration patterns, and social behavior modeling.',
        keywords: ['population', 'demographics', 'migration', 'social', 'behavior', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'procedural': {
        displayName: 'Unity Sim - Procedural System',
        description: 'Core procedural generation utilities and algorithms for dynamic content creation and world building.',
        keywords: ['procedural', 'algorithms', 'generation', 'dynamic', 'content', 'simulation', 'unity'],
        category: 'Procedural Generation'
    },
    'real-world-data-adapters': {
        displayName: 'Unity Sim - Real World Data Adapters',
        description: 'Real-world data integration with APIs, live data feeds, and external data source adapters.',
        keywords: ['real-world', 'data', 'apis', 'integration', 'feeds', 'simulation', 'unity'],
        category: 'Data Integration'
    },
    'resources': {
        displayName: 'Unity Sim - Resources System',
        description: 'Resource management simulation with renewable/non-renewable resources, allocation, and sustainability.',
        keywords: ['resources', 'management', 'sustainability', 'allocation', 'renewable', 'simulation', 'unity'],
        category: 'Simulation'
    },
    'simulation-algorithms': {
        displayName: 'Unity Sim - Simulation Algorithms',
        description: 'Core simulation algorithms and mathematical models for advanced simulation computations.',
        keywords: ['algorithms', 'mathematical', 'models', 'computation', 'simulation', 'unity'],
        category: 'Algorithms'
    },
    'time': {
        displayName: 'Unity Sim - Time System',
        description: 'Advanced time management with time scaling, scheduling, calendar systems, and temporal mechanics.',
        keywords: ['time', 'scheduling', 'calendar', 'temporal', 'scaling', 'simulation', 'unity'],
        category: 'Framework'
    },
    'ui-templates': {
        displayName: 'Unity Sim - UI Templates',
        description: 'Pre-built UI templates and components for simulation interfaces, dashboards, and control panels.',
        keywords: ['ui', 'templates', 'interface', 'dashboard', 'controls', 'simulation', 'unity'],
        category: 'UI'
    }
};

// Base package configuration
const basePackageConfig = {
    version: "1.0.0",
    unity: "2020.3",
    author: {
        name: "Unity Simulation Framework",
        email: "contact@unity-sim.com"
    },
    dependencies: {
        "com.unity.nuget.newtonsoft-json": "3.0.2"
    },
    samples: [],
    repository: {
        type: "git",
        url: "https://github.com/unity-sim/unity-sim-packs.git"
    },
    license: "MIT"
};

function createPackageDefinition(packageName, config) {
    const packageJson = {
        name: `com.unity-sim.${packageName}`,
        displayName: config.displayName,
        version: basePackageConfig.version,
        description: config.description,
        unity: basePackageConfig.unity,
        keywords: config.keywords,
        category: config.category,
        author: basePackageConfig.author,
        dependencies: basePackageConfig.dependencies,
        samples: [
            {
                displayName: `${config.displayName} Example`,
                description: `Example implementation of ${config.displayName}`,
                path: "Examples~"
            }
        ],
        repository: basePackageConfig.repository,
        license: basePackageConfig.license
    };

    return JSON.stringify(packageJson, null, 2);
}

function createAssemblyDefinition(packageName, config) {
    const assemblyName = `UnitySim.${packageName.charAt(0).toUpperCase() + packageName.slice(1).replace(/-/g, '')}`;

    const assemblyDef = {
        name: assemblyName,
        displayName: config.displayName,
        references: [
            "Unity.Newtonsoft.Json"
        ],
        includePlatforms: [],
        excludePlatforms: [],
        allowUnsafeCode: false,
        overrideReferences: false,
        precompiledReferences: [],
        autoReferenced: true,
        defineConstraints: [],
        versionDefines: [],
        noEngineReferences: false
    };

    return JSON.stringify(assemblyDef, null, 2);
}

function createPackageStructure() {
    console.log('🏗️ Creating Unity Package Manager definitions...');

    let successCount = 0;
    let errorCount = 0;

    for (const [packageName, config] of Object.entries(packageConfigs)) {
        try {
            const packageDir = path.join('..', 'packages', packageName);
            const unityDir = path.join(packageDir, 'Unity');

            console.log(`📦 Creating package definition for: ${packageName}`);

            // Create package.json
            const packageJsonContent = createPackageDefinition(packageName, config);
            const packageJsonPath = path.join(unityDir, 'package.json');

            fs.writeFileSync(packageJsonPath, packageJsonContent, 'utf8');
            console.log(`  ✅ Created: ${packageJsonPath}`);

            // Create Assembly Definition
            const assemblyDefContent = createAssemblyDefinition(packageName, config);
            const systemName = packageName.split('-').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join('') + 'System';

            const assemblyDefPath = path.join(unityDir, `${systemName}.asmdef`);
            fs.writeFileSync(assemblyDefPath, assemblyDefContent, 'utf8');
            console.log(`  ✅ Created: ${assemblyDefPath}`);

            // Create meta files for Unity
            const packageMetaContent = `fileFormatVersion: 2
guid: ${generateGUID()}
PackageManifestImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant: `;

            const assemblyMetaContent = `fileFormatVersion: 2
guid: ${generateGUID()}
AssemblyDefinitionImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant: `;

            fs.writeFileSync(packageJsonPath + '.meta', packageMetaContent, 'utf8');
            fs.writeFileSync(assemblyDefPath + '.meta', assemblyMetaContent, 'utf8');

            successCount++;

        } catch (error) {
            console.error(`❌ Error creating package definition for ${packageName}:`, error.message);
            errorCount++;
        }
    }

    // Create main package manifest
    createMainPackageManifest();

    console.log('\n📊 Package Definition Creation Summary:');
    console.log('=====================================');
    console.log(`✅ Successfully created: ${successCount} packages`);
    console.log(`❌ Failed to create: ${errorCount} packages`);
    console.log(`📦 Total packages: ${Object.keys(packageConfigs).length}`);

    if (successCount === Object.keys(packageConfigs).length) {
        console.log('🎉 All Unity Package Manager definitions created successfully!');
    }
}

function createMainPackageManifest() {
    const mainManifest = {
        dependencies: {}
    };

    // Add all simulation packages as dependencies
    for (const packageName of Object.keys(packageConfigs)) {
        mainManifest.dependencies[`com.unity-sim.${packageName}`] = "1.0.0";
    }

    // Add required Unity packages
    mainManifest.dependencies["com.unity.nuget.newtonsoft-json"] = "3.0.2";

    const manifestPath = path.join('..', 'Unity-Package', 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(mainManifest, null, 2), 'utf8');
    console.log(`✅ Created main package manifest: ${manifestPath}`);
}

function generateGUID() {
    // Generate a simple GUID for Unity meta files
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return r.toString(16);
    });
}

function createInstallationGuide() {
    const guide = `# Unity Package Manager Installation Guide

## 🚀 Quick Installation

### Method 1: Package Manager (Recommended)

1. Open Unity Package Manager (Window > Package Manager)
2. Click the "+" button and select "Add package from git URL"
3. Enter: \`https://github.com/unity-sim/unity-sim-packs.git\`
4. Click "Add"

### Method 2: Manual Installation

1. Download or clone this repository
2. Copy the desired package folders to your Unity project's \`Packages\` directory
3. Unity will automatically import the packages

## 📦 Available Packages

${Object.entries(packageConfigs).map(([name, config]) =>
    `- **${config.displayName}**: ${config.description}`
).join('\n')}

## 🔧 Dependencies

All packages require:
- Unity 2020.3 or newer
- Newtonsoft JSON package (automatically installed)

## 📖 Usage

After installation, each package provides:
- MonoBehaviour components ready to use
- Example scenes and scripts
- Comprehensive documentation
- JSON export functionality

## 🎯 Getting Started

1. Create an empty GameObject in your scene
2. Add any simulation system component (e.g., WeatherSystem)
3. Configure the system in the Inspector
4. Press Play to start the simulation

## 📚 Documentation

For detailed documentation, visit: [Unity Sim Packs Documentation](https://github.com/unity-sim/unity-sim-packs/wiki)

## 🆘 Support

- GitHub Issues: [Report bugs and request features](https://github.com/unity-sim/unity-sim-packs/issues)
- Discussions: [Community discussions](https://github.com/unity-sim/unity-sim-packs/discussions)
- Email: contact@unity-sim.com

## 📄 License

MIT License - See LICENSE file for details
`;

    const guidePath = path.join('..', 'Unity-Package', 'INSTALLATION.md');
    fs.writeFileSync(guidePath, guide, 'utf8');
    console.log(`✅ Created installation guide: ${guidePath}`);
}

// Main execution
function main() {
    console.log('🎮 Unity Package Manager Definition Creator');
    console.log('==========================================');

    try {
        createPackageStructure();
        createInstallationGuide();

        console.log('\n🎉 Unity Package Manager setup completed successfully!');
        console.log('📦 All packages are now ready for Unity Package Manager import');
        console.log('📚 Installation guide created for users');

    } catch (error) {
        console.error('💥 Fatal error during package creation:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    createPackageDefinition,
    createAssemblyDefinition,
    packageConfigs
};