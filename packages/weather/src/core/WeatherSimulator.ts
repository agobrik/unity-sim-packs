import { EventEmitter } from '../utils/EventEmitter';
import {
  WeatherState,
  WeatherForecast,
  WeatherSystem,
  WeatherAlert,
  WeatherEvent,
  ClimateZone,
  GeographicLocation,
  AtmosphericLayer,
  WeatherCondition,
  TemperatureRange,
  WindCondition,
  Precipitation,
  WeatherPhenomenon,
  PrecipitationType,
  PhenomenonType,
  PhenomenonIntensity,
  WeatherSystemType,
  SystemStage,
  AlertType,
  AlertSeverity,
  EventType,
  WeatherParameter,
  WeatherEventHandler,
  WeatherStateHandler,
  WeatherAlertHandler,
  ComparisonOperator,
  EventCategory,
  ImpactLevel,
  SafetyLevel
} from '../types';

export interface WeatherSimulatorConfig {
  updateInterval: number;
  forecastHorizon: number;
  atmosphericLayers: number;
  enableWeatherSystems: boolean;
  enableClimateEffects: boolean;
  randomSeed?: number;
}

export interface SimulationBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  minElevation: number;
  maxElevation: number;
}

export class WeatherSimulator extends EventEmitter {
  private config: WeatherSimulatorConfig;
  private bounds: SimulationBounds;
  private currentState: Map<string, WeatherState> = new Map();
  private atmosphericLayers: Map<string, AtmosphericLayer[]> = new Map();
  private weatherSystems: Map<string, WeatherSystem> = new Map();
  private activeAlerts: Map<string, WeatherAlert> = new Map();
  private climateZones: Map<string, ClimateZone> = new Map();
  private simulationTime: number;
  private updateTimer?: any;
  private isRunning = false;
  private rng: () => number;

