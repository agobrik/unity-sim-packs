import { EventEmitter } from '../utils/EventEmitter';
import {
  TimeEvent,
  ScheduledTask,
  RecurrencePattern,
  RecurrenceType,
  EventStatus,
  TaskStatus,
  TimeEventCallback
} from '../types';

export class EventScheduler extends EventEmitter {
  private events: Map<string, TimeEvent> = new Map();
  private tasks: Map<string, ScheduledTask> = new Map();
  private nextEventId: number = 1;
  private nextTaskId: number = 1;

  public scheduleEvent(
    name: string,
    callback: TimeEventCallback,
    delay: number,
    data?: any,
    category: string = 'default',
    priority: number = 0
  ): string {
    const event: TimeEvent = {
      id: `event_${this.nextEventId++}`,
      name,
      scheduledTime: Date.now() + delay,
      callback,
      data,
      priority,
      status: EventStatus.PENDING,
      category
    };

    this.events.set(event.id, event);
    this.emit('event_scheduled', event);
    return event.id;
  }

  public scheduleRecurringEvent(
    name: string,
    callback: TimeEventCallback,
    pattern: RecurrencePattern,
    data?: any,
    category: string = 'default',
    priority: number = 0
  ): string {
    const firstExecution = this.calculateNextExecution(Date.now(), pattern);

    const event: TimeEvent = {
      id: `recurring_event_${this.nextEventId++}`,
      name,
      scheduledTime: firstExecution,
      callback,
      data,
      recurring: true,
      interval: pattern.interval,
      priority,
      status: EventStatus.PENDING,
      category,
      remainingExecutions: pattern.count
    };

    this.events.set(event.id, event);
    this.emit('recurring_event_scheduled', { event, pattern });
    return event.id;
  }

  public scheduleTask(
    name: string,
    callback: () => void | Promise<void>,
    delay: number,
    options: {
      interval?: number;
      maxExecutions?: number;
      priority?: number;
      category?: string;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): string {
    const task: ScheduledTask = {
      id: `task_${this.nextTaskId++}`,
      name,
      callback,
      scheduledTime: Date.now() + delay,
      interval: options.interval,
      maxExecutions: options.maxExecutions,
      executionCount: 0,
      priority: options.priority || 0,
      status: TaskStatus.SCHEDULED,
      category: options.category || 'default',
      timeout: options.timeout,
      retryAttempts: 0,
      maxRetries: options.maxRetries || 0
    };

    this.tasks.set(task.id, task);
    this.emit('task_scheduled', task);
    return task.id;
  }

  public scheduleDelayedEvent(
    name: string,
    callback: TimeEventCallback,
    delay: number,
    data?: any
  ): string {
    return this.scheduleEvent(name, callback, delay, data, 'delayed');
  }

  public schedulePeriodicEvent(
    name: string,
    callback: TimeEventCallback,
    interval: number,
    count?: number,
    data?: any
  ): string {
    const pattern: RecurrencePattern = {
      type: RecurrenceType.CUSTOM,
      interval,
      count
    };

    return this.scheduleRecurringEvent(name, callback, pattern, data, 'periodic');
  }

  public scheduleDailyEvent(
    name: string,
    callback: TimeEventCallback,
    hour: number,
    minute: number = 0,
    data?: any
  ): string {
    const now = new Date();
    const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    const delay = scheduledDate.getTime() - now.getTime();

    const pattern: RecurrencePattern = {
      type: RecurrenceType.DAILY,
      interval: 24 * 60 * 60 * 1000
    };

    const event: TimeEvent = {
      id: `daily_event_${this.nextEventId++}`,
      name,
      scheduledTime: Date.now() + delay,
      callback,
      data,
      recurring: true,
      interval: pattern.interval,
      priority: 0,
      status: EventStatus.PENDING,
      category: 'daily'
    };

    this.events.set(event.id, event);
    this.emit('daily_event_scheduled', { event, hour, minute });
    return event.id;
  }

  public scheduleWeeklyEvent(
    name: string,
    callback: TimeEventCallback,
    weekday: number,
    hour: number,
    minute: number = 0,
    data?: any
  ): string {
    const now = new Date();
    const currentWeekday = now.getDay();
    let daysUntilTarget = weekday - currentWeekday;

    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }

    const scheduledDate = new Date(now);
    scheduledDate.setDate(now.getDate() + daysUntilTarget);
    scheduledDate.setHours(hour, minute, 0, 0);

    const delay = scheduledDate.getTime() - now.getTime();

    const pattern: RecurrencePattern = {
      type: RecurrenceType.WEEKLY,
      interval: 7 * 24 * 60 * 60 * 1000,
      weekdays: [weekday]
    };

    const event: TimeEvent = {
      id: `weekly_event_${this.nextEventId++}`,
      name,
      scheduledTime: Date.now() + delay,
      callback,
      data,
      recurring: true,
      interval: pattern.interval,
      priority: 0,
      status: EventStatus.PENDING,
      category: 'weekly'
    };

    this.events.set(event.id, event);
    this.emit('weekly_event_scheduled', { event, weekday, hour, minute });
    return event.id;
  }

