import {
  MLModel,
  ModelStatus,
  ModelType,
  MLFramework,
  InferenceConfig,
  ModelEvaluationResult,
  TrainingConfig,
  MLEvent,
  MLEventType,
  DeviceType
} from '../types';

export interface IModelBackend {
  loadModel(model: MLModel): Promise<void>;
  unloadModel(modelId: string): Promise<void>;
  predict(modelId: string, input: any, config?: InferenceConfig): Promise<any>;
  train?(model: MLModel, config: TrainingConfig): Promise<void>;
  evaluate?(model: MLModel, testData: any): Promise<ModelEvaluationResult>;
  isSupported(framework: MLFramework): boolean;
}

export class ModelManager {
  private models: Map<string, MLModel> = new Map();
  private backends: Map<MLFramework, IModelBackend> = new Map();
  private eventHandlers: Map<string, ((event: MLEvent) => void)[]> = new Map();
  private loadedModels: Set<string> = new Set();

  constructor() {
    this.initializeBackends();
  }

  private initializeBackends(): void {
    // Backends would be registered here
    // this.registerBackend(MLFramework.TENSORFLOW_JS, new TensorFlowJSBackend());
    // this.registerBackend(MLFramework.ONNX_JS, new ONNXJSBackend());
  }

  public registerBackend(framework: MLFramework, backend: IModelBackend): void {
    this.backends.set(framework, backend);
  }

  public registerModel(model: MLModel): void {
    this.models.set(model.id, model);
    this.emitEvent({
      id: `${Date.now()}_model_registered`,
      type: MLEventType.MODEL_LOAD,
      timestamp: new Date().toISOString(),
      modelId: model.id,
      data: { name: model.name },
      metadata: { source: 'ModelManager' }
    });
  }

  public unregisterModel(modelId: string): void {
    const model = this.models.get(modelId);
    if (model) {
      if (this.loadedModels.has(modelId)) {
        this.unloadModel(modelId);
      }
      this.models.delete(modelId);
      this.emitEvent({
        id: `${Date.now()}_model_unregistered`,
        type: MLEventType.MODEL_UNLOAD,
        timestamp: new Date().toISOString(),
        modelId,
        data: {},
        metadata: { source: 'ModelManager' }
      });
    }
  }

  public getModel(modelId: string): MLModel | undefined {
    return this.models.get(modelId);
  }

  public getAllModels(): MLModel[] {
    return Array.from(this.models.values());
  }

  public getModelsByType(type: ModelType): MLModel[] {
    return this.getAllModels().filter(model => model.type === type);
  }

  public getModelsByFramework(framework: MLFramework): MLModel[] {
    return this.getAllModels().filter(model => model.framework === framework);
  }

  public async initialize(): Promise<void> {
    // Initialize model manager
    (globalThis as any).console?.log('ModelManager initialized');
  }

  public async loadModel(modelPath: string, framework: MLFramework, modelId?: string): Promise<string> {
    const id = modelId || `model_${Date.now()}`;

    // Create a model object from the path and framework
    const model: MLModel = {
      id,
      name: `Model_${id}`,
      version: '1.0.0',
      framework,
      type: ModelType.CLASSIFICATION,
      status: ModelStatus.LOADING,
      metadata: {
        description: 'Auto-generated model',
        author: 'ML Integration System',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: [],
        inputShape: [1],
        outputShape: [1],
        parameters: 0,
        modelSize: 0,
        inferences: 0,
        averageInferenceTime: 0
      },
      config: {
        path: modelPath,
        device: DeviceType.AUTO,
        batchSize: 32,
        timeout: 30000,
        caching: true,
        monitoring: true
      },
      load: async () => { (globalThis as any).console?.log(`Loading model ${id}`); },
      unload: async () => { (globalThis as any).console?.log(`Unloading model ${id}`); },
      predict: async () => { throw new Error('Not implemented'); },
      evaluate: async () => ({
        modelId: id,
        accuracy: 0,
        loss: 0,
        metrics: {},
        predictions: [],
        groundTruth: [],
        confusionMatrix: [],
        classificationReport: {},
        roc: { fpr: [], tpr: [], auc: 0 },
        timestamp: new Date().toISOString()
      })
    };

    this.models.set(id, model);

    if (this.loadedModels.has(id)) {
      return id; // Already loaded
    }

    const backend = this.backends.get(framework);
    if (!backend) {
      // For now, just mark as ready without a backend
      model.status = ModelStatus.READY;
      this.loadedModels.add(id);
      return id;
    }

    try {
      await backend.loadModel(model);
      this.loadedModels.add(id);
      model.status = ModelStatus.READY;

      this.emitEvent({
        id: `${Date.now()}_model_loaded`,
        type: MLEventType.MODEL_LOAD,
        timestamp: new Date().toISOString(),
        modelId: id,
        data: { framework },
        metadata: { source: 'ModelManager' }
      });

      return id;
    } catch (error) {
      model.status = ModelStatus.ERROR;
      throw error;
    }
  }

