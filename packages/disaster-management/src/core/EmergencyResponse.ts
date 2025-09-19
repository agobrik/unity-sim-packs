import { Disaster, DisasterType, DisasterImpact } from './Disaster';

export interface EmergencyResource {
  id: string;
  type: ResourceType;
  capacity: number;
  currentLocation: { x: number; y: number };
  targetLocation: { x: number; y: number } | null;
  isActive: boolean;
  efficiency: number; // 0-1
  personnel: number;
  equipment: string[];
  maintenanceLevel: number; // 0-1
}

export interface ResponseAction {
  id: string;
  type: ActionType;
  resourceIds: string[];
  targetArea: { x: number; y: number; radius: number };
  priority: Priority;
  status: ActionStatus;
  estimatedDuration: number;
  actualDuration: number;
  effectiveness: number; // 0-1
  cost: number;
}

export interface EvacuationZone {
  id: string;
  area: { x: number; y: number; radius: number };
  population: number;
  evacuatedPopulation: number;
  evacuationProgress: number; // 0-1
  evacuationRoutes: { x: number; y: number }[][];
  shelterCapacity: number;
  transportationNeeded: number;
}

export interface CommunicationSystem {
  id: string;
  type: 'radio' | 'cellular' | 'satellite' | 'internet' | 'broadcast';
  coverage: { x: number; y: number; radius: number }[];
  isOperational: boolean;
  reliability: number; // 0-1
  capacity: number;
  currentLoad: number;
}

export type ResourceType =
  | 'fire-department' | 'police' | 'ambulance' | 'search-rescue'
  | 'military' | 'medical-team' | 'hazmat' | 'engineering'
  | 'helicopter' | 'boat' | 'heavy-equipment' | 'shelter'
  | 'supply-distribution' | 'communication' | 'logistics';

export type ActionType =
  | 'evacuation' | 'search-rescue' | 'firefighting' | 'medical-aid'
  | 'debris-removal' | 'infrastructure-repair' | 'supply-distribution'
  | 'security' | 'hazmat-cleanup' | 'communication-setup'
  | 'transportation' | 'shelter-setup' | 'assessment' | 'logistics';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled' | 'failed';

export class EmergencyResponse {
  private _id: string;
  private _disaster: Disaster;
  private _resources: Map<string, EmergencyResource>;
  private _actions: Map<string, ResponseAction>;
  private _evacuationZones: Map<string, EvacuationZone>;
  private _communications: Map<string, CommunicationSystem>;
  private _commandCenter: { x: number; y: number };
  private _responseLevel: number; // 1-5 scale
  private _coordination: number; // 0-1 effectiveness
  private _totalCost: number;

  constructor(
    id: string,
    disaster: Disaster,
    commandCenter: { x: number; y: number }
  ) {
    this._id = id;
    this._disaster = disaster;
    this._resources = new Map();
    this._actions = new Map();
    this._evacuationZones = new Map();
    this._communications = new Map();
    this._commandCenter = commandCenter;
    this._responseLevel = 1;
    this._coordination = 0.8; // Start with good coordination
    this._totalCost = 0;

    this.initializeBasicResources();
    this.initializeCommunications();
  }

  get id(): string {
    return this._id;
  }

  get disaster(): Disaster {
    return this._disaster;
  }

  get resources(): EmergencyResource[] {
    return Array.from(this._resources.values());
  }

  get actions(): ResponseAction[] {
    return Array.from(this._actions.values());
  }

  get evacuationZones(): EvacuationZone[] {
    return Array.from(this._evacuationZones.values());
  }

  get responseLevel(): number {
    return this._responseLevel;
  }

  get coordination(): number {
    return this._coordination;
  }

  get totalCost(): number {
    return this._totalCost;
  }

