/**
 * WebSocket Data Source for Steam Simulation Toolkit
 * Provides real-time data via WebSocket connections
 */

import { EventEmitter, timer } from '../utils/EventEmitter';
import { DataSource } from './DataSourceManager';
import { DataSet, DataSourceConfig, DataSeries, DataPoint } from '../core/types';

export class WebSocketDataSource extends EventEmitter implements DataSource {
  public readonly id: string;
  public readonly config: DataSourceConfig;
  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === 1; // WebSocket.OPEN
  }
  public get lastUpdate(): Date | null {
    return this._lastUpdate;
  }

  private ws: any = null; // WebSocket instance
  private _lastUpdate: Date | null = null;
  private dataset: DataSet;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private messageQueue: any[] = [];

  constructor(id: string, config: DataSourceConfig) {
    super();
    this.id = id;
    this.config = { ...config };

    if (!this.config.url) {
      throw new Error('WebSocket URL is required in config');
    }

    // Initialize empty dataset
    this.dataset = {
      id: this.id,
      name: `WebSocket Data: ${this.id}`,
      series: [],
      metadata: {
        source: 'websocket',
        url: this.config.url
      }
    };
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use globalThis to access WebSocket in browser or Node.js with ws package
        const WebSocketClass = (globalThis as any).WebSocket || (globalThis as any).require?.('ws');
        if (!WebSocketClass) {
          throw new Error('WebSocket not available in this environment');
        }

        this.ws = new WebSocketClass(this.config.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit('connection-changed', this, true);
          this.startPing();

          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
          }

          resolve();
        };

        this.ws.onmessage = (event: any) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event: any) => {
          this.stopPing();
          this.emit('connection-changed', this, false);

          if (event.code !== 1000) { // Not a clean close
            this.handleReconnect();
          }
        };

        this.ws.onerror = (error: any) => {
          this.emit('error', this, new Error(`WebSocket error: ${error.message || 'Unknown error'}`));
          reject(new Error(`Failed to connect to ${this.config.url}`));
        };

        // Connection timeout
        timer.setTimeout(() => {
          if (this.ws && this.ws.readyState === 0) { // WebSocket.CONNECTING
            this.ws.close();
            reject(new Error(`Connection timeout to ${this.config.url}`));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.reconnectTimer) {
        timer.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.stopPing();

      if (this.ws) {
        const ws = this.ws;
        this.ws = null;

        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.onclose = () => {
            this.emit('connection-changed', this, false);
            resolve();
          };
          ws.close(1000, 'Client disconnect');
        } else {
          this.emit('connection-changed', this, false);
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  public async getData(): Promise<DataSet> {
    return Promise.resolve(this.dataset);
  }

  public updateConfig(config: Partial<DataSourceConfig>): void {
    Object.assign(this.config, config);
  }

  public sendMessage(message: any): void {
    if (this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
    }
  }

  public subscribe(topic: string): void {
    this.sendMessage({
      type: 'subscribe',
      topic: topic,
      timestamp: Date.now()
    });
  }

  public unsubscribe(topic: string): void {
    this.sendMessage({
      type: 'unsubscribe',
      topic: topic,
      timestamp: Date.now()
    });
  }

  private handleMessage(event: any): void {
    try {
      const data = JSON.parse(event.data);
      this._lastUpdate = new Date();

      switch (data.type) {
        case 'data':
          this.handleDataMessage(data);
          break;
        case 'series':
          this.handleSeriesMessage(data);
          break;
        case 'dataset':
          this.handleDatasetMessage(data);
          break;
        case 'error':
          this.handleErrorMessage(data);
          break;
        case 'pong':
          // Ping/pong for connection health
          break;
        default:
          (globalThis as any).console?.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      this.emit('error', this, new Error(`Failed to parse WebSocket message: ${error}`));
    }
  }

  private handleDataMessage(data: any): void {
    if (!data.seriesId || !data.dataPoints) return;

    let series = this.dataset.series.find(s => s.id === data.seriesId);
    if (!series) {
      series = {
        id: data.seriesId,
        name: data.seriesName || data.seriesId,
        data: [],
        visible: true
      };
      this.dataset.series.push(series);
    }

    // Add new data points
    const newPoints: DataPoint[] = Array.isArray(data.dataPoints) ? data.dataPoints : [data.dataPoints];

    newPoints.forEach(pointData => {
      const dataPoint: DataPoint = {
        id: pointData.id || `${Date.now()}_${Math.random()}`,
        value: pointData.value,
        label: pointData.label,
        timestamp: pointData.timestamp ? new Date(pointData.timestamp) : new Date(),
        metadata: pointData.metadata
      };

      series!.data.push(dataPoint);
    });

    // Limit data points if specified
    const maxPoints = (this.config as any).metadata?.maxDataPoints || 1000;
    if (series.data.length > maxPoints) {
      series.data = series.data.slice(-maxPoints);
    }

    this.emit('data-updated', this, this.dataset);
  }

  private handleSeriesMessage(data: any): void {
    if (!data.series) return;

    const seriesData = data.series;
    let series = this.dataset.series.find(s => s.id === seriesData.id);

    if (!series) {
      series = {
        id: seriesData.id,
        name: seriesData.name || seriesData.id,
        data: [],
        visible: seriesData.visible !== false,
        color: seriesData.color,
        metadata: seriesData.metadata
      };
      this.dataset.series.push(series);
    } else {
      // Update existing series properties
      series.name = seriesData.name || series.name;
      series.visible = seriesData.visible !== false;
      if (seriesData.color) series.color = seriesData.color;
      if (seriesData.metadata) series.metadata = { ...series.metadata, ...seriesData.metadata };
    }

    // Replace or append data
    if (data.replace) {
      series.data = seriesData.data || [];
    } else {
      series.data.push(...(seriesData.data || []));
    }

    this.emit('data-updated', this, this.dataset);
  }

  private handleDatasetMessage(data: any): void {
    if (!data.dataset) return;

    const newDataset = data.dataset;

    // Update dataset properties
    if (newDataset.name) this.dataset.name = newDataset.name;
    if (newDataset.metadata) {
      this.dataset.metadata = { ...this.dataset.metadata, ...newDataset.metadata };
    }

    // Replace or merge series
    if (data.replace) {
      this.dataset.series = newDataset.series || [];
    } else {
      // Merge series
      newDataset.series?.forEach((newSeries: DataSeries) => {
        const existingIndex = this.dataset.series.findIndex(s => s.id === newSeries.id);
        if (existingIndex >= 0) {
          this.dataset.series[existingIndex] = newSeries;
        } else {
          this.dataset.series.push(newSeries);
        }
      });
    }

    this.emit('data-updated', this, this.dataset);
  }

  private handleErrorMessage(data: any): void {
    const error = new Error(data.message || 'WebSocket server error');
    this.emit('error', this, error);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', this, new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    this.reconnectTimer = timer.setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        (globalThis as any).console?.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      }
    }, delay);
  }

  private startPing(): void {
    this.stopPing();

    this.pingTimer = timer.setInterval(() => {
      if (this.isConnected) {
        this.sendMessage({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingTimer) {
      timer.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public getConnectionStats(): {
    connected: boolean;
    reconnectAttempts: number;
    lastUpdate: Date | null;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastUpdate: this.lastUpdate,
      queuedMessages: this.messageQueue.length
    };
  }

  public clearData(): void {
    this.dataset.series.forEach(series => {
      series.data = [];
    });
    this.emit('data-updated', this, this.dataset);
  }

  public removeOldData(maxAge: number): void {
    const cutoff = new Date(Date.now() - maxAge);
    let changed = false;

    this.dataset.series.forEach(series => {
      const originalLength = series.data.length;
      series.data = series.data.filter(point =>
        !point.timestamp || point.timestamp >= cutoff
      );
      if (series.data.length !== originalLength) {
        changed = true;
      }
    });

    if (changed) {
      this.emit('data-updated', this, this.dataset);
    }
  }
}