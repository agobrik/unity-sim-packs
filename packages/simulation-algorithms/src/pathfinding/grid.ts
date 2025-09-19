import { PathfindingNode, PathfindingGrid, NeighborhoodType } from '../types';

export class Grid2D implements PathfindingGrid {
  public width: number;
  public height: number;
  public depth: number = 1;
  public nodes: PathfindingNode[][][];

  private neighborhoodType: NeighborhoodType;
  private customNeighborOffsets?: Array<{ x: number; y: number; z?: number }>;

  constructor(
    width: number,
    height: number,
    neighborhoodType: NeighborhoodType = NeighborhoodType.MOORE,
    customNeighborOffsets?: Array<{ x: number; y: number; z?: number }>
  ) {
    this.width = width;
    this.height = height;
    this.neighborhoodType = neighborhoodType;
    this.customNeighborOffsets = customNeighborOffsets;
    this.nodes = this.initializeNodes();
  }

  private initializeNodes(): PathfindingNode[][][] {
    const nodes: PathfindingNode[][][] = [];

    for (let x = 0; x < this.width; x++) {
      nodes[x] = [];
      for (let y = 0; y < this.height; y++) {
        nodes[x][y] = [];
        nodes[x][y][0] = this.createNode(x, y, 0);
      }
    }

    return nodes;
  }

  private createNode(x: number, y: number, z: number): PathfindingNode {
    return {
      id: `${x},${y},${z}`,
      x,
      y,
      z,
      walkable: true,
      cost: 1,
      gCost: 0,
      hCost: 0,
      fCost: 0
    };
  }

  public getNode(x: number, y: number, z: number = 0): PathfindingNode | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z !== 0) {
      return undefined;
    }

    return this.nodes[x][y][0];
  }

  public getNeighbors(node: PathfindingNode): PathfindingNode[] {
    const neighbors: PathfindingNode[] = [];
    const offsets = this.getNeighborOffsets();

    for (const offset of offsets) {
      const neighborX = node.x + offset.x;
      const neighborY = node.y + offset.y;
      const neighborZ = (node.z || 0) + (offset.z || 0);

      const neighbor = this.getNode(neighborX, neighborY, neighborZ);
      if (neighbor && neighbor.walkable) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getNeighborOffsets(): Array<{ x: number; y: number; z?: number }> {
    switch (this.neighborhoodType) {
      case NeighborhoodType.VON_NEUMANN:
        return [
          { x: 0, y: -1 }, // North
          { x: 1, y: 0 },  // East
          { x: 0, y: 1 },  // South
          { x: -1, y: 0 }  // West
        ];

      case NeighborhoodType.MOORE:
        return [
          { x: -1, y: -1 }, // NW
          { x: 0, y: -1 },  // N
          { x: 1, y: -1 },  // NE
          { x: -1, y: 0 },  // W
          { x: 1, y: 0 },   // E
          { x: -1, y: 1 },  // SW
          { x: 0, y: 1 },   // S
          { x: 1, y: 1 }    // SE
        ];

      case NeighborhoodType.HEXAGONAL:
        return [
          { x: 0, y: -1 },  // N
          { x: 1, y: -1 },  // NE
          { x: 1, y: 0 },   // E
          { x: 0, y: 1 },   // S
          { x: -1, y: 1 },  // SW
          { x: -1, y: 0 }   // W
        ];

      case NeighborhoodType.CUSTOM:
        return this.customNeighborOffsets || [];

      default:
        return this.getNeighborOffsets();
    }
  }

  public isWalkable(x: number, y: number, z: number = 0): boolean {
    const node = this.getNode(x, y, z);
    return node ? node.walkable : false;
  }

  public setWalkable(x: number, y: number, walkable: boolean, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.walkable = walkable;
    }
  }

  public setCost(x: number, y: number, cost: number, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.cost = cost;
    }
  }

  public reset(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const node = this.nodes[x][y][0];
        node.gCost = 0;
        node.hCost = 0;
        node.fCost = 0;
        node.parent = undefined;
      }
    }
  }

  public fromArray(data: number[][], walkableValue: number = 1): void {
    if (data.length !== this.height || (data[0] && data[0].length !== this.width)) {
      throw new Error('Array dimensions do not match grid dimensions');
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const value = data[y][x];
        this.setWalkable(x, y, value === walkableValue);
        if (value !== walkableValue && value > 0) {
          this.setCost(x, y, value);
        }
      }
    }
  }

  public toArray(walkableValue: number = 1, blockedValue: number = 0): number[][] {
    const result: number[][] = [];

    for (let y = 0; y < this.height; y++) {
      result[y] = [];
      for (let x = 0; x < this.width; x++) {
        const node = this.getNode(x, y);
        if (node) {
          result[y][x] = node.walkable ? walkableValue : blockedValue;
        } else {
          result[y][x] = blockedValue;
        }
      }
    }

    return result;
  }

  public clone(): Grid2D {
    const cloned = new Grid2D(this.width, this.height, this.neighborhoodType, this.customNeighborOffsets);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const originalNode = this.nodes[x][y][0];
        const clonedNode = cloned.nodes[x][y][0];

        clonedNode.walkable = originalNode.walkable;
        clonedNode.cost = originalNode.cost;
      }
    }

    return cloned;
  }
}

