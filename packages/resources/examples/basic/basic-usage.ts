import {
  ResourceManager,
  ResourceHelpers,
  ResourceType,
  AllocationStrategy,
  ResourceConfig
} from '@steam-sim/resources';

async function runBasicResourceExample() {
  (globalThis as any).console?.log('🔧 Starting Basic Resource Management Example');

  const config: ResourceConfig = {
    maxPoolSize: 50,
    allocationStrategy: AllocationStrategy.BEST_FIT,
    recyclingEnabled: true,
    performanceMonitoring: true,
    dependencyResolution: true
  };

  const manager = new ResourceManager(config);

  manager.on('resource_event', (event) => {
    (globalThis as any).console?.log(`📢 Resource Event: ${event.type} - ${event.resourceId}`);
  });

  manager.on('pool_expanded', (data) => {
    (globalThis as any).console?.log(`📈 Pool ${data.poolId} expanded to ${data.newSize} resources`);
  });

  (globalThis as any).console?.log('\n🏊 Creating Resource Pools...');

  const memoryPool = manager.createPool(
    'memory-pool',
    'Application Memory Pool',
    ResourceType.MEMORY,
    'application',
    15,
    AllocationStrategy.BEST_FIT
  );

  const cpuPool = manager.createPool(
    'cpu-pool',
    'CPU Processing Pool',
    ResourceType.CPU,
    'compute',
    8,
    AllocationStrategy.LOAD_BALANCED
  );

  const databasePool = manager.createPool(
    'database-pool',
    'Database Connection Pool',
    ResourceType.DATABASE,
    'storage',
    5,
    AllocationStrategy.ROUND_ROBIN
  );

  (globalThis as any).console?.log(`✅ Created ${manager.getAllPools().length} resource pools`);

  (globalThis as any).console?.log('\n💾 Adding Memory Resources...');
  const memorySizes = [1024, 2048, 4096, 8192, 16384];

  for (let i = 0; i < 10; i++) {
    const size = memorySizes[i % memorySizes.length];
    const memory = ResourceHelpers.createResource(
      `memory-${i}`,
      ResourceType.MEMORY,
      `Memory Block ${i} (${ResourceHelpers.formatResourceSize(size)})`,
      'application',
      {
        size,
        priority: Math.floor(size / 1024),
        maxConcurrentUsers: size >= 4096 ? 3 : 1,
        shareable: size >= 4096,
        recyclable: true
      }
    );

    manager.addResource(memoryPool.id, memory);
  }

  (globalThis as any).console?.log('\n🖥️  Adding CPU Resources...');
  const cpuSpeeds = [2400, 2800, 3200, 3600];

  for (let i = 0; i < 6; i++) {
    const speed = cpuSpeeds[i % cpuSpeeds.length];
    const cpu = ResourceHelpers.createResource(
      `cpu-${i}`,
      ResourceType.CPU,
      `CPU Core ${i} (${speed}MHz)`,
      'compute',
      {
        size: speed,
        priority: Math.floor(speed / 800),
        maxConcurrentUsers: 2,
        shareable: true,
        attributes: {
          cores: Math.floor(Math.random() * 4) + 1,
          architecture: ['x64', 'arm64'][Math.floor(Math.random() * 2)]
        }
      }
    );

    manager.addResource(cpuPool.id, cpu);
  }

  (globalThis as any).console?.log('\n🗄️  Adding Database Resources...');
  const dbTypes = ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis'];

  for (let i = 0; i < 3; i++) {
    const dbType = dbTypes[i % dbTypes.length];
    const database = ResourceHelpers.createResource(
      `db-${i}`,
      ResourceType.DATABASE,
      `${dbType} Instance ${i}`,
      'storage',
      {
        size: 1000000,
        priority: 10,
        maxConcurrentUsers: dbType === 'Redis' ? 100 : 20,
        shareable: true,
        attributes: {
          type: dbType,
          port: 5432 + i,
          persistent: dbType !== 'Redis'
        }
      }
    );

    manager.addResource(databasePool.id, database);
  }

  manager.start();

  (globalThis as any).console?.log('\n🚀 Starting Resource Allocation Simulation...');

  const services = [
    {
      id: 'web-frontend',
      name: 'Web Frontend Service',
      needs: {
        memory: { min: 2048, max: 4096, duration: 30000 },
        cpu: { min: 2400, exclusive: false, duration: 30000 },
        database: { shareable: true, duration: 60000 }
      }
    },
    {
      id: 'api-backend',
      name: 'API Backend Service',
      needs: {
        memory: { min: 4096, max: 8192, duration: 45000 },
        cpu: { min: 3200, exclusive: false, duration: 45000 },
        database: { shareable: true, duration: 90000 }
      }
    },
    {
      id: 'data-processor',
      name: 'Data Processing Service',
      needs: {
        memory: { min: 8192, exclusive: true, duration: 20000 },
        cpu: { min: 3600, exclusive: false, duration: 20000 },
        database: { shareable: true, duration: 30000 }
      }
    },
    {
      id: 'cache-service',
      name: 'Cache Service',
      needs: {
        memory: { min: 16384, shareable: true, duration: 60000 },
        database: { shareable: true, duration: 120000 }
      }
    }
  ];

  const allocationResults = new Map();

  for (const service of services) {
    (globalThis as any).console?.log(`\n⚡ Allocating resources for ${service.name}...`);

    const allocations = {
      memory: null,
      cpu: null,
      database: null
    };

    if (service.needs.memory) {
      const memRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.MEMORY,
        {
          minSize: service.needs.memory.min,
          maxSize: service.needs.memory.max,
          exclusive: service.needs.memory.exclusive,
          duration: service.needs.memory.duration
        },
        5
      );

      allocations.memory = await manager.allocateResource(memRequest);

      if (allocations.memory.success) {
        (globalThis as any).console?.log(`  ✅ Memory: ${allocations.memory.resource!.name}`);
      } else {
        (globalThis as any).console?.log(`  ❌ Memory allocation failed: ${allocations.memory.error}`);
      }
    }

    if (service.needs.cpu) {
      const cpuRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.CPU,
        {
          minSize: service.needs.cpu.min,
          exclusive: service.needs.cpu.exclusive,
          duration: service.needs.cpu.duration
        },
        4
      );

      allocations.cpu = await manager.allocateResource(cpuRequest);

      if (allocations.cpu.success) {
        (globalThis as any).console?.log(`  ✅ CPU: ${allocations.cpu.resource!.name}`);
      } else {
        (globalThis as any).console?.log(`  ❌ CPU allocation failed: ${allocations.cpu.error}`);
      }
    }

    if (service.needs.database) {
      const dbRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.DATABASE,
        {
          shareable: service.needs.database.shareable,
          duration: service.needs.database.duration
        },
        8
      );

      allocations.database = await manager.allocateResource(dbRequest);

      if (allocations.database.success) {
        (globalThis as any).console?.log(`  ✅ Database: ${allocations.database.resource!.name}`);
      } else {
        (globalThis as any).console?.log(`  ❌ Database allocation failed: ${allocations.database.error}`);
      }
    }

    allocationResults.set(service.id, allocations);
  }

  (globalThis as any).console?.log('\n📊 Current Resource Status:');

  for (const pool of manager.getAllPools()) {
    (globalThis as any).console?.log(`\n${pool.name}:`);
    (globalThis as any).console?.log(`  Total: ${pool.currentSize}/${pool.maxSize}`);
    (globalThis as any).console?.log(`  Available: ${pool.available.length}`);
    (globalThis as any).console?.log(`  Allocated: ${pool.allocated.length}`);
    (globalThis as any).console?.log(`  Utilization: ${((pool.allocated.length / pool.currentSize) * 100).toFixed(1)}%`);
  }

  (globalThis as any).console?.log('\n⏱️  Waiting for some allocations to expire...');
  await new Promise(resolve => (globalThis as any).setTimeout(resolve, 25000));

  (globalThis as any).console?.log('\n🔄 Checking resource status after expiration...');

  const metrics = manager.getMetrics();
  (globalThis as any).console?.log('\n📈 Performance Metrics:');
  (globalThis as any).console?.log(`  Total Allocations: ${metrics.totalAllocations}`);
  (globalThis as any).console?.log(`  Successful: ${metrics.successfulAllocations} (${((metrics.successfulAllocations / metrics.totalAllocations) * 100).toFixed(1)}%)`);
  (globalThis as any).console?.log(`  Failed: ${metrics.failedAllocations}`);
  (globalThis as any).console?.log(`  Average Allocation Time: ${metrics.averageAllocationTime.toFixed(2)}ms`);
  (globalThis as any).console?.log(`  Pool Utilization: ${metrics.poolUtilization.toFixed(1)}%`);
  (globalThis as any).console?.log(`  Average Usage Duration: ${ResourceHelpers.formatDuration(metrics.averageUsageDuration)}`);

  if (metrics.hotspots.length > 0) {
    (globalThis as any).console?.log('\n🔥 Resource Hotspots (Most Used):');
    metrics.hotspots.slice(0, 5).forEach((resourceId, index) => {
      const resource = manager.getResource(resourceId);
      if (resource) {
        (globalThis as any).console?.log(`  ${index + 1}. ${resource.name} (${resource.allocation.usageCount} uses)`);
      }
    });
  }

  (globalThis as any).console?.log('\n🔧 Running Resource Optimization...');
  manager.optimizeAllocation();

  (globalThis as any).console?.log('\n📋 Generating Resource Report...');
  const allResources = manager.getAllPools()
    .flatMap(pool => Array.from(pool.resources.values()));

  const analysis = ResourceHelpers.analyzeResourceUsagePattern(allResources);
  (globalThis as any).console?.log(`\n📊 Usage Analysis:`);
  (globalThis as any).console?.log(`  Peak Usage: ${analysis.peakUsage}`);
  (globalThis as any).console?.log(`  Average Usage: ${analysis.averageUsage.toFixed(1)}`);
  (globalThis as any).console?.log(`  Utilization Rate: ${analysis.utilizationRate.toFixed(1)}%`);

  if (analysis.mostUsedResources.length > 0) {
    (globalThis as any).console?.log(`\n🏆 Most Used Resources:`);
    analysis.mostUsedResources.slice(0, 3).forEach((resource, index) => {
      (globalThis as any).console?.log(`  ${index + 1}. ${resource.name} (${resource.allocation.usageCount} uses)`);
    });
  }

  const optimization = ResourceHelpers.optimizeResourceAllocation(allResources);

  if (optimization.recommendations.length > 0) {
    (globalThis as any).console?.log(`\n💡 Optimization Recommendations:`);
    optimization.recommendations.forEach(rec => {
      (globalThis as any).console?.log(`  • ${rec}`);
    });
  }

  if (optimization.potentialSavings > 0) {
    (globalThis as any).console?.log(`  💰 Potential Savings: $${optimization.potentialSavings.toFixed(2)} per day`);
  }

  (globalThis as any).console?.log('\n🧹 Cleaning up remaining allocations...');

  for (const [serviceId, allocations] of allocationResults) {
    const serviceResources = manager.getResourcesByUser(serviceId);
    for (const resource of serviceResources) {
      const deallocated = manager.deallocateResource(resource.id, serviceId);
      if (deallocated) {
        (globalThis as any).console?.log(`  ✅ Deallocated ${resource.name} from ${serviceId}`);
      }
    }
  }

  manager.stop();

  (globalThis as any).console?.log('\n📊 Final Statistics:');
  const finalMetrics = manager.getMetrics();
  (globalThis as any).console?.log(`  Total Resource Operations: ${finalMetrics.totalAllocations}`);
  (globalThis as any).console?.log(`  Success Rate: ${((finalMetrics.successfulAllocations / finalMetrics.totalAllocations) * 100).toFixed(2)}%`);

  const finalPools = manager.getAllPools();
  const totalResources = finalPools.reduce((sum, pool) => sum + pool.currentSize, 0);
  const availableResources = finalPools.reduce((sum, pool) => sum + pool.available.length, 0);

  (globalThis as any).console?.log(`  Resources Available: ${availableResources}/${totalResources}`);

  const report = ResourceHelpers.generateResourceReport(allResources, finalMetrics);
  (globalThis as any).console?.log('\n📄 Resource Management Report Summary:');
  (globalThis as any).console?.log(report.split('\n').slice(0, 15).join('\n'));

  (globalThis as any).console?.log('\n✨ Basic Resource Management Example completed!');
  (globalThis as any).console?.log('This example demonstrated:');
  (globalThis as any).console?.log('  • Resource pool creation and management');
  (globalThis as any).console?.log('  • Multiple allocation strategies');
  (globalThis as any).console?.log('  • Concurrent resource allocation');
  (globalThis as any).console?.log('  • Resource sharing and time-based expiration');
  (globalThis as any).console?.log('  • Performance monitoring and metrics');
  (globalThis as any).console?.log('  • Automatic optimization and recommendations');
}

if (require.main === module) {
  runBasicResourceExample().catch((globalThis as any).console?.error);
}

export { runBasicResourceExample };