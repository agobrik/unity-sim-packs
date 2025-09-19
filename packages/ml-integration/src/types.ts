// ML Integration Types

// Core ML Model Types
export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: ModelType;
  framework: MLFramework;
  status: ModelStatus;
  metadata: ModelMetadata;
  config: ModelConfig;
  load(): Promise<void>;
  unload(): Promise<void>;
  predict(input: any): Promise<any>;
  evaluate(testData: any[]): Promise<ModelEvaluationResult>;
}

export enum ModelType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  REINFORCEMENT_LEARNING = 'reinforcement_learning',
  NEURAL_NETWORK = 'neural_network',
  DECISION_TREE = 'decision_tree',
  RANDOM_FOREST = 'random_forest',
  SVM = 'svm',
  LINEAR_REGRESSION = 'linear_regression',
  LOGISTIC_REGRESSION = 'logistic_regression',
  NAIVE_BAYES = 'naive_bayes',
  K_MEANS = 'k_means',
  TRANSFORMER = 'transformer',
  CNN = 'cnn',
  RNN = 'rnn',
  LSTM = 'lstm',
  GAN = 'gan',
  AUTOENCODER = 'autoencoder',
  CUSTOM = 'custom'
}

export enum MLFramework {
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  ONNX = 'onnx',
  SCIKIT_LEARN = 'scikit_learn',
  KERAS = 'keras',
  XGBOOST = 'xgboost',
  LIGHTGBM = 'lightgbm',
  CATBOOST = 'catboost',
  HUGGING_FACE = 'hugging_face',
  JAX = 'jax',
  MXNET = 'mxnet',
  PADDLE = 'paddle',
  CUSTOM = 'custom'
}

export enum ModelStatus {
  LOADING = 'loading',
  LOADED = 'loaded',
  UNLOADED = 'unloaded',
  ERROR = 'error',
  TRAINING = 'training',
  OPTIMIZING = 'optimizing',
  READY = 'ready'
}

export interface ModelMetadata {
  description: string;
  author: string;
  created: string;
  updated: string;
  tags: string[];
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  inputShape: number[];
  outputShape: number[];
  parameters: number;
  modelSize: number;
  trainingTime?: number;
  inferences: number;
  averageInferenceTime: number;
}

export interface ModelConfig {
  path: string;
  device: DeviceType;
  batchSize: number;
  timeout: number;
  memoryLimit?: number;
  optimization?: InferenceOptimization;
  preprocessing?: PreprocessingPipeline;
  postprocessing?: PostprocessingPipeline;
  caching: boolean;
  monitoring: boolean;
}

export enum DeviceType {
  CPU = 'cpu',
  GPU = 'gpu',
  TPU = 'tpu',
  AUTO = 'auto'
}

// Inference Configuration
export interface InferenceConfig {
  modelId: string;
  batchSize: number;
  timeout: number;
  device: DeviceType;
  optimization: InferenceOptimization;
  preprocessing?: PreprocessingPipeline;
  postprocessing?: PostprocessingPipeline;
  streaming: boolean;
  caching: boolean;
  monitoring: boolean;
}

export interface InferenceOptimization {
  enabled: boolean;
  quantization?: QuantizationConfig;
  pruning?: PruningConfig;
  tensorrt?: TensorRTConfig;
  onnxRuntime?: ONNXRuntimeConfig;
  dynamicBatching?: DynamicBatchingConfig;
}

export interface QuantizationConfig {
  enabled: boolean;
  method: QuantizationMethod;
  precision: QuantizationPrecision;
  calibrationDataset?: string;
}

export enum QuantizationMethod {
  POST_TRAINING_QUANTIZATION = 'post_training_quantization',
  QUANTIZATION_AWARE_TRAINING = 'quantization_aware_training',
  DYNAMIC_QUANTIZATION = 'dynamic_quantization'
}

