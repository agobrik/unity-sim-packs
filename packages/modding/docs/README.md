# Modding Framework

A comprehensive modding framework for the Steam Simulation Toolkit that provides hot reloading, dependency management, sandboxed execution, and advanced mod lifecycle management.

## Features

- **Hot Reloading**: Automatically reload mods when files change
- **Dependency Management**: Resolve mod dependencies with cycle detection
- **Sandboxed Execution**: Secure mod execution with permission control
- **Registry System**: Efficient mod indexing and searching
- **Asset Management**: Preload and manage mod assets
- **Health Monitoring**: Track mod performance and health
- **Profile Management**: Create and manage mod collections
- **Import/Export**: Backup and restore mod configurations

## Quick Start

```typescript
import { ModManager } from '@steam-sim/modding';

// Create mod manager with configuration
const modManager = new ModManager({
  modsDirectory: './mods',
  enableHotReload: true,
  sandboxMods: true,
  allowNativeModules: false,
  maxMemoryPerMod: 100 * 1024 * 1024,
  loadTimeout: 30000,
  enableMetrics: true,
  hotReload: {
    enabled: true,
    watchPaths: ['./mods'],
    ignored: ['node_modules', '*.tmp'],
    debounceMs: 1000,
    reloadDependents: true,
    backupOnReload: true
  },
  permissions: {
    requireExplicitGrant: true,
    autoGrantSafe: false,
    denyDangerous: true,
    promptUser: false
  },
  logging: {
    level: 'info',
    enableFileLogging: true,
    logDirectory: './logs',
    maxLogFiles: 10,
    maxLogSize: 10 * 1024 * 1024
  }
});

// Initialize and discover mods
await modManager.initialize();
const discoveredMods = await modManager.discoverMods();

// Load a mod
const mod = await modManager.loadMod('./mods/my-awesome-mod');

// Enable/disable mods
await modManager.enableMod('my-awesome-mod');
await modManager.disableMod('my-awesome-mod');

// Create and activate a profile
const profile = await modManager.createProfile('gaming', 'Gaming Profile', [
  'graphics-enhancement',
  'gameplay-tweaks'
]);
await modManager.activateProfile('gaming');
```

## Creating a Mod

### 1. Mod Structure

```
my-mod/
├── mod.json           # Mod metadata
├── index.js           # Entry point
├── assets/            # Mod assets
│   ├── config.json
│   └── textures/
└── README.md          # Documentation
```

### 2. Mod Metadata (mod.json)

```json
{
  "id": "my-awesome-mod",
  "name": "My Awesome Mod",
  "version": "1.0.0",
  "description": "An amazing mod that enhances gameplay",
  "author": "Your Name",
  "homepage": "https://github.com/yourname/my-awesome-mod",
  "license": "MIT",
  "tags": ["gameplay", "enhancement"],
  "category": "gameplay",
  "compatibility": {
    "gameVersion": "^1.0.0",
    "frameworkVersion": "^1.0.0"
  },
  "dependencies": [
    {
      "id": "core-library",
      "version": "^2.0.0",
      "optional": false
    }
  ],
  "entryPoint": "index.js",
  "assets": [
    {
      "path": "assets/config.json",
      "type": "config",
      "preload": true
    }
  ],
  "permissions": [
    {
      "type": "file_read",
      "scope": "assets",
      "description": "Read mod assets",
      "required": true
    }
  ]
}
```

### 3. Entry Point (index.js)

```javascript
module.exports = {
  // Called when mod is loaded
  initialize: async function(context) {
    const { logger, config, api, events } = context;

    logger.info('My Awesome Mod initializing...');

    // Register event handlers
    api.registerHook('game_tick', this.onGameTick.bind(this));

    // Load configuration
    const enableFeature = config.get('enableFeature', true);

    logger.info('My Awesome Mod initialized successfully');
  },

  // Called when mod is unloaded
  cleanup: async function() {
    console.log('My Awesome Mod cleaning up...');
    // Perform cleanup tasks
  },

  // Custom event handler
  onGameTick: function(deltaTime) {
    // Handle game tick events
  }
};
```

## API Reference

### ModManager

The main entry point for the modding framework.

#### Methods

- `initialize(): Promise<void>` - Initialize the mod manager
- `discoverMods(): Promise<string[]>` - Discover mods in the configured directory
- `loadMod(path: string): Promise<ModInstance>` - Load a mod from the given path
- `unloadMod(modId: string): Promise<boolean>` - Unload a loaded mod
- `reloadMod(modId: string): Promise<boolean>` - Reload a mod
- `enableMod(modId: string): Promise<void>` - Enable a disabled mod
- `disableMod(modId: string): Promise<void>` - Disable an active mod
- `getLoadedMods(): ModInstance[]` - Get all loaded mods
- `isModLoaded(modId: string): boolean` - Check if a mod is loaded

#### Profile Management

