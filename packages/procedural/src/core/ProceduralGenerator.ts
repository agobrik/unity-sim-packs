import { EventEmitter } from '../utils/EventEmitter';
import {
  GenerationContext,
  GenerationOptions,
  GenerationStats,
  GenerationEvent,
  GenerationEventType,
  CacheEntry
} from '../types';

export class ProceduralGenerator extends EventEmitter {
  private context: GenerationContext;
  private isGenerating: boolean = false;
  private generationQueue: Array<() => Promise<any>> = [];

  constructor(options: GenerationOptions = {}) {
    super();
    this.context = this.initializeContext(options);
  }

  private initializeContext(options: GenerationOptions): GenerationContext {
    const seed = options.seed || Math.floor(Math.random() * 1000000);

    return {
      seed,
      random: this.createSeededRandom(seed),
      cache: new Map(),
      stats: {
        totalTime: 0,
        iterationsCount: 0,
        successRate: 0,
        failureReasons: [],
        memoryUsage: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      options: {
        useCache: true,
        maxRetries: 3,
        timeout: 30000,
        ...options
      },
      metadata: {}
    };
  }

  private createSeededRandom(seed: number): () => number {
    let currentSeed = seed;

    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  public setSeed(seed: number): void {
    this.context.seed = seed;
    this.context.random = this.createSeededRandom(seed);
    this.clearCache();
    this.emitEvent('generation_started', { seed, reason: 'seed_changed' });
  }

  public getSeed(): number {
    return this.context.seed;
  }

  public getStats(): GenerationStats {
    return { ...this.context.stats };
  }

  public getContext(): GenerationContext {
    return { ...this.context };
  }

  public async generate<T>(
    key: string,
    generator: (context: GenerationContext) => T | Promise<T>,
    useCache: boolean = true
  ): Promise<T> {
    const startTime = (globalThis as any).performance?.now() || Date.now();
    const cacheKey = `${key}_${this.context.seed}`;

    // Check cache first
    if (useCache && this.context.options.useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        this.context.stats.cacheHits++;
        this.emitEvent('cache_hit', { key: cacheKey });
        return cached;
      }
      this.context.stats.cacheMisses++;
      this.emitEvent('cache_miss', { key: cacheKey });
    }

    this.isGenerating = true;
    this.emitEvent('generation_started', { key, seed: this.context.seed });

    let result: T | undefined = undefined;
    let attempts = 0;
    const maxRetries = this.context.options.maxRetries || 3;

    while (attempts < maxRetries) {
      try {
        // Set up timeout if specified
        let generationPromise: Promise<T>;

        if (this.context.options.timeout) {
          generationPromise = Promise.race([
            Promise.resolve(generator(this.context)),
            new Promise<T>((_, reject) =>
              (globalThis as any).setTimeout(() => reject(new Error('Generation timeout')), this.context.options.timeout)
            )
          ]);
        } else {
          generationPromise = Promise.resolve(generator(this.context));
        }

        result = await generationPromise;
        break;

      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.context.stats.failureReasons.push(errorMessage);

        if (attempts >= maxRetries) {
          this.isGenerating = false;
          this.emitEvent('generation_failed', {
            key,
            error: errorMessage,
            attempts,
            totalTime: (globalThis as any).performance?.now() || Date.now() - startTime
          });
          throw error;
        }

        // Optional error callback
        if (this.context.options.errorCallback) {
          this.context.options.errorCallback(error as Error, `Attempt ${attempts}/${maxRetries}`);
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => (globalThis as any).setTimeout(resolve, Math.pow(2, attempts) * 100));
      }
    }

    const endTime = (globalThis as any).performance?.now() || Date.now();
    const duration = endTime - startTime;

    // Cache the result
    if (useCache && this.context.options.useCache && result !== undefined) {
      this.addToCache(cacheKey, result, this.calculateSize(result));
    }

    // Update stats
    this.context.stats.totalTime += duration;
    this.context.stats.iterationsCount++;
    this.updateSuccessRate();

    this.isGenerating = false;
    this.emitEvent('generation_completed', {
      key,
      duration,
      attempts,
      cacheUsed: useCache && this.context.options.useCache
    });

    return result!;
  }

  public async generateBatch<T>(
    generators: Array<{ key: string; generator: (context: GenerationContext) => T | Promise<T> }>,
    parallel: boolean = true
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    if (parallel) {
      // Parallel execution
      const promises = generators.map(async ({ key, generator }) => {
        const result = await this.generate(key, generator);
        return { key, result };
      });

      const resolvedResults = await Promise.all(promises);
      resolvedResults.forEach(({ key, result }) => {
        results.set(key, result);
      });
    } else {
      // Sequential execution
      for (const { key, generator } of generators) {
        const result = await this.generate(key, generator);
        results.set(key, result);
      }
    }

    return results;
  }

  public queueGeneration<T>(
    key: string,
    generator: (context: GenerationContext) => T | Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.generationQueue.push(async () => {
        try {
          const result = await this.generate(key, generator);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    while (this.generationQueue.length > 0) {
      const generator = this.generationQueue.shift();
      if (generator) {
        await generator();
      }
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.context.cache.get(key) as CacheEntry<T> | undefined;

    if (entry) {
      // Check if cache entry is still valid (simple TTL)
      const age = Date.now() - entry.timestamp;
      const maxAge = 1000 * 60 * 60; // 1 hour default TTL

      if (age < maxAge) {
        entry.accessCount++;
        return entry.value;
      } else {
        this.context.cache.delete(key);
      }
    }

    return null;
  }

  private addToCache<T>(key: string, value: T, size: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };

    this.context.cache.set(key, entry);

    // Simple cache size management (LRU-like)
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const maxCacheSize = 100; // Maximum number of entries
    const maxMemoryUsage = 50 * 1024 * 1024; // 50MB

    if (this.context.cache.size > maxCacheSize) {
      // Remove least recently used entries
      const entries = Array.from(this.context.cache.entries());
      entries.sort((a, b) => a[1].accessCount - b[1].accessCount);

      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([key]) => this.context.cache.delete(key));
    }

    // Check memory usage
    const totalMemory = Array.from(this.context.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    if (totalMemory > maxMemoryUsage) {
      // Remove oldest entries
      const entries = Array.from(this.context.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      let currentMemory = totalMemory;
      for (const [key, entry] of entries) {
        if (currentMemory <= maxMemoryUsage * 0.8) break; // Keep 80% of max
        this.context.cache.delete(key);
        currentMemory -= entry.size;
      }
    }
  }

  private calculateSize(value: any): number {
    // Simple size estimation
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size for non-serializable objects
    }
  }

  private updateSuccessRate(): void {
    const total = this.context.stats.iterationsCount;
    const failures = this.context.stats.failureReasons.length;
    this.context.stats.successRate = total > 0 ? (total - failures) / total : 0;
  }

  private emitEvent(type: GenerationEventType, data: any): void {
    const event: GenerationEvent = {
      type,
      timestamp: Date.now(),
      data,
      context: 'ProceduralGenerator'
    };

    this.emit(type, event);

    // Call progress callback if provided
    if (type === 'generation_progress' && this.context.options.progressCallback) {
      this.context.options.progressCallback(data.progress || 0, data.stage || 'unknown');
    }
  }

  public clearCache(): void {
    this.context.cache.clear();
    this.context.stats.cacheHits = 0;
    this.context.stats.cacheMisses = 0;
  }

  public getCacheStats(): { size: number; memoryUsage: number; hitRate: number } {
    const size = this.context.cache.size;
    const memoryUsage = Array.from(this.context.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    const totalRequests = this.context.stats.cacheHits + this.context.stats.cacheMisses;
    const hitRate = totalRequests > 0 ? this.context.stats.cacheHits / totalRequests : 0;

    return { size, memoryUsage, hitRate };
  }

  public setMetadata(key: string, value: any): void {
    this.context.metadata[key] = value;
  }

  public getMetadata(key: string): any {
    return this.context.metadata[key];
  }

  public isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }

  public getQueueLength(): number {
    return this.generationQueue.length;
  }

  public clearQueue(): void {
    this.generationQueue = [];
  }

  public createChildGenerator(options: Partial<GenerationOptions> = {}): ProceduralGenerator {
    const childOptions = {
      ...this.context.options,
      ...options,
      seed: options.seed || this.context.random() * 1000000
    };

    return new ProceduralGenerator(childOptions);
  }

  // Utility methods for common operations
  public randomFloat(min: number = 0, max: number = 1): number {
    return min + this.context.random() * (max - min);
  }

  public randomInt(min: number, max: number): number {
    return Math.floor(this.randomFloat(min, max + 1));
  }

  public randomChoice<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  public randomChoices<T>(array: T[], count: number, allowDuplicates: boolean = false): T[] {
    const results: T[] = [];
    const availableItems = [...array];

    for (let i = 0; i < count && availableItems.length > 0; i++) {
      const index = this.randomInt(0, availableItems.length - 1);
      const chosen = availableItems[index];
      results.push(chosen);

      if (!allowDuplicates) {
        availableItems.splice(index, 1);
      }
    }

    return results;
  }

  public weightedChoice<T>(items: Array<{ item: T; weight: number }>): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = this.randomFloat(0, totalWeight);

    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) {
        return item;
      }
    }

    return items[items.length - 1].item; // Fallback to last item
  }

  public shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  public normalDistribution(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transformation
    const u1 = this.context.random();
    const u2 = this.context.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stdDev + mean;
  }

  public lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  public smoothstep(a: number, b: number, t: number): number {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  public clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
  }

  // Dispose and cleanup
  public dispose(): void {
    this.clearCache();
    this.clearQueue();
    this.removeAllListeners();
    this.isGenerating = false;
  }
}