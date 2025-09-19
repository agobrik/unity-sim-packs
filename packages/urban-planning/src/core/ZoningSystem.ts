import { CityGrid, ZoneType, Position } from './CityGrid';

export interface ZoningPlan {
  name: string;
  zones: ZoningArea[];
  description: string;
}

export interface ZoningArea {
  positions: Position[];
  zoneType: ZoneType;
  restrictions: ZoningRestrictions;
  priority: number;
}

export interface ZoningRestrictions {
  maxPopulationDensity: number;
  maxBuildingHeight: number;
  minGreenSpace: number;
  maxPollution: number;
  requiredInfrastructure: string[];
}

export class ZoningSystem {
  private cityGrid: CityGrid;
  private zoningPlans: Map<string, ZoningPlan>;
  private activeRestrictions: Map<string, ZoningRestrictions>;

  constructor(cityGrid: CityGrid) {
    this.cityGrid = cityGrid;
    this.zoningPlans = new Map();
    this.activeRestrictions = new Map();
  }

  createZoningPlan(name: string, description: string): ZoningPlan {
    const plan: ZoningPlan = {
      name,
      description,
      zones: []
    };
    this.zoningPlans.set(name, plan);
    return plan;
  }

  addZoningArea(planName: string, area: ZoningArea): boolean {
    const plan = this.zoningPlans.get(planName);
    if (!plan) return false;

    plan.zones.push(area);
    return true;
  }

  applyZoningPlan(planName: string): boolean {
    const plan = this.zoningPlans.get(planName);
    if (!plan) return false;

    // Sort zones by priority (higher priority first)
    const sortedZones = [...plan.zones].sort((a, b) => b.priority - a.priority);

    for (const zone of sortedZones) {
      for (const pos of zone.positions) {
        if (!this.cityGrid.setZone(pos.x, pos.y, zone.zoneType)) {
          continue;
        }

        // Store restrictions for this position
        const key = `${pos.x},${pos.y}`;
        this.activeRestrictions.set(key, zone.restrictions);
      }
    }

    return true;
  }

  createResidentialZone(positions: Position[], density: 'low' | 'medium' | 'high' = 'medium'): ZoningArea {
    const restrictions = this.getResidentialRestrictions(density);
    return {
      positions,
      zoneType: ZoneType.RESIDENTIAL,
      restrictions,
      priority: 1
    };
  }

  createCommercialZone(positions: Position[], type: 'retail' | 'office' | 'mixed' = 'retail'): ZoningArea {
    const restrictions = this.getCommercialRestrictions(type);
    return {
      positions,
      zoneType: ZoneType.COMMERCIAL,
      restrictions,
      priority: 2
    };
  }

  createIndustrialZone(positions: Position[], type: 'light' | 'heavy' = 'light'): ZoningArea {
    const restrictions = this.getIndustrialRestrictions(type);
    return {
      positions,
      zoneType: ZoneType.INDUSTRIAL,
      restrictions,
      priority: 3
    };
  }

  createGreenSpace(positions: Position[]): ZoningArea {
    return {
      positions,
      zoneType: ZoneType.GREEN_SPACE,
      restrictions: {
        maxPopulationDensity: 0,
        maxBuildingHeight: 0,
        minGreenSpace: 1.0,
        maxPollution: 0.1,
        requiredInfrastructure: ['water']
      },
      priority: 5
    };
  }

  private getResidentialRestrictions(density: 'low' | 'medium' | 'high'): ZoningRestrictions {
    const restrictions = {
      low: {
        maxPopulationDensity: 50,
        maxBuildingHeight: 2,
        minGreenSpace: 0.3,
        maxPollution: 0.2,
        requiredInfrastructure: ['roads', 'water', 'power']
      },
      medium: {
        maxPopulationDensity: 150,
        maxBuildingHeight: 5,
        minGreenSpace: 0.2,
        maxPollution: 0.3,
        requiredInfrastructure: ['roads', 'water', 'power', 'internet']
      },
      high: {
        maxPopulationDensity: 300,
        maxBuildingHeight: 10,
        minGreenSpace: 0.1,
        maxPollution: 0.4,
        requiredInfrastructure: ['roads', 'water', 'power', 'internet', 'publicTransport']
      }
    };
    return restrictions[density];
  }

