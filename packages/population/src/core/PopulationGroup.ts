import { Person, Gender, AgeGroup, EducationLevel, EmploymentStatus, Location } from './Person';

export interface GroupDemographics {
  totalPopulation: number;
  genderDistribution: { [key in Gender]: number };
  ageDistribution: { [key in AgeGroup]: number };
  educationDistribution: { [key in EducationLevel]: number };
  employmentDistribution: { [key in EmploymentStatus]: number };
  averageIncome: number;
  averageHappiness: number;
  averageHealth: number;
}

export interface MigrationFlow {
  fromRegion: string;
  toRegion: string;
  count: number;
  reason: 'economic' | 'family' | 'environment' | 'conflict' | 'education' | 'retirement';
}

export class PopulationGroup {
  private _id: string;
  private _name: string;
  private _region: string;
  private _people: Map<string, Person>;
  private _birthQueue: Person[];
  private _deathQueue: Person[];
  private _migrationHistory: MigrationFlow[];
  private _demographics: GroupDemographics | null = null;
  private _demographicsLastUpdated: number = 0;

  constructor(id: string, name: string, region: string) {
    this._id = id;
    this._name = name;
    this._region = region;
    this._people = new Map();
    this._birthQueue = [];
    this._deathQueue = [];
    this._migrationHistory = [];
  }

  get id(): string { return this._id; }
  get name(): string { return this._name; }
  get region(): string { return this._region; }
  get size(): number { return this._people.size; }
  get people(): Person[] { return Array.from(this._people.values()); }
  get migrationHistory(): MigrationFlow[] { return [...this._migrationHistory]; }

  addPerson(person: Person): void {
    this._people.set(person.id, person);
    this._demographics = null; // Invalidate cached demographics
  }

  removePerson(personId: string): boolean {
    const removed = this._people.delete(personId);
    if (removed) {
      this._demographics = null; // Invalidate cached demographics
    }
    return removed;
  }

  getPerson(personId: string): Person | undefined {
    return this._people.get(personId);
  }

