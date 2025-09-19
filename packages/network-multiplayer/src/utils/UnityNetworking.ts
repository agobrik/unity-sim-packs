import { NetworkSyncEngine, NetworkMessage, ClientState } from '../core/NetworkSyncEngine';
import { PlayerManager, PlayerProfile, GameSession } from '../core/PlayerManager';

export interface UnityNetworkMessage {
  messageId: string;
  messageType: string;
  timestamp: number;
  senderId: string;
  targetId?: string;
  data: any;
  reliable: boolean;
  compressed: boolean;
}

export interface UnityPlayerData {
  playerId: string;
  username: string;
  steamId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  animation: string;
  health: number;
  maxHealth: number;
  level: number;
  team: string;
  isAlive: boolean;
  equipment: string[];
  stats: { [key: string]: number };
}

export interface UnityGameState {
  sessionId: string;
  gameMode: string;
  mapName: string;
  gameTime: number;
  maxPlayers: number;
  players: UnityPlayerData[];
  teams: UnityTeamData[];
  objectives: UnityObjective[];
  entities: UnityEntity[];
  weather: UnityWeatherData;
  settings: UnityGameSettings;
}

export interface UnityTeamData {
  teamId: string;
  name: string;
  color: string;
  score: number;
  members: string[];
  isEliminated: boolean;
}

export interface UnityObjective {
  id: string;
  type: string;
  description: string;
  position: { x: number; y: number; z: number };
  progress: number;
  maxProgress: number;
  assignedTeam?: string;
  isCompleted: boolean;
  timeLimit?: number;
}

export interface UnityEntity {
  id: string;
  type: string;
  prefabName: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  ownerId?: string;
  health?: number;
  properties: { [key: string]: any };
}

export interface UnityWeatherData {
  type: 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
  intensity: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  visibility: number;
}

export interface UnityGameSettings {
  timeOfDay: number;
  dayLength: number;
  pvpEnabled: boolean;
  friendlyFire: boolean;
  respawnTime: number;
  maxRespawns: number;
  resourceMultiplier: number;
  damageMultiplier: number;
  buildingDecay: boolean;
  autoSave: boolean;
}

export interface NetworkOptimization {
  deltaCompression: boolean;
  prioritySystem: boolean;
  cullDistance: number;
  updateFrequency: { [entityType: string]: number };
  interpolationTime: number;
  extrapolationTime: number;
}

export interface UnityNetworkExport {
  metadata: {
    exportTime: string;
    version: string;
    sessionId: string;
    serverInfo: any;
  };
  gameState: UnityGameState;
  networkConfig: {
    tickRate: number;
    sendRate: number;
    compression: boolean;
    encryption: boolean;
    optimization: NetworkOptimization;
  };
  playerStates: UnityPlayerData[];
  replicationData: {
    entityStates: { [entityId: string]: any };
    priorities: { [entityId: string]: number };
    ownership: { [entityId: string]: string };
  };
}

export class UnityNetworking {
  private networkSync: NetworkSyncEngine;
  private playerManager: PlayerManager;
  private gameEntities: Map<string, UnityEntity>;
  private weatherSystem: UnityWeatherData;
  private gameSettings: UnityGameSettings;
  private optimizationSettings: NetworkOptimization;

  constructor(networkSync: NetworkSyncEngine, playerManager: PlayerManager) {
    this.networkSync = networkSync;
    this.playerManager = playerManager;
    this.gameEntities = new Map();
    this.weatherSystem = this.createDefaultWeather();
    this.gameSettings = this.createDefaultGameSettings();
    this.optimizationSettings = this.createDefaultOptimization();

    this.setupNetworkHandlers();
  }

  // Unity message conversion
  convertToUnityMessage(networkMessage: NetworkMessage): UnityNetworkMessage {
    return {
      messageId: networkMessage.id,
      messageType: this.mapMessageType(networkMessage.type),
      timestamp: networkMessage.timestamp,
      senderId: networkMessage.senderId,
      targetId: undefined, // Unity handles routing
      data: this.processMessageData(networkMessage.data, networkMessage.type),
      reliable: networkMessage.priority === 'critical' || networkMessage.requiresAck,
      compressed: this.shouldCompressMessage(networkMessage)
    };
  }

  convertFromUnityMessage(unityMessage: UnityNetworkMessage): NetworkMessage {
    return {
      id: unityMessage.messageId,
      type: this.mapUnityMessageType(unityMessage.messageType),
      timestamp: unityMessage.timestamp,
      senderId: unityMessage.senderId,
      data: unityMessage.data,
      priority: unityMessage.reliable ? 'critical' : 'normal',
      requiresAck: unityMessage.reliable,
      sequenceNumber: 0 // Unity handles sequencing
    };
  }

