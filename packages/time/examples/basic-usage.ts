/**
 * Basic Time Manager Usage Example
 * Demonstrates core time control and event scheduling functionality
 */

import { TimeManager, EventScheduler, TimeHelpers } from '../src';
import { TimeManagerConfig, EventStatus, TimeUnit, EasingType } from '../src/types';

async function basicUsageExample() {
  (globalThis as any).console?.log('🕒 Basic Time Manager Usage Example\n');

  // Configure time manager
  const config: TimeManagerConfig = {
    baseTimeScale: 1.0,
    maxTimeScale: 10.0,
    tickRate: 60,
    enablePause: true,
    enableRewind: true,
    maxHistorySize: 50,
    eventQueueSize: 500
  };

  const timeManager = new TimeManager(config);

  // Set up event listeners
  timeManager.on('play', () => (globalThis as any).console?.log('▶️ Simulation started'));
  timeManager.on('pause', () => (globalThis as any).console?.log('⏸️ Simulation paused'));
  timeManager.on('stop', () => (globalThis as any).console?.log('⏹️ Simulation stopped'));

  timeManager.on('tick', (data) => {
    if (data.frame % 60 === 0) { // Every second
      (globalThis as any).console?.log(`⏱️ Frame ${data.frame}: ${TimeHelpers.formatDuration(data.time)} elapsed`);
    }
  });

  // Schedule some events
  const welcomeEvent = {
    id: 'welcome',
    name: 'Welcome Message',
    scheduledTime: 1000, // 1 second
    callback: () => (globalThis as any).console?.log('👋 Welcome to the simulation!'),
    priority: 0,
    status: EventStatus.PENDING,
    category: 'ui'
  };

  const progressEvent = {
    id: 'progress',
    name: 'Progress Update',
    scheduledTime: 3000, // 3 seconds
    callback: () => (globalThis as any).console?.log('📊 Simulation progress: 50%'),
    priority: 0,
    status: EventStatus.PENDING,
    category: 'status'
  };

  timeManager.scheduleEvent(welcomeEvent);
  timeManager.scheduleEvent(progressEvent);

  (globalThis as any).console?.log('Starting simulation...');
  timeManager.play();

  // Demonstrate time control after 2 seconds
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🏃‍♂️ Speeding up time to 2x');
    timeManager.setTimeScale(2.0);
  }, 2000);

  // Pause after 4 seconds
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n⏸️ Pausing simulation');
    timeManager.pause();

    // Show metrics
    const metrics = timeManager.getMetrics();
    (globalThis as any).console?.log(`📈 Metrics:`, {
      averageFrameTime: metrics.averageFrameTime.toFixed(2) + 'ms',
      ticksPerSecond: metrics.ticksPerSecond.toFixed(1),
      eventsProcessed: metrics.eventsProcessed
    });
  }, 4000);

  // Resume and seek after 6 seconds
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n▶️ Resuming and seeking to 8 seconds');
    timeManager.seekTo(8000);
    timeManager.play();
  }, 6000);

  // Stop after 8 seconds
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🛑 Stopping simulation');
    timeManager.stop();
    (globalThis as any).console?.log('✅ Basic usage example completed!\n');
  }, 8000);
}

async function eventSchedulingExample() {
  (globalThis as any).console?.log('📅 Event Scheduling Example\n');

  const scheduler = new EventScheduler();

  // Set up event listeners
  scheduler.on('event_scheduled', (event) => {
    (globalThis as any).console?.log(`📋 Scheduled: ${event.name} in ${TimeHelpers.formatDuration(event.scheduledTime - Date.now())}`);
  });

  scheduler.on('event_executed', (data) => {
    (globalThis as any).console?.log(`✅ Executed: ${data.event.name}`);
  });

  // Schedule various types of events
  (globalThis as any).console?.log('Scheduling different types of events...');

  // Delayed event
  scheduler.scheduleDelayedEvent(
    'startup-check',
    () => (globalThis as any).console?.log('🚀 System startup check completed'),
    1000
  );

  // Periodic event
  scheduler.schedulePeriodicEvent(
    'heartbeat',
    () => (globalThis as any).console?.log('💓 Heartbeat'),
    500, // every 500ms
    6    // 6 times
  );

  // Daily event (in this example, we'll use a short interval for demo)
  const now = new Date();
  scheduler.scheduleDailyEvent(
    'daily-maintenance',
    () => (globalThis as any).console?.log('🔧 Daily maintenance executed'),
    now.getHours(),
    now.getMinutes() + 1 // 1 minute from now
  );

  (globalThis as any).console?.log('\n📊 Event statistics:');
  (globalThis as any).setTimeout(() => {
    const stats = scheduler.getStatistics();
    (globalThis as any).console?.log(stats);
  }, 2000);

  // Clean up after 4 seconds
  (globalThis as any).setTimeout(() => {
    scheduler.clearAll();
    (globalThis as any).console?.log('✅ Event scheduling example completed!\n');
  }, 4000);
}

