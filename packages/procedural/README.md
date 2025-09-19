# @steam-sim/procedural

Advanced procedural content generation system with noise functions, grammars, and algorithms for creating dynamic simulation content.

## Features

- **Noise Generation**: Perlin, Simplex, Worley, and fractal noise with configurable parameters
- **Terrain Generation**: Multi-biome terrain with elevation, temperature, humidity, and erosion
- **Maze Generation**: Multiple algorithms including recursive backtracking, Kruskal, Prim, and binary tree
- **Wave Function Collapse**: Constraint-based tile generation for consistent layouts
- **Name Generation**: Phoneme-based procedural naming with linguistic rules
- **Cellular Automata**: Pattern generation and evolution systems
- **Utility Functions**: Distance metrics, interpolation, and mathematical helpers
- **Caching System**: Intelligent result caching with memory management
- **Deterministic Generation**: Seed-based reproducible results

## Installation

```bash
npm install @steam-sim/procedural
```

## Quick Start

### Basic Procedural Generator

```typescript
import { ProceduralGenerator } from '@steam-sim/procedural';

const generator = new ProceduralGenerator({
  seed: 12345,
  useCache: true,
  maxRetries: 3
});

// Generate random content
const randomValue = await generator.generate('random', (ctx) => {
  return ctx.random() * 100;
});

// Generate with custom logic
const dungeon = await generator.generate('dungeon', (ctx) => {
  return {
    rooms: ctx.randomInt(5, 15),
    width: ctx.randomInt(50, 100),
    height: ctx.randomInt(50, 100),
    difficulty: ctx.randomChoice(['easy', 'medium', 'hard'])
  };
});

console.log('Generated dungeon:', dungeon);
```

### Noise Generation

```typescript
import { NoiseGenerator } from '@steam-sim/procedural';

const noise = new NoiseGenerator({
  seed: 12345,
  octaves: 6,
  frequency: 0.01,
  amplitude: 1.0,
  persistence: 0.5,
  lacunarity: 2.0
});

// Generate 2D height map
const heightMap = noise.generateHeightMap(128, 128, 100);

// Generate specialized noise
const ridgedNoise = noise.generateRidgedNoise(x, y);
const worleyNoise = noise.generateWorleyNoise(x, y, 1.0);
const turbulence = noise.generateTurbulence(x, y);

// Generate noise map for terrain
const terrainNoise = NoiseGenerator.createTerrainNoise(12345);
const elevationMap = terrainNoise.generateNoiseMap(256, 256);
```

### Terrain Generation

```typescript
import { TerrainGenerator } from '@steam-sim/procedural';

const terrainConfig = {
  width: 128,
  height: 128,
  scale: 1.0,
  heightMultiplier: 100,
  noiseConfig: {
    seed: 12345,
    octaves: 6,
    frequency: 0.01,
    amplitude: 1.0,
    persistence: 0.6,
    lacunarity: 2.0
  },
  biomes: TerrainGenerator.createDefaultBiomes(),
  erosionSettings: {
    iterations: 50,
    evaporationRate: 0.02,
    sedimentCapacity: 4.0,
    erosionRadius: 3,
    erosionSpeed: 0.3,
    depositionSpeed: 0.3
  }
};

const terrainGen = new TerrainGenerator(terrainConfig);
const terrain = terrainGen.generate();

// Analyze terrain
const stats = terrainGen.getTerrainStats(terrain);
console.log('Terrain stats:', stats);
```

### Maze Generation

```typescript
import { MazeGenerator } from '@steam-sim/procedural';

const mazeConfig = {
  width: 25,
  height: 25,
  algorithm: 'recursive_backtrack',
  seed: 12345,
  bias: {
    horizontal: 0.2, // Slight preference for horizontal paths
    start: { x: 0, y: 0 },
    end: { x: 24, y: 24 }
  },
  deadEndRemoval: 0.3 // Remove 30% of dead ends
};

const mazeGen = new MazeGenerator(mazeConfig);
const maze = mazeGen.generate();

// Solve the maze
const path = mazeGen.solveMaze(0, 0, 24, 24);
console.log('Maze solution path length:', path.length);

// Export as ASCII
const asciiMaze = mazeGen.getMazeAsString();
console.log(asciiMaze);
```

