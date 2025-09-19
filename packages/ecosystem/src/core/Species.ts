export interface Position {
  x: number;
  y: number;
}

export enum SpeciesType {
  PRODUCER = 'producer',      // Plants, algae
  PRIMARY_CONSUMER = 'primary_consumer',    // Herbivores
  SECONDARY_CONSUMER = 'secondary_consumer', // Carnivores that eat herbivores
  TERTIARY_CONSUMER = 'tertiary_consumer',  // Top predators
  DECOMPOSER = 'decomposer'   // Bacteria, fungi
}

export enum Diet {
  HERBIVORE = 'herbivore',
  CARNIVORE = 'carnivore',
  OMNIVORE = 'omnivore',
  AUTOTROPH = 'autotroph',    // Self-feeding (plants)
  DETRITIVORE = 'detritivore' // Decomposer
}

export interface SpeciesTraits {
  maxAge: number;
  reproductionAge: number;
  gestationTime: number;
  offspringCount: number;
  energyConsumption: number;
  movementSpeed: number;
  territorySize: number;
  preySpecies: string[];
  predatorSpecies: string[];
  requiredHabitat: HabitatType[];
  climateTolerances: ClimateTolerances;
}

export interface ClimateTolerances {
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
  minPrecipitation: number;
  maxPrecipitation: number;
}

export enum HabitatType {
  FOREST = 'forest',
  GRASSLAND = 'grassland',
  WETLAND = 'wetland',
  DESERT = 'desert',
  MOUNTAIN = 'mountain',
  AQUATIC = 'aquatic',
  URBAN = 'urban'
}

export interface Individual {
  id: string;
  speciesId: string;
  age: number;
  energy: number;
  health: number;
  position: Position;
  isAlive: boolean;
  isMature: boolean;
  isPregnant: boolean;
  pregnancyTime: number;
  genetics: Genetics;
}

export interface Genetics {
  traits: { [key: string]: number };
  dominantAlleles: string[];
  recessiveAlleles: string[];
}

export class Species {
  public readonly id: string;
  public readonly name: string;
  public readonly type: SpeciesType;
  public readonly diet: Diet;
  public readonly traits: SpeciesTraits;
  private individuals: Map<string, Individual>;
  private populationHistory: Array<{ time: number; count: number }>;

  constructor(
    id: string,
    name: string,
    type: SpeciesType,
    diet: Diet,
    traits: SpeciesTraits
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.diet = diet;
    this.traits = traits;
    this.individuals = new Map();
    this.populationHistory = [];
  }

  addIndividual(position: Position, genetics?: Partial<Genetics>): string {
    const id = this.generateIndividualId();

    const individual: Individual = {
      id,
      speciesId: this.id,
      age: 0,
      energy: 100,
      health: 100,
      position: { ...position },
      isAlive: true,
      isMature: false,
      isPregnant: false,
      pregnancyTime: 0,
      genetics: this.generateGenetics(genetics)
    };

    this.individuals.set(id, individual);
    return id;
  }

  private generateGenetics(partial?: Partial<Genetics>): Genetics {
    const baseTraits = {
      size: Math.random(),
      speed: Math.random(),
      fertility: Math.random(),
      resistance: Math.random(),
      aggression: Math.random()
    };

    return {
      traits: { ...baseTraits, ...partial?.traits },
      dominantAlleles: partial?.dominantAlleles || this.generateAlleles(),
      recessiveAlleles: partial?.recessiveAlleles || this.generateAlleles()
    };
  }

  private generateAlleles(): string[] {
    const alleles = ['A', 'B', 'C', 'D', 'E'];
    const result = [];
    for (let i = 0; i < 5; i++) {
      result.push(alleles[Math.floor(Math.random() * alleles.length)]);
    }
    return result;
  }

