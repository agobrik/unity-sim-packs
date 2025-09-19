import { EventEmitter } from '../utils/EventEmitter';
import {
  BehaviorTree,
  BehaviorNode,
  NodeType,
  NodeStatus,
  DecoratorType,
  Blackboard,
  Agent,
  Vector3
} from '../types';

export class BehaviorTreeEngine extends EventEmitter {
  private trees: Map<string, BehaviorTree> = new Map();

  public createTree(id: string, rootNode: BehaviorNode): BehaviorTree {
    const tree: BehaviorTree = {
      rootNode,
      blackboard: {
        data: new Map(),
        timestamp: Date.now()
      },
      status: NodeStatus.INVALID
    };

    this.trees.set(id, tree);
    this.emit('tree_created', { id, tree });
    return tree;
  }

  public executeTree(treeId: string, agent: Agent): NodeStatus {
    const tree = this.trees.get(treeId);
    if (!tree) return NodeStatus.FAILURE;

    tree.blackboard.timestamp = Date.now();
    tree.status = this.executeNode(tree.rootNode, agent, tree.blackboard);

    this.emit('tree_executed', {
      treeId,
      agent: agent.id,
      status: tree.status,
      timestamp: Date.now()
    });

    return tree.status;
  }

  private executeNode(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    this.emit('node_executing', { nodeId: node.id, agentId: agent.id });

    let status: NodeStatus;

    switch (node.type) {
      case NodeType.COMPOSITE:
        status = this.executeComposite(node, agent, blackboard);
        break;
      case NodeType.DECORATOR:
        status = this.executeDecorator(node, agent, blackboard);
        break;
      case NodeType.ACTION:
        status = this.executeAction(node, agent, blackboard);
        break;
      case NodeType.CONDITION:
        status = this.executeCondition(node, agent, blackboard);
        break;
      default:
        status = NodeStatus.FAILURE;
    }

    this.emit('node_executed', {
      nodeId: node.id,
      agentId: agent.id,
      status,
      timestamp: Date.now()
    });

    return status;
  }

  private executeComposite(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    const compositeType = node.parameters.compositeType || 'sequence';

    switch (compositeType) {
      case 'sequence':
        return this.executeSequence(node, agent, blackboard);
      case 'selector':
        return this.executeSelector(node, agent, blackboard);
      case 'parallel':
        return this.executeParallel(node, agent, blackboard);
      default:
        return NodeStatus.FAILURE;
    }
  }

  private executeSequence(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    for (const child of node.children) {
      const status = this.executeNode(child, agent, blackboard);

      if (status === NodeStatus.FAILURE) {
        return NodeStatus.FAILURE;
      }

      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
    }

    return NodeStatus.SUCCESS;
  }

  private executeSelector(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    for (const child of node.children) {
      const status = this.executeNode(child, agent, blackboard);

      if (status === NodeStatus.SUCCESS) {
        return NodeStatus.SUCCESS;
      }

      if (status === NodeStatus.RUNNING) {
        return NodeStatus.RUNNING;
      }
    }

    return NodeStatus.FAILURE;
  }

  private executeParallel(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    const successThreshold = node.parameters.successThreshold || 1;
    const failureThreshold = node.parameters.failureThreshold || node.children.length;

    let successCount = 0;
    let failureCount = 0;
    let runningCount = 0;

    for (const child of node.children) {
      const status = this.executeNode(child, agent, blackboard);

      switch (status) {
        case NodeStatus.SUCCESS:
          successCount++;
          break;
        case NodeStatus.FAILURE:
          failureCount++;
          break;
        case NodeStatus.RUNNING:
          runningCount++;
          break;
      }
    }

    if (successCount >= successThreshold) {
      return NodeStatus.SUCCESS;
    }

    if (failureCount >= failureThreshold) {
      return NodeStatus.FAILURE;
    }

    return NodeStatus.RUNNING;
  }

