import { PowerGrid, GridStats } from '../core/PowerGrid';
import { GridNode } from '../core/GridNode';

export interface AnalysisReport {
  efficiency: number;
  reliability: number;
  carbonFootprint: number;
  economicMetrics: {
    operatingCost: number;
    revenueGenerated: number;
    profitMargin: number;
  };
  recommendations: string[];
  criticalIssues: string[];
}

export interface LoadForecast {
  timeHours: number[];
  demandMW: number[];
  peakDemand: number;
  averageDemand: number;
  demandVariability: number;
}

export class GridAnalyzer {
  private _grid: PowerGrid;
  private _historicalData: GridStats[];

  constructor(grid: PowerGrid) {
    this._grid = grid;
    this._historicalData = [];
  }

  addHistoricalData(stats: GridStats): void {
    this._historicalData.push(stats);

    // Keep only last 100 data points for performance
    if (this._historicalData.length > 100) {
      this._historicalData.shift();
    }
  }

  analyzeGrid(): AnalysisReport {
    const currentStats = this._grid.calculateGridStats();
    this.addHistoricalData(currentStats);

    const efficiency = this.calculateEfficiency(currentStats);
    const reliability = this.calculateReliability();
    const carbonFootprint = this.calculateCarbonFootprint();
    const economicMetrics = this.calculateEconomicMetrics(currentStats);
    const recommendations = this.generateRecommendations(currentStats);
    const criticalIssues = this.identifyCriticalIssues();

    return {
      efficiency,
      reliability,
      carbonFootprint,
      economicMetrics,
      recommendations,
      criticalIssues
    };
  }

  private calculateEfficiency(stats: GridStats): number {
    if (stats.totalGeneration === 0) return 0;

    const transmissionEfficiency = 1 - (stats.totalLoss / stats.totalGeneration);
    const generationEfficiency = stats.totalConsumption / stats.totalGeneration;

    return Math.min(transmissionEfficiency * generationEfficiency, 1.0);
  }

  private calculateReliability(): number {
    if (this._historicalData.length < 10) return 0.95; // Default for new grids

    const stableDataPoints = this._historicalData.filter(data =>
      data.gridStability > 0.8
    ).length;

    const baseReliability = stableDataPoints / this._historicalData.length;

    // Factor in node health
    const healthyNodes = this._grid.nodes.filter(node =>
      node.getHealthStatus() === 'healthy'
    ).length;
    const totalNodes = this._grid.nodes.length;
    const nodeReliability = totalNodes > 0 ? healthyNodes / totalNodes : 1;

    return (baseReliability * 0.7) + (nodeReliability * 0.3);
  }

  private calculateCarbonFootprint(): number {
    const generators = this._grid.nodes.filter(node => node.type === 'generator');
    let totalEmissions = 0;

    for (const generator of generators) {
      // Simplified carbon emission calculation
      // Assumes different generation types based on capacity
      const power = generator.properties.power;
      let emissionFactor = 0.5; // kg CO2/kWh (default coal)

      // Rough classification based on capacity
      if (generator.capacity.maxPower < 10) {
        emissionFactor = 0.1; // Solar/wind
      } else if (generator.capacity.maxPower < 100) {
        emissionFactor = 0.2; // Gas
      } else if (generator.capacity.maxPower < 500) {
        emissionFactor = 0.4; // Combined cycle
      }

      totalEmissions += power * emissionFactor;
    }

    return totalEmissions;
  }

  private calculateEconomicMetrics(stats: GridStats): AnalysisReport['economicMetrics'] {
    // Simplified economic calculations
    const energyPrice = 0.12; // $/kWh
    const operatingCostPerMWh = 40; // $/MWh

    const revenueGenerated = stats.totalConsumption * energyPrice;
    const operatingCost = stats.totalGeneration * (operatingCostPerMWh / 1000);
    const profitMargin = revenueGenerated > 0 ?
      ((revenueGenerated - operatingCost) / revenueGenerated) * 100 : 0;

    return {
      operatingCost,
      revenueGenerated,
      profitMargin
    };
  }

