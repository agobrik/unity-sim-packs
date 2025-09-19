import { CityGrid, ZoneType, BuildingType, CityCell } from '../core/CityGrid';
import { ZoningSystem } from '../core/ZoningSystem';
import { InfrastructureManager, ProjectStatus } from '../core/InfrastructureManager';

export interface CityMetrics {
  population: {
    total: number;
    density: number;
    growth: number;
    distribution: Record<ZoneType, number>;
  };
  economy: {
    commercialValue: number;
    industrialValue: number;
    unemploymentRate: number;
    gdp: number;
  };
  infrastructure: {
    coverage: Record<string, number>;
    condition: number;
    efficiency: number;
    investmentNeeded: number;
  };
  environment: {
    airQuality: number;
    greenSpaceRatio: number;
    pollution: number;
    sustainability: number;
  };
  quality: {
    averageHappiness: number;
    traffic: number;
    accessibility: number;
    safety: number;
  };
}

export interface CityReport {
  timestamp: number;
  metrics: CityMetrics;
  recommendations: Recommendation[];
  trends: TrendData[];
  alerts: Alert[];
}

export interface Recommendation {
  type: 'infrastructure' | 'zoning' | 'environment' | 'economy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedCost: number;
  expectedBenefit: string;
}

export interface TrendData {
  metric: string;
  values: number[];
  timestamps: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
}

export interface Alert {
  level: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  affectedAreas: Array<{ x: number; y: number }>;
  suggestedActions: string[];
}

export class CityAnalytics {
  private cityGrid: CityGrid;
  private zoningSystem: ZoningSystem | null;
  private infrastructureManager: InfrastructureManager | null;
  private historicalData: Map<number, CityMetrics>;
  private alertThresholds: Map<string, number>;

  constructor(
    cityGrid: CityGrid,
    zoningSystem?: ZoningSystem,
    infrastructureManager?: InfrastructureManager
  ) {
    this.cityGrid = cityGrid;
    this.zoningSystem = zoningSystem || null;
    this.infrastructureManager = infrastructureManager || null;
    this.historicalData = new Map();
    this.alertThresholds = new Map();
    this.initializeThresholds();
  }

  private initializeThresholds(): void {
    this.alertThresholds.set('pollution', 0.7);
    this.alertThresholds.set('traffic', 0.8);
    this.alertThresholds.set('happiness', 0.3);
    this.alertThresholds.set('unemployment', 0.15);
    this.alertThresholds.set('infrastructure_condition', 0.4);
  }

  generateReport(timestamp: number = Date.now()): CityReport {
    const metrics = this.calculateMetrics();
    const recommendations = this.generateRecommendations(metrics);
    const trends = this.calculateTrends();
    const alerts = this.generateAlerts(metrics);

    // Store for historical analysis
    this.historicalData.set(timestamp, metrics);

    return {
      timestamp,
      metrics,
      recommendations,
      trends,
      alerts
    };
  }

  private calculateMetrics(): CityMetrics {
    const population = this.calculatePopulationMetrics();
    const economy = this.calculateEconomyMetrics();
    const infrastructure = this.calculateInfrastructureMetrics();
    const environment = this.calculateEnvironmentMetrics();
    const quality = this.calculateQualityMetrics();

    return {
      population,
      economy,
      infrastructure,
      environment,
      quality
    };
  }

  private calculatePopulationMetrics(): CityMetrics['population'] {
    const cells = this.cityGrid.getAllCells().flat();
    const totalPopulation = cells.reduce((sum, cell) => sum + cell.population, 0);
    const occupiedCells = cells.filter(cell => cell.population > 0).length;
    const density = occupiedCells > 0 ? totalPopulation / occupiedCells : 0;

    const distribution: Record<ZoneType, number> = {} as Record<ZoneType, number>;
    Object.values(ZoneType).forEach(zone => {
      distribution[zone] = cells
        .filter(cell => cell.zoneType === zone)
        .reduce((sum, cell) => sum + cell.population, 0);
    });

    // Calculate growth from historical data
    const growth = this.calculateGrowthRate('population');

    return {
      total: totalPopulation,
      density,
      growth,
      distribution
    };
  }

  private calculateEconomyMetrics(): CityMetrics['economy'] {
    const cells = this.cityGrid.getAllCells().flat();

    const commercialValue = cells.reduce((sum, cell) => sum + cell.commercialValue, 0) / cells.length;
    const industrialValue = cells.reduce((sum, cell) => sum + cell.industrialValue, 0) / cells.length;

    // Estimate jobs based on commercial and industrial buildings
    const commercialJobs = cells.filter(cell =>
      cell.buildingType === BuildingType.OFFICE || cell.buildingType === BuildingType.SHOP
    ).length * 50; // Average jobs per commercial building

    const industrialJobs = cells.filter(cell =>
      cell.buildingType === BuildingType.FACTORY
    ).length * 100; // Average jobs per industrial building

    const totalJobs = commercialJobs + industrialJobs;
    const totalPopulation = cells.reduce((sum, cell) => sum + cell.population, 0);
    const workingPopulation = totalPopulation * 0.6; // Assume 60% working age

    const unemploymentRate = workingPopulation > 0 ?
      Math.max(0, 1 - (totalJobs / workingPopulation)) : 0;

    const gdp = (commercialValue + industrialValue) * totalPopulation * 1000;

    return {
      commercialValue,
      industrialValue,
      unemploymentRate,
      gdp
    };
  }

