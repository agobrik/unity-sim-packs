# @steam-sim/ai-decision-framework

Advanced AI decision making framework with behavior trees, state machines, goal-oriented planning, and intelligent memory systems for Unity-based Steam games.

## Features

- **Hierarchical Behavior Trees**: 15+ node types including composites, decorators, and intelligent leaf nodes
- **Advanced State Machines**: Context-aware transitions, hierarchical states, state history tracking
- **Goal-Oriented Action Planning (GOAP)**: A* pathfinding for action sequences with dynamic replanning
- **Multi-Modal Memory System**: Short-term, long-term, episodic, and semantic memory with decay
- **Personality System**: Trait-based decision making affecting behavior patterns
- **Social Intelligence**: Relationship modeling, group dynamics, emotional state management
- **Unity AI Integration**: Visual debugging, performance monitoring, component-based architecture

## Installation

```bash
npm install @steam-sim/ai-decision-framework
```

## Quick Start

```typescript
import { AIDecisionFrameworkSimulation } from '@steam-sim/ai-decision-framework';

// Create AI simulation
const aiSimulation = new AIDecisionFrameworkSimulation({
  maxAgents: 100,
  memoryDecayRate: 0.1,
  planningComplexity: 'medium',
  enableLearning: true
});

// Create intelligent NPC
const npc = aiSimulation.createAgent('guard_001', {
  personality: {
    aggression: 0.7,
    curiosity: 0.4,
    sociability: 0.6,
    intelligence: 0.8
  },
  goals: ['patrol_area', 'investigate_sounds', 'protect_base'],
  initialState: 'patrolling'
});

// Setup behavior tree
const behaviorTree = aiSimulation.createBehaviorTree(npc.id, {
  rootNode: 'sequence',
  nodes: [
    { type: 'condition', check: 'enemy_detected' },
    { type: 'action', action: 'engage_enemy' },
    { type: 'action', action: 'call_reinforcements' }
  ]
});

// Start AI simulation
aiSimulation.start();

// Monitor AI behavior
const agentStatus = aiSimulation.getAgentStatus('guard_001');
console.log(`Current state: ${agentStatus.currentState}`);
console.log(`Active goal: ${agentStatus.activeGoal}`);
console.log(`Memory items: ${agentStatus.memoryCount}`);

// Export for Unity
const aiData = aiSimulation.exportState();
```

## Core Systems

### Behavior Trees
Hierarchical decision making with intelligent node composition:

```typescript
// Create sophisticated behavior tree
const combatTree = {
  rootNode: 'selector',
  nodes: [
    // High priority: Handle immediate threats
    {
      type: 'sequence',
      children: [
        { type: 'condition', check: 'under_attack' },
        { type: 'selector', children: [
          {
            type: 'sequence',
            children: [
              { type: 'condition', check: 'can_counter_attack' },
              { type: 'action', action: 'counter_attack' }
            ]
          },
          { type: 'action', action: 'take_cover' }
        ]}
      ]
    },
    // Medium priority: Engage nearby enemies
    {
      type: 'sequence',
      children: [
        { type: 'condition', check: 'enemy_in_range' },
        { type: 'decorator', decorator: 'cooldown', duration: 2000,
          child: { type: 'action', action: 'attack_enemy' }
        }
      ]
    },
    // Low priority: Patrol behavior
    { type: 'action', action: 'patrol' }
  ]
};
```

#### Behavior Tree Node Types

**Composite Nodes:**
- **Sequence**: Execute children in order, fail if any child fails
- **Selector**: Try children until one succeeds
- **Parallel**: Execute multiple children simultaneously
- **Random Selector**: Randomly choose from successful children

**Decorator Nodes:**
- **Inverter**: Invert child result
- **Repeater**: Repeat child execution
- **Cooldown**: Prevent execution for specified duration
- **Retry**: Retry failed children with backoff
- **Condition**: Add conditional execution

**Leaf Nodes:**
- **Action**: Execute specific behavior
- **Condition**: Check game state
- **Wait**: Pause execution
- **Memory**: Store/retrieve information

### State Machines
Context-aware state management with intelligent transitions:

```typescript
// Define complex state machine
const npcStateMachine = {
  states: {
    idle: {
      onEnter: 'play_idle_animation',
      onUpdate: 'scan_environment',
      onExit: 'stop_idle_animation',
      transitions: [
        { to: 'investigating', condition: 'heard_sound' },
        { to: 'patrolling', condition: 'no_activity_timeout' },
        { to: 'combat', condition: 'enemy_detected' }
      ]
    },
    patrolling: {
      onEnter: 'start_patrol_route',
      onUpdate: 'move_to_next_waypoint',
      transitions: [
        { to: 'idle', condition: 'patrol_complete' },
        { to: 'investigating', condition: 'suspicious_activity' },
        { to: 'combat', condition: 'enemy_spotted' }
      ]
    },
    investigating: {
      onEnter: 'move_to_investigation_point',
      onUpdate: 'search_area',
      timeout: 10000, // 10 seconds max investigation
      transitions: [
        { to: 'combat', condition: 'found_enemy' },
        { to: 'patrolling', condition: 'investigation_complete' },
        { to: 'idle', condition: 'timeout' }
      ]
    },
    combat: {
      onEnter: 'engage_combat_mode',
      onUpdate: 'execute_combat_behavior',
      isHierarchical: true,
      substates: {
        seeking: { /* seek enemy */ },
        engaging: { /* attack enemy */ },
        retreating: { /* tactical retreat */ }
      },
      transitions: [
        { to: 'patrolling', condition: 'enemy_defeated' },
        { to: 'investigating', condition: 'enemy_lost' }
      ]
    }
  },
  initialState: 'idle'
};
```

