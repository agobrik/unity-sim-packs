/**
 * Game Simulation Example
 * Demonstrates using the Time Manager for a real-time game simulation
 * with player actions, NPC behaviors, and environmental events
 */

import { TimeManager, EventScheduler, TimeHelpers } from '../src';
import { TimeManagerConfig, EventStatus, TaskStatus, TimeUnit, EasingType } from '../src/types';

interface Player {
  id: string;
  name: string;
  health: number;
  experience: number;
  level: number;
  position: { x: number; y: number };
}

interface NPC {
  id: string;
  name: string;
  health: number;
  behavior: 'patrol' | 'idle' | 'aggressive';
  position: { x: number; y: number };
  lastAction: number;
}

interface GameWorld {
  players: Map<string, Player>;
  npcs: Map<string, NPC>;
  worldTime: number;
  dayNightCycle: number; // 0-1 (0 = midnight, 0.5 = noon)
  weather: 'clear' | 'rain' | 'storm';
  resources: Map<string, number>;
}

class GameSimulation {
  private timeManager: TimeManager;
  private eventScheduler: EventScheduler;
  private world: GameWorld;
  private isRunning: boolean = false;

  constructor() {
    const config: TimeManagerConfig = {
      baseTimeScale: 1.0,
      maxTimeScale: 5.0,
      tickRate: 60, // 60 FPS
      enablePause: true,
      enableRewind: false,
      maxHistorySize: 100,
      eventQueueSize: 1000
    };

    this.timeManager = new TimeManager(config);
    this.eventScheduler = new EventScheduler();
    this.world = this.initializeWorld();

    this.setupEventHandlers();
    this.scheduleWorldEvents();
  }

  private initializeWorld(): GameWorld {
    const world: GameWorld = {
      players: new Map(),
      npcs: new Map(),
      worldTime: 0,
      dayNightCycle: 0.25, // Start at dawn
      weather: 'clear',
      resources: new Map([
        ['wood', 1000],
        ['stone', 500],
        ['food', 200]
      ])
    };

    // Add some initial players
    world.players.set('player1', {
      id: 'player1',
      name: 'Alice',
      health: 100,
      experience: 0,
      level: 1,
      position: { x: 0, y: 0 }
    });

    world.players.set('player2', {
      id: 'player2',
      name: 'Bob',
      health: 100,
      experience: 50,
      level: 1,
      position: { x: 10, y: 5 }
    });

    // Add NPCs
    for (let i = 0; i < 5; i++) {
      world.npcs.set(`npc${i}`, {
        id: `npc${i}`,
        name: `Guard ${i + 1}`,
        health: 80,
        behavior: 'patrol',
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        lastAction: 0
      });
    }

    return world;
  }

  private setupEventHandlers(): void {
    // Main game loop
    this.timeManager.on('tick', (data) => {
      this.updateGameLogic(data.delta);

      // Log major events
      if (data.frame % 300 === 0) { // Every 5 seconds
        this.logWorldState();
      }
    });

    // Performance monitoring
    this.timeManager.on('tick', (data) => {
      const metrics = this.timeManager.getMetrics();
      if (metrics.averageFrameTime > 20) { // Above 20ms (below 50 FPS)
        (globalThis as any).console?.warn(`⚠️ Performance warning: ${metrics.averageFrameTime.toFixed(2)}ms frame time`);
      }
    });

    // Event scheduler events
    this.eventScheduler.on('event_executed', (data) => {
      (globalThis as any).console?.log(`🎮 Game Event: ${data.event.name}`);
    });
  }

