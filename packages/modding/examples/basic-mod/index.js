// Basic Example Mod - Entry Point
// This demonstrates the fundamental structure of a mod

module.exports = {
  // Internal state
  updateTimer: null,
  isActive: false,

  // Called when the mod is loaded and initialized
  initialize: async function(context) {
    const { logger, config, api, events } = context;

    logger.info('Basic Example Mod starting initialization...');

    // Check if mod is enabled in configuration
    const enabled = config.get('enabled', true);
    if (!enabled) {
      logger.info('Mod is disabled in configuration');
      return;
    }

    // Get configuration values
    const message = config.get('message', 'Hello from Basic Example Mod!');
    const interval = config.get('interval', 5);

    logger.info('Configuration loaded:', { message, interval });

    // Display welcome message
    logger.info(message);

    // Register event handlers
    this.registerEventHandlers(context);

    // Register hooks for game events
    api.registerHook('game_start', this.onGameStart.bind(this));
    api.registerHook('game_tick', this.onGameTick.bind(this));
    api.registerHook('game_end', this.onGameEnd.bind(this));

    // Start periodic updates
    this.startPeriodicUpdates(context, interval);

    // Listen for configuration changes
    events.on('config_changed', this.onConfigChanged.bind(this, context));

    this.isActive = true;
    logger.info('Basic Example Mod initialized successfully');
  },

  // Register event handlers
  registerEventHandlers: function(context) {
    const { events, logger } = context;

    events.on('player_joined', (player) => {
      logger.info(`Player joined: ${player.name} (ID: ${player.id})`);
    });

    events.on('player_left', (player) => {
      logger.info(`Player left: ${player.name} (ID: ${player.id})`);
    });

    events.on('error', (error) => {
      logger.error('Mod error occurred:', error);
    });
  },

  // Start periodic updates
  startPeriodicUpdates: function(context, interval) {
    const { logger } = context;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.periodicUpdate(context);
    }, interval * 1000);

    logger.debug(`Started periodic updates every ${interval} seconds`);
  },

  // Periodic update function
  periodicUpdate: function(context) {
    const { logger } = context;

    if (!this.isActive) {
      return;
    }

    // Perform periodic tasks
    const timestamp = new Date().toISOString();
    logger.debug(`Periodic update at ${timestamp}`);

    // Example: Log current memory usage
    const memoryUsage = process.memoryUsage();
    logger.debug('Memory usage:', {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
    });
  },

  // Hook: Called when game starts
  onGameStart: function(gameInfo) {
    console.log('Game started:', gameInfo);
    this.isActive = true;
  },

  // Hook: Called every game tick
  onGameTick: function(deltaTime) {
    // Handle game tick - keep this lightweight
    if (this.isActive && Math.random() < 0.001) { // 0.1% chance per tick
      console.log(`Random event occurred! Delta: ${deltaTime}ms`);
    }
  },

  // Hook: Called when game ends
  onGameEnd: function(gameResults) {
    console.log('Game ended:', gameResults);
    this.isActive = false;
  },

  // Handle configuration changes
  onConfigChanged: function(context, key, value) {
    const { logger, config } = context;

    logger.info(`Configuration changed: ${key} = ${value}`);

    // React to specific configuration changes
    switch (key) {
      case 'enabled':
        this.isActive = value;
        if (value) {
          logger.info('Mod enabled via configuration');
        } else {
          logger.info('Mod disabled via configuration');
        }
        break;

      case 'message':
        logger.info('Welcome message updated:', value);
        break;

      case 'interval':
        logger.info('Update interval changed:', value);
        this.startPeriodicUpdates(context, value);
        break;
    }
  },

  // Called when the mod is being unloaded
  cleanup: async function() {
    console.log('Basic Example Mod cleaning up...');

    // Stop periodic updates
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Mark as inactive
    this.isActive = false;

    // Perform any additional cleanup
    console.log('Basic Example Mod cleanup completed');
  },

  // Utility function to demonstrate mod functionality
  demonstrateFeature: function(featureName) {
    console.log(`Demonstrating feature: ${featureName}`);
    return `Feature ${featureName} demonstrated successfully`;
  }
};