// Advanced Example Mod - Entry Point
// Demonstrates complex modding features including dependencies, assets, storage, and API integration

const DataProcessor = require('./DataProcessor');
const FeatureManager = require('./FeatureManager');
const APIClient = require('./APIClient');

module.exports = {
  // Internal components
  dataProcessor: null,
  featureManager: null,
  apiClient: null,

  // State management
  state: {
    initialized: false,
    features: new Map(),
    cache: new Map(),
    connections: new Set()
  },

  // Scheduled tasks
  scheduledTasks: new Map(),

  // Initialize the advanced mod
  initialize: async function(context) {
    const { logger, config, api, storage, scheduler, events } = context;

    try {
      logger.info('Advanced Example Mod starting initialization...');

      // Validate configuration
      if (!this.validateConfiguration(config, logger)) {
        throw new Error('Invalid configuration detected');
      }

      // Check if mod is enabled
      const enabled = config.get('enabled', true);
      if (!enabled) {
        logger.info('Advanced mod is disabled in configuration');
        return;
      }

      // Load and validate dependencies
      await this.loadDependencies(api, logger);

      // Initialize core components
      await this.initializeComponents(context);

      // Load and process assets
      await this.loadAssets(context);

      // Restore persistent state
      await this.restoreState(storage, logger);

      // Setup event handlers
      this.setupEventHandlers(context);

      // Register hooks
      this.registerHooks(api, logger);

      // Initialize features based on configuration
      await this.initializeFeatures(context);

      // Schedule background tasks
      this.scheduleBackgroundTasks(scheduler, logger);

      // Setup API client if configured
      await this.setupAPIClient(context);

      this.state.initialized = true;
      logger.info('Advanced Example Mod initialized successfully');

      // Notify other mods
      events.emit('advanced_mod_ready', {
        version: '2.1.0',
        features: Array.from(this.state.features.keys()),
        api: this.getPublicAPI()
      });

    } catch (error) {
      logger.error('Failed to initialize Advanced Example Mod:', error);
      throw error;
    }
  },

  // Validate configuration
  validateConfiguration: function(config, logger) {
    const apiKey = config.get('apiKey', '');
    if (apiKey && !/^[a-zA-Z0-9-_]{32,}$/.test(apiKey)) {
      logger.error('Invalid API key format');
      return false;
    }

    const maxConnections = config.get('maxConnections', 10);
    if (maxConnections < 1 || maxConnections > 100) {
      logger.error('Invalid maxConnections value');
      return false;
    }

    const features = config.get('features', []);
    const validFeatures = ['analytics', 'optimization', 'debugging', 'experimental'];
    const invalidFeatures = features.filter(f => !validFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      logger.error('Invalid features:', invalidFeatures);
      return false;
    }

    return true;
  },

  // Load and validate dependencies
  loadDependencies: async function(api, logger) {
    // Check required dependency
    const basicMod = api.getModById('basic-example-mod');
    if (!basicMod) {
      throw new Error('Required dependency basic-example-mod not found');
    }

    if (basicMod.state !== 'active') {
      logger.warn('Dependency basic-example-mod is not active');
    }

    logger.info('Dependencies loaded successfully');

    // Check optional dependencies
    const utilityMod = api.getModById('utility-library-mod');
    if (utilityMod) {
      logger.info('Optional dependency utility-library-mod found');
      this.state.features.set('enhanced-utilities', true);
    }
  },

  // Initialize core components
  initializeComponents: async function(context) {
    const { logger } = context;

    this.dataProcessor = new DataProcessor(context);
    this.featureManager = new FeatureManager(context);

    await this.dataProcessor.initialize();
    await this.featureManager.initialize();

    logger.debug('Core components initialized');
  },

  // Load mod assets
  loadAssets: async function(context) {
    const { api, logger } = context;

    try {
      // Load configuration asset
      const configAsset = await api.loadAsset('assets/config.json');
      logger.debug('Loaded config asset:', Object.keys(configAsset));

      // Load data asset
      const dataAsset = await api.loadAsset('assets/data.json');
      this.dataProcessor.setReferenceData(dataAsset);

      // Try to load optional asset
      try {
        const optionalData = await api.loadAsset('assets/optional-data.json');
        logger.info('Optional data loaded successfully');
        this.state.features.set('optional-data', true);
      } catch (error) {
        logger.debug('Optional asset not available:', error.message);
      }

      // Load helper script
      const helperScript = await api.loadAsset('assets/scripts/helper.js');
      logger.debug('Helper script loaded');

    } catch (error) {
      logger.error('Failed to load assets:', error);
      throw error;
    }
  },

  // Restore persistent state
  restoreState: async function(storage, logger) {
    try {
      const savedState = await storage.get('advanced_mod_state');
      if (savedState) {
        this.state.cache = new Map(savedState.cache || []);
        logger.info(`Restored state with ${this.state.cache.size} cached items`);
      }

      const savedFeatures = await storage.get('enabled_features');
      if (savedFeatures) {
        savedFeatures.forEach(feature => {
          this.state.features.set(feature, true);
        });
        logger.info(`Restored ${savedFeatures.length} enabled features`);
      }

    } catch (error) {
      logger.warn('Failed to restore state:', error.message);
    }
  },

  // Setup event handlers
  setupEventHandlers: function(context) {
    const { events, logger, config } = context;

    // Handle configuration changes
    events.on('config_changed', (key, value) => {
      this.onConfigChanged(context, key, value);
    });

    // Handle game events
    events.on('game_state_changed', (newState, oldState) => {
      logger.info(`Game state changed: ${oldState} -> ${newState}`);
      this.featureManager.onGameStateChanged(newState, oldState);
    });

    // Handle player events
    events.on('player_action', (player, action, data) => {
      this.dataProcessor.processPlayerAction(player, action, data);
    });

    // Handle errors
    events.on('error', (error) => {
      logger.error('Advanced mod error:', error);
      this.handleError(error, context);
    });

    logger.debug('Event handlers setup complete');
  },

  // Register hooks
  registerHooks: function(api, logger) {
    // Register for game lifecycle events
    api.registerHook('game_start', this.onGameStart.bind(this));
    api.registerHook('game_tick', this.onGameTick.bind(this));
    api.registerHook('game_save', this.onGameSave.bind(this));
    api.registerHook('game_load', this.onGameLoad.bind(this));

    // Register for player events
    api.registerHook('player_spawn', this.onPlayerSpawn.bind(this));
    api.registerHook('player_action', this.onPlayerAction.bind(this));

    // Register for data processing events
    api.registerHook('data_received', this.onDataReceived.bind(this));

    logger.debug('Hooks registered successfully');
  },

  // Initialize features based on configuration
  initializeFeatures: async function(context) {
    const { config, logger } = context;

    const enabledFeatures = config.get('features', []);

    for (const feature of enabledFeatures) {
      try {
        await this.enableFeature(feature, context);
        logger.info(`Feature enabled: ${feature}`);
      } catch (error) {
        logger.error(`Failed to enable feature ${feature}:`, error);
      }
    }
  },

  // Enable a specific feature
  enableFeature: async function(feature, context) {
    const { api, logger } = context;

    switch (feature) {
      case 'analytics':
        await this.featureManager.enableAnalytics();
        break;

      case 'optimization':
        await this.featureManager.enableOptimization();
        break;

      case 'debugging':
        await this.featureManager.enableDebugging();
        break;

      case 'experimental':
        logger.warn('Enabling experimental features');
        await this.featureManager.enableExperimental();
        break;

      default:
        throw new Error(`Unknown feature: ${feature}`);
    }

    this.state.features.set(feature, true);

    // Call hook to notify other mods
    await api.callHook('advanced_feature_enabled', feature);
  },

  // Schedule background tasks
  scheduleBackgroundTasks: function(scheduler, logger) {
    // Data cleanup task
    const cleanupTaskId = scheduler.schedule({
      name: 'data_cleanup',
      handler: () => this.performDataCleanup(),
      interval: 300000, // 5 minutes
      enabled: true,
      executionCount: 0
    });
    this.scheduledTasks.set('cleanup', cleanupTaskId);

    // State persistence task
    const persistTaskId = scheduler.schedule({
      name: 'state_persistence',
      handler: () => this.persistState(),
      interval: 60000, // 1 minute
      enabled: true,
      executionCount: 0
    });
    this.scheduledTasks.set('persist', persistTaskId);

    // Health check task
    const healthTaskId = scheduler.schedule({
      name: 'health_check',
      handler: () => this.performHealthCheck(),
      interval: 120000, // 2 minutes
      enabled: true,
      executionCount: 0
    });
    this.scheduledTasks.set('health', healthTaskId);

    logger.debug('Background tasks scheduled');
  },

  // Setup API client
  setupAPIClient: async function(context) {
    const { config, logger } = context;

    const apiKey = config.get('apiKey', '');
    if (!apiKey) {
      logger.info('No API key configured, skipping API client setup');
      return;
    }

    try {
      this.apiClient = new APIClient({
        apiKey,
        maxConnections: config.get('maxConnections', 10),
        timeout: config.get('advanced.timeout', 30000),
        retries: config.get('advanced.retries', 3)
      });

      await this.apiClient.initialize();
      logger.info('API client initialized successfully');

      this.state.features.set('api-integration', true);

    } catch (error) {
      logger.error('Failed to setup API client:', error);
    }
  },

  // Hook handlers
  onGameStart: function(gameInfo) {
    console.log('Advanced mod: Game started', gameInfo);
    this.dataProcessor.reset();
    this.state.features.set('game-active', true);
  },

  onGameTick: function(deltaTime) {
    // Lightweight processing only
    if (this.state.features.get('optimization')) {
      this.dataProcessor.optimizedTick(deltaTime);
    }
  },

  onGameSave: async function(saveData) {
    console.log('Advanced mod: Game saving');

    // Add mod-specific save data
    saveData.advancedMod = {
      version: '2.1.0',
      features: Array.from(this.state.features.entries()),
      cache: Array.from(this.state.cache.entries())
    };

    return saveData;
  },

  onGameLoad: async function(saveData) {
    console.log('Advanced mod: Game loading');

    // Restore mod state from save data
    if (saveData.advancedMod) {
      const modData = saveData.advancedMod;
      this.state.features = new Map(modData.features || []);
      this.state.cache = new Map(modData.cache || []);
    }
  },

  onPlayerSpawn: function(player) {
    console.log(`Advanced mod: Player spawned - ${player.name}`);

    if (this.state.features.get('analytics')) {
      this.dataProcessor.trackPlayerSpawn(player);
    }
  },

  onPlayerAction: function(player, action, data) {
    if (this.state.features.get('analytics')) {
      this.dataProcessor.trackPlayerAction(player, action, data);
    }

    // Apply optimizations if enabled
    if (this.state.features.get('optimization')) {
      return this.featureManager.optimizePlayerAction(action, data);
    }

    return data;
  },

  onDataReceived: async function(data, context) {
    if (!this.state.initialized) {
      return data;
    }

    // Process data through our pipeline
    const processedData = await this.dataProcessor.process(data, context);

    // Call custom hook for other mods
    const hookResults = await context.api.callHook('advanced_data_processed', processedData, context);

    // Merge results if any hooks modified the data
    if (hookResults && hookResults.length > 0) {
      return hookResults[hookResults.length - 1]; // Return last result
    }

    return processedData;
  },

  // Configuration change handler
  onConfigChanged: function(context, key, value) {
    const { logger } = context;

    logger.info(`Advanced mod configuration changed: ${key} = ${value}`);

    switch (key) {
      case 'enabled':
        if (!value) {
          this.disableAllFeatures(context);
        }
        break;

      case 'features':
        this.updateFeatures(value, context);
        break;

      case 'maxConnections':
        if (this.apiClient) {
          this.apiClient.updateMaxConnections(value);
        }
        break;

      case 'advanced':
        this.updateAdvancedSettings(value, context);
        break;
    }
  },

  // Update enabled features
  updateFeatures: async function(newFeatures, context) {
    const { logger } = context;

    const currentFeatures = Array.from(this.state.features.keys());
    const toDisable = currentFeatures.filter(f => !newFeatures.includes(f));
    const toEnable = newFeatures.filter(f => !this.state.features.has(f));

    // Disable removed features
    for (const feature of toDisable) {
      try {
        await this.disableFeature(feature, context);
        logger.info(`Feature disabled: ${feature}`);
      } catch (error) {
        logger.error(`Failed to disable feature ${feature}:`, error);
      }
    }

    // Enable new features
    for (const feature of toEnable) {
      try {
        await this.enableFeature(feature, context);
        logger.info(`Feature enabled: ${feature}`);
      } catch (error) {
        logger.error(`Failed to enable feature ${feature}:`, error);
      }
    }
  },

  // Disable a specific feature
  disableFeature: async function(feature, context) {
    switch (feature) {
      case 'analytics':
        await this.featureManager.disableAnalytics();
        break;

      case 'optimization':
        await this.featureManager.disableOptimization();
        break;

      case 'debugging':
        await this.featureManager.disableDebugging();
        break;

      case 'experimental':
        await this.featureManager.disableExperimental();
        break;
    }

    this.state.features.delete(feature);
  },

  // Background task implementations
  performDataCleanup: function() {
    const cacheSize = this.state.cache.size;
    const maxCacheSize = 1000; // From config

    if (cacheSize > maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.state.cache.entries());
      const toRemove = entries.slice(0, cacheSize - maxCacheSize);

      toRemove.forEach(([key]) => {
        this.state.cache.delete(key);
      });

      console.log(`Data cleanup: Removed ${toRemove.length} cache entries`);
    }
  },

  persistState: async function() {
    try {
      const context = this.getCurrentContext();
      if (!context) return;

      const { storage } = context;

      await storage.set('advanced_mod_state', {
        cache: Array.from(this.state.cache.entries()),
        timestamp: Date.now()
      });

      await storage.set('enabled_features', Array.from(this.state.features.keys()));

    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  },

  performHealthCheck: function() {
    const issues = [];

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      issues.push('High memory usage detected');
    }

    // Check cache size
    if (this.state.cache.size > 1500) {
      issues.push('Cache size exceeding recommended limits');
    }

    // Check connections
    if (this.state.connections.size > 50) {
      issues.push('Too many active connections');
    }

    if (issues.length > 0) {
      console.warn('Advanced mod health issues:', issues);
    }
  },

  // Error handler
  handleError: function(error, context) {
    const { logger } = context;

    // Log error details
    logger.error('Advanced mod error handler:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Attempt recovery based on error type
    if (error.message.includes('network')) {
      this.handleNetworkError(error, context);
    } else if (error.message.includes('memory')) {
      this.handleMemoryError(error, context);
    }
  },

  handleNetworkError: function(error, context) {
    const { logger } = context;

    logger.warn('Network error detected, disabling API features temporarily');

    if (this.apiClient) {
      this.apiClient.pause();

      // Re-enable after delay
      setTimeout(() => {
        this.apiClient.resume();
        logger.info('API client resumed after network error');
      }, 30000);
    }
  },

  handleMemoryError: function(error, context) {
    const { logger } = context;

    logger.warn('Memory error detected, performing emergency cleanup');

    // Clear cache
    this.state.cache.clear();

    // Disable memory-intensive features
    this.disableFeature('analytics', context);
    this.disableFeature('experimental', context);
  },

  // Public API for other mods
  getPublicAPI: function() {
    return {
      version: '2.1.0',

      // Data processing
      processData: (data) => this.dataProcessor.process(data),

      // Feature management
      isFeatureEnabled: (feature) => this.state.features.has(feature),
      getEnabledFeatures: () => Array.from(this.state.features.keys()),

      // Cache access
      getCacheItem: (key) => this.state.cache.get(key),
      setCacheItem: (key, value) => this.state.cache.set(key, value),

      // Utilities
      getState: () => ({ ...this.state }),
      getStats: () => this.getStats()
    };
  },

  // Get statistics
  getStats: function() {
    return {
      cacheSize: this.state.cache.size,
      featuresEnabled: this.state.features.size,
      connectionsActive: this.state.connections.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  },

  // Helper to get current context (for background tasks)
  getCurrentContext: function() {
    // This would be set during initialization
    return this._currentContext;
  },

  // Cleanup function
  cleanup: async function() {
    console.log('Advanced Example Mod cleaning up...');

    try {
      // Cancel scheduled tasks
      this.scheduledTasks.forEach((taskId, name) => {
        // scheduler.cancel(taskId); // Would need scheduler reference
        console.log(`Cancelled task: ${name}`);
      });
      this.scheduledTasks.clear();

      // Persist final state
      await this.persistState();

      // Cleanup components
      if (this.dataProcessor) {
        await this.dataProcessor.cleanup();
      }

      if (this.featureManager) {
        await this.featureManager.cleanup();
      }

      if (this.apiClient) {
        await this.apiClient.cleanup();
      }

      // Close connections
      this.state.connections.forEach(connection => {
        try {
          connection.close();
        } catch (error) {
          console.warn('Error closing connection:', error);
        }
      });
      this.state.connections.clear();

      // Clear state
      this.state.cache.clear();
      this.state.features.clear();
      this.state.initialized = false;

      console.log('Advanced Example Mod cleanup completed');

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
};