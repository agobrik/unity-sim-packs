import {
  DistanceMetric,
  InterpolationType,
  GenerationContext,
  NameGeneratorConfig,
  GeneratedName
} from '../types';

export class ProceduralHelpers {
  // Random utilities
  public static seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  public static randomInt(min: number, max: number, random: () => number = Math.random): number {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  public static randomFloat(min: number, max: number, random: () => number = Math.random): number {
    return random() * (max - min) + min;
  }

  public static randomChoice<T>(array: T[], random: () => number = Math.random): T {
    return array[Math.floor(random() * array.length)];
  }

  public static weightedChoice<T>(
    items: Array<{ item: T; weight: number }>,
    random: () => number = Math.random
  ): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let randomWeight = random() * totalWeight;

    for (const { item, weight } of items) {
      randomWeight -= weight;
      if (randomWeight <= 0) {
        return item;
      }
    }

    return items[items.length - 1].item;
  }

  public static shuffle<T>(array: T[], random: () => number = Math.random): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Distance calculations
  public static distance(
    x1: number, y1: number,
    x2: number, y2: number,
    metric: DistanceMetric = 'euclidean'
  ): number {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      case 'manhattan':
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
      case 'chebyshev':
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      case 'minkowski':
        // Using p=3 for Minkowski distance
        return Math.pow(Math.pow(Math.abs(x2 - x1), 3) + Math.pow(Math.abs(y2 - y1), 3), 1/3);
      default:
        return 0;
    }
  }

  public static distance3D(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    metric: DistanceMetric = 'euclidean'
  ): number {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2));
      case 'manhattan':
        return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
      case 'chebyshev':
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(z2 - z1));
      case 'minkowski':
        return Math.pow(
          Math.pow(Math.abs(x2 - x1), 3) +
          Math.pow(Math.abs(y2 - y1), 3) +
          Math.pow(Math.abs(z2 - z1), 3),
          1/3
        );
      default:
        return 0;
    }
  }

  // Interpolation functions
  public static interpolate(
    a: number, b: number, t: number,
    type: InterpolationType = 'linear'
  ): number {
    t = Math.max(0, Math.min(1, t)); // Clamp t to [0, 1]

    switch (type) {
      case 'linear':
        return a + (b - a) * t;
      case 'cosine':
        const cosineT = (1 - Math.cos(t * Math.PI)) / 2;
        return a + (b - a) * cosineT;
      case 'cubic':
        const cubicT = t * t * (3 - 2 * t);
        return a + (b - a) * cubicT;
      case 'quintic':
        const quinticT = t * t * t * (t * (t * 6 - 15) + 10);
        return a + (b - a) * quinticT;
      default:
        return a + (b - a) * t;
    }
  }

  public static bilinearInterpolate(
    v00: number, v10: number, v01: number, v11: number,
    tx: number, ty: number
  ): number {
    const top = this.interpolate(v00, v10, tx);
    const bottom = this.interpolate(v01, v11, tx);
    return this.interpolate(top, bottom, ty);
  }

  // Noise utilities
  public static smoothNoise(
    noiseMap: number[][],
    x: number, y: number,
    smoothingRadius: number = 1
  ): number {
    if (!noiseMap || noiseMap.length === 0) return 0;

    const height = noiseMap.length;
    const width = noiseMap[0].length;

    let sum = 0;
    let count = 0;

    for (let dy = -smoothingRadius; dy <= smoothingRadius; dy++) {
      for (let dx = -smoothingRadius; dx <= smoothingRadius; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          sum += noiseMap[ny][nx];
          count++;
        }
      }
    }

    return count > 0 ? sum / count : 0;
  }

  public static normalizeNoiseMap(noiseMap: number[][]): number[][] {
    if (!noiseMap || noiseMap.length === 0) return noiseMap;

    let min = Infinity;
    let max = -Infinity;

    // Find min and max values
    for (const row of noiseMap) {
      for (const value of row) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    const range = max - min;
    if (range === 0) return noiseMap;

    // Normalize to [0, 1]
    return noiseMap.map(row =>
      row.map(value => (value - min) / range)
    );
  }

  // Cellular automata utilities
  public static applyCellularAutomata(
    grid: boolean[][],
    iterations: number = 5,
    birthLimit: number = 4,
    deathLimit: number = 3
  ): boolean[][] {
    let current = grid.map(row => [...row]);

    for (let i = 0; i < iterations; i++) {
      const next = current.map(row => [...row]);

      for (let y = 0; y < current.length; y++) {
        for (let x = 0; x < current[y].length; x++) {
          const neighbors = this.countCellularNeighbors(current, x, y);

          if (current[y][x]) {
            // Cell is alive
            next[y][x] = neighbors >= deathLimit;
          } else {
            // Cell is dead
            next[y][x] = neighbors > birthLimit;
          }
        }
      }

      current = next;
    }

    return current;
  }

  private static countCellularNeighbors(grid: boolean[][], x: number, y: number): number {
    let count = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        // Count out-of-bounds as walls
        if (nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) {
          count++;
        } else if (grid[ny][nx]) {
          count++;
        }
      }
    }

    return count;
  }

  // Voronoi utilities
  public static generateVoronoiDiagram(
    width: number, height: number,
    points: Array<{ x: number; y: number; id: string }>,
    metric: DistanceMetric = 'euclidean'
  ): string[][] {
    const diagram: string[][] = [];

    for (let y = 0; y < height; y++) {
      diagram[y] = [];
      for (let x = 0; x < width; x++) {
        let closestPoint = points[0];
        let minDistance = Infinity;

        for (const point of points) {
          const distance = this.distance(x, y, point.x, point.y, metric);
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
          }
        }

        diagram[y][x] = closestPoint.id;
      }
    }

    return diagram;
  }

  // Flood fill utilities
  public static floodFill(
    grid: any[][],
    startX: number, startY: number,
    newValue: any,
    shouldFill: (x: number, y: number, value: any) => boolean = (x, y, value) => true
  ): { x: number; y: number }[] {
    if (!grid || grid.length === 0) return [];

    const height = grid.length;
    const width = grid[0].length;
    const filledCells: { x: number; y: number }[] = [];

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return filledCells;
    }

    const originalValue = grid[startY][startX];
    if (!shouldFill(startX, startY, originalValue)) {
      return filledCells;
    }

    const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (!shouldFill(x, y, grid[y][x])) continue;

      grid[y][x] = newValue;
      filledCells.push({ x, y });

      // Add neighbors
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }

    return filledCells;
  }

  // Name generation utilities
  public static generateName(config: NameGeneratorConfig, random: () => number = Math.random): GeneratedName {
    const pattern = this.weightedChoice(
      config.patterns.map(p => ({ item: p, weight: p.weight })),
      random
    );

    let name = '';
    const targetLength = this.randomInt(pattern.minLength, pattern.maxLength, random);

    while (name.length < targetLength) {
      const remainingLength = targetLength - name.length;

      for (const char of pattern.pattern) {
        if (name.length >= targetLength) break;

        switch (char) {
          case 'C':
            name += this.randomChoice(config.phonemes.consonants, random);
            break;
          case 'V':
            name += this.randomChoice(config.phonemes.vowels, random);
            break;
          case '(':
            // Optional group start - skip for simplicity
            break;
          case ')':
            // Optional group end - skip for simplicity
            break;
          default:
            if (char !== '(' && char !== ')') {
              name += char.toLowerCase();
            }
        }
      }

      // Prevent infinite loops
      if (name.length === 0) {
        name = this.randomChoice(config.phonemes.vowels, random);
      }
    }

    // Apply constraints and cleanup
    name = this.cleanupName(name, config);

    return {
      name: this.capitalizeFirst(name),
      pronunciation: this.generatePronunciation(name),
      origin: config.language,
      variants: this.generateVariants(name, config, random)
    };
  }

  private static cleanupName(name: string, config: NameGeneratorConfig): string {
    // Remove forbidden phoneme combinations
    for (const forbidden of config.phonemes.forbidden) {
      name = name.replace(new RegExp(forbidden, 'g'), '');
    }

    // Apply constraints
    for (const constraint of config.constraints) {
      if (constraint.type === 'length' && name.length < 3) {
        name += this.randomChoice(config.phonemes.vowels);
      }
    }

    return name;
  }

  private static generatePronunciation(name: string): string {
    // Simple pronunciation guide (could be more sophisticated)
    return name.toLowerCase().replace(/([aeiou])/g, '$1ː');
  }

  private static generateVariants(
    name: string,
    config: NameGeneratorConfig,
    random: () => number
  ): string[] {
    const variants: string[] = [];

    // Generate some simple variants
    if (name.length > 4) {
      variants.push(name.substring(0, name.length - 1)); // Shortened
      variants.push(name + this.randomChoice(config.phonemes.vowels, random)); // Extended
    }

    // Add diminutive
    const diminutiveSuffixes = ['ie', 'y', 'ette', 'ling'];
    variants.push(name + this.randomChoice(diminutiveSuffixes, random));

    return variants.slice(0, 3); // Limit to 3 variants
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Array utilities
  public static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  public static unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  public static groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  }

  // Math utilities
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public static map(
    value: number,
    inMin: number, inMax: number,
    outMin: number, outMax: number
  ): number {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
  }

  public static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  public static step(edge: number, x: number): number {
    return x < edge ? 0 : 1;
  }

  // Grid utilities
  public static createGrid<T>(width: number, height: number, initialValue: T): T[][] {
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => initialValue)
    );
  }

  public static getNeighbors(
    x: number, y: number,
    width: number, height: number,
    includeDiagonals: boolean = false
  ): Array<{ x: number; y: number }> {
    const neighbors: Array<{ x: number; y: number }> = [];

    const directions = includeDiagonals
      ? [
          { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
          { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
          { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
        ]
      : [
          { dx: 0, dy: -1 },
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          { dx: 0, dy: 1 }
        ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  // Performance utilities
  public static measureTime<T>(fn: () => T): { result: T; time: number } {
    const start = (globalThis as any).performance?.now() || Date.now();
    const result = fn();
    const time = (globalThis as any).performance?.now() || Date.now() - start;
    return { result, time };
  }

  public static async measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = (globalThis as any).performance?.now() || Date.now();
    const result = await fn();
    const time = (globalThis as any).performance?.now() || Date.now() - start;
    return { result, time };
  }

  // Validation utilities
  public static validateRange(value: number, min: number, max: number, name: string = 'Value'): void {
    if (value < min || value > max) {
      throw new Error(`${name} must be between ${min} and ${max}, got ${value}`);
    }
  }

  public static validatePositive(value: number, name: string = 'Value'): void {
    if (value <= 0) {
      throw new Error(`${name} must be positive, got ${value}`);
    }
  }

  public static validateNonNegative(value: number, name: string = 'Value'): void {
    if (value < 0) {
      throw new Error(`${name} must be non-negative, got ${value}`);
    }
  }

  public static validateInteger(value: number, name: string = 'Value'): void {
    if (!Number.isInteger(value)) {
      throw new Error(`${name} must be an integer, got ${value}`);
    }
  }
}