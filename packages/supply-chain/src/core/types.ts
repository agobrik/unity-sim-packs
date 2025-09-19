/**
 * Core Supply Chain Simulation Types
 * Comprehensive type definitions for supply chain simulation system
 */

// Base Identifiers
export type EntityId = string;
export type ResourceId = string;
export type ProductId = string;
export type NodeId = string;
export type RouteId = string;
export type VehicleId = string;
export type FacilityId = string;

// Coordinate System
export interface Coordinates {
  x: number;
  y: number;
  z?: number;
}

export interface BoundingBox {
  min: Coordinates;
  max: Coordinates;
}

// Time Management
export interface TimeStamp {
  gameTime: number;
  realTime: number;
}

export interface Duration {
  gameTime: number;
  realTime: number;
}

// Quality and Condition
export enum QualityLevel {
  POOR = 0,
  FAIR = 25,
  GOOD = 50,
  EXCELLENT = 75,
  PERFECT = 100
}

export enum ConditionState {
  NEW = 'new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  BROKEN = 'broken'
}

// Resource and Product Types
export enum ResourceType {
  RAW_MATERIAL = 'raw_material',
  INTERMEDIATE = 'intermediate',
  FINISHED_GOOD = 'finished_good',
  COMPONENT = 'component',
  ENERGY = 'energy',
  FUEL = 'fuel',
  TOOL = 'tool',
  CONSUMABLE = 'consumable'
}

export interface ResourceProperties {
  weight: number;
  volume: number;
  value: number;
  perishable: boolean;
  shelfLife?: number;
  hazardous: boolean;
  fragile: boolean;
  temperatureRequirement?: TemperatureRange;
  stackable: boolean;
  maxStackSize?: number;
}

export interface TemperatureRange {
  min: number;
  max: number;
  optimal: number;
}

// Product Specifications
export interface ProductSpec {
  id: ProductId;
  name: string;
  type: ResourceType;
  properties: ResourceProperties;
  requirements: ProductionRequirement[];
  qualityStandards: QualityStandard[];
  marketData: MarketData;
}

export interface ProductionRequirement {
  resourceId: ResourceId;
  quantity: number;
  qualityMin: QualityLevel;
  substitutes?: ResourceId[];
}

export interface QualityStandard {
  metric: string;
  target: number;
  tolerance: number;
  critical: boolean;
}

export interface MarketData {
  basePrice: number;
  demand: number;
  seasonality: SeasonalityData;
  elasticity: number;
  competition: number;
}

export interface SeasonalityData {
  pattern: 'linear' | 'seasonal' | 'cyclical' | 'random';
  amplitude: number;
  period: number;
  offset: number;
}

// Node Types and Properties
export enum NodeType {
  SUPPLIER = 'supplier',
  MANUFACTURER = 'manufacturer',
  WAREHOUSE = 'warehouse',
  DISTRIBUTOR = 'distributor',
  RETAILER = 'retailer',
  CONSUMER = 'consumer',
  TRANSPORT_HUB = 'transport_hub',
  PROCESSING_PLANT = 'processing_plant',
  RESEARCH_LAB = 'research_lab'
}

export enum NodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  UPGRADING = 'upgrading',
  FAILED = 'failed'
}

export interface NodeCapabilities {
  production: ProductionCapability[];
  storage: StorageCapability[];
  processing: ProcessingCapability[];
  transport: TransportCapability[];
}

export interface ProductionCapability {
  productId: ProductId;
  capacity: number;
  efficiency: number;
  qualityRating: QualityLevel;
  setupTime: number;
  operatingCost: number;
}

export interface StorageCapability {
  capacity: number;
  specializedFor?: ResourceType[];
  temperatureControlled: boolean;
  securityLevel: number;
  accessTime: number;
  storageCost: number;
}

export interface ProcessingCapability {
  inputTypes: ResourceType[];
  outputTypes: ResourceType[];
  throughput: number;
  efficiency: number;
  processingTime: number;
}

export interface TransportCapability {
  vehicleTypes: VehicleType[];
  loadingCapacity: number;
  loadingTime: number;
  supportedRoutes: RouteType[];
}

