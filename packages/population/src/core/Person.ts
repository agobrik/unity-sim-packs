export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum AgeGroup {
  CHILD = 'child',      // 0-17
  ADULT = 'adult',      // 18-64
  ELDERLY = 'elderly'   // 65+
}

export enum EducationLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  POSTGRADUATE = 'postgraduate'
}

export enum EmploymentStatus {
  EMPLOYED = 'employed',
  UNEMPLOYED = 'unemployed',
  STUDENT = 'student',
  RETIRED = 'retired',
  DISABLED = 'disabled'
}

export interface PersonTraits {
  intelligence: number; // 0-1
  health: number; // 0-1
  sociability: number; // 0-1
  mobility: number; // 0-1 (willingness to move)
  fertility: number; // 0-1
}

export interface Location {
  x: number;
  y: number;
  region: string;
}

export class Person {
  private _id: string;
  private _age: number;
  private _gender: Gender;
  private _educationLevel: EducationLevel;
  private _employmentStatus: EmploymentStatus;
  private _income: number;
  private _happiness: number;
  private _health: number;
  private _traits: PersonTraits;
  private _location: Location;
  private _familyIds: string[];
  private _birthYear: number;
  private _isAlive: boolean = true;

  constructor(
    id: string,
    age: number,
    gender: Gender,
    location: Location,
    traits?: Partial<PersonTraits>
  ) {
    this._id = id;
    this._age = age;
    this._gender = gender;
    this._location = location;
    this._familyIds = [];
    this._birthYear = new Date().getFullYear() - age;

    // Set initial education and employment based on age
    this._educationLevel = this.determineInitialEducation(age);
    this._employmentStatus = this.determineInitialEmployment(age);

    // Set initial income based on age, education, and random factors
    this._income = this.calculateInitialIncome();

    // Initialize traits
    this._traits = {
      intelligence: traits?.intelligence ?? Math.random(),
      health: traits?.health ?? (0.8 + Math.random() * 0.2),
      sociability: traits?.sociability ?? Math.random(),
      mobility: traits?.mobility ?? Math.random(),
      fertility: traits?.fertility ?? this.calculateBaseFertility()
    };

    this._health = this._traits.health;
    this._happiness = this.calculateInitialHappiness();
  }

  // Getters
  get id(): string { return this._id; }
  get age(): number { return this._age; }
  get gender(): Gender { return this._gender; }
  get educationLevel(): EducationLevel { return this._educationLevel; }
  get employmentStatus(): EmploymentStatus { return this._employmentStatus; }
  get income(): number { return this._income; }
  get happiness(): number { return this._happiness; }
  get health(): number { return this._health; }
  get traits(): PersonTraits { return { ...this._traits }; }
  get location(): Location { return { ...this._location }; }
  get familyIds(): string[] { return [...this._familyIds]; }
  get isAlive(): boolean { return this._isAlive; }
  get ageGroup(): AgeGroup {
    if (this._age < 18) return AgeGroup.CHILD;
    if (this._age < 65) return AgeGroup.ADULT;
    return AgeGroup.ELDERLY;
  }

  // Setters
  setLocation(location: Location): void {
    this._location = { ...location };
  }

  setEmploymentStatus(status: EmploymentStatus): void {
    this._employmentStatus = status;
    this._income = this.calculateInitialIncome(); // Recalculate income
  }

  setEducationLevel(level: EducationLevel): void {
    this._educationLevel = level;
    this._income = this.calculateInitialIncome(); // Recalculate income
  }

  addFamilyMember(personId: string): void {
    if (!this._familyIds.includes(personId)) {
      this._familyIds.push(personId);
    }
  }

  removeFamilyMember(personId: string): void {
    const index = this._familyIds.indexOf(personId);
    if (index > -1) {
      this._familyIds.splice(index, 1);
    }
  }

  // Life cycle methods
  age1Year(): void {
    this._age++;

    // Update employment status based on age transitions
    if (this._age === 18 && this._employmentStatus === EmploymentStatus.STUDENT) {
      this._employmentStatus = Math.random() > 0.6 ? EmploymentStatus.EMPLOYED : EmploymentStatus.UNEMPLOYED;
    }

    if (this._age === 65 && this._employmentStatus === EmploymentStatus.EMPLOYED) {
      this._employmentStatus = EmploymentStatus.RETIRED;
    }

    // Health degradation with age
    const healthDecline = 0.005 + (this._age > 65 ? 0.01 : 0);
    this._health = Math.max(0, this._health - healthDecline + Math.random() * 0.01 - 0.005);
    this._traits.health = this._health;

    // Update happiness based on life circumstances
    this.updateHappiness();
  }

  migrate(newLocation: Location): boolean {
    const migrationWillingness = this._traits.mobility;
    const distance = Math.sqrt(
      Math.pow(newLocation.x - this._location.x, 2) +
      Math.pow(newLocation.y - this._location.y, 2)
    );

    // Higher distance requires higher mobility trait
    const migrationThreshold = Math.min(0.8, distance / 100);

    if (migrationWillingness > migrationThreshold) {
      this._location = { ...newLocation };
      // Migration can temporarily decrease happiness but may increase income
      this._happiness = Math.max(0, this._happiness - 0.1);
      this._income *= (0.9 + Math.random() * 0.3); // Income can vary ±20%
      return true;
    }

    return false;
  }

