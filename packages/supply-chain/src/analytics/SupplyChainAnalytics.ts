/**
 * Supply Chain Analytics - Analytics and reporting engine
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  TimeStamp,
  AnalyticsConfiguration,
  SupplyChainMetrics,
  PerformanceKPI,
  EfficiencyMetrics,
  FinancialMetrics,
  ServiceMetrics,
  QualityMetrics,
  SustainabilityMetrics
} from '../core/types';

export class SupplyChainAnalytics extends EventEmitter {
  private eventBus: EventBus;
  private config: AnalyticsConfiguration;
  private metrics: SupplyChainMetrics;
  private initialized = false;
  private dataHistory: AnalyticsDataPoint[] = [];

  constructor(eventBus: EventBus, config: AnalyticsConfiguration) {
    super();
    this.eventBus = eventBus;
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): SupplyChainMetrics {
    return {
      efficiency: {
        overallEquipmentEffectiveness: 85,
        throughputUtilization: 75,
        inventoryTurnover: 6.5,
        cycleTime: 24,
        setupTime: 2
      },
      financial: {
        totalCost: 1000000,
        operatingCost: 800000,
        transportationCost: 150000,
        inventoryCarryingCost: 50000,
        qualityCost: 25000,
        revenue: 1500000,
        profit: 500000,
        roi: 0.5
      },
      service: {
        onTimeDelivery: 95,
        fillRate: 98,
        orderAccuracy: 99,
        customerSatisfaction: 88,
        responseTime: 2.5
      },
      quality: {
        defectRate: 0.5,
        firstPassYield: 96,
        scrapRate: 1.2,
        reworkRate: 2.8,
        customerComplaints: 5
      },
      sustainability: {
        carbonFootprint: 25000,
        energyConsumption: 50000,
        wasteGeneration: 1000,
        waterUsage: 10000,
        recyclingRate: 75
      }
    };
  }

  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('analytics-initialized');
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.dataHistory = [];
  }

  async processTick(currentTime: TimeStamp): Promise<void> {
    if (!this.config.metricsEnabled) return;

    // Collect and update metrics
    this.updateMetrics(currentTime);

    // Record data point
    const dataPoint: AnalyticsDataPoint = {
      timestamp: currentTime,
      metrics: { ...this.metrics }
    };

    this.dataHistory.push(dataPoint);

    // Maintain data retention
    const retentionMs = this.config.dataRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = currentTime.realTime - retentionMs;

    this.dataHistory = this.dataHistory.filter(
      point => point.timestamp.realTime > cutoffTime
    );

    this.emit('metrics-updated', this.metrics);
  }

  private updateMetrics(currentTime: TimeStamp): void {
    // Simulate metric updates with some randomness
    this.metrics.efficiency.overallEquipmentEffectiveness += (Math.random() - 0.5) * 2;
    this.metrics.efficiency.throughputUtilization += (Math.random() - 0.5) * 3;
    this.metrics.service.onTimeDelivery += (Math.random() - 0.5) * 1;
    this.metrics.quality.defectRate = Math.max(0, this.metrics.quality.defectRate + (Math.random() - 0.5) * 0.1);

    // Clamp values to reasonable ranges
    this.metrics.efficiency.overallEquipmentEffectiveness = Math.max(0, Math.min(100, this.metrics.efficiency.overallEquipmentEffectiveness));
    this.metrics.efficiency.throughputUtilization = Math.max(0, Math.min(100, this.metrics.efficiency.throughputUtilization));
    this.metrics.service.onTimeDelivery = Math.max(0, Math.min(100, this.metrics.service.onTimeDelivery));
  }

  async getSupplyChainMetrics(): Promise<SupplyChainMetrics> {
    return { ...this.metrics };
  }

  async getKPIs(): Promise<PerformanceKPI[]> {
    return [
      {
        id: 'oee',
        name: 'Overall Equipment Effectiveness',
        value: this.metrics.efficiency.overallEquipmentEffectiveness,
        target: 90,
        trend: 0.5,
        unit: '%',
        category: 'efficiency'
      },
      {
        id: 'otd',
        name: 'On-Time Delivery',
        value: this.metrics.service.onTimeDelivery,
        target: 98,
        trend: -0.2,
        unit: '%',
        category: 'service'
      },
      {
        id: 'defect_rate',
        name: 'Defect Rate',
        value: this.metrics.quality.defectRate,
        target: 0.3,
        trend: 0.1,
        unit: '%',
        category: 'quality'
      },
      {
        id: 'roi',
        name: 'Return on Investment',
        value: this.metrics.financial.roi * 100,
        target: 60,
        trend: 1.5,
        unit: '%',
        category: 'cost'
      }
    ];
  }

  generateReport(
    startDate: TimeStamp,
    endDate: TimeStamp,
    reportType: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): AnalyticsReport {
    const filteredData = this.dataHistory.filter(
      point => point.timestamp.realTime >= startDate.realTime &&
               point.timestamp.realTime <= endDate.realTime
    );

    if (filteredData.length === 0) {
      return {
        period: { start: startDate, end: endDate },
        type: reportType,
        summary: this.createEmptySummary(),
        trends: [],
        recommendations: []
      };
    }

    return {
      period: { start: startDate, end: endDate },
      type: reportType,
      summary: this.calculateSummary(filteredData),
      trends: this.calculateTrends(filteredData),
      recommendations: this.generateRecommendations(filteredData)
    };
  }

  private createEmptySummary(): ReportSummary {
    return {
      totalTransactions: 0,
      averageEfficiency: 0,
      totalCost: 0,
      customerSatisfaction: 0,
      keyAchievements: [],
      majorIssues: []
    };
  }

  private calculateSummary(data: AnalyticsDataPoint[]): ReportSummary {
    const avgEfficiency = data.reduce((sum, point) =>
      sum + point.metrics.efficiency.overallEquipmentEffectiveness, 0) / data.length;

    const totalCost = data[data.length - 1]?.metrics.financial.totalCost || 0;

    const avgSatisfaction = data.reduce((sum, point) =>
      sum + point.metrics.service.customerSatisfaction, 0) / data.length;

    return {
      totalTransactions: data.length,
      averageEfficiency: avgEfficiency,
      totalCost,
      customerSatisfaction: avgSatisfaction,
      keyAchievements: [
        'Maintained high efficiency levels',
        'Improved on-time delivery performance'
      ],
      majorIssues: avgEfficiency < 80 ? ['Efficiency below target'] : []
    };
  }

  private calculateTrends(data: AnalyticsDataPoint[]): TrendAnalysis[] {
    if (data.length < 2) return [];

    const first = data[0];
    const last = data[data.length - 1];

    return [
      {
        metric: 'Overall Equipment Effectiveness',
        direction: last.metrics.efficiency.overallEquipmentEffectiveness > first.metrics.efficiency.overallEquipmentEffectiveness ? 'up' : 'down',
        magnitude: Math.abs(last.metrics.efficiency.overallEquipmentEffectiveness - first.metrics.efficiency.overallEquipmentEffectiveness),
        significance: 'medium'
      },
      {
        metric: 'On-Time Delivery',
        direction: last.metrics.service.onTimeDelivery > first.metrics.service.onTimeDelivery ? 'up' : 'down',
        magnitude: Math.abs(last.metrics.service.onTimeDelivery - first.metrics.service.onTimeDelivery),
        significance: 'high'
      }
    ];
  }

  private generateRecommendations(data: AnalyticsDataPoint[]): string[] {
    const recommendations: string[] = [];
    const latest = data[data.length - 1];

    if (latest.metrics.efficiency.overallEquipmentEffectiveness < 85) {
      recommendations.push('Consider preventive maintenance to improve equipment effectiveness');
    }

    if (latest.metrics.service.onTimeDelivery < 95) {
      recommendations.push('Review transportation routes and capacity planning');
    }

    if (latest.metrics.quality.defectRate > 1.0) {
      recommendations.push('Implement additional quality control measures');
    }

    if (latest.metrics.financial.roi < 0.4) {
      recommendations.push('Analyze cost structure and identify optimization opportunities');
    }

    return recommendations;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose(): void {
    this.dataHistory = [];
    this.removeAllListeners();
  }
}

interface AnalyticsDataPoint {
  timestamp: TimeStamp;
  metrics: SupplyChainMetrics;
}

interface AnalyticsReport {
  period: { start: TimeStamp; end: TimeStamp };
  type: 'daily' | 'weekly' | 'monthly';
  summary: ReportSummary;
  trends: TrendAnalysis[];
  recommendations: string[];
}

interface ReportSummary {
  totalTransactions: number;
  averageEfficiency: number;
  totalCost: number;
  customerSatisfaction: number;
  keyAchievements: string[];
  majorIssues: string[];
}

interface TrendAnalysis {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: 'low' | 'medium' | 'high';
}