  public async loadModelById(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (this.loadedModels.has(modelId)) {
      return; // Already loaded
    }

    const backend = this.backends.get(model.framework);
    if (!backend) {
      throw new Error(`No backend found for framework ${model.framework}`);
    }

    model.status = ModelStatus.LOADING;

    try {
      await backend.loadModel(model);
      this.loadedModels.add(modelId);
      model.status = ModelStatus.READY;

      this.emitEvent({
        id: `${Date.now()}_model_load_by_id`,
        type: MLEventType.MODEL_LOAD,
        timestamp: new Date().toISOString(),
        modelId,
        data: { framework: model.framework },
        metadata: { source: 'ModelManager' }
      });
    } catch (error) {
      model.status = ModelStatus.ERROR;
      throw error;
    }
  }

  public async unloadModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (!this.loadedModels.has(modelId)) {
      return; // Not loaded
    }

    const backend = this.backends.get(model.framework);
    if (backend) {
      await backend.unloadModel(modelId);
    }

    this.loadedModels.delete(modelId);
    model.status = ModelStatus.UNLOADED;

    this.emitEvent({
      id: `${Date.now()}_model_unloaded`,
      type: MLEventType.MODEL_UNLOAD,
      timestamp: new Date().toISOString(),
      modelId,
      data: {},
      metadata: { source: 'ModelManager' }
    });
  }

  public async predict(modelId: string, input: any, config?: InferenceConfig): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (!this.loadedModels.has(modelId)) {
      await this.loadModelById(modelId);
    }

    const backend = this.backends.get(model.framework);
    if (!backend) {
      throw new Error(`No backend found for framework ${model.framework}`);
    }

    model.status = ModelStatus.READY;

    try {
      const startTime = (globalThis as any).performance?.now() || Date.now();
      const result = await backend.predict(modelId, input, config);
      const endTime = (globalThis as any).performance?.now() || Date.now();

      model.status = ModelStatus.READY;

      this.emitEvent({
        id: `${Date.now()}_prediction_completed`,
        type: MLEventType.INFERENCE_COMPLETE,
        timestamp: new Date().toISOString(),
        modelId,
        data: {
          inputShape: this.getInputShape(input),
          outputShape: this.getOutputShape(result),
          inferenceTime: endTime - startTime
        },
        metadata: { source: 'ModelManager' }
      });

      return result;
    } catch (error) {
      model.status = ModelStatus.ERROR;
      throw error;
    }
  }

  public async train(modelId: string, config: TrainingConfig): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const backend = this.backends.get(model.framework);
    if (!backend || !backend.train) {
      throw new Error(`Training not supported for framework ${model.framework}`);
    }

    model.status = ModelStatus.TRAINING;

    this.emitEvent({
      id: `${Date.now()}_training_started`,
      type: MLEventType.TRAINING_START,
      timestamp: new Date().toISOString(),
      modelId,
      data: { config },
      metadata: { source: 'ModelManager' }
    });

    try {
      if (backend.train) {
        await backend.train(model, config);
      }
      model.status = ModelStatus.READY;

      this.emitEvent({
        id: `${Date.now()}_training_completed`,
        type: MLEventType.TRAINING_COMPLETE,
        timestamp: new Date().toISOString(),
        modelId,
        data: {},
        metadata: { source: 'ModelManager' }
      });
    } catch (error) {
      model.status = ModelStatus.ERROR;

      this.emitEvent({
        id: `${Date.now()}_training_failed`,
        type: MLEventType.TRAINING_ERROR,
        timestamp: new Date().toISOString(),
        modelId,
        data: { error: error instanceof Error ? error.message : String(error) },
        metadata: { source: 'ModelManager' }
      });

      throw error;
    }
  }

  public async evaluate(modelId: string, testData: any): Promise<ModelEvaluationResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const backend = this.backends.get(model.framework);
    if (!backend || !backend.evaluate) {
      throw new Error(`Evaluation not supported for framework ${model.framework}`);
    }

    const result = await backend.evaluate(model, testData);

    this.emitEvent({
      id: `${Date.now()}_evaluation_completed`,
      type: MLEventType.EVALUATION_COMPLETE,
      timestamp: new Date().toISOString(),
      modelId,
      data: { metrics: result.metrics },
      metadata: { source: 'ModelManager' }
    });

    return result;
  }

  public isModelLoaded(modelId: string): boolean {
    return this.loadedModels.has(modelId);
  }

  public getLoadedModels(): string[] {
    return Array.from(this.loadedModels);
  }

  public getModelStats(): {
    total: number;
    loaded: number;
    byType: Record<ModelType, number>;
    byFramework: Record<MLFramework, number>;
    byStatus: Record<ModelStatus, number>;
  } {
    const models = this.getAllModels();
    const stats = {
      total: models.length,
      loaded: this.loadedModels.size,
      byType: {} as Record<ModelType, number>,
      byFramework: {} as Record<MLFramework, number>,
      byStatus: {} as Record<ModelStatus, number>
    };

    models.forEach(model => {
      stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;
      stats.byFramework[model.framework] = (stats.byFramework[model.framework] || 0) + 1;
      stats.byStatus[model.status] = (stats.byStatus[model.status] || 0) + 1;
    });

    return stats;
  }

  private getInputShape(input: any): number[] {
    if (Array.isArray(input)) {
      if (input.length === 0) return [0];
      if (typeof input[0] === 'number') return [input.length];
      if (Array.isArray(input[0])) {
        return [input.length, ...this.getInputShape(input[0])];
      }
    }
    return [1];
  }

  private getOutputShape(output: any): number[] {
    return this.getInputShape(output); // Same logic for simplicity
  }

  public on(eventType: string, handler: (event: MLEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  public off(eventType: string, handler: (event: MLEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitEvent(event: MLEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          (globalThis as any).console?.error('Error in event handler:', error);
        }
      });
    }
  }

  public async warmup(modelId: string, sampleInput?: any): Promise<void> {
    if (!this.isModelLoaded(modelId)) {
      await this.loadModelById(modelId);
    }

    const model = this.getModel(modelId);
    if (!model) return;

    // Use provided sample input or create dummy input based on model input shape
    let input = sampleInput;
    if (!input) {
      input = this.createDummyInput(model.metadata.inputShape);
    }

    // Perform a few warmup predictions
    for (let i = 0; i < 3; i++) {
      await this.predict(modelId, input, undefined);
    }
  }

  private createDummyInput(shape: number[]): any {
    if (shape.length === 1) {
      return new Array(shape[0]).fill(0);
    }
    if (shape.length === 2) {
      return new Array(shape[0]).fill(null).map(() => new Array(shape[1]).fill(0));
    }
    // For higher dimensions, create nested arrays
    const createNestedArray = (dims: number[]): any => {
      if (dims.length === 1) {
        return new Array(dims[0]).fill(0);
      }
      return new Array(dims[0]).fill(null).map(() => createNestedArray(dims.slice(1)));
    };
    return createNestedArray(shape);
  }

  public async preloadModels(modelIds: string[]): Promise<void> {
    const loadPromises = modelIds.map(id => this.loadModelById(id));
    await Promise.all(loadPromises);
  }

  public async unloadAllModels(): Promise<void> {
    const unloadPromises = Array.from(this.loadedModels).map(id => this.unloadModel(id));
    await Promise.all(unloadPromises);
  }

  public async getHealthStatus(): Promise<any> {
    return {
      status: 'healthy',
      totalModels: this.models.size,
      loadedModels: this.loadedModels.size,
      backends: Array.from(this.backends.keys()),
      timestamp: new Date().toISOString()
    };
  }

  public async getMetrics(): Promise<any> {
    return {
      totalModels: this.models.size,
      loadedModels: this.loadedModels.size,
      modelStats: this.getModelStats(),
      timestamp: new Date().toISOString()
    };
  }

  public async dispose(): Promise<void> {
    await this.unloadAllModels();
    this.models.clear();
    this.backends.clear();
    this.eventHandlers.clear();
    this.loadedModels.clear();
  }
}