import { BehaviorTree, AIContext, AIAgent, Goal } from '../core/BehaviorTree';
import { StateMachine } from '../core/StateMachine';
import { Plan } from '../core/GoalOrientedPlanning';
import { GoalOrientedPlanner } from '../core/GoalOrientedPlanning';

export interface UnityAIAgent {
  id: string;
  name: string;
  prefabName: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  animator: UnityAnimator;
  navMeshAgent: UnityNavMeshAgent;
  aiController: UnityAIController;
  stats: UnityAgentStats;
  inventory: UnityInventoryItem[];
  faction: string;
  behavior: UnityBehaviorData;
}

export interface UnityAnimator {
  currentState: string;
  parameters: { [name: string]: any };
  triggers: string[];
  layers: UnityAnimatorLayer[];
}

export interface UnityAnimatorLayer {
  name: string;
  weight: number;
  blendMode: 'Override' | 'Additive';
}

export interface UnityNavMeshAgent {
  destination: { x: number; y: number; z: number };
  speed: number;
  acceleration: number;
  stoppingDistance: number;
  autoBraking: boolean;
  obstacleAvoidanceType: string;
  isOnNavMesh: boolean;
  pathStatus: 'Complete' | 'Partial' | 'Invalid';
}

export interface UnityAIController {
  enabled: boolean;
  updateMode: 'FixedUpdate' | 'Update' | 'LateUpdate';
  debugMode: boolean;
  visualizeDecisions: boolean;
  logLevel: 'None' | 'Error' | 'Warning' | 'Info' | 'Debug';
}

export interface UnityAgentStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  speed: number;
  strength: number;
  intelligence: number;
  perception: number;
  experience: number;
  level: number;
}

export interface UnityInventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  durability: number;
  iconSprite: string;
  prefabName: string;
  properties: { [key: string]: any };
}

export interface UnityBehaviorData {
  currentBehavior: string;
  behaviorTree: UnityBehaviorTree;
  stateMachine: UnityStateMachine;
  goals: UnityGoal[];
  decisions: UnityDecision[];
  memory: UnityAIMemory;
  personality: UnityPersonality;
}

export interface UnityBehaviorTree {
  name: string;
  rootNode: UnityBehaviorNode;
  variables: { [name: string]: any };
  isRunning: boolean;
  tickRate: number;
  debugInfo: UnityBehaviorTreeDebug;
}

export interface UnityBehaviorNode {
  id: string;
  type: string;
  name: string;
  status: 'Success' | 'Failure' | 'Running' | 'Inactive';
  children: UnityBehaviorNode[];
  parameters: { [name: string]: any };
  position: { x: number; y: number };
  debugInfo: string;
}

export interface UnityBehaviorTreeDebug {
  executionPath: string[];
  nodeStates: { [nodeId: string]: string };
  executionTime: number;
  tickCount: number;
}

export interface UnityStateMachine {
  name: string;
  currentState: string;
  previousState: string;
  states: UnityState[];
  transitions: UnityTransition[];
  variables: { [name: string]: any };
  isRunning: boolean;
}

export interface UnityState {
  name: string;
  type: 'State' | 'SubStateMachine' | 'BlendTree';
  motions: UnityMotion[];
  behaviours: UnityStateBehaviour[];
  transitions: UnityTransition[];
  position: { x: number; y: number };
  color: string;
}

export interface UnityMotion {
  name: string;
  clip: string;
  speed: number;
  mirror: boolean;
  cycleOffset: number;
}

export interface UnityStateBehaviour {
  type: string;
  parameters: { [name: string]: any };
}

export interface UnityTransition {
  name: string;
  destinationState: string;
  conditions: UnityTransitionCondition[];
  settings: UnityTransitionSettings;
}

export interface UnityTransitionCondition {
  parameter: string;
  mode: 'If' | 'IfNot' | 'Greater' | 'Less' | 'Equals' | 'NotEqual';
  threshold: any;
}

