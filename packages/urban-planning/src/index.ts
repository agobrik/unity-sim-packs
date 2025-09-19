// Core exports
export {
  CityGrid,
  CityCell,
  Position,
  ZoneType,
  BuildingType,
  InfrastructureLevel
} from './core/CityGrid';

export {
  ZoningSystem,
  ZoningPlan,
  ZoningArea,
  ZoningRestrictions
} from './core/ZoningSystem';

export {
  InfrastructureManager,
  InfrastructureProject,
  InfrastructureType,
  ProjectStatus,
  InfrastructureBenefits,
  MaintenanceSchedule
} from './core/InfrastructureManager';

// Utility exports
export {
  CityAnalytics,
  CityMetrics,
  CityReport,
  Recommendation,
  TrendData,
  Alert
} from './utils/CityAnalytics';

export {
  CityVisualizer,
  VisualizationLayer,
  LayerType,
  ColorScheme,
  VisualizationData,
  UnityVisualizationData
} from './utils/CityVisualizer';

// Main simulation class that combines all components
import { CityGrid, CityCell, Position, ZoneType, BuildingType, InfrastructureLevel } from './core/CityGrid';
import { ZoningSystem, ZoningPlan, ZoningArea, ZoningRestrictions } from './core/ZoningSystem';
import { InfrastructureManager, InfrastructureProject, InfrastructureType, ProjectStatus, InfrastructureBenefits, MaintenanceSchedule } from './core/InfrastructureManager';
import { CityAnalytics, CityMetrics, CityReport, Recommendation, TrendData, Alert } from './utils/CityAnalytics';
import { CityVisualizer, VisualizationLayer, LayerType, ColorScheme, VisualizationData, UnityVisualizationData } from './utils/CityVisualizer';

export class UrbanPlanningSimulation {
  private cityGrid: CityGrid;
  private zoningSystem: ZoningSystem;
  private infrastructureManager: InfrastructureManager;
  private analytics: CityAnalytics;
  private visualizer: CityVisualizer;
  private isRunning: boolean = false;
  private currentTime: number = 0;

  constructor(width: number, height: number, initialBudget: number = 1000000) {
    this.cityGrid = new CityGrid(width, height);
    this.zoningSystem = new ZoningSystem(this.cityGrid);
    this.infrastructureManager = new InfrastructureManager(this.cityGrid, initialBudget);
    this.analytics = new CityAnalytics(this.cityGrid, this.zoningSystem, this.infrastructureManager);
    this.visualizer = new CityVisualizer(this.cityGrid);
  }

  // Core system getters
  getCityGrid(): CityGrid {
    return this.cityGrid;
  }

  getZoningSystem(): ZoningSystem {
    return this.zoningSystem;
  }

  getInfrastructureManager(): InfrastructureManager {
    return this.infrastructureManager;
  }

  getAnalytics(): CityAnalytics {
    return this.analytics;
  }

  getVisualizer(): CityVisualizer {
    return this.visualizer;
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

    this.currentTime += deltaTime;

    // Update infrastructure construction and maintenance
    this.infrastructureManager.updateConstruction(deltaTime);

    // Update city dynamics (population growth, traffic changes, etc.)
    this.updateCityDynamics(deltaTime);

    // Update visualizations
    this.visualizer.updateAllLayers();

    return true;
  }

  private updateCityDynamics(deltaTime: number): void {
    // Simple population growth simulation
    for (let x = 0; x < this.cityGrid.width; x++) {
      for (let y = 0; y < this.cityGrid.height; y++) {
        const cell = this.cityGrid.getCell(x, y);
        if (!cell) continue;

        // Population growth based on happiness and infrastructure
        if (cell.population > 0 && cell.happiness > 0.6) {
          const growth = cell.happiness * cell.infrastructure.water * 0.01 * deltaTime;
          cell.population = Math.floor(cell.population * (1 + growth));
        }

        // Traffic simulation based on population and infrastructure
        const neighbors = this.cityGrid.getNeighbors(x, y);
        const neighborPop = neighbors.reduce((sum, n) => sum + n.population, 0);
        const baseTraffic = (cell.population + neighborPop * 0.1) / 100;
        const roadFactor = 1 - cell.infrastructure.roads;
        const transitFactor = 1 - cell.infrastructure.publicTransport * 0.5;

        cell.traffic = Math.min(1, baseTraffic * roadFactor * transitFactor);

        // Update happiness based on current conditions
        this.updateCellHappiness(cell, neighbors);
      }
    }
  }

