# @steam-sim/analytics

[![npm version](https://badge.fury.io/js/%40steam-sim%2Fanalytics.svg)](https://www.npmjs.com/package/@steam-sim/analytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Analytics package provides comprehensive data analytics and insights capabilities for game development and simulations. It includes event tracking, session analysis, real-time dashboards, A/B testing, and automated insights generation specifically designed to work with Unity, Unreal Engine, and Godot.

## Features

- **Event Tracking**: Comprehensive event collection with automatic metadata enrichment
- **Session Analysis**: User session tracking with engagement metrics and behavior analysis
- **Real-time Dashboards**: Customizable dashboards with widgets and visualizations
- **Insights Engine**: Automated trend detection, anomaly identification, and recommendations
- **A/B Testing**: Built-in experimentation framework with statistical analysis
- **Funnel Analysis**: Conversion funnel tracking and optimization insights
- **Cohort Analysis**: User retention and lifetime value analysis
- **Data Pipelines**: ETL capabilities for external data integration
- **Alerting System**: Real-time monitoring with customizable alerts
- **Reporting**: Automated report generation and scheduling

## Installation

```bash
npm install @steam-sim/analytics
```

## Basic Usage

### Setting Up Analytics

```typescript
import { AnalyticsEngine, EventType, EventCategory } from '@steam-sim/analytics';

// Initialize analytics engine
const analytics = new AnalyticsEngine({
  source: 'game',
  version: '1.0.0',
  environment: 'production',
  userId: 'player_123',
  startTime: Date.now(),
  destinations: [
    {
      type: 'console',
      config: {}
    },
    {
      type: 'http',
      config: {
        url: 'https://api.analytics.com/events',
        headers: {
          'Authorization': 'Bearer your-api-key'
        }
      }
    }
  ]
});

// Track events
analytics.trackPageView('main_menu', {
  loadTime: 1250,
  source: 'launcher'
});

analytics.trackUserAction('button_click', 'play_button', {
  gameMode: 'campaign',
  difficulty: 'normal'
});

analytics.trackConversion('level_complete', 100, 'XP', {
  level: 5,
  time: 180000,
  deaths: 2
});
```

### Event Tracking

```typescript
// Track custom events
const eventId = analytics.track(
  EventType.USER_ACTION,
  EventCategory.ENGAGEMENT,
  {
    action: 'weapon_purchase',
    item: 'laser_rifle',
    cost: 1500,
    currency: 'credits'
  },
  {
    source: 'shop',
    platform: 'desktop'
  }
);

// Track performance metrics
analytics.trackPerformance('frame_rate', 58.5, 'fps', {
  scene: 'battle_arena',
  playerCount: 12,
  effectsQuality: 'high'
});

// Track errors
try {
  // Game logic that might fail
  loadLevel(5);
} catch (error) {
  analytics.trackError(error, 'level_loading', {
    level: 5,
    memoryUsage: getMemoryUsage(),
    platform: 'windows'
  });
}
```

### Dashboard Creation

```typescript
import { DashboardManager, WidgetType, ChartType } from '@steam-sim/analytics';

const dashboardManager = new DashboardManager(analytics);

// Create a game performance dashboard
const dashboard = dashboardManager.createDashboard({
  name: 'Game Performance',
  description: 'Real-time game performance metrics',
  widgets: [
    {
      id: 'fps_chart',
      type: WidgetType.LINE_CHART,
      title: 'Frame Rate Over Time',
      position: { x: 0, y: 0 },
      size: { width: 6, height: 4 },
      config: {
        metrics: ['frame_rate'],
        timeRange: {
          start: Date.now() - 3600000, // Last hour
          end: Date.now(),
          granularity: 'minute'
        },
        visualization: {
          chartType: ChartType.LINE,
          colors: ['#00ff00'],
          axes: [
            { type: 'x', label: 'Time', scale: 'time' },
            { type: 'y', label: 'FPS', scale: 'linear', min: 0, max: 120 }
          ]
        },
        realtime: true
      }
    },
    {
      id: 'player_count',
      type: WidgetType.METRIC,
      title: 'Active Players',
      position: { x: 6, y: 0 },
      size: { width: 3, height: 2 },
      config: {
        metrics: ['active_players'],
        timeRange: {
          start: Date.now() - 300000, // Last 5 minutes
          end: Date.now(),
          granularity: 'minute'
        },
        visualization: {
          chartType: ChartType.METRIC,
          colors: ['#0088ff']
        }
      }
    }
  ],
  refreshInterval: 30000 // 30 seconds
});
```

### Insights and Analysis

```typescript
import { InsightEngine, InsightType } from '@steam-sim/analytics';

const insightEngine = new InsightEngine(analytics);

// Generate insights
const insights = await insightEngine.generateInsights({
  timeRange: {
    start: Date.now() - 7 * 24 * 3600000, // Last week
    end: Date.now(),
    granularity: 'day'
  },
  types: [InsightType.TREND, InsightType.ANOMALY, InsightType.CORRELATION],
  metrics: ['player_retention', 'session_duration', 'conversion_rate']
});

// Process insights
insights.forEach(insight => {
  console.log(`${insight.priority}: ${insight.title}`);
  console.log(`Description: ${insight.description}`);
  console.log(`Recommendations: ${insight.recommendations.join(', ')}`);
  console.log(`Confidence: ${insight.confidence}%`);
});

// Set up real-time insight monitoring
insightEngine.on('insight_generated', (insight) => {
  if (insight.priority === 'high' || insight.priority === 'critical') {
    // Send alert to game developers
    sendDeveloperAlert(insight);
  }
});
```

### A/B Testing

```typescript
import { ABTestManager, TestStatus } from '@steam-sim/analytics';

const abTestManager = new ABTestManager(analytics);

// Create an A/B test
const test = await abTestManager.createTest({
  name: 'Tutorial Difficulty',
  description: 'Test different tutorial difficulty levels',
  hypothesis: 'Easier tutorial will increase player retention',
  targetMetric: 'day_1_retention',
  variants: [
    {
      id: 'control',
      name: 'Normal Difficulty',
      description: 'Current tutorial difficulty',
      allocation: 50,
      changes: [
        {
          type: 'feature',
          target: 'tutorial_difficulty',
          value: 'normal',
          description: 'Keep current tutorial difficulty'
        }
      ]
    },
    {
      id: 'easy',
      name: 'Easy Difficulty',
      description: 'Simplified tutorial',
      allocation: 50,
      changes: [
        {
          type: 'feature',
          target: 'tutorial_difficulty',
          value: 'easy',
          description: 'Reduce tutorial difficulty'
        }
      ]
    }
  ],
  trafficSplit: [50, 50],
  minimumSampleSize: 1000,
  confidenceLevel: 95
});

// Assign players to test variants
function assignPlayerToTest(playerId: string) {
  const assignment = abTestManager.assignToVariant(test.id, playerId);

  // Track the assignment
  analytics.track(EventType.SYSTEM_EVENT, EventCategory.TECHNICAL, {
    event: 'ab_test_assignment',
    testId: test.id,
    variant: assignment.variantId,
    playerId: playerId
  });

  return assignment;
}

// Track test results
function trackTestConversion(playerId: string, retained: boolean) {
  analytics.track(EventType.CONVERSION, EventCategory.RETENTION, {
    event: 'day_1_retention',
    playerId: playerId,
    retained: retained,
    testId: test.id
  });
}
```

### Session Analysis

```typescript
// Get current session information
const currentSession = analytics.getCurrentSession();
if (currentSession) {
  console.log(`Session ID: ${currentSession.id}`);
  console.log(`Duration: ${Date.now() - currentSession.startTime}ms`);
  console.log(`Events: ${currentSession.events.length}`);
  console.log(`Metrics:`, currentSession.metrics);
}

// Analyze player sessions
const sessions = analytics.getSessions({
  userId: 'player_123',
  startTime: Date.now() - 24 * 3600000, // Last 24 hours
  minDuration: 60000 // At least 1 minute
});

// Calculate engagement metrics
const avgSessionDuration = sessions.reduce((sum, session) => {
  return sum + (session.duration || 0);
}, 0) / sessions.length;

const avgEventsPerSession = sessions.reduce((sum, session) => {
  return sum + session.events.length;
}, 0) / sessions.length;

console.log(`Average session duration: ${avgSessionDuration}ms`);
console.log(`Average events per session: ${avgEventsPerSession}`);
```

### Real-time Monitoring

```typescript
// Set up event monitoring
analytics.on('event', (event) => {
  console.log(`New event: ${event.type} - ${event.category}`);

  // Check for important events
  if (event.type === EventType.ERROR) {
    console.error('Game error occurred:', event.data);
  }

  if (event.type === EventType.CONVERSION) {
    console.log('Conversion event:', event.data);
  }
});

// Monitor session events
analytics.on('session_started', (session) => {
  console.log(`New session started: ${session.id}`);
});

analytics.on('session_ended', (session) => {
  console.log(`Session ended: ${session.id}, Duration: ${session.duration}ms`);

  // Analyze session quality
  if (session.duration && session.duration < 30000) {
    console.warn('Short session detected - possible usability issue');
  }
});

// Monitor batch processing
analytics.on('batch_ready', (events) => {
  console.log(`Batch of ${events.length} events ready for processing`);
});
```

## Game Engine Integration

This package is designed to work seamlessly with popular game engines:

### Unity Integration
See [examples/unity/README.md](examples/unity/README.md) for detailed Unity integration guide.

- Integration with Unity Analytics and custom event systems
- Performance monitoring with Unity Profiler integration
- Player behavior tracking across scenes
- A/B testing with Unity Remote Config integration

### Godot Integration
See [examples/godot/README.md](examples/godot/README.md) for detailed Godot integration guide.

- Built-in event tracking with Godot's signal system
- Performance metrics collection using Godot's profiling tools
- Player progression analytics across game scenes
- Custom dashboard integration with Godot's UI system

### Unreal Engine Integration
See [examples/unreal/README.md](examples/unreal/README.md) for detailed Unreal integration guide.

- Integration with Unreal Engine's analytics framework
- Blueprint-based event tracking system
- Performance monitoring with Unreal's stat system
- Real-time dashboard rendering in-game

## API Reference

### AnalyticsEngine

Main analytics engine for event tracking and session management.

#### Methods

- `track(type, category, data, metadata?)`: Track a custom event
- `trackPageView(page, data?)`: Track page/scene views
- `trackUserAction(action, target, data?)`: Track user interactions
- `trackConversion(type, value?, currency?, data?)`: Track conversion events
- `trackError(error, context, data?)`: Track error events
- `trackPerformance(metric, value, unit, data?)`: Track performance metrics
- `getCurrentSession()`: Get current session information
- `getEvents(filters?)`: Retrieve tracked events
- `getSessions(filters?)`: Retrieve session data

### DashboardManager

Dashboard creation and management system.

#### Methods

- `createDashboard(config)`: Create a new dashboard
- `updateDashboard(id, config)`: Update existing dashboard
- `getDashboard(id)`: Retrieve dashboard configuration
- `deleteDashboard(id)`: Remove dashboard
- `listDashboards()`: Get all dashboards

### InsightEngine

Automated insights and recommendations engine.

#### Methods

- `generateInsights(config)`: Generate insights from data
- `scheduleInsightGeneration(config)`: Set up automated insights
- `getInsights(filters?)`: Retrieve generated insights
- `subscribeToInsights(callback)`: Real-time insight notifications

### ABTestManager

A/B testing and experimentation framework.

#### Methods

- `createTest(config)`: Create new A/B test
- `assignToVariant(testId, userId)`: Assign user to test variant
- `trackTestEvent(testId, userId, event)`: Track test-related events
- `getTestResults(testId)`: Get test performance results
- `analyzeTest(testId)`: Generate test analysis and recommendations

## Configuration Options

### Analytics Engine Configuration

```typescript
interface AnalyticsConfig {
  source?: string;           // Data source identifier
  version?: string;          // Application version
  environment?: string;      // Environment (dev/staging/prod)
  userId?: string;          // Current user ID
  destinations?: Destination[]; // Where to send data
  sessionTimeout?: number;   // Session timeout in ms
  batchSize?: number;       // Events per batch
  flushInterval?: number;   // Batch flush interval
}
```

### Event Destinations

Configure where analytics data is sent:

```typescript
// Console logging (development)
{
  type: 'console',
  config: {}
}

// HTTP endpoint
{
  type: 'http',
  config: {
    url: 'https://api.analytics.com/events',
    headers: { 'Authorization': 'Bearer token' },
    batchSize: 50,
    retryConfig: { maxRetries: 3, backoff: 'exponential' }
  }
}

// Local storage
{
  type: 'storage',
  config: {
    type: 'localStorage', // or 'indexedDB'
    key: 'analytics_events',
    maxSize: 1000
  }
}
```

## Best Practices

### Event Tracking

1. **Consistent Naming**: Use consistent event and property naming conventions
2. **Meaningful Categories**: Group related events using appropriate categories
3. **Metadata Enrichment**: Let the system automatically add metadata when possible
4. **Performance Impact**: Consider the performance impact of high-frequency events

### Data Privacy

1. **User Consent**: Ensure proper user consent for data collection
2. **Data Anonymization**: Remove or hash personally identifiable information
3. **Data Retention**: Implement appropriate data retention policies
4. **GDPR Compliance**: Follow applicable privacy regulations

### Performance Optimization

1. **Batching**: Use event batching to reduce network overhead
2. **Sampling**: Consider sampling for high-volume events
3. **Caching**: Implement caching for dashboard queries
4. **Background Processing**: Process analytics in background threads

## Contributing

Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting pull requests.

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Support

- Documentation: [Steam Simulation Toolkit Docs](https://docs.steam-sim.com)
- Issues: [GitHub Issues](https://github.com/steam-sim/toolkit/issues)
- Community: [Discord Server](https://discord.gg/steam-sim)