import { EventEmitter } from '../utils/EventEmitter';
import {
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  DependencyType,
  Resource
} from '../types';

export class DependencyResolver extends EventEmitter {
  private graph: DependencyGraph;
  private resources: Map<string, Resource>;

  constructor() {
    super();
    this.graph = {
      nodes: new Map(),
      edges: [],
      resolutionOrder: []
    };
    this.resources = new Map();
  }

  public addResource(resource: Resource): void {
    this.resources.set(resource.id, resource);

    const node: DependencyNode = {
      resourceId: resource.id,
      dependencies: [...resource.dependencies],
      dependents: [],
      resolved: false,
      cyclic: false
    };

    this.graph.nodes.set(resource.id, node);
    this.updateDependencyEdges(resource);
    this.emit('resource_added', { resourceId: resource.id });
  }

  public removeResource(resourceId: string): boolean {
    if (!this.graph.nodes.has(resourceId)) return false;

    const node = this.graph.nodes.get(resourceId)!;

    for (const dependentId of node.dependents) {
      const dependent = this.graph.nodes.get(dependentId);
      if (dependent) {
        const depIndex = dependent.dependencies.indexOf(resourceId);
        if (depIndex !== -1) {
          dependent.dependencies.splice(depIndex, 1);
        }
      }
    }

    this.graph.edges = this.graph.edges.filter(
      edge => edge.from !== resourceId && edge.to !== resourceId
    );

    this.graph.nodes.delete(resourceId);
    this.resources.delete(resourceId);

    this.emit('resource_removed', { resourceId });
    return true;
  }

  private updateDependencyEdges(resource: Resource): void {
    const existingEdges = this.graph.edges.filter(edge => edge.from === resource.id);
    this.graph.edges = this.graph.edges.filter(edge => edge.from !== resource.id);

    for (const dependencyId of resource.dependencies) {
      if (this.graph.nodes.has(dependencyId)) {
        const edge: DependencyEdge = {
          from: resource.id,
          to: dependencyId,
          type: DependencyType.HARD,
          required: true,
          weight: 1
        };

        this.graph.edges.push(edge);

        const dependencyNode = this.graph.nodes.get(dependencyId)!;
        if (!dependencyNode.dependents.includes(resource.id)) {
          dependencyNode.dependents.push(resource.id);
        }
      }
    }
  }

