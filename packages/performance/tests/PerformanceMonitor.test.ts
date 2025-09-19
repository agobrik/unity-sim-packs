import { PerformanceMonitor } from '../src/core/PerformanceMonitor';
import { AlertType, AlertSeverity } from '../src/types';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  const defaultConfig = {
    enabled: true,
    samplingInterval: 100,
    metricsRetention: 10000,
    alertThresholds: {
      frameTime: 20,
      frameRate: 30,
      memoryUsage: 80,
      cpuUsage: 80,
      gcPauseTime: 10,
      custom: {}
    },
    profilingOptions: {
      samplingInterval: 1,
      includeLineNumbers: true,
      includeColumns: false,
      stackDepth: 50,
      filterModules: []
    },
    memoryOptions: {
      trackAllocations: true,
      stackDepth: 10,
      sampleInterval: 1000,
      includeObjectIds: false
    },
    autoOptimization: {
      enabled: false,
      conservative: true,
      maxConcurrentOptimizations: 3,
      rollbackOnRegression: true,
      testDuration: 30000
    }
  };

  beforeEach(() => {
    monitor = new PerformanceMonitor(defaultConfig);
  });

  afterEach(() => {
    if (monitor.isRunning()) {
      monitor.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', () => {
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
      expect(monitor.isRunning()).toBe(false);
    });

    it('should throw error for invalid sampling interval', () => {
      expect(() => {
        new PerformanceMonitor({
          ...defaultConfig,
          samplingInterval: 50 // Too low
        });
      }).toThrow('Sampling interval must be at least 100ms');
    });

    it('should throw error for invalid metrics retention', () => {
      expect(() => {
        new PerformanceMonitor({
          ...defaultConfig,
          metricsRetention: 500 // Too low
        });
      }).toThrow('Metrics retention must be at least 1000ms');
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring successfully', () => {
      const startSpy = jest.fn();
      monitor.on('monitoring_started', startSpy);

      monitor.start();

      expect(monitor.isRunning()).toBe(true);
      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop monitoring successfully', () => {
      const stopSpy = jest.fn();
      monitor.on('monitoring_stopped', stopSpy);

      monitor.start();
      monitor.stop();

      expect(monitor.isRunning()).toBe(false);
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should not start if already running', () => {
      monitor.start();
      monitor.start(); // Should be ignored

      expect(monitor.isRunning()).toBe(true);
    });

    it('should not stop if not running', () => {
      monitor.stop(); // Should be ignored

      expect(monitor.isRunning()).toBe(false);
    });
  });

  describe('metrics collection', () => {
    it('should collect metrics when monitoring', (done) => {
      monitor.on('metrics_collected', (metrics) => {
        expect(metrics).toBeDefined();
        expect(metrics.timestamp).toBeGreaterThan(0);
        expect(metrics.memoryUsage).toBeDefined();
        expect(metrics.cpuUsage).toBeDefined();
        expect(metrics.frameTime).toBeGreaterThan(0);
        expect(metrics.frameRate).toBeGreaterThanOrEqual(0);

        monitor.stop();
        done();
      });

      monitor.start();
    });

    it('should store metrics in history', (done) => {
      let metricsCount = 0;

      monitor.on('metrics_collected', () => {
        metricsCount++;
        if (metricsCount >= 3) {
          const history = monitor.getMetrics();
          expect(history).toHaveLength(metricsCount);

          monitor.stop();
          done();
        }
      });

      monitor.start();
    });

    it('should return latest metrics', (done) => {
      monitor.on('metrics_collected', () => {
        const latest = monitor.getLatestMetrics();
        expect(latest).toBeDefined();
        expect(latest!.timestamp).toBeGreaterThan(0);

        monitor.stop();
        done();
      });

      monitor.start();
    });

    it('should filter metrics by time range', (done) => {
      let metricsCount = 0;
      const startTime = Date.now();

      monitor.on('metrics_collected', () => {
        metricsCount++;
        if (metricsCount >= 5) {
          const endTime = Date.now();
          const rangeMetrics = monitor.getMetricsInRange(startTime, endTime);

          expect(rangeMetrics.length).toBeGreaterThan(0);
          expect(rangeMetrics.length).toBeLessThanOrEqual(metricsCount);

          monitor.stop();
          done();
        }
      });

      monitor.start();
    });
  });

  describe('custom metrics', () => {
    it('should add custom metric collector', (done) => {
      let customValue = 100;
      monitor.addCustomMetric('testMetric', () => customValue);

      monitor.on('metrics_collected', (metrics) => {
        expect(metrics.custom.testMetric).toBe(100);
        monitor.stop();
        done();
      });

      monitor.start();
    });

    it('should remove custom metric collector', () => {
      monitor.addCustomMetric('testMetric', () => 100);
      const removed = monitor.removeCustomMetric('testMetric');

      expect(removed).toBe(true);
    });

    it('should handle custom metric errors', (done) => {
      monitor.addCustomMetric('errorMetric', () => {
        throw new Error('Test error');
      });

      monitor.on('metrics_collected', (metrics) => {
        expect(metrics.custom.errorMetric).toBe(-1); // Error indicator
        monitor.stop();
        done();
      });

      monitor.start();
    });
  });

  describe('alerting', () => {
    it('should trigger memory usage alert', (done) => {
      // Create monitor with very low memory threshold
      const alertMonitor = new PerformanceMonitor({
        ...defaultConfig,
        alertThresholds: {
          ...defaultConfig.alertThresholds,
          memoryUsage: 1 // 1% threshold - will always trigger
        }
      });

      alertMonitor.on('alert', (alert) => {
        expect(alert.type).toBe(AlertType.MEMORY_USAGE);
        expect(alert.severity).toBeDefined();
        expect(alert.message).toContain('Memory usage exceeded threshold');

        alertMonitor.stop();
        done();
      });

      alertMonitor.start();
    });

    it('should trigger CPU usage alert', (done) => {
      const alertMonitor = new PerformanceMonitor({
        ...defaultConfig,
        alertThresholds: {
          ...defaultConfig.alertThresholds,
          cpuUsage: 1 // 1% threshold - will likely trigger
        }
      });

      alertMonitor.on('alert', (alert) => {
        expect(alert.type).toBe(AlertType.CPU_USAGE);
        expect(alert.severity).toBeDefined();
        expect(alert.message).toContain('CPU usage exceeded threshold');

        alertMonitor.stop();
        done();
      });

      alertMonitor.start();
    });

    it('should trigger frame time alert', (done) => {
      const alertMonitor = new PerformanceMonitor({
        ...defaultConfig,
        alertThresholds: {
          ...defaultConfig.alertThresholds,
          frameTime: 1 // 1ms threshold - will likely trigger
        }
      });

      alertMonitor.on('alert', (alert) => {
        expect(alert.type).toBe(AlertType.FRAME_TIME);
        expect(alert.severity).toBeDefined();
        expect(alert.message).toContain('Frame time exceeded threshold');

        alertMonitor.stop();
        done();
      });

      alertMonitor.start();
    });

    it('should respect alert cooldowns', (done) => {
      let alertCount = 0;

      const alertMonitor = new PerformanceMonitor({
        ...defaultConfig,
        samplingInterval: 100,
        alertThresholds: {
          ...defaultConfig.alertThresholds,
          memoryUsage: 1 // Will always trigger
        }
      });

      alertMonitor.on('alert', () => {
        alertCount++;
      });

      alertMonitor.start();

      // Check after sufficient time that we don't get too many alerts
      setTimeout(() => {
        alertMonitor.stop();
        // Should have significantly fewer alerts than samples due to cooldown
        expect(alertCount).toBeLessThan(10);
        done();
      }, 1000);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration while stopped', () => {
      const configSpy = jest.fn();
      monitor.on('config_updated', configSpy);

      monitor.updateConfig({
        samplingInterval: 200
      });

      const newConfig = monitor.getConfig();
      expect(newConfig.samplingInterval).toBe(200);
      expect(configSpy).toHaveBeenCalledWith(newConfig);
    });

    it('should restart monitoring after config update', () => {
      monitor.start();
      expect(monitor.isRunning()).toBe(true);

      monitor.updateConfig({
        samplingInterval: 200
      });

      expect(monitor.isRunning()).toBe(true);
      const newConfig = monitor.getConfig();
      expect(newConfig.samplingInterval).toBe(200);
    });
  });

  describe('average metrics calculation', () => {
    it('should calculate average metrics', (done) => {
      let sampleCount = 0;

      monitor.on('metrics_collected', () => {
        sampleCount++;
        if (sampleCount >= 5) {
          const average = monitor.getAverageMetrics(3);

          expect(average).toBeDefined();
          expect(average!.memoryUsage).toBeDefined();
          expect(average!.cpuUsage).toBeDefined();
          expect(average!.frameTime).toBeGreaterThan(0);

          monitor.stop();
          done();
        }
      });

      monitor.start();
    });

    it('should return null for average with no data', () => {
      const average = monitor.getAverageMetrics();
      expect(average).toBeNull();
    });
  });

  describe('data management', () => {
    it('should clear metrics history', () => {
      const clearSpy = jest.fn();
      monitor.on('history_cleared', clearSpy);

      // Add some data first
      monitor.start();

      setTimeout(() => {
        monitor.stop();
        monitor.clearHistory();

        const metrics = monitor.getMetrics();
        expect(metrics).toHaveLength(0);
        expect(clearSpy).toHaveBeenCalled();
      }, 200);
    });

    it('should export metrics as JSON', (done) => {
      monitor.on('metrics_collected', () => {
        const jsonExport = monitor.exportMetrics('json');
        expect(jsonExport).toBeDefined();
        expect(() => JSON.parse(jsonExport)).not.toThrow();

        monitor.stop();
        done();
      });

      monitor.start();
    });

    it('should export metrics as CSV', (done) => {
      monitor.on('metrics_collected', () => {
        const csvExport = monitor.exportMetrics('csv');
        expect(csvExport).toBeDefined();
        expect(csvExport).toContain('timestamp');
        expect(csvExport).toContain('heapUsed');

        monitor.stop();
        done();
      });

      monitor.start();
    });
  });

  describe('error handling', () => {
    it('should emit collection errors', (done) => {
      const errorSpy = jest.fn();
      monitor.on('collection_error', errorSpy);

      // Force an error by mocking process.memoryUsage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Mock memory error');
      });

      monitor.start();

      setTimeout(() => {
        process.memoryUsage = originalMemoryUsage;
        monitor.stop();

        expect(errorSpy).toHaveBeenCalled();
        done();
      }, 200);
    });
  });

  describe('metrics retention', () => {
    it('should respect metrics retention policy', (done) => {
      const shortRetentionMonitor = new PerformanceMonitor({
        ...defaultConfig,
        samplingInterval: 100,
        metricsRetention: 500 // 500ms retention
      });

      let sampleCount = 0;
      shortRetentionMonitor.on('metrics_collected', () => {
        sampleCount++;
        if (sampleCount >= 10) {
          const metrics = shortRetentionMonitor.getMetrics();
          // Should have fewer metrics due to retention policy
          expect(metrics.length).toBeLessThan(sampleCount);

          shortRetentionMonitor.stop();
          done();
        }
      });

      shortRetentionMonitor.start();
    });
  });
});