import { EventEmitter } from 'events';

export interface AIContext {
  agent: AIAgent;
  world: WorldState;
  memory: AIMemory;
  goals: Goal[];
  sensors: SensorData;
  deltaTime: number;
}

export interface AIAgent {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  level: number;
  faction: string;
  personality: PersonalityTraits;
  capabilities: AgentCapability[];
  inventory: InventoryItem[];
  status: AgentStatus;
}

export interface PersonalityTraits {
  aggression: number; // 0-1
  caution: number; // 0-1
  curiosity: number; // 0-1
  loyalty: number; // 0-1
  intelligence: number; // 0-1
  creativity: number; // 0-1
  social: number; // 0-1
  greed: number; // 0-1
}

export interface AgentCapability {
  type: string;
  level: number;
  cooldown: number;
  lastUsed: number;
}

export interface InventoryItem {
  id: string;
  type: string;
  quantity: number;
  durability: number;
  properties: { [key: string]: any };
}

export interface AgentStatus {
  isAlive: boolean;
  isActive: boolean;
  currentAction: string;
  target?: string;
  mood: 'happy' | 'angry' | 'fearful' | 'curious' | 'bored' | 'excited';
  alertLevel: number; // 0-1
}

export interface WorldState {
  entities: { [id: string]: WorldEntity };
  resources: { [id: string]: Resource };
  threats: Threat[];
  opportunities: Opportunity[];
  timeOfDay: number;
  weather: WeatherCondition;
  events: WorldEvent[];
}

export interface WorldEntity {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  properties: { [key: string]: any };
  isHostile: boolean;
  isInteractable: boolean;
  lastSeen: number;
}

export interface Resource {
  id: string;
  type: string;
  amount: number;
  position: { x: number; y: number; z: number };
  quality: number;
  accessibility: number;
}

export interface Threat {
  id: string;
  type: 'enemy' | 'hazard' | 'trap' | 'environmental';
  position: { x: number; y: number; z: number };
  severity: number; // 0-1
  range: number;
  duration: number;
  source?: string;
}

export interface Opportunity {
  id: string;
  type: 'resource' | 'alliance' | 'trade' | 'exploration' | 'achievement';
  position: { x: number; y: number; z: number };
  value: number;
  difficulty: number;
  timeLimit?: number;
}

export interface WeatherCondition {
  type: 'clear' | 'rain' | 'storm' | 'fog' | 'snow';
  intensity: number;
  visibility: number;
  temperature: number;
}

export interface WorldEvent {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  location?: { x: number; y: number; z: number };
  participants: string[];
}

export interface SensorData {
  vision: VisionData;
  hearing: HearingData;
  proximity: ProximityData;
  health: HealthData;
  social: SocialData;
}

export interface VisionData {
  visibleEntities: string[];
  visibleResources: string[];
  visibleThreats: string[];
  lightLevel: number;
  viewDistance: number;
}

export interface HearingData {
  sounds: Sound[];
  noiseLevel: number;
}

export interface Sound {
  type: string;
  intensity: number;
  direction: { x: number; y: number; z: number };
  source?: string;
}

export interface ProximityData {
  nearbyEntities: string[];
  nearbyResources: string[];
  groundType: string;
  elevation: number;
}

export interface HealthData {
  currentHealth: number;
  healthPercentage: number;
  injuries: Injury[];
  statusEffects: StatusEffect[];
}

export interface Injury {
  type: string;
  severity: number;
  bodyPart: string;
  healRate: number;
}

export interface StatusEffect {
  type: string;
  duration: number;
  intensity: number;
  source: string;
}

export interface SocialData {
  nearbyAllies: string[];
  nearbyEnemies: string[];
  reputation: { [faction: string]: number };
  relationships: { [agentId: string]: Relationship };
}

export interface Relationship {
  trust: number; // -1 to 1
  respect: number; // -1 to 1
  fear: number; // 0 to 1
  history: InteractionHistory[];
}

export interface InteractionHistory {
  type: string;
  outcome: 'positive' | 'negative' | 'neutral';
  timestamp: number;
  impact: number;
}

export interface AIMemory {
  shortTerm: MemoryEntry[];
  longTerm: MemoryEntry[];
  episodic: EpisodicMemory[];
  semantic: SemanticMemory;
}

export interface MemoryEntry {
  id: string;
  type: string;
  data: any;
  importance: number;
  timestamp: number;
  decayRate: number;
}

export interface EpisodicMemory {
  id: string;
  event: string;
  location: { x: number; y: number; z: number };
  participants: string[];
  outcome: string;
  emotion: string;
  timestamp: number;
  clarity: number; // How well remembered (0-1)
}

