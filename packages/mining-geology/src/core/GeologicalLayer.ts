export enum RockType {
  SEDIMENTARY = 'sedimentary',
  IGNEOUS = 'igneous',
  METAMORPHIC = 'metamorphic'
}

export enum MineralType {
  COAL = 'coal',
  IRON_ORE = 'iron_ore',
  COPPER = 'copper',
  GOLD = 'gold',
  SILVER = 'silver',
  DIAMOND = 'diamond',
  LIMESTONE = 'limestone',
  GRANITE = 'granite',
  SANDSTONE = 'sandstone',
  QUARTZ = 'quartz',
  URANIUM = 'uranium',
  LITHIUM = 'lithium'
}

export interface GeologicalProperty {
  hardness: number; // 1-10 (Mohs scale)
  density: number; // kg/m³
  porosity: number; // 0-1
  permeability: number; // 0-1
  stability: number; // 0-1
}

export interface Position3D {
  x: number;
  y: number;
  z: number; // depth (negative values for underground)
}

export interface MineralDeposit {
  id: string;
  type: MineralType;
  position: Position3D;
  volume: number; // cubic meters
  concentration: number; // 0-1 (purity/grade)
  quality: number; // 0-1 (market quality)
  discoveryDifficulty: number; // 0-1
  extractionDifficulty: number; // 0-1
  estimatedValue: number; // per cubic meter
  isDiscovered: boolean;
  isAccessible: boolean;
}

export class GeologicalLayer {
  private _id: string;
  private _depth: number;
  private _thickness: number;
  private _rockType: RockType;
  private _properties: GeologicalProperty;
  private _mineralDeposits: Map<string, MineralDeposit>;
  private _stability: number;
  private _waterTable: boolean;

  constructor(
    id: string,
    depth: number,
    thickness: number,
    rockType: RockType,
    properties: GeologicalProperty
  ) {
    this._id = id;
    this._depth = depth;
    this._thickness = thickness;
    this._rockType = rockType;
    this._properties = properties;
    this._mineralDeposits = new Map();
    this._stability = properties.stability;
    this._waterTable = Math.random() > 0.7; // 30% chance of water table
  }

  get id(): string { return this._id; }
  get depth(): number { return this._depth; }
  get thickness(): number { return this._thickness; }
  get rockType(): RockType { return this._rockType; }
  get properties(): GeologicalProperty { return { ...this._properties }; }
  get stability(): number { return this._stability; }
  get hasWaterTable(): boolean { return this._waterTable; }
  get mineralDeposits(): MineralDeposit[] { return Array.from(this._mineralDeposits.values()); }

  addMineralDeposit(deposit: MineralDeposit): void {
    // Ensure deposit is within layer bounds
    if (deposit.position.z >= this._depth &&
        deposit.position.z <= this._depth + this._thickness) {
      this._mineralDeposits.set(deposit.id, deposit);
    }
  }

  removeMineralDeposit(depositId: string): boolean {
    return this._mineralDeposits.delete(depositId);
  }

  getMineralDeposit(depositId: string): MineralDeposit | undefined {
    return this._mineralDeposits.get(depositId);
  }

  // Survey methods
  conductGeologicalSurvey(surveyAccuracy: number): MineralDeposit[] {
    const discoveredDeposits: MineralDeposit[] = [];

    for (const deposit of this._mineralDeposits.values()) {
      if (!deposit.isDiscovered) {
        const discoveryChance = surveyAccuracy * (1 - deposit.discoveryDifficulty);

        if (Math.random() < discoveryChance) {
          deposit.isDiscovered = true;

          // Survey accuracy affects how well we estimate the deposit
          const estimationError = (1 - surveyAccuracy) * 0.3;
          const volumeEstimate = deposit.volume * (1 + (Math.random() - 0.5) * estimationError);
          const concentrationEstimate = deposit.concentration * (1 + (Math.random() - 0.5) * estimationError);

          discoveredDeposits.push({
            ...deposit,
            volume: volumeEstimate,
            concentration: concentrationEstimate
          });
        }
      }
    }

    return discoveredDeposits;
  }

  // Calculate mining difficulty for this layer
  getMiningDifficulty(): number {
    let difficulty = 0.5; // Base difficulty

    // Rock hardness factor
    difficulty += this._properties.hardness / 20; // Max +0.5

    // Depth factor
    difficulty += Math.abs(this._depth) / 200; // Deeper = harder

    // Water table increases difficulty
    if (this._waterTable) {
      difficulty += 0.2;
    }

    // Stability affects difficulty
    difficulty += (1 - this._properties.stability) * 0.3;

    return Math.min(1, difficulty);
  }

