/**
 * Resource Entity - Represents raw materials and intermediate resources
 */

import { EventEmitter } from '../utils/EventEmitter';
import {
  ResourceId,
  ResourceType,
  ResourceProperties,
  QualityLevel,
  ConditionState,
  TimeStamp,
  TemperatureRange
} from '../core/types';

export interface ResourceSpec {
  id: ResourceId;
  name: string;
  description: string;
  type: ResourceType;
  properties: ResourceProperties;
  supplier?: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: string;
  conversionFactors?: Map<string, number>;
  storageRequirements: StorageRequirement[];
  handlingInstructions: HandlingInstruction[];
  certifications: Certification[];
}

export interface StorageRequirement {
  type: 'temperature' | 'humidity' | 'pressure' | 'light' | 'atmosphere';
  value: number | TemperatureRange;
  critical: boolean;
  tolerance: number;
}

export interface HandlingInstruction {
  operation: 'loading' | 'unloading' | 'transport' | 'storage' | 'processing';
  instruction: string;
  safety: SafetyRequirement[];
  equipment: string[];
}

export interface SafetyRequirement {
  type: 'ppe' | 'training' | 'environment' | 'procedure';
  requirement: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
}

export interface Certification {
  name: string;
  issuingBody: string;
  validFrom: TimeStamp;
  validUntil: TimeStamp;
  scope: string;
  status: 'valid' | 'expired' | 'suspended' | 'revoked';
}

export interface ResourceStock {
  id: string;
  resourceId: ResourceId;
  quantity: number;
  quality: QualityLevel;
  condition: ConditionState;
  location: string;
  batchNumber?: string;
  lotNumber?: string;
  supplierBatch?: string;
  receivedDate: TimeStamp;
  expiryDate?: TimeStamp;
  testResults: TestResult[];
  traceabilityData: TraceabilityRecord[];
  cost: number;
  unitCost: number;
}

export interface TestResult {
  id: string;
  testType: string;
  parameter: string;
  result: number | string;
  unit: string;
  specification: TestSpecification;
  status: 'pass' | 'fail' | 'inconclusive';
  testedBy: string;
  testDate: TimeStamp;
  equipment: string;
  method: string;
}

export interface TestSpecification {
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  acceptableLimits: {
    lower?: number;
    upper?: number;
  };
}

export interface TraceabilityRecord {
  id: string;
  event: 'received' | 'processed' | 'moved' | 'tested' | 'consumed';
  timestamp: TimeStamp;
  location: string;
  operator: string;
  details: Record<string, any>;
  previousRecordId?: string;
}

export interface ResourceCompatibility {
  compatibleResources: ResourceId[];
  incompatibleResources: ResourceId[];
  storageCompatibility: StorageCompatibility[];
  processingCompatibility: ProcessingCompatibility[];
}

export interface StorageCompatibility {
  resourceId: ResourceId;
  compatibilityLevel: 'compatible' | 'conditional' | 'incompatible';
  conditions?: string[];
  restrictions?: string[];
}

export interface ProcessingCompatibility {
  resourceId: ResourceId;
  operationType: string;
  compatibility: 'synergistic' | 'neutral' | 'antagonistic';
  effect: string;
}

export class Resource extends EventEmitter {
  private spec: ResourceSpec;
  private stocks: Map<string, ResourceStock> = new Map();
  private compatibility: ResourceCompatibility;
  private qualityTrends: QualityTrend[] = [];
  private usageHistory: UsageRecord[] = [];
  private priceHistory: PriceRecord[] = [];

  constructor(spec: ResourceSpec) {
    super();
    this.spec = spec;
    this.compatibility = this.initializeCompatibility();
    this.setupEventHandlers();
  }