  public resolveDependencies(): string[] {
    this.detectCycles();
    this.graph.resolutionOrder = this.topologicalSort();

    for (const resourceId of this.graph.resolutionOrder) {
      const node = this.graph.nodes.get(resourceId);
      if (node && !node.cyclic) {
        node.resolved = true;
      }
    }

    this.emit('dependencies_resolved', {
      order: this.graph.resolutionOrder,
      cycles: this.getCyclicNodes()
    });

    return this.graph.resolutionOrder;
  }

  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const nodeId of this.graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.detectCyclesRecursive(nodeId, visited, recursionStack);
      }
    }
  }

  private detectCyclesRecursive(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = this.graph.nodes.get(nodeId);
    if (!node) return false;

    for (const dependencyId of node.dependencies) {
      if (!visited.has(dependencyId)) {
        if (this.detectCyclesRecursive(dependencyId, visited, recursionStack)) {
          node.cyclic = true;
          return true;
        }
      } else if (recursionStack.has(dependencyId)) {
        node.cyclic = true;
        this.markCyclicPath(nodeId, dependencyId);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  private markCyclicPath(startId: string, endId: string): void {
    const path = this.findPath(startId, endId);
    for (const nodeId of path) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        node.cyclic = true;
      }
    }

    this.emit('cycle_detected', { path });
  }

  private findPath(startId: string, endId: string): string[] {
    const queue: string[][] = [[startId]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === endId) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.graph.nodes.get(current);
      if (node) {
        for (const dependencyId of node.dependencies) {
          queue.push([...path, dependencyId]);
        }
      }
    }

    return [];
  }

  private topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    for (const nodeId of this.graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const edge of this.graph.edges) {
      const current = inDegree.get(edge.to) || 0;
      inDegree.set(edge.to, current + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const node = this.graph.nodes.get(current);
      if (node) {
        for (const dependentId of node.dependents) {
          const currentDegree = inDegree.get(dependentId) || 0;
          inDegree.set(dependentId, currentDegree - 1);

          if (inDegree.get(dependentId) === 0) {
            queue.push(dependentId);
          }
        }
      }
    }

    return result;
  }

  public canAllocate(resourceId: string): boolean {
    const node = this.graph.nodes.get(resourceId);
    if (!node) return false;

    if (node.cyclic) return false;

    for (const dependencyId of node.dependencies) {
      const dependency = this.resources.get(dependencyId);
      if (!dependency || dependency.allocation.allocatedTo.length === 0) {
        return false;
      }
    }

    return true;
  }

  public getAllocationOrder(resourceIds: string[]): string[] {
    const subgraph = this.createSubgraph(resourceIds);
    return this.topologicalSortSubgraph(subgraph);
  }

  private createSubgraph(resourceIds: string[]): DependencyGraph {
    const subgraph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
      resolutionOrder: []
    };

    const resourceSet = new Set(resourceIds);
    const toVisit = [...resourceIds];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
      const current = toVisit.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.graph.nodes.get(current);
      if (node) {
        subgraph.nodes.set(current, { ...node });

        for (const dependencyId of node.dependencies) {
          if (!visited.has(dependencyId)) {
            toVisit.push(dependencyId);
          }
        }
      }
    }

    subgraph.edges = this.graph.edges.filter(
      edge => subgraph.nodes.has(edge.from) && subgraph.nodes.has(edge.to)
    );

    return subgraph;
  }

  private topologicalSortSubgraph(subgraph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    const result: string[] = [];

    for (const nodeId of subgraph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const edge of subgraph.edges) {
      const current = inDegree.get(edge.to) || 0;
      inDegree.set(edge.to, current + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const node = subgraph.nodes.get(current);
      if (node) {
        for (const dependentId of node.dependents) {
          if (subgraph.nodes.has(dependentId)) {
            const currentDegree = inDegree.get(dependentId) || 0;
            inDegree.set(dependentId, currentDegree - 1);

            if (inDegree.get(dependentId) === 0) {
              queue.push(dependentId);
            }
          }
        }
      }
    }

    return result;
  }

  public getDependencyChain(resourceId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();

    this.buildDependencyChain(resourceId, chain, visited);
    return chain.reverse();
  }

  private buildDependencyChain(
    resourceId: string,
    chain: string[],
    visited: Set<string>
  ): void {
    if (visited.has(resourceId)) return;
    visited.add(resourceId);

    const node = this.graph.nodes.get(resourceId);
    if (node) {
      for (const dependencyId of node.dependencies) {
        this.buildDependencyChain(dependencyId, chain, visited);
      }
    }

    chain.push(resourceId);
  }

  public getDependents(resourceId: string): string[] {
    const node = this.graph.nodes.get(resourceId);
    return node ? [...node.dependents] : [];
  }

  public getDependencies(resourceId: string): string[] {
    const node = this.graph.nodes.get(resourceId);
    return node ? [...node.dependencies] : [];
  }

  public getCyclicNodes(): string[] {
    return Array.from(this.graph.nodes.values())
      .filter(node => node.cyclic)
      .map(node => node.resourceId);
  }

  public getGraph(): DependencyGraph {
    return {
      nodes: new Map(this.graph.nodes),
      edges: [...this.graph.edges],
      resolutionOrder: [...this.graph.resolutionOrder]
    };
  }

  public validateDependencies(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const [resourceId, node] of this.graph.nodes) {
      for (const dependencyId of node.dependencies) {
        if (!this.graph.nodes.has(dependencyId)) {
          issues.push(`Resource ${resourceId} depends on non-existent resource ${dependencyId}`);
        }
      }

      if (node.cyclic) {
        issues.push(`Resource ${resourceId} is part of a dependency cycle`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  public optimizeDependencies(): void {
    this.removeDuplicateEdges();
    this.consolidateTransitiveDependencies();
    this.emit('dependencies_optimized');
  }

  private removeDuplicateEdges(): void {
    const uniqueEdges = new Map<string, DependencyEdge>();

    for (const edge of this.graph.edges) {
      const key = `${edge.from}-${edge.to}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    }

    this.graph.edges = Array.from(uniqueEdges.values());
  }

  private consolidateTransitiveDependencies(): void {
    for (const [resourceId, node] of this.graph.nodes) {
      const directDeps = new Set(node.dependencies);
      const transitiveDeps = new Set<string>();

      for (const depId of node.dependencies) {
        const depChain = this.getDependencyChain(depId);
        for (const transitiveId of depChain) {
          if (transitiveId !== resourceId && transitiveId !== depId) {
            transitiveDeps.add(transitiveId);
          }
        }
      }

      for (const transitiveId of transitiveDeps) {
        if (directDeps.has(transitiveId)) {
          directDeps.delete(transitiveId);
        }
      }

      node.dependencies = Array.from(directDeps);
    }

    this.rebuildEdges();
  }

  private rebuildEdges(): void {
    this.graph.edges = [];

    for (const [resourceId, node] of this.graph.nodes) {
      for (const dependencyId of node.dependencies) {
        const edge: DependencyEdge = {
          from: resourceId,
          to: dependencyId,
          type: DependencyType.HARD,
          required: true,
          weight: 1
        };
        this.graph.edges.push(edge);
      }
    }
  }
}