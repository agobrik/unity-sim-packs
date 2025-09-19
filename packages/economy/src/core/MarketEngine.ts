import { EventEmitter, timer } from '../utils/EventEmitter';
import {
  Market,
  Commodity,
  Transaction,
  MarketParticipant,
  MarketEvent,
  EconomyConfig,
  SupplyDemandCurve,
  PriceHistory
} from '../types';

export class MarketEngine extends EventEmitter {
  private markets: Map<string, Market> = new Map();
  private transactions: Transaction[] = [];
  private config: EconomyConfig;
  private isRunning: boolean = false;
  private updateTimer?: any;

  constructor(config: EconomyConfig) {
    super();
    this.config = config;
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateTimer = timer.setInterval(() => {
      this.updateMarkets();
    }, this.config.updateInterval);

    this.emit('engine_started');
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateTimer) {
      timer.clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.emit('engine_stopped');
  }

  public createMarket(market: Omit<Market, 'commodities' | 'participants' | 'history'>): Market {
    const newMarket: Market = {
      ...market,
      commodities: new Map(),
      participants: [],
      history: []
    };

    this.markets.set(market.id, newMarket);
    this.emit('market_created', newMarket);
    return newMarket;
  }

  public addCommodity(marketId: string, commodity: Commodity): boolean {
    const market = this.markets.get(marketId);
    if (!market) return false;

    market.commodities.set(commodity.id, commodity);
    this.emit('commodity_added', { marketId, commodity });
    return true;
  }

  public addParticipant(marketId: string, participant: MarketParticipant): boolean {
    const market = this.markets.get(marketId);
    if (!market) return false;

    market.participants.push(participant);
    this.emit('participant_added', { marketId, participant });
    return true;
  }

  public executeTrade(
    marketId: string,
    buyerId: string,
    sellerId: string,
    commodityId: string,
    quantity: number,
    price: number
  ): Transaction | null {
    const market = this.markets.get(marketId);
    if (!market) return null;

    const commodity = market.commodities.get(commodityId);
    if (!commodity) return null;

    const buyer = market.participants.find(p => p.id === buyerId);
    const seller = market.participants.find(p => p.id === sellerId);

    if (!buyer || !seller) return null;

    const totalCost = quantity * price;
    if (buyer.capital < totalCost) return null;

    const sellerInventory = seller.inventory.get(commodityId) || 0;
    if (sellerInventory < quantity) return null;

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      buyerId,
      sellerId,
      commodityId,
      quantity,
      price,
      marketId
    };

    buyer.capital -= totalCost;
    seller.capital += totalCost;

    const buyerInventory = buyer.inventory.get(commodityId) || 0;
    buyer.inventory.set(commodityId, buyerInventory + quantity);
    seller.inventory.set(commodityId, sellerInventory - quantity);

    commodity.currentPrice = price;
    commodity.lastUpdate = Date.now();

    this.transactions.push(transaction);

    const priceHistory: PriceHistory = {
      timestamp: Date.now(),
      commodityId,
      price,
      volume: quantity,
      marketId
    };
    market.history.push(priceHistory);

    this.emit('transaction_executed', transaction);
    this.emit('price_change', { commodityId, oldPrice: commodity.currentPrice, newPrice: price });

