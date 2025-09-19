# @steam-sim/network-multiplayer

Real-time multiplayer synchronization with advanced conflict resolution, lag compensation, and Unity Netcode integration for Steam games.

## Features

- **Real-time State Synchronization**: Delta compression, priority-based updates, conflict resolution
- **6 Conflict Resolution Strategies**: Last-write-wins, host authority, merge, rollback, vote-based, custom
- **Advanced Lag Compensation**: Client prediction, rollback networking, server reconciliation
- **Comprehensive Player Management**: Teams, statistics, rankings, user profiles, session management
- **Network Optimization**: Message batching, compression, priority queuing, bandwidth management
- **Unity Netcode Integration**: Complete integration with Unity's Netcode for GameObjects

## Installation

```bash
npm install @steam-sim/network-multiplayer
```

## Quick Start

```typescript
import { NetworkMultiplayerSimulation } from '@steam-sim/network-multiplayer';

// Create multiplayer session
const simulation = new NetworkMultiplayerSimulation({
  isHost: true,
  maxPlayers: 16,
  tickRate: 60,
  conflictResolution: 'host-authority',
  enablePrediction: true,
  compressionLevel: 0.8
});

// Add players
const player1 = simulation.addPlayer('player1', 'Alice', { team: 'blue' });
const player2 = simulation.addPlayer('player2', 'Bob', { team: 'red' });

// Sync game entities
simulation.syncEntity('tank_001', {
  position: { x: 100, y: 50, z: 200 },
  rotation: { x: 0, y: 45, z: 0 },
  health: 100,
  ammo: 50
});

// Handle real-time updates
simulation.start();

// Export network state for Unity
const networkData = simulation.exportState();
```

## Core Systems

### NetworkSyncEngine
Real-time entity synchronization with conflict resolution:

```typescript
// Register entity for synchronization
simulation.syncEntity('player_123', {
  position: { x: 10, y: 0, z: 15 },
  velocity: { x: 5, y: 0, z: 0 },
  health: 85,
  score: 1250
});

// Handle entity updates with conflict resolution
const updateResult = simulation.updateEntity('player_123', {
  position: { x: 12, y: 0, z: 15 },
  health: 80
}, 'player1', Date.now());

console.log(`Update ${updateResult ? 'accepted' : 'rejected'}`);
```

### Conflict Resolution Strategies

#### 1. Last-Write-Wins
```typescript
// Simple timestamp-based resolution
const config = { conflictResolution: 'last-write-wins' };
// Most recent update overwrites previous values
```

#### 2. Host Authority
```typescript
// Host player has final authority
const config = { conflictResolution: 'host-authority' };
// Host updates always take precedence over client updates
```

#### 3. Merge Strategy
```typescript
// Intelligent field merging
const config = {
  conflictResolution: 'merge',
  mergeRules: {
    position: 'interpolate',    // Smooth position blending
    health: 'min',              // Take lowest health value
    score: 'max'                // Take highest score
  }
};
```

#### 4. Rollback Networking
```typescript
// Client prediction with server reconciliation
const config = {
  conflictResolution: 'rollback',
  rollbackFrames: 10,          // Keep 10 frames of history
  enablePrediction: true       // Client-side prediction
};
```

#### 5. Vote-Based Resolution
```typescript
// Majority consensus on conflicts
const config = {
  conflictResolution: 'vote',
  voteThreshold: 0.6,          // 60% agreement required
  voteTimeout: 1000            // 1 second vote window
};
```

#### 6. Custom Resolution
```typescript
// Custom conflict resolution logic
const config = {
  conflictResolution: 'custom',
  customResolver: (current, incoming, metadata) => {
    // Your custom resolution logic
    return resolvedState;
  }
};
```

### PlayerManager
Comprehensive player lifecycle management:

```typescript
// Add player with profile
const player = simulation.addPlayer('player_001', 'ProGamer123', {
  team: 'alpha',
  role: 'assault',
  skillLevel: 'expert',
  region: 'us-east',
  customData: { clan: 'WarriorClan', rank: 'Captain' }
});

// Update player statistics
simulation.updatePlayerStats('player_001', {
  kills: 5,
  deaths: 2,
  assists: 3,
  score: 1500,
  accuracy: 0.75
});

// Team management
simulation.createTeam('alpha', { color: '#FF0000', maxSize: 8 });
simulation.assignPlayerToTeam('player_001', 'alpha');

// Session tracking
const session = simulation.getPlayerSession('player_001');
console.log(`Session duration: ${session.duration}ms`);
console.log(`Latency: ${session.averageLatency}ms`);
```

### Unity Netcode Integration

```typescript
// Configure Unity Netcode compatibility
const unityConfig = {
  enableNetcodeCompatibility: true,
  networkObjectPrefabs: ['Player', 'Projectile', 'Pickup'],
  rpcChannels: ['reliable', 'unreliable'],
  networkBehaviours: ['PlayerMovement', 'WeaponSystem']
};

// Export Unity-compatible network data
const unityNetworkData = simulation.exportUnityNetcode();
```

## Advanced Features

### Message Prioritization
```typescript
// Critical updates (player death, game state changes)
simulation.sendUpdate(entityId, data, 'critical');

// High priority (weapon fire, important events)
simulation.sendUpdate(entityId, data, 'high');

// Normal priority (movement, regular updates)
simulation.sendUpdate(entityId, data, 'normal');

// Low priority (cosmetic effects, chat)
simulation.sendUpdate(entityId, data, 'low');
```

