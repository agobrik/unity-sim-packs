import {
  InferenceConfig,
  MLModel,
  InferenceOptimization,
  QuantizationConfig,
  PruningConfig,
  PreprocessingPipeline,
  PreprocessingStep,
  PreprocessingType
} from '../types';
import { ModelManager } from './model-manager';

export interface InferenceRequest {
  modelId: string;
  input: any;
  config?: InferenceConfig;
  metadata?: Record<string, any>;
}

export interface InferenceResponse {
  output: any;
  confidence?: number;
  probabilities?: number[];
  latency: number;
  modelVersion?: string;
  metadata?: Record<string, any>;
}

export interface InferenceBatch {
  requests: InferenceRequest[];
  batchSize: number;
  priority?: InferencePriority;
}

export enum InferencePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface InferenceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  queueSize: number;
  activeWorkers: number;
}

export class InferenceEngine {
  private modelManager: ModelManager;
  private requestQueue: InferenceRequest[] = [];
  private processingQueue: InferenceRequest[] = [];
  private batchQueue: InferenceBatch[] = [];
  private workers: InferenceWorker[] = [];
  private metrics: InferenceMetrics;
  private cache: Map<string, { response: InferenceResponse; timestamp: number }> = new Map();
  private cacheConfig: CacheConfig;

