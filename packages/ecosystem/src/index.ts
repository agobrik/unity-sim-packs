// Core exports
export {
  Species,
  Individual,
  SpeciesType,
  Diet,
  HabitatType,
  SpeciesTraits,
  ClimateTolerances,
  Genetics,
  Position,
  EnvironmentConditions
} from './core/Species';

// Main simulation class
import { Species, Individual, SpeciesType, Diet, HabitatType, SpeciesTraits, ClimateTolerances, Genetics, Position, EnvironmentConditions } from './core/Species';

export class EcosystemSimulation {
  private species: Map<string, Species>;
  private environment: EnvironmentConditions;
  private currentTime: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.species = new Map();
    this.environment = {
      temperature: 20,
      humidity: 0.6,
      precipitation: 100,
      lightLevel: 0.8,
      season: 'spring'
    };
  }

  addSpecies(species: Species): void {
    this.species.set(species.id, species);
  }

  getSpecies(id: string): Species | undefined {
    return this.species.get(id);
  }

  getAllSpecies(): Species[] {
    return Array.from(this.species.values());
  }

  setEnvironment(conditions: Partial<EnvironmentConditions>): void {
    Object.assign(this.environment, conditions);
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(deltaTime: number = 1): boolean {
    if (!this.isRunning) return false;

    this.currentTime += deltaTime;

    // Update environment seasonally
    this.updateEnvironment();

    // Update all species
    for (const species of this.species.values()) {
      species.updateIndividuals(deltaTime, this.environment);
    }

    // Handle predator-prey interactions
    this.processPredation();

    return true;
  }

  private updateEnvironment(): void {
    // Simple seasonal changes
    const seasonCycle = (this.currentTime / 100) % 4;

    if (seasonCycle < 1) {
      this.environment.season = 'spring';
      this.environment.temperature = 15 + seasonCycle * 10;
    } else if (seasonCycle < 2) {
      this.environment.season = 'summer';
      this.environment.temperature = 25 + (seasonCycle - 1) * 5;
    } else if (seasonCycle < 3) {
      this.environment.season = 'fall';
      this.environment.temperature = 30 - (seasonCycle - 2) * 15;
    } else {
      this.environment.season = 'winter';
      this.environment.temperature = 15 - (seasonCycle - 3) * 10;
    }
  }

  private processPredation(): void {
    for (const predatorSpecies of this.species.values()) {
      if (predatorSpecies.diet === 'carnivore' || predatorSpecies.diet === 'omnivore') {
        for (const preySpeciesId of predatorSpecies.traits.preySpecies) {
          const preySpecies = this.species.get(preySpeciesId);
          if (!preySpecies) continue;

          const predators = predatorSpecies.getIndividuals();
          const prey = preySpecies.getIndividuals();

          for (const predator of predators) {
            for (const preyIndividual of prey) {
              if (Math.random() < 0.01) { // 1% chance per interaction
                if (predatorSpecies.hunt(predator.id, preyIndividual.id)) {
                  break; // Predator is satisfied for now
                }
              }
            }
          }
        }
      }
    }
  }

  getTotalBiomass(): number {
    let totalBiomass = 0;
    for (const species of this.species.values()) {
      totalBiomass += species.getPopulation();
    }
    return totalBiomass;
  }

  getBiodiversityIndex(): number {
    const populations = Array.from(this.species.values()).map(s => s.getPopulation());
    const total = populations.reduce((sum, pop) => sum + pop, 0);

    if (total === 0) return 0;

    // Shannon diversity index
    let diversity = 0;
    for (const pop of populations) {
      if (pop > 0) {
        const proportion = pop / total;
        diversity -= proportion * Math.log(proportion);
      }
    }

    return diversity;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getEnvironment(): EnvironmentConditions {
    return { ...this.environment };
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.species.clear();
    this.environment = {
      temperature: 20,
      humidity: 0.6,
      precipitation: 100,
      lightLevel: 0.8,
      season: 'spring'
    };
  }

  exportState(): string {
    const data = {
      currentTime: this.currentTime,
      timestamp: Date.now(),
      environment: this.environment,
      species: Array.from(this.species.entries()),
      totalBiomass: this.getTotalBiomass(),
      biodiversityIndex: this.getBiodiversityIndex()
    };
    return JSON.stringify(data, null, 2);
  }
}