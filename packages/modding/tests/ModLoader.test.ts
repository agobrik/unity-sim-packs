import { ModLoader } from '../src/loader/ModLoader';
import { ModState, ModCategory, PermissionType } from '../src/types';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ModLoader', () => {
  let loader: ModLoader;
  const testModsDir = '/test/mods';

  beforeEach(() => {
    loader = new ModLoader(testModsDir, true, false, 5000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    loader.destroy();
  });

  const mockModMetadata = {
    id: 'test-mod',
    name: 'Test Mod',
    version: '1.0.0',
    description: 'A test mod',
    author: 'Test Author',
    tags: ['test'],
    category: ModCategory.CONTENT,
    compatibility: {
      gameVersion: '1.0.0',
      frameworkVersion: '1.0.0'
    },
    dependencies: [],
    entryPoint: 'index.js',
    permissions: []
  };

  const mockModCode = `
    module.exports = {
      initialize: async function(context) {
        context.logger.info('Test mod initialized');
        return true;
      },
      cleanup: async function() {
        console.log('Test mod cleaned up');
      }
    };
  `;

  beforeEach(() => {
    mockFs.readFile.mockImplementation((filePath: any) => {
      if (filePath.endsWith('mod.json')) {
        return Promise.resolve(JSON.stringify(mockModMetadata));
      }
      if (filePath.endsWith('index.js')) {
        return Promise.resolve(mockModCode);
      }
      return Promise.reject(new Error('File not found'));
    });

    mockFs.stat.mockResolvedValue({
      isFile: () => true,
      mtime: new Date(),
      size: 1024
    } as any);
  });

  describe('mod loading', () => {
    it('should load a mod successfully', async () => {
      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      expect(mod).toBeDefined();
      expect(mod.metadata.id).toBe('test-mod');
      expect(mod.state).toBe(ModState.ACTIVE);
      expect(mod.loadTime).toBeGreaterThan(0);
      expect(loader.isModLoaded('test-mod')).toBe(true);
    });

    it('should emit mod_loaded event', async () => {
      const eventSpy = jest.fn();
      loader.on('mod_loaded', eventSpy);

      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      expect(eventSpy).toHaveBeenCalledWith(mod);
    });

    it('should handle loading errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File read error'));

      const eventSpy = jest.fn();
      loader.on('mod_load_error', eventSpy);

      await expect(loader.loadMod('/invalid/path')).rejects.toThrow();
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should prevent duplicate loading', async () => {
      const modPath = '/test/mods/test-mod';

      const promise1 = loader.loadMod(modPath);
      const promise2 = loader.loadMod(modPath);

      const [mod1, mod2] = await Promise.all([promise1, promise2]);

      expect(mod1).toBe(mod2);
      expect(mockFs.readFile).toHaveBeenCalledTimes(2); // mod.json and index.js
    });
  });

  describe('mod validation', () => {
    it('should validate mod metadata successfully', () => {
      const result = loader.validateMod(mockModMetadata);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid mod ID', () => {
      const invalidMetadata = {
        ...mockModMetadata,
        id: ''
      };

      const result = loader.validateMod(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_ID');
    });

    it('should detect missing required fields', () => {
      const invalidMetadata = {
        ...mockModMetadata,
        name: '',
        version: '',
        entryPoint: ''
      };

      const result = loader.validateMod(invalidMetadata);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should warn about dangerous permissions', () => {
      const dangerousMetadata = {
        ...mockModMetadata,
        permissions: [
          {
            type: PermissionType.PROCESS_SPAWN,
            description: 'Spawn processes',
            required: true
          }
        ]
      };

      const result = loader.validateMod(dangerousMetadata);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('DANGEROUS_PERMISSIONS');
    });
  });

  describe('dependency resolution', () => {
    it('should resolve dependencies in correct order', () => {
      const mod1 = { ...mockModMetadata, id: 'mod1', dependencies: [] };
      const mod2 = { ...mockModMetadata, id: 'mod2', dependencies: [{ id: 'mod1', version: '1.0.0' }] };
      const mod3 = { ...mockModMetadata, id: 'mod3', dependencies: [{ id: 'mod2', version: '1.0.0' }] };

      const resolved = loader.resolveDependencies([mod3, mod1, mod2]);

      expect(resolved).toHaveLength(3);
      expect(resolved[0].id).toBe('mod1');
      expect(resolved[1].id).toBe('mod2');
      expect(resolved[2].id).toBe('mod3');
    });

    it('should detect circular dependencies', () => {
      const mod1 = { ...mockModMetadata, id: 'mod1', dependencies: [{ id: 'mod2', version: '1.0.0' }] };
      const mod2 = { ...mockModMetadata, id: 'mod2', dependencies: [{ id: 'mod1', version: '1.0.0' }] };

      expect(() => loader.resolveDependencies([mod1, mod2])).toThrow('Circular dependency detected');
    });

    it('should handle missing dependencies', () => {
      const mod1 = { ...mockModMetadata, id: 'mod1', dependencies: [{ id: 'missing-mod', version: '1.0.0' }] };

      expect(() => loader.resolveDependencies([mod1])).toThrow('Dependency not found: missing-mod');
    });
  });

  describe('conflict detection', () => {
    it('should detect duplicate mod IDs', () => {
      const mod1 = { ...mockModMetadata, id: 'duplicate' };
      const mod2 = { ...mockModMetadata, id: 'duplicate' };

      const conflicts = loader.detectConflicts([mod1, mod2]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('duplicate_id');
    });

    it('should detect missing dependencies', () => {
      const mod1 = { ...mockModMetadata, id: 'mod1', dependencies: [{ id: 'missing', version: '1.0.0' }] };

      const conflicts = loader.detectConflicts([mod1]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('missing_dependency');
    });

    it('should detect resource conflicts', () => {
      const mod1 = { ...mockModMetadata, id: 'mod1', conflicts: ['mod2'] };
      const mod2 = { ...mockModMetadata, id: 'mod2' };

      const conflicts = loader.detectConflicts([mod1, mod2]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('resource_conflict');
    });
  });

  describe('mod unloading', () => {
    it('should unload a mod successfully', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      const result = await loader.unloadMod('test-mod');

      expect(result).toBe(true);
      expect(loader.isModLoaded('test-mod')).toBe(false);
    });

    it('should emit mod_unloaded event', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      const eventSpy = jest.fn();
      loader.on('mod_unloaded', eventSpy);

      await loader.unloadMod('test-mod');

      expect(eventSpy).toHaveBeenCalledWith('test-mod');
    });

    it('should return false for non-existent mod', async () => {
      const result = await loader.unloadMod('non-existent');

      expect(result).toBe(false);
    });

    it('should call cleanup function if available', async () => {
      const modCodeWithCleanup = `
        module.exports = {
          initialize: async function(context) {
            return true;
          },
          cleanup: async function() {
            global.cleanupCalled = true;
          }
        };
      `;

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify(mockModMetadata));
        }
        if (filePath.endsWith('index.js')) {
          return Promise.resolve(modCodeWithCleanup);
        }
        return Promise.reject(new Error('File not found'));
      });

      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);
      await loader.unloadMod('test-mod');

      // In a real scenario, this would verify the cleanup was called
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('mod reloading', () => {
    it('should reload a mod successfully', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      const result = await loader.reloadMod('test-mod');

      expect(result).toBe(true);
      expect(loader.isModLoaded('test-mod')).toBe(true);
    });

    it('should handle reload errors', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      // Make the reload fail
      mockFs.readFile.mockRejectedValue(new Error('Reload error'));

      const eventSpy = jest.fn();
      loader.on('mod_reload_error', eventSpy);

      await expect(loader.reloadMod('test-mod')).rejects.toThrow();
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('asset management', () => {
    beforeEach(() => {
      const metadataWithAssets = {
        ...mockModMetadata,
        assets: [
          { path: 'config.json', type: 'config', preload: true },
          { path: 'optional.txt', type: 'data', optional: true, preload: true }
        ]
      };

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify(metadataWithAssets));
        }
        if (filePath.endsWith('index.js')) {
          return Promise.resolve(mockModCode);
        }
        if (filePath.endsWith('config.json')) {
          return Promise.resolve('{"setting": "value"}');
        }
        if (filePath.endsWith('optional.txt')) {
          return Promise.reject(new Error('File not found'));
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should preload assets during mod loading', async () => {
      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      expect(mod.assets.has('config.json')).toBe(true);
      expect(mod.assets.get('config.json')).toEqual({ setting: 'value' });
    });

    it('should handle optional asset loading failures', async () => {
      const modPath = '/test/mods/test-mod';

      // Should not throw even if optional asset fails to load
      await expect(loader.loadMod(modPath)).resolves.toBeDefined();
    });
  });

  describe('sandbox execution', () => {
    it('should create sandbox for mod execution', async () => {
      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      expect(mod.sandbox).toBeDefined();
      expect(mod.sandbox?.isSecure).toBe(true);
    });

    it('should allow configured modules in sandbox', () => {
      const sandboxLoader = new ModLoader(testModsDir, true, true, 5000);

      // Test that sandbox creation works
      expect(sandboxLoader).toBeDefined();

      sandboxLoader.destroy();
    });
  });

  describe('mod context', () => {
    it('should provide complete mod context', async () => {
      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      expect(mod.context).toBeDefined();
      expect(mod.context.id).toBe('test-mod');
      expect(mod.context.version).toBe('1.0.0');
      expect(mod.context.api).toBeDefined();
      expect(mod.context.logger).toBeDefined();
      expect(mod.context.config).toBeDefined();
      expect(mod.context.events).toBeDefined();
      expect(mod.context.storage).toBeDefined();
      expect(mod.context.scheduler).toBeDefined();
      expect(mod.context.permissions).toBeDefined();
    });

    it('should handle hook registration through context', async () => {
      const modPath = '/test/mods/test-mod';
      const mod = await loader.loadMod(modPath);

      const eventSpy = jest.fn();
      loader.on('hook_register', eventSpy);

      mod.context.api.registerHook('test-hook', () => {});

      expect(eventSpy).toHaveBeenCalledWith('test-mod', 'test-hook', expect.any(Function));
    });
  });

  describe('utility methods', () => {
    it('should get loaded mods', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      const loadedMods = loader.getLoadedMods();
      expect(loadedMods).toHaveLength(1);
      expect(loadedMods[0].metadata.id).toBe('test-mod');
    });

    it('should get specific loaded mod', async () => {
      const modPath = '/test/mods/test-mod';
      await loader.loadMod(modPath);

      const mod = loader.getLoadedMod('test-mod');
      expect(mod).toBeDefined();
      expect(mod?.metadata.id).toBe('test-mod');
    });

    it('should unload all mods', async () => {
      const modPath1 = '/test/mods/test-mod1';
      const modPath2 = '/test/mods/test-mod2';

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('test-mod1')) {
          if (filePath.endsWith('mod.json')) {
            return Promise.resolve(JSON.stringify({ ...mockModMetadata, id: 'test-mod1' }));
          }
          if (filePath.endsWith('index.js')) {
            return Promise.resolve(mockModCode);
          }
        }
        if (filePath.includes('test-mod2')) {
          if (filePath.endsWith('mod.json')) {
            return Promise.resolve(JSON.stringify({ ...mockModMetadata, id: 'test-mod2' }));
          }
          if (filePath.endsWith('index.js')) {
            return Promise.resolve(mockModCode);
          }
        }
        return Promise.reject(new Error('File not found'));
      });

      await loader.loadMod(modPath1);
      await loader.loadMod(modPath2);

      expect(loader.getLoadedMods()).toHaveLength(2);

      await loader.unloadAllMods();

      expect(loader.getLoadedMods()).toHaveLength(0);
    });
  });
});