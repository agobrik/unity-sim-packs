export interface ModMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags: string[];
  category: ModCategory;
  compatibility: CompatibilityInfo;
  dependencies: ModDependency[];
  optionalDependencies?: ModDependency[];
  conflicts?: string[];
  provides?: string[];
  loadOrder?: number;
  entryPoint: string;
  assets?: AssetDeclaration[];
  permissions: Permission[];
  configuration?: ConfigurationSchema;
  hooks?: HookDeclaration[];
}

export interface ModDependency {
  id: string;
  version: string;
  optional?: boolean;
  reason?: string;
}

export interface CompatibilityInfo {
  gameVersion: string;
  frameworkVersion: string;
  minMemory?: number;
  platform?: string[];
  nodeVersion?: string;
}

export interface AssetDeclaration {
  path: string;
  type: AssetType;
  optional?: boolean;
  preload?: boolean;
}

export interface Permission {
  type: PermissionType;
  scope?: string;
  description: string;
  required: boolean;
}

export interface ConfigurationSchema {
  properties: Record<string, ConfigProperty>;
  required?: string[];
  groups?: ConfigGroup[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: ConfigProperty;
  properties?: Record<string, ConfigProperty>;
}

export interface ConfigGroup {
  name: string;
  title: string;
  properties: string[];
  description?: string;
}

export interface HookDeclaration {
  name: string;
  type: HookType;
  description: string;
  parameters?: HookParameter[];
  returnType?: string;
}

export interface HookParameter {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

export interface ModInstance {
  metadata: ModMetadata;
  module: any;
  context: ModContext;
  state: ModState;
  config: Record<string, any>;
  loadTime: number;
  lastModified: number;
  dependencies: Set<string>;
  dependents: Set<string>;
  assets: Map<string, any>;
  hooks: Map<string, Function[]>;
  sandbox?: ModSandbox;
}

export interface ModContext {
  id: string;
  version: string;
  api: ModAPI;
  logger: ModLogger;
  config: ModConfig;
  events: ModEventEmitter;
  storage: ModStorage;
  scheduler: ModScheduler;
  permissions: PermissionManager;
}

export interface ModAPI {
  registerHook(name: string, handler: Function): void;
  unregisterHook(name: string, handler: Function): void;
  callHook(name: string, ...args: any[]): Promise<any[]>;
  getModById(id: string): ModInstance | undefined;
  getAllMods(): ModInstance[];
  getDependencies(modId: string): ModInstance[];
  getDependents(modId: string): ModInstance[];
  loadAsset(path: string): Promise<any>;
  unloadAsset(path: string): void;
  createLogger(name: string): ModLogger;
  requestPermission(permission: Permission): Promise<boolean>;
  hasPermission(permission: PermissionType, scope?: string): boolean;
}

export interface ModLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  log(level: LogLevel, message: string, ...args: any[]): void;
}

export interface ModConfig {
  get<T = any>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  delete(key: string): void;
  getAll(): Record<string, any>;
  reset(): void;
  validate(): ValidationResult;
}

export interface ModEventEmitter {
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, listener: Function): void;
  removeAllListeners(event?: string): void;
}

export interface ModStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

export interface ModScheduler {
  schedule(task: ScheduledTask): string;
  cancel(taskId: string): boolean;
  pause(taskId: string): boolean;
  resume(taskId: string): boolean;
  getTask(taskId: string): ScheduledTask | undefined;
  getAllTasks(): ScheduledTask[];
}

export interface ScheduledTask {
  id?: string;
  name: string;
  handler: Function;
  delay?: number;
  interval?: number;
  maxExecutions?: number;
  enabled: boolean;
  executionCount: number;
  lastExecution?: number;
  nextExecution?: number;
}

export interface PermissionManager {
  request(permission: Permission): Promise<boolean>;
  grant(modId: string, permission: Permission): void;
  revoke(modId: string, permission: Permission): void;
  hasPermission(modId: string, type: PermissionType, scope?: string): boolean;
  getAllPermissions(modId: string): Permission[];
  checkCompatibility(modId: string, permissions: Permission[]): PermissionCheckResult;
}

export interface PermissionCheckResult {
  allowed: boolean;
  denied: Permission[];
  warnings: PermissionWarning[];
}

