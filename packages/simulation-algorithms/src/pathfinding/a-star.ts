import {
  Algorithm,
  AlgorithmCategory,
  ComplexityNotation,
  PathfindingNode,
  PathfindingGrid,
  PathfindingRequest,
  PathfindingResult,
  PathfindingOptions,
  HeuristicFunction,
  AlgorithmResult,
  AlgorithmMetrics
} from '../types';
import { PriorityQueue } from '../utils/priority-queue';
import { getHeuristicFunction } from './heuristics';

export class AStarAlgorithm implements Algorithm {
  public readonly id = 'a_star';
  public readonly name = 'A* Pathfinding';
  public readonly version = '1.0.0';
  public readonly description = 'Finds the shortest path between two points using A* algorithm with heuristic optimization';
  public readonly category = AlgorithmCategory.PATHFINDING;
  public readonly complexity = {
    time: ComplexityNotation.LINEARITHMIC,
    space: ComplexityNotation.LINEAR,
    description: 'Time complexity depends on heuristic accuracy, space is linear in explored nodes'
  };

  public readonly parameters = [
    {
      name: 'heuristic',
      type: 'enum' as any,
      description: 'Heuristic function to use for distance estimation',
      required: false,
      defaultValue: HeuristicFunction.EUCLIDEAN,
      constraints: {
        options: Object.values(HeuristicFunction)
      }
    },
    {
      name: 'allowDiagonal',
      type: 'boolean' as any,
      description: 'Whether diagonal movement is allowed',
      required: false,
      defaultValue: true
    },
    {
      name: 'weight',
      type: 'number' as any,
      description: 'Weight factor for the heuristic (higher = faster but less optimal)',
      required: false,
      defaultValue: 1.0,
      constraints: { min: 0.1, max: 10.0 }
    },
    {
      name: 'maxSearchNodes',
      type: 'number' as any,
      description: 'Maximum number of nodes to search before giving up',
      required: false,
      defaultValue: 10000,
      constraints: { min: 100, max: 100000 }
    }
  ];

  public execute(request: PathfindingRequest, parameters: Record<string, any> = {}): AlgorithmResult {
    const startTime = (globalThis as any).performance?.now() || Date.now();
    let memoryPeak = 0;

    try {
      const options: PathfindingOptions = {
        allowDiagonal: parameters.allowDiagonal ?? true,
        weight: parameters.weight ?? 1.0,
        maxSearchNodes: parameters.maxSearchNodes ?? 10000,
        ...request.options
      };

      const heuristicType = parameters.heuristic ?? request.heuristic ?? HeuristicFunction.EUCLIDEAN;
      const heuristicFn = getHeuristicFunction(heuristicType);

      const result = this.findPath(request, options, heuristicFn);
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
          algorithm: 'A*',
          heuristic: heuristicType,
          pathLength: result.path.length,
          pathCost: result.cost
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
    heuristic: (a: PathfindingNode, b: PathfindingNode) => number
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

    const openSet = new PriorityQueue<PathfindingNode>((a, b) => a.fCost - b.fCost);
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, PathfindingNode>();

    // Initialize start node
    startNode.gCost = 0;
    startNode.hCost = heuristic(startNode, goalNode) * (options.weight || 1.0);
    startNode.fCost = startNode.gCost + startNode.hCost;
    startNode.parent = undefined;

    openSet.enqueue(startNode);
    nodeMap.set(this.getNodeKey(startNode), startNode);

    let searchedNodes = 0;
    const maxNodes = options.maxSearchNodes || 10000;

    while (!openSet.isEmpty() && searchedNodes < maxNodes) {
      const currentNode = openSet.dequeue()!;
      const currentKey = this.getNodeKey(currentNode);

      if (closedSet.has(currentKey)) {
        continue;
      }

      closedSet.add(currentKey);
      searchedNodes++;

      // Check if we reached the goal
      if (this.isSameNode(currentNode, goalNode)) {
        const path = this.reconstructPath(currentNode);
        const cost = currentNode.gCost;

        return {
          path: options.smoothPath ? this.smoothPath(path) : path,
          cost,
          searchedNodes,
          found: true,
          executionTime: 0
        };
      }

      // Explore neighbors
      const neighbors = grid.getNeighbors(currentNode);

      for (const neighbor of neighbors) {
        if (!neighbor.walkable) continue;

        const neighborKey = this.getNodeKey(neighbor);
        if (closedSet.has(neighborKey)) continue;

        // Skip diagonal movement if not allowed
        if (!options.allowDiagonal && this.isDiagonal(currentNode, neighbor)) {
          continue;
        }

        const moveCost = this.getMoveCost(currentNode, neighbor);
        const tentativeGCost = currentNode.gCost + moveCost;

        const existingNode = nodeMap.get(neighborKey);
        if (existingNode && tentativeGCost >= existingNode.gCost) {
          continue;
        }

        // Create or update neighbor node
        const neighborNode = existingNode || { ...neighbor };
        neighborNode.parent = currentNode;
        neighborNode.gCost = tentativeGCost;
        neighborNode.hCost = heuristic(neighborNode, goalNode) * (options.weight || 1.0);
        neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;

        nodeMap.set(neighborKey, neighborNode);
        openSet.enqueue(neighborNode);
      }
    }

    // No path found
    return {
      path: [],
      cost: Infinity,
      searchedNodes,
      found: false,
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

  private reconstructPath(goalNode: PathfindingNode): PathfindingNode[] {
    const path: PathfindingNode[] = [];
    let currentNode: PathfindingNode | undefined = goalNode;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parent;
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
      // Check if current position is walkable (would need access to grid)
      // This is simplified - in practice would check grid.getNode(x, y)?.walkable

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

    return true; // Simplified - would return false if any node in path is not walkable
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