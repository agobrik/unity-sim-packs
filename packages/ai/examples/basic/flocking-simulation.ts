import {
  AgentManager,
  AIHelpers,
  AgentType,
  BrainType,
  NodeType,
  NodeStatus,
  MemoryType,
  AISystemConfig
} from '@steam-sim/ai';

async function runFlockingSimulation() {
  console.log('🐦 Starting Flocking Simulation Demo');

  const config: AISystemConfig = {
    maxAgents: 25,
    updateInterval: 100,
    learningRate: 0.01,
    memorySize: 300,
    decisionThreshold: 0.5
  };

  const manager = new AgentManager(config);

  manager.on('agent_created', (agent) => {
    console.log(`🐦 Created bird: ${agent.name}`);
  });

  const flockSize = 15;
  const worldSize = 30;

  console.log(`\n🌍 Creating flock of ${flockSize} birds in ${worldSize}x${worldSize} world`);

  const birds = Array.from({ length: flockSize }, (_, i) => {
    const bird = AIHelpers.createBasicAgent(
      `bird_${i}`,
      `Bird ${i + 1}`,
      {
        x: Math.random() * worldSize - worldSize / 2,
        y: Math.random() * worldSize - worldSize / 2,
        z: Math.random() * 5
      },
      AgentType.AUTONOMOUS
    );

    bird.memory.shortTerm.set('velocity', {
      id: 'velocity',
      type: MemoryType.ACTION,
      data: {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 2
      },
      timestamp: Date.now(),
      importance: 3,
      accessed: 1,
      strength: 1
    });

    bird.memory.shortTerm.set('energy', {
      id: 'energy',
      type: MemoryType.RESOURCE,
      data: 100,
      timestamp: Date.now(),
      importance: 4,
      accessed: 1,
      strength: 1
    });

    bird.memory.longTerm.set('flockId', {
      id: 'flockId',
      type: MemoryType.KNOWLEDGE,
      data: 'main_flock',
      timestamp: Date.now(),
      importance: 6,
      accessed: 1,
      strength: 1
    });

    const flockingBehavior = AIHelpers.createSelectorNode('flocking_root', [
      // Avoid predators (highest priority)
      AIHelpers.createSequenceNode('predator_avoidance', [
        AIHelpers.createBehaviorNode('detect_predator', NodeType.CONDITION,
          undefined,
          (agent, blackboard) => {
            const predators = blackboard.data.get('predators') || [];
            return predators.length > 0;
          }
        ),
        AIHelpers.createBehaviorNode('flee_predator', NodeType.ACTION,
          (agent, blackboard) => {
            const predators = blackboard.data.get('predators') || [];
            if (predators.length === 0) return NodeStatus.FAILURE;

            const avgPredatorPos = predators.reduce((sum: any, pred: any) => ({
              x: sum.x + pred.position.x,
              y: sum.y + pred.position.y,
              z: sum.z + pred.position.z
            }), { x: 0, y: 0, z: 0 });

            avgPredatorPos.x /= predators.length;
            avgPredatorPos.y /= predators.length;
            avgPredatorPos.z /= predators.length;

            const fleeDirection = AIHelpers.normalize(
              AIHelpers.subtract(agent.position, avgPredatorPos)
            );

            const panicForce = AIHelpers.multiply(fleeDirection, 2.0);
            AIHelpers.applyForce(agent, panicForce, 0.1);

            console.log(`😱 ${agent.name} fleeing from predator!`);
            return NodeStatus.SUCCESS;
          }
        )
      ]),

      // Find food when energy is low
      AIHelpers.createSequenceNode('foraging', [
        AIHelpers.createBehaviorNode('check_hunger', NodeType.CONDITION,
          undefined,
          (agent) => {
            const energy = agent.memory.shortTerm.get('energy')?.data || 100;
            return energy < 40;
          }
        ),
        AIHelpers.createBehaviorNode('search_food', NodeType.ACTION,
          (agent, blackboard) => {
            const foodSources = blackboard.data.get('foodSources') || [];

            if (foodSources.length === 0) {
              if (Math.random() < 0.1) {
                const randomFood = {
                  x: (Math.random() - 0.5) * worldSize,
                  y: (Math.random() - 0.5) * worldSize,
                  z: 0,
                  amount: 50
                };
                blackboard.data.set('foodSources', [randomFood]);
                console.log(`🌾 ${agent.name} discovered food at (${randomFood.x.toFixed(1)}, ${randomFood.y.toFixed(1)})`);
              }
              return NodeStatus.FAILURE;
            }

            const nearestFood = foodSources.reduce((nearest: any, food: any) => {
              const distToFood = AIHelpers.calculateDistance(agent.position, food);
              const distToNearest = nearest ? AIHelpers.calculateDistance(agent.position, nearest) : Infinity;
              return distToFood < distToNearest ? food : nearest;
            }, null);

            if (nearestFood) {
              const distance = AIHelpers.calculateDistance(agent.position, nearestFood);
              if (distance < 2.0) {
                const energy = agent.memory.shortTerm.get('energy')?.data || 0;
                agent.memory.shortTerm.set('energy', {
                  id: 'energy',
                  type: MemoryType.RESOURCE,
                  data: Math.min(100, energy + 30),
                  timestamp: Date.now(),
                  importance: 4,
                  accessed: 1,
                  strength: 1
                });

                const remainingFood = foodSources.filter((f: any) => f !== nearestFood);
                blackboard.data.set('foodSources', remainingFood);

                console.log(`🍽️  ${agent.name} ate food, energy restored to ${Math.min(100, energy + 30)}`);
                return NodeStatus.SUCCESS;
              } else {
                const direction = AIHelpers.normalize(
                  AIHelpers.subtract(nearestFood, agent.position)
                );
                const foodSeekForce = AIHelpers.multiply(direction, 1.5);
                AIHelpers.applyForce(agent, foodSeekForce, 0.1);
                return NodeStatus.RUNNING;
              }
            }

            return NodeStatus.FAILURE;
          }
        )
      ]),

      // Main flocking behavior
      AIHelpers.createBehaviorNode('flock', NodeType.ACTION,
        (agent, blackboard) => {
          const allAgents = manager.getAllAgents();
          const flockMates = allAgents.filter(other =>
            other.id !== agent.id &&
            other.memory.longTerm.get('flockId')?.data === agent.memory.longTerm.get('flockId')?.data
          );

          const neighbors = AIHelpers.getAgentsInRadius(agent.position, 8.0, flockMates);

          let totalForce = { x: 0, y: 0, z: 0 };

          if (neighbors.length > 0) {
            const separationWeight = 2.0;
            const alignmentWeight = 1.0;
            const cohesionWeight = 1.0;

            const flockingForce = AIHelpers.calculateFlockingForce(
              agent,
              neighbors,
              separationWeight,
              alignmentWeight,
              cohesionWeight
            );

            totalForce = AIHelpers.add(totalForce, flockingForce);
          }

          const boundaryForce = calculateBoundaryAvoidance(agent, worldSize);
          totalForce = AIHelpers.add(totalForce, boundaryForce);

          const obstacleForce = calculateObstacleAvoidance(agent, blackboard);
          totalForce = AIHelpers.add(totalForce, obstacleForce);

          const randomWander = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5,
            z: (Math.random() - 0.5) * 0.3
          };
          totalForce = AIHelpers.add(totalForce, randomWander);

          AIHelpers.applyForce(agent, totalForce, 0.1);

          const energy = agent.memory.shortTerm.get('energy')?.data || 100;
          if (energy > 1) {
            agent.memory.shortTerm.set('energy', {
              id: 'energy',
              type: MemoryType.RESOURCE,
              data: energy - 0.2,
              timestamp: Date.now(),
              importance: 4,
              accessed: 1,
              strength: 1
            });
          }

          if (Math.random() < 0.05) {
            console.log(`🐦 ${agent.name} flocking with ${neighbors.length} neighbors, energy: ${energy.toFixed(0)}`);
          }

          return NodeStatus.SUCCESS;
        }
      )
    ]);

    bird.brain.type = BrainType.BEHAVIOR_TREE;
    bird.brain.behaviorTree = {
      rootNode: flockingBehavior,
      blackboard: { data: new Map(), timestamp: Date.now() },
      status: NodeStatus.INVALID
    };

    return bird;
  });

  birds.forEach(bird => manager.createAgent(bird));

  const predator = AIHelpers.createBasicAgent(
    'hawk',
    'Hunting Hawk',
    { x: worldSize / 2, y: worldSize / 2, z: 8 },
    AgentType.AUTONOMOUS
  );

  predator.memory.shortTerm.set('velocity', {
    id: 'velocity',
    type: MemoryType.ACTION,
    data: { x: 0, y: 0, z: 0 },
    timestamp: Date.now(),
    importance: 3,
    accessed: 1,
    strength: 1
  });

  const predatorBehavior = AIHelpers.createSelectorNode('predator_root', [
    AIHelpers.createSequenceNode('hunting', [
      AIHelpers.createBehaviorNode('find_target', NodeType.ACTION,
        (agent, blackboard) => {
          const allAgents = manager.getAllAgents();
          const prey = allAgents.filter(a =>
            a.id !== agent.id &&
            a.memory.longTerm.get('flockId')?.data === 'main_flock'
          );

          const nearbyPrey = AIHelpers.getAgentsInRadius(agent.position, 12.0, prey);

          if (nearbyPrey.length > 0) {
            const target = nearbyPrey[Math.floor(Math.random() * nearbyPrey.length)];
            blackboard.data.set('huntTarget', target);

            nearbyPrey.forEach(bird => {
              const birdBlackboard = manager.getAgent(bird.id)?.brain.behaviorTree?.blackboard;
              if (birdBlackboard) {
                birdBlackboard.data.set('predators', [agent]);
              }
            });

            console.log(`🦅 Hawk targeting ${target.name}`);
            return NodeStatus.SUCCESS;
          }

          allAgents.forEach(bird => {
            if (bird.memory.longTerm.get('flockId')?.data === 'main_flock') {
              const birdBlackboard = bird.brain.behaviorTree?.blackboard;
              if (birdBlackboard) {
                birdBlackboard.data.delete('predators');
              }
            }
          });

          return NodeStatus.FAILURE;
        }
      ),
      AIHelpers.createBehaviorNode('chase_target', NodeType.ACTION,
        (agent, blackboard) => {
          const target = blackboard.data.get('huntTarget');
          if (!target) return NodeStatus.FAILURE;

          const currentTarget = manager.getAgent(target.id);
          if (!currentTarget) return NodeStatus.FAILURE;

          const distance = AIHelpers.calculateDistance(agent.position, currentTarget.position);

          if (distance < 1.5) {
            console.log(`💥 Hawk caught ${currentTarget.name}! The hunt is successful.`);
            blackboard.data.delete('huntTarget');
            return NodeStatus.SUCCESS;
          } else {
            const direction = AIHelpers.normalize(
              AIHelpers.subtract(currentTarget.position, agent.position)
            );
            const huntingForce = AIHelpers.multiply(direction, 3.0);
            AIHelpers.applyForce(agent, huntingForce, 0.1);

            console.log(`🏃 Hawk chasing ${currentTarget.name}, distance: ${distance.toFixed(1)}`);
            return NodeStatus.RUNNING;
          }
        }
      )
    ]),

    AIHelpers.createBehaviorNode('patrol', NodeType.ACTION,
      (agent) => {
        const patrolRadius = 8;
        const angle = (Date.now() / 3000) % (2 * Math.PI);
        const targetX = Math.cos(angle) * patrolRadius;
        const targetY = Math.sin(angle) * patrolRadius;
        const targetZ = 8 + Math.sin(angle * 2) * 2;

        const direction = AIHelpers.normalize({
          x: targetX - agent.position.x,
          y: targetY - agent.position.y,
          z: targetZ - agent.position.z
        });

        const patrolForce = AIHelpers.multiply(direction, 1.0);
        AIHelpers.applyForce(agent, patrolForce, 0.1);

        if (Math.random() < 0.02) {
          console.log(`🦅 Hawk patrolling the skies...`);
        }

        return NodeStatus.RUNNING;
      }
    )
  ]);

  predator.brain.type = BrainType.BEHAVIOR_TREE;
  predator.brain.behaviorTree = {
    rootNode: predatorBehavior,
    blackboard: { data: new Map(), timestamp: Date.now() },
    status: NodeStatus.INVALID
  };

  manager.createAgent(predator);

  function calculateBoundaryAvoidance(agent: any, worldSize: number) {
    const boundary = worldSize / 2 - 2;
    const force = { x: 0, y: 0, z: 0 };
    const strength = 2.0;

    if (agent.position.x > boundary) {
      force.x = -strength * (agent.position.x - boundary);
    } else if (agent.position.x < -boundary) {
      force.x = -strength * (agent.position.x + boundary);
    }

    if (agent.position.y > boundary) {
      force.y = -strength * (agent.position.y - boundary);
    } else if (agent.position.y < -boundary) {
      force.y = -strength * (agent.position.y + boundary);
    }

    if (agent.position.z > 10) {
      force.z = -strength * (agent.position.z - 10);
    } else if (agent.position.z < 0) {
      force.z = -strength * agent.position.z;
    }

    return force;
  }

  function calculateObstacleAvoidance(agent: any, blackboard: any) {
    const obstacles = blackboard.data.get('obstacles') || [
      { x: 0, y: 0, z: 2, radius: 3 },
      { x: 8, y: -5, z: 4, radius: 2 },
      { x: -6, y: 7, z: 3, radius: 2.5 }
    ];

    let avoidanceForce = { x: 0, y: 0, z: 0 };

    for (const obstacle of obstacles) {
      const distance = AIHelpers.calculateDistance(agent.position, obstacle);
      const minDistance = obstacle.radius + 1;

      if (distance < minDistance) {
        const avoidDirection = AIHelpers.normalize(
          AIHelpers.subtract(agent.position, obstacle)
        );
        const strength = (minDistance - distance) / minDistance * 2.0;
        const force = AIHelpers.multiply(avoidDirection, strength);
        avoidanceForce = AIHelpers.add(avoidanceForce, force);
      }
    }

    return avoidanceForce;
  }

  console.log('\n🚀 Starting flocking simulation...');
  console.log('🐦 Birds will flock together while avoiding the hunting hawk');
  console.log('🌾 Birds will search for food when energy is low');
  console.log('🦅 The hawk will patrol and hunt birds');
  console.log('🏃 Watch the emergent flocking behaviors!\n');

  let updateCount = 0;
  manager.on('agents_updated', () => {
    updateCount++;

    if (updateCount % 20 === 0) {
      const aliveBirds = manager.getAllAgents().filter(a =>
        a.memory.longTerm.get('flockId')?.data === 'main_flock'
      );

      if (aliveBirds.length > 0) {
        const avgPosition = aliveBirds.reduce((sum, bird) => ({
          x: sum.x + bird.position.x,
          y: sum.y + bird.position.y,
          z: sum.z + bird.position.z
        }), { x: 0, y: 0, z: 0 });

        avgPosition.x /= aliveBirds.length;
        avgPosition.y /= aliveBirds.length;
        avgPosition.z /= aliveBirds.length;

        const spread = aliveBirds.reduce((maxDist, bird) => {
          const dist = AIHelpers.calculateDistance(bird.position, avgPosition);
          return Math.max(maxDist, dist);
        }, 0);

        const avgEnergy = aliveBirds.reduce((sum, bird) => {
          return sum + (bird.memory.shortTerm.get('energy')?.data || 0);
        }, 0) / aliveBirds.length;

        console.log(`📊 Flock Status - Birds: ${aliveBirds.length}, Center: (${avgPosition.x.toFixed(1)}, ${avgPosition.y.toFixed(1)}, ${avgPosition.z.toFixed(1)}), Spread: ${spread.toFixed(1)}, Avg Energy: ${avgEnergy.toFixed(0)}`);
      }
    }
  });

  manager.start();

  await new Promise(resolve => setTimeout(resolve, 30000));

  manager.stop();

  console.log('\n📊 Final Simulation Results:');

  const finalBirds = manager.getAllAgents().filter(a =>
    a.memory.longTerm.get('flockId')?.data === 'main_flock'
  );

  const finalHawk = manager.getAgent('hawk');

  console.log(`\n🐦 Birds Surviving: ${finalBirds.length}/${flockSize}`);

  if (finalBirds.length > 0) {
    const totalEnergy = finalBirds.reduce((sum, bird) => {
      return sum + (bird.memory.shortTerm.get('energy')?.data || 0);
    }, 0);

    const avgEnergy = totalEnergy / finalBirds.length;
    console.log(`   Average Energy: ${avgEnergy.toFixed(1)}/100`);

    const finalCenter = finalBirds.reduce((sum, bird) => ({
      x: sum.x + bird.position.x,
      y: sum.y + bird.position.y,
      z: sum.z + bird.position.z
    }), { x: 0, y: 0, z: 0 });

    finalCenter.x /= finalBirds.length;
    finalCenter.y /= finalBirds.length;
    finalCenter.z /= finalBirds.length;

    console.log(`   Final Flock Center: (${finalCenter.x.toFixed(1)}, ${finalCenter.y.toFixed(1)}, ${finalCenter.z.toFixed(1)})`);

    const cohesion = finalBirds.reduce((maxDist, bird) => {
      const dist = AIHelpers.calculateDistance(bird.position, finalCenter);
      return Math.max(maxDist, dist);
    }, 0);

    console.log(`   Flock Cohesion: ${cohesion.toFixed(1)} units`);
  }

  if (finalHawk) {
    console.log(`\n🦅 Hawk Position: (${finalHawk.position.x.toFixed(1)}, ${finalHawk.position.y.toFixed(1)}, ${finalHawk.position.z.toFixed(1)})`);
  }

  const stats = manager.getSystemStats();
  console.log(`\n⚡ System Performance:`);
  console.log(`   Total Agents: ${stats.totalAgents}`);
  console.log(`   Active Agents: ${stats.activeAgents}`);

  console.log('\n✨ Flocking Simulation completed!');
  console.log('The simulation demonstrated emergent flocking behavior with:');
  console.log('  - Separation (birds avoiding crowding)');
  console.log('  - Alignment (birds matching neighbors\' direction)');
  console.log('  - Cohesion (birds moving toward flock center)');
  console.log('  - Predator avoidance (collective response to threats)');
  console.log('  - Resource seeking (individual survival behaviors)');
}

function calculateBoundaryAvoidance(agent: any, worldSize: number) {
  const boundary = worldSize / 2 - 2;
  const force = { x: 0, y: 0, z: 0 };
  const strength = 2.0;

  if (agent.position.x > boundary) {
    force.x = -strength * (agent.position.x - boundary);
  } else if (agent.position.x < -boundary) {
    force.x = -strength * (agent.position.x + boundary);
  }

  if (agent.position.y > boundary) {
    force.y = -strength * (agent.position.y - boundary);
  } else if (agent.position.y < -boundary) {
    force.y = -strength * (agent.position.y + boundary);
  }

  if (agent.position.z > 10) {
    force.z = -strength * (agent.position.z - 10);
  } else if (agent.position.z < 0) {
    force.z = -strength * agent.position.z;
  }

  return force;
}

if (require.main === module) {
  runFlockingSimulation().catch(console.error);
}

export { runFlockingSimulation };