  /**
   * Initialize resource compatibility
   */
  private initializeCompatibility(): ResourceCompatibility {
    return {
      compatibleResources: [],
      incompatibleResources: [],
      storageCompatibility: [],
      processingCompatibility: []
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('stock-added', (stock) => {
      this.recordUsage('received', stock.quantity, stock.cost);
    });

    this.on('stock-consumed', (data) => {
      this.recordUsage('consumed', data.quantity, data.cost);
    });

    this.on('quality-test-completed', (result) => {
      this.updateQualityTrends(result);
    });
  }

  /**
   * Add new stock to inventory
   */
  addStock(
    quantity: number,
    quality: QualityLevel,
    location: string,
    cost: number,
    options: {
      batchNumber?: string;
      lotNumber?: string;
      supplierBatch?: string;
      expiryDate?: TimeStamp;
      testResults?: TestResult[];
    } = {}
  ): ResourceStock {
    const stock: ResourceStock = {
      id: this.generateStockId(),
      resourceId: this.spec.id,
      quantity,
      quality,
      condition: ConditionState.NEW,
      location,
      batchNumber: options.batchNumber,
      lotNumber: options.lotNumber,
      supplierBatch: options.supplierBatch,
      receivedDate: { gameTime: 0, realTime: Date.now() },
      expiryDate: options.expiryDate,
      testResults: options.testResults || [],
      traceabilityData: [],
      cost,
      unitCost: cost / quantity
    };

    // Add initial traceability record
    stock.traceabilityData.push({
      id: this.generateTraceabilityId(),
      event: 'received',
      timestamp: stock.receivedDate,
      location,
      operator: 'system',
      details: {
        quantity,
        quality,
        batchNumber: options.batchNumber,
        supplierBatch: options.supplierBatch
      }
    });

    this.stocks.set(stock.id, stock);
    this.emit('stock-added', stock);

    return stock;
  }

  /**
   * Consume stock from inventory
   */
  consumeStock(
    stockId: string,
    quantity: number,
    consumer: string,
    operation: string
  ): { success: boolean; consumed: ResourceStock | null; remaining: ResourceStock | null } {
    const stock = this.stocks.get(stockId);
    if (!stock) {
      return { success: false, consumed: null, remaining: null };
    }

    if (stock.quantity < quantity) {
      return { success: false, consumed: null, remaining: null };
    }

    // Create consumed stock record
    const consumed: ResourceStock = {
      ...stock,
      id: this.generateStockId(),
      quantity,
      cost: stock.unitCost * quantity
    };

    // Add traceability record for consumption
    consumed.traceabilityData.push({
      id: this.generateTraceabilityId(),
      event: 'consumed',
      timestamp: { gameTime: 0, realTime: Date.now() },
      location: stock.location,
      operator: consumer,
      details: {
        operation,
        quantityConsumed: quantity,
        remainingQuantity: stock.quantity - quantity
      },
      previousRecordId: stock.traceabilityData[stock.traceabilityData.length - 1]?.id
    });

    // Update remaining stock
    stock.quantity -= quantity;
    stock.cost = stock.unitCost * stock.quantity;

    let remaining: ResourceStock | null = null;
    if (stock.quantity > 0) {
      remaining = { ...stock };
    } else {
      // Remove empty stock
      this.stocks.delete(stockId);
    }

    this.emit('stock-consumed', {
      stockId,
      quantity,
      consumer,
      operation,
      cost: consumed.cost
    });

    return { success: true, consumed, remaining };
  }

  /**
   * Move stock to different location
   */
  moveStock(stockId: string, newLocation: string, operator: string): boolean {
    const stock = this.stocks.get(stockId);
    if (!stock) {
      return false;
    }

    const oldLocation = stock.location;
    stock.location = newLocation;

    // Add traceability record
    stock.traceabilityData.push({
      id: this.generateTraceabilityId(),
      event: 'moved',
      timestamp: { gameTime: 0, realTime: Date.now() },
      location: newLocation,
      operator,
      details: {
        fromLocation: oldLocation,
        toLocation: newLocation
      },
      previousRecordId: stock.traceabilityData[stock.traceabilityData.length - 1]?.id
    });

    this.emit('stock-moved', {
      stockId,
      fromLocation: oldLocation,
      toLocation: newLocation,
      operator
    });

    return true;
  }

  /**
   * Perform quality test on stock
   */
  performQualityTest(
    stockId: string,
    testType: string,
    parameters: { parameter: string; result: number | string; unit: string }[],
    tester: string,
    equipment: string,
    method: string
  ): TestResult[] {
    const stock = this.stocks.get(stockId);
    if (!stock) {
      return [];
    }

    const testResults: TestResult[] = parameters.map(param => ({
      id: this.generateTestId(),
      testType,
      parameter: param.parameter,
      result: param.result,
      unit: param.unit,
      specification: this.getTestSpecification(param.parameter),
      status: this.evaluateTestResult(param.parameter, param.result),
      testedBy: tester,
      testDate: { gameTime: 0, realTime: Date.now() },
      equipment,
      method
    }));

    stock.testResults.push(...testResults);

    // Add traceability record
    stock.traceabilityData.push({
      id: this.generateTraceabilityId(),
      event: 'tested',
      timestamp: { gameTime: 0, realTime: Date.now() },
      location: stock.location,
      operator: tester,
      details: {
        testType,
        parameters: parameters.length,
        results: testResults.map(r => r.status)
      },
      previousRecordId: stock.traceabilityData[stock.traceabilityData.length - 1]?.id
    });

    // Update quality based on test results
    this.updateQualityFromTests(stock, testResults);

    this.emit('quality-test-completed', {
      stockId,
      testResults,
      newQuality: stock.quality
    });

    return testResults;
  }

  /**
   * Get stock by ID
   */
  getStock(stockId: string): ResourceStock | undefined {
    return this.stocks.get(stockId);
  }

  /**
   * Get all stocks with optional filtering
   */
  getStocks(filter?: {
    location?: string;
    minQuality?: QualityLevel;
    condition?: ConditionState;
    batchNumber?: string;
    lotNumber?: string;
    minQuantity?: number;
  }): ResourceStock[] {
    let stocks = Array.from(this.stocks.values());

    if (filter) {
      if (filter.location) {
        stocks = stocks.filter(s => s.location === filter.location);
      }
      if (filter.minQuality !== undefined) {
        stocks = stocks.filter(s => s.quality >= filter.minQuality!);
      }
      if (filter.condition) {
        stocks = stocks.filter(s => s.condition === filter.condition);
      }
      if (filter.batchNumber) {
        stocks = stocks.filter(s => s.batchNumber === filter.batchNumber);
      }
      if (filter.lotNumber) {
        stocks = stocks.filter(s => s.lotNumber === filter.lotNumber);
      }
      if (filter.minQuantity !== undefined) {
        stocks = stocks.filter(s => s.quantity >= filter.minQuantity!);
      }
    }

    return stocks;
  }

  /**
   * Get total quantity across all stocks
   */
  getTotalQuantity(filter?: {
    location?: string;
    minQuality?: QualityLevel;
    condition?: ConditionState;
  }): number {
    return this.getStocks(filter).reduce((total, stock) => total + stock.quantity, 0);
  }

  /**
   * Get average quality of all stocks
   */
  getAverageQuality(filter?: {
    location?: string;
    condition?: ConditionState;
  }): number {
    const stocks = this.getStocks(filter);
    if (stocks.length === 0) return 0;

    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const weightedQuality = stocks.reduce((sum, stock) =>
      sum + (stock.quality * stock.quantity), 0);

    return totalQuantity > 0 ? weightedQuality / totalQuantity : 0;
  }

  /**
   * Check compatibility with another resource
   */
  isCompatibleWith(resourceId: ResourceId, context: 'storage' | 'processing'): boolean {
    if (context === 'storage') {
      const compatibility = this.compatibility.storageCompatibility
        .find(c => c.resourceId === resourceId);
      return compatibility?.compatibilityLevel === 'compatible';
    } else {
      const compatibility = this.compatibility.processingCompatibility
        .find(c => c.resourceId === resourceId);
      return compatibility?.compatibility !== 'antagonistic';
    }
  }

  /**
   * Age all stocks (affects quality and condition)
   */
  ageStocks(timeElapsed: number): void {
    for (const stock of this.stocks.values()) {
      this.ageStock(stock, timeElapsed);
    }
  }

  /**
   * Age individual stock
   */
  private ageStock(stock: ResourceStock, timeElapsed: number): void {
    // Check expiry
    if (stock.expiryDate && Date.now() > stock.expiryDate.realTime) {
      stock.condition = ConditionState.POOR;
      stock.quality = Math.max(0, stock.quality - 30);
    }

    // Apply aging effects based on resource properties
    if (this.spec.properties.perishable) {
      const agingRate = this.calculateAgingRate(stock);
      stock.quality = Math.max(0, stock.quality - (timeElapsed * agingRate));

      if (stock.quality < QualityLevel.FAIR) {
        stock.condition = ConditionState.POOR;
      }
    }
  }

  /**
   * Calculate aging rate based on storage conditions and properties
   */
  private calculateAgingRate(stock: ResourceStock): number {
    let rate = 0.05; // Base aging rate

    // Adjust for storage conditions
    // This would be more complex in a real implementation
    if (stock.condition === ConditionState.POOR) {
      rate *= 2.0;
    } else if (stock.condition === ConditionState.FAIR) {
      rate *= 1.5;
    }

    return rate;
  }

  /**
   * Get test specification for parameter
   */
  private getTestSpecification(parameter: string): TestSpecification {
    // Default specification - would be configurable in real implementation
    return {
      minValue: 0,
      maxValue: 100,
      targetValue: 90,
      tolerance: 10,
      acceptableLimits: {
        lower: 75,
        upper: 100
      }
    };
  }

  /**
   * Evaluate test result against specification
   */
  private evaluateTestResult(parameter: string, result: number | string): 'pass' | 'fail' | 'inconclusive' {
    if (typeof result !== 'number') {
      return 'inconclusive';
    }

    const spec = this.getTestSpecification(parameter);
    if (result >= (spec.acceptableLimits.lower || 0) &&
        result <= (spec.acceptableLimits.upper || 100)) {
      return 'pass';
    }

    return 'fail';
  }

  /**
   * Update stock quality based on test results
   */
  private updateQualityFromTests(stock: ResourceStock, testResults: TestResult[]): void {
    const passRate = testResults.filter(r => r.status === 'pass').length / testResults.length;

    if (passRate >= 0.9) {
      stock.quality = Math.min(QualityLevel.PERFECT, stock.quality + 5);
    } else if (passRate < 0.7) {
      stock.quality = Math.max(0, stock.quality - 10);
    }

    if (stock.quality < QualityLevel.FAIR) {
      stock.condition = ConditionState.POOR;
    }
  }

  /**
   * Record usage history
   */
  private recordUsage(type: 'received' | 'consumed', quantity: number, cost: number): void {
    this.usageHistory.push({
      timestamp: { gameTime: 0, realTime: Date.now() },
      type,
      quantity,
      cost,
      unitCost: cost / quantity
    });

    // Keep only last 1000 records
    if (this.usageHistory.length > 1000) {
      this.usageHistory.shift();
    }
  }

  /**
   * Update quality trends
   */
  private updateQualityTrends(data: any): void {
    const averageQuality = this.getAverageQuality();
    this.qualityTrends.push({
      timestamp: { gameTime: 0, realTime: Date.now() },
      averageQuality,
      stockCount: this.stocks.size,
      testCount: data.testResults.length
    });

    // Keep only last 100 records
    if (this.qualityTrends.length > 100) {
      this.qualityTrends.shift();
    }
  }

  /**
   * Generate unique IDs
   */
  private generateStockId(): string {
    return `${this.spec.id}_stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceabilityId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): ResourceId {
    return this.spec.id;
  }

  getName(): string {
    return this.spec.name;
  }

  getType(): ResourceType {
    return this.spec.type;
  }

  getSpec(): ResourceSpec {
    return { ...this.spec };
  }

  getCompatibility(): ResourceCompatibility {
    return { ...this.compatibility };
  }

  getQualityTrends(): QualityTrend[] {
    return [...this.qualityTrends];
  }

  getUsageHistory(): UsageRecord[] {
    return [...this.usageHistory];
  }

  /**
   * Get resource statistics
   */
  getStatistics() {
    const stocks = Array.from(this.stocks.values());
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const totalValue = stocks.reduce((sum, stock) => sum + stock.cost, 0);
    const averageQuality = this.getAverageQuality();

    const conditionCounts = stocks.reduce((counts, stock) => {
      counts[stock.condition] = (counts[stock.condition] || 0) + 1;
      return counts;
    }, {} as Record<ConditionState, number>);

    return {
      totalStocks: stocks.length,
      totalQuantity,
      totalValue,
      averageQuality,
      conditionCounts,
      averageUnitCost: totalQuantity > 0 ? totalValue / totalQuantity : 0
    };
  }

  /**
   * Dispose of the resource and clean up resources
   */
  dispose(): void {
    this.stocks.clear();
    this.qualityTrends = [];
    this.usageHistory = [];
    this.priceHistory = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface QualityTrend {
  timestamp: TimeStamp;
  averageQuality: number;
  stockCount: number;
  testCount: number;
}

interface UsageRecord {
  timestamp: TimeStamp;
  type: 'received' | 'consumed';
  quantity: number;
  cost: number;
  unitCost: number;
}

interface PriceRecord {
  timestamp: TimeStamp;
  price: number;
  supplier: string;
  quantity: number;
}