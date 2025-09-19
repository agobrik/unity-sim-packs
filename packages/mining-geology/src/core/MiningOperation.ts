import { MineralDeposit, Position3D, MineralType } from './GeologicalLayer';

export enum MiningMethod {
  SURFACE = 'surface',
  UNDERGROUND = 'underground',
  OPEN_PIT = 'open_pit',
  SHAFT = 'shaft',
  QUARRYING = 'quarrying',
  HYDRAULIC = 'hydraulic'
}

export enum EquipmentType {
  EXCAVATOR = 'excavator',
  BULLDOZER = 'bulldozer',
  DUMP_TRUCK = 'dump_truck',
  DRILL_RIG = 'drill_rig',
  CONVEYOR_BELT = 'conveyor_belt',
  CRUSHER = 'crusher',
  SEPARATOR = 'separator',
  PUMP = 'pump',
  VENTILATION_SYSTEM = 'ventilation_system',
  SAFETY_EQUIPMENT = 'safety_equipment'
}

export interface Equipment {
  id: string;
  type: EquipmentType;
  capacity: number; // tons per hour or similar
  efficiency: number; // 0-1
  operationalCost: number; // per hour
  maintenanceCost: number; // per hour
  fuelConsumption: number; // liters per hour
  condition: number; // 0-1 (1 = new, 0 = needs replacement)
  age: number; // in operating hours
}

export interface Worker {
  id: string;
  skill: number; // 0-1
  experience: number; // years
  specialization: string;
  salary: number; // per hour
  safety: number; // 0-1 safety score
  productivity: number; // 0-1 productivity multiplier
}

export interface ExtractionResult {
  mineral: MineralType;
  quantity: number; // cubic meters extracted
  purity: number; // 0-1
  value: number; // total monetary value
  waste: number; // cubic meters of waste
  processingRequired: boolean;
}

export class MiningOperation {
  private _id: string;
  private _name: string;
  private _method: MiningMethod;
  private _targetDeposit: MineralDeposit;
  private _position: Position3D;
  private _equipment: Map<string, Equipment>;
  private _workers: Map<string, Worker>;
  private _isActive: boolean = false;
  private _dailyOutput: number = 0;
  private _totalExtracted: number = 0;
  private _operationalCosts: number = 0;
  private _safetyIncidents: number = 0;
  private _environmentalImpact: number = 0;
  private _efficiency: number = 0.7; // Overall operation efficiency