export interface UnityTransitionSettings {
  hasExitTime: boolean;
  exitTime: number;
  duration: number;
  offset: number;
  interruptionSource: 'None' | 'Current' | 'Next' | 'CurrentThenNext' | 'NextThenCurrent';
}

export interface UnityGoal {
  id: string;
  type: string;
  priority: number;
  description: string;
  status: 'Active' | 'Completed' | 'Failed' | 'Paused';
  progress: number;
  targetPosition: { x: number; y: number; z: number };
  parameters: { [key: string]: any };
  deadline: number;
  subGoals: UnityGoal[];
}

export interface UnityDecision {
  id: string;
  timestamp: number;
  type: string;
  confidence: number;
  options: UnityDecisionOption[];
  selectedOption: string;
  reasoning: string[];
  context: { [key: string]: any };
}

export interface UnityDecisionOption {
  id: string;
  name: string;
  score: number;
  pros: string[];
  cons: string[];
  estimatedOutcome: any;
}

export interface UnityAIMemory {
  shortTerm: UnityMemoryEntry[];
  longTerm: UnityMemoryEntry[];
  spatial: UnitySpatialMemory[];
  episodic: UnityEpisodicMemory[];
  facts: { [key: string]: any };
}

export interface UnityMemoryEntry {
  id: string;
  type: string;
  content: any;
  importance: number;
  timestamp: number;
  decayRate: number;
  accessCount: number;
  lastAccessed: number;
}

export interface UnitySpatialMemory {
  location: { x: number; y: number; z: number };
  type: string;
  entities: string[];
  resources: string[];
  dangers: string[];
  lastVisited: number;
  familiarity: number;
}

export interface UnityEpisodicMemory {
  id: string;
  event: string;
  location: { x: number; y: number; z: number };
  timestamp: number;
  participants: string[];
  outcome: string;
  emotion: string;
  clarity: number;
  tags: string[];
}

export interface UnityPersonality {
  traits: { [trait: string]: number };
  preferences: { [preference: string]: number };
  relationships: { [agentId: string]: UnityRelationship };
  mood: string;
  stress: number;
}

export interface UnityRelationship {
  trust: number;
  respect: number;
  fear: number;
  attraction: number;
  hostility: number;
  history: UnityInteraction[];
}

export interface UnityInteraction {
  type: string;
  timestamp: number;
  outcome: 'Positive' | 'Negative' | 'Neutral';
  impact: number;
  location: { x: number; y: number; z: number };
}

export interface UnityAIExport {
  metadata: {
    exportTime: string;
    version: string;
    framework: string;
    totalAgents: number;
  };
  agents: UnityAIAgent[];
  globalSettings: UnityGlobalAISettings;
  behaviorLibrary: UnityBehaviorLibrary;
  performanceData: UnityPerformanceData;
  debugData?: UnityDebugData;
}

export interface UnityGlobalAISettings {
  tickRate: number;
  maxAgents: number;
  enableLOD: boolean;
  lodDistance: number[];
  enableOcclusion: boolean;
  debugVisualization: boolean;
  logLevel: string;
  multiThreading: boolean;
  batchSize: number;
}

export interface UnityBehaviorLibrary {
  behaviorTrees: { [name: string]: UnityBehaviorTree };
  stateMachines: { [name: string]: UnityStateMachine };
  actionTemplates: { [name: string]: UnityActionTemplate };
  conditionTemplates: { [name: string]: UnityConditionTemplate };
}

export interface UnityActionTemplate {
  name: string;
  description: string;
  parameters: UnityParameterDefinition[];
  scriptTemplate: string;
  category: string;
  icon: string;
}

export interface UnityConditionTemplate {
  name: string;
  description: string;
  parameters: UnityParameterDefinition[];
  scriptTemplate: string;
  category: string;
  icon: string;
}

