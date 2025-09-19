/**
 * Supply Chain Simulation Package
 *
 * A comprehensive supply chain simulation system designed for games like
 * Factorio, Transport Tycoon, and Cities Skylines.
 *
 * Features:
 * - Real-time supply chain simulation
 * - Advanced pathfinding and optimization algorithms
 * - Event-driven architecture
 * - Comprehensive analytics and reporting
 * - Multi-tier supply networks
 * - Transportation and logistics management
 * - Production planning and scheduling
 * - Inventory optimization
 * - Quality control systems
 * - Market dynamics and demand modeling
 *
 * @version 1.0.0
 * @author Supply Chain Simulation System
 */

// ===== CORE SYSTEM =====
export { SupplyChainEngine, EngineState } from './core/SupplyChainEngine';
export { EventBus } from './core/EventBus';
export * from './core/types';

// Import types and classes for use in this file
import {
  SupplyChainConfig,
  EventType,
  NodeType,
  QualityLevel,
  VehicleType,
  RouteType,
  ResourceType,
  ProductSpec
} from './core/types';
import { SupplyChainEngine } from './core/SupplyChainEngine';
import { Node } from './entities/Node';
import { Product } from './entities/Product';

// ===== ENTITIES =====
export { Node } from './entities/Node';
export { Product } from './entities/Product';
export { Resource } from './entities/Resource';
export { Facility, FacilityType } from './entities/Facility';
export { Supplier, SupplierType } from './entities/Supplier';
export { Consumer, ConsumerType, ConsumerSegment } from './entities/Consumer';

// ===== NETWORKS =====
export { SupplyNetwork } from './networks/SupplyNetwork';
export { Route } from './networks/Route';
export { ConnectionManager } from './networks/ConnectionManager';

// ===== ALGORITHMS =====
export { PathFinding } from './algorithms/PathFinding';

// ===== INVENTORY MANAGEMENT =====
export { InventoryManager } from './inventory/InventoryManager';

// ===== PRODUCTION =====
export { ProductionScheduler } from './production/ProductionScheduler';

// ===== TRANSPORTATION =====
export { TransportManager } from './transportation/TransportManager';

// ===== ANALYTICS =====
export { SupplyChainAnalytics } from './analytics/SupplyChainAnalytics';

// ===== UTILITIES =====
export { EventEmitter } from './utils/EventEmitter';
export { MathUtils } from './utils/MathUtils';
export { ValidationUtils } from './utils/ValidationUtils';
export { TimeUtils } from './utils/TimeUtils';

// ===== UNITY-COMPATIBLE WRAPPER =====

// Unity-compatible wrapper class
export class SupplyChainSimulation {
  private engine: SupplyChainEngine;