  // Player state synchronization
  syncPlayerToUnity(player: PlayerProfile): UnityPlayerData {
    const playerTeam = this.playerManager.getPlayerTeam(player.id);

    return {
      playerId: player.id,
      username: player.username,
      steamId: player.steamId || '',
      position: { x: 0, y: 0, z: 0 }, // Updated by Unity
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      animation: 'idle',
      health: 100,
      maxHealth: 100,
      level: player.level,
      team: playerTeam?.id || '',
      isAlive: true,
      equipment: [],
      stats: this.convertPlayerStats(player.statistics)
    };
  }

  updatePlayerFromUnity(playerId: string, unityData: Partial<UnityPlayerData>): void {
    // Update player state from Unity
    this.networkSync.updateState(`unity_player_${playerId}`, unityData, playerId);
  }

  // Game state management
  generateUnityGameState(sessionId: string): UnityGameState {
    const session = this.playerManager['sessions'].get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const players = session.players
      .map(playerId => this.playerManager.getPlayer(playerId))
      .filter(p => p !== undefined)
      .map(player => this.syncPlayerToUnity(player!));

    const teams = this.playerManager.getTeamsInSession(sessionId)
      .map(team => this.convertTeamToUnity(team));

    const objectives = this.generateObjectives(sessionId);
    const entities = Array.from(this.gameEntities.values());

    return {
      sessionId: session.sessionId,
      gameMode: session.gameMode,
      mapName: this.getMapForSession(session),
      gameTime: Date.now() - session.startTime.getTime(),
      maxPlayers: players.length,
      players,
      teams,
      objectives,
      entities,
      weather: this.weatherSystem,
      settings: this.gameSettings
    };
  }

  updateGameState(sessionId: string, unityGameState: Partial<UnityGameState>): void {
    // Update internal state from Unity game state
    if (unityGameState.players) {
      for (const playerData of unityGameState.players) {
        this.updatePlayerFromUnity(playerData.playerId, playerData);
      }
    }

    if (unityGameState.entities) {
      for (const entity of unityGameState.entities) {
        this.gameEntities.set(entity.id, entity);
      }
    }

    if (unityGameState.weather) {
      this.weatherSystem = unityGameState.weather;
    }

    // Sync with network
    this.networkSync.updateState(`game_state_${sessionId}`, unityGameState, 'host');
  }

  // Entity management
  spawnEntity(type: string, prefabName: string, position: { x: number; y: number; z: number }, ownerId?: string): UnityEntity {
    const entity: UnityEntity = {
      id: this.generateEntityId(),
      type,
      prefabName,
      position: { ...position },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
      ownerId,
      health: this.getEntityDefaultHealth(type),
      properties: {}
    };

    this.gameEntities.set(entity.id, entity);

    // Sync spawn across network
    this.networkSync.sendMessage('entity_spawn', entity, undefined, 'high');

    return entity;
  }

  destroyEntity(entityId: string): boolean {
    const entity = this.gameEntities.get(entityId);
    if (!entity) return false;

    this.gameEntities.delete(entityId);

    // Sync destruction
    this.networkSync.sendMessage('entity_destroy', { entityId }, undefined, 'high');

    return true;
  }

  updateEntity(entityId: string, updates: Partial<UnityEntity>): boolean {
    const entity = this.gameEntities.get(entityId);
    if (!entity) return false;

    Object.assign(entity, updates);
    this.gameEntities.set(entityId, entity);

    // Sync updates with priority based on entity type
    const priority = this.getEntityUpdatePriority(entity.type);
    this.networkSync.sendMessage('entity_update', { entityId, updates }, undefined, priority);

    return true;
  }

  // Network optimization
  optimizeForUnity(sessionId: string): void {
    // Implement Unity-specific optimizations
    this.cullDistantEntities(sessionId);
    this.prioritizeUpdates(sessionId);
    this.compressRedundantData(sessionId);
  }

  // Weather system
  updateWeather(weather: Partial<UnityWeatherData>): void {
    this.weatherSystem = { ...this.weatherSystem, ...weather };
    this.networkSync.sendMessage('weather_update', this.weatherSystem, undefined, 'normal');
  }