export interface UnityParameterDefinition {
  name: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'Vector3' | 'GameObject' | 'enum';
  defaultValue: any;
  description: string;
  constraints?: any;
}

export interface UnityPerformanceData {
  averageTickTime: number;
  maxTickTime: number;
  memoryUsage: number;
  activeAgents: number;
  decisionsPerSecond: number;
  pathfindingRequests: number;
  behaviorTreeExecutions: number;
  stateMachineTransitions: number;
}

export interface UnityDebugData {
  agentDecisions: { [agentId: string]: UnityDecision[] };
  behaviorTreePaths: { [agentId: string]: string[] };
  stateMachineHistory: { [agentId: string]: string[] };
  goalProgress: { [agentId: string]: { [goalId: string]: number } };
  performanceMetrics: { [metric: string]: number[] };
}

export class UnityAIIntegration {
  private behaviorTrees: Map<string, BehaviorTree>;
  private stateMachines: Map<string, StateMachine>;
  private planners: Map<string, GoalOrientedPlanner>;
  private agents: Map<string, AIAgent>;

  constructor() {
    this.behaviorTrees = new Map();
    this.stateMachines = new Map();
    this.planners = new Map();
    this.agents = new Map();
  }

  // Agent conversion
  convertAgentToUnity(agent: AIAgent, context: AIContext): UnityAIAgent {
    return {
      id: agent.id,
      name: agent.name,
      prefabName: this.getAgentPrefab(agent),
      position: agent.position,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      animator: this.createUnityAnimator(agent),
      navMeshAgent: this.createUnityNavMeshAgent(agent),
      aiController: this.createUnityAIController(),
      stats: this.convertAgentStats(agent),
      inventory: this.convertInventory(agent.inventory),
      faction: agent.faction,
      behavior: this.convertBehaviorData(agent, context)
    };
  }

  // Behavior Tree conversion
  convertBehaviorTreeToUnity(behaviorTree: BehaviorTree): UnityBehaviorTree {
    const root = behaviorTree.getRoot();

    return {
      name: 'MainBehaviorTree',
      rootNode: root ? this.convertBehaviorNodeToUnity(root) : this.createEmptyNode(),
      variables: {},
      isRunning: behaviorTree.isTreeRunning(),
      tickRate: 30,
      debugInfo: {
        executionPath: [],
        nodeStates: {},
        executionTime: 0,
        tickCount: 0
      }
    };
  }

  private convertBehaviorNodeToUnity(node: any): UnityBehaviorNode {
    return {
      id: node.getName(),
      type: this.getUnityNodeType(node.constructor.name),
      name: node.getName(),
      status: 'Inactive',
      children: node.getChildren().map((child: any) => this.convertBehaviorNodeToUnity(child)),
      parameters: {},
      position: { x: 0, y: 0 },
      debugInfo: node.getDescription() || ''
    };
  }

  private getUnityNodeType(nodeType: string): string {
    const typeMap: { [key: string]: string } = {
      'SequenceNode': 'Sequence',
      'SelectorNode': 'Selector',
      'ParallelNode': 'Parallel',
      'InverterNode': 'Inverter',
      'RepeatNode': 'Repeat',
      'RetryNode': 'Retry',
      'ActionNode': 'Action',
      'ConditionNode': 'Condition',
      'WaitAction': 'Wait',
      'MoveToPositionAction': 'MoveTo',
      'AttackTargetAction': 'Attack'
    };

    return typeMap[nodeType] || 'GenericNode';
  }

  // State Machine conversion
  convertStateMachineToUnity(stateMachine: StateMachine): UnityStateMachine {
    return {
      name: 'MainStateMachine',
      currentState: stateMachine.getCurrentState() || 'None',
      previousState: stateMachine.getPreviousState() || 'None',
      states: this.convertStatesToUnity(stateMachine),
      transitions: this.convertTransitionsToUnity(stateMachine),
      variables: {},
      isRunning: stateMachine.getIsRunning()
    };
  }

