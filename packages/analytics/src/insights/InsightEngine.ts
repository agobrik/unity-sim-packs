import { EventEmitter } from '../utils/EventEmitter';
import {
  Insight,
  InsightType,
  InsightPriority,
  InsightImpact,
  AnalyticsEvent,
  AnalyticsSession,
  TrendData,
  TrendDirection,
  ComparisonData,
  SegmentData,
  CorrelationData,
  TimeRange,
  Filter,
  InsightHandler
} from '../types';

export class InsightEngine extends EventEmitter {
  private insights: Map<string, Insight> = new Map();
  private processors: Map<InsightType, InsightProcessor> = new Map();
  private analysisInterval: number = 60000; // 1 minute
  private analysisTimer?: any;
  private config: InsightConfig;

  constructor(config: InsightConfig) {
    super();
    this.config = { ...config };
    this.registerBuiltInProcessors();

    if (this.config.autoAnalysis) {
      this.startAutoAnalysis();
    }
  }

  public async analyzeEvents(events: AnalyticsEvent[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    for (const [type, processor] of this.processors) {
      try {
        const typeInsights = await processor.analyze(events, this.config);
        insights.push(...typeInsights);
      } catch (error) {
        this.emit('processor_error', type, error);
      }
    }

    // Store and emit insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
      this.emit('insight_generated', insight);
    }

    return insights;
  }

  public async analyzeSessions(sessions: AnalyticsSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Convert sessions to events for analysis
    const events = sessions.flatMap(session => session.events);
    const sessionInsights = await this.analyzeEvents(events);

    // Add session-specific analysis
    const sessionSpecificInsights = await this.analyzeSessionPatterns(sessions);
    insights.push(...sessionSpecificInsights);

    return [...sessionInsights, ...insights];
  }