  private scheduleWorldEvents(): void {
    // Day/Night cycle (every 2 minutes = 24 hours in game)
    this.eventScheduler.schedulePeriodicEvent(
      'daynight-cycle',
      () => this.advanceDayNightCycle(),
      2000, // every 2 seconds
      undefined, // infinite
      { cycle: 'daynight' }
    );

    // Weather changes
    this.eventScheduler.schedulePeriodicEvent(
      'weather-update',
      () => this.updateWeather(),
      15000, // every 15 seconds
      undefined,
      { system: 'weather' }
    );

    // Resource generation
    this.eventScheduler.schedulePeriodicEvent(
      'resource-generation',
      () => this.generateResources(),
      5000, // every 5 seconds
      undefined,
      { system: 'resources' }
    );

    // Random events
    this.eventScheduler.schedulePeriodicEvent(
      'random-events',
      () => this.triggerRandomEvent(),
      10000, // every 10 seconds
      undefined,
      { type: 'random' }
    );

    // Player experience gain
    this.eventScheduler.schedulePeriodicEvent(
      'experience-tick',
      () => this.grantExperience(),
      3000, // every 3 seconds
      undefined,
      { system: 'progression' }
    );

    // NPC behavior updates
    this.eventScheduler.schedulePeriodicEvent(
      'npc-ai-update',
      () => this.updateNPCBehaviors(),
      1000, // every 1 second
      undefined,
      { system: 'ai' }
    );

    // Save game state
    this.eventScheduler.schedulePeriodicEvent(
      'autosave',
      () => this.saveGameState(),
      30000, // every 30 seconds
      undefined,
      { system: 'persistence' }
    );
  }

