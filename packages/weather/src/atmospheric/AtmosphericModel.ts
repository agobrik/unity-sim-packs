import {
  AtmosphericLayer,
  GeographicLocation,
  WeatherState,
  WeatherSystem
} from '../types';

export interface AtmosphericConfig {
  layers: number;
  maxAltitude: number;
  temperatureLapseRate: number;
  pressureScaleHeight: number;
  humidityDecayRate: number;
  windShearFactor: number;
}

export interface AtmosphericProfile {
  location: GeographicLocation;
  timestamp: number;
  layers: AtmosphericLayer[];
  stability: AtmosphericStability;
  inversions: TemperatureInversion[];
  mixingHeight: number;
  tropopauseHeight: number;
}

export interface AtmosphericStability {
  class: StabilityClass;
  value: number;
  description: string;
  mixingPotential: number;
  convectionLikelihood: number;
}

export interface TemperatureInversion {
  baseAltitude: number;
  topAltitude: number;
  strength: number;
  type: InversionType;
}

export enum StabilityClass {
  VERY_UNSTABLE = 'very_unstable',
  UNSTABLE = 'unstable',
  SLIGHTLY_UNSTABLE = 'slightly_unstable',
  NEUTRAL = 'neutral',
  SLIGHTLY_STABLE = 'slightly_stable',
  STABLE = 'stable',
  VERY_STABLE = 'very_stable'
}

export enum InversionType {
  RADIATION = 'radiation',
  SUBSIDENCE = 'subsidence',
  ADVECTION = 'advection',
  FRONTAL = 'frontal'
}

export class AtmosphericModel {
  private config: AtmosphericConfig;
  private profiles: Map<string, AtmosphericProfile> = new Map();

  constructor(config?: Partial<AtmosphericConfig>) {
    this.config = {
      layers: 20,
      maxAltitude: 20000,
      temperatureLapseRate: 0.0065,
      pressureScaleHeight: 8400,
      humidityDecayRate: 0.5,
      windShearFactor: 0.1,
      ...config
    };
  }

  public generateAtmosphericProfile(
    location: GeographicLocation,
    surfaceWeather: WeatherState,
    weatherSystems: WeatherSystem[] = []
  ): AtmosphericProfile {
    const layers = this.generateLayers(location, surfaceWeather, weatherSystems);
    const stability = this.calculateStability(layers);
    const inversions = this.detectTemperatureInversions(layers);
    const mixingHeight = this.calculateMixingHeight(layers);
    const tropopauseHeight = this.findTropopauseHeight(layers);

    const profile: AtmosphericProfile = {
      location,
      timestamp: Date.now(),
      layers,
      stability,
      inversions,
      mixingHeight,
      tropopauseHeight
    };

    this.profiles.set(this.getLocationKey(location), profile);
    return profile;
  }

  private generateLayers(
    location: GeographicLocation,
    surfaceWeather: WeatherState,
    weatherSystems: WeatherSystem[]
  ): AtmosphericLayer[] {
    const layers: AtmosphericLayer[] = [];
    const layerHeight = this.config.maxAltitude / this.config.layers;

    for (let i = 0; i < this.config.layers; i++) {
      const altitude = layerHeight * (i + 1);
      const layer = this.generateLayer(altitude, location, surfaceWeather, weatherSystems);
      layers.push(layer);
    }

    return layers;
  }

