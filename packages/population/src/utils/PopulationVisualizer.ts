import { PopulationGroup, GroupDemographics, MigrationFlow } from '../core/PopulationGroup';
import { Person, Gender, AgeGroup, EducationLevel, EmploymentStatus } from '../core/Person';

export interface VisualizationData {
  populationMap: PopulationMapData[];
  demographicCharts: DemographicChartData;
  migrationFlows: MigrationFlowData[];
  socialMetrics: SocialMetricsData;
  timeSeriesData: TimeSeriesData;
}

export interface PopulationMapData {
  region: string;
  x: number;
  y: number;
  population: number;
  density: number;
  avgHappiness: number;
  avgIncome: number;
  avgHealth: number;
}

export interface DemographicChartData {
  genderPyramid: Array<{ ageGroup: string; male: number; female: number }>;
  educationDistribution: Array<{ level: string; count: number; percentage: number }>;
  employmentDistribution: Array<{ status: string; count: number; percentage: number }>;
  incomeDistribution: Array<{ bracket: string; count: number; avgIncome: number }>;
}

export interface MigrationFlowData {
  from: { x: number; y: number; region: string };
  to: { x: number; y: number; region: string };
  count: number;
  reason: string;
  strength: number; // 0-1 for visualization thickness
}

export interface SocialMetricsData {
  overallHappiness: number;
  healthIndex: number;
  economicIndex: number;
  socialMobility: number;
  lifeExpectancy: number;
  fertilityRate: number;
  migrationRate: number;
}

export interface TimeSeriesData {
  populationHistory: Array<{ time: number; population: number }>;
  happinessHistory: Array<{ time: number; happiness: number }>;
  incomeHistory: Array<{ time: number; avgIncome: number }>;
  migrationHistory: Array<{ time: number; inflow: number; outflow: number }>;
}

export class PopulationVisualizer {
  private groups: Map<string, PopulationGroup>;
  private timeSeriesHistory: TimeSeriesData;
  private maxHistoryLength: number = 100;

  constructor(groups: Map<string, PopulationGroup>) {
    this.groups = groups;
    this.timeSeriesHistory = {
      populationHistory: [],
      happinessHistory: [],
      incomeHistory: [],
      migrationHistory: []
    };
  }

  generateVisualizationData(): VisualizationData {
    return {
      populationMap: this.generatePopulationMapData(),
      demographicCharts: this.generateDemographicChartData(),
      migrationFlows: this.generateMigrationFlowData(),
      socialMetrics: this.generateSocialMetricsData(),
      timeSeriesData: this.timeSeriesHistory
    };
  }

  private generatePopulationMapData(): PopulationMapData[] {
    const mapData: PopulationMapData[] = [];

    this.groups.forEach((group, groupId) => {
      const demographics = group.getDemographics();
      const centerLocation = this.calculateGroupCenter(group);

      mapData.push({
        region: group.region,
        x: centerLocation.x,
        y: centerLocation.y,
        population: demographics.totalPopulation,
        density: demographics.totalPopulation / 100, // Simplified density calculation
        avgHappiness: demographics.averageHappiness,
        avgIncome: demographics.averageIncome,
        avgHealth: demographics.averageHealth
      });
    });

    return mapData;
  }

  private calculateGroupCenter(group: PopulationGroup): { x: number; y: number } {
    const people = group.people;
    if (people.length === 0) return { x: 0, y: 0 };

    const totalX = people.reduce((sum, person) => sum + person.location.x, 0);
    const totalY = people.reduce((sum, person) => sum + person.location.y, 0);

    return {
      x: totalX / people.length,
      y: totalY / people.length
    };
  }

