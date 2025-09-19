import { EventEmitter } from '../utils/EventEmitter';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ModInstance,
  ModMetadata,
  ModContext,
  ModState,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ModConflict,
  ConflictType,
  ConflictSeverity,
  ModSandbox,
  PermissionType,
  AssetType,
  ModDependency
} from '../types';

export class ModLoader extends EventEmitter {
  private loadedMods: Map<string, ModInstance> = new Map();
  private loadPromises: Map<string, Promise<ModInstance>> = new Map();
  private sandboxes: Map<string, ModSandbox> = new Map();

  constructor(
    private modsDirectory: string,
    private enableSandbox: boolean = true,
    private allowNativeModules: boolean = false,
    private loadTimeout: number = 30000
  ) {
    super();
  }

  public async loadMod(modPath: string): Promise<ModInstance> {
    const absolutePath = path.resolve(modPath);
    const modId = path.basename(absolutePath);

    if (this.loadPromises.has(modId)) {
      return this.loadPromises.get(modId)!;
    }

    const loadPromise = this.doLoadMod(absolutePath, modId);
    this.loadPromises.set(modId, loadPromise);

    try {
      const mod = await loadPromise;
      this.loadedMods.set(modId, mod);
      this.emit('mod_loaded', mod);
      return mod;
    } catch (error) {
      this.loadPromises.delete(modId);
      this.emit('mod_load_error', modId, error);
      throw error;
    }
  }