  private updateCellHappiness(cell: CityCell, neighbors: CityCell[]): void {
    if (cell.population === 0) return;

    let happiness = 0.5; // Base happiness

    // Infrastructure factor
    const infraScore = Object.values(cell.infrastructure).reduce((sum, val) => sum + val, 0) / 5;
    happiness += infraScore * 0.3;

    // Environment factor
    happiness -= cell.pollution * 0.4;
    happiness -= cell.traffic * 0.2;

    // Neighbor effects
    const neighborGreenSpace = neighbors.filter(n => n.zoneType === ZoneType.GREEN_SPACE).length;
    happiness += neighborGreenSpace * 0.02;

    const neighborPollution = neighbors.reduce((sum, n) => sum + n.pollution, 0) / neighbors.length;
    happiness -= neighborPollution * 0.1;

    cell.happiness = Math.max(0, Math.min(1, happiness));
  }

  reset(): void {
    this.stop();
    this.currentTime = 0;
    this.cityGrid = new CityGrid(this.cityGrid.width, this.cityGrid.height);
    this.zoningSystem = new ZoningSystem(this.cityGrid);
    this.infrastructureManager = new InfrastructureManager(this.cityGrid);
    this.analytics = new CityAnalytics(this.cityGrid, this.zoningSystem, this.infrastructureManager);
    this.visualizer = new CityVisualizer(this.cityGrid);
  }

  // Quick setup methods
  createBasicCity(): void {
    const centerX = Math.floor(this.cityGrid.width / 2);
    const centerY = Math.floor(this.cityGrid.height / 2);

    // Create residential zone
    const residentialPositions = [];
    for (let x = centerX - 5; x <= centerX - 2; x++) {
      for (let y = centerY - 3; y <= centerY + 3; y++) {
        residentialPositions.push({ x, y });
        this.cityGrid.setZone(x, y, ZoneType.RESIDENTIAL);
      }
    }

    // Create commercial zone
    for (let x = centerX - 1; x <= centerX + 1; x++) {
      for (let y = centerY - 2; y <= centerY + 2; y++) {
        this.cityGrid.setZone(x, y, ZoneType.COMMERCIAL);
      }
    }

    // Create industrial zone
    for (let x = centerX + 2; x <= centerX + 5; x++) {
      for (let y = centerY - 2; y <= centerY + 2; y++) {
        this.cityGrid.setZone(x, y, ZoneType.INDUSTRIAL);
      }
    }

    // Add some basic infrastructure
    for (let x = centerX - 6; x <= centerX + 6; x++) {
      this.cityGrid.upgradeInfrastructure(x, centerY, 'roads', 0.8);
    }

    for (let y = centerY - 4; y <= centerY + 4; y++) {
      this.cityGrid.upgradeInfrastructure(centerX, y, 'roads', 0.8);
    }
  }

  generateReport(): CityReport {
    return this.analytics.generateReport(this.currentTime);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  exportState(): string {
    const state = {
      currentTime: this.currentTime,
      timestamp: Date.now(),
      cityData: {
        width: this.cityGrid.width,
        height: this.cityGrid.height,
        cells: this.cityGrid.getAllCells()
      },
      zoningData: this.zoningSystem.exportZoningData(),
      infrastructureData: this.infrastructureManager.exportInfrastructureData(),
      analyticsData: this.analytics.exportAnalytics(),
      visualizationData: this.visualizer.exportToUnity()
    };

    return JSON.stringify(state, null, 2);
  }

  importState(stateJson: string): boolean {
    try {
      const state = JSON.parse(stateJson);
      this.currentTime = state.currentTime || 0;
      // Additional import logic would go here
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
}