  private calculateInfrastructureMetrics(): CityMetrics['infrastructure'] {
    const cells = this.cityGrid.getAllCells().flat();
    const occupiedCells = cells.filter(cell => cell.population > 0);

    if (occupiedCells.length === 0) {
      return {
        coverage: {},
        condition: 1,
        efficiency: 1,
        investmentNeeded: 0
      };
    }

    const coverage = {
      roads: occupiedCells.reduce((sum, cell) => sum + cell.infrastructure.roads, 0) / occupiedCells.length,
      water: occupiedCells.reduce((sum, cell) => sum + cell.infrastructure.water, 0) / occupiedCells.length,
      power: occupiedCells.reduce((sum, cell) => sum + cell.infrastructure.power, 0) / occupiedCells.length,
      internet: occupiedCells.reduce((sum, cell) => sum + cell.infrastructure.internet, 0) / occupiedCells.length,
      publicTransport: occupiedCells.reduce((sum, cell) => sum + cell.infrastructure.publicTransport, 0) / occupiedCells.length
    };

    const averageCoverage = Object.values(coverage).reduce((sum, val) => sum + val, 0) / 5;

    // Calculate condition from infrastructure manager if available
    let condition = 1;
    if (this.infrastructureManager) {
      const maintenance = this.infrastructureManager.getMaintenanceSchedule();
      if (maintenance.length > 0) {
        condition = maintenance.reduce((sum, m) => sum + m.condition, 0) / maintenance.length;
      }
    }

    const efficiency = averageCoverage * condition;

    // Estimate investment needed based on coverage gaps
    const coverageGaps = Object.values(coverage).reduce((sum, val) => sum + Math.max(0, 0.8 - val), 0);
    const investmentNeeded = coverageGaps * occupiedCells.length * 10000;

    return {
      coverage,
      condition,
      efficiency,
      investmentNeeded
    };
  }

  private calculateEnvironmentMetrics(): CityMetrics['environment'] {
    const cells = this.cityGrid.getAllCells().flat();

    const averagePollution = cells.reduce((sum, cell) => sum + cell.pollution, 0) / cells.length;
    const airQuality = Math.max(0, 1 - averagePollution);

    const greenSpaceCells = cells.filter(cell =>
      cell.zoneType === ZoneType.GREEN_SPACE || cell.buildingType === BuildingType.PARK
    ).length;
    const greenSpaceRatio = greenSpaceCells / cells.length;

    // Calculate sustainability based on green space and pollution
    const sustainability = (greenSpaceRatio * 0.6) + (airQuality * 0.4);

    return {
      airQuality,
      greenSpaceRatio,
      pollution: averagePollution,
      sustainability
    };
  }

  private calculateQualityMetrics(): CityMetrics['quality'] {
    const cells = this.cityGrid.getAllCells().flat();
    const occupiedCells = cells.filter(cell => cell.population > 0);

    if (occupiedCells.length === 0) {
      return {
        averageHappiness: 0.5,
        traffic: 0,
        accessibility: 0,
        safety: 0.5
      };
    }

    const averageHappiness = occupiedCells.reduce((sum, cell) => sum + cell.happiness, 0) / occupiedCells.length;
    const averageTraffic = occupiedCells.reduce((sum, cell) => sum + cell.traffic, 0) / occupiedCells.length;

    // Calculate accessibility based on infrastructure
    const accessibility = occupiedCells.reduce((sum, cell) => {
      const infraScore = Object.values(cell.infrastructure).reduce((s, v) => s + v, 0) / 5;
      return sum + infraScore;
    }, 0) / occupiedCells.length;

    // Estimate safety based on various factors
    const safety = Math.min(1, averageHappiness + (1 - averageTraffic) * 0.3 + accessibility * 0.2);

    return {
      averageHappiness,
      traffic: averageTraffic,
      accessibility,
      safety
    };
  }

