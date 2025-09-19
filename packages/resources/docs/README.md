# @steam-sim/resources

Efficient resource allocation and management system for simulations with advanced pooling, dependency resolution, and performance optimization.

## Features

- **Resource Pools**: Manage groups of similar resources with different allocation strategies
- **Smart Allocation**: Multiple allocation strategies (First Fit, Best Fit, LRU, Priority-based, Load Balanced)
- **Dependency Resolution**: Automatic dependency tracking and resolution with cycle detection
- **Performance Monitoring**: Real-time metrics and usage analytics
- **Auto-scaling**: Automatic pool expansion and contraction based on usage patterns
- **Resource Recycling**: Automatic cleanup and recycling of unused resources
- **Load Balancing**: Distribute load across resources for optimal utilization
- **Concurrent Access**: Support for shared resources with concurrent user limits
- **Quota Management**: Resource quotas and usage limits per user/service

## Installation

```bash
npm install @steam-sim/resources
```

## Quick Start

```typescript
import { ResourceManager, ResourceHelpers, ResourceType, AllocationStrategy } from '@steam-sim/resources';

// Create resource manager configuration
const config = {
  maxPoolSize: 100,
  allocationStrategy: AllocationStrategy.BEST_FIT,
  recyclingEnabled: true,
  performanceMonitoring: true,
  dependencyResolution: true
};

// Initialize resource manager
const manager = new ResourceManager(config);

// Create a memory pool
const memoryPool = manager.createPool(
  'memory-pool',
  'Application Memory Pool',
  ResourceType.MEMORY,
  'application',
  20,
  AllocationStrategy.BEST_FIT
);

// Add memory resources
for (let i = 0; i < 10; i++) {
  const memory = ResourceHelpers.createResource(
    `memory-${i}`,
    ResourceType.MEMORY,
    `Memory Block ${i}`,
    'application',
    {
      size: 1024 * (i + 1), // Variable sizes
      maxConcurrentUsers: 3,
      recyclable: true
    }
  );

  manager.addResource(memoryPool.id, memory);
}

// Start the resource manager
manager.start();

// Allocate a resource
const request = ResourceHelpers.createAllocationRequest(
  'my-service',
  ResourceType.MEMORY,
  {
    minSize: 2048,
    maxSize: 8192,
    duration: 60000 // 1 minute
  }
);

const allocation = await manager.allocateResource(request);

if (allocation.success) {
  console.log(`Allocated: ${allocation.resource!.name}`);

  // Use the resource...

  // Deallocate when done
  manager.deallocateResource(allocation.resource!.id, 'my-service');
}
```

## Core Concepts

### Resource Pools

Resource pools group similar resources and manage their allocation:

```typescript
const databasePool = manager.createPool(
  'database-pool',
  'Database Connection Pool',
  ResourceType.DATABASE,
  'storage',
  10, // max size
  AllocationStrategy.ROUND_ROBIN
);
```

### Resource Types

The system supports various resource types:

- `MEMORY`: Memory blocks and buffers
- `CPU`: Processing units and cores
- `STORAGE`: Disk space and storage volumes
- `NETWORK`: Network connections and bandwidth
- `DATABASE`: Database connections and instances
- `FILE`: File handles and descriptors
- `CUSTOM`: User-defined resource types

### Allocation Strategies

Choose the best allocation strategy for your use case:

```typescript
// First available resource
AllocationStrategy.FIRST_FIT

// Smallest suitable resource
AllocationStrategy.BEST_FIT

// Largest available resource
AllocationStrategy.WORST_FIT

// Round-robin allocation
AllocationStrategy.ROUND_ROBIN

// Least recently used resource
AllocationStrategy.LEAST_RECENTLY_USED

// Highest priority resource
AllocationStrategy.PRIORITY_BASED

// Load-balanced allocation
AllocationStrategy.LOAD_BALANCED
```

## Advanced Features

### Dependency Resolution

Handle complex resource dependencies:

