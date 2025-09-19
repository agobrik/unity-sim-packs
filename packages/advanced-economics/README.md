# @steam-sim/advanced-economics

Sophisticated financial markets and economic modeling with trading systems, market analysis, and economic indicators for Unity-based Steam games.

## Features

- **Multi-Asset Trading**: Stocks, commodities, currencies, bonds, cryptocurrencies, and derivatives
- **Market Simulation**: Realistic price movements, volatility modeling, and market cycles
- **Economic Indicators**: GDP, inflation, unemployment, and sector-specific metrics
- **Algorithmic Trading**: AI traders with various strategies and risk profiles
- **Financial Analysis**: Technical indicators, fundamental analysis, and portfolio optimization
- **Market Microstructure**: Order books, market making, and liquidity modeling

## Installation

```bash
npm install @steam-sim/advanced-economics
```

## Quick Start

```typescript
import { AdvancedEconomicsSimulation, Market, Asset, TradingBot } from '@steam-sim/advanced-economics';

// Create comprehensive economic simulation
const simulation = new AdvancedEconomicsSimulation({
  marketTypes: ['stock', 'commodity', 'forex', 'crypto'],
  economicRegions: ['usa', 'europe', 'asia'],
  tradingHours: '24/7',
  realismLevel: 'high'
});

// Create stock market
const stockMarket = new Market('NYSE', 'stock');

// Add major technology stock
const techStock = new Asset('TECH-CORP', 'TechCorp Inc.', 'stock', {
  currentPrice: 150.00,
  marketCap: 2000000000, // $2B
  volume: 1000000,
  volatility: 0.25,
  fundamentals: {
    peRatio: 22.5,
    dividendYield: 0.02,
    bookValue: 75.50,
    revenue: 5000000000,
    earningsGrowth: 0.15,
    debtToEquity: 0.3
  }
});

stockMarket.addAsset(techStock);

// Create commodity market
const commodityMarket = new Market('COMEX', 'commodity');
const gold = new Asset('GOLD', 'Gold Futures', 'commodity', {
  currentPrice: 1850.00, // per ounce
  volume: 500000,
  volatility: 0.18,
  fundamentals: {
    supply: 3200, // tons annually
    demand: 4200,
    inventories: 180000, // tons
    productionCost: 1200
  }
});

commodityMarket.addAsset(gold);

// Create forex market
const forexMarket = new Market('FX', 'currency');
const eurUsd = new Asset('EUR/USD', 'Euro/US Dollar', 'currency', {
  currentPrice: 1.0850,
  volume: 1000000000, // daily volume
  volatility: 0.12,
  fundamentals: {
    interestRateDiff: 0.015, // 1.5% difference
    inflationDiff: 0.005,
    gdpGrowthDiff: 0.008,
    tradeBAlance: -15000000000 // EUR trade balance
  }
});

forexMarket.addAsset(eurUsd);

// Add markets to simulation
simulation.addMarket(stockMarket);
simulation.addMarket(commodityMarket);
simulation.addMarket(forexMarket);

// Create algorithmic trading bots
const momentumBot = new TradingBot('momentum-trader', {
  strategy: 'momentum',
  capital: 1000000,
  riskTolerance: 0.7,
  timeframe: 'daily',
  parameters: {
    lookbackPeriod: 20,
    thresholds: { buy: 0.05, sell: -0.03 },
    positionSize: 0.1 // 10% of capital per trade
  }
});

const arbitrageBot = new TradingBot('arbitrage-bot', {
  strategy: 'arbitrage',
  capital: 5000000,
  riskTolerance: 0.2,
  timeframe: 'minute',
  parameters: {
    minSpread: 0.001, // 0.1%
    maxHoldTime: 300, // 5 minutes
    leverageRatio: 3
  }
});

const fundamentalBot = new TradingBot('value-investor', {
  strategy: 'fundamental',
  capital: 10000000,
  riskTolerance: 0.3,
  timeframe: 'monthly',
  parameters: {
    maxPERatio: 15,
    minDividendYield: 0.03,
    maxDebtToEquity: 0.5,
    holdingPeriod: 365 // days
  }
});

simulation.addTradingBot(momentumBot);
simulation.addTradingBot(arbitrageBot);
simulation.addTradingBot(fundamentalBot);

// Set macroeconomic conditions
simulation.setEconomicConditions({
  gdpGrowth: 0.025, // 2.5% annual
  inflationRate: 0.03, // 3%
  unemploymentRate: 0.045, // 4.5%
  interestRate: 0.0525, // 5.25%
  consumerConfidence: 0.75,
  marketSentiment: 'optimistic'
});

// Run simulation for one trading year
simulation.start();
for (let day = 0; day < 252; day++) { // 252 trading days
  const dailyStats = simulation.step(1); // 1 day

  if (day % 21 === 0) { // Monthly reporting
    const month = Math.floor(day / 21) + 1;
    console.log(`Month ${month} Summary:`);
    console.log(`- Tech Stock: $${stockMarket.getAsset('TECH-CORP').currentPrice.toFixed(2)}`);
    console.log(`- Gold: $${commodityMarket.getAsset('GOLD').currentPrice.toFixed(2)}`);
    console.log(`- EUR/USD: ${forexMarket.getAsset('EUR/USD').currentPrice.toFixed(4)}`);
    console.log(`- Market Cap: $${(dailyStats.totalMarketCap / 1e9).toFixed(1)}B`);
    console.log(`- Trading Volume: $${(dailyStats.totalVolume / 1e6).toFixed(1)}M`);
    console.log(`- VIX: ${dailyStats.volatilityIndex.toFixed(1)}`);
  }
}

// Generate comprehensive market analysis
const marketAnalysis = simulation.generateMarketAnalysis();
console.log('Annual Performance Summary:');
console.log(`- Best Performing Asset: ${marketAnalysis.topPerformer.name} (+${marketAnalysis.topPerformer.return.toFixed(1)}%)`);
console.log(`- Most Volatile: ${marketAnalysis.mostVolatile.name} (σ=${marketAnalysis.mostVolatile.volatility.toFixed(3)})`);
console.log(`- Top Trading Bot: ${marketAnalysis.topBot.name} (ROI: ${marketAnalysis.topBot.roi.toFixed(1)}%)`);

// Export for Unity visualization
const marketData = simulation.exportMarketState();
```