  // Demographic analysis
  getDemographics(): GroupDemographics {
    const currentTime = Date.now();

    // Use cached demographics if still fresh (within 1 minute)
    if (this._demographics && (currentTime - this._demographicsLastUpdated) < 60000) {
      return this._demographics;
    }

    const people = Array.from(this._people.values());

    if (people.length === 0) {
      return {
        totalPopulation: 0,
        genderDistribution: { [Gender.MALE]: 0, [Gender.FEMALE]: 0, [Gender.OTHER]: 0 },
        ageDistribution: { [AgeGroup.CHILD]: 0, [AgeGroup.ADULT]: 0, [AgeGroup.ELDERLY]: 0 },
        educationDistribution: {
          [EducationLevel.PRIMARY]: 0,
          [EducationLevel.SECONDARY]: 0,
          [EducationLevel.TERTIARY]: 0,
          [EducationLevel.POSTGRADUATE]: 0
        },
        employmentDistribution: {
          [EmploymentStatus.EMPLOYED]: 0,
          [EmploymentStatus.UNEMPLOYED]: 0,
          [EmploymentStatus.STUDENT]: 0,
          [EmploymentStatus.RETIRED]: 0,
          [EmploymentStatus.DISABLED]: 0
        },
        averageIncome: 0,
        averageHappiness: 0,
        averageHealth: 0
      };
    }

    // Initialize counters
    const genderCount = { [Gender.MALE]: 0, [Gender.FEMALE]: 0, [Gender.OTHER]: 0 };
    const ageCount = { [AgeGroup.CHILD]: 0, [AgeGroup.ADULT]: 0, [AgeGroup.ELDERLY]: 0 };
    const educationCount = {
      [EducationLevel.PRIMARY]: 0,
      [EducationLevel.SECONDARY]: 0,
      [EducationLevel.TERTIARY]: 0,
      [EducationLevel.POSTGRADUATE]: 0
    };
    const employmentCount = {
      [EmploymentStatus.EMPLOYED]: 0,
      [EmploymentStatus.UNEMPLOYED]: 0,
      [EmploymentStatus.STUDENT]: 0,
      [EmploymentStatus.RETIRED]: 0,
      [EmploymentStatus.DISABLED]: 0
    };

    let totalIncome = 0;
    let totalHappiness = 0;
    let totalHealth = 0;

    // Count demographics
    for (const person of people) {
      genderCount[person.gender]++;
      ageCount[person.ageGroup]++;
      educationCount[person.educationLevel]++;
      employmentCount[person.employmentStatus]++;
      totalIncome += person.income;
      totalHappiness += person.happiness;
      totalHealth += person.health;
    }

    const totalPop = people.length;

    this._demographics = {
      totalPopulation: totalPop,
      genderDistribution: {
        [Gender.MALE]: genderCount[Gender.MALE] / totalPop,
        [Gender.FEMALE]: genderCount[Gender.FEMALE] / totalPop,
        [Gender.OTHER]: genderCount[Gender.OTHER] / totalPop
      },
      ageDistribution: {
        [AgeGroup.CHILD]: ageCount[AgeGroup.CHILD] / totalPop,
        [AgeGroup.ADULT]: ageCount[AgeGroup.ADULT] / totalPop,
        [AgeGroup.ELDERLY]: ageCount[AgeGroup.ELDERLY] / totalPop
      },
      educationDistribution: {
        [EducationLevel.PRIMARY]: educationCount[EducationLevel.PRIMARY] / totalPop,
        [EducationLevel.SECONDARY]: educationCount[EducationLevel.SECONDARY] / totalPop,
        [EducationLevel.TERTIARY]: educationCount[EducationLevel.TERTIARY] / totalPop,
        [EducationLevel.POSTGRADUATE]: educationCount[EducationLevel.POSTGRADUATE] / totalPop
      },
      employmentDistribution: {
        [EmploymentStatus.EMPLOYED]: employmentCount[EmploymentStatus.EMPLOYED] / totalPop,
        [EmploymentStatus.UNEMPLOYED]: employmentCount[EmploymentStatus.UNEMPLOYED] / totalPop,
        [EmploymentStatus.STUDENT]: employmentCount[EmploymentStatus.STUDENT] / totalPop,
        [EmploymentStatus.RETIRED]: employmentCount[EmploymentStatus.RETIRED] / totalPop,
        [EmploymentStatus.DISABLED]: employmentCount[EmploymentStatus.DISABLED] / totalPop
      },
      averageIncome: totalIncome / totalPop,
      averageHappiness: totalHappiness / totalPop,
      averageHealth: totalHealth / totalPop
    };

    this._demographicsLastUpdated = currentTime;
    return this._demographics;
  }

  // Life cycle simulation
  simulateYear(): void {
    const people = Array.from(this._people.values());

    // Age everyone
    for (const person of people) {
      if (person.isAlive) {
        person.age1Year();
      }
    }

    // Process births
    this.processBirths();

    // Process deaths
    this.processDeaths();

    // Clear queues
    this._birthQueue = [];
    this._deathQueue = [];

    // Invalidate cached demographics
    this._demographics = null;
  }