  private generateDemographicChartData(): DemographicChartData {
    // Aggregate data across all groups
    let totalMale = 0, totalFemale = 0;
    let totalChildren = 0, totalAdults = 0, totalElderly = 0;
    const educationCounts = new Map<EducationLevel, number>();
    const employmentCounts = new Map<EmploymentStatus, number>();
    const incomeBrackets = new Map<string, { count: number; totalIncome: number }>();

    let totalPopulation = 0;

    this.groups.forEach(group => {
      const demographics = group.getDemographics();
      const groupPop = demographics.totalPopulation;
      totalPopulation += groupPop;

      // Gender data
      totalMale += demographics.genderDistribution[Gender.MALE] * groupPop;
      totalFemale += demographics.genderDistribution[Gender.FEMALE] * groupPop;

      // Age data
      totalChildren += demographics.ageDistribution[AgeGroup.CHILD] * groupPop;
      totalAdults += demographics.ageDistribution[AgeGroup.ADULT] * groupPop;
      totalElderly += demographics.ageDistribution[AgeGroup.ELDERLY] * groupPop;

      // Education data
      Object.entries(demographics.educationDistribution).forEach(([level, percentage]) => {
        const count = percentage * groupPop;
        educationCounts.set(level as EducationLevel, (educationCounts.get(level as EducationLevel) || 0) + count);
      });

      // Employment data
      Object.entries(demographics.employmentDistribution).forEach(([status, percentage]) => {
        const count = percentage * groupPop;
        employmentCounts.set(status as EmploymentStatus, (employmentCounts.get(status as EmploymentStatus) || 0) + count);
      });

      // Income data
      group.people.forEach(person => {
        const bracket = this.getIncomeBracket(person.income);
        if (!incomeBrackets.has(bracket)) {
          incomeBrackets.set(bracket, { count: 0, totalIncome: 0 });
        }
        const bracketData = incomeBrackets.get(bracket)!;
        bracketData.count++;
        bracketData.totalIncome += person.income;
      });
    });

    return {
      genderPyramid: [
        { ageGroup: 'Children', male: totalMale * (totalChildren / totalPopulation), female: totalFemale * (totalChildren / totalPopulation) },
        { ageGroup: 'Adults', male: totalMale * (totalAdults / totalPopulation), female: totalFemale * (totalAdults / totalPopulation) },
        { ageGroup: 'Elderly', male: totalMale * (totalElderly / totalPopulation), female: totalFemale * (totalElderly / totalPopulation) }
      ],
      educationDistribution: Array.from(educationCounts.entries()).map(([level, count]) => ({
        level,
        count: Math.round(count),
        percentage: count / totalPopulation
      })),
      employmentDistribution: Array.from(employmentCounts.entries()).map(([status, count]) => ({
        status,
        count: Math.round(count),
        percentage: count / totalPopulation
      })),
      incomeDistribution: Array.from(incomeBrackets.entries()).map(([bracket, data]) => ({
        bracket,
        count: data.count,
        avgIncome: data.totalIncome / data.count
      }))
    };
  }

  private getIncomeBracket(income: number): string {
    if (income < 20000) return '$0-20k';
    if (income < 40000) return '$20k-40k';
    if (income < 60000) return '$40k-60k';
    if (income < 80000) return '$60k-80k';
    if (income < 100000) return '$80k-100k';
    return '$100k+';
  }

  private generateMigrationFlowData(): MigrationFlowData[] {
    const flowData: MigrationFlowData[] = [];
    const maxMigration = this.getMaxMigrationCount();

    this.groups.forEach(group => {
      const groupCenter = this.calculateGroupCenter(group);
      const recentMigrations = group.migrationHistory.slice(-10); // Last 10 migrations

      // Group migrations by destination
      const migrationsByDestination = new Map<string, MigrationFlow[]>();

      recentMigrations.forEach(migration => {
        const destination = migration.toRegion;
        if (!migrationsByDestination.has(destination)) {
          migrationsByDestination.set(destination, []);
        }
        migrationsByDestination.get(destination)!.push(migration);
      });

      migrationsByDestination.forEach((migrations, toRegion) => {
        const totalCount = migrations.reduce((sum, m) => sum + m.count, 0);
        const primaryReason = this.getPrimaryMigrationReason(migrations);
        const destGroup = this.findGroupByRegion(toRegion);

        if (destGroup) {
          const destCenter = this.calculateGroupCenter(destGroup);

          flowData.push({
            from: { x: groupCenter.x, y: groupCenter.y, region: group.region },
            to: { x: destCenter.x, y: destCenter.y, region: toRegion },
            count: totalCount,
            reason: primaryReason,
            strength: maxMigration > 0 ? totalCount / maxMigration : 0
          });
        }
      });
    });

    return flowData;
  }

