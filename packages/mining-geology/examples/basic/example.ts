import { MiningGeologySimulation } from '../../src/index';

export function runMiningGeologyExample(): void {
  console.log('⛏️ Starting Mining & Geology Simulation...');

  const simulation = new MiningGeologySimulation();

  simulation.addDeposit({
    id: 'gold_vein_1',
    type: 'Gold',
    quantity: 10000,
    quality: 0.8,
    depth: 100,
    extractionRate: 50,
    difficulty: 0.7
  });

  simulation.addOperation({
    id: 'mining_op_1',
    depositId: 'gold_vein_1',
    equipment: ['excavator', 'drill'],
    workers: 50,
    efficiency: 0.85,
    environmentalImpact: 0.3
  });

  // Run simulation
  for (let i = 0; i < 100; i++) {
    simulation.step(1);
    if (i % 20 === 0) {
      console.log(`Day ${i}: Resources remaining = ${simulation.getTotalResources().toLocaleString()}`);
    }
  }

  console.log('✅ Mining & Geology Simulation Complete!');
}

export default runMiningGeologyExample;