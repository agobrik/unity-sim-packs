import { GeologicalLayer, MineralDeposit, RockType, MineralType } from '../core/GeologicalLayer';
import { MiningOperation, MiningMethod, ExtractionResult } from '../core/MiningOperation';

export interface VisualizationData {
  layerVisualization: LayerVisualizationData[];
  mineralMap: MineralMapData[];
  miningOperations: OperationVisualizationData[];
  crossSection: CrossSectionData;
  productionMetrics: ProductionMetricsData;
  environmentalData: EnvironmentalData;
}

export interface LayerVisualizationData {
  id: string;
  depth: number;
  thickness: number;
  rockType: RockType;
  color: string;
  hardness: number;
  stability: number;
  hasWaterTable: boolean;
  mineralCount: number;
}

export interface MineralMapData {
  id: string;
  type: MineralType;
  position: { x: number; y: number; z: number };
  size: number;
  concentration: number;
  value: number;
  isDiscovered: boolean;
  isBeingMined: boolean;
  color: string;
}

export interface OperationVisualizationData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  method: MiningMethod;
  isActive: boolean;
  efficiency: number;
  dailyOutput: number;
  safetyStatus: 'safe' | 'warning' | 'danger';
  environmentalImpact: number;
}

export interface CrossSectionData {
  layers: Array<{
    depth: number;
    thickness: number;
    rockType: RockType;
    color: string;
  }>;
  deposits: Array<{
    depth: number;
    type: MineralType;
    size: number;
    discovered: boolean;
  }>;
  operations: Array<{
    depth: number;
    method: MiningMethod;
    active: boolean;
  }>;
}

export interface ProductionMetricsData {
  totalProduction: number;
  productionByMineral: { [key in MineralType]?: number };
  dailyProductionRate: number;
  totalValue: number;
  operationalCosts: number;
  profit: number;
  efficiency: number;
}

export interface EnvironmentalData {
  totalImpact: number;
  impactByOperation: Array<{ operationId: string; impact: number }>;
  waterContamination: number;
  airQuality: number;
  landDisruption: number;
  rehabilitationNeeded: number;
}

export class GeologyVisualizer {
  private layers: Map<string, GeologicalLayer>;
  private operations: Map<string, MiningOperation>;
  private extractionHistory: ExtractionResult[];

  constructor(
    layers: Map<string, GeologicalLayer>,
    operations: Map<string, MiningOperation>
  ) {
    this.layers = layers;
    this.operations = operations;
    this.extractionHistory = [];
  }

  addExtractionResult(result: ExtractionResult): void {
    this.extractionHistory.push(result);

    // Keep only last 100 results
    if (this.extractionHistory.length > 100) {
      this.extractionHistory = this.extractionHistory.slice(-100);
    }
  }

  generateVisualizationData(): VisualizationData {
    return {
      layerVisualization: this.generateLayerVisualization(),
      mineralMap: this.generateMineralMap(),
      miningOperations: this.generateOperationVisualization(),
      crossSection: this.generateCrossSection(),
      productionMetrics: this.generateProductionMetrics(),
      environmentalData: this.generateEnvironmentalData()
    };
  }

  private generateLayerVisualization(): LayerVisualizationData[] {
    return Array.from(this.layers.values()).map(layer => ({
      id: layer.id,
      depth: layer.depth,
      thickness: layer.thickness,
      rockType: layer.rockType,
      color: this.getRockTypeColor(layer.rockType),
      hardness: layer.properties.hardness,
      stability: layer.stability,
      hasWaterTable: layer.hasWaterTable,
      mineralCount: layer.mineralDeposits.length
    }));
  }

  private generateMineralMap(): MineralMapData[] {
    const mineralMap: MineralMapData[] = [];

    this.layers.forEach(layer => {
      layer.mineralDeposits.forEach(deposit => {
        const isBeingMined = Array.from(this.operations.values()).some(op =>
          op.targetDeposit.id === deposit.id && op.isActive
        );

        mineralMap.push({
          id: deposit.id,
          type: deposit.type,
          position: deposit.position,
          size: Math.sqrt(deposit.volume) * 0.1, // Scale for visualization
          concentration: deposit.concentration,
          value: deposit.estimatedValue * deposit.volume * deposit.concentration,
          isDiscovered: deposit.isDiscovered,
          isBeingMined: isBeingMined,
          color: this.getMineralTypeColor(deposit.type)
        });
      });
    });

    return mineralMap;
  }

