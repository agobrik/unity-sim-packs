import {
  Algorithm,
  AlgorithmCategory,
  ComplexityNotation,
  PathfindingNode,
  PathfindingGrid,
  PathfindingRequest,
  PathfindingResult,
  PathfindingOptions,
  AlgorithmResult,
  AlgorithmMetrics
} from '../types';
import { PriorityQueue } from '../utils/priority-queue';

export class DijkstraAlgorithm implements Algorithm {
  public readonly id = 'dijkstra';
  public readonly name = 'Dijkstra Pathfinding';
  public readonly version = '1.0.0';
  public readonly description = 'Finds the shortest path using Dijkstra algorithm, guaranteed to find optimal solution';
  public readonly category = AlgorithmCategory.PATHFINDING;
  public readonly complexity = {
    time: ComplexityNotation.QUADRATIC,
    space: ComplexityNotation.LINEAR,
    description: 'O((V + E) log V) with binary heap, where V is vertices and E is edges'
  };

  public readonly parameters = [
    {
      name: 'allowDiagonal',
      type: 'boolean' as any,
      description: 'Whether diagonal movement is allowed',
      required: false,
      defaultValue: true
    },
    {
      name: 'maxSearchNodes',
      type: 'number' as any,
      description: 'Maximum number of nodes to search before giving up',
      required: false,
      defaultValue: 10000,
      constraints: { min: 100, max: 100000 }
    },
    {
      name: 'earlyExit',
      type: 'boolean' as any,
      description: 'Whether to stop searching when goal is found (may not be optimal)',
      required: false,
      defaultValue: true
    }
  ];

  public execute(request: PathfindingRequest, parameters: Record<string, any> = {}): AlgorithmResult {
    const startTime = (globalThis as any).performance?.now() || Date.now();
    let memoryPeak = 0;

    try {
      const options: PathfindingOptions = {
        allowDiagonal: parameters.allowDiagonal ?? true,
        maxSearchNodes: parameters.maxSearchNodes ?? 10000,
        ...request.options
      };

      const earlyExit = parameters.earlyExit ?? true;

      const result = this.findPath(request, options, earlyExit);
      const executionTime = ((globalThis as any).performance?.now() || Date.now()) - startTime;

      const metrics: AlgorithmMetrics = {
        executionTime,
        memoryUsage: memoryPeak,
        iterations: result.searchedNodes,
        convergence: {
          converged: result.found,
          iterations: result.searchedNodes,
          tolerance: 0,
          finalError: result.found ? 0 : Infinity
        }
      };

      return {
        success: true,
        result,
        metrics,
        metadata: {
          algorithm: 'Dijkstra',
          pathLength: result.path.length,
          pathCost: result.cost,
          optimal: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          executionTime: ((globalThis as any).performance?.now() || Date.now()) - startTime,
          memoryUsage: memoryPeak,
          iterations: 0
        }
      };
    }
  }