// Transportation System
export enum VehicleType {
  TRUCK = 'truck',
  TRAIN = 'train',
  SHIP = 'ship',
  PLANE = 'plane',
  DRONE = 'drone',
  PIPELINE = 'pipeline',
  CONVEYOR = 'conveyor',
  ROBOT = 'robot'
}

export enum VehicleStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  IN_TRANSIT = 'in_transit',
  UNLOADING = 'unloading',
  MAINTENANCE = 'maintenance',
  BROKEN = 'broken'
}

export enum RouteType {
  ROAD = 'road',
  RAIL = 'rail',
  WATER = 'water',
  AIR = 'air',
  PIPELINE = 'pipeline',
  INTERNAL = 'internal'
}

export interface VehicleSpec {
  id: VehicleId;
  type: VehicleType;
  capacity: VehicleCapacity;
  speed: number;
  fuelConsumption: number;
  operatingCost: number;
  maintenance: MaintenanceSpec;
  restrictions: TransportRestriction[];
}

export interface VehicleCapacity {
  weight: number;
  volume: number;
  specializedFor?: ResourceType[];
  temperatureControlled: boolean;
  compartments: number;
}

export interface MaintenanceSpec {
  intervalDistance: number;
  intervalTime: number;
  cost: number;
  downtime: number;
  reliability: number;
}

export interface TransportRestriction {
  type: 'route' | 'cargo' | 'time' | 'weather';
  condition: string;
  limitation: string;
}

// Route and Network
export interface RouteSpec {
  id: RouteId;
  type: RouteType;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  distance: number;
  capacity: number;
  cost: number;
  travelTime: number;
  restrictions: RouteRestriction[];
  condition: ConditionState;
}

export interface RouteRestriction {
  vehicleTypes: VehicleType[];
  maxWeight: number;
  maxVolume: number;
  hazardousAllowed: boolean;
  timeWindows?: TimeWindow[];
}

export interface TimeWindow {
  startTime: number;
  endTime: number;
  days: string[];
}

// Inventory and Stock
export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  OVERSTOCK = 'overstock',
  RESERVED = 'reserved',
  DAMAGED = 'damaged'
}

export interface StockItem {
  resourceId: ResourceId;
  quantity: number;
  quality: QualityLevel;
  condition: ConditionState;
  location: string;
  expiryDate?: TimeStamp;
  batchId?: string;
  cost: number;
  lastUpdated: TimeStamp;
}

export interface InventoryLevel {
  current: number;
  reserved: number;
  available: number;
  minimum: number;
  maximum: number;
  reorderPoint: number;
  reorderQuantity: number;
}

// Production System
export enum ProductionStatus {
  IDLE = 'idle',
  SETUP = 'setup',
  PRODUCING = 'producing',
  QUALITY_CHECK = 'quality_check',
  MAINTENANCE = 'maintenance',
  ERROR = 'error'
}

export interface Recipe {
  id: string;
  name: string;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  duration: number;
  skillRequired: number;
  energyRequired: number;
  equipmentRequired: string[];
  qualityFactors: QualityFactor[];
}

export interface RecipeInput {
  resourceId: ResourceId;
  quantity: number;
  qualityMin: QualityLevel;
  consumption: 'consumed' | 'tool' | 'catalyst';
}

export interface RecipeOutput {
  resourceId: ResourceId;
  quantity: number;
  probability: number;
  qualityRange: QualityRange;
}

export interface QualityRange {
  min: QualityLevel;
  max: QualityLevel;
  expected: QualityLevel;
}

export interface QualityFactor {
  input: string;
  weight: number;
  formula: string;
}

// Demand and Supply
export interface DemandPattern {
  baseLevel: number;
  trend: number;
  seasonality: SeasonalityData;
  variability: number;
  elasticity: PriceElasticity;
}

export interface PriceElasticity {
  coefficient: number;
  threshold: number;
  type: 'elastic' | 'inelastic' | 'unitary';
}

export interface SupplyConstraint {
  type: 'capacity' | 'resource' | 'time' | 'quality';
  limit: number;
  penalty: number;
  flexibility: number;
}