  private initializeBasicResources(): void {
    // Initialize basic emergency resources based on disaster type
    const disasterType = this._disaster.type;
    const intensity = this._disaster.config.intensity;

    // Fire departments
    this.addResource('fire-dept-1', 'fire-department', {
      x: this._commandCenter.x - 5,
      y: this._commandCenter.y,
      capacity: 50,
      personnel: 25,
      equipment: ['fire-truck', 'ladder-truck', 'rescue-vehicle'],
      efficiency: 0.85
    });

    // Police
    this.addResource('police-1', 'police', {
      x: this._commandCenter.x + 5,
      y: this._commandCenter.y,
      capacity: 30,
      personnel: 15,
      equipment: ['patrol-cars', 'motorcycles', 'communication'],
      efficiency: 0.8
    });

    // Ambulances
    this.addResource('ambulance-1', 'ambulance', {
      x: this._commandCenter.x,
      y: this._commandCenter.y - 3,
      capacity: 20,
      personnel: 12,
      equipment: ['ambulances', 'medical-supplies', 'communication'],
      efficiency: 0.9
    });

    // Specialized resources based on disaster type
    if (['earthquake', 'tornado', 'hurricane'].includes(disasterType)) {
      this.addResource('search-rescue-1', 'search-rescue', {
        x: this._commandCenter.x,
        y: this._commandCenter.y + 3,
        capacity: 40,
        personnel: 20,
        equipment: ['rescue-dogs', 'heavy-equipment', 'detection-gear'],
        efficiency: 0.75
      });
    }

    if (['flood', 'tsunami'].includes(disasterType)) {
      this.addResource('boat-team-1', 'boat', {
        x: this._commandCenter.x - 8,
        y: this._commandCenter.y,
        capacity: 25,
        personnel: 10,
        equipment: ['rescue-boats', 'life-jackets', 'diving-gear'],
        efficiency: 0.8
      });
    }

    if (['fire', 'industrial-accident'].includes(disasterType)) {
      this.addResource('hazmat-1', 'hazmat', {
        x: this._commandCenter.x + 8,
        y: this._commandCenter.y,
        capacity: 15,
        personnel: 8,
        equipment: ['hazmat-suits', 'decontamination', 'chemical-sensors'],
        efficiency: 0.85
      });
    }

    // Scale resources based on disaster intensity
    if (intensity > 7) {
      this.addResource('military-support', 'military', {
        x: this._commandCenter.x,
        y: this._commandCenter.y + 10,
        capacity: 100,
        personnel: 50,
        equipment: ['helicopters', 'heavy-equipment', 'logistics'],
        efficiency: 0.9
      });
    }
  }

  private initializeCommunications(): void {
    // Primary command center communication
    this._communications.set('command-radio', {
      id: 'command-radio',
      type: 'radio',
      coverage: [{ x: this._commandCenter.x, y: this._commandCenter.y, radius: 20 }],
      isOperational: true,
      reliability: 0.95,
      capacity: 100,
      currentLoad: 10
    });

    // Emergency broadcast system
    this._communications.set('emergency-broadcast', {
      id: 'emergency-broadcast',
      type: 'broadcast',
      coverage: [{ x: this._commandCenter.x, y: this._commandCenter.y, radius: 50 }],
      isOperational: true,
      reliability: 0.9,
      capacity: 1000000, // Public broadcast
      currentLoad: 0
    });

    // Cellular backup
    this._communications.set('cellular-backup', {
      id: 'cellular-backup',
      type: 'cellular',
      coverage: [{ x: this._commandCenter.x, y: this._commandCenter.y, radius: 15 }],
      isOperational: true,
      reliability: 0.7, // May be affected by disaster
      capacity: 1000,
      currentLoad: 200
    });
  }

  addResource(
    id: string,
    type: ResourceType,
    config: {
      x: number;
      y: number;
      capacity: number;
      personnel: number;
      equipment: string[];
      efficiency: number;
    }
  ): void {
    const resource: EmergencyResource = {
      id,
      type,
      capacity: config.capacity,
      currentLocation: { x: config.x, y: config.y },
      targetLocation: null,
      isActive: true,
      efficiency: config.efficiency,
      personnel: config.personnel,
      equipment: config.equipment,
      maintenanceLevel: 1.0
    };

    this._resources.set(id, resource);
  }

  createResponseAction(
    id: string,
    type: ActionType,
    resourceIds: string[],
    targetArea: { x: number; y: number; radius: number },
    priority: Priority = 'medium'
  ): boolean {
    // Validate resources exist and are available
    const availableResources = resourceIds.filter(rid => {
      const resource = this._resources.get(rid);
      return resource && resource.isActive && !this.isResourceBusy(rid);
    });

    if (availableResources.length === 0) {
      return false;
    }

    const estimatedDuration = this.calculateActionDuration(type, availableResources.length);
    const cost = this.calculateActionCost(type, availableResources);

    const action: ResponseAction = {
      id,
      type,
      resourceIds: availableResources,
      targetArea,
      priority,
      status: 'planned',
      estimatedDuration,
      actualDuration: 0,
      effectiveness: 0,
      cost
    };

    this._actions.set(id, action);
    return true;
  }

  private isResourceBusy(resourceId: string): boolean {
    for (const action of this._actions.values()) {
      if (action.status === 'in-progress' && action.resourceIds.includes(resourceId)) {
        return true;
      }
    }
    return false;
  }

