export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  currentPrice: number;
  volume: number;
  marketCap: number;
  volatility: number;
  fundamentals: AssetFundamentals;
}

export enum AssetType {
  STOCK = 'stock',
  COMMODITY = 'commodity',
  CURRENCY = 'currency',
  BOND = 'bond',
  CRYPTO = 'crypto',
  DERIVATIVE = 'derivative'
}

export interface AssetFundamentals {
  peRatio?: number;
  dividendYield?: number;
  bookValue?: number;
  revenue?: number;
  earningsGrowth?: number;
  debtToEquity?: number;
}

export interface Order {
  id: string;
  assetId: string;
  type: OrderType;
  side: OrderSide;
  quantity: number;
  price?: number;
  timestamp: number;
  status: OrderStatus;
  traderId: string;
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  FILLED = 'filled',
  CANCELLED = 'cancelled'
}

export interface Trade {
  id: string;
  assetId: string;
  buyOrderId: string;
  sellOrderId: string;
  quantity: number;
  price: number;
  timestamp: number;
}

export class Market {
  private assets: Map<string, Asset>;
  private orders: Map<string, Order>;
  private trades: Trade[];
  private orderBook: Map<string, { bids: Order[]; asks: Order[] }>;
  private priceHistory: Map<string, Array<{ timestamp: number; price: number }>>;

  constructor() {
    this.assets = new Map();
    this.orders = new Map();
    this.trades = [];
    this.orderBook = new Map();
    this.priceHistory = new Map();
  }

  addAsset(asset: Asset): void {
    this.assets.set(asset.id, asset);
    this.orderBook.set(asset.id, { bids: [], asks: [] });
    this.priceHistory.set(asset.id, []);
  }

  submitOrder(order: Order): string {
    this.orders.set(order.id, order);

    const book = this.orderBook.get(order.assetId);
    if (!book) throw new Error(`Asset ${order.assetId} not found`);

    if (order.side === OrderSide.BUY) {
      book.bids.push(order);
      book.bids.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      book.asks.push(order);
      book.asks.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    this.matchOrders(order.assetId);
    return order.id;
  }

  private matchOrders(assetId: string): void {
    const book = this.orderBook.get(assetId);
    if (!book) return;

    while (book.bids.length > 0 && book.asks.length > 0) {
      const bestBid = book.bids[0];
      const bestAsk = book.asks[0];

      if (!bestBid.price || !bestAsk.price || bestBid.price < bestAsk.price) break;

      const tradeQuantity = Math.min(bestBid.quantity, bestAsk.quantity);
      const tradePrice = bestAsk.price; // Price taker pays

      const trade: Trade = {
        id: this.generateTradeId(),
        assetId,
        buyOrderId: bestBid.id,
        sellOrderId: bestAsk.id,
        quantity: tradeQuantity,
        price: tradePrice,
        timestamp: Date.now()
      };

      this.trades.push(trade);

      // Update orders
      bestBid.quantity -= tradeQuantity;
      bestAsk.quantity -= tradeQuantity;

      if (bestBid.quantity === 0) {
        bestBid.status = OrderStatus.FILLED;
        book.bids.shift();
      }

      if (bestAsk.quantity === 0) {
        bestAsk.status = OrderStatus.FILLED;
        book.asks.shift();
      }

      // Update asset price
      const asset = this.assets.get(assetId);
      if (asset) {
        asset.currentPrice = tradePrice;
        asset.volume += tradeQuantity;

        const history = this.priceHistory.get(assetId);
        if (history) {
          history.push({ timestamp: trade.timestamp, price: tradePrice });
          if (history.length > 1000) history.shift();
        }
      }
    }
  }

  updateMarket(deltaTime: number): void {
    // Update asset prices based on market forces
    for (const asset of this.assets.values()) {
      this.updateAssetPrice(asset, deltaTime);
    }

    // Clean up old orders
    this.cleanupOrders();
  }

  private updateAssetPrice(asset: Asset, deltaTime: number): void {
    // Simple price movement based on volatility and random walk
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    const priceChange = asset.currentPrice * asset.volatility * randomFactor * deltaTime;

    // Add fundamental analysis influence
    const fundamentalInfluence = this.calculateFundamentalInfluence(asset);

    asset.currentPrice = Math.max(0.01, asset.currentPrice + priceChange + fundamentalInfluence);

    // Update market cap
    asset.marketCap = asset.currentPrice * asset.volume;
  }

  private calculateFundamentalInfluence(asset: Asset): number {
    let influence = 0;

    if (asset.fundamentals.peRatio) {
      // High P/E ratio might indicate overvaluation
      if (asset.fundamentals.peRatio > 25) influence -= 0.01;
      if (asset.fundamentals.peRatio < 15) influence += 0.01;
    }

    if (asset.fundamentals.earningsGrowth) {
      influence += asset.fundamentals.earningsGrowth * 0.001;
    }

    return influence;
  }

  private cleanupOrders(): void {
    const expiredTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [orderId, order] of this.orders.entries()) {
      if (order.timestamp < expiredTime && order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CANCELLED;
        this.removeOrderFromBook(order);
      }
    }
  }

  private removeOrderFromBook(order: Order): void {
    const book = this.orderBook.get(order.assetId);
    if (!book) return;

    if (order.side === OrderSide.BUY) {
      const index = book.bids.findIndex(o => o.id === order.id);
      if (index !== -1) book.bids.splice(index, 1);
    } else {
      const index = book.asks.findIndex(o => o.id === order.id);
      if (index !== -1) book.asks.splice(index, 1);
    }
  }

  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  getOrderBook(assetId: string): { bids: Order[]; asks: Order[] } | undefined {
    return this.orderBook.get(assetId);
  }

  getTrades(assetId?: string): Trade[] {
    if (assetId) {
      return this.trades.filter(trade => trade.assetId === assetId);
    }
    return [...this.trades];
  }

  getPriceHistory(assetId: string): Array<{ timestamp: number; price: number }> {
    return this.priceHistory.get(assetId) || [];
  }

  getMarketStats(): {
    totalMarketCap: number;
    totalVolume: number;
    averageVolatility: number;
    topGainers: Asset[];
    topLosers: Asset[];
  } {
    const assets = Array.from(this.assets.values());

    const totalMarketCap = assets.reduce((sum, asset) => sum + asset.marketCap, 0);
    const totalVolume = assets.reduce((sum, asset) => sum + asset.volume, 0);
    const averageVolatility = assets.reduce((sum, asset) => sum + asset.volatility, 0) / assets.length;

    // Calculate price changes (simplified)
    const assetsWithChange = assets.map(asset => {
      const history = this.priceHistory.get(asset.id) || [];
      const change = history.length > 1 ?
        (history[history.length - 1].price - history[history.length - 2].price) / history[history.length - 2].price : 0;
      return { ...asset, priceChange: change };
    });

    const topGainers = assetsWithChange
      .sort((a, b) => b.priceChange - a.priceChange)
      .slice(0, 5);

    const topLosers = assetsWithChange
      .sort((a, b) => a.priceChange - b.priceChange)
      .slice(0, 5);

    return {
      totalMarketCap,
      totalVolume,
      averageVolatility,
      topGainers,
      topLosers
    };
  }

  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  exportMarketData(): string {
    return JSON.stringify({
      assets: Array.from(this.assets.entries()),
      orders: Array.from(this.orders.entries()),
      trades: this.trades,
      priceHistory: Array.from(this.priceHistory.entries()),
      marketStats: this.getMarketStats()
    }, null, 2);
  }
}