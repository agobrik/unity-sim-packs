# Economy Engine API Reference

## Table of Contents

- [MarketEngine](#marketengine)
- [EconomicIndicatorsCalculator](#economicindicatorscalculator)
- [PriceCalculator](#pricecalculator)
- [Types](#types)

## MarketEngine

The main engine for managing markets, commodities, participants, and trading operations.

### Constructor

```typescript
new MarketEngine(config: EconomyConfig)
```

**Parameters:**
- `config`: Economy configuration object

### Methods

#### `createMarket(marketData: Omit<Market, 'commodities' | 'participants' | 'history'>): Market`

Creates a new market.

**Parameters:**
- `marketData`: Market configuration without commodities, participants, or history

**Returns:** Created market object

**Example:**
```typescript
const market = engine.createMarket({
  id: 'gold-market',
  name: 'Gold Trading Market',
  type: MarketType.COMMODITY
});
```

#### `addCommodity(marketId: string, commodity: Commodity): boolean`

Adds a commodity to an existing market.

**Parameters:**
- `marketId`: ID of the target market
- `commodity`: Commodity object to add

**Returns:** `true` if successful, `false` if market not found

#### `addParticipant(marketId: string, participant: MarketParticipant): boolean`

Adds a participant to an existing market.

**Parameters:**
- `marketId`: ID of the target market
- `participant`: Participant object to add

**Returns:** `true` if successful, `false` if market not found

#### `executeTrade(marketId: string, buyerId: string, sellerId: string, commodityId: string, quantity: number, price: number): Transaction | null`

Executes a trade between two participants.

**Parameters:**
- `marketId`: ID of the market
- `buyerId`: ID of the buying participant
- `sellerId`: ID of the selling participant
- `commodityId`: ID of the commodity being traded
- `quantity`: Quantity to trade
- `price`: Price per unit

**Returns:** Transaction object if successful, `null` if failed

#### `calculateSupplyDemand(marketId: string, commodityId: string): SupplyDemandCurve | null`

Calculates supply and demand curves for a commodity.

**Parameters:**
- `marketId`: ID of the market
- `commodityId`: ID of the commodity

**Returns:** Supply/demand curve data or `null` if not found

#### `start(): void`

Starts the market engine with automatic updates.

#### `stop(): void`

Stops the market engine.

#### `getMarketData(marketId: string): Market | undefined`

Retrieves market data by ID.

**Parameters:**
- `marketId`: ID of the market

**Returns:** Market object or `undefined` if not found

#### `getAllMarkets(): Market[]`

Retrieves all markets.

**Returns:** Array of all market objects

#### `getTransactionHistory(marketId?: string): Transaction[]`

Retrieves transaction history.

**Parameters:**
- `marketId` (optional): Filter by specific market ID

**Returns:** Array of transactions

### Events

The MarketEngine extends EventEmitter and emits the following events:

#### `engine_started`
Emitted when the engine starts.

#### `engine_stopped`
Emitted when the engine stops.

#### `market_created`
Emitted when a new market is created.
- Data: `Market` object

#### `commodity_added`
Emitted when a commodity is added to a market.
- Data: `{ marketId: string, commodity: Commodity }`

#### `participant_added`
Emitted when a participant is added to a market.
- Data: `{ marketId: string, participant: MarketParticipant }`

#### `transaction_executed`
Emitted when a trade is executed.
- Data: `Transaction` object

#### `price_change`
Emitted when a commodity price changes.
- Data: `{ commodityId: string, oldPrice: number, newPrice: number }`

#### `price_update`
Emitted during periodic price updates.
- Data: `{ commodityId: string, price: number, marketId: string }`

## EconomicIndicatorsCalculator

Calculates various economic indicators and performance metrics.

### Constructor

```typescript
new EconomicIndicatorsCalculator(markets: Map<string, Market>, transactions: Transaction[])
```

**Parameters:**
- `markets`: Map of market ID to Market objects
- `transactions`: Array of all transactions

### Methods

#### `calculateIndicators(timeWindow?: number): EconomicIndicators`

Calculates comprehensive economic indicators.

**Parameters:**
- `timeWindow` (optional): Time window in milliseconds (default: 24 hours)

**Returns:** Economic indicators object

**Example:**
```typescript
const indicators = calculator.calculateIndicators();
console.log('GDP:', indicators.gdp);
console.log('Inflation:', indicators.inflation);
```

#### `calculateCommodityPerformance(commodityId: string, timeWindow?: number): { priceChange: number; volumeChange: number; volatility: number }`

Calculates performance metrics for a specific commodity.

**Parameters:**
- `commodityId`: ID of the commodity
- `timeWindow` (optional): Time window in milliseconds

**Returns:** Performance metrics object

#### `getTopPerformers(limit?: number): Array<{ commodityId: string; performance: number; currentPrice: number }>`

Gets top performing commodities.

**Parameters:**
- `limit` (optional): Maximum number of results (default: 10)

**Returns:** Array of top performers

## PriceCalculator

Static utility class for price calculations and technical analysis.

### Static Methods

#### `calculateDynamicPrice(commodity: Commodity, supply: number, demand: number, marketVolatility?: number): number`

Calculates dynamic price based on supply/demand and volatility.

**Parameters:**
- `commodity`: Commodity object
- `supply`: Current supply
- `demand`: Current demand
- `marketVolatility` (optional): Market volatility factor (default: 0.1)

**Returns:** Calculated price

#### `calculateElasticityOfDemand(priceHistory: Array<{ price: number; quantity: number }>): number`

Calculates price elasticity of demand.

**Parameters:**
- `priceHistory`: Array of price/quantity data points

**Returns:** Elasticity coefficient

#### `calculateFairValue(commodity: Commodity, marketConditions: { averagePrice: number; totalSupply: number; totalDemand: number; inflationRate: number }): number`

Calculates fair value based on market conditions.

**Parameters:**
- `commodity`: Commodity object
- `marketConditions`: Market condition data

**Returns:** Fair value price

#### `calculatePriceTarget(commodity: Commodity, participant: MarketParticipant, isBuying: boolean): number`

Calculates price target for a participant's trading strategy.

**Parameters:**
- `commodity`: Commodity object
- `participant`: Market participant
- `isBuying`: Whether calculating buy or sell target

**Returns:** Target price

#### `calculateMovingAverage(prices: number[], period?: number): number[]`

Calculates simple moving average.

**Parameters:**
- `prices`: Array of prices
- `period` (optional): Period for average (default: 10)

**Returns:** Array of moving averages

#### `calculateBollingerBands(prices: number[], period?: number, standardDeviations?: number): { upper: number[]; middle: number[]; lower: number[] }`

Calculates Bollinger Bands.

**Parameters:**
- `prices`: Array of prices
- `period` (optional): Period for calculation (default: 20)
- `standardDeviations` (optional): Number of standard deviations (default: 2)

**Returns:** Bollinger Bands data

#### `calculateRSI(prices: number[], period?: number): number[]`

Calculates Relative Strength Index.

**Parameters:**
- `prices`: Array of prices
- `period` (optional): Period for RSI (default: 14)

**Returns:** Array of RSI values

#### `identifyTrendDirection(prices: number[], period?: number): 'uptrend' | 'downtrend' | 'sideways'`

Identifies trend direction.

**Parameters:**
- `prices`: Array of prices
- `period` (optional): Period for analysis (default: 10)

**Returns:** Trend direction

## Types

### EconomyConfig

```typescript
interface EconomyConfig {
  baseCurrency: string;
  inflationRate: number;
  interestRate: number;
  marketVolatility: number;
  updateInterval: number;
}
```

### Market

```typescript
interface Market {
  id: string;
  name: string;
  type: MarketType;
  commodities: Map<string, Commodity>;
  participants: MarketParticipant[];
  history: PriceHistory[];
}
```

### Commodity

```typescript
interface Commodity {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  supply: number;
  demand: number;
  volatility: number;
  lastUpdate: number;
}
```

### MarketParticipant

```typescript
interface MarketParticipant {
  id: string;
  name: string;
  type: ParticipantType;
  capital: number;
  inventory: Map<string, number>;
  behavior: BehaviorProfile;
}
```

### BehaviorProfile

```typescript
interface BehaviorProfile {
  riskTolerance: number;
  buyThreshold: number;
  sellThreshold: number;
  maxTransactionSize: number;
  preferredCommodities: string[];
}
```

### Transaction

```typescript
interface Transaction {
  id: string;
  timestamp: number;
  buyerId: string;
  sellerId: string;
  commodityId: string;
  quantity: number;
  price: number;
  marketId: string;
}
```

### EconomicIndicators

```typescript
interface EconomicIndicators {
  gdp: number;
  unemployment: number;
  inflation: number;
  marketCap: number;
  tradingVolume: number;
  priceIndex: number;
}
```

### SupplyDemandCurve

```typescript
interface SupplyDemandCurve {
  commodity: string;
  supplyPoints: Array<{ price: number; quantity: number }>;
  demandPoints: Array<{ price: number; quantity: number }>;
  equilibriumPrice: number;
  equilibriumQuantity: number;
}
```

### Enums

#### MarketType

```typescript
enum MarketType {
  COMMODITY = 'commodity',
  STOCK = 'stock',
  CURRENCY = 'currency',
  FUTURES = 'futures'
}
```

#### ParticipantType

```typescript
enum ParticipantType {
  INDIVIDUAL = 'individual',
  CORPORATION = 'corporation',
  GOVERNMENT = 'government',
  AI_AGENT = 'ai_agent'
}
```