  private async analyzeSessionPatterns(sessions: AnalyticsSession[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Analyze session duration patterns
    const durationInsight = this.analyzeSessionDuration(sessions);
    if (durationInsight) {
      insights.push(durationInsight);
    }

    // Analyze bounce rate patterns
    const bounceInsight = this.analyzeBounceRate(sessions);
    if (bounceInsight) {
      insights.push(bounceInsight);
    }

    // Analyze conversion patterns
    const conversionInsight = this.analyzeConversionPatterns(sessions);
    if (conversionInsight) {
      insights.push(conversionInsight);
    }

    return insights;
  }

  private analyzeSessionDuration(sessions: AnalyticsSession[]): Insight | null {
    if (sessions.length < 10) return null;

    const durations = sessions
      .filter(s => s.duration !== undefined)
      .map(s => s.duration!);

    if (durations.length === 0) return null;

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const shortSessions = durations.filter(d => d < 30000).length; // Less than 30 seconds
    const shortSessionRate = shortSessions / durations.length;

    if (shortSessionRate > 0.7) {
      return {
        id: this.generateInsightId(),
        type: InsightType.ANOMALY,
        priority: InsightPriority.HIGH,
        title: 'High Short Session Rate',
        description: `${(shortSessionRate * 100).toFixed(1)}% of sessions are shorter than 30 seconds, indicating potential user experience issues.`,
        recommendations: [
          'Review page load times and performance',
          'Analyze user interface for usability issues',
          'Check if content meets user expectations'
        ],
        data: {
          metrics: {
            shortSessionRate,
            avgDuration: avgDuration / 1000, // Convert to seconds
            totalSessions: sessions.length
          },
          trends: [],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: 0.8,
        impact: InsightImpact.LARGE,
        timeframe: this.getDefaultTimeframe(),
        tags: ['sessions', 'engagement', 'ux']
      };
    }

    return null;
  }

  private analyzeBounceRate(sessions: AnalyticsSession[]): Insight | null {
    if (sessions.length < 10) return null;

    const bounceRate = sessions.reduce((sum, s) => sum + s.metrics.bounceRate, 0) / sessions.length;

    if (bounceRate > 0.6) {
      return {
        id: this.generateInsightId(),
        type: InsightType.ANOMALY,
        priority: InsightPriority.MEDIUM,
        title: 'High Bounce Rate',
        description: `Bounce rate is ${(bounceRate * 100).toFixed(1)}%, which is above the recommended threshold.`,
        recommendations: [
          'Improve landing page content relevance',
          'Optimize page load speed',
          'Review traffic sources and targeting'
        ],
        data: {
          metrics: {
            bounceRate,
            totalSessions: sessions.length
          },
          trends: [],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: 0.7,
        impact: InsightImpact.MODERATE,
        timeframe: this.getDefaultTimeframe(),
        tags: ['bounce', 'engagement', 'acquisition']
      };
    }

    return null;
  }

  private analyzeConversionPatterns(sessions: AnalyticsSession[]): Insight | null {
    if (sessions.length < 20) return null;

    const conversions = sessions.filter(s => s.metrics.conversionEvents > 0);
    const conversionRate = conversions.length / sessions.length;

    if (conversionRate < 0.02) { // Less than 2%
      return {
        id: this.generateInsightId(),
        type: InsightType.RECOMMENDATION,
        priority: InsightPriority.HIGH,
        title: 'Low Conversion Rate',
        description: `Conversion rate is ${(conversionRate * 100).toFixed(2)}%, which indicates optimization opportunities.`,
        recommendations: [
          'A/B test different call-to-action placements',
          'Simplify the conversion funnel',
          'Analyze user behavior leading to conversions'
        ],
        data: {
          metrics: {
            conversionRate,
            totalConversions: conversions.length,
            totalSessions: sessions.length
          },
          trends: [],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: 0.6,
        impact: InsightImpact.SIGNIFICANT,
        timeframe: this.getDefaultTimeframe(),
        tags: ['conversion', 'optimization', 'revenue']
      };
    }

    return null;
  }

  private registerBuiltInProcessors(): void {
    this.processors.set(InsightType.TREND, new TrendProcessor());
    this.processors.set(InsightType.ANOMALY, new AnomalyProcessor());
    this.processors.set(InsightType.CORRELATION, new CorrelationProcessor());
    this.processors.set(InsightType.SEGMENTATION, new SegmentationProcessor());
    this.processors.set(InsightType.PREDICTION, new PredictionProcessor());
  }

  public registerProcessor(type: InsightType, processor: InsightProcessor): void {
    this.processors.set(type, processor);
    this.emit('processor_registered', type, processor);
  }

  private startAutoAnalysis(): void {
    this.analysisTimer = (globalThis as any).setInterval(() => {
      this.performAutoAnalysis();
    }, this.analysisInterval);
  }

  private async performAutoAnalysis(): Promise<void> {
    try {
      this.emit('auto_analysis_started');

      // This would typically fetch recent events from the analytics engine
      // For now, we'll skip the actual analysis

      this.emit('auto_analysis_completed');
    } catch (error) {
      this.emit('auto_analysis_error', error);
    }
  }

  public getInsights(filters?: InsightFilters): Insight[] {
    let insights = Array.from(this.insights.values());

    if (filters) {
      insights = this.filterInsights(insights, filters);
    }

    return insights.sort((a, b) => {
      // Sort by priority first, then by confidence
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.confidence - a.confidence;
    });
  }

  private filterInsights(insights: Insight[], filters: InsightFilters): Insight[] {
    return insights.filter(insight => {
      if (filters.type && insight.type !== filters.type) {
        return false;
      }

      if (filters.priority && insight.priority !== filters.priority) {
        return false;
      }

      if (filters.minConfidence && insight.confidence < filters.minConfidence) {
        return false;
      }

      if (filters.tags && !filters.tags.every(tag => insight.tags.includes(tag))) {
        return false;
      }

      if (filters.startTime && insight.timeframe.start < filters.startTime) {
        return false;
      }

      if (filters.endTime && insight.timeframe.end > filters.endTime) {
        return false;
      }

      return true;
    });
  }

  public getInsight(id: string): Insight | undefined {
    return this.insights.get(id);
  }

  public deleteInsight(id: string): boolean {
    const deleted = this.insights.delete(id);
    if (deleted) {
      this.emit('insight_deleted', id);
    }
    return deleted;
  }

  public clearInsights(): void {
    this.insights.clear();
    this.emit('insights_cleared');
  }

  public setAnalysisInterval(interval: number): void {
    this.analysisInterval = interval;

    if (this.analysisTimer) {
      (globalThis as any).clearInterval(this.analysisTimer);
      this.startAutoAnalysis();
    }
  }

  public enableAutoAnalysis(): void {
    this.config.autoAnalysis = true;
    this.startAutoAnalysis();
  }

  public disableAutoAnalysis(): void {
    this.config.autoAnalysis = false;
    if (this.analysisTimer) {
      (globalThis as any).clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultTimeframe(): TimeRange {
    const now = Date.now();
    return {
      start: now - 24 * 60 * 60 * 1000, // 24 hours ago
      end: now,
      granularity: 'hour' as any
    };
  }

  public destroy(): void {
    if (this.analysisTimer) {
      (globalThis as any).clearInterval(this.analysisTimer);
    }
    this.removeAllListeners();
  }

  public on(event: 'insight_generated', listener: InsightHandler): this;
  public on(event: 'processor_error', listener: (type: InsightType, error: Error) => void): this;
  public on(event: 'processor_registered', listener: (type: InsightType, processor: InsightProcessor) => void): this;
  public on(event: 'auto_analysis_started' | 'auto_analysis_completed', listener: () => void): this;
  public on(event: 'auto_analysis_error', listener: (error: Error) => void): this;
  public on(event: 'insight_deleted', listener: (id: string) => void): this;
  public on(event: 'insights_cleared', listener: () => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

// Abstract base class for insight processors
abstract class InsightProcessor {
  abstract analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]>;
}

// Trend analysis processor
class TrendProcessor extends InsightProcessor {
  async analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Group events by hour for trend analysis
    const hourlyGroups = this.groupEventsByHour(events);

    if (hourlyGroups.size < 3) {
      return insights; // Need at least 3 hours of data
    }

    const eventCounts = Array.from(hourlyGroups.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, events]) => ({ timestamp: hour, value: events.length }));

    const trend = this.calculateTrend(eventCounts);

    if (Math.abs(trend.magnitude) > 0.2) { // 20% change
      insights.push({
        id: `trend_${Date.now()}`,
        type: InsightType.TREND,
        priority: trend.magnitude > 0.5 ? InsightPriority.HIGH : InsightPriority.MEDIUM,
        title: `${trend.direction === TrendDirection.UP ? 'Increasing' : 'Decreasing'} Event Volume`,
        description: `Event volume has ${trend.direction === TrendDirection.UP ? 'increased' : 'decreased'} by ${(Math.abs(trend.magnitude) * 100).toFixed(1)}% over the analysis period.`,
        recommendations: trend.direction === TrendDirection.UP
          ? ['Monitor server capacity', 'Analyze traffic sources']
          : ['Investigate potential issues', 'Review marketing campaigns'],
        data: {
          metrics: { trendMagnitude: trend.magnitude },
          trends: [{
            metric: 'event_count',
            values: eventCounts,
            direction: trend.direction,
            magnitude: trend.magnitude,
            significance: trend.significance
          }],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: trend.significance,
        impact: trend.magnitude > 0.5 ? InsightImpact.LARGE : InsightImpact.MODERATE,
        timeframe: {
          start: Math.min(...eventCounts.map(p => p.timestamp)),
          end: Math.max(...eventCounts.map(p => p.timestamp)),
          granularity: 'hour' as any
        },
        tags: ['trend', 'volume', 'events']
      });
    }

    return insights;
  }

  private groupEventsByHour(events: AnalyticsEvent[]): Map<number, AnalyticsEvent[]> {
    const groups = new Map<number, AnalyticsEvent[]>();

    for (const event of events) {
      const hour = Math.floor(event.timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);

      if (!groups.has(hour)) {
        groups.set(hour, []);
      }
      groups.get(hour)!.push(event);
    }

    return groups;
  }

  private calculateTrend(points: { timestamp: number; value: number }[]): {
    direction: TrendDirection;
    magnitude: number;
    significance: number;
  } {
    if (points.length < 2) {
      return { direction: TrendDirection.STABLE, magnitude: 0, significance: 0 };
    }

    // Simple linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p, i) => sum + i, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p, i) => sum + (i * p.value), 0);
    const sumXX = points.reduce((sum, p, i) => sum + (i * i), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;

    const magnitude = slope / avgY; // Relative change
    const direction = magnitude > 0.05 ? TrendDirection.UP :
                     magnitude < -0.05 ? TrendDirection.DOWN : TrendDirection.STABLE;

    // Calculate R-squared for significance
    const yMean = sumY / n;
    const totalSumSquares = points.reduce((sum, p) => sum + Math.pow(p.value - yMean, 2), 0);
    const residualSumSquares = points.reduce((sum, p, i) => {
      const predicted = (sumY / n) + slope * (i - (sumX / n));
      return sum + Math.pow(p.value - predicted, 2);
    }, 0);

    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const significance = Math.max(0, Math.min(1, rSquared));

    return { direction, magnitude, significance };
  }
}

// Anomaly detection processor
class AnomalyProcessor extends InsightProcessor {
  async analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Detect error rate anomalies
    const errorInsight = this.detectErrorAnomalies(events);
    if (errorInsight) {
      insights.push(errorInsight);
    }

    // Detect performance anomalies
    const perfInsight = this.detectPerformanceAnomalies(events);
    if (perfInsight) {
      insights.push(perfInsight);
    }

    return insights;
  }

  private detectErrorAnomalies(events: AnalyticsEvent[]): Insight | null {
    const errorEvents = events.filter(e => e.type === 'error');
    const errorRate = errorEvents.length / events.length;

    if (errorRate > 0.05) { // More than 5% error rate
      return {
        id: `anomaly_error_${Date.now()}`,
        type: InsightType.ANOMALY,
        priority: InsightPriority.CRITICAL,
        title: 'High Error Rate Detected',
        description: `Error rate is ${(errorRate * 100).toFixed(2)}%, which is significantly above normal levels.`,
        recommendations: [
          'Investigate recent deployments or changes',
          'Check server logs and monitoring systems',
          'Review error patterns and common causes'
        ],
        data: {
          metrics: { errorRate, totalErrors: errorEvents.length, totalEvents: events.length },
          trends: [],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: 0.9,
        impact: InsightImpact.SIGNIFICANT,
        timeframe: {
          start: Math.min(...events.map(e => e.timestamp)),
          end: Math.max(...events.map(e => e.timestamp)),
          granularity: 'hour' as any
        },
        tags: ['anomaly', 'errors', 'quality']
      };
    }

    return null;
  }

  private detectPerformanceAnomalies(events: AnalyticsEvent[]): Insight | null {
    const perfEvents = events.filter(e => e.type === 'performance');

    if (perfEvents.length === 0) return null;

    // Analyze load times
    const loadTimes = perfEvents
      .filter(e => e.data.metric === 'page_load_time')
      .map(e => e.data.value);

    if (loadTimes.length < 5) return null;

    const avgLoadTime = loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length;

    if (avgLoadTime > 3000) { // More than 3 seconds
      return {
        id: `anomaly_performance_${Date.now()}`,
        type: InsightType.ANOMALY,
        priority: InsightPriority.HIGH,
        title: 'Slow Page Load Times',
        description: `Average page load time is ${(avgLoadTime / 1000).toFixed(2)} seconds, which may impact user experience.`,
        recommendations: [
          'Optimize image and asset loading',
          'Implement caching strategies',
          'Review server performance and database queries'
        ],
        data: {
          metrics: { avgLoadTime, slowPageCount: loadTimes.filter(t => t > 3000).length },
          trends: [],
          comparisons: [],
          segments: [],
          correlations: []
        },
        confidence: 0.8,
        impact: InsightImpact.MODERATE,
        timeframe: {
          start: Math.min(...perfEvents.map(e => e.timestamp)),
          end: Math.max(...perfEvents.map(e => e.timestamp)),
          granularity: 'hour' as any
        },
        tags: ['anomaly', 'performance', 'ux']
      };
    }

    return null;
  }
}

// Correlation analysis processor
class CorrelationProcessor extends InsightProcessor {
  async analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]> {
    // Placeholder for correlation analysis
    return [];
  }
}

// Segmentation analysis processor
class SegmentationProcessor extends InsightProcessor {
  async analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]> {
    // Placeholder for segmentation analysis
    return [];
  }
}

// Prediction analysis processor
class PredictionProcessor extends InsightProcessor {
  async analyze(events: AnalyticsEvent[], config: InsightConfig): Promise<Insight[]> {
    // Placeholder for prediction analysis
    return [];
  }
}

interface InsightConfig {
  autoAnalysis: boolean;
  minConfidence: number;
  enabledTypes: InsightType[];
}

interface InsightFilters {
  type?: InsightType;
  priority?: InsightPriority;
  minConfidence?: number;
  tags?: string[];
  startTime?: number;
  endTime?: number;
}