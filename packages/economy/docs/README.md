# @steam-sim/economy

Real-time economic simulation engine with dynamic markets, pricing algorithms, and economic indicators.

## Features

- **Dynamic Market Simulation**: Create and manage multiple markets with different types (commodity, stock, currency, futures)
- **Intelligent Pricing**: Advanced pricing algorithms considering supply/demand, volatility, and market conditions
- **Economic Indicators**: Calculate GDP, unemployment, inflation, market cap, and trading volume
- **Market Participants**: Support for individuals, corporations, governments, and AI agents with customizable behaviors
- **Real-time Trading**: Execute trades with automatic price discovery and market updates
- **Technical Analysis**: Built-in support for moving averages, RSI, Bollinger bands, and trend analysis
- **Supply/Demand Curves**: Calculate and visualize market equilibrium points

## Installation

```bash
npm install @steam-sim/economy
```

## Quick Start

```typescript
import { MarketEngine, MarketType, ParticipantType } from '@steam-sim/economy';

// Create economy configuration
const config = {
  baseCurrency: 'USD',
  inflationRate: 2.5,
  interestRate: 3.0,
  marketVolatility: 0.1,
  updateInterval: 1000
};

// Initialize market engine
const engine = new MarketEngine(config);

// Create a commodity market
const market = engine.createMarket({
  id: 'commodities',
  name: 'Commodity Market',
  type: MarketType.COMMODITY
});

// Add commodities
engine.addCommodity(market.id, {
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

// Add market participants
engine.addParticipant(market.id, {
  id: 'trader-1',
  name: 'Gold Trader',
  type: ParticipantType.INDIVIDUAL,
  capital: 50000,
  inventory: new Map([['gold', 10]]),
  behavior: {
    riskTolerance: 0.6,
    buyThreshold: 1750,
    sellThreshold: 1850,
    maxTransactionSize: 5,
    preferredCommodities: ['gold']
  }
});

// Start the market engine
engine.start();

// Execute trades
const transaction = engine.executeTrade(
  market.id,
  'buyer-id',
  'seller-id',
  'gold',
  5,
  1800
);

console.log('Transaction:', transaction);
```

## Core Concepts

### Markets

Markets are containers for commodities and participants. Each market has a type and manages trading activities:

```typescript
const market = engine.createMarket({
  id: 'stock-market',
  name: 'Stock Exchange',
  type: MarketType.STOCK
});
```

### Commodities

Commodities represent tradeable assets with dynamic pricing:

```typescript
const commodity = {
  id: 'oil',
  name: 'Crude Oil',
  category: 'energy',
  basePrice: 80,
  currentPrice: 82,
  supply: 10000,
  demand: 12000,
  volatility: 0.25,
  lastUpdate: Date.now()
};
```

### Market Participants

Participants are traders with capital, inventory, and behavioral profiles:

```typescript
const participant = {
  id: 'energy-corp',
  name: 'Energy Corporation',
  type: ParticipantType.CORPORATION,
  capital: 1000000,
  inventory: new Map([['oil', 500]]),
  behavior: {
    riskTolerance: 0.4,
    buyThreshold: 75,
    sellThreshold: 90,
    maxTransactionSize: 100,
    preferredCommodities: ['oil', 'gas']
  }
};
```

## Advanced Features

### Economic Indicators

Calculate comprehensive economic metrics:

```typescript
import { EconomicIndicatorsCalculator } from '@steam-sim/economy';

const calculator = new EconomicIndicatorsCalculator(markets, transactions);
const indicators = calculator.calculateIndicators();

console.log('GDP:', indicators.gdp);
console.log('Inflation:', indicators.inflation);
console.log('Market Cap:', indicators.marketCap);
```

### Price Analysis

Use built-in technical analysis tools:

```typescript
import { PriceCalculator } from '@steam-sim/economy';

// Calculate dynamic pricing
const newPrice = PriceCalculator.calculateDynamicPrice(
  commodity,
  supply,
  demand,
  marketVolatility
);

// Technical indicators
const prices = [100, 102, 98, 105, 110, 108, 112];
const movingAvg = PriceCalculator.calculateMovingAverage(prices, 5);
const rsi = PriceCalculator.calculateRSI(prices, 14);
const trend = PriceCalculator.identifyTrendDirection(prices);
```

### Supply and Demand Analysis

Calculate market equilibrium:

```typescript
const curve = engine.calculateSupplyDemand('market-id', 'commodity-id');
console.log('Equilibrium Price:', curve.equilibriumPrice);
console.log('Equilibrium Quantity:', curve.equilibriumQuantity);
```

## Event System

The engine emits events for real-time monitoring:

```typescript
engine.on('transaction_executed', (transaction) => {
  console.log('New transaction:', transaction);
});

engine.on('price_change', (data) => {
  console.log('Price updated:', data);
});

engine.on('market_created', (market) => {
  console.log('Market created:', market);
});
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `baseCurrency` | string | Base currency for the economy | 'USD' |
| `inflationRate` | number | Annual inflation rate (%) | 2.5 |
| `interestRate` | number | Base interest rate (%) | 3.0 |
| `marketVolatility` | number | Market volatility factor (0-1) | 0.1 |
| `updateInterval` | number | Update frequency (ms) | 1000 |

## API Reference

### MarketEngine

#### Methods

- `createMarket(marketData)`: Create a new market
- `addCommodity(marketId, commodity)`: Add commodity to market
- `addParticipant(marketId, participant)`: Add participant to market
- `executeTrade(marketId, buyerId, sellerId, commodityId, quantity, price)`: Execute trade
- `calculateSupplyDemand(marketId, commodityId)`: Calculate supply/demand curve
- `start()`: Start the market engine
- `stop()`: Stop the market engine
- `getMarketData(marketId)`: Get market information
- `getAllMarkets()`: Get all markets
- `getTransactionHistory(marketId?)`: Get transaction history

#### Events

- `engine_started`: Engine started
- `engine_stopped`: Engine stopped
- `market_created`: New market created
- `commodity_added`: Commodity added to market
- `participant_added`: Participant added to market
- `transaction_executed`: Trade executed
- `price_change`: Price updated
- `price_update`: Periodic price update

### EconomicIndicatorsCalculator

#### Methods

- `calculateIndicators(timeWindow?)`: Calculate economic indicators
- `calculateCommodityPerformance(commodityId, timeWindow?)`: Get commodity performance
- `getTopPerformers(limit?)`: Get top performing commodities

### PriceCalculator

#### Static Methods

- `calculateDynamicPrice(commodity, supply, demand, volatility)`: Calculate dynamic price
- `calculateElasticityOfDemand(priceHistory)`: Calculate demand elasticity
- `calculateFairValue(commodity, marketConditions)`: Calculate fair value
- `calculatePriceTarget(commodity, participant, isBuying)`: Calculate price target
- `calculateMovingAverage(prices, period)`: Calculate moving average
- `calculateBollingerBands(prices, period, stdDev)`: Calculate Bollinger bands
- `calculateRSI(prices, period)`: Calculate RSI
- `identifyTrendDirection(prices, period)`: Identify trend direction

## License

MIT License - see LICENSE file for details.