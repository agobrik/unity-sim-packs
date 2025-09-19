import { promises as fs } from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import * as xml2js from 'xml2js';
import { createReadStream, createWriteStream, FSWatcher, watch } from 'fs';
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

export class FileSystemAdapter implements DataAdapter {
  public readonly id: string;
  public readonly name: string;
  public readonly type = AdapterType.FILE_SYSTEM;
  public status: AdapterStatus = AdapterStatus.DISCONNECTED;
  public config: AdapterConfig;
  public metadata: AdapterMetadata;

  private basePath: string;
  private watchers: Map<string, FSWatcher> = new Map();

  constructor(config: AdapterConfig, metadata: AdapterMetadata) {
    this.id = `fs_${Date.now()}`;
    this.name = metadata.description || 'File System Adapter';
    this.config = config;
    this.metadata = {
      ...metadata,
      capabilities: [
        AdapterCapability.READ,
        AdapterCapability.WRITE,
        AdapterCapability.STREAM,
        AdapterCapability.BATCH,
        AdapterCapability.BATCH,
        AdapterCapability.REAL_TIME
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

    this.basePath = this.config.connection.path || process.cwd();
  }

  public async connect(): Promise<void> {
    try {
      this.status = AdapterStatus.CONNECTING;

      // Check if base path exists and is accessible
      const stats = await fs.stat(this.basePath);
      if (!stats.isDirectory()) {
        throw new Error(`Base path is not a directory: ${this.basePath}`);
      }

      // Test read permissions
      await fs.access(this.basePath, fs.constants.R_OK);

      this.status = AdapterStatus.CONNECTED;
      this.metadata.health.status = HealthStatusType.HEALTHY;

    } catch (error) {
      this.status = AdapterStatus.ERROR;
      this.metadata.health.status = HealthStatusType.UNHEALTHY;
      throw new Error(`Failed to connect to file system: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async disconnect(): Promise<void> {
    // Close all file watchers
    for (const [id, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();

    this.status = AdapterStatus.DISCONNECTED;
    this.metadata.health.status = HealthStatusType.UNKNOWN;
  }

  public isConnected(): boolean {
    return this.status === AdapterStatus.CONNECTED;
  }

  public async fetchData(query: DataQuery): Promise<DataResult> {
    if (!this.isConnected()) {
      throw new Error('File system adapter not connected');
    }

    try {
      const startTime = Date.now();
      const filePath = this.resolveFilePath(query.target.path || query.target.name);

      let data: any[];
      const fileExtension = path.extname(filePath).toLowerCase();

      switch (fileExtension) {
        case '.json':
          data = await this.readJsonFile(filePath);
          break;
        case '.csv':
          data = await this.readCsvFile(filePath);
          break;
        case '.xml':
          data = await this.readXmlFile(filePath);
          break;
        case '.txt':
          data = await this.readTextFile(filePath);
          break;
        case '.yaml':
        case '.yml':
          data = await this.readYamlFile(filePath);
          break;
        default:
          data = await this.readGenericFile(filePath);
      }

      // Apply filters
      if (query.filters && query.filters.length > 0) {
        data = this.applyFilters(data, query.filters);
      }

      // Apply sorting
      if (query.sorting && query.sorting.length > 0) {
        data = this.applySorting(data, query.sorting);
      }

      // Apply pagination
      if (query.pagination?.enabled) {
        const paginationResult = this.applyPagination(data, query.pagination);
        data = paginationResult.data;
      }

      // Apply projection
      if (query.projection) {
        data = this.applyProjection(data, query.projection);
      }

      const endTime = Date.now();

      return {
        data,
        metadata: {
          totalCount: data.length,
          executionTime: endTime - startTime,
          dataSource: this.name,
          queryId: query.id || 'unknown',
          timestamp: new Date().toISOString(),
          schema: this.inferSchema(data)
        }
      };

    } catch (error) {
      throw new Error(`Failed to fetch file data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private resolveFilePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.basePath, filePath);
  }

  private async readJsonFile(filePath: string): Promise<any[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    // Ensure we return an array
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && typeof parsed === 'object') {
      // If it's an object, check for common array properties
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      } else if (parsed.results && Array.isArray(parsed.results)) {
        return parsed.results;
      } else if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items;
      } else {
        // Return the object wrapped in an array
        return [parsed];
      }
    } else {
      return [parsed];
    }
  }

