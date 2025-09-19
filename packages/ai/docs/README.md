# @steam-sim/ai

Intelligent agent behaviors and decision-making systems for complex simulations with behavior trees, state machines, and multi-agent coordination.

## Features

- **Behavior Trees**: Hierarchical, modular behavior systems with composite nodes, decorators, and custom actions
- **State Machines**: Finite state machines with transitions, conditions, and event-driven state changes
- **Multi-Agent Management**: Scalable agent management with memory systems, sensors, and coordination
- **Advanced AI**: Neural networks, decision networks, and hybrid brain architectures
- **Memory Systems**: Short-term, long-term, and episodic memory with automatic consolidation and decay
- **Sensor Systems**: Vision, proximity, audio, and custom sensor implementations
- **Goal-Oriented Behavior**: Dynamic goal setting, prioritization, and completion tracking
- **Flocking & Coordination**: Built-in flocking behaviors and message-passing coordination
- **Pathfinding**: A* pathfinding with obstacle avoidance and path smoothing
- **Learning Systems**: Reinforcement learning integration and behavioral adaptation

## Installation

```bash
npm install @steam-sim/ai
```

## Quick Start

```typescript
import { AgentManager, AIHelpers, AgentType, BrainType } from '@steam-sim/ai';

// Create AI system configuration
const config = {
  maxAgents: 100,
  updateInterval: 100,
  learningRate: 0.01,
  memorySize: 1000,
  decisionThreshold: 0.5
};

// Initialize agent manager
const manager = new AgentManager(config);

// Create a basic agent
const agent = AIHelpers.createBasicAgent(
  'agent-1',
  'Scout Agent',
  { x: 0, y: 0, z: 0 },
  AgentType.AUTONOMOUS
);

// Add behavior tree
const behaviorTree = AIHelpers.createSelectorNode('root', [
  AIHelpers.createBehaviorNode('patrol', 'action', (agent, blackboard) => {
    // Patrol behavior implementation
    return 'running';
  }),
  AIHelpers.createBehaviorNode('investigate', 'action', (agent, blackboard) => {
    // Investigation behavior implementation
    return 'success';
  })
]);

agent.brain.behaviorTree = {
  rootNode: behaviorTree,
  blackboard: { data: new Map(), timestamp: Date.now() },
  status: 'invalid'
};

// Create the agent
manager.createAgent(agent);

// Start the AI system
manager.start();

console.log('AI system running with intelligent agents!');
```

## Core Concepts

### Agents

Agents are autonomous entities with brains, memory, sensors, and goals:

```typescript
const agent = {
  id: 'explorer',
  name: 'Explorer Agent',
  type: AgentType.AUTONOMOUS,
  position: { x: 0, y: 0, z: 0 },
  state: AgentState.IDLE,
  brain: {
    id: 'explorer-brain',
    type: BrainType.BEHAVIOR_TREE,
    behaviorTree: myBehaviorTree,
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
      enabled: true
    }
  ],
  goals: []
};
```

### Behavior Trees

Hierarchical behavior systems with composites, decorators, and actions:

```typescript
import { BehaviorTreeEngine, NodeType, NodeStatus } from '@steam-sim/ai';

const engine = new BehaviorTreeEngine();

// Create behavior nodes
const survivalTree = AIHelpers.createSelectorNode('survival', [
  // Emergency sequence
  AIHelpers.createSequenceNode('emergency', [
    AIHelpers.createBehaviorNode('check_health', NodeType.CONDITION,
      undefined, (agent) => agent.memory.shortTerm.get('health')?.data > 30
    ),
    AIHelpers.createBehaviorNode('seek_healing', NodeType.ACTION,
      (agent, blackboard) => {
        // Healing behavior
        return NodeStatus.SUCCESS;
      }
    )
  ]),

  // Default patrol
  AIHelpers.createBehaviorNode('patrol', NodeType.ACTION,
    (agent, blackboard) => {
      // Patrol behavior
      return NodeStatus.RUNNING;
    }
  )
]);

// Execute tree
const tree = engine.createTree('survival-tree', survivalTree);
const status = engine.executeTree('survival-tree', agent);
```