### Network Optimization
```typescript
const optimizationConfig = {
  // Delta compression - only send changed values
  deltaCompression: true,

  // Message batching - combine multiple updates
  enableBatching: true,
  batchSize: 50,
  batchTimeout: 16, // 60fps target

  // Data compression
  compressionLevel: 0.8,
  compressionThreshold: 100, // bytes

  // Bandwidth management
  maxBandwidth: 1000000, // 1MB/s per player
  adaptiveBandwidth: true,

  // Update culling
  enableCulling: true,
  cullDistance: 100, // units
  updateFrequency: {
    near: 60,   // 60fps for nearby objects
    medium: 30, // 30fps for medium distance
    far: 10     // 10fps for distant objects
  }
};
```

### Lag Compensation
```typescript
// Client prediction configuration
const lagCompensation = {
  enablePrediction: true,
  predictionFrames: 3,        // Predict 3 frames ahead
  rollbackFrames: 10,         // Keep 10 frames of history
  reconciliationThreshold: 2, // Reconcile if off by 2+ units
  smoothingFactor: 0.1        // Smooth reconciliation
};

// Rollback networking example
simulation.enableRollback({
  historySize: 60,            // 1 second at 60fps
  inputDelay: 2,              // 2 frame input delay
  enableInputPrediction: true
});
```

## Game Type Examples

### Competitive FPS
```typescript
const fpsConfig = {
  tickRate: 128,              // High precision for competitive play
  conflictResolution: 'host-authority',
  enablePrediction: true,
  lagCompensation: {
    hitScan: true,            // Instant hit detection
    rewind: true,             // Rewind for hit validation
    maxRewindTime: 150        // 150ms max rewind
  }
};
```

### Real-Time Strategy (RTS)
```typescript
const rtsConfig = {
  tickRate: 30,               // Lower tick rate for strategy
  conflictResolution: 'merge',
  batchUpdates: true,
  unitSync: {
    positionTolerance: 1.0,   // Allow minor position differences
    selectionSync: true,      // Sync unit selections
    commandQueue: true        // Sync command queues
  }
};
```

### Co-op Survival
```typescript
const coopConfig = {
  conflictResolution: 'vote',
  enableResourceSharing: true,
  worldPersistence: true,
  progressSync: {
    inventory: true,
    quests: true,
    discoveries: true
  }
};
```

### MMO-Style Persistent World
```typescript
const mmoConfig = {
  maxPlayers: 1000,
  zoneBasedSync: true,
  persistentState: true,
  scalingStrategy: 'horizontal',
  zones: {
    updateRadius: 50,         // Sync radius per zone
    playerCapacity: 100,      // Players per zone
    loadBalancing: true
  }
};
```

## Unity Integration

### Network Entity Synchronization
```json
{
  "networkEntities": [
    {
      "id": "player_001",
      "networkId": 12345,
      "prefabName": "NetworkPlayer",
      "ownerId": "player_001",
      "position": { "x": 10.5, "y": 0, "z": 15.2 },
      "rotation": { "x": 0, "y": 45, "z": 0 },
      "networkedProperties": {
        "health": 85,
        "ammo": 30,
        "isReloading": false
      },
      "authority": "owner",
      "lastUpdate": 1634567890123
    }
  ]
}
```

### RPC (Remote Procedure Call) Integration
```typescript
// Unity RPC compatibility
simulation.registerRPC('PlayerFire', {
  target: 'all',
  channel: 'unreliable',
  parameters: ['Vector3', 'Vector3', 'float'] // position, direction, damage
});

// Send RPC
simulation.sendRPC('PlayerFire', 'player_001', [
  { x: 10, y: 0, z: 15 },    // position
  { x: 0, y: 0, z: 1 },      // direction
  25.0                        // damage
]);
```

### Performance Monitoring
```json
{
  "networkPerformance": {
    "latency": {
      "average": 45,
      "min": 12,
      "max": 120,
      "jitter": 8
    },
    "bandwidth": {
      "incoming": 250000,     // bytes/second
      "outgoing": 180000,
      "compression": 0.65     // 65% compression ratio
    },
    "packetLoss": 0.02,       // 2% packet loss
    "fps": {
      "network": 60,
      "simulation": 60
    }
  }
}
```

## Security Features

### Anti-Cheat Integration
```typescript
const securityConfig = {
  enableAntiCheat: true,
  validationRules: {
    movement: {
      maxSpeed: 10,           // units/second
      teleportThreshold: 5,   // instant movement limit
      validationInterval: 100 // check every 100ms
    },
    combat: {
      maxDamage: 100,         // per shot
      fireRateLimit: 600,     // rounds per minute
      aimAssistDetection: true
    }
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotation: 300000     // 5 minutes
  }
};
```

## Performance Characteristics

- **Scalability**: Support for 1000+ concurrent players with zone-based optimization
- **Low Latency**: Sub-50ms synchronization for competitive gameplay
- **Bandwidth Efficient**: 90%+ compression ratio with delta updates
- **Memory Optimized**: Circular buffers for rollback history, efficient entity pooling
- **Unity Optimized**: Native integration with Unity Netcode for GameObjects

## Examples

See `examples/basic/multiplayer-simulation.ts` for complete multiplayer scenarios:
- **Deathmatch**: Fast-paced competitive gameplay with precise hit detection
- **Capture the Flag**: Team-based coordination with objective synchronization
- **Survival Co-op**: Cooperative gameplay with shared world state
- **Real-time Strategy**: Large-scale unit coordination with command synchronization

## License

MIT