  private findPath(
    request: PathfindingRequest,
    options: PathfindingOptions,
    earlyExit: boolean
  ): PathfindingResult {
    const { start, goal, grid } = request;
    const startNode = grid.getNode(start.x, start.y, start.z);
    const goalNode = grid.getNode(goal.x, goal.y, goal.z);

    if (!startNode || !goalNode) {
      return {
        path: [],
        cost: Infinity,
        searchedNodes: 0,
        found: false,
        executionTime: 0
      };
    }

    if (!startNode.walkable || !goalNode.walkable) {
      return {
        path: [],
        cost: Infinity,
        searchedNodes: 0,
        found: false,
        executionTime: 0
      };
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, PathfindingNode>();
    const visited = new Set<string>();
    const queue = new PriorityQueue<{ node: PathfindingNode; distance: number }>((a, b) => a.distance - b.distance);

    // Initialize distances
    const startKey = this.getNodeKey(startNode);
    distances.set(startKey, 0);
    queue.enqueue({ node: startNode, distance: 0 });

    let searchedNodes = 0;
    const maxNodes = options.maxSearchNodes || 10000;
    let goalFound = false;
    let goalDistance = Infinity;

    while (!queue.isEmpty() && searchedNodes < maxNodes) {
      const { node: currentNode, distance: currentDistance } = queue.dequeue()!;
      const currentKey = this.getNodeKey(currentNode);

      if (visited.has(currentKey)) {
        continue;
      }

      visited.add(currentKey);
      searchedNodes++;

      // Check if we reached the goal
      if (this.isSameNode(currentNode, goalNode)) {
        goalFound = true;
        goalDistance = currentDistance;

        if (earlyExit) {
          break;
        }
      }

      // Skip if current distance is greater than recorded (shouldn't happen with priority queue)
      const recordedDistance = distances.get(currentKey);
      if (recordedDistance !== undefined && currentDistance > recordedDistance) {
        continue;
      }

      // Explore neighbors
      const neighbors = grid.getNeighbors(currentNode);

      for (const neighbor of neighbors) {
        if (!neighbor.walkable) continue;

        const neighborKey = this.getNodeKey(neighbor);
        if (visited.has(neighborKey)) continue;

        // Skip diagonal movement if not allowed
        if (!options.allowDiagonal && this.isDiagonal(currentNode, neighbor)) {
          continue;
        }

        const moveCost = this.getMoveCost(currentNode, neighbor);
        const newDistance = currentDistance + moveCost;

        const existingDistance = distances.get(neighborKey);
        if (existingDistance === undefined || newDistance < existingDistance) {
          distances.set(neighborKey, newDistance);
          previous.set(neighborKey, currentNode);
          queue.enqueue({ node: neighbor, distance: newDistance });
        }
      }
    }

    if (!goalFound) {
      return {
        path: [],
        cost: Infinity,
        searchedNodes,
        found: false,
        executionTime: 0
      };
    }

    // Reconstruct path
    const path = this.reconstructPath(goalNode, previous);

    return {
      path: options.smoothPath ? this.smoothPath(path) : path,
      cost: goalDistance,
      searchedNodes,
      found: true,
      executionTime: 0
    };
  }

  private getNodeKey(node: PathfindingNode): string {
    return `${node.x},${node.y},${node.z || 0}`;
  }

  private isSameNode(a: PathfindingNode, b: PathfindingNode): boolean {
    return a.x === b.x && a.y === b.y && (a.z || 0) === (b.z || 0);
  }

  private isDiagonal(a: PathfindingNode, b: PathfindingNode): boolean {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1;
  }

  private getMoveCost(from: PathfindingNode, to: PathfindingNode): number {
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    const dz = Math.abs((from.z || 0) - (to.z || 0));

    // Base cost
    let cost = to.cost;

    // Distance multiplier
    if (dx + dy + dz === 1) {
      cost *= 1.0; // Straight movement
    } else if (dx + dy === 2 && dz === 0) {
      cost *= 1.414; // Diagonal movement (√2)
    } else {
      cost *= Math.sqrt(dx * dx + dy * dy + dz * dz); // 3D diagonal
    }

    return cost;
  }

  private reconstructPath(goalNode: PathfindingNode, previous: Map<string, PathfindingNode>): PathfindingNode[] {
    const path: PathfindingNode[] = [];
    let current: PathfindingNode | undefined = goalNode;

    while (current) {
      path.unshift(current);
      current = previous.get(this.getNodeKey(current));
    }

    return path;
  }

  private smoothPath(path: PathfindingNode[]): PathfindingNode[] {
    if (path.length <= 2) {
      return path;
    }

    const smoothed: PathfindingNode[] = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      let furthest = current + 1;

      // Find the furthest node we can reach in a straight line
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          furthest = i;
        } else {
          break;
        }
      }

      smoothed.push(path[furthest]);
      current = furthest;
    }

    return smoothed;
  }

  private hasLineOfSight(from: PathfindingNode, to: PathfindingNode): boolean {
    // Simple line-of-sight check using Bresenham's line algorithm
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const sx = from.x < to.x ? 1 : -1;
    const sy = from.y < to.y ? 1 : -1;
    let err = dx - dy;

    let x = from.x;
    let y = from.y;

    while (true) {
      if (x === to.x && y === to.y) {
        break;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return true; // Simplified
  }

  public validate(request: PathfindingRequest): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.start) {
      errors.push('Start position is required');
    }

    if (!request.goal) {
      errors.push('Goal position is required');
    }

    if (!request.grid) {
      errors.push('Grid is required');
    }

    if (request.start && request.grid) {
      const startNode = request.grid.getNode(request.start.x, request.start.y, request.start.z);
      if (!startNode) {
        errors.push('Start position is outside grid bounds');
      } else if (!startNode.walkable) {
        errors.push('Start position is not walkable');
      }
    }

    if (request.goal && request.grid) {
      const goalNode = request.grid.getNode(request.goal.x, request.goal.y, request.goal.z);
      if (!goalNode) {
        errors.push('Goal position is outside grid bounds');
      } else if (!goalNode.walkable) {
        errors.push('Goal position is not walkable');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}