  constructor(
    modelManager?: ModelManager,
    config: InferenceEngineConfig = {}
  ) {
    this.modelManager = modelManager || new ModelManager();
    this.metrics = this.initializeMetrics();
    this.cacheConfig = config.cache || { enabled: false, maxSize: 1000, ttl: 300000 };

    // Initialize workers
    const workerCount = config.workerCount || Math.max(1, Math.floor((globalThis as any).navigator?.hardwareConcurrency || 4) / 2);
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new InferenceWorker(i, this));
    }

    // Start processing loop
    this.startProcessing();
  }

  public async initialize(): Promise<void> {
    await this.modelManager.initialize();
    (globalThis as any).console?.log('InferenceEngine initialized');
  }

  private initializeMetrics(): InferenceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      queueSize: 0,
      activeWorkers: 0
    };
  }

  public async predict(modelId: string, input: any, config?: Partial<InferenceConfig>): Promise<any> {
    const request: InferenceRequest = {
      modelId,
      input,
      config: config as InferenceConfig
    };

    const response = await this.predictWithRequest(request);
    return response.output;
  }

  public async predictWithRequest(request: InferenceRequest): Promise<InferenceResponse> {
    return new Promise((resolve, reject) => {
      const enhancedRequest = {
        ...request,
        resolve,
        reject,
        timestamp: Date.now(),
        id: this.generateRequestId()
      } as EnhancedInferenceRequest;

      // Check cache first
      if (this.cacheConfig.enabled && request.config?.caching !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheConfig.ttl) {
          resolve(cached.response);
          return;
        }
      }

      this.requestQueue.push(enhancedRequest);
      this.metrics.totalRequests++;
      this.updateQueueMetrics();
    });
  }

  public async batchPredict(modelId: string, inputs: any[], config?: Partial<InferenceConfig>): Promise<any[]> {
    const promises = inputs.map(input => this.predict(modelId, input, config));
    return Promise.all(promises);
  }

  public async predictBatch(batch: InferenceBatch): Promise<InferenceResponse[]> {
    const promises = batch.requests.map(request => this.predictWithRequest(request));
    return Promise.all(promises);
  }

  public async streamPredict(
    modelId: string,
    inputStream: AsyncIterable<any>,
    config?: Partial<InferenceConfig>
  ): Promise<AsyncIterable<any>> {
    const self = this;

    return {
      async *[Symbol.asyncIterator]() {
        for await (const input of inputStream) {
          const result = await self.predict(modelId, input, config);
          yield result;
        }
      }
    };
  }

  public enqueueRequest(request: InferenceRequest): string {
    const requestId = this.generateRequestId();
    const enhancedRequest = {
      ...request,
      id: requestId,
      timestamp: Date.now()
    };

    this.requestQueue.push(enhancedRequest);
    this.metrics.totalRequests++;
    this.updateQueueMetrics();

    return requestId;
  }

  private startProcessing(): void {
    (globalThis as any).setInterval(() => {
      this.processQueue();
      this.cleanupCache();
    }, 10); // Process every 10ms
  }

  private processQueue(): void {
    // Move requests from queue to processing based on available workers
    const availableWorkers = this.workers.filter(w => !w.isBusy());
    const requestsToProcess = Math.min(availableWorkers.length, this.requestQueue.length);

    for (let i = 0; i < requestsToProcess; i++) {
      const request = this.requestQueue.shift();
      const worker = availableWorkers[i];

      if (request && worker) {
        this.processingQueue.push(request);
        worker.processRequest(request);
      }
    }

    this.updateQueueMetrics();
  }

  private async executeInference(request: EnhancedInferenceRequest): Promise<InferenceResponse> {
    const startTime = (globalThis as any).performance?.now() || Date.now();

    try {
      // Apply preprocessing if configured
      let processedInput = request.input;
      if (request.config?.preprocessing) {
        processedInput = await this.applyPreprocessing(
          processedInput,
          request.config.preprocessing
        );
      }

      // Perform inference
      const output = await this.modelManager.predict(
        request.modelId,
        processedInput,
        request.config
      );

      // Apply postprocessing if configured
      let processedOutput = output;
      if (request.config?.postprocessing) {
        processedOutput = await this.applyPostprocessing(
          output,
          request.config.postprocessing
        );
      }

      const endTime = (globalThis as any).performance?.now() || Date.now();
      const latency = endTime - startTime;

      const response: InferenceResponse = {
        output: processedOutput,
        latency,
        modelVersion: this.modelManager.getModel(request.modelId)?.version,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          processingTime: latency
        }
      };

      // Add confidence and probabilities if available
      if (this.isClassificationOutput(processedOutput)) {
        const { confidence, probabilities } = this.extractClassificationInfo(processedOutput);
        response.confidence = confidence;
        response.probabilities = probabilities;
      }

      // Cache the response
      if (this.cacheConfig.enabled && request.config?.caching !== false) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, {
          response,
          timestamp: Date.now()
        });
      }

      this.updateSuccessMetrics(latency);
      return response;

    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    }
  }

  private async applyPreprocessing(data: any, pipeline: PreprocessingPipeline): Promise<any> {
    let processedData = data;

    for (const step of pipeline.steps) {
      processedData = await this.applyPreprocessingStep(processedData, step);
    }

    return processedData;
  }

  private async applyPreprocessingStep(data: any, step: PreprocessingStep): Promise<any> {
    switch (step.type) {
      case PreprocessingType.NORMALIZE:
        return this.normalizeData(data, step.config || {});

      case PreprocessingType.STANDARDIZE:
        return this.standardizeData(data, step.config || {});

      case 'scale' as any:
        return this.scaleData(data, step.config || {});

      case 'transform' as any:
        return this.transformData(data, step.config || {});

      default:
        return data;
    }
  }

  private async applyPostprocessing(data: any, pipeline: any): Promise<any> {
    // For now, just return the data as-is
    // Could implement actual postprocessing steps here
    return data;
  }

  private normalizeData(data: any, params: Record<string, any>): any {
    if (Array.isArray(data)) {
      const min = params.min || 0;
      const max = params.max || 1;
      const dataMin = Math.min(...data);
      const dataMax = Math.max(...data);
      const range = dataMax - dataMin;

      return data.map(value => min + ((value - dataMin) / range) * (max - min));
    }
    return data;
  }

  private standardizeData(data: any, params: Record<string, any>): any {
    if (Array.isArray(data)) {
      const mean = params.mean || data.reduce((sum, val) => sum + val, 0) / data.length;
      const std = params.std || Math.sqrt(
        data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
      );

      return data.map(value => (value - mean) / std);
    }
    return data;
  }

  private scaleData(data: any, params: Record<string, any>): any {
    if (Array.isArray(data)) {
      const scale = params.scale || 1;
      return data.map(value => value * scale);
    }
    return data;
  }

  private transformData(data: any, params: Record<string, any>): any {
    // Apply custom transformations based on parameters
    const transformType = params.type;

    switch (transformType) {
      case 'log':
        return Array.isArray(data) ? data.map(val => Math.log(val + 1)) : Math.log(data + 1);

      case 'sqrt':
        return Array.isArray(data) ? data.map(val => Math.sqrt(Math.abs(val))) : Math.sqrt(Math.abs(data));

      case 'reciprocal':
        return Array.isArray(data) ? data.map(val => val !== 0 ? 1 / val : 0) : data !== 0 ? 1 / data : 0;

      default:
        return data;
    }
  }

  private isClassificationOutput(output: any): boolean {
    return Array.isArray(output) &&
           output.length > 0 &&
           typeof output[0] === 'number' &&
           output.every(val => val >= 0 && val <= 1) &&
           Math.abs(output.reduce((sum, val) => sum + val, 0) - 1) < 0.01;
  }

  private extractClassificationInfo(output: number[]): { confidence: number; probabilities: number[] } {
    const maxProb = Math.max(...output);
    const maxIndex = output.indexOf(maxProb);

    return {
      confidence: maxProb,
      probabilities: output
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(request: InferenceRequest): string {
    const inputHash = this.hashInput(request.input);
    const configHash = this.hashConfig(request.config);
    return `${request.modelId}_${inputHash}_${configHash}`;
  }

  private hashInput(input: any): string {
    return (globalThis as any).btoa ? (globalThis as any).btoa(JSON.stringify(input)).substr(0, 16) : JSON.stringify(input).substr(0, 16);
  }

  private hashConfig(config?: InferenceConfig): string {
    if (!config) return 'default';
    return (globalThis as any).btoa ? (globalThis as any).btoa(JSON.stringify(config)).substr(0, 8) : JSON.stringify(config).substr(0, 8);
  }

  private updateSuccessMetrics(latency: number): void {
    this.metrics.successfulRequests++;

    // Update average latency (simple moving average)
    const totalSuccessful = this.metrics.successfulRequests;
    this.metrics.averageLatency =
      ((this.metrics.averageLatency * (totalSuccessful - 1)) + latency) / totalSuccessful;

    // Update throughput (requests per second over last minute)
    this.metrics.throughput = this.metrics.successfulRequests / 60; // Simplified
  }

  private updateQueueMetrics(): void {
    this.metrics.queueSize = this.requestQueue.length + this.processingQueue.length;
    this.metrics.activeWorkers = this.workers.filter(w => w.isBusy()).length;
  }

  private cleanupCache(): void {
    if (!this.cacheConfig.enabled) return;

    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheConfig.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // Enforce max cache size
    if (this.cache.size > this.cacheConfig.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(0, this.cache.size - this.cacheConfig.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  public getMetrics(): InferenceMetrics {
    return { ...this.metrics };
  }

  public getQueueStatus(): {
    waiting: number;
    processing: number;
    workers: { id: number; busy: boolean }[];
  } {
    return {
      waiting: this.requestQueue.length,
      processing: this.processingQueue.length,
      workers: this.workers.map(w => ({ id: w.id, busy: w.isBusy() }))
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public async getHealthStatus(): Promise<any> {
    return {
      status: 'healthy',
      workers: this.workers.length,
      activeWorkers: this.metrics.activeWorkers,
      queueSize: this.metrics.queueSize,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  public async dispose(): Promise<void> {
    this.workers.forEach(worker => worker.dispose());
    this.workers = [];
    this.requestQueue = [];
    this.processingQueue = [];
    this.cache.clear();
  }
}

class InferenceWorker {
  public readonly id: number;
  private busy: boolean = false;
  private engine: InferenceEngine;

  constructor(id: number, engine: InferenceEngine) {
    this.id = id;
    this.engine = engine;
  }

  public isBusy(): boolean {
    return this.busy;
  }

  public async processRequest(request: EnhancedInferenceRequest): Promise<void> {
    this.busy = true;

    try {
      const response = await (this.engine as any).executeInference(request);
      if (request.resolve) {
        request.resolve(response);
      }
    } catch (error) {
      if (request.reject) {
        request.reject(error);
      }
    } finally {
      this.busy = false;

      // Remove from processing queue
      const index = (this.engine as any).processingQueue.indexOf(request);
      if (index !== -1) {
        (this.engine as any).processingQueue.splice(index, 1);
      }
    }
  }

  public dispose(): void {
    this.busy = false;
  }
}

interface EnhancedInferenceRequest extends InferenceRequest {
  id?: string;
  timestamp?: number;
  resolve?: (response: InferenceResponse) => void;
  reject?: (error: any) => void;
}

interface InferenceEngineConfig {
  workerCount?: number;
  cache?: CacheConfig;
  batchProcessing?: boolean;
  maxBatchSize?: number;
}

interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // Time to live in milliseconds
}