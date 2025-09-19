// Core exports
export { GeologicalLayer, RockType, MineralType, MineralDeposit, GeologicalProperty, Position3D } from './core/GeologicalLayer';
export { MiningOperation, MiningMethod, EquipmentType, Equipment, Worker, ExtractionResult } from './core/MiningOperation';
export { GeologyVisualizer, VisualizationData, LayerVisualizationData, MineralMapData, OperationVisualizationData, CrossSectionData, ProductionMetricsData, EnvironmentalData } from './utils/GeologyVisualizer';

import { GeologicalLayer, MineralDeposit, RockType, MineralType } from './core/GeologicalLayer';
import { MiningOperation, MiningMethod, ExtractionResult } from './core/MiningOperation';
import { GeologyVisualizer } from './utils/GeologyVisualizer';

// Main simulation class that combines geological and mining systems
export class MiningGeologySimulation {
  private layers: Map<string, GeologicalLayer>;
  private operations: Map<string, MiningOperation>;
  private visualizer: GeologyVisualizer;
  private isRunning: boolean = false;
  private currentTime: number = 0;
  private totalProduction: number = 0;
  private totalRevenue: number = 0;
  private totalCosts: number = 0;

  constructor() {
    this.layers = new Map();
    this.operations = new Map();
    this.visualizer = new GeologyVisualizer(this.layers, this.operations);
  }

  // Geological layer management
  addGeologicalLayer(layer: GeologicalLayer): void {
    this.layers.set(layer.id, layer);
  }

  removeGeologicalLayer(layerId: string): boolean {
    return this.layers.delete(layerId);
  }

  getGeologicalLayer(layerId: string): GeologicalLayer | undefined {
    return this.layers.get(layerId);
  }

  getAllLayers(): GeologicalLayer[] {
    return Array.from(this.layers.values());
  }

  // Mining operation management
  addMiningOperation(operation: MiningOperation): void {
    this.operations.set(operation.id, operation);
  }

  removeMiningOperation(operationId: string): boolean {
    return this.operations.delete(operationId);
  }

  getMiningOperation(operationId: string): MiningOperation | undefined {
    return this.operations.get(operationId);
  }

  getAllOperations(): MiningOperation[] {
    return Array.from(this.operations.values());
  }

