import { ProductionLine, ProductionMetrics } from '../core/ProductionLine';
import { Product } from '../core/Product';

export interface VisualizationData {
  productionFlow: ProductFlowData[];
  stationStates: StationStateData[];
  qualityHeatmap: QualityDataPoint[];
  throughputGraph: ThroughputDataPoint[];
  defectAnalysis: DefectAnalysisData;
}

export interface ProductFlowData {
  productId: string;
  currentStation: string;
  stage: string;
  progress: number; // 0-1
  qualityScore: number;
  defects: string[];
}

export interface StationStateData {
  name: string;
  position: { x: number; y: number };
  status: 'idle' | 'working' | 'maintenance' | 'error';
  utilization: number;
  queueLength: number;
  efficiency: number;
  throughput: number;
}

export interface QualityDataPoint {
  x: number;
  y: number;
  value: number;
  station: string;
}

export interface ThroughputDataPoint {
  timestamp: number;
  value: number;
  station: string;
}

export interface DefectAnalysisData {
  totalDefects: number;
  defectsByType: Map<string, number>;
  defectsByStation: Map<string, number>;
  trendData: Array<{ timestamp: number; count: number }>;
}

export class ManufacturingVisualizer {
  private _productionLine: ProductionLine;
  private _throughputHistory: ThroughputDataPoint[];
  private _qualityHistory: Array<{ timestamp: number; score: number }>;

  constructor(productionLine: ProductionLine) {
    this._productionLine = productionLine;
    this._throughputHistory = [];
    this._qualityHistory = [];
  }

  generateVisualizationData(): VisualizationData {
    this.updateHistoricalData();

    return {
      productionFlow: this.generateProductFlowData(),
      stationStates: this.generateStationStateData(),
      qualityHeatmap: this.generateQualityHeatmap(),
      throughputGraph: this.generateThroughputGraph(),
      defectAnalysis: this.generateDefectAnalysis()
    };
  }

  private updateHistoricalData(): void {
    const currentTime = Date.now();
    const metrics = this._productionLine.getMetrics();

    // Update throughput history
    this._throughputHistory.push({
      timestamp: currentTime,
      value: metrics.throughput,
      station: 'overall'
    });

    // Update quality history
    this._qualityHistory.push({
      timestamp: currentTime,
      score: metrics.qualityScore
    });

    // Keep only last 100 data points
    if (this._throughputHistory.length > 100) {
      this._throughputHistory = this._throughputHistory.slice(-100);
    }
    if (this._qualityHistory.length > 100) {
      this._qualityHistory = this._qualityHistory.slice(-100);
    }
  }

  private generateProductFlowData(): ProductFlowData[] {
    const activeProducts = this._productionLine.activeProducts;
    const stations = this._productionLine.stations;

    return activeProducts.map(product => {
      const currentStationName = this.getCurrentStation(product, stations);
      const progress = this.calculateProgress(product, stations);

      return {
        productId: product.id,
        currentStation: currentStationName,
        stage: product.productionStage,
        progress: progress,
        qualityScore: product.calculateQualityScore(),
        defects: product.defects
      };
    });
  }

  private getCurrentStation(product: Product, stations: any[]): string {
    // Find which station currently has this product
    for (const station of stations) {
      if (station.currentProducts.some((p: Product) => p.id === product.id) ||
          station.queue.some((p: Product) => p.id === product.id)) {
        return station.configuration.name;
      }
    }
    return 'unknown';
  }

  private calculateProgress(product: Product, stations: any[]): number {
    const currentStation = this.getCurrentStation(product, stations);
    const stationIndex = stations.findIndex(s => s.configuration.name === currentStation);

    if (stationIndex === -1) return 0;

    const baseProgress = stationIndex / stations.length;
    const stationProgress = 1 / stations.length;

    // Estimate progress within current station based on production time
    const productionTime = product.getProductionTime();
    const avgProcessingTime = stations[stationIndex]?.configuration.processingTime || 10000;
    const inStationProgress = Math.min(1, productionTime / avgProcessingTime);

    return baseProgress + (inStationProgress * stationProgress);
  }

  private generateStationStateData(): StationStateData[] {
    const stations = this._productionLine.stations;

    return stations.map((station, index) => {
      const metrics = this._productionLine.getStationMetrics(station.configuration.name);

      let status: 'idle' | 'working' | 'maintenance' | 'error';
      if (station.needsMaintenance()) {
        status = 'maintenance';
      } else if (!station.isOperating) {
        status = 'idle';
      } else if (station.currentProducts.length > 0) {
        status = 'working';
      } else {
        status = 'idle';
      }

      return {
        name: station.configuration.name,
        position: { x: index * 150, y: 100 }, // Layout stations horizontally
        status: status,
        utilization: metrics?.utilization || 0,
        queueLength: metrics?.queueLength || 0,
        efficiency: metrics?.efficiency || 0,
        throughput: metrics?.throughput || 0
      };
    });
  }

