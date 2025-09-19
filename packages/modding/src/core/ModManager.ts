import { EventEmitter } from '../utils/EventEmitter';
import * as path from 'path';
import * as fs from 'fs';
import { watch } from 'chokidar';
import {
  ModManagerConfig,
  ModInstance,
  ModMetadata,
  ModState,
  ModEvent,
  ModEventType,
  ModConflict,
  ValidationResult,
  ModMetrics,
  ModHealthCheck,
  ModProfile,
  HotReloadConfig,
  DependencyGraph
} from '../types';
import { ModRegistry } from '../registry/ModRegistry';
import { ModLoader } from '../loader/ModLoader';

export class ModManager extends EventEmitter {
  private config: ModManagerConfig;
  private registry: ModRegistry;
  private loader: ModLoader;
  private metrics: Map<string, ModMetrics> = new Map();
  private healthChecks: Map<string, ModHealthCheck> = new Map();
  private profiles: Map<string, ModProfile> = new Map();
  private activeProfile?: string;
  private watchers: Map<string, any> = new Map();
  private isShuttingDown: boolean = false;

  constructor(config: ModManagerConfig) {
    super();
    this.config = { ...this.getDefaultConfig(), ...config };
    this.registry = new ModRegistry();
    this.loader = new ModLoader(
      this.config.modsDirectory,
      this.config.sandboxMods,
      this.config.allowNativeModules,
      this.config.loadTimeout
    );
    this.setupEventHandlers();
  }

  private getDefaultConfig(): ModManagerConfig {
    return {
      modsDirectory: './mods',
      enableHotReload: true,
      sandboxMods: true,
      allowNativeModules: false,
      maxMemoryPerMod: 128 * 1024 * 1024, // 128MB
      loadTimeout: 30000, // 30 seconds
      enableMetrics: true,
      hotReload: {
        enabled: true,
        watchPaths: ['**/*.js', '**/*.json', '**/*.ts'],
        ignored: ['**/node_modules/**', '**/dist/**'],
        debounceMs: 1000,
        reloadDependents: true,
        backupOnReload: true
      },
      permissions: {
        requireExplicitGrant: true,
        autoGrantSafe: false,
        denyDangerous: true,
        promptUser: false
      },
      logging: {
        level: 'info' as any,
        enableFileLogging: true,
        logDirectory: './logs',
        maxLogFiles: 10,
        maxLogSize: 10 * 1024 * 1024 // 10MB
      }
    };
  }

  private setupEventHandlers(): void {
    this.registry.on('mod_registered', (mod: ModInstance) => {
      this.emitModEvent(ModEventType.LOADED, mod.metadata.id, { mod });
      this.startMetricsCollection(mod.metadata.id);
    });

    this.registry.on('mod_unregistered', (modId: string) => {
      this.emitModEvent(ModEventType.UNLOADED, modId);
      this.stopMetricsCollection(modId);
    });

    this.loader.on('validation_failed', (modId: string, errors: ValidationResult) => {
      this.emitModEvent(ModEventType.ERROR, modId, { errors });
    });
  }

  public async initialize(): Promise<void> {
    // Ensure mods directory exists
    if (!fs.existsSync(this.config.modsDirectory)) {
      fs.mkdirSync(this.config.modsDirectory, { recursive: true });
    }

    // Load existing profiles
    await this.loadProfiles();

    // Set up hot reloading if enabled
    if (this.config.enableHotReload && this.config.hotReload.enabled) {
      this.setupHotReload();
    }

    // Start health monitoring
    if (this.config.enableMetrics) {
      this.startHealthMonitoring();
    }

    this.emit('initialized');
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Stop all watchers
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
    this.watchers.clear();

    // Unload all mods gracefully
    const loadedMods = this.registry.getAll().filter(mod => mod.state === ModState.ACTIVE);
    for (const mod of loadedMods) {
      await this.unloadMod(mod.metadata.id);
    }

    // Save profiles
    await this.saveProfiles();

    this.emit('shutdown');
  }

  public async loadMod(modPath: string): Promise<boolean> {
    try {
      const mod = await this.loader.loadMod(modPath);

      // Validate dependencies
      const conflicts = this.detectConflicts([mod]);
      if (conflicts.length > 0) {
        this.emit('conflict_detected', { modId: mod.metadata.id, conflicts });
        return false;
      }

      // Register the mod
      this.registry.register(mod);

      // Update state
      mod.state = ModState.ACTIVE;

      // Set up file watching for hot reload
      if (this.config.enableHotReload) {
        this.watchMod(mod);
      }

      return true;
    } catch (error) {
      this.emit('load_error', { modPath, error });
      return false;
    }
  }

