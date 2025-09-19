import {
  AdapterManager,
  DataAdapter,
  AdapterType,
  AdapterFactoryConfig,
  AdapterHealthReport,
  HealthStatusType,
  AdapterStatus,
  MonitoringConfig,
  AlertConfig,
  MetricsCollector,
  MetricCollection,
  Metric,
  MetricType
} from './types';

import { RestApiAdapter } from './adapters/rest-api';
import { WebSocketAdapter } from './adapters/websocket';
import { FileSystemAdapter } from './adapters/file-system';

export class DataAdapterManager implements AdapterManager {
  private adapters: Map<string, DataAdapter> = new Map();
  private adapterFactories: Map<AdapterType, AdapterFactory> = new Map();
  private monitoring: MonitoringManager | null = null;
  private metricsCollector: AdapterMetricsCollector;

  constructor() {
    this.initializeFactories();
    this.metricsCollector = new AdapterMetricsCollector(this);
  }

  private initializeFactories(): void {
    this.adapterFactories.set(AdapterType.REST_API, new RestApiAdapterFactory());
    this.adapterFactories.set(AdapterType.WEBSOCKET, new WebSocketAdapterFactory());
    this.adapterFactories.set(AdapterType.FILE_SYSTEM, new FileSystemAdapterFactory());
  }

  public registerAdapter(adapter: DataAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Adapter with ID ${adapter.id} is already registered`);
    }

    this.adapters.set(adapter.id, adapter);

    // Set up adapter event listeners for monitoring
    if (this.monitoring) {
      this.monitoring.addAdapter(adapter);
    }
  }

  public unregisterAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (adapter) {
      // Disconnect adapter before removing
      if (adapter.isConnected()) {
        adapter.disconnect().catch(console.error);
      }

      this.adapters.delete(adapterId);

      if (this.monitoring) {
        this.monitoring.removeAdapter(adapterId);
      }
    }
  }

  public getAdapter(adapterId: string): DataAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  public getAllAdapters(): DataAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getAdaptersByType(type: AdapterType): DataAdapter[] {
    return this.getAllAdapters().filter(adapter => adapter.type === type);
  }

  public async createAdapter(config: AdapterFactoryConfig): Promise<DataAdapter> {
    const factory = this.adapterFactories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for adapter type: ${config.type}`);
    }

    const adapter = await factory.create(config.config, config.metadata);
    this.registerAdapter(adapter);

    return adapter;
  }

  public async connectAll(): Promise<void> {
    const connectPromises = this.getAllAdapters()
      .filter(adapter => !adapter.isConnected())
      .map(adapter => adapter.connect().catch(error => {
        console.error(`Failed to connect adapter ${adapter.id}:`, error);
      }));

    await Promise.all(connectPromises);
  }

  public async disconnectAll(): Promise<void> {
    const disconnectPromises = this.getAllAdapters()
      .filter(adapter => adapter.isConnected())
      .map(adapter => adapter.disconnect().catch(error => {
        console.error(`Failed to disconnect adapter ${adapter.id}:`, error);
      }));

    await Promise.all(disconnectPromises);
  }

  public async getHealthStatus(): Promise<AdapterHealthReport> {
    const adapters = this.getAllAdapters();
    const adapterStatuses = adapters.map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      status: this.mapAdapterStatusToHealth(adapter.status),
      details: adapter.metadata.health
    }));

    const summary = {
      total: adapters.length,
      healthy: adapterStatuses.filter(a => a.status === HealthStatusType.HEALTHY).length,
      degraded: adapterStatuses.filter(a => a.status === HealthStatusType.DEGRADED).length,
      unhealthy: adapterStatuses.filter(a => a.status === HealthStatusType.UNHEALTHY).length,
      unknown: adapterStatuses.filter(a => a.status === HealthStatusType.UNKNOWN).length
    };

    let overallStatus: HealthStatusType;
    if (summary.unhealthy > 0) {
      overallStatus = HealthStatusType.UNHEALTHY;
    } else if (summary.degraded > 0) {
      overallStatus = HealthStatusType.DEGRADED;
    } else if (summary.healthy > 0) {
      overallStatus = HealthStatusType.HEALTHY;
    } else {
      overallStatus = HealthStatusType.UNKNOWN;
    }

    return {
      overall: overallStatus,
      adapters: adapterStatuses,
      timestamp: new Date().toISOString(),
      summary
    };
  }

  private mapAdapterStatusToHealth(status: AdapterStatus): HealthStatusType {
    switch (status) {
      case AdapterStatus.CONNECTED:
        return HealthStatusType.HEALTHY;
      case AdapterStatus.RATE_LIMITED:
        return HealthStatusType.DEGRADED;
      case AdapterStatus.ERROR:
        return HealthStatusType.UNHEALTHY;
      case AdapterStatus.RECONNECTING:
        return HealthStatusType.DEGRADED;
      default:
        return HealthStatusType.UNKNOWN;
    }
  }

  public monitorAdapters(config?: MonitoringConfig): void {
    if (this.monitoring) {
      this.stopMonitoring();
    }

    this.monitoring = new MonitoringManager(config);

    // Add all existing adapters to monitoring
    for (const adapter of this.getAllAdapters()) {
      this.monitoring.addAdapter(adapter);
    }

    this.monitoring.start();
  }

  public stopMonitoring(): void {
    if (this.monitoring) {
      this.monitoring.stop();
      this.monitoring = null;
    }
  }

  public getMetrics(): Promise<MetricCollection> {
    return this.metricsCollector.collect();
  }

  public async dispose(): Promise<void> {
    this.stopMonitoring();
    await this.disconnectAll();
    this.adapters.clear();
    this.adapterFactories.clear();
  }
}

