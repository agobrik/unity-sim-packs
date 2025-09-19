export interface Vector2D {
  x: number;
  y: number;
}

export interface FluidProperties {
  density: number;
  viscosity: number;
  temperature: number;
  pressure: number;
}

export class FluidCell {
  private _position: Vector2D;
  private _velocity: Vector2D;
  private _properties: FluidProperties;
  private _neighbors: FluidCell[];

  constructor(x: number, y: number, properties: Partial<FluidProperties> = {}) {
    this._position = { x, y };
    this._velocity = { x: 0, y: 0 };
    this._properties = {
      density: properties.density ?? 1000,
      viscosity: properties.viscosity ?? 0.001,
      temperature: properties.temperature ?? 20,
      pressure: properties.pressure ?? 101325
    };
    this._neighbors = [];
  }

  get position(): Vector2D {
    return { ...this._position };
  }

  get velocity(): Vector2D {
    return { ...this._velocity };
  }

  set velocity(v: Vector2D) {
    this._velocity = { ...v };
  }

  get properties(): FluidProperties {
    return { ...this._properties };
  }

  set properties(props: Partial<FluidProperties>) {
    this._properties = { ...this._properties, ...props };
  }

  get neighbors(): FluidCell[] {
    return [...this._neighbors];
  }

  addNeighbor(cell: FluidCell): void {
    if (!this._neighbors.includes(cell)) {
      this._neighbors.push(cell);
    }
  }

  removeNeighbor(cell: FluidCell): void {
    const index = this._neighbors.indexOf(cell);
    if (index > -1) {
      this._neighbors.splice(index, 1);
    }
  }

  calculatePressureGradient(): Vector2D {
    if (this._neighbors.length === 0) {
      return { x: 0, y: 0 };
    }

    let gradientX = 0;
    let gradientY = 0;

    for (const neighbor of this._neighbors) {
      const dx = neighbor.position.x - this._position.x;
      const dy = neighbor.position.y - this._position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const pressureDiff = neighbor.properties.pressure - this._properties.pressure;
        gradientX += (pressureDiff * dx) / (distance * distance);
        gradientY += (pressureDiff * dy) / (distance * distance);
      }
    }

    return {
      x: gradientX / this._neighbors.length,
      y: gradientY / this._neighbors.length
    };
  }

  calculateViscosityForce(): Vector2D {
    if (this._neighbors.length === 0) {
      return { x: 0, y: 0 };
    }

    let forceX = 0;
    let forceY = 0;

    for (const neighbor of this._neighbors) {
      const velocityDiffX = neighbor.velocity.x - this._velocity.x;
      const velocityDiffY = neighbor.velocity.y - this._velocity.y;

      forceX += velocityDiffX * this._properties.viscosity;
      forceY += velocityDiffY * this._properties.viscosity;
    }

    return {
      x: forceX / this._neighbors.length,
      y: forceY / this._neighbors.length
    };
  }
}