import { PriceCalculator } from '../../src/utils/PriceCalculator';
import { Commodity, MarketParticipant, ParticipantType } from '../../src/types';

describe('PriceCalculator', () => {
  let commodity: Commodity;
  let participant: MarketParticipant;

  beforeEach(() => {
    commodity = {
      id: 'gold',
      name: 'Gold',
      category: 'precious-metals',
      basePrice: 1800,
      currentPrice: 1850,
      supply: 1000,
      demand: 1200,
      volatility: 0.15,
      lastUpdate: Date.now()
    };

    participant = {
      id: 'trader-1',
      name: 'Test Trader',
      type: ParticipantType.INDIVIDUAL,
      capital: 10000,
      inventory: new Map([['gold', 10]]),
      behavior: {
        riskTolerance: 0.6,
        buyThreshold: 1750,
        sellThreshold: 1900,
        maxTransactionSize: 5,
        preferredCommodities: ['gold']
      }
    };
  });

  describe('Dynamic Price Calculation', () => {
    test('should calculate price based on supply and demand', () => {
      const price = PriceCalculator.calculateDynamicPrice(commodity, 800, 1200, 0.1);

      expect(price).toBeGreaterThan(0);
      expect(price).toBeGreaterThan(commodity.basePrice);
    });

    test('should handle zero demand', () => {
      const price = PriceCalculator.calculateDynamicPrice(commodity, 1000, 0, 0.1);

      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(commodity.basePrice);
    });

    test('should not return negative prices', () => {
      const price = PriceCalculator.calculateDynamicPrice(
        { ...commodity, basePrice: 0.01 },
        10000,
        1,
        2.0
      );

      expect(price).toBeGreaterThanOrEqual(0.01);
    });
  });

  describe('Elasticity of Demand', () => {
    test('should calculate elasticity from price history', () => {
      const priceHistory = [
        { price: 1800, quantity: 1000 },
        { price: 1850, quantity: 950 },
        { price: 1900, quantity: 900 },
        { price: 1750, quantity: 1100 }
      ];

      const elasticity = PriceCalculator.calculateElasticityOfDemand(priceHistory);
      expect(typeof elasticity).toBe('number');
    });

    test('should return 0 for insufficient data', () => {
      const priceHistory = [{ price: 1800, quantity: 1000 }];
      const elasticity = PriceCalculator.calculateElasticityOfDemand(priceHistory);
      expect(elasticity).toBe(0);
    });

    test('should handle empty price history', () => {
      const elasticity = PriceCalculator.calculateElasticityOfDemand([]);
      expect(elasticity).toBe(0);
    });
  });

  describe('Fair Value Calculation', () => {
    test('should calculate fair value based on market conditions', () => {
      const marketConditions = {
        averagePrice: 1850,
        totalSupply: 5000,
        totalDemand: 6000,
        inflationRate: 2.5
      };

      const fairValue = PriceCalculator.calculateFairValue(commodity, marketConditions);

      expect(fairValue).toBeGreaterThan(0);
      expect(fairValue).toBeGreaterThan(commodity.basePrice * 0.1);
    });

    test('should apply inflation adjustment', () => {
      const lowInflation = {
        averagePrice: 1800,
        totalSupply: 1000,
        totalDemand: 1000,
        inflationRate: 1.0
      };

      const highInflation = {
        averagePrice: 1800,
        totalSupply: 1000,
        totalDemand: 1000,
        inflationRate: 10.0
      };

      const lowValue = PriceCalculator.calculateFairValue(commodity, lowInflation);
      const highValue = PriceCalculator.calculateFairValue(commodity, highInflation);

      expect(highValue).toBeGreaterThan(lowValue);
    });
  });

  describe('Price Target Calculation', () => {
    test('should calculate buying price target', () => {
      const target = PriceCalculator.calculatePriceTarget(commodity, participant, true);

      expect(target).toBeLessThanOrEqual(commodity.currentPrice);
      expect(target).toBeGreaterThan(0);
    });

    test('should calculate selling price target', () => {
      const target = PriceCalculator.calculatePriceTarget(commodity, participant, false);

      expect(target).toBeGreaterThanOrEqual(commodity.currentPrice);
    });

    test('should adjust for risk tolerance', () => {
      const conservativeParticipant = {
        ...participant,
        behavior: { ...participant.behavior, riskTolerance: 0.1 }
      };

      const aggressiveParticipant = {
        ...participant,
        behavior: { ...participant.behavior, riskTolerance: 0.9 }
      };

      const conservativeTarget = PriceCalculator.calculatePriceTarget(
        commodity, conservativeParticipant, false
      );
      const aggressiveTarget = PriceCalculator.calculatePriceTarget(
        commodity, aggressiveParticipant, false
      );

      expect(aggressiveTarget).toBeGreaterThan(conservativeTarget);
    });
  });

  describe('Moving Average', () => {
    test('should calculate moving average', () => {
      const prices = [100, 105, 110, 108, 112, 115, 118, 120, 125, 130];
      const movingAvg = PriceCalculator.calculateMovingAverage(prices, 5);

      expect(movingAvg.length).toBe(6);
      expect(movingAvg[0]).toBe((100 + 105 + 110 + 108 + 112) / 5);
    });

    test('should handle period larger than data', () => {
      const prices = [100, 105, 110];
      const movingAvg = PriceCalculator.calculateMovingAverage(prices, 5);

      expect(movingAvg.length).toBe(0);
    });
  });

  describe('Bollinger Bands', () => {
    test('should calculate Bollinger bands', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
      const bands = PriceCalculator.calculateBollingerBands(prices, 20, 2);

      expect(bands.upper.length).toBeGreaterThan(0);
      expect(bands.middle.length).toBe(bands.upper.length);
      expect(bands.lower.length).toBe(bands.upper.length);

      for (let i = 0; i < bands.upper.length; i++) {
        expect(bands.upper[i]).toBeGreaterThan(bands.middle[i]);
        expect(bands.middle[i]).toBeGreaterThan(bands.lower[i]);
      }
    });
  });

  describe('RSI Calculation', () => {
    test('should calculate RSI values', () => {
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 47.25,
                     47.92, 46.93, 48.83, 47.95, 46.75, 46.83, 47.31, 47.20];
      const rsi = PriceCalculator.calculateRSI(prices, 14);

      expect(rsi.length).toBeGreaterThan(0);
      rsi.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });

    test('should handle insufficient data', () => {
      const prices = [100, 105, 110];
      const rsi = PriceCalculator.calculateRSI(prices, 14);

      expect(rsi.length).toBe(0);
    });
  });

  describe('Trend Direction', () => {
    test('should identify uptrend', () => {
      const prices = [100, 102, 105, 108, 112, 115, 118, 122, 125, 128];
      const trend = PriceCalculator.identifyTrendDirection(prices, 10);

      expect(trend).toBe('uptrend');
    });

    test('should identify downtrend', () => {
      const prices = [128, 125, 122, 118, 115, 112, 108, 105, 102, 100];
      const trend = PriceCalculator.identifyTrendDirection(prices, 10);

      expect(trend).toBe('downtrend');
    });

    test('should identify sideways trend', () => {
      const prices = [100, 101, 99, 100, 102, 98, 100, 101, 99, 100];
      const trend = PriceCalculator.identifyTrendDirection(prices, 10);

      expect(trend).toBe('sideways');
    });

    test('should handle insufficient data', () => {
      const prices = [100, 105];
      const trend = PriceCalculator.identifyTrendDirection(prices, 10);

      expect(trend).toBe('sideways');
    });
  });
});