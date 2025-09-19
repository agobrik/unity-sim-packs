import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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
  AuthenticationType,
  ConnectionConfig,
  RetryPolicy,
  BackoffStrategy,
  AdapterCapability,
  HealthStatusType,
  DataType
} from '../types';

export class RestApiAdapter implements DataAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = AdapterType.REST_API;
  public status: AdapterStatus = AdapterStatus.DISCONNECTED;
  public config: AdapterConfig;
  public metadata: AdapterMetadata;

  private client!: AxiosInstance;
  private retryCount = 0;
  private connectionHealth = {
    lastCheck: new Date().toISOString(),
    responseTime: 0,
    errorRate: 0,
    uptime: 0
  };

  constructor(config: AdapterConfig, metadata: AdapterMetadata) {
    this.id = `rest_api_${Date.now()}`;
    this.name = metadata.description || 'REST API Adapter';
    this.config = config;
    this.metadata = {
      ...metadata,
      capabilities: [
        AdapterCapability.READ,
        AdapterCapability.WRITE,
        AdapterCapability.BATCH,
        AdapterCapability.BATCH,
        AdapterCapability.REAL_TIME,
        AdapterCapability.BATCH,
        AdapterCapability.BATCH
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

    this.initializeClient();
  }

  private initializeClient(): void {
    const baseURL = this.config.connection.url ||
                   `${this.config.connection.protocol || 'https'}://${this.config.connection.host}:${this.config.connection.port}${this.config.connection.path || ''}`;

    const axiosConfig: AxiosRequestConfig = {
      baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.config.headers
      }
    };

    // Add authentication
    if (this.config.authentication) {
      this.addAuthentication(axiosConfig);
    }

    // Add proxy configuration
    if (this.config.proxy?.enabled) {
      axiosConfig.proxy = {
        host: this.config.proxy.host,
        port: this.config.proxy.port,
        protocol: this.config.proxy.protocol,
        auth: this.config.proxy.auth
      };
    }

    this.client = axios.create(axiosConfig);

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        if (this.config.rateLimit?.enabled) {
          await this.enforceRateLimit();
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for retry logic
    this.client.interceptors.response.use(
      (response) => {
        this.retryCount = 0;
        this.updateHealthMetrics(response);
        return response;
      },
      async (error) => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }
        this.updateErrorMetrics(error);
        return Promise.reject(error);
      }
    );
  }

  private addAuthentication(config: AxiosRequestConfig): void {
    const auth = this.config.authentication!;

    switch (auth.type) {
      case AuthenticationType.BASIC:
        config.auth = {
          username: auth.credentials.username!,
          password: auth.credentials.password!
        };
        break;

      case AuthenticationType.BEARER:
      case AuthenticationType.JWT:
        config.headers!['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;

      case AuthenticationType.API_KEY:
        if (auth.credentials.apiKey) {
          config.headers!['X-API-Key'] = auth.credentials.apiKey;
        }
        break;

      case AuthenticationType.OAUTH2:
        if (auth.credentials.accessToken) {
          config.headers!['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        }
        break;

      default:
        if (auth.credentials.custom) {
          Object.assign(config.headers!, auth.credentials.custom);
        }
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const rateLimit = this.config.rateLimit!;

    // Simple implementation - in production, use a proper rate limiter
    if (rateLimit.requestsPerSecond) {
      const delay = 1000 / rateLimit.requestsPerSecond;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private shouldRetry(error: any): boolean {
    if (!this.config.retryPolicy?.enabled) return false;
    if (this.retryCount >= this.config.retryPolicy.maxAttempts) return false;

    const retryableStatus = [408, 429, 500, 502, 503, 504];
    const statusCode = error.response?.status;

    return retryableStatus.includes(statusCode) ||
           this.config.retryPolicy.retryableErrors.includes(error.code);
  }

  private async retryRequest(error: any): Promise<AxiosResponse> {
    this.retryCount++;
    const retryPolicy = this.config.retryPolicy!;

    const delay = this.calculateBackoffDelay(retryPolicy);
    await new Promise(resolve => setTimeout(resolve, delay));

    if (retryPolicy.onRetry) {
      retryPolicy.onRetry(this.retryCount, error);
    }

    return this.client.request(error.config);
  }

  private calculateBackoffDelay(retryPolicy: RetryPolicy): number {
    let delay = retryPolicy.initialDelay;

    switch (retryPolicy.backoffStrategy) {
      case BackoffStrategy.EXPONENTIAL:
        delay = retryPolicy.initialDelay * Math.pow(2, this.retryCount - 1);
        break;
      case BackoffStrategy.LINEAR:
        delay = retryPolicy.initialDelay * this.retryCount;
        break;
      case BackoffStrategy.POLYNOMIAL:
        delay = retryPolicy.initialDelay * Math.pow(this.retryCount, 2);
        break;
    }

    if (retryPolicy.jitter) {
      delay += Math.random() * delay * 0.1;
    }

    return Math.min(delay, retryPolicy.maxDelay);
  }

  private updateHealthMetrics(response: AxiosResponse): void {
    this.connectionHealth.lastCheck = new Date().toISOString();
    this.connectionHealth.responseTime = Date.now() - new Date((response.config as any).metadata?.startTime || Date.now()).getTime();

    this.metadata.health.status = HealthStatusType.HEALTHY;
    this.metadata.health.responseTime = this.connectionHealth.responseTime;
    this.metadata.health.lastCheck = this.connectionHealth.lastCheck;
  }

  private updateErrorMetrics(error: any): void {
    this.connectionHealth.errorRate++;
    this.metadata.health.status = HealthStatusType.UNHEALTHY;
    this.metadata.health.details.lastError = {
      message: error instanceof Error ? error.message : String(error),
      status: error.response?.status,
      timestamp: new Date().toISOString()
    };
  }

  public async connect(): Promise<void> {
    try {
      this.status = AdapterStatus.CONNECTING;

      // Test connection with a simple request
      const healthEndpoint = this.config.parameters?.healthEndpoint || '/health';
      await this.client.get(healthEndpoint);

      this.status = AdapterStatus.CONNECTED;
      this.metadata.health.status = HealthStatusType.HEALTHY;

    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.metadata.health.status = HealthStatusType.UNHEALTHY;
      throw new Error(`Failed to connect to REST API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.status = AdapterStatus.DISCONNECTED;
    this.metadata.health.status = HealthStatusType.UNKNOWN;
  }

  public isConnected(): boolean {
    return this.status === AdapterStatus.CONNECTED;
  }

  public async fetchData(query: DataQuery): Promise<DataResult> {
    if (!this.isConnected()) {
      throw new Error('Adapter not connected');
    }

    try {
      const startTime = Date.now();
      const requestConfig = this.buildRequestConfig(query);

      const response = await this.client.request(requestConfig);
      const endTime = Date.now();

      return {
        data: this.extractDataFromResponse(response, query),
        metadata: {
          totalCount: this.extractTotalCount(response),
          executionTime: endTime - startTime,
          dataSource: this.name,
          queryId: query.id || HealthStatusType.UNKNOWN,
          timestamp: new Date().toISOString(),
          schema: this.inferSchema(response.data)
        }
      };

    } catch (error) {
      throw new Error(`Failed to fetch data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildRequestConfig(query: DataQuery): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      method: this.mapQueryTypeToMethod(query.type),
      url: query.target.endpoint || query.target.path || '/',
      // metadata: { startTime: Date.now() } // Removed as not supported
    };

    // Add query parameters
    if (query.parameters) {
      if (config.method === 'GET') {
        config.params = query.parameters;
      } else {
        config.data = query.parameters;
      }
    }

    // Add filters as query parameters
    if (query.filters && config.method === 'GET') {
      const filterParams = this.buildFilterParams(query.filters);
      config.params = { ...config.params, ...filterParams };
    }

    // Add pagination
    if (query.pagination?.enabled) {
      const paginationParams = this.buildPaginationParams(query.pagination);
      config.params = { ...config.params, ...paginationParams };
    }

    // Add sorting
    if (query.sorting) {
      const sortParams = this.buildSortParams(query.sorting);
      config.params = { ...config.params, ...sortParams };
    }

    return config;
  }

  private mapQueryTypeToMethod(queryType: string): string {
    const methodMap: Record<string, string> = {
      'select': 'GET',
      'insert': 'POST',
      'update': 'PUT',
      'delete': 'DELETE',
      'search': 'GET',
      'custom': 'GET'
    };

    return methodMap[queryType] || 'GET';
  }

  private buildFilterParams(filters: any[]): Record<string, any> {
    const params: Record<string, any> = {};

    filters.forEach(filter => {
      const paramName = `filter_${filter.field}`;
      params[paramName] = filter.value;

      if (filter.operator !== 'equals') {
        params[`${paramName}_op`] = filter.operator;
      }
    });

    return params;
  }

  private buildPaginationParams(pagination: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (pagination.page !== undefined) {
      params.page = pagination.page;
    }
    if (pagination.pageSize !== undefined) {
      params.page_size = pagination.pageSize;
    }
    if (pagination.offset !== undefined) {
      params.offset = pagination.offset;
    }
    if (pagination.limit !== undefined) {
      params.limit = pagination.limit;
    }
    if (pagination.cursor) {
      params.cursor = pagination.cursor;
    }

    return params;
  }

  private buildSortParams(sorting: any[]): Record<string, any> {
    const params: Record<string, any> = {};

    const sortFields = sorting.map(sort =>
      sort.direction === 'desc' ? `-${sort.field}` : sort.field
    );

    params.sort = sortFields.join(',');
    return params;
  }

  private extractDataFromResponse(response: AxiosResponse, query: DataQuery): any[] {
    let data = response.data;

    // Handle different response structures
    if (data.data) {
      data = data.data;
    } else if (data.results) {
      data = data.results;
    } else if (data.items) {
      data = data.items;
    }

    // Ensure data is an array
    if (!Array.isArray(data)) {
      data = [data];
    }

    // Apply projection if specified
    if (query.projection) {
      data = this.applyProjection(data, query.projection);
    }

    return data;
  }

  private applyProjection(data: any[], projection: any): any[] {
    return data.map(item => {
      const projected: any = {};

      // Include specified fields
      if (projection.include) {
        projection.include.forEach((field: string) => {
          if (item[field] !== undefined) {
            projected[field] = item[field];
          }
        });
      } else {
        // Include all fields except excluded ones
        Object.keys(item).forEach(key => {
          if (!projection.exclude || !projection.exclude.includes(key)) {
            projected[key] = item[key];
          }
        });
      }

      // Apply field renaming
      if (projection.rename) {
        Object.entries(projection.rename).forEach(([oldName, newName]) => {
          if (projected[oldName] !== undefined) {
            projected[newName as string] = projected[oldName];
            delete projected[oldName];
          }
        });
      }

      return projected;
    });
  }

  private extractTotalCount(response: AxiosResponse): number {
    const data = response.data;

    // Try common total count field names
    return data.total ||
           data.totalCount ||
           data.total_count ||
           data.count ||
           (Array.isArray(data.data) ? data.data.length :
            Array.isArray(data) ? data.length : 1);
  }

  private inferSchema(data: any): DataSchema {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        name: HealthStatusType.UNKNOWN,
        fields: []
      };
    }

    const sample = data[0];
    const fields = Object.keys(sample).map(key => ({
      name: key,
      dataType: this.inferDataType(sample[key]) as DataType,
      nullable: true,
      description: `Field ${key}`
    }));

    return {
      name: 'rest_api_response',
      fields
    };
  }

  private inferDataType(value: any): DataType {
    if (value === null || value === undefined) return DataType.STRING;
    if (typeof value === 'boolean') return DataType.BOOLEAN;
    if (typeof value === 'number') {
      return Number.isInteger(value) ? DataType.INTEGER : DataType.FLOAT;
    }
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return DataType.DATE;
      if (value.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) return DataType.STRING;
      if (value.match(/^https?:\/\//)) return DataType.STRING;
      return DataType.STRING;
    }
    if (Array.isArray(value)) return DataType.ARRAY;
    if (typeof value === 'object') return DataType.OBJECT;

    return DataType.STRING;
  }

  public async streamData(query: DataQuery, callback: DataCallback): Promise<DataStream> {
    throw new Error('Streaming not supported for REST API adapter. Use WebSocket adapter for real-time data.');
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

    // Validate authentication
    if (this.config.authentication) {
      const auth = this.config.authentication;
      if (auth.type === AuthenticationType.BASIC && (!auth.credentials.username || !auth.credentials.password)) {
        errors.push({
          field: 'authentication',
          code: 'MISSING_CREDENTIALS',
          message: 'Username and password required for basic authentication'
        });
      }
    }

    // Validate rate limiting
    if (this.config.rateLimit?.enabled && !this.config.rateLimit.requestsPerSecond) {
      warnings.push({
        field: 'rateLimit',
        code: 'NO_RATE_LIMIT',
        message: 'Rate limiting enabled but no limit specified'
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
      name: 'rest_api_schema',
      fields: [
        {
          name: 'endpoint',
          dataType: DataType.STRING,
          nullable: false,
          description: 'API endpoint path'
        },
        {
          name: 'method',
          dataType: DataType.STRING,
          nullable: false,
          description: 'HTTP method'
        },
        {
          name: 'parameters',
          dataType: DataType.OBJECT,
          nullable: true,
          description: 'Request parameters'
        }
      ]
    };
  }

  public async transformData(data: any, transformer: DataTransformer): Promise<any> {
    return await transformer.transform(data);
  }
}