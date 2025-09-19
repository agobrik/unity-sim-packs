export {
  BehaviorTree,
  BehaviorNode,
  BehaviorNodeStatus,
  BehaviorNodeResult,
  SequenceNode,
  SelectorNode,
  ParallelNode,
  InverterNode,
  RepeatNode,
  RetryNode,
  ActionNode,
  ConditionNode,
  MoveToPositionAction,
  WaitAction,
  AttackTargetAction,
  HealthBelowThreshold,
  EnemyInRange,
  ResourceAvailable,
  AIContext,
  AIAgent,
  PersonalityTraits,
  AgentCapability,
  InventoryItem,
  AgentStatus,
  WorldState,
  WorldEntity,
  Resource,
  Threat,
  Opportunity,
  WeatherCondition,
  WorldEvent,
  SensorData,
  VisionData,
  HearingData,
  ProximityData,
  HealthData,
  SocialData,
  AIMemory,
  Goal,
  GoalType,
  GoalStatus
} from './core/BehaviorTree';

export {
  StateMachine,
  StateMachineBuilder,
  StateTransition,
  TransitionCondition,
  TransitionAction,
  StateData,
  StateAction,
  StateType,
  StateMachineConfig,
  StateHistory
} from './core/StateMachine';

export {
  GoalOrientedPlanner,
  PlanAction,
  WorldCondition,
  WorldEffect,
  Plan,
  PlanStatus,
  PlanningConfig
} from './core/GoalOrientedPlanning';

export {
  UnityAIIntegration,
  UnityAIAgent,
  UnityBehaviorTree,
  UnityBehaviorNode,
  UnityStateMachine,
  UnityState,
  UnityGoal,
  UnityAIMemory,
  UnityAIExport
} from './utils/UnityAIIntegration';

import { BehaviorTree, AIContext, AIAgent, Goal, GoalType, EnemyInRange, AttackTargetAction, HealthBelowThreshold, WaitAction } from './core/BehaviorTree';
import { StateMachine, StateMachineConfig } from './core/StateMachine';
import { GoalOrientedPlanner, PlanningConfig } from './core/GoalOrientedPlanning';
import { UnityAIIntegration } from './utils/UnityAIIntegration';

// Main AI Decision Making simulation class
export class AIDecisionFrameworkSimulation {
  private agents: Map<string, AIAgent>;
  private contexts: Map<string, AIContext>;
  private behaviorTrees: Map<string, BehaviorTree>;
  private stateMachines: Map<string, StateMachine>;
  private planners: Map<string, GoalOrientedPlanner>;
  private unityIntegration: UnityAIIntegration;
  private isRunning: boolean = false;
  private updateTimer?: NodeJS.Timeout;
  private tickRate: number = 30; // 30 FPS

  constructor() {
    this.agents = new Map();
    this.contexts = new Map();
    this.behaviorTrees = new Map();
    this.stateMachines = new Map();
    this.planners = new Map();
    this.unityIntegration = new UnityAIIntegration();
  }

  // Agent management
  createAgent(config: {
    id?: string;
    name: string;
    faction: string;
    personality: any;
    position?: { x: number; y: number; z: number };
    capabilities?: any[];
  }): string {
    const agentId = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const agent: AIAgent = {
      id: agentId,
      name: config.name,
      position: config.position || { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      level: 1,
      faction: config.faction,
      personality: config.personality,
      capabilities: config.capabilities || [],
      inventory: [],
      status: {
        isAlive: true,
        isActive: true,
        currentAction: 'idle',
        mood: 'curious',
        alertLevel: 0.1
      }
    };

    const context: AIContext = {
      agent,
      world: this.createEmptyWorldState(),
      memory: this.createEmptyMemory(),
      goals: [],
      sensors: this.createEmptySensorData(),
      deltaTime: 1/30
    };

    this.agents.set(agentId, agent);
    this.contexts.set(agentId, context);

    console.log(`🤖 Created AI agent: ${agent.name} (${agentId})`);
    console.log(`   - Faction: ${agent.faction}`);
    console.log(`   - Position: (${agent.position.x}, ${agent.position.y}, ${agent.position.z})`);
    console.log(`   - Personality: Aggression ${agent.personality.aggression}, Intelligence ${agent.personality.intelligence}`);

    return agentId;
  }

  removeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Cleanup associated AI components
    this.behaviorTrees.delete(agentId);
    this.stateMachines.delete(agentId);
    this.planners.delete(agentId);
    this.contexts.delete(agentId);
    this.agents.delete(agentId);

    console.log(`🗑️ Removed agent: ${agent.name} (${agentId})`);
    return true;
  }

