import { Market, EconomicIndicators, Transaction, Commodity } from '../types';

export class EconomicIndicatorsCalculator {
  private markets: Map<string, Market>;
  private transactions: Transaction[];

  constructor(markets: Map<string, Market>, transactions: Transaction[]) {
    this.markets = markets;
    this.transactions = transactions;
  }

  public calculateIndicators(timeWindow: number = 24 * 60 * 60 * 1000): EconomicIndicators {
    const now = Date.now();
    const recentTransactions = this.transactions.filter(
      t => t.timestamp >= now - timeWindow
    );

    return {
      gdp: this.calculateGDP(recentTransactions),
      unemployment: this.calculateUnemployment(),
      inflation: this.calculateInflation(timeWindow),
      marketCap: this.calculateMarketCap(),
      tradingVolume: this.calculateTradingVolume(recentTransactions),
      priceIndex: this.calculatePriceIndex()
    };
  }

  private calculateGDP(transactions: Transaction[]): number {
    return transactions.reduce((total, transaction) => {
      return total + (transaction.quantity * transaction.price);
    }, 0);
  }

  private calculateUnemployment(): number {
    let totalParticipants = 0;
    let activeParticipants = 0;

    for (const market of this.markets.values()) {
      totalParticipants += market.participants.length;
      activeParticipants += market.participants.filter(p => p.capital > 0).length;
    }

    if (totalParticipants === 0) return 0;
    return ((totalParticipants - activeParticipants) / totalParticipants) * 100;
  }

  private calculateInflation(timeWindow: number): number {
    const now = Date.now();
    const oldPrices = new Map<string, number>();
    const currentPrices = new Map<string, number>();

    for (const market of this.markets.values()) {
      for (const commodity of market.commodities.values()) {
        currentPrices.set(commodity.id, commodity.currentPrice);

        const oldHistory = market.history.find(
          h => h.commodityId === commodity.id && h.timestamp <= now - timeWindow
        );
        if (oldHistory) {
          oldPrices.set(commodity.id, oldHistory.price);
        } else {
          oldPrices.set(commodity.id, commodity.basePrice);
        }
      }
    }

    let totalInflation = 0;
    let commodityCount = 0;

    for (const [commodityId, currentPrice] of currentPrices) {
      const oldPrice = oldPrices.get(commodityId);
      if (oldPrice && oldPrice > 0) {
        const inflation = ((currentPrice - oldPrice) / oldPrice) * 100;
        totalInflation += inflation;
        commodityCount++;
      }
    }

    return commodityCount > 0 ? totalInflation / commodityCount : 0;
  }

  private calculateMarketCap(): number {
    let totalCap = 0;

    for (const market of this.markets.values()) {
      for (const commodity of market.commodities.values()) {
        totalCap += commodity.currentPrice * commodity.supply;
      }
    }

    return totalCap;
  }

  private calculateTradingVolume(transactions: Transaction[]): number {
    return transactions.reduce((total, transaction) => {
      return total + transaction.quantity;
    }, 0);
  }

  private calculatePriceIndex(): number {
    const commodities: Commodity[] = [];

    for (const market of this.markets.values()) {
      commodities.push(...Array.from(market.commodities.values()));
    }

    if (commodities.length === 0) return 100;

    const totalWeightedChange = commodities.reduce((total, commodity) => {
      const change = (commodity.currentPrice / commodity.basePrice) * 100;
      return total + change;
    }, 0);

    return totalWeightedChange / commodities.length;
  }

  public calculateCommodityPerformance(commodityId: string, timeWindow: number = 24 * 60 * 60 * 1000): {
    priceChange: number;
    volumeChange: number;
    volatility: number;
  } {
    const now = Date.now();
    let commodity: Commodity | undefined;
    let market: Market | undefined;

    for (const m of this.markets.values()) {
      const c = m.commodities.get(commodityId);
      if (c) {
        commodity = c;
        market = m;
        break;
      }
    }

    if (!commodity || !market) {
      return { priceChange: 0, volumeChange: 0, volatility: 0 };
    }

    const recentHistory = market.history.filter(
      h => h.commodityId === commodityId && h.timestamp >= now - timeWindow
    );

    if (recentHistory.length === 0) {
      return { priceChange: 0, volumeChange: 0, volatility: 0 };
    }

    const oldestPrice = recentHistory[0].price;
    const latestPrice = commodity.currentPrice;
    const priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;

    const totalVolume = recentHistory.reduce((sum, h) => sum + h.volume, 0);
    const volumeChange = totalVolume;

    const prices = recentHistory.map(h => h.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100;

    return { priceChange, volumeChange, volatility };
  }

  public getTopPerformers(limit: number = 10): Array<{
    commodityId: string;
    performance: number;
    currentPrice: number;
  }> {
    const performers: Array<{
      commodityId: string;
      performance: number;
      currentPrice: number;
    }> = [];

    for (const market of this.markets.values()) {
      for (const commodity of market.commodities.values()) {
        const performance = ((commodity.currentPrice - commodity.basePrice) / commodity.basePrice) * 100;
        performers.push({
          commodityId: commodity.id,
          performance,
          currentPrice: commodity.currentPrice
        });
      }
    }

    return performers
      .sort((a, b) => b.performance - a.performance)
      .slice(0, limit);
  }
}