export interface PermissionWarning {
  permission: Permission;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ModSandbox {
  execute(code: string, context: Record<string, any>): any;
  createContext(baseContext?: Record<string, any>): Record<string, any>;
  destroy(): void;
  isSecure: boolean;
  allowedModules: string[];
  blockedModules: string[];
}

export interface ModLoader {
  loadMod(path: string): Promise<ModInstance>;
  unloadMod(modId: string): Promise<boolean>;
  reloadMod(modId: string): Promise<boolean>;
  validateMod(metadata: ModMetadata): ValidationResult;
  resolveDependencies(mods: ModMetadata[]): ModMetadata[];
  detectConflicts(mods: ModMetadata[]): ModConflict[];
}

export interface ModRegistry {
  register(mod: ModInstance): void;
  unregister(modId: string): boolean;
  get(modId: string): ModInstance | undefined;
  getAll(): ModInstance[];
  getByCategory(category: ModCategory): ModInstance[];
  getByTag(tag: string): ModInstance[];
  findByName(name: string): ModInstance[];
  search(query: ModSearchQuery): ModInstance[];
  getDependencyGraph(): DependencyGraph;
}

export interface ModSearchQuery {
  name?: string;
  author?: string;
  category?: ModCategory;
  tags?: string[];
  version?: string;
  enabled?: boolean;
  hasConflicts?: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, ModInstance>;
  edges: Map<string, Set<string>>;
  cycles: string[][];
  topologicalOrder: string[];
}

export interface ModConflict {
  type: ConflictType;
  mods: string[];
  description: string;
  severity: ConflictSeverity;
  resolutions?: ConflictResolution[];
}

export interface ConflictResolution {
  type: 'disable' | 'update' | 'configure' | 'replace';
  description: string;
  target: string;
  automatic: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
  severity: 'low' | 'medium' | 'high';
}

export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  ignored: string[];
  debounceMs: number;
  reloadDependents: boolean;
  backupOnReload: boolean;
}

export interface ModManagerConfig {
  modsDirectory: string;
  enableHotReload: boolean;
  sandboxMods: boolean;
  allowNativeModules: boolean;
  maxMemoryPerMod: number;
  loadTimeout: number;
  enableMetrics: boolean;
  hotReload: HotReloadConfig;
  permissions: PermissionConfig;
  logging: LoggingConfig;
}

export interface PermissionConfig {
  requireExplicitGrant: boolean;
  autoGrantSafe: boolean;
  denyDangerous: boolean;
  promptUser: boolean;
}

export interface LoggingConfig {
  level: LogLevel;
  enableFileLogging: boolean;
  logDirectory: string;
  maxLogFiles: number;
  maxLogSize: number;
}

export interface ModMetrics {
  loadTime: number;
  memoryUsage: number;
  cpuUsage: number;
  hookCallCount: number;
  errorCount: number;
  lastActivity: number;
  isHealthy: boolean;
}

export interface ModHealthCheck {
  modId: string;
  status: HealthStatus;
  issues: HealthIssue[];
  recommendations: string[];
  lastCheck: number;
}

export interface HealthIssue {
  type: 'memory' | 'performance' | 'error' | 'compatibility' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation?: string;
}

export interface ModEvent {
  type: ModEventType;
  modId: string;
  timestamp: number;
  data?: any;
  source: string;
}

export interface HookEvent {
  hookName: string;
  modId: string;
  timestamp: number;
  parameters: any[];
  result?: any;
  error?: Error;
  executionTime: number;
}

export interface AssetManager {
  loadAsset(path: string, type: AssetType): Promise<any>;
  unloadAsset(path: string): void;
  preloadAssets(assets: AssetDeclaration[]): Promise<void>;
  getAsset(path: string): any;
  hasAsset(path: string): boolean;
  getAllAssets(): Map<string, any>;
  getAssetsByType(type: AssetType): Map<string, any>;
  clearCache(): void;
}

export interface ModProfile {
  id: string;
  name: string;
  description: string;
  mods: string[];
  configuration: Record<string, Record<string, any>>;
  created: number;
  lastUsed: number;
  isActive: boolean;
}

