import { BehaviorTreeEngine } from '../../src/core/BehaviorTree';
import { NodeType, NodeStatus, DecoratorType } from '../../src/types';
import { AIHelpers } from '../../src/utils/AIHelpers';

describe('BehaviorTreeEngine', () => {
  let engine: BehaviorTreeEngine;
  let mockAgent: any;

  beforeEach(() => {
    engine = new BehaviorTreeEngine();
    mockAgent = AIHelpers.createBasicAgent('test-agent', 'Test Agent', { x: 0, y: 0, z: 0 });
  });

  describe('Tree Creation', () => {
    test('should create a behavior tree', () => {
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: () => NodeStatus.SUCCESS
      };

      const tree = engine.createTree('test-tree', rootNode);

      expect(tree.rootNode).toBe(rootNode);
      expect(tree.status).toBe(NodeStatus.INVALID);
      expect(tree.blackboard.data.size).toBe(0);
    });

    test('should emit tree_created event', (done) => {
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: () => NodeStatus.SUCCESS
      };

      engine.on('tree_created', (data) => {
        expect(data.id).toBe('test-tree');
        expect(data.tree.rootNode).toBe(rootNode);
        done();
      });

      engine.createTree('test-tree', rootNode);
    });
  });

  describe('Tree Execution', () => {
    test('should execute simple action node', () => {
      const actionExecuted = jest.fn(() => NodeStatus.SUCCESS);
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: actionExecuted
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(actionExecuted).toHaveBeenCalledWith(mockAgent, expect.any(Object));
    });

    test('should execute condition node', () => {
      const conditionCheck = jest.fn(() => true);
      const rootNode = {
        id: 'root',
        type: NodeType.CONDITION,
        children: [],
        parameters: {},
        condition: conditionCheck
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(conditionCheck).toHaveBeenCalledWith(mockAgent, expect.any(Object));
    });

    test('should fail when tree not found', () => {
      const status = engine.executeTree('nonexistent-tree', mockAgent);
      expect(status).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Composite Nodes', () => {
    test('should execute sequence node - all success', () => {
      const action1 = jest.fn(() => NodeStatus.SUCCESS);
      const action2 = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'sequence',
        type: NodeType.COMPOSITE,
        children: [
          {
            id: 'action1',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action1
          },
          {
            id: 'action2',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action2
          }
        ],
        parameters: { compositeType: 'sequence' }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(action1).toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();
    });

    test('should execute sequence node - early failure', () => {
      const action1 = jest.fn(() => NodeStatus.FAILURE);
      const action2 = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'sequence',
        type: NodeType.COMPOSITE,
        children: [
          {
            id: 'action1',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action1
          },
          {
            id: 'action2',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action2
          }
        ],
        parameters: { compositeType: 'sequence' }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.FAILURE);
      expect(action1).toHaveBeenCalled();
      expect(action2).not.toHaveBeenCalled();
    });

    test('should execute selector node - first success', () => {
      const action1 = jest.fn(() => NodeStatus.SUCCESS);
      const action2 = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'selector',
        type: NodeType.COMPOSITE,
        children: [
          {
            id: 'action1',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action1
          },
          {
            id: 'action2',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action2
          }
        ],
        parameters: { compositeType: 'selector' }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(action1).toHaveBeenCalled();
      expect(action2).not.toHaveBeenCalled();
    });

    test('should execute parallel node', () => {
      const action1 = jest.fn(() => NodeStatus.SUCCESS);
      const action2 = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'parallel',
        type: NodeType.COMPOSITE,
        children: [
          {
            id: 'action1',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action1
          },
          {
            id: 'action2',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action: action2
          }
        ],
        parameters: {
          compositeType: 'parallel',
          successThreshold: 2,
          failureThreshold: 2
        }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(action1).toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();
    });
  });

  describe('Decorator Nodes', () => {
    test('should execute inverter decorator', () => {
      const action = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'inverter',
        type: NodeType.DECORATOR,
        decoratorType: DecoratorType.INVERTER,
        children: [
          {
            id: 'action',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action
          }
        ],
        parameters: {}
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.FAILURE);
      expect(action).toHaveBeenCalled();
    });

    test('should execute repeater decorator', () => {
      const action = jest.fn(() => NodeStatus.SUCCESS);

      const rootNode = {
        id: 'repeater',
        type: NodeType.DECORATOR,
        decoratorType: DecoratorType.REPEATER,
        children: [
          {
            id: 'action',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action
          }
        ],
        parameters: { maxRepeats: 3 }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(action).toHaveBeenCalledTimes(3);
    });

    test('should execute retry decorator', () => {
      let callCount = 0;
      const action = jest.fn(() => {
        callCount++;
        return callCount < 3 ? NodeStatus.FAILURE : NodeStatus.SUCCESS;
      });

      const rootNode = {
        id: 'retry',
        type: NodeType.DECORATOR,
        decoratorType: DecoratorType.RETRY,
        children: [
          {
            id: 'action',
            type: NodeType.ACTION,
            children: [],
            parameters: {},
            action
          }
        ],
        parameters: { maxRetries: 5 }
      };

      engine.createTree('test-tree', rootNode);
      const status = engine.executeTree('test-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(action).toHaveBeenCalledTimes(3);
    });
  });

  describe('Standard Nodes', () => {
    test('should create standard nodes', () => {
      const standardNodes = engine.createStandardNodes();

      expect(standardNodes.moveToTarget).toBeDefined();
      expect(standardNodes.checkHealth).toBeDefined();
      expect(standardNodes.findNearestResource).toBeDefined();
      expect(standardNodes.attack).toBeDefined();
      expect(standardNodes.flee).toBeDefined();
      expect(standardNodes.patrol).toBeDefined();
    });

    test('should execute moveToTarget node', () => {
      const standardNodes = engine.createStandardNodes();
      const target = { x: 5, y: 5, z: 0 };
      const moveNode = standardNodes.moveToTarget(target);

      engine.createTree('move-tree', moveNode);

      const initialPosition = { ...mockAgent.position };
      const status = engine.executeTree('move-tree', mockAgent);

      expect(status).toBe(NodeStatus.RUNNING);
      expect(mockAgent.position.x).not.toBe(initialPosition.x);
      expect(mockAgent.position.y).not.toBe(initialPosition.y);
    });

    test('should execute checkHealth node', () => {
      const standardNodes = engine.createStandardNodes();
      const healthNode = standardNodes.checkHealth(50);

      mockAgent.memory.shortTerm.set('health', {
        id: 'health',
        type: 'perception',
        data: 75,
        timestamp: Date.now(),
        importance: 5,
        accessed: 1,
        strength: 1
      });

      engine.createTree('health-tree', healthNode);
      const status = engine.executeTree('health-tree', mockAgent);

      expect(status).toBe(NodeStatus.SUCCESS);
    });
  });

  describe('Tree Management', () => {
    test('should get tree by id', () => {
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: () => NodeStatus.SUCCESS
      };

      const createdTree = engine.createTree('test-tree', rootNode);
      const retrievedTree = engine.getTree('test-tree');

      expect(retrievedTree).toBe(createdTree);
    });

    test('should remove tree', () => {
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: () => NodeStatus.SUCCESS
      };

      engine.createTree('test-tree', rootNode);
      expect(engine.getTree('test-tree')).toBeDefined();

      const removed = engine.removeTree('test-tree');
      expect(removed).toBe(true);
      expect(engine.getTree('test-tree')).toBeUndefined();
    });

    test('should get all trees', () => {
      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: () => NodeStatus.SUCCESS
      };

      engine.createTree('tree1', rootNode);
      engine.createTree('tree2', rootNode);

      const allTrees = engine.getAllTrees();
      expect(allTrees.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle action errors gracefully', () => {
      const errorAction = jest.fn(() => {
        throw new Error('Test error');
      });

      const rootNode = {
        id: 'root',
        type: NodeType.ACTION,
        children: [],
        parameters: {},
        action: errorAction
      };

      engine.createTree('error-tree', rootNode);
      const status = engine.executeTree('error-tree', mockAgent);

      expect(status).toBe(NodeStatus.FAILURE);
      expect(errorAction).toHaveBeenCalled();
    });

    test('should handle condition errors gracefully', () => {
      const errorCondition = jest.fn(() => {
        throw new Error('Test error');
      });

      const rootNode = {
        id: 'root',
        type: NodeType.CONDITION,
        children: [],
        parameters: {},
        condition: errorCondition
      };

      engine.createTree('error-tree', rootNode);
      const status = engine.executeTree('error-tree', mockAgent);

      expect(status).toBe(NodeStatus.FAILURE);
      expect(errorCondition).toHaveBeenCalled();
    });
  });
});