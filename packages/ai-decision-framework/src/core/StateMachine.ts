import { EventEmitter } from 'events';
import { AIContext, Goal } from './BehaviorTree';

export interface StateTransition {
  from: string;
  to: string;
  condition: TransitionCondition;
  action?: TransitionAction;
  priority: number;
}

export interface TransitionCondition {
  type: 'function' | 'expression' | 'event';
  condition: string | ((context: AIContext) => boolean);
  parameters?: { [key: string]: any };
}

export interface TransitionAction {
  type: 'function' | 'event' | 'script';
  action: string | ((context: AIContext) => void);
  parameters?: { [key: string]: any };
}

export interface StateData {
  id: string;
  name: string;
  type: StateType;
  enterActions: StateAction[];
  updateActions: StateAction[];
  exitActions: StateAction[];
  properties: { [key: string]: any };
  subStates?: StateMachine;
  timeout?: number;
  defaultTransitions: string[];
}

export interface StateAction {
  type: 'function' | 'behavior_tree' | 'goal' | 'script' | 'animation' | 'sound';
  action: string | Function;
  parameters?: { [key: string]: any };
  priority?: number;
}

export type StateType = 'simple' | 'composite' | 'concurrent' | 'choice' | 'history';

export interface StateMachineConfig {
  initialState: string;
  globalTransitions: StateTransition[];
  allowParallelStates: boolean;
  maxHistorySize: number;
  enableLogging: boolean;
  updateFrequency: number;
}

export interface StateHistory {
  stateId: string;
  timestamp: number;
  duration: number;
  entryData: any;
  exitData: any;
  transitionTaken?: string;
}

export class StateMachine extends EventEmitter {
  private states: Map<string, StateData>;
  private transitions: StateTransition[];
  private currentState: string | null;
  private previousState: string | null;
  private stateHistory: StateHistory[];
  private context: AIContext;
  private config: StateMachineConfig;
  private stateStartTime: number;
  private isRunning: boolean;
  private updateTimer?: NodeJS.Timeout;
  private activeSubStates: Map<string, StateMachine>;

  constructor(context: AIContext, config: StateMachineConfig) {
    super();
    this.states = new Map();
    this.transitions = [...config.globalTransitions];
    this.currentState = null;
    this.previousState = null;
    this.stateHistory = [];
    this.context = context;
    this.config = config;
    this.stateStartTime = 0;
    this.isRunning = false;
    this.activeSubStates = new Map();
  }

  // State management
  addState(stateData: StateData): void {
    this.states.set(stateData.id, stateData);

    if (stateData.subStates) {
      this.activeSubStates.set(stateData.id, stateData.subStates);
    }

    this.emit('state_added', stateData);
  }

  removeState(stateId: string): boolean {
    if (this.currentState === stateId) {
      this.forceTransition('idle');
    }

    const removed = this.states.delete(stateId);
    this.activeSubStates.delete(stateId);

    if (removed) {
      this.emit('state_removed', stateId);
    }

    return removed;
  }

  getState(stateId: string): StateData | undefined {
    return this.states.get(stateId);
  }

  getCurrentState(): string | null {
    return this.currentState;
  }

  getPreviousState(): string | null {
    return this.previousState;
  }

  // Transition management
  addTransition(transition: StateTransition): void {
    this.transitions.push(transition);
    this.transitions.sort((a, b) => b.priority - a.priority);
    this.emit('transition_added', transition);
  }

  removeTransition(from: string, to: string): boolean {
    const index = this.transitions.findIndex(t => t.from === from && t.to === to);
    if (index > -1) {
      const removed = this.transitions.splice(index, 1)[0];
      this.emit('transition_removed', removed);
      return true;
    }
    return false;
  }

  getTransitions(fromState?: string): StateTransition[] {
    if (fromState) {
      return this.transitions.filter(t => t.from === fromState || t.from === '*');
    }
    return [...this.transitions];
  }

  // State machine execution
  start(initialState?: string): void {
    if (this.isRunning) return;

    const startState = initialState || this.config.initialState;
    if (!this.states.has(startState)) {
      throw new Error(`Initial state '${startState}' does not exist`);
    }

    this.isRunning = true;
    this.changeState(startState);

    // Start update loop
    this.updateTimer = setInterval(() => {
      this.update();
    }, 1000 / this.config.updateFrequency);

    this.emit('started', startState);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    // Exit current state
    if (this.currentState) {
      this.exitState(this.currentState);
    }

    // Stop all sub-state machines
    for (const subStateMachine of this.activeSubStates.values()) {
      subStateMachine.stop();
    }

    this.emit('stopped');
  }

