// Core exports
export { Person, Gender, AgeGroup, EducationLevel, EmploymentStatus, PersonTraits, Location } from './core/Person';
export { PopulationGroup, GroupDemographics, MigrationFlow } from './core/PopulationGroup';
export { PopulationVisualizer, VisualizationData, PopulationMapData, DemographicChartData, MigrationFlowData, SocialMetricsData, TimeSeriesData } from './utils/PopulationVisualizer';

import { PopulationGroup } from './core/PopulationGroup';
import { PopulationVisualizer } from './utils/PopulationVisualizer';
import { Location } from './core/Person';

// Main simulation class that combines all population components
export class PopulationSimulation {
  private groups: Map<string, PopulationGroup>;
  private visualizer: PopulationVisualizer;
  private isRunning: boolean = false;
  private currentYear: number = 0;
  private simulationSpeed: number = 1; // Years per step

  constructor() {
    this.groups = new Map();
    this.visualizer = new PopulationVisualizer(this.groups);
  }

  // Group management
  addGroup(group: PopulationGroup): void {
    this.groups.set(group.id, group);
  }

  removeGroup(groupId: string): boolean {
    return this.groups.delete(groupId);
  }

  getGroup(groupId: string): PopulationGroup | undefined {
    return this.groups.get(groupId);
  }

  getAllGroups(): PopulationGroup[] {
    return Array.from(this.groups.values());
  }

  // Simulation control
  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  step(deltaTime: number = 1): boolean {
    if (!this.isRunning) return false;

    const yearsToSimulate = deltaTime * this.simulationSpeed;
    this.currentYear += yearsToSimulate;

    // Simulate each group for the time period
    if (yearsToSimulate >= 1) {
      const fullYears = Math.floor(yearsToSimulate);
      for (let year = 0; year < fullYears; year++) {
        this.simulateOneYear();
      }
    }

    // Update visualizer time series
    this.visualizer.updateTimeSeriesData();

    return true;
  }

  reset(): void {
    this.stop();
    this.currentYear = 0;
    this.groups.clear();
    this.visualizer = new PopulationVisualizer(this.groups);
  }

  private simulateOneYear(): void {
    // Simulate life cycle for each group
    this.groups.forEach(group => {
      group.simulateYear();
    });

    // Process inter-group migrations
    this.processMigrations();
  }

  private processMigrations(): void {
    const groupArray = Array.from(this.groups.values());

    for (let i = 0; i < groupArray.length; i++) {
      for (let j = i + 1; j < groupArray.length; j++) {
        const group1 = groupArray[i];
        const group2 = groupArray[j];

        // Calculate migration probability based on happiness and income differences
        const happiness1 = group1.getDemographics().averageHappiness;
        const happiness2 = group2.getDemographics().averageHappiness;
        const income1 = group1.getDemographics().averageIncome;
        const income2 = group2.getDemographics().averageIncome;

        // Migration from group1 to group2
        if (happiness2 > happiness1 || income2 > income1) {
          const migrationFactor = Math.max(
            (happiness2 - happiness1) * 0.1,
            (income2 - income1) / 50000 * 0.1
          );

          const potentialMigrants1 = Math.floor(group1.size * migrationFactor * 0.01);
          if (potentialMigrants1 > 0) {
            const migrants = this.selectMigrants(group1, potentialMigrants1);
            const reason = income2 > income1 ? 'economic' : 'environment';
            group1.migrateToGroup(group2, migrants, reason);
          }
        }

        // Migration from group2 to group1
        if (happiness1 > happiness2 || income1 > income2) {
          const migrationFactor = Math.max(
            (happiness1 - happiness2) * 0.1,
            (income1 - income2) / 50000 * 0.1
          );

          const potentialMigrants2 = Math.floor(group2.size * migrationFactor * 0.01);
          if (potentialMigrants2 > 0) {
            const migrants = this.selectMigrants(group2, potentialMigrants2);
            const reason = income1 > income2 ? 'economic' : 'environment';
            group2.migrateToGroup(group1, migrants, reason);
          }
        }
      }
    }
  }

  private selectMigrants(group: PopulationGroup, count: number): string[] {
    const potentialMigrants = group.people
      .filter(person => person.isAlive && person.traits.mobility > 0.3)
      .sort((a, b) => b.traits.mobility - a.traits.mobility);

    return potentialMigrants
      .slice(0, Math.min(count, potentialMigrants.length))
      .map(person => person.id);
  }

  // Metrics and data
  getTotalPopulation(): number {
    return Array.from(this.groups.values()).reduce((sum, group) => sum + group.size, 0);
  }

  getOverallMetrics(): any {
    let totalPop = 0;
    let totalHappiness = 0;
    let totalIncome = 0;
    let totalHealth = 0;

    this.groups.forEach(group => {
      const demographics = group.getDemographics();
      const groupPop = demographics.totalPopulation;

      totalPop += groupPop;
      totalHappiness += demographics.averageHappiness * groupPop;
      totalIncome += demographics.averageIncome * groupPop;
      totalHealth += demographics.averageHealth * groupPop;
    });

    return {
      totalPopulation: totalPop,
      averageHappiness: totalPop > 0 ? totalHappiness / totalPop : 0,
      averageIncome: totalPop > 0 ? totalIncome / totalPop : 0,
      averageHealth: totalPop > 0 ? totalHealth / totalPop : 0,
      numberOfGroups: this.groups.size,
      currentYear: this.currentYear
    };
  }

  getCurrentYear(): number {
    return this.currentYear;
  }

  setSimulationSpeed(speed: number): void {
    this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
  }

  exportState(): string {
    const visualizationData = this.visualizer.generateVisualizationData();

    return JSON.stringify({
      currentYear: this.currentYear,
      isRunning: this.isRunning,
      simulationSpeed: this.simulationSpeed,
      overallMetrics: this.getOverallMetrics(),

      // Group data
      groups: Array.from(this.groups.entries()).map(([id, group]) => ({
        id: id,
        name: group.name,
        region: group.region,
        size: group.size,
        demographics: group.getDemographics()
      })),

      // Visualization data for Unity
      visualizationData: visualizationData,

      timestamp: Date.now()
    }, null, 2);
  }

  // Unity-specific export
  exportToUnity(): string {
    return this.visualizer.exportToUnity();
  }

  // Helper method to create a basic simulation setup for testing
  static createBasicSetup(): PopulationSimulation {
    const simulation = new PopulationSimulation();

    // Create sample population groups
    const urbanGroup = new PopulationGroup('urban_01', 'Metro City', 'urban');
    urbanGroup.generateInitialPopulation(50000, { x: 100, y: 100, region: 'urban' });

    const suburbanGroup = new PopulationGroup('suburban_01', 'Suburbia', 'suburban');
    suburbanGroup.generateInitialPopulation(25000, { x: 200, y: 150, region: 'suburban' });

    const ruralGroup = new PopulationGroup('rural_01', 'Countryside', 'rural');
    ruralGroup.generateInitialPopulation(5000, { x: 300, y: 200, region: 'rural' });

    simulation.addGroup(urbanGroup);
    simulation.addGroup(suburbanGroup);
    simulation.addGroup(ruralGroup);

    return simulation;
  }
}