  private executeDecorator(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    if (node.children.length !== 1) {
      return NodeStatus.FAILURE;
    }

    const child = node.children[0];
    const decoratorType = node.decoratorType || DecoratorType.INVERTER;

    switch (decoratorType) {
      case DecoratorType.INVERTER:
        const status = this.executeNode(child, agent, blackboard);
        return status === NodeStatus.SUCCESS ? NodeStatus.FAILURE :
               status === NodeStatus.FAILURE ? NodeStatus.SUCCESS : status;

      case DecoratorType.REPEATER:
        const maxRepeats = node.parameters.maxRepeats || 1;
        let lastStatus = NodeStatus.RUNNING;

        for (let i = 0; i < maxRepeats; i++) {
          lastStatus = this.executeNode(child, agent, blackboard);
          if (lastStatus === NodeStatus.FAILURE) {
            return NodeStatus.FAILURE;
          }
        }

        return lastStatus;

      case DecoratorType.RETRY:
        const maxRetries = node.parameters.maxRetries || 3;

        for (let i = 0; i < maxRetries; i++) {
          const retryStatus = this.executeNode(child, agent, blackboard);
          if (retryStatus === NodeStatus.SUCCESS) {
            return NodeStatus.SUCCESS;
          }
          if (retryStatus === NodeStatus.RUNNING) {
            return NodeStatus.RUNNING;
          }
        }

        return NodeStatus.FAILURE;

      case DecoratorType.TIMEOUT:
        const timeoutMs = node.parameters.timeoutMs || 1000;
        const startTime = blackboard.data.get(`timeout_${node.id}`) || Date.now();

        if (!blackboard.data.has(`timeout_${node.id}`)) {
          blackboard.data.set(`timeout_${node.id}`, startTime);
        }

        if (Date.now() - startTime > timeoutMs) {
          blackboard.data.delete(`timeout_${node.id}`);
          return NodeStatus.FAILURE;
        }

        const timeoutStatus = this.executeNode(child, agent, blackboard);
        if (timeoutStatus !== NodeStatus.RUNNING) {
          blackboard.data.delete(`timeout_${node.id}`);
        }

        return timeoutStatus;

      case DecoratorType.COOLDOWN:
        const cooldownMs = node.parameters.cooldownMs || 1000;
        const lastExecution = blackboard.data.get(`cooldown_${node.id}`) || 0;

        if (Date.now() - lastExecution < cooldownMs) {
          return NodeStatus.FAILURE;
        }

        const cooldownStatus = this.executeNode(child, agent, blackboard);
        if (cooldownStatus === NodeStatus.SUCCESS) {
          blackboard.data.set(`cooldown_${node.id}`, Date.now());
        }

        return cooldownStatus;

      default:
        return NodeStatus.FAILURE;
    }
  }

