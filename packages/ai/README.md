# @steam-sim/ai

[![npm version](https://badge.fury.io/js/%40steam-sim%2Fai.svg)](https://www.npmjs.com/package/@steam-sim/ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The AI package provides comprehensive artificial intelligence systems for game development and simulations. It includes behavior trees, state machines, agent management, and intelligent decision-making algorithms specifically designed to work with Unity, Unreal Engine, and Godot.

## Features

- **Behavior Trees**: Hierarchical decision-making structures for complex AI behaviors
- **State Machines**: Finite state machines for managing agent states and transitions
- **Agent Management**: Centralized system for managing multiple AI agents
- **Flocking Behavior**: Built-in algorithms for crowd simulation and group behaviors
- **Pathfinding Integration**: Support for navigation and movement planning
- **Memory Systems**: Short-term and long-term memory for intelligent agents
- **Event-Driven Architecture**: Reactive AI systems that respond to game events

## Installation

```bash
npm install @steam-sim/ai
```

## Basic Usage

### Creating a Behavior Tree

```typescript
import { BehaviorTreeEngine, NodeType, NodeStatus } from '@steam-sim/ai';

const btEngine = new BehaviorTreeEngine();

// Create standard behavior nodes
const nodes = btEngine.createStandardNodes();

// Create a simple AI behavior tree
const rootNode = {
  id: 'patrol_tree',
  type: NodeType.COMPOSITE,
  children: [
    nodes.checkHealth(50), // Check if health > 50
    nodes.patrol([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 0, z: 10 }
    ])
  ],
  parameters: { compositeType: 'sequence' }
};

// Create and execute the tree
const tree = btEngine.createTree('guard_patrol', rootNode);

// Execute for an agent
const agent = {
  id: 'guard_01',
  position: { x: 0, y: 0, z: 0 },
  memory: {
    shortTerm: new Map([['health', { data: 75, timestamp: Date.now() }]]),
    longTerm: new Map()
  }
};

const status = btEngine.executeTree('guard_patrol', agent);
console.log('Behavior tree status:', status);
```

### Using the Agent Manager

```typescript
import { AgentManager } from '@steam-sim/ai';

const agentManager = new AgentManager();

// Create an agent
const agent = agentManager.createAgent('warrior_01', {
  position: { x: 0, y: 0, z: 0 },
  agentType: 'warrior',
  properties: {
    maxHealth: 100,
    attackPower: 25,
    speed: 5.0
  }
});

// Update agent memory
agentManager.updateAgentMemory('warrior_01', 'health', 85);
agentManager.updateAgentMemory('warrior_01', 'target', { x: 15, y: 0, z: 20 });

// Get nearby agents
const nearbyAgents = agentManager.findAgentsInRadius({ x: 0, y: 0, z: 0 }, 10);
console.log('Nearby agents:', nearbyAgents.length);
```

### State Machine Example

```typescript
import { StateMachineEngine } from '@steam-sim/ai';

const smEngine = new StateMachineEngine();

// Create a simple state machine
const patrolStateMachine = smEngine.createStateMachine('guard_states', 'patrolling', [
  {
    name: 'patrolling',
    onEnter: (agent) => console.log(`${agent.id} started patrolling`),
    onExit: (agent) => console.log(`${agent.id} stopped patrolling`),
    transitions: [
      {
        to: 'investigating',
        condition: (agent) => {
          const suspicion = agent.memory.shortTerm.get('suspicion')?.data || 0;
          return suspicion > 50;
        }
      },
      {
        to: 'combat',
        condition: (agent) => {
          const threat = agent.memory.shortTerm.get('threat');
          return threat !== undefined;
        }
      }
    ]
  },
  {
    name: 'investigating',
    onEnter: (agent) => console.log(`${agent.id} investigating disturbance`),
    transitions: [
      {
        to: 'patrolling',
        condition: (agent) => {
          const suspicion = agent.memory.shortTerm.get('suspicion')?.data || 0;
          return suspicion < 20;
        }
      },
      {
        to: 'combat',
        condition: (agent) => {
          const threat = agent.memory.shortTerm.get('threat');
          return threat !== undefined;
        }
      }
    ]
  },
  {
    name: 'combat',
    onEnter: (agent) => console.log(`${agent.id} entering combat`),
    transitions: [
      {
        to: 'patrolling',
        condition: (agent) => {
          const threat = agent.memory.shortTerm.get('threat');
          return threat === undefined;
        }
      }
    ]
  }
]);

// Update state machine
smEngine.updateStateMachine('guard_states', agent);
```

## Game Engine Integration

This package is designed to work seamlessly with popular game engines:

### Unity Integration
See [examples/unity/README.md](examples/unity/README.md) for detailed Unity integration guide.

- Uses ClearScript V8 or Jint for JavaScript execution
- Provides C# bridge classes for easy integration
- Includes Unity-specific examples and best practices

### Godot Integration
See [examples/godot/README.md](examples/godot/README.md) for detailed Godot integration guide.

- Leverages Godot's built-in JavaScript/V8 support
- GDScript bridge for seamless communication
- Node-based integration examples

### Unreal Engine Integration
See [examples/unreal/README.md](examples/unreal/README.md) for detailed Unreal integration guide.

- Uses Unreal's JavaScript engine or embedded V8
- C++ and Blueprint integration examples
- Performance optimization guidelines

## API Reference

### BehaviorTreeEngine

The main class for creating and executing behavior trees.

#### Methods

- `createTree(id: string, rootNode: BehaviorNode): BehaviorTree`
- `executeTree(treeId: string, agent: Agent): NodeStatus`
- `getTree(id: string): BehaviorTree | undefined`
- `removeTree(id: string): boolean`
- `createStandardNodes(): StandardNodes`

### AgentManager

Centralized management system for AI agents.

#### Methods

- `createAgent(id: string, config: AgentConfig): Agent`
- `removeAgent(id: string): boolean`
- `getAgent(id: string): Agent | undefined`
- `updateAgentMemory(agentId: string, key: string, value: any): void`
- `findAgentsInRadius(center: Vector3, radius: number): Agent[]`

### StateMachineEngine

Finite state machine implementation for agent behavior.

#### Methods

- `createStateMachine(id: string, initialState: string, states: State[]): StateMachine`
- `updateStateMachine(id: string, agent: Agent): void`
- `forceStateTransition(id: string, agent: Agent, newState: string): boolean`

## Events

The AI system emits various events for monitoring and debugging:

- `tree_created`: When a new behavior tree is created
- `tree_executed`: When a behavior tree is executed
- `node_executing`: When a behavior tree node starts executing
- `node_executed`: When a behavior tree node finishes executing
- `agent_created`: When a new agent is created
- `agent_removed`: When an agent is removed
- `state_changed`: When an agent's state changes

```typescript
btEngine.on('tree_executed', (data) => {
  console.log(`Tree ${data.treeId} executed for agent ${data.agent} with status ${data.status}`);
});
```

## Performance Considerations

- Behavior trees are executed synchronously - consider spreading execution across frames for large numbers of agents
- Use memory cleanup methods to prevent memory leaks in long-running simulations
- Consider using the `timeout` decorator for long-running actions
- Optimize condition checks as they run frequently

## Contributing

Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting pull requests.

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Support

- Documentation: [Steam Simulation Toolkit Docs](https://docs.steam-sim.com)
- Issues: [GitHub Issues](https://github.com/steam-sim/toolkit/issues)
- Community: [Discord Server](https://discord.gg/steam-sim)