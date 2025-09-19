export enum CropType {
  WHEAT = 'wheat',
  CORN = 'corn',
  SOYBEANS = 'soybeans',
  RICE = 'rice',
  COTTON = 'cotton',
  TOMATOES = 'tomatoes',
  POTATOES = 'potatoes',
  CARROTS = 'carrots'
}

export enum LivestockType {
  CATTLE = 'cattle',
  PIGS = 'pigs',
  CHICKENS = 'chickens',
  SHEEP = 'sheep',
  GOATS = 'goats'
}

export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter'
}

export interface WeatherConditions {
  temperature: number; // Celsius
  rainfall: number; // mm per time unit
  humidity: number; // 0-1
  sunlight: number; // hours per day
}

export interface Crop {
  id: string;
  type: CropType;
  name: string;
  plantingDate: number;
  growthTime: number; // days to maturity
  yieldPerUnit: number; // kg per square meter
  waterRequirement: number; // mm per growing period
  temperatureRange: { min: number; max: number };
  currentGrowth: number; // 0-1
  health: number; // 0-1
  area: number; // square meters
  soilNutrients: { nitrogen: number; phosphorus: number; potassium: number };
}

export interface Livestock {
  id: string;
  type: LivestockType;
  name: string;
  count: number;
  age: number; // average age in months
  health: number; // 0-1
  feedRequirement: number; // kg per day per animal
  production: number; // units per day (milk, eggs, etc.)
  breedingRate: number; // births per year per animal
  marketValue: number; // per animal
}

export interface Farm {
  id: string;
  name: string;
  size: number; // hectares
  location: { latitude: number; longitude: number };
  soilQuality: number; // 0-1
  crops: Map<string, Crop>;
  livestock: Map<string, Livestock>;
  equipment: string[];
  waterLevel: number; // available water in mm
  budget: number;
  totalProduction: number;
  totalRevenue: number;
}

export class AgricultureSimulation {
  private farms: Map<string, Farm>;
  private currentSeason: Season;
  private currentTime: number = 0;
  private weatherConditions: WeatherConditions;
  private isRunning: boolean = false;
  private yearlyData: Array<{ year: number; production: number; revenue: number }> = [];

  constructor() {
    this.farms = new Map();
    this.currentSeason = Season.SPRING;
    this.weatherConditions = {
      temperature: 20,
      rainfall: 50,
      humidity: 0.6,
      sunlight: 8
    };
  }

  // Farm management
  addFarm(farm: Farm): void {
    this.farms.set(farm.id, farm);
  }

  removeFarm(farmId: string): boolean {
    return this.farms.delete(farmId);
  }

  getFarm(farmId: string): Farm | undefined {
    return this.farms.get(farmId);
  }

  getAllFarms(): Farm[] {
    return Array.from(this.farms.values());
  }

  // Simulation control
  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(deltaTime: number = 1): boolean {
    if (!this.isRunning) return false;

    this.currentTime += deltaTime;

    // Update season based on time (assuming 90 days per season)
    const seasonCycle = Math.floor((this.currentTime / 90) % 4);
    const seasons = [Season.SPRING, Season.SUMMER, Season.FALL, Season.WINTER];
    this.currentSeason = seasons[seasonCycle];

    // Update weather conditions based on season
    this.updateWeatherConditions();

    // Update all farms
    this.farms.forEach(farm => {
      this.updateFarm(farm, deltaTime);
    });

    // Record yearly data
    if (Math.floor(this.currentTime / 365) > this.yearlyData.length) {
      this.recordYearlyData();
    }

    return true;
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.currentSeason = Season.SPRING;
    this.farms.clear();
    this.yearlyData = [];
    this.weatherConditions = {
      temperature: 20,
      rainfall: 50,
      humidity: 0.6,
      sunlight: 8
    };
  }