interface AdapterFactory {
  create(config: any, metadata?: any): Promise<DataAdapter>;
}

class RestApiAdapterFactory implements AdapterFactory {
  public async create(config: any, metadata: any = {}): Promise<DataAdapter> {
    const defaultMetadata = {
      description: 'REST API Adapter',
      version: '1.0.0',
      author: 'Steam Simulation Team',
      tags: ['rest', 'api', 'http'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      capabilities: [],
      limitations: [],
      dependencies: ['axios'],
      health: {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        details: {}
      }
    };

    return new RestApiAdapter(config, { ...defaultMetadata, ...metadata });
  }
}

class WebSocketAdapterFactory implements AdapterFactory {
  public async create(config: any, metadata: any = {}): Promise<DataAdapter> {
    const defaultMetadata = {
      description: 'WebSocket Adapter',
      version: '1.0.0',
      author: 'Steam Simulation Team',
      tags: ['websocket', 'realtime', 'streaming'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      capabilities: [],
      limitations: [],
      dependencies: ['ws'],
      health: {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        details: {}
      }
    };

    return new WebSocketAdapter(config, { ...defaultMetadata, ...metadata });
  }
}

class FileSystemAdapterFactory implements AdapterFactory {
  public async create(config: any, metadata: any = {}): Promise<DataAdapter> {
    const defaultMetadata = {
      description: 'File System Adapter',
      version: '1.0.0',
      author: 'Steam Simulation Team',
      tags: ['filesystem', 'files', 'local'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      capabilities: [],
      limitations: [],
      dependencies: ['fs', 'csv-parser', 'xml2js'],
      health: {
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        details: {}
      }
    };

    return new FileSystemAdapter(config, { ...defaultMetadata, ...metadata });
  }
}

class MonitoringManager {
  private config: MonitoringConfig;
  private adapters: Map<string, DataAdapter> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertManager: AlertManager;

  constructor(config: MonitoringConfig = { enabled: true, interval: 30000, metrics: [] }) {
    this.config = config;
    this.alertManager = new AlertManager(config.alerts || []);
  }

  public addAdapter(adapter: DataAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public removeAdapter(adapterId: string): void {
    this.adapters.delete(adapterId);
  }

  public start(): void {
    if (!this.config.enabled || this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.interval);

    console.log('Adapter monitoring started');
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Adapter monitoring stopped');
  }

  private async performHealthChecks(): Promise<void> {
    const timestamp = new Date().toISOString();

    for (const [id, adapter] of this.adapters) {
      try {
        const startTime = Date.now();

        // Check if adapter is responsive
        const isConnected = adapter.isConnected();
        const responseTime = Date.now() - startTime;

        // Update health status
        adapter.metadata.health.lastCheck = timestamp;
        adapter.metadata.health.responseTime = responseTime;

        if (isConnected) {
          adapter.metadata.health.status = HealthStatusType.HEALTHY;
        } else {
          adapter.metadata.health.status = HealthStatusType.UNHEALTHY;
        }

        // Check for alerts
        this.alertManager.checkAlerts(adapter);

      } catch (error) {
        console.error(`Health check failed for adapter ${id}:`, error);
        adapter.metadata.health.status = HealthStatusType.UNHEALTHY;
        adapter.metadata.health.details.healthCheckError = error instanceof Error ? error.message : String(error);
      }
    }
  }
}

class AlertManager {
  private alertConfigs: AlertConfig[];
  private activeAlerts: Map<string, any> = new Map();

  constructor(alertConfigs: AlertConfig[]) {
    this.alertConfigs = alertConfigs;
  }

