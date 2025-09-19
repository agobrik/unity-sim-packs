import { HeightmapData } from '../core/TerrainGenerator';
import { CityLayout } from '../core/CityGenerator';

export interface UnityTerrainData {
  heightmap: {
    width: number;
    height: number;
    heights: number[];
    scale: { x: number; y: number; z: number };
  };
  textures: {
    biomeTextures: { [biome: string]: string };
    splat: number[];
  };
  vegetation: {
    trees: { position: { x: number; y: number; z: number }; type: string; scale: number }[];
    grass: { position: { x: number; y: number; z: number }; density: number }[];
  };
  water: {
    rivers: { points: { x: number; y: number; z: number }[]; width: number }[];
    lakes: { center: { x: number; y: number; z: number }; radius: number; depth: number }[];
  };
}

export interface UnityCityData {
  districts: {
    id: string;
    name: string;
    type: string;
    bounds: { x: number; y: number; z: number; width: number; height: number; depth: number };
    meshData: UnityMeshData;
  }[];
  buildings: {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    prefabName: string;
    materials: string[];
  }[];
  roads: {
    id: string;
    type: string;
    points: { x: number; y: number; z: number }[];
    width: number;
    material: string;
    meshData: UnityMeshData;
  }[];
  utilities: {
    type: string;
    nodes: { id: string; position: { x: number; y: number; z: number }; prefabName: string }[];
    connections: { from: string; to: string; meshData: UnityMeshData }[];
  }[];
  landmarks: {
    name: string;
    position: { x: number; y: number; z: number };
    type: string;
    prefabName: string;
  }[];
  lighting: {
    streetLights: { position: { x: number; y: number; z: number }; type: string }[];
    ambientSettings: { skyColor: string; groundColor: string; intensity: number };
  };
}

export interface UnityMeshData {
  vertices: { x: number; y: number; z: number }[];
  triangles: number[];
  normals: { x: number; y: number; z: number }[];
  uvs: { x: number; y: number }[];
  materials: string[];
}

export interface ProceduralGenerationUnityExport {
  metadata: {
    generatedAt: string;
    version: string;
    seed: number;
    generator: string;
  };
  terrain: UnityTerrainData;
  city: UnityCityData;
  gameplayElements: {
    spawnPoints: { position: { x: number; y: number; z: number }; type: string }[];
    objectives: { position: { x: number; y: number; z: number }; type: string; description: string }[];
    collectibles: { position: { x: number; y: number; z: number }; type: string; value: number }[];
  };
  optimization: {
    lodLevels: { distance: number; meshQuality: number }[];
    occlusionCulling: boolean;
    lightmapping: boolean;
  };
}