  private generateRecommendations(metrics: CityMetrics): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Infrastructure recommendations
    if (metrics.infrastructure.efficiency < 0.6) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'high',
        title: 'Improve Infrastructure Coverage',
        description: 'Many areas lack adequate infrastructure. Focus on roads, water, and power.',
        estimatedCost: metrics.infrastructure.investmentNeeded,
        expectedBenefit: 'Increased happiness and economic activity'
      });
    }

    // Environment recommendations
    if (metrics.environment.pollution > 0.6) {
      recommendations.push({
        type: 'environment',
        priority: 'critical',
        title: 'Address Pollution Crisis',
        description: 'Pollution levels are dangerously high. Consider industrial zoning changes and green spaces.',
        estimatedCost: 500000,
        expectedBenefit: 'Improved health and quality of life'
      });
    }

    // Economic recommendations
    if (metrics.economy.unemploymentRate > 0.1) {
      recommendations.push({
        type: 'economy',
        priority: 'medium',
        title: 'Create More Jobs',
        description: 'Unemployment is high. Develop more commercial and industrial zones.',
        estimatedCost: 1000000,
        expectedBenefit: 'Reduced unemployment and increased tax revenue'
      });
    }

    // Traffic recommendations
    if (metrics.quality.traffic > 0.7) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'high',
        title: 'Improve Transportation',
        description: 'Traffic congestion is severe. Invest in public transportation and road improvements.',
        estimatedCost: 2000000,
        expectedBenefit: 'Reduced commute times and pollution'
      });
    }

    return recommendations.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }

  private calculateTrends(): TrendData[] {
    const trends: TrendData[] = [];
    const recentData = Array.from(this.historicalData.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-10); // Last 10 data points

    if (recentData.length < 2) return trends;

    const metrics = [
      'population.total',
      'economy.gdp',
      'quality.averageHappiness',
      'environment.pollution',
      'infrastructure.efficiency'
    ];

    for (const metric of metrics) {
      const values = recentData.map(([_, data]) => this.getNestedValue(data, metric));
      const timestamps = recentData.map(([timestamp, _]) => timestamp);

      const trend = this.calculateTrendDirection(values);
      const changeRate = this.calculateChangeRate(values);

      trends.push({
        metric,
        values,
        timestamps,
        trend,
        changeRate
      });
    }

    return trends;
  }

  private generateAlerts(metrics: CityMetrics): Alert[] {
    const alerts: Alert[] = [];

    // Pollution alert
    if (metrics.environment.pollution > this.alertThresholds.get('pollution')!) {
      const affectedAreas = this.findHighPollutionAreas();
      alerts.push({
        level: 'critical',
        category: 'Environment',
        message: 'Pollution levels exceed safe thresholds',
        affectedAreas,
        suggestedActions: [
          'Relocate industrial zones away from residential areas',
          'Increase green spaces',
          'Implement pollution control measures'
        ]
      });
    }

    // Traffic alert
    if (metrics.quality.traffic > this.alertThresholds.get('traffic')!) {
      alerts.push({
        level: 'warning',
        category: 'Transportation',
        message: 'Severe traffic congestion detected',
        affectedAreas: this.findHighTrafficAreas(),
        suggestedActions: [
          'Expand public transportation',
          'Build additional roads',
          'Implement traffic management systems'
        ]
      });
    }

    // Happiness alert
    if (metrics.quality.averageHappiness < this.alertThresholds.get('happiness')!) {
      alerts.push({
        level: 'warning',
        category: 'Quality of Life',
        message: 'Citizen happiness is critically low',
        affectedAreas: this.findUnhappyAreas(),
        suggestedActions: [
          'Improve infrastructure services',
          'Add recreational facilities',
          'Address pollution and traffic issues'
        ]
      });
    }

    return alerts;
  }

  private findHighPollutionAreas(): Array<{ x: number; y: number }> {
    const areas: Array<{ x: number; y: number }> = [];
    const threshold = this.alertThresholds.get('pollution')!;

    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (cell && cell.pollution > threshold) {
          areas.push({ x, y });
        }
      }
    }

    return areas;
  }

  private findHighTrafficAreas(): Array<{ x: number; y: number }> {
    const areas: Array<{ x: number; y: number }> = [];
    const threshold = this.alertThresholds.get('traffic')!;

    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (cell && cell.traffic > threshold) {
          areas.push({ x, y });
        }
      }
    }

    return areas;
  }

  private findUnhappyAreas(): Array<{ x: number; y: number }> {
    const areas: Array<{ x: number; y: number }> = [];
    const threshold = this.alertThresholds.get('happiness')!;

    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (cell && cell.population > 0 && cell.happiness < threshold) {
          areas.push({ x, y });
        }
      }
    }

    return areas;
  }

  private calculateGrowthRate(metric: string): number {
    const recent = Array.from(this.historicalData.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-2);

    if (recent.length < 2) return 0;

    const [, oldData] = recent[0];
    const [, newData] = recent[1];

    const oldValue = this.getNestedValue(oldData, metric);
    const newValue = this.getNestedValue(newData, metric);

    return oldValue > 0 ? (newValue - oldValue) / oldValue : 0;
  }

  private getNestedValue(obj: any, path: string): number {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const difference = last - first;
    const threshold = Math.abs(first) * 0.05; // 5% threshold

    if (Math.abs(difference) < threshold) return 'stable';
    return difference > 0 ? 'increasing' : 'decreasing';
  }

  private calculateChangeRate(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    return first !== 0 ? (last - first) / first : 0;
  }

  exportAnalytics(): string {
    const data = {
      currentMetrics: this.calculateMetrics(),
      historicalData: Array.from(this.historicalData.entries()),
      alertThresholds: Array.from(this.alertThresholds.entries())
    };
    return JSON.stringify(data, null, 2);
  }

  setAlertThreshold(metric: string, threshold: number): void {
    this.alertThresholds.set(metric, threshold);
  }

  getHistoricalData(): Map<number, CityMetrics> {
    return this.historicalData;
  }

  clearHistoricalData(): void {
    this.historicalData.clear();
  }
}