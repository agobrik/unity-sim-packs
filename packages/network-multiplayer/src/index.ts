export {
  NetworkSyncEngine,
  NetworkMessage,
  ClientState,
  SyncState,
  ConflictResolution,
  MessageType,
  MessagePriority,
  ClientRole,
  LockState,
  ConflictStrategy,
  NetworkConfig
} from './core/NetworkSyncEngine';

export {
  PlayerManager,
  PlayerProfile,
  PlayerStatistics,
  PlayerPreferences,
  GameSession,
  PlayerAction,
  Team,
  PlayerRank,
  PlayerActionType,
  PlayerManagerConfig
} from './core/PlayerManager';

export {
  UnityNetworking,
  UnityNetworkMessage,
  UnityPlayerData,
  UnityGameState,
  UnityTeamData,
  UnityObjective,
  UnityEntity,
  UnityWeatherData,
  UnityGameSettings,
  NetworkOptimization,
  UnityNetworkExport
} from './utils/UnityNetworking';

import { NetworkSyncEngine, NetworkConfig } from './core/NetworkSyncEngine';
import { PlayerManager, PlayerManagerConfig } from './core/PlayerManager';
import { UnityNetworking } from './utils/UnityNetworking';

// Main multiplayer simulation class
export class NetworkMultiplayerSimulation {
  private networkSync: NetworkSyncEngine;
  private playerManager: PlayerManager;
  private unityNetworking: UnityNetworking;
  private isRunning: boolean = false;
  private currentSessionId?: string;

  constructor(
    networkConfig: NetworkConfig,
    playerConfig: PlayerManagerConfig,
    isHost: boolean = false
  ) {
    this.networkSync = new NetworkSyncEngine(networkConfig, isHost);
    this.playerManager = new PlayerManager(this.networkSync, playerConfig);
    this.unityNetworking = new UnityNetworking(this.networkSync, this.playerManager);

    this.setupEventHandlers();
  }

  // Session management
  createGameSession(hostId: string, gameMode: string): string {
    console.log(`🎮 Creating game session: ${gameMode}`);
    const session = this.playerManager.createSession(hostId, gameMode);
    this.currentSessionId = session.sessionId;

    console.log(`✅ Session created: ${session.sessionId}`);
    console.log(`   - Host: ${hostId}`);
    console.log(`   - Game Mode: ${gameMode}`);
    console.log(`   - State: ${session.gameState}`);

    return session.sessionId;
  }

  joinGameSession(playerId: string, sessionId: string): boolean {
    console.log(`🔌 Player ${playerId} joining session ${sessionId}`);
    const success = this.playerManager.joinSession(playerId, sessionId);

    if (success) {
      console.log(`✅ Player joined successfully`);
      this.currentSessionId = sessionId;
    } else {
      console.log(`❌ Failed to join session`);
    }

    return success;
  }

  startGameSession(sessionId: string): boolean {
    console.log(`🚀 Starting game session: ${sessionId}`);
    const success = this.playerManager.startSession(sessionId);

    if (success) {
      this.isRunning = true;
      console.log(`✅ Game session started`);
    } else {
      console.log(`❌ Failed to start session`);
    }

    return success;
  }

  // Player management
  addPlayer(playerData: any): string {
    console.log(`👤 Registering new player: ${playerData.username}`);
    const player = this.playerManager.registerPlayer(playerData);

    // Add to network sync
    this.networkSync.addClient(player.id, 'client');

    console.log(`✅ Player registered: ${player.id}`);
    console.log(`   - Username: ${player.username}`);
    console.log(`   - Rank: ${player.rank}`);
    console.log(`   - Level: ${player.level}`);

    return player.id;
  }

  removePlayer(playerId: string): boolean {
    console.log(`👋 Removing player: ${playerId}`);
    const success = this.playerManager.removePlayer(playerId);

    if (success) {
      this.networkSync.removeClient(playerId);
      console.log(`✅ Player removed successfully`);
    } else {
      console.log(`❌ Failed to remove player`);
    }

    return success;
  }

  // Team management
  createTeam(sessionId: string, teamName: string, leaderId: string): string | null {
    console.log(`🏆 Creating team: ${teamName} (Leader: ${leaderId})`);
    const team = this.playerManager.createTeam(sessionId, teamName, leaderId);

    if (team) {
      console.log(`✅ Team created: ${team.id}`);
      console.log(`   - Name: ${team.name}`);
      console.log(`   - Color: ${team.color}`);
      console.log(`   - Leader: ${team.leader}`);
      return team.id;
    } else {
      console.log(`❌ Failed to create team`);
      return null;
    }
  }

  // Real-time synchronization
  updatePlayerState(playerId: string, stateData: any): void {
    this.networkSync.updateState(`player_${playerId}`, stateData, playerId, true);
  }

  updateGameEntity(entityId: string, entityData: any): void {
    this.networkSync.updateState(`entity_${entityId}`, entityData, 'host', true);
  }

