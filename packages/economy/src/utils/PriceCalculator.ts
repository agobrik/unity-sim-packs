import { Commodity, MarketParticipant } from '../types';

export class PriceCalculator {
  public static calculateDynamicPrice(
    commodity: Commodity,
    supply: number,
    demand: number,
    marketVolatility: number = 0.1
  ): number {
    const supplyDemandRatio = supply / Math.max(demand, 0.001);

    let priceMultiplier = 1;
    if (supplyDemandRatio > 1) {
      priceMultiplier = 0.5 + (0.5 / supplyDemandRatio);
    } else {
      priceMultiplier = 1 + (1 - supplyDemandRatio) * 0.5;
    }

    const volatilityFactor = (Math.random() - 0.5) * marketVolatility;
    const newPrice = commodity.basePrice * priceMultiplier * (1 + volatilityFactor);

    return Math.max(0.01, newPrice);
  }

  public static calculateElasticityOfDemand(
    priceHistory: Array<{ price: number; quantity: number }>
  ): number {
    if (priceHistory.length < 2) return 0;

    const recentData = priceHistory.slice(-10);
    let totalElasticity = 0;
    let validPoints = 0;

    for (let i = 1; i < recentData.length; i++) {
      const current = recentData[i];
      const previous = recentData[i - 1];

      const priceChange = (current.price - previous.price) / previous.price;
      const quantityChange = (current.quantity - previous.quantity) / Math.max(previous.quantity, 1);

      if (priceChange !== 0) {
        const elasticity = quantityChange / priceChange;
        totalElasticity += elasticity;
        validPoints++;
      }
    }

    return validPoints > 0 ? totalElasticity / validPoints : 0;
  }

  public static calculateFairValue(
    commodity: Commodity,
    marketConditions: {
      averagePrice: number;
      totalSupply: number;
      totalDemand: number;
      inflationRate: number;
    }
  ): number {
    const supplyDemandScore = marketConditions.totalDemand / Math.max(marketConditions.totalSupply, 1);
    const inflationAdjustment = 1 + (marketConditions.inflationRate / 100);
    const marketPremium = marketConditions.averagePrice / commodity.basePrice;

    const fairValue = commodity.basePrice *
      Math.sqrt(supplyDemandScore) *
      inflationAdjustment *
      Math.pow(marketPremium, 0.3);

    return Math.max(commodity.basePrice * 0.1, fairValue);
  }

  public static calculatePriceTarget(
    commodity: Commodity,
    participant: MarketParticipant,
    isBuying: boolean
  ): number {
    const basePrice = commodity.currentPrice;
    const riskFactor = participant.behavior.riskTolerance;

    if (isBuying) {
      const discount = (1 - riskFactor) * 0.2;
      return basePrice * (1 - discount);
    } else {
      const premium = riskFactor * 0.3;
      return basePrice * (1 + premium);
    }
  }

  public static calculateMovingAverage(
    prices: number[],
    period: number = 10
  ): number[] {
    const movingAverages: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      movingAverages.push(sum / period);
    }

    return movingAverages;
  }

  public static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    standardDeviations: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const movingAverages = this.calculateMovingAverage(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < movingAverages.length; i++) {
      const priceSlice = prices.slice(i, i + period);
      const average = movingAverages[i];

      const variance = priceSlice.reduce((sum, price) => {
        return sum + Math.pow(price - average, 2);
      }, 0) / period;

      const standardDeviation = Math.sqrt(variance);

      upper.push(average + (standardDeviations * standardDeviation));
      lower.push(average - (standardDeviations * standardDeviation));
    }

    return {
      upper,
      middle: movingAverages,
      lower
    };
  }

  public static calculateRSI(
    prices: number[],
    period: number = 14
  ): number[] {
    if (prices.length < period + 1) return [];

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const rsiValues: number[] = [];

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        rsiValues.push(rsi);
      }
    }

    return rsiValues;
  }

  public static identifyTrendDirection(
    prices: number[],
    period: number = 10
  ): 'uptrend' | 'downtrend' | 'sideways' {
    if (prices.length < period) return 'sideways';

    const recentPrices = prices.slice(-period);
    const firstHalf = recentPrices.slice(0, Math.floor(period / 2));
    const secondHalf = recentPrices.slice(Math.floor(period / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 2) return 'uptrend';
    if (percentChange < -2) return 'downtrend';
    return 'sideways';
  }
}