  public async unloadMod(modId: string): Promise<boolean> {
    const mod = this.registry.get(modId);
    if (!mod) {
      return false;
    }

    try {
      // Check if other mods depend on this one
      const dependents = this.getDependents(modId);
      if (dependents.length > 0 && !this.isShuttingDown) {
        this.emit('unload_blocked', {
          modId,
          dependents: dependents.map(m => m.metadata.id)
        });
        return false;
      }

      // Stop watching
      this.unwatchMod(modId);

      // Update state
      mod.state = ModState.UNLOADING;

      // Call mod's cleanup if available
      if (mod.module && typeof mod.module.onUnload === 'function') {
        await mod.module.onUnload();
      }

      // Unregister from registry
      this.registry.unregister(modId);

      return true;
    } catch (error) {
      this.emit('unload_error', { modId, error });
      mod.state = ModState.ERROR;
      return false;
    }
  }

  public async reloadMod(modId: string): Promise<boolean> {
    const mod = this.registry.get(modId);
    if (!mod) {
      return false;
    }

    try {
      // Create backup if enabled
      if (this.config.hotReload.backupOnReload) {
        await this.createModBackup(mod);
      }

      // Get the original path
      const modPath = mod.metadata.entryPoint;

      // Unload the mod
      await this.unloadMod(modId);

      // Reload dependents if configured
      const dependents = this.config.hotReload.reloadDependents ?
        this.getDependents(modId) : [];

      // Reload the mod
      const reloaded = await this.loadMod(modPath);

      // Reload dependents
      for (const dependent of dependents) {
        await this.reloadMod(dependent.metadata.id);
      }

      if (reloaded) {
        this.emitModEvent(ModEventType.HOT_RELOAD, modId);
      }

      return reloaded;
    } catch (error) {
      this.emit('reload_error', { modId, error });
      return false;
    }
  }

  public async loadFromDirectory(directory: string = this.config.modsDirectory): Promise<void> {
    if (!fs.existsSync(directory)) {
      throw new Error(`Mods directory does not exist: ${directory}`);
    }

    const modPaths: string[] = [];
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const itemPath = path.join(directory, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Look for package.json or mod.json
        const packagePath = path.join(itemPath, 'package.json');
        const modPath = path.join(itemPath, 'mod.json');

        if (fs.existsSync(packagePath) || fs.existsSync(modPath)) {
          modPaths.push(itemPath);
        }
      } else if (item.endsWith('.js') || item.endsWith('.mod')) {
        modPaths.push(itemPath);
      }
    }

    // Sort by load order and dependencies
    const sortedPaths = await this.sortModsByDependencies(modPaths);

