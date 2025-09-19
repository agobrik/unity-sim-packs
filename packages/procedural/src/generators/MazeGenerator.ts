import {
  MazeConfig,
  MazeCell,
  MazeBias,
  MazeAlgorithm,
  GenerationContext
} from '../types';

export class MazeGenerator {
  private config: MazeConfig;
  private maze: MazeCell[][] = [];
  private random: () => number;

  constructor(config: MazeConfig) {
    this.config = config;
    this.random = this.createSeededRandom(config.seed);
    this.initializeMaze();
  }

  private createSeededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  private initializeMaze(): void {
    this.maze = [];
    for (let y = 0; y < this.config.height; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        this.maze[y][x] = {
          x,
          y,
          walls: { north: true, east: true, south: true, west: true },
          visited: false,
          distance: undefined,
          parent: undefined
        };
      }
    }
  }

  public generate(context?: GenerationContext): MazeCell[][] {
    this.initializeMaze();

    switch (this.config.algorithm) {
      case 'recursive_backtrack':
        this.generateRecursiveBacktrack(context);
        break;
      case 'kruskal':
        this.generateKruskal(context);
        break;
      case 'prim':
        this.generatePrim(context);
        break;
      case 'binary_tree':
        this.generateBinaryTree(context);
        break;
      case 'sidewinder':
        this.generateSidewinder(context);
        break;
    }

    if (this.config.deadEndRemoval && this.config.deadEndRemoval > 0) {
      this.removeDeadEnds(this.config.deadEndRemoval);
    }

    return this.maze;
  }

  private generateRecursiveBacktrack(context?: GenerationContext): void {
    const stack: MazeCell[] = [];
    const startX = Math.floor(this.config.width / 2);
    const startY = Math.floor(this.config.height / 2);

    let current = this.maze[startY][startX];
    current.visited = true;
    stack.push(current);

    let processedCells = 1;
    const totalCells = this.config.width * this.config.height;

    while (stack.length > 0) {
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const next = this.chooseNeighbor(neighbors, current);
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
        current = next;
        processedCells++;
      } else {
        current = stack.pop()!;
      }

      if (context?.options.progressCallback && processedCells % 100 === 0) {
        context.options.progressCallback(processedCells / totalCells, 'Generating maze');
      }
    }
  }

  private generateKruskal(context?: GenerationContext): void {
    // Initialize disjoint set for each cell
    const sets = new Map<string, Set<string>>();
    const edges: Array<{ cell1: MazeCell; cell2: MazeCell }> = [];

    // Create sets and edges
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const key = `${x},${y}`;
        sets.set(key, new Set([key]));

        // Add edges to right and down neighbors
        if (x < this.config.width - 1) {
          edges.push({
            cell1: this.maze[y][x],
            cell2: this.maze[y][x + 1]
          });
        }
        if (y < this.config.height - 1) {
          edges.push({
            cell1: this.maze[y][x],
            cell2: this.maze[y + 1][x]
          });
        }
      }
    }

    // Shuffle edges
    this.shuffleArray(edges);

    let processedEdges = 0;
    const totalEdges = edges.length;

    for (const edge of edges) {
      const key1 = `${edge.cell1.x},${edge.cell1.y}`;
      const key2 = `${edge.cell2.x},${edge.cell2.y}`;

      const set1 = this.findSet(sets, key1);
      const set2 = this.findSet(sets, key2);

      if (set1 !== set2) {
        this.removeWallBetween(edge.cell1, edge.cell2);
        this.unionSets(sets, set1, set2);
      }

      processedEdges++;
      if (context?.options.progressCallback && processedEdges % 50 === 0) {
        context.options.progressCallback(processedEdges / totalEdges, 'Generating maze (Kruskal)');
      }
    }
  }

  private generatePrim(context?: GenerationContext): void {
    const walls: Array<{ cell: MazeCell; neighbor: MazeCell }> = [];
    const startX = Math.floor(this.config.width / 2);
    const startY = Math.floor(this.config.height / 2);

    let current = this.maze[startY][startX];
    current.visited = true;

    this.addWallsToList(current, walls);

    let processedWalls = 0;

    while (walls.length > 0) {
      const randomIndex = Math.floor(this.random() * walls.length);
      const wall = walls.splice(randomIndex, 1)[0];

      if (!wall.neighbor.visited) {
        this.removeWallBetween(wall.cell, wall.neighbor);
        wall.neighbor.visited = true;
        this.addWallsToList(wall.neighbor, walls);
      }

      processedWalls++;
      if (context?.options.progressCallback && processedWalls % 50 === 0) {
        const totalCells = this.config.width * this.config.height;
        context.options.progressCallback(processedWalls / totalCells, 'Generating maze (Prim)');
      }
    }
  }

  private generateBinaryTree(context?: GenerationContext): void {
    let processedCells = 0;
    const totalCells = this.config.width * this.config.height;

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        const neighbors: MazeCell[] = [];

        // Add north neighbor
        if (y > 0) neighbors.push(this.maze[y - 1][x]);
        // Add east neighbor
        if (x < this.config.width - 1) neighbors.push(this.maze[y][x + 1]);

        if (neighbors.length > 0) {
          const neighbor = neighbors[Math.floor(this.random() * neighbors.length)];
          this.removeWallBetween(cell, neighbor);
        }

        processedCells++;
        if (context?.options.progressCallback && processedCells % 100 === 0) {
          context.options.progressCallback(processedCells / totalCells, 'Generating maze (Binary Tree)');
        }
      }
    }
  }

  private generateSidewinder(context?: GenerationContext): void {
    let processedCells = 0;
    const totalCells = this.config.width * this.config.height;

    for (let y = 0; y < this.config.height; y++) {
      let runStart = 0;

      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        const shouldCarveEast = x < this.config.width - 1 && (y === 0 || this.random() < 0.5);

        if (shouldCarveEast) {
          this.removeWallBetween(cell, this.maze[y][x + 1]);
        } else {
          // Carve north from random cell in current run
          if (y > 0) {
            const runLength = x - runStart + 1;
            const randomOffset = Math.floor(this.random() * runLength);
            const randomCell = this.maze[y][runStart + randomOffset];
            this.removeWallBetween(randomCell, this.maze[y - 1][randomCell.x]);
          }
          runStart = x + 1;
        }

        processedCells++;
        if (context?.options.progressCallback && processedCells % 100 === 0) {
          context.options.progressCallback(processedCells / totalCells, 'Generating maze (Sidewinder)');
        }
      }
    }
  }

  private getUnvisitedNeighbors(cell: MazeCell): MazeCell[] {
    const neighbors: MazeCell[] = [];

    if (cell.y > 0 && !this.maze[cell.y - 1][cell.x].visited) {
      neighbors.push(this.maze[cell.y - 1][cell.x]);
    }
    if (cell.x < this.config.width - 1 && !this.maze[cell.y][cell.x + 1].visited) {
      neighbors.push(this.maze[cell.y][cell.x + 1]);
    }
    if (cell.y < this.config.height - 1 && !this.maze[cell.y + 1][cell.x].visited) {
      neighbors.push(this.maze[cell.y + 1][cell.x]);
    }
    if (cell.x > 0 && !this.maze[cell.y][cell.x - 1].visited) {
      neighbors.push(this.maze[cell.y][cell.x - 1]);
    }

    return neighbors;
  }

  private chooseNeighbor(neighbors: MazeCell[], current: MazeCell): MazeCell {
    if (!this.config.bias) {
      return neighbors[Math.floor(this.random() * neighbors.length)];
    }

    // Apply bias towards horizontal or vertical movement
    const horizontalNeighbors = neighbors.filter(n => n.y === current.y);
    const verticalNeighbors = neighbors.filter(n => n.x === current.x);

    const bias = this.config.bias.horizontal;

    if (bias > 0 && horizontalNeighbors.length > 0 && this.random() < Math.abs(bias)) {
      return horizontalNeighbors[Math.floor(this.random() * horizontalNeighbors.length)];
    } else if (bias < 0 && verticalNeighbors.length > 0 && this.random() < Math.abs(bias)) {
      return verticalNeighbors[Math.floor(this.random() * verticalNeighbors.length)];
    }

    return neighbors[Math.floor(this.random() * neighbors.length)];
  }

  private removeWallBetween(cell1: MazeCell, cell2: MazeCell): void {
    const dx = cell2.x - cell1.x;
    const dy = cell2.y - cell1.y;

    if (dx === 1) { // cell2 is east of cell1
      cell1.walls.east = false;
      cell2.walls.west = false;
    } else if (dx === -1) { // cell2 is west of cell1
      cell1.walls.west = false;
      cell2.walls.east = false;
    } else if (dy === 1) { // cell2 is south of cell1
      cell1.walls.south = false;
      cell2.walls.north = false;
    } else if (dy === -1) { // cell2 is north of cell1
      cell1.walls.north = false;
      cell2.walls.south = false;
    }
  }

  private addWallsToList(cell: MazeCell, walls: Array<{ cell: MazeCell; neighbor: MazeCell }>): void {
    const neighbors = [
      { dx: 0, dy: -1 }, // north
      { dx: 1, dy: 0 },  // east
      { dx: 0, dy: 1 },  // south
      { dx: -1, dy: 0 }  // west
    ];

    for (const { dx, dy } of neighbors) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;

      if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
        const neighbor = this.maze[ny][nx];
        if (!neighbor.visited) {
          walls.push({ cell, neighbor });
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private findSet(sets: Map<string, Set<string>>, key: string): Set<string> {
    for (const set of sets.values()) {
      if (set.has(key)) {
        return set;
      }
    }
    throw new Error(`Set not found for key: ${key}`);
  }

  private unionSets(sets: Map<string, Set<string>>, set1: Set<string>, set2: Set<string>): void {
    // Merge smaller set into larger set
    const [smaller, larger] = set1.size <= set2.size ? [set1, set2] : [set2, set1];

    for (const key of smaller) {
      larger.add(key);
    }

    // Remove the smaller set from the map
    for (const [key, set] of sets.entries()) {
      if (set === smaller) {
        sets.delete(key);
        break;
      }
    }
  }

  private removeDeadEnds(percentage: number): void {
    const deadEnds = this.findDeadEnds();
    const toRemove = Math.floor(deadEnds.length * percentage);

    for (let i = 0; i < toRemove; i++) {
      if (deadEnds.length === 0) break;

      const deadEnd = deadEnds.splice(Math.floor(this.random() * deadEnds.length), 1)[0];
      const neighbors = this.getWalledNeighbors(deadEnd);

      if (neighbors.length > 0) {
        const neighbor = neighbors[Math.floor(this.random() * neighbors.length)];
        this.removeWallBetween(deadEnd, neighbor);

        // Check if removing this wall created new dead ends
        const newDeadEnds = this.getWalledNeighbors(neighbor).filter(n => this.isDeadEnd(n));
        deadEnds.push(...newDeadEnds);
      }
    }
  }

  private findDeadEnds(): MazeCell[] {
    const deadEnds: MazeCell[] = [];

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        if (this.isDeadEnd(cell)) {
          deadEnds.push(cell);
        }
      }
    }

    return deadEnds;
  }

  private isDeadEnd(cell: MazeCell): boolean {
    let openWalls = 0;
    if (!cell.walls.north) openWalls++;
    if (!cell.walls.east) openWalls++;
    if (!cell.walls.south) openWalls++;
    if (!cell.walls.west) openWalls++;
    return openWalls === 1;
  }

  private getWalledNeighbors(cell: MazeCell): MazeCell[] {
    const neighbors: MazeCell[] = [];

    if (cell.y > 0 && cell.walls.north) {
      neighbors.push(this.maze[cell.y - 1][cell.x]);
    }
    if (cell.x < this.config.width - 1 && cell.walls.east) {
      neighbors.push(this.maze[cell.y][cell.x + 1]);
    }
    if (cell.y < this.config.height - 1 && cell.walls.south) {
      neighbors.push(this.maze[cell.y + 1][cell.x]);
    }
    if (cell.x > 0 && cell.walls.west) {
      neighbors.push(this.maze[cell.y][cell.x - 1]);
    }

    return neighbors;
  }

  public solveMaze(startX: number = 0, startY: number = 0, endX?: number, endY?: number): MazeCell[] {
    const targetX = endX ?? this.config.width - 1;
    const targetY = endY ?? this.config.height - 1;

    // Reset distances and parents
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        this.maze[y][x].distance = undefined;
        this.maze[y][x].parent = undefined;
      }
    }

    // BFS to find shortest path
    const queue: MazeCell[] = [];
    const start = this.maze[startY][startX];
    start.distance = 0;
    queue.push(start);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === targetX && current.y === targetY) {
        break; // Found target
      }

      const neighbors = this.getAccessibleNeighbors(current);
      for (const neighbor of neighbors) {
        if (neighbor.distance === undefined) {
          neighbor.distance = current.distance! + 1;
          neighbor.parent = current;
          queue.push(neighbor);
        }
      }
    }

    // Reconstruct path
    const path: MazeCell[] = [];
    let current = this.maze[targetY][targetX];

    while (current) {
      path.unshift(current);
      current = current.parent!;
    }

    return path;
  }

  private getAccessibleNeighbors(cell: MazeCell): MazeCell[] {
    const neighbors: MazeCell[] = [];

    if (cell.y > 0 && !cell.walls.north) {
      neighbors.push(this.maze[cell.y - 1][cell.x]);
    }
    if (cell.x < this.config.width - 1 && !cell.walls.east) {
      neighbors.push(this.maze[cell.y][cell.x + 1]);
    }
    if (cell.y < this.config.height - 1 && !cell.walls.south) {
      neighbors.push(this.maze[cell.y + 1][cell.x]);
    }
    if (cell.x > 0 && !cell.walls.west) {
      neighbors.push(this.maze[cell.y][cell.x - 1]);
    }

    return neighbors;
  }

  public exportMaze(): string {
    return JSON.stringify({
      config: this.config,
      maze: this.maze
    });
  }

  public importMaze(data: string): void {
    const parsed = JSON.parse(data);
    this.config = parsed.config;
    this.maze = parsed.maze;
  }

  public getMazeAsString(): string {
    let result = '';

    // Top border
    result += '+';
    for (let x = 0; x < this.config.width; x++) {
      result += '---+';
    }
    result += '\n';

    // Maze rows
    for (let y = 0; y < this.config.height; y++) {
      // Cell row
      result += '|';
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        result += '   ';
        result += cell.walls.east ? '|' : ' ';
      }
      result += '\n';

      // Wall row
      result += '+';
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        result += cell.walls.south ? '---' : '   ';
        result += '+';
      }
      result += '\n';
    }

    return result;
  }

  public getStats(): {
    totalCells: number;
    deadEnds: number;
    junctions: number;
    corridors: number;
    connectivity: number;
  } {
    let deadEnds = 0;
    let junctions = 0;
    let corridors = 0;

    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const cell = this.maze[y][x];
        const openWalls = [
          !cell.walls.north,
          !cell.walls.east,
          !cell.walls.south,
          !cell.walls.west
        ].filter(Boolean).length;

        if (openWalls === 1) deadEnds++;
        else if (openWalls === 2) corridors++;
        else if (openWalls > 2) junctions++;
      }
    }

    const totalCells = this.config.width * this.config.height;
    const connectivity = (corridors + junctions * 2) / totalCells;

    return {
      totalCells,
      deadEnds,
      junctions,
      corridors,
      connectivity
    };
  }
}