  private async doLoadMod(modPath: string, modId: string): Promise<ModInstance> {
    const startTime = Date.now();

    try {
      const metadataPath = path.join(modPath, 'mod.json');
      const metadata = await this.loadMetadata(metadataPath);

      const validationResult = this.validateMod(metadata);
      if (!validationResult.valid) {
        throw new Error(`Mod validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      if (validationResult.warnings.length > 0) {
        this.emit('mod_validation_warnings', modId, validationResult.warnings);
      }

      const entryPointPath = path.join(modPath, metadata.entryPoint);
      const moduleCode = await fs.readFile(entryPointPath, 'utf-8');

      let module: any;
      let sandbox: ModSandbox | undefined;

      if (this.enableSandbox) {
        sandbox = this.createSandbox(metadata);
        this.sandboxes.set(modId, sandbox);
        module = sandbox.execute(moduleCode, {});
      } else {
        if (typeof require !== 'undefined' && (globalThis as any).require) {
          delete (globalThis as any).require.cache[(globalThis as any).require.resolve(entryPointPath)];
          module = (globalThis as any).require(entryPointPath);
        } else {
          throw new Error('require is not available in this environment');
        }
      }

      const context = await this.createModContext(metadata);

      const modInstance: ModInstance = {
        metadata,
        module,
        context,
        state: ModState.LOADED,
        config: {},
        loadTime: Date.now() - startTime,
        lastModified: (await fs.stat(entryPointPath)).mtime.getTime(),
        dependencies: new Set(metadata.dependencies.map(d => d.id)),
        dependents: new Set(),
        assets: new Map(),
        hooks: new Map(),
        sandbox
      };

      if (module.initialize && typeof module.initialize === 'function') {
        await this.executeWithTimeout(
          module.initialize(context),
          this.loadTimeout,
          `Mod ${modId} initialization timeout`
        );
        modInstance.state = ModState.ACTIVE;
      }

      await this.preloadAssets(modInstance);

      return modInstance;
    } catch (error) {
      throw new Error(`Failed to load mod from ${modPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async loadMetadata(metadataPath: string): Promise<ModMetadata> {
    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to load mod metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private createSandbox(metadata: ModMetadata): ModSandbox {
    const allowedModules = this.allowNativeModules
      ? ['fs', 'path', 'events', 'util']
      : [];

    const blockedModules = [
      'child_process',
      'cluster',
      'dgram',
      'dns',
      'http',
      'https',
      'net',
      'os',
      'process',
      'vm'
    ];

    const vm = (globalThis as any).require?.('vm');
    if (!vm) {
      throw new Error('VM module is not available in this environment');
    }
    const context = vm.createContext({
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer: (globalThis as any).Buffer,
      process: {
        env: {},
        nextTick: (globalThis as any).process?.nextTick || ((cb: () => void) => (globalThis as any).setTimeout(cb, 0)),
        version: (globalThis as any).process?.version || 'unknown'
      },
      require: (moduleName: string) => {
        if (blockedModules.includes(moduleName)) {
          throw new Error(`Module '${moduleName}' is not allowed in sandbox`);
        }
        if (!allowedModules.includes(moduleName)) {
          throw new Error(`Module '${moduleName}' is not in the allowed list`);
        }
        if (typeof (globalThis as any).require !== 'undefined') {
          return (globalThis as any).require(moduleName);
        }
        throw new Error('require is not available in sandbox environment');
      }
    });

    return {
      execute: (code: string, additionalContext: Record<string, any>) => {
        Object.assign(context, additionalContext);
        return vm.runInContext(code, context, {
          timeout: this.loadTimeout,
          displayErrors: true
        });
      },
      createContext: (baseContext?: Record<string, any>) => {
        return { ...context, ...baseContext };
      },
      destroy: () => {
        // Cleanup sandbox resources
      },
      isSecure: true,
      allowedModules,
      blockedModules
    };
  }

  private async createModContext(metadata: ModMetadata): Promise<ModContext> {
    return {
      id: metadata.id,
      version: metadata.version,
      api: {
        registerHook: (name: string, handler: Function) => {
          this.emit('hook_register', metadata.id, name, handler);
        },
        unregisterHook: (name: string, handler: Function) => {
          this.emit('hook_unregister', metadata.id, name, handler);
        },
        callHook: async (name: string, ...args: any[]) => {
          return new Promise(resolve => {
            this.emit('hook_call', metadata.id, name, args, resolve);
          });
        },
        getModById: (id: string) => {
          return this.loadedMods.get(id);
        },
        getAllMods: () => {
          return Array.from(this.loadedMods.values());
        },
        getDependencies: (modId: string) => {
          const mod = this.loadedMods.get(modId);
          if (!mod) return [];
          return Array.from(mod.dependencies)
            .map(id => this.loadedMods.get(id))
            .filter((m): m is ModInstance => m !== undefined);
        },
        getDependents: (modId: string) => {
          const mod = this.loadedMods.get(modId);
          if (!mod) return [];
          return Array.from(mod.dependents)
            .map(id => this.loadedMods.get(id))
            .filter((m): m is ModInstance => m !== undefined);
        },
        loadAsset: async (assetPath: string) => {
          return this.loadAsset(metadata.id, assetPath);
        },
        unloadAsset: (assetPath: string) => {
          this.unloadAsset(metadata.id, assetPath);
        },
        createLogger: (name: string) => ({
          debug: (message: string, ...args: any[]) => {
            this.emit('mod_log', metadata.id, 'debug', `[${name}] ${message}`, args);
          },
          info: (message: string, ...args: any[]) => {
            this.emit('mod_log', metadata.id, 'info', `[${name}] ${message}`, args);
          },
          warn: (message: string, ...args: any[]) => {
            this.emit('mod_log', metadata.id, 'warn', `[${name}] ${message}`, args);
          },
          error: (message: string, ...args: any[]) => {
            this.emit('mod_log', metadata.id, 'error', `[${name}] ${message}`, args);
          },
          log: (level: any, message: string, ...args: any[]) => {
            this.emit('mod_log', metadata.id, level, `[${name}] ${message}`, args);
          }
        }),
        requestPermission: async (permission: any) => {
          return new Promise(resolve => {
            this.emit('permission_request', metadata.id, permission, resolve);
          });
        },
        hasPermission: (type: PermissionType, scope?: string) => {
          return metadata.permissions.some(p =>
            p.type === type && (!scope || p.scope === scope)
          );
        }
      },
      logger: {
        debug: (message: string, ...args: any[]) => {
          this.emit('mod_log', metadata.id, 'debug', message, args);
        },
        info: (message: string, ...args: any[]) => {
          this.emit('mod_log', metadata.id, 'info', message, args);
        },
        warn: (message: string, ...args: any[]) => {
          this.emit('mod_log', metadata.id, 'warn', message, args);
        },
        error: (message: string, ...args: any[]) => {
          this.emit('mod_log', metadata.id, 'error', message, args);
        },
        log: (level: any, message: string, ...args: any[]) => {
          this.emit('mod_log', metadata.id, level, message, args);
        }
      },
      config: {
        get: <T = any>(key: string, defaultValue?: T): T => {
          const mod = this.loadedMods.get(metadata.id);
          return mod?.config[key] ?? defaultValue;
        },
        set: (key: string, value: any) => {
          const mod = this.loadedMods.get(metadata.id);
          if (mod) {
            mod.config[key] = value;
            this.emit('config_changed', metadata.id, key, value);
          }
        },
        has: (key: string) => {
          const mod = this.loadedMods.get(metadata.id);
          return mod ? key in mod.config : false;
        },
        delete: (key: string) => {
          const mod = this.loadedMods.get(metadata.id);
          if (mod && key in mod.config) {
            delete mod.config[key];
            this.emit('config_changed', metadata.id, key, undefined);
          }
        },
        getAll: () => {
          const mod = this.loadedMods.get(metadata.id);
          return mod ? { ...mod.config } : {};
        },
        reset: () => {
          const mod = this.loadedMods.get(metadata.id);
          if (mod) {
            mod.config = {};
            this.emit('config_reset', metadata.id);
          }
        },
        validate: () => {
          return { valid: true, errors: [], warnings: [] };
        }
      },
      events: new EventEmitter(),
      storage: {
        get: async <T = any>(key: string): Promise<T | undefined> => {
          return new Promise(resolve => {
            this.emit('storage_get', metadata.id, key, resolve);
          });
        },
        set: async (key: string, value: any): Promise<void> => {
          return new Promise(resolve => {
            this.emit('storage_set', metadata.id, key, value, resolve);
          });
        },
        delete: async (key: string): Promise<boolean> => {
          return new Promise(resolve => {
            this.emit('storage_delete', metadata.id, key, resolve);
          });
        },
        has: async (key: string): Promise<boolean> => {
          return new Promise(resolve => {
            this.emit('storage_has', metadata.id, key, resolve);
          });
        },
        clear: async (): Promise<void> => {
          return new Promise(resolve => {
            this.emit('storage_clear', metadata.id, resolve);
          });
        },
        keys: async (): Promise<string[]> => {
          return new Promise(resolve => {
            this.emit('storage_keys', metadata.id, resolve);
          });
        },
        size: async (): Promise<number> => {
          return new Promise(resolve => {
            this.emit('storage_size', metadata.id, resolve);
          });
        }
      },
      scheduler: {
        schedule: (task: any) => {
          const taskId = `${metadata.id}_${Date.now()}_${Math.random()}`;
          this.emit('task_schedule', metadata.id, { ...task, id: taskId });
          return taskId;
        },
        cancel: (taskId: string) => {
          this.emit('task_cancel', metadata.id, taskId);
          return true;
        },
        pause: (taskId: string) => {
          this.emit('task_pause', metadata.id, taskId);
          return true;
        },
        resume: (taskId: string) => {
          this.emit('task_resume', metadata.id, taskId);
          return true;
        },
        getTask: (taskId: string) => {
          return undefined;
        },
        getAllTasks: () => {
          return [];
        }
      },
      permissions: {
        request: async (permission: any) => {
          return new Promise(resolve => {
            this.emit('permission_request', metadata.id, permission, resolve);
          });
        },
        grant: (modId: string, permission: any) => {
          this.emit('permission_grant', metadata.id, modId, permission);
        },
        revoke: (modId: string, permission: any) => {
          this.emit('permission_revoke', metadata.id, modId, permission);
        },
        hasPermission: (modId: string, type: PermissionType, scope?: string) => {
          return false;
        },
        getAllPermissions: (modId: string) => {
          return [];
        },
        checkCompatibility: (modId: string, permissions: any[]) => {
          return { allowed: true, denied: [], warnings: [] };
        }
      }
    };
  }

  private async preloadAssets(mod: ModInstance): Promise<void> {
    if (!mod.metadata.assets) return;

    for (const asset of mod.metadata.assets) {
      if (asset.preload) {
        try {
          const assetData = await this.loadAsset(mod.metadata.id, asset.path);
          mod.assets.set(asset.path, assetData);
        } catch (error) {
          if (!asset.optional) {
            throw new Error(`Failed to preload required asset ${asset.path}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }
  }

  private async loadAsset(modId: string, assetPath: string): Promise<any> {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      throw new Error(`Mod ${modId} not found`);
    }

    const fullPath = path.join(this.modsDirectory, modId, assetPath);

    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isFile()) {
        throw new Error(`Asset path is not a file: ${assetPath}`);
      }

      const ext = path.extname(assetPath).toLowerCase();

      let assetData: any;
      switch (ext) {
        case '.json':
          const jsonContent = await fs.readFile(fullPath, 'utf-8');
          assetData = JSON.parse(jsonContent);
          break;
        case '.txt':
        case '.md':
          assetData = await fs.readFile(fullPath, 'utf-8');
          break;
        default:
          assetData = await fs.readFile(fullPath);
      }

      this.emit('asset_loaded', modId, assetPath, assetData);
      return assetData;
    } catch (error) {
      this.emit('asset_load_error', modId, assetPath, error);
      throw error;
    }
  }

  private unloadAsset(modId: string, assetPath: string): void {
    const mod = this.loadedMods.get(modId);
    if (mod && mod.assets.has(assetPath)) {
      mod.assets.delete(assetPath);
      this.emit('asset_unloaded', modId, assetPath);
    }
  }

  public async unloadMod(modId: string): Promise<boolean> {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      return false;
    }

    try {
      mod.state = ModState.UNLOADING;

      if (mod.module.cleanup && typeof mod.module.cleanup === 'function') {
        await this.executeWithTimeout(
          mod.module.cleanup(),
          this.loadTimeout,
          `Mod ${modId} cleanup timeout`
        );
      }

      for (const assetPath of mod.assets.keys()) {
        this.unloadAsset(modId, assetPath);
      }

      if (mod.sandbox) {
        mod.sandbox.destroy();
        this.sandboxes.delete(modId);
      }

      mod.state = ModState.UNLOADED;
      this.loadedMods.delete(modId);
      this.loadPromises.delete(modId);

      this.emit('mod_unloaded', modId);
      return true;
    } catch (error) {
      mod.state = ModState.ERROR;
      this.emit('mod_unload_error', modId, error);
      throw error;
    }
  }

  public async reloadMod(modId: string): Promise<boolean> {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      return false;
    }

    const modPath = path.join(this.modsDirectory, modId);

    try {
      await this.unloadMod(modId);
      await this.loadMod(modPath);
      return true;
    } catch (error) {
      this.emit('mod_reload_error', modId, error);
      throw error;
    }
  }

  public validateMod(metadata: ModMetadata): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push({
        code: 'INVALID_ID',
        message: 'Mod ID is required and must be a string',
        field: 'id',
        value: metadata.id
      });
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push({
        code: 'INVALID_NAME',
        message: 'Mod name is required and must be a string',
        field: 'name',
        value: metadata.name
      });
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push({
        code: 'INVALID_VERSION',
        message: 'Mod version is required and must be a string',
        field: 'version',
        value: metadata.version
      });
    }

    if (!metadata.entryPoint || typeof metadata.entryPoint !== 'string') {
      errors.push({
        code: 'INVALID_ENTRY_POINT',
        message: 'Mod entry point is required and must be a string',
        field: 'entryPoint',
        value: metadata.entryPoint
      });
    }

    if (!metadata.author || typeof metadata.author !== 'string') {
      warnings.push({
        code: 'MISSING_AUTHOR',
        message: 'Mod author is recommended',
        field: 'author',
        value: metadata.author,
        severity: 'low'
      });
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Mod description is recommended',
        field: 'description',
        value: metadata.description,
        severity: 'low'
      });
    }

    if (metadata.permissions && metadata.permissions.length > 0) {
      const dangerousPermissions = metadata.permissions.filter(p =>
        p.type === PermissionType.PROCESS_SPAWN ||
        p.type === PermissionType.NATIVE_MODULE ||
        p.type === PermissionType.FILE_WRITE
      );

      if (dangerousPermissions.length > 0) {
        warnings.push({
          code: 'DANGEROUS_PERMISSIONS',
          message: `Mod requests dangerous permissions: ${dangerousPermissions.map(p => p.type).join(', ')}`,
          field: 'permissions',
          value: dangerousPermissions,
          severity: 'high'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  public resolveDependencies(mods: ModMetadata[]): ModMetadata[] {
    const modMap = new Map<string, ModMetadata>();
    const resolved: ModMetadata[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    for (const mod of mods) {
      modMap.set(mod.id, mod);
    }

    const visit = (modId: string): void => {
      if (visited.has(modId)) return;
      if (visiting.has(modId)) {
        throw new Error(`Circular dependency detected involving mod: ${modId}`);
      }

      const mod = modMap.get(modId);
      if (!mod) {
        throw new Error(`Dependency not found: ${modId}`);
      }

      visiting.add(modId);

      for (const dep of mod.dependencies) {
        if (!dep.optional) {
          visit(dep.id);
        }
      }

      visiting.delete(modId);
      visited.add(modId);
      resolved.push(mod);
    };

    for (const mod of mods) {
      visit(mod.id);
    }

    return resolved;
  }

  public detectConflicts(mods: ModMetadata[]): ModConflict[] {
    const conflicts: ModConflict[] = [];
    const modIds = new Set<string>();

    for (const mod of mods) {
      if (modIds.has(mod.id)) {
        conflicts.push({
          type: ConflictType.DUPLICATE_ID,
          mods: [mod.id],
          description: `Duplicate mod ID: ${mod.id}`,
          severity: ConflictSeverity.ERROR
        });
      }
      modIds.add(mod.id);

      for (const dep of mod.dependencies) {
        if (!dep.optional && !mods.find(m => m.id === dep.id)) {
          conflicts.push({
            type: ConflictType.MISSING_DEPENDENCY,
            mods: [mod.id, dep.id],
            description: `Missing dependency: ${mod.id} requires ${dep.id}`,
            severity: ConflictSeverity.ERROR
          });
        }
      }

      if (mod.conflicts) {
        for (const conflictId of mod.conflicts) {
          if (mods.find(m => m.id === conflictId)) {
            conflicts.push({
              type: ConflictType.RESOURCE_CONFLICT,
              mods: [mod.id, conflictId],
              description: `Resource conflict between ${mod.id} and ${conflictId}`,
              severity: ConflictSeverity.WARNING
            });
          }
        }
      }
    }

    return conflicts;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  public getLoadedMods(): ModInstance[] {
    return Array.from(this.loadedMods.values());
  }

  public getLoadedMod(modId: string): ModInstance | undefined {
    return this.loadedMods.get(modId);
  }

  public isModLoaded(modId: string): boolean {
    return this.loadedMods.has(modId);
  }

  public async unloadAllMods(): Promise<void> {
    const modIds = Array.from(this.loadedMods.keys());

    for (const modId of modIds) {
      try {
        await this.unloadMod(modId);
      } catch (error) {
        this.emit('mod_unload_error', modId, error);
      }
    }
  }

  public destroy(): void {
    this.unloadAllMods();
    this.removeAllListeners();
  }
}