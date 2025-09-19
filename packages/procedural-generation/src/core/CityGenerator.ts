import { NoiseGenerator } from './NoiseGenerator';

export interface CityConfig {
  name: string;
  size: 'small' | 'medium' | 'large' | 'metropolis';
  population: number;
  economicFocus: 'residential' | 'commercial' | 'industrial' | 'mixed';
  terrainFactor: number; // How much terrain affects layout (0-1)
  gridLayout: boolean; // True for grid, false for organic
  riverPresent: boolean;
  coastalCity: boolean;
}

export interface District {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'industrial' | 'government' | 'recreational' | 'mixed';
  bounds: { x: number; y: number; width: number; height: number };
  population: number;
  buildingDensity: number; // 0-1
  wealthLevel: number; // 0-1, affects building quality
  services: string[]; // Available services in district
}

export interface Building {
  id: string;
  type: 'house' | 'apartment' | 'office' | 'shop' | 'factory' | 'warehouse' | 'school' | 'hospital' | 'park' | 'special';
  position: { x: number; y: number };
  size: { width: number; height: number };
  height: number; // Number of floors
  capacity: number; // People/units it can hold
  purpose: string; // Specific function
  constructionYear: number;
  value: number; // Economic value
}

export interface Road {
  id: string;
  type: 'highway' | 'arterial' | 'collector' | 'local' | 'alley';
  points: { x: number; y: number }[];
  width: number;
  traffic: number; // Expected traffic volume
  connections: string[]; // Connected road IDs
}

export interface UtilityNetwork {
  type: 'power' | 'water' | 'sewer' | 'internet' | 'gas';
  nodes: { id: string; x: number; y: number; capacity: number }[];
  connections: { from: string; to: string; capacity: number }[];
  coverage: { x: number; y: number; radius: number }[];
}

export interface CityLayout {
  config: CityConfig;
  bounds: { x: number; y: number; width: number; height: number };
  districts: District[];
  buildings: Building[];
  roads: Road[];
  utilities: UtilityNetwork[];
  landmarks: { name: string; x: number; y: number; type: string }[];
  greenSpaces: { name: string; x: number; y: number; width: number; height: number; type: string }[];
}

export class CityGenerator {
  private noise: NoiseGenerator;
  private buildingTypes: { [key: string]: any } = {};

  constructor(seed: number = 0) {
    this.noise = new NoiseGenerator(seed);
    this.initializeBuildingTypes();
  }

  private initializeBuildingTypes(): void {
    this.buildingTypes = {
      residential: {
        house: { width: 10, height: 8, floors: 1, capacity: 4, cost: 200000 },
        apartment: { width: 20, height: 15, floors: 3, capacity: 12, cost: 800000 },
        condo: { width: 25, height: 20, floors: 5, capacity: 20, cost: 2000000 },
        mansion: { width: 30, height: 25, floors: 2, capacity: 8, cost: 5000000 }
      },
      commercial: {
        shop: { width: 8, height: 12, floors: 1, capacity: 20, cost: 300000 },
        restaurant: { width: 12, height: 15, floors: 1, capacity: 50, cost: 500000 },
        mall: { width: 100, height: 80, floors: 2, capacity: 2000, cost: 50000000 },
        office_small: { width: 20, height: 25, floors: 4, capacity: 100, cost: 2000000 },
        office_large: { width: 40, height: 40, floors: 20, capacity: 2000, cost: 50000000 }
      },
      industrial: {
        factory_small: { width: 40, height: 30, floors: 1, capacity: 50, cost: 1000000 },
        factory_large: { width: 100, height: 80, floors: 1, capacity: 500, cost: 10000000 },
        warehouse: { width: 60, height: 40, floors: 1, capacity: 10, cost: 2000000 },
        power_plant: { width: 80, height: 60, floors: 1, capacity: 100, cost: 100000000 }
      },
      civic: {
        school: { width: 50, height: 40, floors: 2, capacity: 500, cost: 10000000 },
        hospital: { width: 80, height: 60, floors: 4, capacity: 300, cost: 50000000 },
        police: { width: 30, height: 25, floors: 2, capacity: 50, cost: 5000000 },
        fire_station: { width: 25, height: 30, floors: 1, capacity: 20, cost: 3000000 },
        city_hall: { width: 60, height: 50, floors: 3, capacity: 200, cost: 20000000 }
      }
    };
  }

