export {
  Market,
  Asset,
  AssetType,
  AssetFundamentals,
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
  Trade
} from './core/Market';

import { Market, Asset, AssetType, AssetFundamentals, Order, OrderType, OrderSide, OrderStatus, Trade } from './core/Market';

export class AdvancedEconomicsSimulation {
  private market: Market;
  private currentTime: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.market = new Market();
  }

  getMarket(): Market {
    return this.market;
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(deltaTime: number = 1): boolean {
    if (!this.isRunning) return false;

    this.currentTime += deltaTime;
    this.market.updateMarket(deltaTime);
    return true;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.market = new Market();
  }

  exportState(): string {
    const marketData = JSON.parse(this.market.exportMarketData());
    const state = {
      ...marketData,
      currentTime: this.currentTime,
      timestamp: Date.now()
    };

    return JSON.stringify(state, null, 2);
  }
}