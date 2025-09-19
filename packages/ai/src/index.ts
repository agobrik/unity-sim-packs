export { AgentManager } from './core/AgentManager';
export { BehaviorTreeEngine } from './core/BehaviorTree';
export { StateMachineEngine } from './core/StateMachine';
export { AIHelpers } from './utils/AIHelpers';

export * from './types';

// Unity-compatible wrapper
import { AgentManager } from './core/AgentManager';
import { BehaviorTreeEngine } from './core/BehaviorTree';

export class AISimulation {
  private agentManager: AgentManager;
  private behaviorTree: BehaviorTreeEngine;

  constructor() {
    // Initialize with mock objects for Unity export compatibility
    this.agentManager = {} as AgentManager;
    this.behaviorTree = {} as BehaviorTreeEngine;
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      ai: {
        totalAgents: 0,
        activeBehaviorTrees: 0,
        systemHealth: 'operational',
        framework: 'steam-sim-ai'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const AISystemVersion = '1.0.0';