/**
 * Supply Network - Manages the overall network topology and connections
 */

import { EventEmitter } from '../utils/EventEmitter';
import { EventBus } from '../core/EventBus';
import {
  NodeId,
  RouteId,
  EntityId,
  TimeStamp,
  EventType,
  OperationResult,
  Coordinates,
  SupplyChainError
} from '../core/types';
import { Node } from '../entities/Node';
import { Route } from './Route';

export interface NetworkTopology {
  nodes: Map<NodeId, NetworkNode>;
  routes: Map<RouteId, NetworkRoute>;
  adjacencyMatrix: number[][];
  nodeIndex: Map<NodeId, number>;
  clusters: NetworkCluster[];
  criticalPaths: CriticalPath[];
}

export interface NetworkNode {
  node: Node;
  connections: Set<NodeId>;
  inDegree: number;
  outDegree: number;
  centrality: CentralityMetrics;
  cluster?: string;
  tier: number;
}

export interface NetworkRoute {
  route: Route;
  utilization: number;
  congestion: number;
  reliability: number;
  lastUpdated: TimeStamp;
}

export interface CentralityMetrics {
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  pageRank: number;
}

export interface NetworkCluster {
  id: string;
  name: string;
  nodes: Set<NodeId>;
  center: Coordinates;
  radius: number;
  density: number;
  internalConnections: number;
  externalConnections: number;
}

export interface CriticalPath {
  id: string;
  nodes: NodeId[];
  routes: RouteId[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
  reliability: number;
  bottlenecks: Bottleneck[];
}

export interface Bottleneck {
  nodeId?: NodeId;
  routeId?: RouteId;
  type: 'capacity' | 'reliability' | 'cost' | 'time';
  severity: number;
  impact: string;
}

export interface NetworkMetrics {
  totalNodes: number;
  totalRoutes: number;
  averagePathLength: number;
  clusteringCoefficient: number;
  networkDensity: number;
  connectivity: number;
  resilience: number;
  efficiency: number;
  redundancy: number;
  lastCalculated: TimeStamp;
}

export interface FlowAnalysis {
  totalFlow: number;
  flowByRoute: Map<RouteId, number>;
  flowByNode: Map<NodeId, number>;
  congestionPoints: CongestedElement[];
  underutilizedCapacity: number;
  flowEfficiency: number;
}

export interface CongestedElement {
  id: string;
  type: 'node' | 'route';
  utilizationRate: number;
  backlogTime: number;
  suggestedCapacityIncrease: number;
}

export interface NetworkOptimization {
  suggestedRoutes: SuggestedRoute[];
  redundancyImprovements: RedundancyImprovement[];
  capacityAdjustments: CapacityAdjustment[];
  costReductions: CostReduction[];
  reliabilityEnhancements: ReliabilityEnhancement[];
}

export interface SuggestedRoute {
  fromNodeId: NodeId;
  toNodeId: NodeId;
  justification: string;
  estimatedBenefit: number;
  estimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RedundancyImprovement {
  criticalPathId: string;
  alternativeRoutes: RouteId[];
  riskReduction: number;
  cost: number;
}

export interface CapacityAdjustment {
  elementId: string;
  elementType: 'node' | 'route';
  currentCapacity: number;
  suggestedCapacity: number;
  expectedImpact: string;
  cost: number;
}

export interface CostReduction {
  description: string;
  affectedElements: string[];
  estimatedSavings: number;
  implementationCost: number;
  paybackPeriod: number;
}

export interface ReliabilityEnhancement {
  description: string;
  affectedElements: string[];
  reliabilityImprovement: number;
  cost: number;
  priority: number;
}

export class SupplyNetwork extends EventEmitter {
  private topology: NetworkTopology;
  private eventBus: EventBus;
  private metrics: NetworkMetrics;
  private flowHistory: FlowRecord[] = [];
  private optimizationCache: Map<string, NetworkOptimization> = new Map();
  private lastAnalysis: TimeStamp;
  private initialized = false;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.topology = {
      nodes: new Map(),
      routes: new Map(),
      adjacencyMatrix: [],
      nodeIndex: new Map(),
      clusters: [],
      criticalPaths: []
    };
    this.metrics = this.initializeMetrics();
    this.lastAnalysis = { gameTime: 0, realTime: Date.now() };
    this.setupEventHandlers();
  }

