import {
  MarketEngine,
  EconomicIndicatorsCalculator,
  PriceCalculator,
  MarketType,
  ParticipantType,
  EconomyConfig
} from '@steam-sim/economy';

async function runAdvancedAnalysisExample() {
  console.log('📊 Starting Advanced Analysis Example');

  const config: EconomyConfig = {
    baseCurrency: 'USD',
    inflationRate: 2.5,
    interestRate: 3.0,
    marketVolatility: 0.15,
    updateInterval: 500
  };

  const engine = new MarketEngine(config);

  const cryptoMarket = engine.createMarket({
    id: 'crypto-market',
    name: 'Cryptocurrency Market',
    type: MarketType.CURRENCY
  });

  const bitcoin = {
    id: 'bitcoin',
    name: 'Bitcoin',
    category: 'cryptocurrency',
    basePrice: 45000,
    currentPrice: 45000,
    supply: 100,
    demand: 120,
    volatility: 0.3,
    lastUpdate: Date.now()
  };

  const ethereum = {
    id: 'ethereum',
    name: 'Ethereum',
    category: 'cryptocurrency',
    basePrice: 3000,
    currentPrice: 3000,
    supply: 500,
    demand: 480,
    volatility: 0.35,
    lastUpdate: Date.now()
  };

  engine.addCommodity(cryptoMarket.id, bitcoin);
  engine.addCommodity(cryptoMarket.id, ethereum);

  const participants = [
    {
      id: 'whale-trader',
      name: 'Crypto Whale',
      type: ParticipantType.INDIVIDUAL,
      capital: 5000000,
      inventory: new Map([['bitcoin', 50], ['ethereum', 200]]),
      behavior: {
        riskTolerance: 0.8,
        buyThreshold: 42000,
        sellThreshold: 48000,
        maxTransactionSize: 10,
        preferredCommodities: ['bitcoin']
      }
    },
    {
      id: 'day-trader',
      name: 'Day Trader',
      type: ParticipantType.INDIVIDUAL,
      capital: 100000,
      inventory: new Map([['ethereum', 20]]),
      behavior: {
        riskTolerance: 0.9,
        buyThreshold: 2900,
        sellThreshold: 3200,
        maxTransactionSize: 5,
        preferredCommodities: ['ethereum']
      }
    },
    {
      id: 'institution',
      name: 'Investment Fund',
      type: ParticipantType.CORPORATION,
      capital: 10000000,
      inventory: new Map([['bitcoin', 100], ['ethereum', 1000]]),
      behavior: {
        riskTolerance: 0.4,
        buyThreshold: 44000,
        sellThreshold: 46000,
        maxTransactionSize: 20,
        preferredCommodities: ['bitcoin', 'ethereum']
      }
    }
  ];

  participants.forEach(participant => {
    engine.addParticipant(cryptoMarket.id, participant);
  });

  console.log('\n🚀 Starting market simulation...');
  engine.start();

  const priceData: { [key: string]: number[] } = {
    bitcoin: [],
    ethereum: []
  };

  engine.on('price_update', (data) => {
    if (priceData[data.commodityId]) {
      priceData[data.commodityId].push(data.price);
    }
  });

  await new Promise(resolve => setTimeout(resolve, 10000));

  engine.stop();

  console.log('\n📈 Performing Technical Analysis...');

  for (const [commodityId, prices] of Object.entries(priceData)) {
    if (prices.length < 10) continue;

    console.log(`\n🪙 ${commodityId.toUpperCase()} Analysis:`);

    const currentPrice = prices[prices.length - 1];
    const initialPrice = prices[0];
    const priceChange = ((currentPrice - initialPrice) / initialPrice) * 100;

    console.log(`- Price Change: ${priceChange.toFixed(2)}%`);
    console.log(`- Initial: $${initialPrice.toFixed(2)}`);
    console.log(`- Current: $${currentPrice.toFixed(2)}`);

    if (prices.length >= 10) {
      const movingAvg = PriceCalculator.calculateMovingAverage(prices, 5);
      const latestMA = movingAvg[movingAvg.length - 1];
      console.log(`- 5-period MA: $${latestMA.toFixed(2)}`);

      const trend = PriceCalculator.identifyTrendDirection(prices, 5);
      console.log(`- Trend: ${trend}`);
    }

    if (prices.length >= 15) {
      const rsi = PriceCalculator.calculateRSI(prices, 14);
      if (rsi.length > 0) {
        const latestRSI = rsi[rsi.length - 1];
        console.log(`- RSI: ${latestRSI.toFixed(2)}`);

        if (latestRSI > 70) {
          console.log(`  → Overbought condition`);
        } else if (latestRSI < 30) {
          console.log(`  → Oversold condition`);
        } else {
          console.log(`  → Neutral condition`);
        }
      }
    }

    if (prices.length >= 20) {
      const bands = PriceCalculator.calculateBollingerBands(prices, 20, 2);
      if (bands.upper.length > 0) {
        const latest = bands.upper.length - 1;
        console.log(`- Bollinger Bands:`);
        console.log(`  Upper: $${bands.upper[latest].toFixed(2)}`);
        console.log(`  Middle: $${bands.middle[latest].toFixed(2)}`);
        console.log(`  Lower: $${bands.lower[latest].toFixed(2)}`);

        if (currentPrice > bands.upper[latest]) {
          console.log(`  → Price above upper band (potential sell signal)`);
        } else if (currentPrice < bands.lower[latest]) {
          console.log(`  → Price below lower band (potential buy signal)`);
        }
      }
    }

    const commodity = engine.getMarketData(cryptoMarket.id)?.commodities.get(commodityId);
    if (commodity) {
      const fairValue = PriceCalculator.calculateFairValue(commodity, {
        averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        totalSupply: commodity.supply,
        totalDemand: commodity.demand,
        inflationRate: config.inflationRate
      });

      console.log(`- Fair Value: $${fairValue.toFixed(2)}`);

      const deviation = ((currentPrice - fairValue) / fairValue) * 100;
      console.log(`- Fair Value Deviation: ${deviation.toFixed(2)}%`);

      if (Math.abs(deviation) > 10) {
        console.log(`  → ${deviation > 0 ? 'Overvalued' : 'Undervalued'} by ${Math.abs(deviation).toFixed(1)}%`);
      }
    }
  }

  console.log('\n💹 Economic Indicators Analysis...');

  const markets = new Map([[cryptoMarket.id, engine.getMarketData(cryptoMarket.id)!]]);
  const transactions = engine.getTransactionHistory(cryptoMarket.id);
  const calculator = new EconomicIndicatorsCalculator(markets, transactions);

  const indicators = calculator.calculateIndicators();

  console.log(`\n📊 Market Overview:`);
  console.log(`- GDP (Trading Volume Value): $${indicators.gdp.toLocaleString()}`);
  console.log(`- Market Cap: $${indicators.marketCap.toLocaleString()}`);
  console.log(`- Trading Volume: ${indicators.tradingVolume.toLocaleString()} units`);
  console.log(`- Price Index: ${indicators.priceIndex.toFixed(2)}`);
  console.log(`- Inflation Rate: ${indicators.inflation.toFixed(2)}%`);
  console.log(`- Unemployment Rate: ${indicators.unemployment.toFixed(2)}%`);

  console.log(`\n🏆 Top Performers:`);
  const topPerformers = calculator.getTopPerformers(5);
  topPerformers.forEach((performer, index) => {
    console.log(`${index + 1}. ${performer.commodityId}: ${performer.performance.toFixed(2)}% (Current: $${performer.currentPrice.toFixed(2)})`);
  });

  console.log(`\n📈 Commodity Performance Details:`);
  for (const [commodityId] of Object.entries(priceData)) {
    const performance = calculator.calculateCommodityPerformance(commodityId);
    console.log(`- ${commodityId.toUpperCase()}:`);
    console.log(`  Price Change: ${performance.priceChange.toFixed(2)}%`);
    console.log(`  Volume Traded: ${performance.volumeChange.toFixed(0)} units`);
    console.log(`  Volatility: ${performance.volatility.toFixed(2)}%`);
  }

  console.log(`\n🔍 Supply & Demand Analysis:`);
  for (const commodityId of ['bitcoin', 'ethereum']) {
    const curve = engine.calculateSupplyDemand(cryptoMarket.id, commodityId);
    if (curve) {
      console.log(`\n📊 ${commodityId.toUpperCase()} Supply/Demand:`);
      console.log(`- Equilibrium Price: $${curve.equilibriumPrice.toFixed(2)}`);
      console.log(`- Equilibrium Quantity: ${curve.equilibriumQuantity.toFixed(0)} units`);

      const currentPrice = engine.getMarketData(cryptoMarket.id)?.commodities.get(commodityId)?.currentPrice || 0;
      const priceDiff = ((currentPrice - curve.equilibriumPrice) / curve.equilibriumPrice) * 100;

      if (Math.abs(priceDiff) > 5) {
        console.log(`- Market Imbalance: ${priceDiff > 0 ? 'Above' : 'Below'} equilibrium by ${Math.abs(priceDiff).toFixed(1)}%`);
      } else {
        console.log(`- Market Status: Near equilibrium`);
      }
    }
  }

  console.log(`\n💼 Final Participant Status:`);
  const finalMarketData = engine.getMarketData(cryptoMarket.id);
  if (finalMarketData) {
    for (const participant of finalMarketData.participants) {
      const initialCapital = participants.find(p => p.id === participant.id)?.capital || 0;
      const portfolioValue = participant.capital + Array.from(participant.inventory.entries())
        .reduce((total, [commodityId, quantity]) => {
          const price = finalMarketData.commodities.get(commodityId)?.currentPrice || 0;
          return total + (quantity * price);
        }, 0);

      const totalReturn = ((portfolioValue - initialCapital) / initialCapital) * 100;

      console.log(`\n- ${participant.name}:`);
      console.log(`  Initial Capital: $${initialCapital.toLocaleString()}`);
      console.log(`  Current Cash: $${participant.capital.toLocaleString()}`);
      console.log(`  Portfolio Value: $${portfolioValue.toLocaleString()}`);
      console.log(`  Total Return: ${totalReturn.toFixed(2)}%`);
      console.log(`  Inventory: ${Array.from(participant.inventory.entries()).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    }
  }

  console.log(`\n📋 Transaction Summary:`);
  console.log(`- Total Transactions: ${transactions.length}`);
  if (transactions.length > 0) {
    const totalVolume = transactions.reduce((sum, t) => sum + (t.quantity * t.price), 0);
    const avgPrice = transactions.reduce((sum, t) => sum + t.price, 0) / transactions.length;
    console.log(`- Total Volume: $${totalVolume.toLocaleString()}`);
    console.log(`- Average Price: $${avgPrice.toFixed(2)}`);
  }

  console.log('\n✨ Advanced Analysis Example completed!');
}

if (require.main === module) {
  runAdvancedAnalysisExample().catch(console.error);
}

export { runAdvancedAnalysisExample };