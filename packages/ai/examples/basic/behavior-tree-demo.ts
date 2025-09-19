import {
  AgentManager,
  BehaviorTreeEngine,
  AIHelpers,
  AgentType,
  BrainType,
  NodeType,
  NodeStatus,
  AISystemConfig
} from '@steam-sim/ai';

async function runBehaviorTreeDemo() {
  console.log('🤖 Starting Behavior Tree Demo');

  const config: AISystemConfig = {
    maxAgents: 10,
    updateInterval: 200,
    learningRate: 0.01,
    memorySize: 500,
    decisionThreshold: 0.5
  };

  const manager = new AgentManager(config);
  const btEngine = new BehaviorTreeEngine();

  manager.on('agent_behavior_executed', (data) => {
    console.log(`🎯 Agent ${data.agent} executed behavior with status: ${data.status}`);
  });

  manager.on('agent_created', (agent) => {
    console.log(`👤 Created agent: ${agent.name} at (${agent.position.x}, ${agent.position.y})`);
  });

  const hunterAgent = AIHelpers.createBasicAgent(
    'hunter',
    'Hunter Agent',
    { x: 0, y: 0, z: 0 },
    AgentType.AUTONOMOUS
  );

  hunterAgent.memory.shortTerm.set('health',
    AIHelpers.createMemoryItem('health', 'perception' as any, 100, 5)
  );
  hunterAgent.memory.shortTerm.set('ammo',
    AIHelpers.createMemoryItem('ammo', 'resource' as any, 30, 4)
  );
  hunterAgent.memory.longTerm.set('huntingGrounds',
    AIHelpers.createMemoryItem('huntingGrounds', 'knowledge' as any, [
      { x: 5, y: 5, z: 0 },
      { x: 15, y: 5, z: 0 },
      { x: 15, y: 15, z: 0 },
      { x: 5, y: 15, z: 0 }
    ], 6)
  );

  const huntingBehaviorTree = AIHelpers.createSelectorNode('hunting_root', [
    // Combat sequence
    AIHelpers.createSequenceNode('combat_sequence', [
      AIHelpers.createBehaviorNode('detect_prey', NodeType.CONDITION,
        undefined,
        (agent, blackboard) => {
          const nearbyPrey = blackboard.data.get('detectedPrey') || [];
          if (Math.random() < 0.3) {
            blackboard.data.set('detectedPrey', [{
              id: 'deer-1',
              position: { x: agent.position.x + 3, y: agent.position.y + 2, z: 0 },
              health: 50
            }]);
            console.log(`👁️  Hunter detected prey near position (${agent.position.x + 3}, ${agent.position.y + 2})`);
            return true;
          }
          return false;
        }
      ),
      AIHelpers.createBehaviorNode('check_ammo', NodeType.CONDITION,
        undefined,
        (agent) => {
          const ammo = agent.memory.shortTerm.get('ammo')?.data || 0;
          return ammo > 0;
        }
      ),
      AIHelpers.createBehaviorNode('stalk_prey', NodeType.ACTION,
        (agent, blackboard) => {
          const prey = blackboard.data.get('detectedPrey')?.[0];
          if (!prey) return NodeStatus.FAILURE;

          const distance = AIHelpers.calculateDistance(agent.position, prey.position);
          if (distance > 2.0) {
            const direction = AIHelpers.normalize(
              AIHelpers.subtract(prey.position, agent.position)
            );
            agent.position.x += direction.x * 0.3;
            agent.position.y += direction.y * 0.3;
            console.log(`🐾 Hunter stalking prey... distance: ${distance.toFixed(1)}`);
            return NodeStatus.RUNNING;
          } else {
            console.log(`🎯 Hunter in range for attack!`);
            return NodeStatus.SUCCESS;
          }
        }
      ),
      AIHelpers.createBehaviorNode('attack_prey', NodeType.ACTION,
        (agent, blackboard) => {
          const prey = blackboard.data.get('detectedPrey')?.[0];
          if (!prey) return NodeStatus.FAILURE;

          const ammo = agent.memory.shortTerm.get('ammo')?.data || 0;
          if (ammo > 0) {
            agent.memory.shortTerm.set('ammo',
              AIHelpers.createMemoryItem('ammo', 'resource' as any, ammo - 1, 4)
            );

            if (Math.random() < 0.8) {
              console.log(`💥 Hunter successfully hunted prey! Ammo remaining: ${ammo - 1}`);
              blackboard.data.delete('detectedPrey');

              agent.memory.shortTerm.set('successfulHunt',
                AIHelpers.createMemoryItem('successfulHunt', 'emotion' as any, Date.now(), 7)
              );
              return NodeStatus.SUCCESS;
            } else {
              console.log(`❌ Hunter missed the shot! Prey escaped. Ammo: ${ammo - 1}`);
              blackboard.data.delete('detectedPrey');
              return NodeStatus.FAILURE;
            }
          }
          return NodeStatus.FAILURE;
        }
      )
    ]),

    // Patrol sequence (fallback behavior)
    AIHelpers.createSequenceNode('patrol_sequence', [
      AIHelpers.createBehaviorNode('select_patrol_point', NodeType.ACTION,
        (agent, blackboard) => {
          const huntingGrounds = agent.memory.longTerm.get('huntingGrounds')?.data || [];
          if (huntingGrounds.length === 0) return NodeStatus.FAILURE;

          const currentIndex = blackboard.data.get('patrolIndex') || 0;
          const targetPoint = huntingGrounds[currentIndex];
          blackboard.data.set('patrolTarget', targetPoint);

          return NodeStatus.SUCCESS;
        }
      ),
      AIHelpers.createBehaviorNode('move_to_patrol_point', NodeType.ACTION,
        (agent, blackboard) => {
          const target = blackboard.data.get('patrolTarget');
          if (!target) return NodeStatus.FAILURE;

          const distance = AIHelpers.calculateDistance(agent.position, target);
          if (distance < 1.0) {
            const huntingGrounds = agent.memory.longTerm.get('huntingGrounds')?.data || [];
            const currentIndex = blackboard.data.get('patrolIndex') || 0;
            const nextIndex = (currentIndex + 1) % huntingGrounds.length;
            blackboard.data.set('patrolIndex', nextIndex);

            console.log(`📍 Hunter reached patrol point (${target.x}, ${target.y}), moving to next`);
            return NodeStatus.SUCCESS;
          } else {
            const direction = AIHelpers.normalize(
              AIHelpers.subtract(target, agent.position)
            );
            agent.position.x += direction.x * 0.2;
            agent.position.y += direction.y * 0.2;

            return NodeStatus.RUNNING;
          }
        }
      )
    ]),

    // Rest behavior (when low health or no ammo)
    AIHelpers.createSequenceNode('rest_sequence', [
      AIHelpers.createBehaviorNode('check_rest_needed', NodeType.CONDITION,
        undefined,
        (agent) => {
          const health = agent.memory.shortTerm.get('health')?.data || 100;
          const ammo = agent.memory.shortTerm.get('ammo')?.data || 0;
          return health < 50 || ammo === 0;
        }
      ),
      AIHelpers.createBehaviorNode('rest_and_resupply', NodeType.ACTION,
        (agent, blackboard) => {
          const health = agent.memory.shortTerm.get('health')?.data || 0;
          const ammo = agent.memory.shortTerm.get('ammo')?.data || 0;

          if (health < 100) {
            agent.memory.shortTerm.set('health',
              AIHelpers.createMemoryItem('health', 'perception' as any, Math.min(100, health + 5), 5)
            );
          }

          if (ammo < 30) {
            agent.memory.shortTerm.set('ammo',
              AIHelpers.createMemoryItem('ammo', 'resource' as any, Math.min(30, ammo + 3), 4)
            );
          }

          console.log(`😴 Hunter resting... Health: ${health + 5}, Ammo: ${ammo + 3}`);
          return NodeStatus.SUCCESS;
        }
      )
    ])
  ]);

  hunterAgent.brain.type = BrainType.BEHAVIOR_TREE;
  hunterAgent.brain.behaviorTree = {
    rootNode: huntingBehaviorTree,
    blackboard: { data: new Map(), timestamp: Date.now() },
    status: NodeStatus.INVALID
  };

  manager.createAgent(hunterAgent);

  const explorerAgent = AIHelpers.createBasicAgent(
    'explorer',
    'Explorer Agent',
    { x: 20, y: 20, z: 0 },
    AgentType.AUTONOMOUS
  );

  explorerAgent.memory.shortTerm.set('curiosity',
    AIHelpers.createMemoryItem('curiosity', 'emotion' as any, 80, 3)
  );

  const explorationTree = AIHelpers.createSelectorNode('exploration_root', [
    AIHelpers.createSequenceNode('investigation_sequence', [
      AIHelpers.createBehaviorNode('find_poi', NodeType.CONDITION,
        undefined,
        (agent, blackboard) => {
          if (Math.random() < 0.2) {
            const poi = {
              x: agent.position.x + (Math.random() - 0.5) * 10,
              y: agent.position.y + (Math.random() - 0.5) * 10,
              z: 0,
              type: ['ruins', 'cave', 'treasure', 'artifact'][Math.floor(Math.random() * 4)]
            };
            blackboard.data.set('pointOfInterest', poi);
            console.log(`🔍 Explorer discovered ${poi.type} at (${poi.x.toFixed(1)}, ${poi.y.toFixed(1)})`);
            return true;
          }
          return false;
        }
      ),
      AIHelpers.createBehaviorNode('investigate', NodeType.ACTION,
        (agent, blackboard) => {
          const poi = blackboard.data.get('pointOfInterest');
          if (!poi) return NodeStatus.FAILURE;

          const distance = AIHelpers.calculateDistance(agent.position, poi);
          if (distance > 0.5) {
            const direction = AIHelpers.normalize(
              AIHelpers.subtract(poi, agent.position)
            );
            agent.position.x += direction.x * 0.25;
            agent.position.y += direction.y * 0.25;
            console.log(`🚶 Explorer moving to investigate ${poi.type}...`);
            return NodeStatus.RUNNING;
          } else {
            console.log(`📖 Explorer investigated ${poi.type} and made discoveries!`);

            agent.memory.longTerm.set(`discovery_${Date.now()}`,
              AIHelpers.createMemoryItem(`discovery_${Date.now()}`, 'knowledge' as any, poi, 8)
            );

            blackboard.data.delete('pointOfInterest');
            return NodeStatus.SUCCESS;
          }
        }
      )
    ]),

    AIHelpers.createBehaviorNode('wander', NodeType.ACTION,
      (agent, blackboard) => {
        const wanderRadius = 3;
        const angle = (Date.now() / 2000) % (2 * Math.PI);
        const targetX = 20 + Math.cos(angle) * wanderRadius;
        const targetY = 20 + Math.sin(angle) * wanderRadius;

        const direction = AIHelpers.normalize({
          x: targetX - agent.position.x,
          y: targetY - agent.position.y,
          z: 0
        });

        agent.position.x += direction.x * 0.15;
        agent.position.y += direction.y * 0.15;

        if (Math.random() < 0.1) {
          console.log(`🌍 Explorer wandering and observing the environment...`);
        }

        return NodeStatus.RUNNING;
      }
    )
  ]);

  explorerAgent.brain.type = BrainType.BEHAVIOR_TREE;
  explorerAgent.brain.behaviorTree = {
    rootNode: explorationTree,
    blackboard: { data: new Map(), timestamp: Date.now() },
    status: NodeStatus.INVALID
  };

  manager.createAgent(explorerAgent);

  console.log('\n🚀 Starting behavior tree simulation...');
  console.log('Watch as the Hunter patrols, hunts prey, and manages resources');
  console.log('While the Explorer wanders and investigates points of interest\n');

  manager.start();

  await new Promise(resolve => setTimeout(resolve, 15000));

  manager.stop();

  console.log('\n📊 Final Status Report:');

  const finalHunter = manager.getAgent('hunter');
  const finalExplorer = manager.getAgent('explorer');

  if (finalHunter) {
    const health = finalHunter.memory.shortTerm.get('health')?.data || 0;
    const ammo = finalHunter.memory.shortTerm.get('ammo')?.data || 0;
    const hunts = finalHunter.memory.shortTerm.get('successfulHunt');

    console.log(`🏹 Hunter Final Stats:`);
    console.log(`  Position: (${finalHunter.position.x.toFixed(1)}, ${finalHunter.position.y.toFixed(1)})`);
    console.log(`  Health: ${health}/100`);
    console.log(`  Ammo: ${ammo}/30`);
    console.log(`  Successful Hunts: ${hunts ? 'Yes' : 'None recorded'}`);
  }

  if (finalExplorer) {
    const discoveries = Array.from(finalExplorer.memory.longTerm.keys())
      .filter(key => key.startsWith('discovery_'));

    console.log(`\n🗺️  Explorer Final Stats:`);
    console.log(`  Position: (${finalExplorer.position.x.toFixed(1)}, ${finalExplorer.position.y.toFixed(1)})`);
    console.log(`  Discoveries Made: ${discoveries.length}`);

    if (discoveries.length > 0) {
      console.log(`  Recent Discoveries:`);
      discoveries.slice(-3).forEach(key => {
        const discovery = finalExplorer.memory.longTerm.get(key);
        if (discovery) {
          console.log(`    - ${discovery.data.type} at (${discovery.data.x.toFixed(1)}, ${discovery.data.y.toFixed(1)})`);
        }
      });
    }
  }

  const stats = manager.getSystemStats();
  console.log(`\n🎯 System Performance:`);
  console.log(`  Total Agents: ${stats.totalAgents}`);
  console.log(`  Active Agents: ${stats.activeAgents}`);
  console.log(`  Memory Usage: ${stats.memoryUsage} entries`);

  console.log('\n✨ Behavior Tree Demo completed!');
}

if (require.main === module) {
  runBehaviorTreeDemo().catch(console.error);
}

export { runBehaviorTreeDemo };