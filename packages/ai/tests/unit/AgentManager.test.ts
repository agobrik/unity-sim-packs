import { AgentManager } from '../../src/core/AgentManager';
import { AISystemConfig, AgentType, AgentState, BrainType } from '../../src/types';
import { AIHelpers } from '../../src/utils/AIHelpers';

describe('AgentManager', () => {
  let manager: AgentManager;
  let config: AISystemConfig;

  beforeEach(() => {
    config = {
      maxAgents: 100,
      updateInterval: 100,
      learningRate: 0.01,
      memorySize: 1000,
      decisionThreshold: 0.5
    };
    manager = new AgentManager(config);
  });

  afterEach(() => {
    manager.stop();
  });

  describe('Agent Creation', () => {
    test('should create an agent', () => {
      const agentData = {
        id: 'test-agent',
        name: 'Test Agent',
        type: AgentType.AUTONOMOUS,
        position: { x: 0, y: 0, z: 0 },
        state: AgentState.IDLE,
        brain: {
          id: 'brain-1',
          type: BrainType.BEHAVIOR_TREE,
          parameters: {}
        },
        memory: {
          shortTerm: new Map(),
          longTerm: new Map(),
          episodic: [],
          maxShortTermSize: 50,
          maxLongTermSize: 200,
          maxEpisodicSize: 100
        },
        sensors: [],
        goals: []
      };

      const agent = manager.createAgent(agentData);

      expect(agent.id).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe(AgentType.AUTONOMOUS);
      expect(agent.lastUpdate).toBeGreaterThan(0);
    });

    test('should emit agent_created event', (done) => {
      manager.on('agent_created', (agent) => {
        expect(agent.id).toBe('test-agent');
        done();
      });

      const agentData = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agentData);
    });

    test('should throw error when max agents reached', () => {
      const limitedConfig = { ...config, maxAgents: 1 };
      const limitedManager = new AgentManager(limitedConfig);

      const agent1 = AIHelpers.createBasicAgent('agent1', 'Agent 1', { x: 0, y: 0, z: 0 });
      const agent2 = AIHelpers.createBasicAgent('agent2', 'Agent 2', { x: 0, y: 0, z: 0 });

      limitedManager.createAgent(agent1);

      expect(() => {
        limitedManager.createAgent(agent2);
      }).toThrow('Cannot create agent: maximum limit of 1 reached');

      limitedManager.stop();
    });
  });

  describe('Agent Management', () => {
    beforeEach(() => {
      const agent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agent);
    });

    test('should get agent by id', () => {
      const agent = manager.getAgent('test-agent');
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('test-agent');
    });

    test('should get all agents', () => {
      const agent2 = AIHelpers.createBasicAgent('agent2', 'Agent 2', { x: 5, y: 5, z: 0 });
      manager.createAgent(agent2);

      const allAgents = manager.getAllAgents();
      expect(allAgents.length).toBe(2);
      expect(allAgents.map(a => a.id)).toContain('test-agent');
      expect(allAgents.map(a => a.id)).toContain('agent2');
    });

    test('should get agents by type', () => {
      const autonomousAgent = AIHelpers.createBasicAgent('auto-agent', 'Auto Agent', { x: 0, y: 0, z: 0 });
      autonomousAgent.type = AgentType.AUTONOMOUS;

      const reactiveAgent = AIHelpers.createBasicAgent('reactive-agent', 'Reactive Agent', { x: 0, y: 0, z: 0 });
      reactiveAgent.type = AgentType.REACTIVE;

      manager.createAgent(autonomousAgent);
      manager.createAgent(reactiveAgent);

      const autonomousAgents = manager.getAgentsByType(AgentType.AUTONOMOUS);
      const reactiveAgents = manager.getAgentsByType(AgentType.REACTIVE);

      expect(autonomousAgents.length).toBe(2);
      expect(reactiveAgents.length).toBe(1);
    });

    test('should get agents by state', () => {
      const agent = manager.getAgent('test-agent');
      if (agent) {
        agent.state = AgentState.ACTIVE;
      }

      const activeAgents = manager.getAgentsByState(AgentState.ACTIVE);
      const idleAgents = manager.getAgentsByState(AgentState.IDLE);

      expect(activeAgents.length).toBe(1);
      expect(idleAgents.length).toBe(0);
    });

    test('should remove agent', () => {
      const removed = manager.removeAgent('test-agent');
      expect(removed).toBe(true);

      const agent = manager.getAgent('test-agent');
      expect(agent).toBeUndefined();
    });

    test('should fail to remove non-existent agent', () => {
      const removed = manager.removeAgent('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Agent Updates', () => {
    test('should start and stop manager', (done) => {
      let started = false;
      let stopped = false;

      manager.on('agent_manager_started', () => {
        started = true;
        manager.stop();
      });

      manager.on('agent_manager_stopped', () => {
        stopped = true;
        expect(started).toBe(true);
        expect(stopped).toBe(true);
        done();
      });

      manager.start();
    });

    test('should update agents periodically', (done) => {
      const agent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agent);

      let updateCount = 0;
      manager.on('agents_updated', () => {
        updateCount++;
        if (updateCount >= 2) {
          manager.stop();
          expect(updateCount).toBeGreaterThanOrEqual(2);
          done();
        }
      });

      manager.start();
    });

    test('should update individual agent', (done) => {
      const agent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agent);

      manager.on('agent_updated', (data) => {
        expect(data.agentId).toBe('test-agent');
        expect(data.timestamp).toBeGreaterThan(0);
        done();
      });

      manager.start();
    });
  });

  describe('Memory Management', () => {
    test('should handle short-term memory', () => {
      const agent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agent);

      const createdAgent = manager.getAgent('test-agent');
      if (createdAgent) {
        createdAgent.memory.shortTerm.set('test-memory', {
          id: 'test-memory',
          type: 'perception' as any,
          data: 'test-data',
          timestamp: Date.now(),
          importance: 5,
          accessed: 1,
          strength: 1
        });

        expect(createdAgent.memory.shortTerm.get('test-memory')).toBeDefined();
        expect(createdAgent.memory.shortTerm.get('test-memory')?.data).toBe('test-data');
      }
    });

    test('should consolidate important memories to long-term', async () => {
      const agent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
      manager.createAgent(agent);

      const createdAgent = manager.getAgent('test-agent');
      if (createdAgent) {
        createdAgent.memory.shortTerm.set('important-memory', {
          id: 'important-memory',
          type: 'knowledge' as any,
          data: 'important-data',
          timestamp: Date.now(),
          importance: 8,
          accessed: 1,
          strength: 1
        });

        manager.start();
        await new Promise(resolve => setTimeout(resolve, 150));
        manager.stop();

        expect(createdAgent.memory.longTerm.get('important-memory')).toBeDefined();
      }
    });
  });

  describe('Messaging System', () => {
    test('should send and receive messages', async () => {
      const sender = AIHelpers.createBasicAgent('sender', 'Sender', { x: 0, y: 0, z: 0 });
      const receiver = AIHelpers.createBasicAgent('receiver', 'Receiver', { x: 5, y: 5, z: 0 });

      manager.createAgent(sender);
      manager.createAgent(receiver);

      const message = {
        id: 'test-message',
        sender: 'sender',
        receiver: 'receiver',
        type: 'information' as any,
        data: { content: 'Hello World' },
        timestamp: Date.now(),
        priority: 5
      };

      let messageReceived = false;
      manager.on('message_received', (data) => {
        expect(data.receiver).toBe('receiver');
        expect(data.message.data.content).toBe('Hello World');
        messageReceived = true;
      });

      manager.sendMessage(message);
      manager.start();

      await new Promise(resolve => setTimeout(resolve, 150));
      manager.stop();

      expect(messageReceived).toBe(true);

      const receiverAgent = manager.getAgent('receiver');
      expect(receiverAgent?.memory.shortTerm.get(`message_${message.id}`)).toBeDefined();
    });
  });

  describe('Learning System', () => {
    test('should add learning data', () => {
      const learningData = {
        state: { health: 100, position: { x: 0, y: 0, z: 0 } },
        action: 'move_forward',
        reward: 10,
        nextState: { health: 100, position: { x: 1, y: 0, z: 0 } },
        timestamp: Date.now()
      };

      manager.addLearningData(learningData);

      const stats = manager.getSystemStats();
      expect(stats.memoryUsage).toBe(1);
    });

    test('should limit learning data size', () => {
      const limitedConfig = { ...config, memorySize: 5 };
      const limitedManager = new AgentManager(limitedConfig);

      for (let i = 0; i < 10; i++) {
        limitedManager.addLearningData({
          state: {},
          action: `action_${i}`,
          reward: i,
          nextState: {},
          timestamp: Date.now()
        });
      }

      const stats = limitedManager.getSystemStats();
      expect(stats.memoryUsage).toBe(5);

      limitedManager.stop();
    });
  });

  describe('System Statistics', () => {
    test('should provide system statistics', () => {
      const agent1 = AIHelpers.createBasicAgent('agent1', 'Agent 1', { x: 0, y: 0, z: 0 });
      agent1.type = AgentType.AUTONOMOUS;
      agent1.state = AgentState.ACTIVE;

      const agent2 = AIHelpers.createBasicAgent('agent2', 'Agent 2', { x: 0, y: 0, z: 0 });
      agent2.type = AgentType.REACTIVE;
      agent2.state = AgentState.IDLE;

      manager.createAgent(agent1);
      manager.createAgent(agent2);

      const stats = manager.getSystemStats();

      expect(stats.totalAgents).toBe(2);
      expect(stats.activeAgents).toBe(2);
      expect(stats.agentsByType[AgentType.AUTONOMOUS]).toBe(1);
      expect(stats.agentsByType[AgentType.REACTIVE]).toBe(1);
      expect(stats.agentsByState[AgentState.ACTIVE]).toBe(1);
      expect(stats.agentsByState[AgentState.IDLE]).toBe(1);
      expect(stats.memoryUsage).toBe(0);
      expect(stats.messageQueueSize).toBe(0);
    });
  });

  describe('Sensor Processing', () => {
    test('should process sensor readings', async () => {
      const agent1 = AIHelpers.createBasicAgent('agent1', 'Agent 1', { x: 0, y: 0, z: 0 });
      const agent2 = AIHelpers.createBasicAgent('agent2', 'Agent 2', { x: 5, y: 0, z: 0 });

      manager.createAgent(agent1);
      manager.createAgent(agent2);

      manager.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      manager.stop();

      const updatedAgent1 = manager.getAgent('agent1');
      const visionData = updatedAgent1?.memory.shortTerm.get('sensor_vision');

      expect(visionData).toBeDefined();
      expect(visionData?.data.nearbyAgents).toBeDefined();
    });
  });
});