  constructor(
    id: string,
    name: string,
    method: MiningMethod,
    targetDeposit: MineralDeposit,
    position: Position3D
  ) {
    this._id = id;
    this._name = name;
    this._method = method;
    this._targetDeposit = targetDeposit;
    this._position = position;
    this._equipment = new Map();
    this._workers = new Map();
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get method(): MiningMethod { return this._method; }
  get targetDeposit(): MineralDeposit { return this._targetDeposit; }
  get position(): Position3D { return { ...this._position }; }
  get equipment(): Equipment[] { return Array.from(this._equipment.values()); }
  get workers(): Worker[] { return Array.from(this._workers.values()); }
  get isActive(): boolean { return this._isActive; }
  get dailyOutput(): number { return this._dailyOutput; }
  get totalExtracted(): number { return this._totalExtracted; }
  get operationalCosts(): number { return this._operationalCosts; }
  get safetyIncidents(): number { return this._safetyIncidents; }
  get environmentalImpact(): number { return this._environmentalImpact; }
  get efficiency(): number { return this._efficiency; }

  // Equipment management
  addEquipment(equipment: Equipment): void {
    this._equipment.set(equipment.id, equipment);
    this.recalculateEfficiency();
  }

  removeEquipment(equipmentId: string): boolean {
    const removed = this._equipment.delete(equipmentId);
    if (removed) {
      this.recalculateEfficiency();
    }
    return removed;
  }

  getEquipment(equipmentId: string): Equipment | undefined {
    return this._equipment.get(equipmentId);
  }

  // Worker management
  addWorker(worker: Worker): void {
    this._workers.set(worker.id, worker);
    this.recalculateEfficiency();
  }

  removeWorker(workerId: string): boolean {
    const removed = this._workers.delete(workerId);
    if (removed) {
      this.recalculateEfficiency();
    }
    return removed;
  }

  getWorker(workerId: string): Worker | undefined {
    return this._workers.get(workerId);
  }

  // Operation control
  startOperation(): boolean {
    if (this.canOperate()) {
      this._isActive = true;
      return true;
    }
    return false;
  }

  stopOperation(): void {
    this._isActive = false;
  }

  private canOperate(): boolean {
    // Check if we have minimum equipment
    const hasExcavation = this._equipment.has('excavator') || this._equipment.has('drill_rig');
    const hasTransport = this._equipment.has('dump_truck') || this._equipment.has('conveyor_belt');

    // Check if we have minimum workers
    const hasOperators = Array.from(this._workers.values()).some(w =>
      w.specialization.includes('operator') || w.specialization.includes('general')
    );

    // Check if deposit is accessible
    return hasExcavation && hasTransport && hasOperators && this._targetDeposit.isAccessible;
  }

  // Mining simulation
  simulate(hoursWorked: number): ExtractionResult | null {
    if (!this._isActive || hoursWorked <= 0) return null;

    // Calculate extraction capacity based on equipment and workers
    const extractionCapacity = this.calculateExtractionCapacity();
    const actualExtraction = extractionCapacity * hoursWorked * this._efficiency;

    // Limit extraction to available deposit
    const availableVolume = this._targetDeposit.volume - this._totalExtracted;
    const extractedVolume = Math.min(actualExtraction, availableVolume);

    if (extractedVolume <= 0) {
      this._isActive = false; // Deposit exhausted
      return null;
    }

    // Update counters
    this._totalExtracted += extractedVolume;
    this._dailyOutput = extractedVolume / (hoursWorked / 24); // Daily rate

    // Calculate operational costs
    const equipmentCosts = this.calculateEquipmentCosts(hoursWorked);
    const workerCosts = this.calculateWorkerCosts(hoursWorked);
    const totalCosts = equipmentCosts + workerCosts;
    this._operationalCosts += totalCosts;

    // Calculate purity and processing needs
    const basePurity = this._targetDeposit.concentration;
    const processingBonus = this.getProcessingBonus();
    const finalPurity = Math.min(1, basePurity * processingBonus);

    // Calculate value
    const baseValue = this._targetDeposit.estimatedValue * extractedVolume;
    const qualityMultiplier = this._targetDeposit.quality;
    const purityMultiplier = finalPurity;
    const totalValue = baseValue * qualityMultiplier * purityMultiplier;

    // Calculate waste (overburden and processing waste)
    const overburdenRatio = this.getOverburdenRatio();
    const wasteVolume = extractedVolume * overburdenRatio;

    // Update environmental impact
    this._environmentalImpact += this.calculateEnvironmentalImpact(extractedVolume, wasteVolume);

    // Simulate equipment degradation
    this.degradeEquipment(hoursWorked);

    // Random safety incidents
    this.simulateSafetyIncidents(hoursWorked);

    return {
      mineral: this._targetDeposit.type,
      quantity: extractedVolume,
      purity: finalPurity,
      value: totalValue - totalCosts, // Net value after costs
      waste: wasteVolume,
      processingRequired: finalPurity < 0.9
    };
  }

  private calculateExtractionCapacity(): number {
    let capacity = 0;

    // Equipment capacity
    this._equipment.forEach(equipment => {
      if (equipment.type === EquipmentType.EXCAVATOR ||
          equipment.type === EquipmentType.DRILL_RIG) {
        capacity += equipment.capacity * equipment.efficiency * equipment.condition;
      }
    });

    // Worker productivity bonus
    const averageProductivity = Array.from(this._workers.values())
      .reduce((sum, worker) => sum + worker.productivity, 0) / this._workers.size;

    capacity *= (0.5 + averageProductivity * 0.5); // 50% base + 50% from worker productivity

    return capacity;
  }

  private calculateEquipmentCosts(hoursWorked: number): number {
    let totalCosts = 0;

    this._equipment.forEach(equipment => {
      totalCosts += (equipment.operationalCost + equipment.maintenanceCost) * hoursWorked;
    });

    return totalCosts;
  }

  private calculateWorkerCosts(hoursWorked: number): number {
    let totalCosts = 0;

    this._workers.forEach(worker => {
      totalCosts += worker.salary * hoursWorked;
    });

    return totalCosts;
  }

  private getProcessingBonus(): number {
    let bonus = 1.0;

    // Crushing equipment improves purity
    if (this._equipment.has('crusher')) {
      bonus *= 1.2;
    }

    // Separation equipment improves purity
    if (this._equipment.has('separator')) {
      bonus *= 1.3;
    }

    // Skilled workers improve processing
    const avgSkill = Array.from(this._workers.values())
      .reduce((sum, worker) => sum + worker.skill, 0) / this._workers.size;

    bonus *= (0.8 + avgSkill * 0.4); // 80% base + 40% from skill

    return bonus;
  }

  private getOverburdenRatio(): number {
    // Different mining methods have different waste ratios
    const baseRatios = {
      [MiningMethod.SURFACE]: 3.0,
      [MiningMethod.OPEN_PIT]: 2.5,
      [MiningMethod.UNDERGROUND]: 0.5,
      [MiningMethod.SHAFT]: 0.3,
      [MiningMethod.QUARRYING]: 1.5,
      [MiningMethod.HYDRAULIC]: 4.0
    };

    return baseRatios[this._method] || 2.0;
  }

  private calculateEnvironmentalImpact(extracted: number, waste: number): number {
    let impact = 0;

    // Base impact from extraction
    impact += extracted * 0.01;

    // Waste impact
    impact += waste * 0.005;

    // Method-specific impacts
    const methodImpacts = {
      [MiningMethod.SURFACE]: 1.5,
      [MiningMethod.OPEN_PIT]: 1.8,
      [MiningMethod.UNDERGROUND]: 0.8,
      [MiningMethod.SHAFT]: 0.6,
      [MiningMethod.QUARRYING]: 1.3,
      [MiningMethod.HYDRAULIC]: 2.0
    };

    impact *= methodImpacts[this._method] || 1.0;

    return impact;
  }

  private degradeEquipment(hoursWorked: number): void {
    this._equipment.forEach(equipment => {
      equipment.age += hoursWorked;

      // Condition degrades over time
      const degradationRate = 0.001 * (1 + Math.random() * 0.5); // 0.1-0.15% per hour
      equipment.condition = Math.max(0.1, equipment.condition - degradationRate * hoursWorked);

      // Efficiency decreases with condition
      equipment.efficiency = 0.5 + (equipment.condition * 0.5);
    });

    this.recalculateEfficiency();
  }

  private simulateSafetyIncidents(hoursWorked: number): void {
    const baseSafetyRate = 0.001; // 0.1% base incident rate per hour
    let safetyMultiplier = 1.0;

    // Worker safety score affects incidents
    const avgSafety = Array.from(this._workers.values())
      .reduce((sum, worker) => sum + worker.safety, 0) / this._workers.size;

    safetyMultiplier *= (2 - avgSafety); // Better safety = fewer incidents

    // Equipment condition affects safety
    const avgCondition = Array.from(this._equipment.values())
      .reduce((sum, equipment) => sum + equipment.condition, 0) / this._equipment.size;

    safetyMultiplier *= (2 - avgCondition); // Better condition = fewer incidents

    // Mining method affects safety
    const methodRisks = {
      [MiningMethod.SURFACE]: 0.8,
      [MiningMethod.OPEN_PIT]: 1.0,
      [MiningMethod.UNDERGROUND]: 1.5,
      [MiningMethod.SHAFT]: 1.8,
      [MiningMethod.QUARRYING]: 1.2,
      [MiningMethod.HYDRAULIC]: 1.3
    };

    safetyMultiplier *= methodRisks[this._method] || 1.0;

    // Check for incidents
    const incidentProbability = baseSafetyRate * safetyMultiplier * hoursWorked;
    if (Math.random() < incidentProbability) {
      this._safetyIncidents++;

      // Incidents reduce efficiency temporarily
      this._efficiency = Math.max(0.3, this._efficiency * 0.9);
    }
  }

  private recalculateEfficiency(): void {
    let equipmentFactor = 0.5; // Base efficiency
    let workerFactor = 0.5;

    if (this._equipment.size > 0) {
      const avgEquipmentCondition = Array.from(this._equipment.values())
        .reduce((sum, equipment) => sum + equipment.condition, 0) / this._equipment.size;
      equipmentFactor = 0.3 + (avgEquipmentCondition * 0.7);
    }

    if (this._workers.size > 0) {
      const avgWorkerSkill = Array.from(this._workers.values())
        .reduce((sum, worker) => sum + worker.skill, 0) / this._workers.size;
      workerFactor = 0.3 + (avgWorkerSkill * 0.7);
    }

    this._efficiency = (equipmentFactor + workerFactor) / 2;

    // Safety incidents reduce efficiency
    if (this._safetyIncidents > 0) {
      this._efficiency *= Math.max(0.5, 1 - (this._safetyIncidents * 0.1));
    }
  }

  // Utility methods
  getOperationStatus(): any {
    return {
      id: this._id,
      name: this._name,
      isActive: this._isActive,
      method: this._method,
      efficiency: this._efficiency,
      dailyOutput: this._dailyOutput,
      totalExtracted: this._totalExtracted,
      operationalCosts: this._operationalCosts,
      safetyRecord: {
        incidents: this._safetyIncidents,
        hoursWithoutIncident: this.calculateHoursWithoutIncident()
      },
      environmentalImpact: this._environmentalImpact,
      equipmentCount: this._equipment.size,
      workerCount: this._workers.size,
      depositRemaining: this._targetDeposit.volume - this._totalExtracted
    };
  }

  private calculateHoursWithoutIncident(): number {
    // Simplified calculation - would need incident timestamp tracking for accuracy
    return this._safetyIncidents > 0 ? Math.random() * 100 : this._totalExtracted / 10;
  }

  // Create basic equipment setups
  static createBasicSurfaceMiningEquipment(): Equipment[] {
    return [
      {
        id: 'excavator_01',
        type: EquipmentType.EXCAVATOR,
        capacity: 50, // tons per hour
        efficiency: 0.8,
        operationalCost: 200,
        maintenanceCost: 50,
        fuelConsumption: 25,
        condition: 1.0,
        age: 0
      },
      {
        id: 'dump_truck_01',
        type: EquipmentType.DUMP_TRUCK,
        capacity: 100,
        efficiency: 0.9,
        operationalCost: 150,
        maintenanceCost: 30,
        fuelConsumption: 20,
        condition: 1.0,
        age: 0
      },
      {
        id: 'crusher_01',
        type: EquipmentType.CRUSHER,
        capacity: 200,
        efficiency: 0.85,
        operationalCost: 300,
        maintenanceCost: 80,
        fuelConsumption: 40,
        condition: 1.0,
        age: 0
      }
    ];
  }

  static createBasicWorkforce(): Worker[] {
    return [
      {
        id: 'operator_01',
        skill: 0.7,
        experience: 5,
        specialization: 'heavy_machinery_operator',
        salary: 25,
        safety: 0.8,
        productivity: 0.8
      },
      {
        id: 'supervisor_01',
        skill: 0.9,
        experience: 15,
        specialization: 'mining_supervisor',
        salary: 35,
        safety: 0.95,
        productivity: 0.9
      },
      {
        id: 'maintenance_01',
        skill: 0.8,
        experience: 8,
        specialization: 'equipment_maintenance',
        salary: 28,
        safety: 0.85,
        productivity: 0.75
      }
    ];
  }
}