  pause(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    this.emit('paused');
  }

  resume(): void {
    if (this.isRunning && !this.updateTimer) {
      this.updateTimer = setInterval(() => {
        this.update();
      }, 1000 / this.config.updateFrequency);
      this.emit('resumed');
    }
  }

  update(): void {
    if (!this.isRunning || !this.currentState) return;

    const currentStateData = this.states.get(this.currentState);
    if (!currentStateData) return;

    // Update current state
    this.updateState(this.currentState);

    // Update sub-state machines
    const subStateMachine = this.activeSubStates.get(this.currentState);
    if (subStateMachine) {
      subStateMachine.update();
    }

    // Check for state timeout
    if (currentStateData.timeout) {
      const elapsed = Date.now() - this.stateStartTime;
      if (elapsed > currentStateData.timeout) {
        this.handleStateTimeout();
      }
    }

    // Check transitions
    this.checkTransitions();
  }

  // State operations
  private changeState(newState: string, transitionData?: any): boolean {
    if (newState === this.currentState) return false;

    const newStateData = this.states.get(newState);
    if (!newStateData) {
      console.warn(`Attempted to transition to non-existent state: ${newState}`);
      return false;
    }

    // Exit current state
    if (this.currentState) {
      this.exitState(this.currentState);
    }

    // Record history
    if (this.currentState) {
      this.recordStateHistory();
    }

    // Change state
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateStartTime = Date.now();

    // Enter new state
    this.enterState(newState, transitionData);

    this.emit('state_changed', {
      from: this.previousState,
      to: this.currentState,
      transitionData,
      timestamp: this.stateStartTime
    });

    return true;
  }

  private enterState(stateId: string, entryData?: any): void {
    const state = this.states.get(stateId);
    if (!state) return;

    // Execute enter actions
    for (const action of state.enterActions) {
      this.executeStateAction(action, entryData);
    }

    // Start sub-state machine if present
    const subStateMachine = this.activeSubStates.get(stateId);
    if (subStateMachine) {
      subStateMachine.start();
    }

    this.emit('state_entered', { stateId, entryData, timestamp: Date.now() });
  }

  private updateState(stateId: string): void {
    const state = this.states.get(stateId);
    if (!state) return;

    // Execute update actions
    for (const action of state.updateActions) {
      this.executeStateAction(action);
    }

    this.emit('state_updated', { stateId, timestamp: Date.now() });
  }

  private exitState(stateId: string, exitData?: any): void {
    const state = this.states.get(stateId);
    if (!state) return;

    // Stop sub-state machine if present
    const subStateMachine = this.activeSubStates.get(stateId);
    if (subStateMachine) {
      subStateMachine.stop();
    }

    // Execute exit actions
    for (const action of state.exitActions) {
      this.executeStateAction(action, exitData);
    }

    this.emit('state_exited', { stateId, exitData, timestamp: Date.now() });
  }

