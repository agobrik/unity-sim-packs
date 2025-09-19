import { TimeManager } from '../core/TimeManager';
import { EventScheduler } from '../core/EventScheduler';
import { TimeHelpers } from '../utils/TimeHelpers';
import {
  TimeManagerConfig,
  EventStatus,
  TaskStatus,
  TimeUnit,
  EasingType,
  RecurrenceType
} from '../types';

describe('Time Package Integration Tests', () => {
  let timeManager: TimeManager;
  let eventScheduler: EventScheduler;
  let config: TimeManagerConfig;

  beforeEach(() => {
    config = {
      baseTimeScale: 1.0,
      maxTimeScale: 10.0,
      tickRate: 60,
      enablePause: true,
      enableRewind: true,
      maxHistorySize: 100,
      eventQueueSize: 1000
    };
    timeManager = new TimeManager(config);
    eventScheduler = new EventScheduler();
  });

  afterEach(() => {
    timeManager.stop();
  });

  describe('TimeManager + EventScheduler Integration', () => {
    test('should coordinate events between TimeManager and EventScheduler', (done) => {
      const executionOrder: string[] = [];

      // Schedule events through EventScheduler
      const schedulerEventId = eventScheduler.scheduleEvent(
        'scheduler-event',
        () => executionOrder.push('scheduler'),
        100
      );

      // Schedule events through TimeManager
      const managerEvent = {
        id: 'manager-event',
        name: 'Manager Event',
        scheduledTime: 150,
        callback: () => executionOrder.push('manager'),
        priority: 0,
        status: EventStatus.PENDING,
        category: 'test'
      };

      timeManager.scheduleEvent(managerEvent);

      // Start TimeManager
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(executionOrder).toContain('manager');
        // EventScheduler events need manual execution in this test
        const schedulerEvent = eventScheduler.getEvent(schedulerEventId);
        expect(schedulerEvent).toBeDefined();
        done();
      }, 250);
    });

    test('should handle complex scheduling scenarios', (done) => {
      const results: string[] = [];

      // Daily recurring event
      eventScheduler.scheduleDailyEvent(
        'daily-maintenance',
        () => results.push('daily'),
        2, 0, { task: 'cleanup' }
      );

      // Periodic event with count limit
      eventScheduler.schedulePeriodicEvent(
        'heartbeat',
        () => results.push('heartbeat'),
        50, 3, { system: 'monitor' }
      );

      // TimeManager task with retry logic
      const retryTask = {
        id: 'retry-task',
        name: 'Retry Task',
        callback: () => {
          results.push('retry-attempt');
          if (results.filter(r => r === 'retry-attempt').length < 2) {
            throw new Error('Simulated failure');
          }
        },
        scheduledTime: Date.now() + 75,
        executionCount: 0,
        priority: 0,
        status: TaskStatus.SCHEDULED,
        category: 'resilient',
        retryAttempts: 0,
        maxRetries: 2
      };

      timeManager.scheduleTask(retryTask);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(results.filter(r => r === 'retry-attempt').length).toBe(2);
        done();
      }, 300);
    });
  });

  describe('TimeHelpers Integration', () => {
    test('should use TimeHelpers for complex time calculations', () => {
      // Create a timeline with eased keyframes
      const easeInOut = TimeHelpers.createEasingFunction(EasingType.EASE_IN_OUT);

      const timeline = {
        id: 'eased-timeline',
        name: 'Eased Timeline',
        events: new Map(),
        keyframes: [
          {
            id: 'keyframe-1',
            time: 0,
            properties: { opacity: 0 },
            easing: easeInOut,
            duration: 1000,
            metadata: {}
          },
          {
            id: 'keyframe-2',
            time: 1000,
            properties: { opacity: 1 },
            easing: easeInOut,
            duration: 1000,
            metadata: {}
          }
        ],
        duration: 2000,
        loop: false,
        autoReverse: false,
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.0
      };

      timeManager.createTimeline(timeline);
      timeManager.playTimeline('eased-timeline');

      // Test time conversion utilities
      const durationInSeconds = TimeHelpers.convertTimeUnit(
        timeline.duration,
        TimeUnit.MILLISECOND,
        TimeUnit.SECOND
      );
      expect(durationInSeconds).toBe(2);

      // Test time range operations
      const timelineRange = TimeHelpers.createTimeRange(0, timeline.duration);
      expect(TimeHelpers.isValidTimeRange(timelineRange)).toBe(true);
    });

    test('should parse and format time strings for events', () => {
      // Parse different time formats
      const delays = [
        TimeHelpers.parseTimeString('5s'),
        TimeHelpers.parseTimeString('2m 30s'),
        TimeHelpers.parseTimeString('1h 15m')
      ];

      expect(delays[0]).toBe(5000);
      expect(delays[1]).toBe(150000);
      expect(delays[2]).toBe(4500000);

      // Schedule events with parsed delays
      delays.forEach((delay, index) => {
        const event = {
          id: `parsed-event-${index}`,
          name: `Parsed Event ${index}`,
          scheduledTime: delay,
          callback: jest.fn(),
          priority: 0,
          status: EventStatus.PENDING,
          category: 'parsed'
        };
        timeManager.scheduleEvent(event);
      });

      const events = timeManager.getScheduledEvents();
      expect(events.length).toBe(3);
    });

    test('should create time transitions for smooth animations', () => {
      const transition = TimeHelpers.createTimeTransition(
        0, 100, 1000, EasingType.EASE_IN_OUT
      );

      // Simulate animation updates
      const animationSteps = [];
      for (let elapsed = 0; elapsed <= 1000; elapsed += 100) {
        const result = TimeHelpers.updateTimeTransition(transition, elapsed);
        animationSteps.push({
          elapsed,
          value: result.value,
          completed: result.completed
        });
      }

      expect(animationSteps[0].value).toBe(0);
      expect(animationSteps[animationSteps.length - 1].value).toBe(100);
      expect(animationSteps[animationSteps.length - 1].completed).toBe(true);

      // Verify easing curve (should be smooth)
      const midPoint = animationSteps[5]; // 500ms elapsed
      expect(midPoint.value).toBe(50); // Ease-in-out should be 50% at midpoint
    });

    test('should manage multiple clocks with different time zones', () => {
      const clocks = [
        TimeHelpers.createClock('utc-clock', 'UTC Clock', 'UTC'),
        TimeHelpers.createClock('ny-clock', 'New York Clock', 'America/New_York'),
        TimeHelpers.createClock('tokyo-clock', 'Tokyo Clock', 'Asia/Tokyo')
      ];

      // Start all clocks
      clocks.forEach(clock => {
        clock.isRunning = true;
        clock.timeScale = 1.0;
      });

      // Simulate time passage
      const delta = 1000; // 1 second
      const realTime = Date.now();

      clocks.forEach(clock => {
        TimeHelpers.updateClock(clock, delta, realTime);
      });

      // All clocks should advance by the same delta
      clocks.forEach(clock => {
        expect(clock.time).toBeGreaterThan(clock.startTime);
      });

      // Test timezone offset calculation
      const utcOffset = TimeHelpers.getTimeZoneOffset('UTC');
      const nyOffset = TimeHelpers.getTimeZoneOffset('America/New_York');
      expect(utcOffset).toBe(0);
      expect(typeof nyOffset).toBe('number');
    });
  });

  describe('Performance and Scalability Tests', () => {
    test('should handle large numbers of events efficiently', (done) => {
      const eventCount = 1000;
      const executedEvents: string[] = [];

      // Schedule many events
      for (let i = 0; i < eventCount; i++) {
        const event = {
          id: `bulk-event-${i}`,
          name: `Bulk Event ${i}`,
          scheduledTime: i * 2, // Spread over 2 seconds
          callback: () => executedEvents.push(`event-${i}`),
          priority: Math.floor(Math.random() * 10),
          status: EventStatus.PENDING,
          category: 'bulk'
        };
        timeManager.scheduleEvent(event);
      }

      timeManager.play();

      (globalThis as any).setTimeout(() => {
        const metrics = timeManager.getMetrics();
        expect(metrics.eventsProcessed).toBeGreaterThan(0);
        expect(metrics.averageFrameTime).toBeLessThan(50); // Should maintain good performance
        expect(executedEvents.length).toBeGreaterThan(eventCount * 0.8); // Most events should execute
        done();
      }, 2500);
    });

    test('should manage memory efficiently with snapshots', () => {
      // Create many snapshots to test memory management
      for (let i = 0; i < 150; i++) {
        timeManager.createSnapshot({ iteration: i });
      }

      const snapshots = timeManager.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(config.maxHistorySize);

      // Verify latest snapshots are kept
      const latestSnapshot = snapshots[snapshots.length - 1];
      expect(latestSnapshot.metadata.iteration).toBeGreaterThan(100);
    });

    test('should handle rapid time scale changes', (done) => {
      const scaleChanges: number[] = [];

      timeManager.on('time_scale_changed', (data) => {
        scaleChanges.push(data.newScale);
      });

      timeManager.play();

      // Rapidly change time scale
      const scales = [0.5, 2.0, 1.5, 3.0, 1.0];
      scales.forEach((scale, index) => {
        (globalThis as any).setTimeout(() => {
          timeManager.setTimeScale(scale);
        }, index * 20);
      });

      (globalThis as any).setTimeout(() => {
        expect(scaleChanges).toEqual(scales);
        expect(timeManager.getTime().scale).toBe(1.0);
        done();
      }, 200);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle event callback errors gracefully', (done) => {
      const errorEvents: any[] = [];
      const successEvents: any[] = [];

      timeManager.on('event_failed', (data) => errorEvents.push(data));
      timeManager.on('event_executed', (data) => successEvents.push(data));

      // Schedule failing event
      const failingEvent = {
        id: 'failing-event',
        name: 'Failing Event',
        scheduledTime: 50,
        callback: () => {
          throw new Error('Simulated error');
        },
        priority: 0,
        status: EventStatus.PENDING,
        category: 'error-test'
      };

      // Schedule successful event
      const successEvent = {
        id: 'success-event',
        name: 'Success Event',
        scheduledTime: 100,
        callback: () => { /* Success */ },
        priority: 0,
        status: EventStatus.PENDING,
        category: 'error-test'
      };

      timeManager.scheduleEvent(failingEvent);
      timeManager.scheduleEvent(successEvent);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(errorEvents.length).toBe(1);
        expect(successEvents.length).toBe(1);
        expect(errorEvents[0].event.id).toBe('failing-event');
        expect(successEvents[0].event.id).toBe('success-event');
        done();
      }, 200);
    });

    test('should recover from invalid time operations', () => {
      // Test invalid time scale
      expect(() => timeManager.setTimeScale(-1)).toThrow();
      expect(() => timeManager.setTimeScale(20)).toThrow();

      // Test invalid seek
      expect(() => timeManager.seekTo(-1000)).toThrow();

      // TimeManager should still be functional
      expect(timeManager.getTime().scale).toBe(1.0);
      timeManager.setTimeScale(2.0);
      expect(timeManager.getTime().scale).toBe(2.0);
    });

    test('should handle timeline edge cases', () => {
      // Create timeline with zero duration
      const zeroTimeline = {
        id: 'zero-timeline',
        name: 'Zero Timeline',
        events: new Map(),
        keyframes: [],
        duration: 0,
        loop: false,
        autoReverse: false,
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.0
      };

      timeManager.createTimeline(zeroTimeline);
      expect(timeManager.playTimeline('zero-timeline')).toBe(true);

      // Create timeline with negative playback rate
      const reverseTimeline = {
        id: 'reverse-timeline',
        name: 'Reverse Timeline',
        events: new Map(),
        keyframes: [],
        duration: 1000,
        loop: false,
        autoReverse: false,
        currentTime: 1000,
        isPlaying: false,
        playbackRate: -1.0
      };

      timeManager.createTimeline(reverseTimeline);
      expect(timeManager.playTimeline('reverse-timeline')).toBe(true);
    });
  });

  describe('Real-world Simulation Scenarios', () => {
    test('should simulate game tick system', (done) => {
      const tickEvents: number[] = [];
      let gameState = { score: 0, level: 1 };

      // Game loop event
      timeManager.on('tick', (data) => {
        tickEvents.push(data.frame);

        // Simulate game logic
        if (data.frame % 60 === 0) { // Every second at 60 FPS
          gameState.score += 10;
        }

        if (gameState.score >= 100) {
          gameState.level++;
          gameState.score = 0;
        }
      });

      // Power-up event
      const powerUpEvent = {
        id: 'power-up',
        name: 'Power Up',
        scheduledTime: 500,
        callback: () => {
          gameState.score += 50;
        },
        priority: 0,
        status: EventStatus.PENDING,
        category: 'game'
      };

      timeManager.scheduleEvent(powerUpEvent);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(tickEvents.length).toBeGreaterThan(10);
        expect(gameState.level).toBeGreaterThan(1);
        done();
      }, 1000);
    });

    test('should simulate real-time data processing pipeline', (done) => {
      const pipeline = {
        inputQueue: [] as any[],
        processing: [] as any[],
        completed: [] as any[]
      };

      // Data ingestion (every 100ms)
      const ingestionTask = {
        id: 'data-ingestion',
        name: 'Data Ingestion',
        callback: () => {
          pipeline.inputQueue.push({
            id: Date.now(),
            data: Math.random(),
            timestamp: Date.now()
          });
        },
        scheduledTime: Date.now() + 100,
        interval: 100,
        executionCount: 0,
        priority: 1,
        status: TaskStatus.SCHEDULED,
        category: 'pipeline',
        retryAttempts: 0,
        maxRetries: 0
      };

      // Data processing (every 200ms)
      const processingTask = {
        id: 'data-processing',
        name: 'Data Processing',
        callback: () => {
          if (pipeline.inputQueue.length > 0) {
            const item = pipeline.inputQueue.shift();
            pipeline.processing.push(item);

            // Simulate processing time
            (globalThis as any).setTimeout(() => {
              const processed = pipeline.processing.shift();
              if (processed) {
                pipeline.completed.push({
                  ...processed,
                  processedAt: Date.now()
                });
              }
            }, 50);
          }
        },
        scheduledTime: Date.now() + 200,
        interval: 200,
        executionCount: 0,
        priority: 2,
        status: TaskStatus.SCHEDULED,
        category: 'pipeline',
        retryAttempts: 0,
        maxRetries: 0
      };

      timeManager.scheduleTask(ingestionTask);
      timeManager.scheduleTask(processingTask);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(pipeline.inputQueue.length).toBeGreaterThan(0);
        expect(pipeline.completed.length).toBeGreaterThan(0);

        // Verify processing order
        const firstCompleted = pipeline.completed[0];
        expect(firstCompleted.processedAt).toBeGreaterThan(firstCompleted.timestamp);
        done();
      }, 1500);
    });
  });
});