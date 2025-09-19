export * from './types';
export * from './models/model-manager';
export * from './models/inference-engine';
// export * from './models/tensorflow'; // Temporarily disabled due to type errors
export * from './models/pytorch';
export * from './models/onnx';

// Import types and classes
import {
  MLFramework,
  MLEventType,
  MLModel,
  InferenceConfig,
  ModelEvaluationResult,
  MLEventHandler,
  MLEvent
} from './types';
import { ModelManager } from './models/model-manager';
import { InferenceEngine } from './models/inference-engine';

// Import commented out for build compatibility
// Import commented out for build compatibility
// Import commented out for build compatibility

export class MLIntegrationSystem {
  private modelManager: ModelManager;
  private inferenceEngine: InferenceEngine;
  private isInitialized: boolean = false;
  private eventHandler?: MLEventHandler;

  constructor() {
    this.modelManager = new ModelManager();
    this.inferenceEngine = new InferenceEngine();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize ML system components
      await this.modelManager.initialize();
      await this.inferenceEngine.initialize();

      this.isInitialized = true;
      (globalThis as any).console?.log('ML Integration System initialized successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize ML Integration System: ${errorMessage}`);
    }
  }

  // Model Management
  public async loadModel(modelPath: string, framework: MLFramework, modelId?: string): Promise<string> {
    try {
      const id = await this.modelManager.loadModel(modelPath, framework, modelId);

      if (this.eventHandler?.onModelLoad) {
        this.eventHandler.onModelLoad({
          id: `${Date.now()}_model_load`,
          type: MLEventType.MODEL_LOAD,
          timestamp: new Date().toISOString(),
          modelId: id,
          data: { modelPath, framework },
          metadata: {}
        });
      }

      return id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load model: ${errorMessage}`);
    }
  }

  public async unloadModel(modelId: string): Promise<void> {
    try {
      await this.modelManager.unloadModel(modelId);

      if (this.eventHandler?.onModelUnload) {
        this.eventHandler.onModelUnload({
          id: `${Date.now()}_model_unload`,
          type: MLEventType.MODEL_UNLOAD,
          timestamp: new Date().toISOString(),
          modelId,
          data: {},
          metadata: {}
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to unload model: ${errorMessage}`);
    }
  }

  public getModel(modelId: string): MLModel | undefined {
    return this.modelManager.getModel(modelId);
  }

  public getAllModels(): MLModel[] {
    return this.modelManager.getAllModels();
  }

  public getModelsByFramework(framework: MLFramework): MLModel[] {
    return this.modelManager.getModelsByFramework(framework);
  }

  // Inference Operations
  public async predict(modelId: string, input: any, config?: Partial<InferenceConfig>): Promise<any> {
    try {
      if (this.eventHandler?.onInferenceStart) {
        this.eventHandler.onInferenceStart({
          id: `${Date.now()}_inference_start`,
          type: MLEventType.INFERENCE_START,
          timestamp: new Date().toISOString(),
          modelId,
          data: { input, config },
          metadata: {}
        });
      }

      const result = await this.inferenceEngine.predict(modelId, input, config);

      if (this.eventHandler?.onInferenceComplete) {
        this.eventHandler.onInferenceComplete({
          id: `${Date.now()}_inference_complete`,
          type: MLEventType.INFERENCE_COMPLETE,
          timestamp: new Date().toISOString(),
          modelId,
          data: { result },
          metadata: {}
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.eventHandler?.onInferenceError) {
        this.eventHandler.onInferenceError({
          id: `${Date.now()}_inference_error`,
          type: MLEventType.INFERENCE_ERROR,
          timestamp: new Date().toISOString(),
          modelId,
          data: { error: errorMessage },
          metadata: {}
        });
      }

      throw new Error(`Inference failed: ${errorMessage}`);
    }
  }

  public async batchPredict(modelId: string, inputs: any[], config?: Partial<InferenceConfig>): Promise<any[]> {
    try {
      return await this.inferenceEngine.batchPredict(modelId, inputs, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch inference failed: ${errorMessage}`);
    }
  }

  public async streamPredict(
    modelId: string,
    inputStream: AsyncIterable<any>,
    config?: Partial<InferenceConfig>
  ): Promise<AsyncIterable<any>> {
    try {
      return await this.inferenceEngine.streamPredict(modelId, inputStream, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Stream inference failed: ${errorMessage}`);
    }
  }

  // Model Evaluation
  public async evaluateModel(modelId: string, testData: any[]): Promise<ModelEvaluationResult> {
    try {
      const model = this.modelManager.getModel(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      const result = await model.evaluate(testData);

      if (this.eventHandler?.onEvaluationComplete) {
        this.eventHandler.onEvaluationComplete({
          id: `${Date.now()}_evaluation_complete`,
          type: MLEventType.EVALUATION_COMPLETE,
          timestamp: new Date().toISOString(),
          modelId,
          data: { result },
          metadata: {}
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Model evaluation failed: ${errorMessage}`);
    }
  }

  // System Management
  public async getHealthStatus(): Promise<any> {
    try {
      const modelManagerStatus = await this.modelManager.getHealthStatus();
      const inferenceEngineStatus = await this.inferenceEngine.getHealthStatus();

      return {
        system: {
          status: this.isInitialized ? 'healthy' : 'unhealthy',
          initialized: this.isInitialized,
          timestamp: new Date().toISOString()
        },
        modelManager: modelManagerStatus,
        inferenceEngine: inferenceEngineStatus
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        system: {
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  public setEventHandler(eventHandler: MLEventHandler): void {
    this.eventHandler = eventHandler;
  }

  public async getMetrics(): Promise<any> {
    try {
      const modelManagerMetrics = await this.modelManager.getMetrics();
      const inferenceEngineMetrics = await this.inferenceEngine.getMetrics();

      return {
        modelManager: modelManagerMetrics,
        inferenceEngine: inferenceEngineMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get metrics: ${errorMessage}`);
    }
  }

  public async dispose(): Promise<void> {
    try {
      await this.modelManager.dispose();
      await this.inferenceEngine.dispose();
      this.isInitialized = false;
      (globalThis as any).console?.log('ML Integration System disposed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to dispose ML Integration System: ${errorMessage}`);
    }
  }
}

// Configuration interfaces for easier usage
export interface ModelLoadConfig {
  modelPath: string;
  framework: MLFramework;
  modelId?: string;
  device?: 'cpu' | 'gpu' | 'tpu' | 'auto';
  batchSize?: number;
  timeout?: number;
  optimization?: {
    quantization?: boolean;
    pruning?: boolean;
    tensorrt?: boolean;
  };
}

export interface PredictionConfig {
  modelId: string;
  input: any;
  batchSize?: number;
  timeout?: number;
  device?: 'cpu' | 'gpu' | 'tpu' | 'auto';
  preprocessing?: {
    normalize?: boolean;
    resize?: { width: number; height: number };
  };
  postprocessing?: {
    threshold?: number;
    topK?: number;
  };
}

export interface EvaluationConfig {
  modelId: string;
  testData: any[];
  metrics?: string[];
  visualizations?: string[];
}

// Factory function
export const createMLIntegrationSystem = (): MLIntegrationSystem => {
  return new MLIntegrationSystem();
};

// Utility functions
export const createTensorFlowModel = async (modelPath: string, modelId?: string): Promise<string> => {
  const system = new MLIntegrationSystem();
  await system.initialize();
  return await system.loadModel(modelPath, MLFramework.TENSORFLOW, modelId);
};

export const createPyTorchModel = async (modelPath: string, modelId?: string): Promise<string> => {
  const system = new MLIntegrationSystem();
  await system.initialize();
  return await system.loadModel(modelPath, MLFramework.PYTORCH, modelId);
};

export const createONNXModel = async (modelPath: string, modelId?: string): Promise<string> => {
  const system = new MLIntegrationSystem();
  await system.initialize();
  return await system.loadModel(modelPath, MLFramework.ONNX, modelId);
};

// Constants
export const ML_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  DEFAULT_BATCH_SIZE: 32,
  DEFAULT_INFERENCE_TIMEOUT: 5000,
  MAX_BATCH_SIZE: 1024,
  DEFAULT_DEVICE: 'auto',
  MODEL_LOAD_TIMEOUT: 60000,
  EVALUATION_TIMEOUT: 300000,
  METRICS_COLLECTION_INTERVAL: 30000
} as const;

export default MLIntegrationSystem;

// Unity-compatible wrapper
export class MLIntegrationSimulation {
  constructor() {}

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      mlintegration: {
        "totalModels": 0,
        "activeTraining": false,
        "mlFramework": "multi",
        "systemHealth": "operational"
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}