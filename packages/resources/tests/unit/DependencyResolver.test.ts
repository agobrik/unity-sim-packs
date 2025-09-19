import { DependencyResolver } from '../../src/core/DependencyResolver';
import { ResourceHelpers } from '../../src/utils/ResourceHelpers';
import { ResourceType } from '../../src/types';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('Resource Management', () => {
    test('should add resource to dependency graph', () => {
      const resource = ResourceHelpers.createResource(
        'res-1',
        ResourceType.MEMORY,
        'Resource 1',
        'general'
      );

      resolver.addResource(resource);

      const graph = resolver.getGraph();
      expect(graph.nodes.has('res-1')).toBe(true);
      expect(graph.nodes.get('res-1')!.resourceId).toBe('res-1');
    });

    test('should remove resource from dependency graph', () => {
      const resource = ResourceHelpers.createResource(
        'res-1',
        ResourceType.MEMORY,
        'Resource 1',
        'general'
      );

      resolver.addResource(resource);
      expect(resolver.getGraph().nodes.has('res-1')).toBe(true);

      const removed = resolver.removeResource('res-1');
      expect(removed).toBe(true);
      expect(resolver.getGraph().nodes.has('res-1')).toBe(false);
    });
  });

  describe('Dependency Resolution', () => {
    test('should resolve simple dependency chain', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');
      const resource3 = ResourceHelpers.createResource('res-3', ResourceType.STORAGE, 'Resource 3', 'general');

      resource2.dependencies = ['res-1'];
      resource3.dependencies = ['res-2'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);
      resolver.addResource(resource3);

      const order = resolver.resolveDependencies();

      expect(order.indexOf('res-1')).toBeLessThan(order.indexOf('res-2'));
      expect(order.indexOf('res-2')).toBeLessThan(order.indexOf('res-3'));
    });

    test('should detect circular dependencies', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource1.dependencies = ['res-2'];
      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      resolver.resolveDependencies();

      const cyclicNodes = resolver.getCyclicNodes();
      expect(cyclicNodes).toContain('res-1');
      expect(cyclicNodes).toContain('res-2');
    });

    test('should handle complex dependency graph', () => {
      const resources = [];
      for (let i = 1; i <= 5; i++) {
        const resource = ResourceHelpers.createResource(
          `res-${i}`,
          ResourceType.MEMORY,
          `Resource ${i}`,
          'general'
        );
        resources.push(resource);
      }

      resources[1].dependencies = ['res-1'];
      resources[2].dependencies = ['res-1'];
      resources[3].dependencies = ['res-2', 'res-3'];
      resources[4].dependencies = ['res-4'];

      resources.forEach(res => resolver.addResource(res));

      const order = resolver.resolveDependencies();

      expect(order.indexOf('res-1')).toBeLessThan(order.indexOf('res-2'));
      expect(order.indexOf('res-1')).toBeLessThan(order.indexOf('res-3'));
      expect(order.indexOf('res-2')).toBeLessThan(order.indexOf('res-4'));
      expect(order.indexOf('res-3')).toBeLessThan(order.indexOf('res-4'));
    });
  });

  describe('Allocation Validation', () => {
    test('should validate resource can be allocated', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource2.dependencies = ['res-1'];
      resource1.allocation.allocatedTo = ['user-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      expect(resolver.canAllocate('res-2')).toBe(true);
      expect(resolver.canAllocate('res-1')).toBe(true);
    });

    test('should prevent allocation when dependencies not met', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      expect(resolver.canAllocate('res-2')).toBe(false);
    });

    test('should prevent allocation of cyclic dependencies', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource1.dependencies = ['res-2'];
      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      resolver.resolveDependencies();

      expect(resolver.canAllocate('res-1')).toBe(false);
      expect(resolver.canAllocate('res-2')).toBe(false);
    });
  });

  describe('Dependency Queries', () => {
    beforeEach(() => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');
      const resource3 = ResourceHelpers.createResource('res-3', ResourceType.STORAGE, 'Resource 3', 'general');

      resource2.dependencies = ['res-1'];
      resource3.dependencies = ['res-2'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);
      resolver.addResource(resource3);
    });

    test('should get dependency chain', () => {
      const chain = resolver.getDependencyChain('res-3');

      expect(chain).toEqual(['res-1', 'res-2', 'res-3']);
    });

    test('should get direct dependencies', () => {
      const dependencies = resolver.getDependencies('res-3');
      expect(dependencies).toEqual(['res-2']);
    });

    test('should get dependents', () => {
      const dependents = resolver.getDependents('res-1');
      expect(dependents).toContain('res-2');
    });

    test('should get allocation order for subset', () => {
      const order = resolver.getAllocationOrder(['res-2', 'res-3']);

      expect(order.indexOf('res-2')).toBeLessThan(order.indexOf('res-3'));
    });
  });

  describe('Dependency Validation', () => {
    test('should validate correct dependencies', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      const validation = resolver.validateDependencies();
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect missing dependencies', () => {
      const resource = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      resource.dependencies = ['non-existent'];

      resolver.addResource(resource);

      const validation = resolver.validateDependencies();
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('non-existent'))).toBe(true);
    });

    test('should detect cyclic dependencies in validation', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource1.dependencies = ['res-2'];
      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      resolver.resolveDependencies();

      const validation = resolver.validateDependencies();
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('cycle'))).toBe(true);
    });
  });

  describe('Optimization', () => {
    test('should optimize dependency graph', () => {
      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');
      const resource3 = ResourceHelpers.createResource('res-3', ResourceType.STORAGE, 'Resource 3', 'general');

      resource2.dependencies = ['res-1'];
      resource3.dependencies = ['res-1', 'res-2'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);
      resolver.addResource(resource3);

      resolver.optimizeDependencies();

      const dependencies = resolver.getDependencies('res-3');
      expect(dependencies).toEqual(['res-2']);
    });

    test('should emit optimization event', (done) => {
      resolver.on('dependencies_optimized', () => {
        done();
      });

      resolver.optimizeDependencies();
    });
  });

  describe('Event Handling', () => {
    test('should emit resource added event', (done) => {
      resolver.on('resource_added', (data) => {
        expect(data.resourceId).toBe('res-1');
        done();
      });

      const resource = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      resolver.addResource(resource);
    });

    test('should emit resource removed event', (done) => {
      const resource = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      resolver.addResource(resource);

      resolver.on('resource_removed', (data) => {
        expect(data.resourceId).toBe('res-1');
        done();
      });

      resolver.removeResource('res-1');
    });

    test('should emit cycle detected event', (done) => {
      resolver.on('cycle_detected', (data) => {
        expect(data.path).toBeDefined();
        done();
      });

      const resource1 = ResourceHelpers.createResource('res-1', ResourceType.MEMORY, 'Resource 1', 'general');
      const resource2 = ResourceHelpers.createResource('res-2', ResourceType.CPU, 'Resource 2', 'general');

      resource1.dependencies = ['res-2'];
      resource2.dependencies = ['res-1'];

      resolver.addResource(resource1);
      resolver.addResource(resource2);

      resolver.resolveDependencies();
    });
  });
});