export interface SemanticMemory {
  facts: { [key: string]: any };
  strategies: Strategy[];
  preferences: { [key: string]: number };
}

export interface Strategy {
  name: string;
  conditions: string[];
  actions: string[];
  successRate: number;
  lastUsed: number;
}

export interface Goal {
  id: string;
  type: GoalType;
  priority: number;
  description: string;
  target?: string;
  parameters: { [key: string]: any };
  deadline?: number;
  prerequisites: string[];
  progress: number;
  status: GoalStatus;
  subGoals: Goal[];
}

export type GoalType = 'survival' | 'combat' | 'exploration' | 'resource' | 'social' | 'achievement' | 'maintenance';
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused' | 'cancelled';

export enum BehaviorNodeStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  RUNNING = 'RUNNING'
}

export interface BehaviorNodeResult {
  status: BehaviorNodeStatus;
  data?: any;
}

export abstract class BehaviorNode extends EventEmitter {
  protected children: BehaviorNode[];
  protected name: string;
  protected description: string;

  constructor(name: string, description: string = '') {
    super();
    this.children = [];
    this.name = name;
    this.description = description;
  }

  abstract execute(context: AIContext): BehaviorNodeResult;

  addChild(child: BehaviorNode): void {
    this.children.push(child);
  }

  removeChild(child: BehaviorNode): void {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
    }
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getChildren(): BehaviorNode[] {
    return [...this.children];
  }
}

// Composite Nodes
export class SequenceNode extends BehaviorNode {
  private currentChildIndex: number = 0;

  constructor(name: string, description: string = '') {
    super(name, description);
  }

  execute(context: AIContext): BehaviorNodeResult {
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const result = this.children[i].execute(context);

      if (result.status === BehaviorNodeStatus.RUNNING) {
        this.currentChildIndex = i;
        return result;
      }

      if (result.status === BehaviorNodeStatus.FAILURE) {
        this.currentChildIndex = 0;
        return result;
      }
    }

    this.currentChildIndex = 0;
    return { status: BehaviorNodeStatus.SUCCESS };
  }
}

export class SelectorNode extends BehaviorNode {
  private currentChildIndex: number = 0;

  constructor(name: string, description: string = '') {
    super(name, description);
  }

  execute(context: AIContext): BehaviorNodeResult {
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const result = this.children[i].execute(context);

      if (result.status === BehaviorNodeStatus.RUNNING) {
        this.currentChildIndex = i;
        return result;
      }

      if (result.status === BehaviorNodeStatus.SUCCESS) {
        this.currentChildIndex = 0;
        return result;
      }
    }

    this.currentChildIndex = 0;
    return { status: BehaviorNodeStatus.FAILURE };
  }
}

export class ParallelNode extends BehaviorNode {
  private requiredSuccesses: number;

  constructor(name: string, requiredSuccesses: number = 1, description: string = '') {
    super(name, description);
    this.requiredSuccesses = requiredSuccesses;
  }

  execute(context: AIContext): BehaviorNodeResult {
    let successes = 0;
    let failures = 0;
    let running = 0;

    for (const child of this.children) {
      const result = child.execute(context);

      switch (result.status) {
        case BehaviorNodeStatus.SUCCESS:
          successes++;
          break;
        case BehaviorNodeStatus.FAILURE:
          failures++;
          break;
        case BehaviorNodeStatus.RUNNING:
          running++;
          break;
      }
    }

    if (successes >= this.requiredSuccesses) {
      return { status: BehaviorNodeStatus.SUCCESS };
    }

    if (failures > this.children.length - this.requiredSuccesses) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    return { status: BehaviorNodeStatus.RUNNING };
  }
}

// Decorator Nodes
export class InverterNode extends BehaviorNode {
  constructor(name: string, child: BehaviorNode, description: string = '') {
    super(name, description);
    this.addChild(child);
  }

  execute(context: AIContext): BehaviorNodeResult {
    if (this.children.length === 0) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    const result = this.children[0].execute(context);

    if (result.status === BehaviorNodeStatus.SUCCESS) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    if (result.status === BehaviorNodeStatus.FAILURE) {
      return { status: BehaviorNodeStatus.SUCCESS };
    }

    return result; // RUNNING stays RUNNING
  }
}

export class RepeatNode extends BehaviorNode {
  private maxRepeats: number;
  private currentRepeats: number = 0;

  constructor(name: string, child: BehaviorNode, maxRepeats: number = -1, description: string = '') {
    super(name, description);
    this.addChild(child);
    this.maxRepeats = maxRepeats;
  }