  // Export functionality
  exportForUnity(sessionId: string): UnityNetworkExport {
    const gameState = this.generateUnityGameState(sessionId);
    const players = gameState.players;

    // Generate replication data
    const entityStates: { [entityId: string]: any } = {};
    const priorities: { [entityId: string]: number } = {};
    const ownership: { [entityId: string]: string } = {};

    for (const entity of this.gameEntities.values()) {
      entityStates[entity.id] = this.optimizeEntityState(entity);
      priorities[entity.id] = this.getEntityUpdatePriority(entity.type);
      ownership[entity.id] = entity.ownerId || 'server';
    }

    return {
      metadata: {
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        sessionId,
        serverInfo: {
          tickRate: this.networkSync['config'].tickRate,
          maxClients: this.networkSync['config'].maxClients,
          region: 'us-east',
          gameVersion: '1.0.0'
        }
      },
      gameState,
      networkConfig: {
        tickRate: this.networkSync['config'].tickRate,
        sendRate: 20, // Unity networking send rate
        compression: this.networkSync['config'].compressionEnabled,
        encryption: this.networkSync['config'].encryptionEnabled,
        optimization: this.optimizationSettings
      },
      playerStates: players,
      replicationData: {
        entityStates,
        priorities,
        ownership
      }
    };
  }

  exportToJSON(sessionId: string): string {
    return JSON.stringify(this.exportForUnity(sessionId), null, 2);
  }

  // Private helper methods
  private setupNetworkHandlers(): void {
    this.networkSync.on('message_received', (message) => {
      this.handleUnityMessage(message);
    });

    this.networkSync.on('state_updated', (state) => {
      this.handleUnityStateUpdate(state);
    });
  }

  private handleUnityMessage(message: NetworkMessage): void {
    const unityMessage = this.convertToUnityMessage(message);
    // Emit for Unity to handle
    this.networkSync.emit('unity_message', unityMessage);
  }

  private handleUnityStateUpdate(state: any): void {
    if (state.entityId.startsWith('unity_')) {
      // Handle Unity-specific state updates
      this.networkSync.emit('unity_state_update', state);
    }
  }

  private mapMessageType(networkType: string): string {
    const typeMap: { [key: string]: string } = {
      'state_update': 'StateUpdate',
      'command': 'PlayerCommand',
      'event': 'GameEvent',
      'chat': 'ChatMessage',
      'ping': 'NetworkPing',
      'entity_spawn': 'SpawnEntity',
      'entity_destroy': 'DestroyEntity',
      'entity_update': 'UpdateEntity'
    };

    return typeMap[networkType] || 'GenericMessage';
  }

  private mapUnityMessageType(unityType: string): any {
    const typeMap: { [key: string]: any } = {
      'StateUpdate': 'state_update',
      'PlayerCommand': 'command',
      'GameEvent': 'event',
      'ChatMessage': 'chat',
      'NetworkPing': 'ping',
      'SpawnEntity': 'entity_spawn',
      'DestroyEntity': 'entity_destroy',
      'UpdateEntity': 'entity_update'
    };

    return typeMap[unityType] || 'message';
  }

  private processMessageData(data: any, messageType: string): any {
    // Process data for Unity compatibility
    switch (messageType) {
      case 'state_update':
        return this.optimizeStateData(data);
      case 'command':
        return this.validateCommandData(data);
      default:
        return data;
    }
  }

  private shouldCompressMessage(message: NetworkMessage): boolean {
    const compressibleTypes = ['state_update', 'entity_update', 'bulk_data'];
    return compressibleTypes.includes(message.type) && this.networkSync['config'].compressionEnabled;
  }

  private convertPlayerStats(stats: any): { [key: string]: number } {
    return {
      kills: stats.killDeathRatio * 100 || 0,
      deaths: stats.deaths || 0,
      score: stats.averageScore || 0,
      level: stats.level || 1,
      experience: stats.experience || 0,
      accuracy: stats.accuracyPercentage || 0,
      resources: stats.resourcesGathered || 0,
      buildings: stats.buildingsConstructed || 0,
      units: stats.unitsProduced || 0
    };
  }

  private convertTeamToUnity(team: any): UnityTeamData {
    return {
      teamId: team.id,
      name: team.name,
      color: team.color,
      score: team.score,
      members: team.members,
      isEliminated: !team.isAlive
    };
  }

  private generateObjectives(sessionId: string): UnityObjective[] {
    // Generate game objectives based on game mode
    const objectives: UnityObjective[] = [];

    // Example objectives
    objectives.push({
      id: 'capture_flag',
      type: 'capture',
      description: 'Capture the enemy flag',
      position: { x: 100, y: 0, z: 100 },
      progress: 0,
      maxProgress: 1,
      isCompleted: false,
      timeLimit: 300000 // 5 minutes
    });

    objectives.push({
      id: 'defend_base',
      type: 'defend',
      description: 'Defend your base',
      position: { x: -100, y: 0, z: -100 },
      progress: 1,
      maxProgress: 1,
      isCompleted: false
    });

    return objectives;
  }

  private getMapForSession(session: GameSession): string {
    // Map selection logic based on game mode
    const mapsByMode: { [mode: string]: string[] } = {
      'deathmatch': ['Arena', 'Warehouse', 'Desert'],
      'ctf': ['TwinBases', 'Canyon', 'Industrial'],
      'survival': ['Forest', 'Wasteland', 'Frozen'],
      'coop': ['Campaign1', 'Campaign2', 'Horde']
    };

    const availableMaps = mapsByMode[session.gameMode] || ['DefaultMap'];
    return availableMaps[Math.floor(Math.random() * availableMaps.length)];
  }