  private generateLayer(
    altitude: number,
    location: GeographicLocation,
    surfaceWeather: WeatherState,
    weatherSystems: WeatherSystem[]
  ): AtmosphericLayer {
    // Base calculations using standard atmosphere
    const temperature = this.calculateTemperature(altitude, surfaceWeather.temperature);
    const pressure = this.calculatePressure(altitude, surfaceWeather.pressure);
    const humidity = this.calculateHumidity(altitude, surfaceWeather.humidity);
    const density = this.calculateDensity(pressure, temperature);

    // Wind calculations with altitude effects
    let windSpeed = this.calculateWindSpeed(altitude, surfaceWeather.windSpeed);
    let windDirection = this.calculateWindDirection(altitude, surfaceWeather.windDirection);

    // Apply weather system effects
    for (const system of weatherSystems) {
      const effects = this.calculateSystemEffects(altitude, location, system);
      windSpeed += effects.windSpeedChange;
      windDirection += effects.windDirectionChange;
    }

    // Visibility calculation
    const visibility = this.calculateVisibility(altitude, humidity, pressure);

    return {
      altitude,
      temperature,
      pressure,
      humidity,
      windSpeed: Math.max(0, windSpeed),
      windDirection: (windDirection + 360) % 360,
      density,
      visibility
    };
  }

  private calculateTemperature(altitude: number, surfaceTemperature: number): number {
    // Standard atmosphere with potential inversions
    let temperature = surfaceTemperature - (this.config.temperatureLapseRate * altitude);

    // Tropopause effect
    if (altitude > 11000) {
      const tropopauseTemp = surfaceTemperature - (this.config.temperatureLapseRate * 11000);
      temperature = tropopauseTemp; // Isothermal layer
    }

    // Stratospheric warming
    if (altitude > 20000) {
      temperature += (altitude - 20000) * 0.001;
    }

    return temperature;
  }

  private calculatePressure(altitude: number, surfacePressure: number): number {
    // Barometric formula
    const scaleHeight = this.config.pressureScaleHeight;
    return surfacePressure * Math.exp(-altitude / scaleHeight);
  }

  private calculateHumidity(altitude: number, surfaceHumidity: number): number {
    // Exponential decay with altitude
    const decayRate = this.config.humidityDecayRate;
    return Math.max(0, surfaceHumidity * Math.exp(-altitude * decayRate / 10000));
  }

  private calculateDensity(pressure: number, temperature: number): number {
    // Ideal gas law: ρ = p / (R * T)
    const gasConstant = 287; // J/(kg·K) for dry air
    const temperatureKelvin = temperature + 273.15;
    return (pressure * 100) / (gasConstant * temperatureKelvin); // Convert hPa to Pa
  }

  private calculateWindSpeed(altitude: number, surfaceWindSpeed: number): number {
    // Power law wind profile
    const roughnessLength = 0.1; // meters, typical for open terrain
    const referenceHeight = 10; // meters
    const powerExponent = 0.143; // Typical for neutral stability

    if (altitude < 100) {
      // Boundary layer
      return surfaceWindSpeed * Math.pow((altitude + roughnessLength) / referenceHeight, powerExponent);
    } else if (altitude < 1000) {
      // Transition zone
      const boundaryLayerWind = surfaceWindSpeed * Math.pow(100 / referenceHeight, powerExponent);
      const gradientFactor = 1 + (altitude - 100) / 900;
      return boundaryLayerWind * gradientFactor;
    } else {
      // Free atmosphere - jet stream effects
      const jetStreamAltitude = 9000; // meters
      const jetStreamStrength = 30; // m/s
      const jetStreamWidth = 3000; // meters

      const jetStreamEffect = jetStreamStrength *
        Math.exp(-Math.pow((altitude - jetStreamAltitude) / jetStreamWidth, 2));

      return surfaceWindSpeed * 2 + jetStreamEffect;
    }
  }

  private calculateWindDirection(altitude: number, surfaceWindDirection: number): number {
    // Ekman spiral effect and upper-level flow
    let direction = surfaceWindDirection;

    if (altitude < 1000) {
      // Boundary layer turning due to friction
      const turningAngle = 15 * (1 - altitude / 1000); // 15 degrees at surface, 0 at 1000m
      direction += turningAngle;
    } else {
      // Upper-level geostrophic flow
      const geostrophicShift = 30 * Math.sin(altitude / 5000 * Math.PI);
      direction += geostrophicShift;
    }

    return direction;
  }

