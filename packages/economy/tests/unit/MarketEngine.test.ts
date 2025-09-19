import { MarketEngine } from '../../src/core/MarketEngine';
import { EconomyConfig, MarketType, ParticipantType } from '../../src/types';

describe('MarketEngine', () => {
  let engine: MarketEngine;
  let config: EconomyConfig;

  beforeEach(() => {
    config = {
      baseCurrency: 'USD',
      inflationRate: 2.5,
      interestRate: 3.0,
      marketVolatility: 0.1,
      updateInterval: 1000
    };
    engine = new MarketEngine(config);
  });

  afterEach(() => {
    engine.stop();
  });

  describe('Market Creation', () => {
    test('should create a new market', () => {
      const market = engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });

      expect(market.id).toBe('test-market');
      expect(market.name).toBe('Test Market');
      expect(market.type).toBe(MarketType.COMMODITY);
      expect(market.commodities.size).toBe(0);
      expect(market.participants.length).toBe(0);
    });

    test('should emit market_created event', (done) => {
      engine.on('market_created', (market) => {
        expect(market.id).toBe('test-market');
        done();
      });

      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });
    });
  });

  describe('Commodity Management', () => {
    beforeEach(() => {
      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });
    });

    test('should add commodity to market', () => {
      const commodity = {
        id: 'gold',
        name: 'Gold',
        category: 'precious-metals',
        basePrice: 1800,
        currentPrice: 1800,
        supply: 1000,
        demand: 1200,
        volatility: 0.15,
        lastUpdate: Date.now()
      };

      const result = engine.addCommodity('test-market', commodity);
      expect(result).toBe(true);

      const market = engine.getMarketData('test-market');
      expect(market?.commodities.get('gold')).toEqual(commodity);
    });

    test('should fail to add commodity to non-existent market', () => {
      const commodity = {
        id: 'gold',
        name: 'Gold',
        category: 'precious-metals',
        basePrice: 1800,
        currentPrice: 1800,
        supply: 1000,
        demand: 1200,
        volatility: 0.15,
        lastUpdate: Date.now()
      };

      const result = engine.addCommodity('non-existent', commodity);
      expect(result).toBe(false);
    });
  });

  describe('Participant Management', () => {
    beforeEach(() => {
      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });
    });

    test('should add participant to market', () => {
      const participant = {
        id: 'trader-1',
        name: 'Test Trader',
        type: ParticipantType.INDIVIDUAL,
        capital: 10000,
        inventory: new Map([['gold', 10]]),
        behavior: {
          riskTolerance: 0.5,
          buyThreshold: 1750,
          sellThreshold: 1850,
          maxTransactionSize: 5,
          preferredCommodities: ['gold']
        }
      };

      const result = engine.addParticipant('test-market', participant);
      expect(result).toBe(true);

      const market = engine.getMarketData('test-market');
      expect(market?.participants).toContainEqual(participant);
    });
  });

  describe('Trade Execution', () => {
    beforeEach(() => {
      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });

      engine.addCommodity('test-market', {
        id: 'gold',
        name: 'Gold',
        category: 'precious-metals',
        basePrice: 1800,
        currentPrice: 1800,
        supply: 1000,
        demand: 1200,
        volatility: 0.15,
        lastUpdate: Date.now()
      });

      engine.addParticipant('test-market', {
        id: 'buyer',
        name: 'Buyer',
        type: ParticipantType.INDIVIDUAL,
        capital: 10000,
        inventory: new Map(),
        behavior: {
          riskTolerance: 0.5,
          buyThreshold: 1750,
          sellThreshold: 1850,
          maxTransactionSize: 5,
          preferredCommodities: ['gold']
        }
      });

      engine.addParticipant('test-market', {
        id: 'seller',
        name: 'Seller',
        type: ParticipantType.INDIVIDUAL,
        capital: 5000,
        inventory: new Map([['gold', 10]]),
        behavior: {
          riskTolerance: 0.3,
          buyThreshold: 1750,
          sellThreshold: 1850,
          maxTransactionSize: 5,
          preferredCommodities: ['gold']
        }
      });
    });

    test('should execute a valid trade', () => {
      const transaction = engine.executeTrade(
        'test-market',
        'buyer',
        'seller',
        'gold',
        2,
        1800
      );

      expect(transaction).not.toBeNull();
      expect(transaction?.quantity).toBe(2);
      expect(transaction?.price).toBe(1800);

      const market = engine.getMarketData('test-market');
      const buyer = market?.participants.find(p => p.id === 'buyer');
      const seller = market?.participants.find(p => p.id === 'seller');

      expect(buyer?.capital).toBe(10000 - (2 * 1800));
      expect(buyer?.inventory.get('gold')).toBe(2);
      expect(seller?.capital).toBe(5000 + (2 * 1800));
      expect(seller?.inventory.get('gold')).toBe(8);
    });

    test('should fail trade with insufficient capital', () => {
      const transaction = engine.executeTrade(
        'test-market',
        'buyer',
        'seller',
        'gold',
        10,
        1800
      );

      expect(transaction).toBeNull();
    });

    test('should fail trade with insufficient inventory', () => {
      const transaction = engine.executeTrade(
        'test-market',
        'buyer',
        'seller',
        'gold',
        15,
        1800
      );

      expect(transaction).toBeNull();
    });
  });

  describe('Supply and Demand Calculation', () => {
    beforeEach(() => {
      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });

      engine.addCommodity('test-market', {
        id: 'gold',
        name: 'Gold',
        category: 'precious-metals',
        basePrice: 1800,
        currentPrice: 1800,
        supply: 1000,
        demand: 1200,
        volatility: 0.15,
        lastUpdate: Date.now()
      });

      engine.addParticipant('test-market', {
        id: 'participant-1',
        name: 'Participant 1',
        type: ParticipantType.INDIVIDUAL,
        capital: 10000,
        inventory: new Map([['gold', 5]]),
        behavior: {
          riskTolerance: 0.5,
          buyThreshold: 1750,
          sellThreshold: 1850,
          maxTransactionSize: 3,
          preferredCommodities: ['gold']
        }
      });
    });

    test('should calculate supply demand curve', () => {
      const curve = engine.calculateSupplyDemand('test-market', 'gold');

      expect(curve).not.toBeNull();
      expect(curve?.commodity).toBe('gold');
      expect(curve?.supplyPoints.length).toBeGreaterThan(0);
      expect(curve?.demandPoints.length).toBeGreaterThan(0);
      expect(curve?.equilibriumPrice).toBeGreaterThan(0);
    });
  });

  describe('Engine Lifecycle', () => {
    test('should start and stop engine', (done) => {
      let started = false;
      let stopped = false;

      engine.on('engine_started', () => {
        started = true;
        engine.stop();
      });

      engine.on('engine_stopped', () => {
        stopped = true;
        expect(started).toBe(true);
        expect(stopped).toBe(true);
        done();
      });

      engine.start();
    });
  });

  describe('Data Retrieval', () => {
    test('should get all markets', () => {
      engine.createMarket({
        id: 'market-1',
        name: 'Market 1',
        type: MarketType.COMMODITY
      });

      engine.createMarket({
        id: 'market-2',
        name: 'Market 2',
        type: MarketType.STOCK
      });

      const markets = engine.getAllMarkets();
      expect(markets.length).toBe(2);
      expect(markets.map(m => m.id)).toContain('market-1');
      expect(markets.map(m => m.id)).toContain('market-2');
    });

    test('should get transaction history', () => {
      engine.createMarket({
        id: 'test-market',
        name: 'Test Market',
        type: MarketType.COMMODITY
      });

      const allTransactions = engine.getTransactionHistory();
      const marketTransactions = engine.getTransactionHistory('test-market');

      expect(Array.isArray(allTransactions)).toBe(true);
      expect(Array.isArray(marketTransactions)).toBe(true);
    });
  });
});