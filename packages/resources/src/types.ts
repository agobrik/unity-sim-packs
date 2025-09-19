export interface ResourceConfig {
  maxPoolSize: number;
  allocationStrategy: AllocationStrategy;
  recyclingEnabled: boolean;
  performanceMonitoring: boolean;
  dependencyResolution: boolean;
}

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  category: string;
  properties: ResourceProperties;
  state: ResourceState;
  allocation: AllocationInfo;
  dependencies: string[];
  lastAccessed: number;
  createdAt: number;
  metadata: Record<string, any>;
}

export interface ResourceProperties {
  size: number;
  priority: number;
  lifetime: number;
  cost: number;
  recyclable: boolean;
  shareable: boolean;
  maxConcurrentUsers: number;
  attributes: Record<string, any>;
}

export interface AllocationInfo {
  allocatedTo: string[];
  allocatedAt: number;
  allocatedBy: string;
  expiresAt?: number;
  reservedUntil?: number;
  usageCount: number;
  maxUsage?: number;
}

export interface ResourcePool {
  id: string;
  name: string;
  type: ResourceType;
  category: string;
  resources: Map<string, Resource>;
  available: string[];
  allocated: string[];
  reserved: string[];
  maxSize: number;
  currentSize: number;
  strategy: AllocationStrategy;
  metadata: Record<string, any>;
}

export interface AllocationRequest {
  id: string;
  requesterId: string;
  resourceType: ResourceType;
  category?: string;
  requirements: ResourceRequirements;
  priority: number;
  timeout?: number;
  callback?: (resource: Resource | null) => void;
  timestamp: number;
}

export interface ResourceRequirements {
  minSize?: number;
  maxSize?: number;
  attributes?: Record<string, any>;
  dependencies?: string[];
  exclusive?: boolean;
  duration?: number;
  maxConcurrentUsers?: number;
}

export interface AllocationResult {
  success: boolean;
  resource?: Resource;
  error?: string;
  waitTime: number;
  allocationId: string;
}

export interface ResourceUsage {
  resourceId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  operations: number;
  bytesRead: number;
  bytesWritten: number;
  peakMemory: number;
  errors: number;
}

export interface PerformanceMetrics {
  totalAllocations: number;
  successfulAllocations: number;
  failedAllocations: number;
  averageAllocationTime: number;
  averageUsageDuration: number;
  poolUtilization: number;
  memoryUsage: number;
  resourceTurnover: number;
  hotspots: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  resolutionOrder: string[];
}

export interface DependencyNode {
  resourceId: string;
  dependencies: string[];
  dependents: string[];
  resolved: boolean;
  cyclic: boolean;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  required: boolean;
  weight: number;
}

export interface ResourceEvent {
  type: ResourceEventType;
  resourceId: string;
  userId?: string;
  timestamp: number;
  data: any;
}

export interface RecyclingPolicy {
  enabled: boolean;
  maxAge: number;
  maxIdleTime: number;
  maxUsageCount: number;
  sizeThreshold: number;
  recycleCallback?: (resource: Resource) => void;
}

export interface LoadBalancer {
  strategy: LoadBalancingStrategy;
  weights: Map<string, number>;
  healthChecks: boolean;
  failoverEnabled: boolean;
  thresholds: LoadBalancingThresholds;
}

export interface LoadBalancingThresholds {
  maxUtilization: number;
  maxLatency: number;
  maxErrors: number;
  minAvailable: number;
}

export interface CachePolicy {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  evictionStrategy: EvictionStrategy;
  writePolicy: WritePolicy;
}

export interface ResourceLock {
  resourceId: string;
  lockType: LockType;
  ownerId: string;
  acquiredAt: number;
  expiresAt?: number;
  renewable: boolean;
}

export interface Quota {
  userId: string;
  resourceType: ResourceType;
  maxAllocations: number;
  currentAllocations: number;
  maxSize: number;
  currentSize: number;
  resetInterval: number;
  lastReset: number;
}

export enum ResourceType {
  MEMORY = 'memory',
  CPU = 'cpu',
  STORAGE = 'storage',
  NETWORK = 'network',
  DATABASE = 'database',
  FILE = 'file',
  CUSTOM = 'custom'
}

export enum ResourceState {
  AVAILABLE = 'available',
  ALLOCATED = 'allocated',
  RESERVED = 'reserved',
  BUSY = 'busy',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
  RECYCLING = 'recycling'
}

export enum AllocationStrategy {
  FIRST_FIT = 'first_fit',
  BEST_FIT = 'best_fit',
  WORST_FIT = 'worst_fit',
  ROUND_ROBIN = 'round_robin',
  LEAST_RECENTLY_USED = 'least_recently_used',
  PRIORITY_BASED = 'priority_based',
  LOAD_BALANCED = 'load_balanced'
}

export enum ResourceEventType {
  CREATED = 'created',
  ALLOCATED = 'allocated',
  DEALLOCATED = 'deallocated',
  ACCESSED = 'accessed',
  MODIFIED = 'modified',
  RECYCLED = 'recycled',
  ERROR = 'error'
}

export enum DependencyType {
  HARD = 'hard',
  SOFT = 'soft',
  CIRCULAR = 'circular'
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  RESOURCE_BASED = 'resource_based',
  RESPONSE_TIME = 'response_time'
}

export enum EvictionStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  RANDOM = 'random',
  TTL = 'ttl'
}

export enum WritePolicy {
  WRITE_THROUGH = 'write_through',
  WRITE_BACK = 'write_back',
  WRITE_AROUND = 'write_around'
}

export enum LockType {
  SHARED = 'shared',
  EXCLUSIVE = 'exclusive',
  UPGRADEABLE = 'upgradeable'
}