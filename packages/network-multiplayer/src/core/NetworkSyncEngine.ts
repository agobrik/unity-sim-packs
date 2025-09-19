import { EventEmitter } from 'events';

export interface NetworkMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  senderId: string;
  data: any;
  priority: MessagePriority;
  requiresAck: boolean;
  sequenceNumber: number;
}

export interface ClientState {
  id: string;
  connected: boolean;
  lastPing: number;
  latency: number;
  synchronized: boolean;
  version: string;
  role: ClientRole;
  permissions: string[];
}

export interface SyncState {
  entityId: string;
  version: number;
  timestamp: number;
  data: any;
  dirty: boolean;
  owner: string;
  lockState: LockState;
}

export interface ConflictResolution {
  strategy: ConflictStrategy;
  winner: string;
  resolution: any;
  timestamp: number;
  participants: string[];
}

export type MessageType =
  | 'state_update' | 'state_request' | 'state_sync' | 'heartbeat' | 'join' | 'leave'
  | 'command' | 'event' | 'conflict' | 'lock_request' | 'lock_release' | 'ping' | 'pong'
  | 'snapshot' | 'delta' | 'rollback' | 'prediction' | 'ack' | 'lock_response'
  | 'player_action' | 'entity_spawn' | 'entity_destroy' | 'entity_update' | 'weather_update';

export type MessagePriority = 'critical' | 'high' | 'normal' | 'low';

export type ClientRole = 'host' | 'client' | 'spectator' | 'admin';

export type LockState = 'unlocked' | 'locked' | 'pending';

export type ConflictStrategy = 'last_write_wins' | 'host_authority' | 'merge' | 'rollback' | 'vote';

export interface NetworkConfig {
  maxClients: number;
  tickRate: number;
  heartbeatInterval: number;
  timeoutThreshold: number;
  maxLatency: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  lagCompensation: boolean;
  predictionEnabled: boolean;
  rollbackFrames: number;
}

export class NetworkSyncEngine extends EventEmitter {
  private clients: Map<string, ClientState>;
  private syncStates: Map<string, SyncState>;
  private messageQueue: NetworkMessage[];
  private sequenceNumber: number;
  private isHost: boolean;
  private config: NetworkConfig;
  private tickTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private pendingAcks: Map<string, { timestamp: number; retries: number }>;
  private rollbackHistory: Map<number, Map<string, any>>;
  private predictions: Map<string, any[]>;

  constructor(config: NetworkConfig, isHost: boolean = false) {
    super();
    this.clients = new Map();
    this.syncStates = new Map();
    this.messageQueue = [];
    this.sequenceNumber = 0;
    this.isHost = isHost;
    this.config = config;
    this.pendingAcks = new Map();
    this.rollbackHistory = new Map();
    this.predictions = new Map();

    this.startNetworkTick();
    this.startHeartbeat();
  }