```typescript
import { DependencyResolver } from '@steam-sim/resources';

const resolver = new DependencyResolver();

// Create resources with dependencies
const database = ResourceHelpers.createResource('db', ResourceType.DATABASE, 'Main DB', 'storage');
const cache = ResourceHelpers.createResource('cache', ResourceType.MEMORY, 'Cache', 'storage');
const app = ResourceHelpers.createResource('app', ResourceType.CUSTOM, 'Application', 'service');

// Define dependencies
app.dependencies = ['db', 'cache'];

// Add to resolver
resolver.addResource(database);
resolver.addResource(cache);
resolver.addResource(app);

// Get allocation order
const order = resolver.resolveDependencies();
console.log('Allocation order:', order); // ['db', 'cache', 'app']

// Check if resource can be allocated
const canAllocate = resolver.canAllocate('app');
```

### Performance Monitoring

Track resource usage and performance:

```typescript
// Get real-time metrics
const metrics = manager.getMetrics();

console.log(`Total Allocations: ${metrics.totalAllocations}`);
console.log(`Success Rate: ${(metrics.successfulAllocations / metrics.totalAllocations * 100).toFixed(2)}%`);
console.log(`Pool Utilization: ${metrics.poolUtilization.toFixed(2)}%`);
console.log(`Average Allocation Time: ${metrics.averageAllocationTime}ms`);

// Get usage history
const usageHistory = manager.getUsageHistory('memory-1');
console.log(`Resource used ${usageHistory.length} times`);

// Analyze usage patterns
const allResources = manager.getAllPools()
  .flatMap(pool => Array.from(pool.resources.values()));

const analysis = ResourceHelpers.analyzeResourceUsagePattern(allResources);
console.log(`Peak Usage: ${analysis.peakUsage}`);
console.log(`Utilization Rate: ${analysis.utilizationRate}%`);
```

### Auto-scaling

Enable automatic pool management:

```typescript
// Optimize allocation automatically
manager.optimizeAllocation();

// Listen for scaling events
manager.on('pool_expanded', (data) => {
  console.log(`Pool ${data.poolId} expanded to ${data.newSize} resources`);
});

manager.on('pool_shrunk', (data) => {
  console.log(`Pool ${data.poolId} shrunk to ${data.newSize} resources`);
});
```

### Resource Sharing

Enable resource sharing for concurrent access:

```typescript
const sharedResource = ResourceHelpers.createResource(
  'shared-cache',
  ResourceType.MEMORY,
  'Shared Cache',
  'cache',
  {
    size: 16384,
    shareable: true,
    maxConcurrentUsers: 10
  }
);

// Multiple users can access the same resource
const user1Request = ResourceHelpers.createAllocationRequest('user1', ResourceType.MEMORY);
const user2Request = ResourceHelpers.createAllocationRequest('user2', ResourceType.MEMORY);

const [alloc1, alloc2] = await Promise.all([
  manager.allocateResource(user1Request),
  manager.allocateResource(user2Request)
]);

// Both can get the same shared resource
if (alloc1.success && alloc2.success) {
  console.log('Both users sharing the same resource');
}
```

## Event System

Monitor resource events in real-time:

```typescript
manager.on('resource_event', (event) => {
  console.log(`Resource ${event.resourceId}: ${event.type}`);
});

manager.on('allocated', (event) => {
  console.log(`Resource allocated to ${event.userId}`);
});

manager.on('deallocated', (event) => {
  console.log(`Resource deallocated from ${event.userId}`);
});

manager.on('recycled', (event) => {
  console.log(`Resource recycled: ${event.resourceId}`);
});
```

## Resource Requirements

Specify detailed resource requirements:

```typescript
const requirements = {
  minSize: 1024,           // Minimum resource size
  maxSize: 8192,           // Maximum resource size
  attributes: {            // Custom attributes
    'region': 'us-east-1',
    'tier': 'premium'
  },
  dependencies: ['db-1'],  // Required dependencies
  exclusive: false,        // Allow sharing
  duration: 300000,        // Allocation duration (5 minutes)
  maxConcurrentUsers: 5    // Max concurrent access
};

const request = ResourceHelpers.createAllocationRequest(
  'my-service',
  ResourceType.STORAGE,
  requirements,
  5 // priority
);
```

## Reporting and Analytics

Generate comprehensive reports:

```typescript
const allResources = manager.getAllPools()
  .flatMap(pool => Array.from(pool.resources.values()));

const metrics = manager.getMetrics();

// Generate detailed report
const report = ResourceHelpers.generateResourceReport(allResources, metrics);
console.log(report);

// Get optimization recommendations
const optimization = ResourceHelpers.optimizeResourceAllocation(allResources);

console.log('Recommendations:');
optimization.recommendations.forEach(rec => console.log(`- ${rec}`));

console.log('Potential Savings:', optimization.potentialSavings);

// Redistribution plan
optimization.redistributionPlan.forEach(plan => {
  console.log(`${plan.action} ${plan.resourceId}: ${plan.reason}`);
});
```

