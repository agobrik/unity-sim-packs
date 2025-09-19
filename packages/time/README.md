# @steam-sim/time

A sophisticated time control and scheduling system for simulations, providing precise time management, event scheduling, and performance monitoring capabilities.

## Features

- **Advanced Time Control**: Play, pause, stop, seek, and scale time with frame-perfect precision
- **Event Scheduling**: Schedule one-time and recurring events with priority support
- **Task Management**: Async task execution with retry logic and timeout handling
- **Timeline Animation**: Keyframe-based animation system with easing functions
- **Performance Monitoring**: Real-time metrics tracking and optimization
- **Snapshot System**: Save and restore simulation states
- **Multiple Time Zones**: Clock management across different time zones
- **Utility Functions**: Comprehensive time conversion and formatting tools

## Installation

```bash
npm install @steam-sim/time
```

## Quick Start

### Basic Time Management

```typescript
import { TimeManager } from '@steam-sim/time';

const config = {
  baseTimeScale: 1.0,
  maxTimeScale: 10.0,
  tickRate: 60,
  enablePause: true,
  enableRewind: true,
  maxHistorySize: 100,
  eventQueueSize: 1000
};

const timeManager = new TimeManager(config);

// Start simulation
timeManager.play();

// Control time
timeManager.setTimeScale(2.0); // 2x speed
timeManager.pause();
timeManager.seekTo(5000); // Jump to 5 seconds

// Monitor time
timeManager.on('tick', (data) => {
  console.log(`Frame ${data.frame}: ${data.time}ms`);
});
```

### Event Scheduling

```typescript
import { EventScheduler } from '@steam-sim/time';

const scheduler = new EventScheduler();

// Schedule a delayed event
const eventId = scheduler.scheduleEvent(
  'gameUpdate',
  (event, currentTime) => console.log('Game updated!'),
  1000, // 1 second delay
  { level: 1 },
  'game',
  5 // priority
);

// Schedule recurring events
scheduler.schedulePeriodicEvent(
  'heartbeat',
  () => console.log('♥'),
  100, // every 100ms
  10   // 10 times
);

// Schedule daily events
scheduler.scheduleDailyEvent(
  'dailyReset',
  () => console.log('Daily reset!'),
  0, 0 // midnight
);
```

### Timeline Animation

```typescript
import { TimeHelpers, EasingType } from '@steam-sim/time';

// Create easing function
const easeInOut = TimeHelpers.createEasingFunction(EasingType.EASE_IN_OUT);

// Create animation timeline
const timeline = {
  id: 'fadeIn',
  name: 'Fade In Animation',
  events: new Map(),
  keyframes: [
    {
      id: 'start',
      time: 0,
      properties: { opacity: 0 },
      easing: easeInOut,
      duration: 1000,
      metadata: {}
    },
    {
      id: 'end',
      time: 1000,
      properties: { opacity: 1 },
      easing: easeInOut,
      duration: 0,
      metadata: {}
    }
  ],
  duration: 1000,
  loop: false,
  autoReverse: false,
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1.0
};

timeManager.createTimeline(timeline);
timeManager.playTimeline('fadeIn');
```

### Time Utilities

```typescript
import { TimeHelpers, TimeUnit } from '@steam-sim/time';

// Time conversion
const milliseconds = TimeHelpers.convertTimeUnit(5, TimeUnit.SECOND, TimeUnit.MILLISECOND);
console.log(milliseconds); // 5000

// Duration formatting
const formatted = TimeHelpers.formatDuration(125000);
console.log(formatted); // "2m 5.00s"

// Time string parsing
const duration = TimeHelpers.parseTimeString('1h 30m 45s');
console.log(duration); // 5445000 milliseconds

// Time ranges
const range = TimeHelpers.createTimeRange(1000, 5000);
const isInRange = TimeHelpers.isTimeInRange(3000, range);
console.log(isInRange); // true
```

## Core Classes

### TimeManager

The main time control system that manages simulation time, events, and performance.

```typescript
const timeManager = new TimeManager(config);

// Time control
timeManager.play();
timeManager.pause();
timeManager.stop();
timeManager.setTimeScale(2.0);
timeManager.seekTo(1000);
timeManager.step(16.67); // Manual step

// Event management
timeManager.scheduleEvent(event);
timeManager.cancelEvent(eventId);

// Timeline management
timeManager.createTimeline(timeline);
timeManager.playTimeline(timelineId);

// Snapshots
const snapshot = timeManager.createSnapshot();
timeManager.restoreSnapshot(snapshot.id);

// Metrics
const metrics = timeManager.getMetrics();
console.log(`FPS: ${metrics.ticksPerSecond}`);
```

### EventScheduler

Flexible event scheduling system with support for complex recurrence patterns.

