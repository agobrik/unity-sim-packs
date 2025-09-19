import { EventEmitter } from '../utils/EventEmitter';
import {
  ClimateZone,
  ClimateCharacteristics,
  MonthlyAverages,
  SeasonalPattern,
  ClimateExtremes,
  WindPattern,
  GeographicLocation,
  WeatherState,
  ClimateType,
  Season
} from '../types';

export interface ClimateSystemConfig {
  timeAcceleration: number;
  enableSeasonalVariation: boolean;
  enableElNinoEffect: boolean;
  enableClimateChange: boolean;
  climateChangeRate: number;
  randomSeed?: number;
}

export interface ClimateData {
  zoneId: string;
  year: number;
  month: number;
  averageTemperature: number;
  totalPrecipitation: number;
  averageHumidity: number;
  extremeEvents: ClimateEvent[];
}

export interface ClimateEvent {
  type: ClimateEventType;
  intensity: number;
  duration: number; // days
  startDate: Date;
  endDate: Date;
  affectedAreas: string[];
}

export enum ClimateEventType {
  DROUGHT = 'drought',
  HEAT_WAVE = 'heat_wave',
  COLD_WAVE = 'cold_wave',
  HEAVY_PRECIPITATION = 'heavy_precipitation',
  STORM_SEASON = 'storm_season',
  EL_NINO = 'el_nino',
  LA_NINA = 'la_nina',
  MONSOON = 'monsoon'
}

export interface ClimateTrend {
  parameter: string;
  trend: number; // per year
  confidence: number;
  timespan: number; // years
}

export class ClimateSystem extends EventEmitter {
  private config: ClimateSystemConfig;
  private zones: Map<string, ClimateZone> = new Map();
  private climatData: Map<string, ClimateData[]> = new Map();
  private trends: Map<string, ClimateTrend[]> = new Map();
  private currentTime: Date;
  private rng: () => number;

  constructor(config?: Partial<ClimateSystemConfig>) {
    super();
    this.config = {
      timeAcceleration: 1,
      enableSeasonalVariation: true,
      enableElNinoEffect: true,
      enableClimateChange: false,
      climateChangeRate: 0.02,
      ...config
    };

    this.currentTime = new Date();

    if (config?.randomSeed !== undefined) {
      this.rng = this.createSeededRandom(config.randomSeed);
    } else {
      this.rng = Math.random;
    }
  }

  private createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  public addClimateZone(zone: ClimateZone): void {
    this.zones.set(zone.id, zone);
    this.climatData.set(zone.id, []);
    this.trends.set(zone.id, []);
    this.emit('climateZoneAdded', zone);
  }