  generateCity(config: CityConfig, terrainData?: number[][]): CityLayout {
    const citySize = this.getCityDimensions(config.size);
    const bounds = {
      x: 0,
      y: 0,
      width: citySize.width,
      height: citySize.height
    };

    // Generate districts first
    const districts = this.generateDistricts(config, bounds);

    // Generate road network
    const roads = this.generateRoadNetwork(config, bounds, districts, terrainData);

    // Generate buildings within districts
    const buildings = this.generateBuildings(config, districts, roads);

    // Generate utility networks
    const utilities = this.generateUtilities(bounds, districts, buildings);

    // Generate landmarks and green spaces
    const landmarks = this.generateLandmarks(config, districts);
    const greenSpaces = this.generateGreenSpaces(config, districts, bounds);

    return {
      config,
      bounds,
      districts,
      buildings,
      roads,
      utilities,
      landmarks,
      greenSpaces
    };
  }

  private getCityDimensions(size: string): { width: number; height: number } {
    switch (size) {
      case 'small': return { width: 500, height: 400 };
      case 'medium': return { width: 1000, height: 800 };
      case 'large': return { width: 2000, height: 1600 };
      case 'metropolis': return { width: 4000, height: 3200 };
      default: return { width: 1000, height: 800 };
    }
  }