// Events and Notifications
export enum EventType {
  PRODUCTION_STARTED = 'production_started',
  PRODUCTION_COMPLETED = 'production_completed',
  SHIPMENT_DISPATCHED = 'shipment_dispatched',
  SHIPMENT_DELIVERED = 'shipment_delivered',
  INVENTORY_LOW = 'inventory_low',
  INVENTORY_CRITICAL = 'inventory_critical',
  QUALITY_FAILURE = 'quality_failure',
  MAINTENANCE_REQUIRED = 'maintenance_required',
  ROUTE_BLOCKED = 'route_blocked',
  PRICE_CHANGED = 'price_changed',
  DEMAND_SPIKE = 'demand_spike',
  SUPPLY_DISRUPTION = 'supply_disruption'
}

export interface SupplyChainEvent {
  id: string;
  type: EventType;
  timestamp: TimeStamp;
  sourceId: EntityId;
  targetId?: EntityId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, any>;
  handled: boolean;
}

// Performance Metrics
export interface PerformanceKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  trend: number;
  unit: string;
  category: 'efficiency' | 'cost' | 'quality' | 'service' | 'sustainability';
}

export interface SupplyChainMetrics {
  efficiency: EfficiencyMetrics;
  financial: FinancialMetrics;
  service: ServiceMetrics;
  quality: QualityMetrics;
  sustainability: SustainabilityMetrics;
}

export interface EfficiencyMetrics {
  overallEquipmentEffectiveness: number;
  throughputUtilization: number;
  inventoryTurnover: number;
  cycleTime: number;
  setupTime: number;
}

export interface FinancialMetrics {
  totalCost: number;
  operatingCost: number;
  transportationCost: number;
  inventoryCarryingCost: number;
  qualityCost: number;
  revenue: number;
  profit: number;
  roi: number;
}

export interface ServiceMetrics {
  onTimeDelivery: number;
  fillRate: number;
  orderAccuracy: number;
  customerSatisfaction: number;
  responseTime: number;
}

export interface QualityMetrics {
  defectRate: number;
  firstPassYield: number;
  scrapRate: number;
  reworkRate: number;
  customerComplaints: number;
}

export interface SustainabilityMetrics {
  carbonFootprint: number;
  energyConsumption: number;
  wasteGeneration: number;
  waterUsage: number;
  recyclingRate: number;
}

// Optimization Parameters
export interface OptimizationObjective {
  type: 'minimize' | 'maximize';
  metric: 'cost' | 'time' | 'quality' | 'service' | 'profit' | 'efficiency';
  weight: number;
  constraints: OptimizationConstraint[];
}

export interface OptimizationConstraint {
  type: 'capacity' | 'budget' | 'time' | 'quality' | 'environmental';
  value: number;
  operator: '<' | '>' | '=' | '<=' | '>=';
  penalty: number;
}

// Configuration and Settings
export interface SimulationConfig {
  timeStep: number;
  maxIterations: number;
  convergenceThreshold: number;
  randomSeed?: number;
  realTimeMode: boolean;
  eventLogging: boolean;
  metricsInterval: number;
}

export interface SupplyChainConfig {
  id: string;
  name: string;
  description: string;
  simulation: SimulationConfig;
  optimization: OptimizationObjective[];
  events: EventConfiguration;
  analytics: AnalyticsConfiguration;
}

export interface EventConfiguration {
  enabledTypes: EventType[];
  bufferSize: number;
  persistEvents: boolean;
  alertThresholds: Record<string, number>;
}

export interface AnalyticsConfiguration {
  metricsEnabled: boolean;
  forecastingEnabled: boolean;
  reportingEnabled: boolean;
  dataRetentionDays: number;
  aggregationInterval: number;
}

// Error Handling
export interface SupplyChainError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  context: Record<string, any>;
  timestamp: TimeStamp;
  recoverable: boolean;
}

// API Response Types
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: SupplyChainError;
  warnings: string[];
  metrics?: Record<string, number>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Export all types for external use
export * from './types';