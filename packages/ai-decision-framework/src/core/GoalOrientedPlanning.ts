import { EventEmitter } from 'events';
import { AIContext, Goal, GoalType, GoalStatus } from './BehaviorTree';

export interface PlanAction {
  id: string;
  name: string;
  description: string;
  cost: number;
  duration: number;
  preconditions: WorldCondition[];
  effects: WorldEffect[];
  parameters: { [key: string]: any };
  cooldown: number;
  lastExecuted: number;
  successRate: number;
  priority: number;
}

export interface WorldCondition {
  type: 'property' | 'comparison' | 'existence' | 'proximity' | 'state';
  target: string;
  property?: string;
  operator?: 'equals' | 'greater' | 'less' | 'contains' | 'within';
  value: any;
  tolerance?: number;
}

export interface WorldEffect {
  type: 'property' | 'create' | 'destroy' | 'move' | 'modify';
  target: string;
  property?: string;
  value: any;
  operation?: 'set' | 'add' | 'multiply' | 'toggle';
}

export interface PlanNode {
  action: PlanAction;
  cost: number;
  heuristic: number;
  totalCost: number;
  parent: PlanNode | null;
  depth: number;
  worldState: WorldState;
}

export interface WorldState {
  properties: Map<string, any>;
  entities: Map<string, EntityState>;
  resources: Map<string, ResourceState>;
  timestamp: number;
}

export interface EntityState {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  health: number;
  properties: { [key: string]: any };
  exists: boolean;
}

export interface ResourceState {
  id: string;
  type: string;
  amount: number;
  location: { x: number; y: number; z: number };
  quality: number;
}

export interface Plan {
  id: string;
  goal: Goal;
  actions: PlanAction[];
  estimatedCost: number;
  estimatedDuration: number;
  confidence: number;
  createdAt: number;
  status: PlanStatus;
  currentStep: number;
  actualCost: number;
  actualDuration: number;
}

export type PlanStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

export interface PlanningConfig {
  maxDepth: number;
  maxNodes: number;
  timeout: number;
  heuristicWeight: number;
  costWeight: number;
  enableLearning: boolean;
  planCacheSize: number;
  replanThreshold: number;
}

export class GoalOrientedPlanner extends EventEmitter {
  private availableActions: Map<string, PlanAction>;
  private worldState: WorldState;
  private activePlans: Map<string, Plan>;
  private planCache: Map<string, Plan>;
  private config: PlanningConfig;
  private context: AIContext;
  private actionLibrary: ActionLibrary;

  constructor(context: AIContext, config: PlanningConfig) {
    super();
    this.context = context;
    this.config = config;
    this.availableActions = new Map();
    this.worldState = this.initializeWorldState();
    this.activePlans = new Map();
    this.planCache = new Map();
    this.actionLibrary = new ActionLibrary();

    this.initializeDefaultActions();
  }

  // Goal planning
  planForGoal(goal: Goal): Plan | null {
    console.log(`🎯 Planning for goal: ${goal.description}`);

    // Check cache first
    const cacheKey = this.generateCacheKey(goal);
    if (this.planCache.has(cacheKey)) {
      const cachedPlan = this.planCache.get(cacheKey)!;
      console.log(`💾 Using cached plan for goal: ${goal.description}`);
      return this.clonePlan(cachedPlan);
    }

    // Create initial world state
    const startState = this.getCurrentWorldState();
    const goalState = this.createGoalState(goal);

    // Use A* algorithm for planning
    const plan = this.aStarPlan(startState, goalState, goal);

    if (plan) {
      // Cache successful plan
      this.planCache.set(cacheKey, plan);

      // Limit cache size
      if (this.planCache.size > this.config.planCacheSize) {
        const oldestKey = this.planCache.keys().next().value;
        if (oldestKey !== undefined) {
          this.planCache.delete(oldestKey);
        }
      }

      console.log(`✅ Plan created: ${plan.actions.length} steps, estimated cost: ${plan.estimatedCost}`);
    } else {
      console.log(`❌ No plan found for goal: ${goal.description}`);
    }

    return plan;
  }