  calculateDeathProbability(): number {
    let baseProbability = 0.001; // 0.1% base annual death rate

    // Age factor
    if (this._age < 1) baseProbability = 0.005;
    else if (this._age < 18) baseProbability = 0.0005;
    else if (this._age < 65) baseProbability = 0.001;
    else if (this._age < 80) baseProbability = 0.01;
    else baseProbability = 0.05;

    // Health factor
    baseProbability *= (1.5 - this._health);

    // Gender factor (women generally live longer)
    if (this._gender === Gender.FEMALE) {
      baseProbability *= 0.9;
    }

    return Math.min(1, baseProbability);
  }

  die(): void {
    this._isAlive = false;
    this._health = 0;
    this._happiness = 0;
  }

  // Helper methods
  private determineInitialEducation(age: number): EducationLevel {
    if (age < 6) return EducationLevel.PRIMARY;
    if (age < 14) return EducationLevel.PRIMARY;
    if (age < 18) return EducationLevel.SECONDARY;

    const rand = Math.random();
    if (rand > 0.7) return EducationLevel.TERTIARY;
    if (rand > 0.9) return EducationLevel.POSTGRADUATE;
    return EducationLevel.SECONDARY;
  }

  private determineInitialEmployment(age: number): EmploymentStatus {
    if (age < 16) return EmploymentStatus.STUDENT;
    if (age >= 65) return EmploymentStatus.RETIRED;

    const rand = Math.random();
    if (rand > 0.85) return EmploymentStatus.EMPLOYED;
    if (rand > 0.95) return EmploymentStatus.UNEMPLOYED;
    return EmploymentStatus.EMPLOYED;
  }

  private calculateInitialIncome(): number {
    let baseIncome = 30000; // Base annual income

    // Education multiplier
    switch (this._educationLevel) {
      case EducationLevel.PRIMARY: baseIncome *= 0.6; break;
      case EducationLevel.SECONDARY: baseIncome *= 1.0; break;
      case EducationLevel.TERTIARY: baseIncome *= 1.8; break;
      case EducationLevel.POSTGRADUATE: baseIncome *= 2.5; break;
    }

    // Employment status modifier
    switch (this._employmentStatus) {
      case EmploymentStatus.UNEMPLOYED: baseIncome *= 0.1; break;
      case EmploymentStatus.STUDENT: baseIncome *= 0.2; break;
      case EmploymentStatus.RETIRED: baseIncome *= 0.4; break;
      case EmploymentStatus.DISABLED: baseIncome *= 0.3; break;
      case EmploymentStatus.EMPLOYED: break; // No change
    }

    // Age factor
    if (this._age < 25) baseIncome *= 0.8;
    else if (this._age > 50) baseIncome *= 1.2;

    // Intelligence factor
    baseIncome *= (0.7 + this._traits.intelligence * 0.6);

    // Random variation
    baseIncome *= (0.8 + Math.random() * 0.4);

    return Math.max(0, baseIncome);
  }

  private calculateBaseFertility(): number {
    if (this._gender === Gender.MALE) return 0.8;
    if (this._age < 15 || this._age > 45) return 0.1;
    if (this._age >= 15 && this._age <= 35) return 0.9;
    return Math.max(0.1, 0.9 - (this._age - 35) * 0.08);
  }

  private calculateInitialHappiness(): number {
    let happiness = 0.6; // Base happiness

    // Income factor
    const relativeIncome = Math.min(1, this._income / 50000);
    happiness += relativeIncome * 0.2;

    // Health factor
    happiness += this._health * 0.2;

    // Family factor
    happiness += Math.min(0.1, this._familyIds.length * 0.02);

    // Random personal factor
    happiness += (Math.random() - 0.5) * 0.2;

    return Math.max(0, Math.min(1, happiness));
  }

  private updateHappiness(): void {
    let newHappiness = 0.5; // Reset to base

    // Income factor
    const relativeIncome = Math.min(1, this._income / 50000);
    newHappiness += relativeIncome * 0.25;

    // Health factor
    newHappiness += this._health * 0.25;

    // Employment factor
    if (this._employmentStatus === EmploymentStatus.EMPLOYED) newHappiness += 0.1;
    else if (this._employmentStatus === EmploymentStatus.UNEMPLOYED) newHappiness -= 0.15;

    // Family factor
    newHappiness += Math.min(0.1, this._familyIds.length * 0.02);

    // Age factor
    if (this.ageGroup === AgeGroup.CHILD) newHappiness += 0.1;
    else if (this.ageGroup === AgeGroup.ELDERLY && this._health > 0.7) newHappiness += 0.05;

    // Smooth transition
    this._happiness = (this._happiness * 0.8) + (newHappiness * 0.2);
    this._happiness = Math.max(0, Math.min(1, this._happiness));
  }
}