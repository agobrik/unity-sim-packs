import { GridNode, NodeType, NodeCapacity } from './GridNode';

export interface GridStats {
  totalGeneration: number;
  totalConsumption: number;
  totalLoss: number;
  averageVoltage: number;
  frequency: number;
  gridStability: number;
  nodesCount: {
    total: number;
    active: number;
    healthy: number;
    warning: number;
    critical: number;
    offline: number;
  };
}

export interface LoadBalancingConfig {
  enableAutoBalance: boolean;
  targetFrequency: number;
  frequencyTolerance: number;
  voltageRegulation: boolean;
  emergencyShutdown: boolean;
}

export class PowerGrid {
  private _nodes: Map<string, GridNode>;
  private _gridFrequency: number;
  private _config: LoadBalancingConfig;
  private _isStable: boolean;

  constructor(config?: Partial<LoadBalancingConfig>) {
    this._nodes = new Map();
    this._gridFrequency = 50; // Hz
    this._isStable = true;
    this._config = {
      enableAutoBalance: config?.enableAutoBalance ?? true,
      targetFrequency: config?.targetFrequency ?? 50,
      frequencyTolerance: config?.frequencyTolerance ?? 0.5,
      voltageRegulation: config?.voltageRegulation ?? true,
      emergencyShutdown: config?.emergencyShutdown ?? true
    };
  }

  get nodes(): GridNode[] {
    return Array.from(this._nodes.values());
  }

  get frequency(): number {
    return this._gridFrequency;
  }

  get isStable(): boolean {
    return this._isStable;
  }

  get config(): LoadBalancingConfig {
    return { ...this._config };
  }

  updateConfig(newConfig: Partial<LoadBalancingConfig>): void {
    this._config = { ...this._config, ...newConfig };
  }

  addNode(
    id: string,
    type: NodeType,
    position: { x: number; y: number },
    capacity: NodeCapacity
  ): GridNode {
    const node = new GridNode(id, type, position, capacity);
    this._nodes.set(id, node);
    return node;
  }

  removeNode(id: string): boolean {
    const node = this._nodes.get(id);
    if (!node) return false;

    // Remove all connections to this node
    for (const connection of node.connections) {
      connection.removeConnection(node);
    }

    this._nodes.delete(id);
    return true;
  }

  getNode(id: string): GridNode | undefined {
    return this._nodes.get(id);
  }

  connectNodes(nodeId1: string, nodeId2: string): boolean {
    const node1 = this._nodes.get(nodeId1);
    const node2 = this._nodes.get(nodeId2);

    if (!node1 || !node2) return false;

    node1.addConnection(node2);
    return true;
  }

  disconnectNodes(nodeId1: string, nodeId2: string): boolean {
    const node1 = this._nodes.get(nodeId1);
    const node2 = this._nodes.get(nodeId2);

    if (!node1 || !node2) return false;

    node1.removeConnection(node2);
    return true;
  }

  runPowerFlowAnalysis(): GridStats {
    this.balanceLoad();
    this.updateFrequency();
    this.checkStability();

    return this.calculateGridStats();
  }

  private balanceLoad(): void {
    if (!this._config.enableAutoBalance) return;

    const generators = this.nodes.filter(node =>
      node.type === 'generator' && node.isActive
    );
    const loads = this.nodes.filter(node =>
      node.type === 'load' && node.isActive
    );

    const totalDemand = loads.reduce((sum, node) => sum + Math.abs(node.properties.power), 0);
    const totalCapacity = generators.reduce((sum, node) => sum + node.capacity.maxPower, 0);

    if (totalDemand > totalCapacity && this._config.emergencyShutdown) {
      this.implementLoadShedding(totalDemand - totalCapacity);
      return;
    }

    // Distribute load among generators
    for (const generator of generators) {
      const loadShare = (generator.capacity.maxPower / totalCapacity) * totalDemand;
      generator.generatePower(Math.min(loadShare, generator.capacity.maxPower));
    }

    // Update bus and transformer nodes
    const distributionNodes = this.nodes.filter(node =>
      (node.type === 'bus' || node.type === 'transformer') && node.isActive
    );

    for (const node of distributionNodes) {
      node.distributePowerToConnections();
    }
  }

  private implementLoadShedding(excessDemand: number): void {
    const loads = this.nodes.filter(node =>
      node.type === 'load' && node.isActive
    ).sort((a, b) => b.properties.power - a.properties.power); // Sort by power consumption

    let shedAmount = 0;
    for (const load of loads) {
      if (shedAmount >= excessDemand) break;

      const currentPower = Math.abs(load.properties.power);
      const shedFromThis = Math.min(currentPower, excessDemand - shedAmount);

      load.consumePower(currentPower - shedFromThis);
      shedAmount += shedFromThis;
    }
  }

