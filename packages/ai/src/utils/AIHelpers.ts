import {
  Agent,
  BehaviorNode,
  NodeType,
  NodeStatus,
  Vector3,
  AgentType,
  AgentState,
  BrainType,
  MemoryType,
  SensorType,
  GoalType
} from '../types';

export class AIHelpers {
  public static createBasicAgent(
    id: string,
    name: string,
    position: Vector3,
    type: AgentType = AgentType.AUTONOMOUS
  ): Agent {
    return {
      id,
      name,
      type,
      position,
      state: AgentState.IDLE,
      brain: {
        id: `brain_${id}`,
        type: BrainType.BEHAVIOR_TREE,
        parameters: {}
      },
      memory: {
        shortTerm: new Map(),
        longTerm: new Map(),
        episodic: [],
        maxShortTermSize: 50,
        maxLongTermSize: 200,
        maxEpisodicSize: 100
      },
      sensors: [
        {
          id: 'vision',
          type: SensorType.VISION,
          range: 10,
          accuracy: 0.9,
          updateRate: 2,
          lastReading: {
            timestamp: 0,
            data: null,
            confidence: 0,
            source: 'vision'
          },
          enabled: true
        },
        {
          id: 'proximity',
          type: SensorType.PROXIMITY,
          range: 5,
          accuracy: 0.95,
          updateRate: 5,
          lastReading: {
            timestamp: 0,
            data: null,
            confidence: 0,
            source: 'proximity'
          },
          enabled: true
        }
      ],
      goals: [],
      lastUpdate: Date.now()
    };
  }

  public static createSimpleBehaviorTree(): BehaviorNode {
    return {
      id: 'root',
      type: NodeType.COMPOSITE,
      children: [
        {
          id: 'check_health',
          type: NodeType.CONDITION,
          children: [],
          parameters: { threshold: 50 },
          condition: (agent) => {
            const health = agent.memory.shortTerm.get('health')?.data || 100;
            return health > 50;
          }
        },
        {
          id: 'patrol_sequence',
          type: NodeType.COMPOSITE,
          children: [
            {
              id: 'find_patrol_point',
              type: NodeType.ACTION,
              children: [],
              parameters: {},
              action: (agent, blackboard) => {
                const patrolPoints = agent.memory.longTerm.get('patrolPoints')?.data || [
                  { x: 0, y: 0, z: 0 },
                  { x: 10, y: 0, z: 0 },
                  { x: 10, y: 10, z: 0 },
                  { x: 0, y: 10, z: 0 }
                ];

                const currentIndex = blackboard.data.get('patrolIndex') || 0;
                const targetPoint = patrolPoints[currentIndex];
                blackboard.data.set('targetPoint', targetPoint);

                return NodeStatus.SUCCESS;
              }
            },
            {
              id: 'move_to_patrol_point',
              type: NodeType.ACTION,
              children: [],
              parameters: {},
              action: (agent, blackboard) => {
                const targetPoint = blackboard.data.get('targetPoint');
                if (!targetPoint) return NodeStatus.FAILURE;

                const distance = AIHelpers.calculateDistance(agent.position, targetPoint);
                if (distance < 1.0) {
                  const patrolPoints = agent.memory.longTerm.get('patrolPoints')?.data || [];
                  const currentIndex = blackboard.data.get('patrolIndex') || 0;
                  const nextIndex = (currentIndex + 1) % patrolPoints.length;
                  blackboard.data.set('patrolIndex', nextIndex);
                  return NodeStatus.SUCCESS;
                }

                const direction = AIHelpers.normalize(AIHelpers.subtract(targetPoint, agent.position));
                agent.position.x += direction.x * 0.1;
                agent.position.y += direction.y * 0.1;
                agent.position.z += direction.z * 0.1;

                return NodeStatus.RUNNING;
              }
            }
          ],
          parameters: { compositeType: 'sequence' }
        }
      ],
      parameters: { compositeType: 'selector' }
    };
  }

  public static createMemoryItem(
    id: string,
    type: MemoryType,
    data: any,
    importance: number = 1,
    strength: number = 1
  ) {
    return {
      id,
      type,
      data,
      timestamp: Date.now(),
      importance,
      accessed: 1,
      strength
    };
  }