## Utility Functions

Helpful utilities for resource management:

```typescript
// Format resource sizes
console.log(ResourceHelpers.formatResourceSize(1536)); // "1.50 KB"
console.log(ResourceHelpers.formatResourceSize(2048000)); // "1.95 MB"

// Format durations
console.log(ResourceHelpers.formatDuration(65000)); // "1m 5s"
console.log(ResourceHelpers.formatDuration(3665000)); // "1h 1m"

// Calculate resource efficiency
const efficiency = ResourceHelpers.calculateResourceEfficiency(resource);
console.log(`Efficiency: ${(efficiency * 100).toFixed(1)}%`);

// Estimate costs
const cost = ResourceHelpers.estimateResourceCost(resource, 3600000); // 1 hour
console.log(`Estimated cost: $${cost.toFixed(2)}`);

// Validate configuration
const validation = ResourceHelpers.validateResourceConfiguration(resource);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `maxPoolSize` | number | Maximum resources per pool | 100 |
| `allocationStrategy` | AllocationStrategy | Default allocation strategy | FIRST_FIT |
| `recyclingEnabled` | boolean | Enable automatic recycling | true |
| `performanceMonitoring` | boolean | Enable performance tracking | true |
| `dependencyResolution` | boolean | Enable dependency management | true |

## Best Practices

### Pool Design
- Group similar resources in the same pool
- Size pools based on expected peak usage
- Use appropriate allocation strategies for your use case

### Resource Lifecycle
- Always deallocate resources when finished
- Set appropriate lifetimes for temporary resources
- Monitor resource usage and efficiency

### Dependencies
- Keep dependency chains as short as possible
- Avoid circular dependencies
- Use dependency validation in development

### Performance
- Enable recycling for frequently used resources
- Monitor metrics and optimize allocation strategies
- Use load balancing for high-throughput scenarios

## Examples

### Web Application Resource Pool

```typescript
// Database connections
const dbPool = manager.createPool('database', 'DB Pool', ResourceType.DATABASE, 'data', 10);

// Memory for caching
const cachePool = manager.createPool('cache', 'Cache Pool', ResourceType.MEMORY, 'cache', 20);

// File handles
const filePool = manager.createPool('files', 'File Pool', ResourceType.FILE, 'storage', 50);

// Create resources
const dbConnections = Array.from({ length: 5 }, (_, i) =>
  ResourceHelpers.createResource(`db-${i}`, ResourceType.DATABASE, `DB Connection ${i}`, 'data', {
    maxConcurrentUsers: 1,
    priority: 10
  })
);

const cacheBlocks = Array.from({ length: 10 }, (_, i) =>
  ResourceHelpers.createResource(`cache-${i}`, ResourceType.MEMORY, `Cache Block ${i}`, 'cache', {
    size: 1024 * (i + 1),
    shareable: true,
    maxConcurrentUsers: 5
  })
);

// Add to pools
dbConnections.forEach(db => manager.addResource(dbPool.id, db));
cacheBlocks.forEach(cache => manager.addResource(cachePool.id, cache));

manager.start();
```

### Microservices Resource Management

```typescript
// Service-specific resource allocation
async function allocateServiceResources(serviceId: string) {
  const [db, cache, memory] = await Promise.all([
    manager.allocateResource(
      ResourceHelpers.createAllocationRequest(serviceId, ResourceType.DATABASE, { exclusive: true })
    ),
    manager.allocateResource(
      ResourceHelpers.createAllocationRequest(serviceId, ResourceType.MEMORY, { minSize: 2048 })
    ),
    manager.allocateResource(
      ResourceHelpers.createAllocationRequest(serviceId, ResourceType.CPU, { duration: 3600000 })
    )
  ]);

  return { db, cache, memory };
}

// Auto-deallocate on service shutdown
process.on('SIGTERM', () => {
  const serviceResources = manager.getResourcesByUser('my-service');
  serviceResources.forEach(resource => {
    manager.deallocateResource(resource.id, 'my-service');
  });
});
```

## License

MIT License - see LICENSE file for details.