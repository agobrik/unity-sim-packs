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
  ConnectionPool,
  PoolConfig,
  PoolStatus,
  PooledConnection,
  PoolStats,
  AdapterCapability,
  HealthStatusType,
  DataType
} from '../types';

export abstract class DatabaseAdapter implements DataAdapter {
  public readonly id: string;
  public readonly name: string;
  public abstract readonly type: AdapterType;
  public status: AdapterStatus = AdapterStatus.DISCONNECTED;
  public config: AdapterConfig;
  public metadata: AdapterMetadata;

  protected connectionPool: DatabaseConnectionPool;
  protected queryBuilder: QueryBuilder;

  constructor(config: AdapterConfig, metadata: AdapterMetadata) {
    this.id = `db_${Date.now()}`;
    this.name = metadata.description || 'Database Adapter';
    this.config = config;
    this.metadata = {
      ...metadata,
      capabilities: [
        AdapterCapability.READ,
        AdapterCapability.WRITE,
        AdapterCapability.BATCH,
        AdapterCapability.STREAM
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

    this.connectionPool = new DatabaseConnectionPool(this.id, this.config);
    this.queryBuilder = new QueryBuilder(this.getDialect());
  }

  protected abstract getDialect(): DatabaseDialect;
  public abstract createConnection(): Promise<any>;
  protected abstract executeQuery(connection: any, sql: string, params?: any[]): Promise<any>;
  public abstract closeConnection(connection: any): Promise<void>;

  public async connect(): Promise<void> {
    try {
      this.status = AdapterStatus.CONNECTING;
      await this.connectionPool.initialize();
      this.status = AdapterStatus.CONNECTED;
      this.metadata.health.status = HealthStatusType.HEALTHY;
    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.metadata.health.status = HealthStatusType.UNHEALTHY;
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async disconnect(): Promise<void> {
    await this.connectionPool.closeAll();
    this.status = AdapterStatus.DISCONNECTED;
    this.metadata.health.status = HealthStatusType.UNKNOWN;
  }

  public isConnected(): boolean {
    return this.status === AdapterStatus.CONNECTED &&
           this.connectionPool.status === PoolStatus.HEALTHY;
  }

  public async fetchData(query: DataQuery): Promise<DataResult> {
    if (!this.isConnected()) {
      throw new Error('Database adapter not connected');
    }

    const connection = await this.connectionPool.getConnection();

    try {
      const startTime = Date.now();
      const { sql, params } = this.queryBuilder.buildQuery(query);

      const result = await this.executeQuery((connection as unknown as PooledDatabaseConnection).connection, sql, params);
      const endTime = Date.now();

      const processedResult = this.processQueryResult(result, query);

      return {
        data: processedResult.data,
        metadata: {
          totalCount: processedResult.totalCount,
          executionTime: endTime - startTime,
          dataSource: this.name,
          queryId: query.id || 'unknown',
          timestamp: new Date().toISOString(),
          schema: await this.inferSchemaFromResult(processedResult.data),
          statistics: {
            rowsRead: processedResult.data.length,
            rowsReturned: processedResult.data.length,
            bytesRead: this.estimateDataSize(result),
            bytesReturned: this.estimateDataSize(processedResult.data),
            indexesUsed: [],
            partitionsScanned: 0,
            cacheMisses: 0,
            cacheHits: 0
          }
        }
      };

    } finally {
      this.connectionPool.releaseConnection(connection);
    }
  }

  private processQueryResult(result: any, query: DataQuery): { data: any[]; totalCount: number } {
    let data = Array.isArray(result) ? result :
               (result.rows ? result.rows :
                result.recordset ? result.recordset : [result]);

    const totalCount = data.length;

    // Apply post-processing transformations
    if (query.projection) {
      data = this.applyProjection(data, query.projection);
    }

    return { data, totalCount };
  }

  private applyProjection(data: any[], projection: any): any[] {
    return data.map(row => {
      const projected: any = {};

      if (projection.include) {
        projection.include.forEach((field: string) => {
          if (row[field] !== undefined) {
            projected[field] = row[field];
          }
        });
      } else {
        Object.keys(row).forEach(key => {
          if (!projection.exclude || !projection.exclude.includes(key)) {
            projected[key] = row[key];
          }
        });
      }

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

  private async inferSchemaFromResult(data: any[]): Promise<DataSchema> {
    if (!data || data.length === 0) {
      return {
        name: 'empty_result',
        fields: []
      };
    }

    const sample = data[0];
    const fields = Object.keys(sample).map(key => ({
      name: key,
      dataType: this.inferDataType(sample[key]),
      nullable: true,
      description: `Column ${key}`
    }));

    return {
      name: 'query_result',
      fields
    };
  }

  private inferDataType(value: any): DataType {
    if (value === null || value === undefined) return DataType.STRING;
    if (typeof value === 'boolean') return DataType.BOOLEAN;
    if (typeof value === 'number') {
      return Number.isInteger(value) ? DataType.INTEGER : DataType.FLOAT;
    }
    if (value instanceof Date) return DataType.DATETIME;
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return DataType.DATE;
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return DataType.DATETIME;
      return DataType.STRING;
    }
    if (Array.isArray(value)) return DataType.ARRAY;
    if (typeof value === 'object') return DataType.OBJECT;

    return DataType.STRING;
  }

  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  public async streamData(query: DataQuery, callback: DataCallback): Promise<DataStream> {
    throw new Error('Streaming not implemented for base database adapter');
  }

  public async validateConfig(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate connection configuration
    const connection = this.config.connection;

    if (!connection.connectionString && !connection.host) {
      errors.push({
        field: 'connection',
        code: 'MISSING_CONNECTION_INFO',
        message: 'Either connectionString or host must be specified'
      });
    }

    if (!connection.database) {
      errors.push({
        field: 'connection.database',
        code: 'MISSING_DATABASE',
        message: 'Database name is required'
      });
    }

    // Validate authentication
    if (this.config.authentication?.type === 'basic') {
      if (!this.config.authentication.credentials.username) {
        errors.push({
          field: 'authentication.username',
          code: 'MISSING_USERNAME',
          message: 'Username is required for database authentication'
        });
      }
    }

    // Validate pool configuration
    if (connection.poolSize && connection.poolSize < 1) {
      warnings.push({
        field: 'connection.poolSize',
        code: 'INVALID_POOL_SIZE',
        message: 'Pool size should be at least 1'
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
      name: 'database_schema',
      fields: [
        {
          name: 'table',
          dataType: DataType.STRING,
          nullable: false,
          description: 'Table or collection name'
        },
        {
          name: 'query',
          dataType: DataType.STRING,
          nullable: false,
          description: 'SQL query or equivalent'
        },
        {
          name: 'parameters',
          dataType: DataType.ARRAY,
          nullable: true,
          description: 'Query parameters'
        }
      ]
    };
  }

  public async transformData(data: any, transformer: DataTransformer): Promise<any> {
    return await transformer.transform(data);
  }
}

class DatabaseConnectionPool implements ConnectionPool {
  public readonly id: string;
  public readonly adapterId: string;
  public config: PoolConfig;
  public status: PoolStatus = PoolStatus.INITIALIZING;

  private connections: PooledDatabaseConnection[] = [];
  private availableConnections: PooledDatabaseConnection[] = [];
  private stats: PoolStats;
  private adapter: DatabaseAdapter;

  constructor(adapterId: string, config: AdapterConfig) {
    this.id = `pool_${adapterId}`;
    this.adapterId = adapterId;
    this.adapter = null as any;
    this.config = {
      minConnections: config.connection.poolSize || 5,
      maxConnections: (config.connection.poolSize || 5) * 2,
      acquireTimeout: config.timeout || 30000,
      idleTimeout: 300000, // 5 minutes
      maxLifetime: 3600000, // 1 hour
      validationInterval: 60000, // 1 minute
      retryOnFailure: true
    };

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingRequests: 0,
      failedConnections: 0,
      averageWaitTime: 0,
      peakConnections: 0
    };
  }

  public async initialize(): Promise<void> {
    try {
      // Create minimum number of connections
      for (let i = 0; i < this.config.minConnections; i++) {
        const connection = await this.createPooledConnection();
        this.connections.push(connection);
        this.availableConnections.push(connection as unknown as PooledDatabaseConnection);
      }

      this.status = PoolStatus.HEALTHY;
      this.stats.totalConnections = this.connections.length;
      this.stats.idleConnections = this.availableConnections.length;

    } catch (error) {
      this.status = PoolStatus.FAILED;
      throw error;
    }
  }

  private async createPooledConnection(): Promise<PooledDatabaseConnection> {
    const rawConnection = await this.adapter.createConnection();
    return new PooledDatabaseConnection(
      `conn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      rawConnection,
      this.adapter
    );
  }

  public async getConnection(): Promise<PooledConnection> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = (globalThis as any).setTimeout(() => {
        reject(new Error('Connection acquisition timeout'));
      }, this.config.acquireTimeout);

      this.tryGetConnection()
        .then(connection => {
          (globalThis as any).clearTimeout(timeout);

          const waitTime = Date.now() - startTime;
          this.updateWaitTimeStats(waitTime);

          resolve(connection as unknown as PooledConnection);
        })
        .catch(error => {
          (globalThis as any).clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private async tryGetConnection(): Promise<PooledDatabaseConnection> {
    // Try to get available connection
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;

      if (await connection.isValid()) {
        this.stats.activeConnections++;
        this.stats.idleConnections--;
        return connection;
      } else {
        // Connection is invalid, remove it and try again
        await this.removeConnection(connection);
        return this.tryGetConnection();
      }
    }

    // Create new connection if under max limit
    if (this.connections.length < this.config.maxConnections) {
      try {
        const newConnection = await this.createPooledConnection();
        this.connections.push(newConnection);
        this.stats.totalConnections++;
        this.stats.activeConnections++;
        this.stats.peakConnections = Math.max(this.stats.peakConnections, this.stats.totalConnections);

        return newConnection;
      } catch (error) {
        this.stats.failedConnections++;
        throw error;
      }
    }

    // Wait for a connection to become available
    throw new Error('No connections available and max pool size reached');
  }

  public releaseConnection(connection: PooledConnection): void {
    if (!connection.isValid()) {
      this.removeConnection(connection as unknown as PooledDatabaseConnection);
      return;
    }

    (connection as unknown as PooledDatabaseConnection).updateLastUsed();
    this.availableConnections.push(connection as unknown as PooledDatabaseConnection);
    this.stats.activeConnections--;
    this.stats.idleConnections++;
  }

  private async removeConnection(connection: PooledDatabaseConnection): Promise<void> {
    // Remove from all arrays
    const totalIndex = this.connections.indexOf(connection);
    if (totalIndex !== -1) {
      this.connections.splice(totalIndex, 1);
    }

    const availableIndex = this.availableConnections.indexOf(connection);
    if (availableIndex !== -1) {
      this.availableConnections.splice(availableIndex, 1);
    }

    // Close the connection
    await connection.close();

    // Update stats
    this.stats.totalConnections--;
    if (availableIndex !== -1) {
      this.stats.idleConnections--;
    } else {
      this.stats.activeConnections--;
    }
  }

  private updateWaitTimeStats(waitTime: number): void {
    // Simple exponential moving average
    const alpha = 0.1;
    this.stats.averageWaitTime = alpha * waitTime + (1 - alpha) * this.stats.averageWaitTime;
  }

  public async closeAll(): Promise<void> {
    const closePromises = this.connections.map(conn => conn.close());
    await Promise.all(closePromises);

    this.connections = [];
    this.availableConnections = [];
    this.status = PoolStatus.CLOSED;

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingRequests: 0,
      failedConnections: 0,
      averageWaitTime: 0,
      peakConnections: 0
    };
  }

  public getStats(): PoolStats {
    return { ...this.stats };
  }
}

class PooledDatabaseConnection implements PooledConnection {
  public readonly id: string;
  public readonly created: string;
  public lastUsed: string;
  public connection: any;

  private adapter: DatabaseAdapter;
  private closed = false;

  constructor(id: string, connection: any, adapter: DatabaseAdapter) {
    this.id = id;
    this.connection = connection;
    this.adapter = adapter;
    this.created = new Date().toISOString();
    this.lastUsed = new Date().toISOString();
  }

  public isValid(): boolean {
    if (this.closed) return false;

    try {
      // Simple validation - check if connection exists and is not explicitly closed
      return this.connection !== null && !this.closed;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    if (!this.closed) {
      await this.adapter.closeConnection(this.connection);
      this.closed = true;
    }
  }

  public async execute(query: DataQuery): Promise<DataResult> {
    if (this.closed) {
      throw new Error('Connection is closed');
    }

    this.updateLastUsed();
    return this.adapter.fetchData(query);
  }

  public updateLastUsed(): void {
    this.lastUsed = new Date().toISOString();
  }
}

class QueryBuilder {
  private dialect: DatabaseDialect;

  constructor(dialect: DatabaseDialect) {
    this.dialect = dialect;
  }

  public buildQuery(query: DataQuery): { sql: string; params: any[] } {
    switch (query.type) {
      case 'select':
        return this.buildSelectQuery(query);
      case 'insert':
        return this.buildInsertQuery(query);
      case 'update':
        return this.buildUpdateQuery(query);
      case 'delete':
        return this.buildDeleteQuery(query);
      default:
        throw new Error(`Unsupported query type: ${query.type}`);
    }
  }

  private buildSelectQuery(query: DataQuery): { sql: string; params: any[] } {
    let sql = 'SELECT ';
    const params: any[] = [];

    // Build SELECT clause
    if (query.projection?.include) {
      sql += query.projection.include.join(', ');
    } else {
      sql += '*';
    }

    // Build FROM clause
    sql += ` FROM ${this.escapeIdentifier(query.target.name)}`;

    // Build WHERE clause
    if (query.filters && query.filters.length > 0) {
      const whereClause = this.buildWhereClause(query.filters, params);
      sql += ` WHERE ${whereClause}`;
    }

    // Build ORDER BY clause
    if (query.sorting && query.sorting.length > 0) {
      const orderByClause = query.sorting
        .map(sort => `${this.escapeIdentifier(sort.field)} ${sort.direction.toUpperCase()}`)
        .join(', ');
      sql += ` ORDER BY ${orderByClause}`;
    }

    // Build LIMIT/OFFSET clause
    if (query.pagination?.enabled) {
      sql += this.buildPaginationClause(query.pagination, params);
    }

    return { sql, params };
  }

  private buildInsertQuery(query: DataQuery): { sql: string; params: any[] } {
    const data = query.parameters;
    const fields = Object.keys(data);
    const values = Object.values(data);

    let sql = `INSERT INTO ${this.escapeIdentifier(query.target.name)} `;
    sql += `(${fields.map(f => this.escapeIdentifier(f)).join(', ')}) `;
    sql += `VALUES (${fields.map(() => '?').join(', ')})`;

    return { sql, params: values };
  }

  private buildUpdateQuery(query: DataQuery): { sql: string; params: any[] } {
    const data = query.parameters;
    const params: any[] = [];

    let sql = `UPDATE ${this.escapeIdentifier(query.target.name)} SET `;

    const setClause = Object.entries(data)
      .map(([key, value]) => {
        params.push(value);
        return `${this.escapeIdentifier(key)} = ?`;
      })
      .join(', ');

    sql += setClause;

    // Build WHERE clause
    if (query.filters && query.filters.length > 0) {
      const whereClause = this.buildWhereClause(query.filters, params);
      sql += ` WHERE ${whereClause}`;
    }

    return { sql, params };
  }

  private buildDeleteQuery(query: DataQuery): { sql: string; params: any[] } {
    let sql = `DELETE FROM ${this.escapeIdentifier(query.target.name)}`;
    const params: any[] = [];

    // Build WHERE clause
    if (query.filters && query.filters.length > 0) {
      const whereClause = this.buildWhereClause(query.filters, params);
      sql += ` WHERE ${whereClause}`;
    }

    return { sql, params };
  }

  private buildWhereClause(filters: any[], params: any[]): string {
    return filters.map(filter => {
      const column = this.escapeIdentifier(filter.field);
      const operator = this.mapOperator(filter.operator);

      if (filter.operator === 'in') {
        const placeholders = Array.isArray(filter.value)
          ? filter.value.map(() => '?').join(', ')
          : '?';
        params.push(...(Array.isArray(filter.value) ? filter.value : [filter.value]));
        return `${column} ${operator} (${placeholders})`;
      } else {
        params.push(filter.value);
        return `${column} ${operator} ?`;
      }
    }).join(' AND ');
  }

  private buildPaginationClause(pagination: any, params: any[]): string {
    let clause = '';

    if (pagination.limit) {
      clause += ` LIMIT ?`;
      params.push(pagination.limit);
    }

    if (pagination.offset) {
      clause += ` OFFSET ?`;
      params.push(pagination.offset);
    }

    return clause;
  }

  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'greater_than_or_equal': '>=',
      'less_than': '<',
      'less_than_or_equal': '<=',
      'contains': 'LIKE',
      'starts_with': 'LIKE',
      'ends_with': 'LIKE',
      'in': 'IN',
      'not_in': 'NOT IN',
      'is_null': 'IS NULL',
      'is_not_null': 'IS NOT NULL'
    };

    return operatorMap[operator] || '=';
  }

  private escapeIdentifier(identifier: string): string {
    // Basic identifier escaping - should be enhanced per database dialect
    switch (this.dialect) {
      case DatabaseDialect.MYSQL:
        return `\`${identifier}\``;
      case DatabaseDialect.POSTGRESQL:
        return `"${identifier}"`;
      case DatabaseDialect.SQL_SERVER:
        return `[${identifier}]`;
      case DatabaseDialect.SQLITE:
        return `"${identifier}"`;
      default:
        return identifier;
    }
  }
}

export enum DatabaseDialect {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  SQL_SERVER = 'sql_server',
  SQLITE = 'sqlite',
  ORACLE = 'oracle',
  MONGODB = 'mongodb'
}