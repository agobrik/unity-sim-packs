import { Product, ProductSpecification } from './Product';
import { ProductionStation } from './ProductionStation';

export interface LineConfiguration {
  name: string;
  targetThroughput: number; // products per hour
  qualityTarget: number; // 0-1
  stations: ProductionStation[];
}

export interface ProductionMetrics {
  throughput: number;
  utilization: number;
  qualityScore: number;
  defectRate: number;
  efficiency: number;
  bottleneck: string | null;
}

export class ProductionLine {
  private _configuration: LineConfiguration;
  private _stations: ProductionStation[];
  private _activeProducts: Map<string, Product>;
  private _completedProducts: Product[];
  private _productSpecs: ProductSpecification[];
  private _isRunning: boolean;
  private _startTime: number;
  private _cycleTime: number;

  constructor(configuration: LineConfiguration) {
    this._configuration = configuration;
    this._stations = [...configuration.stations];
    this._activeProducts = new Map();
    this._completedProducts = [];
    this._productSpecs = [];
    this._isRunning = false;
    this._startTime = Date.now();
    this._cycleTime = 0;
  }

  get configuration(): LineConfiguration {
    return { ...this._configuration };
  }

  get stations(): ProductionStation[] {
    return [...this._stations];
  }

  get activeProducts(): Product[] {
    return Array.from(this._activeProducts.values());
  }

  get completedProducts(): Product[] {
    return [...this._completedProducts];
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get cycleTime(): number {
    return this._cycleTime;
  }

  addProductSpecification(spec: ProductSpecification): void {
    this._productSpecs.push(spec);
  }

  start(): void {
    this._isRunning = true;
    this._startTime = Date.now();

    // Start all stations
    this._stations.forEach(station => station.startOperation());

    // Start production cycle
    this.runProductionCycle();
  }

  stop(): void {
    this._isRunning = false;

    // Stop all stations
    this._stations.forEach(station => station.stopOperation());
  }

  private runProductionCycle(): void {
    if (!this._isRunning) return;

    // Create new products if needed
    this.createProducts();

    // Process products through stations
    this.processProductsThroughStations();

    // Check for completed products
    this.collectCompletedProducts();

    // Calculate cycle time
    this.updateCycleTime();

    // Schedule next cycle
    setTimeout(() => this.runProductionCycle(), 1000); // Run every second
  }

  private createProducts(): void {
    if (this._productSpecs.length === 0) return;

    const targetRate = this._configuration.targetThroughput / 3600; // per second
    const shouldCreate = Math.random() < targetRate;

    if (shouldCreate && this._stations.length > 0) {
      const spec = this._productSpecs[Math.floor(Math.random() * this._productSpecs.length)];
      const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const product = new Product(productId, spec);

      this._activeProducts.set(productId, product);

      // Add to first station queue
      this._stations[0].addToQueue(product);
    }
  }

  private processProductsThroughStations(): void {
    for (let i = 0; i < this._stations.length; i++) {
      const station = this._stations[i];
      const nextStation = i < this._stations.length - 1 ? this._stations[i + 1] : null;

      // Process products at current station
      const processedProduct = station.processNext();

      // Move completed products to next station
      const completedProducts = station.currentProducts.filter(p =>
        p.productionStage === `processed_${station.configuration.name}`
      );

      completedProducts.forEach(product => {
        if (nextStation) {
          nextStation.addToQueue(product);
        } else {
          // Product completed the line
          this._completedProducts.push(product);
          this._activeProducts.delete(product.id);
        }
      });
    }
  }

  private collectCompletedProducts(): void {
    // This is handled in processProductsThroughStations
    // but we can add additional logic here if needed
  }

  private updateCycleTime(): void {
    if (this._completedProducts.length > 1) {
      const recentProducts = this._completedProducts.slice(-10);
      const times = recentProducts.map(p => p.getProductionTime());
      this._cycleTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  }

  getMetrics(): ProductionMetrics {
    const runningTime = (Date.now() - this._startTime) / (1000 * 60 * 60); // hours
    const throughput = runningTime > 0 ? this._completedProducts.length / runningTime : 0;

    // Calculate utilization
    const totalUtilization = this._stations.reduce((sum, station) =>
      sum + station.getUtilization(), 0
    );
    const utilization = totalUtilization / this._stations.length;

    // Calculate quality metrics
    const qualityScores = this._completedProducts.map(p => p.calculateQualityScore());
    const qualityScore = qualityScores.length > 0 ?
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

    // Calculate defect rate
    const defectiveProducts = this._completedProducts.filter(p => !p.isQualityCompliant()).length;
    const defectRate = this._completedProducts.length > 0 ?
      defectiveProducts / this._completedProducts.length : 0;

    // Calculate efficiency
    const targetThroughput = this._configuration.targetThroughput;
    const efficiency = targetThroughput > 0 ? throughput / targetThroughput : 0;

    // Identify bottleneck
    const bottleneck = this.identifyBottleneck();

    return {
      throughput,
      utilization,
      qualityScore,
      defectRate,
      efficiency,
      bottleneck
    };
  }

  private identifyBottleneck(): string | null {
    let slowestStation: ProductionStation | null = null;
    let lowestThroughput = Infinity;

    for (const station of this._stations) {
      const throughput = station.getThroughput();
      if (throughput < lowestThroughput) {
        lowestThroughput = throughput;
        slowestStation = station;
      }
    }

    return slowestStation ? slowestStation.configuration.name : null;
  }

  getStationMetrics(stationName: string): any {
    const station = this._stations.find(s => s.configuration.name === stationName);
    if (!station) return null;

    return {
      name: stationName,
      utilization: station.getUtilization(),
      queueLength: station.getQueueLength(),
      throughput: station.getThroughput(),
      defectRate: station.getDefectRate(),
      efficiency: station.getCurrentEfficiency(),
      needsMaintenance: station.needsMaintenance()
    };
  }

  getAllStationMetrics(): any[] {
    return this._stations.map(station => this.getStationMetrics(station.configuration.name));
  }

  getProductionStatus(): any {
    return {
      isRunning: this._isRunning,
      activeProducts: this._activeProducts.size,
      completedProducts: this._completedProducts.length,
      cycleTime: this._cycleTime,
      metrics: this.getMetrics(),
      stations: this.getAllStationMetrics()
    };
  }
}