export { GridNode, ElectricalProperties, NodeCapacity, NodeType } from './core/GridNode';
export { PowerGrid, GridStats, LoadBalancingConfig } from './core/PowerGrid';
export { GridAnalyzer, AnalysisReport, LoadForecast } from './utils/GridAnalyzer';

import { PowerGrid, GridStats, LoadBalancingConfig } from './core/PowerGrid';
import { GridAnalyzer } from './utils/GridAnalyzer';
import { GridNode } from './core/GridNode';

// Main electrical grid simulation class
export class ElectricalGridSimulation {
  private grid: PowerGrid;
  private analyzer: GridAnalyzer;
  private isRunning: boolean = false;
  private simulationInterval?: NodeJS.Timeout;

  constructor(config?: Partial<LoadBalancingConfig>) {
    this.grid = new PowerGrid(config);
    this.analyzer = new GridAnalyzer(this.grid);
  }

  getGrid(): PowerGrid {
    return this.grid;
  }

  getAnalyzer(): GridAnalyzer {
    return this.analyzer;
  }

  start(updateIntervalMs: number = 1000): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.simulationInterval = setInterval(() => {
      this.step();
    }, updateIntervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }

  step(): GridStats {
    const stats = this.grid.runPowerFlowAnalysis();
    this.analyzer.addHistoricalData(stats);
    return stats;
  }

  reset(): void {
    this.stop();
    this.grid.reset();
    this.analyzer = new GridAnalyzer(this.grid);
  }

  addGenerator(id: string, position: { x: number; y: number }, maxPowerMW: number): GridNode {
    return this.grid.addNode(id, 'generator', position, {
      maxPower: maxPowerMW,
      maxVoltage: 400,
      maxCurrent: maxPowerMW / 230 * 1000 // Simplified calculation
    });
  }

  addLoad(id: string, position: { x: number; y: number }, maxPowerMW: number): GridNode {
    return this.grid.addNode(id, 'load', position, {
      maxPower: maxPowerMW,
      maxVoltage: 250,
      maxCurrent: maxPowerMW / 230 * 1000
    });
  }

  addTransformer(id: string, position: { x: number; y: number }, maxPowerMW: number): GridNode {
    return this.grid.addNode(id, 'transformer', position, {
      maxPower: maxPowerMW,
      maxVoltage: 400,
      maxCurrent: maxPowerMW / 230 * 1000
    });
  }

  addBus(id: string, position: { x: number; y: number }, maxPowerMW: number): GridNode {
    return this.grid.addNode(id, 'bus', position, {
      maxPower: maxPowerMW,
      maxVoltage: 250,
      maxCurrent: maxPowerMW / 230 * 1000
    });
  }

  exportState(): string {
    return this.grid.exportToUnity();
  }

  exportAnalysis(): string {
    return this.analyzer.exportAnalysisToUnity();
  }

  simulateOutage(nodeId: string): boolean {
    const node = this.grid.getNode(nodeId);
    if (!node) return false;

    node.isActive = false;
    return true;
  }

  restoreNode(nodeId: string): boolean {
    const node = this.grid.getNode(nodeId);
    if (!node) return false;

    node.isActive = true;
    return true;
  }

  getStatus(): {
    isRunning: boolean;
    isStable: boolean;
    nodeCount: number;
    frequency: number;
  } {
    return {
      isRunning: this.isRunning,
      isStable: this.grid.isStable,
      nodeCount: this.grid.nodes.length,
      frequency: this.grid.frequency
    };
  }
}