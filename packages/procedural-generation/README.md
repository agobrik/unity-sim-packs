# @steam-sim/procedural-generation

Advanced procedural generation engine for terrains, cities, dungeons and game worlds with noise functions and algorithmic generation for Unity-based Steam games.

## Features

- **7 Advanced Noise Algorithms**: Perlin, Simplex, Worley, Ridge, Turbulence, Billow, Fractal noise generation
- **Realistic Terrain Generation**: Heightmaps, biomes, climate simulation, geological features, erosion modeling
- **Intelligent City Generation**: Road networks, district planning, building placement, utility infrastructure
- **12+ Biome System**: Realistic biomes with climate-based distribution and resource placement
- **Geological Features**: Mountains, valleys, canyons, craters, ridges, plateaus with realistic formation
- **Unity Optimization**: LOD system, texture splatting, mesh generation, performance culling

## Installation

```bash
npm install @steam-sim/procedural-generation
```

## Quick Start

```typescript
import { ProceduralGenerationEngine } from '@steam-sim/procedural-generation';

// Create world generator
const generator = new ProceduralGenerationEngine({
  worldSize: { width: 512, height: 512 },
  seed: 12345,
  scale: 1.0,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0
});

// Generate realistic terrain with biomes
const terrain = generator.generateTerrain({
  heightmapResolution: 512,
  biomeBlending: true,
  erosionSimulation: true,
  geologicalFeatures: true
});

// Generate procedural city
const city = generator.generateCity({
  population: 100000,
  districtTypes: ['residential', 'commercial', 'industrial'],
  roadDensity: 0.8,
  buildingDensity: 0.6
});

// Export for Unity
const unityData = generator.exportState();
```

## Core Systems

### NoiseGenerator
Advanced noise generation with 7 different algorithms:

```typescript
// Multi-octave Perlin noise
const perlinNoise = generator.generatePerlinNoise(x, y, octaves, persistence);

// Cellular Worley noise for cave systems
const worleyNoise = generator.generateWorleyNoise(x, y, cellSize, distanceFunction);

// Ridge noise for mountain ranges
const ridgeNoise = generator.generateRidgeNoise(x, y, octaves, ridgeOffset);

// Turbulence for chaotic features
const turbulence = generator.generateTurbulence(x, y, frequency, amplitude);
```

### TerrainGenerator
Comprehensive terrain generation with realistic features:

```typescript
const terrain = generator.generateTerrain({
  heightmapResolution: 1024,
  seaLevel: 0.3,
  mountainHeight: 0.9,
  biomeBlending: true,
  erosionSimulation: true,
  geologicalFeatures: true,
  resourceDistribution: true
});

// Access generated data
console.log(`Biomes generated: ${terrain.biomes.length}`);
console.log(`Resources placed: ${terrain.resources.length}`);
console.log(`Geological features: ${terrain.geologicalFeatures.length}`);
```

### CityGenerator
Intelligent urban planning with infrastructure:

```typescript
const city = generator.generateCity({
  population: 250000,
  centerPoint: { x: 256, y: 256 },
  districtTypes: ['downtown', 'residential', 'industrial', 'commercial'],
  roadDensity: 0.75,
  buildingDensity: 0.8,
  utilityNetworks: true,
  publicSpaces: true
});

// Generated city features
console.log(`Districts: ${city.districts.length}`);
console.log(`Road segments: ${city.roadNetwork.segments.length}`);
console.log(`Buildings: ${city.buildings.length}`);
console.log(`Utilities: ${city.utilities.powerGrid.length} power lines`);
```

## Biome System

### 12 Realistic Biomes
- **Tropical Rainforest**: High temperature, high precipitation
- **Temperate Forest**: Moderate climate, deciduous trees
- **Boreal Forest**: Cold climate, coniferous trees
- **Grassland**: Low precipitation, open plains
- **Desert**: Very low precipitation, extreme temperatures
- **Tundra**: Very cold, permafrost conditions
- **Savanna**: Hot, seasonal precipitation
- **Mediterranean**: Mild winters, dry summers
- **Wetland**: High water table, marsh conditions
- **Alpine**: High altitude, cold, rocky terrain
- **Coastal**: Ocean influence, moderate temperatures
- **Urban**: Human-modified environment

### Biome Features
```typescript
interface BiomeData {
  name: string;
  temperature: number;        // -50 to 50°C
  precipitation: number;      // 0 to 4000mm annually
  elevation: number;          // Preferred elevation range
  vegetation: VegetationType[];
  resources: ResourceType[];
  color: string;             // Primary biome color
  fertility: number;         // Agricultural potential
  traversability: number;   // Movement difficulty
}
```

## Terrain Features

