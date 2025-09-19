import {
  WaveFunctionConfig,
  WFCTile,
  WFCConstraint,
  WFCCell,
  GenerationContext
} from '../types';

export class WaveFunctionCollapse {
  private config: WaveFunctionConfig;
  private grid: WFCCell[][] = [];
  private tilesBySocket: Map<string, string[]> = new Map();
  private random: () => number;

  constructor(config: WaveFunctionConfig) {
    this.config = config;
    this.random = Math.random; // Will be overridden by context if provided
    this.initializeGrid();
    this.buildSocketLookup();
  }

  private initializeGrid(): void {
    this.grid = [];

    for (let y = 0; y < this.config.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        this.grid[y][x] = {
          x,
          y,
          possibilities: new Set(this.config.tiles.map(t => t.id)),
          collapsed: false,
          tileId: undefined,
          entropy: this.config.tiles.length
        };
      }
    }

    // Apply border constraints if border tile is specified
    if (this.config.borderTile) {
      this.applyBorderConstraints();
    }
  }

  private buildSocketLookup(): void {
    this.tilesBySocket.clear();

    for (const tile of this.config.tiles) {
      const directions = ['north', 'east', 'south', 'west'] as const;

      for (const direction of directions) {
        for (const socket of tile.sockets[direction]) {
          const key = `${direction}:${socket}`;
          if (!this.tilesBySocket.has(key)) {
            this.tilesBySocket.set(key, []);
          }
          this.tilesBySocket.get(key)!.push(tile.id);
        }
      }
    }
  }

  private applyBorderConstraints(): void {
    const borderTileId = this.config.borderTile!;

    // Top and bottom borders
    for (let x = 0; x < this.config.width; x++) {
      this.collapseCellTo(this.grid[0][x], borderTileId);
      this.collapseCellTo(this.grid[this.config.height - 1][x], borderTileId);
    }

    // Left and right borders
    for (let y = 0; y < this.config.height; y++) {
      this.collapseCellTo(this.grid[y][0], borderTileId);
      this.collapseCellTo(this.grid[y][this.config.width - 1], borderTileId);
    }
  }

  public generate(context?: GenerationContext): string[][] {
    if (context?.random) {
      this.random = context.random;
    }

    this.initializeGrid();

    let attempts = 0;
    const maxAttempts = this.config.retryCount || 10;

    while (attempts < maxAttempts) {
      try {
        this.runWFC(context);
        return this.extractResult();
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`WFC failed after ${maxAttempts} attempts: ${error}`);
        }

        // Reset for retry
        this.initializeGrid();

        if (context?.options.errorCallback) {
          context.options.errorCallback(
            error as Error,
            `WFC attempt ${attempts}/${maxAttempts} failed, retrying...`
          );
        }
      }
    }

    throw new Error('WFC generation failed');
  }

  private runWFC(context?: GenerationContext): void {
    let iterationCount = 0;
    const maxIterations = this.config.width * this.config.height * 10;

    while (!this.isFullyCollapsed()) {
      if (iterationCount >= maxIterations) {
        throw new Error('WFC exceeded maximum iterations');
      }

      // Find cell with lowest entropy
      const cell = this.findLowestEntropyCell();
      if (!cell) {
        throw new Error('No collapsible cells found');
      }

      // Collapse the cell
      this.collapseCell(cell);

      // Propagate constraints
      this.propagateConstraints(cell);

      iterationCount++;

      // Report progress
      if (context?.options.progressCallback && iterationCount % 10 === 0) {
        const progress = this.getCollapsedCellCount() / (this.config.width * this.config.height);
        context.options.progressCallback(progress, 'Running Wave Function Collapse');
      }
    }
  }

  private findLowestEntropyCell(): WFCCell | null {
    let lowestEntropy = Infinity;
    const candidates: WFCCell[] = [];

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.grid[y][x];

        if (!cell.collapsed && cell.entropy > 0) {
          if (cell.entropy < lowestEntropy) {
            lowestEntropy = cell.entropy;
            candidates.length = 0;
            candidates.push(cell);
          } else if (cell.entropy === lowestEntropy) {
            candidates.push(cell);
          }
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Return random candidate among those with lowest entropy
    return candidates[Math.floor(this.random() * candidates.length)];
  }

  private collapseCell(cell: WFCCell): void {
    if (cell.possibilities.size === 0) {
      throw new Error(`Cannot collapse cell at (${cell.x}, ${cell.y}) - no possibilities`);
    }

    // Choose tile based on weights
    const possibleTiles = Array.from(cell.possibilities)
      .map(tileId => this.config.tiles.find(t => t.id === tileId)!)
      .filter(tile => tile !== undefined);

    const chosenTile = this.weightedChoice(possibleTiles);
    this.collapseCellTo(cell, chosenTile.id);
  }

  private collapseCellTo(cell: WFCCell, tileId: string): void {
    cell.collapsed = true;
    cell.tileId = tileId;
    cell.possibilities.clear();
    cell.possibilities.add(tileId);
    cell.entropy = 1;
  }

  private weightedChoice(tiles: WFCTile[]): WFCTile {
    const totalWeight = tiles.reduce((sum, tile) => sum + tile.weight, 0);
    let random = this.random() * totalWeight;

    for (const tile of tiles) {
      random -= tile.weight;
      if (random <= 0) {
        return tile;
      }
    }

    return tiles[tiles.length - 1]; // Fallback
  }

  private propagateConstraints(changedCell: WFCCell): void {
    const queue: WFCCell[] = [changedCell];
    const processed = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;

      if (processed.has(key)) {
        continue;
      }
      processed.add(key);

      const neighbors = this.getNeighbors(current);

      for (const { neighbor, direction } of neighbors) {
        if (neighbor.collapsed) {
          continue;
        }

        const oldPossibilities = new Set(neighbor.possibilities);
        this.constrainCell(neighbor, current, direction);

        // If possibilities changed, add to queue
        if (oldPossibilities.size !== neighbor.possibilities.size) {
          queue.push(neighbor);

          if (neighbor.possibilities.size === 0) {
            throw new Error(`Contradiction at cell (${neighbor.x}, ${neighbor.y})`);
          }
        }
      }
    }
  }

  private getNeighbors(cell: WFCCell): Array<{ neighbor: WFCCell; direction: string }> {
    const neighbors: Array<{ neighbor: WFCCell; direction: string }> = [];

    const directions = [
      { dx: 0, dy: -1, dir: 'north', opposite: 'south' },
      { dx: 1, dy: 0, dir: 'east', opposite: 'west' },
      { dx: 0, dy: 1, dir: 'south', opposite: 'north' },
      { dx: -1, dy: 0, dir: 'west', opposite: 'east' }
    ];

    for (const { dx, dy, dir } of directions) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;

      if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
        neighbors.push({
          neighbor: this.grid[ny][nx],
          direction: dir
        });
      }
    }

    return neighbors;
  }

  private constrainCell(cell: WFCCell, constrainingCell: WFCCell, direction: string): void {
    const oppositeDirection = this.getOppositeDirection(direction);
    const validTiles = new Set<string>();

    // Get tiles that can be placed in the constraining cell
    const constrainingTiles = Array.from(constrainingCell.possibilities);

    for (const constrainingTileId of constrainingTiles) {
      const constrainingTile = this.config.tiles.find(t => t.id === constrainingTileId);
      if (!constrainingTile) continue;

      const sockets = constrainingTile.sockets[direction as keyof typeof constrainingTile.sockets];

      for (const socket of sockets) {
        const compatibleTiles = this.tilesBySocket.get(`${oppositeDirection}:${socket}`) || [];
        for (const tileId of compatibleTiles) {
          if (cell.possibilities.has(tileId)) {
            validTiles.add(tileId);
          }
        }
      }
    }

    // Apply additional constraints
    for (const constraint of this.config.constraints) {
      this.applyConstraint(cell, constraint, validTiles);
    }

    // Update cell possibilities
    cell.possibilities = validTiles;
    cell.entropy = validTiles.size;
  }

  private getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      north: 'south',
      east: 'west',
      south: 'north',
      west: 'east'
    };
    return opposites[direction];
  }

  private applyConstraint(cell: WFCCell, constraint: WFCConstraint, validTiles: Set<string>): void {
    switch (constraint.type) {
      case 'position':
        if (constraint.position &&
            cell.x === constraint.position.x &&
            cell.y === constraint.position.y) {
          // Only allow specific tile at this position
          if (constraint.tile1 && validTiles.has(constraint.tile1)) {
            validTiles.clear();
            validTiles.add(constraint.tile1);
          }
        }
        break;

      case 'count':
        // Implement count constraints (e.g., max number of specific tiles)
        if (constraint.maxCount !== undefined) {
          const currentCount = this.countTileInGrid(constraint.tile1!);
          if (currentCount >= constraint.maxCount) {
            validTiles.delete(constraint.tile1!);
          }
        }
        break;

      case 'distance':
        // Implement distance constraints
        if (constraint.minDistance !== undefined) {
          const nearbyTiles = this.getTilesWithinDistance(cell, constraint.minDistance);
          if (nearbyTiles.has(constraint.tile1!)) {
            validTiles.delete(constraint.tile1!);
          }
        }
        break;
    }
  }

  private countTileInGrid(tileId: string): number {
    let count = 0;
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.grid[y][x].tileId === tileId) {
          count++;
        }
      }
    }
    return count;
  }

  private getTilesWithinDistance(cell: WFCCell, distance: number): Set<string> {
    const tiles = new Set<string>();
    const radius = Math.ceil(distance);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const actualDistance = Math.sqrt(dx * dx + dy * dy);
        if (actualDistance <= distance) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;

          if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
            const neighborTile = this.grid[ny][nx].tileId;
            if (neighborTile) {
              tiles.add(neighborTile);
            }
          }
        }
      }
    }

    return tiles;
  }

  private isFullyCollapsed(): boolean {
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (!this.grid[y][x].collapsed) {
          return false;
        }
      }
    }
    return true;
  }

  private getCollapsedCellCount(): number {
    let count = 0;
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (this.grid[y][x].collapsed) {
          count++;
        }
      }
    }
    return count;
  }

  private extractResult(): string[][] {
    const result: string[][] = [];

    for (let y = 0; y < this.config.height; y++) {
      result[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.grid[y][x];
        result[y][x] = cell.tileId || 'undefined';
      }
    }

    return result;
  }

  public getDebugInfo(): {
    grid: WFCCell[][];
    uncollapedCells: number;
    averageEntropy: number;
    contradictions: WFCCell[];
  } {
    let uncollapsedCells = 0;
    let totalEntropy = 0;
    let entropyCount = 0;
    const contradictions: WFCCell[] = [];

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.grid[y][x];

        if (!cell.collapsed) {
          uncollapsedCells++;
          totalEntropy += cell.entropy;
          entropyCount++;

          if (cell.entropy === 0) {
            contradictions.push(cell);
          }
        }
      }
    }

    return {
      grid: this.grid,
      uncollapedCells: uncollapsedCells,
      averageEntropy: entropyCount > 0 ? totalEntropy / entropyCount : 0,
      contradictions
    };
  }

  public exportResult(): string {
    return JSON.stringify({
      config: this.config,
      result: this.extractResult(),
      debug: this.getDebugInfo()
    });
  }

  // Utility methods for creating common tile sets
  public static createSimpleTileSet(): WFCTile[] {
    return [
      {
        id: 'grass',
        name: 'Grass',
        weight: 10,
        sockets: {
          north: ['ground'],
          east: ['ground'],
          south: ['ground'],
          west: ['ground']
        },
        rotation: false,
        metadata: { type: 'terrain' }
      },
      {
        id: 'path_straight_h',
        name: 'Horizontal Path',
        weight: 5,
        sockets: {
          north: ['ground'],
          east: ['path'],
          south: ['ground'],
          west: ['path']
        },
        rotation: true,
        metadata: { type: 'path' }
      },
      {
        id: 'path_straight_v',
        name: 'Vertical Path',
        weight: 5,
        sockets: {
          north: ['path'],
          east: ['ground'],
          south: ['path'],
          west: ['ground']
        },
        rotation: true,
        metadata: { type: 'path' }
      },
      {
        id: 'path_corner',
        name: 'Path Corner',
        weight: 3,
        sockets: {
          north: ['path'],
          east: ['path'],
          south: ['ground'],
          west: ['ground']
        },
        rotation: true,
        metadata: { type: 'path' }
      },
      {
        id: 'water',
        name: 'Water',
        weight: 2,
        sockets: {
          north: ['water'],
          east: ['water'],
          south: ['water'],
          west: ['water']
        },
        rotation: false,
        metadata: { type: 'water' }
      },
      {
        id: 'shore',
        name: 'Shore',
        weight: 4,
        sockets: {
          north: ['water'],
          east: ['ground'],
          south: ['ground'],
          west: ['ground']
        },
        rotation: true,
        metadata: { type: 'shore' }
      }
    ];
  }

  public static createDungeonTileSet(): WFCTile[] {
    return [
      {
        id: 'wall',
        name: 'Wall',
        weight: 8,
        sockets: {
          north: ['wall'],
          east: ['wall'],
          south: ['wall'],
          west: ['wall']
        },
        rotation: false,
        metadata: { type: 'wall', passable: false }
      },
      {
        id: 'floor',
        name: 'Floor',
        weight: 5,
        sockets: {
          north: ['floor', 'door'],
          east: ['floor', 'door'],
          south: ['floor', 'door'],
          west: ['floor', 'door']
        },
        rotation: false,
        metadata: { type: 'floor', passable: true }
      },
      {
        id: 'door_h',
        name: 'Horizontal Door',
        weight: 2,
        sockets: {
          north: ['wall'],
          east: ['floor'],
          south: ['wall'],
          west: ['floor']
        },
        rotation: true,
        metadata: { type: 'door', passable: true }
      },
      {
        id: 'door_v',
        name: 'Vertical Door',
        weight: 2,
        sockets: {
          north: ['floor'],
          east: ['wall'],
          south: ['floor'],
          west: ['wall']
        },
        rotation: true,
        metadata: { type: 'door', passable: true }
      }
    ];
  }
}