- `createProfile(id: string, name: string, mods: string[]): Promise<ModProfile>` - Create a new profile
- `deleteProfile(profileId: string): Promise<boolean>` - Delete a profile
- `activateProfile(profileId: string): Promise<boolean>` - Activate a profile
- `getProfiles(): ModProfile[]` - Get all profiles
- `getActiveProfile(): ModProfile | null` - Get the currently active profile

#### Monitoring

- `getModMetrics(modId: string): ModMetrics | undefined` - Get mod performance metrics
- `performHealthCheck(modId: string): Promise<ModHealthCheck>` - Perform health check on a mod
- `getSystemMetrics(): SystemMetrics` - Get overall system metrics

### ModContext

The context object provided to mods during initialization.

#### Properties

- `id: string` - Mod ID
- `version: string` - Mod version
- `api: ModAPI` - API for interacting with the framework
- `logger: ModLogger` - Logger instance for the mod
- `config: ModConfig` - Configuration manager
- `events: ModEventEmitter` - Event emitter for mod events
- `storage: ModStorage` - Persistent storage for the mod
- `scheduler: ModScheduler` - Task scheduler
- `permissions: PermissionManager` - Permission manager

### ModAPI

#### Hook Management

- `registerHook(name: string, handler: Function): void` - Register a hook handler
- `unregisterHook(name: string, handler: Function): void` - Unregister a hook handler
- `callHook(name: string, ...args: any[]): Promise<any[]>` - Call a hook

#### Mod Interaction

- `getModById(id: string): ModInstance | undefined` - Get a loaded mod by ID
- `getAllMods(): ModInstance[]` - Get all loaded mods
- `getDependencies(modId: string): ModInstance[]` - Get mod dependencies
- `getDependents(modId: string): ModInstance[]` - Get mods that depend on this mod

#### Asset Management

- `loadAsset(path: string): Promise<any>` - Load an asset
- `unloadAsset(path: string): void` - Unload an asset

### ModLogger

- `debug(message: string, ...args: any[]): void` - Log debug message
- `info(message: string, ...args: any[]): void` - Log info message
- `warn(message: string, ...args: any[]): void` - Log warning message
- `error(message: string, ...args: any[]): void` - Log error message

### ModConfig

- `get<T>(key: string, defaultValue?: T): T` - Get configuration value
- `set(key: string, value: any): void` - Set configuration value
- `has(key: string): boolean` - Check if key exists
- `delete(key: string): void` - Delete configuration key
- `getAll(): Record<string, any>` - Get all configuration
- `reset(): void` - Reset configuration to defaults

## Permission System

The framework includes a comprehensive permission system to ensure mod security.

### Permission Types

- `file_read` - Read files from disk
- `file_write` - Write files to disk
- `network_access` - Access network resources
- `system_info` - Access system information
- `native_module` - Load native modules
- `process_spawn` - Spawn external processes
- `environment_access` - Access environment variables
- `registry_read` - Read from mod registry
- `registry_write` - Write to mod registry
- `hook_register` - Register hooks
- `hook_override` - Override existing hooks
- `mod_control` - Control other mods
- `config_modify` - Modify configuration
- `asset_load` - Load assets
- `scheduler_access` - Access task scheduler

### Requesting Permissions

```javascript
// In mod metadata
{
  "permissions": [
    {
      "type": "file_read",
      "scope": "assets",
      "description": "Read mod assets",
      "required": true
    },
    {
      "type": "network_access",
      "scope": "api.example.com",
      "description": "Access external API",
      "required": false
    }
  ]
}

// In mod code
const hasPermission = await context.api.requestPermission({
  type: 'file_write',
  scope: 'saves',
  description: 'Save game data'
});
```

## Hot Reloading

The framework supports hot reloading of mods during development.

### Configuration

```typescript
const config = {
  hotReload: {
    enabled: true,
    watchPaths: ['./mods'],
    ignored: ['node_modules', '*.tmp', '*.log'],
    debounceMs: 1000,
    reloadDependents: true,
    backupOnReload: true
  }
};
```

### Events

```typescript
modManager.on('mod_reloaded', (modId, oldMod, newMod) => {
  console.log(`Mod ${modId} was reloaded`);
});

modManager.on('hot_reload_error', (modId, error) => {
  console.error(`Failed to hot reload ${modId}:`, error);
});
```

## Examples

### Basic Mod

```javascript
// index.js
module.exports = {
  initialize: async function(context) {
    context.logger.info('Basic mod loaded');

    // Register a simple hook
    context.api.registerHook('player_spawn', (player) => {
      context.logger.info(`Player ${player.name} spawned`);
    });
  },

  cleanup: async function() {
    console.log('Basic mod unloaded');
  }
};
```

### Advanced Mod with Configuration