    return transaction;
  }

  public calculateSupplyDemand(marketId: string, commodityId: string): SupplyDemandCurve | null {
    const market = this.markets.get(marketId);
    if (!market) return null;

    const commodity = market.commodities.get(commodityId);
    if (!commodity) return null;

    const priceRange = this.generatePriceRange(commodity.currentPrice);
    const supplyPoints = priceRange.map(price => ({
      price,
      quantity: this.calculateSupplyAtPrice(market, commodityId, price)
    }));

    const demandPoints = priceRange.map(price => ({
      price,
      quantity: this.calculateDemandAtPrice(market, commodityId, price)
    }));

    const equilibrium = this.findEquilibrium(supplyPoints, demandPoints);

    return {
      commodity: commodityId,
      supplyPoints,
      demandPoints,
      equilibriumPrice: equilibrium.price,
      equilibriumQuantity: equilibrium.quantity
    };
  }

  public getMarketData(marketId: string): Market | undefined {
    return this.markets.get(marketId);
  }

  public getAllMarkets(): Market[] {
    return Array.from(this.markets.values());
  }

  public getTransactionHistory(marketId?: string): Transaction[] {
    if (marketId) {
      return this.transactions.filter(t => t.marketId === marketId);
    }
    return [...this.transactions];
  }

  private updateMarkets(): void {
    for (const market of this.markets.values()) {
      this.updateMarketPrices(market);
      this.simulateTrading(market);
    }
  }

  private updateMarketPrices(market: Market): void {
    for (const commodity of market.commodities.values()) {
      const volatilityFactor = (Math.random() - 0.5) * commodity.volatility;
      const supplyDemandRatio = commodity.supply / Math.max(commodity.demand, 1);
      const marketFactor = (1 / supplyDemandRatio - 1) * 0.1;

      const priceChange = commodity.currentPrice * (volatilityFactor + marketFactor) * this.config.marketVolatility;
      commodity.currentPrice = Math.max(0.01, commodity.currentPrice + priceChange);
      commodity.lastUpdate = Date.now();

      this.emit('price_update', {
        commodityId: commodity.id,
        price: commodity.currentPrice,
        marketId: market.id
      });
    }
  }

  private simulateTrading(market: Market): void {
    const activeParticipants = market.participants.filter(p => p.capital > 0);

    for (let i = 0; i < Math.min(5, activeParticipants.length); i++) {
      const buyer = activeParticipants[Math.floor(Math.random() * activeParticipants.length)];
      const seller = activeParticipants[Math.floor(Math.random() * activeParticipants.length)];

      if (buyer === seller) continue;

      const commodities = Array.from(market.commodities.values());
      if (commodities.length === 0) continue;

      const commodity = commodities[Math.floor(Math.random() * commodities.length)];
      const sellerInventory = seller.inventory.get(commodity.id) || 0;

      if (sellerInventory > 0 && buyer.capital > commodity.currentPrice) {
        const maxQuantity = Math.min(
          sellerInventory,
          Math.floor(buyer.capital / commodity.currentPrice),
          buyer.behavior.maxTransactionSize
        );

        if (maxQuantity > 0) {
          const quantity = Math.ceil(Math.random() * maxQuantity);
          const priceVariation = (Math.random() - 0.5) * 0.1;
          const price = commodity.currentPrice * (1 + priceVariation);

          this.executeTrade(market.id, buyer.id, seller.id, commodity.id, quantity, price);
        }
      }
    }
  }

  private generatePriceRange(basePrice: number): number[] {
    const range = [];
    const step = basePrice * 0.1;
    for (let i = 0.1; i <= 2; i += 0.1) {
      range.push(basePrice * i);
    }
    return range;
  }

  private calculateSupplyAtPrice(market: Market, commodityId: string, price: number): number {
    let totalSupply = 0;

    for (const participant of market.participants) {
      const inventory = participant.inventory.get(commodityId) || 0;
      const sellThreshold = participant.behavior.sellThreshold;

      if (price >= sellThreshold) {
        const willingSell = inventory * Math.min(1, (price - sellThreshold) / sellThreshold);
        totalSupply += willingSell;
      }
    }

    return totalSupply;
  }

  private calculateDemandAtPrice(market: Market, commodityId: string, price: number): number {
    let totalDemand = 0;

    for (const participant of market.participants) {
      const buyThreshold = participant.behavior.buyThreshold;
      const maxSpend = participant.capital * 0.1;

      if (price <= buyThreshold && participant.capital > price) {
        const maxQuantity = Math.floor(maxSpend / price);
        const willingBuy = maxQuantity * Math.max(0, (buyThreshold - price) / buyThreshold);
        totalDemand += willingBuy;
      }
    }

    return totalDemand;
  }

  private findEquilibrium(
    supplyPoints: Array<{ price: number; quantity: number }>,
    demandPoints: Array<{ price: number; quantity: number }>
  ): { price: number; quantity: number } {
    let bestMatch = { price: 0, quantity: 0, diff: Infinity };

    for (const supply of supplyPoints) {
      const demand = demandPoints.find(d => Math.abs(d.price - supply.price) < 0.01);
      if (demand) {
        const diff = Math.abs(supply.quantity - demand.quantity);
        if (diff < bestMatch.diff) {
          bestMatch = {
            price: supply.price,
            quantity: Math.min(supply.quantity, demand.quantity),
            diff
          };
        }
      }
    }

    return bestMatch;
  }
}