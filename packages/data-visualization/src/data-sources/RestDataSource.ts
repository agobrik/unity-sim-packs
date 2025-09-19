/**
 * REST API Data Source for Steam Simulation Toolkit
 * Provides data from REST API endpoints
 */

import { EventEmitter, timer } from '../utils/EventEmitter';
import { DataSource } from './DataSourceManager';
import { DataSet, DataSourceConfig, DataSeries, DataPoint } from '../core/types';

export class RestDataSource extends EventEmitter implements DataSource {
  public readonly id: string;
  public readonly config: DataSourceConfig;
  public get isConnected(): boolean {
    return this._isConnected;
  }
  public get lastUpdate(): Date | null {
    return this._lastUpdate;
  }

  private _isConnected = false;
  private _lastUpdate: Date | null = null;
  private dataset: DataSet;
  private abortController: any = null;

  constructor(id: string, config: DataSourceConfig) {
    super();
    this.id = id;
    this.config = { ...config };

    if (!this.config.url) {
      throw new Error('REST API URL is required in config');
    }

    // Initialize empty dataset
    this.dataset = {
      id: this.id,
      name: `REST Data: ${this.id}`,
      series: [],
      metadata: {
        source: 'rest',
        url: this.config.url
      }
    };
  }

  public async connect(): Promise<void> {
    try {
      // Test connection with a HEAD or GET request
      await this.makeRequest('HEAD', this.config.url!);
      this._isConnected = true;
      this.emit('connection-changed', this, true);
    } catch (error) {
      this._isConnected = false;
      this.emit('connection-changed', this, false);
      throw new Error(`Failed to connect to ${this.config.url}: ${error}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._isConnected = false;
    this.emit('connection-changed', this, false);
  }

  public async getData(): Promise<DataSet> {
    if (!this._isConnected) {
      throw new Error('Data source is not connected');
    }

    try {
      const response = await this.makeRequest('GET', this.config.url!);
      const data = await this.parseResponse(response);

      this.dataset = this.processData(data);
      this._lastUpdate = new Date();
      this.emit('data-updated', this, this.dataset);

      return this.dataset;
    } catch (error) {
      this.emit('error', this, new Error(`Failed to fetch data: ${error}`));
      throw error;
    }
  }

  public updateConfig(config: Partial<DataSourceConfig>): void {
    Object.assign(this.config, config);
  }

  public async fetchEndpoint(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = this.resolveUrl(endpoint);
    const response = await this.makeRequest(method, url, body);
    return this.parseResponse(response);
  }

  public async postData(endpoint: string, data: any): Promise<any> {
    return this.fetchEndpoint(endpoint, 'POST', data);
  }

  public async putData(endpoint: string, data: any): Promise<any> {
    return this.fetchEndpoint(endpoint, 'PUT', data);
  }

  public async deleteData(endpoint: string): Promise<any> {
    return this.fetchEndpoint(endpoint, 'DELETE');
  }

  private async makeRequest(method: string, url: string, body?: any): Promise<any> {
    this.abortController = (globalThis as any).AbortController ? new (globalThis as any).AbortController() : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add authentication headers if configured
    if (this.config.authentication) {
      switch (this.config.authentication.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.config.authentication.credentials.token}`;
          break;
        case 'basic':
          const basicAuth = (globalThis as any).btoa ? (globalThis as any).btoa(
            `${this.config.authentication.credentials.username}:${this.config.authentication.credentials.password}`
          ) : '';
          headers['Authorization'] = `Basic ${basicAuth}`;
          break;
        case 'apikey':
          const keyHeader = this.config.authentication.credentials.header || 'X-API-Key';
          headers[keyHeader] = this.config.authentication.credentials.key;
          break;
      }
    }

    const fetchOptions: any = {
      method,
      headers,
      signal: this.abortController?.signal
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      // Use globalThis to access fetch in browser or Node.js
      const fetchFn = (globalThis as any).fetch;
      if (!fetchFn) {
        throw new Error('Fetch API not available in this environment');
      }

      const response = await fetchFn(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request was aborted');
      }
      throw error;
    }
  }

