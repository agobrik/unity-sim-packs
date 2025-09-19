import { ModManager } from '../src/core/ModManager';
import { ModRegistry } from '../src/registry/ModRegistry';
import { ModLoader } from '../src/loader/ModLoader';
import { ModState, ModCategory, PermissionType } from '../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');
jest.mock('chokidar');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ModManager', () => {
  let modManager: ModManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = '/tmp/test-mods';

    const config = {
      modsDirectory: tempDir,
      enableHotReload: false,
      sandboxMods: true,
      allowNativeModules: false,
      maxMemoryPerMod: 100 * 1024 * 1024,
      loadTimeout: 5000,
      enableMetrics: true,
      hotReload: {
        enabled: false,
        watchPaths: [],
        ignored: [],
        debounceMs: 1000,
        reloadDependents: true,
        backupOnReload: false
      },
      permissions: {
        requireExplicitGrant: true,
        autoGrantSafe: false,
        denyDangerous: true,
        promptUser: false
      },
      logging: {
        level: 'info' as any,
        enableFileLogging: false,
        logDirectory: '/tmp/logs',
        maxLogFiles: 10,
        maxLogSize: 10 * 1024 * 1024
      }
    };

    modManager = new ModManager(config);
  });

  afterEach(async () => {
    await modManager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(modManager).toBeInstanceOf(ModManager);
      expect(modManager.getRegistry()).toBeInstanceOf(ModRegistry);
      expect(modManager.getLoader()).toBeInstanceOf(ModLoader);
    });

    it('should discover mods on startup', async () => {
      mockFs.readdir.mockResolvedValue([
        { name: 'mod1', isDirectory: () => true } as any,
        { name: 'mod2', isDirectory: () => true } as any,
        { name: 'file.txt', isDirectory: () => false } as any
      ]);

      mockFs.access.mockResolvedValue(undefined);

      const discoveredMods = await modManager.discoverMods();
      expect(discoveredMods).toHaveLength(2);
    });
  });

  describe('mod lifecycle', () => {
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

    beforeEach(() => {
      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify(mockModMetadata));
        }
        if (filePath.endsWith('index.js')) {
          return Promise.resolve(`
            module.exports = {
              initialize: async (context) => {
                context.logger.info('Test mod initialized');
              },
              cleanup: async () => {
                console.log('Test mod cleaned up');
              }
            };
          `);
        }
        return Promise.reject(new Error('File not found'));
      });

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mtime: new Date()
      } as any);
    });

    it('should load a mod successfully', async () => {
      const modPath = path.join(tempDir, 'test-mod');
      const mod = await modManager.loadMod(modPath);

      expect(mod).toBeDefined();
      expect(mod.metadata.id).toBe('test-mod');
      expect(mod.state).toBe(ModState.ACTIVE);
      expect(modManager.isModLoaded('test-mod')).toBe(true);
    });

    it('should unload a mod successfully', async () => {
      const modPath = path.join(tempDir, 'test-mod');
      await modManager.loadMod(modPath);

      const result = await modManager.unloadMod('test-mod');
      expect(result).toBe(true);
      expect(modManager.isModLoaded('test-mod')).toBe(false);
    });

    it('should reload a mod successfully', async () => {
      const modPath = path.join(tempDir, 'test-mod');
      await modManager.loadMod(modPath);

      const result = await modManager.reloadMod('test-mod');
      expect(result).toBe(true);
      expect(modManager.isModLoaded('test-mod')).toBe(true);
    });

    it('should enable and disable mods', async () => {
      const modPath = path.join(tempDir, 'test-mod');
      const mod = await modManager.loadMod(modPath);

      await modManager.disableMod('test-mod');
      expect(mod.state).toBe(ModState.DISABLED);

      await modManager.enableMod('test-mod');
      expect(mod.state).toBe(ModState.ACTIVE);
    });
  });

  describe('dependency management', () => {
    it('should resolve dependencies correctly', async () => {
      const mod1Metadata = {
        id: 'mod1',
        name: 'Mod 1',
        version: '1.0.0',
        description: 'First mod',
        author: 'Test',
        tags: [],
        category: ModCategory.LIBRARY,
        compatibility: { gameVersion: '1.0.0', frameworkVersion: '1.0.0' },
        dependencies: [],
        entryPoint: 'index.js',
        permissions: []
      };

      const mod2Metadata = {
        id: 'mod2',
        name: 'Mod 2',
        version: '1.0.0',
        description: 'Second mod',
        author: 'Test',
        tags: [],
        category: ModCategory.CONTENT,
        compatibility: { gameVersion: '1.0.0', frameworkVersion: '1.0.0' },
        dependencies: [{ id: 'mod1', version: '1.0.0' }],
        entryPoint: 'index.js',
        permissions: []
      };

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('mod1') && filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify(mod1Metadata));
        }
        if (filePath.includes('mod2') && filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify(mod2Metadata));
        }
        if (filePath.endsWith('index.js')) {
          return Promise.resolve('module.exports = { initialize: async () => {} };');
        }
        return Promise.reject(new Error('File not found'));
      });

      await modManager.loadMod(path.join(tempDir, 'mod1'));
      await modManager.loadMod(path.join(tempDir, 'mod2'));

      const resolved = modManager.resolveDependencies(['mod1', 'mod2']);
      expect(resolved[0]).toBe('mod1'); // Should be loaded first
      expect(resolved[1]).toBe('mod2'); // Should be loaded second
    });

    it('should detect circular dependencies', () => {
      const mod1Metadata = {
        id: 'mod1',
        dependencies: [{ id: 'mod2', version: '1.0.0' }]
      };

      const mod2Metadata = {
        id: 'mod2',
        dependencies: [{ id: 'mod1', version: '1.0.0' }]
      };

      expect(() => {
        modManager.getLoader().resolveDependencies([mod1Metadata as any, mod2Metadata as any]);
      }).toThrow('Circular dependency detected');
    });
  });

  describe('hot reloading', () => {
    it('should setup hot reload watchers when enabled', async () => {
      const hotReloadConfig = {
        modsDirectory: tempDir,
        enableHotReload: true,
        sandboxMods: true,
        allowNativeModules: false,
        maxMemoryPerMod: 100 * 1024 * 1024,
        loadTimeout: 5000,
        enableMetrics: true,
        hotReload: {
          enabled: true,
          watchPaths: [tempDir],
          ignored: ['node_modules'],
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
          enableFileLogging: false,
          logDirectory: '/tmp/logs',
          maxLogFiles: 10,
          maxLogSize: 10 * 1024 * 1024
        }
      };

      const hotReloadManager = new ModManager(hotReloadConfig);
      await hotReloadManager.initialize();

      // Should not throw
      expect(hotReloadManager).toBeDefined();

      await hotReloadManager.shutdown();
    });
  });

  describe('permission management', () => {
    it('should validate mod permissions', async () => {
      const modMetadata = {
        id: 'dangerous-mod',
        name: 'Dangerous Mod',
        version: '1.0.0',
        description: 'A mod with dangerous permissions',
        author: 'Test',
        tags: [],
        category: ModCategory.TOOLS,
        compatibility: { gameVersion: '1.0.0', frameworkVersion: '1.0.0' },
        dependencies: [],
        entryPoint: 'index.js',
        permissions: [
          {
            type: PermissionType.PROCESS_SPAWN,
            description: 'Spawn processes',
            required: true
          }
        ]
      };

      const validation = modManager.getLoader().validateMod(modMetadata);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0].code).toBe('DANGEROUS_PERMISSIONS');
    });
  });

  describe('metrics and monitoring', () => {
    it('should track mod metrics', async () => {
      const modPath = path.join(tempDir, 'test-mod');

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'test-mod',
            name: 'Test Mod',
            version: '1.0.0',
            description: 'Test',
            author: 'Test',
            tags: [],
            category: ModCategory.CONTENT,
            compatibility: { gameVersion: '1.0.0', frameworkVersion: '1.0.0' },
            dependencies: [],
            entryPoint: 'index.js',
            permissions: []
          }));
        }
        return Promise.resolve('module.exports = { initialize: async () => {} };');
      });

      await modManager.loadMod(modPath);
      const metrics = modManager.getModMetrics('test-mod');

      expect(metrics).toBeDefined();
      expect(metrics?.loadTime).toBeGreaterThan(0);
    });

    it('should perform health checks', async () => {
      const modPath = path.join(tempDir, 'test-mod');

      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'test-mod',
            name: 'Test Mod',
            version: '1.0.0',
            description: 'Test',
            author: 'Test',
            tags: [],
            category: ModCategory.CONTENT,
            compatibility: { gameVersion: '1.0.0', frameworkVersion: '1.0.0' },
            dependencies: [],
            entryPoint: 'index.js',
            permissions: []
          }));
        }
        return Promise.resolve('module.exports = { initialize: async () => {} };');
      });

      await modManager.loadMod(modPath);
      const healthCheck = await modManager.performHealthCheck('test-mod');

      expect(healthCheck).toBeDefined();
      expect(healthCheck.modId).toBe('test-mod');
    });
  });

  describe('profiles', () => {
    it('should create and manage profiles', async () => {
      const profile = await modManager.createProfile('test-profile', 'Test Profile', ['mod1', 'mod2']);

      expect(profile).toBeDefined();
      expect(profile.name).toBe('Test Profile');
      expect(profile.mods).toEqual(['mod1', 'mod2']);

      const profiles = modManager.getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe('test-profile');
    });

    it('should activate profiles', async () => {
      await modManager.createProfile('test-profile', 'Test Profile', []);
      const result = await modManager.activateProfile('test-profile');

      expect(result).toBe(true);

      const activeProfile = modManager.getActiveProfile();
      expect(activeProfile?.id).toBe('test-profile');
    });
  });

  describe('error handling', () => {
    it('should handle mod loading errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(modManager.loadMod('/nonexistent/mod')).rejects.toThrow();
      expect(modManager.isModLoaded('nonexistent-mod')).toBe(false);
    });

    it('should handle invalid mod metadata', async () => {
      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.endsWith('mod.json')) {
          return Promise.resolve('invalid json');
        }
        return Promise.resolve('module.exports = {};');
      });

      await expect(modManager.loadMod('/invalid/mod')).rejects.toThrow();
    });
  });
});