export interface DisasterConfig {
  intensity: number; // 1-10 scale
  duration: number; // in simulation time units
  affectedRadius: number; // radius of impact
  growthRate: number; // how fast disaster spreads
  decayRate: number; // how fast disaster diminishes
}

export interface DisasterImpact {
  structuralDamage: number; // 0-1 scale
  infrastructureDisruption: number; // 0-1 scale
  populationAffected: number; // number of people
  economicLoss: number; // monetary value
  environmentalDamage: number; // 0-1 scale
}

export interface DisasterWarning {
  timeToImpact: number; // time units until disaster hits
  confidence: number; // 0-1 probability
  recommendedActions: string[];
  affectedAreas: { x: number; y: number; radius: number }[];
}

export type DisasterType =
  | 'earthquake' | 'flood' | 'fire' | 'hurricane' | 'tornado'
  | 'volcanic' | 'tsunami' | 'blizzard' | 'drought' | 'pandemic'
  | 'industrial-accident' | 'cyber-attack' | 'power-outage';

export type DisasterPhase = 'prediction' | 'warning' | 'impact' | 'response' | 'recovery' | 'ended';

export class Disaster {
  private _id: string;
  private _type: DisasterType;
  private _phase: DisasterPhase;
  private _config: DisasterConfig;
  private _position: { x: number; y: number };
  private _currentIntensity: number;
  private _startTime: number;
  private _currentTime: number;
  private _totalImpact: DisasterImpact;
  private _affectedAreas: Set<string>;

  constructor(
    id: string,
    type: DisasterType,
    position: { x: number; y: number },
    config: DisasterConfig,
    startTime: number = 0
  ) {
    this._id = id;
    this._type = type;
    this._phase = 'prediction';
    this._config = { ...config };
    this._position = { ...position };
    this._currentIntensity = 0;
    this._startTime = startTime;
    this._currentTime = startTime;
    this._affectedAreas = new Set();

    this._totalImpact = {
      structuralDamage: 0,
      infrastructureDisruption: 0,
      populationAffected: 0,
      economicLoss: 0,
      environmentalDamage: 0
    };
  }

  get id(): string {
    return this._id;
  }

  get type(): DisasterType {
    return this._type;
  }

  get phase(): DisasterPhase {
    return this._phase;
  }

  get config(): DisasterConfig {
    return { ...this._config };
  }

  get position(): { x: number; y: number } {
    return { ...this._position };
  }

  get currentIntensity(): number {
    return this._currentIntensity;
  }

  get totalImpact(): DisasterImpact {
    return { ...this._totalImpact };
  }

  get affectedAreas(): string[] {
    return Array.from(this._affectedAreas);
  }

  update(currentTime: number): void {
    this._currentTime = currentTime;
    const elapsedTime = currentTime - this._startTime;

    // Update phase based on time and intensity
    this.updatePhase(elapsedTime);

    // Update intensity based on phase and time
    this.updateIntensity(elapsedTime);

    // Calculate impact for this time step
    if (this._phase === 'impact' && this._currentIntensity > 0) {
      this.calculateImpact();
    }
  }

  private updatePhase(elapsedTime: number): void {
    const warningTime = this.getWarningTime();
    const impactDuration = this._config.duration;

    if (elapsedTime < 0) {
      this._phase = 'prediction';
    } else if (elapsedTime < warningTime) {
      this._phase = 'warning';
    } else if (elapsedTime < warningTime + impactDuration) {
      this._phase = 'impact';
    } else if (elapsedTime < warningTime + impactDuration + this.getRecoveryTime()) {
      this._phase = 'recovery';
    } else {
      this._phase = 'ended';
    }
  }

  private updateIntensity(elapsedTime: number): void {
    const warningTime = this.getWarningTime();
    const impactStart = warningTime;
    const impactEnd = warningTime + this._config.duration;

    if (this._phase === 'prediction' || this._phase === 'warning') {
      this._currentIntensity = 0;
    } else if (this._phase === 'impact') {
      const impactProgress = (elapsedTime - impactStart) / this._config.duration;

      // Intensity curve based on disaster type
      if (this._type === 'earthquake') {
        // Quick spike then decay
        this._currentIntensity = this._config.intensity * Math.exp(-impactProgress * 3);
      } else if (this._type === 'hurricane' || this._type === 'tornado') {
        // Build up then strong impact
        this._currentIntensity = this._config.intensity * Math.sin(impactProgress * Math.PI);
      } else if (this._type === 'flood' || this._type === 'fire') {
        // Gradual build up with sustained intensity
        this._currentIntensity = this._config.intensity * (1 - Math.exp(-impactProgress * 2));
      } else {
        // Default bell curve
        this._currentIntensity = this._config.intensity * Math.sin(impactProgress * Math.PI);
      }
    } else if (this._phase === 'recovery') {
      // Gradual decrease during recovery
      const recoveryProgress = (elapsedTime - impactEnd) / this.getRecoveryTime();
      this._currentIntensity = this._config.intensity * 0.1 * (1 - recoveryProgress);
    } else {
      this._currentIntensity = 0;
    }

    this._currentIntensity = Math.max(0, this._currentIntensity);
  }

