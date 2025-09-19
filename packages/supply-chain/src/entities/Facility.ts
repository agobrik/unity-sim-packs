/**
 * Facility Entity - Represents production and storage facilities in the supply chain
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  FacilityId,
  NodeId,
  ResourceId,
  ProductId,
  NodeType,
  NodeStatus,
  Coordinates,
  TimeStamp,
  EventType,
  OperationResult,
  ProductionCapability,
  StorageCapability,
  ProcessingCapability,
  QualityLevel
} from '../core/types';

export interface FacilitySpec {
  id: FacilityId;
  name: string;
  type: FacilityType;
  nodeId: NodeId;
  coordinates: Coordinates;
  size: FacilitySize;
  capacity: FacilityCapacity;
  utilities: UtilityRequirement[];
  certifications: FacilityCertification[];
  safetyRating: number;
  environmentalRating: number;
  operationalCosts: OperationalCosts;
}

export enum FacilityType {
  PRODUCTION = 'production',
  WAREHOUSE = 'warehouse',
  DISTRIBUTION_CENTER = 'distribution_center',
  PROCESSING_PLANT = 'processing_plant',
  ASSEMBLY_LINE = 'assembly_line',
  QUALITY_CONTROL = 'quality_control',
  RESEARCH_FACILITY = 'research_facility',
  MAINTENANCE_SHOP = 'maintenance_shop',
  COLD_STORAGE = 'cold_storage'
}

export interface FacilitySize {
  area: number; // square meters
  volume: number; // cubic meters
  height: number; // meters
  floors: number;
  zones: FacilityZone[];
}

export interface FacilityZone {
  id: string;
  name: string;
  type: 'production' | 'storage' | 'office' | 'utility' | 'quality' | 'shipping';
  area: number;
  capacity: number;
  specialization?: string;
  restrictions: string[];
}

export interface FacilityCapacity {
  maxWorkers: number;
  maxShifts: number;
  storageCapacity: number;
  productionCapacity: number;
  processingCapacity: number;
  throughputCapacity: number;
}

export interface UtilityRequirement {
  type: 'electricity' | 'water' | 'gas' | 'steam' | 'compressed_air' | 'internet';
  capacity: number;
  consumption: number;
  peakDemand: number;
  backup: boolean;
  reliability: number;
}

export interface FacilityCertification {
  name: string;
  type: 'iso' | 'haccp' | 'gmp' | 'environmental' | 'safety' | 'security';
  issuedBy: string;
  validFrom: TimeStamp;
  validUntil: TimeStamp;
  scope: string;
  status: 'active' | 'expired' | 'suspended' | 'pending';
}

export interface OperationalCosts {
  fixedCosts: CostItem[];
  variableCosts: CostItem[];
  maintenanceCosts: CostItem[];
  utilityCosts: CostItem[];
}

export interface CostItem {
  category: string;
  description: string;
  amount: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  scalable: boolean;
}

export interface WorkShift {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  workers: Worker[];
  productivity: number;
  status: 'active' | 'inactive' | 'break' | 'changeover';
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  skillLevel: number;
  experience: number;
  efficiency: number;
  shiftPreference: string[];
  certifications: string[];
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  capacity: number;
  efficiency: number;
  condition: 'new' | 'good' | 'fair' | 'poor' | 'broken';
  maintenanceSchedule: MaintenanceSchedule;
  operatingCost: number;
  location: string;
  status: 'operational' | 'maintenance' | 'broken' | 'idle';
}

export interface MaintenanceSchedule {
  lastMaintenance: TimeStamp;
  nextMaintenance: TimeStamp;
  interval: number;
  type: 'preventive' | 'predictive' | 'corrective';
  duration: number;
  cost: number;
}

export interface FacilityMetrics {
  utilization: number;
  efficiency: number;
  throughput: number;
  quality: QualityLevel;
  uptime: number;
  energyConsumption: number;
  wasteGeneration: number;
  costPerUnit: number;
  workerProductivity: number;
  equipmentEffectiveness: number;
  lastUpdated: TimeStamp;
}

export class Facility extends EventEmitter {
  private spec: FacilitySpec;
  private status: NodeStatus = NodeStatus.INACTIVE;
  private shifts: Map<string, WorkShift> = new Map();
  private equipment: Map<string, Equipment> = new Map();
  private zones: Map<string, FacilityZone> = new Map();
  private metrics: FacilityMetrics;
  private eventBus: EventBus;
  private currentShift?: WorkShift;
  private maintenanceLog: MaintenanceRecord[] = [];
  private productionLog: ProductionRecord[] = [];

  constructor(spec: FacilitySpec, eventBus: EventBus) {
    super();
    this.spec = spec;
    this.eventBus = eventBus;

    // Initialize zones
    spec.size.zones.forEach(zone => {
      this.zones.set(zone.id, zone);
    });

    this.metrics = {
      utilization: 0,
      efficiency: 0,
      throughput: 0,
      quality: QualityLevel.GOOD,
      uptime: 0,
      energyConsumption: 0,
      wasteGeneration: 0,
      costPerUnit: 0,
      workerProductivity: 0,
      equipmentEffectiveness: 0,
      lastUpdated: { gameTime: 0, realTime: Date.now() }
    };

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('shift-started', (shift) => {
      this.eventBus.publishEvent(EventType.PRODUCTION_STARTED, this.spec.id, {
        facilityType: this.spec.type,
        shiftId: shift.id,
        workers: shift.workers.length
      });
    });

    this.on('production-completed', (data) => {
      this.recordProduction(data);
    });

    this.on('maintenance-scheduled', (data) => {
      this.scheduleMaintenance(data);
    });
  }

  /**
   * Initialize facility
   */
  async initialize(): Promise<OperationResult<void>> {
    try {
      this.status = NodeStatus.ACTIVE;

      // Initialize default shifts if none exist
      if (this.shifts.size === 0) {
        this.createDefaultShifts();
      }

      await this.eventBus.publishEvent(
        EventType.PRODUCTION_STARTED,
        this.spec.id,
        {
          facilityType: this.spec.type,
          capacity: this.spec.capacity
        }
      );

      return { success: true, warnings: [] };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FACILITY_INIT_FAILED',
          message: `Failed to initialize facility: ${error instanceof Error ? error.message : String(error)}`,
          context: { facilityId: this.spec.id, error: error instanceof Error ? error.stack : String(error) },
          severity: 'error',
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }
  }

  /**
   * Update facility state
   */
  async update(currentTime: TimeStamp): Promise<void> {
    // Update current shift
    this.updateCurrentShift(currentTime);

    // Update equipment status
    this.updateEquipment(currentTime);

    // Check maintenance schedules
    this.checkMaintenanceSchedules(currentTime);

    // Update metrics
    this.updateMetrics(currentTime);

    // Perform facility-specific updates
    await this.performFacilityUpdate(currentTime);
  }

  /**
   * Facility-specific update logic (override in subclasses)
   */
  protected async performFacilityUpdate(currentTime: TimeStamp): Promise<void> {
    // Default implementation
  }

  /**
   * Add equipment to facility
   */
  addEquipment(equipment: Equipment): OperationResult<void> {
    // Check if zone exists and has capacity
    const zone = this.zones.get(equipment.location);
    if (!zone) {
      return {
        success: false,
        error: {
          code: 'ZONE_NOT_FOUND',
          message: `Zone ${equipment.location} not found`,
          severity: 'error',
          context: { equipmentId: equipment.id, location: equipment.location },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    this.equipment.set(equipment.id, equipment);

    this.emit('equipment-added', {
      equipmentId: equipment.id,
      type: equipment.type,
      location: equipment.location
    });

    return { success: true, warnings: [] };
  }

  /**
   * Remove equipment from facility
   */
  removeEquipment(equipmentId: string): OperationResult<void> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) {
      return {
        success: false,
        error: {
          code: 'EQUIPMENT_NOT_FOUND',
          message: `Equipment ${equipmentId} not found`,
          severity: 'warning',
          context: { equipmentId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    this.equipment.delete(equipmentId);

    this.emit('equipment-removed', {
      equipmentId,
      type: equipment.type
    });

    return { success: true, warnings: [] };
  }

  /**
   * Create work shift
   */
  createShift(
    name: string,
    startTime: number,
    endTime: number,
    workers: Worker[]
  ): OperationResult<WorkShift> {
    const shift: WorkShift = {
      id: this.generateShiftId(),
      name,
      startTime,
      endTime,
      workers,
      productivity: this.calculateShiftProductivity(workers),
      status: 'inactive'
    };

    this.shifts.set(shift.id, shift);

    this.emit('shift-created', shift);

    return { success: true, data: shift, warnings: [] };
  }

  /**
   * Start production in facility
   */
  startProduction(
    productId: ProductId,
    quantity: number,
    resources: { resourceId: ResourceId; quantity: number }[]
  ): OperationResult<string> {
    if (this.status !== NodeStatus.ACTIVE) {
      return {
        success: false,
        error: {
          code: 'FACILITY_NOT_ACTIVE',
          message: 'Facility is not active',
          severity: 'warning',
          context: { status: this.status },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const productionId = this.generateProductionId();

    // Check capacity
    if (!this.hasProductionCapacity(quantity)) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_CAPACITY',
          message: 'Insufficient production capacity',
          severity: 'warning',
          context: { requestedQuantity: quantity },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    // Start production process
    this.startProductionProcess(productionId, productId, quantity, resources);

    return { success: true, data: productionId, warnings: [] };
  }

  /**
   * Process storage request
   */
  storeItems(
    items: { resourceId: ResourceId; quantity: number }[]
  ): OperationResult<string[]> {
    const totalVolume = items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalVolume > this.getAvailableStorageCapacity()) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_STORAGE',
          message: 'Insufficient storage capacity',
          severity: 'warning',
          context: { required: totalVolume, available: this.getAvailableStorageCapacity() },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const storageIds = items.map(() => this.generateStorageId());

    this.emit('items-stored', {
      items,
      storageIds
    });

    return { success: true, data: storageIds, warnings: [] };
  }

  /**
   * Update current shift based on time
   */
  private updateCurrentShift(currentTime: TimeStamp): void {
    const currentHour = new Date(currentTime.realTime).getHours();

    for (const shift of this.shifts.values()) {
      if (currentHour >= shift.startTime && currentHour < shift.endTime) {
        if (this.currentShift?.id !== shift.id) {
          // Shift change
          if (this.currentShift) {
            this.currentShift.status = 'inactive';
            this.emit('shift-ended', this.currentShift);
          }

          this.currentShift = shift;
          shift.status = 'active';
          this.emit('shift-started', shift);
        }
        break;
      }
    }
  }

  /**
   * Update equipment status
   */
  private updateEquipment(currentTime: TimeStamp): void {
    for (const equipment of this.equipment.values()) {
      // Check if maintenance is due
      if (currentTime.realTime >= equipment.maintenanceSchedule.nextMaintenance.realTime) {
        equipment.status = 'maintenance';
        this.emit('maintenance-required', {
          equipmentId: equipment.id,
          type: equipment.maintenanceSchedule.type
        });
      }

      // Update condition based on usage
      this.updateEquipmentCondition(equipment, currentTime);
    }
  }

  /**
   * Update equipment condition
   */
  private updateEquipmentCondition(equipment: Equipment, currentTime: TimeStamp): void {
    // Simplified condition degradation
    if (equipment.status === 'operational') {
      const hoursOfOperation = (currentTime.realTime - equipment.maintenanceSchedule.lastMaintenance.realTime) / (1000 * 60 * 60);

      if (hoursOfOperation > 8760 && equipment.condition === 'new') { // 1 year
        equipment.condition = 'good';
      } else if (hoursOfOperation > 17520 && equipment.condition === 'good') { // 2 years
        equipment.condition = 'fair';
      } else if (hoursOfOperation > 26280 && equipment.condition === 'fair') { // 3 years
        equipment.condition = 'poor';
      }
    }
  }

  /**
   * Check maintenance schedules
   */
  private checkMaintenanceSchedules(currentTime: TimeStamp): void {
    for (const equipment of this.equipment.values()) {
      if (currentTime.realTime >= equipment.maintenanceSchedule.nextMaintenance.realTime &&
          equipment.status !== 'maintenance') {
        this.scheduleMaintenance({
          equipmentId: equipment.id,
          type: equipment.maintenanceSchedule.type,
          scheduledTime: currentTime
        });
      }
    }
  }

  /**
   * Schedule maintenance
   */
  private scheduleMaintenance(data: {
    equipmentId: string;
    type: string;
    scheduledTime: TimeStamp;
  }): void {
    const maintenance: MaintenanceRecord = {
      id: this.generateMaintenanceId(),
      equipmentId: data.equipmentId,
      type: data.type,
      scheduledTime: data.scheduledTime,
      status: 'scheduled',
      cost: 0,
      duration: 0
    };

    this.maintenanceLog.push(maintenance);

    this.emit('maintenance-scheduled', maintenance);
  }

  /**
   * Update facility metrics
   */
  private updateMetrics(currentTime: TimeStamp): void {
    // Calculate utilization
    const activeEquipment = Array.from(this.equipment.values())
      .filter(e => e.status === 'operational').length;
    this.metrics.utilization = this.equipment.size > 0 ?
      (activeEquipment / this.equipment.size) * 100 : 0;

    // Calculate efficiency
    this.metrics.efficiency = this.currentShift ?
      this.currentShift.productivity : 0;

    // Calculate equipment effectiveness
    this.metrics.equipmentEffectiveness = this.calculateOEE();

    // Update timestamp
    this.metrics.lastUpdated = currentTime;

    this.emit('metrics-updated', {
      metrics: { ...this.metrics },
      timestamp: currentTime
    });
  }

  /**
   * Calculate Overall Equipment Effectiveness (OEE)
   */
  private calculateOEE(): number {
    if (this.equipment.size === 0) return 0;

    let totalOEE = 0;
    for (const equipment of this.equipment.values()) {
      const availability = equipment.status === 'operational' ? 1.0 : 0.0;
      const performance = equipment.efficiency / 100;
      const quality = this.getEquipmentQuality(equipment);

      totalOEE += availability * performance * quality;
    }

    return (totalOEE / this.equipment.size) * 100;
  }

  /**
   * Get equipment quality factor
   */
  private getEquipmentQuality(equipment: Equipment): number {
    switch (equipment.condition) {
      case 'new': return 1.0;
      case 'good': return 0.95;
      case 'fair': return 0.85;
      case 'poor': return 0.70;
      case 'broken': return 0.0;
      default: return 0.8;
    }
  }

  /**
   * Create default shifts
   */
  private createDefaultShifts(): void {
    // Create three 8-hour shifts
    const shifts = [
      { name: 'Day Shift', start: 6, end: 14 },
      { name: 'Evening Shift', start: 14, end: 22 },
      { name: 'Night Shift', start: 22, end: 6 }
    ];

    shifts.forEach(shift => {
      this.createShift(shift.name, shift.start, shift.end, []);
    });
  }

  /**
   * Calculate shift productivity
   */
  private calculateShiftProductivity(workers: Worker[]): number {
    if (workers.length === 0) return 0;

    const totalEfficiency = workers.reduce((sum, worker) => sum + worker.efficiency, 0);
    return totalEfficiency / workers.length;
  }

  /**
   * Check production capacity
   */
  private hasProductionCapacity(quantity: number): boolean {
    return quantity <= this.spec.capacity.productionCapacity;
  }

  /**
   * Start production process
   */
  private startProductionProcess(
    productionId: string,
    productId: ProductId,
    quantity: number,
    resources: { resourceId: ResourceId; quantity: number }[]
  ): void {
    const production: ProductionRecord = {
      id: productionId,
      productId,
      quantity,
      resources,
      startTime: { gameTime: 0, realTime: Date.now() },
      status: 'in_progress',
      facilityId: this.spec.id
    };

    this.productionLog.push(production);

    this.emit('production-started', production);

    // Simulate production completion (in real implementation, this would be based on actual production time)
    (globalThis as any).setTimeout(() => {
      production.status = 'completed';
      production.endTime = { gameTime: 0, realTime: Date.now() };
      this.emit('production-completed', production);
    }, 5000); // 5 second simulation
  }

  /**
   * Record production completion
   */
  private recordProduction(production: ProductionRecord): void {
    this.metrics.throughput += production.quantity;

    this.eventBus.emit(EventType.PRODUCTION_COMPLETED, this.spec.id, {
      productionId: production.id,
      productId: production.productId,
      quantity: production.quantity
    });
  }

  /**
   * Get available storage capacity
   */
  private getAvailableStorageCapacity(): number {
    // Simplified calculation - would be more complex in real implementation
    return this.spec.capacity.storageCapacity * 0.8; // Assume 20% is used
  }

  /**
   * Generate unique IDs
   */
  private generateShiftId(): string {
    return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProductionId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStorageId(): string {
    return `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMaintenanceId(): string {
    return `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): FacilityId {
    return this.spec.id;
  }

  getName(): string {
    return this.spec.name;
  }

  getType(): FacilityType {
    return this.spec.type;
  }

  getStatus(): NodeStatus {
    return this.status;
  }

  getSpec(): FacilitySpec {
    return { ...this.spec };
  }

  getMetrics(): FacilityMetrics {
    return { ...this.metrics };
  }

  getShifts(): WorkShift[] {
    return Array.from(this.shifts.values());
  }

  getEquipment(): Equipment[] {
    return Array.from(this.equipment.values());
  }

  getCurrentShift(): WorkShift | undefined {
    return this.currentShift;
  }

  /**
   * Get facility statistics
   */
  getStatistics() {
    return {
      totalEquipment: this.equipment.size,
      activeEquipment: Array.from(this.equipment.values())
        .filter(e => e.status === 'operational').length,
      totalShifts: this.shifts.size,
      currentUtilization: this.metrics.utilization,
      efficiency: this.metrics.efficiency,
      uptime: this.metrics.uptime,
      totalProductions: this.productionLog.length,
      totalMaintenances: this.maintenanceLog.length
    };
  }

  /**
   * Dispose of the facility and clean up resources
   */
  dispose(): void {
    this.shifts.clear();
    this.equipment.clear();
    this.zones.clear();
    this.maintenanceLog = [];
    this.productionLog = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: string;
  scheduledTime: TimeStamp;
  startTime?: TimeStamp;
  endTime?: TimeStamp;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cost: number;
  duration: number;
  technician?: string;
  notes?: string;
}

interface ProductionRecord {
  id: string;
  productId: ProductId;
  quantity: number;
  resources: { resourceId: ResourceId; quantity: number }[];
  startTime: TimeStamp;
  endTime?: TimeStamp;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  facilityId: FacilityId;
  shiftId?: string;
  quality?: QualityLevel;
}