  private calculateActionDuration(type: ActionType, resourceCount: number): number {
    const baseDurations: Record<ActionType, number> = {
      evacuation: 12,
      'search-rescue': 24,
      firefighting: 8,
      'medical-aid': 4,
      'debris-removal': 48,
      'infrastructure-repair': 72,
      'supply-distribution': 6,
      security: 12,
      'hazmat-cleanup': 36,
      'communication-setup': 8,
      transportation: 2,
      'shelter-setup': 12,
      assessment: 4,
      logistics: 6
    };

    const baseDuration = baseDurations[type] || 8;
    // More resources reduce duration but with diminishing returns
    const efficiencyFactor = Math.min(1.5, 1 + Math.log(resourceCount) / 10);
    return baseDuration / efficiencyFactor;
  }

  private calculateActionCost(type: ActionType, resourceIds: string[]): number {
    const baseCosts: Record<ActionType, number> = {
      evacuation: 50000,
      'search-rescue': 30000,
      firefighting: 20000,
      'medical-aid': 15000,
      'debris-removal': 100000,
      'infrastructure-repair': 500000,
      'supply-distribution': 25000,
      security: 10000,
      'hazmat-cleanup': 200000,
      'communication-setup': 40000,
      transportation: 5000,
      'shelter-setup': 75000,
      assessment: 8000,
      logistics: 20000
    };

    const baseCost = baseCosts[type] || 10000;

    // Add resource-specific costs
    let resourceCost = 0;
    for (const resourceId of resourceIds) {
      const resource = this._resources.get(resourceId);
      if (resource) {
        resourceCost += resource.personnel * 100; // Cost per personnel per hour
      }
    }

    return baseCost + resourceCost;
  }

  updateActions(currentTime: number, deltaTime: number): void {
    for (const action of this._actions.values()) {
      if (action.status === 'planned') {
        this.startAction(action);
      } else if (action.status === 'in-progress') {
        this.updateAction(action, deltaTime);
      }
    }
  }

  private startAction(action: ResponseAction): void {
    // Move resources to target location
    for (const resourceId of action.resourceIds) {
      const resource = this._resources.get(resourceId);
      if (resource) {
        resource.targetLocation = {
          x: action.targetArea.x,
          y: action.targetArea.y
        };
      }
    }

    action.status = 'in-progress';
  }

  private updateAction(action: ResponseAction, deltaTime: number): void {
    action.actualDuration += deltaTime;

    // Calculate action effectiveness
    const progress = action.actualDuration / action.estimatedDuration;
    const resourceEfficiency = this.calculateResourceEfficiency(action.resourceIds);

    action.effectiveness = Math.min(1, progress * resourceEfficiency * this._coordination);

    // Complete action if duration reached
    if (action.actualDuration >= action.estimatedDuration) {
      this.completeAction(action);
    }
  }

  private calculateResourceEfficiency(resourceIds: string[]): number {
    let totalEfficiency = 0;
    let resourceCount = 0;

    for (const resourceId of resourceIds) {
      const resource = this._resources.get(resourceId);
      if (resource && resource.isActive) {
        totalEfficiency += resource.efficiency * resource.maintenanceLevel;
        resourceCount++;
      }
    }

    return resourceCount > 0 ? totalEfficiency / resourceCount : 0;
  }

  private completeAction(action: ResponseAction): void {
    action.status = 'completed';
    this._totalCost += action.cost;

    // Apply action effects based on type and effectiveness
    this.applyActionEffects(action);

    // Free up resources
    for (const resourceId of action.resourceIds) {
      const resource = this._resources.get(resourceId);
      if (resource) {
        resource.targetLocation = null;
        // Reduce maintenance level slightly
        resource.maintenanceLevel = Math.max(0.1, resource.maintenanceLevel - 0.05);
      }
    }
  }

  private applyActionEffects(action: ResponseAction): void {
    const effectiveness = action.effectiveness;

    switch (action.type) {
      case 'evacuation':
        this.improveEvacuationProgress(action.targetArea, effectiveness);
        break;
      case 'search-rescue':
        this.rescuePeople(action.targetArea, effectiveness);
        break;
      case 'firefighting':
        this.reduceFire(action.targetArea, effectiveness);
        break;
      case 'medical-aid':
        this.provideMedicalCare(action.targetArea, effectiveness);
        break;
      case 'infrastructure-repair':
        this.repairInfrastructure(action.targetArea, effectiveness);
        break;
      // Add other action effects as needed
    }
  }

  private improveEvacuationProgress(area: { x: number; y: number; radius: number }, effectiveness: number): void {
    for (const zone of this._evacuationZones.values()) {
      if (this.areasOverlap(zone.area, area)) {
        zone.evacuationProgress = Math.min(1, zone.evacuationProgress + effectiveness * 0.3);
        zone.evacuatedPopulation = Math.floor(zone.population * zone.evacuationProgress);
      }
    }
  }

  private rescuePeople(area: { x: number; y: number; radius: number }, effectiveness: number): void {
    // Implementation for rescue operations
    // This would integrate with population or urban planning systems
  }