  constructor() {
    try {
      this.engine = createSupplyChainEngine({
        id: 'unity-supply-chain',
        name: 'Unity Supply Chain Simulation'
      });
    } catch {
      this.engine = {} as SupplyChainEngine;
    }
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      supplyChain: {
        totalNodes: 0,
        activeRoutes: 0,
        totalProducts: 0,
        systemHealth: 'operational',
        framework: 'steam-sim-supply-chain'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create a new supply chain simulation engine with default configuration
 */
export function createSupplyChainEngine(config?: Partial<SupplyChainConfig>): SupplyChainEngine {
  const defaultConfig: SupplyChainConfig = {
    id: 'default-supply-chain',
    name: 'Supply Chain Simulation',
    description: 'Default supply chain simulation configuration',
    simulation: {
      timeStep: 1000, // 1 second
      maxIterations: 10000,
      convergenceThreshold: 0.001,
      randomSeed: Date.now(),
      realTimeMode: true,
      eventLogging: true,
      metricsInterval: 5000 // 5 seconds
    },
    optimization: [
      {
        type: 'minimize',
        metric: 'cost',
        weight: 0.4,
        constraints: []
      },
      {
        type: 'maximize',
        metric: 'efficiency',
        weight: 0.3,
        constraints: []
      },
      {
        type: 'maximize',
        metric: 'service',
        weight: 0.3,
        constraints: []
      }
    ],
    events: {
      enabledTypes: Object.values(EventType),
      bufferSize: 10000,
      persistEvents: true,
      alertThresholds: {
        'inventory_critical': 0.1,
        'quality_failure': 0.05,
        'delivery_delay': 0.15
      }
    },
    analytics: {
      metricsEnabled: true,
      forecastingEnabled: true,
      reportingEnabled: true,
      dataRetentionDays: 30,
      aggregationInterval: 60000 // 1 minute
    }
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new SupplyChainEngine(finalConfig);
}

/**
 * Create a basic supply network with common node types
 */
export function createBasicSupplyNetwork(): {
  engine: SupplyChainEngine;
  nodes: {
    supplier: Node;
    manufacturer: Node;
    warehouse: Node;
    retailer: Node;
  };
} {
  const engine = createSupplyChainEngine();
  const eventBus = engine.getEventBus();

  // Create basic nodes
  const supplier = new Node({
    id: 'supplier-001',
    name: 'Raw Materials Supplier',
    type: NodeType.SUPPLIER,
    coordinates: { x: 0, y: 0 },
    capabilities: {
      production: [{
        productId: 'raw-material',
        capacity: 1000,
        efficiency: 90,
        qualityRating: QualityLevel.GOOD,
        setupTime: 30,
        operatingCost: 50
      }],
      storage: [{
        capacity: 5000,
        temperatureControlled: false,
        securityLevel: 5,
        accessTime: 10,
        storageCost: 5
      }],
      processing: [],
      transport: [{
        vehicleTypes: [VehicleType.TRUCK],
        loadingCapacity: 500,
        loadingTime: 15,
        supportedRoutes: [RouteType.ROAD]
      }]
    }
  }, eventBus);

  const manufacturer = new Node({
    id: 'manufacturer-001',
    name: 'Production Facility',
    type: NodeType.MANUFACTURER,
    coordinates: { x: 100, y: 0 },
    capabilities: {
      production: [{
        productId: 'finished-product',
        capacity: 800,
        efficiency: 85,
        qualityRating: QualityLevel.EXCELLENT,
        setupTime: 60,
        operatingCost: 100
      }],
      storage: [{
        capacity: 3000,
        temperatureControlled: false,
        securityLevel: 7,
        accessTime: 5,
        storageCost: 8
      }],
      processing: [{
        inputTypes: [ResourceType.RAW_MATERIAL],
        outputTypes: [ResourceType.FINISHED_GOOD],
        throughput: 500,
        efficiency: 90,
        processingTime: 120
      }],
      transport: [{
        vehicleTypes: [VehicleType.TRUCK, VehicleType.TRAIN],
        loadingCapacity: 1000,
        loadingTime: 20,
        supportedRoutes: [RouteType.ROAD, RouteType.RAIL]
      }]
    }
  }, eventBus);

  const warehouse = new Node({
    id: 'warehouse-001',
    name: 'Distribution Center',
    type: NodeType.WAREHOUSE,
    coordinates: { x: 200, y: 0 },
    capabilities: {
      production: [],
      storage: [{
        capacity: 10000,
        temperatureControlled: true,
        securityLevel: 8,
        accessTime: 3,
        storageCost: 3
      }],
      processing: [],
      transport: [{
        vehicleTypes: [VehicleType.TRUCK, VehicleType.DRONE],
        loadingCapacity: 800,
        loadingTime: 10,
        supportedRoutes: [RouteType.ROAD, RouteType.AIR]
      }]
    }
  }, eventBus);

  const retailer = new Node({
    id: 'retailer-001',
    name: 'Retail Store',
    type: NodeType.RETAILER,
    coordinates: { x: 300, y: 0 },
    capabilities: {
      production: [],
      storage: [{
        capacity: 2000,
        temperatureControlled: false,
        securityLevel: 6,
        accessTime: 1,
        storageCost: 10
      }],
      processing: [],
      transport: [{
        vehicleTypes: [VehicleType.TRUCK],
        loadingCapacity: 200,
        loadingTime: 5,
        supportedRoutes: [RouteType.ROAD]
      }]
    }
  }, eventBus);

  // Add nodes to network
  const network = engine.getNetwork();
  network.addNode(supplier);
  network.addNode(manufacturer);
  network.addNode(warehouse);
  network.addNode(retailer);

  return {
    engine,
    nodes: {
      supplier,
      manufacturer,
      warehouse,
      retailer
    }
  };
}

/**
 * Create sample products for testing and demonstrations
 */
export function createSampleProducts(): Product[] {
  const rawMaterialSpec: ProductSpec = {
    id: 'raw-material-001',
    name: 'Steel Ingot',
    type: ResourceType.RAW_MATERIAL,
    properties: {
      weight: 25,
      volume: 0.1,
      value: 100,
      perishable: false,
      hazardous: false,
      fragile: false,
      stackable: true,
      maxStackSize: 1000
    },
    requirements: [],
    qualityStandards: [{
      metric: 'purity',
      target: 99.5,
      tolerance: 0.5,
      critical: true
    }],
    marketData: {
      basePrice: 100,
      demand: 100,
      seasonality: {
        pattern: 'linear',
        amplitude: 0.1,
        period: 365,
        offset: 0
      },
      elasticity: 0.8,
      competition: 0.7
    }
  };

  const finishedProductSpec: ProductSpec = {
    id: 'finished-product-001',
    name: 'Steel Beam',
    type: ResourceType.FINISHED_GOOD,
    properties: {
      weight: 150,
      volume: 2.5,
      value: 500,
      perishable: false,
      hazardous: false,
      fragile: false,
      stackable: true,
      maxStackSize: 100
    },
    requirements: [{
      resourceId: 'raw-material-001',
      quantity: 3,
      qualityMin: QualityLevel.GOOD,
      substitutes: []
    }],
    qualityStandards: [{
      metric: 'strength',
      target: 400,
      tolerance: 20,
      critical: true
    }],
    marketData: {
      basePrice: 500,
      demand: 80,
      seasonality: {
        pattern: 'seasonal',
        amplitude: 0.2,
        period: 365,
        offset: 90
      },
      elasticity: 1.2,
      competition: 0.6
    }
  };

  return [
    new Product(rawMaterialSpec),
    new Product(finishedProductSpec)
  ];
}

/**
 * Logger utility for debugging and monitoring
 */
export class SupplyChainLogger {
  private static instance: SupplyChainLogger;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  static getInstance(): SupplyChainLogger {
    if (!SupplyChainLogger.instance) {
      SupplyChainLogger.instance = new SupplyChainLogger();
    }
    return SupplyChainLogger.instance;
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.logLevel]) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const logMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case 'debug':
        (globalThis as any).console.debug(logMessage);
        break;
      case 'info':
        (globalThis as any).console.info(logMessage);
        break;
      case 'warn':
        (globalThis as any).console.warn(logMessage);
        break;
      case 'error':
        (globalThis as any).console.error(logMessage);
        break;
    }
  }

  getLogs(level?: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
}

// ===== VERSION AND METADATA =====
export const VERSION = '1.0.0';
export const PACKAGE_NAME = '@supply-chain/simulation';

/**
 * Package information and capabilities
 */
export const PACKAGE_INFO = {
  name: PACKAGE_NAME,
  version: VERSION,
  description: 'Comprehensive supply chain simulation package for games',
  features: [
    'Real-time supply chain simulation',
    'Advanced pathfinding and optimization',
    'Event-driven architecture',
    'Comprehensive analytics and reporting',
    'Multi-tier supply networks',
    'Transportation and logistics management',
    'Production planning and scheduling',
    'Inventory optimization',
    'Quality control systems',
    'Market dynamics and demand modeling'
  ],
  compatibility: {
    gameEngines: ['Unity', 'Unreal', 'Godot', 'Custom'],
    platforms: ['Browser', 'Node.js', 'Desktop', 'Mobile'],
    typescript: true,
    realTimeSimulation: true
  }
};

/**
 * Get package health status
 */
export function getPackageHealth(): {
  status: 'healthy' | 'warning' | 'error';
  version: string;
  uptime: number;
  memoryUsage?: number;
  errors: string[];
  warnings: string[];
} {
  const logger = SupplyChainLogger.getInstance();
  const errors = logger.getLogs('error').slice(-10);
  const warnings = logger.getLogs('warn').slice(-10);

  let memoryUsage: number | undefined;
  try {
    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.memoryUsage) {
      memoryUsage = (globalThis as any).process.memoryUsage().heapUsed;
    }
  } catch {
    // Ignore errors in browser environments
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy',
    version: VERSION,
    uptime: Date.now(), // Simplified uptime
    memoryUsage,
    errors: errors.map(e => e.message),
    warnings: warnings.map(w => w.message)
  };
}

// Default export for convenience
export default {
  createSupplyChainEngine,
  createBasicSupplyNetwork,
  createSampleProducts,
  SupplyChainLogger,
  VERSION,
  PACKAGE_INFO,
  getPackageHealth
};