```typescript
const scheduler = new EventScheduler();

// Basic scheduling
scheduler.scheduleEvent(name, callback, delay);
scheduler.scheduleTask(name, asyncCallback, delay, options);

// Convenience methods
scheduler.scheduleDelayedEvent(name, callback, delay);
scheduler.schedulePeriodicEvent(name, callback, interval, count);
scheduler.scheduleDailyEvent(name, callback, hour, minute);
scheduler.scheduleWeeklyEvent(name, callback, weekday, hour, minute);
scheduler.scheduleMonthlyEvent(name, callback, day, hour, minute);

// Management
scheduler.cancelEvent(eventId);
scheduler.cancelEventsByCategory(category);
scheduler.rescheduleEvent(eventId, newTime);

// Queries
const upcoming = scheduler.getUpcomingEvents(timeWindow);
const stats = scheduler.getStatistics();
```

### TimeHelpers

Static utility class with time conversion, formatting, and calculation functions.

```typescript
// Conversion
TimeHelpers.convertTimeUnit(value, from, to);
TimeHelpers.toMilliseconds(value, unit);
TimeHelpers.fromMilliseconds(milliseconds, unit);

// Formatting
TimeHelpers.formatDuration(milliseconds, precision);
TimeHelpers.formatTime(timestamp, format);

// Parsing
TimeHelpers.parseTimeString(timeString);

// Easing
const easingFn = TimeHelpers.createEasingFunction(EasingType.EASE_IN_OUT);
const interpolated = TimeHelpers.interpolate(from, to, progress, easingFn);

// Ranges
const range = TimeHelpers.createTimeRange(start, end);
const overlap = TimeHelpers.getOverlap(range1, range2);
const merged = TimeHelpers.mergeTimeRanges(ranges);

// Clocks
const clock = TimeHelpers.createClock(id, name, timezone);
TimeHelpers.updateClock(clock, delta, realTime);

// Transitions
const transition = TimeHelpers.createTimeTransition(from, to, duration, easing);
const result = TimeHelpers.updateTimeTransition(transition, elapsed);
```

## Configuration

### TimeManagerConfig

```typescript
interface TimeManagerConfig {
  baseTimeScale: number;     // Default time scale (1.0 = real-time)
  maxTimeScale: number;      // Maximum allowed time scale
  tickRate: number;          // Target FPS for simulation
  enablePause: boolean;      // Allow pausing simulation
  enableRewind: boolean;     // Allow seeking backwards
  maxHistorySize: number;    // Maximum snapshots to keep
  eventQueueSize: number;    // Maximum events in queue
}
```

## Events

The TimeManager emits the following events:

- `play` - Simulation started
- `pause` - Simulation paused
- `stop` - Simulation stopped
- `tick` - Each simulation frame
- `time_scale_changed` - Time scale modified
- `time_seek` - Time position changed
- `event_scheduled` - Event added to queue
- `event_executed` - Event completed successfully
- `event_failed` - Event execution failed
- `event_cancelled` - Event was cancelled
- `task_scheduled` - Task added to queue
- `task_executed` - Task completed successfully
- `task_failed` - Task execution failed
- `task_retry` - Task is being retried
- `timeline_created` - Timeline added
- `timeline_started` - Timeline playback started
- `timeline_paused` - Timeline playback paused
- `timeline_completed` - Timeline finished
- `keyframe_update` - Keyframe animation update
- `snapshot_created` - Snapshot saved
- `snapshot_restored` - Snapshot loaded

## Advanced Features

### Custom Easing Functions

```typescript
// Create custom easing function
const customEasing = (t: number) => {
  return t * t * (3 - 2 * t); // Smoothstep
};

const transition = {
  from: 0,
  to: 100,
  duration: 1000,
  easing: customEasing
};
```

### Task Retry Logic

```typescript
const resilientTask = {
  id: 'api-call',
  name: 'API Call',
  callback: async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API failed');
    return response.json();
  },
  scheduledTime: Date.now() + 1000,
  timeout: 5000,
  maxRetries: 3,
  retryAttempts: 0
};

scheduler.scheduleTask(resilientTask.name, resilientTask.callback, 1000, {
  timeout: resilientTask.timeout,
  maxRetries: resilientTask.maxRetries
});
```

### Performance Monitoring

```typescript
timeManager.on('tick', () => {
  const metrics = timeManager.getMetrics();

  if (metrics.averageFrameTime > 16.67) {
    console.warn('Performance degradation detected');
  }

  if (metrics.eventQueueSize > 1000) {
    console.warn('Event queue getting large');
  }
});
```

## Best Practices

1. **Performance**: Use time scaling instead of modifying delta time directly
2. **Memory**: Regularly clean up expired events and limit snapshot history
3. **Error Handling**: Always handle event callback errors gracefully
4. **Precision**: Use integer milliseconds for time values to avoid floating point errors
5. **Testing**: Mock time in tests using `jest.useFakeTimers()`

## License

MIT