### Wave Function Collapse

```typescript
import { WaveFunctionCollapse } from '@steam-sim/procedural';

const wfcConfig = {
  width: 20,
  height: 20,
  tileSize: 32,
  tiles: WaveFunctionCollapse.createSimpleTileSet(),
  constraints: [
    {
      type: 'adjacency',
      tile1: 'water',
      tile2: 'shore',
      direction: 'north'
    }
  ],
  borderTile: 'grass',
  retryCount: 5
};

const wfc = new WaveFunctionCollapse(wfcConfig);
const tileMap = wfc.generate();

console.log('Generated tile map:', tileMap);
```

## Core Classes

### ProceduralGenerator

Main generator class with caching, error handling, and utilities.

```typescript
const generator = new ProceduralGenerator(options);

// Basic generation
const result = await generator.generate(key, generatorFunction);

// Batch generation
const batch = await generator.generateBatch([
  { key: 'item1', generator: (ctx) => generateItem1(ctx) },
  { key: 'item2', generator: (ctx) => generateItem2(ctx) }
], parallel = true);

// Queue management
const queued = generator.queueGeneration('queued', generatorFn);

// Utility methods
const randomInt = generator.randomInt(1, 10);
const choice = generator.randomChoice(['a', 'b', 'c']);
const weighted = generator.weightedChoice([
  { item: 'rare', weight: 1 },
  { item: 'common', weight: 9 }
]);

// Statistics and caching
const stats = generator.getStats();
const cacheStats = generator.getCacheStats();
generator.clearCache();
```

### NoiseGenerator

Perlin noise and variants for natural-looking patterns.

```typescript
const noise = new NoiseGenerator(config);

// Basic noise
const value2D = noise.generate2D(x, y);
const value3D = noise.generate3D(x, y, z);

// Specialized noise types
const ridged = noise.generateRidgedNoise(x, y);
const billow = noise.generateBillowNoise(x, y);
const worley = noise.generateWorleyNoise(x, y, density);
const turbulence = noise.generateTurbulence(x, y);
const warped = noise.generateDomainWarping(x, y, strength);

// Maps and utilities
const heightMap = noise.generateHeightMap(width, height, heightMultiplier);
const normalized = noise.normalize(value, min, max);
const thresholded = noise.threshold(value, threshold);

// Configuration
noise.setFrequency(0.02);
noise.setOctaves(8);
noise.setSeed(newSeed);
```

### TerrainGenerator

Multi-layered terrain generation with biomes and features.

```typescript
const terrain = new TerrainGenerator(config);
const generated = terrain.generate(context);

// Each terrain point contains:
// - elevation, temperature, humidity
// - biome classification
// - vegetation instances
// - structure instances

const stats = terrain.getTerrainStats(generated);
const exported = terrain.exportTerrain(generated);
```

### MazeGenerator

Various maze generation algorithms.

```typescript
const maze = new MazeGenerator(config);
const generated = maze.generate();

// Algorithms available:
// - recursive_backtrack
// - kruskal
// - prim
// - binary_tree
// - sidewinder

const solution = maze.solveMaze(startX, startY, endX, endY);
const ascii = maze.getMazeAsString();
const stats = maze.getStats();
```

### WaveFunctionCollapse

Constraint-based tile placement system.

```typescript
const wfc = new WaveFunctionCollapse(config);
const result = wfc.generate();

// Built-in tile sets
const simpleTiles = WaveFunctionCollapse.createSimpleTileSet();
const dungeonTiles = WaveFunctionCollapse.createDungeonTileSet();

const debug = wfc.getDebugInfo();
```

## Utility Functions

### ProceduralHelpers

Collection of mathematical and algorithmic utilities.