  private async readCsvFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private async readXmlFile(filePath: string): Promise<any[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true
    });

    return new Promise((resolve, reject) => {
      parser.parseString(content, (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Try to extract array data from XML structure
          const data = this.extractArrayFromXml(result);
          resolve(data);
        }
      });
    });
  }

  private extractArrayFromXml(obj: any): any[] {
    if (Array.isArray(obj)) {
      return obj;
    }

    // Look for common array-like properties
    const arrayKeys = ['item', 'items', 'record', 'records', 'row', 'rows', 'entry', 'entries'];

    for (const key of arrayKeys) {
      if (obj[key]) {
        return Array.isArray(obj[key]) ? obj[key] : [obj[key]];
      }
    }

    // If root has multiple properties, treat each as an item
    if (typeof obj === 'object' && obj !== null) {
      const values = Object.values(obj);
      if (values.every(val => typeof val === 'object')) {
        return values;
      }
    }

    return [obj];
  }

  private async readTextFile(filePath: string): Promise<any[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    return lines.map((line, index) => ({
      lineNumber: index + 1,
      content: line.trim()
    }));
  }

  private async readYamlFile(filePath: string): Promise<any[]> {
    // Note: In production, you'd want to use a proper YAML parser like 'js-yaml'
    // For now, we'll treat it as a text file
    return this.readTextFile(filePath);
  }

  private async readGenericFile(filePath: string): Promise<any[]> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);

    return [{
      fileName: path.basename(filePath),
      filePath,
      size: stats.size,
      modifiedTime: stats.mtime.toISOString(),
      content: content.toString('utf-8', 0, Math.min(1000, content.length)) // First 1000 chars
    }];
  }

  private applyFilters(data: any[], filters: any[]): any[] {
    return data.filter(item => {
      return filters.every(filter => {
        const value = this.getNestedValue(item, filter.field);
        return this.evaluateFilter(value, filter.operator, filter.value);
      });
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
      case 'greater_than_or_equal':
        return value >= filterValue;
      case 'less_than':
        return value < filterValue;
      case 'less_than_or_equal':
        return value <= filterValue;
      case 'contains':
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'not_in':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      case 'regex':
        try {
          const regex = new RegExp(filterValue);
          return regex.test(String(value));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  private applySorting(data: any[], sorting: any[]): any[] {
    return data.sort((a, b) => {
      for (const sort of sorting) {
        const aValue = this.getNestedValue(a, sort.field);
        const bValue = this.getNestedValue(b, sort.field);

        let comparison = 0;

        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private applyPagination(data: any[], pagination: any): { data: any[]; hasMore: boolean } {
    const { page, pageSize, offset, limit } = pagination;

    if (page !== undefined && pageSize !== undefined) {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return {
        data: data.slice(start, end),
        hasMore: end < data.length
      };
    }

    if (offset !== undefined || limit !== undefined) {
      const start = offset || 0;
      const end = limit ? start + limit : data.length;
      return {
        data: data.slice(start, end),
        hasMore: end < data.length
      };
    }

    return { data, hasMore: false };
  }

  private applyProjection(data: any[], projection: any): any[] {
    return data.map(item => {
      const projected: any = {};

      if (projection.include) {
        projection.include.forEach((field: string) => {
          const value = this.getNestedValue(item, field);
          if (value !== undefined) {
            this.setNestedValue(projected, field, value);
          }
        });
      } else {
        Object.assign(projected, item);

        if (projection.exclude) {
          projection.exclude.forEach((field: string) => {
            this.deleteNestedValue(projected, field);
          });
        }
      }

      if (projection.rename) {
        Object.entries(projection.rename).forEach(([oldName, newName]) => {
          const value = this.getNestedValue(projected, oldName);
          if (value !== undefined) {
            this.setNestedValue(projected, newName as string, value);
            this.deleteNestedValue(projected, oldName);
          }
        });
      }

      return projected;
    });
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (!(key in current)) return;
      current = current[key];
    }

    delete current[lastKey];
  }

  private inferSchema(data: any[]): DataSchema {
    if (!data || data.length === 0) {
      return {
        name: 'empty_file',
        fields: []
      };
    }

    const sample = data[0];
    const fields = this.extractFields(sample, '');

    return {
      name: 'file_data',
      fields
    };
  }

  private extractFields(obj: any, prefix: string): any[] {
    const fields: any[] = [];

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Nested object - recursively extract fields
          fields.push(...this.extractFields(value, fieldName));
        } else {
          fields.push({
            name: fieldName,
            dataType: this.inferDataType(value),
            nullable: true,
            description: `Field ${fieldName}`
          });
        }
      });
    } else {
      fields.push({
        name: prefix || 'value',
        dataType: this.inferDataType(obj),
        nullable: true,
        description: `Field ${prefix || 'value'}`
      });
    }

    return fields;
  }

  private inferDataType(value: any): string {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'float';
    }
    if (value instanceof Date) return 'datetime';
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return 'date';
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return 'datetime';
      if (value.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) return 'email';
      if (value.match(/^https?:\/\//)) return 'url';
      return 'string';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';

    return 'string';
  }

  public async streamData(query: DataQuery, callback: DataCallback): Promise<DataStream> {
    const streamId = `fs_stream_${Date.now()}`;
    const filePath = this.resolveFilePath(query.target.path || query.target.name);

    const stream = new FileSystemStream(streamId, filePath, callback, query);

    // Set up file watcher for real-time updates
    if (query.parameters?.watchChanges) {
      this.setupFileWatcher(streamId, filePath, stream);
    }

    return stream;
  }

  private setupFileWatcher(streamId: string, filePath: string, stream: FileSystemStream): void {
    try {
      const watcher = watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
          stream.handleFileChange();
        }
      });

      this.watchers.set(streamId, watcher);

      // Clean up watcher when stream is closed
      stream.onClose(() => {
        const watcher = this.watchers.get(streamId);
        if (watcher) {
          watcher.close();
          this.watchers.delete(streamId);
        }
      });

    } catch (error) {
      console.error('Failed to set up file watcher:', error);
    }
  }

  public async validateConfig(): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate base path
    if (!this.config.connection.path) {
      warnings.push({
        field: 'connection.path',
        code: 'NO_BASE_PATH',
        message: 'No base path specified, using current working directory'
      });
    }

    try {
      await fs.access(this.basePath, fs.constants.R_OK);
    } catch {
      errors.push({
        field: 'connection.path',
        code: 'PATH_NOT_ACCESSIBLE',
        message: `Base path is not accessible: ${this.basePath}`
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
      name: 'file_system_schema',
      fields: [
        {
          name: 'filePath',
          dataType: DataType.STRING,
          nullable: false,
          description: 'Path to the file'
        },
        {
          name: 'fileType',
          dataType: DataType.STRING,
          nullable: false,
          description: 'Type of file (json, csv, xml, etc.)'
        }
      ]
    };
  }

  public async transformData(data: any, transformer: DataTransformer): Promise<any> {
    return await transformer.transform(data);
  }
}

class FileSystemStream implements DataStream {
  public readonly id: string;
  public status: StreamStatus = StreamStatus.ACTIVE;

  private filePath: string;
  private callback: DataCallback;
  private query: DataQuery;
  private metadata: StreamMetadata;
  private closeCallback: (() => void) | null = null;

  constructor(id: string, filePath: string, callback: DataCallback, query: DataQuery) {
    this.id = id;
    this.filePath = filePath;
    this.callback = callback;
    this.query = query;
    this.metadata = {
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      messageCount: 0,
      bytesReceived: 0,
      errorCount: 0,
      reconnectionCount: 0
    };

    // Start streaming the file
    this.startStreaming();
  }

  private async startStreaming(): Promise<void> {
    try {
      const fileExtension = path.extname(this.filePath).toLowerCase();

      if (fileExtension === '.csv') {
        await this.streamCsvFile();
      } else if (fileExtension === '.json') {
        await this.streamJsonFile();
      } else {
        await this.streamTextFile();
      }

    } catch (error) {
      this.emitError(error as Error);
    }
  }

  private async streamCsvFile(): Promise<void> {
    createReadStream(this.filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        if (this.status === StreamStatus.ACTIVE) {
          this.emit(row);
        }
      })
      .on('error', (error) => {
        this.emitError(error);
      })
      .on('end', () => {
        this.status = StreamStatus.CLOSED;
      });
  }

  private async streamJsonFile(): Promise<void> {
    // For JSON files, we'll read the entire file and emit each item
    // In a real implementation, you might want to use a streaming JSON parser
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        for (const item of data) {
          if (this.status === StreamStatus.ACTIVE) {
            this.emit(item);
            // Add small delay to avoid overwhelming the callback
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      } else {
        this.emit(data);
      }

      this.status = StreamStatus.CLOSED;

    } catch (error) {
      this.emitError(error as Error);
    }
  }

  private async streamTextFile(): Promise<void> {
    const stream = createReadStream(this.filePath, { encoding: 'utf-8' });
    let buffer = '';

    stream.on('data', (chunk) => {
      if (this.status !== StreamStatus.ACTIVE) return;

      buffer += chunk;
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      // Emit each complete line
      for (const line of lines) {
        if (line.trim()) {
          this.emit({
            lineNumber: this.metadata.messageCount + 1,
            content: line.trim()
          });
        }
      }
    });

    stream.on('end', () => {
      // Emit the last line if there's content in the buffer
      if (buffer.trim() && this.status === StreamStatus.ACTIVE) {
        this.emit({
          lineNumber: this.metadata.messageCount + 1,
          content: buffer.trim()
        });
      }

      this.status = StreamStatus.CLOSED;
    });

    stream.on('error', (error) => {
      this.emitError(error);
    });
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
    if (this.closeCallback) {
      this.closeCallback();
    }
  }

  public getMetadata(): StreamMetadata {
    return { ...this.metadata };
  }

  public onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  public handleFileChange(): void {
    if (this.status === StreamStatus.ACTIVE) {
      // Re-read and stream the updated file
      this.startStreaming();
    }
  }

  private emit(data: any): void {
    if (this.callback) {
      try {
        this.callback(data);
        this.metadata.messageCount++;
        this.metadata.lastUpdate = new Date().toISOString();
        this.metadata.bytesReceived += JSON.stringify(data).length;

      } catch (error) {
        this.emitError(error as Error);
      }
    }
  }

  private emitError(error: Error): void {
    this.status = StreamStatus.ERROR;
    this.metadata.errorCount++;

    if (this.callback) {
      this.callback(null, error);
    }
  }
}