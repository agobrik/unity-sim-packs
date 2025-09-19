import { WeatherUtils } from '../src/utils/WeatherUtils';
import { GeographicLocation, WeatherState, PrecipitationType, AlertSeverity, WeatherAlert } from '../src/types';

describe('WeatherUtils', () => {
  const location1: GeographicLocation = {
    latitude: 40.7128,
    longitude: -74.0060,
    elevation: 10,
    timezone: 'America/New_York'
  };

  const location2: GeographicLocation = {
    latitude: 34.0522,
    longitude: -118.2437,
    elevation: 71,
    timezone: 'America/Los_Angeles'
  };

  const sampleWeatherState: WeatherState = {
    temperature: 20,
    humidity: 60,
    pressure: 1013,
    windSpeed: 10,
    windDirection: 180,
    cloudCover: 50,
    precipitation: {
      type: PrecipitationType.NONE,
      intensity: 0,
      accumulation: 0,
      probability: 20
    },
    visibility: 10000,
    dewPoint: 12,
    uvIndex: 5,
    timestamp: Date.now(),
    location: location1
  };

  describe('Distance Calculations', () => {
    it('should calculate distance between two locations', () => {
      const distance = WeatherUtils.calculateDistance(location1, location2);

      // NYC to LA is approximately 3944 km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should return zero for same location', () => {
      const distance = WeatherUtils.calculateDistance(location1, location1);
      expect(distance).toBe(0);
    });

    it('should calculate bearing between locations', () => {
      const bearing = WeatherUtils.calculateBearing(location1, location2);

      // NYC to LA should be roughly southwest
      expect(bearing).toBeGreaterThan(240);
      expect(bearing).toBeLessThan(280);
    });
  });

  describe('Weather State Interpolation', () => {
    const state1: WeatherState = {
      ...sampleWeatherState,
      temperature: 10,
      humidity: 40
    };

    const state2: WeatherState = {
      ...sampleWeatherState,
      temperature: 30,
      humidity: 80
    };

    it('should interpolate weather states correctly', () => {
      const interpolated = WeatherUtils.interpolateWeatherStates(state1, state2, 0.5);

      expect(interpolated.temperature).toBe(20);
      expect(interpolated.humidity).toBe(60);
    });

    it('should handle factor = 0', () => {
      const interpolated = WeatherUtils.interpolateWeatherStates(state1, state2, 0);

      expect(interpolated.temperature).toBe(state1.temperature);
      expect(interpolated.humidity).toBe(state1.humidity);
    });

    it('should handle factor = 1', () => {
      const interpolated = WeatherUtils.interpolateWeatherStates(state1, state2, 1);

      expect(interpolated.temperature).toBe(state2.temperature);
      expect(interpolated.humidity).toBe(state2.humidity);
    });

    it('should clamp factor to [0, 1]', () => {
      const interpolated1 = WeatherUtils.interpolateWeatherStates(state1, state2, -0.5);
      const interpolated2 = WeatherUtils.interpolateWeatherStates(state1, state2, 1.5);

      expect(interpolated1.temperature).toBe(state1.temperature);
      expect(interpolated2.temperature).toBe(state2.temperature);
    });

    it('should interpolate wind direction correctly across 0/360 boundary', () => {
      const stateA = { ...state1, windDirection: 350 };
      const stateB = { ...state2, windDirection: 10 };

      const interpolated = WeatherUtils.interpolateWeatherStates(stateA, stateB, 0.5);

      // Should be 0 degrees (or 360), not 180
      expect(interpolated.windDirection).toBeLessThan(5);
    });
  });

  describe('Atmospheric Calculations', () => {
    it('should calculate dew point correctly', () => {
      const dewPoint = WeatherUtils.calculateDewPoint(20, 60);

      expect(dewPoint).toBeCloseTo(12, 1);
    });

    it('should calculate humidity from dew point', () => {
      const humidity = WeatherUtils.calculateHumidityFromDewPoint(20, 12);

      expect(humidity).toBeCloseTo(60, 1);
    });

    it('should calculate heat index for hot conditions', () => {
      const heatIndex = WeatherUtils.calculateHeatIndex(35, 70);

      expect(heatIndex).toBeGreaterThan(35);
      expect(heatIndex).toBeLessThan(60);
    });

    it('should return temperature for cool conditions', () => {
      const heatIndex = WeatherUtils.calculateHeatIndex(20, 70);

      expect(heatIndex).toBe(20);
    });

    it('should calculate wind chill for cold conditions', () => {
      const windChill = WeatherUtils.calculateWindChill(-10, 10);

      expect(windChill).toBeLessThan(-10);
    });

    it('should return temperature for non-wind chill conditions', () => {
      const windChill = WeatherUtils.calculateWindChill(15, 2);

      expect(windChill).toBe(15);
    });

    it('should calculate feels like temperature', () => {
      const feelsLike1 = WeatherUtils.calculateFeelsLike(35, 70, 5); // Hot
      const feelsLike2 = WeatherUtils.calculateFeelsLike(-10, 40, 10); // Cold
      const feelsLike3 = WeatherUtils.calculateFeelsLike(20, 50, 5); // Moderate

      expect(feelsLike1).toBeGreaterThan(35);
      expect(feelsLike2).toBeLessThan(-10);
      expect(feelsLike3).toBe(20);
    });

    it('should calculate cloud base height', () => {
      const cloudBase = WeatherUtils.calculateCloudBase(20, 15);

      expect(cloudBase).toBe(625); // (20-15) * 125
    });
  });

  describe('Visibility Calculations', () => {
    it('should calculate visibility for different precipitation types', () => {
      const clearVis = WeatherUtils.calculateVisibilityFromPrecipitation({
        type: PrecipitationType.NONE,
        intensity: 0,
        accumulation: 0,
        probability: 0
      });

      const rainVis = WeatherUtils.calculateVisibilityFromPrecipitation({
        type: PrecipitationType.RAIN,
        intensity: 0.5,
        accumulation: 0,
        probability: 80
      });

      const snowVis = WeatherUtils.calculateVisibilityFromPrecipitation({
        type: PrecipitationType.SNOW,
        intensity: 0.5,
        accumulation: 0,
        probability: 80
      });

      expect(clearVis).toBe(15000);
      expect(rainVis).toBeLessThan(clearVis);
      expect(snowVis).toBeLessThan(rainVis);
    });
  });

  describe('Wind Categorization', () => {
    it('should categorize wind speeds correctly', () => {
      const calm = WeatherUtils.categorizeWindSpeed(0);
      const light = WeatherUtils.categorizeWindSpeed(2);
      const moderate = WeatherUtils.categorizeWindSpeed(8);
      const strong = WeatherUtils.categorizeWindSpeed(15);
      const gale = WeatherUtils.categorizeWindSpeed(20);
      const storm = WeatherUtils.categorizeWindSpeed(25);
      const hurricane = WeatherUtils.categorizeWindSpeed(35);

      expect(calm.beaufortScale).toBe(0);
      expect(calm.description).toBe('Calm');

      expect(light.beaufortScale).toBeLessThan(4);
      expect(light.category).toBe('light');

      expect(moderate.beaufortScale).toBeGreaterThanOrEqual(4);
      expect(moderate.beaufortScale).toBeLessThan(7);
      expect(moderate.category).toBe('moderate');

      expect(strong.beaufortScale).toBeGreaterThanOrEqual(6);
      expect(strong.category).toBe('strong');

      expect(gale.category).toBe('gale');
      expect(storm.category).toBe('storm');
      expect(hurricane.category).toBe('hurricane');
    });
  });

  describe('Temperature Categorization', () => {
    it('should categorize temperatures correctly', () => {
      const extremeCold = WeatherUtils.categorizeTemperature(-25);
      const cold = WeatherUtils.categorizeTemperature(-5);
      const mild = WeatherUtils.categorizeTemperature(15);
      const hot = WeatherUtils.categorizeTemperature(32);
      const extremeHot = WeatherUtils.categorizeTemperature(45);

      expect(extremeCold.category).toBe('extreme_cold');
      expect(cold.category).toBe('cold');
      expect(mild.category).toBe('mild');
      expect(hot.category).toBe('hot');
      expect(extremeHot.category).toBe('extreme_hot');

      expect(extremeCold.color).toBe('#4B0082');
      expect(extremeHot.color).toBe('#FF0000');
    });
  });

  describe('Formatting Functions', () => {
    it('should format temperature in different units', () => {
      const celsius = WeatherUtils.formatTemperature(20, 'C');
      const fahrenheit = WeatherUtils.formatTemperature(20, 'F');
      const kelvin = WeatherUtils.formatTemperature(20, 'K');

      expect(celsius).toBe('20.0°C');
      expect(fahrenheit).toBe('68.0°F');
      expect(kelvin).toBe('293.2K');
    });

    it('should format pressure in different units', () => {
      const hPa = WeatherUtils.formatPressure(1013, 'hPa');
      const mmHg = WeatherUtils.formatPressure(1013, 'mmHg');
      const inHg = WeatherUtils.formatPressure(1013, 'inHg');

      expect(hPa).toBe('1013.0 hPa');
      expect(mmHg).toContain('mmHg');
      expect(inHg).toContain('inHg');
    });

    it('should format wind speed in different units', () => {
      const mps = WeatherUtils.formatWindSpeed(10, 'mps');
      const kph = WeatherUtils.formatWindSpeed(10, 'kph');
      const mph = WeatherUtils.formatWindSpeed(10, 'mph');
      const knots = WeatherUtils.formatWindSpeed(10, 'knots');

      expect(mps).toBe('10.0 m/s');
      expect(kph).toBe('36.0 km/h');
      expect(mph).toContain('mph');
      expect(knots).toContain('knots');
    });

    it('should format wind direction correctly', () => {
      expect(WeatherUtils.formatWindDirection(0)).toBe('N');
      expect(WeatherUtils.formatWindDirection(45)).toBe('NE');
      expect(WeatherUtils.formatWindDirection(90)).toBe('E');
      expect(WeatherUtils.formatWindDirection(135)).toBe('SE');
      expect(WeatherUtils.formatWindDirection(180)).toBe('S');
      expect(WeatherUtils.formatWindDirection(225)).toBe('SW');
      expect(WeatherUtils.formatWindDirection(270)).toBe('W');
      expect(WeatherUtils.formatWindDirection(315)).toBe('NW');
      expect(WeatherUtils.formatWindDirection(360)).toBe('N');
    });

    it('should format precipitation types', () => {
      expect(WeatherUtils.formatPrecipitationType(PrecipitationType.NONE)).toBe('None');
      expect(WeatherUtils.formatPrecipitationType(PrecipitationType.RAIN)).toBe('Rain');
      expect(WeatherUtils.formatPrecipitationType(PrecipitationType.SNOW)).toBe('Snow');
      expect(WeatherUtils.formatPrecipitationType(PrecipitationType.HAIL)).toBe('Hail');
    });
  });

  describe('Solar Calculations', () => {
    it('should determine day/night correctly', () => {
      const noonTime = new Date('2023-06-21T12:00:00Z').getTime();
      const midnightTime = new Date('2023-06-21T00:00:00Z').getTime();

      const isDayAtNoon = WeatherUtils.isDaytime(noonTime, location1);
      const isDayAtMidnight = WeatherUtils.isDaytime(midnightTime, location1);

      expect(isDayAtNoon).toBe(true);
      expect(isDayAtMidnight).toBe(false);
    });

    it('should calculate solar elevation', () => {
      const summerSolstice = new Date('2023-06-21T12:00:00Z').getTime();
      const elevation = WeatherUtils.calculateSolarElevation(summerSolstice, location1);

      expect(elevation).toBeGreaterThan(0);
      expect(elevation).toBeLessThan(90);
    });

    it('should calculate UV index', () => {
      const uvIndex1 = WeatherUtils.calculateUVIndex(60, 0, 0); // High sun, clear sky, sea level
      const uvIndex2 = WeatherUtils.calculateUVIndex(30, 80, 0); // Lower sun, cloudy
      const uvIndex3 = WeatherUtils.calculateUVIndex(-10, 0, 0); // Below horizon

      expect(uvIndex1).toBeGreaterThan(0);
      expect(uvIndex2).toBeLessThan(uvIndex1);
      expect(uvIndex3).toBe(0);
    });
  });

  describe('Weather Icons', () => {
    it('should return appropriate icons for weather conditions', () => {
      const clearDay = WeatherUtils.getWeatherIcon({
        ...sampleWeatherState,
        cloudCover: 10,
        precipitation: { ...sampleWeatherState.precipitation, intensity: 0 }
      });

      const rainyWeather = WeatherUtils.getWeatherIcon({
        ...sampleWeatherState,
        precipitation: { ...sampleWeatherState.precipitation, type: PrecipitationType.RAIN, intensity: 0.5 }
      });

      const snowyWeather = WeatherUtils.getWeatherIcon({
        ...sampleWeatherState,
        precipitation: { ...sampleWeatherState.precipitation, type: PrecipitationType.SNOW, intensity: 0.5 }
      });

      expect(typeof clearDay).toBe('string');
      expect(typeof rainyWeather).toBe('string');
      expect(typeof snowyWeather).toBe('string');
      expect(clearDay).not.toBe(rainyWeather);
      expect(rainyWeather).not.toBe(snowyWeather);
    });
  });

  describe('Validation', () => {
    it('should validate correct weather state', () => {
      const validation = WeatherUtils.validateWeatherState(sampleWeatherState);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid temperature', () => {
      const invalidState = { ...sampleWeatherState, temperature: -150 };
      const validation = WeatherUtils.validateWeatherState(invalidState);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Temperature out of realistic range');
    });

    it('should detect invalid humidity', () => {
      const invalidState = { ...sampleWeatherState, humidity: 150 };
      const validation = WeatherUtils.validateWeatherState(invalidState);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Humidity must be between 0 and 100');
    });

    it('should detect invalid wind direction', () => {
      const invalidState = { ...sampleWeatherState, windDirection: 400 };
      const validation = WeatherUtils.validateWeatherState(invalidState);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Wind direction must be between 0 and 359 degrees');
    });
  });

  describe('Alert Utilities', () => {
    const sampleAlert: WeatherAlert = {
      id: 'test-alert',
      type: 'temperature',
      severity: AlertSeverity.WARNING,
      title: 'Test Alert',
      description: 'Test description',
      area: {
        type: 'circle',
        coordinates: [[40.7128, -74.0060]],
        radius: 10000
      },
      validFrom: Date.now(),
      validUntil: Date.now() + 3600000,
      conditions: [],
      recommendations: []
    };

    it('should return correct colors for alert severities', () => {
      expect(WeatherUtils.getAlertSeverityColor(AlertSeverity.ADVISORY)).toBe('#FFD700');
      expect(WeatherUtils.getAlertSeverityColor(AlertSeverity.WATCH)).toBe('#FFA500');
      expect(WeatherUtils.getAlertSeverityColor(AlertSeverity.WARNING)).toBe('#FF4500');
      expect(WeatherUtils.getAlertSeverityColor(AlertSeverity.EMERGENCY)).toBe('#FF0000');
    });

    it('should calculate alert priorities correctly', () => {
      const advisory = { ...sampleAlert, severity: AlertSeverity.ADVISORY };
      const warning = { ...sampleAlert, severity: AlertSeverity.WARNING };
      const emergency = { ...sampleAlert, severity: AlertSeverity.EMERGENCY };

      expect(WeatherUtils.getAlertPriority(emergency)).toBeGreaterThan(WeatherUtils.getAlertPriority(warning));
      expect(WeatherUtils.getAlertPriority(warning)).toBeGreaterThan(WeatherUtils.getAlertPriority(advisory));
    });

    it('should sort alerts by priority', () => {
      const alerts = [
        { ...sampleAlert, id: 'advisory', severity: AlertSeverity.ADVISORY },
        { ...sampleAlert, id: 'emergency', severity: AlertSeverity.EMERGENCY },
        { ...sampleAlert, id: 'warning', severity: AlertSeverity.WARNING }
      ];

      const sorted = WeatherUtils.sortAlertsByPriority(alerts);

      expect(sorted[0].severity).toBe(AlertSeverity.EMERGENCY);
      expect(sorted[1].severity).toBe(AlertSeverity.WARNING);
      expect(sorted[2].severity).toBe(AlertSeverity.ADVISORY);
    });
  });

  describe('Trend Calculation', () => {
    it('should calculate rising trend', () => {
      const values = [10, 12, 14, 16, 18];
      const trend = WeatherUtils.calculateTrend(values, 5);

      expect(trend.trend).toBe('rising');
      expect(trend.rate).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate falling trend', () => {
      const values = [18, 16, 14, 12, 10];
      const trend = WeatherUtils.calculateTrend(values, 5);

      expect(trend.trend).toBe('falling');
      expect(trend.rate).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate stable trend', () => {
      const values = [15, 15.1, 14.9, 15.2, 14.8];
      const trend = WeatherUtils.calculateTrend(values, 5);

      expect(trend.trend).toBe('stable');
      expect(trend.rate).toBeLessThan(0.1);
    });

    it('should handle insufficient data', () => {
      const values = [10];
      const trend = WeatherUtils.calculateTrend(values, 1);

      expect(trend.trend).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.confidence).toBe(0);
    });
  });
});