  private executeStateAction(action: StateAction, data?: any): void {
    try {
      switch (action.type) {
        case 'function':
          if (typeof action.action === 'function') {
            action.action(this.context, data, action.parameters);
          }
          break;

        case 'behavior_tree':
          this.executeBehaviorTree(action.action as string, action.parameters);
          break;

        case 'goal':
          this.executeGoal(action.action as string, action.parameters);
          break;

        case 'script':
          this.executeScript(action.action as string, action.parameters);
          break;

        case 'animation':
          this.playAnimation(action.action as string, action.parameters);
          break;

        case 'sound':
          this.playSound(action.action as string, action.parameters);
          break;

        default:
          console.warn(`Unknown state action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing state action: ${error}`);
    }
  }

  private executeBehaviorTree(treeName: string, parameters?: any): void {
    this.emit('execute_behavior_tree', { treeName, parameters });
  }

  private executeGoal(goalType: string, parameters?: any): void {
    const goal: Goal = {
      id: `goal_${Date.now()}`,
      type: goalType as any,
      priority: parameters?.priority || 1,
      description: parameters?.description || `Execute ${goalType}`,
      parameters: parameters || {},
      prerequisites: parameters?.prerequisites || [],
      progress: 0,
      status: 'active',
      subGoals: []
    };

    this.context.goals.push(goal);
    this.emit('goal_created', goal);
  }

  private executeScript(script: string, parameters?: any): void {
    // Simple script execution (in real implementation, would use a proper scripting engine)
    this.emit('execute_script', { script, parameters });
  }

  private playAnimation(animationName: string, parameters?: any): void {
    this.context.agent.status.currentAction = animationName;
    this.emit('play_animation', { animationName, parameters });
  }

  private playSound(soundName: string, parameters?: any): void {
    this.emit('play_sound', { soundName, parameters });
  }

  // Transition checking
  private checkTransitions(): void {
    if (!this.currentState) return;

    const validTransitions = this.transitions.filter(t =>
      t.from === this.currentState || t.from === '*'
    );

    for (const transition of validTransitions) {
      if (this.evaluateTransitionCondition(transition.condition)) {
        // Execute transition action if present
        if (transition.action) {
          this.executeTransitionAction(transition.action);
        }

        // Perform transition
        this.changeState(transition.to, { transition });
        break; // Only take the first valid transition
      }
    }
  }

  private evaluateTransitionCondition(condition: TransitionCondition): boolean {
    try {
      switch (condition.type) {
        case 'function':
          if (typeof condition.condition === 'function') {
            return condition.condition(this.context);
          }
          break;

        case 'expression':
          return this.evaluateExpression(condition.condition as string, condition.parameters);

        case 'event':
          // Event-based transitions would be handled differently
          return false;

        default:
          console.warn(`Unknown transition condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating transition condition: ${error}`);
      return false;
    }

    return false;
  }

  private evaluateExpression(expression: string, parameters?: any): boolean {
    // Simple expression evaluator (in real implementation, would use a proper parser)
    // For now, just handle some common expressions

    const context = this.context;
    const agent = context.agent;
    const world = context.world;

    try {
      // Replace common variables
      let processedExpression = expression
        .replace(/health/g, agent.health.toString())
        .replace(/maxHealth/g, agent.maxHealth.toString())
        .replace(/energy/g, agent.energy.toString())
        .replace(/maxEnergy/g, agent.maxEnergy.toString());

      // Simple evaluation (in production, use a safe expression evaluator)
      return eval(processedExpression);
    } catch (error) {
      console.error(`Error evaluating expression '${expression}': ${error}`);
      return false;
    }
  }

  private executeTransitionAction(action: TransitionAction): void {
    try {
      switch (action.type) {
        case 'function':
          if (typeof action.action === 'function') {
            action.action(this.context);
          }
          break;

        case 'event':
          this.emit('transition_event', {
            event: action.action,
            parameters: action.parameters
          });
          break;

        case 'script':
          this.executeScript(action.action as string, action.parameters);
          break;

        default:
          console.warn(`Unknown transition action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing transition action: ${error}`);
    }
  }

  // Utility methods
  forceTransition(targetState: string, transitionData?: any): boolean {
    return this.changeState(targetState, transitionData);
  }

  canTransitionTo(targetState: string): boolean {
    if (!this.currentState) return false;

    return this.transitions.some(t =>
      (t.from === this.currentState || t.from === '*') && t.to === targetState
    );
  }

  private handleStateTimeout(): void {
    const currentStateData = this.states.get(this.currentState!);
    if (!currentStateData) return;

    // Try default transitions
    for (const defaultTransition of currentStateData.defaultTransitions) {
      if (this.states.has(defaultTransition)) {
        this.changeState(defaultTransition, { reason: 'timeout' });
        return;
      }
    }

    // If no default transition, go to idle or stop
    if (this.states.has('idle')) {
      this.changeState('idle', { reason: 'timeout' });
    } else {
      this.stop();
    }
  }

  private recordStateHistory(): void {
    if (!this.currentState) return;

    const duration = Date.now() - this.stateStartTime;
    const historyEntry: StateHistory = {
      stateId: this.currentState,
      timestamp: this.stateStartTime,
      duration,
      entryData: {},
      exitData: {}
    };

    this.stateHistory.push(historyEntry);

    // Limit history size
    if (this.stateHistory.length > this.config.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  // Query methods
  getStateHistory(): StateHistory[] {
    return [...this.stateHistory];
  }

  getTimeInCurrentState(): number {
    if (!this.currentState || this.stateStartTime === 0) return 0;
    return Date.now() - this.stateStartTime;
  }

  isInState(stateId: string): boolean {
    return this.currentState === stateId;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  // Context updates
  updateContext(updates: Partial<AIContext>): void {
    this.context = { ...this.context, ...updates };

    // Update sub-state machines
    for (const subStateMachine of this.activeSubStates.values()) {
      subStateMachine.updateContext(updates);
    }
  }

  // State machine analysis
  getAnalytics(): {
    totalStates: number;
    totalTransitions: number;
    currentState: string | null;
    timeInCurrentState: number;
    mostUsedStates: { stateId: string; count: number; totalTime: number }[];
    transitionFrequency: { from: string; to: string; count: number }[];
  } {
    const stateUsage = new Map<string, { count: number; totalTime: number }>();
    const transitionCount = new Map<string, number>();

    // Analyze state history
    for (const entry of this.stateHistory) {
      const usage = stateUsage.get(entry.stateId) || { count: 0, totalTime: 0 };
      usage.count++;
      usage.totalTime += entry.duration;
      stateUsage.set(entry.stateId, usage);

      if (entry.transitionTaken) {
        const transitionKey = `${entry.stateId}->${entry.transitionTaken}`;
        transitionCount.set(transitionKey, (transitionCount.get(transitionKey) || 0) + 1);
      }
    }

    // Sort by usage
    const mostUsedStates = Array.from(stateUsage.entries())
      .map(([stateId, usage]) => ({ stateId, ...usage }))
      .sort((a, b) => b.count - a.count);

    const transitionFrequency = Array.from(transitionCount.entries())
      .map(([transition, count]) => {
        const [from, to] = transition.split('->');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalStates: this.states.size,
      totalTransitions: this.transitions.length,
      currentState: this.currentState,
      timeInCurrentState: this.getTimeInCurrentState(),
      mostUsedStates,
      transitionFrequency
    };
  }

  // Visualization
  visualize(): string {
    let output = 'State Machine Visualization:\n';
    output += '================================\n\n';

    output += `Current State: ${this.currentState || 'None'}\n`;
    output += `Previous State: ${this.previousState || 'None'}\n`;
    output += `Total States: ${this.states.size}\n`;
    output += `Total Transitions: ${this.transitions.length}\n\n`;

    output += 'States:\n';
    output += '-------\n';
    for (const [stateId, state] of this.states) {
      const indicator = stateId === this.currentState ? '* ' : '  ';
      output += `${indicator}${stateId} (${state.type})\n`;

      if (state.enterActions.length > 0) {
        output += `    Enter: ${state.enterActions.map(a => a.type).join(', ')}\n`;
      }

      if (state.updateActions.length > 0) {
        output += `    Update: ${state.updateActions.map(a => a.type).join(', ')}\n`;
      }

      if (state.exitActions.length > 0) {
        output += `    Exit: ${state.exitActions.map(a => a.type).join(', ')}\n`;
      }

      if (state.timeout) {
        output += `    Timeout: ${state.timeout}ms\n`;
      }

      output += '\n';
    }

    output += 'Transitions:\n';
    output += '-----------\n';
    for (const transition of this.transitions) {
      output += `  ${transition.from} -> ${transition.to} (Priority: ${transition.priority})\n`;
    }

    return output;
  }

  // Builder pattern methods
  static builder(context: AIContext): StateMachineBuilder {
    return new StateMachineBuilder(context);
  }
}

// Builder class for easier state machine construction
export class StateMachineBuilder {
  private context: AIContext;
  private config: StateMachineConfig;
  private states: StateData[] = [];
  private transitions: StateTransition[] = [];

  constructor(context: AIContext) {
    this.context = context;
    this.config = {
      initialState: '',
      globalTransitions: [],
      allowParallelStates: false,
      maxHistorySize: 100,
      enableLogging: false,
      updateFrequency: 10
    };
  }

  setInitialState(stateId: string): StateMachineBuilder {
    this.config.initialState = stateId;
    return this;
  }

  setUpdateFrequency(frequency: number): StateMachineBuilder {
    this.config.updateFrequency = frequency;
    return this;
  }

  setMaxHistorySize(size: number): StateMachineBuilder {
    this.config.maxHistorySize = size;
    return this;
  }

  enableLogging(): StateMachineBuilder {
    this.config.enableLogging = true;
    return this;
  }

  addState(stateData: StateData): StateMachineBuilder {
    this.states.push(stateData);
    return this;
  }

  addSimpleState(
    id: string,
    name: string,
    enterActions: StateAction[] = [],
    updateActions: StateAction[] = [],
    exitActions: StateAction[] = []
  ): StateMachineBuilder {
    this.states.push({
      id,
      name,
      type: 'simple',
      enterActions,
      updateActions,
      exitActions,
      properties: {},
      defaultTransitions: ['idle']
    });
    return this;
  }

  addTransition(
    from: string,
    to: string,
    condition: TransitionCondition,
    priority: number = 1,
    action?: TransitionAction
  ): StateMachineBuilder {
    this.transitions.push({ from, to, condition, action, priority });
    return this;
  }

  build(): StateMachine {
    this.config.globalTransitions = this.transitions;
    const stateMachine = new StateMachine(this.context, this.config);

    for (const state of this.states) {
      stateMachine.addState(state);
    }

    for (const transition of this.transitions) {
      stateMachine.addTransition(transition);
    }

    return stateMachine;
  }
}