  // AI System setup
  setupBehaviorTree(agentId: string, behaviorTreeBuilder?: (tree: BehaviorTree) => void): boolean {
    const context = this.contexts.get(agentId);
    if (!context) return false;

    const behaviorTree = new BehaviorTree(context);

    // Apply custom configuration if provided
    if (behaviorTreeBuilder) {
      behaviorTreeBuilder(behaviorTree);
    } else {
      // Create default behavior tree
      this.createDefaultBehaviorTree(behaviorTree);
    }

    this.behaviorTrees.set(agentId, behaviorTree);
    behaviorTree.start();

    console.log(`🌳 Setup behavior tree for agent: ${agentId}`);
    return true;
  }

  setupStateMachine(agentId: string, config?: StateMachineConfig): boolean {
    const context = this.contexts.get(agentId);
    if (!context) return false;

    const defaultConfig: StateMachineConfig = {
      initialState: 'idle',
      globalTransitions: [],
      allowParallelStates: false,
      maxHistorySize: 100,
      enableLogging: false,
      updateFrequency: 10,
      ...config
    };

    const stateMachine = this.createDefaultStateMachine(context, defaultConfig);
    this.stateMachines.set(agentId, stateMachine);
    stateMachine.start();

    console.log(`🔄 Setup state machine for agent: ${agentId}`);
    return true;
  }

  setupGoalPlanner(agentId: string, config?: PlanningConfig): boolean {
    const context = this.contexts.get(agentId);
    if (!context) return false;

    const defaultConfig: PlanningConfig = {
      maxDepth: 10,
      maxNodes: 1000,
      timeout: 5000,
      heuristicWeight: 1.0,
      costWeight: 1.0,
      enableLearning: true,
      planCacheSize: 50,
      replanThreshold: 0.3,
      ...config
    };

    const planner = new GoalOrientedPlanner(context, defaultConfig);
    this.planners.set(agentId, planner);

    console.log(`🎯 Setup goal planner for agent: ${agentId}`);
    return true;
  }

  // Goal management
  addGoal(agentId: string, goalConfig: {
    type: GoalType;
    priority: number;
    description: string;
    parameters?: any;
    deadline?: number;
  }): string | null {
    const context = this.contexts.get(agentId);
    const planner = this.planners.get(agentId);
    if (!context || !planner) return null;

    const goal: Goal = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: goalConfig.type,
      priority: goalConfig.priority,
      description: goalConfig.description,
      parameters: goalConfig.parameters || {},
      deadline: goalConfig.deadline,
      prerequisites: [],
      progress: 0,
      status: 'active',
      subGoals: []
    };

    context.goals.push(goal);

    // Create plan for the goal
    const plan = planner.planForGoal(goal);
    if (plan) {
      planner.executePlan(plan);
      console.log(`✅ Created and executing plan for goal: ${goal.description}`);
    } else {
      console.log(`❌ Failed to create plan for goal: ${goal.description}`);
    }