  private generateEntityId(): string {
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEntityDefaultHealth(type: string): number {
    const healthMap: { [type: string]: number } = {
      'player': 100,
      'npc': 50,
      'building': 500,
      'vehicle': 200,
      'item': 1,
      'destructible': 100
    };

    return healthMap[type] || 100;
  }

  private getEntityUpdatePriority(type: string): any {
    const priorityMap: { [type: string]: any } = {
      'player': 'high',
      'projectile': 'critical',
      'vehicle': 'high',
      'building': 'normal',
      'item': 'low',
      'effect': 'low'
    };

    return priorityMap[type] || 'normal';
  }

  private cullDistantEntities(sessionId: string): void {
    // Implement distance-based culling for optimization
    const cullDistance = this.optimizationSettings.cullDistance;
    const session = this.playerManager['sessions'].get(sessionId);
    if (!session) return;

    // Get player positions
    const playerPositions = new Map<string, { x: number; y: number; z: number }>();

    // Cull entities that are too far from all players
    for (const [entityId, entity] of this.gameEntities) {
      let shouldCull = true;

      for (const [playerId, playerPos] of playerPositions) {
        const distance = Math.sqrt(
          Math.pow(entity.position.x - playerPos.x, 2) +
          Math.pow(entity.position.y - playerPos.y, 2) +
          Math.pow(entity.position.z - playerPos.z, 2)
        );

        if (distance <= cullDistance) {
          shouldCull = false;
          break;
        }
      }

      if (shouldCull) {
        // Mark as culled rather than destroying
        entity.properties.culled = true;
      } else {
        delete entity.properties.culled;
      }
    }
  }

  private prioritizeUpdates(sessionId: string): void {
    // Implement update prioritization
    const updateFrequencies = this.optimizationSettings.updateFrequency;

    for (const [entityId, entity] of this.gameEntities) {
      const frequency = updateFrequencies[entity.type] || 20; // Default 20Hz
      entity.properties.updateFrequency = frequency;
    }
  }

  private compressRedundantData(sessionId: string): void {
    // Implement delta compression for redundant data
    if (this.optimizationSettings.deltaCompression) {
      // Mark entities for delta compression
      for (const entity of this.gameEntities.values()) {
        entity.properties.deltaCompressed = true;
      }
    }
  }

  private optimizeEntityState(entity: UnityEntity): any {
    // Return optimized state for network transmission
    const optimized = {
      id: entity.id,
      type: entity.type,
      position: entity.position,
      rotation: entity.rotation,
      health: entity.health
    };

    // Only include changed properties
    if (entity.properties.lastUpdate) {
      const changes: any = {};
      // Compare with last state and only include changes
      return changes;
    }

    return optimized;
  }

  private optimizeStateData(data: any): any {
    // Optimize state data for Unity
    if (data.position) {
      // Round position values to reduce precision
      data.position.x = Math.round(data.position.x * 100) / 100;
      data.position.y = Math.round(data.position.y * 100) / 100;
      data.position.z = Math.round(data.position.z * 100) / 100;
    }

    return data;
  }

  private validateCommandData(data: any): any {
    // Validate and sanitize command data
    if (!data.command || typeof data.command !== 'string') {
      return null;
    }

    // Whitelist allowed commands
    const allowedCommands = ['move', 'attack', 'build', 'research', 'trade'];
    if (!allowedCommands.includes(data.command)) {
      return null;
    }

    return data;
  }

  private createDefaultWeather(): UnityWeatherData {
    return {
      type: 'clear',
      intensity: 0,
      windSpeed: 5,
      windDirection: 0,
      temperature: 20,
      humidity: 50,
      visibility: 1000
    };
  }

  private createDefaultGameSettings(): UnityGameSettings {
    return {
      timeOfDay: 12, // Noon
      dayLength: 1200, // 20 minutes
      pvpEnabled: true,
      friendlyFire: false,
      respawnTime: 10,
      maxRespawns: -1, // Unlimited
      resourceMultiplier: 1.0,
      damageMultiplier: 1.0,
      buildingDecay: false,
      autoSave: true
    };
  }

  private createDefaultOptimization(): NetworkOptimization {
    return {
      deltaCompression: true,
      prioritySystem: true,
      cullDistance: 500,
      updateFrequency: {
        'player': 30,
        'vehicle': 20,
        'projectile': 60,
        'building': 5,
        'item': 2,
        'effect': 10
      },
      interpolationTime: 0.1,
      extrapolationTime: 0.05
    };
  }
}