  private convertStatesToUnity(stateMachine: StateMachine): UnityState[] {
    const states: UnityState[] = [];

    // In a real implementation, we would iterate through the state machine's states
    // For now, create some example states
    states.push({
      name: 'Idle',
      type: 'State',
      motions: [{ name: 'idle', clip: 'idle_animation', speed: 1, mirror: false, cycleOffset: 0 }],
      behaviours: [],
      transitions: [],
      position: { x: 0, y: 0 },
      color: '#2196F3'
    });

    return states;
  }

  private convertTransitionsToUnity(stateMachine: StateMachine): UnityTransition[] {
    const transitions: UnityTransition[] = [];

    // Convert transitions from the state machine
    const machineTransitions = stateMachine.getTransitions();

    for (const transition of machineTransitions) {
      transitions.push({
        name: `${transition.from}_to_${transition.to}`,
        destinationState: transition.to,
        conditions: [{
          parameter: 'trigger',
          mode: 'If',
          threshold: true
        }],
        settings: {
          hasExitTime: false,
          exitTime: 0.75,
          duration: 0.25,
          offset: 0,
          interruptionSource: 'None'
        }
      });
    }

    return transitions;
  }

  // Goal conversion
  convertGoalsToUnity(goals: Goal[]): UnityGoal[] {
    return goals.map(goal => ({
      id: goal.id,
      type: goal.type,
      priority: goal.priority,
      description: goal.description,
      status: this.convertGoalStatus(goal.status),
      progress: goal.progress,
      targetPosition: goal.parameters.position || { x: 0, y: 0, z: 0 },
      parameters: goal.parameters,
      deadline: goal.deadline || 0,
      subGoals: this.convertGoalsToUnity(goal.subGoals)
    }));
  }

  private convertGoalStatus(status: string): 'Active' | 'Completed' | 'Failed' | 'Paused' {
    const statusMap: { [key: string]: any } = {
      'active': 'Active',
      'completed': 'Completed',
      'failed': 'Failed',
      'paused': 'Paused'
    };

    return statusMap[status] || 'Active';
  }

  // Memory conversion
  convertMemoryToUnity(memory: any): UnityAIMemory {
    return {
      shortTerm: memory.shortTerm?.map(this.convertMemoryEntryToUnity) || [],
      longTerm: memory.longTerm?.map(this.convertMemoryEntryToUnity) || [],
      spatial: memory.spatial?.map(this.convertSpatialMemoryToUnity) || [],
      episodic: memory.episodic?.map(this.convertEpisodicMemoryToUnity) || [],
      facts: memory.semantic?.facts || {}
    };
  }

  private convertMemoryEntryToUnity(entry: any): UnityMemoryEntry {
    return {
      id: entry.id,
      type: entry.type,
      content: entry.data,
      importance: entry.importance,
      timestamp: entry.timestamp,
      decayRate: entry.decayRate,
      accessCount: 0,
      lastAccessed: entry.timestamp
    };
  }

  private convertSpatialMemoryToUnity(spatial: any): UnitySpatialMemory {
    return {
      location: spatial.location,
      type: spatial.type || 'unknown',
      entities: spatial.entities || [],
      resources: spatial.resources || [],
      dangers: spatial.dangers || [],
      lastVisited: spatial.timestamp,
      familiarity: spatial.familiarity || 0.5
    };
  }

  private convertEpisodicMemoryToUnity(episodic: any): UnityEpisodicMemory {
    return {
      id: episodic.id,
      event: episodic.event,
      location: episodic.location,
      timestamp: episodic.timestamp,
      participants: episodic.participants,
      outcome: episodic.outcome,
      emotion: episodic.emotion,
      clarity: episodic.clarity,
      tags: episodic.tags || []
    };
  }