  private updateGameLogic(delta: number): void {
    this.world.worldTime += delta;

    // Update player positions (simulate movement)
    this.world.players.forEach(player => {
      // Simple random walk
      player.position.x += (Math.random() - 0.5) * 0.1;
      player.position.y += (Math.random() - 0.5) * 0.1;

      // Regenerate health slowly
      if (player.health < 100) {
        player.health = Math.min(100, player.health + 0.01);
      }
    });

    // Update NPC positions and behaviors
    this.world.npcs.forEach(npc => {
      const now = this.world.worldTime;

      if (now - npc.lastAction > 2000) { // Act every 2 seconds
        switch (npc.behavior) {
          case 'patrol':
            npc.position.x += (Math.random() - 0.5) * 2;
            npc.position.y += (Math.random() - 0.5) * 2;
            break;
          case 'idle':
            // Stay in place
            break;
          case 'aggressive':
            // Move towards nearest player
            const nearestPlayer = this.findNearestPlayer(npc.position);
            if (nearestPlayer) {
              const dx = nearestPlayer.position.x - npc.position.x;
              const dy = nearestPlayer.position.y - npc.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance > 0) {
                npc.position.x += (dx / distance) * 0.5;
                npc.position.y += (dy / distance) * 0.5;
              }
            }
            break;
        }
        npc.lastAction = now;
      }
    });
  }

  private advanceDayNightCycle(): void {
    this.world.dayNightCycle = (this.world.dayNightCycle + 0.02) % 1;

    const timeOfDay = this.getDayTimeDescription();
    if (this.world.dayNightCycle < 0.02 || Math.abs(this.world.dayNightCycle - 0.5) < 0.02) {
      (globalThis as any).console?.log(`🌅 ${timeOfDay}`);
    }
  }

  private getDayTimeDescription(): string {
    const cycle = this.world.dayNightCycle;
    if (cycle < 0.25) return 'Dawn';
    if (cycle < 0.5) return 'Morning';
    if (cycle < 0.75) return 'Afternoon';
    return 'Night';
  }

  private updateWeather(): void {
    const weathers: Array<'clear' | 'rain' | 'storm'> = ['clear', 'rain', 'storm'];
    const currentIndex = weathers.indexOf(this.world.weather);

    // 70% chance to stay the same, 30% chance to change
    if (Math.random() < 0.3) {
      const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
      if (newWeather !== this.world.weather) {
        this.world.weather = newWeather;
        (globalThis as any).console?.log(`🌤️ Weather changed to: ${newWeather}`);
      }
    }
  }

  private generateResources(): void {
    const resourceTypes = Array.from(this.world.resources.keys());

    resourceTypes.forEach(resourceType => {
      const baseGeneration = {
        wood: 10,
        stone: 5,
        food: 15
      }[resourceType] || 5;

      // Weather affects resource generation
      let multiplier = 1;
      if (this.world.weather === 'rain' && resourceType === 'food') {
        multiplier = 1.5; // Rain helps food growth
      } else if (this.world.weather === 'storm') {
        multiplier = 0.5; // Storms reduce all generation
      }

      const generated = Math.floor(baseGeneration * multiplier);
      const current = this.world.resources.get(resourceType) || 0;
      this.world.resources.set(resourceType, current + generated);
    });
  }

  private triggerRandomEvent(): void {
    const events = [
      () => this.merchantVisit(),
      () => this.monsterAttack(),
      () => this.treasureFound(),
      () => this.naturalDisaster()
    ];

    // 30% chance for a random event
    if (Math.random() < 0.3) {
      const event = events[Math.floor(Math.random() * events.length)];
      event();
    }
  }

  private merchantVisit(): void {
    (globalThis as any).console?.log('🏪 A merchant has arrived in the village!');

    // Schedule merchant departure
    this.eventScheduler.scheduleEvent(
      'merchant-departure',
      () => (globalThis as any).console?.log('🚶‍♂️ The merchant has left the village'),
      8000, // Leave after 8 seconds
      {},
      'merchant'
    );
  }

  private monsterAttack(): void {
    (globalThis as any).console?.log('👹 Monster attack! All players take damage!');

    this.world.players.forEach(player => {
      const damage = Math.floor(Math.random() * 20) + 10;
      player.health = Math.max(0, player.health - damage);
      (globalThis as any).console?.log(`  ⚔️ ${player.name} takes ${damage} damage (health: ${player.health})`);
    });
  }

  private treasureFound(): void {
    const finder = Array.from(this.world.players.values())[
      Math.floor(Math.random() * this.world.players.size)
    ];

    if (finder) {
      const experience = Math.floor(Math.random() * 50) + 25;
      finder.experience += experience;
      (globalThis as any).console?.log(`💰 ${finder.name} found treasure and gained ${experience} experience!`);
      this.checkLevelUp(finder);
    }
  }

  private naturalDisaster(): void {
    const disasters = ['earthquake', 'flood', 'tornado'];
    const disaster = disasters[Math.floor(Math.random() * disasters.length)];

    (globalThis as any).console?.log(`🌪️ Natural disaster: ${disaster}! Resources are affected.`);

    // Reduce all resources by 10-30%
    this.world.resources.forEach((amount, resource) => {
      const loss = Math.floor(amount * (0.1 + Math.random() * 0.2));
      this.world.resources.set(resource, Math.max(0, amount - loss));
    });
  }

  private grantExperience(): void {
    this.world.players.forEach(player => {
      const baseExp = 5;
      let multiplier = 1;

      // Bonus experience during day time
      if (this.world.dayNightCycle > 0.25 && this.world.dayNightCycle < 0.75) {
        multiplier = 1.2;
      }

      const experience = Math.floor(baseExp * multiplier);
      player.experience += experience;
      this.checkLevelUp(player);
    });
  }

  private checkLevelUp(player: Player): void {
    const requiredExp = player.level * 100;
    if (player.experience >= requiredExp) {
      player.level++;
      player.experience -= requiredExp;
      player.health = 100; // Full heal on level up
      (globalThis as any).console?.log(`🎉 ${player.name} leveled up to level ${player.level}!`);
    }
  }

  private updateNPCBehaviors(): void {
    this.world.npcs.forEach(npc => {
      // Random behavior changes
      if (Math.random() < 0.1) { // 10% chance
        const behaviors: Array<'patrol' | 'idle' | 'aggressive'> = ['patrol', 'idle', 'aggressive'];
        const newBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];

        if (newBehavior !== npc.behavior) {
          npc.behavior = newBehavior;
          (globalThis as any).console?.log(`🤖 ${npc.name} changed behavior to: ${newBehavior}`);
        }
      }

      // Health regeneration
      if (npc.health < 80) {
        npc.health = Math.min(80, npc.health + 2);
      }
    });
  }

  private findNearestPlayer(position: { x: number; y: number }): Player | null {
    let nearestPlayer: Player | null = null;
    let nearestDistance = Infinity;

    this.world.players.forEach(player => {
      const dx = player.position.x - position.x;
      const dy = player.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPlayer = player;
      }
    });

    return nearestPlayer;
  }

  private saveGameState(): void {
    const snapshot = this.timeManager.createSnapshot({
      world: JSON.parse(JSON.stringify(this.world)),
      timestamp: Date.now()
    });

    (globalThis as any).console?.log(`💾 Game saved (snapshot: ${snapshot.id})`);
  }

  private logWorldState(): void {
    const time = TimeHelpers.formatDuration(this.world.worldTime);
    const timeOfDay = this.getDayTimeDescription();

    (globalThis as any).console?.log('\n📊 World State Report:');
    (globalThis as any).console?.log(`   Time: ${time} (${timeOfDay})`);
    (globalThis as any).console?.log(`   Weather: ${this.world.weather}`);
    (globalThis as any).console?.log(`   Players: ${this.world.players.size}`);
    (globalThis as any).console?.log(`   NPCs: ${this.world.npcs.size}`);

    (globalThis as any).console?.log('   Resources:');
    this.world.resources.forEach((amount, resource) => {
      (globalThis as any).console?.log(`     ${resource}: ${amount}`);
    });

    (globalThis as any).console?.log('   Players:');
    this.world.players.forEach(player => {
      (globalThis as any).console?.log(`     ${player.name}: Lv.${player.level}, HP:${player.health.toFixed(0)}, Exp:${player.experience}`);
    });

    const metrics = this.timeManager.getMetrics();
    (globalThis as any).console?.log(`   Performance: ${metrics.ticksPerSecond.toFixed(1)} FPS, ${metrics.eventsProcessed} events processed`);
    (globalThis as any).console?.log('');
  }

  public start(): void {
    if (!this.isRunning) {
      (globalThis as any).console?.log('🎮 Starting Game Simulation...\n');
      this.isRunning = true;
      this.timeManager.play();
    }
  }

  public pause(): void {
    if (this.isRunning) {
      (globalThis as any).console?.log('⏸️ Pausing Game Simulation...\n');
      this.timeManager.pause();
    }
  }

  public resume(): void {
    if (this.isRunning) {
      (globalThis as any).console?.log('▶️ Resuming Game Simulation...\n');
      this.timeManager.play();
    }
  }

  public stop(): void {
    if (this.isRunning) {
      (globalThis as any).console?.log('🛑 Stopping Game Simulation...\n');
      this.isRunning = false;
      this.timeManager.stop();
      this.eventScheduler.clearAll();
    }
  }

  public setTimeScale(scale: number): void {
    this.timeManager.setTimeScale(scale);
    (globalThis as any).console?.log(`⏱️ Time scale set to ${scale}x`);
  }

  public getStatistics() {
    return {
      timeManager: this.timeManager.getMetrics(),
      eventScheduler: this.eventScheduler.getStatistics(),
      world: this.world
    };
  }
}

// Example usage
async function runGameSimulation() {
  (globalThis as any).console?.log('🎮 Game Simulation Example\n');
  (globalThis as any).console?.log('================================\n');

  const game = new GameSimulation();

  // Start the simulation
  game.start();

  // Demonstrate time control
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🏃‍♂️ Speeding up time...');
    game.setTimeScale(2.0);
  }, 10000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n⏸️ Pausing for maintenance...');
    game.pause();
  }, 20000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n▶️ Resuming simulation...');
    game.resume();
  }, 25000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🐌 Slowing down time...');
    game.setTimeScale(0.5);
  }, 35000);

  // Stop simulation after 45 seconds
  (globalThis as any).setTimeout(() => {
    const stats = game.getStatistics();
    (globalThis as any).console?.log('\n📈 Final Statistics:');
    (globalThis as any).console?.log('Time Manager:', stats.timeManager);
    (globalThis as any).console?.log('Event Scheduler:', stats.eventScheduler);

    game.stop();
    (globalThis as any).console?.log('✅ Game simulation example completed!');
  }, 45000);
}

// Run the example if this file is executed directly
if (require.main === module) {
  runGameSimulation().catch((globalThis as any).console?.error);
}

export { GameSimulation, runGameSimulation };