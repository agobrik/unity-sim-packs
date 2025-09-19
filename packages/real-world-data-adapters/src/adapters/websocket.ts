import WebSocket from 'ws';
import {
  DataAdapter,
  AdapterType,
  AdapterStatus,
  AdapterConfig,
  AdapterMetadata,
  DataQuery,
  DataResult,
  DataStream,
  DataCallback,
  ValidationResult,
  DataSchema,
  DataTransformer,
  StreamStatus,
  StreamMetadata,
  AdapterCapability,
  HealthStatusType,
  DataType
} from '../types';

export class WebSocketAdapter implements DataAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = AdapterType.WEBSOCKET;
  public status: AdapterStatus = AdapterStatus.DISCONNECTED;
  public config: AdapterConfig;
  public metadata: AdapterMetadata;

  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private streams: Map<string, WebSocketStream> = new Map();
  private messageQueue: any[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: AdapterConfig, metadata: AdapterMetadata) {
    this.id = `websocket_${Date.now()}`;
    this.name = metadata.description || 'WebSocket Adapter';
    this.config = config;
    this.metadata = {
      ...metadata,
      capabilities: [
        AdapterCapability.READ,
        AdapterCapability.STREAM,
        AdapterCapability.REAL_TIME,
        AdapterCapability.ERROR_RECOVERY,
        AdapterCapability.MONITORING
      ],
      health: {
        status: HealthStatusType.UNKNOWN,
        lastCheck: new Date().toISOString(),
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        details: {}
      }
    };
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.status = AdapterStatus.CONNECTING;

        const url = this.buildWebSocketUrl();
        const options = this.buildConnectionOptions();

        this.ws = new WebSocket(url, options);

        this.ws.on('open', () => {
          this.status = AdapterStatus.CONNECTED;
          this.reconnectAttempts = 0;
          this.metadata.health.status = HealthStatusType.HEALTHY;

          this.setupHeartbeat();
          this.processMessageQueue();

          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          this.metadata.health.status = HealthStatusType.UNHEALTHY;
          this.metadata.health.details.lastError = {
            message: error.message,
            timestamp: new Date().toISOString()
          };

          if (this.status === AdapterStatus.CONNECTING) {
            reject(new Error(`WebSocket connection failed: ${error.message}`));
          } else {
            this.handleConnectionError(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.status = AdapterStatus.DISCONNECTED;
          this.metadata.health.status = HealthStatusType.UNHEALTHY;

          this.clearHeartbeat();

          if (code !== 1000) { // Not a normal closure
            this.attemptReconnection();
          }
        });

        this.ws.on('ping', () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.pong();
          }
        });

      } catch (error) {
        this.status = AdapterStatus.ERROR;
        reject(error);
      }
    });
  }

  private buildWebSocketUrl(): string {
    const connection = this.config.connection;

    if (connection.url) {
      return connection.url;
    }

    const protocol = connection.ssl?.enabled ? 'wss' : 'ws';
    const host = connection.host || 'localhost';
    const port = connection.port || (connection.ssl?.enabled ? 443 : 80);
    const path = connection.path || '/';

    return `${protocol}://${host}:${port}${path}`;
  }

  private buildConnectionOptions(): any {
    const options: any = {
      headers: { ...this.config.headers },
      handshakeTimeout: this.config.timeout || 30000
    };

    // Add authentication headers
    if (this.config.authentication) {
      const auth = this.config.authentication;

      switch (auth.type) {
        case 'bearer':
        case 'jwt':
          options.headers['Authorization'] = `Bearer ${auth.credentials.token}`;
          break;
        case 'api_key':
          options.headers['X-API-Key'] = auth.credentials.apiKey;
          break;
        case 'basic':
          const credentials = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64');
          options.headers['Authorization'] = `Basic ${credentials}`;
          break;
      }
    }

    // Add SSL options
    if (this.config.connection.ssl?.enabled) {
      options.rejectUnauthorized = this.config.connection.ssl.rejectUnauthorized !== false;
      if (this.config.connection.ssl.cert) {
        options.cert = this.config.connection.ssl.cert;
      }
      if (this.config.connection.ssl.key) {
        options.key = this.config.connection.ssl.key;
      }
      if (this.config.connection.ssl.ca) {
        options.ca = this.config.connection.ssl.ca;
      }
    }

    return options;
  }

  private setupHeartbeat(): void {
    if (this.config.parameters?.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, this.config.parameters.heartbeatInterval);
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = this.parseMessage(data);
      this.routeMessage(message);

      // Update health metrics
      this.metadata.health.throughput++;
      this.metadata.health.lastCheck = new Date().toISOString();

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.metadata.health.errorRate++;
    }
  }

  private parseMessage(data: WebSocket.Data): any {
    if (Buffer.isBuffer(data)) {
      data = data.toString();
    }

    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return { data: data };
      }
    }

    return data;
  }

  private routeMessage(message: any): void {
    // Route message to appropriate streams based on message type or channel
    const channel = message.channel || message.type || 'default';

    for (const stream of this.streams.values()) {
      if (stream.matchesMessage(message, channel)) {
        stream.emit(message);
      }
    }
  }

  private handleConnectionError(error: Error): void {
    console.error('WebSocket error:', error);

    // Notify all active streams about the error
    for (const stream of this.streams.values()) {
      stream.emitError(error);
    }

    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.status = AdapterStatus.ERROR;
      this.metadata.health.status = HealthStatusType.UNHEALTHY;
      return;
    }

    this.status = AdapterStatus.RECONNECTING;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(data);
    } else {
      this.messageQueue.push(message);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.clearHeartbeat();

    // Close all streams
    for (const stream of this.streams.values()) {
      stream.close();
    }
    this.streams.clear();

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.status = AdapterStatus.DISCONNECTED;
    this.metadata.health.status = HealthStatusType.UNKNOWN;
  }

  public isConnected(): boolean {
    return this.status === AdapterStatus.CONNECTED &&
           this.ws !== null &&
           this.ws.readyState === WebSocket.OPEN;
  }

  public async fetchData(query: DataQuery): Promise<DataResult> {
    if (!this.isConnected()) {
      throw new Error('WebSocket adapter not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      const requestMessage = {
        id: requestId,
        type: 'query',
        query: query,
        timestamp: new Date().toISOString()
      };

      // Set up one-time response handler
      const responseHandler = (message: any) => {
        if (message.id === requestId) {
          const endTime = Date.now();

          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve({
              data: message.data || [],
              metadata: {
                totalCount: message.totalCount || 0,
                executionTime: endTime - startTime,
                dataSource: this.name,
                queryId: query.id || requestId,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      };

      // Create temporary stream for this request
      const tempStream = new WebSocketStream(
        requestId,
        { channel: requestId },
        responseHandler
      );

      this.streams.set(requestId, tempStream);

      // Send the request
      this.sendMessage(requestMessage);

      // Set timeout
      setTimeout(() => {
        if (this.streams.has(requestId)) {
          this.streams.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, query.timeout || this.config.timeout || 30000);
    });
  }

  public async streamData(query: DataQuery, callback: DataCallback): Promise<DataStream> {
    if (!this.isConnected()) {
      throw new Error('WebSocket adapter not connected');
    }

    const streamId = this.generateRequestId();

    const streamConfig = {
      channel: query.target.channel || query.target.topic || 'default',
      filters: query.filters
    };

    const stream = new WebSocketStream(streamId, streamConfig, callback);
    this.streams.set(streamId, stream);

    // Send subscription message
    const subscriptionMessage = {
      id: streamId,
      type: 'subscribe',
      channel: streamConfig.channel,
      query: query,
      timestamp: new Date().toISOString()
    };

    this.sendMessage(subscriptionMessage);

    return stream;
  }

  private generateRequestId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async validateConfig(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate connection config
    if (!this.config.connection.url && !this.config.connection.host) {
      errors.push({
        field: 'connection',
        code: 'MISSING_URL',
        message: 'Either URL or host must be specified'
      });
    }

    // Validate WebSocket-specific settings
    if (this.config.timeout && this.config.timeout < 1000) {
      warnings.push({
        field: 'timeout',
        code: 'LOW_TIMEOUT',
        message: 'Timeout value is very low for WebSocket connections'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  public getSchema(): DataSchema {
    return {
      name: 'websocket_schema',
      fields: [
        {
          name: 'channel',
          dataType: DataType.STRING,
          nullable: false,
          description: 'WebSocket channel or topic'
        },
        {
          name: 'message',
          dataType: DataType.OBJECT,
          nullable: false,
          description: 'Message payload'
        },
        {
          name: 'timestamp',
          dataType: DataType.DATE,
          nullable: false,
          description: 'Message timestamp'
        }
      ]
    };
  }

  public async transformData(data: any, transformer: DataTransformer): Promise<any> {
    return await transformer.transform(data);
  }
}

class WebSocketStream implements DataStream {
  public readonly id: string;
  public status: StreamStatus = StreamStatus.ACTIVE;

  private config: any;
  private callback: DataCallback;
  private metadata: StreamMetadata;

  constructor(id: string, config: any, callback: DataCallback) {
    this.id = id;
    this.config = config;
    this.callback = callback;
    this.metadata = {
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      messageCount: 0,
      bytesReceived: 0,
      errorCount: 0,
      reconnectionCount: 0
    };
  }

  public subscribe(callback: DataCallback): void {
    this.callback = callback;
  }

  public unsubscribe(): void {
    this.status = StreamStatus.CLOSED;
  }

  public pause(): void {
    this.status = StreamStatus.PAUSED;
  }

  public resume(): void {
    if (this.status === StreamStatus.PAUSED) {
      this.status = StreamStatus.ACTIVE;
    }
  }

  public close(): void {
    this.status = StreamStatus.CLOSED;
  }

  public getMetadata(): StreamMetadata {
    return { ...this.metadata };
  }

  public matchesMessage(message: any, channel: string): boolean {
    if (this.status !== StreamStatus.ACTIVE) {
      return false;
    }

    // Check if message matches this stream's configuration
    if (this.config.channel && this.config.channel !== channel) {
      return false;
    }

    // Apply filters if configured
    if (this.config.filters) {
      return this.applyFilters(message, this.config.filters);
    }

    return true;
  }

  private applyFilters(message: any, filters: any[]): boolean {
    return filters.every(filter => {
      const value = this.getNestedValue(message, filter.field);
      return this.evaluateFilter(value, filter.operator, filter.value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue;
      case 'not_equals':
        return value !== filterValue;
      case 'greater_than':
        return value > filterValue;
      case 'less_than':
        return value < filterValue;
      case 'contains':
        return String(value).includes(String(filterValue));
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      default:
        return true;
    }
  }

  public emit(data: any): void {
    if (this.status === StreamStatus.ACTIVE && this.callback) {
      try {
        this.callback(data);
        this.metadata.messageCount++;
        this.metadata.lastUpdate = new Date().toISOString();

        if (typeof data === 'string') {
          this.metadata.bytesReceived += data.length;
        } else {
          this.metadata.bytesReceived += JSON.stringify(data).length;
        }

      } catch (error) {
        this.emitError(error as Error);
      }
    }
  }

  public emitError(error: Error): void {
    if (this.callback) {
      this.callback(null, error);
      this.metadata.errorCount++;
    }
  }
}