  // Utility conversion methods
  private getAgentPrefab(agent: AIAgent): string {
    const prefabMap: { [faction: string]: string } = {
      'player': 'Prefabs/Agents/PlayerAgent',
      'ally': 'Prefabs/Agents/AllyAgent',
      'enemy': 'Prefabs/Agents/EnemyAgent',
      'neutral': 'Prefabs/Agents/NeutralAgent',
      'wildlife': 'Prefabs/Agents/WildlifeAgent'
    };

    return prefabMap[agent.faction] || 'Prefabs/Agents/GenericAgent';
  }

  private createUnityAnimator(agent: AIAgent): UnityAnimator {
    return {
      currentState: agent.status.currentAction || 'idle',
      parameters: {
        'Speed': 0,
        'IsMoving': false,
        'Health': agent.health / agent.maxHealth,
        'AlertLevel': agent.status.alertLevel
      },
      triggers: [],
      layers: [
        {
          name: 'Base Layer',
          weight: 1.0,
          blendMode: 'Override'
        }
      ]
    };
  }

  private createUnityNavMeshAgent(agent: AIAgent): UnityNavMeshAgent {
    return {
      destination: agent.position,
      speed: 3.5,
      acceleration: 8.0,
      stoppingDistance: 0.5,
      autoBraking: true,
      obstacleAvoidanceType: 'HighQualityObstacleAvoidance',
      isOnNavMesh: true,
      pathStatus: 'Complete'
    };
  }

  private createUnityAIController(): UnityAIController {
    return {
      enabled: true,
      updateMode: 'Update',
      debugMode: false,
      visualizeDecisions: false,
      logLevel: 'Warning'
    };
  }

  private convertAgentStats(agent: AIAgent): UnityAgentStats {
    return {
      health: agent.health,
      maxHealth: agent.maxHealth,
      energy: agent.energy,
      maxEnergy: agent.maxEnergy,
      speed: 1.0,
      strength: agent.personality.aggression,
      intelligence: agent.personality.intelligence,
      perception: agent.personality.curiosity,
      experience: 0,
      level: agent.level
    };
  }

  private convertInventory(inventory: any[]): UnityInventoryItem[] {
    return inventory.map(item => ({
      id: item.id,
      name: item.type,
      type: item.type,
      quantity: item.quantity,
      durability: item.durability,
      iconSprite: `Icons/${item.type}`,
      prefabName: `Prefabs/Items/${item.type}`,
      properties: item.properties
    }));
  }

  private convertBehaviorData(agent: AIAgent, context: AIContext): UnityBehaviorData {
    return {
      currentBehavior: 'BehaviorTree',
      behaviorTree: this.convertBehaviorTreeToUnity(new BehaviorTree(context)),
      stateMachine: this.convertStateMachineToUnity(new StateMachine(context, {
        initialState: 'idle',
        globalTransitions: [],
        allowParallelStates: false,
        maxHistorySize: 100,
        enableLogging: false,
        updateFrequency: 10
      })),
      goals: this.convertGoalsToUnity(context.goals),
      decisions: [],
      memory: this.convertMemoryToUnity(context.memory),
      personality: this.convertPersonalityToUnity(agent.personality)
    };
  }

  private convertPersonalityToUnity(personality: any): UnityPersonality {
    return {
      traits: {
        'Aggression': personality.aggression,
        'Caution': personality.caution,
        'Curiosity': personality.curiosity,
        'Loyalty': personality.loyalty,
        'Intelligence': personality.intelligence,
        'Creativity': personality.creativity,
        'Social': personality.social,
        'Greed': personality.greed
      },
      preferences: {},
      relationships: {},
      mood: 'Neutral',
      stress: 0
    };
  }

  private createEmptyNode(): UnityBehaviorNode {
    return {
      id: 'root',
      type: 'Sequence',
      name: 'Root',
      status: 'Inactive',
      children: [],
      parameters: {},
      position: { x: 0, y: 0 },
      debugInfo: 'Root node'
    };
  }