export class UnityExporter {
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
  }

  exportTerrain(terrainData: HeightmapData): UnityTerrainData {
    // Convert heightmap to Unity format
    const heights: number[] = [];
    for (let y = 0; y < terrainData.height; y++) {
      for (let x = 0; x < terrainData.width; x++) {
        heights.push(terrainData.elevations[y][x] / 1000); // Normalize for Unity
      }
    }

    // Create biome texture splatmap
    const splat: number[] = [];
    const biomeIndices: { [biome: string]: number } = {
      'arctic': 0, 'tundra': 1, 'taiga': 2, 'temperate_grassland': 3,
      'temperate_forest': 4, 'subtropical_desert': 5, 'tropical_rainforest': 6,
      'tropical_savanna': 7, 'mountain': 8, 'coastal': 9
    };

    for (let y = 0; y < terrainData.height; y++) {
      for (let x = 0; x < terrainData.width; x++) {
        const biome = terrainData.biomes[y][x];
        const index = biomeIndices[biome] || 0;

        // Create RGBA values for texture splatting
        splat.push(index === 0 ? 1 : 0); // R
        splat.push(index === 1 ? 1 : 0); // G
        splat.push(index === 2 ? 1 : 0); // B
        splat.push(index === 3 ? 1 : 0); // A
      }
    }

    // Generate vegetation
    const trees: { position: { x: number; y: number; z: number }; type: string; scale: number }[] = [];
    const grass: { position: { x: number; y: number; z: number }; density: number }[] = [];

    for (let y = 0; y < terrainData.height; y += 10) {
      for (let x = 0; x < terrainData.width; x += 10) {
        const biome = terrainData.biomes[y][x];
        const elevation = terrainData.elevations[y][x];

        // Add trees based on biome
        if (this.shouldPlaceVegetation(biome, elevation)) {
          const treeType = this.getTreeType(biome);
          const density = this.getVegetationDensity(biome);

          for (let i = 0; i < density * 5; i++) {
            const offsetX = x + (Math.random() - 0.5) * 10;
            const offsetY = y + (Math.random() - 0.5) * 10;

            if (offsetX >= 0 && offsetX < terrainData.width && offsetY >= 0 && offsetY < terrainData.height) {
              trees.push({
                position: {
                  x: offsetX,
                  y: elevation,
                  z: offsetY
                },
                type: treeType,
                scale: 0.8 + Math.random() * 0.4
              });
            }
          }

          // Add grass
          grass.push({
            position: {
              x: x,
              y: elevation,
              z: y
            },
            density: density * 0.5
          });
        }
      }
    }

    // Convert rivers and lakes
    const rivers = terrainData.rivers.map(river => ({
      points: river.map(point => ({
        x: point.x,
        y: terrainData.elevations[Math.floor(point.y)][Math.floor(point.x)],
        z: point.y
      })),
      width: 5
    }));

    const lakes = terrainData.lakes.map(lake => ({
      center: {
        x: lake.x,
        y: terrainData.elevations[Math.floor(lake.y)][Math.floor(lake.x)],
        z: lake.y
      },
      radius: lake.radius,
      depth: 10
    }));

    return {
      heightmap: {
        width: terrainData.width,
        height: terrainData.height,
        heights,
        scale: { x: 1, y: 100, z: 1 }
      },
      textures: {
        biomeTextures: {
          'arctic': 'Textures/Terrain/Snow',
          'tundra': 'Textures/Terrain/Tundra',
          'taiga': 'Textures/Terrain/Forest',
          'temperate_grassland': 'Textures/Terrain/Grass',
          'temperate_forest': 'Textures/Terrain/DenseForest',
          'subtropical_desert': 'Textures/Terrain/Desert',
          'tropical_rainforest': 'Textures/Terrain/Jungle',
          'tropical_savanna': 'Textures/Terrain/Savanna',
          'mountain': 'Textures/Terrain/Rock',
          'coastal': 'Textures/Terrain/Sand'
        },
        splat
      },
      vegetation: {
        trees,
        grass
      },
      water: {
        rivers,
        lakes
      }
    };
  }

  exportCity(cityData: CityLayout): UnityCityData {
    // Convert districts
    const districts = cityData.districts.map(district => ({
      id: district.id,
      name: district.name,
      type: district.type,
      bounds: {
        x: district.bounds.x,
        y: 0,
        z: district.bounds.y,
        width: district.bounds.width,
        height: 50, // Default building height for district bounds
        depth: district.bounds.height
      },
      meshData: this.generateDistrictMesh(district)
    }));

    // Convert buildings
    const buildings = cityData.buildings.map(building => {
      const prefabName = this.getBuildingPrefab(building.type, building.purpose);
      const materials = this.getBuildingMaterials(building.type, building.value);

      return {
        id: building.id,
        type: building.type,
        position: {
          x: building.position.x,
          y: 0,
          z: building.position.y
        },
        rotation: {
          x: 0,
          y: Math.random() * 360, // Random rotation for variety
          z: 0
        },
        scale: {
          x: building.size.width / 10, // Normalize to Unity scale
          y: building.height,
          z: building.size.height / 10
        },
        prefabName,
        materials
      };
    });

    // Convert roads
    const roads = cityData.roads.map(road => ({
      id: road.id,
      type: road.type,
      points: road.points.map(point => ({
        x: point.x,
        y: 0,
        z: point.y
      })),
      width: road.width,
      material: this.getRoadMaterial(road.type),
      meshData: this.generateRoadMesh(road)
    }));

    // Convert utilities
    const utilities = cityData.utilities.map(utility => ({
      type: utility.type,
      nodes: utility.nodes.map(node => ({
        id: node.id,
        position: {
          x: node.x,
          y: 0,
          z: node.y
        },
        prefabName: this.getUtilityPrefab(utility.type, node.capacity)
      })),
      connections: utility.connections.map(connection => ({
        from: connection.from,
        to: connection.to,
        meshData: this.generateUtilityConnectionMesh(connection, utility.nodes)
      }))
    }));

    // Convert landmarks
    const landmarks = cityData.landmarks.map(landmark => ({
      name: landmark.name,
      position: {
        x: landmark.x,
        y: 0,
        z: landmark.y
      },
      type: landmark.type,
      prefabName: `Prefabs/Landmarks/${landmark.type}`
    }));

    // Generate lighting
    const streetLights = this.generateStreetLights(cityData.roads);

    return {
      districts,
      buildings,
      roads,
      utilities,
      landmarks,
      lighting: {
        streetLights,
        ambientSettings: {
          skyColor: '#87CEEB',
          groundColor: '#4B4B4B',
          intensity: 1.0
        }
      }
    };
  }

  exportComplete(terrainData: HeightmapData, cityData: CityLayout): ProceduralGenerationUnityExport {
    const terrain = this.exportTerrain(terrainData);
    const city = this.exportCity(cityData);

    // Generate gameplay elements
    const gameplayElements = this.generateGameplayElements(terrainData, cityData);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        seed: this.seed,
        generator: 'ProceduralGenerationEngine'
      },
      terrain,
      city,
      gameplayElements,
      optimization: {
        lodLevels: [
          { distance: 100, meshQuality: 1.0 },
          { distance: 500, meshQuality: 0.6 },
          { distance: 1000, meshQuality: 0.3 },
          { distance: 2000, meshQuality: 0.1 }
        ],
        occlusionCulling: true,
        lightmapping: true
      }
    };
  }

  private shouldPlaceVegetation(biome: string, elevation: number): boolean {
    const vegetationBiomes = ['taiga', 'temperate_forest', 'tropical_rainforest', 'temperate_grassland'];
    return vegetationBiomes.includes(biome) && elevation > -10;
  }

  private getTreeType(biome: string): string {
    const treeTypes: { [biome: string]: string } = {
      'taiga': 'Prefabs/Vegetation/Pine',
      'temperate_forest': 'Prefabs/Vegetation/Oak',
      'tropical_rainforest': 'Prefabs/Vegetation/Jungle',
      'temperate_grassland': 'Prefabs/Vegetation/Birch'
    };
    return treeTypes[biome] || 'Prefabs/Vegetation/Generic';
  }

  private getVegetationDensity(biome: string): number {
    const densities: { [biome: string]: number } = {
      'tropical_rainforest': 1.0,
      'temperate_forest': 0.8,
      'taiga': 0.6,
      'temperate_grassland': 0.3,
      'tropical_savanna': 0.2
    };
    return densities[biome] || 0.1;
  }

  private getBuildingPrefab(type: string, purpose: string): string {
    const prefabs: { [key: string]: string } = {
      'house': 'Prefabs/Buildings/Residential/House',
      'apartment': 'Prefabs/Buildings/Residential/Apartment',
      'office': 'Prefabs/Buildings/Commercial/Office',
      'shop': 'Prefabs/Buildings/Commercial/Shop',
      'factory': 'Prefabs/Buildings/Industrial/Factory',
      'warehouse': 'Prefabs/Buildings/Industrial/Warehouse',
      'school': 'Prefabs/Buildings/Civic/School',
      'hospital': 'Prefabs/Buildings/Civic/Hospital',
      'special': `Prefabs/Buildings/Special/${purpose}`
    };
    return prefabs[type] || 'Prefabs/Buildings/Generic';
  }

  private getBuildingMaterials(type: string, value: number): string[] {
    const qualityLevel = value > 1000000 ? 'High' : value > 500000 ? 'Medium' : 'Low';
    return [`Materials/Buildings/${type}_${qualityLevel}`];
  }

  private getRoadMaterial(type: string): string {
    const materials: { [type: string]: string } = {
      'highway': 'Materials/Roads/Highway',
      'arterial': 'Materials/Roads/Arterial',
      'collector': 'Materials/Roads/Collector',
      'local': 'Materials/Roads/Local',
      'alley': 'Materials/Roads/Alley'
    };
    return materials[type] || 'Materials/Roads/Default';
  }

  private getUtilityPrefab(type: string, capacity: number): string {
    const size = capacity > 5000 ? 'Large' : capacity > 1000 ? 'Medium' : 'Small';
    return `Prefabs/Utilities/${type}_${size}`;
  }

  private generateDistrictMesh(district: any): UnityMeshData {
    // Generate a simple quad mesh for the district bounds
    const vertices = [
      { x: 0, y: 0, z: 0 },
      { x: district.bounds.width, y: 0, z: 0 },
      { x: district.bounds.width, y: 0, z: district.bounds.height },
      { x: 0, y: 0, z: district.bounds.height }
    ];

    const triangles = [0, 1, 2, 0, 2, 3];

    const normals = [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 }
    ];

    const uvs = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];

    return {
      vertices,
      triangles,
      normals,
      uvs,
      materials: [`Materials/Districts/${district.type}`]
    };
  }

  private generateRoadMesh(road: any): UnityMeshData {
    const vertices: { x: number; y: number; z: number }[] = [];
    const triangles: number[] = [];
    const normals: { x: number; y: number; z: number }[] = [];
    const uvs: { x: number; y: number }[] = [];

    // Generate road mesh from points
    for (let i = 0; i < road.points.length - 1; i++) {
      const p1 = road.points[i];
      const p2 = road.points[i + 1];

      // Calculate perpendicular for road width
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / length * road.width / 2;
      const perpZ = dx / length * road.width / 2;

      // Add vertices for road segment
      const baseIndex = vertices.length;
      vertices.push(
        { x: p1.x - perpX, y: 0, z: p1.z - perpZ },
        { x: p1.x + perpX, y: 0, z: p1.z + perpZ },
        { x: p2.x + perpX, y: 0, z: p2.z + perpZ },
        { x: p2.x - perpX, y: 0, z: p2.z - perpZ }
      );

      // Add triangles
      triangles.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );

      // Add normals (all pointing up)
      for (let j = 0; j < 4; j++) {
        normals.push({ x: 0, y: 1, z: 0 });
      }

      // Add UVs
      const uvStart = i / (road.points.length - 1);
      const uvEnd = (i + 1) / (road.points.length - 1);
      uvs.push(
        { x: 0, y: uvStart },
        { x: 1, y: uvStart },
        { x: 1, y: uvEnd },
        { x: 0, y: uvEnd }
      );
    }

    return {
      vertices,
      triangles,
      normals,
      uvs,
      materials: [this.getRoadMaterial(road.type)]
    };
  }

  private generateUtilityConnectionMesh(connection: any, nodes: any[]): UnityMeshData {
    // Simple line mesh for utility connections
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);

    if (!fromNode || !toNode) {
      return { vertices: [], triangles: [], normals: [], uvs: [], materials: [] };
    }

    const vertices = [
      { x: fromNode.x, y: 0, z: fromNode.y },
      { x: toNode.x, y: 0, z: toNode.y }
    ];

    return {
      vertices,
      triangles: [0, 1],
      normals: [
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 1, z: 0 }
      ],
      uvs: [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ],
      materials: ['Materials/Utilities/Connection']
    };
  }

  private generateStreetLights(roads: any[]): { position: { x: number; y: number; z: number }; type: string }[] {
    const streetLights: { position: { x: number; y: number; z: number }; type: string }[] = [];

    for (const road of roads) {
      if (road.type === 'highway' || road.type === 'arterial') {
        // Place lights along major roads
        for (let i = 0; i < road.points.length - 1; i += 2) {
          const point = road.points[i];
          streetLights.push({
            position: {
              x: point.x,
              y: 8, // Height of street light
              z: point.z
            },
            type: road.type === 'highway' ? 'highway_light' : 'street_light'
          });
        }
      }
    }

    return streetLights;
  }

  private generateGameplayElements(terrainData: HeightmapData, cityData: CityLayout): any {
    const spawnPoints: { position: { x: number; y: number; z: number }; type: string }[] = [];
    const objectives: { position: { x: number; y: number; z: number }; type: string; description: string }[] = [];
    const collectibles: { position: { x: number; y: number; z: number }; type: string; value: number }[] = [];

    // Generate spawn points in each district
    cityData.districts.forEach(district => {
      spawnPoints.push({
        position: {
          x: district.bounds.x + district.bounds.width / 2,
          y: 0,
          z: district.bounds.y + district.bounds.height / 2
        },
        type: `${district.type}_spawn`
      });
    });

    // Generate objectives at landmarks
    cityData.landmarks.forEach(landmark => {
      objectives.push({
        position: {
          x: landmark.x,
          y: 0,
          z: landmark.y
        },
        type: 'landmark_objective',
        description: `Visit ${landmark.name}`
      });
    });

    // Generate collectibles in interesting locations
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * terrainData.width;
      const y = Math.random() * terrainData.height;
      const elevation = terrainData.elevations[Math.floor(y)][Math.floor(x)];

      if (elevation > 0) { // Above sea level
        collectibles.push({
          position: {
            x: x,
            y: elevation,
            z: y
          },
          type: 'treasure',
          value: Math.floor(Math.random() * 1000) + 100
        });
      }
    }

    return {
      spawnPoints,
      objectives,
      collectibles
    };
  }

  exportToJSON(data: ProceduralGenerationUnityExport): string {
    return JSON.stringify(data, null, 2);
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }
}