  public scheduleMonthlyEvent(
    name: string,
    callback: TimeEventCallback,
    day: number,
    hour: number,
    minute: number = 0,
    data?: any
  ): string {
    const now = new Date();
    let scheduledDate = new Date(now.getFullYear(), now.getMonth(), day, hour, minute);

    if (scheduledDate <= now) {
      scheduledDate = new Date(now.getFullYear(), now.getMonth() + 1, day, hour, minute);
    }

    const delay = scheduledDate.getTime() - now.getTime();

    const pattern: RecurrencePattern = {
      type: RecurrenceType.MONTHLY,
      interval: this.getMonthDuration(scheduledDate),
      monthDay: day
    };

    const event: TimeEvent = {
      id: `monthly_event_${this.nextEventId++}`,
      name,
      scheduledTime: Date.now() + delay,
      callback,
      data,
      recurring: true,
      interval: pattern.interval,
      priority: 0,
      status: EventStatus.PENDING,
      category: 'monthly'
    };

    this.events.set(event.id, event);
    this.emit('monthly_event_scheduled', { event, day, hour, minute });
    return event.id;
  }

  public cancelEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (event) {
      event.status = EventStatus.CANCELLED;
      this.events.delete(eventId);
      this.emit('event_cancelled', event);
      return true;
    }
    return false;
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = TaskStatus.CANCELLED;
      this.tasks.delete(taskId);
      this.emit('task_cancelled', task);
      return true;
    }
    return false;
  }

  public cancelEventsByCategory(category: string): number {
    let cancelledCount = 0;

    for (const [id, event] of this.events) {
      if (event.category === category) {
        event.status = EventStatus.CANCELLED;
        this.events.delete(id);
        this.emit('event_cancelled', event);
        cancelledCount++;
      }
    }

    this.emit('events_cancelled_by_category', { category, count: cancelledCount });
    return cancelledCount;
  }

  public cancelTasksByCategory(category: string): number {
    let cancelledCount = 0;

    for (const [id, task] of this.tasks) {
      if (task.category === category) {
        task.status = TaskStatus.CANCELLED;
        this.tasks.delete(id);
        this.emit('task_cancelled', task);
        cancelledCount++;
      }
    }

    this.emit('tasks_cancelled_by_category', { category, count: cancelledCount });
    return cancelledCount;
  }

  public rescheduleEvent(eventId: string, newTime: number): boolean {
    const event = this.events.get(eventId);
    if (event && event.status === EventStatus.PENDING) {
      const oldTime = event.scheduledTime;
      event.scheduledTime = newTime;
      this.emit('event_rescheduled', { event, oldTime, newTime });
      return true;
    }
    return false;
  }

  public rescheduleTask(taskId: string, newTime: number): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === TaskStatus.SCHEDULED) {
      const oldTime = task.scheduledTime;
      task.scheduledTime = newTime;
      this.emit('task_rescheduled', { task, oldTime, newTime });
      return true;
    }
    return false;
  }

  public getEvent(eventId: string): TimeEvent | undefined {
    return this.events.get(eventId);
  }

  public getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  public getEventsByCategory(category: string): TimeEvent[] {
    return Array.from(this.events.values()).filter(event => event.category === category);
  }

  public getTasksByCategory(category: string): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(task => task.category === category);
  }

  public getUpcomingEvents(timeWindow: number): TimeEvent[] {
    const currentTime = Date.now();
    const endTime = currentTime + timeWindow;

    return Array.from(this.events.values())
      .filter(event =>
        event.status === EventStatus.PENDING &&
        event.scheduledTime >= currentTime &&
        event.scheduledTime <= endTime
      )
      .sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  public getUpcomingTasks(timeWindow: number): ScheduledTask[] {
    const currentTime = Date.now();
    const endTime = currentTime + timeWindow;

    return Array.from(this.tasks.values())
      .filter(task =>
        task.status === TaskStatus.SCHEDULED &&
        task.scheduledTime >= currentTime &&
        task.scheduledTime <= endTime
      )
      .sort((a, b) => a.scheduledTime - b.scheduledTime);
  }

  public getAllEvents(): TimeEvent[] {
    return Array.from(this.events.values());
  }

  public getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  public clearAll(): void {
    this.events.clear();
    this.tasks.clear();
    this.emit('scheduler_cleared');
  }

  public clearExpiredEvents(): number {
    const currentTime = Date.now();
    let removedCount = 0;

    for (const [id, event] of this.events) {
      if (event.status === EventStatus.COMPLETED ||
          event.status === EventStatus.FAILED ||
          event.status === EventStatus.CANCELLED) {
        this.events.delete(id);
        removedCount++;
      }
    }

    for (const [id, task] of this.tasks) {
      if (task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.FAILED ||
          task.status === TaskStatus.CANCELLED) {
        this.tasks.delete(id);
        removedCount++;
      }
    }

    this.emit('expired_items_cleared', { count: removedCount });
    return removedCount;
  }

  private calculateNextExecution(baseTime: number, pattern: RecurrencePattern): number {
    switch (pattern.type) {
      case RecurrenceType.DAILY:
        return baseTime + 24 * 60 * 60 * 1000;

      case RecurrenceType.WEEKLY:
        return baseTime + 7 * 24 * 60 * 60 * 1000;

      case RecurrenceType.MONTHLY:
        const date = new Date(baseTime);
        return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()).getTime();

      case RecurrenceType.YEARLY:
        const yearDate = new Date(baseTime);
        return new Date(yearDate.getFullYear() + 1, yearDate.getMonth(), yearDate.getDate()).getTime();

      case RecurrenceType.CUSTOM:
      default:
        return baseTime + pattern.interval;
    }
  }

  private getMonthDuration(date: Date): number {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const startOfNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return startOfNextMonth.getTime() - startOfMonth.getTime();
  }

  public getStatistics(): {
    totalEvents: number;
    totalTasks: number;
    pendingEvents: number;
    scheduledTasks: number;
    completedEvents: number;
    completedTasks: number;
    categoryCounts: Record<string, { events: number; tasks: number }>;
  } {
    const events = Array.from(this.events.values());
    const tasks = Array.from(this.tasks.values());

    const categoryCounts: Record<string, { events: number; tasks: number }> = {};

    for (const event of events) {
      if (!categoryCounts[event.category]) {
        categoryCounts[event.category] = { events: 0, tasks: 0 };
      }
      categoryCounts[event.category].events++;
    }

    for (const task of tasks) {
      if (!categoryCounts[task.category]) {
        categoryCounts[task.category] = { events: 0, tasks: 0 };
      }
      categoryCounts[task.category].tasks++;
    }

    return {
      totalEvents: events.length,
      totalTasks: tasks.length,
      pendingEvents: events.filter(e => e.status === EventStatus.PENDING).length,
      scheduledTasks: tasks.filter(t => t.status === TaskStatus.SCHEDULED).length,
      completedEvents: events.filter(e => e.status === EventStatus.COMPLETED).length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      categoryCounts
    };
  }
}