  constructor(config: WeatherSimulatorConfig, bounds: SimulationBounds) {
    super();
    this.config = { ...config };
    this.bounds = { ...bounds };
    this.simulationTime = Date.now();

    if (config.randomSeed !== undefined) {
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

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateTimer = (globalThis as any).setInterval(() => {
      this.update();
    }, this.config.updateInterval);

    this.emit('simulationStarted', { timestamp: this.simulationTime });
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateTimer) {
      (globalThis as any).clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.emit('simulationStopped', { timestamp: this.simulationTime });
  }

  public pause(): void {
    if (this.updateTimer) {
      (globalThis as any).clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    this.emit('simulationPaused', { timestamp: this.simulationTime });
  }

  public resume(): void {
    if (this.isRunning && !this.updateTimer) {
      this.updateTimer = (globalThis as any).setInterval(() => {
        this.update();
      }, this.config.updateInterval);
      this.emit('simulationResumed', { timestamp: this.simulationTime });
    }
  }

  public setTime(timestamp: number): void {
    this.simulationTime = timestamp;
    this.emit('timeChanged', { timestamp });
  }

  public addLocation(locationId: string, location: GeographicLocation): void {
    const initialState = this.generateInitialWeatherState(location);
    this.currentState.set(locationId, initialState);

    if (this.config.atmosphericLayers > 0) {
      const layers = this.generateAtmosphericLayers(location);
      this.atmosphericLayers.set(locationId, layers);
    }

    this.emit('locationAdded', { locationId, location, initialState });
  }

  public removeLocation(locationId: string): void {
    this.currentState.delete(locationId);
    this.atmosphericLayers.delete(locationId);
    this.emit('locationRemoved', { locationId });
  }

  public getWeatherState(locationId: string): WeatherState | undefined {
    return this.currentState.get(locationId);
  }

  public getAllWeatherStates(): Map<string, WeatherState> {
    return new Map(this.currentState);
  }

  public getAtmosphericLayers(locationId: string): AtmosphericLayer[] | undefined {
    return this.atmosphericLayers.get(locationId);
  }

  public addWeatherSystem(system: WeatherSystem): void {
    this.weatherSystems.set(system.id, system);
    this.emit('weatherSystemAdded', system);
  }

  public removeWeatherSystem(systemId: string): void {
    const system = this.weatherSystems.get(systemId);
    if (system) {
      this.weatherSystems.delete(systemId);
      this.emit('weatherSystemRemoved', system);
    }
  }

  public getWeatherSystems(): WeatherSystem[] {
    return Array.from(this.weatherSystems.values());
  }

  public addClimateZone(zone: ClimateZone): void {
    this.climateZones.set(zone.id, zone);
    this.emit('climateZoneAdded', zone);
  }

  public generateForecast(locationId: string, hours: number = 24): WeatherForecast | null {
    const currentState = this.currentState.get(locationId);
    if (!currentState) return null;

    const conditions: WeatherCondition[] = [];
    const forecastStart = this.simulationTime;
    const hourlyInterval = 3600000; // 1 hour in milliseconds

    for (let i = 0; i < hours; i++) {
      const forecastTime = forecastStart + (i * hourlyInterval);
      const condition = this.generateWeatherCondition(currentState, forecastTime, i);
      conditions.push(condition);
    }

    const confidence = this.calculateForecastConfidence(hours);
    const validUntil = forecastStart + (hours * hourlyInterval);

    return {
      timestamp: forecastStart,
      location: currentState.location,
      conditions,
      confidence,
      validUntil
    };
  }

  private update(): void {
    this.simulationTime += this.config.updateInterval;

    // Update weather states for all locations
    for (const [locationId, state] of this.currentState) {
      const updatedState = this.updateWeatherState(locationId, state);
      this.currentState.set(locationId, updatedState);
      this.emit('weatherStateUpdated', { locationId, state: updatedState });
    }

    // Update weather systems
    if (this.config.enableWeatherSystems) {
      this.updateWeatherSystems();
    }

    // Check for alerts
    this.checkForAlerts();

    // Update atmospheric layers
    this.updateAtmosphericLayers();

    this.emit('simulationUpdated', { timestamp: this.simulationTime });
  }

  private generateInitialWeatherState(location: GeographicLocation): WeatherState {
    const baseTemp = this.calculateBaseTemperature(location);
    const basePressure = this.calculateBasePressure(location);

    return {
      temperature: baseTemp + (this.rng() - 0.5) * 10,
      humidity: 30 + this.rng() * 70,
      pressure: basePressure + (this.rng() - 0.5) * 20,
      windSpeed: this.rng() * 15,
      windDirection: this.rng() * 360,
      cloudCover: this.rng() * 100,
      precipitation: {
        type: PrecipitationType.NONE,
        intensity: 0,
        accumulation: 0,
        probability: this.rng() * 30
      },
      visibility: 5000 + this.rng() * 15000,
      dewPoint: baseTemp - (this.rng() * 20),
      uvIndex: Math.max(0, 11 * this.rng()),
      timestamp: this.simulationTime,
      location
    };
  }

  private calculateBaseTemperature(location: GeographicLocation): number {
    // Simple temperature model based on latitude and elevation
    const latitudeFactor = Math.cos(location.latitude * Math.PI / 180);
    const elevationEffect = -0.0065 * location.elevation; // Standard lapse rate
    const seasonalVariation = Math.sin((this.simulationTime / (365.25 * 24 * 60 * 60 * 1000)) * 2 * Math.PI) * 15;

    return 15 + (latitudeFactor * 20) + elevationEffect + seasonalVariation;
  }

  private calculateBasePressure(location: GeographicLocation): number {
    // Standard atmospheric pressure adjusted for elevation
    const seaLevelPressure = 1013.25;
    const altitudePressure = seaLevelPressure * Math.pow(1 - 0.0065 * location.elevation / 288.15, 5.255);
    return altitudePressure;
  }

  private generateAtmosphericLayers(location: GeographicLocation): AtmosphericLayer[] {
    const layers: AtmosphericLayer[] = [];
    const maxAltitude = 20000; // 20km
    const layerHeight = maxAltitude / this.config.atmosphericLayers;

    for (let i = 0; i < this.config.atmosphericLayers; i++) {
      const altitude = layerHeight * (i + 1);
      const temperature = this.calculateBaseTemperature(location) - (altitude * 0.0065);
      const pressure = this.calculateBasePressure(location) * Math.pow(1 - altitude / 44330, 5.255);

      layers.push({
        altitude,
        temperature,
        pressure,
        humidity: Math.max(0, 70 - (altitude / 1000) * 10 + this.rng() * 20),
        windSpeed: 5 + (altitude / 1000) * 2 + this.rng() * 10,
        windDirection: this.rng() * 360,
        density: pressure / (287 * (temperature + 273.15)),
        visibility: Math.max(1000, 20000 - altitude)
      });
    }

    return layers;
  }

  private updateWeatherState(locationId: string, currentState: WeatherState): WeatherState {
    const timeDelta = this.config.updateInterval / 1000 / 3600; // Convert to hours
    const weatherSystems = this.getWeatherSystemsAffecting(locationId, currentState.location);

    let newState = { ...currentState };
    newState.timestamp = this.simulationTime;

    // Apply natural weather evolution
    newState = this.applyNaturalEvolution(newState, timeDelta);

    // Apply climate zone effects
    if (this.config.enableClimateEffects) {
      newState = this.applyClimateEffects(newState, locationId);
    }

    // Apply weather system effects
    for (const system of weatherSystems) {
      newState = this.applyWeatherSystemEffects(newState, system);
    }

    // Update precipitation
    newState.precipitation = this.updatePrecipitation(newState);

    // Generate weather events
    this.checkForWeatherEvents(locationId, currentState, newState);

    return newState;
  }

  private applyNaturalEvolution(state: WeatherState, timeDelta: number): WeatherState {
    const newState = { ...state };

    // Temperature evolution with daily cycle
    const hourOfDay = (this.simulationTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000);
    const dailyTempCycle = Math.sin((hourOfDay - 6) * Math.PI / 12) * 8;
    const baseTemp = this.calculateBaseTemperature(state.location);
    const tempNoise = (this.rng() - 0.5) * 2;
    newState.temperature = baseTemp + dailyTempCycle + tempNoise;

    // Pressure evolution (gradual changes)
    const pressureChange = (this.rng() - 0.5) * 2 * timeDelta;
    newState.pressure = Math.max(950, Math.min(1050, state.pressure + pressureChange));

    // Humidity evolution
    const humidityChange = (this.rng() - 0.5) * 10 * timeDelta;
    newState.humidity = Math.max(0, Math.min(100, state.humidity + humidityChange));

    // Wind evolution
    const windSpeedChange = (this.rng() - 0.5) * 5 * timeDelta;
    newState.windSpeed = Math.max(0, state.windSpeed + windSpeedChange);

    const windDirectionChange = (this.rng() - 0.5) * 30 * timeDelta;
    newState.windDirection = (state.windDirection + windDirectionChange + 360) % 360;

    // Cloud cover evolution
    const cloudChange = (this.rng() - 0.5) * 20 * timeDelta;
    newState.cloudCover = Math.max(0, Math.min(100, state.cloudCover + cloudChange));

    // Visibility based on conditions
    let baseVisibility = 15000;
    if (newState.precipitation.intensity > 0) {
      baseVisibility *= (1 - newState.precipitation.intensity * 0.5);
    }
    if (newState.cloudCover > 80) {
      baseVisibility *= 0.8;
    }
    newState.visibility = Math.max(100, baseVisibility + (this.rng() - 0.5) * 5000);

    // Calculate dew point
    newState.dewPoint = newState.temperature - ((100 - newState.humidity) / 5);

    return newState;
  }

  private applyClimateEffects(state: WeatherState, locationId: string): WeatherState {
    const affectingZones = Array.from(this.climateZones.values()).filter(zone =>
      this.isLocationInClimateZone(state.location, zone)
    );

    let newState = { ...state };

    for (const zone of affectingZones) {
      // Apply seasonal patterns
      const currentSeason = this.getCurrentSeason(this.simulationTime);
      const seasonalPattern = zone.seasonalPatterns.find(p => p.season === currentSeason);

      if (seasonalPattern) {
        newState.temperature *= (1 + seasonalPattern.temperatureModifier);
        newState.humidity *= (1 + seasonalPattern.humidityModifier);
        newState.precipitation.probability *= (1 + seasonalPattern.precipitationModifier);
      }
    }

    return newState;
  }

  private getCurrentSeason(timestamp: number): string {
    const date = new Date(timestamp);
    const month = date.getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private isLocationInClimateZone(location: GeographicLocation, zone: ClimateZone): boolean {
    // Simple implementation - would need more sophisticated geographic calculations
    return Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180;
  }

  private applyWeatherSystemEffects(state: WeatherState, system: WeatherSystem): WeatherState {
    const distance = this.calculateDistance(state.location, system.center);
    if (distance > system.radius) return state;

    const intensity = Math.max(0, 1 - distance / system.radius) * (system.intensity / 100);
    const newState = { ...state };

    newState.temperature += system.effects.temperatureChange * intensity;
    newState.humidity += system.effects.humidityChange * intensity;
    newState.pressure += system.effects.pressureChange * intensity;
    newState.windSpeed += system.effects.windSpeedChange * intensity;
    newState.precipitation.intensity += system.effects.precipitationChange * intensity;
    newState.cloudCover += system.effects.cloudCoverChange * intensity;

    return newState;
  }

  private calculateDistance(loc1: GeographicLocation, loc2: GeographicLocation): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = loc1.latitude * Math.PI / 180;
    const lat2Rad = loc2.latitude * Math.PI / 180;
    const deltaLatRad = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const deltaLonRad = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private getWeatherSystemsAffecting(locationId: string, location: GeographicLocation): WeatherSystem[] {
    return Array.from(this.weatherSystems.values()).filter(system => {
      const distance = this.calculateDistance(location, system.center);
      return distance <= system.radius;
    });
  }

  private updateWeatherSystems(): void {
    for (const [systemId, system] of this.weatherSystems) {
      const updatedSystem = this.updateWeatherSystem(system);

      if (updatedSystem.lifecycle.stage === SystemStage.DISSIPATING &&
          updatedSystem.intensity < 10) {
        this.weatherSystems.delete(systemId);
        this.emit('weatherSystemDissipated', updatedSystem);
      } else {
        this.weatherSystems.set(systemId, updatedSystem);
        this.emit('weatherSystemUpdated', updatedSystem);
      }
    }
  }

  private updateWeatherSystem(system: WeatherSystem): WeatherSystem {
    const timeDelta = this.config.updateInterval / 1000 / 3600; // Hours
    const newSystem = { ...system };

    // Update position
    const moveDistance = (system.speed / 3600) * timeDelta; // km per hour to km
    const moveRadians = system.direction * Math.PI / 180;

    newSystem.center = {
      ...system.center,
      latitude: system.center.latitude + (moveDistance / 111.32) * Math.cos(moveRadians),
      longitude: system.center.longitude + (moveDistance / (111.32 * Math.cos(system.center.latitude * Math.PI / 180))) * Math.sin(moveRadians)
    };

    // Update lifecycle
    newSystem.lifecycle = {
      ...system.lifecycle,
      age: system.lifecycle.age + timeDelta
    };

    // Update intensity based on lifecycle stage
    const ageRatio = newSystem.lifecycle.age / newSystem.lifecycle.expectedLifetime;

    if (ageRatio < 0.3) {
      newSystem.lifecycle.stage = SystemStage.DEVELOPING;
      newSystem.intensity = Math.min(system.lifecycle.maxIntensity, system.intensity + 5 * timeDelta);
    } else if (ageRatio < 0.7) {
      newSystem.lifecycle.stage = SystemStage.MATURE;
    } else if (ageRatio < 0.9) {
      newSystem.lifecycle.stage = SystemStage.WEAKENING;
      newSystem.intensity = Math.max(0, system.intensity - system.lifecycle.decayRate * timeDelta);
    } else {
      newSystem.lifecycle.stage = SystemStage.DISSIPATING;
      newSystem.intensity = Math.max(0, system.intensity - system.lifecycle.decayRate * 2 * timeDelta);
    }

    return newSystem;
  }

  private updatePrecipitation(state: WeatherState): Precipitation {
    const newPrecipitation = { ...state.precipitation };

    if (state.humidity > 80 && state.cloudCover > 70) {
      const precipChance = (state.humidity - 80) * (state.cloudCover - 70) / 600;

      if (this.rng() < precipChance) {
        newPrecipitation.type = state.temperature > 2 ?
          (state.temperature > 10 ? PrecipitationType.RAIN : PrecipitationType.SLEET) :
          PrecipitationType.SNOW;

        newPrecipitation.intensity = Math.min(1, this.rng() * (state.humidity - 70) / 30);
        newPrecipitation.accumulation += newPrecipitation.intensity * (this.config.updateInterval / 1000 / 3600);
        newPrecipitation.probability = Math.min(100, precipChance * 100);
      } else {
        newPrecipitation.type = PrecipitationType.NONE;
        newPrecipitation.intensity = 0;
        newPrecipitation.probability = Math.max(0, newPrecipitation.probability - 10);
      }
    } else {
      newPrecipitation.type = PrecipitationType.NONE;
      newPrecipitation.intensity = 0;
      newPrecipitation.probability = Math.max(0, newPrecipitation.probability - 5);
    }

    return newPrecipitation;
  }

  private generateWeatherCondition(baseState: WeatherState, forecastTime: number, hoursAhead: number): WeatherCondition {
    const uncertainty = hoursAhead * 0.1; // Uncertainty increases with time

    return {
      time: forecastTime,
      temperature: {
        current: baseState.temperature + (this.rng() - 0.5) * 5 * uncertainty,
        min: baseState.temperature - 3 - uncertainty,
        max: baseState.temperature + 3 + uncertainty,
        feelsLike: baseState.temperature + (baseState.windSpeed > 10 ? -2 : 0)
      },
      humidity: Math.max(0, Math.min(100, baseState.humidity + (this.rng() - 0.5) * 20 * uncertainty)),
      pressure: baseState.pressure + (this.rng() - 0.5) * 10 * uncertainty,
      wind: {
        speed: Math.max(0, baseState.windSpeed + (this.rng() - 0.5) * 10 * uncertainty),
        direction: (baseState.windDirection + (this.rng() - 0.5) * 60 * uncertainty + 360) % 360,
        gusts: baseState.windSpeed * (1 + this.rng() * 0.5),
        variability: this.rng() * 30
      },
      precipitation: {
        ...baseState.precipitation,
        probability: Math.max(0, Math.min(100, baseState.precipitation.probability + (this.rng() - 0.5) * 30 * uncertainty))
      },
      cloudCover: Math.max(0, Math.min(100, baseState.cloudCover + (this.rng() - 0.5) * 40 * uncertainty)),
      visibility: Math.max(100, baseState.visibility + (this.rng() - 0.5) * 5000 * uncertainty),
      phenomena: this.generateWeatherPhenomena(baseState, uncertainty)
    };
  }

  private generateWeatherPhenomena(state: WeatherState, uncertainty: number): WeatherPhenomenon[] {
    const phenomena: WeatherPhenomenon[] = [];

    if (state.visibility < 1000 && state.humidity > 90) {
      phenomena.push({
        type: PhenomenonType.FOG,
        intensity: state.visibility < 500 ? PhenomenonIntensity.HEAVY : PhenomenonIntensity.MODERATE,
        coverage: 70 + this.rng() * 30,
        duration: 2 + this.rng() * 4,
        startTime: this.simulationTime + this.rng() * 3600000
      });
    }

    if (state.precipitation.intensity > 0.7 && state.windSpeed > 15) {
      phenomena.push({
        type: PhenomenonType.THUNDERSTORM,
        intensity: PhenomenonIntensity.SEVERE,
        coverage: 30 + this.rng() * 40,
        duration: 1 + this.rng() * 2,
        startTime: this.simulationTime + this.rng() * 7200000
      });
    }

    return phenomena;
  }

  private calculateForecastConfidence(hours: number): number {
    // Confidence decreases with forecast horizon
    const baseConfidence = 95;
    const degradationRate = 2; // 2% per hour
    return Math.max(30, baseConfidence - (hours * degradationRate));
  }

  private checkForAlerts(): void {
    for (const [locationId, state] of this.currentState) {
      this.checkTemperatureAlerts(locationId, state);
      this.checkWindAlerts(locationId, state);
      this.checkPrecipitationAlerts(locationId, state);
      this.checkStormAlerts(locationId, state);
    }
  }

  private checkTemperatureAlerts(locationId: string, state: WeatherState): void {
    const extremeTemp = state.temperature > 40 || state.temperature < -20;

    if (extremeTemp) {
      const alertId = `temp_${locationId}_${this.simulationTime}`;
      const severity = state.temperature > 45 || state.temperature < -30 ?
        AlertSeverity.EMERGENCY : AlertSeverity.WARNING;

      const alert: WeatherAlert = {
        id: alertId,
        type: AlertType.TEMPERATURE,
        severity,
        title: state.temperature > 40 ? 'Extreme Heat Warning' : 'Extreme Cold Warning',
        description: `Temperature of ${state.temperature.toFixed(1)}°C poses significant risk`,
        area: {
          type: 'circle',
          coordinates: [[state.location.latitude, state.location.longitude]],
          radius: 50000
        },
        validFrom: this.simulationTime,
        validUntil: this.simulationTime + 24 * 60 * 60 * 1000,
        conditions: [{
          parameter: WeatherParameter.TEMPERATURE,
          threshold: state.temperature > 40 ? 40 : -20,
          operator: state.temperature > 40 ? ComparisonOperator.GREATER_THAN : ComparisonOperator.LESS_THAN,
          duration: 2
        }],
        recommendations: [
          state.temperature > 40 ? 'Stay hydrated and avoid outdoor activities' : 'Dress warmly and limit exposure'
        ]
      };

      this.activeAlerts.set(alertId, alert);
      this.emit('weatherAlertIssued', alert);
    }
  }

  private checkWindAlerts(locationId: string, state: WeatherState): void {
    if (state.windSpeed > 20) {
      const alertId = `wind_${locationId}_${this.simulationTime}`;
      const severity = state.windSpeed > 30 ? AlertSeverity.WARNING : AlertSeverity.ADVISORY;

      const alert: WeatherAlert = {
        id: alertId,
        type: AlertType.WIND,
        severity,
        title: 'High Wind Alert',
        description: `Wind speeds of ${state.windSpeed.toFixed(1)} m/s expected`,
        area: {
          type: 'circle',
          coordinates: [[state.location.latitude, state.location.longitude]],
          radius: 25000
        },
        validFrom: this.simulationTime,
        validUntil: this.simulationTime + 12 * 60 * 60 * 1000,
        conditions: [{
          parameter: WeatherParameter.WIND_SPEED,
          threshold: 20,
          operator: ComparisonOperator.GREATER_THAN,
          duration: 1
        }],
        recommendations: ['Secure loose objects and avoid high-profile vehicles']
      };

      this.activeAlerts.set(alertId, alert);
      this.emit('weatherAlertIssued', alert);
    }
  }

  private checkPrecipitationAlerts(locationId: string, state: WeatherState): void {
    if (state.precipitation.intensity > 0.7) {
      const alertId = `precip_${locationId}_${this.simulationTime}`;
      const severity = state.precipitation.intensity > 0.9 ? AlertSeverity.WARNING : AlertSeverity.ADVISORY;

      const alert: WeatherAlert = {
        id: alertId,
        type: AlertType.PRECIPITATION,
        severity,
        title: 'Heavy Precipitation Alert',
        description: `Heavy ${state.precipitation.type} with intensity ${state.precipitation.intensity.toFixed(2)}`,
        area: {
          type: 'circle',
          coordinates: [[state.location.latitude, state.location.longitude]],
          radius: 30000
        },
        validFrom: this.simulationTime,
        validUntil: this.simulationTime + 6 * 60 * 60 * 1000,
        conditions: [{
          parameter: WeatherParameter.PRECIPITATION,
          threshold: 0.7,
          operator: ComparisonOperator.GREATER_THAN,
          duration: 1
        }],
        recommendations: ['Exercise caution when driving and avoid flood-prone areas']
      };

      this.activeAlerts.set(alertId, alert);
      this.emit('weatherAlertIssued', alert);
    }
  }

  private checkStormAlerts(locationId: string, state: WeatherState): void {
    const stormConditions = state.precipitation.intensity > 0.5 &&
                           state.windSpeed > 15 &&
                           state.cloudCover > 80;

    if (stormConditions) {
      const alertId = `storm_${locationId}_${this.simulationTime}`;

      const alert: WeatherAlert = {
        id: alertId,
        type: AlertType.STORM,
        severity: AlertSeverity.WARNING,
        title: 'Storm Warning',
        description: 'Severe weather conditions with heavy precipitation and strong winds',
        area: {
          type: 'circle',
          coordinates: [[state.location.latitude, state.location.longitude]],
          radius: 40000
        },
        validFrom: this.simulationTime,
        validUntil: this.simulationTime + 8 * 60 * 60 * 1000,
        conditions: [
          {
            parameter: WeatherParameter.PRECIPITATION,
            threshold: 0.5,
            operator: ComparisonOperator.GREATER_THAN,
            duration: 2
          },
          {
            parameter: WeatherParameter.WIND_SPEED,
            threshold: 15,
            operator: ComparisonOperator.GREATER_THAN,
            duration: 2
          }
        ],
        recommendations: [
          'Avoid unnecessary travel',
          'Stay indoors and away from windows',
          'Monitor local weather updates'
        ]
      };

      this.activeAlerts.set(alertId, alert);
      this.emit('weatherAlertIssued', alert);
    }
  }

  private checkForWeatherEvents(locationId: string, oldState: WeatherState, newState: WeatherState): void {
    // Check for precipitation start/end
    if (oldState.precipitation.intensity === 0 && newState.precipitation.intensity > 0) {
      this.emitWeatherEvent(locationId, EventType.PRECIPITATION_START, newState, {
        precipitationType: newState.precipitation.type,
        intensity: newState.precipitation.intensity
      });
    } else if (oldState.precipitation.intensity > 0 && newState.precipitation.intensity === 0) {
      this.emitWeatherEvent(locationId, EventType.PRECIPITATION_END, newState, {
        totalAccumulation: oldState.precipitation.accumulation
      });
    }

    // Check for temperature extremes
    const tempChange = Math.abs(newState.temperature - oldState.temperature);
    if (tempChange > 10) {
      this.emitWeatherEvent(locationId, EventType.TEMPERATURE_EXTREME, newState, {
        temperatureChange: newState.temperature - oldState.temperature,
        newTemperature: newState.temperature
      });
    }

    // Check for wind gusts
    if (newState.windSpeed > oldState.windSpeed + 10) {
      this.emitWeatherEvent(locationId, EventType.WIND_GUST, newState, {
        windSpeed: newState.windSpeed,
        windDirection: newState.windDirection
      });
    }

    // Check for pressure changes
    const pressureChange = Math.abs(newState.pressure - oldState.pressure);
    if (pressureChange > 5) {
      this.emitWeatherEvent(locationId, EventType.PRESSURE_CHANGE, newState, {
        pressureChange: newState.pressure - oldState.pressure,
        newPressure: newState.pressure
      });
    }
  }

  private emitWeatherEvent(locationId: string, type: EventType, state: WeatherState, parameters: Record<string, any>): void {
    const event: WeatherEvent = {
      id: `${type}_${locationId}_${this.simulationTime}`,
      type,
      category: EventCategory.ATMOSPHERIC,
      timestamp: this.simulationTime,
      location: state.location,
      data: {
        duration: 0,
        intensity: 1,
        parameters,
        description: `Weather event: ${type}`,
        metadata: { locationId }
      },
      impact: {
        visibility: 0,
        transportation: { road: ImpactLevel.NONE, air: ImpactLevel.NONE, sea: ImpactLevel.NONE, rail: ImpactLevel.NONE },
        agriculture: { crops: ImpactLevel.NONE, livestock: ImpactLevel.NONE, irrigation: ImpactLevel.NONE },
        energy: { solar: 0, wind: 0, hydroelectric: 0, demand: 0 },
        safety: { level: SafetyLevel.SAFE, risks: [], recommendations: [] }
      },
      confidence: 0.9
    };

    this.emit('weatherEvent', event);
  }

  private updateAtmosphericLayers(): void {
    for (const [locationId, layers] of this.atmosphericLayers) {
      const updatedLayers = layers.map(layer => this.updateAtmosphericLayer(layer, locationId));
      this.atmosphericLayers.set(locationId, updatedLayers);
    }
  }

  private updateAtmosphericLayer(layer: AtmosphericLayer, locationId: string): AtmosphericLayer {
    const surfaceState = this.currentState.get(locationId);
    if (!surfaceState) return layer;

    const altitudeFactor = layer.altitude / 20000;
    const timeDelta = this.config.updateInterval / 1000 / 3600;

    return {
      ...layer,
      temperature: layer.temperature + (this.rng() - 0.5) * 2 * timeDelta,
      pressure: layer.pressure + (this.rng() - 0.5) * 1 * timeDelta,
      humidity: Math.max(0, Math.min(100, layer.humidity + (this.rng() - 0.5) * 10 * timeDelta)),
      windSpeed: Math.max(0, layer.windSpeed + (this.rng() - 0.5) * 5 * timeDelta),
      windDirection: (layer.windDirection + (this.rng() - 0.5) * 20 * timeDelta + 360) % 360,
      visibility: Math.max(1000, layer.visibility + (this.rng() - 0.5) * 2000 * timeDelta)
    };
  }

  public getActiveAlerts(): WeatherAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  public clearExpiredAlerts(): void {
    const now = this.simulationTime;
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.validUntil < now) {
        this.activeAlerts.delete(alertId);
        this.emit('weatherAlertExpired', alert);
      }
    }
  }

  public getSimulationTime(): number {
    return this.simulationTime;
  }

  public getConfig(): WeatherSimulatorConfig {
    return { ...this.config };
  }

  public getBounds(): SimulationBounds {
    return { ...this.bounds };
  }

  public isSimulationRunning(): boolean {
    return this.isRunning;
  }
}