  // Simulation control
  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
    // Stop all operations
    this.operations.forEach(operation => operation.stopOperation());
  }

  step(deltaTime: number = 1): boolean {
    if (!this.isRunning) return false;

    this.currentTime += deltaTime;

    // Simulate each active mining operation
    this.operations.forEach(operation => {
      if (operation.isActive) {
        const result = operation.simulate(deltaTime);

        if (result) {
          // Update production metrics
          this.totalProduction += result.quantity;
          this.totalRevenue += Math.max(0, result.value);
          this.totalCosts += Math.abs(Math.min(0, result.value)); // Costs are negative value

          // Add result to visualizer
          this.visualizer.addExtractionResult(result);

          // Update the geological layer based on extraction
          const targetDeposit = operation.targetDeposit;
          const layer = this.findLayerContainingDeposit(targetDeposit);
          if (layer) {
            layer.degradeFromMining(result.quantity);
          }
        }
      }
    });

    return true;
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.totalProduction = 0;
    this.totalRevenue = 0;
    this.totalCosts = 0;
    this.layers.clear();
    this.operations.clear();
    this.visualizer = new GeologyVisualizer(this.layers, this.operations);
  }

  // Geological survey methods
  conductGeologicalSurvey(layerId: string, surveyAccuracy: number = 0.8): MineralDeposit[] {
    const layer = this.layers.get(layerId);
    if (!layer) return [];

    return layer.conductGeologicalSurvey(surveyAccuracy);
  }

  conductComprehensiveSurvey(surveyAccuracy: number = 0.8): Map<string, MineralDeposit[]> {
    const surveyResults = new Map<string, MineralDeposit[]>();

    this.layers.forEach((layer, layerId) => {
      const deposits = layer.conductGeologicalSurvey(surveyAccuracy);
      if (deposits.length > 0) {
        surveyResults.set(layerId, deposits);
      }
    });

    return surveyResults;
  }

  // Utility methods
  private findLayerContainingDeposit(deposit: MineralDeposit): GeologicalLayer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.mineralDeposits.some(d => d.id === deposit.id)) {
        return layer;
      }
    }
    return undefined;
  }

  getTotalResources(): number {
    let totalResources = 0;
    this.layers.forEach(layer => {
      layer.mineralDeposits.forEach(deposit => {
        totalResources += deposit.volume * deposit.concentration;
      });
    });
    return totalResources;
  }

  getDiscoveredResources(): number {
    let discoveredResources = 0;
    this.layers.forEach(layer => {
      layer.mineralDeposits.forEach(deposit => {
        if (deposit.isDiscovered) {
          discoveredResources += deposit.volume * deposit.concentration;
        }
      });
    });
    return discoveredResources;
  }

  getOverallMetrics(): any {
    const activeOperations = Array.from(this.operations.values()).filter(op => op.isActive).length;
    const totalOperations = this.operations.size;

    let avgEfficiency = 0;
    if (totalOperations > 0) {
      avgEfficiency = Array.from(this.operations.values())
        .reduce((sum, op) => sum + op.efficiency, 0) / totalOperations;
    }

    let totalSafetyIncidents = 0;
    let totalEnvironmentalImpact = 0;
    this.operations.forEach(operation => {
      totalSafetyIncidents += operation.safetyIncidents;
      totalEnvironmentalImpact += operation.environmentalImpact;
    });

    return {
      currentTime: this.currentTime,
      totalLayers: this.layers.size,
      totalOperations: totalOperations,
      activeOperations: activeOperations,
      totalProduction: this.totalProduction,
      totalRevenue: this.totalRevenue,
      totalCosts: this.totalCosts,
      profit: this.totalRevenue - this.totalCosts,
      efficiency: avgEfficiency,
      safetyIncidents: totalSafetyIncidents,
      environmentalImpact: totalEnvironmentalImpact,
      totalResources: this.getTotalResources(),
      discoveredResources: this.getDiscoveredResources()
    };
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  exportState(): string {
    const metrics = this.getOverallMetrics();
    const visualizationData = this.visualizer.generateVisualizationData();

    return JSON.stringify({
      simulationState: {
        currentTime: this.currentTime,
        isRunning: this.isRunning,
        metrics: metrics
      },

      // Geological data
      layers: Array.from(this.layers.entries()).map(([id, layer]) => ({
        id: id,
        depth: layer.depth,
        thickness: layer.thickness,
        rockType: layer.rockType,
        properties: layer.properties,
        stability: layer.stability,
        hasWaterTable: layer.hasWaterTable,
        mineralCount: layer.mineralDeposits.length
      })),

      // Mining operations data
      operations: Array.from(this.operations.entries()).map(([id, operation]) => ({
        id: id,
        name: operation.name,
        method: operation.method,
        isActive: operation.isActive,
        status: operation.getOperationStatus()
      })),

      // Visualization data
      visualizationData: visualizationData,

      timestamp: Date.now()
    }, null, 2);
  }

  // Unity-specific export
  exportToUnity(): string {
    return this.visualizer.exportToUnity();
  }

  // Helper method to create a basic geological setup for testing
  static createBasicSetup(): MiningGeologySimulation {
    const simulation = new MiningGeologySimulation();

    // Create geological layers
    const surfaceLayer = GeologicalLayer.createSedimentaryLayer('surface', 0, 10);
    surfaceLayer.generateRandomDeposits(3, { width: 1000, height: 1000 });

    const shallowLayer = GeologicalLayer.createSedimentaryLayer('shallow', 10, 30);
    shallowLayer.generateRandomDeposits(5, { width: 1000, height: 1000 });

    const deepLayer = GeologicalLayer.createIgneousLayer('deep', 40, 50);
    deepLayer.generateRandomDeposits(4, { width: 1000, height: 1000 });

    const bedrockLayer = GeologicalLayer.createMetamorphicLayer('bedrock', 90, 100);
    bedrockLayer.generateRandomDeposits(2, { width: 1000, height: 1000 });

    simulation.addGeologicalLayer(surfaceLayer);
    simulation.addGeologicalLayer(shallowLayer);
    simulation.addGeologicalLayer(deepLayer);
    simulation.addGeologicalLayer(bedrockLayer);

    // Conduct initial survey to discover some deposits
    simulation.conductComprehensiveSurvey(0.6);

    // Create a basic mining operation
    const discoveredDeposits = surfaceLayer.mineralDeposits.filter(d => d.isDiscovered);
    if (discoveredDeposits.length > 0) {
      const targetDeposit = discoveredDeposits[0];

      const miningOp = new MiningOperation(
        'basic_operation_01',
        'Basic Surface Mine',
        MiningMethod.SURFACE,
        targetDeposit,
        { x: targetDeposit.position.x, y: targetDeposit.position.y, z: 0 }
      );

      // Add basic equipment and workers
      const equipment = MiningOperation.createBasicSurfaceMiningEquipment();
      const workers = MiningOperation.createBasicWorkforce();

      equipment.forEach(eq => miningOp.addEquipment(eq));
      workers.forEach(worker => miningOp.addWorker(worker));

      simulation.addMiningOperation(miningOp);
    }

    return simulation;
  }
}