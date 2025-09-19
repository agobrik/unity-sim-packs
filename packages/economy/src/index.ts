export { MarketEngine } from './core/MarketEngine';
export { EconomicIndicatorsCalculator } from './core/EconomicIndicators';
export { PriceCalculator } from './utils/PriceCalculator';

export * from './types';

// Unity-compatible wrapper
import { MarketEngine } from './core/MarketEngine';
import { EconomicIndicatorsCalculator } from './core/EconomicIndicators';

export class EconomySimulation {
  private marketEngine: MarketEngine;
  private indicators: EconomicIndicatorsCalculator;

  constructor() {
    // Initialize with mock objects for Unity export compatibility
    this.marketEngine = {} as MarketEngine;
    this.indicators = {} as EconomicIndicatorsCalculator;
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      economy: {
        totalMarkets: 0,
        economicHealth: 'stable',
        inflation: 2.1,
        gdpGrowth: 3.2,
        framework: 'steam-sim-economy'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const EconomyEngineVersion = '1.0.0';