export class Grid3D implements PathfindingGrid {
  public width: number;
  public height: number;
  public depth: number;
  public nodes: PathfindingNode[][][];

  private neighborhoodType: NeighborhoodType;
  private customNeighborOffsets?: Array<{ x: number; y: number; z?: number }>;

  constructor(
    width: number,
    height: number,
    depth: number,
    neighborhoodType: NeighborhoodType = NeighborhoodType.MOORE,
    customNeighborOffsets?: Array<{ x: number; y: number; z?: number }>
  ) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.neighborhoodType = neighborhoodType;
    this.customNeighborOffsets = customNeighborOffsets;
    this.nodes = this.initializeNodes();
  }

  private initializeNodes(): PathfindingNode[][][] {
    const nodes: PathfindingNode[][][] = [];

    for (let x = 0; x < this.width; x++) {
      nodes[x] = [];
      for (let y = 0; y < this.height; y++) {
        nodes[x][y] = [];
        for (let z = 0; z < this.depth; z++) {
          nodes[x][y][z] = this.createNode(x, y, z);
        }
      }
    }

    return nodes;
  }

  private createNode(x: number, y: number, z: number): PathfindingNode {
    return {
      id: `${x},${y},${z}`,
      x,
      y,
      z,
      walkable: true,
      cost: 1,
      gCost: 0,
      hCost: 0,
      fCost: 0
    };
  }

  public getNode(x: number, y: number, z: number = 0): PathfindingNode | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return undefined;
    }

    return this.nodes[x][y][z];
  }

  public getNeighbors(node: PathfindingNode): PathfindingNode[] {
    const neighbors: PathfindingNode[] = [];
    const offsets = this.getNeighborOffsets();

    for (const offset of offsets) {
      const neighborX = node.x + offset.x;
      const neighborY = node.y + offset.y;
      const neighborZ = (node.z || 0) + (offset.z || 0);

      const neighbor = this.getNode(neighborX, neighborY, neighborZ);
      if (neighbor && neighbor.walkable) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getNeighborOffsets(): Array<{ x: number; y: number; z: number }> {
    const offsets: Array<{ x: number; y: number; z: number }> = [];

    // Add 2D neighbors for current layer
    const base2DOffsets = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                   { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
    ];

    for (const offset of base2DOffsets) {
      offsets.push({ ...offset, z: 0 });
    }

    // Add vertical neighbors
    offsets.push({ x: 0, y: 0, z: -1 }); // Below
    offsets.push({ x: 0, y: 0, z: 1 });  // Above

    // For 3D Moore neighborhood, include diagonal neighbors with vertical movement
    if (this.neighborhoodType === NeighborhoodType.MOORE) {
      for (const offset of base2DOffsets) {
        offsets.push({ ...offset, z: -1 }); // Below diagonals
        offsets.push({ ...offset, z: 1 });  // Above diagonals
      }
    }

    return offsets;
  }

  public isWalkable(x: number, y: number, z: number = 0): boolean {
    const node = this.getNode(x, y, z);
    return node ? node.walkable : false;
  }

  public setWalkable(x: number, y: number, walkable: boolean, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.walkable = walkable;
    }
  }

  public setCost(x: number, y: number, cost: number, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.cost = cost;
    }
  }

  public reset(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          const node = this.nodes[x][y][z];
          node.gCost = 0;
          node.hCost = 0;
          node.fCost = 0;
          node.parent = undefined;
        }
      }
    }
  }

  public from3DArray(data: number[][][], walkableValue: number = 1): void {
    if (data.length !== this.depth ||
        data[0].length !== this.height ||
        data[0][0].length !== this.width) {
      throw new Error('Array dimensions do not match grid dimensions');
    }

    for (let z = 0; z < this.depth; z++) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const value = data[z][y][x];
          this.setWalkable(x, y, value === walkableValue, z);
          if (value !== walkableValue && value > 0) {
            this.setCost(x, y, value, z);
          }
        }
      }
    }
  }

  public to3DArray(walkableValue: number = 1, blockedValue: number = 0): number[][][] {
    const result: number[][][] = [];

    for (let z = 0; z < this.depth; z++) {
      result[z] = [];
      for (let y = 0; y < this.height; y++) {
        result[z][y] = [];
        for (let x = 0; x < this.width; x++) {
          const node = this.getNode(x, y, z);
          if (node) {
            result[z][y][x] = node.walkable ? walkableValue : blockedValue;
          } else {
            result[z][y][x] = blockedValue;
          }
        }
      }
    }

    return result;
  }

  public clone(): Grid3D {
    const cloned = new Grid3D(this.width, this.height, this.depth, this.neighborhoodType, this.customNeighborOffsets);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          const originalNode = this.nodes[x][y][z];
          const clonedNode = cloned.nodes[x][y][z];

          clonedNode.walkable = originalNode.walkable;
          clonedNode.cost = originalNode.cost;
        }
      }
    }

    return cloned;
  }
}

