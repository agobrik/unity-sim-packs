import { Product } from './Product';

export interface StationConfiguration {
  name: string;
  type: string;
  capacity: number;
  processingTime: number; // in milliseconds
  efficiency: number; // 0-1
  qualityImpact: number; // -1 to 1
  maintenanceRequired: number; // hours between maintenance
}

export interface ProcessingOperation {
  operation: string;
  duration: number;
  qualityCheck: boolean;
  parameters: Map<string, number>;
}

export class ProductionStation {
  private _configuration: StationConfiguration;
  private _currentProducts: Product[];
  private _queue: Product[];
  private _isOperating: boolean;
  private _lastMaintenance: number;
  private _totalProcessed: number;
  private _defectiveCount: number;
  private _operationHistory: ProcessingOperation[];

  constructor(configuration: StationConfiguration) {
    this._configuration = configuration;
    this._currentProducts = [];
    this._queue = [];
    this._isOperating = false;
    this._lastMaintenance = Date.now();
    this._totalProcessed = 0;
    this._defectiveCount = 0;
    this._operationHistory = [];
  }

  get configuration(): StationConfiguration {
    return { ...this._configuration };
  }

  get currentProducts(): Product[] {
    return [...this._currentProducts];
  }

  get queue(): Product[] {
    return [...this._queue];
  }

  get isOperating(): boolean {
    return this._isOperating;
  }

  get totalProcessed(): number {
    return this._totalProcessed;
  }

  get defectiveCount(): number {
    return this._defectiveCount;
  }

  get operationHistory(): ProcessingOperation[] {
    return [...this._operationHistory];
  }

  addToQueue(product: Product): boolean {
    if (this._queue.length < this._configuration.capacity * 2) {
      this._queue.push(product);
      return true;
    }
    return false;
  }

  startOperation(): void {
    this._isOperating = true;
  }

  stopOperation(): void {
    this._isOperating = false;
  }

  processNext(): Product | null {
    if (!this._isOperating || this._currentProducts.length >= this._configuration.capacity || this._queue.length === 0) {
      return null;
    }

    const product = this._queue.shift()!;
    this._currentProducts.push(product);

    // Simulate processing
    setTimeout(() => {
      this.finishProcessing(product);
    }, this._configuration.processingTime * (1 + Math.random() * 0.2));

    return product;
  }

  private finishProcessing(product: Product): void {
    const index = this._currentProducts.indexOf(product);
    if (index === -1) return;

    this._currentProducts.splice(index, 1);
    this._totalProcessed++;

    // Apply station effects
    this.applyProcessingEffects(product);

    // Update product stage
    product.productionStage = `processed_${this._configuration.name}`;

    // Record operation
    const operation: ProcessingOperation = {
      operation: this._configuration.name,
      duration: this._configuration.processingTime,
      qualityCheck: true,
      parameters: new Map()
    };
    this._operationHistory.push(operation);

    // Check for defects
    if (!product.isQualityCompliant()) {
      this._defectiveCount++;
    }
  }

  private applyProcessingEffects(product: Product): void {
    const efficiency = this.getCurrentEfficiency();
    const qualityImpact = this._configuration.qualityImpact * efficiency;

    // Update quality metrics based on station configuration
    for (const [parameter, currentValue] of product.qualityMetrics) {
      const baseImprovement = qualityImpact * 10;
      const randomVariation = (Math.random() - 0.5) * 5;
      const newValue = currentValue + baseImprovement + randomVariation;

      product.updateQualityMetric(parameter, Math.max(0, newValue));
    }

    // Potentially add defects if efficiency is low
    if (efficiency < 0.7 && Math.random() < 0.1) {
      product.addDefect(`station_${this._configuration.name}_defect`);
    }
  }

  getCurrentEfficiency(): number {
    const timeSinceMaintenance = Date.now() - this._lastMaintenance;
    const maintenanceInterval = this._configuration.maintenanceRequired * 60 * 60 * 1000; // Convert to ms

    if (timeSinceMaintenance > maintenanceInterval) {
      // Efficiency degrades after maintenance interval
      const degradation = Math.min(0.5, (timeSinceMaintenance - maintenanceInterval) / maintenanceInterval);
      return Math.max(0.3, this._configuration.efficiency - degradation);
    }

    return this._configuration.efficiency;
  }

  performMaintenance(): void {
    this._lastMaintenance = Date.now();
    this._isOperating = false;

    // Maintenance takes time
    setTimeout(() => {
      this._isOperating = true;
    }, 30000); // 30 seconds maintenance time
  }

  needsMaintenance(): boolean {
    const timeSinceMaintenance = Date.now() - this._lastMaintenance;
    const maintenanceInterval = this._configuration.maintenanceRequired * 60 * 60 * 1000;
    return timeSinceMaintenance > maintenanceInterval;
  }

  getUtilization(): number {
    const currentLoad = this._currentProducts.length;
    return currentLoad / this._configuration.capacity;
  }

  getQueueLength(): number {
    return this._queue.length;
  }

  getThroughput(): number {
    // Products per hour
    const hoursRunning = Math.max(1, (Date.now() - (this._lastMaintenance - 24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return this._totalProcessed / hoursRunning;
  }

  getDefectRate(): number {
    if (this._totalProcessed === 0) return 0;
    return this._defectiveCount / this._totalProcessed;
  }
}