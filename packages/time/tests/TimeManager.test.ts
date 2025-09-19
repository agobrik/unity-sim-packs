import { TimeManager } from '../core/TimeManager';
import { EventScheduler } from '../core/EventScheduler';
import {
  TimeManagerConfig,
  EventStatus,
  TaskStatus,
  TimeDirection,
  TimeUnit,
  EasingType
} from '../types';

describe('TimeManager', () => {
  let timeManager: TimeManager;
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
  });

  afterEach(() => {
    timeManager.stop();
  });

  describe('Basic Time Control', () => {
    test('should initialize with correct default state', () => {
      const time = timeManager.getTime();
      expect(time.current).toBe(0);
      expect(time.elapsed).toBe(0);
      expect(time.scale).toBe(1.0);
      expect(time.isPaused).toBe(false);
      expect(time.frame).toBe(0);
    });

    test('should play and advance time', (done) => {
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        const time = timeManager.getTime();
        expect(time.current).toBeGreaterThan(0);
        expect(time.elapsed).toBeGreaterThan(0);
        expect(time.frame).toBeGreaterThan(0);
        done();
      }, 100);
    });

    test('should pause time correctly', () => {
      timeManager.play();
      timeManager.pause();

      const time = timeManager.getTime();
      expect(time.isPaused).toBe(true);
    });

    test('should stop time correctly', () => {
      timeManager.play();
      timeManager.stop();

      const time = timeManager.getTime();
      expect(time.isPaused).toBe(true);
    });

    test('should set time scale within limits', () => {
      timeManager.setTimeScale(2.0);
      expect(timeManager.getTime().scale).toBe(2.0);

      expect(() => timeManager.setTimeScale(-1)).toThrow();
      expect(() => timeManager.setTimeScale(15)).toThrow();
    });

    test('should seek to specific time', () => {
      timeManager.seekTo(5000);
      const time = timeManager.getTime();
      expect(time.current).toBe(5000);
      expect(time.elapsed).toBe(5000);
    });

    test('should not allow seeking to negative time', () => {
      expect(() => timeManager.seekTo(-1000)).toThrow();
    });

    test('should reset correctly', () => {
      timeManager.play();
      timeManager.step(1000);
      timeManager.reset();

      const time = timeManager.getTime();
      expect(time.current).toBe(0);
      expect(time.elapsed).toBe(0);
      expect(time.frame).toBe(0);
    });
  });

  describe('Event Management', () => {
    test('should schedule and execute events', (done) => {
      const mockCallback = jest.fn();

      const event = {
        id: 'test-event',
        name: 'Test Event',
        scheduledTime: 100,
        callback: mockCallback,
        priority: 0,
        status: EventStatus.PENDING,
        category: 'test'
      };

      timeManager.scheduleEvent(event);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(mockCallback).toHaveBeenCalled();
        done();
      }, 200);
    });

    test('should execute events in priority order', (done) => {
      const executionOrder: string[] = [];

      const highPriorityEvent = {
        id: 'high-priority',
        name: 'High Priority',
        scheduledTime: 100,
        callback: () => executionOrder.push('high'),
        priority: 1,
        status: EventStatus.PENDING,
        category: 'test'
      };

      const lowPriorityEvent = {
        id: 'low-priority',
        name: 'Low Priority',
        scheduledTime: 100,
        callback: () => executionOrder.push('low'),
        priority: 5,
        status: EventStatus.PENDING,
        category: 'test'
      };

      timeManager.scheduleEvent(lowPriorityEvent);
      timeManager.scheduleEvent(highPriorityEvent);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(executionOrder).toEqual(['high', 'low']);
        done();
      }, 200);
    });

    test('should handle recurring events', (done) => {
      let executionCount = 0;

      const recurringEvent = {
        id: 'recurring-event',
        name: 'Recurring Event',
        scheduledTime: 50,
        callback: () => executionCount++,
        recurring: true,
        interval: 50,
        priority: 0,
        status: EventStatus.PENDING,
        category: 'test',
        remainingExecutions: 3
      };

      timeManager.scheduleEvent(recurringEvent);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(executionCount).toBeGreaterThanOrEqual(2);
        done();
      }, 200);
    });

    test('should cancel events', () => {
      const event = {
        id: 'cancelable-event',
        name: 'Cancelable Event',
        scheduledTime: 1000,
        callback: jest.fn(),
        priority: 0,
        status: EventStatus.PENDING,
        category: 'test'
      };

      timeManager.scheduleEvent(event);
      const cancelled = timeManager.cancelEvent('cancelable-event');

      expect(cancelled).toBe(true);
    });
  });

  describe('Task Management', () => {
    test('should schedule and execute tasks', (done) => {
      const mockTask = jest.fn();

      const task = {
        id: 'test-task',
        name: 'Test Task',
        callback: mockTask,
        scheduledTime: Date.now() + 100,
        executionCount: 0,
        priority: 0,
        status: TaskStatus.SCHEDULED,
        category: 'test',
        retryAttempts: 0,
        maxRetries: 0
      };

      timeManager.scheduleTask(task);
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        expect(mockTask).toHaveBeenCalled();
        done();
      }, 200);
    });

    test('should handle task timeouts', (done) => {
      const slowTask = {
        id: 'slow-task',
        name: 'Slow Task',
        callback: () => new Promise(resolve => (globalThis as any).setTimeout(resolve, 200)),
        scheduledTime: Date.now() + 50,
        executionCount: 0,
        priority: 0,
        status: TaskStatus.SCHEDULED,
        category: 'test',
        timeout: 100,
        retryAttempts: 0,
        maxRetries: 0
      };

      timeManager.on('task_failed', (data) => {
        expect(data.task.id).toBe('slow-task');
        done();
      });

      timeManager.scheduleTask(slowTask);
      timeManager.play();
    });

    test('should retry failed tasks', (done) => {
      let attemptCount = 0;

      const failingTask = {
        id: 'failing-task',
        name: 'Failing Task',
        callback: () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Task failed');
          }
        },
        scheduledTime: Date.now() + 50,
        executionCount: 0,
        priority: 0,
        status: TaskStatus.SCHEDULED,
        category: 'test',
        retryAttempts: 0,
        maxRetries: 2
      };

      timeManager.on('task_executed', () => {
        expect(attemptCount).toBe(3);
        done();
      });

      timeManager.scheduleTask(failingTask);
      timeManager.play();
    });
  });

  describe('Timeline Management', () => {
    test('should create and play timelines', () => {
      const timeline = {
        id: 'test-timeline',
        name: 'Test Timeline',
        events: new Map(),
        keyframes: [],
        duration: 1000,
        loop: false,
        autoReverse: false,
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1.0
      };

      const timelineId = timeManager.createTimeline(timeline);
      expect(timelineId).toBe('test-timeline');

      const success = timeManager.playTimeline('test-timeline');
      expect(success).toBe(true);

      const retrievedTimeline = timeManager.getTimeline('test-timeline');
      expect(retrievedTimeline?.isPlaying).toBe(true);
    });

    test('should pause and remove timelines', () => {
      const timeline = {
        id: 'pausable-timeline',
        name: 'Pausable Timeline',
        events: new Map(),
        keyframes: [],
        duration: 1000,
        loop: false,
        autoReverse: false,
        currentTime: 0,
        isPlaying: true,
        playbackRate: 1.0
      };

      timeManager.createTimeline(timeline);
      timeManager.pauseTimeline('pausable-timeline');

      const pausedTimeline = timeManager.getTimeline('pausable-timeline');
      expect(pausedTimeline?.isPlaying).toBe(false);

      const removed = timeManager.removeTimeline('pausable-timeline');
      expect(removed).toBe(true);

      const removedTimeline = timeManager.getTimeline('pausable-timeline');
      expect(removedTimeline).toBeUndefined();
    });
  });

  describe('Snapshots', () => {
    test('should create snapshots', () => {
      timeManager.seekTo(1000);
      const snapshot = timeManager.createSnapshot({ test: 'data' });

      expect(snapshot.simulationTime).toBe(1000);
      expect(snapshot.metadata.test).toBe('data');
      expect(snapshot.id).toBeDefined();
    });

    test('should restore snapshots', () => {
      timeManager.seekTo(1000);
      const snapshot = timeManager.createSnapshot();

      timeManager.seekTo(2000);
      expect(timeManager.getTime().current).toBe(2000);

      const restored = timeManager.restoreSnapshot(snapshot.id);
      expect(restored).toBe(true);
      expect(timeManager.getTime().current).toBe(1000);
    });

    test('should limit snapshot history', () => {
      const smallConfig = { ...config, maxHistorySize: 2 };
      const smallTimeManager = new TimeManager(smallConfig);

      smallTimeManager.createSnapshot({ order: 1 });
      smallTimeManager.createSnapshot({ order: 2 });
      smallTimeManager.createSnapshot({ order: 3 });

      const snapshots = smallTimeManager.getSnapshots();
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].metadata.order).toBe(2);
      expect(snapshots[1].metadata.order).toBe(3);

      smallTimeManager.stop();
    });
  });

  describe('Metrics and Performance', () => {
    test('should track performance metrics', (done) => {
      timeManager.play();

      (globalThis as any).setTimeout(() => {
        const metrics = timeManager.getMetrics();
        expect(metrics.averageFrameTime).toBeGreaterThan(0);
        expect(metrics.ticksPerSecond).toBeGreaterThan(0);
        expect(metrics.eventQueueSize).toBeGreaterThanOrEqual(0);
        done();
      }, 100);
    });

    test('should update event queue metrics', () => {
      const event = {
        id: 'metrics-event',
        name: 'Metrics Event',
        scheduledTime: 1000,
        callback: jest.fn(),
        priority: 0,
        status: EventStatus.PENDING,
        category: 'test'
      };

      timeManager.scheduleEvent(event);
      const metrics = timeManager.getMetrics();
      expect(metrics.eventQueueSize).toBe(1);
    });
  });

  describe('Event Emission', () => {
    test('should emit play events', (done) => {
      timeManager.on('play', (data) => {
        expect(data.time).toBeDefined();
        done();
      });

      timeManager.play();
    });

    test('should emit pause events', (done) => {
      timeManager.on('pause', (data) => {
        expect(data.time).toBeDefined();
        done();
      });

      timeManager.play();
      timeManager.pause();
    });

    test('should emit time scale change events', (done) => {
      timeManager.on('time_scale_changed', (data) => {
        expect(data.previousScale).toBe(1.0);
        expect(data.newScale).toBe(2.0);
        done();
      });

      timeManager.setTimeScale(2.0);
    });

    test('should emit tick events', (done) => {
      timeManager.on('tick', (data) => {
        expect(data.time).toBeGreaterThanOrEqual(0);
        expect(data.delta).toBeGreaterThanOrEqual(0);
        expect(data.frame).toBeGreaterThan(0);
        done();
      });

      timeManager.play();
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = { baseTimeScale: 2.0, tickRate: 30 };
      timeManager.setConfig(newConfig);

      const config = timeManager.getConfig();
      expect(config.baseTimeScale).toBe(2.0);
      expect(config.tickRate).toBe(30);
    });

    test('should get current configuration', () => {
      const config = timeManager.getConfig();
      expect(config).toEqual(expect.objectContaining({
        baseTimeScale: 1.0,
        maxTimeScale: 10.0,
        tickRate: 60
      }));
    });
  });
});