export enum ModState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVE = 'active',
  ERROR = 'error',
  DISABLED = 'disabled',
  UNLOADING = 'unloading'
}

export enum ModCategory {
  CONTENT = 'content',
  GAMEPLAY = 'gameplay',
  UI = 'ui',
  GRAPHICS = 'graphics',
  AUDIO = 'audio',
  PERFORMANCE = 'performance',
  TOOLS = 'tools',
  LIBRARY = 'library',
  FRAMEWORK = 'framework',
  INTEGRATION = 'integration'
}

export enum AssetType {
  TEXTURE = 'texture',
  MODEL = 'model',
  AUDIO = 'audio',
  DATA = 'data',
  SCRIPT = 'script',
  SHADER = 'shader',
  FONT = 'font',
  ANIMATION = 'animation',
  CONFIG = 'config'
}

export enum PermissionType {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  NETWORK_ACCESS = 'network_access',
  SYSTEM_INFO = 'system_info',
  NATIVE_MODULE = 'native_module',
  PROCESS_SPAWN = 'process_spawn',
  ENVIRONMENT_ACCESS = 'environment_access',
  REGISTRY_READ = 'registry_read',
  REGISTRY_WRITE = 'registry_write',
  HOOK_REGISTER = 'hook_register',
  HOOK_OVERRIDE = 'hook_override',
  MOD_CONTROL = 'mod_control',
  CONFIG_MODIFY = 'config_modify',
  ASSET_LOAD = 'asset_load',
  SCHEDULER_ACCESS = 'scheduler_access'
}

export enum HookType {
  FILTER = 'filter',
  ACTION = 'action',
  EVENT = 'event',
  OVERRIDE = 'override',
  INTERCEPT = 'intercept'
}

export enum ConflictType {
  DUPLICATE_ID = 'duplicate_id',
  INCOMPATIBLE_VERSION = 'incompatible_version',
  MISSING_DEPENDENCY = 'missing_dependency',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  RESOURCE_CONFLICT = 'resource_conflict',
  HOOK_CONFLICT = 'hook_conflict',
  PERMISSION_CONFLICT = 'permission_conflict'
}

export enum ConflictSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent'
}

export enum ModEventType {
  LOADED = 'loaded',
  UNLOADED = 'unloaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
  CONFIG_CHANGED = 'config_changed',
  ASSET_LOADED = 'asset_loaded',
  ASSET_UNLOADED = 'asset_unloaded',
  HOOK_REGISTERED = 'hook_registered',
  HOOK_UNREGISTERED = 'hook_unregistered',
  DEPENDENCY_RESOLVED = 'dependency_resolved',
  CONFLICT_DETECTED = 'conflict_detected',
  HOT_RELOAD = 'hot_reload',
  HEALTH_CHECK = 'health_check'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

export type ModEventHandler = (event: ModEvent) => void;
export type HookHandler = (...args: any[]) => any;
export type AssetHandler = (asset: any, path: string) => any;
export type HealthCheckHandler = (mod: ModInstance) => Promise<HealthIssue[]>;

export interface ModFrameworkOptions {
  config: ModManagerConfig;
  customLoaders?: Map<string, ModLoader>;
  customValidators?: Map<string, (metadata: ModMetadata) => ValidationResult>;
  healthCheckers?: Map<string, HealthCheckHandler>;
  assetHandlers?: Map<AssetType, AssetHandler>;
}

export interface ModPackage {
  metadata: ModMetadata;
  files: Map<string, Buffer>;
  signature?: string;
  compressed: boolean;
  checksum: string;
}

export interface ModDistribution {
  source: 'local' | 'remote' | 'registry';
  url?: string;
  path?: string;
  version: string;
  verified: boolean;
  downloadSize?: number;
  installSize?: number;
}

export interface ModUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  changelog?: string;
  breaking: boolean;
  distribution: ModDistribution;
}

export interface ModBackup {
  modId: string;
  version: string;
  timestamp: number;
  files: Map<string, Buffer>;
  metadata: ModMetadata;
  config: Record<string, any>;
}

export interface ModMigration {
  fromVersion: string;
  toVersion: string;
  handler: (oldConfig: any, oldData: any) => { config: any; data: any };
  description: string;
  breaking: boolean;
}