## Core Classes

### AdvancedEconomicsSimulation
Main economic simulation engine coordinating markets, traders, and macroeconomic conditions.

### Market
Individual financial markets with specific asset types and trading mechanisms.

### Asset
Financial instruments with price modeling, fundamental data, and technical indicators.

### TradingBot
AI traders implementing various strategies from high-frequency to long-term investing.

### EconomicIndicators
Macroeconomic data affecting market conditions and asset valuations.

## Game Integration

Perfect for:
- **Financial Strategy Games**: Stock market simulation and investment management
- **Business Tycoons**: Corporate finance and market manipulation
- **Economic Simulators**: Teaching finance and economic principles
- **City Builders**: Economic policy effects and market dynamics
- **Trading Games**: Realistic financial markets with multiple asset classes

## Asset Types

### Equities (Stocks)
Individual company stocks with fundamental analysis.

```typescript
const megaCorpStock = new Asset('MEGA', 'MegaCorp Industries', 'stock', {
  currentPrice: 245.75,
  marketCap: 1500000000000, // $1.5T
  volume: 15000000,
  volatility: 0.28,
  sector: 'technology',
  fundamentals: {
    peRatio: 28.5,
    pegRatio: 1.2,
    priceToBook: 4.1,
    dividendYield: 0.015,
    returnOnEquity: 0.18,
    debtToEquity: 0.25,
    currentRatio: 2.1,
    grossMargin: 0.65,
    operatingMargin: 0.25,
    netMargin: 0.18,
    revenue: 125000000000,
    netIncome: 22500000000,
    earningsGrowth: 0.12,
    revenueGrowth: 0.08
  },
  technicalIndicators: {
    rsi: 62.3,
    macd: { signal: 1.2, histogram: 0.8 },
    bollingerBands: { upper: 255, middle: 245, lower: 235 },
    movingAverages: { ma20: 242.1, ma50: 238.7, ma200: 225.4 }
  }
});
```