  private generateDistricts(config: CityConfig, bounds: { x: number; y: number; width: number; height: number }): District[] {
    const districts: District[] = [];
    const numDistricts = this.getDistrictCount(config.size);

    // Create center point for city
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;

    // Generate district centers using Voronoi-like approach
    const districtCenters: { x: number; y: number; type: string }[] = [];

    // Add central business district
    districtCenters.push({
      x: centerX + (this.noise.perlin2D(0, 0) * 100),
      y: centerY + (this.noise.perlin2D(0, 1) * 100),
      type: 'commercial'
    });

    // Add other districts
    const districtTypes = this.getDistrictTypes(config.economicFocus);
    for (let i = 1; i < numDistricts; i++) {
      const angle = (i / numDistricts) * Math.PI * 2;
      const distance = (bounds.width + bounds.height) / 6 + (this.noise.perlin2D(i, 0) * 200);

      districtCenters.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        type: districtTypes[i % districtTypes.length]
      });
    }

    // Create districts from centers
    for (let i = 0; i < districtCenters.length; i++) {
      const center = districtCenters[i];
      const districtSize = this.getDistrictSize(config.size, center.type);

      const district: District = {
        id: `district-${i}`,
        name: this.generateDistrictName(center.type, i),
        type: center.type as any,
        bounds: {
          x: Math.max(0, center.x - districtSize / 2),
          y: Math.max(0, center.y - districtSize / 2),
          width: Math.min(districtSize, bounds.width - center.x + districtSize / 2),
          height: Math.min(districtSize, bounds.height - center.y + districtSize / 2)
        },
        population: this.calculateDistrictPopulation(config, center.type),
        buildingDensity: this.getBuildingDensity(center.type),
        wealthLevel: this.getWealthLevel(center, centerX, centerY),
        services: this.getDistrictServices(center.type)
      };

      districts.push(district);
    }

    return districts;
  }

  private getDistrictCount(size: string): number {
    switch (size) {
      case 'small': return 3;
      case 'medium': return 6;
      case 'large': return 12;
      case 'metropolis': return 24;
      default: return 6;
    }
  }

  private getDistrictTypes(economicFocus: string): string[] {
    switch (economicFocus) {
      case 'residential':
        return ['residential', 'residential', 'commercial', 'recreational'];
      case 'commercial':
        return ['commercial', 'commercial', 'residential', 'government'];
      case 'industrial':
        return ['industrial', 'industrial', 'residential', 'commercial'];
      case 'mixed':
      default:
        return ['residential', 'commercial', 'industrial', 'government', 'recreational', 'mixed'];
    }
  }

  private getDistrictSize(citySize: string, type: string): number {
    const baseSizes = {
      small: 150,
      medium: 250,
      large: 400,
      metropolis: 600
    };

    let size = baseSizes[citySize as keyof typeof baseSizes] || 250;

    // Adjust based on district type
    switch (type) {
      case 'commercial': size *= 0.8; break;
      case 'industrial': size *= 1.2; break;
      case 'recreational': size *= 1.5; break;
      case 'government': size *= 0.6; break;
    }

    return size;
  }

  private calculateDistrictPopulation(config: CityConfig, type: string): number {
    const basePopulation = config.population / this.getDistrictCount(config.size);

    switch (type) {
      case 'residential': return Math.floor(basePopulation * 1.8);
      case 'commercial': return Math.floor(basePopulation * 0.3);
      case 'industrial': return Math.floor(basePopulation * 0.2);
      case 'government': return Math.floor(basePopulation * 0.1);
      case 'recreational': return Math.floor(basePopulation * 0.1);
      case 'mixed': return Math.floor(basePopulation);
      default: return Math.floor(basePopulation * 0.5);
    }
  }

  private getBuildingDensity(type: string): number {
    switch (type) {
      case 'commercial': return 0.9;
      case 'residential': return 0.7;
      case 'industrial': return 0.6;
      case 'government': return 0.4;
      case 'recreational': return 0.2;
      case 'mixed': return 0.8;
      default: return 0.5;
    }
  }

  private getWealthLevel(center: { x: number; y: number }, cityX: number, cityY: number): number {
    // Distance from city center affects wealth (closer = higher wealth for most districts)
    const distanceFromCenter = Math.sqrt((center.x - cityX) ** 2 + (center.y - cityY) ** 2);
    const maxDistance = Math.sqrt(cityX ** 2 + cityY ** 2);
    const proximityFactor = 1 - (distanceFromCenter / maxDistance);

    // Add some noise for variation
    const noiseFactor = (this.noise.perlin2D(center.x * 0.01, center.y * 0.01) + 1) / 2;

    return Math.max(0.1, Math.min(1, proximityFactor * 0.7 + noiseFactor * 0.3));
  }

  private getDistrictServices(type: string): string[] {
    const services = {
      residential: ['school', 'clinic', 'grocery', 'park', 'post_office'],
      commercial: ['bank', 'restaurant', 'retail', 'office', 'hotel'],
      industrial: ['warehouse', 'factory', 'logistics', 'maintenance'],
      government: ['city_hall', 'police', 'court', 'dmv', 'library'],
      recreational: ['park', 'museum', 'theater', 'sports', 'zoo'],
      mixed: ['school', 'clinic', 'retail', 'restaurant', 'park']
    };

    return services[type as keyof typeof services] || [];
  }

  private generateDistrictName(type: string, index: number): string {
    const names = {
      residential: ['Riverside', 'Hillcrest', 'Oakwood', 'Maplewood', 'Sunset', 'Garden'],
      commercial: ['Downtown', 'Business District', 'Market Square', 'Plaza', 'Commerce'],
      industrial: ['Industrial Park', 'Manufacturing', 'Warehouse District', 'Factory Zone'],
      government: ['Government Center', 'Civic Center', 'Municipal', 'Capital'],
      recreational: ['Central Park', 'Recreation', 'Green Belt', 'Entertainment'],
      mixed: ['Midtown', 'Uptown', 'Central', 'Metro', 'Urban']
    };

    const typeNames = names[type as keyof typeof names] || ['District'];
    const baseName = typeNames[index % typeNames.length];
    return index > typeNames.length - 1 ? `${baseName} ${Math.floor(index / typeNames.length) + 1}` : baseName;
  }

  private generateRoadNetwork(config: CityConfig, bounds: { x: number; y: number; width: number; height: number }, districts: District[], terrainData?: number[][]): Road[] {
    const roads: Road[] = [];
    let roadId = 0;

    if (config.gridLayout) {
      // Generate grid-based road system
      roads.push(...this.generateGridRoads(bounds, ++roadId));
    } else {
      // Generate organic road system
      roads.push(...this.generateOrganicRoads(bounds, districts, ++roadId, terrainData));
    }

    // Add highway connections
    roads.push(...this.generateHighways(bounds, ++roadId));

    // Connect districts
    roads.push(...this.generateDistrictConnectors(districts, ++roadId));

    return roads;
  }

  private generateGridRoads(bounds: { x: number; y: number; width: number; height: number }, startId: number): Road[] {
    const roads: Road[] = [];
    const gridSize = 80; // Distance between grid lines

    // Vertical roads
    for (let x = bounds.x + gridSize; x < bounds.x + bounds.width; x += gridSize) {
      roads.push({
        id: `road-${startId++}`,
        type: 'collector',
        points: [
          { x, y: bounds.y },
          { x, y: bounds.y + bounds.height }
        ],
        width: 12,
        traffic: 500,
        connections: []
      });
    }

    // Horizontal roads
    for (let y = bounds.y + gridSize; y < bounds.y + bounds.height; y += gridSize) {
      roads.push({
        id: `road-${startId++}`,
        type: 'collector',
        points: [
          { x: bounds.x, y },
          { x: bounds.x + bounds.width, y }
        ],
        width: 12,
        traffic: 500,
        connections: []
      });
    }

    return roads;
  }

  private generateOrganicRoads(bounds: { x: number; y: number; width: number; height: number }, districts: District[], startId: number, terrainData?: number[][]): Road[] {
    const roads: Road[] = [];

    // Generate main arteries radiating from center
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const numArteries = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numArteries; i++) {
      const angle = (i / numArteries) * Math.PI * 2;
      const points: { x: number; y: number }[] = [];

      let currentX = centerX;
      let currentY = centerY;
      const targetX = centerX + Math.cos(angle) * (bounds.width / 2);
      const targetY = centerY + Math.sin(angle) * (bounds.height / 2);

      points.push({ x: currentX, y: currentY });

      // Create curved path to edge
      const steps = 20;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        let nextX = currentX + (targetX - currentX) * (1 / steps);
        let nextY = currentY + (targetY - currentY) * (1 / steps);

        // Add curvature based on noise
        const curve = this.noise.perlin2D(nextX * 0.01, nextY * 0.01) * 50;
        nextX += Math.cos(angle + Math.PI / 2) * curve;
        nextY += Math.sin(angle + Math.PI / 2) * curve;

        // Terrain following (if terrain data provided)
        if (terrainData) {
          // Adjust path to follow terrain contours
          // Implementation would analyze terrain slopes
        }

        points.push({ x: nextX, y: nextY });
        currentX = nextX;
        currentY = nextY;
      }

      roads.push({
        id: `arterial-${startId++}`,
        type: 'arterial',
        points,
        width: 20,
        traffic: 2000,
        connections: []
      });
    }

    return roads;
  }

  private generateHighways(bounds: { x: number; y: number; width: number; height: number }, startId: number): Road[] {
    const highways: Road[] = [];

    // Add ring highway around city
    const ringRadius = Math.min(bounds.width, bounds.height) * 0.4;
    const centerX = bounds.width / 2;
    const centerY = bounds.height / 2;
    const points: { x: number; y: number }[] = [];

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      points.push({
        x: centerX + Math.cos(angle) * ringRadius,
        y: centerY + Math.sin(angle) * ringRadius
      });
    }
    points.push(points[0]); // Close the loop

    highways.push({
      id: `highway-ring-${startId++}`,
      type: 'highway',
      points,
      width: 30,
      traffic: 5000,
      connections: []
    });

    // Add cross-city highways
    highways.push({
      id: `highway-ns-${startId++}`,
      type: 'highway',
      points: [
        { x: centerX, y: 0 },
        { x: centerX, y: bounds.height }
      ],
      width: 25,
      traffic: 4000,
      connections: []
    });

    highways.push({
      id: `highway-ew-${startId++}`,
      type: 'highway',
      points: [
        { x: 0, y: centerY },
        { x: bounds.width, y: centerY }
      ],
      width: 25,
      traffic: 4000,
      connections: []
    });

    return highways;
  }

  private generateDistrictConnectors(districts: District[], startId: number): Road[] {
    const connectors: Road[] = [];

    // Connect each district to its nearest neighbors
    for (let i = 0; i < districts.length; i++) {
      const district = districts[i];
      const centerA = {
        x: district.bounds.x + district.bounds.width / 2,
        y: district.bounds.y + district.bounds.height / 2
      };

      // Find 2-3 nearest districts
      const distances = districts
        .map((d, index) => ({
          index,
          distance: index === i ? Infinity : Math.sqrt(
            Math.pow(d.bounds.x + d.bounds.width / 2 - centerA.x, 2) +
            Math.pow(d.bounds.y + d.bounds.height / 2 - centerA.y, 2)
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      for (const neighbor of distances) {
        const neighborDistrict = districts[neighbor.index];
        const centerB = {
          x: neighborDistrict.bounds.x + neighborDistrict.bounds.width / 2,
          y: neighborDistrict.bounds.y + neighborDistrict.bounds.height / 2
        };

        connectors.push({
          id: `connector-${district.id}-${neighborDistrict.id}`,
          type: 'arterial',
          points: [centerA, centerB],
          width: 16,
          traffic: 1000,
          connections: [district.id, neighborDistrict.id]
        });
      }
    }

    return connectors;
  }

  private generateBuildings(config: CityConfig, districts: District[], roads: Road[]): Building[] {
    const buildings: Building[] = [];
    let buildingId = 0;

    for (const district of districts) {
      const districtBuildings = this.generateDistrictBuildings(
        district,
        config,
        roads,
        buildingId
      );
      buildings.push(...districtBuildings);
      buildingId += districtBuildings.length;
    }

    return buildings;
  }

  private generateDistrictBuildings(district: District, config: CityConfig, roads: Road[], startId: number): Building[] {
    const buildings: Building[] = [];
    const buildingCount = Math.floor(
      (district.bounds.width * district.bounds.height) / 2000 * district.buildingDensity
    );

    // Determine building types for this district
    const availableTypes = this.getBuildingTypesForDistrict(district.type);

    for (let i = 0; i < buildingCount; i++) {
      // Find a suitable location
      let attempts = 0;
      let position: { x: number; y: number };
      let building: Building;

      do {
        position = {
          x: district.bounds.x + Math.random() * district.bounds.width,
          y: district.bounds.y + Math.random() * district.bounds.height
        };

        // Choose building type based on district and wealth level
        const buildingType = this.chooseBuildingType(availableTypes, district.wealthLevel);
        const buildingData = this.getBuildingData(buildingType);

        building = {
          id: `building-${startId + i}`,
          type: this.getBuildingCategory(buildingType),
          position,
          size: { width: buildingData.width, height: buildingData.height },
          height: buildingData.floors,
          capacity: buildingData.capacity,
          purpose: buildingType,
          constructionYear: 1950 + Math.floor(Math.random() * 70),
          value: Math.floor(buildingData.cost * (0.8 + district.wealthLevel * 0.4))
        };

        attempts++;
      } while (this.isBuildingOverlapping(building, buildings) && attempts < 50);

      if (attempts < 50) {
        buildings.push(building);
      }
    }

    return buildings;
  }

  private getBuildingTypesForDistrict(districtType: string): string[] {
    switch (districtType) {
      case 'residential':
        return ['house', 'apartment', 'condo', 'mansion'];
      case 'commercial':
        return ['shop', 'restaurant', 'office_small', 'office_large', 'mall'];
      case 'industrial':
        return ['factory_small', 'factory_large', 'warehouse'];
      case 'government':
        return ['school', 'hospital', 'police', 'fire_station', 'city_hall'];
      case 'mixed':
        return ['house', 'apartment', 'shop', 'restaurant', 'office_small'];
      default:
        return ['house', 'shop'];
    }
  }

  private chooseBuildingType(availableTypes: string[], wealthLevel: number): string {
    // Weight building selection based on wealth level
    const weightedTypes: { type: string; weight: number }[] = availableTypes.map(type => {
      let weight = 1;

      // Adjust weights based on wealth and building type
      if (type.includes('mansion') || type.includes('large')) {
        weight = wealthLevel * 2;
      } else if (type.includes('apartment') || type.includes('factory')) {
        weight = (1 - wealthLevel) * 2 + 0.5;
      }

      return { type, weight };
    });

    // Select based on weights
    const totalWeight = weightedTypes.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedTypes) {
      random -= item.weight;
      if (random <= 0) {
        return item.type;
      }
    }

    return availableTypes[0];
  }

  private getBuildingData(buildingType: string): any {
    for (const category of Object.values(this.buildingTypes)) {
      if (category[buildingType]) {
        return category[buildingType];
      }
    }
    return this.buildingTypes.residential.house; // Default
  }

  private getBuildingCategory(buildingType: string): Building['type'] {
    if (this.buildingTypes.residential[buildingType]) return 'house';
    if (this.buildingTypes.commercial[buildingType]) return 'office';
    if (this.buildingTypes.industrial[buildingType]) return 'factory';
    if (this.buildingTypes.civic[buildingType]) return 'special';
    return 'house';
  }

  private isBuildingOverlapping(newBuilding: Building, existingBuildings: Building[]): boolean {
    for (const existing of existingBuildings) {
      const newBounds = {
        left: newBuilding.position.x,
        right: newBuilding.position.x + newBuilding.size.width,
        top: newBuilding.position.y,
        bottom: newBuilding.position.y + newBuilding.size.height
      };

      const existingBounds = {
        left: existing.position.x,
        right: existing.position.x + existing.size.width,
        top: existing.position.y,
        bottom: existing.position.y + existing.size.height
      };

      if (!(newBounds.right < existingBounds.left ||
            newBounds.left > existingBounds.right ||
            newBounds.bottom < existingBounds.top ||
            newBounds.top > existingBounds.bottom)) {
        return true;
      }
    }
    return false;
  }

  private generateUtilities(bounds: { x: number; y: number; width: number; height: number }, districts: District[], buildings: Building[]): UtilityNetwork[] {
    const utilities: UtilityNetwork[] = [];

    // Generate power network
    utilities.push(this.generatePowerNetwork(bounds, districts, buildings));

    // Generate water network
    utilities.push(this.generateWaterNetwork(bounds, districts, buildings));

    // Generate sewer network
    utilities.push(this.generateSewerNetwork(bounds, districts, buildings));

    // Generate internet network
    utilities.push(this.generateInternetNetwork(bounds, districts, buildings));

    return utilities;
  }

  private generatePowerNetwork(bounds: { x: number; y: number; width: number; height: number }, districts: District[], buildings: Building[]): UtilityNetwork {
    const nodes: { id: string; x: number; y: number; capacity: number }[] = [];
    const connections: { from: string; to: string; capacity: number }[] = [];
    const coverage: { x: number; y: number; radius: number }[] = [];

    // Add main power plant
    nodes.push({
      id: 'power-main',
      x: bounds.x + bounds.width * 0.1,
      y: bounds.y + bounds.height * 0.1,
      capacity: 10000
    });

    // Add substations in each district
    districts.forEach((district, index) => {
      const substationId = `substation-${index}`;
      nodes.push({
        id: substationId,
        x: district.bounds.x + district.bounds.width / 2,
        y: district.bounds.y + district.bounds.height / 2,
        capacity: 2000
      });

      // Connect to main power plant
      connections.push({
        from: 'power-main',
        to: substationId,
        capacity: 2000
      });

      // Add coverage area
      coverage.push({
        x: district.bounds.x + district.bounds.width / 2,
        y: district.bounds.y + district.bounds.height / 2,
        radius: Math.max(district.bounds.width, district.bounds.height)
      });
    });

    return {
      type: 'power',
      nodes,
      connections,
      coverage
    };
  }

  private generateWaterNetwork(bounds: { x: number; y: number; width: number; height: number }, districts: District[], buildings: Building[]): UtilityNetwork {
    const nodes: { id: string; x: number; y: number; capacity: number }[] = [];
    const connections: { from: string; to: string; capacity: number }[] = [];
    const coverage: { x: number; y: number; radius: number }[] = [];

    // Water treatment plant
    nodes.push({
      id: 'water-treatment',
      x: bounds.x + bounds.width * 0.05,
      y: bounds.y + bounds.height * 0.9,
      capacity: 5000
    });

    // Water towers/reservoirs
    districts.forEach((district, index) => {
      if (index % 2 === 0) { // Every other district gets a water tower
        const towerId = `water-tower-${index}`;
        nodes.push({
          id: towerId,
          x: district.bounds.x + district.bounds.width * 0.8,
          y: district.bounds.y + district.bounds.height * 0.2,
          capacity: 1000
        });

        connections.push({
          from: 'water-treatment',
          to: towerId,
          capacity: 1000
        });

        coverage.push({
          x: district.bounds.x + district.bounds.width * 0.8,
          y: district.bounds.y + district.bounds.height * 0.2,
          radius: 200
        });
      }
    });

    return {
      type: 'water',
      nodes,
      connections,
      coverage
    };
  }

  private generateSewerNetwork(bounds: { x: number; y: number; width: number; height: number }, districts: District[], buildings: Building[]): UtilityNetwork {
    // Similar to water network but for waste treatment
    return {
      type: 'sewer',
      nodes: [
        {
          id: 'sewage-treatment',
          x: bounds.x + bounds.width * 0.95,
          y: bounds.y + bounds.height * 0.95,
          capacity: 5000
        }
      ],
      connections: [],
      coverage: [
        {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          radius: Math.max(bounds.width, bounds.height)
        }
      ]
    };
  }

  private generateInternetNetwork(bounds: { x: number; y: number; width: number; height: number }, districts: District[], buildings: Building[]): UtilityNetwork {
    const nodes: { id: string; x: number; y: number; capacity: number }[] = [];
    const connections: { from: string; to: string; capacity: number }[] = [];
    const coverage: { x: number; y: number; radius: number }[] = [];

    // Main data center
    nodes.push({
      id: 'datacenter-main',
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      capacity: 100000
    });

    // Cell towers and fiber hubs
    districts.forEach((district, index) => {
      const hubId = `fiber-hub-${index}`;
      nodes.push({
        id: hubId,
        x: district.bounds.x + district.bounds.width / 2,
        y: district.bounds.y + district.bounds.height / 2,
        capacity: 10000
      });

      connections.push({
        from: 'datacenter-main',
        to: hubId,
        capacity: 10000
      });

      coverage.push({
        x: district.bounds.x + district.bounds.width / 2,
        y: district.bounds.y + district.bounds.height / 2,
        radius: Math.max(district.bounds.width, district.bounds.height) / 2
      });
    });

    return {
      type: 'internet',
      nodes,
      connections,
      coverage
    };
  }

  private generateLandmarks(config: CityConfig, districts: District[]): { name: string; x: number; y: number; type: string }[] {
    const landmarks: { name: string; x: number; y: number; type: string }[] = [];

    // Add city-specific landmarks based on size and type
    const landmarkTypes = ['monument', 'statue', 'fountain', 'clock_tower', 'bridge', 'cathedral'];

    const numLandmarks = Math.floor(config.size === 'small' ? 2 : config.size === 'medium' ? 4 : config.size === 'large' ? 8 : 12);

    for (let i = 0; i < numLandmarks; i++) {
      const district = districts[Math.floor(Math.random() * districts.length)];
      const type = landmarkTypes[Math.floor(Math.random() * landmarkTypes.length)];

      landmarks.push({
        name: `${config.name} ${type.replace('_', ' ')} ${i + 1}`,
        x: district.bounds.x + Math.random() * district.bounds.width,
        y: district.bounds.y + Math.random() * district.bounds.height,
        type
      });
    }

    return landmarks;
  }

  private generateGreenSpaces(config: CityConfig, districts: District[], bounds: { x: number; y: number; width: number; height: number }): { name: string; x: number; y: number; width: number; height: number; type: string }[] {
    const greenSpaces: { name: string; x: number; y: number; width: number; height: number; type: string }[] = [];

    // Central park
    const centralParkSize = Math.min(bounds.width, bounds.height) * 0.1;
    greenSpaces.push({
      name: `${config.name} Central Park`,
      x: bounds.width / 2 - centralParkSize / 2,
      y: bounds.height / 2 - centralParkSize / 2,
      width: centralParkSize,
      height: centralParkSize,
      type: 'park'
    });

    // Smaller parks in residential districts
    districts.filter(d => d.type === 'residential').forEach((district, index) => {
      const parkSize = Math.min(district.bounds.width, district.bounds.height) * 0.2;
      greenSpaces.push({
        name: `${district.name} Park`,
        x: district.bounds.x + Math.random() * (district.bounds.width - parkSize),
        y: district.bounds.y + Math.random() * (district.bounds.height - parkSize),
        width: parkSize,
        height: parkSize,
        type: 'neighborhood_park'
      });
    });

    return greenSpaces;
  }

  setSeed(seed: number): void {
    this.noise.setSeed(seed);
  }
}