  private executeAction(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    if (!node.action) {
      return NodeStatus.FAILURE;
    }

    try {
      return node.action(agent, blackboard);
    } catch (error) {
      this.emit('action_error', {
        nodeId: node.id,
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      return NodeStatus.FAILURE;
    }
  }

  private executeCondition(node: BehaviorNode, agent: Agent, blackboard: Blackboard): NodeStatus {
    if (!node.condition) {
      return NodeStatus.FAILURE;
    }

    try {
      return node.condition(agent, blackboard) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    } catch (error) {
      this.emit('condition_error', {
        nodeId: node.id,
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
      return NodeStatus.FAILURE;
    }
  }

  public getTree(id: string): BehaviorTree | undefined {
    return this.trees.get(id);
  }

  public removeTree(id: string): boolean {
    return this.trees.delete(id);
  }

  public getAllTrees(): BehaviorTree[] {
    return Array.from(this.trees.values());
  }

  public createStandardNodes(): {
    moveToTarget: (target: Vector3) => BehaviorNode;
    checkHealth: (threshold: number) => BehaviorNode;
    findNearestResource: (resourceType: string) => BehaviorNode;
    attack: (targetId: string) => BehaviorNode;
    flee: () => BehaviorNode;
    patrol: (waypoints: Vector3[]) => BehaviorNode;
  } {
    return {
      moveToTarget: (target) => ({
        id: `move_to_${Date.now()}`,
        type: NodeType.ACTION,
        children: [],
        parameters: { target },
        action: (agent, blackboard) => {
          const distance = this.calculateDistance(agent.position, target);
          if (distance < 1.0) {
            return NodeStatus.SUCCESS;
          }

          const direction = this.normalize(this.subtract(target, agent.position));
          agent.position.x += direction.x * 0.1;
          agent.position.y += direction.y * 0.1;
          agent.position.z += direction.z * 0.1;

          return NodeStatus.RUNNING;
        }
      }),

      checkHealth: (threshold) => ({
        id: `check_health_${Date.now()}`,
        type: NodeType.CONDITION,
        children: [],
        parameters: { threshold },
        condition: (agent) => {
          const health = agent.memory.shortTerm.get('health')?.data || 100;
          return health > threshold;
        }
      }),

      findNearestResource: (resourceType) => ({
        id: `find_resource_${Date.now()}`,
        type: NodeType.ACTION,
        children: [],
        parameters: { resourceType },
        action: (agent, blackboard) => {
          const resources = blackboard.data.get('nearbyResources') || [];
          const targetResource = resources.find((r: any) => r.type === resourceType);

          if (targetResource) {
            blackboard.data.set('targetResource', targetResource);
            return NodeStatus.SUCCESS;
          }

          return NodeStatus.FAILURE;
        }
      }),

      attack: (targetId) => ({
        id: `attack_${Date.now()}`,
        type: NodeType.ACTION,
        children: [],
        parameters: { targetId },
        action: (agent, blackboard) => {
          const target = blackboard.data.get('target');
          if (!target) return NodeStatus.FAILURE;

          const distance = this.calculateDistance(agent.position, target.position);
          if (distance > 2.0) {
            return NodeStatus.FAILURE;
          }

          const damage = agent.memory.shortTerm.get('attackPower')?.data || 10;
          this.emit('agent_attack', {
            attacker: agent.id,
            target: targetId,
            damage,
            timestamp: Date.now()
          });

          return NodeStatus.SUCCESS;
        }
      }),

      flee: () => ({
        id: `flee_${Date.now()}`,
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: (agent, blackboard) => {
          const threats = blackboard.data.get('threats') || [];
          if (threats.length === 0) return NodeStatus.SUCCESS;

          const averageThreatPosition = threats.reduce((sum: Vector3, threat: any) => ({
            x: sum.x + threat.position.x,
            y: sum.y + threat.position.y,
            z: sum.z + threat.position.z
          }), { x: 0, y: 0, z: 0 });

          averageThreatPosition.x /= threats.length;
          averageThreatPosition.y /= threats.length;
          averageThreatPosition.z /= threats.length;

          const fleeDirection = this.normalize(this.subtract(agent.position, averageThreatPosition));
          agent.position.x += fleeDirection.x * 0.2;
          agent.position.y += fleeDirection.y * 0.2;
          agent.position.z += fleeDirection.z * 0.2;

          return NodeStatus.RUNNING;
        }
      }),

      patrol: (waypoints) => ({
        id: `patrol_${Date.now()}`,
        type: NodeType.ACTION,
        children: [],
        parameters: { waypoints },
        action: (agent, blackboard) => {
          const currentWaypointIndex = blackboard.data.get('currentWaypoint') || 0;
          const currentWaypoint = waypoints[currentWaypointIndex];

          const distance = this.calculateDistance(agent.position, currentWaypoint);
          if (distance < 1.0) {
            const nextIndex = (currentWaypointIndex + 1) % waypoints.length;
            blackboard.data.set('currentWaypoint', nextIndex);
            return NodeStatus.SUCCESS;
          }

          const direction = this.normalize(this.subtract(currentWaypoint, agent.position));
          agent.position.x += direction.x * 0.1;
          agent.position.y += direction.y * 0.1;
          agent.position.z += direction.z * 0.1;

          return NodeStatus.RUNNING;
        }
      })
    };
  }

  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private subtract(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    };
  }

  private normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }
}