  /**
   * Initialize network metrics
   */
  private initializeMetrics(): NetworkMetrics {
    return {
      totalNodes: 0,
      totalRoutes: 0,
      averagePathLength: 0,
      clusteringCoefficient: 0,
      networkDensity: 0,
      connectivity: 0,
      resilience: 0,
      efficiency: 0,
      redundancy: 0,
      lastCalculated: { gameTime: 0, realTime: Date.now() }
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('node-added', (data) => {
      this.invalidateOptimizationCache();
      this.eventBus.emit(EventType.PRODUCTION_STARTED, 'supply-network', {
        action: 'node-added',
        nodeId: data.nodeId
      });
    });

    this.on('route-added', (data) => {
      this.invalidateOptimizationCache();
      this.eventBus.emit(EventType.PRODUCTION_STARTED, 'supply-network', {
        action: 'route-added',
        routeId: data.routeId
      });
    });

    this.on('network-optimized', (data) => {
      this.eventBus.emit(EventType.PRODUCTION_STARTED, 'supply-network', {
        action: 'network-optimized',
        improvements: data.improvements
      });
    });
  }

  /**
   * Initialize the network
   */
  async initialize(): Promise<void> {
    this.initialized = true;
    this.emit('network-initialized');
  }

  /**
   * Shutdown the network
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.topology.nodes.clear();
    this.topology.routes.clear();
    this.optimizationCache.clear();
    this.emit('network-shutdown');
  }

  /**
   * Add node to network
   */
  addNode(node: Node): OperationResult<void> {
    const nodeId = node.getId();

    if (this.topology.nodes.has(nodeId)) {
      return {
        success: false,
        error: {
          code: 'NODE_ALREADY_EXISTS',
          message: `Node ${nodeId} already exists in network`,
          severity: 'warning',
          context: { nodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const networkNode: NetworkNode = {
      node,
      connections: new Set(),
      inDegree: 0,
      outDegree: 0,
      centrality: {
        degree: 0,
        betweenness: 0,
        closeness: 0,
        eigenvector: 0,
        pageRank: 0
      },
      tier: this.calculateNodeTier(node)
    };

    this.topology.nodes.set(nodeId, networkNode);
    this.topology.nodeIndex.set(nodeId, this.topology.nodeIndex.size);

    // Rebuild adjacency matrix
    this.rebuildAdjacencyMatrix();

    this.emit('node-added', { nodeId });

    return { success: true, warnings: [] };
  }

  /**
   * Remove node from network
   */
  removeNode(nodeId: NodeId): OperationResult<void> {
    const networkNode = this.topology.nodes.get(nodeId);
    if (!networkNode) {
      return {
        success: false,
        error: {
          code: 'NODE_NOT_FOUND',
          message: `Node ${nodeId} not found in network`,
          severity: 'error',
          context: { nodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    // Remove all routes connected to this node
    const connectedRoutes: RouteId[] = [];
    for (const [routeId, networkRoute] of this.topology.routes) {
      const route = networkRoute.route;
      if (route.getFromNodeId() === nodeId || route.getToNodeId() === nodeId) {
        connectedRoutes.push(routeId);
      }
    }

    connectedRoutes.forEach(routeId => {
      this.removeRoute(routeId);
    });

    // Remove node
    this.topology.nodes.delete(nodeId);
    this.topology.nodeIndex.delete(nodeId);

    // Rebuild node index
    this.rebuildNodeIndex();
    this.rebuildAdjacencyMatrix();

    this.emit('node-removed', { nodeId });

    return { success: true, warnings: [] };
  }

  /**
   * Add route to network
   */
  addRoute(route: Route): OperationResult<void> {
    const routeId = route.getId();
    const fromNodeId = route.getFromNodeId();
    const toNodeId = route.getToNodeId();

    if (this.topology.routes.has(routeId)) {
      return {
        success: false,
        error: {
          code: 'ROUTE_ALREADY_EXISTS',
          message: `Route ${routeId} already exists`,
          severity: 'warning',
          context: { routeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    // Check if nodes exist
    if (!this.topology.nodes.has(fromNodeId) || !this.topology.nodes.has(toNodeId)) {
      return {
        success: false,
        error: {
          code: 'NODES_NOT_FOUND',
          message: `One or both nodes not found: ${fromNodeId}, ${toNodeId}`,
          severity: 'error',
          context: { fromNodeId, toNodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const networkRoute: NetworkRoute = {
      route,
      utilization: 0,
      congestion: 0,
      reliability: route.getReliability(),
      lastUpdated: { gameTime: 0, realTime: Date.now() }
    };

    this.topology.routes.set(routeId, networkRoute);

    // Update node connections
    const fromNode = this.topology.nodes.get(fromNodeId)!;
    const toNode = this.topology.nodes.get(toNodeId)!;

    fromNode.connections.add(toNodeId);
    fromNode.outDegree++;
    toNode.inDegree++;

    if (route.isBidirectional()) {
      toNode.connections.add(fromNodeId);
      toNode.outDegree++;
      fromNode.inDegree++;
    }

    // Update adjacency matrix
    this.updateAdjacencyMatrix(fromNodeId, toNodeId, route.isBidirectional());

    this.emit('route-added', { routeId, fromNodeId, toNodeId });

    return { success: true, warnings: [] };
  }

  /**
   * Remove route from network
   */
  removeRoute(routeId: RouteId): OperationResult<void> {
    const networkRoute = this.topology.routes.get(routeId);
    if (!networkRoute) {
      return {
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${routeId} not found`,
          severity: 'error',
          context: { routeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const route = networkRoute.route;
    const fromNodeId = route.getFromNodeId();
    const toNodeId = route.getToNodeId();

    // Update node connections
    const fromNode = this.topology.nodes.get(fromNodeId);
    const toNode = this.topology.nodes.get(toNodeId);

    if (fromNode) {
      fromNode.connections.delete(toNodeId);
      fromNode.outDegree--;
    }

    if (toNode) {
      toNode.inDegree--;
      if (route.isBidirectional()) {
        toNode.connections.delete(fromNodeId);
        toNode.outDegree--;
        if (fromNode) {
          fromNode.inDegree--;
        }
      }
    }

    this.topology.routes.delete(routeId);

    // Update adjacency matrix
    this.updateAdjacencyMatrix(fromNodeId, toNodeId, false, true);

    this.emit('route-removed', { routeId, fromNodeId, toNodeId });

    return { success: true, warnings: [] };
  }

  /**
   * Find shortest path between nodes
   */
  findShortestPath(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    metric: 'distance' | 'time' | 'cost' = 'distance'
  ): OperationResult<NodeId[]> {
    if (!this.topology.nodes.has(fromNodeId) || !this.topology.nodes.has(toNodeId)) {
      return {
        success: false,
        error: {
          code: 'NODES_NOT_FOUND',
          message: 'One or both nodes not found',
          severity: 'error',
          context: { fromNodeId, toNodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const path = this.dijkstraShortestPath(fromNodeId, toNodeId, metric);

    if (path.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_PATH_FOUND',
          message: `No path found between ${fromNodeId} and ${toNodeId}`,
          severity: 'warning',
          context: { fromNodeId, toNodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    return { success: true, data: path, warnings: [] };
  }

  /**
   * Find all paths between nodes
   */
  findAllPaths(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    maxPaths: number = 10
  ): OperationResult<NodeId[][]> {
    if (!this.topology.nodes.has(fromNodeId) || !this.topology.nodes.has(toNodeId)) {
      return {
        success: false,
        error: {
          code: 'NODES_NOT_FOUND',
          message: 'One or both nodes not found',
          severity: 'error',
          context: { fromNodeId, toNodeId },
          timestamp: { gameTime: 0, realTime: Date.now() },
          recoverable: true
        },
        warnings: []
      };
    }

    const paths = this.findAllPathsDFS(fromNodeId, toNodeId, maxPaths);

    return { success: true, data: paths, warnings: [] };
  }

  /**
   * Analyze network flow
   */
  analyzeFlow(): FlowAnalysis {
    const analysis: FlowAnalysis = {
      totalFlow: 0,
      flowByRoute: new Map(),
      flowByNode: new Map(),
      congestionPoints: [],
      underutilizedCapacity: 0,
      flowEfficiency: 0
    };

    // Calculate flow metrics
    for (const [routeId, networkRoute] of this.topology.routes) {
      const flow = this.calculateRouteFlow(networkRoute);
      analysis.totalFlow += flow;
      analysis.flowByRoute.set(routeId, flow);

      // Check for congestion
      if (networkRoute.utilization > 0.8) {
        analysis.congestionPoints.push({
          id: routeId,
          type: 'route',
          utilizationRate: networkRoute.utilization,
          backlogTime: this.calculateBacklogTime(networkRoute),
          suggestedCapacityIncrease: this.calculateCapacityIncrease(networkRoute)
        });
      }
    }

    // Calculate node flows
    for (const [nodeId, networkNode] of this.topology.nodes) {
      const nodeFlow = this.calculateNodeFlow(networkNode);
      analysis.flowByNode.set(nodeId, nodeFlow);
    }

    // Calculate underutilized capacity
    analysis.underutilizedCapacity = this.calculateUnderutilizedCapacity();

    // Calculate flow efficiency
    analysis.flowEfficiency = this.calculateFlowEfficiency(analysis);

    return analysis;
  }

  /**
   * Update network state
   */
  async update(currentTime: TimeStamp): Promise<void> {
    // Update route utilization and congestion
    for (const networkRoute of this.topology.routes.values()) {
      this.updateRouteMetrics(networkRoute, currentTime);
    }

    // Update network metrics periodically
    if (currentTime.realTime - this.lastAnalysis.realTime > 60000) { // Every minute
      this.calculateNetworkMetrics();
      this.lastAnalysis = currentTime;
    }

    // Record flow history
    this.recordFlowHistory(currentTime);
  }

  /**
   * Get network optimization suggestions
   */
  getOptimizationSuggestions(): NetworkOptimization {
    const cacheKey = this.generateOptimizationCacheKey();
    const cached = this.optimizationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const optimization = this.calculateOptimizationSuggestions();
    this.optimizationCache.set(cacheKey, optimization);

    return optimization;
  }

  /**
   * Calculate network centrality metrics
   */
  calculateCentrality(): void {
    this.calculateDegreeCentrality();
    this.calculateBetweennessCentrality();
    this.calculateClosenessCentrality();
    this.calculateEigenvectorCentrality();
    this.calculatePageRank();
  }

  /**
   * Detect network clusters
   */
  detectClusters(): NetworkCluster[] {
    // Simplified clustering algorithm
    const clusters: NetworkCluster[] = [];
    const visited = new Set<NodeId>();

    for (const [nodeId, networkNode] of this.topology.nodes) {
      if (!visited.has(nodeId)) {
        const cluster = this.exploreCluster(nodeId, visited);
        if (cluster.nodes.size > 1) {
          clusters.push(cluster);
        }
      }
    }

    this.topology.clusters = clusters;
    return clusters;
  }

  /**
   * Identify critical paths
   */
  identifyCriticalPaths(): CriticalPath[] {
    const criticalPaths: CriticalPath[] = [];

    // Find paths with high importance (high centrality nodes)
    const importantNodes = Array.from(this.topology.nodes.entries())
      .filter(([_, node]) => node.centrality.betweenness > 0.5)
      .map(([nodeId, _]) => nodeId);

    for (let i = 0; i < importantNodes.length; i++) {
      for (let j = i + 1; j < importantNodes.length; j++) {
        const pathResult = this.findShortestPath(importantNodes[i], importantNodes[j]);
        if (pathResult.success && pathResult.data) {
          const criticalPath = this.analyzePath(pathResult.data);
          if (criticalPath.reliability < 0.8) {
            criticalPaths.push(criticalPath);
          }
        }
      }
    }

    this.topology.criticalPaths = criticalPaths;
    return criticalPaths;
  }

  /**
   * Dijkstra's shortest path algorithm
   */
  private dijkstraShortestPath(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    metric: 'distance' | 'time' | 'cost'
  ): NodeId[] {
    const distances = new Map<NodeId, number>();
    const previous = new Map<NodeId, NodeId | null>();
    const unvisited = new Set<NodeId>();

    // Initialize distances
    for (const nodeId of this.topology.nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }
    distances.set(fromNodeId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: NodeId | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (currentNode === null || minDistance === Infinity) {
        break; // No path exists
      }

      unvisited.delete(currentNode);

      if (currentNode === toNodeId) {
        break; // Reached destination
      }

      // Check neighbors
      const networkNode = this.topology.nodes.get(currentNode);
      if (networkNode) {
        for (const neighbor of networkNode.connections) {
          if (unvisited.has(neighbor)) {
            const route = this.findRouteBetween(currentNode, neighbor);
            if (route) {
              const weight = this.getRouteWeight(route, metric);
              const newDistance = distances.get(currentNode)! + weight;

              if (newDistance < distances.get(neighbor)!) {
                distances.set(neighbor, newDistance);
                previous.set(neighbor, currentNode);
              }
            }
          }
        }
      }
    }

    // Reconstruct path
    const path: NodeId[] = [];
    let current: NodeId | null = toNodeId;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    return path.length > 1 ? path : [];
  }

  /**
   * Find all paths using DFS
   */
  private findAllPathsDFS(
    fromNodeId: NodeId,
    toNodeId: NodeId,
    maxPaths: number,
    currentPath: NodeId[] = [],
    visited: Set<NodeId> = new Set()
  ): NodeId[][] {
    const paths: NodeId[][] = [];

    if (paths.length >= maxPaths) {
      return paths;
    }

    currentPath.push(fromNodeId);
    visited.add(fromNodeId);

    if (fromNodeId === toNodeId) {
      paths.push([...currentPath]);
    } else {
      const networkNode = this.topology.nodes.get(fromNodeId);
      if (networkNode) {
        for (const neighbor of networkNode.connections) {
          if (!visited.has(neighbor)) {
            const subPaths = this.findAllPathsDFS(neighbor, toNodeId, maxPaths - paths.length, currentPath, visited);
            paths.push(...subPaths);
          }
        }
      }
    }

    currentPath.pop();
    visited.delete(fromNodeId);

    return paths;
  }

  /**
   * Calculate node tier based on type and centrality
   */
  private calculateNodeTier(node: Node): number {
    const nodeType = node.getType();

    switch (nodeType) {
      case 'supplier': return 1;
      case 'manufacturer': return 2;
      case 'warehouse': return 3;
      case 'distributor': return 4;
      case 'retailer': return 5;
      case 'consumer': return 6;
      default: return 3;
    }
  }

  /**
   * Rebuild adjacency matrix
   */
  private rebuildAdjacencyMatrix(): void {
    const nodeCount = this.topology.nodes.size;
    this.topology.adjacencyMatrix = Array(nodeCount).fill(null).map(() => Array(nodeCount).fill(0));

    for (const [routeId, networkRoute] of this.topology.routes) {
      const route = networkRoute.route;
      const fromIndex = this.topology.nodeIndex.get(route.getFromNodeId());
      const toIndex = this.topology.nodeIndex.get(route.getToNodeId());

      if (fromIndex !== undefined && toIndex !== undefined) {
        this.topology.adjacencyMatrix[fromIndex][toIndex] = 1;
        if (route.isBidirectional()) {
          this.topology.adjacencyMatrix[toIndex][fromIndex] = 1;
        }
      }
    }
  }

  /**
   * Rebuild node index
   */
  private rebuildNodeIndex(): void {
    this.topology.nodeIndex.clear();
    let index = 0;
    for (const nodeId of this.topology.nodes.keys()) {
      this.topology.nodeIndex.set(nodeId, index++);
    }
  }

  /**
   * Update adjacency matrix
   */
  private updateAdjacencyMatrix(fromNodeId: NodeId, toNodeId: NodeId, bidirectional: boolean, remove: boolean = false): void {
    const fromIndex = this.topology.nodeIndex.get(fromNodeId);
    const toIndex = this.topology.nodeIndex.get(toNodeId);

    if (fromIndex !== undefined && toIndex !== undefined) {
      this.topology.adjacencyMatrix[fromIndex][toIndex] = remove ? 0 : 1;
      if (bidirectional) {
        this.topology.adjacencyMatrix[toIndex][fromIndex] = remove ? 0 : 1;
      }
    }
  }

  /**
   * Calculate degree centrality
   */
  private calculateDegreeCentrality(): void {
    const nodeCount = this.topology.nodes.size;

    for (const [nodeId, networkNode] of this.topology.nodes) {
      const degree = networkNode.inDegree + networkNode.outDegree;
      networkNode.centrality.degree = nodeCount > 1 ? degree / (nodeCount - 1) : 0;
    }
  }

  /**
   * Calculate betweenness centrality
   */
  private calculateBetweennessCentrality(): void {
    // Simplified implementation - full algorithm would be more complex
    for (const [nodeId, networkNode] of this.topology.nodes) {
      let betweenness = 0;

      // Count how many shortest paths pass through this node
      for (const [sourceId] of this.topology.nodes) {
        for (const [targetId] of this.topology.nodes) {
          if (sourceId !== targetId && sourceId !== nodeId && targetId !== nodeId) {
            const pathResult = this.findShortestPath(sourceId, targetId);
            if (pathResult.success && pathResult.data && pathResult.data.includes(nodeId)) {
              betweenness += 1;
            }
          }
        }
      }

      const nodeCount = this.topology.nodes.size;
      const normalizer = nodeCount > 2 ? (nodeCount - 1) * (nodeCount - 2) / 2 : 1;
      networkNode.centrality.betweenness = betweenness / normalizer;
    }
  }

  /**
   * Calculate closeness centrality
   */
  private calculateClosenessCentrality(): void {
    for (const [nodeId, networkNode] of this.topology.nodes) {
      let totalDistance = 0;
      let reachableNodes = 0;

      for (const [targetId] of this.topology.nodes) {
        if (nodeId !== targetId) {
          const pathResult = this.findShortestPath(nodeId, targetId);
          if (pathResult.success && pathResult.data) {
            totalDistance += pathResult.data.length - 1;
            reachableNodes++;
          }
        }
      }

      networkNode.centrality.closeness = reachableNodes > 0 ? reachableNodes / totalDistance : 0;
    }
  }

  /**
   * Calculate eigenvector centrality (simplified)
   */
  private calculateEigenvectorCentrality(): void {
    // Simplified implementation - would use power iteration in practice
    for (const networkNode of this.topology.nodes.values()) {
      networkNode.centrality.eigenvector = networkNode.centrality.degree * 0.8;
    }
  }

  /**
   * Calculate PageRank (simplified)
   */
  private calculatePageRank(): void {
    const dampingFactor = 0.85;
    const nodeCount = this.topology.nodes.size;

    for (const networkNode of this.topology.nodes.values()) {
      const baseRank = (1 - dampingFactor) / nodeCount;
      const linkRank = dampingFactor * networkNode.centrality.degree / nodeCount;
      networkNode.centrality.pageRank = baseRank + linkRank;
    }
  }

  /**
   * Explore cluster starting from a node
   */
  private exploreCluster(startNodeId: NodeId, visited: Set<NodeId>): NetworkCluster {
    const clusterNodes = new Set<NodeId>();
    const queue: NodeId[] = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      clusterNodes.add(nodeId);

      const networkNode = this.topology.nodes.get(nodeId);
      if (networkNode) {
        for (const neighbor of networkNode.connections) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    return this.createClusterFromNodes(clusterNodes);
  }

  /**
   * Create cluster from set of nodes
   */
  private createClusterFromNodes(nodes: Set<NodeId>): NetworkCluster {
    const cluster: NetworkCluster = {
      id: this.generateClusterId(),
      name: `Cluster-${nodes.size}`,
      nodes,
      center: this.calculateClusterCenter(nodes),
      radius: this.calculateClusterRadius(nodes),
      density: this.calculateClusterDensity(nodes),
      internalConnections: this.countInternalConnections(nodes),
      externalConnections: this.countExternalConnections(nodes)
    };

    return cluster;
  }

  /**
   * Calculate cluster center
   */
  private calculateClusterCenter(nodes: Set<NodeId>): Coordinates {
    let totalX = 0;
    let totalY = 0;
    let count = 0;

    for (const nodeId of nodes) {
      const networkNode = this.topology.nodes.get(nodeId);
      if (networkNode) {
        const coords = networkNode.node.getCoordinates();
        totalX += coords.x;
        totalY += coords.y;
        count++;
      }
    }

    return {
      x: count > 0 ? totalX / count : 0,
      y: count > 0 ? totalY / count : 0
    };
  }

  /**
   * Calculate cluster radius
   */
  private calculateClusterRadius(nodes: Set<NodeId>): number {
    const center = this.calculateClusterCenter(nodes);
    let maxDistance = 0;

    for (const nodeId of nodes) {
      const networkNode = this.topology.nodes.get(nodeId);
      if (networkNode) {
        const coords = networkNode.node.getCoordinates();
        const distance = Math.sqrt(
          Math.pow(coords.x - center.x, 2) + Math.pow(coords.y - center.y, 2)
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    }

    return maxDistance;
  }

  /**
   * Calculate cluster density
   */
  private calculateClusterDensity(nodes: Set<NodeId>): number {
    const nodeCount = nodes.size;
    if (nodeCount < 2) return 0;

    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    const actualEdges = this.countInternalConnections(nodes);

    return actualEdges / maxPossibleEdges;
  }

  /**
   * Count internal connections in cluster
   */
  private countInternalConnections(nodes: Set<NodeId>): number {
    let count = 0;

    for (const nodeId of nodes) {
      const networkNode = this.topology.nodes.get(nodeId);
      if (networkNode) {
        for (const connection of networkNode.connections) {
          if (nodes.has(connection)) {
            count++;
          }
        }
      }
    }

    return count / 2; // Divide by 2 because we count each edge twice
  }

  /**
   * Count external connections from cluster
   */
  private countExternalConnections(nodes: Set<NodeId>): number {
    let count = 0;

    for (const nodeId of nodes) {
      const networkNode = this.topology.nodes.get(nodeId);
      if (networkNode) {
        for (const connection of networkNode.connections) {
          if (!nodes.has(connection)) {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Analyze path for critical path analysis
   */
  private analyzePath(path: NodeId[]): CriticalPath {
    const routes: RouteId[] = [];
    let totalDistance = 0;
    let totalTime = 0;
    let totalCost = 0;
    let minReliability = 1.0;
    const bottlenecks: Bottleneck[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const route = this.findRouteBetween(path[i], path[i + 1]);
      if (route) {
        routes.push(route.getId());
        totalDistance += route.getDistance();
        totalTime += route.getTravelTime();
        totalCost += route.getCost();

        const reliability = route.getReliability();
        minReliability = Math.min(minReliability, reliability);

        // Check for bottlenecks
        const networkRoute = this.topology.routes.get(route.getId());
        if (networkRoute && networkRoute.utilization > 0.8) {
          bottlenecks.push({
            routeId: route.getId(),
            type: 'capacity',
            severity: networkRoute.utilization,
            impact: 'High utilization may cause delays'
          });
        }
      }
    }

    return {
      id: this.generateCriticalPathId(),
      nodes: path,
      routes,
      totalDistance,
      totalTime,
      totalCost,
      reliability: minReliability,
      bottlenecks
    };
  }

  /**
   * Find route between two nodes
   */
  private findRouteBetween(fromNodeId: NodeId, toNodeId: NodeId): Route | null {
    for (const networkRoute of this.topology.routes.values()) {
      const route = networkRoute.route;
      if ((route.getFromNodeId() === fromNodeId && route.getToNodeId() === toNodeId) ||
          (route.isBidirectional() && route.getFromNodeId() === toNodeId && route.getToNodeId() === fromNodeId)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Get route weight based on metric
   */
  private getRouteWeight(route: Route, metric: 'distance' | 'time' | 'cost'): number {
    switch (metric) {
      case 'distance': return route.getDistance();
      case 'time': return route.getTravelTime();
      case 'cost': return route.getCost();
      default: return route.getDistance();
    }
  }

  // Utility methods for flow analysis and optimization
  private calculateRouteFlow(networkRoute: NetworkRoute): number {
    return networkRoute.utilization * networkRoute.route.getCapacity();
  }

  private calculateNodeFlow(networkNode: NetworkNode): number {
    return networkNode.inDegree + networkNode.outDegree;
  }

  private calculateBacklogTime(networkRoute: NetworkRoute): number {
    return networkRoute.congestion * 10; // Simplified calculation
  }

  private calculateCapacityIncrease(networkRoute: NetworkRoute): number {
    return networkRoute.route.getCapacity() * 0.5; // Suggest 50% increase
  }

  private calculateUnderutilizedCapacity(): number {
    let totalUnderutilized = 0;
    for (const networkRoute of this.topology.routes.values()) {
      if (networkRoute.utilization < 0.3) {
        totalUnderutilized += networkRoute.route.getCapacity() * (0.3 - networkRoute.utilization);
      }
    }
    return totalUnderutilized;
  }

  private calculateFlowEfficiency(analysis: FlowAnalysis): number {
    const totalCapacity = Array.from(this.topology.routes.values())
      .reduce((sum, nr) => sum + nr.route.getCapacity(), 0);
    return totalCapacity > 0 ? analysis.totalFlow / totalCapacity : 0;
  }

  private updateRouteMetrics(networkRoute: NetworkRoute, currentTime: TimeStamp): void {
    // Simulate metric updates
    networkRoute.utilization = Math.max(0, Math.min(1, networkRoute.utilization + (Math.random() - 0.5) * 0.1));
    networkRoute.congestion = Math.max(0, Math.min(1, networkRoute.utilization * 1.2));
    networkRoute.lastUpdated = currentTime;
  }

  private calculateNetworkMetrics(): void {
    this.metrics.totalNodes = this.topology.nodes.size;
    this.metrics.totalRoutes = this.topology.routes.size;
    this.metrics.networkDensity = this.calculateNetworkDensity();
    this.metrics.connectivity = this.calculateConnectivity();
    this.metrics.lastCalculated = { gameTime: 0, realTime: Date.now() };
  }

  private calculateNetworkDensity(): number {
    const nodeCount = this.topology.nodes.size;
    if (nodeCount < 2) return 0;

    const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
    return this.topology.routes.size / maxPossibleEdges;
  }

  private calculateConnectivity(): number {
    // Simplified connectivity measure
    return this.topology.nodes.size > 0 ? this.topology.routes.size / this.topology.nodes.size : 0;
  }

  private recordFlowHistory(currentTime: TimeStamp): void {
    const flowRecord: FlowRecord = {
      timestamp: currentTime,
      totalFlow: Array.from(this.topology.routes.values())
        .reduce((sum, nr) => sum + this.calculateRouteFlow(nr), 0),
      utilization: Array.from(this.topology.routes.values())
        .reduce((sum, nr) => sum + nr.utilization, 0) / this.topology.routes.size
    };

    this.flowHistory.push(flowRecord);

    // Keep only last 1000 records
    if (this.flowHistory.length > 1000) {
      this.flowHistory.shift();
    }
  }

  private calculateOptimizationSuggestions(): NetworkOptimization {
    return {
      suggestedRoutes: this.findSuggestedRoutes(),
      redundancyImprovements: this.findRedundancyImprovements(),
      capacityAdjustments: this.findCapacityAdjustments(),
      costReductions: this.findCostReductions(),
      reliabilityEnhancements: this.findReliabilityEnhancements()
    };
  }

  private findSuggestedRoutes(): SuggestedRoute[] {
    // Simplified suggestion algorithm
    return [];
  }

  private findRedundancyImprovements(): RedundancyImprovement[] {
    return [];
  }

  private findCapacityAdjustments(): CapacityAdjustment[] {
    return [];
  }

  private findCostReductions(): CostReduction[] {
    return [];
  }

  private findReliabilityEnhancements(): ReliabilityEnhancement[] {
    return [];
  }

  private invalidateOptimizationCache(): void {
    this.optimizationCache.clear();
  }

  private generateOptimizationCacheKey(): string {
    return `opt_${this.topology.nodes.size}_${this.topology.routes.size}_${Date.now()}`;
  }

  private generateClusterId(): string {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCriticalPathId(): string {
    return `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getTopology(): NetworkTopology {
    return { ...this.topology };
  }

  getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  getFlowHistory(): FlowRecord[] {
    return [...this.flowHistory];
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Dispose of the network and clean up resources
   */
  dispose(): void {
    this.topology.nodes.clear();
    this.topology.routes.clear();
    this.optimizationCache.clear();
    this.flowHistory = [];
    this.removeAllListeners();
  }
}

// Supporting interfaces
interface FlowRecord {
  timestamp: TimeStamp;
  totalFlow: number;
  utilization: number;
}