  private async parseResponse(response: any): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/csv')) {
      const csvText = await response.text();
      return this.parseCsv(csvText);
    } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
      const xmlText = await response.text();
      return this.parseXml(xmlText);
    } else {
      // Default to JSON parsing
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
    }
  }

  private parseCsv(csvText: string): any {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { series: [] };

    const headers = lines[0].split(',').map(h => h.trim());
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Try to parse as number, otherwise keep as string
        row[header] = isNaN(Number(value)) ? value : Number(value);
      });

      data.push(row);
    }

    // Convert to series format
    const series: DataSeries[] = [];

    // Assume first column is X values, rest are series
    if (headers.length > 1) {
      for (let i = 1; i < headers.length; i++) {
        const seriesData: DataPoint[] = data.map((row, index) => ({
          id: `${index}`,
          value: row[headers[i]] || 0,
          metadata: {
            x: row[headers[0]],
            originalRow: row
          }
        }));

        series.push({
          id: headers[i],
          name: headers[i],
          data: seriesData
        });
      }
    }

    return { series };
  }

  private parseXml(xmlText: string): any {
    // Basic XML parsing - in a real implementation you'd use a proper XML parser
    // This is a simplified version for demonstration
    try {
      // Use globalThis to access DOMParser in browser
      const DOMParser = (globalThis as any).DOMParser;
      if (DOMParser) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        return this.xmlToJson(doc.documentElement);
      }

      // Fallback: very basic XML-to-JSON conversion
      const jsonStr = xmlText
        .replace(/<([^>]+)>/g, '"$1":')
        .replace(/\/>/g, 'null,')
        .replace(/<\/[^>]+>/g, ',');

      return JSON.parse(`{${jsonStr}}`);
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error}`);
    }
  }

  private xmlToJson(xml: any): any {
    const result: any = {};

    if (xml.nodeType === 1) { // Element node
      if (xml.attributes.length > 0) {
        result['@attributes'] = {};
        for (let i = 0; i < xml.attributes.length; i++) {
          const attr = xml.attributes[i];
          result['@attributes'][attr.nodeName] = attr.nodeValue;
        }
      }
    } else if (xml.nodeType === 3) { // Text node
      return xml.nodeValue;
    }

    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const child = xml.childNodes[i];
        const nodeName = child.nodeName;

        if (typeof result[nodeName] === 'undefined') {
          result[nodeName] = this.xmlToJson(child);
        } else {
          if (typeof result[nodeName].push === 'undefined') {
            const old = result[nodeName];
            result[nodeName] = [];
            result[nodeName].push(old);
          }
          result[nodeName].push(this.xmlToJson(child));
        }
      }
    }

    return result;
  }

  private processData(data: any): DataSet {
    let processedData: DataSet;

    if (this.isDataSetFormat(data)) {
      processedData = data;
    } else if (this.isSeriesArrayFormat(data)) {
      processedData = {
        id: this.id,
        name: this.dataset.name,
        series: data,
        metadata: this.dataset.metadata
      };
    } else if (data.series) {
      processedData = {
        id: this.id,
        name: data.name || this.dataset.name,
        series: data.series,
        metadata: { ...this.dataset.metadata, ...data.metadata }
      };
    } else {
      // Try to auto-detect format
      processedData = this.autoDetectFormat(data);
    }

    // Apply transformations if specified
    if (this.config.transform?.operations) {
      processedData = this.applyTransformations(processedData);
    }

    return processedData;
  }

  private isDataSetFormat(data: any): boolean {
    return data && typeof data === 'object' && data.id && data.series && Array.isArray(data.series);
  }

  private isSeriesArrayFormat(data: any): boolean {
    return Array.isArray(data) && data.length > 0 && data[0].id && data[0].data;
  }

  private autoDetectFormat(data: any): DataSet {
    if (Array.isArray(data)) {
      // Assume array of data points
      const series: DataSeries = {
        id: 'default',
        name: 'Data',
        data: data.map((item, index) => ({
          id: String(index),
          value: typeof item === 'number' ? item : item.value || 0,
          label: item.label,
          timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
          metadata: item
        }))
      };

      return {
        id: this.id,
        name: this.dataset.name,
        series: [series],
        metadata: this.dataset.metadata
      };
    } else if (typeof data === 'object') {
      // Try to extract series from object properties
      const series: DataSeries[] = [];

      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          series.push({
            id: key,
            name: key,
            data: data[key].map((item: any, index: number) => ({
              id: String(index),
              value: typeof item === 'number' ? item : item.value || 0,
              label: item.label,
              timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
              metadata: item
            }))
          });
        }
      });

      return {
        id: this.id,
        name: this.dataset.name,
        series,
        metadata: this.dataset.metadata
      };
    }

    throw new Error('Unable to parse data format');
  }

  private applyTransformations(dataset: DataSet): DataSet {
    // Apply the same transformations as StaticDataSource
    // This could be extracted to a common utility
    return dataset;
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    const baseUrl = this.config.url!.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${baseUrl}${path}`;
  }

  public getRequestStats(): {
    connected: boolean;
    lastUpdate: Date | null;
    hasActiveRequest: boolean;
  } {
    return {
      connected: this.isConnected,
      lastUpdate: this.lastUpdate,
      hasActiveRequest: this.abortController !== null
    };
  }

  public abortCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}