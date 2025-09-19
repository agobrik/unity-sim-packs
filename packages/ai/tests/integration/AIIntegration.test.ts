import { AgentManager } from '../../src/core/AgentManager';
import { BehaviorTreeEngine } from '../../src/core/BehaviorTree';
import { StateMachineEngine } from '../../src/core/StateMachine';
import { AIHelpers } from '../../src/utils/AIHelpers';
import {
  AISystemConfig,
  AgentType,
  AgentState,
  BrainType,
  NodeType,
  NodeStatus,
  MessageType
} from '../../src/types';

describe('AI System Integration Tests', () => {
  let manager: AgentManager;
  let config: AISystemConfig;

  beforeEach(() => {
    config = {
      maxAgents: 50,
      updateInterval: 50,
      learningRate: 0.01,
      memorySize: 500,
      decisionThreshold: 0.5
    };
    manager = new AgentManager(config);
  });

  afterEach(() => {
    manager.stop();
  });

  test('should simulate complete agent ecosystem', async () => {
    const predator = AIHelpers.createBasicAgent('predator', 'Predator', { x: 0, y: 0, z: 0 });
    predator.type = AgentType.AUTONOMOUS;
    predator.brain.type = BrainType.BEHAVIOR_TREE;

    const behaviorTree = AIHelpers.createSelectorNode('root', [
      AIHelpers.createBehaviorNode(
        'hunt',
        NodeType.ACTION,
        (agent, blackboard) => {
          const prey = blackboard.data.get('nearestPrey');
          if (prey) {
            const direction = AIHelpers.normalize(
              AIHelpers.subtract(prey.position, agent.position)
            );
            agent.position.x += direction.x * 0.2;
            agent.position.y += direction.y * 0.2;
            agent.position.z += direction.z * 0.2;
            return NodeStatus.RUNNING;
          }
          return NodeStatus.FAILURE;
        }
      ),
      AIHelpers.createBehaviorNode(
        'patrol',
        NodeType.ACTION,
        (agent, blackboard) => {
          const patrolRadius = 5;
          const angle = (Date.now() / 1000) % (2 * Math.PI);
          const targetX = Math.cos(angle) * patrolRadius;
          const targetY = Math.sin(angle) * patrolRadius;

          const direction = AIHelpers.normalize({
            x: targetX - agent.position.x,
            y: targetY - agent.position.y,
            z: 0
          });

          agent.position.x += direction.x * 0.1;
          agent.position.y += direction.y * 0.1;

          return NodeStatus.RUNNING;
        }
      )
    ]);

    predator.brain.behaviorTree = {
      rootNode: behaviorTree,
      blackboard: { data: new Map(), timestamp: Date.now() },
      status: NodeStatus.INVALID
    };

    const prey = AIHelpers.createBasicAgent('prey', 'Prey', { x: 10, y: 10, z: 0 });
    prey.type = AgentType.REACTIVE;
    prey.brain.type = BrainType.STATE_MACHINE;

    const flockingAgents = Array.from({ length: 5 }, (_, i) => {
      const agent = AIHelpers.createBasicAgent(
        `flock_${i}`,
        `Flock Agent ${i}`,
        {
          x: Math.random() * 20 - 10,
          y: Math.random() * 20 - 10,
          z: 0
        }
      );
      agent.type = AgentType.HYBRID;
      return agent;
    });

    manager.createAgent(predator);
    manager.createAgent(prey);
    flockingAgents.forEach(agent => manager.createAgent(agent));

    let behaviorsExecuted = 0;
    let stateChanges = 0;
    let agentUpdates = 0;

    manager.on('agent_behavior_executed', () => {
      behaviorsExecuted++;
    });

    manager.on('agent_state_changed', () => {
      stateChanges++;
    });

    manager.on('agent_updated', () => {
      agentUpdates++;
    });

    manager.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    manager.stop();

    expect(behaviorsExecuted).toBeGreaterThan(0);
    expect(agentUpdates).toBeGreaterThan(0);

    const finalPredator = manager.getAgent('predator');
    const finalPrey = manager.getAgent('prey');

    expect(finalPredator?.position).not.toEqual({ x: 0, y: 0, z: 0 });
    expect(finalPrey?.position).toBeDefined();

    const stats = manager.getSystemStats();
    expect(stats.totalAgents).toBe(7);
    expect(stats.activeAgents).toBeGreaterThan(0);
  });

  test('should demonstrate flocking behavior', async () => {
    const flockSize = 10;
    const agents = Array.from({ length: flockSize }, (_, i) => {
      const agent = AIHelpers.createBasicAgent(
        `boid_${i}`,
        `Boid ${i}`,
        {
          x: Math.random() * 10,
          y: Math.random() * 10,
          z: 0
        }
      );

      agent.memory.shortTerm.set('velocity', {
        id: 'velocity',
        type: 'action' as any,
        data: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          z: 0
        },
        timestamp: Date.now(),
        importance: 3,
        accessed: 1,
        strength: 1
      });

      const flockingBehavior = AIHelpers.createBehaviorNode(
        'flock',
        NodeType.ACTION,
        (flockAgent) => {
          const allAgents = manager.getAllAgents();
          const neighbors = AIHelpers.getAgentsInRadius(
            flockAgent.position,
            5.0,
            allAgents.filter(a => a.id !== flockAgent.id)
          );

          const flockingForce = AIHelpers.calculateFlockingForce(
            flockAgent,
            neighbors,
            1.5,
            1.0,
            1.0
          );

          AIHelpers.applyForce(flockAgent, flockingForce, 0.05);

          return NodeStatus.SUCCESS;
        }
      );

      agent.brain.behaviorTree = {
        rootNode: flockingBehavior,
        blackboard: { data: new Map(), timestamp: Date.now() },
        status: NodeStatus.INVALID
      };

      return agent;
    });

    agents.forEach(agent => manager.createAgent(agent));

    const initialPositions = agents.map(agent => ({ ...agent.position }));

    manager.start();
    await new Promise(resolve => setTimeout(resolve, 2000));
    manager.stop();

    const finalAgents = agents.map(agent => manager.getAgent(agent.id)!);
    const finalPositions = finalAgents.map(agent => ({ ...agent.position }));

    let movedAgents = 0;
    for (let i = 0; i < agents.length; i++) {
      const distance = AIHelpers.calculateDistance(initialPositions[i], finalPositions[i]);
      if (distance > 0.1) {
        movedAgents++;
      }
    }

    expect(movedAgents).toBeGreaterThan(flockSize * 0.8);

    const centerX = finalPositions.reduce((sum, pos) => sum + pos.x, 0) / finalPositions.length;
    const centerY = finalPositions.reduce((sum, pos) => sum + pos.y, 0) / finalPositions.length;

    const averageDistanceFromCenter = finalPositions.reduce((sum, pos) => {
      return sum + Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
    }, 0) / finalPositions.length;

    expect(averageDistanceFromCenter).toBeLessThan(8);
  });

  test('should handle complex behavior trees', async () => {
    const complexAgent = AIHelpers.createBasicAgent('complex', 'Complex Agent', { x: 0, y: 0, z: 0 });

    const survivalTree = AIHelpers.createSelectorNode('survival_root', [
      AIHelpers.createSequenceNode('emergency_response', [
        AIHelpers.createBehaviorNode(
          'check_low_health',
          NodeType.CONDITION,
          undefined,
          (agent) => {
            const health = agent.memory.shortTerm.get('health')?.data || 100;
            return health < 30;
          }
        ),
        AIHelpers.createBehaviorNode(
          'find_healing',
          NodeType.ACTION,
          (agent, blackboard) => {
            blackboard.data.set('seekingHealth', true);
            return NodeStatus.SUCCESS;
          }
        )
      ]),

      AIHelpers.createSequenceNode('resource_gathering', [
        AIHelpers.createBehaviorNode(
          'check_resources',
          NodeType.CONDITION,
          undefined,
          (agent) => {
            const food = agent.memory.shortTerm.get('food')?.data || 100;
            return food < 50;
          }
        ),
        AIHelpers.createBehaviorNode(
          'gather_food',
          NodeType.ACTION,
          (agent, blackboard) => {
            const food = agent.memory.shortTerm.get('food')?.data || 100;
            agent.memory.shortTerm.set('food', {
              id: 'food',
              type: 'resource' as any,
              data: Math.min(100, food + 5),
              timestamp: Date.now(),
              importance: 4,
              accessed: 1,
              strength: 1
            });
            return NodeStatus.SUCCESS;
          }
        )
      ]),

      AIHelpers.createBehaviorNode(
        'idle_behavior',
        NodeType.ACTION,
        (agent) => {
          agent.memory.shortTerm.set('isIdle', {
            id: 'isIdle',
            type: 'emotion' as any,
            data: true,
            timestamp: Date.now(),
            importance: 1,
            accessed: 1,
            strength: 1
          });
          return NodeStatus.SUCCESS;
        }
      )
    ]);

    complexAgent.brain.behaviorTree = {
      rootNode: survivalTree,
      blackboard: { data: new Map(), timestamp: Date.now() },
      status: NodeStatus.INVALID
    };

    complexAgent.memory.shortTerm.set('health', {
      id: 'health',
      type: 'perception' as any,
      data: 25,
      timestamp: Date.now(),
      importance: 5,
      accessed: 1,
      strength: 1
    });

    complexAgent.memory.shortTerm.set('food', {
      id: 'food',
      type: 'resource' as any,
      data: 30,
      timestamp: Date.now(),
      importance: 4,
      accessed: 1,
      strength: 1
    });

    manager.createAgent(complexAgent);

    let emergencyTriggered = false;
    let resourceGathered = false;

    manager.on('agent_behavior_executed', (data) => {
      if (data.agent === 'complex') {
        const agent = manager.getAgent('complex');
        if (agent?.brain.behaviorTree?.blackboard.data.get('seekingHealth')) {
          emergencyTriggered = true;
        }
        const food = agent?.memory.shortTerm.get('food')?.data || 0;
        if (food > 30) {
          resourceGathered = true;
        }
      }
    });

    manager.start();
    await new Promise(resolve => setTimeout(resolve, 500));
    manager.stop();

    expect(emergencyTriggered).toBe(true);
    expect(resourceGathered).toBe(true);
  });

  test('should coordinate multiple agents through messaging', async () => {
    const leader = AIHelpers.createBasicAgent('leader', 'Leader', { x: 0, y: 0, z: 0 });
    const followers = Array.from({ length: 3 }, (_, i) =>
      AIHelpers.createBasicAgent(`follower_${i}`, `Follower ${i}`, { x: i * 2, y: 0, z: 0 })
    );

    const coordinationBehavior = AIHelpers.createBehaviorNode(
      'coordinate',
      NodeType.ACTION,
      (agent) => {
        if (agent.id === 'leader') {
          const message = {
            id: `cmd_${Date.now()}`,
            sender: 'leader',
            receiver: 'follower_0',
            type: MessageType.COORDINATION,
            data: {
              command: 'move_to',
              target: { x: 5, y: 5, z: 0 }
            },
            timestamp: Date.now(),
            priority: 8
          };
          manager.sendMessage(message);
        } else {
          const messages = Array.from(agent.memory.shortTerm.values())
            .filter(mem => mem.id.startsWith('message_'));

          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            if (latestMessage.data.data.command === 'move_to') {
              const target = latestMessage.data.data.target;
              const direction = AIHelpers.normalize(
                AIHelpers.subtract(target, agent.position)
              );
              agent.position.x += direction.x * 0.1;
              agent.position.y += direction.y * 0.1;
            }
          }
        }
        return NodeStatus.SUCCESS;
      }
    );

    leader.brain.behaviorTree = {
      rootNode: coordinationBehavior,
      blackboard: { data: new Map(), timestamp: Date.now() },
      status: NodeStatus.INVALID
    };

    followers.forEach(follower => {
      follower.brain.behaviorTree = {
        rootNode: coordinationBehavior,
        blackboard: { data: new Map(), timestamp: Date.now() },
        status: NodeStatus.INVALID
      };
    });

    manager.createAgent(leader);
    followers.forEach(follower => manager.createAgent(follower));

    let messagesReceived = 0;
    manager.on('message_received', () => {
      messagesReceived++;
    });

    const initialPositions = followers.map(f => ({ ...f.position }));

    manager.start();
    await new Promise(resolve => setTimeout(resolve, 1000));
    manager.stop();

    expect(messagesReceived).toBeGreaterThan(0);

    const finalFollowers = followers.map(f => manager.getAgent(f.id)!);
    let movedFollowers = 0;

    for (let i = 0; i < followers.length; i++) {
      const distance = AIHelpers.calculateDistance(
        initialPositions[i],
        finalFollowers[i].position
      );
      if (distance > 0.1) {
        movedFollowers++;
      }
    }

    expect(movedFollowers).toBeGreaterThan(0);
  });

  test('should demonstrate state machine behavior', async () => {
    const stateMachineEngine = new StateMachineEngine();
    const guardAgent = AIHelpers.createBasicAgent('guard', 'Guard Agent', { x: 0, y: 0, z: 0 });

    guardAgent.brain.type = BrainType.STATE_MACHINE;

    const machine = stateMachineEngine.createStateMachine('guard-fsm', 'patrol');

    const states = stateMachineEngine.createStandardStates();
    Object.values(states).forEach(state => {
      stateMachineEngine.addState('guard-fsm', state);
    });

    const transitions = stateMachineEngine.createStandardTransitions();
    transitions.forEach(transition => {
      stateMachineEngine.addTransition('guard-fsm', transition);
    });

    guardAgent.memory.longTerm.set('waypoints', {
      id: 'waypoints',
      type: 'knowledge' as any,
      data: [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 5, y: 5, z: 0 },
        { x: 0, y: 5, z: 0 }
      ],
      timestamp: Date.now(),
      importance: 7,
      accessed: 1,
      strength: 1
    });

    guardAgent.memory.shortTerm.set('health', {
      id: 'health',
      type: 'perception' as any,
      data: 100,
      timestamp: Date.now(),
      importance: 5,
      accessed: 1,
      strength: 1
    });

    let stateChanges = 0;
    stateMachineEngine.on('state_changed', () => {
      stateChanges++;
    });

    for (let i = 0; i < 50; i++) {
      stateMachineEngine.updateStateMachine('guard-fsm', guardAgent, 50);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(stateChanges).toBeGreaterThanOrEqual(0);

    const finalState = stateMachineEngine.getCurrentState('guard-fsm');
    expect(finalState).toBeDefined();

    const distance = AIHelpers.calculateDistance(
      guardAgent.position,
      { x: 0, y: 0, z: 0 }
    );
    expect(distance).toBeGreaterThan(0);
  });

  test('should handle memory consolidation and decay', async () => {
    const memoryAgent = AIHelpers.createBasicAgent('memory', 'Memory Agent', { x: 0, y: 0, z: 0 });
    manager.createAgent(memoryAgent);

    const agent = manager.getAgent('memory')!;

    agent.memory.shortTerm.set('important-fact', {
      id: 'important-fact',
      type: 'knowledge' as any,
      data: 'crucial information',
      timestamp: Date.now(),
      importance: 9,
      accessed: 1,
      strength: 1
    });

    agent.memory.shortTerm.set('trivial-fact', {
      id: 'trivial-fact',
      type: 'perception' as any,
      data: 'unimportant data',
      timestamp: Date.now() - 3600000,
      importance: 2,
      accessed: 1,
      strength: 0.05
    });

    const initialShortTermSize = agent.memory.shortTerm.size;

    manager.start();
    await new Promise(resolve => setTimeout(resolve, 500));
    manager.stop();

    const updatedAgent = manager.getAgent('memory')!;

    expect(updatedAgent.memory.longTerm.get('important-fact')).toBeDefined();

    expect(updatedAgent.memory.shortTerm.size).toBeLessThanOrEqual(initialShortTermSize);
  });

  test('should demonstrate pathfinding and navigation', () => {
    const start = { x: 0, y: 0, z: 0 };
    const goal = { x: 10, y: 10, z: 0 };
    const obstacles = [
      { x: 5, y: 5, z: 0 },
      { x: 6, y: 6, z: 0 },
      { x: 4, y: 6, z: 0 }
    ];

    const path = AIHelpers.pathfind(start, goal, obstacles);

    expect(path.length).toBeGreaterThan(2);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(goal);

    for (let i = 1; i < path.length - 1; i++) {
      const point = path[i];
      let tooCloseToObstacle = false;

      for (const obstacle of obstacles) {
        const distance = AIHelpers.calculateDistance(point, obstacle);
        if (distance < 1.5) {
          tooCloseToObstacle = true;
          break;
        }
      }

      expect(tooCloseToObstacle).toBe(false);
    }

    const smoothedPath = AIHelpers.smoothPath(path, 0.3);
    expect(smoothedPath.length).toBe(path.length);

    const interpolatedPath = AIHelpers.interpolatePath(path, 0.5);
    expect(interpolatedPath.length).toBeGreaterThan(path.length);
  });
});