  private generateQualityHeatmap(): QualityDataPoint[] {
    const stations = this._productionLine.stations;
    const completedProducts = this._productionLine.completedProducts;
    const qualityData: QualityDataPoint[] = [];

    stations.forEach((station, stationIndex) => {
      // Get quality scores for products that went through this station
      const relevantProducts = completedProducts.filter(product =>
        product.productionStage.includes(station.configuration.name)
      );

      if (relevantProducts.length > 0) {
        const avgQuality = relevantProducts.reduce((sum, product) =>
          sum + product.calculateQualityScore(), 0) / relevantProducts.length;

        qualityData.push({
          x: stationIndex * 150 + 75, // Center on station
          y: 100,
          value: avgQuality,
          station: station.configuration.name
        });
      }
    });

    return qualityData;
  }

  private generateThroughputGraph(): ThroughputDataPoint[] {
    // Return recent throughput history with station-specific data
    const recentData = this._throughputHistory.slice(-50);
    const stationData: ThroughputDataPoint[] = [];

    // Add overall throughput
    stationData.push(...recentData);

    // Add station-specific throughput
    const stations = this._productionLine.stations;
    const currentTime = Date.now();

    stations.forEach(station => {
      stationData.push({
        timestamp: currentTime,
        value: station.getThroughput(),
        station: station.configuration.name
      });
    });

    return stationData;
  }

  private generateDefectAnalysis(): DefectAnalysisData {
    const completedProducts = this._productionLine.completedProducts;
    const defectsByType = new Map<string, number>();
    const defectsByStation = new Map<string, number>();
    let totalDefects = 0;

    // Analyze defects
    completedProducts.forEach(product => {
      product.defects.forEach(defect => {
        totalDefects++;

        // Count by type
        const count = defectsByType.get(defect) || 0;
        defectsByType.set(defect, count + 1);

        // Extract station from defect name if possible
        const stationMatch = defect.match(/station_(.+)_defect/);
        if (stationMatch) {
          const station = stationMatch[1];
          const stationCount = defectsByStation.get(station) || 0;
          defectsByStation.set(station, stationCount + 1);
        }
      });
    });

    // Generate trend data (simplified)
    const trendData = this._qualityHistory.map(entry => ({
      timestamp: entry.timestamp,
      count: Math.max(0, Math.round((1 - entry.score) * 10)) // Estimate defects from quality score
    }));

    return {
      totalDefects,
      defectsByType,
      defectsByStation,
      trendData
    };
  }

  exportToUnity(): string {
    const data = this.generateVisualizationData();
    const metrics = this._productionLine.getMetrics();
    const status = this._productionLine.getProductionStatus();

    return JSON.stringify({
      // Core simulation state
      isRunning: status.isRunning,
      activeProducts: status.activeProducts,
      completedProducts: status.completedProducts,
      cycleTime: status.cycleTime,

      // Performance metrics
      metrics: {
        throughput: metrics.throughput,
        utilization: metrics.utilization,
        qualityScore: metrics.qualityScore,
        defectRate: metrics.defectRate,
        efficiency: metrics.efficiency,
        bottleneck: metrics.bottleneck
      },

      // Visualization data
      productionFlow: data.productionFlow,
      stations: data.stationStates.map(station => ({
        name: station.name,
        x: station.position.x,
        y: station.position.y,
        status: station.status,
        utilization: station.utilization,
        queueLength: station.queueLength,
        efficiency: station.efficiency,
        throughput: station.throughput
      })),

      qualityHeatmap: data.qualityHeatmap,
      throughputGraph: data.throughputGraph.slice(-20), // Last 20 data points

      defectAnalysis: {
        totalDefects: data.defectAnalysis.totalDefects,
        defectsByType: Object.fromEntries(data.defectAnalysis.defectsByType),
        defectsByStation: Object.fromEntries(data.defectAnalysis.defectsByStation),
        recentTrend: data.defectAnalysis.trendData.slice(-10)
      },

      timestamp: Date.now()
    }, null, 2);
  }

  getProductionDashboard(): any {
    const data = this.generateVisualizationData();
    const metrics = this._productionLine.getMetrics();

    return {
      overview: {
        throughput: metrics.throughput,
        efficiency: metrics.efficiency,
        qualityScore: metrics.qualityScore,
        defectRate: metrics.defectRate
      },
      stations: data.stationStates,
      products: data.productionFlow,
      alerts: this.generateAlerts()
    };
  }

  private generateAlerts(): string[] {
    const alerts: string[] = [];
    const metrics = this._productionLine.getMetrics();
    const stations = this._productionLine.stations;

    // Check for performance issues
    if (metrics.efficiency < 0.7) {
      alerts.push(`Low efficiency: ${(metrics.efficiency * 100).toFixed(1)}%`);
    }

    if (metrics.defectRate > 0.1) {
      alerts.push(`High defect rate: ${(metrics.defectRate * 100).toFixed(1)}%`);
    }

    if (metrics.bottleneck) {
      alerts.push(`Bottleneck detected at: ${metrics.bottleneck}`);
    }

    // Check station-specific issues
    stations.forEach(station => {
      if (station.needsMaintenance()) {
        alerts.push(`${station.configuration.name} needs maintenance`);
      }

      if (station.getUtilization() > 0.95) {
        alerts.push(`${station.configuration.name} is overutilized`);
      }
    });

    return alerts;
  }
}