  private updateFrequency(): void {
    const totalGeneration = this.nodes
      .filter(node => node.type === 'generator' && node.isActive)
      .reduce((sum, node) => sum + node.properties.power, 0);

    const totalConsumption = this.nodes
      .filter(node => node.type === 'load' && node.isActive)
      .reduce((sum, node) => sum + Math.abs(node.properties.power), 0);

    const powerImbalance = totalGeneration - totalConsumption;
    const frequencyChange = powerImbalance * 0.001; // Simplified frequency response

    this._gridFrequency = this._config.targetFrequency + frequencyChange;

    // Update all node frequencies
    for (const node of this.nodes) {
      if (node.isActive) {
        node.properties = { frequency: this._gridFrequency };
      }
    }
  }

  private checkStability(): void {
    const frequencyDeviation = Math.abs(this._gridFrequency - this._config.targetFrequency);
    const isFrequencyStable = frequencyDeviation <= this._config.frequencyTolerance;

    const criticalNodes = this.nodes.filter(node =>
      node.getHealthStatus() === 'critical'
    );

    this._isStable = isFrequencyStable && criticalNodes.length === 0;

    if (!this._isStable && this._config.emergencyShutdown) {
      this.initiateEmergencyShutdown();
    }
  }

  private initiateEmergencyShutdown(): void {
    // Shutdown non-critical loads first
    const loads = this.nodes.filter(node => node.type === 'load');
    for (const load of loads) {
      if (load.loadFactor > 0.9) {
        load.isActive = false;
      }
    }

    // If still unstable, reduce generator output
    if (!this._isStable) {
      const generators = this.nodes.filter(node => node.type === 'generator');
      for (const generator of generators) {
        const currentPower = generator.properties.power;
        generator.generatePower(currentPower * 0.8);
      }
    }
  }

  calculateGridStats(): GridStats {
    const generators = this.nodes.filter(node => node.type === 'generator');
    const loads = this.nodes.filter(node => node.type === 'load');

    const totalGeneration = generators.reduce((sum, node) => sum + node.properties.power, 0);
    const totalConsumption = loads.reduce((sum, node) => sum + Math.abs(node.properties.power), 0);

    // Calculate transmission losses
    let totalLoss = 0;
    for (const node of this.nodes) {
      for (const connection of node.connections) {
        totalLoss += node.calculateLineLoss(connection);
      }
    }
    totalLoss /= 2; // Avoid double counting

    const activeNodes = this.nodes.filter(node => node.isActive);
    const averageVoltage = activeNodes.length > 0
      ? activeNodes.reduce((sum, node) => sum + node.properties.voltage, 0) / activeNodes.length
      : 0;

    const healthCounts = this.nodes.reduce((counts, node) => {
      const status = node.getHealthStatus();
      counts[status]++;
      return counts;
    }, { healthy: 0, warning: 0, critical: 0, offline: 0 });

    const gridStability = this.calculateStabilityIndex();

    return {
      totalGeneration,
      totalConsumption,
      totalLoss,
      averageVoltage,
      frequency: this._gridFrequency,
      gridStability,
      nodesCount: {
        total: this.nodes.length,
        active: activeNodes.length,
        ...healthCounts
      }
    };
  }

  private calculateStabilityIndex(): number {
    let stabilityFactors = 0;
    let totalFactors = 0;

    // Frequency stability (40% weight)
    const frequencyStability = 1 - Math.min(
      Math.abs(this._gridFrequency - this._config.targetFrequency) / this._config.frequencyTolerance,
      1
    );
    stabilityFactors += frequencyStability * 0.4;
    totalFactors += 0.4;

    // Voltage stability (30% weight)
    const voltageStabilities = this.nodes.map(node => {
      if (!node.isActive) return 1;
      const nominalVoltage = 230;
      const deviation = Math.abs(node.properties.voltage - nominalVoltage) / nominalVoltage;
      return Math.max(0, 1 - deviation * 10); // 10% deviation = 0 stability
    });
    const avgVoltageStability = voltageStabilities.reduce((sum, val) => sum + val, 0) / voltageStabilities.length;
    stabilityFactors += avgVoltageStability * 0.3;
    totalFactors += 0.3;

    // Load balance stability (30% weight)
    const loadFactors = this.nodes.map(node => Math.min(node.loadFactor, 1));
    const loadVariance = this.calculateVariance(loadFactors);
    const loadStability = Math.max(0, 1 - loadVariance);
    stabilityFactors += loadStability * 0.3;
    totalFactors += 0.3;

    return totalFactors > 0 ? stabilityFactors / totalFactors : 0;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  exportToUnity(): string {
    const stats = this.calculateGridStats();

    return JSON.stringify({
      nodes: this.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        properties: node.properties,
        capacity: node.capacity,
        isActive: node.isActive,
        loadFactor: node.loadFactor,
        healthStatus: node.getHealthStatus(),
        connections: node.connections.map(conn => conn.id)
      })),
      gridStats: stats,
      frequency: this._gridFrequency,
      isStable: this._isStable,
      timestamp: Date.now()
    }, null, 2);
  }

  reset(): void {
    this._nodes.clear();
    this._gridFrequency = this._config.targetFrequency;
    this._isStable = true;
  }
}