### Geological Formations
- **Mountains**: Multi-peak ranges with realistic slope angles
- **Valleys**: River-carved with sediment deposition
- **Canyons**: Erosion-based deep cuts with layered rock
- **Craters**: Impact or volcanic formations with raised rims
- **Ridges**: Linear elevated features with steep sides
- **Plateaus**: Flat-topped elevated areas with cliff edges

### Erosion Simulation
```typescript
const erosionConfig = {
  iterations: 1000,
  rainAmount: 0.01,
  evaporationRate: 0.5,
  sedimentCapacity: 4,
  minSlope: 0.01,
  depositionRate: 0.3,
  erosionRadius: 3
};
```

## City Generation

### District Types
- **Downtown**: High-rise buildings, commercial centers, transit hubs
- **Residential**: Housing areas with parks and schools
- **Industrial**: Factories, warehouses, transportation infrastructure
- **Commercial**: Shopping centers, offices, entertainment districts

### Road Network
```typescript
interface RoadNetwork {
  highways: RoadSegment[];      // Major arterial roads
  arterials: RoadSegment[];     // Secondary roads
  collectors: RoadSegment[];    // Neighborhood roads
  locals: RoadSegment[];        // Local streets
  intersections: Intersection[];
}
```

### Building Placement
- **Zoning Compliance**: Buildings respect district rules
- **Density Gradients**: Realistic urban density patterns
- **Height Restrictions**: Zoning-based building heights
- **Setback Rules**: Realistic building placement from roads

## Unity Integration

### Heightmap Export
```json
{
  "heightmap": {
    "resolution": 1024,
    "heights": [...],
    "scale": { "x": 1000, "y": 100, "z": 1000 },
    "textureWeights": [...],
    "biomeMap": [...]
  },
  "vegetation": [
    {
      "prefabName": "Pine_Tree_01",
      "positions": [...],
      "rotations": [...],
      "scales": [...]
    }
  ]
}
```

### City Mesh Export
```json
{
  "roads": {
    "meshData": {
      "vertices": [...],
      "triangles": [...],
      "uvs": [...]
    },
    "materials": ["asphalt", "concrete", "dirt"]
  },
  "buildings": [
    {
      "prefab": "office_building_03",
      "position": { "x": 245, "y": 0, "z": 156 },
      "rotation": { "x": 0, "y": 45, "z": 0 },
      "scale": { "x": 1, "y": 1.2, "z": 1 }
    }
  ]
}
```

### Performance Optimization
- **LOD System**: Distance-based detail reduction
- **Culling**: Frustum and occlusion culling for large worlds
- **Streaming**: Chunk-based world loading
- **Mesh Batching**: Optimized draw calls for similar objects

## Game Applications

### Open World Games
- **RPGs**: Vast explorable worlds with varied biomes
- **Survival Games**: Resource-rich environments with realistic geography
- **Space Exploration**: Planetary generation with unique biomes

### City Builders
- **Urban Planning**: Realistic city layouts with infrastructure
- **Transportation Networks**: Road and utility planning
- **Zoning Systems**: Realistic urban development patterns

### Strategy Games
- **Terrain Advantages**: Realistic battlefield generation
- **Resource Management**: Strategic resource placement
- **Settlement Planning**: Optimal city placement algorithms

## Configuration Examples

### Mountainous World
```typescript
const mountainWorld = generator.generateTerrain({
  heightmapResolution: 512,
  mountainFrequency: 0.8,
  valleyDepth: 0.3,
  ridgeSharpness: 0.9,
  erosionStrength: 0.4,
  biomes: ['alpine', 'boreal_forest', 'tundra']
});
```

### Island Archipelago
```typescript
const islands = generator.generateArchipelago({
  islandCount: 15,
  islandSizeVariation: 0.6,
  seaLevel: 0.4,
  volcanism: true,
  coralReefs: true,
  biomes: ['tropical_rainforest', 'coastal', 'desert']
});
```

### Medieval Fantasy City
```typescript
const medievalCity = generator.generateCity({
  style: 'medieval',
  population: 50000,
  hasWalls: true,
  castle: true,
  districts: ['noble', 'merchant', 'craftsman', 'peasant'],
  roadPattern: 'organic'
});
```

## Performance Characteristics

- **Large Worlds**: Support for 4096x4096 heightmaps with real-time generation
- **City Generation**: 100,000+ building cities with optimized placement algorithms
- **Memory Efficient**: Chunk-based generation reduces memory footprint
- **Multi-threaded**: CPU-intensive operations use worker threads where available

## Examples

See `examples/basic/world-generation.ts` for complete world generation examples including:
- Realistic island generation with biomes
- Continental landmass with mountain ranges
- Archipelago with volcanic islands
- Medieval fantasy city with districts

## License

MIT