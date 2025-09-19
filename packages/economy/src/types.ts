export interface EconomyConfig {
  baseCurrency: string;
  inflationRate: number;
  interestRate: number;
  marketVolatility: number;
  updateInterval: number;
}

export interface Market {
  id: string;
  name: string;
  type: MarketType;
  commodities: Map<string, Commodity>;
  participants: MarketParticipant[];
  history: PriceHistory[];
}

export interface Commodity {
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

export interface MarketParticipant {
  id: string;
  name: string;
  type: ParticipantType;
  capital: number;
  inventory: Map<string, number>;
  behavior: BehaviorProfile;
}

export interface BehaviorProfile {
  riskTolerance: number;
  buyThreshold: number;
  sellThreshold: number;
  maxTransactionSize: number;
  preferredCommodities: string[];
}

export interface Transaction {
  id: string;
  timestamp: number;
  buyerId: string;
  sellerId: string;
  commodityId: string;
  quantity: number;
  price: number;
  marketId: string;
}

export interface PriceHistory {
  timestamp: number;
  commodityId: string;
  price: number;
  volume: number;
  marketId: string;
}

export interface EconomicIndicators {
  gdp: number;
  unemployment: number;
  inflation: number;
  marketCap: number;
  tradingVolume: number;
  priceIndex: number;
}

export enum MarketType {
  COMMODITY = 'commodity',
  STOCK = 'stock',
  CURRENCY = 'currency',
  FUTURES = 'futures'
}

export enum ParticipantType {
  INDIVIDUAL = 'individual',
  CORPORATION = 'corporation',
  GOVERNMENT = 'government',
  AI_AGENT = 'ai_agent'
}

export interface MarketEvent {
  type: 'price_change' | 'transaction' | 'market_open' | 'market_close';
  data: any;
  timestamp: number;
  marketId: string;
}

export interface SupplyDemandCurve {
  commodity: string;
  supplyPoints: Array<{ price: number; quantity: number }>;
  demandPoints: Array<{ price: number; quantity: number }>;
  equilibriumPrice: number;
  equilibriumQuantity: number;
}