  // Client management
  addClient(clientId: string, role: ClientRole = 'client'): void {
    const client: ClientState = {
      id: clientId,
      connected: true,
      lastPing: Date.now(),
      latency: 0,
      synchronized: false,
      version: '1.0.0',
      role,
      permissions: this.getDefaultPermissions(role)
    };

    this.clients.set(clientId, client);
    this.emit('client_connected', client);

    // Send initial state sync
    if (this.isHost) {
      this.sendInitialSync(clientId);
    }
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.emit('client_disconnected', client);

      // Release any locks held by this client
      this.releaseClientLocks(clientId);

      // Clean up predictions
      this.predictions.delete(clientId);
    }
  }

  getClient(clientId: string): ClientState | undefined {
    return this.clients.get(clientId);
  }

  getAllClients(): ClientState[] {
    return Array.from(this.clients.values());
  }

  // State synchronization
  updateState(entityId: string, data: any, ownerId: string = '', immediate: boolean = false): void {
    const currentState = this.syncStates.get(entityId);
    const timestamp = Date.now();
    const version = currentState ? currentState.version + 1 : 1;

    const newState: SyncState = {
      entityId,
      version,
      timestamp,
      data: { ...data },
      dirty: true,
      owner: ownerId || (currentState?.owner || ''),
      lockState: currentState?.lockState || 'unlocked'
    };

    this.syncStates.set(entityId, newState);

    // Save to rollback history if prediction is enabled
    if (this.config.predictionEnabled) {
      this.saveRollbackState(timestamp, entityId, data);
    }

    if (immediate) {
      this.broadcastStateUpdate(newState);
    }

    this.emit('state_updated', newState);
  }

  getState(entityId: string): SyncState | undefined {
    return this.syncStates.get(entityId);
  }

  getAllStates(): SyncState[] {
    return Array.from(this.syncStates.values());
  }

  // Message handling
  sendMessage(type: MessageType, data: any, targetId?: string, priority: MessagePriority = 'normal'): void {
    const message: NetworkMessage = {
      id: this.generateMessageId(),
      type,
      timestamp: Date.now(),
      senderId: this.getLocalClientId(),
      data,
      priority,
      requiresAck: priority === 'critical',
      sequenceNumber: ++this.sequenceNumber
    };

    if (message.requiresAck) {
      this.pendingAcks.set(message.id, { timestamp: message.timestamp, retries: 0 });
    }

    if (targetId) {
      this.sendDirectMessage(message, targetId);
    } else {
      this.broadcastMessage(message);
    }
  }

  processMessage(message: NetworkMessage): void {
    // Validate message
    if (!this.validateMessage(message)) {
      console.warn('Invalid message received:', message.id);
      return;
    }

    // Send acknowledgment if required
    if (message.requiresAck) {
      this.sendAcknowledgment(message);
    }

    // Process based on type
    switch (message.type) {
      case 'state_update':
        this.handleStateUpdate(message);
        break;
      case 'state_request':
        this.handleStateRequest(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'ping':
        this.handlePing(message);
        break;
      case 'pong':
        this.handlePong(message);
        break;
      case 'lock_request':
        this.handleLockRequest(message);
        break;
      case 'lock_release':
        this.handleLockRelease(message);
        break;
      case 'command':
        this.handleCommand(message);
        break;
      case 'conflict':
        this.handleConflict(message);
        break;
      default:
        this.emit('message_received', message);
        break;
    }
  }

  // Conflict resolution
  resolveConflict(entityId: string, conflictingStates: SyncState[]): ConflictResolution {
    const state = this.syncStates.get(entityId);
    if (!state) {
      throw new Error(`Entity ${entityId} not found for conflict resolution`);
    }

    const strategy = this.getConflictStrategy(entityId);
    let resolution: ConflictResolution;

    switch (strategy) {
      case 'last_write_wins':
        resolution = this.resolveLastWriteWins(conflictingStates);
        break;
      case 'host_authority':
        resolution = this.resolveHostAuthority(conflictingStates);
        break;
      case 'merge':
        resolution = this.resolveMerge(conflictingStates);
        break;
      case 'rollback':
        resolution = this.resolveRollback(conflictingStates);
        break;
      case 'vote':
        resolution = this.resolveVote(conflictingStates);
        break;
      default:
        resolution = this.resolveLastWriteWins(conflictingStates);
        break;
    }

    // Apply resolution
    this.updateState(entityId, resolution.resolution, resolution.winner);
    this.emit('conflict_resolved', resolution);

    return resolution;
  }

  // Lock management
  requestLock(entityId: string, clientId: string, timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const state = this.syncStates.get(entityId);
      if (!state) {
        reject(new Error(`Entity ${entityId} not found`));
        return;
      }

      if (state.lockState === 'locked' && state.owner !== clientId) {
        resolve(false); // Already locked by someone else
        return;
      }

      // Grant lock
      state.lockState = 'locked';
      state.owner = clientId;
      this.syncStates.set(entityId, state);

      // Set timeout for automatic release
      setTimeout(() => {
        if (state.owner === clientId && state.lockState === 'locked') {
          this.releaseLock(entityId, clientId);
        }
      }, timeout);

      this.emit('lock_acquired', { entityId, clientId });
      resolve(true);
    });
  }

  releaseLock(entityId: string, clientId: string): boolean {
    const state = this.syncStates.get(entityId);
    if (!state || state.owner !== clientId) {
      return false;
    }

    state.lockState = 'unlocked';
    this.syncStates.set(entityId, state);

    this.emit('lock_released', { entityId, clientId });
    return true;
  }

  // Prediction and rollback
  predictState(entityId: string, clientId: string, inputData: any): any {
    if (!this.config.predictionEnabled) return null;

    const currentState = this.getState(entityId);
    if (!currentState) return null;

    // Simple prediction: apply input to current state
    const predictedState = this.applyPrediction(currentState.data, inputData);

    // Store prediction for potential rollback
    if (!this.predictions.has(clientId)) {
      this.predictions.set(clientId, []);
    }
    this.predictions.get(clientId)!.push({
      timestamp: Date.now(),
      entityId,
      predicted: predictedState,
      input: inputData
    });

    return predictedState;
  }

  rollbackToFrame(frameTimestamp: number): void {
    const rollbackData = this.rollbackHistory.get(frameTimestamp);
    if (!rollbackData) return;

    // Restore states
    for (const [entityId, data] of rollbackData) {
      const currentState = this.syncStates.get(entityId);
      if (currentState) {
        currentState.data = { ...data };
        currentState.timestamp = frameTimestamp;
        this.syncStates.set(entityId, currentState);
      }
    }

    this.emit('rollback_completed', frameTimestamp);
  }

  // Latency management
  measureLatency(clientId: string): void {
    const timestamp = Date.now();
    this.sendMessage('ping', { timestamp }, clientId, 'high');
  }

  compensateForLatency(message: NetworkMessage): NetworkMessage {
    if (!this.config.lagCompensation) return message;

    const client = this.clients.get(message.senderId);
    if (!client) return message;

    // Adjust timestamp based on estimated latency
    const compensatedMessage = { ...message };
    compensatedMessage.timestamp -= client.latency / 2;

    return compensatedMessage;
  }

  // Network tick
  private startNetworkTick(): void {
    this.tickTimer = setInterval(() => {
      this.networkTick();
    }, 1000 / this.config.tickRate);
  }

  private networkTick(): void {
    // Process message queue
    this.processMessageQueue();

    // Send dirty state updates
    this.sendDirtyStates();

    // Check for timeouts
    this.checkClientTimeouts();

    // Retry failed acknowledgments
    this.retryPendingAcks();

    // Clean up old rollback history
    this.cleanupRollbackHistory();

    this.emit('network_tick');
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  // Helper methods
  private getDefaultPermissions(role: ClientRole): string[] {
    switch (role) {
      case 'host': return ['all'];
      case 'admin': return ['moderate', 'kick', 'state_modify'];
      case 'client': return ['state_read', 'chat'];
      case 'spectator': return ['state_read'];
      default: return ['state_read'];
    }
  }

  private sendInitialSync(clientId: string): void {
    const allStates = this.getAllStates();
    this.sendMessage('state_sync', { states: allStates }, clientId, 'critical');
  }

  private releaseClientLocks(clientId: string): void {
    for (const [entityId, state] of this.syncStates) {
      if (state.owner === clientId && state.lockState === 'locked') {
        this.releaseLock(entityId, clientId);
      }
    }
  }

  private broadcastStateUpdate(state: SyncState): void {
    this.broadcastMessage({
      id: this.generateMessageId(),
      type: 'state_update',
      timestamp: Date.now(),
      senderId: this.getLocalClientId(),
      data: state,
      priority: 'normal',
      requiresAck: false,
      sequenceNumber: ++this.sequenceNumber
    });
  }

  private validateMessage(message: NetworkMessage): boolean {
    return !!(message.id && message.type && message.senderId && message.timestamp);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getLocalClientId(): string {
    return this.isHost ? 'host' : 'client';
  }

  private sendDirectMessage(message: NetworkMessage, targetId: string): void {
    // Implementation would depend on transport layer
    this.emit('send_message', message, targetId);
  }

  private broadcastMessage(message: NetworkMessage): void {
    // Implementation would depend on transport layer
    this.emit('broadcast_message', message);
  }

  private sendAcknowledgment(message: NetworkMessage): void {
    this.sendMessage('ack', { messageId: message.id }, message.senderId, 'high');
  }

  private handleStateUpdate(message: NetworkMessage): void {
    const state = message.data as SyncState;
    const currentState = this.syncStates.get(state.entityId);

    if (!currentState || state.version > currentState.version) {
      this.syncStates.set(state.entityId, state);
      this.emit('remote_state_updated', state);
    } else if (state.version === currentState.version && state.timestamp !== currentState.timestamp) {
      // Conflict detected
      this.handleConflictDetected(state.entityId, [currentState, state]);
    }
  }

  private handleStateRequest(message: NetworkMessage): void {
    const { entityId } = message.data;
    const state = this.syncStates.get(entityId);
    if (state) {
      this.sendMessage('state_update', state, message.senderId, 'high');
    }
  }

  private handleHeartbeat(message: NetworkMessage): void {
    const client = this.clients.get(message.senderId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  private handlePing(message: NetworkMessage): void {
    this.sendMessage('pong', message.data, message.senderId, 'high');
  }

  private handlePong(message: NetworkMessage): void {
    const client = this.clients.get(message.senderId);
    if (client && message.data.timestamp) {
      client.latency = Date.now() - message.data.timestamp;
      this.emit('latency_updated', { clientId: message.senderId, latency: client.latency });
    }
  }

  private handleLockRequest(message: NetworkMessage): void {
    const { entityId, timeout } = message.data;
    this.requestLock(entityId, message.senderId, timeout)
      .then(granted => {
        this.sendMessage('lock_response', { entityId, granted }, message.senderId, 'high');
      });
  }

  private handleLockRelease(message: NetworkMessage): void {
    const { entityId } = message.data;
    this.releaseLock(entityId, message.senderId);
  }

  private handleCommand(message: NetworkMessage): void {
    // Handle game commands
    this.emit('command_received', message.data, message.senderId);
  }

  private handleConflict(message: NetworkMessage): void {
    const { entityId, states } = message.data;
    this.resolveConflict(entityId, states);
  }

  private handleConflictDetected(entityId: string, conflictingStates: SyncState[]): void {
    if (this.isHost) {
      this.resolveConflict(entityId, conflictingStates);
    } else {
      // Forward to host for resolution
      this.sendMessage('conflict', { entityId, states: conflictingStates }, 'host', 'critical');
    }
  }

  private getConflictStrategy(entityId: string): ConflictStrategy {
    // Default strategy, could be configurable per entity
    return this.isHost ? 'host_authority' : 'last_write_wins';
  }

  private resolveLastWriteWins(states: SyncState[]): ConflictResolution {
    const latest = states.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    return {
      strategy: 'last_write_wins',
      winner: latest.owner,
      resolution: latest.data,
      timestamp: Date.now(),
      participants: states.map(s => s.owner)
    };
  }

  private resolveHostAuthority(states: SyncState[]): ConflictResolution {
    const hostState = states.find(s => s.owner === 'host') || states[0];

    return {
      strategy: 'host_authority',
      winner: hostState.owner,
      resolution: hostState.data,
      timestamp: Date.now(),
      participants: states.map(s => s.owner)
    };
  }

  private resolveMerge(states: SyncState[]): ConflictResolution {
    // Simple merge strategy - combine all non-conflicting properties
    let merged = {};
    for (const state of states) {
      merged = { ...merged, ...state.data };
    }

    return {
      strategy: 'merge',
      winner: 'system',
      resolution: merged,
      timestamp: Date.now(),
      participants: states.map(s => s.owner)
    };
  }

  private resolveRollback(states: SyncState[]): ConflictResolution {
    // Find common ancestor or use earliest valid state
    const earliest = states.reduce((earliest, current) =>
      current.timestamp < earliest.timestamp ? current : earliest
    );

    return {
      strategy: 'rollback',
      winner: earliest.owner,
      resolution: earliest.data,
      timestamp: Date.now(),
      participants: states.map(s => s.owner)
    };
  }

  private resolveVote(states: SyncState[]): ConflictResolution {
    // Count votes for each unique state
    const voteMap = new Map<string, { count: number; state: SyncState }>();

    for (const state of states) {
      const key = JSON.stringify(state.data);
      const existing = voteMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        voteMap.set(key, { count: 1, state });
      }
    }

    // Find most voted state
    let winner = { count: 0, state: states[0] };
    for (const vote of voteMap.values()) {
      if (vote.count > winner.count) {
        winner = vote;
      }
    }

    return {
      strategy: 'vote',
      winner: winner.state.owner,
      resolution: winner.state.data,
      timestamp: Date.now(),
      participants: states.map(s => s.owner)
    };
  }

  private saveRollbackState(timestamp: number, entityId: string, data: any): void {
    if (!this.rollbackHistory.has(timestamp)) {
      this.rollbackHistory.set(timestamp, new Map());
    }
    this.rollbackHistory.get(timestamp)!.set(entityId, { ...data });
  }

  private applyPrediction(currentState: any, inputData: any): any {
    // Simple prediction logic - would be game-specific
    return { ...currentState, ...inputData };
  }

  private processMessageQueue(): void {
    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Process messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.processMessage(message);
    }
  }

  private sendDirtyStates(): void {
    for (const [entityId, state] of this.syncStates) {
      if (state.dirty) {
        this.broadcastStateUpdate(state);
        state.dirty = false;
        this.syncStates.set(entityId, state);
      }
    }
  }

  private checkClientTimeouts(): void {
    const now = Date.now();
    for (const [clientId, client] of this.clients) {
      if (now - client.lastPing > this.config.timeoutThreshold) {
        this.removeClient(clientId);
      }
    }
  }

  private retryPendingAcks(): void {
    const now = Date.now();
    for (const [messageId, ackInfo] of this.pendingAcks) {
      if (now - ackInfo.timestamp > 5000) { // 5 second timeout
        if (ackInfo.retries < 3) {
          ackInfo.retries++;
          // Resend message logic would go here
          this.emit('message_retry', messageId);
        } else {
          this.pendingAcks.delete(messageId);
          this.emit('message_timeout', messageId);
        }
      }
    }
  }

  private cleanupRollbackHistory(): void {
    const cutoff = Date.now() - (this.config.rollbackFrames * 1000 / this.config.tickRate);
    for (const [timestamp] of this.rollbackHistory) {
      if (timestamp < cutoff) {
        this.rollbackHistory.delete(timestamp);
      }
    }
  }

  private sendHeartbeat(): void {
    this.broadcastMessage({
      id: this.generateMessageId(),
      type: 'heartbeat',
      timestamp: Date.now(),
      senderId: this.getLocalClientId(),
      data: { status: 'alive' },
      priority: 'low',
      requiresAck: false,
      sequenceNumber: ++this.sequenceNumber
    });
  }

  // Public utility methods
  getNetworkStats(): {
    connectedClients: number;
    syncedEntities: number;
    averageLatency: number;
    messageQueue: number;
    tickRate: number;
  } {
    const latencies = Array.from(this.clients.values()).map(c => c.latency).filter(l => l > 0);
    const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0;

    return {
      connectedClients: this.clients.size,
      syncedEntities: this.syncStates.size,
      averageLatency,
      messageQueue: this.messageQueue.length,
      tickRate: this.config.tickRate
    };
  }

  shutdown(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    this.clients.clear();
    this.syncStates.clear();
    this.messageQueue = [];
    this.pendingAcks.clear();
    this.rollbackHistory.clear();
    this.predictions.clear();

    this.emit('shutdown');
  }
}