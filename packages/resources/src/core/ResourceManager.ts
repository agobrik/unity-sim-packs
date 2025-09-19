import { EventEmitter } from '../utils/EventEmitter';
import {
  Resource,
  ResourcePool,
  AllocationRequest,
  AllocationResult,
  ResourceConfig,
  ResourceType,
  ResourceState,
  AllocationStrategy,
  ResourceEvent,
  ResourceEventType,
  PerformanceMetrics,
  ResourceUsage
} from '../types';

export class ResourceManager extends EventEmitter {
  private pools: Map<string, ResourcePool> = new Map();
  private resources: Map<string, Resource> = new Map();
  private allocationQueue: AllocationRequest[] = [];
  private activeAllocations: Map<string, AllocationResult> = new Map();
  private usageHistory: ResourceUsage[] = [];
  private config: ResourceConfig;
  private metrics: PerformanceMetrics;
  private isRunning: boolean = false;
  private processingTimer?: any;

  constructor(config: ResourceConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalAllocations: 0,
      successfulAllocations: 0,
      failedAllocations: 0,
      averageAllocationTime: 0,
      averageUsageDuration: 0,
      poolUtilization: 0,
      memoryUsage: 0,
      resourceTurnover: 0,
      hotspots: []
    };
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processingTimer = (globalThis as any).setInterval(() => {
      this.processAllocationQueue();
      this.updateMetrics();
      this.cleanupExpiredAllocations();
    }, 100);

