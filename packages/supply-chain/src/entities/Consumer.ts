/**
 * Consumer Entity - Represents consumers and demand sources in the supply chain
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  EntityId,
  ProductId,
  TimeStamp,
  EventType,
  OperationResult,
  QualityLevel,
  Coordinates,
  DemandPattern,
  PriceElasticity
} from '../core/types';

export interface ConsumerSpec {
  id: EntityId;
  name: string;
  type: ConsumerType;
  segment: ConsumerSegment;
  location: Coordinates;
  demographics: Demographics;
  preferences: ConsumerPreferences;
  behavior: ConsumerBehavior;
  purchasingPower: PurchasingPower;
  loyaltyPrograms: LoyaltyProgram[];
  communicationChannels: CommunicationChannel[];
}

export enum ConsumerType {
  INDIVIDUAL = 'individual',
  HOUSEHOLD = 'household',
  BUSINESS = 'business',
  GOVERNMENT = 'government',
  INSTITUTION = 'institution',
  RETAILER = 'retailer',
  DISTRIBUTOR = 'distributor',
  MANUFACTURER = 'manufacturer'
}

export enum ConsumerSegment {
  BUDGET_CONSCIOUS = 'budget_conscious',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
  VALUE_SEEKER = 'value_seeker',
  EARLY_ADOPTER = 'early_adopter',
  ENVIRONMENTALLY_CONSCIOUS = 'environmentally_conscious',
  CONVENIENCE_FOCUSED = 'convenience_focused',
  QUALITY_FOCUSED = 'quality_focused'
}

export interface Demographics {
  ageGroup: string;
  incomeLevel: string;
  education: string;
  occupation: string;
  familySize: number;
  urbanicity: 'urban' | 'suburban' | 'rural';
  culturalBackground: string;
}

export interface ConsumerPreferences {
  preferredBrands: string[];
  priceRange: PriceRange;
  qualityImportance: number; // 1-10 scale
  sustainabilityImportance: number; // 1-10 scale
  convenienceImportance: number; // 1-10 scale
  brandLoyalty: number; // 1-10 scale
  productAttributes: AttributePreference[];
  deliveryPreferences: DeliveryPreference[];
  paymentPreferences: PaymentPreference[];
}

export interface PriceRange {
  minimum: number;
  maximum: number;
  preferred: number;
  elasticity: PriceElasticity;
}

export interface AttributePreference {
  attribute: string;
  importance: number; // 1-10 scale
  preferredValue: string | number;
  acceptableRange?: { min: number; max: number };
}

export interface DeliveryPreference {
  method: 'standard' | 'express' | 'same_day' | 'pickup' | 'scheduled';
  maxTime: number; // hours
  maxCost: number;
  importance: number; // 1-10 scale
}

export interface PaymentPreference {
  method: 'cash' | 'credit' | 'debit' | 'digital' | 'financing';
  preference: number; // 1-10 scale
  limitations?: PaymentLimitation[];
}

export interface PaymentLimitation {
  type: 'credit_limit' | 'daily_limit' | 'monthly_limit';
  amount: number;
}

export interface ConsumerBehavior {
  purchaseFrequency: PurchaseFrequency;
  seasonality: SeasonalBehavior[];
  impulseLevel: number; // 1-10 scale
  researchTendency: number; // 1-10 scale
  brandSwitching: BrandSwitchingBehavior;
  referralTendency: number; // 1-10 scale
  complaintBehavior: ComplaintBehavior;
  socialInfluence: SocialInfluenceFactor[];
}

export interface PurchaseFrequency {
  pattern: 'regular' | 'seasonal' | 'opportunistic' | 'need_based';
  averageInterval: number; // days
  variability: number; // standard deviation
  peakPeriods: PeakPeriod[];
}

export interface PeakPeriod {
  name: string;
  startDate: string; // MM-DD format
  endDate: string; // MM-DD format
  demandMultiplier: number;
}

export interface SeasonalBehavior {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  demandChange: number; // percentage change
  priceToleranceChange: number; // percentage change
  preferenceShifts: string[];
}

export interface BrandSwitchingBehavior {
  likelihood: number; // 1-10 scale
  triggers: SwitchingTrigger[];
  considerationSet: string[];
  decisionTime: number; // days
}

export interface SwitchingTrigger {
  type: 'price' | 'quality' | 'availability' | 'promotion' | 'experience';
  threshold: number;
  impact: number; // 1-10 scale
}

export interface ComplaintBehavior {
  likelihood: number; // 1-10 scale
  preferredChannels: string[];
  escalationTendency: number; // 1-10 scale
  publicSharingTendency: number; // 1-10 scale
}

export interface SocialInfluenceFactor {
  source: 'family' | 'friends' | 'social_media' | 'reviews' | 'influencers';
  influence: number; // 1-10 scale
  trustLevel: number; // 1-10 scale
}

export interface PurchasingPower {
  annualBudget: number;
  discretionaryIncome: number;
  creditLimit: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  financialStability: number; // 1-10 scale
}

export interface LoyaltyProgram {
  programId: string;
  name: string;
  type: 'points' | 'tiers' | 'cashback' | 'discounts';
  membershipLevel: string;
  points: number;
  benefits: LoyaltyBenefit[];
  enrollmentDate: TimeStamp;
  lastActivity: TimeStamp;
}

export interface LoyaltyBenefit {
  type: string;
  value: number;
  conditions: string[];
  expiryDate?: TimeStamp;
}

export interface CommunicationChannel {
  type: 'email' | 'sms' | 'push' | 'mail' | 'phone' | 'social';
  preference: number; // 1-10 scale
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'as_needed';
  optIn: boolean;
  effectiveness: number; // 1-10 scale
}

export interface ConsumerDemand {
  id: string;
  consumerId: EntityId;
  productId: ProductId;
  quantity: number;
  maxPrice: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  qualityRequirement: QualityLevel;
  deliveryWindow: TimeWindow;
  flexibilityFactors: FlexibilityFactor[];
  substitutionAcceptance: SubstitutionPreference[];
  status: DemandStatus;
  createdDate: TimeStamp;
  fulfillmentDate?: TimeStamp;
}

export interface TimeWindow {
  earliest: TimeStamp;
  latest: TimeStamp;
  preferred?: TimeStamp;
}

export interface FlexibilityFactor {
  dimension: 'price' | 'quality' | 'timing' | 'quantity' | 'substitution';
  flexibility: number; // 1-10 scale
  tradeoffRatio: number; // how much consumer is willing to trade off
}

export interface SubstitutionPreference {
  productId: ProductId;
  acceptabilityScore: number; // 1-10 scale
  priceAdjustment: number; // percentage
  conditions: string[];
}

export enum DemandStatus {
  ACTIVE = 'active',
  FULFILLED = 'fulfilled',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export interface PurchaseHistory {
  id: string;
  productId: ProductId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: TimeStamp;
  deliveryDate?: TimeStamp;
  qualityRating?: number;
  serviceRating?: number;
  satisfaction: number; // 1-10 scale
  repurchaseIntention: number; // 1-10 scale
  referralLikelihood: number; // 1-10 scale
  channel: string;
  promotions: string[];
}

export interface ConsumerFeedback {
  id: string;
  type: 'complaint' | 'compliment' | 'suggestion' | 'review';
  productId?: ProductId;
  subject: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channel: string;
  timestamp: TimeStamp;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: FeedbackResolution;
  publicVisibility: boolean;
}

export interface FeedbackResolution {
  timestamp: TimeStamp;
  action: string;
  compensation?: CompensationOffer;
  satisfactionImprovement: number;
  followUpRequired: boolean;
}

export interface CompensationOffer {
  type: 'refund' | 'replacement' | 'discount' | 'credit' | 'service';
  value: number;
  conditions: string[];
  expiryDate?: TimeStamp;
}

export class Consumer extends EventEmitter {
  private spec: ConsumerSpec;
  private demands: Map<string, ConsumerDemand> = new Map();
  private purchaseHistory: PurchaseHistory[] = [];
  private feedback: ConsumerFeedback[] = [];
  private eventBus: EventBus;
  private currentSatisfaction: number = 80;
  private lifetimeValue: number = 0;

  constructor(spec: ConsumerSpec, eventBus: EventBus) {
    super();
    this.spec = spec;
    this.eventBus = eventBus;
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('demand-created', (demand) => {
      this.eventBus.emit(EventType.DEMAND_SPIKE, this.spec.id, {
        demandId: demand.id,
        productId: demand.productId,
        quantity: demand.quantity,
        urgency: demand.urgency
      });
    });

    this.on('purchase-completed', (purchase) => {
      this.updateLifetimeValue(purchase.totalPrice);
      this.updateSatisfaction(purchase.satisfaction);
    });

    this.on('feedback-submitted', (feedback) => {
      if (feedback.type === 'complaint' && feedback.severity === 'critical') {
        this.currentSatisfaction = Math.max(0, this.currentSatisfaction - 20);
      }
    });
  }

  /**
   * Create new demand
   */
  createDemand(
    productId: ProductId,
    quantity: number,
    maxPrice: number,
    options: {
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      qualityRequirement?: QualityLevel;
      deliveryWindow?: TimeWindow;
      flexibilityFactors?: FlexibilityFactor[];
      substitutionAcceptance?: SubstitutionPreference[];
    } = {}
  ): OperationResult<ConsumerDemand> {
    // Validate demand based on consumer constraints
    const validation = this.validateDemand(productId, quantity, maxPrice);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_DEMAND',
          message: validation.errors.join('; '),
          severity: 'error',
          context: { productId, quantity, maxPrice },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: validation.warnings
      };
    }

    const demand: ConsumerDemand = {
      id: this.generateDemandId(),
      consumerId: this.spec.id,
      productId,
      quantity,
      maxPrice,
      urgency: options.urgency || 'medium',
      qualityRequirement: options.qualityRequirement || QualityLevel.GOOD,
      deliveryWindow: options.deliveryWindow || this.getDefaultDeliveryWindow(),
      flexibilityFactors: options.flexibilityFactors || this.getDefaultFlexibilityFactors(),
      substitutionAcceptance: options.substitutionAcceptance || [],
      status: DemandStatus.ACTIVE,
      createdDate: { gameTime: 0, realTime: Date.now() }
    };

    this.demands.set(demand.id, demand);

    this.emit('demand-created', demand);

    return { success: true, data: demand, warnings: validation.warnings };
  }

  /**
   * Update demand status
   */
  updateDemandStatus(demandId: string, status: DemandStatus): OperationResult<void> {
    const demand = this.demands.get(demandId);
    if (!demand) {
      return {
        success: false,
        error: {
          code: 'DEMAND_NOT_FOUND',
          message: `Demand ${demandId} not found`,
          severity: 'error',
          context: { demandId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const oldStatus = demand.status;
    demand.status = status;

    if (status === DemandStatus.FULFILLED) {
      demand.fulfillmentDate = { gameTime: 0, realTime: Date.now() };
    }

    this.emit('demand-status-updated', {
      demandId,
      oldStatus,
      newStatus: status
    });

    return { success: true, warnings: [] };
  }

  /**
   * Record purchase
   */
  recordPurchase(
    productId: ProductId,
    quantity: number,
    unitPrice: number,
    options: {
      deliveryDate?: TimeStamp;
      qualityRating?: number;
      serviceRating?: number;
      satisfaction?: number;
      channel?: string;
      promotions?: string[];
    } = {}
  ): OperationResult<PurchaseHistory> {
    const purchase: PurchaseHistory = {
      id: this.generatePurchaseId(),
      productId,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      purchaseDate: { gameTime: 0, realTime: Date.now() },
      deliveryDate: options.deliveryDate,
      qualityRating: options.qualityRating,
      serviceRating: options.serviceRating,
      satisfaction: options.satisfaction || this.calculateExpectedSatisfaction(productId, unitPrice),
      repurchaseIntention: this.calculateRepurchaseIntention(options.satisfaction || 8),
      referralLikelihood: this.calculateReferralLikelihood(options.satisfaction || 8),
      channel: options.channel || 'direct',
      promotions: options.promotions || []
    };

    this.purchaseHistory.push(purchase);

    // Keep only last 1000 purchases
    if (this.purchaseHistory.length > 1000) {
      this.purchaseHistory.shift();
    }

    this.emit('purchase-completed', purchase);

    return { success: true, data: purchase, warnings: [] };
  }

  /**
   * Submit feedback
   */
  submitFeedback(
    type: 'complaint' | 'compliment' | 'suggestion' | 'review',
    subject: string,
    description: string,
    options: {
      productId?: ProductId;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      channel?: string;
      publicVisibility?: boolean;
    } = {}
  ): OperationResult<ConsumerFeedback> {
    const feedback: ConsumerFeedback = {
      id: this.generateFeedbackId(),
      type,
      productId: options.productId,
      subject,
      description,
      severity: options.severity || 'medium',
      channel: options.channel || 'email',
      timestamp: { gameTime: 0, realTime: Date.now() },
      status: 'open',
      publicVisibility: options.publicVisibility || false
    };

    this.feedback.push(feedback);

    // Keep only last 500 feedback items
    if (this.feedback.length > 500) {
      this.feedback.shift();
    }

    this.emit('feedback-submitted', feedback);

    return { success: true, data: feedback, warnings: [] };
  }

  /**
   * Update consumer preferences
   */
  updatePreferences(preferences: Partial<ConsumerPreferences>): void {
    Object.assign(this.spec.preferences, preferences);

    this.emit('preferences-updated', {
      consumerId: this.spec.id,
      preferences
    });
  }

  /**
   * Simulate demand forecast
   */
  forecastDemand(
    productId: ProductId,
    timeHorizon: number, // days
    currentPrice: number
  ): DemandForecast {
    const basePattern = this.getDemandPattern(productId);
    const forecast: DemandForecast = {
      productId,
      timeHorizon,
      predictions: []
    };

    for (let day = 1; day <= timeHorizon; day++) {
      const seasonalFactor = this.getSeasonalFactor(day);
      const trendFactor = this.getTrendFactor(day);
      const priceElasticityFactor = this.getPriceElasticityFactor(currentPrice, productId);

      const predictedDemand = basePattern.baseLevel *
        seasonalFactor *
        trendFactor *
        priceElasticityFactor *
        (1 + (Math.random() - 0.5) * basePattern.variability);

      forecast.predictions.push({
        day,
        predictedQuantity: Math.max(0, Math.round(predictedDemand)),
        confidence: this.calculateForecastConfidence(day),
        factors: {
          seasonal: seasonalFactor,
          trend: trendFactor,
          price: priceElasticityFactor
        }
      });
    }

    return forecast;
  }

  /**
   * Get consumer lifetime value
   */
  getLifetimeValue(): number {
    return this.lifetimeValue;
  }

  /**
   * Get current satisfaction level
   */
  getSatisfaction(): number {
    return this.currentSatisfaction;
  }

  /**
   * Get demand by ID
   */
  getDemand(demandId: string): ConsumerDemand | undefined {
    return this.demands.get(demandId);
  }

  /**
   * Get demands with optional filtering
   */
  getDemands(filter?: {
    status?: DemandStatus;
    productId?: ProductId;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    fromDate?: TimeStamp;
    toDate?: TimeStamp;
  }): ConsumerDemand[] {
    let demands = Array.from(this.demands.values());

    if (filter) {
      if (filter.status) {
        demands = demands.filter(d => d.status === filter.status);
      }
      if (filter.productId) {
        demands = demands.filter(d => d.productId === filter.productId);
      }
      if (filter.urgency) {
        demands = demands.filter(d => d.urgency === filter.urgency);
      }
      if (filter.fromDate) {
        demands = demands.filter(d => d.createdDate.realTime >= filter.fromDate!.realTime);
      }
      if (filter.toDate) {
        demands = demands.filter(d => d.createdDate.realTime <= filter.toDate!.realTime);
      }
    }

    return demands;
  }

  /**
   * Validate demand against consumer constraints
   */
  private validateDemand(
    productId: ProductId,
    quantity: number,
    maxPrice: number
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check budget constraints
    const totalCost = quantity * maxPrice;
    if (totalCost > this.spec.purchasingPower.discretionaryIncome) {
      errors.push('Total cost exceeds discretionary income');
    }

    // Check price range preferences
    if (maxPrice < this.spec.preferences.priceRange.minimum) {
      warnings.push('Price below preferred minimum range');
    }
    if (maxPrice > this.spec.preferences.priceRange.maximum) {
      warnings.push('Price above preferred maximum range');
    }

    // Check quantity reasonableness
    if (quantity <= 0) {
      errors.push('Quantity must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get default delivery window
   */
  private getDefaultDeliveryWindow(): TimeWindow {
    const now = Date.now();
    const preferredDelivery = this.spec.preferences.deliveryPreferences
      .find(dp => dp.importance >= 7);

    const maxTime = preferredDelivery?.maxTime || 168; // 7 days default

    return {
      earliest: { gameTime: 0, realTime: now + (24 * 60 * 60 * 1000) }, // 1 day
      latest: { gameTime: 0, realTime: now + (maxTime * 60 * 60 * 1000) },
      preferred: { gameTime: 0, realTime: now + (72 * 60 * 60 * 1000) } // 3 days
    };
  }

  /**
   * Get default flexibility factors
   */
  private getDefaultFlexibilityFactors(): FlexibilityFactor[] {
    return [
      { dimension: 'price', flexibility: 6, tradeoffRatio: 0.1 },
      { dimension: 'quality', flexibility: 4, tradeoffRatio: 0.05 },
      { dimension: 'timing', flexibility: 7, tradeoffRatio: 0.15 },
      { dimension: 'quantity', flexibility: 5, tradeoffRatio: 0.2 },
      { dimension: 'substitution', flexibility: 3, tradeoffRatio: 0.1 }
    ];
  }

  /**
   * Calculate expected satisfaction
   */
  private calculateExpectedSatisfaction(productId: ProductId, price: number): number {
    const priceRange = this.spec.preferences.priceRange;
    const priceScore = this.calculatePriceScore(price, priceRange);

    // Base satisfaction influenced by price satisfaction
    return Math.max(1, Math.min(10, 8 * priceScore));
  }

  /**
   * Calculate price score
   */
  private calculatePriceScore(price: number, priceRange: PriceRange): number {
    if (price <= priceRange.preferred) {
      return 1.0;
    } else if (price <= priceRange.maximum) {
      return 1.0 - ((price - priceRange.preferred) / (priceRange.maximum - priceRange.preferred)) * 0.5;
    } else {
      return 0.5;
    }
  }

  /**
   * Calculate repurchase intention
   */
  private calculateRepurchaseIntention(satisfaction: number): number {
    // Satisfaction strongly influences repurchase intention
    return Math.max(1, Math.min(10, satisfaction * 0.9 + this.spec.behavior.brandSwitching.likelihood * 0.1));
  }

  /**
   * Calculate referral likelihood
   */
  private calculateReferralLikelihood(satisfaction: number): number {
    return Math.max(1, Math.min(10, satisfaction * 0.8 + this.spec.behavior.referralTendency * 0.2));
  }

  /**
   * Update lifetime value
   */
  private updateLifetimeValue(purchaseAmount: number): void {
    this.lifetimeValue += purchaseAmount;
  }

  /**
   * Update satisfaction
   */
  private updateSatisfaction(newSatisfaction: number): void {
    // Weighted average with current satisfaction
    this.currentSatisfaction = (this.currentSatisfaction * 0.8) + (newSatisfaction * 0.2);
  }

  /**
   * Get demand pattern for product
   */
  private getDemandPattern(productId: ProductId): DemandPattern {
    // Simplified - would be more sophisticated in real implementation
    return {
      baseLevel: 10,
      trend: 0.02,
      seasonality: {
        pattern: 'seasonal',
        amplitude: 0.3,
        period: 365,
        offset: 0
      },
      variability: 0.2,
      elasticity: this.spec.preferences.priceRange.elasticity
    };
  }

  /**
   * Get seasonal factor
   */
  private getSeasonalFactor(day: number): number {
    const dayOfYear = (day % 365);
    const phase = (dayOfYear / 365) * 2 * Math.PI;
    return 1 + 0.3 * Math.sin(phase);
  }

  /**
   * Get trend factor
   */
  private getTrendFactor(day: number): number {
    return 1 + (0.02 * day / 365); // 2% annual growth
  }

  /**
   * Get price elasticity factor
   */
  private getPriceElasticityFactor(currentPrice: number, productId: ProductId): number {
    const priceRange = this.spec.preferences.priceRange;
    const priceRatio = currentPrice / priceRange.preferred;

    if (priceRatio === 1) return 1;

    const elasticity = priceRange.elasticity.coefficient;
    return Math.pow(priceRatio, elasticity);
  }

  /**
   * Calculate forecast confidence
   */
  private calculateForecastConfidence(day: number): number {
    // Confidence decreases with forecast horizon
    return Math.max(0.1, 1 - (day * 0.01));
  }

  /**
   * Generate unique IDs
   */
  private generateDemandId(): string {
    return `dem_${this.spec.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePurchaseId(): string {
    return `purch_${this.spec.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFeedbackId(): string {
    return `fb_${this.spec.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): EntityId {
    return this.spec.id;
  }

  getName(): string {
    return this.spec.name;
  }

  getType(): ConsumerType {
    return this.spec.type;
  }

  getSegment(): ConsumerSegment {
    return this.spec.segment;
  }

  getSpec(): ConsumerSpec {
    return { ...this.spec };
  }

  getPurchaseHistory(): PurchaseHistory[] {
    return [...this.purchaseHistory];
  }

  getFeedback(): ConsumerFeedback[] {
    return [...this.feedback];
  }

  /**
   * Get consumer statistics
   */
  getStatistics() {
    const purchases = this.purchaseHistory;
    const totalSpent = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
    const averageSatisfaction = purchases.length > 0 ?
      purchases.reduce((sum, p) => sum + p.satisfaction, 0) / purchases.length : 0;

    const activeDemands = Array.from(this.demands.values())
      .filter(d => d.status === DemandStatus.ACTIVE);

    const complaints = this.feedback.filter(f => f.type === 'complaint');

    return {
      totalPurchases: purchases.length,
      totalSpent,
      averageOrderValue: purchases.length > 0 ? totalSpent / purchases.length : 0,
      lifetimeValue: this.lifetimeValue,
      currentSatisfaction: this.currentSatisfaction,
      averageSatisfaction,
      activeDemands: activeDemands.length,
      totalFeedback: this.feedback.length,
      complaints: complaints.length,
      loyaltyPrograms: this.spec.loyaltyPrograms.length
    };
  }

  /**
   * Dispose of the consumer and clean up resources
   */
  dispose(): void {
    this.demands.clear();
    this.purchaseHistory = [];
    this.feedback = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface DemandForecast {
  productId: ProductId;
  timeHorizon: number;
  predictions: DemandPrediction[];
}

interface DemandPrediction {
  day: number;
  predictedQuantity: number;
  confidence: number;
  factors: {
    seasonal: number;
    trend: number;
    price: number;
  };
}