### State Machines

Finite state machines with conditions and transitions:

```typescript
import { StateMachineEngine } from '@steam-sim/ai';

const stateMachine = new StateMachineEngine();

// Create state machine
const fsm = stateMachine.createStateMachine('guard-ai', 'patrol');

// Add states
const states = stateMachine.createStandardStates();
Object.values(states).forEach(state => {
  stateMachine.addState('guard-ai', state);
});

// Add transitions
const transitions = [
  {
    id: 'patrol_to_chase',
    fromState: 'patrol',
    toState: 'chase',
    condition: (agent) => {
      const enemies = agent.memory.shortTerm.get('nearbyEnemies')?.data || [];
      return enemies.length > 0;
    },
    priority: 3
  }
];

transitions.forEach(t => stateMachine.addTransition('guard-ai', t));

// Update state machine
stateMachine.updateStateMachine('guard-ai', agent, deltaTime);
```

## Advanced Features

### Multi-Agent Coordination

Agents can communicate and coordinate through messaging:

```typescript
// Send coordination message
const message = {
  id: 'coordinate-attack',
  sender: 'leader',
  receiver: 'follower-1',
  type: MessageType.COORDINATION,
  data: {
    command: 'attack_target',
    target: { x: 10, y: 5, z: 0 }
  },
  timestamp: Date.now(),
  priority: 8
};

manager.sendMessage(message);

// Agents automatically receive messages in their memory
const messages = agent.memory.shortTerm.get('message_coordinate-attack');
```

### Flocking Behavior

Built-in flocking algorithms for group movement:

```typescript
// Calculate flocking force
const neighbors = AIHelpers.getAgentsInRadius(agent.position, 5.0, allAgents);
const flockingForce = AIHelpers.calculateFlockingForce(
  agent,
  neighbors,
  1.5, // separation weight
  1.0, // alignment weight
  1.0  // cohesion weight
);

// Apply force to agent
AIHelpers.applyForce(agent, flockingForce, deltaTime);
```

### Pathfinding

A* pathfinding with obstacle avoidance:

```typescript
const start = { x: 0, y: 0, z: 0 };
const goal = { x: 10, y: 10, z: 0 };
const obstacles = [
  { x: 5, y: 5, z: 0 },
  { x: 6, y: 6, z: 0 }
];

// Find path avoiding obstacles
const path = AIHelpers.pathfind(start, goal, obstacles);

// Smooth the path
const smoothPath = AIHelpers.smoothPath(path, 0.5);

// Interpolate for higher resolution
const detailedPath = AIHelpers.interpolatePath(smoothPath, 0.1);
```

### Memory Systems

Agents have sophisticated memory with automatic consolidation:

```typescript
// Add memory to agent
const memory = AIHelpers.createMemoryItem(
  'enemy-location',
  MemoryType.PERCEPTION,
  { position: { x: 5, y: 3, z: 0 }, threat: 'high' },
  8, // importance (0-10)
  1  // strength (0-1)
);

agent.memory.shortTerm.set('enemy-location', memory);

// Important memories automatically move to long-term storage
// Unimportant memories decay over time
```

### Goal-Oriented Behavior

Agents can pursue multiple goals with priorities:

```typescript
const goal = AIHelpers.createGoal(
  'find-food',
  'Find Food Source',
  GoalType.RESOURCE,
  8, // priority
  50 // reward
);

goal.conditions = [
  {
    type: ConditionType.RESOURCE,
    parameter: 'food',
    operator: ComparisonOperator.GREATER_THAN,
    value: 80,
    weight: 1.0
  }
];

agent.goals.push(goal);
```

## Event System

The AI system emits events for monitoring and debugging:

```typescript
manager.on('agent_created', (agent) => {
  console.log(`Agent created: ${agent.name}`);
});

manager.on('agent_behavior_executed', (data) => {
  console.log(`Behavior executed: ${data.status}`);
});

manager.on('agent_state_changed', (data) => {
  console.log(`State changed: ${data.previousState} → ${data.newState}`);
});

manager.on('goal_completed', (data) => {
  console.log(`Goal completed: ${data.goalId}, reward: ${data.reward}`);
});

manager.on('message_received', (data) => {
  console.log(`Message received: ${data.message.type}`);
});
```