### Commodities
Physical goods with supply/demand fundamentals.

```typescript
const crudeoil = new Asset('CL', 'Crude Oil WTI', 'commodity', {
  currentPrice: 82.50, // per barrel
  volume: 800000,
  volatility: 0.35,
  fundamentals: {
    globalProduction: 82000000, // barrels per day
    globalConsumption: 81500000,
    oecdInventories: 2950000000, // barrels
    rigCount: 750,
    refineryCrackSpreads: 15.50,
    seasonalDemand: 'winter_high',
    geopoliticalRisk: 0.3
  },
  supplyFactors: {
    opecQuota: 32000000, // barrels per day
    shaleProduction: 12500000,
    strategicReserves: 650000000,
    weatherDisruptions: 0.02
  }
});
```

### Foreign Exchange
Currency pairs with macroeconomic drivers.

```typescript
const gbpJpy = new Asset('GBP/JPY', 'British Pound/Japanese Yen', 'currency', {
  currentPrice: 185.75,
  volume: 300000000,
  volatility: 0.14,
  fundamentals: {
    interestRateDifferential: 0.035, // 3.5%
    inflationDifferential: 0.008,
    gdpGrowthDifferential: 0.012,
    currentAccountBalance: -85000000000, // GBP
    politicalStability: 0.75,
    centralBankPolicy: 'hawkish'
  },
  correlations: {
    'EUR/GBP': -0.65,
    'USD/JPY': 0.78,
    'GBP/USD': 0.45
  }
});
```

### Cryptocurrencies
Digital assets with unique characteristics.

```typescript
const bitcoin = new Asset('BTC', 'Bitcoin', 'crypto', {
  currentPrice: 43500.00,
  volume: 25000000000,
  volatility: 0.65,
  fundamentals: {
    marketCap: 850000000000,
    circulatingSupply: 19500000,
    maxSupply: 21000000,
    hashRate: 450000000, // TH/s
    miningDifficulty: 62000000000000,
    transactionFees: 15.50,
    activeAddresses: 1200000,
    institutionalHoldings: 0.15
  },
  networkMetrics: {
    transactionsPerDay: 350000,
    averageBlockTime: 600, // seconds
    memPoolSize: 150, // MB
    lightningChannels: 75000
  }
});
```

## Trading Strategies

### Technical Analysis Bots
Chart-based trading algorithms.

```typescript
const technicalBot = new TradingBot('technical-analyst', {
  strategy: 'technical',
  parameters: {
    indicators: [
      {
        type: 'RSI',
        period: 14,
        overbought: 70,
        oversold: 30,
        weight: 0.3
      },
      {
        type: 'MACD',
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        weight: 0.4
      },
      {
        type: 'BollingerBands',
        period: 20,
        standardDeviations: 2,
        weight: 0.3
      }
    ],
    patterns: [
      'head_and_shoulders',
      'double_top',
      'triangle',
      'flag',
      'wedge'
    ],
    riskManagement: {
      stopLoss: 0.02, // 2%
      takeProfit: 0.06, // 6%
      positionSizing: 'kelly_criterion'
    }
  }
});
```

### High-Frequency Trading
Microsecond-level trading strategies.

```typescript
const hftBot = new TradingBot('hft-scalper', {
  strategy: 'high_frequency',
  capital: 50000000,
  parameters: {
    latency: 0.05, // milliseconds
    tickSize: 0.01,
    spreadThreshold: 0.001,
    inventoryLimit: 10000,
    maxHoldTime: 30, // seconds
    marketMaking: {
      bidAskSpread: 0.002,
      orderSize: 1000,
      refreshRate: 100 // per second
    },
    arbitrage: {
      venues: ['NYSE', 'NASDAQ', 'BATS'],
      minProfit: 0.0005,
      executionSpeed: 0.1 // milliseconds
    }
  }
});
```