  private generateOperationVisualization(): OperationVisualizationData[] {
    return Array.from(this.operations.values()).map(operation => {
      const status = operation.getOperationStatus();

      let safetyStatus: 'safe' | 'warning' | 'danger' = 'safe';
      if (status.safetyRecord.incidents > 3) safetyStatus = 'danger';
      else if (status.safetyRecord.incidents > 1) safetyStatus = 'warning';

      return {
        id: operation.id,
        name: operation.name,
        position: operation.position,
        method: operation.method,
        isActive: operation.isActive,
        efficiency: operation.efficiency,
        dailyOutput: operation.dailyOutput,
        safetyStatus: safetyStatus,
        environmentalImpact: operation.environmentalImpact
      };
    });
  }

  private generateCrossSection(): CrossSectionData {
    // Sort layers by depth
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => a.depth - b.depth);

    const crossSection: CrossSectionData = {
      layers: sortedLayers.map(layer => ({
        depth: layer.depth,
        thickness: layer.thickness,
        rockType: layer.rockType,
        color: this.getRockTypeColor(layer.rockType)
      })),
      deposits: [],
      operations: []
    };

    // Add mineral deposits to cross section
    sortedLayers.forEach(layer => {
      layer.mineralDeposits.forEach(deposit => {
        if (deposit.isDiscovered) {
          crossSection.deposits.push({
            depth: deposit.position.z,
            type: deposit.type,
            size: Math.sqrt(deposit.volume) * 0.05,
            discovered: deposit.isDiscovered
          });
        }
      });
    });

    // Add mining operations to cross section
    this.operations.forEach(operation => {
      crossSection.operations.push({
        depth: operation.position.z,
        method: operation.method,
        active: operation.isActive
      });
    });