  private reduceFire(area: { x: number; y: number; radius: number }, effectiveness: number): void {
    // Implementation for firefighting effects
    // This would reduce disaster intensity if it's a fire
    if (this._disaster.type === 'fire') {
      // Reduce fire intensity in the area (would need disaster system integration)
    }
  }

  private provideMedicalCare(area: { x: number; y: number; radius: number }, effectiveness: number): void {
    // Implementation for medical aid effects
    // This would reduce casualties and improve recovery
  }

  private repairInfrastructure(area: { x: number; y: number; radius: number }, effectiveness: number): void {
    // Implementation for infrastructure repair
    // This would restore functionality to damaged infrastructure
  }

  createEvacuationZone(
    id: string,
    area: { x: number; y: number; radius: number },
    population: number
  ): void {
    const zone: EvacuationZone = {
      id,
      area,
      population,
      evacuatedPopulation: 0,
      evacuationProgress: 0,
      evacuationRoutes: this.calculateEvacuationRoutes(area),
      shelterCapacity: Math.floor(population * 1.2), // 20% buffer
      transportationNeeded: Math.ceil(population / 50) // 50 people per transport
    };

    this._evacuationZones.set(id, zone);
  }

  private calculateEvacuationRoutes(area: { x: number; y: number; radius: number }): { x: number; y: number }[][] {
    // Calculate optimal evacuation routes from area to safety
    const routes: { x: number; y: number }[][] = [];

    // Create 4 routes in cardinal directions
    const directions = [
      { dx: 0, dy: 1 },   // North
      { dx: 1, dy: 0 },   // East
      { dx: 0, dy: -1 },  // South
      { dx: -1, dy: 0 }   // West
    ];

    for (const direction of directions) {
      const route: { x: number; y: number }[] = [];
      let currentX = area.x;
      let currentY = area.y;

      // Create route extending away from disaster
      for (let i = 0; i < 10; i++) {
        currentX += direction.dx * 2;
        currentY += direction.dy * 2;
        route.push({ x: currentX, y: currentY });
      }

      routes.push(route);
    }

    return routes;
  }

  private areasOverlap(area1: { x: number; y: number; radius: number }, area2: { x: number; y: number; radius: number }): boolean {
    const distance = Math.sqrt(
      Math.pow(area1.x - area2.x, 2) + Math.pow(area1.y - area2.y, 2)
    );
    return distance < (area1.radius + area2.radius);
  }

  getResponseEffectiveness(): number {
    const completedActions = Array.from(this._actions.values()).filter(a => a.status === 'completed');
    if (completedActions.length === 0) return 0;

    const averageEffectiveness = completedActions.reduce((sum, action) => sum + action.effectiveness, 0) / completedActions.length;
    return averageEffectiveness * this._coordination;
  }

  getResourceUtilization(): number {
    const totalResources = this._resources.size;
    const activeResources = Array.from(this._resources.values()).filter(r => r.isActive).length;
    return totalResources > 0 ? activeResources / totalResources : 0;
  }

  escalateResponse(): void {
    if (this._responseLevel < 5) {
      this._responseLevel++;

      // Add additional resources based on response level
      this.addAdditionalResources();

      // Request external help
      if (this._responseLevel >= 4) {
        this.requestExternalAssistance();
      }
    }
  }

  private addAdditionalResources(): void {
    const resourceTypes: ResourceType[] = ['ambulance', 'fire-department', 'search-rescue'];

    for (const type of resourceTypes) {
      const newId = `${type}-${this._responseLevel}`;
      this.addResource(newId, type, {
        x: this._commandCenter.x + (Math.random() - 0.5) * 10,
        y: this._commandCenter.y + (Math.random() - 0.5) * 10,
        capacity: 30,
        personnel: 15,
        equipment: ['basic-equipment'],
        efficiency: 0.8
      });
    }
  }

  private requestExternalAssistance(): void {
    // Add federal/military resources
    this.addResource(`federal-assistance-${this._responseLevel}`, 'military', {
      x: this._commandCenter.x,
      y: this._commandCenter.y + 15,
      capacity: 200,
      personnel: 100,
      equipment: ['helicopters', 'heavy-equipment', 'advanced-medical'],
      efficiency: 0.95
    });
  }

  getDamageAssessment(): {
    affectedArea: number;
    estimatedCasualties: number;
    infrastructureDamage: number;
    economicImpact: number;
  } {
    const disasterImpact = this._disaster.totalImpact;
    const disasterRadius = this._disaster.getCurrentRadius();

    return {
      affectedArea: Math.PI * disasterRadius * disasterRadius,
      estimatedCasualties: disasterImpact.populationAffected,
      infrastructureDamage: disasterImpact.infrastructureDisruption,
      economicImpact: disasterImpact.economicLoss + this._totalCost
    };
  }
}