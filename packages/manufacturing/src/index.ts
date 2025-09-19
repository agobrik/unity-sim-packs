export { Product, ProductSpecification, QualityRequirement } from './core/Product';
export { ProductionStation, StationConfiguration, ProcessingOperation } from './core/ProductionStation';
export { ProductionLine, LineConfiguration, ProductionMetrics } from './core/ProductionLine';
export { ManufacturingVisualizer, VisualizationData, ProductFlowData, StationStateData, QualityDataPoint, ThroughputDataPoint, DefectAnalysisData } from './utils/ManufacturingVisualizer';

import { ProductionLine } from './core/ProductionLine';
import { ProductionStation } from './core/ProductionStation';
import { ManufacturingVisualizer } from './utils/ManufacturingVisualizer';
import { ProductSpecification } from './core/Product';

// Main simulation class that combines all manufacturing components
export class ManufacturingSimulation {
  private productionLines: ProductionLine[];
  private visualizer: ManufacturingVisualizer | null;
  private isRunning: boolean = false;

  constructor() {
    this.productionLines = [];
    this.visualizer = null;
  }

  addProductionLine(line: ProductionLine): void {
    this.productionLines.push(line);

    // Set visualizer to the first line added (can be extended for multiple lines)
    if (!this.visualizer && this.productionLines.length === 1) {
      this.visualizer = new ManufacturingVisualizer(line);
    }
  }

  removeProductionLine(lineName: string): boolean {
    const index = this.productionLines.findIndex(line => line.configuration.name === lineName);
    if (index > -1) {
      this.productionLines.splice(index, 1);
      return true;
    }
    return false;
  }

  getProductionLine(name: string): ProductionLine | null {
    return this.productionLines.find(line => line.configuration.name === name) || null;
  }

  getAllProductionLines(): ProductionLine[] {
    return [...this.productionLines];
  }

  start(): void {
    this.isRunning = true;
    this.productionLines.forEach(line => line.start());
  }

  stop(): void {
    this.isRunning = false;
    this.productionLines.forEach(line => line.stop());
  }

  reset(): void {
    this.stop();
    this.productionLines = [];
    this.visualizer = null;
  }

  step(): boolean {
    if (!this.isRunning) return false;

    // Manufacturing simulation runs continuously,
    // so we just return the running status
    return this.productionLines.some(line => line.isRunning);
  }

  getOverallMetrics(): any {
    if (this.productionLines.length === 0) {
      return {
        totalThroughput: 0,
        averageUtilization: 0,
        averageQualityScore: 0,
        totalDefectRate: 0,
        linesRunning: 0
      };
    }

    let totalThroughput = 0;
    let totalUtilization = 0;
    let totalQualityScore = 0;
    let totalDefectRate = 0;
    let linesRunning = 0;

    this.productionLines.forEach(line => {
      const metrics = line.getMetrics();
      totalThroughput += metrics.throughput;
      totalUtilization += metrics.utilization;
      totalQualityScore += metrics.qualityScore;
      totalDefectRate += metrics.defectRate;

      if (line.isRunning) {
        linesRunning++;
      }
    });

    return {
      totalThroughput,
      averageUtilization: totalUtilization / this.productionLines.length,
      averageQualityScore: totalQualityScore / this.productionLines.length,
      totalDefectRate: totalDefectRate / this.productionLines.length,
      linesRunning
    };
  }

  exportState(): string {
    if (this.visualizer) {
      return this.visualizer.exportToUnity();
    }

    // Fallback export if no visualizer is available
    return JSON.stringify({
      isRunning: this.isRunning,
      productionLines: this.productionLines.length,
      overallMetrics: this.getOverallMetrics(),
      timestamp: Date.now()
    }, null, 2);
  }

  // Helper method to create a simple manufacturing setup for testing
  static createBasicSetup(): ManufacturingSimulation {
    const simulation = new ManufacturingSimulation();

    // Create stations
    const cuttingStation = new ProductionStation({
      name: 'cutting',
      type: 'machining',
      capacity: 2,
      processingTime: 5000, // 5 seconds
      efficiency: 0.9,
      qualityImpact: 0.8,
      maintenanceRequired: 8 // 8 hours
    });

    const assemblyStation = new ProductionStation({
      name: 'assembly',
      type: 'assembly',
      capacity: 1,
      processingTime: 8000, // 8 seconds
      efficiency: 0.85,
      qualityImpact: 0.9,
      maintenanceRequired: 6 // 6 hours
    });

    const qualityStation = new ProductionStation({
      name: 'quality_control',
      type: 'inspection',
      capacity: 1,
      processingTime: 3000, // 3 seconds
      efficiency: 0.95,
      qualityImpact: 0.1,
      maintenanceRequired: 12 // 12 hours
    });

    // Create production line
    const productionLine = new ProductionLine({
      name: 'main_line',
      targetThroughput: 100, // 100 products per hour
      qualityTarget: 0.95,
      stations: [cuttingStation, assemblyStation, qualityStation]
    });

    // Add product specification
    const productSpec: ProductSpecification = {
      name: 'Widget A',
      type: 'widget',
      dimensions: { width: 10, height: 5, depth: 2 },
      weight: 0.5,
      materials: ['aluminum', 'plastic'],
      qualityRequirements: [
        { parameter: 'dimension_tolerance', minValue: 9.5, maxValue: 10.5, tolerance: 0.1 },
        { parameter: 'surface_finish', minValue: 8.0, maxValue: 10.0, tolerance: 0.5 },
        { parameter: 'strength', minValue: 50.0, maxValue: 100.0, tolerance: 2.0 }
      ]
    };

    productionLine.addProductSpecification(productSpec);
    simulation.addProductionLine(productionLine);

    return simulation;
  }
}