import { EventEmitter } from '../utils/EventEmitter';
import {
  ModInstance,
  ModCategory,
  ModSearchQuery,
  DependencyGraph
} from '../types';

export class ModRegistry extends EventEmitter {
  private mods: Map<string, ModInstance> = new Map();
  private modsByCategory: Map<ModCategory, Set<string>> = new Map();
  private modsByTag: Map<string, Set<string>> = new Map();
  private modsByAuthor: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeCategoryMaps();
  }

  private initializeCategoryMaps(): void {
    for (const category of Object.values(ModCategory)) {
      this.modsByCategory.set(category, new Set());
    }
  }

  public register(mod: ModInstance): void {
    if (this.mods.has(mod.metadata.id)) {
      throw new Error(`Mod with ID '${mod.metadata.id}' is already registered`);
    }

    this.mods.set(mod.metadata.id, mod);
    this.indexMod(mod);
    this.emit('mod_registered', mod);
  }

  public unregister(modId: string): boolean {
    const mod = this.mods.get(modId);
    if (!mod) {
      return false;
    }

    this.mods.delete(modId);
    this.unindexMod(mod);
    this.emit('mod_unregistered', modId, mod);
    return true;
  }

  private indexMod(mod: ModInstance): void {
    // Index by category
    const categoryMods = this.modsByCategory.get(mod.metadata.category);
    if (categoryMods) {
      categoryMods.add(mod.metadata.id);
    }

    // Index by tags
    for (const tag of mod.metadata.tags) {
      if (!this.modsByTag.has(tag)) {
        this.modsByTag.set(tag, new Set());
      }
      this.modsByTag.get(tag)!.add(mod.metadata.id);
    }

    // Index by author
    if (!this.modsByAuthor.has(mod.metadata.author)) {
      this.modsByAuthor.set(mod.metadata.author, new Set());
    }
    this.modsByAuthor.get(mod.metadata.author)!.add(mod.metadata.id);
  }

  private unindexMod(mod: ModInstance): void {
    // Remove from category index
    const categoryMods = this.modsByCategory.get(mod.metadata.category);
    if (categoryMods) {
      categoryMods.delete(mod.metadata.id);
    }

    // Remove from tag indices
    for (const tag of mod.metadata.tags) {
      const tagMods = this.modsByTag.get(tag);
      if (tagMods) {
        tagMods.delete(mod.metadata.id);
        if (tagMods.size === 0) {
          this.modsByTag.delete(tag);
        }
      }
    }

    // Remove from author index
    const authorMods = this.modsByAuthor.get(mod.metadata.author);
    if (authorMods) {
      authorMods.delete(mod.metadata.id);
      if (authorMods.size === 0) {
        this.modsByAuthor.delete(mod.metadata.author);
      }
    }
  }

  public get(modId: string): ModInstance | undefined {
    return this.mods.get(modId);
  }

  public getAll(): ModInstance[] {
    return Array.from(this.mods.values());
  }

  public getByCategory(category: ModCategory): ModInstance[] {
    const modIds = this.modsByCategory.get(category);
    if (!modIds) {
      return [];
    }

    return Array.from(modIds)
      .map(id => this.mods.get(id))
      .filter((mod): mod is ModInstance => mod !== undefined);
  }

  public getByTag(tag: string): ModInstance[] {
    const modIds = this.modsByTag.get(tag);
    if (!modIds) {
      return [];
    }

    return Array.from(modIds)
      .map(id => this.mods.get(id))
      .filter((mod): mod is ModInstance => mod !== undefined);
  }

  public getByAuthor(author: string): ModInstance[] {
    const modIds = this.modsByAuthor.get(author);
    if (!modIds) {
      return [];
    }

    return Array.from(modIds)
      .map(id => this.mods.get(id))
      .filter((mod): mod is ModInstance => mod !== undefined);
  }

  public findByName(name: string): ModInstance[] {
    const normalizedName = name.toLowerCase();
    return Array.from(this.mods.values()).filter(mod =>
      mod.metadata.name.toLowerCase().includes(normalizedName)
    );
  }

  public search(query: ModSearchQuery): ModInstance[] {
    let results = Array.from(this.mods.values());

    // Filter by name
    if (query.name) {
      const normalizedName = query.name.toLowerCase();
      results = results.filter(mod =>
        mod.metadata.name.toLowerCase().includes(normalizedName)
      );
    }

    // Filter by author
    if (query.author) {
      const normalizedAuthor = query.author.toLowerCase();
      results = results.filter(mod =>
        mod.metadata.author.toLowerCase().includes(normalizedAuthor)
      );
    }

    // Filter by category
    if (query.category) {
      results = results.filter(mod => mod.metadata.category === query.category);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(mod =>
        query.tags!.some(tag => mod.metadata.tags.includes(tag))
      );
    }

    // Filter by version
    if (query.version) {
      results = results.filter(mod => this.matchesVersion(mod.metadata.version, query.version!));
    }

    // Filter by enabled state
    if (query.enabled !== undefined) {
      results = results.filter(mod => {
        const isEnabled = mod.state === 'active' || mod.state === 'loaded';
        return isEnabled === query.enabled;
      });
    }

    // Filter by conflicts
    if (query.hasConflicts !== undefined) {
      results = results.filter(mod => {
        const hasConflicts = this.hasConflicts(mod.metadata.id);
        return hasConflicts === query.hasConflicts;
      });
    }

    return results;
  }

  private matchesVersion(modVersion: string, queryVersion: string): boolean {
    // Simple version matching - could be enhanced with semver
    if (queryVersion.startsWith('^')) {
      // Compatible version
      const baseVersion = queryVersion.slice(1);
      return this.isCompatibleVersion(modVersion, baseVersion);
    } else if (queryVersion.startsWith('~')) {
      // Patch-level compatibility
      const baseVersion = queryVersion.slice(1);
      return this.isPatchCompatible(modVersion, baseVersion);
    } else {
      // Exact match
      return modVersion === queryVersion;
    }
  }

  private isCompatibleVersion(modVersion: string, baseVersion: string): boolean {
    const modParts = modVersion.split('.').map(Number);
    const baseParts = baseVersion.split('.').map(Number);

    // Major version must match
    if (modParts[0] !== baseParts[0]) {
      return false;
    }

    // Minor version must be >= base
    if (modParts[1] < baseParts[1]) {
      return false;
    }

    // If minor versions match, patch must be >= base
    if (modParts[1] === baseParts[1] && modParts[2] < baseParts[2]) {
      return false;
    }

    return true;
  }

  private isPatchCompatible(modVersion: string, baseVersion: string): boolean {
    const modParts = modVersion.split('.').map(Number);
    const baseParts = baseVersion.split('.').map(Number);

    // Major and minor versions must match
    return modParts[0] === baseParts[0] && modParts[1] === baseParts[1];
  }

  private hasConflicts(modId: string): boolean {
    // This would be implemented based on actual conflict detection logic
    // For now, return false as placeholder
    return false;
  }

  public getDependencyGraph(): DependencyGraph {
    const nodes = new Map<string, ModInstance>();
    const edges = new Map<string, Set<string>>();

    // Build nodes
    for (const mod of this.mods.values()) {
      nodes.set(mod.metadata.id, mod);
      edges.set(mod.metadata.id, new Set());
    }

    // Build edges (dependencies)
    for (const mod of this.mods.values()) {
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

  // Statistics and analytics
  public getStatistics(): {
    totalMods: number;
    modsByCategory: Record<string, number>;
    modsByAuthor: Record<string, number>;
    topTags: Array<{ tag: string; count: number }>;
    averageModsPerAuthor: number;
    enabledMods: number;
    disabledMods: number;
  } {
    const totalMods = this.mods.size;
    const modsByCategory: Record<string, number> = {};
    const modsByAuthor: Record<string, number> = {};
    const tagCounts = new Map<string, number>();
    let enabledMods = 0;
    let disabledMods = 0;

    // Collect statistics
    for (const mod of this.mods.values()) {
      // Category stats
      const category = mod.metadata.category.toString();
      modsByCategory[category] = (modsByCategory[category] || 0) + 1;

      // Author stats
      modsByAuthor[mod.metadata.author] = (modsByAuthor[mod.metadata.author] || 0) + 1;

      // Tag stats
      for (const tag of mod.metadata.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }

      // Enabled/disabled stats
      if (mod.state === 'active' || mod.state === 'loaded') {
        enabledMods++;
      } else {
        disabledMods++;
      }
    }

    // Top tags
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Average mods per author
    const authorCount = Object.keys(modsByAuthor).length;
    const averageModsPerAuthor = authorCount > 0 ? totalMods / authorCount : 0;

    return {
      totalMods,
      modsByCategory,
      modsByAuthor,
      topTags,
      averageModsPerAuthor,
      enabledMods,
      disabledMods
    };
  }

  public getModsWithIssues(): ModInstance[] {
    return Array.from(this.mods.values()).filter(mod =>
      mod.state === 'error' || this.hasConflicts(mod.metadata.id)
    );
  }

  public getOutdatedMods(): ModInstance[] {
    // This would check for available updates
    // Placeholder implementation
    return [];
  }

  public validateRegistry(): {
    valid: boolean;
    issues: Array<{
      type: 'missing_dependency' | 'circular_dependency' | 'version_conflict' | 'duplicate_id';
      modId: string;
      description: string;
    }>;
  } {
    const issues: Array<{
      type: 'missing_dependency' | 'circular_dependency' | 'version_conflict' | 'duplicate_id';
      modId: string;
      description: string;
    }> = [];

    // Check for missing dependencies
    for (const mod of this.mods.values()) {
      for (const dep of mod.metadata.dependencies) {
        if (!dep.optional && !this.mods.has(dep.id)) {
          issues.push({
            type: 'missing_dependency',
            modId: mod.metadata.id,
            description: `Missing required dependency: ${dep.id}`
          });
        }
      }
    }

    // Check for circular dependencies
    const graph = this.getDependencyGraph();
    for (const cycle of graph.cycles) {
      for (const modId of cycle) {
        issues.push({
          type: 'circular_dependency',
          modId,
          description: `Circular dependency detected: ${cycle.join(' -> ')}`
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Cleanup and maintenance
  public clear(): void {
    this.mods.clear();
    this.modsByCategory.clear();
    this.modsByTag.clear();
    this.modsByAuthor.clear();
    this.initializeCategoryMaps();
    this.emit('registry_cleared');
  }

  public size(): number {
    return this.mods.size;
  }

  public has(modId: string): boolean {
    return this.mods.has(modId);
  }

  public keys(): IterableIterator<string> {
    return this.mods.keys();
  }

  public values(): IterableIterator<ModInstance> {
    return this.mods.values();
  }

  public entries(): IterableIterator<[string, ModInstance]> {
    return this.mods.entries();
  }

  // Export/Import functionality
  public export(): any {
    return {
      mods: Array.from(this.mods.entries()).map(([id, mod]) => ({
        id,
        metadata: mod.metadata,
        state: mod.state,
        config: mod.config,
        loadTime: mod.loadTime
      })),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  public import(data: any): void {
    if (!data || !data.mods) {
      throw new Error('Invalid registry data');
    }

    this.clear();

    for (const modData of data.mods) {
      // This would recreate mod instances from exported data
      // Implementation would depend on how mods are serialized
      console.log(`Would import mod: ${modData.id}`);
    }
  }
}