  private aStarPlan(startState: WorldState, goalState: WorldState, goal: Goal): Plan | null {
    const openSet: PlanNode[] = [];
    const closedSet: Set<string> = new Set();
    const startNode: PlanNode = {
      action: this.createDummyAction('start'),
      cost: 0,
      heuristic: this.calculateHeuristic(startState, goalState),
      totalCost: 0,
      parent: null,
      depth: 0,
      worldState: startState
    };

    openSet.push(startNode);
    let iterations = 0;
    const maxIterations = this.config.maxNodes;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;

      // Get node with lowest total cost
      openSet.sort((a, b) => a.totalCost - b.totalCost);
      const current = openSet.shift()!;

      const stateKey = this.hashWorldState(current.worldState);
      if (closedSet.has(stateKey)) continue;
      closedSet.add(stateKey);

      // Check if we've reached the goal
      if (this.isGoalSatisfied(current.worldState, goalState)) {
        return this.reconstructPlan(current, goal);
      }

      // Explore neighbors (possible actions)
      if (current.depth < this.config.maxDepth) {
        for (const action of this.getApplicableActions(current.worldState)) {
          const newWorldState = this.applyActionToState(current.worldState, action);
          const newStateKey = this.hashWorldState(newWorldState);

          if (closedSet.has(newStateKey)) continue;

          const newNode: PlanNode = {
            action,
            cost: current.cost + action.cost,
            heuristic: this.calculateHeuristic(newWorldState, goalState),
            totalCost: 0,
            parent: current,
            depth: current.depth + 1,
            worldState: newWorldState
          };

          newNode.totalCost = newNode.cost + newNode.heuristic * this.config.heuristicWeight;
          openSet.push(newNode);
        }
      }
    }

