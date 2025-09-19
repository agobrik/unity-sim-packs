export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AISystemConfig {
  maxAgents: number;
  updateInterval: number;
  learningRate: number;
  memorySize: number;
  decisionThreshold: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  position: Vector3;
  state: AgentState;
  brain: Brain;
  memory: Memory;
  sensors: Sensor[];
  goals: Goal[];
  lastUpdate: number;
}

export interface Brain {
  id: string;
  type: BrainType;
  behaviorTree?: BehaviorTree;
  stateMachine?: StateMachine;
  neuralNetwork?: NeuralNetwork;
  decisionNetwork?: DecisionNetwork;
  parameters: Record<string, any>;
}

export interface BehaviorTree {
  rootNode: BehaviorNode;
  blackboard: Blackboard;
  status: NodeStatus;
}

export interface BehaviorNode {
  id: string;
  type: NodeType;
  children: BehaviorNode[];
  condition?: (agent: Agent, blackboard: Blackboard) => boolean;
  action?: (agent: Agent, blackboard: Blackboard) => NodeStatus;
  decoratorType?: DecoratorType;
  parameters: Record<string, any>;
}

export interface StateMachine {
  currentState: string;
  states: Map<string, State>;
  transitions: Transition[];
  globalVariables: Record<string, any>;
}

export interface State {
  id: string;
  name: string;
  onEnter?: (agent: Agent) => void;
  onUpdate?: (agent: Agent, deltaTime: number) => void;
  onExit?: (agent: Agent) => void;
  conditions: StateCondition[];
}

export interface Transition {
  id: string;
  fromState: string;
  toState: string;
  condition: (agent: Agent) => boolean;
  action?: (agent: Agent) => void;
  priority: number;
}

export interface StateCondition {
  type: ConditionType;
  parameter: string;
  operator: ComparisonOperator;
  value: any;
  inverse?: boolean;
}

export interface NeuralNetwork {
  layers: Layer[];
  weights: number[][][];
  biases: number[][];
  activationFunction: ActivationFunction;
  learningRate: number;
}

export interface Layer {
  id: string;
  neurons: number;
  activationFunction: ActivationFunction;
}

export interface DecisionNetwork {
  nodes: DecisionNode[];
  connections: DecisionConnection[];
  currentDecision?: string;
}

export interface DecisionNode {
  id: string;
  type: DecisionNodeType;
  condition?: (agent: Agent) => boolean;
  action?: (agent: Agent) => void;
  weight: number;
  confidence: number;
}

export interface DecisionConnection {
  from: string;
  to: string;
  weight: number;
  condition?: (agent: Agent) => boolean;
}

export interface Memory {
  shortTerm: Map<string, MemoryItem>;
  longTerm: Map<string, MemoryItem>;
  episodic: MemoryItem[];
  maxShortTermSize: number;
  maxLongTermSize: number;
  maxEpisodicSize: number;
}

export interface MemoryItem {
  id: string;
  type: MemoryType;
  data: any;
  timestamp: number;
  importance: number;
  accessed: number;
  strength: number;
}

export interface Sensor {
  id: string;
  type: SensorType;
  range: number;
  accuracy: number;
  updateRate: number;
  lastReading: SensorReading;
  enabled: boolean;
}

export interface SensorReading {
  timestamp: number;
  data: any;
  confidence: number;
  source: string;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  priority: number;
  target?: any;
  conditions: GoalCondition[];
  status: GoalStatus;
  deadline?: number;
  reward: number;
}

export interface GoalCondition {
  type: ConditionType;
  parameter: string;
  operator: ComparisonOperator;
  value: any;
  weight: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Blackboard {
  data: Map<string, any>;
  timestamp: number;
}

export interface LearningData {
  state: any;
  action: any;
  reward: number;
  nextState: any;
  timestamp: number;
}

export interface CoordinationMessage {
  id: string;
  sender: string;
  receiver: string;
  type: MessageType;
  data: any;
  timestamp: number;
  priority: number;
}

export enum AgentType {
  AUTONOMOUS = 'autonomous',
  REACTIVE = 'reactive',
  HYBRID = 'hybrid',
  SCRIPTED = 'scripted'
}

export enum AgentState {
  IDLE = 'idle',
  ACTIVE = 'active',
  THINKING = 'thinking',
  ACTING = 'acting',
  LEARNING = 'learning',
  COMMUNICATING = 'communicating',
  DEAD = 'dead'
}

export enum BrainType {
  BEHAVIOR_TREE = 'behavior_tree',
  STATE_MACHINE = 'state_machine',
  NEURAL_NETWORK = 'neural_network',
  DECISION_NETWORK = 'decision_network',
  HYBRID = 'hybrid'
}

export enum NodeType {
  COMPOSITE = 'composite',
  DECORATOR = 'decorator',
  ACTION = 'action',
  CONDITION = 'condition'
}

export enum NodeStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RUNNING = 'running',
  INVALID = 'invalid'
}

export enum DecoratorType {
  INVERTER = 'inverter',
  REPEATER = 'repeater',
  RETRY = 'retry',
  TIMEOUT = 'timeout',
  COOLDOWN = 'cooldown'
}

export enum ConditionType {
  HEALTH = 'health',
  DISTANCE = 'distance',
  TIME = 'time',
  RESOURCE = 'resource',
  CUSTOM = 'custom'
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal'
}

export enum ActivationFunction {
  SIGMOID = 'sigmoid',
  TANH = 'tanh',
  RELU = 'relu',
  LEAKY_RELU = 'leaky_relu',
  LINEAR = 'linear'
}

export enum DecisionNodeType {
  INPUT = 'input',
  PROCESSING = 'processing',
  OUTPUT = 'output'
}

export enum MemoryType {
  PERCEPTION = 'perception',
  ACTION = 'action',
  GOAL = 'goal',
  EMOTION = 'emotion',
  KNOWLEDGE = 'knowledge'
}

export enum SensorType {
  VISION = 'vision',
  AUDIO = 'audio',
  PROXIMITY = 'proximity',
  HEALTH = 'health',
  RESOURCE = 'resource',
  COMMUNICATION = 'communication'
}

export enum GoalType {
  SURVIVAL = 'survival',
  EXPLORATION = 'exploration',
  RESOURCE = 'resource',
  SOCIAL = 'social',
  TASK = 'task'
}

export enum GoalStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABANDONED = 'abandoned'
}

export enum MessageType {
  COORDINATION = 'coordination',
  INFORMATION = 'information',
  REQUEST = 'request',
  RESPONSE = 'response',
  ALERT = 'alert'
}