export class HexGrid implements PathfindingGrid {
  public width: number;
  public height: number;
  public depth: number = 1;
  public nodes: PathfindingNode[][][];

  private pointyTop: boolean;

  constructor(width: number, height: number, pointyTop: boolean = true) {
    this.width = width;
    this.height = height;
    this.pointyTop = pointyTop;
    this.nodes = this.initializeNodes();
  }

  private initializeNodes(): PathfindingNode[][][] {
    const nodes: PathfindingNode[][][] = [];

    for (let x = 0; x < this.width; x++) {
      nodes[x] = [];
      for (let y = 0; y < this.height; y++) {
        nodes[x][y] = [];
        nodes[x][y][0] = this.createNode(x, y, 0);
      }
    }

    return nodes;
  }

  private createNode(x: number, y: number, z: number): PathfindingNode {
    return {
      id: `${x},${y},${z}`,
      x,
      y,
      z,
      walkable: true,
      cost: 1,
      gCost: 0,
      hCost: 0,
      fCost: 0
    };
  }

  public getNode(x: number, y: number, z: number = 0): PathfindingNode | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z !== 0) {
      return undefined;
    }

    return this.nodes[x][y][0];
  }

  public getNeighbors(node: PathfindingNode): PathfindingNode[] {
    const neighbors: PathfindingNode[] = [];
    const offsets = this.getHexNeighborOffsets(node.x, node.y);

    for (const offset of offsets) {
      const neighborX = node.x + offset.x;
      const neighborY = node.y + offset.y;

      const neighbor = this.getNode(neighborX, neighborY, 0);
      if (neighbor && neighbor.walkable) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  private getHexNeighborOffsets(x: number, y: number): Array<{ x: number; y: number }> {
    if (this.pointyTop) {
      // Pointy-top hexagon offsets
      const evenRow = y % 2 === 0;
      if (evenRow) {
        return [
          { x: -1, y: -1 }, { x: 0, y: -1 },
          { x: -1, y: 0 },  { x: 1, y: 0 },
          { x: -1, y: 1 },  { x: 0, y: 1 }
        ];
      } else {
        return [
          { x: 0, y: -1 },  { x: 1, y: -1 },
          { x: -1, y: 0 },  { x: 1, y: 0 },
          { x: 0, y: 1 },   { x: 1, y: 1 }
        ];
      }
    } else {
      // Flat-top hexagon offsets
      const evenCol = x % 2 === 0;
      if (evenCol) {
        return [
          { x: -1, y: -1 }, { x: 0, y: -1 },
          { x: -1, y: 0 },  { x: 1, y: 0 },
          { x: 0, y: 1 },   { x: 1, y: 1 }
        ];
      } else {
        return [
          { x: 0, y: -1 },  { x: 1, y: -1 },
          { x: -1, y: 0 },  { x: 1, y: 0 },
          { x: -1, y: 1 },  { x: 0, y: 1 }
        ];
      }
    }
  }

  public isWalkable(x: number, y: number, z: number = 0): boolean {
    const node = this.getNode(x, y, z);
    return node ? node.walkable : false;
  }

  public setWalkable(x: number, y: number, walkable: boolean, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.walkable = walkable;
    }
  }

  public setCost(x: number, y: number, cost: number, z: number = 0): void {
    const node = this.getNode(x, y, z);
    if (node) {
      node.cost = cost;
    }
  }

  public reset(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const node = this.nodes[x][y][0];
        node.gCost = 0;
        node.hCost = 0;
        node.fCost = 0;
        node.parent = undefined;
      }
    }
  }
}

export const createGrid = (
  width: number,
  height: number,
  depth?: number,
  type: 'square' | 'hex' = 'square'
): PathfindingGrid => {
  if (type === 'hex') {
    return new HexGrid(width, height);
  } else if (depth && depth > 1) {
    return new Grid3D(width, height, depth);
  } else {
    return new Grid2D(width, height);
  }
};