  private calculateImpact(): void {
    const intensityFactor = this._currentIntensity / this._config.intensity;
    const timeStep = 1; // Assume 1 time unit per update

    // Base impact rates based on disaster type
    const baseRates = this.getBaseImpactRates();

    // Calculate incremental impact
    const incrementalImpact: DisasterImpact = {
      structuralDamage: baseRates.structuralDamage * intensityFactor * timeStep,
      infrastructureDisruption: baseRates.infrastructureDisruption * intensityFactor * timeStep,
      populationAffected: baseRates.populationAffected * intensityFactor * timeStep,
      economicLoss: baseRates.economicLoss * intensityFactor * timeStep,
      environmentalDamage: baseRates.environmentalDamage * intensityFactor * timeStep
    };

    // Add to total impact
    this._totalImpact.structuralDamage += incrementalImpact.structuralDamage;
    this._totalImpact.infrastructureDisruption += incrementalImpact.infrastructureDisruption;
    this._totalImpact.populationAffected += incrementalImpact.populationAffected;
    this._totalImpact.economicLoss += incrementalImpact.economicLoss;
    this._totalImpact.environmentalDamage += incrementalImpact.environmentalDamage;

    // Cap values
    this._totalImpact.structuralDamage = Math.min(1, this._totalImpact.structuralDamage);
    this._totalImpact.infrastructureDisruption = Math.min(1, this._totalImpact.infrastructureDisruption);
    this._totalImpact.environmentalDamage = Math.min(1, this._totalImpact.environmentalDamage);
  }

  private getBaseImpactRates(): DisasterImpact {
    // Impact rates per time unit based on disaster type
    const rates: Record<DisasterType, DisasterImpact> = {
      earthquake: {
        structuralDamage: 0.1,
        infrastructureDisruption: 0.15,
        populationAffected: 50,
        economicLoss: 1000000,
        environmentalDamage: 0.02
      },
      flood: {
        structuralDamage: 0.05,
        infrastructureDisruption: 0.1,
        populationAffected: 100,
        economicLoss: 500000,
        environmentalDamage: 0.08
      },
      fire: {
        structuralDamage: 0.15,
        infrastructureDisruption: 0.05,
        populationAffected: 30,
        economicLoss: 200000,
        environmentalDamage: 0.2
      },
      hurricane: {
        structuralDamage: 0.08,
        infrastructureDisruption: 0.2,
        populationAffected: 200,
        economicLoss: 2000000,
        environmentalDamage: 0.1
      },
      tornado: {
        structuralDamage: 0.2,
        infrastructureDisruption: 0.15,
        populationAffected: 20,
        economicLoss: 500000,
        environmentalDamage: 0.05
      },
      volcanic: {
        structuralDamage: 0.12,
        infrastructureDisruption: 0.25,
        populationAffected: 500,
        economicLoss: 5000000,
        environmentalDamage: 0.3
      },
      tsunami: {
        structuralDamage: 0.25,
        infrastructureDisruption: 0.3,
        populationAffected: 1000,
        economicLoss: 10000000,
        environmentalDamage: 0.15
      },
      blizzard: {
        structuralDamage: 0.02,
        infrastructureDisruption: 0.15,
        populationAffected: 100,
        economicLoss: 100000,
        environmentalDamage: 0.01
      },
      drought: {
        structuralDamage: 0.001,
        infrastructureDisruption: 0.02,
        populationAffected: 1000,
        economicLoss: 50000,
        environmentalDamage: 0.05
      },
      pandemic: {
        structuralDamage: 0,
        infrastructureDisruption: 0.1,
        populationAffected: 10000,
        economicLoss: 1000000,
        environmentalDamage: 0
      },
      'industrial-accident': {
        structuralDamage: 0.05,
        infrastructureDisruption: 0.08,
        populationAffected: 50,
        economicLoss: 2000000,
        environmentalDamage: 0.15
      },
      'cyber-attack': {
        structuralDamage: 0,
        infrastructureDisruption: 0.3,
        populationAffected: 0,
        economicLoss: 5000000,
        environmentalDamage: 0
      },
      'power-outage': {
        structuralDamage: 0,
        infrastructureDisruption: 0.5,
        populationAffected: 1000,
        economicLoss: 100000,
        environmentalDamage: 0
      }
    };

    return rates[this._type];
  }

  private getWarningTime(): number {
    // Warning time based on disaster type (in time units)
    const warningTimes: Record<DisasterType, number> = {
      earthquake: 0.1, // Very short warning
      flood: 24, // 24 hours
      fire: 2, // 2 hours
      hurricane: 72, // 3 days
      tornado: 1, // 1 hour
      volcanic: 168, // 1 week
      tsunami: 1, // 1 hour
      blizzard: 48, // 2 days
      drought: 720, // 1 month
      pandemic: 168, // 1 week
      'industrial-accident': 0.5, // 30 minutes
      'cyber-attack': 0, // No warning
      'power-outage': 0.25 // 15 minutes
    };

    return warningTimes[this._type];
  }

