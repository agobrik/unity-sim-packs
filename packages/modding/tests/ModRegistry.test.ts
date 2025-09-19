import { ModRegistry } from '../src/registry/ModRegistry';
import { ModInstance, ModState, ModCategory } from '../src/types';

describe('ModRegistry', () => {
  let registry: ModRegistry;

  beforeEach(() => {
    registry = new ModRegistry();
  });

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

  describe('registration', () => {
    it('should register a mod successfully', () => {
      const mod = createMockMod('test-mod');

      registry.register(mod);

      expect(registry.has('test-mod')).toBe(true);
      expect(registry.get('test-mod')).toBe(mod);
      expect(registry.size()).toBe(1);
    });

    it('should throw error when registering duplicate mod ID', () => {
      const mod1 = createMockMod('test-mod');
      const mod2 = createMockMod('test-mod');

      registry.register(mod1);

      expect(() => registry.register(mod2)).toThrow("Mod with ID 'test-mod' is already registered");
    });

    it('should emit mod_registered event', () => {
      const mod = createMockMod('test-mod');
      const eventSpy = jest.fn();

      registry.on('mod_registered', eventSpy);
      registry.register(mod);

      expect(eventSpy).toHaveBeenCalledWith(mod);
    });
  });

  describe('unregistration', () => {
    it('should unregister a mod successfully', () => {
      const mod = createMockMod('test-mod');

      registry.register(mod);
      const result = registry.unregister('test-mod');

      expect(result).toBe(true);
      expect(registry.has('test-mod')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('should return false when unregistering non-existent mod', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });

    it('should emit mod_unregistered event', () => {
      const mod = createMockMod('test-mod');
      const eventSpy = jest.fn();

      registry.register(mod);
      registry.on('mod_unregistered', eventSpy);
      registry.unregister('test-mod');

      expect(eventSpy).toHaveBeenCalledWith('test-mod', mod);
    });
  });

  describe('querying', () => {
    beforeEach(() => {
      const mod1 = createMockMod('mod1', {
        metadata: {
          ...createMockMod('mod1').metadata,
          name: 'First Mod',
          author: 'Author A',
          category: ModCategory.CONTENT,
          tags: ['tag1', 'tag2']
        }
      });

      const mod2 = createMockMod('mod2', {
        metadata: {
          ...createMockMod('mod2').metadata,
          name: 'Second Mod',
          author: 'Author B',
          category: ModCategory.GAMEPLAY,
          tags: ['tag2', 'tag3']
        }
      });

      const mod3 = createMockMod('mod3', {
        metadata: {
          ...createMockMod('mod3').metadata,
          name: 'Third Mod',
          author: 'Author A',
          category: ModCategory.CONTENT,
          tags: ['tag1']
        }
      });

      registry.register(mod1);
      registry.register(mod2);
      registry.register(mod3);
    });

    it('should get all mods', () => {
      const mods = registry.getAll();
      expect(mods).toHaveLength(3);
    });

    it('should get mods by category', () => {
      const contentMods = registry.getByCategory(ModCategory.CONTENT);
      expect(contentMods).toHaveLength(2);
      expect(contentMods.map(m => m.metadata.id)).toContain('mod1');
      expect(contentMods.map(m => m.metadata.id)).toContain('mod3');

      const gameplayMods = registry.getByCategory(ModCategory.GAMEPLAY);
      expect(gameplayMods).toHaveLength(1);
      expect(gameplayMods[0].metadata.id).toBe('mod2');
    });

    it('should get mods by tag', () => {
      const tag1Mods = registry.getByTag('tag1');
      expect(tag1Mods).toHaveLength(2);

      const tag2Mods = registry.getByTag('tag2');
      expect(tag2Mods).toHaveLength(2);

      const tag3Mods = registry.getByTag('tag3');
      expect(tag3Mods).toHaveLength(1);
    });

    it('should get mods by author', () => {
      const authorAMods = registry.getByAuthor('Author A');
      expect(authorAMods).toHaveLength(2);

      const authorBMods = registry.getByAuthor('Author B');
      expect(authorBMods).toHaveLength(1);
    });

    it('should find mods by name', () => {
      const foundMods = registry.findByName('first');
      expect(foundMods).toHaveLength(1);
      expect(foundMods[0].metadata.id).toBe('mod1');

      const partialMods = registry.findByName('mod');
      expect(partialMods).toHaveLength(3);
    });
  });

  describe('searching', () => {
    beforeEach(() => {
      const mod1 = createMockMod('mod1', {
        metadata: {
          ...createMockMod('mod1').metadata,
          name: 'Graphics Enhancement Mod',
          author: 'John Doe',
          version: '2.1.0',
          category: ModCategory.GRAPHICS,
          tags: ['graphics', 'enhancement']
        },
        state: ModState.ACTIVE
      });

      const mod2 = createMockMod('mod2', {
        metadata: {
          ...createMockMod('mod2').metadata,
          name: 'Audio Improvement Mod',
          author: 'Jane Smith',
          version: '1.5.0',
          category: ModCategory.AUDIO,
          tags: ['audio', 'sound']
        },
        state: ModState.DISABLED
      });

      registry.register(mod1);
      registry.register(mod2);
    });

    it('should search by name', () => {
      const results = registry.search({ name: 'graphics' });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.id).toBe('mod1');
    });

    it('should search by author', () => {
      const results = registry.search({ author: 'john' });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.id).toBe('mod1');
    });

    it('should search by category', () => {
      const results = registry.search({ category: ModCategory.AUDIO });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.id).toBe('mod2');
    });

    it('should search by tags', () => {
      const results = registry.search({ tags: ['graphics'] });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.id).toBe('mod1');
    });

    it('should search by enabled state', () => {
      const enabledResults = registry.search({ enabled: true });
      expect(enabledResults).toHaveLength(1);
      expect(enabledResults[0].metadata.id).toBe('mod1');

      const disabledResults = registry.search({ enabled: false });
      expect(disabledResults).toHaveLength(1);
      expect(disabledResults[0].metadata.id).toBe('mod2');
    });

    it('should search with multiple criteria', () => {
      const results = registry.search({
        category: ModCategory.GRAPHICS,
        enabled: true,
        tags: ['enhancement']
      });
      expect(results).toHaveLength(1);
      expect(results[0].metadata.id).toBe('mod1');
    });
  });

  describe('dependency graph', () => {
    beforeEach(() => {
      const mod1 = createMockMod('mod1', {
        metadata: {
          ...createMockMod('mod1').metadata,
          dependencies: []
        }
      });

      const mod2 = createMockMod('mod2', {
        metadata: {
          ...createMockMod('mod2').metadata,
          dependencies: [{ id: 'mod1', version: '1.0.0' }]
        }
      });

      const mod3 = createMockMod('mod3', {
        metadata: {
          ...createMockMod('mod3').metadata,
          dependencies: [{ id: 'mod2', version: '1.0.0' }]
        }
      });

      registry.register(mod1);
      registry.register(mod2);
      registry.register(mod3);
    });

    it('should generate dependency graph', () => {
      const graph = registry.getDependencyGraph();

      expect(graph.nodes.size).toBe(3);
      expect(graph.edges.size).toBe(3);
      expect(graph.cycles).toHaveLength(0);
      expect(graph.topologicalOrder).toEqual(['mod1', 'mod2', 'mod3']);
    });

    it('should detect circular dependencies', () => {
      const mod4 = createMockMod('mod4', {
        metadata: {
          ...createMockMod('mod4').metadata,
          dependencies: [{ id: 'mod3', version: '1.0.0' }]
        }
      });

      // Create a circular dependency: mod3 -> mod2 -> mod1, mod4 -> mod3
      // Then modify mod1 to depend on mod4
      registry.register(mod4);

      const mod1 = registry.get('mod1')!;
      mod1.metadata.dependencies = [{ id: 'mod4', version: '1.0.0' }];

      const graph = registry.getDependencyGraph();
      expect(graph.cycles.length).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      const mod1 = createMockMod('mod1', {
        metadata: {
          ...createMockMod('mod1').metadata,
          author: 'Author A',
          category: ModCategory.CONTENT,
          tags: ['tag1', 'tag2']
        },
        state: ModState.ACTIVE
      });

      const mod2 = createMockMod('mod2', {
        metadata: {
          ...createMockMod('mod2').metadata,
          author: 'Author A',
          category: ModCategory.GAMEPLAY,
          tags: ['tag2', 'tag3']
        },
        state: ModState.DISABLED
      });

      const mod3 = createMockMod('mod3', {
        metadata: {
          ...createMockMod('mod3').metadata,
          author: 'Author B',
          category: ModCategory.CONTENT,
          tags: ['tag1']
        },
        state: ModState.ACTIVE
      });

      registry.register(mod1);
      registry.register(mod2);
      registry.register(mod3);
    });

    it('should calculate statistics correctly', () => {
      const stats = registry.getStatistics();

      expect(stats.totalMods).toBe(3);
      expect(stats.enabledMods).toBe(2);
      expect(stats.disabledMods).toBe(1);
      expect(stats.modsByCategory['content']).toBe(2);
      expect(stats.modsByCategory['gameplay']).toBe(1);
      expect(stats.modsByAuthor['Author A']).toBe(2);
      expect(stats.modsByAuthor['Author B']).toBe(1);
      expect(stats.averageModsPerAuthor).toBe(1.5);
      expect(stats.topTags).toHaveLength(3);
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      const mod1 = createMockMod('mod1');
      const mod2 = createMockMod('mod2', {
        metadata: {
          ...createMockMod('mod2').metadata,
          dependencies: [{ id: 'mod1', version: '1.0.0' }]
        }
      });

      const mod3 = createMockMod('mod3', {
        metadata: {
          ...createMockMod('mod3').metadata,
          dependencies: [{ id: 'missing-mod', version: '1.0.0' }]
        }
      });

      registry.register(mod1);
      registry.register(mod2);
      registry.register(mod3);
    });

    it('should validate registry and detect missing dependencies', () => {
      const validation = registry.validateRegistry();

      expect(validation.valid).toBe(false);
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('missing_dependency');
      expect(validation.issues[0].modId).toBe('mod3');
    });
  });

  describe('cleanup', () => {
    it('should clear registry', () => {
      const mod = createMockMod('test-mod');
      registry.register(mod);

      const eventSpy = jest.fn();
      registry.on('registry_cleared', eventSpy);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.has('test-mod')).toBe(false);
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('export/import', () => {
    it('should export registry data', () => {
      const mod = createMockMod('test-mod');
      registry.register(mod);

      const exported = registry.export();

      expect(exported).toBeDefined();
      expect(exported.mods).toHaveLength(1);
      expect(exported.mods[0].id).toBe('test-mod');
      expect(exported.version).toBe('1.0.0');
      expect(exported.timestamp).toBeDefined();
    });

    it('should import registry data', () => {
      const data = {
        mods: [
          {
            id: 'imported-mod',
            metadata: createMockMod('imported-mod').metadata,
            state: 'loaded',
            config: {},
            loadTime: 100
          }
        ],
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // Import should clear existing mods and process import data
      expect(() => registry.import(data)).not.toThrow();
    });
  });
});