  // Main export function
  exportForUnity(
    agents: AIAgent[],
    contexts: Map<string, AIContext>,
    behaviorTrees: Map<string, BehaviorTree>,
    stateMachines: Map<string, StateMachine>,
    includeDebugData: boolean = false
  ): UnityAIExport {
    const unityAgents: UnityAIAgent[] = [];

    for (const agent of agents) {
      const context = contexts.get(agent.id);
      if (context) {
        unityAgents.push(this.convertAgentToUnity(agent, context));
      }
    }

    const behaviorLibrary: UnityBehaviorLibrary = {
      behaviorTrees: {},
      stateMachines: {},
      actionTemplates: this.getActionTemplates(),
      conditionTemplates: this.getConditionTemplates()
    };

    // Convert behavior trees
    for (const [name, tree] of behaviorTrees) {
      behaviorLibrary.behaviorTrees[name] = this.convertBehaviorTreeToUnity(tree);
    }

    // Convert state machines
    for (const [name, sm] of stateMachines) {
      behaviorLibrary.stateMachines[name] = this.convertStateMachineToUnity(sm);
    }

    const globalSettings: UnityGlobalAISettings = {
      tickRate: 30,
      maxAgents: 100,
      enableLOD: true,
      lodDistance: [50, 100, 200],
      enableOcclusion: true,
      debugVisualization: false,
      logLevel: 'Warning',
      multiThreading: true,
      batchSize: 10
    };

    const performanceData: UnityPerformanceData = {
      averageTickTime: 2.5,
      maxTickTime: 10.0,
      memoryUsage: 150.0,
      activeAgents: unityAgents.length,
      decisionsPerSecond: unityAgents.length * 10,
      pathfindingRequests: unityAgents.length * 2,
      behaviorTreeExecutions: unityAgents.length * 30,
      stateMachineTransitions: unityAgents.length * 5
    };

    const export_data: UnityAIExport = {
      metadata: {
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        framework: 'Steam AI Decision Framework',
        totalAgents: unityAgents.length
      },
      agents: unityAgents,
      globalSettings,
      behaviorLibrary,
      performanceData
    };

    if (includeDebugData) {
      export_data.debugData = this.generateDebugData(agents, contexts);
    }

    return export_data;
  }

  exportToJSON(
    agents: AIAgent[],
    contexts: Map<string, AIContext>,
    behaviorTrees: Map<string, BehaviorTree>,
    stateMachines: Map<string, StateMachine>,
    includeDebugData: boolean = false
  ): string {
    const exportData = this.exportForUnity(agents, contexts, behaviorTrees, stateMachines, includeDebugData);
    return JSON.stringify(exportData, null, 2);
  }

  private getActionTemplates(): { [name: string]: UnityActionTemplate } {
    return {
      'MoveTo': {
        name: 'Move To',
        description: 'Move agent to a target position',
        parameters: [
          {
            name: 'target',
            type: 'Vector3',
            defaultValue: { x: 0, y: 0, z: 0 },
            description: 'Target position to move to'
          },
          {
            name: 'speed',
            type: 'float',
            defaultValue: 1.0,
            description: 'Movement speed multiplier'
          }
        ],
        scriptTemplate: 'MoveToAction',
        category: 'Movement',
        icon: 'move'
      },
      'Attack': {
        name: 'Attack',
        description: 'Attack a target entity',
        parameters: [
          {
            name: 'target',
            type: 'GameObject',
            defaultValue: null,
            description: 'Target to attack'
          },
          {
            name: 'damage',
            type: 'float',
            defaultValue: 10.0,
            description: 'Damage to deal'
          }
        ],
        scriptTemplate: 'AttackAction',
        category: 'Combat',
        icon: 'attack'
      },
      'Wait': {
        name: 'Wait',
        description: 'Wait for a specified duration',
        parameters: [
          {
            name: 'duration',
            type: 'float',
            defaultValue: 1.0,
            description: 'Wait duration in seconds'
          }
        ],
        scriptTemplate: 'WaitAction',
        category: 'Utility',
        icon: 'wait'
      }
    };
  }