  updateIndividuals(deltaTime: number, environment: EnvironmentConditions): void {
    const deadIndividuals: string[] = [];

    for (const individual of this.individuals.values()) {
      if (!individual.isAlive) continue;

      // Age the individual
      individual.age += deltaTime;

      // Check maturity
      if (!individual.isMature && individual.age >= this.traits.reproductionAge) {
        individual.isMature = true;
      }

      // Handle pregnancy
      if (individual.isPregnant) {
        individual.pregnancyTime += deltaTime;
        if (individual.pregnancyTime >= this.traits.gestationTime) {
          this.giveBirth(individual);
        }
      }

      // Energy consumption
      const baseConsumption = this.traits.energyConsumption * deltaTime;
      const environmentModifier = this.calculateEnvironmentModifier(environment);
      individual.energy -= baseConsumption * environmentModifier;

      // Health effects from environment
      if (!this.isEnvironmentSuitable(environment)) {
        individual.health -= 10 * deltaTime;
      } else if (individual.health < 100) {
        individual.health += 5 * deltaTime;
      }

      // Death conditions
      if (individual.age >= this.traits.maxAge ||
          individual.energy <= 0 ||
          individual.health <= 0) {
        individual.isAlive = false;
        deadIndividuals.push(individual.id);
      }

      // Movement (simplified)
      this.moveIndividual(individual, deltaTime);
    }

    // Remove dead individuals
    deadIndividuals.forEach(id => this.individuals.delete(id));

    // Record population history
    this.populationHistory.push({
      time: Date.now(),
      count: this.getPopulation()
    });

    // Keep only last 1000 records
    if (this.populationHistory.length > 1000) {
      this.populationHistory.shift();
    }
  }

  private giveBirth(mother: Individual): void {
    mother.isPregnant = false;
    mother.pregnancyTime = 0;

    const offspringCount = Math.floor(Math.random() * this.traits.offspringCount) + 1;

    for (let i = 0; i < offspringCount; i++) {
      const position = {
        x: mother.position.x + (Math.random() - 0.5) * 10,
        y: mother.position.y + (Math.random() - 0.5) * 10
      };

      // Inherit genetics from mother (simplified)
      const childGenetics: Genetics = {
        traits: {},
        dominantAlleles: [...mother.genetics.dominantAlleles],
        recessiveAlleles: [...mother.genetics.recessiveAlleles]
      };

      // Add some mutation
      Object.keys(mother.genetics.traits).forEach(trait => {
        const inheritedValue = mother.genetics.traits[trait];
        const mutation = (Math.random() - 0.5) * 0.1; // Small random mutation
        childGenetics.traits[trait] = Math.max(0, Math.min(1, inheritedValue + mutation));
      });

      this.addIndividual(position, childGenetics);
    }

    // Mother loses energy from reproduction
    mother.energy -= 30;
  }

  private calculateEnvironmentModifier(environment: EnvironmentConditions): number {
    let modifier = 1.0;

    // Temperature stress
    if (environment.temperature < this.traits.climateTolerances.minTemperature ||
        environment.temperature > this.traits.climateTolerances.maxTemperature) {
      modifier += 0.5; // Increased energy consumption
    }

    // Humidity stress
    if (environment.humidity < this.traits.climateTolerances.minHumidity ||
        environment.humidity > this.traits.climateTolerances.maxHumidity) {
      modifier += 0.3;
    }

    return modifier;
  }

  private isEnvironmentSuitable(environment: EnvironmentConditions): boolean {
    return (
      environment.temperature >= this.traits.climateTolerances.minTemperature &&
      environment.temperature <= this.traits.climateTolerances.maxTemperature &&
      environment.humidity >= this.traits.climateTolerances.minHumidity &&
      environment.humidity <= this.traits.climateTolerances.maxHumidity
    );
  }

  private moveIndividual(individual: Individual, deltaTime: number): void {
    // Simple random movement within territory
    const maxDistance = this.traits.movementSpeed * deltaTime;
    const angle = Math.random() * 2 * Math.PI;

    individual.position.x += Math.cos(angle) * maxDistance;
    individual.position.y += Math.sin(angle) * maxDistance;

    // Simple boundary constraints (could be enhanced with actual territory logic)
    individual.position.x = Math.max(-1000, Math.min(1000, individual.position.x));
    individual.position.y = Math.max(-1000, Math.min(1000, individual.position.y));
  }