    return null; // No plan found
  }

  // Plan execution
  executePlan(plan: Plan): void {
    if (plan.status !== 'pending') {
      console.warn(`Cannot execute plan ${plan.id} - status is ${plan.status}`);
      return;
    }

    plan.status = 'executing';
    this.activePlans.set(plan.id, plan);

    console.log(`🚀 Starting plan execution: ${plan.goal.description}`);
    this.emit('plan_started', plan);

    this.executeNextAction(plan);
  }

  private executeNextAction(plan: Plan): void {
    if (plan.currentStep >= plan.actions.length) {
      this.completePlan(plan);
      return;
    }

    const currentAction = plan.actions[plan.currentStep];
    console.log(`⚡ Executing action: ${currentAction.name}`);

    // Check if action is still valid
    if (!this.canExecuteAction(currentAction)) {
      console.log(`❌ Action ${currentAction.name} is no longer valid, replanning...`);
      this.replanForGoal(plan.goal);
      return;
    }

    // Execute the action
    this.executeAction(currentAction, plan);
  }

  private executeAction(action: PlanAction, plan: Plan): void {
    const startTime = Date.now();

    // Apply action effects to world state
    const success = this.applyActionEffects(action);

    if (success) {
      plan.currentStep++;
      plan.actualCost += action.cost;

      // Update action statistics
      this.updateActionStatistics(action, true);

      this.emit('action_completed', {
        action,
        plan,
        success: true,
        duration: Date.now() - startTime
      });

      // Continue with next action after delay
      setTimeout(() => {
        this.executeNextAction(plan);
      }, action.duration);

    } else {
      console.log(`❌ Action ${action.name} failed`);
      this.updateActionStatistics(action, false);

      this.emit('action_failed', { action, plan });

      // Try to replan or fail the entire plan
      if (plan.goal.priority > 0.5) {
        this.replanForGoal(plan.goal);
      } else {
        this.failPlan(plan, `Action ${action.name} failed`);
      }
    }
  }

  private completePlan(plan: Plan): void {
    plan.status = 'completed';
    plan.actualDuration = Date.now() - plan.createdAt;

    console.log(`✅ Plan completed: ${plan.goal.description}`);
    console.log(`   - Steps: ${plan.actions.length}`);
    console.log(`   - Actual cost: ${plan.actualCost}`);
    console.log(`   - Duration: ${plan.actualDuration}ms`);

    this.activePlans.delete(plan.id);
    this.emit('plan_completed', plan);

    // Mark goal as completed
    plan.goal.status = 'completed';
    plan.goal.progress = 1.0;
  }

  private failPlan(plan: Plan, reason: string): void {
    plan.status = 'failed';
    console.log(`❌ Plan failed: ${reason}`);

    this.activePlans.delete(plan.id);
    this.emit('plan_failed', { plan, reason });

    // Mark goal as failed
    plan.goal.status = 'failed';
  }

  // Action management
  addAction(action: PlanAction): void {
    this.availableActions.set(action.id, action);
    this.emit('action_added', action);
  }

  removeAction(actionId: string): boolean {
    const removed = this.availableActions.delete(actionId);
    if (removed) {
      this.emit('action_removed', actionId);
    }
    return removed;
  }

  getAction(actionId: string): PlanAction | undefined {
    return this.availableActions.get(actionId);
  }

  getAvailableActions(): PlanAction[] {
    return Array.from(this.availableActions.values());
  }

  private getApplicableActions(worldState: WorldState): PlanAction[] {
    const applicable: PlanAction[] = [];

    for (const action of this.availableActions.values()) {
      if (this.arePreConditionsMet(action.preconditions, worldState)) {
        // Check cooldown
        const timeSinceLast = Date.now() - action.lastExecuted;
        if (timeSinceLast >= action.cooldown) {
          applicable.push(action);
        }
      }
    }

    return applicable.sort((a, b) => b.priority - a.priority);
  }

  private canExecuteAction(action: PlanAction): boolean {
    const currentState = this.getCurrentWorldState();
    return this.arePreConditionsMet(action.preconditions, currentState);
  }

  // World state management
  private initializeWorldState(): WorldState {
    return {
      properties: new Map(),
      entities: new Map(),
      resources: new Map(),
      timestamp: Date.now()
    };
  }

  private getCurrentWorldState(): WorldState {
    const state: WorldState = {
      properties: new Map(),
      entities: new Map(),
      resources: new Map(),
      timestamp: Date.now()
    };

    // Populate from AI context
    const agent = this.context.agent;
    const world = this.context.world;

    // Agent properties
    state.properties.set('agent.health', agent.health);
    state.properties.set('agent.energy', agent.energy);
    state.properties.set('agent.position', agent.position);

    // World entities
    for (const [entityId, entity] of Object.entries(world.entities)) {
      state.entities.set(entityId, {
        id: entityId,
        type: entity.type,
        position: entity.position,
        health: entity.properties.health || 100,
        properties: entity.properties,
        exists: true
      });
    }

    // Resources
    for (const [resourceId, resource] of Object.entries(world.resources)) {
      state.resources.set(resourceId, {
        id: resourceId,
        type: resource.type,
        amount: resource.amount,
        location: resource.position,
        quality: resource.quality
      });
    }

    return state;
  }

  private createGoalState(goal: Goal): WorldState {
    const goalState = this.cloneWorldState(this.getCurrentWorldState());

    // Apply goal conditions to create target state
    switch (goal.type) {
      case 'survival':
        goalState.properties.set('agent.health', this.context.agent.maxHealth);
        goalState.properties.set('agent.energy', this.context.agent.maxEnergy);
        break;

      case 'resource':
        if (goal.parameters.resourceType && goal.parameters.amount) {
          const currentAmount = this.getResourceAmount(goalState, goal.parameters.resourceType);
          goalState.properties.set(`resource.${goal.parameters.resourceType}`, currentAmount + goal.parameters.amount);
        }
        break;

      case 'combat':
        if (goal.parameters.target) {
          // Target should be defeated
          goalState.entities.delete(goal.parameters.target);
        }
        break;

      case 'exploration':
        if (goal.parameters.location) {
          goalState.properties.set('agent.position', goal.parameters.location);
          goalState.properties.set('location.explored', true);
        }
        break;
    }

    return goalState;
  }

  // Condition and effect evaluation
  private arePreConditionsMet(conditions: WorldCondition[], worldState: WorldState): boolean {
    return conditions.every(condition => this.isConditionMet(condition, worldState));
  }

  private isConditionMet(condition: WorldCondition, worldState: WorldState): boolean {
    switch (condition.type) {
      case 'property':
        return this.evaluatePropertyCondition(condition, worldState);

      case 'comparison':
        return this.evaluateComparisonCondition(condition, worldState);

      case 'existence':
        return this.evaluateExistenceCondition(condition, worldState);

      case 'proximity':
        return this.evaluateProximityCondition(condition, worldState);

      case 'state':
        return this.evaluateStateCondition(condition, worldState);

      default:
        return false;
    }
  }

  private evaluatePropertyCondition(condition: WorldCondition, worldState: WorldState): boolean {
    const value = this.getPropertyValue(condition.target, condition.property!, worldState);
    return this.compareValues(value, condition.value, condition.operator || 'equals');
  }

  private evaluateComparisonCondition(condition: WorldCondition, worldState: WorldState): boolean {
    const value = this.getPropertyValue(condition.target, condition.property!, worldState);
    return this.compareValues(value, condition.value, condition.operator!);
  }

  private evaluateExistenceCondition(condition: WorldCondition, worldState: WorldState): boolean {
    if (condition.target.startsWith('entity.')) {
      const entityId = condition.target.substring(7);
      return worldState.entities.has(entityId);
    }

    if (condition.target.startsWith('resource.')) {
      const resourceId = condition.target.substring(9);
      return worldState.resources.has(resourceId);
    }

    return worldState.properties.has(condition.target);
  }

  private evaluateProximityCondition(condition: WorldCondition, worldState: WorldState): boolean {
    const agentPosition = worldState.properties.get('agent.position');
    if (!agentPosition) return false;

    const targetPosition = this.getTargetPosition(condition.target, worldState);
    if (!targetPosition) return false;

    const distance = this.calculateDistance(agentPosition, targetPosition);
    return distance <= (condition.value as number);
  }

  private evaluateStateCondition(condition: WorldCondition, worldState: WorldState): boolean {
    const currentState = this.getPropertyValue(condition.target, condition.property!, worldState);
    return currentState === condition.value;
  }

  private applyActionToState(worldState: WorldState, action: PlanAction): WorldState {
    const newState = this.cloneWorldState(worldState);

    for (const effect of action.effects) {
      this.applyEffect(effect, newState);
    }

    return newState;
  }

  private applyActionEffects(action: PlanAction): boolean {
    try {
      for (const effect of action.effects) {
        this.applyEffectToRealWorld(effect);
      }

      action.lastExecuted = Date.now();
      return true;
    } catch (error) {
      console.error(`Error applying action effects: ${error}`);
      return false;
    }
  }

  private applyEffect(effect: WorldEffect, worldState: WorldState): void {
    switch (effect.type) {
      case 'property':
        this.applyPropertyEffect(effect, worldState);
        break;

      case 'create':
        this.applyCreateEffect(effect, worldState);
        break;

      case 'destroy':
        this.applyDestroyEffect(effect, worldState);
        break;

      case 'move':
        this.applyMoveEffect(effect, worldState);
        break;

      case 'modify':
        this.applyModifyEffect(effect, worldState);
        break;
    }
  }

  private applyEffectToRealWorld(effect: WorldEffect): void {
    // Apply effects to the real world context
    const agent = this.context.agent;
    const world = this.context.world;

    switch (effect.type) {
      case 'property':
        if (effect.target === 'agent' && effect.property) {
          (agent as any)[effect.property] = effect.value;
        }
        break;

      case 'move':
        if (effect.target === 'agent') {
          agent.position = effect.value;
        }
        break;

      // Other effects would be implemented based on game requirements
    }
  }

  // Utility methods
  private generateCacheKey(goal: Goal): string {
    return `${goal.type}_${JSON.stringify(goal.parameters)}_${goal.priority}`;
  }

  private clonePlan(plan: Plan): Plan {
    return {
      ...plan,
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      status: 'pending',
      currentStep: 0,
      actualCost: 0,
      actualDuration: 0,
      actions: [...plan.actions]
    };
  }

  private cloneWorldState(worldState: WorldState): WorldState {
    return {
      properties: new Map(worldState.properties),
      entities: new Map(worldState.entities),
      resources: new Map(worldState.resources),
      timestamp: Date.now()
    };
  }

  private hashWorldState(worldState: WorldState): string {
    const hash = {
      properties: Array.from(worldState.properties.entries()),
      entities: Array.from(worldState.entities.entries()),
      resources: Array.from(worldState.resources.entries())
    };

    return JSON.stringify(hash);
  }

  private calculateHeuristic(currentState: WorldState, goalState: WorldState): number {
    let heuristic = 0;

    // Compare properties
    for (const [key, goalValue] of goalState.properties) {
      const currentValue = currentState.properties.get(key);
      if (currentValue !== goalValue) {
        heuristic += 1;
      }
    }

    // Compare entities
    for (const [entityId, goalEntity] of goalState.entities) {
      const currentEntity = currentState.entities.get(entityId);
      if (!currentEntity || !this.entitiesEqual(currentEntity, goalEntity)) {
        heuristic += 2;
      }
    }

    // Compare resources
    for (const [resourceId, goalResource] of goalState.resources) {
      const currentResource = currentState.resources.get(resourceId);
      if (!currentResource || !this.resourcesEqual(currentResource, goalResource)) {
        heuristic += 1;
      }
    }

    return heuristic;
  }

  private isGoalSatisfied(currentState: WorldState, goalState: WorldState): boolean {
    return this.calculateHeuristic(currentState, goalState) === 0;
  }

  private reconstructPlan(node: PlanNode, goal: Goal): Plan {
    const actions: PlanAction[] = [];
    let current = node;

    while (current.parent) {
      actions.unshift(current.action);
      current = current.parent;
    }

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      goal,
      actions,
      estimatedCost: node.cost,
      estimatedDuration: actions.reduce((total, action) => total + action.duration, 0),
      confidence: this.calculatePlanConfidence(actions),
      createdAt: Date.now(),
      status: 'pending',
      currentStep: 0,
      actualCost: 0,
      actualDuration: 0
    };
  }

  private calculatePlanConfidence(actions: PlanAction[]): number {
    if (actions.length === 0) return 1.0;

    const avgSuccessRate = actions.reduce((sum, action) => sum + action.successRate, 0) / actions.length;
    return avgSuccessRate;
  }

  private replanForGoal(goal: Goal): void {
    console.log(`🔄 Replanning for goal: ${goal.description}`);

    // Remove from cache to force new plan
    const cacheKey = this.generateCacheKey(goal);
    this.planCache.delete(cacheKey);

    // Create new plan
    const newPlan = this.planForGoal(goal);
    if (newPlan) {
      this.executePlan(newPlan);
    } else {
      console.log(`❌ Replanning failed for goal: ${goal.description}`);
      goal.status = 'failed';
    }
  }

  private updateActionStatistics(action: PlanAction, success: boolean): void {
    if (!this.config.enableLearning) return;

    // Update success rate using exponential moving average
    const alpha = 0.1;
    const outcome = success ? 1 : 0;
    action.successRate = action.successRate * (1 - alpha) + outcome * alpha;

    this.emit('action_statistics_updated', { action, success });
  }

  // Helper methods
  private createDummyAction(name: string): PlanAction {
    return {
      id: `dummy_${name}`,
      name,
      description: `Dummy action: ${name}`,
      cost: 0,
      duration: 0,
      preconditions: [],
      effects: [],
      parameters: {},
      cooldown: 0,
      lastExecuted: 0,
      successRate: 1.0,
      priority: 0
    };
  }

  private getPropertyValue(target: string, property: string, worldState: WorldState): any {
    if (target === 'agent') {
      return worldState.properties.get(`agent.${property}`);
    }

    if (target.startsWith('entity.')) {
      const entityId = target.substring(7);
      const entity = worldState.entities.get(entityId);
      return entity ? entity.properties[property] : undefined;
    }

    if (target.startsWith('resource.')) {
      const resourceId = target.substring(9);
      const resource = worldState.resources.get(resourceId);
      return resource ? (resource as any)[property] : undefined;
    }

    return worldState.properties.get(`${target}.${property}`);
  }

  private compareValues(value1: any, value2: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return value1 === value2;
      case 'greater':
        return value1 > value2;
      case 'less':
        return value1 < value2;
      case 'contains':
        return Array.isArray(value1) && value1.includes(value2);
      case 'within':
        return Math.abs(value1 - value2) <= (value2 * 0.1); // Within 10%
      default:
        return false;
    }
  }

  private getTargetPosition(target: string, worldState: WorldState): any {
    if (target === 'agent') {
      return worldState.properties.get('agent.position');
    }

    if (target.startsWith('entity.')) {
      const entityId = target.substring(7);
      const entity = worldState.entities.get(entityId);
      return entity ? entity.position : null;
    }

    if (target.startsWith('resource.')) {
      const resourceId = target.substring(9);
      const resource = worldState.resources.get(resourceId);
      return resource ? resource.location : null;
    }

    return null;
  }

  private calculateDistance(pos1: any, pos2: any): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2) +
      Math.pow(pos2.z - pos1.z, 2)
    );
  }

  private getResourceAmount(worldState: WorldState, resourceType: string): number {
    let total = 0;
    for (const resource of worldState.resources.values()) {
      if (resource.type === resourceType) {
        total += resource.amount;
      }
    }
    return total;
  }

  private entitiesEqual(entity1: EntityState, entity2: EntityState): boolean {
    return entity1.id === entity2.id &&
           entity1.type === entity2.type &&
           entity1.exists === entity2.exists;
  }

  private resourcesEqual(resource1: ResourceState, resource2: ResourceState): boolean {
    return resource1.id === resource2.id &&
           resource1.type === resource2.type &&
           resource1.amount === resource2.amount;
  }

  // Effect application methods
  private applyPropertyEffect(effect: WorldEffect, worldState: WorldState): void {
    const key = effect.property ? `${effect.target}.${effect.property}` : effect.target;

    switch (effect.operation) {
      case 'set':
        worldState.properties.set(key, effect.value);
        break;
      case 'add':
        const current = worldState.properties.get(key) || 0;
        worldState.properties.set(key, current + effect.value);
        break;
      case 'multiply':
        const currentMul = worldState.properties.get(key) || 1;
        worldState.properties.set(key, currentMul * effect.value);
        break;
      case 'toggle':
        const currentBool = worldState.properties.get(key) || false;
        worldState.properties.set(key, !currentBool);
        break;
      default:
        worldState.properties.set(key, effect.value);
    }
  }

  private applyCreateEffect(effect: WorldEffect, worldState: WorldState): void {
    if (effect.target.startsWith('entity.')) {
      const entityId = effect.target.substring(7);
      worldState.entities.set(entityId, effect.value);
    } else if (effect.target.startsWith('resource.')) {
      const resourceId = effect.target.substring(9);
      worldState.resources.set(resourceId, effect.value);
    }
  }

  private applyDestroyEffect(effect: WorldEffect, worldState: WorldState): void {
    if (effect.target.startsWith('entity.')) {
      const entityId = effect.target.substring(7);
      worldState.entities.delete(entityId);
    } else if (effect.target.startsWith('resource.')) {
      const resourceId = effect.target.substring(9);
      worldState.resources.delete(resourceId);
    }
  }

  private applyMoveEffect(effect: WorldEffect, worldState: WorldState): void {
    if (effect.target === 'agent') {
      worldState.properties.set('agent.position', effect.value);
    } else if (effect.target.startsWith('entity.')) {
      const entityId = effect.target.substring(7);
      const entity = worldState.entities.get(entityId);
      if (entity) {
        entity.position = effect.value;
      }
    }
  }

  private applyModifyEffect(effect: WorldEffect, worldState: WorldState): void {
    if (effect.target.startsWith('entity.')) {
      const entityId = effect.target.substring(7);
      const entity = worldState.entities.get(entityId);
      if (entity && effect.property) {
        entity.properties[effect.property] = effect.value;
      }
    }
  }

  private initializeDefaultActions(): void {
    // Add some default actions
    this.addAction({
      id: 'move',
      name: 'Move',
      description: 'Move to a target location',
      cost: 1,
      duration: 1000,
      preconditions: [],
      effects: [
        {
          type: 'move',
          target: 'agent',
          value: null // Will be set at runtime
        }
      ],
      parameters: {},
      cooldown: 0,
      lastExecuted: 0,
      successRate: 0.95,
      priority: 1
    });

    this.addAction({
      id: 'rest',
      name: 'Rest',
      description: 'Rest to recover health and energy',
      cost: 0,
      duration: 5000,
      preconditions: [
        {
          type: 'comparison',
          target: 'agent',
          property: 'health',
          operator: 'less',
          value: 100
        }
      ],
      effects: [
        {
          type: 'property',
          target: 'agent',
          property: 'health',
          value: 20,
          operation: 'add'
        },
        {
          type: 'property',
          target: 'agent',
          property: 'energy',
          value: 30,
          operation: 'add'
        }
      ],
      parameters: {},
      cooldown: 10000,
      lastExecuted: 0,
      successRate: 1.0,
      priority: 3
    });
  }

  // Public API
  getActivePlans(): Plan[] {
    return Array.from(this.activePlans.values());
  }

  cancelPlan(planId: string): boolean {
    const plan = this.activePlans.get(planId);
    if (plan && plan.status === 'executing') {
      plan.status = 'cancelled';
      this.activePlans.delete(planId);
      this.emit('plan_cancelled', plan);
      return true;
    }
    return false;
  }

  updateContext(updates: Partial<AIContext>): void {
    this.context = { ...this.context, ...updates };
  }

  getStatistics(): {
    totalActions: number;
    activePlans: number;
    completedPlans: number;
    failedPlans: number;
    cacheSize: number;
    averageSuccessRate: number;
  } {
    const actions = Array.from(this.availableActions.values());
    const averageSuccessRate = actions.length > 0 ?
      actions.reduce((sum, action) => sum + action.successRate, 0) / actions.length : 0;

    return {
      totalActions: this.availableActions.size,
      activePlans: this.activePlans.size,
      completedPlans: 0, // Would be tracked in real implementation
      failedPlans: 0, // Would be tracked in real implementation
      cacheSize: this.planCache.size,
      averageSuccessRate
    };
  }
}