    this.emit('manager_started');
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.processingTimer) {
      (globalThis as any).clearInterval(this.processingTimer);
      this.processingTimer = undefined;
    }

    this.emit('manager_stopped');
  }

  public createPool(
    poolId: string,
    name: string,
    type: ResourceType,
    category: string,
    maxSize: number,
    strategy: AllocationStrategy = AllocationStrategy.FIRST_FIT
  ): ResourcePool {
    const pool: ResourcePool = {
      id: poolId,
      name,
      type,
      category,
      resources: new Map(),
      available: [],
      allocated: [],
      reserved: [],
      maxSize,
      currentSize: 0,
      strategy,
      metadata: {}
    };

    this.pools.set(poolId, pool);
    this.emitEvent(ResourceEventType.CREATED, poolId, undefined, { poolCreated: true });
    return pool;
  }

  public addResource(poolId: string, resource: Resource): boolean {
    const pool = this.pools.get(poolId);
    if (!pool) return false;

    if (pool.currentSize >= pool.maxSize) {
      return false;
    }

    pool.resources.set(resource.id, resource);
    pool.available.push(resource.id);
    pool.currentSize++;

    this.resources.set(resource.id, resource);
    this.emitEvent(ResourceEventType.CREATED, resource.id, undefined, { poolId });

    return true;
  }

  public async allocateResource(request: AllocationRequest): Promise<AllocationResult> {
    const startTime = Date.now();
    this.metrics.totalAllocations++;

    const result = await this.processAllocationRequest(request);
    result.waitTime = Date.now() - startTime;

    if (result.success) {
      this.metrics.successfulAllocations++;
      this.activeAllocations.set(result.allocationId, result);
    } else {
      this.metrics.failedAllocations++;
    }

    this.updateAverageAllocationTime(result.waitTime);
    return result;
  }

  private async processAllocationRequest(request: AllocationRequest): Promise<AllocationResult> {
    const suitablePools = this.findSuitablePools(request);

    for (const pool of suitablePools) {
      const resource = this.selectResourceFromPool(pool, request);
      if (resource) {
        const allocated = this.performAllocation(resource, request);
        if (allocated) {
          return {
            success: true,
            resource,
            allocationId: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            waitTime: 0
          };
        }
      }
    }

    if (request.timeout && request.timeout > 0) {
      this.allocationQueue.push(request);
      return new Promise((resolve) => {
        const timeoutId = (globalThis as any).setTimeout(() => {
          this.removeFromQueue(request.id);
          resolve({
            success: false,
            error: 'Allocation timeout',
            allocationId: '',
            waitTime: request.timeout!
          });
        }, request.timeout);

        request.callback = (resource) => {
          (globalThis as any).clearTimeout(timeoutId);
          if (resource) {
            resolve({
              success: true,
              resource,
              allocationId: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              waitTime: Date.now() - request.timestamp
            });
          } else {
            resolve({
              success: false,
              error: 'No suitable resource available',
              allocationId: '',
              waitTime: Date.now() - request.timestamp
            });
          }
        };
      });
    }

    return {
      success: false,
      error: 'No suitable resource available',
      allocationId: '',
      waitTime: 0
    };
  }

  private findSuitablePools(request: AllocationRequest): ResourcePool[] {
    return Array.from(this.pools.values()).filter(pool => {
      if (pool.type !== request.resourceType) return false;
      if (request.category && pool.category !== request.category) return false;
      return pool.available.length > 0;
    });
  }

  private selectResourceFromPool(pool: ResourcePool, request: AllocationRequest): Resource | null {
    const availableResources = pool.available
      .map(id => pool.resources.get(id)!)
      .filter(resource => this.matchesRequirements(resource, request.requirements));

    if (availableResources.length === 0) return null;

    switch (pool.strategy) {
      case AllocationStrategy.FIRST_FIT:
        return availableResources[0];

      case AllocationStrategy.BEST_FIT:
        return availableResources.reduce((best, current) => {
          const bestSize = best.properties.size;
          const currentSize = current.properties.size;
          const requiredSize = request.requirements.minSize || 0;

          if (currentSize >= requiredSize && currentSize < bestSize) {
            return current;
          }
          return best;
        });

      case AllocationStrategy.WORST_FIT:
        return availableResources.reduce((worst, current) => {
          return current.properties.size > worst.properties.size ? current : worst;
        });

      case AllocationStrategy.LEAST_RECENTLY_USED:
        return availableResources.reduce((lru, current) => {
          return current.lastAccessed < lru.lastAccessed ? current : lru;
        });

      case AllocationStrategy.PRIORITY_BASED:
        return availableResources.reduce((highest, current) => {
          return current.properties.priority > highest.properties.priority ? current : highest;
        });

      default:
        return availableResources[0];
    }
  }

  private matchesRequirements(resource: Resource, requirements: any): boolean {
    if (requirements.minSize && resource.properties.size < requirements.minSize) {
      return false;
    }

    if (requirements.maxSize && resource.properties.size > requirements.maxSize) {
      return false;
    }

    if (requirements.exclusive && !this.canAllocateExclusively(resource)) {
      return false;
    }

    if (requirements.attributes) {
      for (const [key, value] of Object.entries(requirements.attributes)) {
        if (resource.properties.attributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private canAllocateExclusively(resource: Resource): boolean {
    return resource.allocation.allocatedTo.length === 0;
  }

  private performAllocation(resource: Resource, request: AllocationRequest): boolean {
    const pool = this.findPoolByResourceId(resource.id);
    if (!pool) return false;

    if (request.requirements.exclusive && resource.allocation.allocatedTo.length > 0) {
      return false;
    }

    if (resource.allocation.allocatedTo.length >= resource.properties.maxConcurrentUsers) {
      return false;
    }

    resource.allocation.allocatedTo.push(request.requesterId);
    resource.allocation.allocatedAt = Date.now();
    resource.allocation.allocatedBy = request.requesterId;
    resource.allocation.usageCount++;
    resource.state = ResourceState.ALLOCATED;
    resource.lastAccessed = Date.now();

    if (request.requirements.duration) {
      resource.allocation.expiresAt = Date.now() + request.requirements.duration;
    }

    const availableIndex = pool.available.indexOf(resource.id);
    if (availableIndex !== -1) {
      pool.available.splice(availableIndex, 1);
    }

    if (!pool.allocated.includes(resource.id)) {
      pool.allocated.push(resource.id);
    }

    this.emitEvent(ResourceEventType.ALLOCATED, resource.id, request.requesterId, {
      poolId: pool.id,
      allocationTime: Date.now()
    });

    return true;
  }

  public deallocateResource(resourceId: string, userId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;

    const pool = this.findPoolByResourceId(resourceId);
    if (!pool) return false;

    const userIndex = resource.allocation.allocatedTo.indexOf(userId);
    if (userIndex === -1) return false;

    resource.allocation.allocatedTo.splice(userIndex, 1);

    if (resource.allocation.allocatedTo.length === 0) {
      resource.state = ResourceState.AVAILABLE;
      resource.allocation.expiresAt = undefined;

      const allocatedIndex = pool.allocated.indexOf(resourceId);
      if (allocatedIndex !== -1) {
        pool.allocated.splice(allocatedIndex, 1);
      }

      if (!pool.available.includes(resourceId)) {
        pool.available.push(resourceId);
      }
    }

    this.recordUsage(resourceId, userId);
    this.emitEvent(ResourceEventType.DEALLOCATED, resourceId, userId, {
      poolId: pool.id,
      deallocationTime: Date.now()
    });

    this.processWaitingRequests();
    return true;
  }

  private recordUsage(resourceId: string, userId: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const usage: ResourceUsage = {
      resourceId,
      userId,
      startTime: resource.allocation.allocatedAt,
      endTime: Date.now(),
      duration: Date.now() - resource.allocation.allocatedAt,
      operations: 1,
      bytesRead: 0,
      bytesWritten: 0,
      peakMemory: resource.properties.size,
      errors: 0
    };

    this.usageHistory.push(usage);

    if (this.usageHistory.length > 10000) {
      this.usageHistory = this.usageHistory.slice(-5000);
    }
  }

  private processAllocationQueue(): void {
    if (this.allocationQueue.length === 0) return;

    const processedRequests: string[] = [];

    for (const request of this.allocationQueue) {
      const suitablePools = this.findSuitablePools(request);

      for (const pool of suitablePools) {
        const resource = this.selectResourceFromPool(pool, request);
        if (resource) {
          const allocated = this.performAllocation(resource, request);
          if (allocated && request.callback) {
            request.callback(resource);
            processedRequests.push(request.id);
            break;
          }
        }
      }
    }

    this.allocationQueue = this.allocationQueue.filter(
      request => !processedRequests.includes(request.id)
    );
  }

  private processWaitingRequests(): void {
    this.processAllocationQueue();
  }

  private removeFromQueue(requestId: string): void {
    this.allocationQueue = this.allocationQueue.filter(req => req.id !== requestId);
  }

  private cleanupExpiredAllocations(): void {
    const now = Date.now();

    for (const resource of this.resources.values()) {
      if (resource.allocation.expiresAt && resource.allocation.expiresAt < now) {
        const usersToRemove = [...resource.allocation.allocatedTo];
        for (const userId of usersToRemove) {
          this.deallocateResource(resource.id, userId);
        }
      }

      if (this.config.recyclingEnabled && this.shouldRecycleResource(resource)) {
        this.recycleResource(resource.id);
      }
    }
  }

  private shouldRecycleResource(resource: Resource): boolean {
    if (!resource.properties.recyclable) return false;
    if (resource.state !== ResourceState.AVAILABLE) return false;

    const idleTime = Date.now() - resource.lastAccessed;
    const maxIdleTime = 5 * 60 * 1000;

    return idleTime > maxIdleTime;
  }

  private recycleResource(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const pool = this.findPoolByResourceId(resourceId);
    if (!pool) return;

    resource.state = ResourceState.RECYCLING;

    (globalThis as any).setTimeout(() => {
      this.removeResource(resourceId);
      this.emitEvent(ResourceEventType.RECYCLED, resourceId, undefined, {
        poolId: pool.id,
        recycledAt: Date.now()
      });
    }, 100);
  }

  public removeResource(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource) return false;

    const pool = this.findPoolByResourceId(resourceId);
    if (!pool) return false;

    if (resource.allocation.allocatedTo.length > 0) {
      return false;
    }

    pool.resources.delete(resourceId);
    pool.currentSize--;

    const availableIndex = pool.available.indexOf(resourceId);
    if (availableIndex !== -1) {
      pool.available.splice(availableIndex, 1);
    }

    const allocatedIndex = pool.allocated.indexOf(resourceId);
    if (allocatedIndex !== -1) {
      pool.allocated.splice(allocatedIndex, 1);
    }

    this.resources.delete(resourceId);
    return true;
  }

  private findPoolByResourceId(resourceId: string): ResourcePool | null {
    for (const pool of this.pools.values()) {
      if (pool.resources.has(resourceId)) {
        return pool;
      }
    }
    return null;
  }

  public getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  public getPool(poolId: string): ResourcePool | undefined {
    return this.pools.get(poolId);
  }

  public getAllPools(): ResourcePool[] {
    return Array.from(this.pools.values());
  }

  public getAvailableResources(type?: ResourceType, category?: string): Resource[] {
    return Array.from(this.resources.values()).filter(resource => {
      if (resource.state !== ResourceState.AVAILABLE) return false;
      if (type && resource.type !== type) return false;
      if (category && resource.category !== category) return false;
      return true;
    });
  }

  public getResourcesByUser(userId: string): Resource[] {
    return Array.from(this.resources.values()).filter(resource =>
      resource.allocation.allocatedTo.includes(userId)
    );
  }

  private updateMetrics(): void {
    const totalResources = this.resources.size;
    const allocatedResources = Array.from(this.resources.values())
      .filter(r => r.state === ResourceState.ALLOCATED).length;

    this.metrics.poolUtilization = totalResources > 0 ? (allocatedResources / totalResources) * 100 : 0;

    const recentUsage = this.usageHistory.slice(-100);
    if (recentUsage.length > 0) {
      const totalDuration = recentUsage.reduce((sum, usage) => sum + (usage.duration || 0), 0);
      this.metrics.averageUsageDuration = totalDuration / recentUsage.length;
    }

    this.updateHotspots();
  }

  private updateHotspots(): void {
    const resourceUsageCounts = new Map<string, number>();

    for (const usage of this.usageHistory.slice(-1000)) {
      const count = resourceUsageCounts.get(usage.resourceId) || 0;
      resourceUsageCounts.set(usage.resourceId, count + 1);
    }

    this.metrics.hotspots = Array.from(resourceUsageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resourceId]) => resourceId);
  }

  private updateAverageAllocationTime(allocationTime: number): void {
    const alpha = 0.1;
    this.metrics.averageAllocationTime =
      this.metrics.averageAllocationTime * (1 - alpha) + allocationTime * alpha;
  }

  private emitEvent(type: ResourceEventType, resourceId: string, userId?: string, data?: any): void {
    const event: ResourceEvent = {
      type,
      resourceId,
      userId,
      timestamp: Date.now(),
      data: data || {}
    };

    this.emit('resource_event', event);
    this.emit(type, event);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getUsageHistory(resourceId?: string, userId?: string): ResourceUsage[] {
    let history = [...this.usageHistory];

    if (resourceId) {
      history = history.filter(usage => usage.resourceId === resourceId);
    }

    if (userId) {
      history = history.filter(usage => usage.userId === userId);
    }

    return history;
  }

  public optimizeAllocation(): void {
    for (const pool of this.pools.values()) {
      this.balancePool(pool);
    }
  }

  private balancePool(pool: ResourcePool): void {
    const utilizationThreshold = 0.8;
    const currentUtilization = pool.allocated.length / pool.currentSize;

    if (currentUtilization > utilizationThreshold && pool.currentSize < pool.maxSize) {
      this.expandPool(pool);
    } else if (currentUtilization < 0.3 && pool.currentSize > 1) {
      this.shrinkPool(pool);
    }
  }

  private expandPool(pool: ResourcePool): void {
    const additionalResources = Math.min(5, pool.maxSize - pool.currentSize);

    for (let i = 0; i < additionalResources; i++) {
      const resource = this.createDefaultResource(pool.type, pool.category);
      this.addResource(pool.id, resource);
    }

    this.emit('pool_expanded', { poolId: pool.id, newSize: pool.currentSize });
  }

  private shrinkPool(pool: ResourcePool): void {
    const resourcesToRemove = Math.min(2, pool.available.length);

    for (let i = 0; i < resourcesToRemove; i++) {
      if (pool.available.length > 0) {
        const resourceId = pool.available[0];
        this.removeResource(resourceId);
      }
    }

    this.emit('pool_shrunk', { poolId: pool.id, newSize: pool.currentSize });
  }

  private createDefaultResource(type: ResourceType, category: string): Resource {
    return {
      id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: `Default ${type} Resource`,
      category,
      properties: {
        size: 1024,
        priority: 1,
        lifetime: 3600000,
        cost: 1,
        recyclable: true,
        shareable: true,
        maxConcurrentUsers: 5,
        attributes: {}
      },
      state: ResourceState.AVAILABLE,
      allocation: {
        allocatedTo: [],
        allocatedAt: 0,
        allocatedBy: '',
        usageCount: 0
      },
      dependencies: [],
      lastAccessed: Date.now(),
      createdAt: Date.now(),
      metadata: {}
    };
  }
}