export enum QuantizationPrecision {
  INT8 = 'int8',
  INT16 = 'int16',
  FLOAT16 = 'float16',
  BFLOAT16 = 'bfloat16'
}

export interface PruningConfig {
  enabled: boolean;
  method: PruningMethod;
  sparsityRatio: number;
  structuredPruning: boolean;
}

export enum PruningMethod {
  MAGNITUDE = 'magnitude',
  STRUCTURED = 'structured',
  GRADUAL = 'gradual',
  LOTTERY_TICKET = 'lottery_ticket'
}

export interface TensorRTConfig {
  enabled: boolean;
  precision: TensorRTPrecision;
  maxWorkspaceSize: number;
  maxBatchSize: number;
}

export enum TensorRTPrecision {
  FP32 = 'fp32',
  FP16 = 'fp16',
  INT8 = 'int8'
}

export interface ONNXRuntimeConfig {
  enabled: boolean;
  providers: ONNXProvider[];
  sessionOptions: Record<string, any>;
}

export enum ONNXProvider {
  CPU = 'CPUExecutionProvider',
  CUDA = 'CUDAExecutionProvider',
  TENSORRT = 'TensorrtExecutionProvider',
  OPENVINO = 'OpenVINOExecutionProvider',
  DIRECTML = 'DmlExecutionProvider'
}

export interface DynamicBatchingConfig {
  enabled: boolean;
  maxBatchSize: number;
  maxLatency: number;
  preferredBatchSize: number[];
}

// Preprocessing Pipeline
export interface PreprocessingPipeline {
  steps: PreprocessingStep[];
  parallel: boolean;
  caching: boolean;
}

