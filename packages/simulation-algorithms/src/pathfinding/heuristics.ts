import { PathfindingNode, HeuristicFunction } from '../types';

export type HeuristicFn = (a: PathfindingNode, b: PathfindingNode) => number;

export function manhattanDistance(a: PathfindingNode, b: PathfindingNode): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dz = Math.abs((a.z || 0) - (b.z || 0));

  return dx + dy + dz;
}

export function euclideanDistance(a: PathfindingNode, b: PathfindingNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function chebyshevDistance(a: PathfindingNode, b: PathfindingNode): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dz = Math.abs((a.z || 0) - (b.z || 0));

  return Math.max(dx, dy, dz);
}

export function octileDistance(a: PathfindingNode, b: PathfindingNode): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dz = Math.abs((a.z || 0) - (b.z || 0));

  // 2D octile distance
  if (dz === 0) {
    const D = 1; // Cost of straight movement
    const D2 = Math.sqrt(2); // Cost of diagonal movement

    return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
  }

  // 3D extension - use euclidean for 3D case
  return euclideanDistance(a, b);
}

export function getHeuristicFunction(type: HeuristicFunction): HeuristicFn {
  switch (type) {
    case HeuristicFunction.MANHATTAN:
      return manhattanDistance;

    case HeuristicFunction.EUCLIDEAN:
      return euclideanDistance;

    case HeuristicFunction.CHEBYSHEV:
      return chebyshevDistance;

    case HeuristicFunction.OCTILE:
      return octileDistance;

    default:
      return euclideanDistance;
  }
}

export class AdaptiveHeuristic {
  private learningRate: number;
  private heuristicValues: Map<string, number> = new Map();
  private baseHeuristic: HeuristicFn;

  constructor(baseHeuristic: HeuristicFn = euclideanDistance, learningRate: number = 0.1) {
    this.baseHeuristic = baseHeuristic;
    this.learningRate = learningRate;
  }

  public estimate(from: PathfindingNode, to: PathfindingNode): number {
    const key = this.getKey(from, to);
    const stored = this.heuristicValues.get(key);
    const base = this.baseHeuristic(from, to);

    if (stored !== undefined) {
      return stored;
    }

    return base;
  }

  public update(from: PathfindingNode, to: PathfindingNode, actualCost: number): void {
    const key = this.getKey(from, to);
    const currentEstimate = this.heuristicValues.get(key) || this.baseHeuristic(from, to);

    // Update using temporal difference learning
    const error = actualCost - currentEstimate;
    const newEstimate = currentEstimate + this.learningRate * error;

    this.heuristicValues.set(key, newEstimate);
  }

  private getKey(from: PathfindingNode, to: PathfindingNode): string {
    return `${from.x},${from.y},${from.z || 0}->${to.x},${to.y},${to.z || 0}`;
  }

  public reset(): void {
    this.heuristicValues.clear();
  }
}

export class HierarchicalHeuristic {
  private levels: HeuristicLevel[];

  constructor(levels: HeuristicLevel[]) {
    this.levels = levels.sort((a, b) => a.level - b.level);
  }

  public estimate(from: PathfindingNode, to: PathfindingNode, currentLevel: number = 0): number {
    const level = this.levels.find(l => l.level === currentLevel);
    if (!level) {
      return euclideanDistance(from, to);
    }

    return level.heuristic(from, to);
  }

  public getAvailableLevels(): number[] {
    return this.levels.map(l => l.level);
  }
}

export interface HeuristicLevel {
  level: number;
  name: string;
  scale: number;
  heuristic: HeuristicFn;
}

export class DynamicHeuristic {
  private baseHeuristic: HeuristicFn;
  private weightFunction: (from: PathfindingNode, to: PathfindingNode, context: any) => number;

  constructor(
    baseHeuristic: HeuristicFn = euclideanDistance,
    weightFunction: (from: PathfindingNode, to: PathfindingNode, context: any) => number
  ) {
    this.baseHeuristic = baseHeuristic;
    this.weightFunction = weightFunction;
  }

  public estimate(from: PathfindingNode, to: PathfindingNode, context: any = {}): number {
    const baseValue = this.baseHeuristic(from, to);
    const weight = this.weightFunction(from, to, context);

    return baseValue * weight;
  }
}

export function createDistanceWeightFunction(obstacles: PathfindingNode[]): (from: PathfindingNode, to: PathfindingNode, context: any) => number {
  return (from: PathfindingNode, to: PathfindingNode, context: any): number => {
    let minObstacleDistance = Infinity;

    for (const obstacle of obstacles) {
      const distance = euclideanDistance(from, obstacle);
      minObstacleDistance = Math.min(minObstacleDistance, distance);
    }

    // Increase heuristic weight when far from obstacles (safer paths)
    return minObstacleDistance > 5 ? 1.0 : 1.5;
  };
}

export function createTrafficWeightFunction(trafficData: Map<string, number>): (from: PathfindingNode, to: PathfindingNode, context: any) => number {
  return (from: PathfindingNode, to: PathfindingNode, context: any): number => {
    const fromKey = `${from.x},${from.y}`;
    const toKey = `${to.x},${to.y}`;

    const fromTraffic = trafficData.get(fromKey) || 1.0;
    const toTraffic = trafficData.get(toKey) || 1.0;

    const avgTraffic = (fromTraffic + toTraffic) / 2;

    // Higher weight for high traffic areas
    return 1.0 + avgTraffic * 0.5;
  };
}

export function createTerrainWeightFunction(terrainCosts: Map<string, number>): (from: PathfindingNode, to: PathfindingNode, context: any) => number {
  return (from: PathfindingNode, to: PathfindingNode, context: any): number => {
    const toKey = `${to.x},${to.y}`;
    const terrainCost = terrainCosts.get(toKey) || 1.0;

    // Adjust heuristic based on terrain difficulty
    return terrainCost;
  };
}