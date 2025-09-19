import { EventScheduler } from '../core/EventScheduler';
import {
  RecurrenceType,
  EventStatus,
  TaskStatus,
  RecurrencePattern
} from '../types';

describe('EventScheduler', () => {
  let scheduler: EventScheduler;

  beforeEach(() => {
    scheduler = new EventScheduler();
  });

  describe('Basic Event Scheduling', () => {
    test('should schedule simple delayed event', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleEvent('test', callback, 1000, { data: 'test' });

      expect(eventId).toBeDefined();
      expect(eventId.startsWith('event_')).toBe(true);

      const event = scheduler.getEvent(eventId);
      expect(event).toBeDefined();
      expect(event?.name).toBe('test');
      expect(event?.data.data).toBe('test');
    });

    test('should schedule delayed event with convenience method', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleDelayedEvent('delayed', callback, 500, { test: true });

      const event = scheduler.getEvent(eventId);
      expect(event?.category).toBe('delayed');
      expect(event?.data.test).toBe(true);
    });

    test('should schedule periodic events', () => {
      const callback = jest.fn();
      const eventId = scheduler.schedulePeriodicEvent('periodic', callback, 100, 5, { count: 0 });

      const event = scheduler.getEvent(eventId);
      expect(event?.recurring).toBe(true);
      expect(event?.interval).toBe(100);
      expect(event?.remainingExecutions).toBe(5);
      expect(event?.category).toBe('periodic');
    });

    test('should schedule daily events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleDailyEvent('daily', callback, 14, 30, { daily: true });

      const event = scheduler.getEvent(eventId);
      expect(event?.recurring).toBe(true);
      expect(event?.category).toBe('daily');
      expect(event?.interval).toBe(24 * 60 * 60 * 1000);
    });

    test('should schedule weekly events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleWeeklyEvent('weekly', callback, 1, 10, 0, { weekly: true });

      const event = scheduler.getEvent(eventId);
      expect(event?.recurring).toBe(true);
      expect(event?.category).toBe('weekly');
      expect(event?.interval).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test('should schedule monthly events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleMonthlyEvent('monthly', callback, 15, 9, 0, { monthly: true });

      const event = scheduler.getEvent(eventId);
      expect(event?.recurring).toBe(true);
      expect(event?.category).toBe('monthly');
    });
  });

  describe('Recurring Event Patterns', () => {
    test('should handle daily recurrence pattern', () => {
      const callback = jest.fn();
      const pattern: RecurrencePattern = {
        type: RecurrenceType.DAILY,
        interval: 24 * 60 * 60 * 1000,
        count: 3
      };

      const eventId = scheduler.scheduleRecurringEvent('daily-pattern', callback, pattern);
      const event = scheduler.getEvent(eventId);

      expect(event?.recurring).toBe(true);
      expect(event?.remainingExecutions).toBe(3);
      expect(event?.interval).toBe(24 * 60 * 60 * 1000);
    });

    test('should handle weekly recurrence pattern', () => {
      const callback = jest.fn();
      const pattern: RecurrencePattern = {
        type: RecurrenceType.WEEKLY,
        interval: 7 * 24 * 60 * 60 * 1000,
        weekdays: [1, 3, 5]
      };

      const eventId = scheduler.scheduleRecurringEvent('weekly-pattern', callback, pattern);
      const event = scheduler.getEvent(eventId);

      expect(event?.recurring).toBe(true);
      expect(event?.interval).toBe(7 * 24 * 60 * 60 * 1000);
    });

    test('should handle monthly recurrence pattern', () => {
      const callback = jest.fn();
      const pattern: RecurrencePattern = {
        type: RecurrenceType.MONTHLY,
        interval: 30 * 24 * 60 * 60 * 1000,
        monthDay: 15
      };

      const eventId = scheduler.scheduleRecurringEvent('monthly-pattern', callback, pattern);
      const event = scheduler.getEvent(eventId);

      expect(event?.recurring).toBe(true);
    });

    test('should handle custom recurrence pattern', () => {
      const callback = jest.fn();
      const pattern: RecurrencePattern = {
        type: RecurrenceType.CUSTOM,
        interval: 5000,
        count: 10
      };

      const eventId = scheduler.scheduleRecurringEvent('custom-pattern', callback, pattern);
      const event = scheduler.getEvent(eventId);

      expect(event?.recurring).toBe(true);
      expect(event?.interval).toBe(5000);
      expect(event?.remainingExecutions).toBe(10);
    });
  });

  describe('Task Scheduling', () => {
    test('should schedule basic task', () => {
      const callback = jest.fn();
      const taskId = scheduler.scheduleTask('test-task', callback, 1000);

      expect(taskId).toBeDefined();
      expect(taskId.startsWith('task_')).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.name).toBe('test-task');
      expect(task?.status).toBe(TaskStatus.SCHEDULED);
    });

    test('should schedule task with options', () => {
      const callback = jest.fn();
      const options = {
        interval: 2000,
        maxExecutions: 5,
        priority: 10,
        category: 'important',
        timeout: 5000,
        maxRetries: 3
      };

      const taskId = scheduler.scheduleTask('advanced-task', callback, 1000, options);
      const task = scheduler.getTask(taskId);

      expect(task?.interval).toBe(2000);
      expect(task?.maxExecutions).toBe(5);
      expect(task?.priority).toBe(10);
      expect(task?.category).toBe('important');
      expect(task?.timeout).toBe(5000);
      expect(task?.maxRetries).toBe(3);
    });

    test('should schedule async task', async () => {
      const asyncCallback = async () => {
        return new Promise(resolve => (globalThis as any).setTimeout(resolve, 100));
      };

      const taskId = scheduler.scheduleTask('async-task', asyncCallback, 500);
      const task = scheduler.getTask(taskId);

      expect(task?.name).toBe('async-task');
      expect(typeof task?.callback).toBe('function');
    });
  });

  describe('Event and Task Cancellation', () => {
    test('should cancel individual events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleEvent('cancelable', callback, 5000);

      const cancelled = scheduler.cancelEvent(eventId);
      expect(cancelled).toBe(true);

      const event = scheduler.getEvent(eventId);
      expect(event).toBeUndefined();
    });

    test('should cancel individual tasks', () => {
      const callback = jest.fn();
      const taskId = scheduler.scheduleTask('cancelable-task', callback, 5000);

      const cancelled = scheduler.cancelTask(taskId);
      expect(cancelled).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task).toBeUndefined();
    });

    test('should cancel events by category', () => {
      const callback = jest.fn();

      scheduler.scheduleEvent('event1', callback, 1000, {}, 'category1');
      scheduler.scheduleEvent('event2', callback, 1000, {}, 'category1');
      scheduler.scheduleEvent('event3', callback, 1000, {}, 'category2');

      const cancelledCount = scheduler.cancelEventsByCategory('category1');
      expect(cancelledCount).toBe(2);

      const remainingEvents = scheduler.getEventsByCategory('category1');
      expect(remainingEvents.length).toBe(0);

      const category2Events = scheduler.getEventsByCategory('category2');
      expect(category2Events.length).toBe(1);
    });

    test('should cancel tasks by category', () => {
      const callback = jest.fn();

      scheduler.scheduleTask('task1', callback, 1000, { category: 'test' });
      scheduler.scheduleTask('task2', callback, 1000, { category: 'test' });
      scheduler.scheduleTask('task3', callback, 1000, { category: 'production' });

      const cancelledCount = scheduler.cancelTasksByCategory('test');
      expect(cancelledCount).toBe(2);

      const remainingTasks = scheduler.getTasksByCategory('test');
      expect(remainingTasks.length).toBe(0);

      const productionTasks = scheduler.getTasksByCategory('production');
      expect(productionTasks.length).toBe(1);
    });
  });

  describe('Event and Task Rescheduling', () => {
    test('should reschedule events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleEvent('reschedulable', callback, 1000);
      const newTime = Date.now() + 5000;

      const rescheduled = scheduler.rescheduleEvent(eventId, newTime);
      expect(rescheduled).toBe(true);

      const event = scheduler.getEvent(eventId);
      expect(event?.scheduledTime).toBe(newTime);
    });

    test('should reschedule tasks', () => {
      const callback = jest.fn();
      const taskId = scheduler.scheduleTask('reschedulable-task', callback, 1000);
      const newTime = Date.now() + 5000;

      const rescheduled = scheduler.rescheduleTask(taskId, newTime);
      expect(rescheduled).toBe(true);

      const task = scheduler.getTask(taskId);
      expect(task?.scheduledTime).toBe(newTime);
    });

    test('should not reschedule non-pending events', () => {
      const callback = jest.fn();
      const eventId = scheduler.scheduleEvent('executed', callback, 1000);
      const event = scheduler.getEvent(eventId);

      if (event) {
        event.status = EventStatus.COMPLETED;
      }

      const rescheduled = scheduler.rescheduleEvent(eventId, Date.now() + 5000);
      expect(rescheduled).toBe(false);
    });
  });

  describe('Query Methods', () => {
    test('should get upcoming events within time window', () => {
      const callback = jest.fn();
      const now = Date.now();

      scheduler.scheduleEvent('soon1', callback, 100);
      scheduler.scheduleEvent('soon2', callback, 200);
      scheduler.scheduleEvent('later', callback, 2000);

      const upcomingEvents = scheduler.getUpcomingEvents(500);
      expect(upcomingEvents.length).toBe(2);
      expect(upcomingEvents[0].name).toBe('soon1');
      expect(upcomingEvents[1].name).toBe('soon2');
    });

    test('should get upcoming tasks within time window', () => {
      const callback = jest.fn();

      scheduler.scheduleTask('soon1', callback, 100);
      scheduler.scheduleTask('soon2', callback, 200);
      scheduler.scheduleTask('later', callback, 2000);

      const upcomingTasks = scheduler.getUpcomingTasks(500);
      expect(upcomingTasks.length).toBe(2);
      expect(upcomingTasks[0].name).toBe('soon1');
      expect(upcomingTasks[1].name).toBe('soon2');
    });

    test('should get all events and tasks', () => {
      const callback = jest.fn();

      scheduler.scheduleEvent('event1', callback, 1000);
      scheduler.scheduleEvent('event2', callback, 2000);
      scheduler.scheduleTask('task1', callback, 1000);
      scheduler.scheduleTask('task2', callback, 2000);

      const allEvents = scheduler.getAllEvents();
      const allTasks = scheduler.getAllTasks();

      expect(allEvents.length).toBe(2);
      expect(allTasks.length).toBe(2);
    });

    test('should filter events and tasks by category', () => {
      const callback = jest.fn();

      scheduler.scheduleEvent('event1', callback, 1000, {}, 'ui');
      scheduler.scheduleEvent('event2', callback, 1000, {}, 'logic');
      scheduler.scheduleTask('task1', callback, 1000, { category: 'ui' });
      scheduler.scheduleTask('task2', callback, 1000, { category: 'logic' });

      const uiEvents = scheduler.getEventsByCategory('ui');
      const logicTasks = scheduler.getTasksByCategory('logic');

      expect(uiEvents.length).toBe(1);
      expect(uiEvents[0].name).toBe('event1');
      expect(logicTasks.length).toBe(1);
      expect(logicTasks[0].name).toBe('task2');
    });
  });

  describe('Cleanup Operations', () => {
    test('should clear all events and tasks', () => {
      const callback = jest.fn();

      scheduler.scheduleEvent('event', callback, 1000);
      scheduler.scheduleTask('task', callback, 1000);

      scheduler.clearAll();

      expect(scheduler.getAllEvents().length).toBe(0);
      expect(scheduler.getAllTasks().length).toBe(0);
    });

    test('should clear expired events and tasks', () => {
      const callback = jest.fn();

      const eventId = scheduler.scheduleEvent('completed-event', callback, 1000);
      const taskId = scheduler.scheduleTask('completed-task', callback, 1000);

      const event = scheduler.getEvent(eventId);
      const task = scheduler.getTask(taskId);

      if (event) event.status = EventStatus.COMPLETED;
      if (task) task.status = TaskStatus.COMPLETED;

      scheduler.scheduleEvent('pending-event', callback, 5000);
      scheduler.scheduleTask('pending-task', callback, 5000);

      const removedCount = scheduler.clearExpiredEvents();
      expect(removedCount).toBe(2);

      expect(scheduler.getAllEvents().length).toBe(1);
      expect(scheduler.getAllTasks().length).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should provide comprehensive statistics', () => {
      const callback = jest.fn();

      scheduler.scheduleEvent('event1', callback, 1000, {}, 'ui');
      scheduler.scheduleEvent('event2', callback, 1000, {}, 'logic');
      scheduler.scheduleTask('task1', callback, 1000, { category: 'ui' });
      scheduler.scheduleTask('task2', callback, 1000, { category: 'logic' });

      const stats = scheduler.getStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.totalTasks).toBe(2);
      expect(stats.pendingEvents).toBe(2);
      expect(stats.scheduledTasks).toBe(2);
      expect(stats.categoryCounts.ui.events).toBe(1);
      expect(stats.categoryCounts.ui.tasks).toBe(1);
      expect(stats.categoryCounts.logic.events).toBe(1);
      expect(stats.categoryCounts.logic.tasks).toBe(1);
    });

    test('should track completed events and tasks in statistics', () => {
      const callback = jest.fn();

      const eventId = scheduler.scheduleEvent('completed-event', callback, 1000);
      const taskId = scheduler.scheduleTask('completed-task', callback, 1000);

      const event = scheduler.getEvent(eventId);
      const task = scheduler.getTask(taskId);

      if (event) event.status = EventStatus.COMPLETED;
      if (task) task.status = TaskStatus.COMPLETED;

      const stats = scheduler.getStatistics();

      expect(stats.completedEvents).toBe(1);
      expect(stats.completedTasks).toBe(1);
      expect(stats.pendingEvents).toBe(0);
      expect(stats.scheduledTasks).toBe(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit event scheduled events', (done) => {
      scheduler.on('event_scheduled', (event) => {
        expect(event.name).toBe('test-event');
        done();
      });

      scheduler.scheduleEvent('test-event', jest.fn(), 1000);
    });

    test('should emit task scheduled events', (done) => {
      scheduler.on('task_scheduled', (task) => {
        expect(task.name).toBe('test-task');
        done();
      });

      scheduler.scheduleTask('test-task', jest.fn(), 1000);
    });

    test('should emit cancellation events', (done) => {
      const eventId = scheduler.scheduleEvent('test-event', jest.fn(), 1000);

      scheduler.on('event_cancelled', (event) => {
        expect(event.id).toBe(eventId);
        done();
      });

      scheduler.cancelEvent(eventId);
    });

    test('should emit category cancellation events', (done) => {
      scheduler.scheduleEvent('event1', jest.fn(), 1000, {}, 'test');
      scheduler.scheduleEvent('event2', jest.fn(), 1000, {}, 'test');

      scheduler.on('events_cancelled_by_category', (data) => {
        expect(data.category).toBe('test');
        expect(data.count).toBe(2);
        done();
      });

      scheduler.cancelEventsByCategory('test');
    });
  });
});