  private getMaxMigrationCount(): number {
    let max = 0;
    this.groups.forEach(group => {
      group.migrationHistory.forEach(migration => {
        max = Math.max(max, migration.count);
      });
    });
    return max;
  }

  private getPrimaryMigrationReason(migrations: MigrationFlow[]): string {
    const reasonCounts = new Map<string, number>();

    migrations.forEach(migration => {
      reasonCounts.set(migration.reason, (reasonCounts.get(migration.reason) || 0) + migration.count);
    });

    let maxCount = 0;
    let primaryReason = 'unknown';

    reasonCounts.forEach((count, reason) => {
      if (count > maxCount) {
        maxCount = count;
        primaryReason = reason;
      }
    });

    return primaryReason;
  }

  private findGroupByRegion(region: string): PopulationGroup | null {
    for (const group of this.groups.values()) {
      if (group.region === region) {
        return group;
      }
    }
    return null;
  }

  private generateSocialMetricsData(): SocialMetricsData {
    let totalPopulation = 0;
    let totalHappiness = 0;
    let totalHealth = 0;
    let totalIncome = 0;
    let totalMigrations = 0;
    let totalBirths = 0;
    let totalDeaths = 0;
    let ageSum = 0;

    this.groups.forEach(group => {
      const demographics = group.getDemographics();
      const groupPop = demographics.totalPopulation;

      totalPopulation += groupPop;
      totalHappiness += demographics.averageHappiness * groupPop;
      totalHealth += demographics.averageHealth * groupPop;
      totalIncome += demographics.averageIncome * groupPop;

      // Count recent migrations
      totalMigrations += group.migrationHistory.length;

      // Calculate age-related metrics
      group.people.forEach(person => {
        ageSum += person.age;
        if (person.age === 0) totalBirths++; // Simplified birth counting
      });
    });

    const avgHappiness = totalPopulation > 0 ? totalHappiness / totalPopulation : 0;
    const avgHealth = totalPopulation > 0 ? totalHealth / totalPopulation : 0;
    const avgIncome = totalPopulation > 0 ? totalIncome / totalPopulation : 0;
    const avgAge = totalPopulation > 0 ? ageSum / totalPopulation : 0;

    return {
      overallHappiness: avgHappiness,
      healthIndex: avgHealth,
      economicIndex: Math.min(1, avgIncome / 50000), // Normalized to expected income
      socialMobility: this.calculateSocialMobility(),
      lifeExpectancy: 75 + (avgHealth - 0.8) * 50, // Simplified calculation
      fertilityRate: totalPopulation > 0 ? totalBirths / (totalPopulation * 0.25) : 0, // Per fertile population
      migrationRate: totalPopulation > 0 ? totalMigrations / totalPopulation : 0
    };
  }

  private calculateSocialMobility(): number {
    // Simplified social mobility calculation based on education and income correlation
    let mobilitySum = 0;
    let count = 0;

    this.groups.forEach(group => {
      group.people.forEach(person => {
        // Higher education with higher income indicates mobility
        let educationScore = 0;
        switch (person.educationLevel) {
          case EducationLevel.PRIMARY: educationScore = 0.25; break;
          case EducationLevel.SECONDARY: educationScore = 0.5; break;
          case EducationLevel.TERTIARY: educationScore = 0.75; break;
          case EducationLevel.POSTGRADUATE: educationScore = 1.0; break;
        }

        const incomeScore = Math.min(1, person.income / 100000);
        const mobility = (educationScore + incomeScore) / 2;
        mobilitySum += mobility;
        count++;
      });
    });

    return count > 0 ? mobilitySum / count : 0;
  }