    // Load mods in order
    for (const modPath of sortedPaths) {
      await this.loadMod(modPath);
    }
  }

  private async sortModsByDependencies(modPaths: string[]): Promise<string[]> {
    // Load metadata for all mods first
    const modMetadata: Array<{ path: string; metadata: ModMetadata }> = [];

    for (const modPath of modPaths) {
      try {
        const metadata = await this.loader.loadMetadata(modPath);
        modMetadata.push({ path: modPath, metadata });
      } catch (error) {
        console.warn(`Failed to load metadata for ${modPath}:`, error);
      }
    }

    // Resolve dependencies
    const sorted = this.loader.resolveDependencies(modMetadata.map(m => m.metadata));

    // Map back to paths
    return sorted.map(metadata => {
      const mod = modMetadata.find(m => m.metadata.id === metadata.id);
      return mod?.path || '';
    }).filter(path => path);
  }

  public detectConflicts(newMods: ModInstance[] = []): ModConflict[] {
    const allMods = [...this.registry.getAll(), ...newMods];
    return this.loader.detectConflicts(allMods.map(m => m.metadata));
  }

  public getDependencies(modId: string): ModInstance[] {
    const mod = this.registry.get(modId);
    if (!mod) return [];

    const dependencies: ModInstance[] = [];
    for (const dep of mod.metadata.dependencies) {
      const depMod = this.registry.get(dep.id);
      if (depMod) {
        dependencies.push(depMod);
      }
    }

    return dependencies;
  }

  public getDependents(modId: string): ModInstance[] {
    return this.registry.getAll().filter(mod =>
      mod.metadata.dependencies.some(dep => dep.id === modId)
    );
  }

  public getDependencyGraph(): DependencyGraph {
    const mods = this.registry.getAll();
    const nodes = new Map<string, ModInstance>();
    const edges = new Map<string, Set<string>>();

    // Build nodes
    for (const mod of mods) {
      nodes.set(mod.metadata.id, mod);
      edges.set(mod.metadata.id, new Set());
    }

    // Build edges
    for (const mod of mods) {
      for (const dep of mod.metadata.dependencies) {
        if (nodes.has(dep.id)) {
          edges.get(mod.metadata.id)!.add(dep.id);
        }
      }
    }

    // Detect cycles
    const cycles = this.detectCycles(edges);

    // Generate topological order
    const topologicalOrder = this.topologicalSort(edges);

    return {
      nodes,
      edges,
      cycles,
      topologicalOrder
    };
  }

  private detectCycles(edges: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const neighbor of edges.get(node) || []) {
        if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        }
      }

      recursionStack.delete(node);
    };

    for (const node of edges.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  private topologicalSort(edges: Map<string, Set<string>>): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Calculate in-degrees
    for (const node of edges.keys()) {
      inDegree.set(node, 0);
    }

    for (const neighbors of edges.values()) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
      }
    }

    // Find nodes with no incoming edges
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const neighbor of edges.get(node) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  private setupHotReload(): void {
    if (!this.config.hotReload.enabled) return;

    const watchOptions = {
      ignored: this.config.hotReload.ignored,
      persistent: true,
      ignoreInitial: true
    };

    const watcher = watch(this.config.modsDirectory, watchOptions);

    watcher.on('change', this.debounce((filePath: string) => {
      this.handleFileChange(filePath);
    }, this.config.hotReload.debounceMs));

    this.watchers.set('global', watcher);
  }

  private watchMod(mod: ModInstance): void {
    if (!this.config.hotReload.enabled) return;

    const modDir = path.dirname(mod.metadata.entryPoint);
    const watchOptions = {
      ignored: this.config.hotReload.ignored,
      persistent: true,
      ignoreInitial: true
    };

    const watcher = watch(modDir, watchOptions);

    watcher.on('change', this.debounce((filePath: string) => {
      this.reloadMod(mod.metadata.id);
    }, this.config.hotReload.debounceMs));

    this.watchers.set(mod.metadata.id, watcher);
  }

  private unwatchMod(modId: string): void {
    const watcher = this.watchers.get(modId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(modId);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // Find which mod this file belongs to
    const affectedMods = this.registry.getAll().filter(mod => {
      const modDir = path.dirname(mod.metadata.entryPoint);
      return filePath.startsWith(modDir);
    });

    for (const mod of affectedMods) {
      await this.reloadMod(mod.metadata.id);
    }
  }

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: any;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private startMetricsCollection(modId: string): void {
    if (!this.config.enableMetrics) return;

    const initialMetrics: ModMetrics = {
      loadTime: Date.now(),
      memoryUsage: 0,
      cpuUsage: 0,
      hookCallCount: 0,
      errorCount: 0,
      lastActivity: Date.now(),
      isHealthy: true
    };

    this.metrics.set(modId, initialMetrics);
  }

  private stopMetricsCollection(modId: string): void {
    this.metrics.delete(modId);
    this.healthChecks.delete(modId);
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Check every minute
  }

  private async performHealthChecks(): Promise<void> {
    for (const mod of this.registry.getAll()) {
      try {
        const healthCheck = await this.performModHealthCheck(mod);
        this.healthChecks.set(mod.metadata.id, healthCheck);

        if (healthCheck.status === 'critical') {
          this.emitModEvent(ModEventType.HEALTH_CHECK, mod.metadata.id, { healthCheck });
        }
      } catch (error) {
        console.error(`Health check failed for mod ${mod.metadata.id}:`, error);
      }
    }
  }

  private async performModHealthCheck(mod: ModInstance): Promise<ModHealthCheck> {
    const issues: any[] = [];
    const recommendations: string[] = [];

    // Check memory usage
    const metrics = this.metrics.get(mod.metadata.id);
    if (metrics) {
      if (metrics.memoryUsage > this.config.maxMemoryPerMod * 0.8) {
        issues.push({
          type: 'memory',
          severity: 'warning',
          description: `High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
        });
        recommendations.push('Consider optimizing memory usage');
      }

      if (metrics.errorCount > 10) {
        issues.push({
          type: 'error',
          severity: 'high',
          description: `High error count: ${metrics.errorCount}`
        });
        recommendations.push('Check mod logs for recurring errors');
      }
    }

    // Check if mod is responsive
    const lastActivity = metrics?.lastActivity || 0;
    const inactiveTime = Date.now() - lastActivity;
    if (inactiveTime > 300000) { // 5 minutes
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: 'Mod appears inactive'
      });
    }

    const status = issues.some(i => i.severity === 'critical') ? 'critical' :
                  issues.some(i => i.severity === 'high') ? 'error' :
                  issues.some(i => i.severity === 'warning' || i.severity === 'medium') ? 'warning' :
                  'healthy';

    return {
      modId: mod.metadata.id,
      status: status as any,
      issues,
      recommendations,
      lastCheck: Date.now()
    };
  }

  private async createModBackup(mod: ModInstance): Promise<void> {
    // Implementation would create a backup of the mod's current state
    // This is a placeholder for the backup functionality
  }

  private async loadProfiles(): Promise<void> {
    const profilesPath = path.join(this.config.modsDirectory, 'profiles.json');
    if (fs.existsSync(profilesPath)) {
      try {
        const data = fs.readFileSync(profilesPath, 'utf8');
        const profiles = JSON.parse(data);

        for (const profile of profiles) {
          this.profiles.set(profile.id, profile);
        }
      } catch (error) {
        console.error('Failed to load profiles:', error);
      }
    }
  }

  private async saveProfiles(): Promise<void> {
    const profilesPath = path.join(this.config.modsDirectory, 'profiles.json');
    const profiles = Array.from(this.profiles.values());

    try {
      fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    } catch (error) {
      console.error('Failed to save profiles:', error);
    }
  }

  private emitModEvent(type: ModEventType, modId: string, data?: any): void {
    const event: ModEvent = {
      type,
      modId,
      timestamp: Date.now(),
      data,
      source: 'ModManager'
    };

    this.emit('mod_event', event);
    this.emit(type, event);
  }

  // Public API methods
  public getConfig(): ModManagerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ModManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  public getMod(modId: string): ModInstance | undefined {
    return this.registry.get(modId);
  }

  public getAllMods(): ModInstance[] {
    return this.registry.getAll();
  }

  public getModsByCategory(category: any): ModInstance[] {
    return this.registry.getByCategory(category);
  }

  public searchMods(query: any): ModInstance[] {
    return this.registry.search(query);
  }

  public getMetrics(modId: string): ModMetrics | undefined {
    return this.metrics.get(modId);
  }

  public getAllMetrics(): Map<string, ModMetrics> {
    return new Map(this.metrics);
  }

  public getHealthCheck(modId: string): ModHealthCheck | undefined {
    return this.healthChecks.get(modId);
  }

  public getAllHealthChecks(): Map<string, ModHealthCheck> {
    return new Map(this.healthChecks);
  }

  public getProfiles(): ModProfile[] {
    return Array.from(this.profiles.values());
  }

  public getActiveProfile(): ModProfile | undefined {
    return this.activeProfile ? this.profiles.get(this.activeProfile) : undefined;
  }

  public async setActiveProfile(profileId: string): Promise<boolean> {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    // Unload all current mods
    const currentMods = this.registry.getAll();
    for (const mod of currentMods) {
      await this.unloadMod(mod.metadata.id);
    }

    // Load profile mods
    for (const modId of profile.mods) {
      const modPath = path.join(this.config.modsDirectory, modId);
      await this.loadMod(modPath);
    }

    this.activeProfile = profileId;
    profile.lastUsed = Date.now();

    this.emit('profile_activated', profile);
    return true;
  }

  public createProfile(profile: Omit<ModProfile, 'created' | 'lastUsed'>): void {
    const newProfile: ModProfile = {
      ...profile,
      created: Date.now(),
      lastUsed: Date.now()
    };

    this.profiles.set(profile.id, newProfile);
    this.emit('profile_created', newProfile);
  }

  public deleteProfile(profileId: string): boolean {
    const deleted = this.profiles.delete(profileId);
    if (deleted) {
      if (this.activeProfile === profileId) {
        this.activeProfile = undefined;
      }
      this.emit('profile_deleted', profileId);
    }
    return deleted;
  }
}