  // Calculate environmental impact of mining this layer
  getEnvironmentalImpact(): number {
    let impact = 0.3; // Base impact

    // Water table contamination risk
    if (this._waterTable) {
      impact += 0.3;
    }

    // Stability issues cause more surface disruption
    impact += (1 - this._properties.stability) * 0.2;

    // Deeper mining has less surface impact but more subsurface
    const depthFactor = Math.abs(this._depth) / 100;
    impact += depthFactor * 0.1;

    return Math.min(1, impact);
  }

  // Simulate layer degradation from mining
  degradeFromMining(extractionVolume: number): void {
    const degradationFactor = extractionVolume / (this._thickness * 100);

    // Reduce stability
    this._stability = Math.max(0.1, this._stability - degradationFactor * 0.1);

    // Update properties
    this._properties.stability = this._stability;
    this._properties.porosity = Math.min(1, this._properties.porosity + degradationFactor * 0.05);
  }

  // Generate random mineral deposits for testing
  generateRandomDeposits(count: number, areaSize: { width: number; height: number }): void {
    const mineralTypes = Object.values(MineralType);

    for (let i = 0; i < count; i++) {
      const mineralType = mineralTypes[Math.floor(Math.random() * mineralTypes.length)];
      const depositId = `deposit_${this._id}_${i}`;

      const position: Position3D = {
        x: Math.random() * areaSize.width,
        y: Math.random() * areaSize.height,
        z: this._depth + Math.random() * this._thickness
      };

      const deposit: MineralDeposit = {
        id: depositId,
        type: mineralType,
        position: position,
        volume: 100 + Math.random() * 1000, // 100-1100 cubic meters
        concentration: 0.1 + Math.random() * 0.8, // 10-90% concentration
        quality: 0.3 + Math.random() * 0.7, // 30-100% quality
        discoveryDifficulty: Math.random() * 0.8, // 0-80% difficulty
        extractionDifficulty: this.getMiningDifficulty(),
        estimatedValue: this.calculateMineralValue(mineralType),
        isDiscovered: false,
        isAccessible: this._depth < 50 // Accessible if less than 50m deep
      };

      this.addMineralDeposit(deposit);
    }
  }

  private calculateMineralValue(mineralType: MineralType): number {
    // Simplified market values per cubic meter (in dollars)
    const baseValues = {
      [MineralType.COAL]: 50,
      [MineralType.IRON_ORE]: 80,
      [MineralType.COPPER]: 6000,
      [MineralType.GOLD]: 55000000, // Very valuable
      [MineralType.SILVER]: 800000,
      [MineralType.DIAMOND]: 15000000,
      [MineralType.LIMESTONE]: 20,
      [MineralType.GRANITE]: 60,
      [MineralType.SANDSTONE]: 30,
      [MineralType.QUARTZ]: 100,
      [MineralType.URANIUM]: 130000,
      [MineralType.LITHIUM]: 12000
    };

    return baseValues[mineralType] || 100;
  }

  // Create standard geological layers
  static createSedimentaryLayer(id: string, depth: number, thickness: number): GeologicalLayer {
    const properties: GeologicalProperty = {
      hardness: 2 + Math.random() * 3, // 2-5 Mohs
      density: 2200 + Math.random() * 500, // 2200-2700 kg/m³
      porosity: 0.1 + Math.random() * 0.3, // 10-40%
      permeability: 0.3 + Math.random() * 0.5, // 30-80%
      stability: 0.6 + Math.random() * 0.3 // 60-90%
    };

    return new GeologicalLayer(id, depth, thickness, RockType.SEDIMENTARY, properties);
  }

  static createIgneousLayer(id: string, depth: number, thickness: number): GeologicalLayer {
    const properties: GeologicalProperty = {
      hardness: 6 + Math.random() * 3, // 6-9 Mohs
      density: 2600 + Math.random() * 700, // 2600-3300 kg/m³
      porosity: 0.01 + Math.random() * 0.1, // 1-11%
      permeability: 0.1 + Math.random() * 0.2, // 10-30%
      stability: 0.8 + Math.random() * 0.2 // 80-100%
    };

    return new GeologicalLayer(id, depth, thickness, RockType.IGNEOUS, properties);
  }

  static createMetamorphicLayer(id: string, depth: number, thickness: number): GeologicalLayer {
    const properties: GeologicalProperty = {
      hardness: 5 + Math.random() * 4, // 5-9 Mohs
      density: 2500 + Math.random() * 800, // 2500-3300 kg/m³
      porosity: 0.02 + Math.random() * 0.15, // 2-17%
      permeability: 0.05 + Math.random() * 0.25, // 5-30%
      stability: 0.7 + Math.random() * 0.3 // 70-100%
    };

    return new GeologicalLayer(id, depth, thickness, RockType.METAMORPHIC, properties);
  }
}