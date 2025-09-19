import { MarketEngine, MarketType, ParticipantType, EconomyConfig } from '@steam-sim/economy';

async function runSimpleMarketExample() {
  console.log('🏪 Starting Simple Market Example');

  const config: EconomyConfig = {
    baseCurrency: 'USD',
    inflationRate: 2.5,
    interestRate: 3.0,
    marketVolatility: 0.1,
    updateInterval: 1000
  };

  const engine = new MarketEngine(config);

  engine.on('market_created', (market) => {
    console.log(`📊 Market created: ${market.name}`);
  });

  engine.on('transaction_executed', (transaction) => {
    console.log(`💰 Trade: ${transaction.quantity} ${transaction.commodityId} @ $${transaction.price}`);
  });

  engine.on('price_change', (data) => {
    console.log(`📈 Price changed: ${data.commodityId} $${data.oldPrice} → $${data.newPrice}`);
  });

  const market = engine.createMarket({
    id: 'fruit-market',
    name: 'Local Fruit Market',
    type: MarketType.COMMODITY
  });

  const apples = {
    id: 'apples',
    name: 'Red Apples',
    category: 'fruit',
    basePrice: 3.50,
    currentPrice: 3.50,
    supply: 1000,
    demand: 800,
    volatility: 0.05,
    lastUpdate: Date.now()
  };

  const oranges = {
    id: 'oranges',
    name: 'Orange',
    category: 'fruit',
    basePrice: 2.80,
    currentPrice: 2.80,
    supply: 1200,
    demand: 1100,
    volatility: 0.08,
    lastUpdate: Date.now()
  };

  engine.addCommodity(market.id, apples);
  engine.addCommodity(market.id, oranges);

  const farmer = {
    id: 'farmer-joe',
    name: 'Farmer Joe',
    type: ParticipantType.INDIVIDUAL,
    capital: 1000,
    inventory: new Map([
      ['apples', 200],
      ['oranges', 150]
    ]),
    behavior: {
      riskTolerance: 0.3,
      buyThreshold: 3.0,
      sellThreshold: 4.0,
      maxTransactionSize: 20,
      preferredCommodities: ['apples', 'oranges']
    }
  };

  const buyer = {
    id: 'grocery-store',
    name: 'Local Grocery Store',
    type: ParticipantType.CORPORATION,
    capital: 5000,
    inventory: new Map(),
    behavior: {
      riskTolerance: 0.5,
      buyThreshold: 4.0,
      sellThreshold: 5.0,
      maxTransactionSize: 50,
      preferredCommodities: ['apples', 'oranges']
    }
  };

  engine.addParticipant(market.id, farmer);
  engine.addParticipant(market.id, buyer);

  console.log('\n🚀 Executing sample trades...');

  const appleTrade = engine.executeTrade(
    market.id,
    buyer.id,
    farmer.id,
    'apples',
    15,
    3.60
  );

  if (appleTrade) {
    console.log(`✅ Apple trade successful: ${appleTrade.id}`);
  }

  const orangeTrade = engine.executeTrade(
    market.id,
    buyer.id,
    farmer.id,
    'oranges',
    20,
    2.90
  );

  if (orangeTrade) {
    console.log(`✅ Orange trade successful: ${orangeTrade.id}`);
  }

  console.log('\n📊 Market Status:');
  const marketData = engine.getMarketData(market.id);
  if (marketData) {
    console.log(`- Participants: ${marketData.participants.length}`);
    console.log(`- Commodities: ${marketData.commodities.size}`);

    for (const [id, commodity] of marketData.commodities) {
      console.log(`  • ${commodity.name}: $${commodity.currentPrice.toFixed(2)}`);
    }

    console.log('\n💼 Participant Status:');
    for (const participant of marketData.participants) {
      console.log(`- ${participant.name}:`);
      console.log(`  Capital: $${participant.capital.toFixed(2)}`);
      console.log(`  Inventory: ${Array.from(participant.inventory.entries()).map(([k, v]) => `${k}:${v}`).join(', ')}`);
    }
  }

  const supplyDemand = engine.calculateSupplyDemand(market.id, 'apples');
  if (supplyDemand) {
    console.log('\n📈 Apple Supply/Demand Analysis:');
    console.log(`- Equilibrium Price: $${supplyDemand.equilibriumPrice.toFixed(2)}`);
    console.log(`- Equilibrium Quantity: ${supplyDemand.equilibriumQuantity.toFixed(0)}`);
  }

  console.log('\n🎯 Starting automatic market simulation for 5 seconds...');
  engine.start();

  await new Promise(resolve => setTimeout(resolve, 5000));

  engine.stop();

  const transactions = engine.getTransactionHistory(market.id);
  console.log(`\n📋 Total transactions completed: ${transactions.length}`);

  console.log('\n✨ Simple Market Example completed!');
}

if (require.main === module) {
  runSimpleMarketExample().catch(console.error);
}

export { runSimpleMarketExample };