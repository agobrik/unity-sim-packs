import { CityGrid, Position, InfrastructureLevel } from './CityGrid';

export interface InfrastructureProject {
  id: string;
  name: string;
  type: InfrastructureType;
  positions: Position[];
  cost: number;
  constructionTime: number;
  maintenanceCost: number;
  benefits: InfrastructureBenefits;
  status: ProjectStatus;
  progress: number; // 0-1
}

export enum InfrastructureType {
  ROAD = 'road',
  HIGHWAY = 'highway',
  WATER_PIPE = 'water_pipe',
  POWER_LINE = 'power_line',
  INTERNET_CABLE = 'internet_cable',
  SUBWAY = 'subway',
  BUS_ROUTE = 'bus_route',
  BRIDGE = 'bridge',
  TUNNEL = 'tunnel',
  WATER_TREATMENT = 'water_treatment',
  POWER_PLANT = 'power_plant',
  INTERNET_HUB = 'internet_hub'
}

export enum ProjectStatus {
  PLANNED = 'planned',
  APPROVED = 'approved',
  IN_CONSTRUCTION = 'in_construction',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MAINTENANCE = 'maintenance'
}

export interface InfrastructureBenefits {
  trafficImprovement: number;
  accessibilityBonus: number;
  happinessBonus: number;
  economicBonus: number;
  radius: number;
}

export interface MaintenanceSchedule {
  projectId: string;
  nextMaintenance: number;
  maintenanceInterval: number;
  condition: number; // 0-1, 1 = perfect condition
}

export class InfrastructureManager {
  private cityGrid: CityGrid;
  private projects: Map<string, InfrastructureProject>;
  private maintenance: Map<string, MaintenanceSchedule>;
  private budget: number;
  private currentTime: number;

  constructor(cityGrid: CityGrid, initialBudget: number = 1000000) {
    this.cityGrid = cityGrid;
    this.projects = new Map();
    this.maintenance = new Map();
    this.budget = initialBudget;
    this.currentTime = 0;
  }

  createProject(name: string, type: InfrastructureType, positions: Position[]): string {
    const id = this.generateProjectId();
    const project: InfrastructureProject = {
      id,
      name,
      type,
      positions,
      cost: this.calculateCost(type, positions),
      constructionTime: this.calculateConstructionTime(type, positions),
      maintenanceCost: this.calculateMaintenanceCost(type, positions),
      benefits: this.calculateBenefits(type),
      status: ProjectStatus.PLANNED,
      progress: 0
    };

    this.projects.set(id, project);
    return id;
  }

  approveProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project || project.status !== ProjectStatus.PLANNED) return false;

    if (this.budget < project.cost) return false;

    project.status = ProjectStatus.APPROVED;
    return true;
  }

  startConstruction(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project || project.status !== ProjectStatus.APPROVED) return false;

    if (this.budget < project.cost) return false;

    this.budget -= project.cost;
    project.status = ProjectStatus.IN_CONSTRUCTION;
    project.progress = 0;

    return true;
  }

  updateConstruction(deltaTime: number): void {
    this.currentTime += deltaTime;

    for (const project of this.projects.values()) {
      if (project.status === ProjectStatus.IN_CONSTRUCTION) {
        const progressRate = deltaTime / project.constructionTime;
        project.progress = Math.min(1, project.progress + progressRate);

        if (project.progress >= 1) {
          this.completeProject(project.id);
        }
      }
    }

    this.processMaintenance();
  }

  private completeProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project) return;

    project.status = ProjectStatus.COMPLETED;
    project.progress = 1;

    // Apply infrastructure benefits to affected cells
    this.applyInfrastructure(project);

    // Schedule maintenance
    this.scheduleMaintenance(project);
  }

  private applyInfrastructure(project: InfrastructureProject): void {
    for (const pos of project.positions) {
      const cell = this.cityGrid.getCell(pos.x, pos.y);
      if (!cell) continue;

      switch (project.type) {
        case InfrastructureType.ROAD:
        case InfrastructureType.HIGHWAY:
          cell.infrastructure.roads = Math.min(1, cell.infrastructure.roads + 0.3);
          cell.traffic = Math.max(0, cell.traffic - 0.2);
          break;

        case InfrastructureType.WATER_PIPE:
        case InfrastructureType.WATER_TREATMENT:
          cell.infrastructure.water = Math.min(1, cell.infrastructure.water + 0.4);
          break;

        case InfrastructureType.POWER_LINE:
        case InfrastructureType.POWER_PLANT:
          cell.infrastructure.power = Math.min(1, cell.infrastructure.power + 0.4);
          break;

        case InfrastructureType.INTERNET_CABLE:
        case InfrastructureType.INTERNET_HUB:
          cell.infrastructure.internet = Math.min(1, cell.infrastructure.internet + 0.4);
          break;

        case InfrastructureType.SUBWAY:
        case InfrastructureType.BUS_ROUTE:
          cell.infrastructure.publicTransport = Math.min(1, cell.infrastructure.publicTransport + 0.3);
          cell.traffic = Math.max(0, cell.traffic - 0.3);
          break;
      }

      // Apply area benefits
      this.applyAreaBenefits(pos, project.benefits);
    }
  }

  private applyAreaBenefits(center: Position, benefits: InfrastructureBenefits): void {
    const radius = benefits.radius;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) continue;

        const cell = this.cityGrid.getCell(center.x + dx, center.y + dy);
        if (!cell) continue;

        const effect = 1 - (distance / radius); // Diminishing effect with distance

        cell.traffic = Math.max(0, cell.traffic - benefits.trafficImprovement * effect);
        cell.happiness = Math.min(1, cell.happiness + benefits.happinessBonus * effect);
        cell.commercialValue = Math.min(1, cell.commercialValue + benefits.economicBonus * effect);
      }
    }
  }

  private scheduleMaintenance(project: InfrastructureProject): void {
    const schedule: MaintenanceSchedule = {
      projectId: project.id,
      nextMaintenance: this.currentTime + this.getMaintenanceInterval(project.type),
      maintenanceInterval: this.getMaintenanceInterval(project.type),
      condition: 1.0
    };

    this.maintenance.set(project.id, schedule);
  }

  private processMaintenance(): void {
    for (const schedule of this.maintenance.values()) {
      const project = this.projects.get(schedule.projectId);
      if (!project || project.status !== ProjectStatus.COMPLETED) continue;

      // Degrade condition over time
      const timeSinceLastMaintenance = this.currentTime - (schedule.nextMaintenance - schedule.maintenanceInterval);
      const degradationRate = 0.1 / schedule.maintenanceInterval;
      schedule.condition = Math.max(0, 1 - (timeSinceLastMaintenance * degradationRate));

      // Check if maintenance is due
      if (this.currentTime >= schedule.nextMaintenance) {
        this.performMaintenance(schedule);
      }

      // Apply condition effects
      this.applyConditionEffects(project, schedule.condition);
    }
  }

  private performMaintenance(schedule: MaintenanceSchedule): void {
    const project = this.projects.get(schedule.projectId);
    if (!project) return;

    const cost = project.maintenanceCost * (1 - schedule.condition);

    if (this.budget >= cost) {
      this.budget -= cost;
      schedule.condition = 1.0;
      schedule.nextMaintenance = this.currentTime + schedule.maintenanceInterval;
      project.status = ProjectStatus.COMPLETED;
    } else {
      project.status = ProjectStatus.MAINTENANCE;
    }
  }

  private applyConditionEffects(project: InfrastructureProject, condition: number): void {
    for (const pos of project.positions) {
      const cell = this.cityGrid.getCell(pos.x, pos.y);
      if (!cell) continue;

      // Poor condition reduces infrastructure effectiveness
      const effectiveness = 0.5 + (condition * 0.5);

      switch (project.type) {
        case InfrastructureType.ROAD:
        case InfrastructureType.HIGHWAY:
          cell.traffic += (1 - effectiveness) * 0.1;
          break;

        case InfrastructureType.WATER_PIPE:
          cell.infrastructure.water *= effectiveness;
          break;

        case InfrastructureType.POWER_LINE:
          cell.infrastructure.power *= effectiveness;
          break;
      }
    }
  }

  private calculateCost(type: InfrastructureType, positions: Position[]): number {
    const baseCosts = {
      [InfrastructureType.ROAD]: 1000,
      [InfrastructureType.HIGHWAY]: 5000,
      [InfrastructureType.WATER_PIPE]: 2000,
      [InfrastructureType.POWER_LINE]: 1500,
      [InfrastructureType.INTERNET_CABLE]: 800,
      [InfrastructureType.SUBWAY]: 50000,
      [InfrastructureType.BUS_ROUTE]: 10000,
      [InfrastructureType.BRIDGE]: 25000,
      [InfrastructureType.TUNNEL]: 75000,
      [InfrastructureType.WATER_TREATMENT]: 100000,
      [InfrastructureType.POWER_PLANT]: 500000,
      [InfrastructureType.INTERNET_HUB]: 50000
    };

    return baseCosts[type] * positions.length;
  }

  private calculateConstructionTime(type: InfrastructureType, positions: Position[]): number {
    const baseTimes = {
      [InfrastructureType.ROAD]: 5,
      [InfrastructureType.HIGHWAY]: 15,
      [InfrastructureType.WATER_PIPE]: 8,
      [InfrastructureType.POWER_LINE]: 6,
      [InfrastructureType.INTERNET_CABLE]: 4,
      [InfrastructureType.SUBWAY]: 100,
      [InfrastructureType.BUS_ROUTE]: 20,
      [InfrastructureType.BRIDGE]: 50,
      [InfrastructureType.TUNNEL]: 150,
      [InfrastructureType.WATER_TREATMENT]: 200,
      [InfrastructureType.POWER_PLANT]: 1000,
      [InfrastructureType.INTERNET_HUB]: 100
    };

    return baseTimes[type] * Math.sqrt(positions.length);
  }

  private calculateMaintenanceCost(type: InfrastructureType, positions: Position[]): number {
    return this.calculateCost(type, positions) * 0.1;
  }

  private calculateBenefits(type: InfrastructureType): InfrastructureBenefits {
    const benefits = {
      [InfrastructureType.ROAD]: { trafficImprovement: 0.2, accessibilityBonus: 0.1, happinessBonus: 0.05, economicBonus: 0.1, radius: 2 },
      [InfrastructureType.HIGHWAY]: { trafficImprovement: 0.4, accessibilityBonus: 0.3, happinessBonus: 0.02, economicBonus: 0.2, radius: 5 },
      [InfrastructureType.WATER_PIPE]: { trafficImprovement: 0, accessibilityBonus: 0.05, happinessBonus: 0.15, economicBonus: 0.05, radius: 3 },
      [InfrastructureType.POWER_LINE]: { trafficImprovement: 0, accessibilityBonus: 0.05, happinessBonus: 0.1, economicBonus: 0.2, radius: 4 },
      [InfrastructureType.INTERNET_CABLE]: { trafficImprovement: 0, accessibilityBonus: 0.1, happinessBonus: 0.05, economicBonus: 0.3, radius: 3 },
      [InfrastructureType.SUBWAY]: { trafficImprovement: 0.5, accessibilityBonus: 0.4, happinessBonus: 0.1, economicBonus: 0.3, radius: 8 },
      [InfrastructureType.BUS_ROUTE]: { trafficImprovement: 0.3, accessibilityBonus: 0.2, happinessBonus: 0.05, economicBonus: 0.15, radius: 4 },
      [InfrastructureType.BRIDGE]: { trafficImprovement: 0.3, accessibilityBonus: 0.4, happinessBonus: 0.05, economicBonus: 0.2, radius: 2 },
      [InfrastructureType.TUNNEL]: { trafficImprovement: 0.4, accessibilityBonus: 0.5, happinessBonus: 0.02, economicBonus: 0.25, radius: 3 },
      [InfrastructureType.WATER_TREATMENT]: { trafficImprovement: 0, accessibilityBonus: 0, happinessBonus: 0.2, economicBonus: 0.1, radius: 10 },
      [InfrastructureType.POWER_PLANT]: { trafficImprovement: 0, accessibilityBonus: 0, happinessBonus: 0.1, economicBonus: 0.3, radius: 15 },
      [InfrastructureType.INTERNET_HUB]: { trafficImprovement: 0, accessibilityBonus: 0.1, happinessBonus: 0.05, economicBonus: 0.4, radius: 12 }
    };

    return benefits[type] || { trafficImprovement: 0.1, accessibilityBonus: 0.05, happinessBonus: 0.02, economicBonus: 0.05, radius: 1 };
  }

  private getMaintenanceInterval(type: InfrastructureType): number {
    const intervals = {
      [InfrastructureType.ROAD]: 1000,
      [InfrastructureType.HIGHWAY]: 800,
      [InfrastructureType.WATER_PIPE]: 1500,
      [InfrastructureType.POWER_LINE]: 1200,
      [InfrastructureType.INTERNET_CABLE]: 2000,
      [InfrastructureType.SUBWAY]: 500,
      [InfrastructureType.BUS_ROUTE]: 300,
      [InfrastructureType.BRIDGE]: 2000,
      [InfrastructureType.TUNNEL]: 3000,
      [InfrastructureType.WATER_TREATMENT]: 2500,
      [InfrastructureType.POWER_PLANT]: 1000,
      [InfrastructureType.INTERNET_HUB]: 1800
    };

    return intervals[type] || 1000;
  }

  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getBudget(): number {
    return this.budget;
  }

  addBudget(amount: number): void {
    this.budget += amount;
  }

  getProject(id: string): InfrastructureProject | undefined {
    return this.projects.get(id);
  }

  getAllProjects(): InfrastructureProject[] {
    return Array.from(this.projects.values());
  }

  getProjectsByStatus(status: ProjectStatus): InfrastructureProject[] {
    return Array.from(this.projects.values()).filter(p => p.status === status);
  }

  getMaintenanceSchedule(): MaintenanceSchedule[] {
    return Array.from(this.maintenance.values());
  }

  cancelProject(projectId: string): boolean {
    const project = this.projects.get(projectId);
    if (!project || project.status === ProjectStatus.COMPLETED) return false;

    if (project.status === ProjectStatus.IN_CONSTRUCTION) {
      // Refund partial cost based on progress
      const refund = project.cost * (1 - project.progress);
      this.budget += refund;
    }

    project.status = ProjectStatus.CANCELLED;
    return true;
  }

  exportInfrastructureData(): string {
    const data = {
      projects: Array.from(this.projects.entries()),
      maintenance: Array.from(this.maintenance.entries()),
      budget: this.budget,
      currentTime: this.currentTime
    };
    return JSON.stringify(data, null, 2);
  }
}