  sendPlayerCommand(playerId: string, command: string, data: any): void {
    this.networkSync.sendMessage('command', { command, data }, undefined, 'high');
    this.playerManager.recordAction(playerId, command as any, data, this.currentSessionId || '');
  }

  // Conflict resolution
  handleStateConflict(entityId: string, conflictingStates: any[]): any {
    console.log(`⚠️ Resolving conflict for entity: ${entityId}`);
    const resolution = this.networkSync.resolveConflict(entityId, conflictingStates);

    console.log(`✅ Conflict resolved using strategy: ${resolution.strategy}`);
    console.log(`   - Winner: ${resolution.winner}`);
    console.log(`   - Participants: ${resolution.participants.join(', ')}`);

    return resolution;
  }

  // Performance monitoring
  measureNetworkLatency(playerId: string): void {
    this.networkSync.measureLatency(playerId);
  }

  getNetworkStatistics(): any {
    const networkStats = this.networkSync.getNetworkStats();
    const managerStats = this.playerManager.getManagerStats();

    return {
      network: networkStats,
      players: managerStats,
      performance: {
        isRunning: this.isRunning,
        currentSession: this.currentSessionId,
        uptime: Date.now() // Would track actual uptime
      }
    };
  }

  // Unity integration
  exportForUnity(): string {
    if (!this.currentSessionId) {
      throw new Error('No active session to export');
    }

    console.log('📦 Exporting network state for Unity...');
    const unityData = this.unityNetworking.exportForUnity(this.currentSessionId);

    // Add Unity-compatible timestamp fields
    (unityData as any).timestamp = Date.now();
    (unityData as any).currentTime = Date.now();

    console.log(`✅ Unity export complete:`);
    console.log(`   - Players: ${unityData.playerStates.length}`);
    console.log(`   - Entities: ${Object.keys(unityData.replicationData.entityStates).length}`);
    console.log(`   - Data size: ${(JSON.stringify(unityData).length / 1024).toFixed(1)} KB`);

    return JSON.stringify(unityData, null, 2);
  }

  // Game scenarios
  setupDeathMatchScenario(maxPlayers: number = 8): string {
    console.log('⚔️ Setting up Deathmatch scenario...');

    const hostId = this.addPlayer({
      username: 'GameHost',
      steamId: 'host_001',
      level: 50,
      rank: 'master'
    });

    const sessionId = this.createGameSession(hostId, 'deathmatch');

    // Add AI players
    for (let i = 1; i < Math.min(maxPlayers, 4); i++) {
      const botId = this.addPlayer({
        username: `Bot_${i}`,
        level: Math.floor(Math.random() * 20) + 10,
        rank: Math.random() > 0.5 ? 'gold' : 'silver'
      });
      this.joinGameSession(botId, sessionId);
    }

    // Spawn entities
    this.unityNetworking.spawnEntity('weapon', 'AssaultRifle', { x: 0, y: 0, z: 0 });
    this.unityNetworking.spawnEntity('powerup', 'HealthPack', { x: 10, y: 0, z: 10 });
    this.unityNetworking.spawnEntity('vehicle', 'Tank', { x: -20, y: 0, z: -20 });

    // Update weather
    this.unityNetworking.updateWeather({
      type: 'clear',
      intensity: 0,
      windSpeed: 10,
      temperature: 25
    });

    console.log(`✅ Deathmatch scenario ready`);
    return sessionId;
  }

  setupCaptureTheFlagScenario(): string {
    console.log('🏴 Setting up Capture the Flag scenario...');

    const hostId = this.addPlayer({
      username: 'CTF_Host',
      steamId: 'host_ctf',
      level: 40,
      rank: 'platinum'
    });

    const sessionId = this.createGameSession(hostId, 'ctf');

    // Create teams
    const redTeamId = this.createTeam(sessionId, 'Red Team', hostId);
    const blueTeamId = this.createTeam(sessionId, 'Blue Team', hostId);

    // Add players to teams
    for (let i = 1; i <= 6; i++) {
      const playerId = this.addPlayer({
        username: `Player_${i}`,
        level: Math.floor(Math.random() * 30) + 15
      });
      this.joinGameSession(playerId, sessionId);

      // Alternate team assignment
      if (i % 2 === 1 && redTeamId) {
        this.playerManager.joinTeam(playerId, redTeamId);
      } else if (blueTeamId) {
        this.playerManager.joinTeam(playerId, blueTeamId);
      }
    }

    // Spawn flags and bases
    this.unityNetworking.spawnEntity('flag', 'RedFlag', { x: -50, y: 0, z: 0 });
    this.unityNetworking.spawnEntity('flag', 'BlueFlag', { x: 50, y: 0, z: 0 });
    this.unityNetworking.spawnEntity('building', 'RedBase', { x: -60, y: 0, z: -10 });
    this.unityNetworking.spawnEntity('building', 'BlueBase', { x: 60, y: 0, z: -10 });

    console.log(`✅ CTF scenario ready with ${redTeamId ? 'Red' : 'No'} and ${blueTeamId ? 'Blue' : 'No'} teams`);
    return sessionId;
  }