  updateTimeSeriesData(): void {
    const currentTime = Date.now();

    // Calculate current metrics
    let totalPopulation = 0;
    let totalHappiness = 0;
    let totalIncome = 0;
    let totalMigrationIn = 0;
    let totalMigrationOut = 0;
    let populationCount = 0;

    this.groups.forEach(group => {
      const demographics = group.getDemographics();
      totalPopulation += demographics.totalPopulation;
      totalHappiness += demographics.averageHappiness * demographics.totalPopulation;
      totalIncome += demographics.averageIncome * demographics.totalPopulation;
      populationCount += demographics.totalPopulation;

      // Count recent migrations (simplified)
      const recentMigrations = group.migrationHistory.slice(-1);
      recentMigrations.forEach(migration => {
        if (migration.toRegion === group.region) {
          totalMigrationIn += migration.count;
        } else {
          totalMigrationOut += migration.count;
        }
      });
    });

    const avgHappiness = populationCount > 0 ? totalHappiness / populationCount : 0;
    const avgIncome = populationCount > 0 ? totalIncome / populationCount : 0;

    // Add to history
    this.timeSeriesHistory.populationHistory.push({ time: currentTime, population: totalPopulation });
    this.timeSeriesHistory.happinessHistory.push({ time: currentTime, happiness: avgHappiness });
    this.timeSeriesHistory.incomeHistory.push({ time: currentTime, avgIncome: avgIncome });
    this.timeSeriesHistory.migrationHistory.push({ time: currentTime, inflow: totalMigrationIn, outflow: totalMigrationOut });

    // Limit history length
    if (this.timeSeriesHistory.populationHistory.length > this.maxHistoryLength) {
      this.timeSeriesHistory.populationHistory = this.timeSeriesHistory.populationHistory.slice(-this.maxHistoryLength);
      this.timeSeriesHistory.happinessHistory = this.timeSeriesHistory.happinessHistory.slice(-this.maxHistoryLength);
      this.timeSeriesHistory.incomeHistory = this.timeSeriesHistory.incomeHistory.slice(-this.maxHistoryLength);
      this.timeSeriesHistory.migrationHistory = this.timeSeriesHistory.migrationHistory.slice(-this.maxHistoryLength);
    }
  }

  exportToUnity(): string {
    const visualizationData = this.generateVisualizationData();

    return JSON.stringify({
      // Population map for spatial visualization
      populationMap: visualizationData.populationMap.map(region => ({
        region: region.region,
        position: { x: region.x, y: region.y },
        population: region.population,
        density: region.density,
        happiness: region.avgHappiness,
        income: region.avgIncome,
        health: region.avgHealth
      })),

      // Demographic charts data
      demographics: {
        genderPyramid: visualizationData.demographicCharts.genderPyramid,
        education: visualizationData.demographicCharts.educationDistribution,
        employment: visualizationData.demographicCharts.employmentDistribution,
        income: visualizationData.demographicCharts.incomeDistribution
      },

      // Migration flows for arrow visualization
      migrationFlows: visualizationData.migrationFlows.map(flow => ({
        from: flow.from,
        to: flow.to,
        count: flow.count,
        reason: flow.reason,
        thickness: flow.strength * 10 // For Unity line thickness
      })),

      // Overall metrics
      socialMetrics: visualizationData.socialMetrics,

      // Time series for graphs
      timeSeries: {
        population: visualizationData.timeSeriesData.populationHistory.slice(-20),
        happiness: visualizationData.timeSeriesData.happinessHistory.slice(-20),
        income: visualizationData.timeSeriesData.incomeHistory.slice(-20),
        migration: visualizationData.timeSeriesData.migrationHistory.slice(-20)
      },

      // Metadata
      timestamp: Date.now(),
      totalGroups: this.groups.size
    }, null, 2);
  }
}