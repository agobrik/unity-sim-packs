import {
  ResourceManager,
  DependencyResolver,
  ResourceHelpers,
  ResourceType,
  AllocationStrategy,
  ResourceConfig
} from '@steam-sim/resources';

async function runDependencyManagementExample() {
  (globalThis as any).console?.log('🔗 Starting Dependency Management Example');

  const config: ResourceConfig = {
    maxPoolSize: 30,
    allocationStrategy: AllocationStrategy.PRIORITY_BASED,
    recyclingEnabled: true,
    performanceMonitoring: true,
    dependencyResolution: true
  };

  const manager = new ResourceManager(config);
  const resolver = new DependencyResolver();

  resolver.on('dependencies_resolved', (data) => {
    (globalThis as any).console?.log(`📋 Dependencies resolved in order: ${data.order.join(' → ')}`);
    if (data.cycles.length > 0) {
      (globalThis as any).console?.log(`⚠️  Cyclic dependencies detected: ${data.cycles.join(', ')}`);
    }
  });

  resolver.on('cycle_detected', (data) => {
    (globalThis as any).console?.log(`🔄 Circular dependency detected: ${data.path.join(' → ')}`);
  });

  (globalThis as any).console?.log('\n🏗️  Creating Application Infrastructure...');

  const infrastructurePool = manager.createPool(
    'infrastructure',
    'Infrastructure Components',
    ResourceType.CUSTOM,
    'infrastructure',
    20
  );

  const applicationPool = manager.createPool(
    'applications',
    'Application Services',
    ResourceType.CUSTOM,
    'application',
    15
  );

  (globalThis as any).console?.log('\n🧱 Setting up Base Infrastructure Components...');

  const database = ResourceHelpers.createResource(
    'primary-database',
    ResourceType.CUSTOM,
    'Primary Database Server',
    'infrastructure',
    {
      size: 1000000,
      priority: 10,
      maxConcurrentUsers: 50,
      shareable: true,
      attributes: {
        type: 'PostgreSQL',
        version: '14.0',
        port: 5432
      }
    }
  );

  const messageQueue = ResourceHelpers.createResource(
    'message-queue',
    ResourceType.CUSTOM,
    'Message Queue Service',
    'infrastructure',
    {
      size: 100000,
      priority: 9,
      maxConcurrentUsers: 100,
      shareable: true,
      attributes: {
        type: 'RabbitMQ',
        port: 5672
      }
    }
  );

  const redis = ResourceHelpers.createResource(
    'redis-cache',
    ResourceType.CUSTOM,
    'Redis Cache Server',
    'infrastructure',
    {
      size: 50000,
      priority: 8,
      maxConcurrentUsers: 200,
      shareable: true,
      attributes: {
        type: 'Redis',
        port: 6379
      }
    }
  );

  const loadBalancer = ResourceHelpers.createResource(
    'load-balancer',
    ResourceType.CUSTOM,
    'Load Balancer',
    'infrastructure',
    {
      size: 10000,
      priority: 9,
      maxConcurrentUsers: 1000,
      shareable: true,
      attributes: {
        type: 'Nginx',
        port: 80
      }
    }
  );

  [database, messageQueue, redis, loadBalancer].forEach(resource => {
    manager.addResource(infrastructurePool.id, resource);
    resolver.addResource(resource);
  });

  (globalThis as any).console?.log('\n📱 Setting up Application Services with Dependencies...');

  const authService = ResourceHelpers.createResource(
    'auth-service',
    ResourceType.CUSTOM,
    'Authentication Service',
    'application',
    {
      size: 20000,
      priority: 8,
      maxConcurrentUsers: 10,
      attributes: {
        port: 3001,
        language: 'Node.js'
      }
    }
  );
  authService.dependencies = ['primary-database', 'redis-cache'];

  const userService = ResourceHelpers.createResource(
    'user-service',
    ResourceType.CUSTOM,
    'User Management Service',
    'application',
    {
      size: 30000,
      priority: 7,
      maxConcurrentUsers: 15,
      attributes: {
        port: 3002,
        language: 'Node.js'
      }
    }
  );
  userService.dependencies = ['primary-database', 'auth-service'];

  const orderService = ResourceHelpers.createResource(
    'order-service',
    ResourceType.CUSTOM,
    'Order Processing Service',
    'application',
    {
      size: 40000,
      priority: 7,
      maxConcurrentUsers: 20,
      attributes: {
        port: 3003,
        language: 'Java'
      }
    }
  );
  orderService.dependencies = ['primary-database', 'message-queue', 'user-service'];

  const paymentService = ResourceHelpers.createResource(
    'payment-service',
    ResourceType.CUSTOM,
    'Payment Processing Service',
    'application',
    {
      size: 35000,
      priority: 9,
      maxConcurrentUsers: 10,
      attributes: {
        port: 3004,
        language: 'Python'
      }
    }
  );
  paymentService.dependencies = ['primary-database', 'auth-service'];

  const notificationService = ResourceHelpers.createResource(
    'notification-service',
    ResourceType.CUSTOM,
    'Notification Service',
    'application',
    {
      size: 15000,
      priority: 5,
      maxConcurrentUsers: 30,
      attributes: {
        port: 3005,
        language: 'Go'
      }
    }
  );
  notificationService.dependencies = ['message-queue', 'user-service'];

  const apiGateway = ResourceHelpers.createResource(
    'api-gateway',
    ResourceType.CUSTOM,
    'API Gateway',
    'application',
    {
      size: 25000,
      priority: 8,
      maxConcurrentUsers: 100,
      attributes: {
        port: 3000,
        language: 'Node.js'
      }
    }
  );
  apiGateway.dependencies = ['load-balancer', 'auth-service', 'user-service', 'order-service', 'payment-service'];

  const webApp = ResourceHelpers.createResource(
    'web-application',
    ResourceType.CUSTOM,
    'Web Frontend Application',
    'application',
    {
      size: 50000,
      priority: 6,
      maxConcurrentUsers: 500,
      attributes: {
        port: 8080,
        language: 'React'
      }
    }
  );
  webApp.dependencies = ['api-gateway'];

  const applications = [authService, userService, orderService, paymentService, notificationService, apiGateway, webApp];

  applications.forEach(app => {
    manager.addResource(applicationPool.id, app);
    resolver.addResource(app);
  });

  (globalThis as any).console?.log('\n🔍 Analyzing Dependency Graph...');

  const allocationOrder = resolver.resolveDependencies();

  (globalThis as any).console?.log('\n📋 Dependency Chain Analysis:');
  applications.forEach(app => {
    const chain = resolver.getDependencyChain(app.id);
    (globalThis as any).console?.log(`${app.name}:`);
    (globalThis as any).console?.log(`  Dependencies: ${chain.slice(0, -1).join(' → ')} → ${app.name}`);

    const directDeps = resolver.getDependencies(app.id);
    if (directDeps.length > 0) {
      (globalThis as any).console?.log(`  Direct Dependencies: ${directDeps.join(', ')}`);
    }

    const dependents = resolver.getDependents(app.id);
    if (dependents.length > 0) {
      (globalThis as any).console?.log(`  Used By: ${dependents.join(', ')}`);
    }
    (globalThis as any).console?.log('');
  });

  (globalThis as any).console?.log('\n✅ Validating Dependency Configuration...');
  const validation = resolver.validateDependencies();

  if (validation.valid) {
    (globalThis as any).console?.log('✅ All dependencies are valid');
  } else {
    (globalThis as any).console?.log('❌ Dependency validation issues found:');
    validation.issues.forEach(issue => (globalThis as any).console?.log(`  • ${issue}`));
  }

  (globalThis as any).console?.log('\n🚀 Starting Systematic Service Deployment...');

  manager.start();

  const deploymentResults = new Map();

  for (const resourceId of allocationOrder) {
    const resource = manager.getResource(resourceId);
    if (!resource) continue;

    (globalThis as any).console?.log(`\n⚡ Deploying ${resource.name}...`);

    const canAllocate = resolver.canAllocate(resourceId);
    (globalThis as any).console?.log(`  Dependency Check: ${canAllocate ? '✅ Ready' : '❌ Dependencies not met'}`);

    if (canAllocate) {
      const request = ResourceHelpers.createAllocationRequest(
        'deployment-system',
        ResourceType.CUSTOM,
        {
          duration: 300000 + Math.random() * 300000,
          exclusive: false
        },
        resource.properties.priority
      );

      const result = await manager.allocateResource(request);

      if (result.success) {
        (globalThis as any).console?.log(`  ✅ Successfully deployed ${resource.name}`);
        deploymentResults.set(resourceId, result);

        if (resource.properties.attributes.port) {
          (globalThis as any).console?.log(`  🌐 Service available on port ${resource.properties.attributes.port}`);
        }
      } else {
        (globalThis as any).console?.log(`  ❌ Deployment failed: ${result.error}`);
      }
    } else {
      (globalThis as any).console?.log(`  ⏸️  Skipping ${resource.name} - dependencies not ready`);
    }

    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 200));
  }

  (globalThis as any).console?.log('\n📊 Deployment Status Summary:');

  const deployedServices = Array.from(deploymentResults.keys());
  const totalServices = applications.length;

  (globalThis as any).console?.log(`Deployed Services: ${deployedServices.length}/${totalServices}`);

  (globalThis as any).console?.log('\n🏗️  Infrastructure Status:');
  ['primary-database', 'message-queue', 'redis-cache', 'load-balancer'].forEach(id => {
    const resource = manager.getResource(id);
    if (resource) {
      const allocated = resource.allocation.allocatedTo.length > 0;
      (globalThis as any).console?.log(`  ${resource.name}: ${allocated ? '🟢 Active' : '⚪ Standby'} (${resource.allocation.allocatedTo.length} connections)`);
    }
  });

  (globalThis as any).console?.log('\n📱 Application Services Status:');
  applications.forEach(app => {
    const allocated = app.allocation.allocatedTo.length > 0;
    const status = allocated ? '🟢 Running' : '🔴 Stopped';
    (globalThis as any).console?.log(`  ${app.name}: ${status}`);

    if (allocated && app.dependencies.length > 0) {
      const readyDeps = app.dependencies.filter(depId => {
        const dep = manager.getResource(depId);
        return dep && dep.allocation.allocatedTo.length > 0;
      });
      (globalThis as any).console?.log(`    Dependencies Ready: ${readyDeps.length}/${app.dependencies.length}`);
    }
  });

  (globalThis as any).console?.log('\n🔧 Testing Dependency Resolution Edge Cases...');

  (globalThis as any).console?.log('\n1. Testing Circular Dependency Detection:');
  const tempService1 = ResourceHelpers.createResource('temp1', ResourceType.CUSTOM, 'Temp Service 1', 'test');
  const tempService2 = ResourceHelpers.createResource('temp2', ResourceType.CUSTOM, 'Temp Service 2', 'test');

  tempService1.dependencies = ['temp2'];
  tempService2.dependencies = ['temp1'];

  const tempResolver = new DependencyResolver();
  tempResolver.addResource(tempService1);
  tempResolver.addResource(tempService2);

  tempResolver.resolveDependencies();
  const cyclicNodes = tempResolver.getCyclicNodes();

  if (cyclicNodes.length > 0) {
    (globalThis as any).console?.log(`  ✅ Circular dependency correctly detected: ${cyclicNodes.join(', ')}`);
  }

  (globalThis as any).console?.log('\n2. Testing Dependency Optimization:');
  resolver.optimizeDependencies();
  (globalThis as any).console?.log('  ✅ Dependency graph optimized');

  (globalThis as any).console?.log('\n⏱️  Simulating Runtime Service Interactions...');

  await new Promise(resolve => (globalThis as any).setTimeout(resolve, 3000));

  const metrics = manager.getMetrics();
  (globalThis as any).console?.log('\n📈 Runtime Metrics:');
  (globalThis as any).console?.log(`  Total Allocations: ${metrics.totalAllocations}`);
  (globalThis as any).console?.log(`  Success Rate: ${((metrics.successfulAllocations / metrics.totalAllocations) * 100).toFixed(1)}%`);
  (globalThis as any).console?.log(`  Pool Utilization: ${metrics.poolUtilization.toFixed(1)}%`);

  (globalThis as any).console?.log('\n🔄 Testing Service Restart Scenario...');

  const criticalServices = ['auth-service', 'payment-service'];
  for (const serviceId of criticalServices) {
    (globalThis as any).console?.log(`\n🔄 Restarting ${serviceId}...`);

    const result = manager.deallocateResource(serviceId, 'deployment-system');
    if (result) {
      (globalThis as any).console?.log(`  ⏹️  Service stopped`);

      await new Promise(resolve => (globalThis as any).setTimeout(resolve, 500));

      if (resolver.canAllocate(serviceId)) {
        const request = ResourceHelpers.createAllocationRequest(
          'deployment-system',
          ResourceType.CUSTOM,
          { duration: 300000 },
          8
        );

        const restartResult = await manager.allocateResource(request);
        if (restartResult.success) {
          (globalThis as any).console?.log(`  ✅ Service restarted successfully`);
        }
      } else {
        (globalThis as any).console?.log(`  ❌ Cannot restart - dependencies not available`);
      }
    }
  }

  (globalThis as any).console?.log('\n🧹 Graceful Shutdown Sequence...');

  const shutdownOrder = [...allocationOrder].reverse();
  (globalThis as any).console?.log(`Shutdown order: ${shutdownOrder.join(' → ')}`);

  for (const resourceId of shutdownOrder) {
    const resource = manager.getResource(resourceId);
    if (resource && resource.allocation.allocatedTo.length > 0) {
      const stopped = manager.deallocateResource(resourceId, 'deployment-system');
      if (stopped) {
        (globalThis as any).console?.log(`  ⏹️  Stopped ${resource.name}`);
      }
      await new Promise(resolve => (globalThis as any).setTimeout(resolve, 100));
    }
  }

  manager.stop();

  (globalThis as any).console?.log('\n📊 Final Dependency Analysis Report:');

  const graph = resolver.getGraph();
  (globalThis as any).console?.log(`  Total Resources: ${graph.nodes.size}`);
  (globalThis as any).console?.log(`  Dependency Edges: ${graph.edges.length}`);
  (globalThis as any).console?.log(`  Resolution Order Length: ${graph.resolutionOrder.length}`);

  const complexityMetrics = {
    maxDependencies: Math.max(...Array.from(graph.nodes.values()).map(n => n.dependencies.length)),
    maxDependents: Math.max(...Array.from(graph.nodes.values()).map(n => n.dependents.length)),
    avgDependencies: Array.from(graph.nodes.values()).reduce((sum, n) => sum + n.dependencies.length, 0) / graph.nodes.size
  };

  (globalThis as any).console?.log(`  Max Dependencies per Resource: ${complexityMetrics.maxDependencies}`);
  (globalThis as any).console?.log(`  Max Dependents per Resource: ${complexityMetrics.maxDependents}`);
  (globalThis as any).console?.log(`  Average Dependencies: ${complexityMetrics.avgDependencies.toFixed(1)}`);

  const finalMetrics = manager.getMetrics();
  (globalThis as any).console?.log(`\n📈 Final Performance Summary:`);
  (globalThis as any).console?.log(`  Total Operations: ${finalMetrics.totalAllocations}`);
  (globalThis as any).console?.log(`  Success Rate: ${((finalMetrics.successfulAllocations / finalMetrics.totalAllocations) * 100).toFixed(2)}%`);

  (globalThis as any).console?.log('\n✨ Dependency Management Example completed!');
  (globalThis as any).console?.log('This example demonstrated:');
  (globalThis as any).console?.log('  • Complex dependency graph creation and resolution');
  (globalThis as any).console?.log('  • Topological sorting for deployment order');
  (globalThis as any).console?.log('  • Circular dependency detection');
  (globalThis as any).console?.log('  • Dependency validation and optimization');
  (globalThis as any).console?.log('  • Systematic service deployment based on dependencies');
  (globalThis as any).console?.log('  • Runtime dependency management');
  (globalThis as any).console?.log('  • Graceful shutdown in reverse dependency order');
}

if (require.main === module) {
  runDependencyManagementExample().catch((globalThis as any).console?.error);
}

export { runDependencyManagementExample };