  execute(context: AIContext): BehaviorNodeResult {
    if (this.children.length === 0) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    const result = this.children[0].execute(context);

    if (result.status === BehaviorNodeStatus.RUNNING) {
      return result;
    }

    if (result.status === BehaviorNodeStatus.SUCCESS) {
      this.currentRepeats++;

      if (this.maxRepeats > 0 && this.currentRepeats >= this.maxRepeats) {
        this.currentRepeats = 0;
        return { status: BehaviorNodeStatus.SUCCESS };
      }

      return { status: BehaviorNodeStatus.RUNNING };
    }

    this.currentRepeats = 0;
    return result;
  }
}

export class RetryNode extends BehaviorNode {
  private maxRetries: number;
  private currentRetries: number = 0;

  constructor(name: string, child: BehaviorNode, maxRetries: number = 3, description: string = '') {
    super(name, description);
    this.addChild(child);
    this.maxRetries = maxRetries;
  }

  execute(context: AIContext): BehaviorNodeResult {
    if (this.children.length === 0) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    const result = this.children[0].execute(context);

    if (result.status === BehaviorNodeStatus.RUNNING || result.status === BehaviorNodeStatus.SUCCESS) {
      this.currentRetries = 0;
      return result;
    }

    // FAILURE case
    this.currentRetries++;

    if (this.currentRetries < this.maxRetries) {
      return { status: BehaviorNodeStatus.RUNNING };
    }

    this.currentRetries = 0;
    return { status: BehaviorNodeStatus.FAILURE };
  }
}

// Leaf Nodes
export abstract class ActionNode extends BehaviorNode {
  constructor(name: string, description: string = '') {
    super(name, description);
  }

  abstract execute(context: AIContext): BehaviorNodeResult;
}

export abstract class ConditionNode extends BehaviorNode {
  constructor(name: string, description: string = '') {
    super(name, description);
  }

  abstract evaluate(context: AIContext): boolean;

  execute(context: AIContext): BehaviorNodeResult {
    const result = this.evaluate(context);
    return {
      status: result ? BehaviorNodeStatus.SUCCESS : BehaviorNodeStatus.FAILURE
    };
  }
}

// Utility Action Nodes
export class MoveToPositionAction extends ActionNode {
  private targetPosition: { x: number; y: number; z: number };
  private speed: number;
  private tolerance: number;

