import {
  WeatherState,
  WeatherForecast,
  WeatherAlert,
  GeographicLocation,
  Precipitation,
  PrecipitationType,
  WeatherParameter,
  AlertSeverity,
  TemperatureRange,
  WindCondition
} from '../types';

export class WeatherUtils {
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly METERS_PER_DEGREE = 111320;

  public static calculateDistance(loc1: GeographicLocation, loc2: GeographicLocation): number {
    const lat1Rad = this.toRadians(loc1.latitude);
    const lat2Rad = this.toRadians(loc2.latitude);
    const deltaLatRad = this.toRadians(loc2.latitude - loc1.latitude);
    const deltaLonRad = this.toRadians(loc2.longitude - loc1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c * 1000; // Return in meters
  }

  public static calculateBearing(from: GeographicLocation, to: GeographicLocation): number {
    const lat1Rad = this.toRadians(from.latitude);
    const lat2Rad = this.toRadians(to.latitude);
    const deltaLonRad = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    return (bearing + 360) % 360;
  }

  public static interpolateWeatherStates(
    state1: WeatherState,
    state2: WeatherState,
    factor: number
  ): WeatherState {
    const clampedFactor = Math.max(0, Math.min(1, factor));

    return {
      temperature: this.interpolateValue(state1.temperature, state2.temperature, clampedFactor),
      humidity: this.interpolateValue(state1.humidity, state2.humidity, clampedFactor),
      pressure: this.interpolateValue(state1.pressure, state2.pressure, clampedFactor),
      windSpeed: this.interpolateValue(state1.windSpeed, state2.windSpeed, clampedFactor),
      windDirection: this.interpolateAngle(state1.windDirection, state2.windDirection, clampedFactor),
      cloudCover: this.interpolateValue(state1.cloudCover, state2.cloudCover, clampedFactor),
      precipitation: this.interpolatePrecipitation(state1.precipitation, state2.precipitation, clampedFactor),
      visibility: this.interpolateValue(state1.visibility, state2.visibility, clampedFactor),
      dewPoint: this.interpolateValue(state1.dewPoint, state2.dewPoint, clampedFactor),
      uvIndex: this.interpolateValue(state1.uvIndex, state2.uvIndex, clampedFactor),
      timestamp: this.interpolateValue(state1.timestamp, state2.timestamp, clampedFactor),
      location: this.interpolateLocation(state1.location, state2.location, clampedFactor)
    };
  }

  private static interpolateValue(value1: number, value2: number, factor: number): number {
    return value1 + (value2 - value1) * factor;
  }

  private static interpolateAngle(angle1: number, angle2: number, factor: number): number {
    let diff = angle2 - angle1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (angle1 + diff * factor + 360) % 360;
  }

  private static interpolatePrecipitation(
    precip1: Precipitation,
    precip2: Precipitation,
    factor: number
  ): Precipitation {
    return {
      type: factor < 0.5 ? precip1.type : precip2.type,
      intensity: this.interpolateValue(precip1.intensity, precip2.intensity, factor),
      accumulation: this.interpolateValue(precip1.accumulation, precip2.accumulation, factor),
      probability: this.interpolateValue(precip1.probability, precip2.probability, factor)
    };
  }

  private static interpolateLocation(
    loc1: GeographicLocation,
    loc2: GeographicLocation,
    factor: number
  ): GeographicLocation {
    return {
      latitude: this.interpolateValue(loc1.latitude, loc2.latitude, factor),
      longitude: this.interpolateValue(loc1.longitude, loc2.longitude, factor),
      elevation: this.interpolateValue(loc1.elevation, loc2.elevation, factor),
      timezone: factor < 0.5 ? loc1.timezone : loc2.timezone
    };
  }

  public static calculateDewPoint(temperature: number, humidity: number): number {
    // Magnus formula approximation
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }

  public static calculateHumidityFromDewPoint(temperature: number, dewPoint: number): number {
    // Calculate relative humidity from temperature and dew point
    const a = 17.27;
    const b = 237.7;
    const alphaDew = (a * dewPoint) / (b + dewPoint);
    const alphaTemp = (a * temperature) / (b + temperature);
    return Math.exp(alphaDew - alphaTemp) * 100;
  }

  public static calculateHeatIndex(temperature: number, humidity: number): number {
    // Heat index calculation (Rothfusz equation)
    if (temperature < 26.7) return temperature; // Below 80°F, heat index = temperature

    const T = temperature;
    const RH = humidity;

    let HI = -42.379 + 2.04901523 * T + 10.14333127 * RH -
      0.22475541 * T * RH - 0.00683783 * T * T -
      0.05481717 * RH * RH + 0.00122874 * T * T * RH +
      0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;

    // Adjustments for specific conditions
    if (RH < 13 && T >= 26.7 && T <= 44.4) {
      HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 35)) / 17);
    } else if (RH > 85 && T >= 26.7 && T <= 30.6) {
      HI += ((RH - 85) / 10) * ((30.6 - T) / 5);
    }

    return HI;
  }

  public static calculateWindChill(temperature: number, windSpeed: number): number {
    // Wind chill calculation (modern formula)
    if (temperature > 10 || windSpeed < 4.8) return temperature; // Conditions don't warrant wind chill

    const T = temperature;
    const V = windSpeed * 3.6; // Convert m/s to km/h

    return 13.12 + 0.6215 * T - 11.37 * Math.pow(V, 0.16) + 0.3965 * T * Math.pow(V, 0.16);
  }

  public static calculateFeelsLike(temperature: number, humidity: number, windSpeed: number): number {
    if (temperature > 26.7) {
      return this.calculateHeatIndex(temperature, humidity);
    } else if (temperature <= 10 && windSpeed >= 4.8) {
      return this.calculateWindChill(temperature, windSpeed);
    }
    return temperature;
  }

  public static calculateCloudBase(temperature: number, dewPoint: number): number {
    // Cloud base calculation using the lifting condensation level
    const temperatureDiff = temperature - dewPoint;
    return temperatureDiff * 125; // meters (approximate formula)
  }

  public static calculateVisibilityFromPrecipitation(precipitation: Precipitation): number {
    let baseVisibility = 15000; // 15km in clear conditions

    switch (precipitation.type) {
      case PrecipitationType.DRIZZLE:
        baseVisibility *= Math.max(0.2, 1 - precipitation.intensity * 0.4);
        break;
      case PrecipitationType.RAIN:
        baseVisibility *= Math.max(0.1, 1 - precipitation.intensity * 0.6);
        break;
      case PrecipitationType.SNOW:
        baseVisibility *= Math.max(0.05, 1 - precipitation.intensity * 0.8);
        break;
      case PrecipitationType.SLEET:
        baseVisibility *= Math.max(0.1, 1 - precipitation.intensity * 0.7);
        break;
      case PrecipitationType.HAIL:
        baseVisibility *= Math.max(0.05, 1 - precipitation.intensity * 0.9);
        break;
      case PrecipitationType.FREEZING_RAIN:
        baseVisibility *= Math.max(0.1, 1 - precipitation.intensity * 0.75);
        break;
    }

    return Math.max(100, baseVisibility);
  }

  public static categorizeWindSpeed(windSpeed: number): {
    beaufortScale: number;
    description: string;
    category: string;
  } {
    const mpsToKnots = 1.944;
    const windKnots = windSpeed * mpsToKnots;

    if (windKnots < 1) return { beaufortScale: 0, description: 'Calm', category: 'calm' };
    if (windKnots < 4) return { beaufortScale: 1, description: 'Light air', category: 'light' };
    if (windKnots < 7) return { beaufortScale: 2, description: 'Light breeze', category: 'light' };
    if (windKnots < 11) return { beaufortScale: 3, description: 'Gentle breeze', category: 'light' };
    if (windKnots < 16) return { beaufortScale: 4, description: 'Moderate breeze', category: 'moderate' };
    if (windKnots < 22) return { beaufortScale: 5, description: 'Fresh breeze', category: 'moderate' };
    if (windKnots < 28) return { beaufortScale: 6, description: 'Strong breeze', category: 'strong' };
    if (windKnots < 34) return { beaufortScale: 7, description: 'Near gale', category: 'strong' };
    if (windKnots < 41) return { beaufortScale: 8, description: 'Gale', category: 'gale' };
    if (windKnots < 48) return { beaufortScale: 9, description: 'Strong gale', category: 'gale' };
    if (windKnots < 56) return { beaufortScale: 10, description: 'Storm', category: 'storm' };
    if (windKnots < 64) return { beaufortScale: 11, description: 'Violent storm', category: 'storm' };
    return { beaufortScale: 12, description: 'Hurricane', category: 'hurricane' };
  }

  public static categorizeTemperature(temperature: number): {
    category: string;
    description: string;
    color: string;
  } {
    if (temperature < -20) return { category: 'extreme_cold', description: 'Extreme Cold', color: '#4B0082' };
    if (temperature < -10) return { category: 'very_cold', description: 'Very Cold', color: '#0000FF' };
    if (temperature < 0) return { category: 'cold', description: 'Cold', color: '#00BFFF' };
    if (temperature < 10) return { category: 'cool', description: 'Cool', color: '#87CEEB' };
    if (temperature < 20) return { category: 'mild', description: 'Mild', color: '#90EE90' };
    if (temperature < 30) return { category: 'warm', description: 'Warm', color: '#FFFF00' };
    if (temperature < 35) return { category: 'hot', description: 'Hot', color: '#FFA500' };
    if (temperature < 40) return { category: 'very_hot', description: 'Very Hot', color: '#FF4500' };
    return { category: 'extreme_hot', description: 'Extreme Heat', color: '#FF0000' };
  }

  public static formatTemperature(temperature: number, unit: 'C' | 'F' | 'K' = 'C'): string {
    let value = temperature;
    let symbol = '°C';

    switch (unit) {
      case 'F':
        value = (temperature * 9 / 5) + 32;
        symbol = '°F';
        break;
      case 'K':
        value = temperature + 273.15;
        symbol = 'K';
        break;
    }

    return `${value.toFixed(1)}${symbol}`;
  }

  public static formatPressure(pressure: number, unit: 'hPa' | 'mmHg' | 'inHg' = 'hPa'): string {
    let value = pressure;
    let symbol = 'hPa';

    switch (unit) {
      case 'mmHg':
        value = pressure * 0.750062;
        symbol = 'mmHg';
        break;
      case 'inHg':
        value = pressure * 0.02953;
        symbol = 'inHg';
        break;
    }

    return `${value.toFixed(1)} ${symbol}`;
  }

  public static formatWindSpeed(windSpeed: number, unit: 'mps' | 'kph' | 'mph' | 'knots' = 'mps'): string {
    let value = windSpeed;
    let symbol = 'm/s';

    switch (unit) {
      case 'kph':
        value = windSpeed * 3.6;
        symbol = 'km/h';
        break;
      case 'mph':
        value = windSpeed * 2.237;
        symbol = 'mph';
        break;
      case 'knots':
        value = windSpeed * 1.944;
        symbol = 'knots';
        break;
    }

    return `${value.toFixed(1)} ${symbol}`;
  }

  public static formatWindDirection(direction: number): string {
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(direction / 22.5) % 16;
    return directions[index];
  }

  public static formatPrecipitationType(type: PrecipitationType): string {
    const typeNames = {
      [PrecipitationType.NONE]: 'None',
      [PrecipitationType.RAIN]: 'Rain',
      [PrecipitationType.SNOW]: 'Snow',
      [PrecipitationType.SLEET]: 'Sleet',
      [PrecipitationType.HAIL]: 'Hail',
      [PrecipitationType.FREEZING_RAIN]: 'Freezing Rain',
      [PrecipitationType.DRIZZLE]: 'Drizzle'
    };
    return typeNames[type] || 'Unknown';
  }

  public static getWeatherIcon(weatherState: WeatherState): string {
    const { cloudCover, precipitation, windSpeed, visibility } = weatherState;
    const isDaytime = this.isDaytime(weatherState.timestamp, weatherState.location);

    // Precipitation icons
    if (precipitation.intensity > 0) {
      switch (precipitation.type) {
        case PrecipitationType.RAIN:
          return precipitation.intensity > 0.7 ? '⛈️' : '🌧️';
        case PrecipitationType.SNOW:
          return '❄️';
        case PrecipitationType.SLEET:
          return '🌨️';
        case PrecipitationType.HAIL:
          return '🌨️';
        case PrecipitationType.FREEZING_RAIN:
          return '🌧️';
        case PrecipitationType.DRIZZLE:
          return '🌦️';
      }
    }

    // Fog/low visibility
    if (visibility < 1000) {
      return '🌫️';
    }

    // Wind
    if (windSpeed > 15) {
      return '💨';
    }

    // Cloud conditions
    if (cloudCover < 25) {
      return isDaytime ? '☀️' : '🌙';
    } else if (cloudCover < 75) {
      return isDaytime ? '⛅' : '☁️';
    } else {
      return '☁️';
    }
  }

  public static isDaytime(timestamp: number, location: GeographicLocation): boolean {
    const date = new Date(timestamp);
    const hour = date.getUTCHours();

    // Simple calculation - would need more sophisticated solar position calculation for accuracy
    const timeZoneOffset = location.longitude / 15; // Approximate timezone
    const localHour = (hour + timeZoneOffset + 24) % 24;

    return localHour >= 6 && localHour < 18;
  }

  public static calculateSolarElevation(timestamp: number, location: GeographicLocation): number {
    const date = new Date(timestamp);
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

    // Solar declination
    const declination = 23.45 * Math.sin(this.toRadians(360 * (284 + dayOfYear) / 365));

    // Hour angle
    const timeEquation = 0; // Simplified - would need equation of time
    const solarTime = date.getUTCHours() + date.getUTCMinutes() / 60 + location.longitude / 15 + timeEquation;
    const hourAngle = 15 * (solarTime - 12);

    // Solar elevation
    const lat = this.toRadians(location.latitude);
    const dec = this.toRadians(declination);
    const ha = this.toRadians(hourAngle);

    const elevation = Math.asin(
      Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
    );

    return this.toDegrees(elevation);
  }

  public static calculateUVIndex(solarElevation: number, cloudCover: number, elevation: number): number {
    if (solarElevation <= 0) return 0;

    // Base UV calculation
    let uvIndex = 15 * Math.sin(this.toRadians(solarElevation));

    // Elevation adjustment (4% increase per 300m)
    uvIndex *= (1 + elevation / 7500);

    // Cloud cover reduction
    const cloudReduction = 1 - (cloudCover / 100) * 0.75;
    uvIndex *= cloudReduction;

    return Math.max(0, Math.min(15, uvIndex));
  }

  public static validateWeatherState(state: WeatherState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (state.temperature < -100 || state.temperature > 70) {
      errors.push('Temperature out of realistic range');
    }

    if (state.humidity < 0 || state.humidity > 100) {
      errors.push('Humidity must be between 0 and 100');
    }

    if (state.pressure < 870 || state.pressure > 1084) {
      errors.push('Pressure out of realistic range');
    }

    if (state.windSpeed < 0 || state.windSpeed > 150) {
      errors.push('Wind speed out of realistic range');
    }

    if (state.windDirection < 0 || state.windDirection >= 360) {
      errors.push('Wind direction must be between 0 and 359 degrees');
    }

    if (state.cloudCover < 0 || state.cloudCover > 100) {
      errors.push('Cloud cover must be between 0 and 100');
    }

    if (state.visibility < 0 || state.visibility > 50000) {
      errors.push('Visibility out of realistic range');
    }

    if (state.uvIndex < 0 || state.uvIndex > 15) {
      errors.push('UV index must be between 0 and 15');
    }

    if (state.precipitation.intensity < 0 || state.precipitation.intensity > 1) {
      errors.push('Precipitation intensity must be between 0 and 1');
    }

    if (state.precipitation.probability < 0 || state.precipitation.probability > 100) {
      errors.push('Precipitation probability must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public static getAlertSeverityColor(severity: AlertSeverity): string {
    const colors = {
      [AlertSeverity.ADVISORY]: '#FFD700',
      [AlertSeverity.WATCH]: '#FFA500',
      [AlertSeverity.WARNING]: '#FF4500',
      [AlertSeverity.EMERGENCY]: '#FF0000'
    };
    return colors[severity] || '#CCCCCC';
  }

  public static getAlertPriority(alert: WeatherAlert): number {
    const severityPriority = {
      [AlertSeverity.EMERGENCY]: 4,
      [AlertSeverity.WARNING]: 3,
      [AlertSeverity.WATCH]: 2,
      [AlertSeverity.ADVISORY]: 1
    };
    return severityPriority[alert.severity] || 0;
  }

  public static sortAlertsByPriority(alerts: WeatherAlert[]): WeatherAlert[] {
    return alerts.sort((a, b) => {
      const priorityDiff = this.getAlertPriority(b) - this.getAlertPriority(a);
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort by valid from time
      return a.validFrom - b.validFrom;
    });
  }

  public static calculateTrend(values: number[], timeSpan: number): {
    trend: 'rising' | 'falling' | 'stable';
    rate: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { trend: 'stable', rate: 0, confidence: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, y, i) => {
      const predicted = slope * x[i] + (sumY - slope * sumX) / n;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    const rate = slope / timeSpan; // Rate per unit time
    const trend = Math.abs(rate) < 0.001 ? 'stable' : (rate > 0 ? 'rising' : 'falling');

    return {
      trend,
      rate: Math.abs(rate),
      confidence: Math.max(0, Math.min(1, rSquared))
    };
  }

  private static toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private static toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }
}