  private getCommercialRestrictions(type: 'retail' | 'office' | 'mixed'): ZoningRestrictions {
    const restrictions = {
      retail: {
        maxPopulationDensity: 0,
        maxBuildingHeight: 3,
        minGreenSpace: 0.1,
        maxPollution: 0.3,
        requiredInfrastructure: ['roads', 'power', 'internet']
      },
      office: {
        maxPopulationDensity: 0,
        maxBuildingHeight: 15,
        minGreenSpace: 0.05,
        maxPollution: 0.2,
        requiredInfrastructure: ['roads', 'power', 'internet', 'publicTransport']
      },
      mixed: {
        maxPopulationDensity: 100,
        maxBuildingHeight: 8,
        minGreenSpace: 0.15,
        maxPollution: 0.25,
        requiredInfrastructure: ['roads', 'water', 'power', 'internet']
      }
    };
    return restrictions[type];
  }

  private getIndustrialRestrictions(type: 'light' | 'heavy'): ZoningRestrictions {
    const restrictions = {
      light: {
        maxPopulationDensity: 20,
        maxBuildingHeight: 4,
        minGreenSpace: 0.1,
        maxPollution: 0.6,
        requiredInfrastructure: ['roads', 'power', 'water']
      },
      heavy: {
        maxPopulationDensity: 5,
        maxBuildingHeight: 8,
        minGreenSpace: 0.05,
        maxPollution: 0.8,
        requiredInfrastructure: ['roads', 'power', 'water', 'publicTransport']
      }
    };
    return restrictions[type];
  }

  checkZoningCompliance(x: number, y: number): { compliant: boolean; violations: string[] } {
    const cell = this.cityGrid.getCell(x, y);
    if (!cell) return { compliant: false, violations: ['Invalid position'] };

    const key = `${x},${y}`;
    const restrictions = this.activeRestrictions.get(key);
    if (!restrictions) return { compliant: true, violations: [] };

    const violations: string[] = [];

    // Check population density
    if (cell.population > restrictions.maxPopulationDensity) {
      violations.push(`Population density exceeds limit: ${cell.population}/${restrictions.maxPopulationDensity}`);
    }

    // Check pollution levels
    if (cell.pollution > restrictions.maxPollution) {
      violations.push(`Pollution exceeds limit: ${cell.pollution.toFixed(2)}/${restrictions.maxPollution}`);
    }

    // Check infrastructure requirements
    for (const requirement of restrictions.requiredInfrastructure) {
      const infraKey = requirement as keyof typeof cell.infrastructure;
      if (cell.infrastructure[infraKey] < 0.5) {
        violations.push(`Insufficient ${requirement} infrastructure`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  getZoningAnalysis(): {
    totalZonedArea: number;
    zoneDistribution: Record<ZoneType, number>;
    complianceRate: number;
    violations: Array<{ position: Position; violations: string[] }>;
  } {
    const analysis = {
      totalZonedArea: 0,
      zoneDistribution: {} as Record<ZoneType, number>,
      complianceRate: 0,
      violations: [] as Array<{ position: Position; violations: string[] }>
    };

    let compliantCells = 0;
    let totalCells = 0;

    // Initialize zone distribution
    Object.values(ZoneType).forEach(zoneType => {
      analysis.zoneDistribution[zoneType] = 0;
    });

    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (!cell) continue;

        totalCells++;

        if (cell.zoneType !== ZoneType.UNZONED) {
          analysis.totalZonedArea++;
          analysis.zoneDistribution[cell.zoneType]++;
        }

        const compliance = this.checkZoningCompliance(x, y);
        if (compliance.compliant) {
          compliantCells++;
        } else if (compliance.violations.length > 0) {
          analysis.violations.push({
            position: { x, y },
            violations: compliance.violations
          });
        }
      }
    }

    analysis.complianceRate = totalCells > 0 ? compliantCells / totalCells : 1;
    return analysis;
  }

  getZoningPlans(): ZoningPlan[] {
    return Array.from(this.zoningPlans.values());
  }

  removeZoningPlan(name: string): boolean {
    return this.zoningPlans.delete(name);
  }

  exportZoningData(): string {
    const data = {
      plans: Array.from(this.zoningPlans.entries()),
      restrictions: Array.from(this.activeRestrictions.entries()),
      analysis: this.getZoningAnalysis()
    };
    return JSON.stringify(data, null, 2);
  }
}