export interface PreprocessingStep {
  id: string;
  type: PreprocessingType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum PreprocessingType {
  NORMALIZE = 'normalize',
  STANDARDIZE = 'standardize',
  RESIZE = 'resize',
  CROP = 'crop',
  ROTATE = 'rotate',
  FLIP = 'flip',
  NOISE_REDUCTION = 'noise_reduction',
  FEATURE_SCALING = 'feature_scaling',
  TOKENIZATION = 'tokenization',
  ENCODING = 'encoding',
  PADDING = 'padding',
  TRUNCATION = 'truncation',
  AUGMENTATION = 'augmentation',
  CUSTOM = 'custom'
}

// Postprocessing Pipeline
export interface PostprocessingPipeline {
  steps: PostprocessingStep[];
  parallel: boolean;
}

export interface PostprocessingStep {
  id: string;
  type: PostprocessingType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum PostprocessingType {
  THRESHOLD = 'threshold',
  NMS = 'nms',
  SOFTMAX = 'softmax',
  ARGMAX = 'argmax',
  TOP_K = 'top_k',
  DECODE = 'decode',
  DENORMALIZE = 'denormalize',
  FORMAT = 'format',
  FILTER = 'filter',
  CUSTOM = 'custom'
}

// Training Configuration
export interface TrainingConfig {
  modelType: ModelType;
  framework: MLFramework;
  architecture: ModelArchitecture;
  hyperparameters: Hyperparameters;
  dataset: DatasetConfig;
  optimization: TrainingOptimization;
  callbacks: TrainingCallback[];
  checkpointing: CheckpointingConfig;
  logging: TrainingLoggingConfig;
}

export interface ModelArchitecture {
  layers: LayerConfig[];
  inputShape: number[];
  outputShape: number[];
}

export interface LayerConfig {
  id: string;
  type: LayerType;
  parameters: LayerParameters;
  activation?: ActivationType;
  regularization?: RegularizationConfig;
}

export enum LayerType {
  DENSE = 'dense',
  CONV2D = 'conv2d',
  CONV1D = 'conv1d',
  LSTM = 'lstm',
  GRU = 'gru',
  ATTENTION = 'attention',
  TRANSFORMER = 'transformer',
  DROPOUT = 'dropout',
  BATCH_NORM = 'batch_norm',
  POOLING = 'pooling',
  EMBEDDING = 'embedding',
  RESHAPE = 'reshape',
  FLATTEN = 'flatten',
  CUSTOM = 'custom'
}

export interface LayerParameters {
  units?: number;
  filters?: number;
  kernelSize?: number | number[];
  strides?: number | number[];
  padding?: string;
  dilationRate?: number | number[];
  groups?: number;
  useBias?: boolean;
  [key: string]: any;
}

export enum ActivationType {
  RELU = 'relu',
  SIGMOID = 'sigmoid',
  TANH = 'tanh',
  SOFTMAX = 'softmax',
  LINEAR = 'linear',
  LEAKY_RELU = 'leaky_relu',
  ELU = 'elu',
  SWISH = 'swish',
  GELU = 'gelu',
  MISH = 'mish',
  CUSTOM = 'custom'
}

export interface RegularizationConfig {
  l1?: number;
  l2?: number;
  dropout?: number;
  batchNorm?: boolean;
}

export interface Hyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  optimizer: OptimizerConfig;
  lossFunction: LossConfig;
  metrics: string[];
  earlyStopping?: EarlyStoppingConfig;
  learningRateSchedule?: LearningRateScheduleConfig;
}

export interface OptimizerConfig {
  type: OptimizerType;
  parameters: Record<string, any>;
}

export enum OptimizerType {
  SGD = 'sgd',
  ADAM = 'adam',
  ADAMW = 'adamw',
  RMSPROP = 'rmsprop',
  ADAGRAD = 'adagrad',
  ADADELTA = 'adadelta',
  MOMENTUM = 'momentum',
  NESTEROV = 'nesterov',
  CUSTOM = 'custom'
}

export interface LossConfig {
  type: LossType;
  parameters?: Record<string, any>;
}

export enum LossType {
  MEAN_SQUARED_ERROR = 'mean_squared_error',
  MEAN_ABSOLUTE_ERROR = 'mean_absolute_error',
  CATEGORICAL_CROSSENTROPY = 'categorical_crossentropy',
  BINARY_CROSSENTROPY = 'binary_crossentropy',
  SPARSE_CATEGORICAL_CROSSENTROPY = 'sparse_categorical_crossentropy',
  HUBER = 'huber',
  HINGE = 'hinge',
  COSINE_SIMILARITY = 'cosine_similarity',
  KL_DIVERGENCE = 'kl_divergence',
  CUSTOM = 'custom'
}

export interface EarlyStoppingConfig {
  enabled: boolean;
  monitor: string;
  patience: number;
  minDelta: number;
  mode: 'min' | 'max';
  restoreBestWeights: boolean;
}

export interface LearningRateScheduleConfig {
  type: LearningRateScheduleType;
  parameters: Record<string, any>;
}

export enum LearningRateScheduleType {
  CONSTANT = 'constant',
  STEP = 'step',
  EXPONENTIAL = 'exponential',
  POLYNOMIAL = 'polynomial',
  COSINE = 'cosine',
  WARMUP = 'warmup',
  CUSTOM = 'custom'
}

export interface DatasetConfig {
  path: string;
  format: DatasetFormat;
  split: DatasetSplit;
  preprocessing: PreprocessingPipeline;
  augmentation?: AugmentationConfig;
  validation: number;
  shuffle: boolean;
  seedValue?: number;
}

export enum DatasetFormat {
  CSV = 'csv',
  JSON = 'json',
  PARQUET = 'parquet',
  TFRECORD = 'tfrecord',
  HDF5 = 'hdf5',
  NUMPY = 'numpy',
  IMAGE_FOLDER = 'image_folder',
  COCO = 'coco',
  YOLO = 'yolo',
  CUSTOM = 'custom'
}

export interface DatasetSplit {
  train: number;
  validation: number;
  test: number;
}

export interface AugmentationConfig {
  enabled: boolean;
  techniques: AugmentationTechnique[];
  probability: number;
}

export interface AugmentationTechnique {
  type: AugmentationType;
  parameters: Record<string, any>;
  probability: number;
}

export enum AugmentationType {
  ROTATION = 'rotation',
  FLIP = 'flip',
  SCALE = 'scale',
  CROP = 'crop',
  COLOR_JITTER = 'color_jitter',
  NOISE = 'noise',
  BLUR = 'blur',
  ELASTIC_TRANSFORM = 'elastic_transform',
  CUTOUT = 'cutout',
  MIXUP = 'mixup',
  CUTMIX = 'cutmix',
  CUSTOM = 'custom'
}

export interface TrainingOptimization {
  mixedPrecision: boolean;
  gradientAccumulation: number;
  gradientClipping?: GradientClippingConfig;
  distributedTraining?: DistributedTrainingConfig;
  modelParallelism?: ModelParallelismConfig;
}

export interface GradientClippingConfig {
  enabled: boolean;
  method: GradientClippingMethod;
  value: number;
}

export enum GradientClippingMethod {
  NORM = 'norm',
  VALUE = 'value',
  GLOBAL_NORM = 'global_norm'
}

export interface DistributedTrainingConfig {
  enabled: boolean;
  strategy: DistributedStrategy;
  numWorkers: number;
  allReduceAlgorithm?: string;
}

export enum DistributedStrategy {
  DATA_PARALLEL = 'data_parallel',
  MODEL_PARALLEL = 'model_parallel',
  PIPELINE_PARALLEL = 'pipeline_parallel',
  HYBRID = 'hybrid'
}

export interface ModelParallelismConfig {
  enabled: boolean;
  partitions: ModelPartition[];
  communication: CommunicationConfig;
}

export interface ModelPartition {
  id: string;
  layers: string[];
  device: DeviceType;
}

export interface CommunicationConfig {
  backend: CommunicationBackend;
  compression: boolean;
  overlap: boolean;
}

export enum CommunicationBackend {
  NCCL = 'nccl',
  GLOO = 'gloo',
  MPI = 'mpi',
  CUSTOM = 'custom'
}

export interface TrainingCallback {
  type: CallbackType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum CallbackType {
  MODEL_CHECKPOINT = 'model_checkpoint',
  EARLY_STOPPING = 'early_stopping',
  REDUCE_LR_ON_PLATEAU = 'reduce_lr_on_plateau',
  TENSORBOARD = 'tensorboard',
  CSV_LOGGER = 'csv_logger',
  LAMBDA = 'lambda',
  CUSTOM = 'custom'
}

export interface CheckpointingConfig {
  enabled: boolean;
  frequency: CheckpointFrequency;
  path: string;
  saveOptimizer: boolean;
  saveWeightsOnly: boolean;
  maxToKeep: number;
}

export enum CheckpointFrequency {
  EPOCH = 'epoch',
  BATCH = 'batch',
  TIME = 'time',
  METRIC = 'metric'
}

export interface TrainingLoggingConfig {
  enabled: boolean;
  level: LogLevel;
  frequency: LogFrequency;
  metrics: string[];
  visualizations: VisualizationConfig[];
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum LogFrequency {
  BATCH = 'batch',
  EPOCH = 'epoch',
  TIME = 'time'
}

export interface VisualizationConfig {
  type: VisualizationType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum VisualizationType {
  LOSS_CURVE = 'loss_curve',
  ACCURACY_CURVE = 'accuracy_curve',
  CONFUSION_MATRIX = 'confusion_matrix',
  ROC_CURVE = 'roc_curve',
  PRECISION_RECALL_CURVE = 'precision_recall_curve',
  GRADIENT_HISTOGRAM = 'gradient_histogram',
  WEIGHT_HISTOGRAM = 'weight_histogram',
  ACTIVATION_HISTOGRAM = 'activation_histogram',
  CUSTOM = 'custom'
}

// Model Evaluation
export interface ModelEvaluationResult {
  modelId: string;
  timestamp: string;
  metrics: EvaluationMetrics;
  predictions: PredictionResult[];
  confusionMatrix?: number[][];
  rocCurve?: ROCCurveData;
  precisionRecallCurve?: PrecisionRecallCurveData;
  featureImportance?: FeatureImportance[];
}

export interface EvaluationMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  mse?: number;
  mae?: number;
  rmse?: number;
  r2Score?: number;
  logLoss?: number;
  custom?: Record<string, number>;
}

export interface PredictionResult {
  input: any;
  prediction: any;
  confidence?: number;
  actualLabel?: any;
  correct?: boolean;
  processingTime: number;
}

export interface ROCCurveData {
  fpr: number[];
  tpr: number[];
  thresholds: number[];
  auc: number;
}

export interface PrecisionRecallCurveData {
  precision: number[];
  recall: number[];
  thresholds: number[];
  auc: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

// ML Events and Monitoring
export interface MLEventHandler {
  onModelLoad: (event: MLEvent) => void;
  onModelUnload: (event: MLEvent) => void;
  onInferenceStart: (event: MLEvent) => void;
  onInferenceComplete: (event: MLEvent) => void;
  onInferenceError: (event: MLEvent) => void;
  onTrainingStart: (event: MLEvent) => void;
  onTrainingComplete: (event: MLEvent) => void;
  onTrainingError: (event: MLEvent) => void;
  onEvaluationComplete: (event: MLEvent) => void;
  onModelDrift: (event: MLEvent) => void;
  onPerformanceDegradation: (event: MLEvent) => void;
}

export interface MLEvent {
  id: string;
  type: MLEventType;
  timestamp: string;
  modelId?: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
}

export enum MLEventType {
  MODEL_LOAD = 'model_load',
  MODEL_UNLOAD = 'model_unload',
  INFERENCE_START = 'inference_start',
  INFERENCE_COMPLETE = 'inference_complete',
  INFERENCE_ERROR = 'inference_error',
  TRAINING_START = 'training_start',
  TRAINING_EPOCH = 'training_epoch',
  TRAINING_COMPLETE = 'training_complete',
  TRAINING_ERROR = 'training_error',
  EVALUATION_COMPLETE = 'evaluation_complete',
  MODEL_DRIFT = 'model_drift',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  RESOURCE_THRESHOLD = 'resource_threshold',
  CUSTOM = 'custom'
}

// Alert Configuration
export interface AlertConfig {
  id: string;
  name: string;
  enabled: boolean;
  condition: AlertCondition;
  actions: AlertAction[];
  cooldown: number;
}

export interface AlertCondition {
  metric: string;
  operator: ComparisonOperator;
  threshold: number;
  duration?: number;
  severity: AlertSeverity;
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AlertAction {
  type: AlertActionType;
  config: Record<string, any>;
}

export enum AlertActionType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  SMS = 'sms',
  LOG = 'log',
  CUSTOM = 'custom'
}

// Utility Types
export type InferenceInput = any;
export type InferenceOutput = any;
export type ModelWeights = any;
export type TrainingData = any;
export type ValidationData = any;

// Error Types
export class MLError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'MLError';
    this.code = code;
    this.details = details;
  }
}

export class ModelLoadError extends MLError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'MODEL_LOAD_ERROR', details);
    this.name = 'ModelLoadError';
  }
}

export class InferenceError extends MLError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'INFERENCE_ERROR', details);
    this.name = 'InferenceError';
  }
}

export class TrainingError extends MLError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TRAINING_ERROR', details);
    this.name = 'TrainingError';
  }
}

export class ValidationError extends MLError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// Response Types
export interface MLResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: Record<string, any>;
  };
  metadata: {
    timestamp: string;
    processingTime: number;
    modelId?: string;
    version?: string;
  };
}

export interface BatchInferenceResponse {
  results: InferenceOutput[];
  batchId: string;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  processingTime: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}