import { WeatherSimulator, WeatherSimulatorConfig, SimulationBounds } from '../src/core/WeatherSimulator';
import { GeographicLocation, WeatherSystem, ClimateZone, PrecipitationType, WeatherSystemType } from '../src/types';

describe('WeatherSimulator', () => {
  let simulator: WeatherSimulator;
  let config: WeatherSimulatorConfig;
  let bounds: SimulationBounds;

  beforeEach(() => {
    config = {
      updateInterval: 1000,
      forecastHorizon: 24,
      atmosphericLayers: 5,
      enableWeatherSystems: true,
      enableClimateEffects: true,
      randomSeed: 12345
    };

    bounds = {
      minLatitude: -90,
      maxLatitude: 90,
      minLongitude: -180,
      maxLongitude: 180,
      minElevation: -500,
      maxElevation: 9000
    };

    simulator = new WeatherSimulator(config, bounds);
  });

  afterEach(() => {
    simulator.stop();
  });

  describe('Constructor', () => {
    it('should create simulator with default config', () => {
      const defaultSimulator = new WeatherSimulator({
        updateInterval: 1000,
        forecastHorizon: 24,
        atmosphericLayers: 5,
        enableWeatherSystems: true,
        enableClimateEffects: true
      }, bounds);

      expect(defaultSimulator).toBeDefined();
      expect(defaultSimulator.isSimulationRunning()).toBe(false);
    });

    it('should use provided random seed', () => {
      const sim1 = new WeatherSimulator({ ...config, randomSeed: 123 }, bounds);
      const sim2 = new WeatherSimulator({ ...config, randomSeed: 123 }, bounds);

      const location: GeographicLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 10,
        timezone: 'America/New_York'
      };

      sim1.addLocation('test1', location);
      sim2.addLocation('test2', location);

      const state1 = sim1.getWeatherState('test1');
      const state2 = sim2.getWeatherState('test2');

      expect(state1?.temperature).toEqual(state2?.temperature);
      expect(state1?.humidity).toEqual(state2?.humidity);
    });
  });

  describe('Simulation Control', () => {
    it('should start and stop simulation', (done) => {
      let startEventFired = false;
      let stopEventFired = false;

      simulator.on('simulationStarted', () => {
        startEventFired = true;
        expect(simulator.isSimulationRunning()).toBe(true);
        simulator.stop();
      });

      simulator.on('simulationStopped', () => {
        stopEventFired = true;
        expect(simulator.isSimulationRunning()).toBe(false);
        expect(startEventFired).toBe(true);
        expect(stopEventFired).toBe(true);
        done();
      });

      simulator.start();
    });

    it('should pause and resume simulation', (done) => {
      let pauseEventFired = false;
      let resumeEventFired = false;

      simulator.on('simulationStarted', () => {
        simulator.pause();
      });

      simulator.on('simulationPaused', () => {
        pauseEventFired = true;
        simulator.resume();
      });

      simulator.on('simulationResumed', () => {
        resumeEventFired = true;
        expect(pauseEventFired).toBe(true);
        expect(resumeEventFired).toBe(true);
        simulator.stop();
        done();
      });

      simulator.start();
    });

    it('should handle time changes', (done) => {
      const newTime = Date.now() + 86400000; // 1 day from now

      simulator.on('timeChanged', ({ timestamp }) => {
        expect(timestamp).toBe(newTime);
        expect(simulator.getSimulationTime()).toBe(newTime);
        done();
      });

      simulator.setTime(newTime);
    });
  });

  describe('Location Management', () => {
    const testLocation: GeographicLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      elevation: 10,
      timezone: 'America/New_York'
    };

    it('should add and remove locations', (done) => {
      let addEventFired = false;
      let removeEventFired = false;

      simulator.on('locationAdded', ({ locationId, location, initialState }) => {
        addEventFired = true;
        expect(locationId).toBe('nyc');
        expect(location).toEqual(testLocation);
        expect(initialState).toBeDefined();
        expect(initialState.location).toEqual(testLocation);

        simulator.removeLocation('nyc');
      });

      simulator.on('locationRemoved', ({ locationId }) => {
        removeEventFired = true;
        expect(locationId).toBe('nyc');
        expect(simulator.getWeatherState('nyc')).toBeUndefined();
        expect(addEventFired).toBe(true);
        expect(removeEventFired).toBe(true);
        done();
      });

      simulator.addLocation('nyc', testLocation);
    });

    it('should generate realistic initial weather state', () => {
      simulator.addLocation('test', testLocation);
      const state = simulator.getWeatherState('test');

      expect(state).toBeDefined();
      expect(state!.temperature).toBeGreaterThan(-50);
      expect(state!.temperature).toBeLessThan(50);
      expect(state!.humidity).toBeGreaterThanOrEqual(0);
      expect(state!.humidity).toBeLessThanOrEqual(100);
      expect(state!.pressure).toBeGreaterThan(900);
      expect(state!.pressure).toBeLessThan(1100);
      expect(state!.windSpeed).toBeGreaterThanOrEqual(0);
      expect(state!.windDirection).toBeGreaterThanOrEqual(0);
      expect(state!.windDirection).toBeLessThan(360);
    });

    it('should generate atmospheric layers when configured', () => {
      simulator.addLocation('test', testLocation);
      const layers = simulator.getAtmosphericLayers('test');

      expect(layers).toBeDefined();
      expect(layers!.length).toBe(config.atmosphericLayers);

      // Check layer ordering
      for (let i = 1; i < layers!.length; i++) {
        expect(layers![i].altitude).toBeGreaterThan(layers![i - 1].altitude);
      }
    });

    it('should get all weather states', () => {
      const location1: GeographicLocation = { ...testLocation, latitude: 40 };
      const location2: GeographicLocation = { ...testLocation, latitude: 41 };

      simulator.addLocation('loc1', location1);
      simulator.addLocation('loc2', location2);

      const allStates = simulator.getAllWeatherStates();
      expect(allStates.size).toBe(2);
      expect(allStates.has('loc1')).toBe(true);
      expect(allStates.has('loc2')).toBe(true);
    });
  });

  describe('Weather Systems', () => {
    const testSystem: WeatherSystem = {
      id: 'storm1',
      type: WeatherSystemType.THUNDERSTORM,
      intensity: 75,
      center: {
        latitude: 40.7128,
        longitude: -74.0060,
        elevation: 0,
        timezone: 'UTC'
      },
      radius: 50000,
      speed: 15,
      direction: 90,
      pressure: 995,
      lifecycle: {
        stage: 'developing',
        age: 2,
        maxIntensity: 90,
        decayRate: 5,
        expectedLifetime: 12
      },
      effects: {
        temperatureChange: -5,
        humidityChange: 20,
        pressureChange: -15,
        windSpeedChange: 25,
        precipitationChange: 0.8,
        cloudCoverChange: 40
      }
    };

    it('should add and remove weather systems', (done) => {
      let addEventFired = false;
      let removeEventFired = false;

      simulator.on('weatherSystemAdded', (system) => {
        addEventFired = true;
        expect(system).toEqual(testSystem);
        simulator.removeWeatherSystem('storm1');
      });

      simulator.on('weatherSystemRemoved', (system) => {
        removeEventFired = true;
        expect(system).toEqual(testSystem);
        expect(addEventFired).toBe(true);
        expect(removeEventFired).toBe(true);
        done();
      });

      simulator.addWeatherSystem(testSystem);
    });

    it('should get all weather systems', () => {
      simulator.addWeatherSystem(testSystem);
      const systems = simulator.getWeatherSystems();

      expect(systems).toHaveLength(1);
      expect(systems[0]).toEqual(testSystem);
    });
  });

  describe('Climate Zones', () => {
    const testZone: ClimateZone = {
      id: 'temperate1',
      name: 'Temperate Maritime',
      type: 'temperate',
      characteristics: {
        averageTemperature: {
          january: 2, february: 3, march: 6, april: 9,
          may: 13, june: 16, july: 18, august: 18,
          september: 15, october: 11, november: 6, december: 3
        },
        temperatureRange: {
          january: 8, february: 8, march: 9, april: 10,
          may: 11, june: 12, july: 12, august: 12,
          september: 11, october: 10, november: 9, december: 8
        },
        humidity: {
          january: 85, february: 82, march: 78, april: 75,
          may: 72, june: 70, july: 72, august: 75,
          september: 78, october: 82, november: 85, december: 87
        },
        precipitation: {
          january: 150, february: 120, march: 110, april: 80,
          may: 70, june: 60, july: 65, august: 80,
          september: 100, october: 130, november: 140, december: 160
        },
        windPatterns: [],
        stormFrequency: 12
      },
      seasonalPatterns: [],
      extremes: {
        maxTemperature: 35,
        minTemperature: -15,
        maxWindSpeed: 50,
        maxPrecipitation: 300,
        droughtProbability: 0.1,
        floodProbability: 0.2
      }
    };

    it('should add climate zone', (done) => {
      simulator.on('climateZoneAdded', (zone) => {
        expect(zone).toEqual(testZone);
        done();
      });

      simulator.addClimateZone(testZone);
    });
  });

  describe('Forecasting', () => {
    const testLocation: GeographicLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      elevation: 10,
      timezone: 'America/New_York'
    };

    beforeEach(() => {
      simulator.addLocation('test', testLocation);
    });

    it('should generate forecast for existing location', () => {
      const forecast = simulator.generateForecast('test', 12);

      expect(forecast).toBeDefined();
      expect(forecast!.conditions).toHaveLength(12);
      expect(forecast!.location).toEqual(testLocation);
      expect(forecast!.confidence).toBeGreaterThan(0);
      expect(forecast!.confidence).toBeLessThanOrEqual(100);

      // Check forecast conditions are valid
      forecast!.conditions.forEach((condition, index) => {
        expect(condition.time).toBeGreaterThan(forecast!.timestamp + index * 3600000 - 1);
        expect(condition.temperature.current).toBeGreaterThan(-100);
        expect(condition.temperature.current).toBeLessThan(100);
        expect(condition.humidity).toBeGreaterThanOrEqual(0);
        expect(condition.humidity).toBeLessThanOrEqual(100);
      });
    });

    it('should return null for non-existent location', () => {
      const forecast = simulator.generateForecast('nonexistent', 12);
      expect(forecast).toBeNull();
    });

    it('should have decreasing confidence with longer forecast horizon', () => {
      const shortForecast = simulator.generateForecast('test', 6);
      const longForecast = simulator.generateForecast('test', 48);

      expect(shortForecast!.confidence).toBeGreaterThan(longForecast!.confidence);
    });
  });

  describe('Weather Updates', () => {
    const testLocation: GeographicLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      elevation: 10,
      timezone: 'America/New_York'
    };

    it('should emit weather state updates during simulation', (done) => {
      let updateCount = 0;

      simulator.on('weatherStateUpdated', ({ locationId, state }) => {
        updateCount++;
        expect(locationId).toBe('test');
        expect(state).toBeDefined();
        expect(state.timestamp).toBeGreaterThan(0);

        if (updateCount >= 2) {
          simulator.stop();
          done();
        }
      });

      simulator.addLocation('test', testLocation);
      simulator.start();
    });

    it('should generate weather events during state changes', (done) => {
      simulator.on('weatherEvent', (event) => {
        expect(event).toBeDefined();
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.location).toEqual(testLocation);
        simulator.stop();
        done();
      });

      simulator.addLocation('test', testLocation);
      simulator.start();
    });
  });

  describe('Alerts', () => {
    const testLocation: GeographicLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      elevation: 10,
      timezone: 'America/New_York'
    };

    it('should generate alerts for extreme conditions', (done) => {
      simulator.on('weatherAlertIssued', (alert) => {
        expect(alert).toBeDefined();
        expect(alert.id).toBeDefined();
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.validFrom).toBeLessThanOrEqual(alert.validUntil);
        simulator.stop();
        done();
      });

      // Force extreme conditions by manipulating the weather state
      simulator.addLocation('test', testLocation);
      const state = simulator.getWeatherState('test')!;

      // Manually set extreme temperature to trigger alert
      state.temperature = 45; // Extreme heat

      simulator.start();
    });

    it('should get active alerts', () => {
      simulator.addLocation('test', testLocation);
      simulator.start();

      // Let simulation run briefly to potentially generate alerts
      setTimeout(() => {
        const alerts = simulator.getActiveAlerts();
        expect(Array.isArray(alerts)).toBe(true);
        simulator.stop();
      }, 100);
    });

    it('should clear expired alerts', () => {
      simulator.addLocation('test', testLocation);

      // Set time to future to expire any alerts
      simulator.setTime(Date.now() + 86400000 * 7); // 7 days from now
      simulator.clearExpiredAlerts();

      const alerts = simulator.getActiveAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should return config and bounds', () => {
      const returnedConfig = simulator.getConfig();
      const returnedBounds = simulator.getBounds();

      expect(returnedConfig).toEqual(config);
      expect(returnedBounds).toEqual(bounds);
    });

    it('should track simulation time', () => {
      const initialTime = simulator.getSimulationTime();
      expect(typeof initialTime).toBe('number');
      expect(initialTime).toBeGreaterThan(0);

      const newTime = Date.now() + 3600000;
      simulator.setTime(newTime);
      expect(simulator.getSimulationTime()).toBe(newTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple start calls gracefully', () => {
      simulator.start();
      const isRunning1 = simulator.isSimulationRunning();

      simulator.start(); // Second start call
      const isRunning2 = simulator.isSimulationRunning();

      expect(isRunning1).toBe(true);
      expect(isRunning2).toBe(true);
    });

    it('should handle stop when not running', () => {
      expect(simulator.isSimulationRunning()).toBe(false);
      simulator.stop(); // Should not throw
      expect(simulator.isSimulationRunning()).toBe(false);
    });

    it('should handle pause when not running', () => {
      simulator.pause(); // Should not throw
      expect(simulator.isSimulationRunning()).toBe(false);
    });

    it('should handle resume when not started', () => {
      simulator.resume(); // Should not throw
      expect(simulator.isSimulationRunning()).toBe(false);
    });
  });
});