  private calculateVisibility(altitude: number, humidity: number, pressure: number): number {
    // Base visibility increases with altitude
    let visibility = 20000 + altitude * 2;

    // Humidity effects
    if (humidity > 80) {
      visibility *= (1 - (humidity - 80) / 40);
    }

    // Pressure effects (atmospheric clarity)
    const normalizedPressure = pressure / 1013.25;
    visibility *= normalizedPressure;

    return Math.max(1000, visibility);
  }

  private calculateSystemEffects(
    altitude: number,
    location: GeographicLocation,
    system: WeatherSystem
  ): { windSpeedChange: number; windDirectionChange: number } {
    const distance = this.calculateDistance(location, system.center);
    if (distance > system.radius) {
      return { windSpeedChange: 0, windDirectionChange: 0 };
    }

    const intensity = Math.max(0, 1 - distance / system.radius) * (system.intensity / 100);
    const altitudeFactor = this.getAltitudeEffectFactor(altitude, system.type);

    const windSpeedChange = system.effects.windSpeedChange * intensity * altitudeFactor;
    const windDirectionChange = this.calculateSystemWindDirection(location, system) * intensity;

    return { windSpeedChange, windDirectionChange };
  }

  private getAltitudeEffectFactor(altitude: number, systemType: string): number {
    // Different weather systems have different vertical extent
    switch (systemType) {
      case 'hurricane':
      case 'typhoon':
      case 'cyclone':
        return altitude < 15000 ? 1 - altitude / 15000 : 0;
      case 'thunderstorm':
        return altitude < 12000 ? 1 - altitude / 12000 : 0;
      case 'high_pressure':
      case 'low_pressure':
        return altitude < 10000 ? 1 - altitude / 20000 : 0.5;
      default:
        return altitude < 5000 ? 1 - altitude / 5000 : 0;
    }
  }