### Quantitative Strategies
Mathematical model-based trading.

```typescript
const quantBot = new TradingBot('quant-fund', {
  strategy: 'quantitative',
  parameters: {
    models: [
      {
        type: 'mean_reversion',
        lookback: 60,
        zscore_threshold: 2.0,
        half_life: 10
      },
      {
        type: 'momentum',
        formation_period: 252,
        holding_period: 21,
        skip_period: 1
      },
      {
        type: 'pairs_trading',
        correlation_threshold: 0.8,
        cointegration_test: 'johansen',
        entry_threshold: 2.0,
        exit_threshold: 0.5
      }
    ],
    riskModel: {
      type: 'fama_french',
      factors: ['market', 'size', 'value', 'momentum'],
      constraints: {
        maxSectorWeight: 0.3,
        maxCountryWeight: 0.5,
        maxSingleAssetWeight: 0.05
      }
    }
  }
});
```

## Market Analysis

### Technical Indicators
Comprehensive chart analysis tools.

```typescript
const indicators = simulation.calculateTechnicalIndicators('TECH-CORP', {
  movingAverages: {
    simple: [20, 50, 200],
    exponential: [12, 26],
    weighted: [10, 20]
  },
  oscillators: {
    rsi: { period: 14 },
    stochastic: { k: 14, d: 3 },
    williams_r: { period: 14 },
    cci: { period: 20 }
  },
  trends: {
    macd: { fast: 12, slow: 26, signal: 9 },
    adx: { period: 14 },
    aroon: { period: 25 },
    parabolic_sar: { acceleration: 0.02, maximum: 0.2 }
  },
  volatility: {
    bollinger_bands: { period: 20, std_dev: 2 },
    keltner_channels: { period: 20, atr_mult: 2 },
    average_true_range: { period: 14 }
  }
});
```

### Fundamental Analysis
Economic and financial metrics evaluation.

```typescript
const fundamentals = simulation.analyzeFundamentals('TECH-CORP', {
  valuation: {
    dcf: {
      growthRate: 0.08,
      terminalGrowthRate: 0.03,
      discountRate: 0.10,
      projectionYears: 5
    },
    multiples: {
      peRatio: 'sector_relative',
      pegRatio: 'benchmark',
      evEbitda: 'historical_average',
      priceToBook: 'industry_median'
    }
  },
  financial_health: {
    liquidity: ['current_ratio', 'quick_ratio', 'cash_ratio'],
    leverage: ['debt_to_equity', 'interest_coverage', 'debt_to_assets'],
    efficiency: ['roa', 'roe', 'asset_turnover'],
    profitability: ['gross_margin', 'operating_margin', 'net_margin']
  },
  growth_analysis: {
    revenue: { historical: 5, projected: 3 },
    earnings: { historical: 5, projected: 3 },
    dividends: { historical: 10, sustainability: 'payout_ratio' }
  }
});
```

## Economic Modeling

### Macroeconomic Indicators
Economy-wide metrics affecting markets.

```typescript
const macroEcon = simulation.getEconomicIndicators();
console.log(`GDP Growth: ${(macroEcon.gdpGrowth * 100).toFixed(1)}%`);
console.log(`Inflation Rate: ${(macroEcon.inflation * 100).toFixed(1)}%`);
console.log(`Unemployment: ${(macroEcon.unemployment * 100).toFixed(1)}%`);
console.log(`Interest Rate: ${(macroEcon.federalFundsRate * 100).toFixed(2)}%`);
console.log(`Consumer Confidence: ${macroEcon.consumerConfidence.toFixed(1)}`);
console.log(`Manufacturing PMI: ${macroEcon.manufacturingPMI.toFixed(1)}`);
console.log(`Yield Curve: ${macroEcon.yieldCurve.shape}`);
```

