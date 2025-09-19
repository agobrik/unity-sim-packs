/**
 * Supplier Entity - Represents suppliers in the supply chain network
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  EntityId,
  ResourceId,
  ProductId,
  TimeStamp,
  EventType,
  OperationResult,
  QualityLevel,
  Coordinates
} from '../core/types';

export interface SupplierSpec {
  id: EntityId;
  name: string;
  type: SupplierType;
  location: Coordinates;
  contactInfo: ContactInformation;
  capabilities: SupplierCapability[];
  certifications: SupplierCertification[];
  financialInfo: FinancialInformation;
  reliabilityRating: number;
  qualityRating: number;
  costCompetitiveness: number;
  paymentTerms: PaymentTerms;
  leadTimes: LeadTimeInfo[];
  contracts: SupplierContract[];
}

export enum SupplierType {
  RAW_MATERIAL = 'raw_material',
  COMPONENT = 'component',
  FINISHED_GOODS = 'finished_goods',
  SERVICES = 'services',
  LOGISTICS = 'logistics',
  PACKAGING = 'packaging',
  ENERGY = 'energy',
  EQUIPMENT = 'equipment'
}

export interface ContactInformation {
  primaryContact: Contact;
  secondaryContact?: Contact;
  emergencyContact?: Contact;
  businessHours: BusinessHours;
  preferredCommunication: 'email' | 'phone' | 'portal' | 'fax';
}

export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile?: string;
  department: string;
}

export interface BusinessHours {
  timezone: string;
  weekdays: { start: number; end: number };
  weekends: { start: number; end: number };
  holidays: string[];
}

export interface SupplierCapability {
  resourceId: ResourceId;
  capacity: number;
  minimumOrder: number;
  maximumOrder: number;
  qualityLevel: QualityLevel;
  certificationRequired: boolean;
  customizationLevel: 'none' | 'limited' | 'moderate' | 'extensive';
  scalability: number; // 1-10 scale
}

export interface SupplierCertification {
  name: string;
  type: string;
  issuingBody: string;
  validFrom: TimeStamp;
  validUntil: TimeStamp;
  scope: string;
  status: 'active' | 'expired' | 'suspended' | 'pending_renewal';
  auditScore?: number;
  lastAuditDate?: TimeStamp;
}

export interface FinancialInformation {
  creditRating: string;
  paymentHistory: PaymentRecord[];
  insuranceCoverage: InsuranceCoverage[];
  financialStability: number; // 1-10 scale
  preferredCurrency: string;
  bankingInfo: BankingInfo;
}

export interface PaymentRecord {
  invoiceId: string;
  amount: number;
  dueDate: TimeStamp;
  paidDate?: TimeStamp;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  paymentMethod: string;
}

export interface InsuranceCoverage {
  type: string;
  provider: string;
  coverage: number;
  validUntil: TimeStamp;
  policyNumber: string;
}

export interface BankingInfo {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode?: string;
  iban?: string;
}

export interface PaymentTerms {
  terms: 'net30' | 'net60' | 'net90' | 'cod' | 'prepaid' | 'custom';
  discountTerms?: DiscountTerms;
  lateFees: LateFeeStructure;
  preferredMethod: 'wire' | 'ach' | 'check' | 'credit_card';
}

export interface DiscountTerms {
  discountPercent: number;
  discountDays: number;
  description: string;
}

export interface LateFeeStructure {
  gracePeriod: number;
  feePercent: number;
  maximumFee: number;
  compounding: boolean;
}

export interface LeadTimeInfo {
  resourceId: ResourceId;
  normalLeadTime: number;
  expeditedLeadTime: number;
  expeditedCost: number;
  seasonalVariation: SeasonalVariation[];
  reliabilityFactor: number; // 0-1 scale
}

export interface SeasonalVariation {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  leadTimeMultiplier: number;
  capacityMultiplier: number;
  priceMultiplier: number;
}

export interface SupplierContract {
  id: string;
  type: 'framework' | 'spot' | 'long_term' | 'exclusive';
  startDate: TimeStamp;
  endDate: TimeStamp;
  autoRenewal: boolean;
  renewalTerms?: string;
  priceStructure: PriceStructure;
  minimumCommitments: CommitmentTerm[];
  penalties: PenaltyClause[];
  sla: ServiceLevelAgreement;
  status: 'active' | 'expired' | 'terminated' | 'suspended';
}

export interface PriceStructure {
  type: 'fixed' | 'variable' | 'tiered' | 'indexed';
  basePrice: number;
  tiers?: PriceTier[];
  indexFormula?: string;
  escalationClause?: EscalationClause;
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity: number;
  unitPrice: number;
  discount?: number;
}

export interface EscalationClause {
  frequency: 'monthly' | 'quarterly' | 'annually';
  indexType: 'cpi' | 'commodity' | 'custom';
  capPercentage?: number;
  floorPercentage?: number;
}

export interface CommitmentTerm {
  resourceId: ResourceId;
  minimumQuantity: number;
  period: 'monthly' | 'quarterly' | 'annually';
  penalty: number;
}

export interface PenaltyClause {
  condition: string;
  penaltyType: 'percentage' | 'fixed' | 'graduated';
  penaltyAmount: number;
  escalation?: boolean;
}

export interface ServiceLevelAgreement {
  deliveryReliability: number; // percentage
  qualityStandard: QualityLevel;
  responseTime: number; // hours
  defectRate: number; // percentage
  penaltiesForBreach: SLAPenalty[];
}

export interface SLAPenalty {
  metric: string;
  threshold: number;
  penalty: number;
  penaltyType: 'percentage' | 'fixed';
}

export interface SupplierOrder {
  id: string;
  supplierId: EntityId;
  items: OrderItem[];
  totalAmount: number;
  orderDate: TimeStamp;
  requestedDeliveryDate: TimeStamp;
  confirmedDeliveryDate?: TimeStamp;
  actualDeliveryDate?: TimeStamp;
  status: OrderStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  specialInstructions?: string;
  trackingInfo?: TrackingInfo;
}

export interface OrderItem {
  resourceId: ResourceId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
  qualityRequirements: QualityLevel;
}

export enum OrderStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  IN_PRODUCTION = 'in_production',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: TimeStamp;
  milestones: TrackingMilestone[];
}

export interface TrackingMilestone {
  timestamp: TimeStamp;
  location: string;
  status: string;
  description: string;
}

export interface SupplierPerformance {
  period: string;
  deliveryReliability: number;
  qualityScore: number;
  costCompetitiveness: number;
  responsiveness: number;
  flexibilityScore: number;
  sustainabilityScore: number;
  overallRating: number;
  improvementAreas: string[];
  strengths: string[];
}

export class Supplier extends EventEmitter {
  private spec: SupplierSpec;
  private orders: Map<string, SupplierOrder> = new Map();
  private performanceHistory: SupplierPerformance[] = [];
  private communicationLog: CommunicationRecord[] = [];
  private eventBus: EventBus;
  private currentPerformance: SupplierPerformance;

  constructor(spec: SupplierSpec, eventBus: EventBus) {
    super();
    this.spec = spec;
    this.eventBus = eventBus;
    this.currentPerformance = this.initializePerformance();
    this.setupEventHandlers();
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformance(): SupplierPerformance {
    return {
      period: 'current',
      deliveryReliability: this.spec.reliabilityRating,
      qualityScore: this.spec.qualityRating,
      costCompetitiveness: this.spec.costCompetitiveness,
      responsiveness: 85,
      flexibilityScore: 80,
      sustainabilityScore: 75,
      overallRating: 80,
      improvementAreas: [],
      strengths: []
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('order-placed', (order) => {
      this.eventBus.publishEvent(EventType.PRODUCTION_STARTED, this.spec.id, {
        orderId: order.id,
        totalAmount: order.totalAmount,
        itemCount: order.items.length
      });
    });

    this.on('order-delivered', (order) => {
      this.updateDeliveryPerformance(order);
    });

    this.on('quality-issue', (data) => {
      this.updateQualityPerformance(data);
    });
  }

  /**
   * Create new order
   */
  createOrder(
    items: OrderItem[],
    requestedDeliveryDate: TimeStamp,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      specialInstructions?: string;
    } = {}
  ): OperationResult<SupplierOrder> {
    // Validate order items
    const validation = this.validateOrderItems(items);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_ORDER_ITEMS',
          message: validation.errors.join('; '),
          severity: 'error',
          context: { items },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: validation.warnings
      };
    }

    const order: SupplierOrder = {
      id: this.generateOrderId(),
      supplierId: this.spec.id,
      items,
      totalAmount: this.calculateOrderTotal(items),
      orderDate: { gameTime: 0, realTime: Date.now() },
      requestedDeliveryDate,
      status: OrderStatus.DRAFT,
      priority: options.priority || 'normal',
      specialInstructions: options.specialInstructions
    };

    this.orders.set(order.id, order);

    this.emit('order-created', order);

    return { success: true, data: order, warnings: validation.warnings };
  }

  /**
   * Submit order to supplier
   */
  submitOrder(orderId: string): OperationResult<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order ${orderId} not found`,
          severity: 'error',
          context: { orderId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    if (order.status !== OrderStatus.DRAFT) {
      return {
        success: false,
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: `Cannot submit order in status: ${order.status}`,
          severity: 'warning',
          context: { orderId, status: order.status },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    order.status = OrderStatus.SUBMITTED;

    // Simulate supplier response
    this.simulateSupplierResponse(order);

    this.emit('order-submitted', order);

    return { success: true, warnings: [] };
  }

  /**
   * Update order status
   */
  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingInfo?: TrackingInfo
  ): OperationResult<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order ${orderId} not found`,
          severity: 'error',
          context: { orderId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const oldStatus = order.status;
    order.status = status;

    if (trackingInfo) {
      order.trackingInfo = trackingInfo;
    }

    if (status === OrderStatus.DELIVERED) {
      order.actualDeliveryDate = { gameTime: 0, realTime: Date.now() };
      this.emit('order-delivered', order);
    }

    this.emit('order-status-updated', {
      orderId,
      oldStatus,
      newStatus: status,
      trackingInfo
    });

    return { success: true, warnings: [] };
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): SupplierOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get orders with optional filtering
   */
  getOrders(filter?: {
    status?: OrderStatus;
    fromDate?: TimeStamp;
    toDate?: TimeStamp;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }): SupplierOrder[] {
    let orders = Array.from(this.orders.values());

    if (filter) {
      if (filter.status) {
        orders = orders.filter(o => o.status === filter.status);
      }
      if (filter.fromDate) {
        orders = orders.filter(o => o.orderDate.realTime >= filter.fromDate!.realTime);
      }
      if (filter.toDate) {
        orders = orders.filter(o => o.orderDate.realTime <= filter.toDate!.realTime);
      }
      if (filter.priority) {
        orders = orders.filter(o => o.priority === filter.priority);
      }
    }

    return orders;
  }

  /**
   * Get current lead time for resource
   */
  getLeadTime(resourceId: ResourceId, quantity: number, expedited: boolean = false): number {
    const leadTimeInfo = this.spec.leadTimes.find(lt => lt.resourceId === resourceId);
    if (!leadTimeInfo) {
      return 14; // Default 14 days
    }

    const baseLeadTime = expedited ? leadTimeInfo.expeditedLeadTime : leadTimeInfo.normalLeadTime;

    // Apply seasonal variation
    const season = this.getCurrentSeason();
    const seasonalVariation = leadTimeInfo.seasonalVariation.find(sv => sv.season === season);
    const seasonalMultiplier = seasonalVariation?.leadTimeMultiplier || 1.0;

    // Apply reliability factor
    const reliabilityAdjustment = 1 + (1 - leadTimeInfo.reliabilityFactor) * 0.3;

    return Math.ceil(baseLeadTime * seasonalMultiplier * reliabilityAdjustment);
  }

  /**
   * Get quote for items
   */
  getQuote(items: OrderItem[]): OperationResult<SupplierQuote> {
    const validation = this.validateOrderItems(items);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUOTE_ITEMS',
          message: validation.errors.join('; '),
          severity: 'error',
          context: { items },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: validation.warnings
      };
    }

    const quote: SupplierQuote = {
      id: this.generateQuoteId(),
      supplierId: this.spec.id,
      items: items.map(item => ({
        ...item,
        leadTime: this.getLeadTime(item.resourceId, item.quantity),
        availability: this.checkAvailability(item.resourceId, item.quantity)
      })),
      totalAmount: this.calculateOrderTotal(items),
      validUntil: {
        gameTime: 0,
        realTime: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      },
      terms: this.spec.paymentTerms,
      estimatedDelivery: { gameTime: 0, realTime: Date.now() + (14 * 24 * 60 * 60 * 1000) }
    };

    return { success: true, data: quote, warnings: validation.warnings };
  }

  /**
   * Check resource availability
   */
  checkAvailability(resourceId: ResourceId, quantity: number): boolean {
    const capability = this.spec.capabilities.find(c => c.resourceId === resourceId);
    if (!capability) {
      return false;
    }

    return quantity >= capability.minimumOrder &&
           quantity <= capability.maximumOrder &&
           quantity <= capability.capacity;
  }

  /**
   * Update supplier performance metrics
   */
  updatePerformance(metrics: Partial<SupplierPerformance>): void {
    Object.assign(this.currentPerformance, metrics);

    // Calculate overall rating
    this.currentPerformance.overallRating = this.calculateOverallRating();

    this.emit('performance-updated', this.currentPerformance);
  }

  /**
   * Add communication record
   */
  addCommunication(
    type: 'email' | 'phone' | 'meeting' | 'portal',
    subject: string,
    content: string,
    participants: string[]
  ): void {
    const communication: CommunicationRecord = {
      id: this.generateCommunicationId(),
      timestamp: { gameTime: 0, realTime: Date.now() },
      type,
      subject,
      content,
      participants,
      status: 'completed'
    };

    this.communicationLog.push(communication);

    // Keep only last 1000 records
    if (this.communicationLog.length > 1000) {
      this.communicationLog.shift();
    }

    this.emit('communication-added', communication);
  }

  /**
   * Validate order items
   */
  private validateOrderItems(items: OrderItem[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      const capability = this.spec.capabilities.find(c => c.resourceId === item.resourceId);

      if (!capability) {
        errors.push(`Resource ${item.resourceId} not available from this supplier`);
        continue;
      }

      if (item.quantity < capability.minimumOrder) {
        errors.push(`Quantity ${item.quantity} below minimum order ${capability.minimumOrder} for ${item.resourceId}`);
      }

      if (item.quantity > capability.maximumOrder) {
        warnings.push(`Quantity ${item.quantity} exceeds maximum order ${capability.maximumOrder} for ${item.resourceId}`);
      }

      if (item.qualityRequirements > capability.qualityLevel) {
        warnings.push(`Quality requirement ${item.qualityRequirements} may not be achievable for ${item.resourceId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate order total
   */
  private calculateOrderTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  }

  /**
   * Simulate supplier response to order
   */
  private simulateSupplierResponse(order: SupplierOrder): void {
    // Simulate processing time
    (globalThis as any).setTimeout(() => {
      const responseTime = Math.random() * 24 * 60 * 60 * 1000; // 0-24 hours

      if (Math.random() > 0.1) { // 90% acceptance rate
        order.status = OrderStatus.CONFIRMED;
        order.confirmedDeliveryDate = {
          gameTime: 0,
          realTime: order.requestedDeliveryDate.realTime + responseTime
        };
      } else {
        order.status = OrderStatus.REJECTED;
      }

      this.emit('order-response-received', order);
    }, Math.random() * 1000 + 500); // 0.5-1.5 seconds
  }

  /**
   * Update delivery performance
   */
  private updateDeliveryPerformance(order: SupplierOrder): void {
    if (order.actualDeliveryDate && order.confirmedDeliveryDate) {
      const onTime = order.actualDeliveryDate.realTime <= order.confirmedDeliveryDate.realTime;

      // Update reliability rating
      const currentReliability = this.currentPerformance.deliveryReliability;
      this.currentPerformance.deliveryReliability =
        (currentReliability * 0.9) + (onTime ? 100 : 0) * 0.1;
    }
  }

  /**
   * Update quality performance
   */
  private updateQualityPerformance(data: any): void {
    const impactFactor = data.severity === 'critical' ? 0.3 : 0.1;
    this.currentPerformance.qualityScore *= (1 - impactFactor);
  }

  /**
   * Calculate overall rating
   */
  private calculateOverallRating(): number {
    const weights = {
      delivery: 0.25,
      quality: 0.25,
      cost: 0.2,
      responsiveness: 0.15,
      flexibility: 0.1,
      sustainability: 0.05
    };

    return (
      this.currentPerformance.deliveryReliability * weights.delivery +
      this.currentPerformance.qualityScore * weights.quality +
      this.currentPerformance.costCompetitiveness * weights.cost +
      this.currentPerformance.responsiveness * weights.responsiveness +
      this.currentPerformance.flexibilityScore * weights.flexibility +
      this.currentPerformance.sustainabilityScore * weights.sustainability
    );
  }

  /**
   * Get current season
   */
  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Generate unique IDs
   */
  private generateOrderId(): string {
    return `ord_${this.spec.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateQuoteId(): string {
    return `qte_${this.spec.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCommunicationId(): string {
    return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): EntityId {
    return this.spec.id;
  }

  getName(): string {
    return this.spec.name;
  }

  getType(): SupplierType {
    return this.spec.type;
  }

  getSpec(): SupplierSpec {
    return { ...this.spec };
  }

  getPerformance(): SupplierPerformance {
    return { ...this.currentPerformance };
  }

  getPerformanceHistory(): SupplierPerformance[] {
    return [...this.performanceHistory];
  }

  getCommunicationLog(): CommunicationRecord[] {
    return [...this.communicationLog];
  }

  /**
   * Get supplier statistics
   */
  getStatistics() {
    const orders = Array.from(this.orders.values());
    const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      pendingOrders: orders.filter(o =>
        [OrderStatus.SUBMITTED, OrderStatus.CONFIRMED, OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED]
          .includes(o.status)).length,
      totalValue,
      averageOrderValue: orders.length > 0 ? totalValue / orders.length : 0,
      currentPerformance: this.currentPerformance.overallRating,
      communicationCount: this.communicationLog.length
    };
  }

  /**
   * Dispose of the supplier and clean up resources
   */
  dispose(): void {
    this.orders.clear();
    this.performanceHistory = [];
    this.communicationLog = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface SupplierQuote {
  id: string;
  supplierId: EntityId;
  items: (OrderItem & { leadTime: number; availability: boolean })[];
  totalAmount: number;
  validUntil: TimeStamp;
  terms: PaymentTerms;
  estimatedDelivery: TimeStamp;
}

interface CommunicationRecord {
  id: string;
  timestamp: TimeStamp;
  type: 'email' | 'phone' | 'meeting' | 'portal';
  subject: string;
  content: string;
  participants: string[];
  status: 'pending' | 'completed' | 'failed';
}