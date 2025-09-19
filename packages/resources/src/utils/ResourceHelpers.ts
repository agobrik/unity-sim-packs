import {
  Resource,
  ResourceType,
  ResourceState,
  AllocationStrategy,
  ResourceProperties,
  AllocationRequest,
  ResourceRequirements,
  PerformanceMetrics
} from '../types';

export class ResourceHelpers {
  public static createResource(
    id: string,
    type: ResourceType,
    name: string,
    category: string,
    properties: Partial<ResourceProperties> = {}
  ): Resource {
    const defaultProperties: ResourceProperties = {
      size: 1024,
      priority: 1,
      lifetime: 3600000,
      cost: 1,
      recyclable: true,
      shareable: true,
      maxConcurrentUsers: 5,
      attributes: {}
    };

    return {
      id,
      type,
      name,
      category,
      properties: { ...defaultProperties, ...properties },
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

  public static createAllocationRequest(
    requesterId: string,
    resourceType: ResourceType,
    requirements: Partial<ResourceRequirements> = {},
    priority: number = 1,
    timeout?: number
  ): AllocationRequest {
    return {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId,
      resourceType,
      requirements: {
        minSize: 0,
        maxSize: Infinity,
        attributes: {},
        dependencies: [],
        exclusive: false,
        duration: undefined,
        maxConcurrentUsers: 1,
        ...requirements
      },
      priority,
      timeout,
      timestamp: Date.now()
    };
  }

  public static calculateResourceEfficiency(resource: Resource): number {
    const usageRatio = resource.allocation.usageCount > 0 ?
      (Date.now() - resource.createdAt) / (resource.allocation.usageCount * 1000) : 0;

    const idleTime = Date.now() - resource.lastAccessed;
    const idlePenalty = Math.min(idleTime / (24 * 60 * 60 * 1000), 1);

    const baseEfficiency = resource.properties.shareable ?
      resource.allocation.allocatedTo.length / resource.properties.maxConcurrentUsers :
      resource.allocation.allocatedTo.length > 0 ? 1 : 0;

    return Math.max(0, baseEfficiency - idlePenalty * 0.5);
  }

  public static estimateResourceCost(resource: Resource, duration: number): number {
    const baseCost = resource.properties.cost;
    const sizeFactor = Math.log10(resource.properties.size + 1);
    const priorityFactor = resource.properties.priority;
    const durationFactor = duration / (60 * 60 * 1000);

    return baseCost * sizeFactor * priorityFactor * durationFactor;
  }

  public static compareAllocationStrategies(
    resources: Resource[],
    request: AllocationRequest
  ): Record<AllocationStrategy, Resource | null> {
    const results: Record<AllocationStrategy, Resource | null> = {
      [AllocationStrategy.FIRST_FIT]: null,
      [AllocationStrategy.BEST_FIT]: null,
      [AllocationStrategy.WORST_FIT]: null,
      [AllocationStrategy.ROUND_ROBIN]: null,
      [AllocationStrategy.LEAST_RECENTLY_USED]: null,
      [AllocationStrategy.PRIORITY_BASED]: null,
      [AllocationStrategy.LOAD_BALANCED]: null
    };

    const suitableResources = resources.filter(r =>
      r.type === request.resourceType &&
      r.state === ResourceState.AVAILABLE &&
      this.matchesRequirements(r, request.requirements)
    );

    if (suitableResources.length === 0) return results;

    results[AllocationStrategy.FIRST_FIT] = suitableResources[0];

    results[AllocationStrategy.BEST_FIT] = suitableResources.reduce((best, current) => {
      const requiredSize = request.requirements.minSize || 0;
      if (current.properties.size >= requiredSize &&
          current.properties.size < best.properties.size) {
        return current;
      }
      return best;
    });

    results[AllocationStrategy.WORST_FIT] = suitableResources.reduce((worst, current) => {
      return current.properties.size > worst.properties.size ? current : worst;
    });

    results[AllocationStrategy.LEAST_RECENTLY_USED] = suitableResources.reduce((lru, current) => {
      return current.lastAccessed < lru.lastAccessed ? current : lru;
    });

    results[AllocationStrategy.PRIORITY_BASED] = suitableResources.reduce((highest, current) => {
      return current.properties.priority > highest.properties.priority ? current : highest;
    });

    results[AllocationStrategy.LOAD_BALANCED] = suitableResources.reduce((balanced, current) => {
      const balancedLoad = balanced.allocation.allocatedTo.length / balanced.properties.maxConcurrentUsers;
      const currentLoad = current.allocation.allocatedTo.length / current.properties.maxConcurrentUsers;
      return currentLoad < balancedLoad ? current : balanced;
    });

    results[AllocationStrategy.ROUND_ROBIN] = suitableResources[
      Math.floor(Math.random() * suitableResources.length)
    ];

    return results;
  }

  private static matchesRequirements(resource: Resource, requirements: ResourceRequirements): boolean {
    if (requirements.minSize && resource.properties.size < requirements.minSize) {
      return false;
    }

    if (requirements.maxSize && resource.properties.size > requirements.maxSize) {
      return false;
    }

    if (requirements.exclusive && resource.allocation.allocatedTo.length > 0) {
      return false;
    }

    if (resource.allocation.allocatedTo.length >= resource.properties.maxConcurrentUsers) {
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

  public static analyzeResourceUsagePattern(
    resources: Resource[],
    timeWindow: number = 24 * 60 * 60 * 1000
  ): {
    peakUsage: number;
    averageUsage: number;
    utilizationRate: number;
    mostUsedResources: Resource[];
    leastUsedResources: Resource[];
  } {
    const now = Date.now();
    const windowStart = now - timeWindow;

    const recentlyUsedResources = resources.filter(r => r.lastAccessed >= windowStart);
    const totalAllocated = resources.filter(r => r.state === ResourceState.ALLOCATED).length;
    const totalResources = resources.length;

    const usageCounts = resources.map(r => r.allocation.usageCount);
    const maxUsage = Math.max(...usageCounts, 0);
    const avgUsage = usageCounts.reduce((sum, count) => sum + count, 0) / resources.length;

    const sortedByUsage = [...resources].sort((a, b) => b.allocation.usageCount - a.allocation.usageCount);

    return {
      peakUsage: maxUsage,
      averageUsage: avgUsage,
      utilizationRate: totalResources > 0 ? (totalAllocated / totalResources) * 100 : 0,
      mostUsedResources: sortedByUsage.slice(0, 5),
      leastUsedResources: sortedByUsage.slice(-5).reverse()
    };
  }

  public static generateResourceReport(
    resources: Resource[],
    metrics: PerformanceMetrics
  ): string {
    const report = [];

    report.push('=== RESOURCE MANAGEMENT REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    report.push('OVERVIEW:');
    report.push(`Total Resources: ${resources.length}`);
    report.push(`Available: ${resources.filter(r => r.state === ResourceState.AVAILABLE).length}`);
    report.push(`Allocated: ${resources.filter(r => r.state === ResourceState.ALLOCATED).length}`);
    report.push(`In Maintenance: ${resources.filter(r => r.state === ResourceState.MAINTENANCE).length}`);
    report.push('');

    report.push('PERFORMANCE METRICS:');
    report.push(`Total Allocations: ${metrics.totalAllocations}`);
    report.push(`Success Rate: ${metrics.totalAllocations > 0 ?
      ((metrics.successfulAllocations / metrics.totalAllocations) * 100).toFixed(2) : 0}%`);
    report.push(`Average Allocation Time: ${metrics.averageAllocationTime.toFixed(2)}ms`);
    report.push(`Pool Utilization: ${metrics.poolUtilization.toFixed(2)}%`);
    report.push(`Average Usage Duration: ${(metrics.averageUsageDuration / 1000).toFixed(2)}s`);
    report.push('');

    const typeDistribution = this.getResourceTypeDistribution(resources);
    report.push('RESOURCE DISTRIBUTION:');
    for (const [type, count] of Object.entries(typeDistribution)) {
      report.push(`${type}: ${count} resources`);
    }
    report.push('');

    if (metrics.hotspots.length > 0) {
      report.push('HOTSPOTS (Most Used Resources):');
      metrics.hotspots.slice(0, 10).forEach((resourceId, index) => {
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
          report.push(`${index + 1}. ${resource.name} (${resource.allocation.usageCount} uses)`);
        }
      });
      report.push('');
    }

    const inefficientResources = resources
      .map(r => ({ resource: r, efficiency: this.calculateResourceEfficiency(r) }))
      .filter(item => item.efficiency < 0.3)
      .sort((a, b) => a.efficiency - b.efficiency)
      .slice(0, 5);

    if (inefficientResources.length > 0) {
      report.push('INEFFICIENT RESOURCES:');
      inefficientResources.forEach((item, index) => {
        report.push(`${index + 1}. ${item.resource.name} (${(item.efficiency * 100).toFixed(1)}% efficiency)`);
      });
      report.push('');
    }

    report.push('RECOMMENDATIONS:');
    if (metrics.poolUtilization > 85) {
      report.push('- Consider expanding resource pools due to high utilization');
    }
    if (metrics.poolUtilization < 30) {
      report.push('- Consider consolidating resources due to low utilization');
    }
    if (metrics.averageAllocationTime > 1000) {
      report.push('- Allocation time is high, consider optimizing allocation strategy');
    }
    if (inefficientResources.length > 0) {
      report.push('- Review and possibly retire inefficient resources');
    }

    return report.join('\n');
  }

  private static getResourceTypeDistribution(resources: Resource[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const resource of resources) {
      const type = resource.type.toString();
      distribution[type] = (distribution[type] || 0) + 1;
    }

    return distribution;
  }

  public static optimizeResourceAllocation(resources: Resource[]): {
    recommendations: string[];
    potentialSavings: number;
    redistributionPlan: Array<{
      action: 'consolidate' | 'expand' | 'retire';
      resourceId: string;
      reason: string;
    }>;
  } {
    const recommendations: string[] = [];
    const redistributionPlan: Array<{
      action: 'consolidate' | 'expand' | 'retire';
      resourceId: string;
      reason: string;
    }> = [];

    let potentialSavings = 0;

    const underutilized = resources.filter(r => {
      const efficiency = this.calculateResourceEfficiency(r);
      return efficiency < 0.2 && r.state === ResourceState.AVAILABLE;
    });

    const overutilized = resources.filter(r => {
      const utilizationRate = r.allocation.allocatedTo.length / r.properties.maxConcurrentUsers;
      return utilizationRate > 0.9;
    });

    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} resources are underutilized and could be retired`);

      for (const resource of underutilized) {
        redistributionPlan.push({
          action: 'retire',
          resourceId: resource.id,
          reason: 'Low utilization and efficiency'
        });
        potentialSavings += resource.properties.cost * 24;
      }
    }

    if (overutilized.length > 0) {
      recommendations.push(`${overutilized.length} resources are overutilized and need expansion`);

      for (const resource of overutilized) {
        redistributionPlan.push({
          action: 'expand',
          resourceId: resource.id,
          reason: 'High utilization rate requires additional capacity'
        });
      }
    }

    const duplicateTypes = this.findDuplicateResources(resources);
    if (duplicateTypes.length > 0) {
      recommendations.push('Similar resources can be consolidated to reduce overhead');

      for (const group of duplicateTypes) {
        if (group.length > 1) {
          for (let i = 1; i < group.length; i++) {
            redistributionPlan.push({
              action: 'consolidate',
              resourceId: group[i].id,
              reason: 'Duplicate functionality can be merged'
            });
            potentialSavings += group[i].properties.cost * 12;
          }
        }
      }
    }

    return {
      recommendations,
      potentialSavings,
      redistributionPlan
    };
  }

  private static findDuplicateResources(resources: Resource[]): Resource[][] {
    const groups = new Map<string, Resource[]>();

    for (const resource of resources) {
      const key = `${resource.type}_${resource.category}_${resource.properties.size}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(resource);
    }

    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  public static calculateOptimalPoolSize(
    currentSize: number,
    utilizationHistory: number[],
    growthRate: number = 0.1
  ): number {
    if (utilizationHistory.length === 0) return currentSize;

    const avgUtilization = utilizationHistory.reduce((sum, util) => sum + util, 0) / utilizationHistory.length;
    const maxUtilization = Math.max(...utilizationHistory);
    const volatility = this.calculateVolatility(utilizationHistory);

    const baseSize = Math.ceil(maxUtilization * (1 + growthRate));
    const volatilityBuffer = Math.ceil(volatility * currentSize * 0.2);
    const optimalSize = baseSize + volatilityBuffer;

    return Math.max(1, Math.min(optimalSize, currentSize * 2));
  }

  private static calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance) / mean;
  }

  public static formatResourceSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  public static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  public static validateResourceConfiguration(resource: Resource): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!resource.id || resource.id.trim() === '') {
      errors.push('Resource ID is required');
    }

    if (!resource.name || resource.name.trim() === '') {
      warnings.push('Resource name is empty');
    }

    if (resource.properties.size <= 0) {
      errors.push('Resource size must be positive');
    }

    if (resource.properties.maxConcurrentUsers <= 0) {
      errors.push('Max concurrent users must be positive');
    }

    if (resource.properties.priority < 0) {
      warnings.push('Resource priority is negative');
    }

    if (resource.properties.lifetime <= 0) {
      warnings.push('Resource lifetime should be positive');
    }

    if (resource.dependencies.includes(resource.id)) {
      errors.push('Resource cannot depend on itself');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }
}