  private updateWeatherConditions(): void {
    // Seasonal weather patterns
    switch (this.currentSeason) {
      case Season.SPRING:
        this.weatherConditions.temperature = 15 + Math.random() * 10;
        this.weatherConditions.rainfall = 40 + Math.random() * 30;
        this.weatherConditions.sunlight = 10 + Math.random() * 4;
        break;
      case Season.SUMMER:
        this.weatherConditions.temperature = 25 + Math.random() * 10;
        this.weatherConditions.rainfall = 20 + Math.random() * 20;
        this.weatherConditions.sunlight = 12 + Math.random() * 2;
        break;
      case Season.FALL:
        this.weatherConditions.temperature = 10 + Math.random() * 15;
        this.weatherConditions.rainfall = 60 + Math.random() * 40;
        this.weatherConditions.sunlight = 8 + Math.random() * 4;
        break;
      case Season.WINTER:
        this.weatherConditions.temperature = 0 + Math.random() * 10;
        this.weatherConditions.rainfall = 30 + Math.random() * 20;
        this.weatherConditions.sunlight = 6 + Math.random() * 3;
        break;
    }
    this.weatherConditions.humidity = 0.4 + Math.random() * 0.4;
  }

  private updateFarm(farm: Farm, deltaTime: number): void {
    let farmProduction = 0;
    let farmRevenue = 0;

    // Update crops
    farm.crops.forEach(crop => {
      const growthRate = this.calculateCropGrowthRate(crop);
      crop.currentGrowth = Math.min(1, crop.currentGrowth + growthRate * deltaTime);

      // Update crop health based on conditions
      crop.health = this.calculateCropHealth(crop, farm);

      // Harvest if ready
      if (crop.currentGrowth >= 1) {
        const harvestYield = crop.yieldPerUnit * crop.area * crop.health;
        const value = this.getCropMarketValue(crop.type) * harvestYield;
        farmProduction += harvestYield;
        farmRevenue += value;

        // Reset for next planting cycle
        crop.currentGrowth = 0;
        crop.plantingDate = this.currentTime;
      }
    });

    // Update livestock
    farm.livestock.forEach(livestock => {
      livestock.age += deltaTime / 30; // Convert days to months

      // Update health based on feed availability and weather
      livestock.health = this.calculateLivestockHealth(livestock, farm);

      // Calculate production
      const dailyProduction = livestock.count * livestock.production * livestock.health;
      const productionValue = this.getLivestockProductValue(livestock.type) * dailyProduction;

      farmProduction += dailyProduction;
      farmRevenue += productionValue;

      // Handle breeding
      if (Math.random() < livestock.breedingRate / 365 * deltaTime) {
        const newAnimals = Math.floor(livestock.count * 0.1); // 10% breeding rate
        livestock.count += newAnimals;
      }

      // Calculate feed costs
      const feedCost = livestock.count * livestock.feedRequirement * deltaTime * 0.5; // $0.5 per kg
      farmRevenue -= feedCost;
    });

    // Update farm totals
    farm.totalProduction += farmProduction;
    farm.totalRevenue += farmRevenue;
    farm.budget += farmRevenue;

    // Consume water
    const waterConsumption = this.calculateWaterConsumption(farm, deltaTime);
    farm.waterLevel = Math.max(0, farm.waterLevel - waterConsumption);

    // Natural water replenishment from rainfall
    farm.waterLevel += this.weatherConditions.rainfall * deltaTime;
  }

  private calculateCropGrowthRate(crop: Crop): number {
    let growthRate = 1 / crop.growthTime; // Base growth rate

    // Temperature effect
    const tempOptimal = (crop.temperatureRange.min + crop.temperatureRange.max) / 2;
    const tempDiff = Math.abs(this.weatherConditions.temperature - tempOptimal);
    const tempFactor = Math.max(0.1, 1 - tempDiff / 20);

    // Water effect
    const waterFactor = Math.min(1, crop.soilNutrients.nitrogen * 2);

    // Sunlight effect
    const sunlightFactor = Math.min(1, this.weatherConditions.sunlight / 12);

    return growthRate * tempFactor * waterFactor * sunlightFactor;
  }

  private calculateCropHealth(crop: Crop, farm: Farm): number {
    let health = crop.health;

    // Soil quality effect
    health *= (0.5 + farm.soilQuality * 0.5);

    // Weather stress
    if (this.weatherConditions.temperature < crop.temperatureRange.min ||
        this.weatherConditions.temperature > crop.temperatureRange.max) {
      health *= 0.8;
    }

    // Water stress
    if (farm.waterLevel < crop.waterRequirement * 0.5) {
      health *= 0.6;
    }

    // Pest and disease (random factor)
    if (Math.random() < 0.05) { // 5% chance per time step
      health *= 0.9;
    }

    return Math.max(0.1, Math.min(1, health));
  }

