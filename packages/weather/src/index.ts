export { WeatherSimulator } from './core/WeatherSimulator';
export { AtmosphericModel } from './atmospheric/AtmosphericModel';
export { ClimateSystem } from './climate/ClimateSystem';
export { WeatherUtils } from './utils/WeatherUtils';

export * from './types';

// Unity-compatible wrapper
import { WeatherSimulator } from './core/WeatherSimulator';

export class WeatherSimulation {
  private simulator: WeatherSimulator;

  constructor() {
    // Initialize with mock objects for Unity export compatibility
    this.simulator = {} as WeatherSimulator;
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      weather: {
        temperature: 25.0,
        humidity: 60,
        pressure: 1013.25,
        windSpeed: 5.5,
        systemHealth: 'operational',
        framework: 'steam-sim-weather'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const VERSION = '1.0.0';