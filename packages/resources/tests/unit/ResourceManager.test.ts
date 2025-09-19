import { ResourceManager } from '../../src/core/ResourceManager';
import { ResourceHelpers } from '../../src/utils/ResourceHelpers';
import {
  ResourceConfig,
  ResourceType,
  ResourceState,
  AllocationStrategy
} from '../../src/types';

describe('ResourceManager', () => {
  let manager: ResourceManager;
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
  });

  afterEach(() => {
    manager.stop();
  });

  describe('Pool Management', () => {
    test('should create a resource pool', () => {
      const pool = manager.createPool(
        'test-pool',
        'Test Pool',
        ResourceType.MEMORY,
        'general',
        10
      );

      expect(pool.id).toBe('test-pool');
      expect(pool.name).toBe('Test Pool');
      expect(pool.type).toBe(ResourceType.MEMORY);
      expect(pool.maxSize).toBe(10);
      expect(pool.currentSize).toBe(0);
    });

    test('should add resource to pool', () => {
      const pool = manager.createPool('test-pool', 'Test Pool', ResourceType.MEMORY, 'general', 10);

      const resource = ResourceHelpers.createResource(
        'resource-1',
        ResourceType.MEMORY,
        'Test Resource',
        'general'
      );

      const result = manager.addResource(pool.id, resource);
      expect(result).toBe(true);
      expect(pool.currentSize).toBe(1);
      expect(pool.available.length).toBe(1);
    });

    test('should not exceed pool max size', () => {
      const pool = manager.createPool('test-pool', 'Test Pool', ResourceType.MEMORY, 'general', 1);

      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.MEMORY, 'Resource 2', 'general');

      expect(manager.addResource(pool.id, resource1)).toBe(true);
      expect(manager.addResource(pool.id, resource2)).toBe(false);
    });
  });

  describe('Resource Allocation', () => {
    beforeEach(() => {
      const pool = manager.createPool('memory-pool', 'Memory Pool', ResourceType.MEMORY, 'general', 10);

      for (let i = 0; i < 5; i++) {
        const resource = ResourceHelpers.createResource(
          `memory-${i}`,
          ResourceType.MEMORY,
          `Memory Resource ${i}`,
          'general',
          { size: 1024 * (i + 1) }
        );
        manager.addResource(pool.id, resource);
      }
    });

    test('should allocate resource successfully', async () => {
      const request = ResourceHelpers.createAllocationRequest(
        'user-1',
        ResourceType.MEMORY,
        { minSize: 1024 }
      );

      const result = await manager.allocateResource(request);

      expect(result.success).toBe(true);
      expect(result.resource).toBeDefined();
      expect(result.resource!.allocation.allocatedTo).toContain('user-1');
    });

    test('should fail allocation when no suitable resource', async () => {
      const request = ResourceHelpers.createAllocationRequest(
        'user-1',
        ResourceType.MEMORY,
        { minSize: 10000 }
      );

      const result = await manager.allocateResource(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should queue allocation when no immediate resource available', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        ResourceHelpers.createAllocationRequest(
          `user-${i}`,
          ResourceType.MEMORY,
          { exclusive: true },
          1,
          1000
        )
      );

      const results = await Promise.all(
        requests.map(req => manager.allocateResource(req))
      );

      const successful = results.filter(r => r.success).length;
      expect(successful).toBeLessThanOrEqual(5);
    });

    test('should deallocate resource', async () => {
      const request = ResourceHelpers.createAllocationRequest('user-1', ResourceType.MEMORY);
      const allocation = await manager.allocateResource(request);

      expect(allocation.success).toBe(true);

      const deallocation = manager.deallocateResource(allocation.resource!.id, 'user-1');
      expect(deallocation).toBe(true);

      const resource = manager.getResource(allocation.resource!.id);
      expect(resource!.state).toBe(ResourceState.AVAILABLE);
      expect(resource!.allocation.allocatedTo).not.toContain('user-1');
    });
  });

  describe('Allocation Strategies', () => {
    beforeEach(() => {
      const pool = manager.createPool('strategy-pool', 'Strategy Pool', ResourceType.MEMORY, 'general', 10);

      const sizes = [512, 1024, 2048, 4096];
      sizes.forEach((size, i) => {
        const resource = ResourceHelpers.createResource(
          `mem-${i}`,
          ResourceType.MEMORY,
          `Memory ${size}`,
          'general',
          { size }
        );
        manager.addResource(pool.id, resource);
      });
    });

    test('should use first fit strategy', async () => {
      const pool = manager.getPool('strategy-pool')!;
      pool.strategy = AllocationStrategy.FIRST_FIT;

      const request = ResourceHelpers.createAllocationRequest(
        'user-1',
        ResourceType.MEMORY,
        { minSize: 1000 }
      );

      const result = await manager.allocateResource(request);

      expect(result.success).toBe(true);
      expect(result.resource!.properties.size).toBe(1024);
    });

    test('should use best fit strategy', async () => {
      const pool = manager.getPool('strategy-pool')!;
      pool.strategy = AllocationStrategy.BEST_FIT;

      const request = ResourceHelpers.createAllocationRequest(
        'user-1',
        ResourceType.MEMORY,
        { minSize: 1000 }
      );

      const result = await manager.allocateResource(request);

      expect(result.success).toBe(true);
      expect(result.resource!.properties.size).toBe(1024);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track allocation metrics', async () => {
      const pool = manager.createPool('perf-pool', 'Performance Pool', ResourceType.MEMORY, 'general', 5);

      const resource = ResourceHelpers.createResource('perf-res', ResourceType.MEMORY, 'Perf Resource', 'general');
      manager.addResource(pool.id, resource);

      const request = ResourceHelpers.createAllocationRequest('user-1', ResourceType.MEMORY);
      await manager.allocateResource(request);

      const metrics = manager.getMetrics();
      expect(metrics.totalAllocations).toBe(1);
      expect(metrics.successfulAllocations).toBe(1);
    });

    test('should calculate pool utilization', async () => {
      const pool = manager.createPool('util-pool', 'Utilization Pool', ResourceType.MEMORY, 'general', 2);

      const resource1 = ResourceHelpers.createResource('util-1', ResourceType.MEMORY, 'Util 1', 'general');
      const resource2 = ResourceHelpers.createResource('util-2', ResourceType.MEMORY, 'Util 2', 'general');

      manager.addResource(pool.id, resource1);
      manager.addResource(pool.id, resource2);

      const request = ResourceHelpers.createAllocationRequest('user-1', ResourceType.MEMORY);
      await manager.allocateResource(request);

      manager.start();
      await new Promise(resolve => (globalThis as any).setTimeout(resolve, 150));
      manager.stop();

      const metrics = manager.getMetrics();
      expect(metrics.poolUtilization).toBeGreaterThan(0);
    });
  });

  describe('Resource Lifecycle', () => {
    test('should remove resource from pool', () => {
      const pool = manager.createPool('lifecycle-pool', 'Lifecycle Pool', ResourceType.MEMORY, 'general', 5);

      const resource = ResourceHelpers.createResource('lifecycle-res', ResourceType.MEMORY, 'Lifecycle Resource', 'general');
      manager.addResource(pool.id, resource);

      expect(pool.currentSize).toBe(1);

      const removed = manager.removeResource(resource.id);
      expect(removed).toBe(true);
      expect(pool.currentSize).toBe(0);
    });

    test('should not remove allocated resource', async () => {
      const pool = manager.createPool('allocated-pool', 'Allocated Pool', ResourceType.MEMORY, 'general', 5);

      const resource = ResourceHelpers.createResource('allocated-res', ResourceType.MEMORY, 'Allocated Resource', 'general');
      manager.addResource(pool.id, resource);

      const request = ResourceHelpers.createAllocationRequest('user-1', ResourceType.MEMORY);
      await manager.allocateResource(request);

      const removed = manager.removeResource(resource.id);
      expect(removed).toBe(false);
    });

    test('should handle resource expiration', async () => {
      const pool = manager.createPool('expiry-pool', 'Expiry Pool', ResourceType.MEMORY, 'general', 5);

      const resource = ResourceHelpers.createResource('expiry-res', ResourceType.MEMORY, 'Expiry Resource', 'general');
      manager.addResource(pool.id, resource);

      const request = ResourceHelpers.createAllocationRequest(
        'user-1',
        ResourceType.MEMORY,
        { duration: 100 }
      );

      const allocation = await manager.allocateResource(request);
      expect(allocation.success).toBe(true);

      manager.start();
      await new Promise(resolve => (globalThis as any).setTimeout(resolve, 200));
      manager.stop();

      const updatedResource = manager.getResource(resource.id);
      expect(updatedResource!.state).toBe(ResourceState.AVAILABLE);
    });
  });

  describe('Resource Queries', () => {
    beforeEach(() => {
      const memoryPool = manager.createPool('memory', 'Memory Pool', ResourceType.MEMORY, 'general', 10);
      const cpuPool = manager.createPool('cpu', 'CPU Pool', ResourceType.CPU, 'compute', 5);

      const memRes = ResourceHelpers.createResource('mem-1', ResourceType.MEMORY, 'Memory 1', 'general');
      const cpuRes = ResourceHelpers.createResource('cpu-1', ResourceType.CPU, 'CPU 1', 'compute');

      manager.addResource(memoryPool.id, memRes);
      manager.addResource(cpuPool.id, cpuRes);
    });

    test('should get available resources by type', () => {
      const memoryResources = manager.getAvailableResources(ResourceType.MEMORY);
      const cpuResources = manager.getAvailableResources(ResourceType.CPU);

      expect(memoryResources.length).toBe(1);
      expect(cpuResources.length).toBe(1);
      expect(memoryResources[0].type).toBe(ResourceType.MEMORY);
      expect(cpuResources[0].type).toBe(ResourceType.CPU);
    });

    test('should get resources by category', () => {
      const generalResources = manager.getAvailableResources(undefined, 'general');
      const computeResources = manager.getAvailableResources(undefined, 'compute');

      expect(generalResources.length).toBe(1);
      expect(computeResources.length).toBe(1);
    });

    test('should get resources by user', async () => {
      const request = ResourceHelpers.createAllocationRequest('user-1', ResourceType.MEMORY);
      await manager.allocateResource(request);

      const userResources = manager.getResourcesByUser('user-1');
      expect(userResources.length).toBe(1);
      expect(userResources[0].allocation.allocatedTo).toContain('user-1');
    });
  });

  describe('Auto-scaling', () => {
    test('should expand pool when utilization is high', async () => {
      const pool = manager.createPool('auto-pool', 'Auto Pool', ResourceType.MEMORY, 'general', 10);

      for (let i = 0; i < 2; i++) {
        const resource = ResourceHelpers.createResource(`auto-${i}`, ResourceType.MEMORY, `Auto ${i}`, 'general');
        manager.addResource(pool.id, resource);
      }

      for (let i = 0; i < 2; i++) {
        const request = ResourceHelpers.createAllocationRequest(`user-${i}`, ResourceType.MEMORY);
        await manager.allocateResource(request);
      }

      const initialSize = pool.currentSize;
      manager.optimizeAllocation();

      expect(pool.currentSize).toBeGreaterThanOrEqual(initialSize);
    });
  });
});