    return crossSection;
  }

  private generateProductionMetrics(): ProductionMetricsData {
    let totalProduction = 0;
    let totalValue = 0;
    let totalCosts = 0;
    const productionByMineral: { [key in MineralType]?: number } = {};

    // Calculate from extraction history
    this.extractionHistory.forEach(result => {
      totalProduction += result.quantity;
      totalValue += result.value + Math.abs(result.value * 0.1); // Add back costs for gross value

      if (!productionByMineral[result.mineral]) {
        productionByMineral[result.mineral] = 0;
      }
      productionByMineral[result.mineral]! += result.quantity;
    });

    // Calculate operational costs
    this.operations.forEach(operation => {
      totalCosts += operation.operationalCosts;
    });

    // Calculate daily production rate (average of last 7 days)
    const recentResults = this.extractionHistory.slice(-7);
    const dailyProductionRate = recentResults.length > 0 ?
      recentResults.reduce((sum, result) => sum + result.quantity, 0) / recentResults.length : 0;

    // Calculate overall efficiency
    const totalOperations = this.operations.size;
    const avgEfficiency = totalOperations > 0 ?
      Array.from(this.operations.values())
        .reduce((sum, op) => sum + op.efficiency, 0) / totalOperations : 0;

    return {
      totalProduction,
      productionByMineral,
      dailyProductionRate,
      totalValue,
      operationalCosts: totalCosts,
      profit: totalValue - totalCosts,
      efficiency: avgEfficiency
    };
  }

  private generateEnvironmentalData(): EnvironmentalData {
    let totalImpact = 0;
    const impactByOperation: Array<{ operationId: string; impact: number }> = [];

    this.operations.forEach(operation => {
      const impact = operation.environmentalImpact;
      totalImpact += impact;
      impactByOperation.push({
        operationId: operation.id,
        impact: impact
      });
    });

    // Calculate specific environmental metrics
    const waterContamination = this.calculateWaterContamination();
    const airQuality = this.calculateAirQuality();
    const landDisruption = this.calculateLandDisruption();
    const rehabilitationNeeded = this.calculateRehabilitationNeeds();

    return {
      totalImpact,
      impactByOperation,
      waterContamination,
      airQuality,
      landDisruption,
      rehabilitationNeeded
    };
  }

  private calculateWaterContamination(): number {
    let contamination = 0;

    this.layers.forEach(layer => {
      if (layer.hasWaterTable) {
        // Check for nearby mining operations
        this.operations.forEach(operation => {
          if (Math.abs(operation.position.z - layer.depth) < 20) {
            contamination += operation.environmentalImpact * 0.3;
          }
        });
      }
    });

    return Math.min(1, contamination);
  }

  private calculateAirQuality(): number {
    let airPollution = 0;

    this.operations.forEach(operation => {
      // Surface operations contribute more to air pollution
      if (operation.method === MiningMethod.SURFACE ||
          operation.method === MiningMethod.OPEN_PIT ||
          operation.method === MiningMethod.QUARRYING) {
        airPollution += operation.environmentalImpact * 0.4;
      } else {
        airPollution += operation.environmentalImpact * 0.1;
      }
    });

    return Math.max(0, 1 - Math.min(1, airPollution));
  }

  private calculateLandDisruption(): number {
    let disruption = 0;

    this.operations.forEach(operation => {
      // Different methods cause different levels of land disruption
      const disruptionFactors = {
        [MiningMethod.SURFACE]: 0.8,
        [MiningMethod.OPEN_PIT]: 0.9,
        [MiningMethod.UNDERGROUND]: 0.2,
        [MiningMethod.SHAFT]: 0.1,
        [MiningMethod.QUARRYING]: 0.7,
        [MiningMethod.HYDRAULIC]: 0.6
      };

      disruption += operation.environmentalImpact * disruptionFactors[operation.method];
    });

    return Math.min(1, disruption);
  }

  private calculateRehabilitationNeeds(): number {
    // Calculate how much land needs rehabilitation based on extraction
    let needsRehab = 0;

    this.operations.forEach(operation => {
      if (!operation.isActive && operation.totalExtracted > 0) {
        needsRehab += operation.environmentalImpact;
      }
    });

    return Math.min(1, needsRehab);
  }

  // Color mapping for visualization
  private getRockTypeColor(rockType: RockType): string {
    const colors = {
      [RockType.SEDIMENTARY]: '#D2B48C', // Tan
      [RockType.IGNEOUS]: '#696969', // Dark gray
      [RockType.METAMORPHIC]: '#708090' // Slate gray
    };
    return colors[rockType];
  }

  private getMineralTypeColor(mineralType: MineralType): string {
    const colors = {
      [MineralType.COAL]: '#2F2F2F', // Dark gray
      [MineralType.IRON_ORE]: '#CD853F', // Peru
      [MineralType.COPPER]: '#B87333', // Copper
      [MineralType.GOLD]: '#FFD700', // Gold
      [MineralType.SILVER]: '#C0C0C0', // Silver
      [MineralType.DIAMOND]: '#B9F2FF', // Light cyan
      [MineralType.LIMESTONE]: '#F5F5DC', // Beige
      [MineralType.GRANITE]: '#808080', // Gray
      [MineralType.SANDSTONE]: '#F4A460', // Sandy brown
      [MineralType.QUARTZ]: '#FFFFFF', // White
      [MineralType.URANIUM]: '#00FF00', // Lime green
      [MineralType.LITHIUM]: '#FFA500' // Orange
    };
    return colors[mineralType] || '#CCCCCC';
  }

  // Export for Unity
  exportToUnity(): string {
    const visualizationData = this.generateVisualizationData();

    return JSON.stringify({
      // Geological layers for 3D terrain
      layers: visualizationData.layerVisualization.map(layer => ({
        id: layer.id,
        depth: layer.depth,
        thickness: layer.thickness,
        rockType: layer.rockType,
        color: layer.color,
        hardness: layer.hardness,
        stability: layer.stability,
        hasWaterTable: layer.hasWaterTable
      })),

      // Mineral deposits as 3D objects
      minerals: visualizationData.mineralMap.map(mineral => ({
        id: mineral.id,
        type: mineral.type,
        position: mineral.position,
        scale: mineral.size,
        concentration: mineral.concentration,
        value: mineral.value,
        discovered: mineral.isDiscovered,
        beingMined: mineral.isBeingMined,
        color: mineral.color
      })),

      // Mining operations as structures
      operations: visualizationData.miningOperations.map(op => ({
        id: op.id,
        name: op.name,
        position: op.position,
        method: op.method,
        active: op.isActive,
        efficiency: op.efficiency,
        safetyStatus: op.safetyStatus,
        environmentalImpact: op.environmentalImpact
      })),

      // Cross-section for 2D views
      crossSection: visualizationData.crossSection,

      // Production dashboard data
      production: visualizationData.productionMetrics,

      // Environmental monitoring
      environment: {
        totalImpact: visualizationData.environmentalData.totalImpact,
        waterContamination: visualizationData.environmentalData.waterContamination,
        airQuality: visualizationData.environmentalData.airQuality,
        landDisruption: visualizationData.environmentalData.landDisruption,
        rehabilitationNeeded: visualizationData.environmentalData.rehabilitationNeeded
      },

      // Metadata
      timestamp: Date.now(),
      totalLayers: this.layers.size,
      totalOperations: this.operations.size
    }, null, 2);
  }
}