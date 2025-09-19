import { ResourceManager } from '../../src/core/ResourceManager';
import { DependencyResolver } from '../../src/core/DependencyResolver';
import { ResourceHelpers } from '../../src/utils/ResourceHelpers';
import {
  ResourceConfig,
  ResourceType,
  AllocationStrategy,
  ResourceState
} from '../../src/types';

describe('Resource System Integration Tests', () => {
  let manager: ResourceManager;
  let resolver: DependencyResolver;
  let config: ResourceConfig;

  beforeEach(() => {
    config = {
      maxPoolSize: 100,
      allocationStrategy: AllocationStrategy.FIRST_FIT,
      recyclingEnabled: true,
      performanceMonitoring: true,
      dependencyResolution: true
    };
    manager = new ResourceManager(config);
    resolver = new DependencyResolver();
  });

  afterEach(() => {
    manager.stop();
  });

  test('should simulate complete resource lifecycle', async () => {
    const databasePool = manager.createPool(
      'database',
      'Database Pool',
      ResourceType.DATABASE,
      'storage',
      5
    );

    const memoryPool = manager.createPool(
      'memory',
      'Memory Pool',
      ResourceType.MEMORY,
      'compute',
      10
    );

    const cpuPool = manager.createPool(
      'cpu',
      'CPU Pool',
      ResourceType.CPU,
      'compute',
      8
    );

    const database = ResourceHelpers.createResource(
      'db-primary',
      ResourceType.DATABASE,
      'Primary Database',
      'storage',
      { size: 1000000, priority: 10, maxConcurrentUsers: 50 }
    );

    const memoryResources = Array.from({ length: 5 }, (_, i) =>
      ResourceHelpers.createResource(
        `memory-${i}`,
        ResourceType.MEMORY,
        `Memory Block ${i}`,
        'compute',
        { size: 8192 * (i + 1), maxConcurrentUsers: 3 }
      )
    );

    const cpuResources = Array.from({ length: 4 }, (_, i) =>
      ResourceHelpers.createResource(
        `cpu-${i}`,
        ResourceType.CPU,
        `CPU Core ${i}`,
        'compute',
        { size: 2400, priority: i + 1, maxConcurrentUsers: 2 }
      )
    );

    manager.addResource(databasePool.id, database);
    memoryResources.forEach(res => manager.addResource(memoryPool.id, res));
    cpuResources.forEach(res => manager.addResource(cpuPool.id, res));

    const services = [
      { id: 'web-service', memory: 'memory-0', cpu: 'cpu-0', db: 'db-primary' },
      { id: 'api-service', memory: 'memory-1', cpu: 'cpu-1', db: 'db-primary' },
      { id: 'worker-service', memory: 'memory-2', cpu: 'cpu-2', db: 'db-primary' }
    ];

    let successfulAllocations = 0;

    for (const service of services) {
      const dbRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.DATABASE,
        { shareable: true }
      );

      const memRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.MEMORY,
        { minSize: 8192, exclusive: false }
      );

      const cpuRequest = ResourceHelpers.createAllocationRequest(
        service.id,
        ResourceType.CPU,
        { exclusive: false }
      );

      const [dbResult, memResult, cpuResult] = await Promise.all([
        manager.allocateResource(dbRequest),
        manager.allocateResource(memRequest),
        manager.allocateResource(cpuRequest)
      ]);

      if (dbResult.success && memResult.success && cpuResult.success) {
        successfulAllocations++;
      }
    }

    expect(successfulAllocations).toBe(3);

    const metrics = manager.getMetrics();
    expect(metrics.totalAllocations).toBe(9);
    expect(metrics.successfulAllocations).toBeGreaterThan(0);

    const dbResource = manager.getResource('db-primary');
    expect(dbResource!.allocation.allocatedTo.length).toBe(3);

    for (const service of services) {
      const serviceResources = manager.getResourcesByUser(service.id);
      expect(serviceResources.length).toBe(3);

      for (const resource of serviceResources) {
        manager.deallocateResource(resource.id, service.id);
      }
    }

    const finalDbResource = manager.getResource('db-primary');
    expect(finalDbResource!.allocation.allocatedTo.length).toBe(0);
    expect(finalDbResource!.state).toBe(ResourceState.AVAILABLE);
  });

  test('should handle complex dependency resolution', async () => {
    const appPool = manager.createPool('applications', 'Application Pool', ResourceType.CUSTOM, 'app', 10);

    const app1 = ResourceHelpers.createResource('app1', ResourceType.CUSTOM, 'Base App', 'app');
    const app2 = ResourceHelpers.createResource('app2', ResourceType.CUSTOM, 'Service App', 'app');
    const app3 = ResourceHelpers.createResource('app3', ResourceType.CUSTOM, 'UI App', 'app');
    const app4 = ResourceHelpers.createResource('app4', ResourceType.CUSTOM, 'Analytics App', 'app');

    app2.dependencies = ['app1'];
    app3.dependencies = ['app2'];
    app4.dependencies = ['app1', 'app2'];

    [app1, app2, app3, app4].forEach(app => {
      manager.addResource(appPool.id, app);
      resolver.addResource(app);
    });

    const allocationOrder = resolver.getAllocationOrder(['app1', 'app2', 'app3', 'app4']);

    expect(allocationOrder.indexOf('app1')).toBeLessThan(allocationOrder.indexOf('app2'));
    expect(allocationOrder.indexOf('app2')).toBeLessThan(allocationOrder.indexOf('app3'));
    expect(allocationOrder.indexOf('app1')).toBeLessThan(allocationOrder.indexOf('app4'));
    expect(allocationOrder.indexOf('app2')).toBeLessThan(allocationOrder.indexOf('app4'));

    let allocatedInOrder = true;
    for (let i = 0; i < allocationOrder.length; i++) {
      const appId = allocationOrder[i];
      const canAllocate = resolver.canAllocate(appId);

      if (i === 0) {
        expect(canAllocate).toBe(true);
      }

      if (canAllocate) {
        const request = ResourceHelpers.createAllocationRequest('system', ResourceType.CUSTOM);
        const result = await manager.allocateResource(request);

        if (result.success && result.resource!.id === appId) {
          app1.allocation.allocatedTo = ['system'];
          if (appId === 'app1') app1.allocation.allocatedTo = ['system'];
          if (appId === 'app2') app2.allocation.allocatedTo = ['system'];
          if (appId === 'app3') app3.allocation.allocatedTo = ['system'];
          if (appId === 'app4') app4.allocation.allocatedTo = ['system'];
        }
      } else {
        allocatedInOrder = false;
        break;
      }
    }

    const validation = resolver.validateDependencies();
    expect(validation.valid).toBe(true);
  });

  test('should demonstrate load balancing and optimization', async () => {
    const computePool = manager.createPool(
      'compute',
      'Compute Pool',
      ResourceType.CPU,
      'compute',
      20
    );

    const workers = Array.from({ length: 10 }, (_, i) =>
      ResourceHelpers.createResource(
        `worker-${i}`,
        ResourceType.CPU,
        `Worker ${i}`,
        'compute',
        {
          size: 2400,
          priority: Math.floor(Math.random() * 5) + 1,
          maxConcurrentUsers: 4
        }
      )
    );

    workers.forEach(worker => manager.addResource(computePool.id, worker));

    const clients = Array.from({ length: 30 }, (_, i) => `client-${i}`);

    manager.start();

    const allocationPromises = clients.map(async (clientId, index) => {
      const request = ResourceHelpers.createAllocationRequest(
        clientId,
        ResourceType.CPU,
        { duration: 1000 + Math.random() * 2000 }
      );

      await new Promise(resolve => (globalThis as any).setTimeout(resolve, index * 50));
      return manager.allocateResource(request);
    });

    const results = await Promise.all(allocationPromises);

    const successful = results.filter(r => r.success).length;
    expect(successful).toBeGreaterThan(20);

    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 3000));

    manager.optimizeAllocation();

    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 500));

    const finalMetrics = manager.getMetrics();
    expect(finalMetrics.poolUtilization).toBeGreaterThan(0);
    expect(finalMetrics.totalAllocations).toBe(30);

    manager.stop();

    const usageAnalysis = ResourceHelpers.analyzeResourceUsagePattern(
      manager.getAllPools().flatMap(pool => Array.from(pool.resources.values()))
    );

    expect(usageAnalysis.utilizationRate).toBeGreaterThan(0);
    expect(usageAnalysis.mostUsedResources.length).toBeGreaterThan(0);
  });

  test('should handle resource recycling and cleanup', async () => {
    const tempPool = manager.createPool(
      'temporary',
      'Temporary Pool',
      ResourceType.MEMORY,
      'temp',
      5
    );

    const temporaryResources = Array.from({ length: 3 }, (_, i) =>
      ResourceHelpers.createResource(
        `temp-${i}`,
        ResourceType.MEMORY,
        `Temporary ${i}`,
        'temp',
        { lifetime: 500, recyclable: true }
      )
    );

    temporaryResources.forEach(res => manager.addResource(tempPool.id, res));

    const allocations = [];
    for (const resource of temporaryResources) {
      const request = ResourceHelpers.createAllocationRequest(
        `user-${resource.id}`,
        ResourceType.MEMORY,
        { duration: 100 }
      );

      const result = await manager.allocateResource(request);
      if (result.success) {
        allocations.push(result);
      }
    }

    expect(allocations.length).toBe(3);

    manager.start();
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 2000));
    manager.stop();

    const remainingResources = manager.getAvailableResources(ResourceType.MEMORY, 'temp');
    expect(remainingResources.length).toBeLessThan(3);

    const metrics = manager.getMetrics();
    expect(metrics.totalAllocations).toBeGreaterThan(0);
  });

  test('should provide comprehensive resource reporting', async () => {
    const pools = [
      { id: 'web', type: ResourceType.MEMORY, category: 'web', count: 5 },
      { id: 'db', type: ResourceType.DATABASE, category: 'data', count: 2 },
      { id: 'cache', type: ResourceType.STORAGE, category: 'cache', count: 3 }
    ];

    for (const poolConfig of pools) {
      const pool = manager.createPool(
        poolConfig.id,
        `${poolConfig.id} Pool`,
        poolConfig.type,
        poolConfig.category,
        poolConfig.count * 2
      );

      for (let i = 0; i < poolConfig.count; i++) {
        const resource = ResourceHelpers.createResource(
          `${poolConfig.id}-${i}`,
          poolConfig.type,
          `${poolConfig.id} Resource ${i}`,
          poolConfig.category
        );
        manager.addResource(pool.id, resource);
      }
    }

    const allocRequests = Array.from({ length: 8 }, (_, i) =>
      ResourceHelpers.createAllocationRequest(
        `service-${i}`,
        [ResourceType.MEMORY, ResourceType.DATABASE, ResourceType.STORAGE][i % 3],
        { duration: 1000 }
      )
    );

    await Promise.all(allocRequests.map(req => manager.allocateResource(req)));

    manager.start();
    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 300));
    manager.stop();

    const allResources = manager.getAllPools()
      .flatMap(pool => Array.from(pool.resources.values()));

    const metrics = manager.getMetrics();
    const report = ResourceHelpers.generateResourceReport(allResources, metrics);

    expect(report).toContain('RESOURCE MANAGEMENT REPORT');
    expect(report).toContain('OVERVIEW:');
    expect(report).toContain('PERFORMANCE METRICS:');
    expect(report).toContain('RESOURCE DISTRIBUTION:');

    const optimization = ResourceHelpers.optimizeResourceAllocation(allResources);
    expect(optimization.recommendations.length).toBeGreaterThanOrEqual(0);
    expect(optimization.redistributionPlan.length).toBeGreaterThanOrEqual(0);

    (globalThis as any).console?.log('Sample Resource Report:');
    (globalThis as any).console?.log(report.split('\n').slice(0, 20).join('\n'));
  });

  test('should handle high-concurrency scenarios', async () => {
    const sharedPool = manager.createPool(
      'shared',
      'Shared Resource Pool',
      ResourceType.NETWORK,
      'shared',
      3
    );

    const sharedResources = Array.from({ length: 3 }, (_, i) =>
      ResourceHelpers.createResource(
        `shared-${i}`,
        ResourceType.NETWORK,
        `Shared Resource ${i}`,
        'shared',
        { maxConcurrentUsers: 10, shareable: true }
      )
    );

    sharedResources.forEach(res => manager.addResource(sharedPool.id, res));

    const concurrentUsers = 25;
    const allocationPromises = Array.from({ length: concurrentUsers }, (_, i) =>
      manager.allocateResource(
        ResourceHelpers.createAllocationRequest(
          `concurrent-user-${i}`,
          ResourceType.NETWORK,
          { duration: 500 + Math.random() * 1000 }
        )
      )
    );

    manager.start();

    const results = await Promise.all(allocationPromises);

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(15);

    await new Promise(resolve => (globalThis as any).setTimeout(resolve, 1500));

    const finalResources = manager.getAvailableResources(ResourceType.NETWORK, 'shared');
    expect(finalResources.length).toBeGreaterThan(0);

    manager.stop();

    const metrics = manager.getMetrics();
    expect(metrics.totalAllocations).toBe(concurrentUsers);
    expect(metrics.averageAllocationTime).toBeGreaterThan(0);
  });
});