## Performance Monitoring

Track system performance and agent statistics:

```typescript
const stats = manager.getSystemStats();

console.log(`Total Agents: ${stats.totalAgents}`);
console.log(`Active Agents: ${stats.activeAgents}`);
console.log(`Agents by Type:`, stats.agentsByType);
console.log(`Agents by State:`, stats.agentsByState);
console.log(`Memory Usage: ${stats.memoryUsage}`);
console.log(`Message Queue: ${stats.messageQueueSize}`);
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `maxAgents` | number | Maximum number of agents | 100 |
| `updateInterval` | number | Update frequency (ms) | 100 |
| `learningRate` | number | Learning rate for neural networks | 0.01 |
| `memorySize` | number | Maximum learning data entries | 1000 |
| `decisionThreshold` | number | Decision threshold for neural networks | 0.5 |

## Examples

### Basic Patrol Agent

```typescript
const patrolAgent = AIHelpers.createBasicAgent(
  'patrol-1',
  'Patrol Guard',
  { x: 0, y: 0, z: 0 }
);

// Set up patrol waypoints
patrolAgent.memory.longTerm.set('waypoints',
  AIHelpers.createMemoryItem('waypoints', MemoryType.KNOWLEDGE, [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 10, y: 10, z: 0 },
    { x: 0, y: 10, z: 0 }
  ], 7)
);

// Create patrol behavior
const patrolTree = AIHelpers.createSimpleBehaviorTree();
patrolAgent.brain.behaviorTree = {
  rootNode: patrolTree,
  blackboard: { data: new Map(), timestamp: Date.now() },
  status: 'invalid'
};

manager.createAgent(patrolAgent);
```

### Survival Agent with Complex Behavior

```typescript
const survivalist = AIHelpers.createBasicAgent(
  'survivor',
  'Survival Specialist',
  { x: 0, y: 0, z: 0 }
);

const survivalTree = AIHelpers.createSelectorNode('survival_root', [
  // Health management
  AIHelpers.createSequenceNode('health_management', [
    AIHelpers.createBehaviorNode('low_health_check', NodeType.CONDITION,
      undefined, (agent) => {
        const health = agent.memory.shortTerm.get('health')?.data || 100;
        return health < 30;
      }
    ),
    AIHelpers.createBehaviorNode('seek_medical', NodeType.ACTION,
      (agent, blackboard) => {
        blackboard.data.set('seeking_health', true);
        return NodeStatus.RUNNING;
      }
    )
  ]),

  // Resource gathering
  AIHelpers.createSequenceNode('resource_management', [
    AIHelpers.createBehaviorNode('check_hunger', NodeType.CONDITION,
      undefined, (agent) => {
        const food = agent.memory.shortTerm.get('food')?.data || 100;
        return food < 50;
      }
    ),
    AIHelpers.createBehaviorNode('gather_food', NodeType.ACTION,
      (agent) => {
        const currentFood = agent.memory.shortTerm.get('food')?.data || 0;
        agent.memory.shortTerm.set('food',
          AIHelpers.createMemoryItem('food', MemoryType.RESOURCE,
            Math.min(100, currentFood + 10), 4)
        );
        return NodeStatus.SUCCESS;
      }
    )
  ]),

  // Default exploration
  AIHelpers.createBehaviorNode('explore', NodeType.ACTION,
    (agent) => {
      // Random exploration movement
      const direction = {
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2,
        z: 0
      };
      agent.position.x += direction.x;
      agent.position.y += direction.y;
      return NodeStatus.RUNNING;
    }
  )
]);

survivalist.brain.behaviorTree = {
  rootNode: survivalTree,
  blackboard: { data: new Map(), timestamp: Date.now() },
  status: 'invalid'
};

manager.createAgent(survivalist);
```

## License

MIT License - see LICENSE file for details.