  public removeClimateZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (zone) {
      this.zones.delete(zoneId);
      this.climatData.delete(zoneId);
      this.trends.delete(zoneId);
      this.emit('climateZoneRemoved', zone);
    }
  }

  public getClimateZone(zoneId: string): ClimateZone | undefined {
    return this.zones.get(zoneId);
  }

  public getAllClimateZones(): ClimateZone[] {
    return Array.from(this.zones.values());
  }

  public findClimateZone(location: GeographicLocation): ClimateZone | null {
    // Simple implementation - in reality would use geographic boundaries
    for (const zone of this.zones.values()) {
      if (this.isLocationInZone(location, zone)) {
        return zone;
      }
    }
    return null;
  }

  private isLocationInZone(location: GeographicLocation, zone: ClimateZone): boolean {
    // Simplified zone detection based on climate type and latitude
    const lat = Math.abs(location.latitude);

    switch (zone.type) {
      case ClimateType.TROPICAL:
        return lat < 23.5;
      case ClimateType.DRY:
        return lat > 20 && lat < 35;
      case ClimateType.TEMPERATE:
        return lat > 30 && lat < 60;
      case ClimateType.CONTINENTAL:
        return lat > 40 && lat < 70;
      case ClimateType.POLAR:
        return lat > 60;
      case ClimateType.HIGHLAND:
        return location.elevation > 1500;
      default:
        return false;
    }
  }

  public generateClimateCharacteristics(
    location: GeographicLocation,
    historicalYears: number = 30
  ): ClimateCharacteristics {
    const lat = Math.abs(location.latitude);
    const elevation = location.elevation;

    // Base temperature calculation
    const baseTemp = this.calculateBaseTemperature(lat, elevation);
    const temperatureRange = this.calculateTemperatureRange(lat);

    // Monthly averages
    const averageTemperature = this.generateMonthlyAverages(baseTemp, lat, 'temperature');
    const temperatureRangeMonthly = this.generateMonthlyAverages(temperatureRange, lat, 'range');
    const humidity = this.generateMonthlyAverages(this.calculateBaseHumidity(lat), lat, 'humidity');
    const precipitation = this.generateMonthlyAverages(this.calculateBasePrecipitation(lat), lat, 'precipitation');

    // Wind patterns
    const windPatterns = this.generateWindPatterns(location);

    // Storm frequency
    const stormFrequency = this.calculateStormFrequency(lat, location.longitude);

    return {
      averageTemperature,
      temperatureRange: temperatureRangeMonthly,
      humidity,
      precipitation,
      windPatterns,
      stormFrequency
    };
  }

  private calculateBaseTemperature(latitude: number, elevation: number): number {
    // Temperature decreases with latitude and elevation
    const latitudeFactor = Math.cos(latitude * Math.PI / 180);
    const elevationEffect = -0.0065 * elevation; // Standard lapse rate
    return 15 + (latitudeFactor * 20) + elevationEffect;
  }

  private calculateTemperatureRange(latitude: number): number {
    // Temperature range increases with latitude (continental effect)
    return 5 + Math.abs(latitude) * 0.3;
  }

  private calculateBaseHumidity(latitude: number): number {
    // Higher humidity near equator and in coastal areas
    const lat = Math.abs(latitude);
    if (lat < 10) return 80; // Tropical
    if (lat < 30) return 60; // Subtropical
    if (lat < 60) return 50; // Temperate
    return 40; // Polar
  }

  private calculateBasePrecipitation(latitude: number): number {
    // Precipitation patterns by latitude
    const lat = Math.abs(latitude);
    if (lat < 10) return 2000; // Tropical rainforest
    if (lat < 20) return 1000; // Tropical savanna
    if (lat < 30) return 500;  // Subtropical
    if (lat < 60) return 800;  // Temperate
    return 300; // Polar
  }

  private generateMonthlyAverages(
    baseValue: number,
    latitude: number,
    parameter: string
  ): MonthlyAverages {
    const seasonalVariation = this.config.enableSeasonalVariation;
    const isNorthern = latitude >= 0;

    // Seasonal amplitude varies by parameter and latitude
    let amplitude = 0;
    switch (parameter) {
      case 'temperature':
        amplitude = Math.abs(latitude) * 0.5;
        break;
      case 'range':
        amplitude = baseValue * 0.3;
        break;
      case 'humidity':
        amplitude = baseValue * 0.2;
        break;
      case 'precipitation':
        amplitude = baseValue * 0.4;
        break;
    }

    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const averages: any = {};

    months.forEach((month, index) => {
      let monthValue = baseValue;

      if (seasonalVariation) {
        // Sinusoidal variation with peak in summer
        const monthAngle = (index + (isNorthern ? 0 : 6)) * Math.PI / 6;
        const seasonalFactor = Math.sin(monthAngle - Math.PI / 2);

        if (parameter === 'precipitation') {
          // Different precipitation patterns for different climates
          if (Math.abs(latitude) < 23.5) {
            // Tropical: wet/dry seasons
            monthValue = baseValue * (1 + 0.5 * Math.sin(monthAngle * 2));
          } else {
            // Temperate: winter precipitation
            monthValue = baseValue * (1 - 0.3 * seasonalFactor);
          }
        } else {
          monthValue = baseValue + amplitude * seasonalFactor;
        }
      }

      // Add some random variation
      monthValue += (this.rng() - 0.5) * baseValue * 0.1;
      averages[month] = Math.max(0, monthValue);
    });

    return averages as MonthlyAverages;
  }

  private generateWindPatterns(location: GeographicLocation): WindPattern[] {
    const patterns: WindPattern[] = [];
    const lat = location.latitude;

    // Trade winds (tropical regions)
    if (Math.abs(lat) < 30) {
      patterns.push({
        direction: lat > 0 ? 45 : 315, // NE in NH, SE in SH
        strength: 15,
        seasonality: 0.8,
        altitude: 1000
      });
    }

    // Westerlies (temperate regions)
    if (Math.abs(lat) > 30 && Math.abs(lat) < 60) {
      patterns.push({
        direction: 270, // West
        strength: 20,
        seasonality: 0.6,
        altitude: 3000
      });
    }

    // Polar easterlies
    if (Math.abs(lat) > 60) {
      patterns.push({
        direction: 90, // East
        strength: 12,
        seasonality: 0.4,
        altitude: 2000
      });
    }

    // Local effects (monsoons, sea breezes, etc.)
    if (Math.abs(lat) < 30) {
      patterns.push({
        direction: this.rng() * 360,
        strength: 8,
        seasonality: 0.9, // Highly seasonal
        altitude: 500
      });
    }

    return patterns;
  }

  private calculateStormFrequency(latitude: number, longitude: number): number {
    const lat = Math.abs(latitude);

    // Storm frequency varies by region
    if (lat < 10) return 8; // Tropical - thunderstorms
    if (lat < 30) return 12; // Subtropical - tropical cyclones
    if (lat < 60) return 15; // Temperate - frontal systems
    return 5; // Polar - fewer storms
  }

  public generateSeasonalPatterns(zone: ClimateZone): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];
    const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];

    seasons.forEach(season => {
      const pattern = this.generateSeasonalPattern(season, zone);
      patterns.push(pattern);
    });

    return patterns;
  }

  private generateSeasonalPattern(season: Season, zone: ClimateZone): SeasonalPattern {
    let tempModifier = 0;
    let humidityModifier = 0;
    let precipModifier = 0;
    let stormProb = 0;
    let dayLength = 12;

    switch (zone.type) {
      case ClimateType.TROPICAL:
        tempModifier = season === Season.SUMMER ? 0.1 : -0.05;
        humidityModifier = season === Season.SUMMER ? 0.2 : -0.1;
        precipModifier = season === Season.SUMMER ? 0.8 : -0.4;
        stormProb = season === Season.SUMMER ? 0.6 : 0.2;
        break;

      case ClimateType.TEMPERATE:
        tempModifier = season === Season.SUMMER ? 0.3 :
                      season === Season.WINTER ? -0.3 : 0;
        humidityModifier = season === Season.SUMMER ? -0.1 : 0.1;
        precipModifier = season === Season.WINTER ? 0.2 : -0.1;
        stormProb = season === Season.SPRING ? 0.4 :
                   season === Season.AUTUMN ? 0.3 : 0.2;
        break;

      case ClimateType.CONTINENTAL:
        tempModifier = season === Season.SUMMER ? 0.4 :
                      season === Season.WINTER ? -0.4 : 0;
        humidityModifier = season === Season.SUMMER ? 0.1 : -0.2;
        precipModifier = season === Season.SUMMER ? 0.3 : -0.2;
        stormProb = season === Season.SUMMER ? 0.5 : 0.1;
        break;

      case ClimateType.DRY:
        tempModifier = season === Season.SUMMER ? 0.2 : -0.1;
        humidityModifier = -0.3;
        precipModifier = season === Season.WINTER ? 0.5 : -0.8;
        stormProb = 0.1;
        break;

      case ClimateType.POLAR:
        tempModifier = season === Season.SUMMER ? 0.5 : -0.2;
        humidityModifier = season === Season.SUMMER ? 0.2 : -0.1;
        precipModifier = season === Season.SUMMER ? 0.3 : -0.3;
        stormProb = season === Season.WINTER ? 0.3 : 0.1;
        break;
    }

    // Day length calculation (simplified)
    switch (season) {
      case Season.SUMMER:
        dayLength = 14;
        break;
      case Season.WINTER:
        dayLength = 10;
        break;
      default:
        dayLength = 12;
    }

    return {
      season,
      temperatureModifier: tempModifier,
      humidityModifier: humidityModifier,
      precipitationModifier: precipModifier,
      stormProbability: stormProb,
      dayLength
    };
  }

  public generateClimateExtremes(zone: ClimateZone): ClimateExtremes {
    const characteristics = zone.characteristics;

    // Calculate extremes based on averages and climate type
    const tempRange = this.getMaxTemperatureRange(characteristics.averageTemperature);
    const maxTemp = Math.max(...Object.values(characteristics.averageTemperature)) + tempRange;
    const minTemp = Math.min(...Object.values(characteristics.averageTemperature)) - tempRange;

    const maxWind = this.calculateMaxWindSpeed(zone.type);
    const maxPrecip = Math.max(...Object.values(characteristics.precipitation)) * 2;

    const droughtProb = this.calculateDroughtProbability(zone.type);
    const floodProb = this.calculateFloodProbability(zone.type);

    return {
      maxTemperature: maxTemp,
      minTemperature: minTemp,
      maxWindSpeed: maxWind,
      maxPrecipitation: maxPrecip,
      droughtProbability: droughtProb,
      floodProbability: floodProb
    };
  }

  private getMaxTemperatureRange(averages: MonthlyAverages): number {
    const values = Object.values(averages);
    const mean = values.reduce((a, b) => a + b) / values.length;
    return mean * 0.3; // 30% of mean for extreme range
  }

  private calculateMaxWindSpeed(climateType: ClimateType): number {
    switch (climateType) {
      case ClimateType.TROPICAL: return 80; // Hurricane potential
      case ClimateType.TEMPERATE: return 50; // Strong frontal systems
      case ClimateType.CONTINENTAL: return 40; // Thunderstorm winds
      case ClimateType.DRY: return 35; // Dust storms
      case ClimateType.POLAR: return 60; // Katabatic winds
      case ClimateType.HIGHLAND: return 70; // Mountain winds
      default: return 40;
    }
  }

  private calculateDroughtProbability(climateType: ClimateType): number {
    switch (climateType) {
      case ClimateType.DRY: return 0.8;
      case ClimateType.CONTINENTAL: return 0.3;
      case ClimateType.TEMPERATE: return 0.2;
      case ClimateType.TROPICAL: return 0.1;
      case ClimateType.POLAR: return 0.1;
      case ClimateType.HIGHLAND: return 0.25;
      default: return 0.2;
    }
  }

  private calculateFloodProbability(climateType: ClimateType): number {
    switch (climateType) {
      case ClimateType.TROPICAL: return 0.4;
      case ClimateType.TEMPERATE: return 0.3;
      case ClimateType.CONTINENTAL: return 0.2;
      case ClimateType.HIGHLAND: return 0.35;
      case ClimateType.DRY: return 0.1;
      case ClimateType.POLAR: return 0.15;
      default: return 0.25;
    }
  }

  public applyClimateEffects(weatherState: WeatherState, location: GeographicLocation): WeatherState {
    const zone = this.findClimateZone(location);
    if (!zone) return weatherState;

    const modifiedState = { ...weatherState };
    const currentSeason = this.getCurrentSeason();
    const seasonalPattern = zone.seasonalPatterns.find(p => p.season === currentSeason);

    if (seasonalPattern) {
      // Apply seasonal modifications
      modifiedState.temperature *= (1 + seasonalPattern.temperatureModifier);
      modifiedState.humidity *= (1 + seasonalPattern.humidityModifier);
      modifiedState.precipitation.probability *= (1 + seasonalPattern.precipitationModifier);
    }

    // Apply long-term climate trends
    if (this.config.enableClimateChange) {
      modifiedState.temperature += this.calculateClimateChangeTrend('temperature', zone.id);
    }

    // Apply El Niño/La Niña effects
    if (this.config.enableElNinoEffect) {
      const ensoEffect = this.calculateENSOEffect(location);
      modifiedState.temperature += ensoEffect.temperatureChange;
      modifiedState.precipitation.probability *= (1 + ensoEffect.precipitationChange);
    }

    return modifiedState;
  }

  private getCurrentSeason(): Season {
    const month = this.currentTime.getMonth();
    if (month >= 2 && month <= 4) return Season.SPRING;
    if (month >= 5 && month <= 7) return Season.SUMMER;
    if (month >= 8 && month <= 10) return Season.AUTUMN;
    return Season.WINTER;
  }

  private calculateClimateChangeTrend(parameter: string, zoneId: string): number {
    const currentYear = this.currentTime.getFullYear();
    const baseYear = 2000;
    const yearsSince = currentYear - baseYear;

    switch (parameter) {
      case 'temperature':
        return yearsSince * this.config.climateChangeRate;
      case 'precipitation':
        return yearsSince * this.config.climateChangeRate * 0.5;
      default:
        return 0;
    }
  }

  private calculateENSOEffect(location: GeographicLocation): { temperatureChange: number; precipitationChange: number } {
    // Simplified ENSO effects based on location
    const lat = location.latitude;
    const lon = location.longitude;

    // Pacific region effects
    if (lon > 120 && lon < 280) {
      // El Niño year (simplified)
      if (this.rng() > 0.7) {
        return {
          temperatureChange: lat > 0 ? 1.5 : -1.0,
          precipitationChange: lat > 0 ? 0.3 : -0.2
        };
      }
    }

    return { temperatureChange: 0, precipitationChange: 0 };
  }

  public recordClimateData(zoneId: string, weatherState: WeatherState): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;

    const currentYear = this.currentTime.getFullYear();
    const currentMonth = this.currentTime.getMonth();

    let zoneData = this.climatData.get(zoneId) || [];

    // Find or create monthly record
    let monthlyRecord = zoneData.find(d => d.year === currentYear && d.month === currentMonth);

    if (!monthlyRecord) {
      monthlyRecord = {
        zoneId,
        year: currentYear,
        month: currentMonth,
        averageTemperature: weatherState.temperature,
        totalPrecipitation: weatherState.precipitation.accumulation,
        averageHumidity: weatherState.humidity,
        extremeEvents: []
      };
      zoneData.push(monthlyRecord);
    } else {
      // Update running averages
      monthlyRecord.averageTemperature = (monthlyRecord.averageTemperature + weatherState.temperature) / 2;
      monthlyRecord.averageHumidity = (monthlyRecord.averageHumidity + weatherState.humidity) / 2;
      monthlyRecord.totalPrecipitation += weatherState.precipitation.accumulation;
    }

    this.climatData.set(zoneId, zoneData);
  }

  public analyzeClimateTrends(zoneId: string, years: number = 30): ClimateTrend[] {
    const data = this.climatData.get(zoneId) || [];
    const trends: ClimateTrend[] = [];

    if (data.length < 24) return trends; // Need at least 2 years of data

    const parameters = ['temperature', 'precipitation', 'humidity'];

    parameters.forEach(param => {
      const trend = this.calculateTrend(data, param, years);
      if (trend) {
        trends.push(trend);
      }
    });

    this.trends.set(zoneId, trends);
    return trends;
  }

  private calculateTrend(data: ClimateData[], parameter: string, years: number): ClimateTrend | null {
    const recentData = data.filter(d =>
      this.currentTime.getFullYear() - d.year <= years
    );

    if (recentData.length < 12) return null;

    let values: number[] = [];
    let times: number[] = [];

    recentData.forEach(d => {
      let value = 0;
      switch (parameter) {
        case 'temperature':
          value = d.averageTemperature;
          break;
        case 'precipitation':
          value = d.totalPrecipitation;
          break;
        case 'humidity':
          value = d.averageHumidity;
          break;
      }
      values.push(value);
      times.push(d.year * 12 + d.month);
    });

    // Simple linear regression
    const n = values.length;
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = times.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, y, i) => {
      const predicted = slope * times[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return {
      parameter,
      trend: slope * 12, // Convert to per-year
      confidence: rSquared,
      timespan: years
    };
  }

  public detectClimateEvents(zoneId: string): ClimateEvent[] {
    const zone = this.zones.get(zoneId);
    const data = this.climatData.get(zoneId);

    if (!zone || !data) return [];

    const events: ClimateEvent[] = [];
    const recentData = data.slice(-12); // Last 12 months

    // Detect drought
    const avgPrecip = recentData.reduce((sum, d) => sum + d.totalPrecipitation, 0) / recentData.length;
    const normalPrecip = this.getAveragePrecipitation(zone);

    if (avgPrecip < normalPrecip * 0.7) {
      events.push({
        type: ClimateEventType.DROUGHT,
        intensity: (normalPrecip - avgPrecip) / normalPrecip,
        duration: 180, // 6 months
        startDate: new Date(this.currentTime.getTime() - 180 * 24 * 60 * 60 * 1000),
        endDate: this.currentTime,
        affectedAreas: [zoneId]
      });
    }

    // Detect heat wave
    const recentTemp = recentData.slice(-3); // Last 3 months
    const avgTemp = recentTemp.reduce((sum, d) => sum + d.averageTemperature, 0) / recentTemp.length;
    const normalTemp = this.getAverageTemperature(zone);

    if (avgTemp > normalTemp + 5) {
      events.push({
        type: ClimateEventType.HEAT_WAVE,
        intensity: (avgTemp - normalTemp) / normalTemp,
        duration: 90, // 3 months
        startDate: new Date(this.currentTime.getTime() - 90 * 24 * 60 * 60 * 1000),
        endDate: this.currentTime,
        affectedAreas: [zoneId]
      });
    }

    return events;
  }

  private getAveragePrecipitation(zone: ClimateZone): number {
    const values = Object.values(zone.characteristics.precipitation);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private getAverageTemperature(zone: ClimateZone): number {
    const values = Object.values(zone.characteristics.averageTemperature);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  public setTime(time: Date): void {
    this.currentTime = new Date(time);
    this.emit('timeChanged', time);
  }

  public getCurrentTime(): Date {
    return new Date(this.currentTime);
  }

  public getConfig(): ClimateSystemConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ClimateSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  public getClimateData(zoneId: string): ClimateData[] {
    return this.climatData.get(zoneId) || [];
  }

  public getClimateTrends(zoneId: string): ClimateTrend[] {
    return this.trends.get(zoneId) || [];
  }

  public exportClimateData(zoneId?: string): any {
    if (zoneId) {
      return {
        zone: this.zones.get(zoneId),
        data: this.climatData.get(zoneId),
        trends: this.trends.get(zoneId)
      };
    }

    const exportData: any = {};
    for (const [id, zone] of this.zones) {
      exportData[id] = {
        zone,
        data: this.climatData.get(id),
        trends: this.trends.get(id)
      };
    }
    return exportData;
  }

  public importClimateData(data: any): void {
    if (data.zone && data.data) {
      // Single zone import
      this.zones.set(data.zone.id, data.zone);
      this.climatData.set(data.zone.id, data.data);
      if (data.trends) {
        this.trends.set(data.zone.id, data.trends);
      }
    } else {
      // Multiple zones import
      for (const [zoneId, zoneData] of Object.entries(data)) {
        const typedData = zoneData as any;
        if (typedData.zone) {
          this.zones.set(zoneId, typedData.zone);
          this.climatData.set(zoneId, typedData.data || []);
          this.trends.set(zoneId, typedData.trends || []);
        }
      }
    }
    this.emit('climateDataImported', data);
  }
}