  public checkAlerts(adapter: DataAdapter): void {
    for (const alertConfig of this.alertConfigs) {
      const alertKey = `${adapter.id}_${alertConfig.name}`;

      if (this.evaluateCondition(adapter, alertConfig)) {
        if (!this.activeAlerts.has(alertKey)) {
          this.triggerAlert(adapter, alertConfig);
          this.activeAlerts.set(alertKey, {
            adapter: adapter.id,
            alert: alertConfig.name,
            triggeredAt: new Date().toISOString()
          });
        }
      } else {
        if (this.activeAlerts.has(alertKey)) {
          this.resolveAlert(adapter, alertConfig);
          this.activeAlerts.delete(alertKey);
        }
      }
    }
  }

  private evaluateCondition(adapter: DataAdapter, alertConfig: AlertConfig): boolean {
    // Simple condition evaluation - in production, use a proper expression evaluator
    const condition = alertConfig.condition;

    if (condition.includes('response_time')) {
      return adapter.metadata.health.responseTime > alertConfig.threshold;
    }

    if (condition.includes('error_rate')) {
      return adapter.metadata.health.errorRate > alertConfig.threshold;
    }

    if (condition.includes('status')) {
      return adapter.metadata.health.status === HealthStatusType.UNHEALTHY;
    }

    return false;
  }

  private triggerAlert(adapter: DataAdapter, alertConfig: AlertConfig): void {
    console.warn(`🚨 Alert triggered: ${alertConfig.name} for adapter ${adapter.id}`);

    for (const action of alertConfig.actions) {
      this.executeAlertAction(adapter, alertConfig, action);
    }
  }

  private resolveAlert(adapter: DataAdapter, alertConfig: AlertConfig): void {
    console.info(`✅ Alert resolved: ${alertConfig.name} for adapter ${adapter.id}`);
  }

  private executeAlertAction(adapter: DataAdapter, alertConfig: AlertConfig, action: any): void {
    switch (action.type) {
      case 'log':
        console.log(`Alert action - Log: ${alertConfig.name} for ${adapter.id}`);
        break;
      case 'email':
        console.log(`Alert action - Email: Would send email for ${alertConfig.name}`);
        break;
      case 'webhook':
        console.log(`Alert action - Webhook: Would call webhook for ${alertConfig.name}`);
        break;
      default:
        console.log(`Unknown alert action type: ${action.type}`);
    }
  }
}

class AdapterMetricsCollector implements MetricsCollector {
  private manager: DataAdapterManager;
  private collecting = false;

  constructor(manager: DataAdapterManager) {
    this.manager = manager;
  }

  public async collect(): Promise<MetricCollection> {
    const timestamp = new Date().toISOString();
    const metrics: Metric[] = [];

    const adapters = this.manager.getAllAdapters();

    // Collect adapter count metrics
    metrics.push({
      name: 'adapters_total',
      type: MetricType.GAUGE,
      value: adapters.length,
      timestamp,
      tags: {}
    });

    metrics.push({
      name: 'adapters_connected',
      type: MetricType.GAUGE,
      value: adapters.filter(a => a.isConnected()).length,
      timestamp,
      tags: {}
    });

    // Collect metrics by adapter type
    const typeGroups = adapters.reduce((groups, adapter) => {
      groups[adapter.type] = (groups[adapter.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    for (const [type, count] of Object.entries(typeGroups)) {
      metrics.push({
        name: 'adapters_by_type',
        type: MetricType.GAUGE,
        value: count,
        timestamp,
        tags: { type }
      });
    }

    // Collect health metrics
    for (const adapter of adapters) {
      const health = adapter.metadata.health;

      metrics.push({
        name: 'adapter_response_time',
        type: MetricType.GAUGE,
        value: health.responseTime,
        unit: 'ms',
        timestamp,
        tags: { adapter_id: adapter.id, adapter_type: adapter.type }
      });

      metrics.push({
        name: 'adapter_error_rate',
        type: MetricType.GAUGE,
        value: health.errorRate,
        timestamp,
        tags: { adapter_id: adapter.id, adapter_type: adapter.type }
      });

      metrics.push({
        name: 'adapter_throughput',
        type: MetricType.GAUGE,
        value: health.throughput,
        unit: 'req/s',
        timestamp,
        tags: { adapter_id: adapter.id, adapter_type: adapter.type }
      });
    }

    return {
      timestamp,
      metrics,
      metadata: {
        source: 'DataAdapterManager',
        version: '1.0.0'
      }
    };
  }

  public start(): void {
    this.collecting = true;
  }

  public stop(): void {
    this.collecting = false;
  }

  public configure(config: any): void {
    // Configure metrics collection based on config
  }
}