```typescript
import { ProceduralHelpers } from '@steam-sim/procedural';

// Random utilities
const seededRandom = ProceduralHelpers.seededRandom(12345);
const randomInt = ProceduralHelpers.randomInt(1, 10, seededRandom);
const choice = ProceduralHelpers.randomChoice(array, seededRandom);
const shuffled = ProceduralHelpers.shuffle(array, seededRandom);

// Distance calculations
const euclidean = ProceduralHelpers.distance(x1, y1, x2, y2, 'euclidean');
const manhattan = ProceduralHelpers.distance(x1, y1, x2, y2, 'manhattan');

// Interpolation
const linear = ProceduralHelpers.interpolate(a, b, t, 'linear');
const cosine = ProceduralHelpers.interpolate(a, b, t, 'cosine');
const cubic = ProceduralHelpers.interpolate(a, b, t, 'cubic');

// Cellular automata
const evolved = ProceduralHelpers.applyCellularAutomata(grid, iterations);

// Voronoi diagrams
const voronoi = ProceduralHelpers.generateVoronoiDiagram(width, height, points);

// Flood fill
const filled = ProceduralHelpers.floodFill(grid, startX, startY, newValue);

// Name generation
const name = ProceduralHelpers.generateName(nameConfig, seededRandom);
```

## Advanced Features

### Custom Biomes

```typescript
const customBiome = {
  id: 'volcanic',
  name: 'Volcanic Region',
  temperature: { min: 0.8, max: 1.0 },
  humidity: { min: -0.5, max: 0.2 },
  elevation: { min: 0.6, max: 1.0 },
  color: { r: 150, g: 50, b: 50 },
  vegetation: [
    {
      type: 'ash_tree',
      density: 0.1,
      minSize: 0.5,
      maxSize: 1.0,
      probability: 0.2,
      conditions: [
        { property: 'temperature', min: 0.7, max: 0.9 }
      ]
    }
  ],
  structures: []
};
```

### Custom WFC Tiles

```typescript
const customTile = {
  id: 'corner_building',
  name: 'Corner Building',
  weight: 3,
  sockets: {
    north: ['street', 'sidewalk'],
    east: ['street', 'sidewalk'],
    south: ['building'],
    west: ['building']
  },
  rotation: true,
  metadata: {
    type: 'building',
    floors: 3,
    commercial: true
  }
};
```

### Performance Optimization

```typescript
// Use child generators for parallel processing
const mainGen = new ProceduralGenerator({ seed: 12345 });
const workers = Array.from({ length: 4 }, (_, i) =>
  mainGen.createChildGenerator({ seed: 12345 + i })
);

// Process in parallel
const results = await Promise.all(
  workers.map((worker, i) =>
    worker.generate(`chunk_${i}`, generateChunk)
  )
);

// Clean up
workers.forEach(worker => worker.dispose());
```

### Error Handling and Recovery

```typescript
const generator = new ProceduralGenerator({
  seed: 12345,
  maxRetries: 5,
  timeout: 10000,
  errorCallback: (error, context) => {
    console.warn(`Generation failed: ${error.message} (${context})`);
  },
  progressCallback: (progress, stage) => {
    console.log(`${stage}: ${(progress * 100).toFixed(1)}%`);
  }
});

// Handle failures gracefully
try {
  const result = await generator.generate('risky', riskyGenerator);
} catch (error) {
  // Fallback to simpler generation
  const fallback = await generator.generate('safe', safeGenerator);
}
```

## Events

The ProceduralGenerator emits events for monitoring:

- `generation_started` - Generation began
- `generation_progress` - Progress update
- `generation_completed` - Generation finished successfully
- `generation_failed` - Generation failed after retries
- `cache_hit` - Result retrieved from cache
- `cache_miss` - Result not in cache, generating new
- `performance_warning` - Performance threshold exceeded

```typescript
generator.on('generation_completed', (event) => {
  console.log(`Generated ${event.data.key} in ${event.data.duration}ms`);
});

generator.on('cache_hit', (event) => {
  console.log(`Cache hit for ${event.data.key}`);
});
```

## Best Practices

1. **Seeding**: Use consistent seeds for reproducible results
2. **Caching**: Enable caching for expensive operations
3. **Memory Management**: Clear caches periodically for long-running applications
4. **Error Handling**: Set appropriate retry counts and timeouts
5. **Progress Tracking**: Use progress callbacks for long operations
6. **Performance**: Use batch generation for multiple items
7. **Validation**: Validate generated content meets requirements

## Examples

See the `examples/` directory for complete implementations:

- `terrain-generation.ts` - Complete terrain generation system
- `dungeon-crawler.ts` - Procedural dungeon generation
- `city-builder.ts` - Urban environment generation
- `noise-visualization.ts` - Noise function examples

## License

MIT