  private calculateLivestockHealth(livestock: Livestock, farm: Farm): number {
    let health = livestock.health;

    // Weather effect
    if (this.currentSeason === Season.WINTER) {
      health *= 0.9;
    } else if (this.currentSeason === Season.SUMMER && this.weatherConditions.temperature > 30) {
      health *= 0.85; // Heat stress
    }

    // Feed availability (simplified)
    if (farm.budget < livestock.count * livestock.feedRequirement * 30 * 0.5) {
      health *= 0.8; // Insufficient feed budget
    }

    // Disease outbreaks (random)
    if (Math.random() < 0.02) { // 2% chance per time step
      health *= 0.7;
    }

    return Math.max(0.2, Math.min(1, health));
  }

  private calculateWaterConsumption(farm: Farm, deltaTime: number): number {
    let totalConsumption = 0;

    // Crop water consumption
    farm.crops.forEach(crop => {
      if (crop.currentGrowth < 1) {
        totalConsumption += crop.waterRequirement * crop.area * deltaTime / crop.growthTime;
      }
    });

    // Livestock water consumption
    farm.livestock.forEach(livestock => {
      totalConsumption += livestock.count * 50 * deltaTime; // 50L per animal per day
    });

    return totalConsumption;
  }

  private getCropMarketValue(cropType: CropType): number {
    // Simplified market values per kg
    const marketValues = {
      [CropType.WHEAT]: 0.3,
      [CropType.CORN]: 0.25,
      [CropType.SOYBEANS]: 0.5,
      [CropType.RICE]: 0.8,
      [CropType.COTTON]: 2.0,
      [CropType.TOMATOES]: 1.5,
      [CropType.POTATOES]: 0.4,
      [CropType.CARROTS]: 0.6
    };
    return marketValues[cropType] || 0.3;
  }

  private getLivestockProductValue(livestockType: LivestockType): number {
    // Simplified product values
    const productValues = {
      [LivestockType.CATTLE]: 5.0, // Milk per liter
      [LivestockType.PIGS]: 3.0, // Meat per kg
      [LivestockType.CHICKENS]: 0.3, // Eggs per egg
      [LivestockType.SHEEP]: 4.0, // Wool per kg
      [LivestockType.GOATS]: 4.5 // Milk per liter
    };
    return productValues[livestockType] || 2.0;
  }

  private recordYearlyData(): void {
    const currentYear = Math.floor(this.currentTime / 365);
    let totalProduction = 0;
    let totalRevenue = 0;

    this.farms.forEach(farm => {
      totalProduction += farm.totalProduction;
      totalRevenue += farm.totalRevenue;
    });

    this.yearlyData.push({
      year: currentYear,
      production: totalProduction,
      revenue: totalRevenue
    });
  }

  // Metrics and analysis
  getTotalProduction(): number {
    return Array.from(this.farms.values())
      .reduce((sum, farm) => sum + farm.totalProduction, 0);
  }

  getTotalRevenue(): number {
    return Array.from(this.farms.values())
      .reduce((sum, farm) => sum + farm.totalRevenue, 0);
  }

  getOverallMetrics(): any {
    const totalFarms = this.farms.size;
    const totalArea = Array.from(this.farms.values()).reduce((sum, farm) => sum + farm.size, 0);
    const avgSoilQuality = totalFarms > 0 ?
      Array.from(this.farms.values()).reduce((sum, farm) => sum + farm.soilQuality, 0) / totalFarms : 0;

    let totalCrops = 0;
    let totalLivestock = 0;
    this.farms.forEach(farm => {
      totalCrops += farm.crops.size;
      farm.livestock.forEach(livestock => {
        totalLivestock += livestock.count;
      });
    });

    return {
      currentTime: this.currentTime,
      currentSeason: this.currentSeason,
      weatherConditions: this.weatherConditions,
      totalFarms: totalFarms,
      totalArea: totalArea,
      averageSoilQuality: avgSoilQuality,
      totalCrops: totalCrops,
      totalLivestock: totalLivestock,
      totalProduction: this.getTotalProduction(),
      totalRevenue: this.getTotalRevenue(),
      yearlyData: this.yearlyData
    };
  }

