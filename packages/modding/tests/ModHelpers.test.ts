import { ModHelpers } from '../src/utils/ModHelpers';
import { ModInstance, ModState, ModCategory, PermissionType } from '../src/types';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ModHelpers', () => {
  const createMockMod = (id: string, overrides: Partial<ModInstance> = {}): ModInstance => ({
    metadata: {
      id,
      name: `Test Mod ${id}`,
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
    },
    module: {},
    context: {} as any,
    state: ModState.LOADED,
    config: {},
    loadTime: 100,
    lastModified: Date.now(),
    dependencies: new Set(),
    dependents: new Set(),
    assets: new Map(),
    hooks: new Map(),
    ...overrides
  });

  describe('validation methods', () => {
    describe('validateModId', () => {
      it('should validate correct mod IDs', () => {
        expect(ModHelpers.validateModId('valid-mod-id')).toBe(true);
        expect(ModHelpers.validateModId('valid_mod_123')).toBe(true);
        expect(ModHelpers.validateModId('ValidMod')).toBe(true);
      });

      it('should reject invalid mod IDs', () => {
        expect(ModHelpers.validateModId('')).toBe(false);
        expect(ModHelpers.validateModId('ab')).toBe(false); // Too short
        expect(ModHelpers.validateModId('a'.repeat(51))).toBe(false); // Too long
        expect(ModHelpers.validateModId('invalid@mod')).toBe(false); // Invalid character
        expect(ModHelpers.validateModId('invalid mod')).toBe(false); // Space
      });
    });

    describe('validateVersion', () => {
      it('should validate correct versions', () => {
        expect(ModHelpers.validateVersion('1.0.0')).toBe(true);
        expect(ModHelpers.validateVersion('10.20.30')).toBe(true);
        expect(ModHelpers.validateVersion('1.0.0-alpha')).toBe(true);
        expect(ModHelpers.validateVersion('2.1.0-beta-1')).toBe(true);
      });

      it('should reject invalid versions', () => {
        expect(ModHelpers.validateVersion('1.0')).toBe(false);
        expect(ModHelpers.validateVersion('1.0.0.0')).toBe(false);
        expect(ModHelpers.validateVersion('v1.0.0')).toBe(false);
        expect(ModHelpers.validateVersion('invalid')).toBe(false);
      });
    });
  });

  describe('version comparison', () => {
    describe('compareVersions', () => {
      it('should compare versions correctly', () => {
        expect(ModHelpers.compareVersions('1.0.0', '1.0.0')).toBe(0);
        expect(ModHelpers.compareVersions('1.0.1', '1.0.0')).toBe(1);
        expect(ModHelpers.compareVersions('1.0.0', '1.0.1')).toBe(-1);
        expect(ModHelpers.compareVersions('2.0.0', '1.9.9')).toBe(1);
        expect(ModHelpers.compareVersions('1.2.0', '1.10.0')).toBe(-1);
      });
    });

    describe('isVersionCompatible', () => {
      it('should check exact version compatibility', () => {
        expect(ModHelpers.isVersionCompatible('1.0.0', '1.0.0')).toBe(true);
        expect(ModHelpers.isVersionCompatible('1.0.0', '1.0.1')).toBe(false);
      });

      it('should check caret version compatibility', () => {
        expect(ModHelpers.isVersionCompatible('^1.0.0', '1.0.0')).toBe(true);
        expect(ModHelpers.isVersionCompatible('^1.0.0', '1.0.1')).toBe(true);
        expect(ModHelpers.isVersionCompatible('^1.0.0', '1.1.0')).toBe(true);
        expect(ModHelpers.isVersionCompatible('^1.0.0', '2.0.0')).toBe(false);
      });

      it('should check tilde version compatibility', () => {
        expect(ModHelpers.isVersionCompatible('~1.0.0', '1.0.0')).toBe(true);
        expect(ModHelpers.isVersionCompatible('~1.0.0', '1.0.1')).toBe(true);
        expect(ModHelpers.isVersionCompatible('~1.0.0', '1.1.0')).toBe(false);
      });
    });
  });

  describe('utility methods', () => {
    describe('generateModId', () => {
      it('should generate valid mod IDs from names', () => {
        expect(ModHelpers.generateModId('My Awesome Mod')).toBe('my-awesome-mod');
        expect(ModHelpers.generateModId('Super@Cool#Mod!')).toBe('super-cool-mod');
        expect(ModHelpers.generateModId('Multiple---Dashes')).toBe('multiple-dashes');
        expect(ModHelpers.generateModId('-Leading-Trailing-')).toBe('leading-trailing');
      });

      it('should truncate long names', () => {
        const longName = 'a'.repeat(60);
        const result = ModHelpers.generateModId(longName);
        expect(result.length).toBeLessThanOrEqual(50);
      });
    });

    describe('sanitizeModName', () => {
      it('should remove invalid characters from mod names', () => {
        expect(ModHelpers.sanitizeModName('Valid Name')).toBe('Valid Name');
        expect(ModHelpers.sanitizeModName('Invalid<>Name')).toBe('InvalidName');
        expect(ModHelpers.sanitizeModName(' Name With Spaces ')).toBe('Name With Spaces');
      });
    });

    describe('getModPriority', () => {
      it('should calculate mod priority correctly', () => {
        const frameworkMod = createMockMod('framework', {
          metadata: {
            ...createMockMod('framework').metadata,
            category: ModCategory.FRAMEWORK,
            loadOrder: 10
          }
        });

        const libraryMod = createMockMod('library', {
          metadata: {
            ...createMockMod('library').metadata,
            category: ModCategory.LIBRARY,
            loadOrder: 5
          }
        });

        const contentMod = createMockMod('content', {
          metadata: {
            ...createMockMod('content').metadata,
            category: ModCategory.CONTENT,
            loadOrder: 1
          }
        });

        expect(ModHelpers.getModPriority(frameworkMod)).toBeGreaterThan(ModHelpers.getModPriority(libraryMod));
        expect(ModHelpers.getModPriority(libraryMod)).toBeGreaterThan(ModHelpers.getModPriority(contentMod));
      });
    });
  });

  describe('file system operations', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('discoverMods', () => {
      it('should discover mods in directory', async () => {
        mockFs.readdir.mockResolvedValue([
          { name: 'mod1', isDirectory: () => true } as any,
          { name: 'mod2', isDirectory: () => true } as any,
          { name: 'file.txt', isDirectory: () => false } as any,
          { name: 'mod3', isDirectory: () => true } as any
        ]);

        mockFs.access.mockImplementation((path: any) => {
          if (path.includes('mod3')) {
            return Promise.reject(new Error('No mod.json'));
          }
          return Promise.resolve();
        });

        const modPaths = await ModHelpers.discoverMods('/test/mods');

        expect(modPaths).toHaveLength(2);
        expect(modPaths).toContain('/test/mods/mod1');
        expect(modPaths).toContain('/test/mods/mod2');
      });

      it('should handle directory read errors', async () => {
        mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

        await expect(ModHelpers.discoverMods('/invalid/path')).rejects.toThrow('Failed to discover mods');
      });
    });

    describe('createModTemplate', () => {
      it('should create mod template', async () => {
        mockFs.mkdir.mockResolvedValue(undefined);
        mockFs.writeFile.mockResolvedValue(undefined);

        await ModHelpers.createModTemplate('/test/mods', {
          id: 'new-mod',
          name: 'New Mod',
          version: '1.0.0',
          author: 'Test Author',
          description: 'A new mod',
          category: 'content'
        });

        expect(mockFs.mkdir).toHaveBeenCalledWith('/test/mods/new-mod', { recursive: true });
        expect(mockFs.writeFile).toHaveBeenCalledTimes(3); // mod.json, index.js, README.md
      });
    });

    describe('calculateModSize', () => {
      it('should calculate directory size', async () => {
        mockFs.readdir.mockResolvedValue([
          { name: 'file1.js', isDirectory: () => false } as any,
          { name: 'file2.txt', isDirectory: () => false } as any,
          { name: 'subdir', isDirectory: () => true } as any
        ]);

        mockFs.stat.mockImplementation((path: any) => {
          if (path.endsWith('file1.js')) {
            return Promise.resolve({ size: 1000 } as any);
          }
          if (path.endsWith('file2.txt')) {
            return Promise.resolve({ size: 500 } as any);
          }
          return Promise.resolve({ size: 0 } as any);
        });

        // Mock recursive call for subdirectory
        mockFs.readdir.mockImplementation((path: any) => {
          if (path.endsWith('subdir')) {
            return Promise.resolve([
              { name: 'file3.js', isDirectory: () => false } as any
            ]);
          }
          return Promise.resolve([
            { name: 'file1.js', isDirectory: () => false } as any,
            { name: 'file2.txt', isDirectory: () => false } as any,
            { name: 'subdir', isDirectory: () => true } as any
          ]);
        });

        const size = await ModHelpers.calculateModSize('/test/mod');
        expect(size).toBeGreaterThan(0);
      });
    });
  });

  describe('security methods', () => {
    describe('isModSecure', () => {
      it('should identify secure mods', () => {
        const secureMod = createMockMod('secure', {
          metadata: {
            ...createMockMod('secure').metadata,
            permissions: [
              {
                type: PermissionType.FILE_READ,
                description: 'Read files',
                required: true
              }
            ]
          }
        });

        expect(ModHelpers.isModSecure(secureMod)).toBe(true);
      });

      it('should identify insecure mods', () => {
        const insecureMod = createMockMod('insecure', {
          metadata: {
            ...createMockMod('insecure').metadata,
            permissions: [
              {
                type: PermissionType.PROCESS_SPAWN,
                description: 'Spawn processes',
                required: true
              }
            ]
          }
        });

        expect(ModHelpers.isModSecure(insecureMod)).toBe(false);
      });
    });

    describe('getModRisks', () => {
      it('should identify mod risks', () => {
        const riskyMod = createMockMod('risky', {
          metadata: {
            ...createMockMod('risky').metadata,
            permissions: [
              {
                type: PermissionType.PROCESS_SPAWN,
                description: 'Spawn processes',
                required: true
              },
              {
                type: PermissionType.FILE_WRITE,
                description: 'Write files',
                required: true
              }
            ]
          },
          sandbox: {
            isSecure: false,
            execute: () => {},
            createContext: () => ({}),
            destroy: () => {},
            allowedModules: [],
            blockedModules: []
          }
        });

        const risks = ModHelpers.getModRisks(riskyMod);
        expect(risks).toContain('Can execute external processes');
        expect(risks).toContain('Can write files to disk');
        expect(risks).toContain('Runs without sandbox protection');
      });
    });
  });

  describe('helper methods', () => {
    describe('formatSize', () => {
      it('should format file sizes correctly', () => {
        expect(ModHelpers.formatSize(512)).toBe('512 B');
        expect(ModHelpers.formatSize(1024)).toBe('1.0 KB');
        expect(ModHelpers.formatSize(1536)).toBe('1.5 KB');
        expect(ModHelpers.formatSize(1048576)).toBe('1.0 MB');
        expect(ModHelpers.formatSize(1073741824)).toBe('1.0 GB');
      });
    });

    describe('createModFingerprint', () => {
      it('should create consistent fingerprints', () => {
        const mod = createMockMod('test');
        const fingerprint1 = ModHelpers.createModFingerprint(mod);
        const fingerprint2 = ModHelpers.createModFingerprint(mod);

        expect(fingerprint1).toBe(fingerprint2);
        expect(fingerprint1).toMatch(/^[a-f0-9]+$/);
      });

      it('should create different fingerprints for different mods', () => {
        const mod1 = createMockMod('test1');
        const mod2 = createMockMod('test2');

        const fingerprint1 = ModHelpers.createModFingerprint(mod1);
        const fingerprint2 = ModHelpers.createModFingerprint(mod2);

        expect(fingerprint1).not.toBe(fingerprint2);
      });
    });

    describe('extractDependencies', () => {
      it('should extract required dependencies', () => {
        const mod = createMockMod('test', {
          metadata: {
            ...createMockMod('test').metadata,
            dependencies: [
              { id: 'dep1', version: '1.0.0', optional: false },
              { id: 'dep2', version: '2.0.0', optional: true },
              { id: 'dep3', version: '3.0.0' }
            ]
          }
        });

        const required = ModHelpers.extractDependencies(mod);
        expect(required).toHaveLength(2);
        expect(required.map(d => d.id)).toContain('dep1');
        expect(required.map(d => d.id)).toContain('dep3');
      });

      it('should extract optional dependencies', () => {
        const mod = createMockMod('test', {
          metadata: {
            ...createMockMod('test').metadata,
            dependencies: [
              { id: 'dep1', version: '1.0.0', optional: false },
              { id: 'dep2', version: '2.0.0', optional: true }
            ]
          }
        });

        const optional = ModHelpers.extractOptionalDependencies(mod);
        expect(optional).toHaveLength(1);
        expect(optional[0].id).toBe('dep2');
      });
    });

    describe('parseModMetadata', () => {
      it('should parse valid metadata', () => {
        const metadataJson = JSON.stringify({
          id: 'test-mod',
          name: 'Test Mod',
          version: '1.0.0',
          entryPoint: 'index.js'
        });

        const metadata = ModHelpers.parseModMetadata(metadataJson);
        expect(metadata.id).toBe('test-mod');
        expect(metadata.name).toBe('Test Mod');
      });

      it('should handle invalid JSON', () => {
        expect(() => ModHelpers.parseModMetadata('invalid json')).toThrow('Invalid mod metadata');
      });

      it('should normalize metadata with defaults', () => {
        const metadataJson = JSON.stringify({
          id: 'minimal-mod',
          name: 'Minimal Mod'
        });

        const metadata = ModHelpers.parseModMetadata(metadataJson);
        expect(metadata.version).toBe('1.0.0');
        expect(metadata.author).toBe('Unknown');
        expect(metadata.entryPoint).toBe('index.js');
        expect(metadata.dependencies).toEqual([]);
      });
    });
  });

  describe('backup operations', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
      mockFs.copyFile.mockResolvedValue(undefined);
    });

    describe('backupMod', () => {
      it('should create mod backup', async () => {
        const mod = createMockMod('test-mod');
        const backupPath = await ModHelpers.backupMod(mod, '/backups');

        expect(backupPath).toMatch(/\/backups\/test-mod_1\.0\.0_/);
        expect(mockFs.mkdir).toHaveBeenCalled();
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          expect.stringContaining('backup-info.json'),
          expect.stringContaining('"modId":"test-mod"')
        );
      });
    });
  });

  describe('statistics', () => {
    describe('getModStats', () => {
      it('should calculate mod statistics', async () => {
        mockFs.readdir.mockResolvedValue([
          { name: 'file1.js', isDirectory: () => false } as any,
          { name: 'file2.txt', isDirectory: () => false } as any
        ]);

        mockFs.stat.mockResolvedValue({ size: 1000 } as any);

        const mod = createMockMod('test', {
          metadata: {
            ...createMockMod('test').metadata,
            dependencies: [
              { id: 'dep1', version: '1.0.0' },
              { id: 'dep2', version: '2.0.0' }
            ],
            permissions: [
              {
                type: PermissionType.FILE_READ,
                description: 'Read files',
                required: true
              }
            ]
          }
        });

        const stats = await ModHelpers.getModStats(mod);

        expect(stats.dependencies).toBe(2);
        expect(stats.permissions).toBe(1);
        expect(stats.isSecure).toBe(true);
        expect(stats.fileCount).toBe(2);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  });
});