  public static createGoal(
    id: string,
    name: string,
    type: GoalType,
    priority: number = 1,
    reward: number = 10
  ) {
    return {
      id,
      name,
      type,
      priority,
      conditions: [],
      status: 'pending' as any,
      reward
    };
  }

  public static calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public static subtract(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    };
  }

  public static add(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    };
  }

  public static multiply(v: Vector3, scalar: number): Vector3 {
    return {
      x: v.x * scalar,
      y: v.y * scalar,
      z: v.z * scalar
    };
  }

  public static normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    };
  }

  public static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  public static cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  public static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t
    };
  }

  public static findNearestAgent(agent: Agent, agents: Agent[], filterPredicate?: (a: Agent) => boolean): Agent | null {
    let nearest: Agent | null = null;
    let nearestDistance = Infinity;

    for (const other of agents) {
      if (other.id === agent.id) continue;
      if (filterPredicate && !filterPredicate(other)) continue;

      const distance = this.calculateDistance(agent.position, other.position);
      if (distance < nearestDistance) {
        nearest = other;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  public static getAgentsInRadius(center: Vector3, radius: number, agents: Agent[]): Agent[] {
    return agents.filter(agent => {
      const distance = this.calculateDistance(center, agent.position);
      return distance <= radius;
    });
  }

  public static calculateFlockingForce(
    agent: Agent,
    neighbors: Agent[],
    separationWeight: number = 1.0,
    alignmentWeight: number = 1.0,
    cohesionWeight: number = 1.0
  ): Vector3 {
    if (neighbors.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const separation = this.calculateSeparation(agent, neighbors);
    const alignment = this.calculateAlignment(agent, neighbors);
    const cohesion = this.calculateCohesion(agent, neighbors);

    return {
      x: separation.x * separationWeight + alignment.x * alignmentWeight + cohesion.x * cohesionWeight,
      y: separation.y * separationWeight + alignment.y * alignmentWeight + cohesion.y * cohesionWeight,
      z: separation.z * separationWeight + alignment.z * alignmentWeight + cohesion.z * cohesionWeight
    };
  }

  private static calculateSeparation(agent: Agent, neighbors: Agent[]): Vector3 {
    const separationRadius = 2.0;
    let separation = { x: 0, y: 0, z: 0 };
    let count = 0;

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(agent.position, neighbor.position);
      if (distance < separationRadius && distance > 0) {
        const diff = this.subtract(agent.position, neighbor.position);
        const normalized = this.normalize(diff);
        const weighted = this.multiply(normalized, 1 / distance);
        separation = this.add(separation, weighted);
        count++;
      }
    }

    if (count > 0) {
      separation = this.multiply(separation, 1 / count);
    }

    return separation;
  }

  private static calculateAlignment(agent: Agent, neighbors: Agent[]): Vector3 {
    const alignmentRadius = 5.0;
    let alignment = { x: 0, y: 0, z: 0 };
    let count = 0;

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(agent.position, neighbor.position);
      if (distance < alignmentRadius) {
        const velocity = neighbor.memory.shortTerm.get('velocity')?.data || { x: 0, y: 0, z: 0 };
        alignment = this.add(alignment, velocity);
        count++;
      }
    }

    if (count > 0) {
      alignment = this.multiply(alignment, 1 / count);
      alignment = this.normalize(alignment);
    }

    return alignment;
  }

  private static calculateCohesion(agent: Agent, neighbors: Agent[]): Vector3 {
    const cohesionRadius = 8.0;
    let center = { x: 0, y: 0, z: 0 };
    let count = 0;

    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(agent.position, neighbor.position);
      if (distance < cohesionRadius) {
        center = this.add(center, neighbor.position);
        count++;
      }
    }

    if (count > 0) {
      center = this.multiply(center, 1 / count);
      const direction = this.subtract(center, agent.position);
      return this.normalize(direction);
    }

    return { x: 0, y: 0, z: 0 };
  }

  public static applyForce(agent: Agent, force: Vector3, deltaTime: number): void {
    const velocity = agent.memory.shortTerm.get('velocity')?.data || { x: 0, y: 0, z: 0 };
    const maxSpeed = 5.0;

    velocity.x += force.x * deltaTime;
    velocity.y += force.y * deltaTime;
    velocity.z += force.z * deltaTime;

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    if (speed > maxSpeed) {
      velocity.x = (velocity.x / speed) * maxSpeed;
      velocity.y = (velocity.y / speed) * maxSpeed;
      velocity.z = (velocity.z / speed) * maxSpeed;
    }

    agent.position.x += velocity.x * deltaTime;
    agent.position.y += velocity.y * deltaTime;
    agent.position.z += velocity.z * deltaTime;

    agent.memory.shortTerm.set('velocity', this.createMemoryItem('velocity', MemoryType.ACTION, velocity, 3));
  }

  public static pathfind(start: Vector3, goal: Vector3, obstacles: Vector3[] = []): Vector3[] {
    const path: Vector3[] = [];
    const stepSize = 1.0;
    const avoidanceRadius = 2.0;

    let current = { ...start };
    path.push(current);

    while (this.calculateDistance(current, goal) > stepSize) {
      let direction = this.normalize(this.subtract(goal, current));

      for (const obstacle of obstacles) {
        const obstacleDistance = this.calculateDistance(current, obstacle);
        if (obstacleDistance < avoidanceRadius) {
          const avoidance = this.normalize(this.subtract(current, obstacle));
          const weight = (avoidanceRadius - obstacleDistance) / avoidanceRadius;
          direction = this.add(direction, this.multiply(avoidance, weight));
        }
      }

      direction = this.normalize(direction);
      current = this.add(current, this.multiply(direction, stepSize));
      path.push({ ...current });

      if (path.length > 100) break;
    }

    path.push(goal);
    return path;
  }

  public static createBehaviorNode(
    id: string,
    type: NodeType,
    action?: (agent: Agent, blackboard: any) => NodeStatus,
    condition?: (agent: Agent, blackboard: any) => boolean,
    children: BehaviorNode[] = [],
    parameters: Record<string, any> = {}
  ): BehaviorNode {
    return {
      id,
      type,
      children,
      action,
      condition,
      parameters
    };
  }

  public static createSequenceNode(id: string, children: BehaviorNode[]): BehaviorNode {
    return this.createBehaviorNode(id, NodeType.COMPOSITE, undefined, undefined, children, {
      compositeType: 'sequence'
    });
  }

  public static createSelectorNode(id: string, children: BehaviorNode[]): BehaviorNode {
    return this.createBehaviorNode(id, NodeType.COMPOSITE, undefined, undefined, children, {
      compositeType: 'selector'
    });
  }

  public static createParallelNode(
    id: string,
    children: BehaviorNode[],
    successThreshold: number = 1,
    failureThreshold?: number
  ): BehaviorNode {
    return this.createBehaviorNode(id, NodeType.COMPOSITE, undefined, undefined, children, {
      compositeType: 'parallel',
      successThreshold,
      failureThreshold: failureThreshold || children.length
    });
  }

  public static smoothPath(path: Vector3[], smoothingFactor: number = 0.5): Vector3[] {
    if (path.length < 3) return path;

    const smoothed: Vector3[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];

      const smoothedPoint = {
        x: current.x + smoothingFactor * (prev.x + next.x - 2 * current.x),
        y: current.y + smoothingFactor * (prev.y + next.y - 2 * current.y),
        z: current.z + smoothingFactor * (prev.z + next.z - 2 * current.z)
      };

      smoothed.push(smoothedPoint);
    }

    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  public static interpolatePath(path: Vector3[], resolution: number = 0.1): Vector3[] {
    if (path.length < 2) return path;

    const interpolated: Vector3[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];
      const distance = this.calculateDistance(start, end);
      const steps = Math.ceil(distance / resolution);

      for (let step = 0; step < steps; step++) {
        const t = step / steps;
        const point = this.lerp(start, end, t);
        interpolated.push(point);
      }
    }

    interpolated.push(path[path.length - 1]);
    return interpolated;
  }

  public static calculateLineOfSight(from: Vector3, to: Vector3, obstacles: Vector3[]): boolean {
    const direction = this.normalize(this.subtract(to, from));
    const distance = this.calculateDistance(from, to);
    const stepSize = 0.5;
    const steps = Math.ceil(distance / stepSize);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.lerp(from, to, t);

      for (const obstacle of obstacles) {
        if (this.calculateDistance(point, obstacle) < 1.0) {
          return false;
        }
      }
    }

    return true;
  }
}