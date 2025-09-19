import { EventEmitter } from '../utils/EventEmitter';
import {
  PerformanceMetrics,
  PerformanceAlert,
  AlertType,
  AlertSeverity,
  PerformanceMonitorConfig,
  AlertThresholds,
  MemoryUsage,
  CPUUsage,
  GCStats,
  PerformanceEventHandler,
  AlertHandler
} from '../types';

export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceMonitorConfig;
  private isMonitoring: boolean = false;
  private intervalId?: any;
  private metricsHistory: PerformanceMetrics[] = [];
  private lastCPUUsage?: NodeJS.CpuUsage;
  private alertCooldowns: Map<string, number> = new Map();
  private customMetrics: Map<string, () => number> = new Map();

  constructor(config: PerformanceMonitorConfig) {
    super();
    this.config = { ...config };
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.samplingInterval < 100) {
      throw new Error('Sampling interval must be at least 100ms');
    }

    if (this.config.metricsRetention < 1000) {
      throw new Error('Metrics retention must be at least 1000ms');
    }
  }

  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastCPUUsage = (globalThis as any).process?.cpuUsage?.();

    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.samplingInterval);

    this.emit('monitoring_started');
  }

  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.emit('monitoring_stopped');
  }

  public isRunning(): boolean {
    return this.isMonitoring;
  }

  private collectMetrics(): void {
    try {
      const metrics = this.getCurrentMetrics();
      this.addMetrics(metrics);
      this.checkAlerts(metrics);
      this.emit('metrics_collected', metrics);
    } catch (error) {
      this.emit('collection_error', error);
    }
  }

  private getCurrentMetrics(): PerformanceMetrics {
    const now = Date.now();
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCPUUsage();
    const gcStats = this.getGCStats();

    // Calculate frame timing (simplified for this context)
    const frameTime = this.calculateFrameTime();
    const frameRate = frameTime > 0 ? 1000 / frameTime : 0;

    const custom: Record<string, number> = {};
    for (const [name, collector] of this.customMetrics) {
      try {
        custom[name] = collector();
      } catch (error) {
        custom[name] = -1; // Error indicator
      }
    }

    return {
      timestamp: now,
      memoryUsage,
      cpuUsage,
      frameTime,
      frameRate,
      renderTime: this.calculateRenderTime(),
      updateTime: this.calculateUpdateTime(),
      gcStats,
      custom
    };
  }

  private getMemoryUsage(): MemoryUsage {
    const usage = (globalThis as any).process?.memoryUsage?.() || { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0
    };
  }

  private getCPUUsage(): CPUUsage {
    const currentUsage = (globalThis as any).process?.cpuUsage?.(this.lastCPUUsage) || { user: 0, system: 0 };
    this.lastCPUUsage = (globalThis as any).process?.cpuUsage?.();

    const totalUsage = currentUsage.user + currentUsage.system;
    const intervalMicros = this.config.samplingInterval * 1000;
    const percent = (totalUsage / intervalMicros) * 100;

    let loadAverage: number[] = [];
    try {
      // Load average is only available on Unix-like systems
      const os = (globalThis as any).require?.('os');
      loadAverage = os?.loadavg?.() || [0, 0, 0];
    } catch {
      loadAverage = [0, 0, 0];
    }

    return {
      user: currentUsage.user,
      system: currentUsage.system,
      percent: Math.min(percent, 100),
      loadAverage
    };
  }

  private getGCStats(): GCStats {
    // Simplified GC stats - in a real implementation, this would use
    // v8 performance hooks or external GC monitoring
    return {
      collections: 0,
      pauseTime: 0,
      heapSizeBefore: 0,
      heapSizeAfter: 0,
      freed: 0
    };
  }

  private calculateFrameTime(): number {
    // Simplified frame time calculation
    // In a real implementation, this would be measured from the actual rendering pipeline
    const recent = this.metricsHistory.slice(-5);
    if (recent.length < 2) {
      return 16.67; // Assume 60 FPS initially
    }

    const intervals = recent.slice(1).map((m, i) => m.timestamp - recent[i].timestamp);
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateRenderTime(): number {
    // Placeholder for actual render time measurement
    return Math.random() * 5; // 0-5ms random for simulation
  }

  private calculateUpdateTime(): number {
    // Placeholder for actual update time measurement
    return Math.random() * 3; // 0-3ms random for simulation
  }

  private addMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);

    // Trim history based on retention policy
    const retentionCutoff = Date.now() - this.config.metricsRetention;
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp >= retentionCutoff);
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    const thresholds = this.config.alertThresholds;

    this.checkFrameTimeAlert(metrics, thresholds);
    this.checkFrameRateAlert(metrics, thresholds);
    this.checkMemoryAlert(metrics, thresholds);
    this.checkCPUAlert(metrics, thresholds);
    this.checkGCAlert(metrics, thresholds);
    this.checkCustomAlerts(metrics, thresholds);
  }

  private checkFrameTimeAlert(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    if (metrics.frameTime > thresholds.frameTime) {
      this.createAlert({
        type: AlertType.FRAME_TIME,
        severity: this.calculateSeverity(metrics.frameTime, thresholds.frameTime),
        message: `Frame time exceeded threshold: ${metrics.frameTime.toFixed(2)}ms > ${thresholds.frameTime}ms`,
        metrics: { frameTime: metrics.frameTime },
        threshold: thresholds.frameTime,
        value: metrics.frameTime,
        source: 'frame_timer'
      });
    }
  }

  private checkFrameRateAlert(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    if (metrics.frameRate < thresholds.frameRate) {
      this.createAlert({
        type: AlertType.FRAME_RATE,
        severity: this.calculateSeverity(thresholds.frameRate, metrics.frameRate, true),
        message: `Frame rate below threshold: ${metrics.frameRate.toFixed(2)} < ${thresholds.frameRate}`,
        metrics: { frameRate: metrics.frameRate },
        threshold: thresholds.frameRate,
        value: metrics.frameRate,
        source: 'frame_counter'
      });
    }
  }

  private checkMemoryAlert(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    const memoryPercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;

    if (memoryPercent > thresholds.memoryUsage) {
      this.createAlert({
        type: AlertType.MEMORY_USAGE,
        severity: this.calculateSeverity(memoryPercent, thresholds.memoryUsage),
        message: `Memory usage exceeded threshold: ${memoryPercent.toFixed(1)}% > ${thresholds.memoryUsage}%`,
        metrics: { memoryUsage: metrics.memoryUsage },
        threshold: thresholds.memoryUsage,
        value: memoryPercent,
        source: 'memory_monitor'
      });
    }

    // Check for potential memory leaks
    this.checkMemoryLeak(metrics);
  }

  private checkCPUAlert(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    if (metrics.cpuUsage.percent > thresholds.cpuUsage) {
      this.createAlert({
        type: AlertType.CPU_USAGE,
        severity: this.calculateSeverity(metrics.cpuUsage.percent, thresholds.cpuUsage),
        message: `CPU usage exceeded threshold: ${metrics.cpuUsage.percent.toFixed(1)}% > ${thresholds.cpuUsage}%`,
        metrics: { cpuUsage: metrics.cpuUsage },
        threshold: thresholds.cpuUsage,
        value: metrics.cpuUsage.percent,
        source: 'cpu_monitor'
      });
    }
  }

  private checkGCAlert(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    if (metrics.gcStats.pauseTime > thresholds.gcPauseTime) {
      this.createAlert({
        type: AlertType.GC_PRESSURE,
        severity: this.calculateSeverity(metrics.gcStats.pauseTime, thresholds.gcPauseTime),
        message: `GC pause time exceeded threshold: ${metrics.gcStats.pauseTime.toFixed(2)}ms > ${thresholds.gcPauseTime}ms`,
        metrics: { gcStats: metrics.gcStats },
        threshold: thresholds.gcPauseTime,
        value: metrics.gcStats.pauseTime,
        source: 'gc_monitor'
      });
    }
  }

  private checkCustomAlerts(metrics: PerformanceMetrics, thresholds: AlertThresholds): void {
    for (const [name, threshold] of Object.entries(thresholds.custom)) {
      const value = metrics.custom[name];
      if (value !== undefined && value > threshold) {
        this.createAlert({
          type: AlertType.CUSTOM,
          severity: this.calculateSeverity(value, threshold),
          message: `Custom metric '${name}' exceeded threshold: ${value} > ${threshold}`,
          metrics: { custom: { [name]: value } },
          threshold,
          value,
          source: `custom_${name}`
        });
      }
    }
  }

  private checkMemoryLeak(metrics: PerformanceMetrics): void {
    if (this.metricsHistory.length < 10) {
      return; // Need more data points
    }

    const recent = this.metricsHistory.slice(-10);
    const memoryTrend = this.calculateMemoryTrend(recent);

    // Simple leak detection: consistent memory growth over time
    if (memoryTrend > 0.1) { // 10% growth over the sampling period
      this.createAlert({
        type: AlertType.MEMORY_LEAK,
        severity: AlertSeverity.HIGH,
        message: `Potential memory leak detected: ${(memoryTrend * 100).toFixed(1)}% growth trend`,
        metrics: { memoryUsage: metrics.memoryUsage },
        threshold: 0.1,
        value: memoryTrend,
        source: 'leak_detector'
      });
    }
  }

  private calculateMemoryTrend(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) {
      return 0;
    }

    const first = metrics[0].memoryUsage.heapUsed;
    const last = metrics[metrics.length - 1].memoryUsage.heapUsed;

    return (last - first) / first;
  }

  private calculateSeverity(value: number, threshold: number, inverse: boolean = false): AlertSeverity {
    const ratio = inverse ? threshold / value : value / threshold;

    if (ratio >= 2.0) {
      return AlertSeverity.CRITICAL;
    } else if (ratio >= 1.5) {
      return AlertSeverity.HIGH;
    } else if (ratio >= 1.2) {
      return AlertSeverity.MEDIUM;
    } else {
      return AlertSeverity.LOW;
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alertKey = `${alertData.type}_${alertData.source}`;
    const now = Date.now();
    const cooldownPeriod = 30000; // 30 seconds

    // Check cooldown to avoid spam
    const lastAlert = this.alertCooldowns.get(alertKey);
    if (lastAlert && (now - lastAlert) < cooldownPeriod) {
      return;
    }

    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: now,
      ...alertData
    };

    this.alertCooldowns.set(alertKey, now);
    this.emit('alert', alert);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  public getMetricsInRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metricsHistory.filter(m =>
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  public getAverageMetrics(windowSize: number = 10): PerformanceMetrics | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }

    const recent = this.metricsHistory.slice(-windowSize);
    const count = recent.length;

    if (count === 0) {
      return null;
    }

    const avg: PerformanceMetrics = {
      timestamp: recent[recent.length - 1].timestamp,
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0
      },
      cpuUsage: {
        user: 0,
        system: 0,
        percent: 0,
        loadAverage: [0, 0, 0]
      },
      frameTime: 0,
      frameRate: 0,
      renderTime: 0,
      updateTime: 0,
      gcStats: {
        collections: 0,
        pauseTime: 0,
        heapSizeBefore: 0,
        heapSizeAfter: 0,
        freed: 0
      },
      custom: {}
    };

    // Sum all metrics
    for (const metrics of recent) {
      avg.memoryUsage.heapUsed += metrics.memoryUsage.heapUsed;
      avg.memoryUsage.heapTotal += metrics.memoryUsage.heapTotal;
      avg.memoryUsage.external += metrics.memoryUsage.external;
      avg.memoryUsage.rss += metrics.memoryUsage.rss;
      avg.memoryUsage.arrayBuffers += metrics.memoryUsage.arrayBuffers;

      avg.cpuUsage.user += metrics.cpuUsage.user;
      avg.cpuUsage.system += metrics.cpuUsage.system;
      avg.cpuUsage.percent += metrics.cpuUsage.percent;
      avg.cpuUsage.loadAverage[0] += metrics.cpuUsage.loadAverage[0] || 0;
      avg.cpuUsage.loadAverage[1] += metrics.cpuUsage.loadAverage[1] || 0;
      avg.cpuUsage.loadAverage[2] += metrics.cpuUsage.loadAverage[2] || 0;

      avg.frameTime += metrics.frameTime;
      avg.frameRate += metrics.frameRate;
      avg.renderTime += metrics.renderTime;
      avg.updateTime += metrics.updateTime;

      avg.gcStats.collections += metrics.gcStats.collections;
      avg.gcStats.pauseTime += metrics.gcStats.pauseTime;
      avg.gcStats.heapSizeBefore += metrics.gcStats.heapSizeBefore;
      avg.gcStats.heapSizeAfter += metrics.gcStats.heapSizeAfter;
      avg.gcStats.freed += metrics.gcStats.freed;

      for (const [key, value] of Object.entries(metrics.custom)) {
        avg.custom[key] = (avg.custom[key] || 0) + value;
      }
    }

    // Calculate averages
    avg.memoryUsage.heapUsed /= count;
    avg.memoryUsage.heapTotal /= count;
    avg.memoryUsage.external /= count;
    avg.memoryUsage.rss /= count;
    avg.memoryUsage.arrayBuffers /= count;

    avg.cpuUsage.user /= count;
    avg.cpuUsage.system /= count;
    avg.cpuUsage.percent /= count;
    avg.cpuUsage.loadAverage[0] /= count;
    avg.cpuUsage.loadAverage[1] /= count;
    avg.cpuUsage.loadAverage[2] /= count;

    avg.frameTime /= count;
    avg.frameRate /= count;
    avg.renderTime /= count;
    avg.updateTime /= count;

    avg.gcStats.collections /= count;
    avg.gcStats.pauseTime /= count;
    avg.gcStats.heapSizeBefore /= count;
    avg.gcStats.heapSizeAfter /= count;
    avg.gcStats.freed /= count;

    for (const key of Object.keys(avg.custom)) {
      avg.custom[key] /= count;
    }

    return avg;
  }

  public addCustomMetric(name: string, collector: () => number): void {
    this.customMetrics.set(name, collector);
  }

  public removeCustomMetric(name: string): boolean {
    return this.customMetrics.delete(name);
  }

  public updateConfig(newConfig: Partial<PerformanceMonitorConfig>): void {
    const wasMonitoring = this.isMonitoring;

    if (wasMonitoring) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };
    this.validateConfig();

    if (wasMonitoring) {
      this.start();
    }

    this.emit('config_updated', this.config);
  }

  public getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  public clearHistory(): void {
    this.metricsHistory = [];
    this.alertCooldowns.clear();
    this.emit('history_cleared');
  }

  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    } else {
      return JSON.stringify(this.metricsHistory, null, 2);
    }
  }

  private exportAsCSV(): string {
    if (this.metricsHistory.length === 0) {
      return '';
    }

    const headers = [
      'timestamp',
      'heapUsed',
      'heapTotal',
      'external',
      'rss',
      'arrayBuffers',
      'cpuUser',
      'cpuSystem',
      'cpuPercent',
      'frameTime',
      'frameRate',
      'renderTime',
      'updateTime',
      'gcCollections',
      'gcPauseTime'
    ];

    const customKeys = new Set<string>();
    for (const metrics of this.metricsHistory) {
      Object.keys(metrics.custom).forEach(key => customKeys.add(key));
    }
    headers.push(...Array.from(customKeys));

    const rows = [headers.join(',')];

    for (const metrics of this.metricsHistory) {
      const row = [
        metrics.timestamp,
        metrics.memoryUsage.heapUsed,
        metrics.memoryUsage.heapTotal,
        metrics.memoryUsage.external,
        metrics.memoryUsage.rss,
        metrics.memoryUsage.arrayBuffers,
        metrics.cpuUsage.user,
        metrics.cpuUsage.system,
        metrics.cpuUsage.percent,
        metrics.frameTime,
        metrics.frameRate,
        metrics.renderTime,
        metrics.updateTime,
        metrics.gcStats.collections,
        metrics.gcStats.pauseTime
      ];

      for (const key of customKeys) {
        row.push(metrics.custom[key] || 0);
      }

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  public on(event: 'metrics_collected', listener: PerformanceEventHandler): this;
  public on(event: 'alert', listener: AlertHandler): this;
  public on(event: 'monitoring_started' | 'monitoring_stopped' | 'history_cleared', listener: () => void): this;
  public on(event: 'config_updated', listener: (config: PerformanceMonitorConfig) => void): this;
  public on(event: 'collection_error', listener: (error: Error) => void): this;
  public on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}