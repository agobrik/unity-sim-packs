/**
 * Path Finding Algorithms for Supply Chain Optimization
 */

import { NodeId, Coordinates } from '../core/types';

export interface PathNode {
  id: NodeId;
  x: number;
  y: number;
  connections: { nodeId: NodeId; weight: number }[];
}

export interface PathResult {
  path: NodeId[];
  totalDistance: number;
  totalCost: number;
}

export class PathFinding {
  /**
   * Dijkstra's shortest path algorithm
   */
  static dijkstra(
    nodes: Map<NodeId, PathNode>,
    start: NodeId,
    end: NodeId,
    weightType: 'distance' | 'cost' = 'distance'
  ): PathResult | null {
    const distances = new Map<NodeId, number>();
    const previous = new Map<NodeId, NodeId | null>();
    const unvisited = new Set<NodeId>();

    // Initialize
    for (const nodeId of nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }
    distances.set(start, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current: NodeId | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          current = nodeId;
        }
      }

      if (current === null || minDistance === Infinity) break;

      unvisited.delete(current);

      if (current === end) break;

      const currentNode = nodes.get(current);
      if (currentNode) {
        for (const connection of currentNode.connections) {
          if (unvisited.has(connection.nodeId)) {
            const newDistance = distances.get(current)! + connection.weight;
            if (newDistance < distances.get(connection.nodeId)!) {
              distances.set(connection.nodeId, newDistance);
              previous.set(connection.nodeId, current);
            }
          }
        }
      }
    }

    // Reconstruct path
    const path: NodeId[] = [];
    let current: NodeId | null = end;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path.length === 0 || path[0] !== start) {
      return null;
    }

    return {
      path,
      totalDistance: distances.get(end) || 0,
      totalCost: distances.get(end) || 0
    };
  }

  /**
   * A* pathfinding algorithm
   */
  static aStar(
    nodes: Map<NodeId, PathNode>,
    start: NodeId,
    end: NodeId
  ): PathResult | null {
    const openSet = new Set<NodeId>([start]);
    const closedSet = new Set<NodeId>();
    const gScore = new Map<NodeId, number>();
    const fScore = new Map<NodeId, number>();
    const previous = new Map<NodeId, NodeId | null>();

    // Initialize scores
    for (const nodeId of nodes.keys()) {
      gScore.set(nodeId, Infinity);
      fScore.set(nodeId, Infinity);
    }
    gScore.set(start, 0);

    const startNode = nodes.get(start);
    const endNode = nodes.get(end);
    if (!startNode || !endNode) return null;

    fScore.set(start, this.heuristic(startNode, endNode));

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current: NodeId | null = null;
      let lowestScore = Infinity;

      for (const nodeId of openSet) {
        const score = fScore.get(nodeId)!;
        if (score < lowestScore) {
          lowestScore = score;
          current = nodeId;
        }
      }

      if (current === null) break;

      if (current === end) {
        // Reconstruct path
        const path: NodeId[] = [];
        let node: NodeId | null = end;

        while (node !== null) {
          path.unshift(node);
          node = previous.get(node) || null;
        }

        return {
          path,
          totalDistance: gScore.get(end) || 0,
          totalCost: gScore.get(end) || 0
        };
      }

      openSet.delete(current);
      closedSet.add(current);

      const currentNode = nodes.get(current);
      if (currentNode) {
        for (const connection of currentNode.connections) {
          const neighbor = connection.nodeId;

          if (closedSet.has(neighbor)) continue;

          const tentativeG = gScore.get(current)! + connection.weight;

          if (!openSet.has(neighbor)) {
            openSet.add(neighbor);
          } else if (tentativeG >= gScore.get(neighbor)!) {
            continue;
          }

          previous.set(neighbor, current);
          gScore.set(neighbor, tentativeG);

          const neighborNode = nodes.get(neighbor);
          if (neighborNode) {
            fScore.set(neighbor, gScore.get(neighbor)! + this.heuristic(neighborNode, endNode));
          }
        }
      }
    }

    return null; // No path found
  }

  /**
   * Heuristic function for A* (Euclidean distance)
   */
  private static heuristic(nodeA: PathNode, nodeB: PathNode): number {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find multiple paths between nodes
   */
  static findMultiplePaths(
    nodes: Map<NodeId, PathNode>,
    start: NodeId,
    end: NodeId,
    maxPaths: number = 5
  ): PathResult[] {
    const paths: PathResult[] = [];
    const usedEdges = new Set<string>();

    for (let i = 0; i < maxPaths; i++) {
      const path = this.dijkstraWithExclusions(nodes, start, end, usedEdges);
      if (!path) break;

      paths.push(path);

      // Add edges from this path to exclusion set
      for (let j = 0; j < path.path.length - 1; j++) {
        const edge = `${path.path[j]}-${path.path[j + 1]}`;
        usedEdges.add(edge);
      }
    }

    return paths;
  }

  /**
   * Dijkstra with edge exclusions
   */
  private static dijkstraWithExclusions(
    nodes: Map<NodeId, PathNode>,
    start: NodeId,
    end: NodeId,
    excludedEdges: Set<string>
  ): PathResult | null {
    // Similar to dijkstra but check excluded edges
    const distances = new Map<NodeId, number>();
    const previous = new Map<NodeId, NodeId | null>();
    const unvisited = new Set<NodeId>();

    for (const nodeId of nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }
    distances.set(start, 0);

    while (unvisited.size > 0) {
      let current: NodeId | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          current = nodeId;
        }
      }

      if (current === null || minDistance === Infinity) break;

      unvisited.delete(current);

      if (current === end) break;

      const currentNode = nodes.get(current);
      if (currentNode) {
        for (const connection of currentNode.connections) {
          const edge = `${current}-${connection.nodeId}`;
          if (excludedEdges.has(edge)) continue; // Skip excluded edges

          if (unvisited.has(connection.nodeId)) {
            const newDistance = distances.get(current)! + connection.weight;
            if (newDistance < distances.get(connection.nodeId)!) {
              distances.set(connection.nodeId, newDistance);
              previous.set(connection.nodeId, current);
            }
          }
        }
      }
    }

    // Reconstruct path
    const path: NodeId[] = [];
    let current: NodeId | null = end;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path.length === 0 || path[0] !== start) {
      return null;
    }

    return {
      path,
      totalDistance: distances.get(end) || 0,
      totalCost: distances.get(end) || 0
    };
  }
}