  private getRecoveryTime(): number {
    // Recovery time based on disaster type and intensity
    const baseRecoveryTimes: Record<DisasterType, number> = {
      earthquake: 720, // 1 month
      flood: 168, // 1 week
      fire: 168, // 1 week
      hurricane: 336, // 2 weeks
      tornado: 168, // 1 week
      volcanic: 2160, // 3 months
      tsunami: 1440, // 2 months
      blizzard: 72, // 3 days
      drought: 4320, // 6 months
      pandemic: 8760, // 1 year
      'industrial-accident': 720, // 1 month
      'cyber-attack': 168, // 1 week
      'power-outage': 24 // 1 day
    };

    return baseRecoveryTimes[this._type] * (this._config.intensity / 5); // Scale by intensity
  }

  generateWarning(timeUntilImpact: number): DisasterWarning {
    const confidence = Math.max(0.1, Math.min(0.95, 1 - (timeUntilImpact / this.getWarningTime())));

    const recommendedActions = this.getRecommendedActions();

    const affectedAreas = [{
      x: this._position.x,
      y: this._position.y,
      radius: this._config.affectedRadius
    }];

    return {
      timeToImpact: timeUntilImpact,
      confidence,
      recommendedActions,
      affectedAreas
    };
  }

  private getRecommendedActions(): string[] {
    const actions: Record<DisasterType, string[]> = {
      earthquake: [
        'Secure heavy objects and furniture',
        'Identify safe spots (under tables, away from windows)',
        'Check emergency supplies',
        'Review evacuation routes'
      ],
      flood: [
        'Move to higher ground',
        'Avoid walking or driving through flood waters',
        'Turn off utilities if instructed',
        'Monitor emergency broadcasts'
      ],
      fire: [
        'Prepare for immediate evacuation',
        'Close all windows and doors',
        'Turn off gas utilities',
        'Stay low to avoid smoke inhalation'
      ],
      hurricane: [
        'Board up windows',
        'Stock up on food and water',
        'Charge electronic devices',
        'Identify evacuation routes'
      ],
      tornado: [
        'Move to lowest floor, interior room',
        'Stay away from windows',
        'Get under sturdy furniture',
        'Monitor weather alerts'
      ],
      volcanic: [
        'Prepare masks for ash protection',
        'Seal building openings',
        'Avoid driving in ash fall',
        'Monitor evacuation orders'
      ],
      tsunami: [
        'Move to high ground immediately',
        'Stay away from coastal areas',
        'Do not wait for official warning',
        'Help others evacuate'
      ],
      blizzard: [
        'Stay indoors',
        'Conserve heat',
        'Check on neighbors',
        'Avoid travel'
      ],
      drought: [
        'Conserve water',
        'Prepare alternative water sources',
        'Protect crops and livestock',
        'Monitor fire conditions'
      ],
      pandemic: [
        'Practice social distancing',
        'Wear protective equipment',
        'Stock essential supplies',
        'Follow health guidelines'
      ],
      'industrial-accident': [
        'Evacuate the area',
        'Avoid contaminated areas',
        'Seek medical attention if exposed',
        'Follow official instructions'
      ],
      'cyber-attack': [
        'Disconnect from networks',
        'Backup critical data',
        'Change passwords',
        'Report to authorities'
      ],
      'power-outage': [
        'Use flashlights instead of candles',
        'Keep refrigerator/freezer closed',
        'Turn off electrical appliances',
        'Check on vulnerable neighbors'
      ]
    };

    return actions[this._type] || ['Follow official emergency instructions'];
  }

  getCurrentRadius(): number {
    const intensityFactor = this._currentIntensity / this._config.intensity;
    return this._config.affectedRadius * intensityFactor;
  }

  isPointAffected(x: number, y: number): boolean {
    const distance = Math.sqrt(
      Math.pow(x - this._position.x, 2) + Math.pow(y - this._position.y, 2)
    );
    return distance <= this.getCurrentRadius();
  }

  addAffectedArea(areaId: string): void {
    this._affectedAreas.add(areaId);
  }

  getIntensityAtPoint(x: number, y: number): number {
    const distance = Math.sqrt(
      Math.pow(x - this._position.x, 2) + Math.pow(y - this._position.y, 2)
    );

    if (distance > this.getCurrentRadius()) {
      return 0;
    }

    // Intensity decreases with distance from epicenter
    const distanceFactor = 1 - (distance / this.getCurrentRadius());
    return this._currentIntensity * distanceFactor;
  }

  isActive(): boolean {
    return this._phase !== 'ended' && this._currentIntensity > 0;
  }

  getEstimatedEndTime(): number {
    return this._startTime + this.getWarningTime() + this._config.duration + this.getRecoveryTime();
  }
}