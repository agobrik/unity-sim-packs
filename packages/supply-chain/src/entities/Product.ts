/**
 * Product Entity - Represents finished goods and intermediate products in the supply chain
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  ProductId,
  ResourceId,
  ProductSpec,
  ResourceType,
  QualityLevel,
  ConditionState,
  TimeStamp,
  MarketData,
  ProductionRequirement,
  QualityStandard
} from '../core/types';

export interface ProductInstance {
  id: string;
  productId: ProductId;
  quantity: number;
  quality: QualityLevel;
  condition: ConditionState;
  batchId?: string;
  manufacturedDate: TimeStamp;
  expiryDate?: TimeStamp;
  location: string;
  cost: number;
  serialNumbers?: string[];
  metadata: Record<string, any>;
}

export interface ProductLifecycle {
  stage: 'design' | 'development' | 'production' | 'distribution' | 'retail' | 'endoflife';
  startDate: TimeStamp;
  expectedDuration: number;
  milestones: ProductMilestone[];
}

export interface ProductMilestone {
  name: string;
  description: string;
  targetDate: TimeStamp;
  completedDate?: TimeStamp;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  dependencies: string[];
}

export interface ProductVariant {
  id: string;
  name: string;
  baseProductId: ProductId;
  modifications: ProductModification[];
  priceMultiplier: number;
  marketSegment: string;
}

export interface ProductModification {
  type: 'color' | 'size' | 'material' | 'feature' | 'packaging';
  value: string;
  costImpact: number;
  qualityImpact: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  products: BundleItem[];
  discountPercentage: number;
  bundlePrice: number;
  availability: boolean;
}

export interface BundleItem {
  productId: ProductId;
  quantity: number;
  required: boolean;
  substitutes?: ProductId[];
}

export class Product extends EventEmitter {
  private spec: ProductSpec;
  private lifecycle: ProductLifecycle;
  private variants: Map<string, ProductVariant> = new Map();
  private instances: Map<string, ProductInstance> = new Map();
  private qualityHistory: QualityRecord[] = [];
  private marketHistory: MarketRecord[] = [];

  constructor(spec: ProductSpec) {
    super();
    this.spec = spec;
    this.lifecycle = this.initializeLifecycle();
    this.setupEventHandlers();
  }

  /**
   * Initialize product lifecycle
   */
  private initializeLifecycle(): ProductLifecycle {
    return {
      stage: 'design',
      startDate: { gameTime: 0, realTime: Date.now() },
      expectedDuration: 0,
      milestones: []
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('quality-changed', (data) => {
      this.recordQualityChange(data);
    });

    this.on('market-data-updated', (data) => {
      this.recordMarketChange(data);
    });

    this.on('instance-created', (instance) => {
      this.emit('product-produced', {
        productId: this.spec.id,
        quantity: instance.quantity,
        quality: instance.quality
      });
    });
  }

  /**
   * Create a new product instance
   */
  createInstance(
    quantity: number,
    quality: QualityLevel,
    location: string,
    cost: number,
    options: {
      batchId?: string;
      expiryDate?: TimeStamp;
      serialNumbers?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): ProductInstance {
    const instance: ProductInstance = {
      id: this.generateInstanceId(),
      productId: this.spec.id,
      quantity,
      quality,
      condition: ConditionState.NEW,
      batchId: options.batchId,
      manufacturedDate: { gameTime: 0, realTime: Date.now() },
      expiryDate: options.expiryDate,
      location,
      cost,
      serialNumbers: options.serialNumbers,
      metadata: options.metadata || {}
    };

    this.instances.set(instance.id, instance);

    this.emit('instance-created', instance);
    return instance;
  }

  /**
   * Update product instance
   */
  updateInstance(
    instanceId: string,
    updates: Partial<ProductInstance>
  ): ProductInstance | null {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }

    const oldQuality = instance.quality;
    const oldCondition = instance.condition;

    Object.assign(instance, updates);

    // Emit events for significant changes
    if (updates.quality && updates.quality !== oldQuality) {
      this.emit('quality-changed', {
        instanceId,
        oldQuality,
        newQuality: updates.quality
      });
    }

    if (updates.condition && updates.condition !== oldCondition) {
      this.emit('condition-changed', {
        instanceId,
        oldCondition,
        newCondition: updates.condition
      });
    }

    this.emit('instance-updated', { instanceId, updates });
    return instance;
  }

  /**
   * Remove product instance
   */
  removeInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    this.instances.delete(instanceId);
    this.emit('instance-removed', { instanceId, instance });
    return true;
  }

  /**
   * Get product instance
   */
  getInstance(instanceId: string): ProductInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances with optional filtering
   */
  getInstances(filter?: {
    location?: string;
    minQuality?: QualityLevel;
    condition?: ConditionState;
    batchId?: string;
  }): ProductInstance[] {
    let instances = Array.from(this.instances.values());

    if (filter) {
      if (filter.location) {
        instances = instances.filter(i => i.location === filter.location);
      }
      if (filter.minQuality !== undefined) {
        instances = instances.filter(i => i.quality >= filter.minQuality!);
      }
      if (filter.condition) {
        instances = instances.filter(i => i.condition === filter.condition);
      }
      if (filter.batchId) {
        instances = instances.filter(i => i.batchId === filter.batchId);
      }
    }

    return instances;
  }

  /**
   * Get total quantity across all instances
   */
  getTotalQuantity(filter?: {
    location?: string;
    minQuality?: QualityLevel;
    condition?: ConditionState;
  }): number {
    return this.getInstances(filter).reduce((total, instance) => total + instance.quantity, 0);
  }

  /**
   * Add product variant
   */
  addVariant(variant: ProductVariant): void {
    this.variants.set(variant.id, variant);
    this.emit('variant-added', variant);
  }

  /**
   * Remove product variant
   */
  removeVariant(variantId: string): boolean {
    const result = this.variants.delete(variantId);
    if (result) {
      this.emit('variant-removed', { variantId });
    }
    return result;
  }

  /**
   * Get product variant
   */
  getVariant(variantId: string): ProductVariant | undefined {
    return this.variants.get(variantId);
  }

  /**
   * Get all variants
   */
  getVariants(): ProductVariant[] {
    return Array.from(this.variants.values());
  }

  /**
   * Update market data
   */
  updateMarketData(marketData: Partial<MarketData>): void {
    Object.assign(this.spec.marketData, marketData);
    this.emit('market-data-updated', { marketData });
  }

  /**
   * Calculate current market price
   */
  calculateMarketPrice(
    quantity: number = 1,
    quality: QualityLevel = QualityLevel.GOOD,
    currentTime?: TimeStamp
  ): number {
    let price = this.spec.marketData.basePrice;

    // Quality adjustment
    const qualityMultiplier = quality / QualityLevel.PERFECT;
    price *= qualityMultiplier;

    // Quantity discount
    if (quantity > 100) {
      price *= 0.95; // 5% bulk discount
    } else if (quantity > 1000) {
      price *= 0.90; // 10% bulk discount
    }

    // Seasonality adjustment
    if (currentTime) {
      const seasonalMultiplier = this.calculateSeasonalMultiplier(currentTime);
      price *= seasonalMultiplier;
    }

    // Demand/supply adjustment
    const demandMultiplier = Math.max(0.5, Math.min(2.0, this.spec.marketData.demand / 100));
    price *= demandMultiplier;

    return Math.max(0, price);
  }

  /**
   * Calculate seasonal price multiplier
   */
  private calculateSeasonalMultiplier(currentTime: TimeStamp): number {
    const seasonality = this.spec.marketData.seasonality;
    if (seasonality.pattern === 'linear') {
      return 1.0;
    }

    const timeInPeriod = (currentTime.gameTime % seasonality.period) / seasonality.period;
    const phase = timeInPeriod * 2 * Math.PI + seasonality.offset;

    switch (seasonality.pattern) {
      case 'seasonal':
        return 1.0 + seasonality.amplitude * Math.sin(phase);
      case 'cyclical':
        return 1.0 + seasonality.amplitude * Math.cos(phase);
      case 'random':
        return 1.0 + seasonality.amplitude * (Math.random() - 0.5);
      default:
        return 1.0;
    }
  }

  /**
   * Check if product meets quality standards
   */
  meetsQualityStandards(instance: ProductInstance): {
    meets: boolean;
    failures: QualityStandard[];
  } {
    const failures: QualityStandard[] = [];

    for (const standard of this.spec.qualityStandards) {
      // Simplified quality check - in a real implementation,
      // this would involve more complex testing
      const qualityScore = instance.quality;
      const meetsStandard = Math.abs(qualityScore - standard.target) <= standard.tolerance;

      if (!meetsStandard) {
        failures.push(standard);
      }
    }

    return {
      meets: failures.length === 0,
      failures
    };
  }

  /**
   * Age product instance (affects quality and condition)
   */
  ageInstance(instanceId: string, timeElapsed: number): ProductInstance | null {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }

    // Check if product is perishable and past expiry
    if (instance.expiryDate && Date.now() > instance.expiryDate.realTime) {
      instance.condition = ConditionState.POOR;
      instance.quality = Math.max(0, instance.quality - 20);
    }

    // General aging effects
    if (this.spec.properties.perishable) {
      const ageingRate = 0.1; // Quality loss per time unit
      instance.quality = Math.max(0, instance.quality - (timeElapsed * ageingRate));

      if (instance.quality < QualityLevel.FAIR) {
        instance.condition = ConditionState.POOR;
      }
    }

    this.emit('instance-aged', { instanceId, timeElapsed });
    return instance;
  }

  /**
   * Record quality change in history
   */
  private recordQualityChange(data: any): void {
    this.qualityHistory.push({
      timestamp: { gameTime: 0, realTime: Date.now() },
      instanceId: data.instanceId,
      oldQuality: data.oldQuality,
      newQuality: data.newQuality,
      reason: 'manual_update'
    });

    // Keep only last 1000 records
    if (this.qualityHistory.length > 1000) {
      this.qualityHistory.shift();
    }
  }

  /**
   * Record market change in history
   */
  private recordMarketChange(data: any): void {
    this.marketHistory.push({
      timestamp: { gameTime: 0, realTime: Date.now() },
      marketData: { ...data.marketData },
      change: 'update'
    });

    // Keep only last 1000 records
    if (this.marketHistory.length > 1000) {
      this.marketHistory.shift();
    }
  }

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `${this.spec.id}_inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): ProductId {
    return this.spec.id;
  }

  getName(): string {
    return this.spec.name;
  }

  getType(): ResourceType {
    return this.spec.type;
  }

  getSpec(): ProductSpec {
    return { ...this.spec };
  }

  getLifecycle(): ProductLifecycle {
    return { ...this.lifecycle };
  }

  getQualityHistory(): QualityRecord[] {
    return [...this.qualityHistory];
  }

  getMarketHistory(): MarketRecord[] {
    return [...this.marketHistory];
  }

  /**
   * Get product statistics
   */
  getStatistics() {
    const instances = Array.from(this.instances.values());
    const totalQuantity = instances.reduce((sum, inst) => sum + inst.quantity, 0);
    const averageQuality = instances.length > 0 ?
      instances.reduce((sum, inst) => sum + inst.quality, 0) / instances.length : 0;

    const conditionCounts = instances.reduce((counts, inst) => {
      counts[inst.condition] = (counts[inst.condition] || 0) + 1;
      return counts;
    }, {} as Record<ConditionState, number>);

    return {
      totalInstances: instances.length,
      totalQuantity,
      averageQuality,
      conditionCounts,
      variantCount: this.variants.size
    };
  }

  /**
   * Dispose of the product and clean up resources
   */
  dispose(): void {
    this.instances.clear();
    this.variants.clear();
    this.qualityHistory = [];
    this.marketHistory = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface QualityRecord {
  timestamp: TimeStamp;
  instanceId: string;
  oldQuality: QualityLevel;
  newQuality: QualityLevel;
  reason: string;
}

interface MarketRecord {
  timestamp: TimeStamp;
  marketData: Partial<MarketData>;
  change: string;
}