import { MarketEngine } from '../../src/core/MarketEngine';
import { EconomicIndicatorsCalculator } from '../../src/core/EconomicIndicators';
import { PriceCalculator } from '../../src/utils/PriceCalculator';
import { EconomyConfig, MarketType, ParticipantType } from '../../src/types';

describe('Economy Integration Tests', () => {
  let engine: MarketEngine;
  let config: EconomyConfig;

  beforeEach(() => {
    config = {
      baseCurrency: 'USD',
      inflationRate: 2.5,
      interestRate: 3.0,
      marketVolatility: 0.1,
      updateInterval: 100
    };
    engine = new MarketEngine(config);
  });

  afterEach(() => {
    engine.stop();
  });

  test('should simulate a complete market ecosystem', async () => {
    const market = engine.createMarket({
      id: 'commodity-market',
      name: 'Commodity Market',
      type: MarketType.COMMODITY
    });

    const commodities = [
      {
        id: 'gold',
        name: 'Gold',
        category: 'precious-metals',
        basePrice: 1800,
        currentPrice: 1800,
        supply: 1000,
        demand: 1200,
        volatility: 0.15,
        lastUpdate: Date.now()
      },
      {
        id: 'silver',
        name: 'Silver',
        category: 'precious-metals',
        basePrice: 25,
        currentPrice: 25,
        supply: 5000,
        demand: 4800,
        volatility: 0.20,
        lastUpdate: Date.now()
      },
      {
        id: 'oil',
        name: 'Crude Oil',
        category: 'energy',
        basePrice: 80,
        currentPrice: 80,
        supply: 10000,
        demand: 11000,
        volatility: 0.25,
        lastUpdate: Date.now()
      }
    ];

    commodities.forEach(commodity => {
      engine.addCommodity(market.id, commodity);
    });

    const participants = [
      {
        id: 'trader-1',
        name: 'Conservative Trader',
        type: ParticipantType.INDIVIDUAL,
        capital: 50000,
        inventory: new Map([['gold', 20], ['silver', 100]]),
        behavior: {
          riskTolerance: 0.3,
          buyThreshold: 1750,
          sellThreshold: 1900,
          maxTransactionSize: 5,
          preferredCommodities: ['gold', 'silver']
        }
      },
      {
        id: 'trader-2',
        name: 'Aggressive Trader',
        type: ParticipantType.INDIVIDUAL,
        capital: 100000,
        inventory: new Map([['oil', 500], ['gold', 10]]),
        behavior: {
          riskTolerance: 0.8,
          buyThreshold: 85,
          sellThreshold: 75,
          maxTransactionSize: 20,
          preferredCommodities: ['oil']
        }
      },
      {
        id: 'corp-1',
        name: 'Mining Corp',
        type: ParticipantType.CORPORATION,
        capital: 1000000,
        inventory: new Map([['gold', 200], ['silver', 1000], ['oil', 100]]),
        behavior: {
          riskTolerance: 0.5,
          buyThreshold: 1700,
          sellThreshold: 1950,
          maxTransactionSize: 50,
          preferredCommodities: ['gold', 'silver']
        }
      }
    ];

    participants.forEach(participant => {
      engine.addParticipant(market.id, participant);
    });

    const transactionPromises: Promise<void>[] = [];

    for (let i = 0; i < 10; i++) {
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          engine.executeTrade(
            market.id,
            'trader-1',
            'corp-1',
            'gold',
            Math.ceil(Math.random() * 3),
            1800 + (Math.random() - 0.5) * 100
          );

          engine.executeTrade(
            market.id,
            'trader-2',
            'corp-1',
            'oil',
            Math.ceil(Math.random() * 10),
            80 + (Math.random() - 0.5) * 10
          );

          resolve();
        }, i * 50);
      });
      transactionPromises.push(promise);
    }

    await Promise.all(transactionPromises);

    await new Promise(resolve => setTimeout(resolve, 200));

    const marketData = engine.getMarketData(market.id);
    expect(marketData).toBeDefined();
    expect(marketData!.commodities.size).toBe(3);
    expect(marketData!.participants.length).toBe(3);

    const transactions = engine.getTransactionHistory(market.id);
    expect(transactions.length).toBeGreaterThan(0);

    const indicators = new EconomicIndicatorsCalculator(
      new Map([[market.id, marketData!]]),
      transactions
    );
    const economicData = indicators.calculateIndicators();

    expect(economicData.gdp).toBeGreaterThan(0);
    expect(economicData.tradingVolume).toBeGreaterThan(0);
    expect(economicData.marketCap).toBeGreaterThan(0);
    expect(typeof economicData.unemployment).toBe('number');
    expect(typeof economicData.inflation).toBe('number');
    expect(typeof economicData.priceIndex).toBe('number');

    const goldPerformance = indicators.calculateCommodityPerformance('gold');
    expect(typeof goldPerformance.priceChange).toBe('number');
    expect(typeof goldPerformance.volumeChange).toBe('number');
    expect(typeof goldPerformance.volatility).toBe('number');

    const topPerformers = indicators.getTopPerformers(5);
    expect(Array.isArray(topPerformers)).toBe(true);
    expect(topPerformers.length).toBeLessThanOrEqual(5);
  });

  test('should handle supply and demand dynamics', () => {
    const market = engine.createMarket({
      id: 'test-market',
      name: 'Test Market',
      type: MarketType.COMMODITY
    });

    engine.addCommodity(market.id, {
      id: 'wheat',
      name: 'Wheat',
      category: 'agriculture',
      basePrice: 500,
      currentPrice: 500,
      supply: 1000,
      demand: 800,
      volatility: 0.1,
      lastUpdate: Date.now()
    });

    const participants = Array.from({ length: 10 }, (_, i) => ({
      id: `participant-${i}`,
      name: `Participant ${i}`,
      type: ParticipantType.INDIVIDUAL,
      capital: 10000 + Math.random() * 50000,
      inventory: new Map([['wheat', Math.floor(Math.random() * 50)]]),
      behavior: {
        riskTolerance: Math.random(),
        buyThreshold: 450 + Math.random() * 100,
        sellThreshold: 550 + Math.random() * 100,
        maxTransactionSize: Math.ceil(Math.random() * 10),
        preferredCommodities: ['wheat']
      }
    }));

    participants.forEach(participant => {
      engine.addParticipant(market.id, participant);
    });

    const supplyDemandCurve = engine.calculateSupplyDemand(market.id, 'wheat');

    expect(supplyDemandCurve).toBeDefined();
    expect(supplyDemandCurve!.supplyPoints.length).toBeGreaterThan(0);
    expect(supplyDemandCurve!.demandPoints.length).toBeGreaterThan(0);
    expect(supplyDemandCurve!.equilibriumPrice).toBeGreaterThan(0);
    expect(supplyDemandCurve!.equilibriumQuantity).toBeGreaterThanOrEqual(0);

    supplyDemandCurve!.supplyPoints.forEach(point => {
      expect(point.price).toBeGreaterThan(0);
      expect(point.quantity).toBeGreaterThanOrEqual(0);
    });

    supplyDemandCurve!.demandPoints.forEach(point => {
      expect(point.price).toBeGreaterThan(0);
      expect(point.quantity).toBeGreaterThanOrEqual(0);
    });
  });

  test('should maintain price stability with balanced supply and demand', async () => {
    const market = engine.createMarket({
      id: 'stable-market',
      name: 'Stable Market',
      type: MarketType.COMMODITY
    });

    const initialPrice = 1000;
    engine.addCommodity(market.id, {
      id: 'stable-coin',
      name: 'Stable Coin',
      category: 'currency',
      basePrice: initialPrice,
      currentPrice: initialPrice,
      supply: 10000,
      demand: 10000,
      volatility: 0.05,
      lastUpdate: Date.now()
    });

    const balancedParticipants = Array.from({ length: 20 }, (_, i) => ({
      id: `balanced-${i}`,
      name: `Balanced Trader ${i}`,
      type: ParticipantType.INDIVIDUAL,
      capital: 50000,
      inventory: new Map([['stable-coin', 50]]),
      behavior: {
        riskTolerance: 0.3,
        buyThreshold: initialPrice * 0.98,
        sellThreshold: initialPrice * 1.02,
        maxTransactionSize: 5,
        preferredCommodities: ['stable-coin']
      }
    }));

    balancedParticipants.forEach(participant => {
      engine.addParticipant(market.id, participant);
    });

    engine.start();

    await new Promise(resolve => setTimeout(resolve, 500));

    engine.stop();

    const marketData = engine.getMarketData(market.id);
    const stableCoin = marketData!.commodities.get('stable-coin');

    const priceDeviation = Math.abs(stableCoin!.currentPrice - initialPrice) / initialPrice;
    expect(priceDeviation).toBeLessThan(0.1);
  });

  test('should demonstrate price calculator integration', () => {
    const market = engine.createMarket({
      id: 'calc-market',
      name: 'Calculator Market',
      type: MarketType.COMMODITY
    });

    const commodity = {
      id: 'test-commodity',
      name: 'Test Commodity',
      category: 'test',
      basePrice: 100,
      currentPrice: 110,
      supply: 1000,
      demand: 1200,
      volatility: 0.1,
      lastUpdate: Date.now()
    };

    engine.addCommodity(market.id, commodity);

    const participant = {
      id: 'calc-trader',
      name: 'Calculator Trader',
      type: ParticipantType.INDIVIDUAL,
      capital: 10000,
      inventory: new Map([['test-commodity', 10]]),
      behavior: {
        riskTolerance: 0.6,
        buyThreshold: 95,
        sellThreshold: 115,
        maxTransactionSize: 5,
        preferredCommodities: ['test-commodity']
      }
    };

    engine.addParticipant(market.id, participant);

    const dynamicPrice = PriceCalculator.calculateDynamicPrice(
      commodity,
      commodity.supply,
      commodity.demand,
      config.marketVolatility
    );

    expect(dynamicPrice).toBeGreaterThan(0);

    const buyTarget = PriceCalculator.calculatePriceTarget(commodity, participant, true);
    const sellTarget = PriceCalculator.calculatePriceTarget(commodity, participant, false);

    expect(buyTarget).toBeLessThan(sellTarget);

    const fairValue = PriceCalculator.calculateFairValue(commodity, {
      averagePrice: 105,
      totalSupply: commodity.supply,
      totalDemand: commodity.demand,
      inflationRate: config.inflationRate
    });

    expect(fairValue).toBeGreaterThan(0);

    const priceHistory = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.2) * 5);
    const movingAverage = PriceCalculator.calculateMovingAverage(priceHistory, 10);
    const rsi = PriceCalculator.calculateRSI(priceHistory, 14);
    const trend = PriceCalculator.identifyTrendDirection(priceHistory, 10);

    expect(movingAverage.length).toBeGreaterThan(0);
    expect(rsi.length).toBeGreaterThan(0);
    expect(['uptrend', 'downtrend', 'sideways']).toContain(trend);
  });
});