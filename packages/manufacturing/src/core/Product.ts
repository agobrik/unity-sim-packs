export interface ProductSpecification {
  name: string;
  type: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  weight: number;
  materials: string[];
  qualityRequirements: QualityRequirement[];
}

export interface QualityRequirement {
  parameter: string;
  minValue: number;
  maxValue: number;
  tolerance: number;
}

export class Product {
  private _id: string;
  private _specification: ProductSpecification;
  private _qualityMetrics: Map<string, number>;
  private _productionStage: string;
  private _defects: string[];
  private _createdAt: number;

  constructor(id: string, specification: ProductSpecification) {
    this._id = id;
    this._specification = specification;
    this._qualityMetrics = new Map();
    this._productionStage = 'created';
    this._defects = [];
    this._createdAt = Date.now();

    // Initialize quality metrics
    specification.qualityRequirements.forEach(req => {
      this._qualityMetrics.set(req.parameter, 0);
    });
  }

  get id(): string {
    return this._id;
  }

  get specification(): ProductSpecification {
    return { ...this._specification };
  }

  get qualityMetrics(): Map<string, number> {
    return new Map(this._qualityMetrics);
  }

  get productionStage(): string {
    return this._productionStage;
  }

  set productionStage(stage: string) {
    this._productionStage = stage;
  }

  get defects(): string[] {
    return [...this._defects];
  }

  get createdAt(): number {
    return this._createdAt;
  }

  updateQualityMetric(parameter: string, value: number): void {
    this._qualityMetrics.set(parameter, value);
  }

  addDefect(defect: string): void {
    if (!this._defects.includes(defect)) {
      this._defects.push(defect);
    }
  }

  removeDefect(defect: string): void {
    const index = this._defects.indexOf(defect);
    if (index > -1) {
      this._defects.splice(index, 1);
    }
  }

  isQualityCompliant(): boolean {
    for (const requirement of this._specification.qualityRequirements) {
      const value = this._qualityMetrics.get(requirement.parameter);
      if (value === undefined || value < requirement.minValue || value > requirement.maxValue) {
        return false;
      }
    }
    return this._defects.length === 0;
  }

  calculateQualityScore(): number {
    if (this._specification.qualityRequirements.length === 0) return 1.0;

    let totalScore = 0;
    let validMetrics = 0;

    for (const requirement of this._specification.qualityRequirements) {
      const value = this._qualityMetrics.get(requirement.parameter);
      if (value !== undefined) {
        const range = requirement.maxValue - requirement.minValue;
        const normalizedValue = Math.max(0, Math.min(1,
          (value - requirement.minValue) / range
        ));
        totalScore += normalizedValue;
        validMetrics++;
      }
    }

    const baseScore = validMetrics > 0 ? totalScore / validMetrics : 0;
    const defectPenalty = Math.min(0.5, this._defects.length * 0.1);

    return Math.max(0, baseScore - defectPenalty);
  }

  getProductionTime(): number {
    return Date.now() - this._createdAt;
  }
}