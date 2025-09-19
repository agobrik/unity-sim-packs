export interface ElectricalProperties {
  voltage: number;
  current: number;
  power: number;
  frequency: number;
  phase: number;
}

export interface NodeCapacity {
  maxPower: number;
  maxVoltage: number;
  maxCurrent: number;
}

export type NodeType = 'generator' | 'load' | 'transformer' | 'bus' | 'transmission';

export class GridNode {
  private _id: string;
  private _type: NodeType;
  private _position: { x: number; y: number };
  private _properties: ElectricalProperties;
  private _capacity: NodeCapacity;
  private _connections: GridNode[];
  private _isActive: boolean;
  private _loadFactor: number;

  constructor(
    id: string,
    type: NodeType,
    position: { x: number; y: number },
    capacity: NodeCapacity,
    properties?: Partial<ElectricalProperties>
  ) {
    this._id = id;
    this._type = type;
    this._position = position;
    this._capacity = capacity;
    this._connections = [];
    this._isActive = true;
    this._loadFactor = 0;

    this._properties = {
      voltage: properties?.voltage ?? 230,
      current: properties?.current ?? 0,
      power: properties?.power ?? 0,
      frequency: properties?.frequency ?? 50,
      phase: properties?.phase ?? 0
    };
  }

  get id(): string {
    return this._id;
  }

  get type(): NodeType {
    return this._type;
  }

  get position(): { x: number; y: number } {
    return { ...this._position };
  }

  get properties(): ElectricalProperties {
    return { ...this._properties };
  }

  set properties(props: Partial<ElectricalProperties>) {
    this._properties = { ...this._properties, ...props };
    this.updateLoadFactor();
  }

  get capacity(): NodeCapacity {
    return { ...this._capacity };
  }

  get connections(): GridNode[] {
    return [...this._connections];
  }

  get isActive(): boolean {
    return this._isActive;
  }

  set isActive(active: boolean) {
    this._isActive = active;
  }

  get loadFactor(): number {
    return this._loadFactor;
  }

  addConnection(node: GridNode): void {
    if (!this._connections.includes(node)) {
      this._connections.push(node);
      if (!node._connections.includes(this)) {
        node._connections.push(this);
      }
    }
  }

  removeConnection(node: GridNode): void {
    const index = this._connections.indexOf(node);
    if (index > -1) {
      this._connections.splice(index, 1);
      const nodeIndex = node._connections.indexOf(this);
      if (nodeIndex > -1) {
        node._connections.splice(nodeIndex, 1);
      }
    }
  }

  private updateLoadFactor(): void {
    if (this._capacity.maxPower > 0) {
      this._loadFactor = Math.abs(this._properties.power) / this._capacity.maxPower;
    }
  }

  calculateDistanceTo(node: GridNode): number {
    const dx = this._position.x - node._position.x;
    const dy = this._position.y - node._position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  calculateLineResistance(node: GridNode): number {
    const distance = this.calculateDistanceTo(node);
    const baseResistance = 0.1; // Ohms per unit distance
    return baseResistance * distance;
  }

  calculateLineLoss(node: GridNode): number {
    if (!this._connections.includes(node)) return 0;

    const resistance = this.calculateLineResistance(node);
    const current = Math.abs(this._properties.current);
    return current * current * resistance; // I²R loss
  }

  isOverloaded(): boolean {
    return this._loadFactor > 1.0;
  }

  isUnderVoltage(): boolean {
    const nominalVoltage = 230; // Base voltage
    const tolerance = 0.1; // 10% tolerance
    return this._properties.voltage < nominalVoltage * (1 - tolerance);
  }

  isOverVoltage(): boolean {
    const nominalVoltage = 230;
    const tolerance = 0.1;
    return this._properties.voltage > nominalVoltage * (1 + tolerance);
  }

  getHealthStatus(): 'healthy' | 'warning' | 'critical' | 'offline' {
    if (!this._isActive) return 'offline';
    if (this.isOverloaded() || this.isOverVoltage() || this.isUnderVoltage()) return 'critical';
    if (this._loadFactor > 0.8) return 'warning';
    return 'healthy';
  }

  generatePower(amount: number): boolean {
    if (this._type !== 'generator') return false;
    if (amount > this._capacity.maxPower) return false;

    this._properties.power = amount;
    this._properties.current = amount / this._properties.voltage;
    this.updateLoadFactor();
    return true;
  }

  consumePower(amount: number): boolean {
    if (this._type !== 'load') return false;
    if (amount > this._capacity.maxPower) return false;

    this._properties.power = -amount; // Negative for consumption
    this._properties.current = amount / this._properties.voltage;
    this.updateLoadFactor();
    return true;
  }

  distributePowerToConnections(): void {
    if (this._type !== 'bus' && this._type !== 'transformer') return;

    const totalConnections = this._connections.filter(node => node.isActive).length;
    if (totalConnections === 0) return;

    const powerPerConnection = this._properties.power / totalConnections;

    for (const connection of this._connections) {
      if (connection.isActive) {
        // Simplified power distribution
        const voltageDrop = this.calculateLineLoss(connection) * 0.01;
        connection._properties.voltage = this._properties.voltage - voltageDrop;
        connection._properties.power += powerPerConnection;
      }
    }
  }
}