async function timeUtilitiesExample() {
  (globalThis as any).console?.log('🔧 Time Utilities Example\n');

  // Time conversion examples
  (globalThis as any).console?.log('⏱️ Time Conversions:');
  (globalThis as any).console?.log(`5 minutes = ${TimeHelpers.convertTimeUnit(5, TimeUnit.MINUTE, TimeUnit.SECOND)} seconds`);
  (globalThis as any).console?.log(`2 hours = ${TimeHelpers.convertTimeUnit(2, TimeUnit.HOUR, TimeUnit.MILLISECOND)} milliseconds`);
  (globalThis as any).console?.log(`1 week = ${TimeHelpers.convertTimeUnit(1, TimeUnit.WEEK, TimeUnit.DAY)} days`);

  // Duration formatting
  (globalThis as any).console?.log('\n📝 Duration Formatting:');
  const durations = [1500, 65000, 3665000, 90061000];
  durations.forEach(duration => {
    (globalThis as any).console?.log(`${duration}ms = ${TimeHelpers.formatDuration(duration)}`);
  });

  // Time string parsing
  (globalThis as any).console?.log('\n🔤 Time String Parsing:');
  const timeStrings = ['30s', '5m 30s', '1h 15m 30s', '2d 3h 45m'];
  timeStrings.forEach(str => {
    try {
      const ms = TimeHelpers.parseTimeString(str);
      (globalThis as any).console?.log(`"${str}" = ${ms}ms (${TimeHelpers.formatDuration(ms)})`);
    } catch (error) {
      (globalThis as any).console?.log(`"${str}" = Invalid format`);
    }
  });

  // Easing functions
  (globalThis as any).console?.log('\n📈 Easing Functions:');
  const easingTypes = [EasingType.LINEAR, EasingType.EASE_IN, EasingType.EASE_OUT, EasingType.EASE_IN_OUT];
  easingTypes.forEach(type => {
    const easingFn = TimeHelpers.createEasingFunction(type);
    const values = [0, 0.25, 0.5, 0.75, 1].map(t => easingFn(t).toFixed(3));
    (globalThis as any).console?.log(`${type}: [${values.join(', ')}]`);
  });

  // Interpolation
  (globalThis as any).console?.log('\n🎯 Interpolation:');
  const easeInOut = TimeHelpers.createEasingFunction(EasingType.EASE_IN_OUT);
  for (let progress = 0; progress <= 1; progress += 0.25) {
    const linear = TimeHelpers.interpolate(0, 100, progress);
    const eased = TimeHelpers.interpolate(0, 100, progress, easeInOut);
    (globalThis as any).console?.log(`Progress ${progress}: Linear=${linear}, Eased=${eased.toFixed(1)}`);
  }

  // Time ranges
  (globalThis as any).console?.log('\n📏 Time Ranges:');
  const range1 = TimeHelpers.createTimeRange(1000, 5000);
  const range2 = TimeHelpers.createTimeRange(3000, 7000);
  const range3 = TimeHelpers.createTimeRange(8000, 10000);

  (globalThis as any).console?.log(`Range 1: ${TimeHelpers.formatDuration(range1.start)} - ${TimeHelpers.formatDuration(range1.end)}`);
  (globalThis as any).console?.log(`Range 2: ${TimeHelpers.formatDuration(range2.start)} - ${TimeHelpers.formatDuration(range2.end)}`);

  const overlap = TimeHelpers.getOverlap(range1, range2);
  if (overlap) {
    (globalThis as any).console?.log(`Overlap: ${TimeHelpers.formatDuration(overlap.start)} - ${TimeHelpers.formatDuration(overlap.end)}`);
  }

  const ranges = [range1, range2, range3];
  const merged = TimeHelpers.mergeTimeRanges(ranges);
  (globalThis as any).console?.log(`Merged ranges: ${merged.length} ranges after merging`);

  (globalThis as any).console?.log('✅ Time utilities example completed!\n');
}

// Run all examples
async function runExamples() {
  (globalThis as any).console?.log('🎬 Time Package Examples\n');
  (globalThis as any).console?.log('==========================================\n');

  await basicUsageExample();
  await new Promise(resolve => (globalThis as any).setTimeout(resolve, 1000));

  await eventSchedulingExample();
  await new Promise(resolve => (globalThis as any).setTimeout(resolve, 1000));

  await timeUtilitiesExample();

  (globalThis as any).console?.log('🎉 All examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch((globalThis as any).console?.error);
}

export { runExamples };