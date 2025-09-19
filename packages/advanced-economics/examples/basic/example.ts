import { AdvancedEconomicsSimulation, AssetType, OrderSide, OrderType } from '../../src/index';

export function runAdvancedEconomicsExample(): void {
  console.log('💰 Starting Advanced Economics Simulation...');

  const simulation = new AdvancedEconomicsSimulation();
  const market = simulation.getMarket();

  // Create various assets
  console.log('📈 Creating market assets...');

  market.addAsset({
    id: 'AAPL',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    type: AssetType.STOCK,
    currentPrice: 150.00,
    volume: 1000000,
    marketCap: 2500000000000,
    volatility: 0.02,
    fundamentals: {
      peRatio: 28.5,
      dividendYield: 0.005,
      revenue: 365000000000,
      earningsGrowth: 0.15
    }
  });

  market.addAsset({
    id: 'GOLD',
    name: 'Gold',
    symbol: 'XAU',
    type: AssetType.COMMODITY,
    currentPrice: 1800.00,
    volume: 500000,
    marketCap: 0,
    volatility: 0.015,
    fundamentals: {}
  });

  // Submit some orders
  console.log('📋 Submitting initial orders...');

  market.submitOrder({
    id: 'order1',
    assetId: 'AAPL',
    type: OrderType.LIMIT,
    side: OrderSide.BUY,
    quantity: 100,
    price: 149.50,
    timestamp: Date.now(),
    status: 'pending',
    traderId: 'trader1'
  });

  market.submitOrder({
    id: 'order2',
    assetId: 'AAPL',
    type: OrderType.LIMIT,
    side: OrderSide.SELL,
    quantity: 50,
    price: 150.50,
    timestamp: Date.now(),
    status: 'pending',
    traderId: 'trader2'
  });

  simulation.start();

  // Run simulation
  for (let i = 0; i < 100; i++) {
    simulation.step(0.1);

    if (i % 20 === 0) {
      const stats = market.getMarketStats();
      console.log(`\nTime: ${i}`);
      console.log(`Market Cap: $${(stats.totalMarketCap / 1e9).toFixed(2)}B`);
      console.log(`Total Volume: ${stats.totalVolume.toLocaleString()}`);
    }
  }

  console.log('\n✅ Advanced Economics Simulation Complete!');
}

export default runAdvancedEconomicsExample;