// Action library for common game actions
class ActionLibrary {
  getPrebuiltActions(): PlanAction[] {
    return [
      {
        id: 'attack',
        name: 'Attack',
        description: 'Attack a target entity',
        cost: 2,
        duration: 2000,
        preconditions: [
          {
            type: 'proximity',
            target: 'target',
            value: 5,
            operator: 'within'
          }
        ],
        effects: [
          {
            type: 'modify',
            target: 'entity.target',
            property: 'health',
            value: -10,
            operation: 'add'
          }
        ],
        parameters: { damage: 10 },
        cooldown: 1000,
        lastExecuted: 0,
        successRate: 0.8,
        priority: 5
      },

      {
        id: 'gather_resource',
        name: 'Gather Resource',
        description: 'Gather a resource from the environment',
        cost: 1,
        duration: 3000,
        preconditions: [
          {
            type: 'proximity',
            target: 'resource',
            value: 2,
            operator: 'within'
          }
        ],
        effects: [
          {
            type: 'property',
            target: 'agent',
            property: 'inventory',
            value: 1,
            operation: 'add'
          }
        ],
        parameters: { resourceType: 'wood' },
        cooldown: 0,
        lastExecuted: 0,
        successRate: 0.9,
        priority: 2
      },

      {
        id: 'craft_item',
        name: 'Craft Item',
        description: 'Craft an item using resources',
        cost: 3,
        duration: 5000,
        preconditions: [
          {
            type: 'property',
            target: 'agent',
            property: 'wood',
            operator: 'greater',
            value: 2
          }
        ],
        effects: [
          {
            type: 'property',
            target: 'agent',
            property: 'wood',
            value: -3,
            operation: 'add'
          },
          {
            type: 'property',
            target: 'agent',
            property: 'tools',
            value: 1,
            operation: 'add'
          }
        ],
        parameters: { itemType: 'tool' },
        cooldown: 0,
        lastExecuted: 0,
        successRate: 0.95,
        priority: 3
      }
    ];
  }
}