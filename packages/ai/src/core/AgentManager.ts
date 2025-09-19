import { EventEmitter } from '../utils/EventEmitter';
import {
  Agent,
  AgentType,
  AgentState,
  BrainType,
  AISystemConfig,
  CoordinationMessage,
  MessageType,
  LearningData
} from '../types';
import { BehaviorTreeEngine } from './BehaviorTree';
import { StateMachineEngine } from './StateMachine';

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private behaviorTreeEngine: BehaviorTreeEngine;
  private stateMachineEngine: StateMachineEngine;
  private config: AISystemConfig;
  private isRunning: boolean = false;
  private updateTimer?: any;
  private messageQueue: CoordinationMessage[] = [];
  private learningData: LearningData[] = [];

  constructor(config: AISystemConfig) {
    super();
    this.config = config;
    this.behaviorTreeEngine = new BehaviorTreeEngine();
    this.stateMachineEngine = new StateMachineEngine();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.behaviorTreeEngine.on('tree_executed', (data: any) => {
      this.emit('agent_behavior_executed', data);
    });

    this.stateMachineEngine.on('state_changed', (data: any) => {
      this.emit('agent_state_changed', data);
    });
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateTimer = (globalThis as any).setInterval(() => {
      this.updateAllAgents();
    }, this.config.updateInterval);

    this.emit('agent_manager_started');
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateTimer) {
      (globalThis as any).clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.emit('agent_manager_stopped');
  }

  public createAgent(agentData: Omit<Agent, 'lastUpdate'>): Agent {
    const agent: Agent = {
      ...agentData,
      lastUpdate: Date.now()
    };

    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Cannot create agent: maximum limit of ${this.config.maxAgents} reached`);
    }

    this.agents.set(agent.id, agent);

    if (agent.brain.type === BrainType.BEHAVIOR_TREE && agent.brain.behaviorTree) {
      this.behaviorTreeEngine.createTree(agent.id, agent.brain.behaviorTree.rootNode);
    }

    if (agent.brain.type === BrainType.STATE_MACHINE && agent.brain.stateMachine) {
      this.stateMachineEngine.createStateMachine(agent.id, agent.brain.stateMachine.currentState);
    }

    this.emit('agent_created', agent);
    return agent;
  }

  public removeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);
    this.behaviorTreeEngine.removeTree(agentId);
    this.stateMachineEngine.removeStateMachine(agentId);

    this.emit('agent_removed', { agentId, agent });
    return true;
  }

  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByType(type: AgentType): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  public getAgentsByState(state: AgentState): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.state === state);
  }

  private updateAllAgents(): void {
    const deltaTime = this.config.updateInterval;

    for (const agent of this.agents.values()) {
      if (agent.state === AgentState.DEAD) continue;

      this.updateAgent(agent, deltaTime);
    }

    this.processMessages();
    this.processLearning();

    this.emit('agents_updated', {
      activeAgents: this.agents.size,
      timestamp: Date.now()
    });
  }

  private updateAgent(agent: Agent, deltaTime: number): void {
    agent.lastUpdate = Date.now();

    this.updateSensors(agent);
    this.updateMemory(agent);
    this.updateBrain(agent, deltaTime);
    this.updateGoals(agent);

    this.emit('agent_updated', {
      agentId: agent.id,
      state: agent.state,
      position: agent.position,
      timestamp: Date.now()
    });
  }

  private updateSensors(agent: Agent): void {
    for (const sensor of agent.sensors) {
      if (!sensor.enabled) continue;

      const timeSinceLastReading = Date.now() - sensor.lastReading.timestamp;
      if (timeSinceLastReading < (1000 / sensor.updateRate)) continue;

      const reading = this.performSensorReading(agent, sensor);
      sensor.lastReading = reading;

      agent.memory.shortTerm.set(`sensor_${sensor.id}`, {
        id: `sensor_${sensor.id}`,
        type: 'perception' as any,
        data: reading.data,
        timestamp: reading.timestamp,
        importance: 3,
        accessed: 1,
        strength: reading.confidence
      });
    }
  }

  private performSensorReading(agent: Agent, sensor: any): any {
    const nearbyAgents = Array.from(this.agents.values()).filter(other => {
      if (other.id === agent.id) return false;
      const distance = this.calculateDistance(agent.position, other.position);
      return distance <= sensor.range;
    });

    return {
      timestamp: Date.now(),
      data: {
        nearbyAgents,
        agentCount: nearbyAgents.length,
        enemies: nearbyAgents.filter(a => a.type !== agent.type),
        allies: nearbyAgents.filter(a => a.type === agent.type)
      },
      confidence: sensor.accuracy,
      source: sensor.id
    };
  }

  private updateMemory(agent: Agent): void {
    this.consolidateMemory(agent);
    this.decayMemory(agent);
    this.cleanupMemory(agent);
  }

  private consolidateMemory(agent: Agent): void {
    const importantMemories = Array.from(agent.memory.shortTerm.values())
      .filter(memory => memory.importance > 7)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    for (const memory of importantMemories) {
      if (!agent.memory.longTerm.has(memory.id)) {
        agent.memory.longTerm.set(memory.id, {
          ...memory,
          strength: memory.strength * 0.8
        });
      }
    }
  }

  private decayMemory(agent: Agent): void {
    const now = Date.now();
    const decayRate = 0.99;

    for (const [id, memory] of agent.memory.shortTerm) {
      const age = now - memory.timestamp;
      const ageInHours = age / (1000 * 60 * 60);
      memory.strength *= Math.pow(decayRate, ageInHours);

      if (memory.strength < 0.1) {
        agent.memory.shortTerm.delete(id);
      }
    }

    for (const [id, memory] of agent.memory.longTerm) {
      const age = now - memory.timestamp;
      const ageInDays = age / (1000 * 60 * 60 * 24);
      memory.strength *= Math.pow(0.999, ageInDays);

      if (memory.strength < 0.05) {
        agent.memory.longTerm.delete(id);
      }
    }
  }

  private cleanupMemory(agent: Agent): void {
    if (agent.memory.shortTerm.size > agent.memory.maxShortTermSize) {
      const memories = Array.from(agent.memory.shortTerm.values())
        .sort((a, b) => a.strength - b.strength);

      const toRemove = memories.slice(0, agent.memory.shortTerm.size - agent.memory.maxShortTermSize);
      for (const memory of toRemove) {
        agent.memory.shortTerm.delete(memory.id);
      }
    }

    if (agent.memory.longTerm.size > agent.memory.maxLongTermSize) {
      const memories = Array.from(agent.memory.longTerm.values())
        .sort((a, b) => a.strength - b.strength);

      const toRemove = memories.slice(0, agent.memory.longTerm.size - agent.memory.maxLongTermSize);
      for (const memory of toRemove) {
        agent.memory.longTerm.delete(memory.id);
      }
    }

    if (agent.memory.episodic.length > agent.memory.maxEpisodicSize) {
      agent.memory.episodic = agent.memory.episodic
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, agent.memory.maxEpisodicSize);
    }
  }

  private updateBrain(agent: Agent, deltaTime: number): void {
    switch (agent.brain.type) {
      case BrainType.BEHAVIOR_TREE:
        this.behaviorTreeEngine.executeTree(agent.id, agent);
        break;
      case BrainType.STATE_MACHINE:
        this.stateMachineEngine.updateStateMachine(agent.id, agent, deltaTime);
        break;
      case BrainType.NEURAL_NETWORK:
        this.updateNeuralNetwork(agent, deltaTime);
        break;
      case BrainType.DECISION_NETWORK:
        this.updateDecisionNetwork(agent, deltaTime);
        break;
      case BrainType.HYBRID:
        this.updateHybridBrain(agent, deltaTime);
        break;
    }
  }

  private updateNeuralNetwork(agent: Agent, deltaTime: number): void {
    if (!agent.brain.neuralNetwork) return;

    const inputs = this.gatherNeuralInputs(agent);
    const outputs = this.forwardPass(agent.brain.neuralNetwork, inputs);
    this.executeNeuralOutputs(agent, outputs);
  }

  private updateDecisionNetwork(agent: Agent, deltaTime: number): void {
    if (!agent.brain.decisionNetwork) return;

    const validNodes = agent.brain.decisionNetwork.nodes.filter(node => {
      return !node.condition || node.condition(agent);
    });

    if (validNodes.length === 0) return;

    const bestNode = validNodes.reduce((best, current) => {
      const score = current.weight * current.confidence;
      const bestScore = best.weight * best.confidence;
      return score > bestScore ? current : best;
    });

    if (bestNode.action) {
      bestNode.action(agent);
    }

    agent.brain.decisionNetwork.currentDecision = bestNode.id;
  }

  private updateHybridBrain(agent: Agent, deltaTime: number): void {
    this.behaviorTreeEngine.executeTree(agent.id, agent);
    this.stateMachineEngine.updateStateMachine(agent.id, agent, deltaTime);
  }

  private updateGoals(agent: Agent): void {
    for (const goal of agent.goals) {
      if (goal.status !== 'active' as any) continue;

      const isCompleted = goal.conditions.every(condition => {
        return this.evaluateGoalCondition(condition, agent);
      });

      if (isCompleted) {
        goal.status = 'completed' as any;
        this.emit('goal_completed', {
          agentId: agent.id,
          goalId: goal.id,
          reward: goal.reward,
          timestamp: Date.now()
        });
      } else if (goal.deadline && Date.now() > goal.deadline) {
        goal.status = 'failed' as any;
        this.emit('goal_failed', {
          agentId: agent.id,
          goalId: goal.id,
          timestamp: Date.now()
        });
      }
    }
  }

  private evaluateGoalCondition(condition: any, agent: Agent): boolean {
    return true;
  }

  private gatherNeuralInputs(agent: Agent): number[] {
    const inputs = [
      agent.position.x,
      agent.position.y,
      agent.position.z,
      agent.memory.shortTerm.get('health')?.data || 100,
      agent.memory.shortTerm.get('energy')?.data || 100
    ];

    const nearbyAgents = agent.memory.shortTerm.get('sensor_vision')?.data?.nearbyAgents || [];
    inputs.push(nearbyAgents.length);

    return inputs;
  }

  private forwardPass(network: any, inputs: number[]): number[] {
    let currentInputs = inputs;

    for (let i = 0; i < network.layers.length; i++) {
      const outputs = [];
      const weights = network.weights[i];
      const biases = network.biases[i];

      for (let j = 0; j < weights.length; j++) {
        let sum = biases[j];
        for (let k = 0; k < currentInputs.length; k++) {
          sum += currentInputs[k] * weights[j][k];
        }
        outputs.push(this.activate(sum, network.activationFunction));
      }

      currentInputs = outputs;
    }

    return currentInputs;
  }

  private activate(value: number, activationFunction: any): number {
    switch (activationFunction) {
      case 'sigmoid':
        return 1 / (1 + Math.exp(-value));
      case 'tanh':
        return Math.tanh(value);
      case 'relu':
        return Math.max(0, value);
      case 'leaky_relu':
        return value > 0 ? value : 0.01 * value;
      default:
        return value;
    }
  }

  private executeNeuralOutputs(agent: Agent, outputs: number[]): void {
    if (outputs.length < 3) return;

    const [moveX, moveY, action] = outputs;

    agent.position.x += (moveX - 0.5) * 0.1;
    agent.position.y += (moveY - 0.5) * 0.1;

    if (action > 0.7) {
      this.emit('agent_action', {
        agentId: agent.id,
        action: 'primary_action',
        timestamp: Date.now()
      });
    }
  }

  public sendMessage(message: CoordinationMessage): void {
    this.messageQueue.push(message);
    this.emit('message_sent', message);
  }

  private processMessages(): void {
    const processedMessages = this.messageQueue.splice(0);

    for (const message of processedMessages) {
      const receiver = this.agents.get(message.receiver);
      if (!receiver) continue;

      receiver.memory.shortTerm.set(`message_${message.id}`, {
        id: `message_${message.id}`,
        type: 'knowledge' as any,
        data: message,
        timestamp: message.timestamp,
        importance: message.priority,
        accessed: 1,
        strength: 1
      });

      this.emit('message_received', {
        receiver: message.receiver,
        message,
        timestamp: Date.now()
      });
    }
  }

  public addLearningData(data: LearningData): void {
    this.learningData.push(data);

    if (this.learningData.length > this.config.memorySize) {
      this.learningData = this.learningData.slice(-this.config.memorySize);
    }
  }

  private processLearning(): void {
    if (this.learningData.length < 10) return;

    for (const agent of this.agents.values()) {
      if (agent.brain.type === BrainType.NEURAL_NETWORK && agent.brain.neuralNetwork) {
        this.updateNeuralNetworkWeights(agent);
      }
    }
  }

  private updateNeuralNetworkWeights(agent: Agent): void {

  }

  private calculateDistance(a: any, b: any): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public getSystemStats(): {
    totalAgents: number;
    activeAgents: number;
    agentsByType: Record<string, number>;
    agentsByState: Record<string, number>;
    memoryUsage: number;
    messageQueueSize: number;
  } {
    const agents = Array.from(this.agents.values());

    const agentsByType: Record<string, number> = {};
    const agentsByState: Record<string, number> = {};

    for (const agent of agents) {
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1;
      agentsByState[agent.state] = (agentsByState[agent.state] || 0) + 1;
    }

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.state !== AgentState.DEAD).length,
      agentsByType,
      agentsByState,
      memoryUsage: this.learningData.length,
      messageQueueSize: this.messageQueue.length
    };
  }
}