  getCurrentSeason(): Season {
    return this.currentSeason;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getWeatherConditions(): WeatherConditions {
    return { ...this.weatherConditions };
  }

  exportState(): string {
    const metrics = this.getOverallMetrics();

    return JSON.stringify({
      simulationState: {
        currentTime: this.currentTime,
        currentSeason: this.currentSeason,
        isRunning: this.isRunning,
        weatherConditions: this.weatherConditions
      },

      // Farm data
      farms: Array.from(this.farms.entries()).map(([id, farm]) => ({
        id: id,
        name: farm.name,
        size: farm.size,
        location: farm.location,
        soilQuality: farm.soilQuality,
        waterLevel: farm.waterLevel,
        budget: farm.budget,
        totalProduction: farm.totalProduction,
        totalRevenue: farm.totalRevenue,
        cropCount: farm.crops.size,
        livestockTypes: Array.from(farm.livestock.values()).map(l => ({ type: l.type, count: l.count }))
      })),

      // Overall metrics
      metrics: metrics,

      timestamp: Date.now()
    }, null, 2);
  }

  // Helper method to create a basic agricultural setup for testing
  static createBasicSetup(): AgricultureSimulation {
    const simulation = new AgricultureSimulation();

    // Create a basic farm
    const basicFarm: Farm = {
      id: 'farm_01',
      name: 'Green Valley Farm',
      size: 100, // 100 hectares
      location: { latitude: 40.7128, longitude: -74.0060 },
      soilQuality: 0.8,
      crops: new Map(),
      livestock: new Map(),
      equipment: ['tractor', 'plow', 'harvester'],
      waterLevel: 10000, // mm
      budget: 50000, // $50,000
      totalProduction: 0,
      totalRevenue: 0
    };

    // Add some crops
    const wheatCrop: Crop = {
      id: 'wheat_01',
      type: CropType.WHEAT,
      name: 'Winter Wheat',
      plantingDate: 0,
      growthTime: 120, // 120 days
      yieldPerUnit: 5, // 5 kg/m²
      waterRequirement: 500, // mm
      temperatureRange: { min: 3, max: 25 },
      currentGrowth: 0.2, // 20% grown
      health: 0.9,
      area: 200000, // 20 hectares in square meters
      soilNutrients: { nitrogen: 0.8, phosphorus: 0.7, potassium: 0.75 }
    };

    const cornCrop: Crop = {
      id: 'corn_01',
      type: CropType.CORN,
      name: 'Sweet Corn',
      plantingDate: 30,
      growthTime: 90, // 90 days
      yieldPerUnit: 8, // 8 kg/m²
      waterRequirement: 600, // mm
      temperatureRange: { min: 10, max: 35 },
      currentGrowth: 0.1, // 10% grown
      health: 0.85,
      area: 150000, // 15 hectares
      soilNutrients: { nitrogen: 0.9, phosphorus: 0.8, potassium: 0.8 }
    };

    basicFarm.crops.set(wheatCrop.id, wheatCrop);
    basicFarm.crops.set(cornCrop.id, cornCrop);

    // Add some livestock
    const cattle: Livestock = {
      id: 'cattle_01',
      type: LivestockType.CATTLE,
      name: 'Dairy Cows',
      count: 50,
      age: 36, // 3 years average
      health: 0.9,
      feedRequirement: 25, // 25 kg per day per animal
      production: 20, // 20 liters milk per day
      breedingRate: 0.8, // 80% breeding success per year
      marketValue: 1500 // $1500 per cow
    };

    const chickens: Livestock = {
      id: 'chickens_01',
      type: LivestockType.CHICKENS,
      name: 'Egg Laying Hens',
      count: 200,
      age: 12, // 1 year average
      health: 0.85,
      feedRequirement: 0.12, // 120g per day per chicken
      production: 0.8, // 0.8 eggs per day per chicken
      breedingRate: 2.0, // High reproduction rate
      marketValue: 25 // $25 per chicken
    };

    basicFarm.livestock.set(cattle.id, cattle);
    basicFarm.livestock.set(chickens.id, chickens);

    simulation.addFarm(basicFarm);

    return simulation;
  }
}