  private generateRecommendations(stats: GridStats): string[] {
    const recommendations: string[] = [];

    // Efficiency recommendations
    if (stats.totalLoss / stats.totalGeneration > 0.08) {
      recommendations.push('Consider upgrading transmission lines to reduce power losses');
    }

    // Load balancing recommendations
    const generators = this._grid.nodes.filter(node => node.type === 'generator');
    const overloadedGenerators = generators.filter(node => node.loadFactor > 0.9);

    if (overloadedGenerators.length > 0) {
      recommendations.push(`${overloadedGenerators.length} generator(s) are operating near capacity. Consider adding backup generators.`);
    }

    // Voltage regulation recommendations
    if (stats.averageVoltage < 220 || stats.averageVoltage > 240) {
      recommendations.push('Voltage levels are outside optimal range. Consider adding voltage regulators.');
    }

    // Frequency stability recommendations
    if (Math.abs(stats.frequency - 50) > 0.2) {
      recommendations.push('Grid frequency is unstable. Review load balancing algorithms.');
    }

    // Reliability improvements
    const criticalNodes = this._grid.nodes.filter(node =>
      node.getHealthStatus() === 'critical'
    );

    if (criticalNodes.length > 0) {
      recommendations.push(`${criticalNodes.length} critical node(s) require immediate attention.`);
    }

    // Economic recommendations
    const economicMetrics = this.calculateEconomicMetrics(stats);
    if (economicMetrics.profitMargin < 10) {
      recommendations.push('Profit margins are low. Consider optimizing generation costs or increasing efficiency.');
    }

    return recommendations;
  }

  private identifyCriticalIssues(): string[] {
    const issues: string[] = [];

    // Grid stability issues
    if (!this._grid.isStable) {
      issues.push('CRITICAL: Grid is unstable and may experience blackouts');
    }

    // Frequency issues
    const currentStats = this._grid.calculateGridStats();
    if (Math.abs(currentStats.frequency - 50) > 1.0) {
      issues.push('CRITICAL: Frequency deviation exceeds safe operating limits');
    }

    // Overloaded nodes
    const overloadedNodes = this._grid.nodes.filter(node => node.isOverloaded());
    if (overloadedNodes.length > 0) {
      issues.push(`CRITICAL: ${overloadedNodes.length} node(s) are overloaded`);
    }

    // Voltage issues
    const voltageIssues = this._grid.nodes.filter(node =>
      node.isOverVoltage() || node.isUnderVoltage()
    );
    if (voltageIssues.length > 0) {
      issues.push(`WARNING: ${voltageIssues.length} node(s) have voltage issues`);
    }

    // Generation capacity issues
    const totalDemand = this._grid.nodes
      .filter(node => node.type === 'load')
      .reduce((sum, node) => sum + Math.abs(node.properties.power), 0);

    const totalCapacity = this._grid.nodes
      .filter(node => node.type === 'generator')
      .reduce((sum, node) => sum + node.capacity.maxPower, 0);

    if (totalDemand > totalCapacity * 0.95) {
      issues.push('WARNING: Grid is operating near maximum capacity');
    }

    return issues;
  }

  generateLoadForecast(hoursAhead: number = 24): LoadForecast {
    const timeHours: number[] = [];
    const demandMW: number[] = [];

    const currentHour = new Date().getHours();
    const baseDemand = this._grid.nodes
      .filter(node => node.type === 'load')
      .reduce((sum, node) => sum + Math.abs(node.properties.power), 0);

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (currentHour + i) % 24;
      timeHours.push(hour);

      // Simplified demand pattern based on typical daily usage
      let demandMultiplier = 1.0;

      if (hour >= 6 && hour <= 9) {
        demandMultiplier = 1.3; // Morning peak
      } else if (hour >= 17 && hour <= 21) {
        demandMultiplier = 1.4; // Evening peak
      } else if (hour >= 22 || hour <= 5) {
        demandMultiplier = 0.7; // Night low
      }

      // Add some random variation
      const variation = 0.9 + Math.random() * 0.2; // ±10% variation
      const forecastDemand = baseDemand * demandMultiplier * variation;

      demandMW.push(forecastDemand);
    }

    const peakDemand = Math.max(...demandMW);
    const averageDemand = demandMW.reduce((sum, val) => sum + val, 0) / demandMW.length;
    const demandVariability = this.calculateVariance(demandMW) / averageDemand;

    return {
      timeHours,
      demandMW,
      peakDemand,
      averageDemand,
      demandVariability
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  exportAnalysisToUnity(): string {
    const analysis = this.analyzeGrid();
    const forecast = this.generateLoadForecast();

    return JSON.stringify({
      analysis,
      forecast,
      gridSnapshot: this._grid.exportToUnity(),
      historicalDataPoints: this._historicalData.length,
      timestamp: Date.now()
    }, null, 2);
  }

  getPerformanceTrends(): {
    efficiency: number[];
    reliability: number[];
    stability: number[];
  } {
    const trends = {
      efficiency: this._historicalData.map(data =>
        data.totalGeneration > 0 ? (1 - data.totalLoss / data.totalGeneration) : 0
      ),
      reliability: this._historicalData.map(data =>
        data.nodesCount.healthy / data.nodesCount.total
      ),
      stability: this._historicalData.map(data => data.gridStability)
    };

    return trends;
  }
}