    return goal.id;
  }

  // Scenario builders
  buildCombatScenario(): {
    heroId: string;
    enemyId: string;
    neutralId: string;
  } {
    console.log('⚔️ Building combat scenario...');

    // Create hero agent
    const heroId = this.createAgent({
      name: 'Hero Knight',
      faction: 'player',
      personality: {
        aggression: 0.7,
        caution: 0.4,
        curiosity: 0.6,
        loyalty: 0.9,
        intelligence: 0.8,
        creativity: 0.5,
        social: 0.7,
        greed: 0.2
      },
      position: { x: -10, y: 0, z: 0 },
      capabilities: [
        { type: 'melee_combat', level: 8, cooldown: 1000, lastUsed: 0 },
        { type: 'shield_block', level: 6, cooldown: 2000, lastUsed: 0 }
      ]
    });

    // Create enemy agent
    const enemyId = this.createAgent({
      name: 'Orc Warrior',
      faction: 'enemy',
      personality: {
        aggression: 0.9,
        caution: 0.2,
        curiosity: 0.3,
        loyalty: 0.6,
        intelligence: 0.4,
        creativity: 0.3,
        social: 0.2,
        greed: 0.8
      },
      position: { x: 10, y: 0, z: 0 },
      capabilities: [
        { type: 'melee_combat', level: 7, cooldown: 1200, lastUsed: 0 },
        { type: 'intimidate', level: 5, cooldown: 5000, lastUsed: 0 }
      ]
    });

    // Create neutral NPC
    const neutralId = this.createAgent({
      name: 'Village Guard',
      faction: 'neutral',
      personality: {
        aggression: 0.3,
        caution: 0.8,
        curiosity: 0.4,
        loyalty: 0.7,
        intelligence: 0.6,
        creativity: 0.4,
        social: 0.8,
        greed: 0.1
      },
      position: { x: 0, y: 0, z: -15 },
      capabilities: [
        { type: 'ranged_combat', level: 6, cooldown: 1500, lastUsed: 0 },
        { type: 'call_for_help', level: 8, cooldown: 10000, lastUsed: 0 }
      ]
    });

    // Setup AI systems for each agent
    [heroId, enemyId, neutralId].forEach(agentId => {
      this.setupBehaviorTree(agentId);
      this.setupStateMachine(agentId);
      this.setupGoalPlanner(agentId);
    });

    // Add scenario-specific goals
    this.addGoal(heroId, {
      type: 'combat',
      priority: 0.9,
      description: 'Defeat the orc warrior',
      parameters: { target: enemyId, combatStyle: 'defensive' }
    });

    this.addGoal(enemyId, {
      type: 'combat',
      priority: 0.8,
      description: 'Destroy the human knight',
      parameters: { target: heroId, combatStyle: 'aggressive' }
    });

    this.addGoal(neutralId, {
      type: 'survival',
      priority: 1.0,
      description: 'Stay alive and call for backup if needed',
      parameters: { retreatThreshold: 0.3 }
    });

    console.log('✅ Combat scenario ready');
    return { heroId, enemyId, neutralId };
  }

  buildExplorationScenario(): string[] {
    console.log('🗺️ Building exploration scenario...');

    const explorerIds: string[] = [];

    // Create different types of explorers
    const explorerTypes = [
      {
        name: 'Scout Ranger',
        personality: { curiosity: 0.9, caution: 0.7, intelligence: 0.8 },
        specialization: 'pathfinding'
      },
      {
        name: 'Treasure Hunter',
        personality: { curiosity: 0.8, greed: 0.9, creativity: 0.7 },
        specialization: 'resource_detection'
      },
      {
        name: 'Cartographer',
        personality: { curiosity: 0.9, intelligence: 0.9, creativity: 0.6 },
        specialization: 'mapping'
      },
      {
        name: 'Survivalist',
        personality: { caution: 0.9, intelligence: 0.7, creativity: 0.8 },
        specialization: 'survival'
      }
    ];

    explorerTypes.forEach((explorer, index) => {
      const explorerId = this.createAgent({
        name: explorer.name,
        faction: 'explorer',
        personality: {
          aggression: 0.2,
          caution: explorer.personality.caution || 0.5,
          curiosity: explorer.personality.curiosity || 0.8,
          loyalty: 0.6,
          intelligence: explorer.personality.intelligence || 0.6,
          creativity: explorer.personality.creativity || 0.5,
          social: 0.5,
          greed: explorer.personality.greed || 0.3
        },
        position: {
          x: (index - 1.5) * 20,
          y: 0,
          z: -20
        },
        capabilities: [
          { type: explorer.specialization, level: 8, cooldown: 0, lastUsed: 0 },
          { type: 'movement', level: 7, cooldown: 0, lastUsed: 0 }
        ]
      });

      explorerIds.push(explorerId);

      // Setup AI systems
      this.setupBehaviorTree(explorerId);
      this.setupStateMachine(explorerId);
      this.setupGoalPlanner(explorerId);

      // Add exploration goals
      this.addGoal(explorerId, {
        type: 'exploration',
        priority: 0.8,
        description: `Explore uncharted territory (${explorer.specialization})`,
        parameters: {
          area: { x: 50, y: 0, z: 50, radius: 100 },
          specialization: explorer.specialization
        }
      });

      if (explorer.specialization === 'resource_detection') {
        this.addGoal(explorerId, {
          type: 'resource',
          priority: 0.6,
          description: 'Find valuable resources',
          parameters: { resourceTypes: ['gold', 'gems', 'rare_materials'] }
        });
      }
    });

    console.log(`✅ Exploration scenario ready with ${explorerIds.length} explorers`);
    return explorerIds;
  }

  buildSocialScenario(): string[] {
    console.log('👥 Building social interaction scenario...');

    const characterIds: string[] = [];

    const socialTypes = [
      {
        name: 'Diplomat',
        personality: { social: 0.9, intelligence: 0.8, loyalty: 0.7 },
        role: 'negotiator'
      },
      {
        name: 'Merchant',
        personality: { social: 0.8, greed: 0.7, intelligence: 0.7 },
        role: 'trader'
      },
      {
        name: 'Town Crier',
        personality: { social: 0.9, curiosity: 0.8, creativity: 0.6 },
        role: 'information_broker'
      },
      {
        name: 'Hermit',
        personality: { social: 0.2, caution: 0.9, intelligence: 0.8 },
        role: 'loner'
      },
      {
        name: 'Bard',
        personality: { social: 0.9, creativity: 0.9, curiosity: 0.7 },
        role: 'entertainer'
      }
    ];

    socialTypes.forEach((character, index) => {
      const characterId = this.createAgent({
        name: character.name,
        faction: 'civilian',
        personality: {
          aggression: 0.1,
          caution: character.personality.caution || 0.4,
          curiosity: character.personality.curiosity || 0.6,
          loyalty: character.personality.loyalty || 0.5,
          intelligence: character.personality.intelligence || 0.6,
          creativity: character.personality.creativity || 0.5,
          social: character.personality.social || 0.5,
          greed: character.personality.greed || 0.3
        },
        position: {
          x: Math.cos((index / socialTypes.length) * Math.PI * 2) * 15,
          y: 0,
          z: Math.sin((index / socialTypes.length) * Math.PI * 2) * 15
        },
        capabilities: [
          { type: character.role, level: 8, cooldown: 1000, lastUsed: 0 },
          { type: 'conversation', level: 7, cooldown: 0, lastUsed: 0 }
        ]
      });

      characterIds.push(characterId);

      // Setup AI systems
      this.setupBehaviorTree(characterId);
      this.setupStateMachine(characterId);
      this.setupGoalPlanner(characterId);

      // Add social goals
      this.addGoal(characterId, {
        type: 'social',
        priority: 0.7,
        description: `Fulfill social role as ${character.role}`,
        parameters: {
          role: character.role,
          interactionTarget: 'any',
          socialObjective: this.getSocialObjective(character.role)
        }
      });
    });

    // Add inter-character relationship goals
    for (let i = 0; i < characterIds.length; i++) {
      for (let j = i + 1; j < characterIds.length; j++) {
        const char1 = characterIds[i];
        const char2 = characterIds[j];

        // Create mutual awareness goals
        this.addGoal(char1, {
          type: 'social',
          priority: 0.3,
          description: `Build relationship with ${this.agents.get(char2)?.name}`,
          parameters: {
            target: char2,
            relationship_type: 'acquaintance'
          }
        });
      }
    }

    console.log(`✅ Social scenario ready with ${characterIds.length} characters`);
    return characterIds;
  }

  buildSurvivalScenario(): string[] {
    console.log('🏕️ Building survival scenario...');

    const survivorIds: string[] = [];

    const survivorTypes = [
      {
        name: 'Wilderness Expert',
        personality: { intelligence: 0.8, caution: 0.9, creativity: 0.7 },
        specialty: 'foraging'
      },
      {
        name: 'Former Soldier',
        personality: { aggression: 0.6, loyalty: 0.8, intelligence: 0.7 },
        specialty: 'hunting'
      },
      {
        name: 'Engineer',
        personality: { intelligence: 0.9, creativity: 0.8, social: 0.6 },
        specialty: 'crafting'
      },
      {
        name: 'Medic',
        personality: { social: 0.8, intelligence: 0.8, loyalty: 0.9 },
        specialty: 'healing'
      }
    ];

    survivorTypes.forEach((survivor, index) => {
      const survivorId = this.createAgent({
        name: survivor.name,
        faction: 'survivor',
        personality: {
          aggression: survivor.personality.aggression || 0.3,
          caution: survivor.personality.caution || 0.7,
          curiosity: 0.5,
          loyalty: survivor.personality.loyalty || 0.7,
          intelligence: survivor.personality.intelligence || 0.6,
          creativity: survivor.personality.creativity || 0.5,
          social: survivor.personality.social || 0.6,
          greed: 0.2
        },
        position: {
          x: (index - 1.5) * 10,
          y: 0,
          z: 0
        },
        capabilities: [
          { type: survivor.specialty, level: 8, cooldown: 0, lastUsed: 0 },
          { type: 'survival', level: 6, cooldown: 0, lastUsed: 0 }
        ]
      });

      // Start with reduced health and energy to simulate survival situation
      const agent = this.agents.get(survivorId)!;
      agent.health = 60;
      agent.energy = 40;

      survivorIds.push(survivorId);

      // Setup AI systems
      this.setupBehaviorTree(survivorId);
      this.setupStateMachine(survivorId);
      this.setupGoalPlanner(survivorId);

      // Add survival goals
      this.addGoal(survivorId, {
        type: 'survival',
        priority: 1.0,
        description: 'Stay alive and healthy',
        parameters: { healthThreshold: 80, energyThreshold: 60 }
      });

      this.addGoal(survivorId, {
        type: 'resource',
        priority: 0.8,
        description: `Gather essential resources using ${survivor.specialty}`,
        parameters: {
          resourceTypes: this.getSurvivalResources(survivor.specialty),
          minimumAmount: 10
        }
      });

      this.addGoal(survivorId, {
        type: 'social',
        priority: 0.6,
        description: 'Coordinate with other survivors',
        parameters: {
          cooperate: true,
          shareResources: true
        }
      });
    });

    // Add group survival goal
    const leaderIndex = 0; // Wilderness Expert becomes leader
    this.addGoal(survivorIds[leaderIndex], {
      type: 'achievement',
      priority: 0.9,
      description: 'Establish a safe camp for the group',
      parameters: {
        groupMembers: survivorIds,
        campLocation: { x: 0, y: 0, z: 20 }
      }
    });

    console.log(`✅ Survival scenario ready with ${survivorIds.length} survivors`);
    return survivorIds;
  }

  // Simulation control
  startSimulation(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Starting AI Decision Framework simulation...');

    // Start update loop
    this.updateTimer = setInterval(() => {
      this.update();
    }, 1000 / this.tickRate);

    // Start all behavior trees and state machines
    for (const [agentId, tree] of this.behaviorTrees) {
      if (!tree.isTreeRunning()) {
        tree.start();
      }
    }

    for (const [agentId, sm] of this.stateMachines) {
      if (!sm.getIsRunning()) {
        sm.start();
      }
    }

    console.log(`✅ Simulation started with ${this.agents.size} agents at ${this.tickRate} FPS`);
  }

  stopSimulation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    console.log('🛑 Stopping AI Decision Framework simulation...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    // Stop all AI systems
    for (const tree of this.behaviorTrees.values()) {
      tree.stop();
    }

    for (const sm of this.stateMachines.values()) {
      sm.stop();
    }

    console.log('✅ Simulation stopped');
  }

  private update(): void {
    const deltaTime = 1 / this.tickRate;

    // Update all agents
    for (const [agentId, context] of this.contexts) {
      // Update sensors (simulate perception)
      this.updateSensors(context);

      // Tick behavior tree
      const behaviorTree = this.behaviorTrees.get(agentId);
      if (behaviorTree) {
        behaviorTree.tick(deltaTime);
      }

      // Update state machine
      const stateMachine = this.stateMachines.get(agentId);
      if (stateMachine) {
        stateMachine.update();
      }

      // Update memory (decay, etc.)
      this.updateMemory(context);
    }
  }

  // Utility methods
  private createEmptyWorldState(): any {
    return {
      entities: {},
      resources: {},
      threats: [],
      opportunities: [],
      timeOfDay: 12.0,
      weather: { type: 'clear', intensity: 0, visibility: 1000, temperature: 20 },
      events: []
    };
  }

  private createEmptyMemory(): any {
    return {
      shortTerm: [],
      longTerm: [],
      episodic: [],
      semantic: { facts: {}, strategies: [], preferences: {} }
    };
  }

  private createEmptySensorData(): any {
    return {
      vision: { visibleEntities: [], visibleResources: [], visibleThreats: [], lightLevel: 1.0, viewDistance: 50 },
      hearing: { sounds: [], noiseLevel: 0.1 },
      proximity: { nearbyEntities: [], nearbyResources: [], groundType: 'grass', elevation: 0 },
      health: { currentHealth: 100, healthPercentage: 1.0, injuries: [], statusEffects: [] },
      social: { nearbyAllies: [], nearbyEnemies: [], reputation: {}, relationships: {} }
    };
  }

  private createDefaultBehaviorTree(tree: BehaviorTree): void {
    // Create a simple default behavior tree
    const root = tree.createSelector('Root Behavior',
      tree.createSequence('Combat Sequence',
        new EnemyInRange(15),
        new AttackTargetAction('enemy', 25, 10, 2)
      ),
      tree.createSequence('Health Management',
        new HealthBelowThreshold(0.3),
        new WaitAction(3)
      ),
      tree.createRepeat('Default Patrol',
        new WaitAction(2)
      )
    );

    tree.setRoot(root);
  }

  private createDefaultStateMachine(context: AIContext, config: StateMachineConfig): StateMachine {
    const sm = new StateMachine(context, config);

    // Add basic states
    sm.addState({
      id: 'idle',
      name: 'Idle',
      type: 'simple',
      enterActions: [{ type: 'animation', action: 'idle' }],
      updateActions: [{ type: 'function', action: () => {} }],
      exitActions: [],
      properties: {},
      defaultTransitions: ['patrol']
    });

    sm.addState({
      id: 'patrol',
      name: 'Patrol',
      type: 'simple',
      enterActions: [{ type: 'animation', action: 'walk' }],
      updateActions: [{ type: 'function', action: () => {} }],
      exitActions: [],
      properties: {},
      timeout: 10000,
      defaultTransitions: ['idle']
    });

    // Add transitions
    sm.addTransition({
      from: 'idle',
      to: 'patrol',
      condition: { type: 'function', condition: () => Math.random() > 0.7 },
      priority: 1
    });

    sm.addTransition({
      from: 'patrol',
      to: 'idle',
      condition: { type: 'function', condition: () => Math.random() > 0.8 },
      priority: 1
    });

    return sm;
  }

  private updateSensors(context: AIContext): void {
    // Simulate basic sensor updates
    const agent = context.agent;

    // Update vision (find nearby entities)
    const visibleEntities: string[] = [];
    for (const otherAgent of this.agents.values()) {
      if (otherAgent.id !== agent.id) {
        const distance = this.calculateDistance(agent.position, otherAgent.position);
        if (distance <= 50) { // Vision range
          visibleEntities.push(otherAgent.id);
        }
      }
    }

    context.sensors.vision.visibleEntities = visibleEntities;

    // Update health sensors
    context.sensors.health.currentHealth = agent.health;
    context.sensors.health.healthPercentage = agent.health / agent.maxHealth;
  }

  private updateMemory(context: AIContext): void {
    // Simple memory decay
    context.memory.shortTerm = context.memory.shortTerm.filter((entry: any) => {
      const age = Date.now() - entry.timestamp;
      return age < 60000; // Keep short-term memories for 1 minute
    });
  }

  private calculateDistance(pos1: any, pos2: any): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }

  private getSocialObjective(role: string): string {
    const objectives: { [role: string]: string } = {
      'negotiator': 'resolve_conflicts',
      'trader': 'make_profitable_deals',
      'information_broker': 'gather_and_share_news',
      'loner': 'avoid_social_interaction',
      'entertainer': 'make_people_happy'
    };

    return objectives[role] || 'socialize';
  }

  private getSurvivalResources(specialty: string): string[] {
    const resources: { [specialty: string]: string[] } = {
      'foraging': ['berries', 'mushrooms', 'herbs', 'water'],
      'hunting': ['meat', 'hide', 'bones'],
      'crafting': ['wood', 'stone', 'metal', 'tools'],
      'healing': ['medicinal_herbs', 'bandages', 'potions']
    };

    return resources[specialty] || ['food', 'water'];
  }

  // Query and analysis methods
  getAgentStatus(agentId: string): any {
    const agent = this.agents.get(agentId);
    const context = this.contexts.get(agentId);
    const behaviorTree = this.behaviorTrees.get(agentId);
    const stateMachine = this.stateMachines.get(agentId);
    const planner = this.planners.get(agentId);

    if (!agent || !context) return null;

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        health: `${agent.health}/${agent.maxHealth}`,
        energy: `${agent.energy}/${agent.maxEnergy}`,
        position: agent.position,
        mood: agent.status.mood,
        currentAction: agent.status.currentAction
      },
      behaviorTree: {
        isRunning: behaviorTree?.isTreeRunning() || false
      },
      stateMachine: {
        currentState: stateMachine?.getCurrentState(),
        isRunning: stateMachine?.getIsRunning() || false
      },
      goals: context.goals.map(goal => ({
        description: goal.description,
        progress: `${(goal.progress * 100).toFixed(1)}%`,
        status: goal.status
      })),
      planner: planner ? planner.getStatistics() : null
    };
  }

  getAllAgentsStatus(): any[] {
    return Array.from(this.agents.keys()).map(agentId => this.getAgentStatus(agentId));
  }

  getSimulationStatistics(): any {
    const totalGoals = Array.from(this.contexts.values()).reduce((sum, context) => sum + context.goals.length, 0);
    const activeGoals = Array.from(this.contexts.values()).reduce((sum, context) =>
      sum + context.goals.filter(goal => goal.status === 'active').length, 0);

    return {
      totalAgents: this.agents.size,
      isRunning: this.isRunning,
      tickRate: this.tickRate,
      systems: {
        behaviorTrees: this.behaviorTrees.size,
        stateMachines: this.stateMachines.size,
        planners: this.planners.size
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        completed: totalGoals - activeGoals
      }
    };
  }

  // Unity export
  exportState(): string {
    console.log('📦 Exporting AI Decision Framework state for Unity...');

    const export_data = this.unityIntegration.exportForUnity(
      Array.from(this.agents.values()),
      this.contexts,
      this.behaviorTrees,
      this.stateMachines,
      true // Include debug data
    );

    // Add Unity-compatible fields
    (export_data as any).timestamp = Date.now();
    (export_data as any).currentTime = Date.now();

    const jsonData = JSON.stringify(export_data, null, 2);

    console.log(`✅ Export complete:`);
    console.log(`   - Agents: ${export_data.agents.length}`);
    console.log(`   - Behavior Trees: ${Object.keys(export_data.behaviorLibrary.behaviorTrees).length}`);
    console.log(`   - State Machines: ${Object.keys(export_data.behaviorLibrary.stateMachines).length}`);
    console.log(`   - Data size: ${(jsonData.length / 1024).toFixed(1)} KB`);

    return jsonData;
  }
}