  private getConditionTemplates(): { [name: string]: UnityConditionTemplate } {
    return {
      'HealthBelow': {
        name: 'Health Below',
        description: 'Check if health is below threshold',
        parameters: [
          {
            name: 'threshold',
            type: 'float',
            defaultValue: 0.5,
            description: 'Health threshold (0-1)'
          }
        ],
        scriptTemplate: 'HealthBelowCondition',
        category: 'Health',
        icon: 'health'
      },
      'EnemyInRange': {
        name: 'Enemy In Range',
        description: 'Check if enemy is within range',
        parameters: [
          {
            name: 'range',
            type: 'float',
            defaultValue: 10.0,
            description: 'Detection range'
          }
        ],
        scriptTemplate: 'EnemyInRangeCondition',
        category: 'Detection',
        icon: 'enemy'
      },
      'HasItem': {
        name: 'Has Item',
        description: 'Check if agent has specific item',
        parameters: [
          {
            name: 'itemType',
            type: 'string',
            defaultValue: 'weapon',
            description: 'Type of item to check for'
          },
          {
            name: 'quantity',
            type: 'int',
            defaultValue: 1,
            description: 'Minimum quantity required'
          }
        ],
        scriptTemplate: 'HasItemCondition',
        category: 'Inventory',
        icon: 'item'
      }
    };
  }

  private generateDebugData(agents: AIAgent[], contexts: Map<string, AIContext>): UnityDebugData {
    const agentDecisions: { [agentId: string]: UnityDecision[] } = {};
    const behaviorTreePaths: { [agentId: string]: string[] } = {};
    const stateMachineHistory: { [agentId: string]: string[] } = {};
    const goalProgress: { [agentId: string]: { [goalId: string]: number } } = {};

    for (const agent of agents) {
      const context = contexts.get(agent.id);
      if (context) {
        // Generate sample debug data
        agentDecisions[agent.id] = [{
          id: `decision_${Date.now()}`,
          timestamp: Date.now(),
          type: 'behavior_selection',
          confidence: 0.85,
          options: [
            {
              id: 'patrol',
              name: 'Patrol Area',
              score: 0.6,
              pros: ['Safe', 'Energy efficient'],
              cons: ['Boring', 'Low reward'],
              estimatedOutcome: 'neutral'
            },
            {
              id: 'explore',
              name: 'Explore Unknown Area',
              score: 0.85,
              pros: ['High reward potential', 'Gain knowledge'],
              cons: ['Risky', 'Energy consuming'],
              estimatedOutcome: 'positive'
            }
          ],
          selectedOption: 'explore',
          reasoning: [
            'High curiosity personality trait',
            'Low energy concerns',
            'No immediate threats detected'
          ],
          context: {
            'energy_level': agent.energy / agent.maxEnergy,
            'health_level': agent.health / agent.maxHealth,
            'threat_level': 'low'
          }
        }];

        behaviorTreePaths[agent.id] = [
          'Root',
          'MainSequence',
          'CheckThreats',
          'SelectBehavior',
          'ExecuteExplore'
        ];

        stateMachineHistory[agent.id] = [
          'Idle',
          'Patrolling',
          'Investigating',
          'Exploring'
        ];

        goalProgress[agent.id] = {};
        for (const goal of context.goals) {
          goalProgress[agent.id][goal.id] = goal.progress;
        }
      }
    }

    return {
      agentDecisions,
      behaviorTreePaths,
      stateMachineHistory,
      goalProgress,
      performanceMetrics: {
        'decision_time': [1.2, 0.8, 1.5, 0.9, 1.1],
        'behavior_execution_time': [15.2, 12.8, 18.1, 14.3, 16.7],
        'goal_completion_rate': [0.85, 0.92, 0.78, 0.89, 0.94]
      }
    };
  }
}