```javascript
// index.js
module.exports = {
  initialize: async function(context) {
    const { logger, config, api, storage } = context;

    // Load configuration with defaults
    const settings = {
      multiplier: config.get('multiplier', 2.0),
      enabled: config.get('enabled', true),
      debug: config.get('debug', false)
    };

    if (!settings.enabled) {
      logger.info('Mod is disabled in configuration');
      return;
    }

    // Load persistent data
    const savedData = await storage.get('playerStats') || {};

    // Register hooks
    api.registerHook('damage_dealt', this.onDamageDealt.bind(this, settings));
    api.registerHook('player_levelup', this.onPlayerLevelUp.bind(this, savedData));

    logger.info('Advanced mod initialized', { settings });
  },

  onDamageDealt: function(settings, damage, source, target) {
    if (settings.debug) {
      console.log(`Damage dealt: ${damage} -> ${damage * settings.multiplier}`);
    }
    return damage * settings.multiplier;
  },

  onPlayerLevelUp: async function(savedData, player) {
    savedData[player.id] = savedData[player.id] || 0;
    savedData[player.id]++;

    await context.storage.set('playerStats', savedData);

    context.logger.info(`Player ${player.name} leveled up (${savedData[player.id]} times)`);
  },

  cleanup: async function() {
    console.log('Advanced mod cleaning up');
  }
};
```

### Mod with Dependencies

```json
// mod.json
{
  "id": "dependent-mod",
  "name": "Dependent Mod",
  "version": "1.0.0",
  "dependencies": [
    {
      "id": "utility-library",
      "version": "^1.2.0",
      "optional": false
    },
    {
      "id": "graphics-enhancement",
      "version": "~2.1.0",
      "optional": true
    }
  ]
}
```

```javascript
// index.js
module.exports = {
  initialize: async function(context) {
    const { api, logger } = context;

    // Get required dependency
    const utilityLib = api.getModById('utility-library');
    if (!utilityLib) {
      throw new Error('Required dependency utility-library not found');
    }

    // Get optional dependency
    const graphicsMod = api.getModById('graphics-enhancement');
    const hasGraphicsEnhancement = !!graphicsMod;

    logger.info('Dependent mod initialized', {
      hasGraphicsEnhancement
    });

    // Use utility library
    utilityLib.module.exports.someUtilityFunction();
  }
};
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully in your mods:

```javascript
module.exports = {
  initialize: async function(context) {
    try {
      // Mod initialization code
      await this.setupMod(context);
    } catch (error) {
      context.logger.error('Failed to initialize mod:', error);
      throw error; // Re-throw to prevent mod loading
    }
  }
};
```

### 2. Resource Cleanup

Always clean up resources in the cleanup function:

```javascript
module.exports = {
  timers: [],
  eventHandlers: [],

  initialize: async function(context) {
    // Setup timers and handlers
    const timer = setInterval(() => {}, 1000);
    this.timers.push(timer);
  },

  cleanup: async function() {
    // Clean up timers
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];

    // Clean up event handlers
    this.eventHandlers.forEach(handler => handler.remove());
    this.eventHandlers = [];
  }
};
```

### 3. Configuration Validation

Validate configuration values:

```javascript
module.exports = {
  initialize: async function(context) {
    const { config } = context;

    const multiplier = config.get('multiplier', 1.0);
    if (typeof multiplier !== 'number' || multiplier <= 0) {
      throw new Error('Invalid multiplier configuration');
    }

    const mode = config.get('mode', 'normal');
    if (!['normal', 'hard', 'expert'].includes(mode)) {
      throw new Error('Invalid mode configuration');
    }
  }
};
```

### 4. Version Compatibility

Check for compatibility with other mods:

```javascript
module.exports = {
  initialize: async function(context) {
    const { api } = context;

    // Check for conflicting mods
    const conflictingMod = api.getModById('conflicting-mod');
    if (conflictingMod) {
      throw new Error('This mod conflicts with conflicting-mod');
    }

    // Check for required API version
    const coreAPI = api.getModById('core-api');
    if (!coreAPI || !this.isVersionCompatible(coreAPI.metadata.version, '^2.0.0')) {
      throw new Error('Requires core-api version ^2.0.0');
    }
  },

  isVersionCompatible: function(version, requirement) {
    // Version compatibility check logic
    return true; // Simplified for example
  }
};
```

## Troubleshooting

### Common Issues

#### Mod Not Loading

1. Check mod metadata syntax in `mod.json`
2. Verify entry point file exists and is valid JavaScript
3. Check console for error messages
4. Ensure all dependencies are installed

#### Permission Denied

1. Check if mod requests required permissions
2. Verify permission scope is correct
3. Check if dangerous permissions are being denied by configuration

#### Hot Reload Not Working

1. Verify hot reload is enabled in configuration
2. Check if file is in watched paths
3. Ensure file is not in ignored patterns
4. Check for file system permission issues

### Debug Mode

Enable debug logging for detailed information:

```typescript
const modManager = new ModManager({
  logging: {
    level: 'debug',
    enableFileLogging: true
  }
});
```

### Health Checks

Use health checks to monitor mod performance:

```typescript
const healthCheck = await modManager.performHealthCheck('my-mod');
console.log('Health status:', healthCheck.status);
console.log('Issues:', healthCheck.issues);
```

## Contributing

See the main project README for contribution guidelines.

## License

MIT License - see LICENSE file for details.