  private processBirths(): void {
    const people = Array.from(this._people.values());
    const adults = people.filter(p => p.isAlive && p.ageGroup === AgeGroup.ADULT);

    // Calculate birth probability based on demographics
    let birthsThisYear = 0;
    const baseBirthRate = 0.02; // 2% base birth rate

    for (const person of adults) {
      const fertilityRate = person.traits.fertility;
      const happinessBonus = person.happiness * 0.01;
      const incomeBonus = Math.min(0.01, person.income / 100000);

      const birthProbability = baseBirthRate * fertilityRate + happinessBonus + incomeBonus;

      if (Math.random() < birthProbability) {
        birthsThisYear++;

        // Create new person
        const childGender = Math.random() < 0.51 ? Gender.FEMALE : Gender.MALE;
        const childId = `${this._id}_child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const childLocation = person.location;

        const child = new Person(childId, 0, childGender, childLocation);

        // Add family relationship
        child.addFamilyMember(person.id);
        person.addFamilyMember(childId);

        this._birthQueue.push(child);
      }
    }

    // Add all births to population
    for (const child of this._birthQueue) {
      this.addPerson(child);
    }
  }

  private processDeaths(): void {
    const people = Array.from(this._people.values());

    for (const person of people) {
      if (person.isAlive) {
        const deathProbability = person.calculateDeathProbability();

        if (Math.random() < deathProbability) {
          person.die();
          this._deathQueue.push(person);
        }
      }
    }

    // Remove dead people from population
    for (const deadPerson of this._deathQueue) {
      this.removePerson(deadPerson.id);

      // Remove family relationships
      for (const familyId of deadPerson.familyIds) {
        const familyMember = this._people.get(familyId);
        if (familyMember) {
          familyMember.removeFamilyMember(deadPerson.id);
        }
      }
    }
  }

  // Migration methods
  migrateToGroup(other: PopulationGroup, migrantIds: string[], reason: MigrationFlow['reason']): number {
    let successfulMigrations = 0;

    for (const migrantId of migrantIds) {
      const person = this._people.get(migrantId);
      if (person && person.isAlive) {
        // Attempt migration based on person's mobility
        const newLocation: Location = {
          x: Math.random() * 1000, // Simplified location system
          y: Math.random() * 1000,
          region: other.region
        };

        if (person.migrate(newLocation)) {
          // Transfer person to new group
          this.removePerson(migrantId);
          other.addPerson(person);
          successfulMigrations++;
        }
      }
    }

    // Record migration flow
    if (successfulMigrations > 0) {
      this._migrationHistory.push({
        fromRegion: this._region,
        toRegion: other.region,
        count: successfulMigrations,
        reason: reason
      });

      other._migrationHistory.push({
        fromRegion: this._region,
        toRegion: other.region,
        count: successfulMigrations,
        reason: reason
      });
    }

    return successfulMigrations;
  }

  // Utility methods
  getRandomPerson(): Person | null {
    const people = Array.from(this._people.values()).filter(p => p.isAlive);
    if (people.length === 0) return null;
    return people[Math.floor(Math.random() * people.length)];
  }

  getPersonsByAge(minAge: number, maxAge: number): Person[] {
    return Array.from(this._people.values())
      .filter(p => p.isAlive && p.age >= minAge && p.age <= maxAge);
  }

  getPersonsByEducation(level: EducationLevel): Person[] {
    return Array.from(this._people.values())
      .filter(p => p.isAlive && p.educationLevel === level);
  }

  getPersonsByEmployment(status: EmploymentStatus): Person[] {
    return Array.from(this._people.values())
      .filter(p => p.isAlive && p.employmentStatus === status);
  }

  // Generate a basic population for testing
  generateInitialPopulation(size: number, centerLocation: Location): void {
    for (let i = 0; i < size; i++) {
      const age = this.generateRandomAge();
      const gender = Math.random() < 0.51 ? Gender.FEMALE : Gender.MALE;

      const location: Location = {
        x: centerLocation.x + (Math.random() - 0.5) * 100,
        y: centerLocation.y + (Math.random() - 0.5) * 100,
        region: this._region
      };

      const personId = `${this._id}_person_${i}`;
      const person = new Person(personId, age, gender, location);

      this.addPerson(person);
    }
  }

  private generateRandomAge(): number {
    // Age distribution roughly matching real world
    const rand = Math.random();
    if (rand < 0.25) return Math.floor(Math.random() * 18); // Children
    if (rand < 0.65) return 18 + Math.floor(Math.random() * 47); // Adults
    return 65 + Math.floor(Math.random() * 20); // Elderly
  }
}