  setupCooperativeSurvivalScenario(): string {
    console.log('🧟 Setting up Cooperative Survival scenario...');

    const hostId = this.addPlayer({
      username: 'SurvivalHost',
      steamId: 'host_survival',
      level: 35,
      rank: 'gold'
    });

    const sessionId = this.createGameSession(hostId, 'survival');

    // Create single cooperative team
    const teamId = this.createTeam(sessionId, 'Survivors', hostId);

    // Add coop players
    for (let i = 1; i <= 4; i++) {
      const playerId = this.addPlayer({
        username: `Survivor_${i}`,
        level: Math.floor(Math.random() * 25) + 10
      });
      this.joinGameSession(playerId, sessionId);
      if (teamId) {
        this.playerManager.joinTeam(playerId, teamId);
      }
    }

    // Spawn survival elements
    this.unityNetworking.spawnEntity('building', 'SafeHouse', { x: 0, y: 0, z: 0 });
    this.unityNetworking.spawnEntity('resource', 'FoodSupply', { x: 5, y: 0, z: 5 });
    this.unityNetworking.spawnEntity('resource', 'AmmoCache', { x: -5, y: 0, z: 5 });

    // Set hostile weather
    this.unityNetworking.updateWeather({
      type: 'fog',
      intensity: 0.8,
      visibility: 100,
      temperature: 5
    });

    console.log(`✅ Survival scenario ready with cooperative team`);
    return sessionId;
  }

  // Simulation control
  simulateNetworkLatency(minLatency: number = 50, maxLatency: number = 200): void {
    const players = this.playerManager.getOnlinePlayers();

    for (const player of players) {
      const latency = Math.floor(Math.random() * (maxLatency - minLatency) + minLatency);
      const client = this.networkSync.getClient(player.id);
      if (client) {
        client.latency = latency;
      }
    }

    console.log(`🌐 Simulated network latency: ${minLatency}ms - ${maxLatency}ms`);
  }

  simulatePlayerActions(actionsPerSecond: number = 10): void {
    if (!this.isRunning) return;

    const players = this.playerManager.getOnlinePlayers();
    const actions = ['move', 'attack', 'build', 'research', 'trade'];

    setInterval(() => {
      for (let i = 0; i < actionsPerSecond; i++) {
        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        if (randomPlayer) {
          this.sendPlayerCommand(randomPlayer.id, randomAction, {
            timestamp: Date.now(),
            position: {
              x: Math.random() * 200 - 100,
              y: 0,
              z: Math.random() * 200 - 100
            }
          });
        }
      }
    }, 1000);

    console.log(`🤖 Started simulating ${actionsPerSecond} player actions per second`);
  }

  // Event handlers
  private setupEventHandlers(): void {
    this.networkSync.on('client_connected', (client) => {
      console.log(`🔗 Client connected: ${client.id} (${client.role})`);
    });

    this.networkSync.on('client_disconnected', (client) => {
      console.log(`💔 Client disconnected: ${client.id}`);
      this.removePlayer(client.id);
    });

    this.networkSync.on('conflict_resolved', (resolution) => {
      console.log(`⚖️ Conflict resolved: ${resolution.strategy} (Winner: ${resolution.winner})`);
    });

    this.playerManager.on('session_started', (session) => {
      console.log(`🎯 Session started: ${session.sessionId} (${session.gameMode})`);
    });

    this.playerManager.on('player_joined_session', ({ player, session }) => {
      console.log(`🎮 ${player.username} joined ${session.gameMode} session`);
    });

    this.playerManager.on('team_created', ({ team, sessionId }) => {
      console.log(`🏆 Team created: ${team.name} (${team.id})`);
    });
  }

  // Utility methods
  getCurrentSession(): any {
    if (!this.currentSessionId) return null;
    return this.playerManager['sessions'].get(this.currentSessionId);
  }

  getPlayer(playerId: string): any {
    return this.playerManager.getPlayer(playerId);
  }

  getAllPlayers(): any[] {
    return this.playerManager.getOnlinePlayers();
  }

  getLeaderboard(): any[] {
    return this.playerManager.getLeaderboard(20);
  }

  shutdown(): void {
    console.log('🛑 Shutting down multiplayer simulation...');

    this.isRunning = false;

    if (this.currentSessionId) {
      this.playerManager.endSession(this.currentSessionId);
    }

    this.networkSync.shutdown();
    this.playerManager.shutdown();

    console.log('✅ Shutdown complete');
  }

  exportState(): string {
    // Create a default session if none exists
    if (!this.currentSessionId) {
      this.currentSessionId = this.createGameSession('host_default', 'default');
    }

    return this.exportForUnity();
  }
}