  constructor(targetPosition: { x: number; y: number; z: number }, speed: number = 1, tolerance: number = 1) {
    super('MoveToPosition', `Move to position (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
    this.targetPosition = targetPosition;
    this.speed = speed;
    this.tolerance = tolerance;
  }

  execute(context: AIContext): BehaviorNodeResult {
    const agent = context.agent;
    const distance = this.calculateDistance(agent.position, this.targetPosition);

    if (distance <= this.tolerance) {
      return { status: BehaviorNodeStatus.SUCCESS };
    }

    // Move towards target
    const direction = this.normalize({
      x: this.targetPosition.x - agent.position.x,
      y: this.targetPosition.y - agent.position.y,
      z: this.targetPosition.z - agent.position.z
    });

    agent.position.x += direction.x * this.speed * context.deltaTime;
    agent.position.y += direction.y * this.speed * context.deltaTime;
    agent.position.z += direction.z * this.speed * context.deltaTime;

    return { status: BehaviorNodeStatus.RUNNING };
  }

  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }

  private normalize(vector: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };

    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length
    };
  }
}

export class WaitAction extends ActionNode {
  private duration: number;
  private startTime: number = 0;

  constructor(duration: number) {
    super('Wait', `Wait for ${duration} seconds`);
    this.duration = duration;
  }

  execute(context: AIContext): BehaviorNodeResult {
    if (this.startTime === 0) {
      this.startTime = Date.now();
    }

    const elapsed = (Date.now() - this.startTime) / 1000;

    if (elapsed >= this.duration) {
      this.startTime = 0;
      return { status: BehaviorNodeStatus.SUCCESS };
    }

    return { status: BehaviorNodeStatus.RUNNING };
  }
}

export class AttackTargetAction extends ActionNode {
  private targetId: string;
  private damage: number;
  private range: number;
  private cooldown: number;
  private lastAttack: number = 0;

  constructor(targetId: string, damage: number = 10, range: number = 5, cooldown: number = 1) {
    super('AttackTarget', `Attack target ${targetId}`);
    this.targetId = targetId;
    this.damage = damage;
    this.range = range;
    this.cooldown = cooldown;
  }

  execute(context: AIContext): BehaviorNodeResult {
    const target = context.world.entities[this.targetId];
    if (!target) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    const distance = this.calculateDistance(context.agent.position, target.position);
    if (distance > this.range) {
      return { status: BehaviorNodeStatus.FAILURE };
    }

    const now = Date.now() / 1000;
    if (now - this.lastAttack < this.cooldown) {
      return { status: BehaviorNodeStatus.RUNNING };
    }

    // Perform attack
    this.lastAttack = now;
    this.emit('attack', {
      attacker: context.agent.id,
      target: this.targetId,
      damage: this.damage,
      timestamp: now
    });

    return { status: BehaviorNodeStatus.SUCCESS };
  }

  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }
}

// Utility Condition Nodes
export class HealthBelowThreshold extends ConditionNode {
  private threshold: number;

  constructor(threshold: number = 0.5) {
    super('HealthBelowThreshold', `Health below ${(threshold * 100).toFixed(0)}%`);
    this.threshold = threshold;
  }

  evaluate(context: AIContext): boolean {
    return (context.agent.health / context.agent.maxHealth) < this.threshold;
  }
}

export class EnemyInRange extends ConditionNode {
  private range: number;

  constructor(range: number = 10) {
    super('EnemyInRange', `Enemy within ${range} units`);
    this.range = range;
  }

  evaluate(context: AIContext): boolean {
    const agent = context.agent;

    for (const entityId of context.sensors.vision.visibleEntities) {
      const entity = context.world.entities[entityId];
      if (entity && entity.isHostile) {
        const distance = this.calculateDistance(agent.position, entity.position);
        if (distance <= this.range) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }
}

export class ResourceAvailable extends ConditionNode {
  private resourceType: string;
  private minimumAmount: number;

  constructor(resourceType: string, minimumAmount: number = 1) {
    super('ResourceAvailable', `${resourceType} available (min: ${minimumAmount})`);
    this.resourceType = resourceType;
    this.minimumAmount = minimumAmount;
  }

  evaluate(context: AIContext): boolean {
    for (const resourceId of context.sensors.vision.visibleResources) {
      const resource = context.world.resources[resourceId];
      if (resource && resource.type === this.resourceType && resource.amount >= this.minimumAmount) {
        return true;
      }
    }

    return false;
  }
}

// Main Behavior Tree Class
export class BehaviorTree extends EventEmitter {
  private rootNode: BehaviorNode | null = null;
  private isRunning: boolean = false;
  private context: AIContext;

  constructor(context: AIContext) {
    super();
    this.context = context;
  }

  setRoot(node: BehaviorNode): void {
    this.rootNode = node;
  }

  getRoot(): BehaviorNode | null {
    return this.rootNode;
  }

  tick(deltaTime: number): BehaviorNodeResult | null {
    if (!this.rootNode) return null;

    this.context.deltaTime = deltaTime;
    const result = this.rootNode.execute(this.context);

    this.emit('tick', {
      result,
      context: this.context,
      timestamp: Date.now()
    });

    return result;
  }

  start(): void {
    this.isRunning = true;
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }

  isTreeRunning(): boolean {
    return this.isRunning;
  }

  updateContext(updates: Partial<AIContext>): void {
    this.context = { ...this.context, ...updates };
  }

  // Utility methods for building trees
  createSequence(name: string, ...children: BehaviorNode[]): SequenceNode {
    const sequence = new SequenceNode(name);
    children.forEach(child => sequence.addChild(child));
    return sequence;
  }

  createSelector(name: string, ...children: BehaviorNode[]): SelectorNode {
    const selector = new SelectorNode(name);
    children.forEach(child => selector.addChild(child));
    return selector;
  }

  createParallel(name: string, requiredSuccesses: number, ...children: BehaviorNode[]): ParallelNode {
    const parallel = new ParallelNode(name, requiredSuccesses);
    children.forEach(child => parallel.addChild(child));
    return parallel;
  }

  createInverter(name: string, child: BehaviorNode): InverterNode {
    return new InverterNode(name, child);
  }

  createRepeat(name: string, child: BehaviorNode, maxRepeats: number = -1): RepeatNode {
    return new RepeatNode(name, child, maxRepeats);
  }

  createRetry(name: string, child: BehaviorNode, maxRetries: number = 3): RetryNode {
    return new RetryNode(name, child, maxRetries);
  }

  // Tree visualization for debugging
  visualize(): string {
    if (!this.rootNode) return 'Empty Tree';

    return this.visualizeNode(this.rootNode, 0);
  }

  private visualizeNode(node: BehaviorNode, depth: number): string {
    const indent = '  '.repeat(depth);
    let result = `${indent}${node.getName()}`;

    if (node.getDescription()) {
      result += ` - ${node.getDescription()}`;
    }

    result += '\n';

    for (const child of node.getChildren()) {
      result += this.visualizeNode(child, depth + 1);
    }

    return result;
  }
}