### Goal-Oriented Action Planning (GOAP)
Intelligent planning with dynamic goal prioritization:

```typescript
// Define available actions
const actions = [
  {
    name: 'move_to_location',
    preconditions: { hasPath: true },
    effects: { atLocation: true },
    cost: (distance) => distance * 0.1
  },
  {
    name: 'attack_enemy',
    preconditions: { hasWeapon: true, enemyInRange: true },
    effects: { enemyDefeated: true, weaponAmmo: -1 },
    cost: 2.0
  },
  {
    name: 'reload_weapon',
    preconditions: { hasAmmo: true, weaponNeedsReload: true },
    effects: { weaponAmmo: 'full' },
    cost: 3.0
  },
  {
    name: 'find_cover',
    preconditions: { coverAvailable: true },
    effects: { inCover: true, safety: +50 },
    cost: 1.5
  }
];

// Set agent goals
const goals = [
  { name: 'eliminate_threat', priority: 10, conditions: { enemyDefeated: true } },
  { name: 'maintain_safety', priority: 8, conditions: { inCover: true, safety: '>80' } },
  { name: 'conserve_ammo', priority: 5, conditions: { weaponAmmo: '>5' } }
];

// AI automatically generates action plans
const plan = aiAgent.planActions(goals, actions, currentState);
console.log('Generated plan:', plan.map(action => action.name));
```

### Memory System
Multi-layered memory with realistic decay and retrieval:

```typescript
// Memory types and characteristics
const memoryConfig = {
  shortTerm: {
    capacity: 7,           // 7±2 items (Miller's Rule)
    decayRate: 0.1,        // 10% decay per time unit
    duration: 30000        // 30 seconds
  },
  longTerm: {
    capacity: 1000,        // Large capacity
    decayRate: 0.001,      // Very slow decay
    consolidationThreshold: 3 // Remember after 3 recalls
  },
  episodic: {
    capacity: 100,         // Life events
    decayRate: 0.01,       // Slow decay
    emotionalWeight: true  // Emotional events remembered better
  },
  semantic: {
    capacity: 500,         // Facts and knowledge
    decayRate: 0.0001,     // Extremely slow decay
    categories: ['locations', 'people', 'objects', 'procedures']
  }
};

// Store memories
aiAgent.remember('enemy_location', {
  type: 'spatial',
  location: { x: 100, y: 50 },
  confidence: 0.8,
  emotionalWeight: 0.6,
  timestamp: Date.now()
});

// Retrieve memories
const enemyMemories = aiAgent.recall('enemy_location', {
  timeWindow: 60000,     // Last minute
  confidenceThreshold: 0.5,
  maxResults: 5
});
```

### Personality System
Trait-based behavior modification:

```typescript
const personality = {
  // Big Five personality traits
  openness: 0.7,         // Open to new experiences
  conscientiousness: 0.8, // Organized and responsible
  extraversion: 0.4,     // Social energy level
  agreeableness: 0.6,    // Cooperative and trusting
  neuroticism: 0.3,      // Emotional stability

  // Game-specific traits
  aggression: 0.5,       // Combat tendency
  curiosity: 0.8,        // Exploration drive
  loyalty: 0.9,          // Team dedication
  risk_taking: 0.4,      // Risk tolerance
  intelligence: 0.7      // Problem-solving ability
};

// Personality affects decisions
const decisionModifier = calculatePersonalityInfluence(decision, personality);
const finalDecision = applyPersonalityModifier(decision, decisionModifier);
```

### Social Intelligence
Relationship modeling and group dynamics:

```typescript
// Relationship system
const relationships = {
  'ally_001': {
    relationship: 'friend',
    trust: 0.85,
    respect: 0.7,
    affection: 0.6,
    sharedHistory: [
      { event: 'saved_life', impact: +0.3, timestamp: Date.now() - 100000 },
      { event: 'shared_victory', impact: +0.1, timestamp: Date.now() - 50000 }
    ]
  },
  'enemy_003': {
    relationship: 'hostile',
    trust: 0.1,
    fear: 0.6,
    respect: 0.4,
    sharedHistory: [
      { event: 'betrayal', impact: -0.5, timestamp: Date.now() - 200000 },
      { event: 'combat_defeat', impact: -0.2, timestamp: Date.now() - 150000 }
    ]
  }
};

// Group dynamics
const groupBehavior = {
  leadership: {
    leader: 'alpha_001',
    followership: 0.8,     // How well group follows
    cohesion: 0.7          // Group unity
  },
  communication: {
    frequency: 0.6,        // How often they communicate
    effectiveness: 0.8,    // How well they understand each other
    channels: ['verbal', 'gesture', 'digital']
  },
  coordination: {
    formation: 'wedge',    // Tactical formation
    synchronization: 0.9,  // How well actions are coordinated
    roles: ['leader', 'support', 'scout', 'heavy']
  }
};
```

## Game Type Examples

### RPG Companions
```typescript
const companionAI = {
  personality: { loyalty: 0.9, intelligence: 0.8 },
  goals: ['support_player', 'personal_quest', 'survival'],
  behaviors: {
    combat: 'supportive',
    exploration: 'curious',
    social: 'diplomatic'
  },
  memory: {
    playerPreferences: true,
    questProgress: true,
    locationKnowledge: true
  }
};
```

### RTS Unit AI
```typescript
const unitAI = {
  behaviors: ['attack', 'defend', 'gather', 'build', 'scout'],
  formation: {
    type: 'military',
    cohesion: 0.8,
    adaptability: 0.6
  },
  planning: {
    tactical: true,
    strategic: false,
    reactive: true
  }
};
```

### Survival Game NPCs
```typescript
const survivorAI = {
  needs: ['food', 'water', 'shelter', 'safety'],
  personality: { risk_taking: 0.3, cooperation: 0.7 },
  social: {
    trustBuilding: true,
    resourceSharing: true,
    conflictResolution: 'diplomatic'
  }
};
```

### Combat AI
```typescript
const combatAI = {
  tactics: ['flanking', 'cover_usage', 'suppression', 'retreat'],
  aggression: 0.8,
  teamwork: {
    coordination: true,
    communication: true,
    roleSpecialization: true
  },
  adaptation: {
    learnPlayerPatterns: true,
    adjustDifficulty: true,
    counterStrategies: true
  }
};
```

## Unity Integration

### AI Component System
```json
{
  "aiAgents": [
    {
      "id": "npc_001",
      "gameObjectName": "Guard",
      "currentState": "patrolling",
      "activeGoal": "patrol_area",
      "behaviorTree": "guard_behavior",
      "personality": {
        "aggression": 0.7,
        "intelligence": 0.8
      },
      "memory": {
        "shortTerm": 5,
        "longTerm": 23,
        "emotionalState": "alert"
      },
      "relationships": {
        "player": { "trust": 0.3, "fear": 0.2 }
      }
    }
  ]
}
```

### Visual Debugging
```json
{
  "behaviorTreeVisualization": {
    "activeNodes": ["root", "selector_1", "action_patrol"],
    "nodeStates": {
      "root": "running",
      "selector_1": "running",
      "action_patrol": "success"
    },
    "executionFlow": ["root → selector_1 → action_patrol"]
  },
  "decisionPath": [
    { "decision": "choose_target", "reasoning": "highest_threat_priority" },
    { "decision": "select_action", "reasoning": "optimal_damage_output" }
  ]
}
```

### Performance Monitoring
```json
{
  "aiPerformance": {
    "agentsActive": 45,
    "averageDecisionTime": 2.3,
    "memoryUsage": "12.5MB",
    "planningOperations": 156,
    "behaviorsExecuted": 890,
    "fps": 60
  }
}
```

## Learning and Adaptation

### Reinforcement Learning
```typescript
const learningConfig = {
  algorithm: 'q-learning',
  learningRate: 0.1,
  discountFactor: 0.9,
  explorationRate: 0.1,
  rewardShaping: {
    success: +10,
    failure: -5,
    progress: +1,
    efficiency: +2
  }
};
```

### Behavioral Adaptation
```typescript
// AI learns and adapts based on success/failure
const adaptationSystem = {
  trackActionSuccess: true,
  adjustWeights: true,
  learnPlayerPatterns: true,
  updateStrategies: true,
  adaptationRate: 0.05
};
```

## Performance Characteristics

- **Scalability**: Support for 100+ intelligent agents with efficient decision making
- **Real-time Performance**: Sub-10ms decision times for responsive gameplay
- **Memory Efficient**: Optimized memory structures with automatic cleanup
- **Learning Capable**: Adaptive behavior based on player interaction patterns
- **Unity Optimized**: Component-based architecture with visual debugging tools

## Examples

See `examples/basic/intelligent-npc-demo.ts` for complete AI demonstrations:
- **Combat AI**: Tactical decision making with team coordination
- **Exploration AI**: Curious NPCs that discover and remember locations
- **Social AI**: Complex relationship management and group dynamics
- **Survival AI**: Need-based decision making with resource management

## License

MIT