### Sector Rotation
Industry performance cycles.

```typescript
const sectorAnalysis = simulation.analyzeSectorRotation();
console.log('Sector Performance:');
sectorAnalysis.sectors.forEach(sector => {
  console.log(`- ${sector.name}: ${(sector.performance * 100).toFixed(1)}%`);
  console.log(`  Stage: ${sector.economicStage}`);
  console.log(`  Outlook: ${sector.outlook}`);
});
```

## Risk Management

### Portfolio Risk Metrics
Comprehensive risk analysis tools.

```typescript
const riskMetrics = simulation.calculatePortfolioRisk(portfolioId, {
  timeHorizon: 252, // trading days
  confidenceLevel: 0.95,
  metrics: [
    'value_at_risk',
    'conditional_var',
    'maximum_drawdown',
    'sharpe_ratio',
    'sortino_ratio',
    'calmar_ratio',
    'information_ratio'
  ],
  decomposition: {
    factorModel: 'fama_french_5',
    stressTests: ['2008_crisis', 'covid_crash', 'dot_com_bubble'],
    scenarioAnalysis: ['bull_market', 'bear_market', 'sideways']
  }
});
```

### Stress Testing
Market scenario analysis.

```typescript
const stressTest = simulation.runStressTest({
  scenarios: [
    {
      name: 'market_crash',
      marketDrop: -0.30,
      volatilitySpike: 2.0,
      liquidityDry: 0.5,
      duration: 30 // days
    },
    {
      name: 'interest_rate_shock',
      rateIncrease: 0.02, // 200 basis points
      bondPriceImpact: -0.15,
      currencyVolatility: 1.5,
      duration: 90
    },
    {
      name: 'geopolitical_crisis',
      riskOffSentiment: 0.8,
      commoditySpike: 0.25,
      emergingMarketSelloff: -0.20,
      duration: 60
    }
  ]
});
```

## Configuration Options

```typescript
const config = {
  // Market structure
  markets: {
    tradingHours: {
      stock: { open: '09:30', close: '16:00', timezone: 'EST' },
      forex: '24/7',
      crypto: '24/7',
      commodity: { open: '09:00', close: '14:30', timezone: 'EST' }
    },
    latency: 'realistic', // instant, realistic, custom
    slippage: 'dynamic', // none, fixed, dynamic
    commissions: 'tiered' // none, flat, tiered
  },

  // Economic environment
  economy: {
    businessCycle: 'expansion', // recession, trough, expansion, peak
    inflationRegime: 'moderate', // low, moderate, high
    interestRateEnvironment: 'rising', // falling, stable, rising
    globalGrowth: 'synchronized' // decoupled, synchronized, divergent
  },

  // Simulation parameters
  realism: {
    marketMicrostructure: true,
    limitOrderBook: true,
    marketImpact: true,
    newsEvents: true,
    centralBankActions: true
  }
};
```

## Unity Integration

Export comprehensive financial market data:

```json
{
  "markets": {
    "stocks": {...},
    "commodities": {...},
    "forex": {...},
    "crypto": {...}
  },
  "economy": {
    "indicators": {...},
    "sectors": {...},
    "regions": {...}
  },
  "trading": {
    "bots": [...],
    "strategies": [...],
    "performance": {...}
  },
  "analytics": {
    "marketSentiment": 0.65,
    "volatilityIndex": 18.2,
    "riskMetrics": {...}
  }
}
```

## Examples

See `examples/basic/trading-simulation.ts` for a complete financial market simulation with multiple asset classes, algorithmic trading, and risk management.

## Performance

- Real-time simulation of 1000+ financial instruments
- High-frequency trading support with microsecond precision
- Advanced options pricing models (Black-Scholes, Monte Carlo)
- Scalable from single assets to global market simulation

## License

MIT