  private calculateSystemWindDirection(location: GeographicLocation, system: WeatherSystem): number {
    // Calculate wind direction based on system type and position
    const dx = location.longitude - system.center.longitude;
    const dy = location.latitude - system.center.latitude;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    switch (system.type) {
      case 'low_pressure':
      case 'hurricane':
      case 'typhoon':
      case 'cyclone':
        // Counterclockwise in Northern Hemisphere
        return (angle + 90) % 360;
      case 'high_pressure':
        // Clockwise in Northern Hemisphere
        return (angle - 90 + 360) % 360;
      default:
        return system.direction;
    }
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

  private calculateStability(layers: AtmosphericLayer[]): AtmosphericStability {
    if (layers.length < 2) {
      return {
        class: StabilityClass.NEUTRAL,
        value: 0,
        description: 'Insufficient data for stability calculation',
        mixingPotential: 0.5,
        convectionLikelihood: 0.5
      };
    }

    // Calculate potential temperature gradient
    let totalGradient = 0;
    let count = 0;

    for (let i = 1; i < layers.length; i++) {
      const layer1 = layers[i - 1];
      const layer2 = layers[i];

      const potentialTemp1 = this.calculatePotentialTemperature(layer1.temperature, layer1.pressure);
      const potentialTemp2 = this.calculatePotentialTemperature(layer2.temperature, layer2.pressure);

      const gradient = (potentialTemp2 - potentialTemp1) / (layer2.altitude - layer1.altitude) * 1000;
      totalGradient += gradient;
      count++;
    }

    const avgGradient = totalGradient / count;
    const stabilityClass = this.classifyStability(avgGradient);

    return {
      class: stabilityClass,
      value: avgGradient,
      description: this.getStabilityDescription(stabilityClass),
      mixingPotential: this.calculateMixingPotential(avgGradient),
      convectionLikelihood: this.calculateConvectionLikelihood(avgGradient)
    };
  }

  private calculatePotentialTemperature(temperature: number, pressure: number): number {
    // θ = T * (P0/P)^(R/Cp)
    const referencePressure = 1000; // hPa
    const kappa = 0.286; // R/Cp for dry air
    return (temperature + 273.15) * Math.pow(referencePressure / pressure, kappa);
  }

  private classifyStability(gradient: number): StabilityClass {
    if (gradient < -3) return StabilityClass.VERY_UNSTABLE;
    if (gradient < -1.5) return StabilityClass.UNSTABLE;
    if (gradient < -0.5) return StabilityClass.SLIGHTLY_UNSTABLE;
    if (gradient < 0.5) return StabilityClass.NEUTRAL;
    if (gradient < 1.5) return StabilityClass.SLIGHTLY_STABLE;
    if (gradient < 3) return StabilityClass.STABLE;
    return StabilityClass.VERY_STABLE;
  }

  private getStabilityDescription(stabilityClass: StabilityClass): string {
    const descriptions = {
      [StabilityClass.VERY_UNSTABLE]: 'Strong convection expected, rapid vertical mixing',
      [StabilityClass.UNSTABLE]: 'Convection likely, good vertical mixing',
      [StabilityClass.SLIGHTLY_UNSTABLE]: 'Weak convection possible, moderate mixing',
      [StabilityClass.NEUTRAL]: 'Mechanical mixing only, limited convection',
      [StabilityClass.SLIGHTLY_STABLE]: 'Weak inversion, limited mixing',
      [StabilityClass.STABLE]: 'Strong inversion, poor mixing',
      [StabilityClass.VERY_STABLE]: 'Very strong inversion, minimal mixing'
    };
    return descriptions[stabilityClass];
  }

  private calculateMixingPotential(gradient: number): number {
    // Higher potential for unstable conditions
    return Math.max(0, Math.min(1, 0.5 - gradient / 6));
  }

  private calculateConvectionLikelihood(gradient: number): number {
    // Likelihood increases with instability
    return Math.max(0, Math.min(1, 0.5 - gradient / 4));
  }

  private detectTemperatureInversions(layers: AtmosphericLayer[]): TemperatureInversion[] {
    const inversions: TemperatureInversion[] = [];
    let inversionStart: number | null = null;
    let inversionBase: number | null = null;

    for (let i = 1; i < layers.length; i++) {
      const currentLayer = layers[i];
      const previousLayer = layers[i - 1];

      const isInversion = currentLayer.temperature > previousLayer.temperature;

      if (isInversion && inversionStart === null) {
        // Start of inversion
        inversionStart = i - 1;
        inversionBase = previousLayer.altitude;
      } else if (!isInversion && inversionStart !== null) {
        // End of inversion
        const strength = this.calculateInversionStrength(layers, inversionStart, i - 1);
        const type = this.determineInversionType(layers[inversionStart]);

        inversions.push({
          baseAltitude: inversionBase!,
          topAltitude: currentLayer.altitude,
          strength,
          type
        });

        inversionStart = null;
        inversionBase = null;
      }
    }

    // Handle inversion that extends to top of profile
    if (inversionStart !== null) {
      const strength = this.calculateInversionStrength(layers, inversionStart, layers.length - 1);
      const type = this.determineInversionType(layers[inversionStart]);

      inversions.push({
        baseAltitude: inversionBase!,
        topAltitude: layers[layers.length - 1].altitude,
        strength,
        type
      });
    }

    return inversions;
  }

  private calculateInversionStrength(
    layers: AtmosphericLayer[],
    startIndex: number,
    endIndex: number
  ): number {
    const startTemp = layers[startIndex].temperature;
    const endTemp = layers[endIndex].temperature;
    return endTemp - startTemp;
  }

  private determineInversionType(layer: AtmosphericLayer): InversionType {
    // Simple heuristic based on altitude and conditions
    if (layer.altitude < 500) {
      return InversionType.RADIATION;
    } else if (layer.altitude < 2000) {
      return InversionType.ADVECTION;
    } else {
      return InversionType.SUBSIDENCE;
    }
  }

  private calculateMixingHeight(layers: AtmosphericLayer[]): number {
    // Find the height where mixing is inhibited by stability
    for (let i = 1; i < layers.length; i++) {
      const currentLayer = layers[i];
      const previousLayer = layers[i - 1];

      // Check for strong stable layer
      const potentialTemp1 = this.calculatePotentialTemperature(previousLayer.temperature, previousLayer.pressure);
      const potentialTemp2 = this.calculatePotentialTemperature(currentLayer.temperature, currentLayer.pressure);
      const gradient = (potentialTemp2 - potentialTemp1) / (currentLayer.altitude - previousLayer.altitude) * 1000;

      if (gradient > 2) { // Strong stability
        return currentLayer.altitude;
      }
    }

    // If no strong stable layer found, use 2/3 of maximum altitude
    return this.config.maxAltitude * 0.67;
  }

  private findTropopauseHeight(layers: AtmosphericLayer[]): number {
    // Find tropopause based on temperature lapse rate change
    for (let i = 2; i < layers.length - 1; i++) {
      const layer1 = layers[i - 1];
      const layer2 = layers[i];
      const layer3 = layers[i + 1];

      const lapse1 = (layer1.temperature - layer2.temperature) / (layer2.altitude - layer1.altitude) * 1000;
      const lapse2 = (layer2.temperature - layer3.temperature) / (layer3.altitude - layer2.altitude) * 1000;

      // Tropopause typically where lapse rate becomes very small
      if (lapse1 > 2 && lapse2 < 2 && layer2.altitude > 8000) {
        return layer2.altitude;
      }
    }

    // Default tropopause height
    return 11000;
  }

  public getProfile(location: GeographicLocation): AtmosphericProfile | undefined {
    return this.profiles.get(this.getLocationKey(location));
  }

  public updateProfile(
    location: GeographicLocation,
    surfaceWeather: WeatherState,
    weatherSystems: WeatherSystem[] = []
  ): AtmosphericProfile {
    return this.generateAtmosphericProfile(location, surfaceWeather, weatherSystems);
  }

  public interpolateLayer(altitude: number, layers: AtmosphericLayer[]): AtmosphericLayer | null {
    if (layers.length === 0) return null;
    if (altitude <= layers[0].altitude) return layers[0];
    if (altitude >= layers[layers.length - 1].altitude) return layers[layers.length - 1];

    // Find surrounding layers
    let lowerIndex = 0;
    let upperIndex = layers.length - 1;

    for (let i = 0; i < layers.length - 1; i++) {
      if (altitude >= layers[i].altitude && altitude <= layers[i + 1].altitude) {
        lowerIndex = i;
        upperIndex = i + 1;
        break;
      }
    }

    const lowerLayer = layers[lowerIndex];
    const upperLayer = layers[upperIndex];
    const factor = (altitude - lowerLayer.altitude) / (upperLayer.altitude - lowerLayer.altitude);

    return {
      altitude,
      temperature: this.interpolateValue(lowerLayer.temperature, upperLayer.temperature, factor),
      pressure: this.interpolateValue(lowerLayer.pressure, upperLayer.pressure, factor),
      humidity: this.interpolateValue(lowerLayer.humidity, upperLayer.humidity, factor),
      windSpeed: this.interpolateValue(lowerLayer.windSpeed, upperLayer.windSpeed, factor),
      windDirection: this.interpolateAngle(lowerLayer.windDirection, upperLayer.windDirection, factor),
      density: this.interpolateValue(lowerLayer.density, upperLayer.density, factor),
      visibility: this.interpolateValue(lowerLayer.visibility, upperLayer.visibility, factor)
    };
  }

  private interpolateValue(lower: number, upper: number, factor: number): number {
    return lower + (upper - lower) * factor;
  }

  private interpolateAngle(lower: number, upper: number, factor: number): number {
    // Handle angle wrapping
    let diff = upper - lower;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (lower + diff * factor + 360) % 360;
  }

  private getLocationKey(location: GeographicLocation): string {
    return `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
  }

  public getConfig(): AtmosphericConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AtmosphericConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public clearProfiles(): void {
    this.profiles.clear();
  }

  public getProfileCount(): number {
    return this.profiles.size;
  }
}