  reproduce(individual1Id: string, individual2Id: string): boolean {
    const ind1 = this.individuals.get(individual1Id);
    const ind2 = this.individuals.get(individual2Id);

    if (!ind1 || !ind2 || !ind1.isAlive || !ind2.isAlive) return false;
    if (!ind1.isMature || !ind2.isMature) return false;
    if (ind1.isPregnant || ind2.isPregnant) return false;

    // Check if they're close enough (simplified)
    const distance = Math.sqrt(
      (ind1.position.x - ind2.position.x) ** 2 +
      (ind1.position.y - ind2.position.y) ** 2
    );

    if (distance > this.traits.territorySize) return false;

    // One individual becomes pregnant (simplified - assumes one can bear offspring)
    const mother = Math.random() < 0.5 ? ind1 : ind2;
    mother.isPregnant = true;
    mother.pregnancyTime = 0;

    return true;
  }

  hunt(predatorId: string, preyId: string): boolean {
    const predator = this.individuals.get(predatorId);
    const prey = this.individuals.get(preyId);

    if (!predator || !prey || !predator.isAlive || !prey.isAlive) return false;

    // Check distance
    const distance = Math.sqrt(
      (predator.position.x - prey.position.x) ** 2 +
      (predator.position.y - prey.position.y) ** 2
    );

    if (distance > 10) return false; // Must be close to hunt

    // Success based on predator traits vs prey traits
    const predatorAdvantage = predator.genetics.traits.speed * predator.genetics.traits.aggression;
    const preyDefense = prey.genetics.traits.speed * prey.genetics.traits.resistance;

    const huntSuccess = predatorAdvantage > preyDefense * Math.random();

    if (huntSuccess) {
      prey.isAlive = false;
      predator.energy += 50; // Gain energy from successful hunt
      return true;
    }

    predator.energy -= 10; // Lose energy from failed hunt
    return false;
  }

  getPopulation(): number {
    let count = 0;
    for (const individual of this.individuals.values()) {
      if (individual.isAlive) count++;
    }
    return count;
  }

  getIndividuals(): Individual[] {
    return Array.from(this.individuals.values()).filter(ind => ind.isAlive);
  }

  getIndividual(id: string): Individual | undefined {
    return this.individuals.get(id);
  }

  getPopulationHistory(): Array<{ time: number; count: number }> {
    return [...this.populationHistory];
  }

  getAverageAge(): number {
    const alive = this.getIndividuals();
    if (alive.length === 0) return 0;
    return alive.reduce((sum, ind) => sum + ind.age, 0) / alive.length;
  }

  getAverageHealth(): number {
    const alive = this.getIndividuals();
    if (alive.length === 0) return 0;
    return alive.reduce((sum, ind) => sum + ind.health, 0) / alive.length;
  }

  getGeneticDiversity(): number {
    const alive = this.getIndividuals();
    if (alive.length === 0) return 0;

    // Calculate diversity based on trait variance
    const traits = Object.keys(alive[0]?.genetics.traits || {});
    let totalVariance = 0;

    for (const trait of traits) {
      const values = alive.map(ind => ind.genetics.traits[trait]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
      totalVariance += variance;
    }

    return totalVariance / traits.length;
  }

  private generateIndividualId(): string {
    return `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  exportSpeciesData(): string {
    const data = {
      species: {
        id: this.id,
        name: this.name,
        type: this.type,
        diet: this.diet,
        traits: this.traits
      },
      population: this.getPopulation(),
      individuals: Array.from(this.individuals.entries()),
      populationHistory: this.populationHistory,
      statistics: {
        averageAge: this.getAverageAge(),
        averageHealth: this.getAverageHealth(),
        geneticDiversity: this.getGeneticDiversity()
      }
    };
    return JSON.stringify(data, null, 2);
  }
}

export interface EnvironmentConditions {
  temperature: number;
  humidity: number;
  precipitation: number;
  lightLevel: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
}