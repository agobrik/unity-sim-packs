import { EventEmitter } from '../utils/EventEmitter';
import {
  TimeManagerConfig,
  SimulationTime,
  TimeEvent,
  Timeline,
  TimeSnapshot,
  PerformanceMetrics,
  EventStatus,
  TimeController,
  ScheduledTask,
  TaskStatus,
  TimeDirection
} from '../types';

export class TimeManager extends EventEmitter implements TimeController {
  private config: TimeManagerConfig;
  private simulationTime: SimulationTime;
  private eventQueue: Map<number, TimeEvent[]> = new Map();
  private timelines: Map<string, Timeline> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private snapshots: TimeSnapshot[] = [];
  private metrics: PerformanceMetrics;
  private isRunning: boolean = false;
  private updateTimer?: any;
  private lastUpdate: number = 0;
  private frameCount: number = 0;
  private direction: TimeDirection = TimeDirection.FORWARD;

  constructor(config: TimeManagerConfig) {
    super();
    this.config = config;
    this.simulationTime = this.initializeSimulationTime();
    this.metrics = this.initializeMetrics();
  }

  private initializeSimulationTime(): SimulationTime {
    const now = Date.now();
    return {
      current: 0,
      elapsed: 0,
      scale: this.config.baseTimeScale,
      delta: 0,
      frame: 0,
      isPaused: false,
      realTime: now,
      startTime: now
    };
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      averageFrameTime: 0,
      ticksPerSecond: 0,
      eventsProcessed: 0,
      timelineUpdates: 0,
      memoryUsage: 0,
      cpuUtilization: 0,
      eventQueueSize: 0,
      activeTimelines: 0
    };
  }

  public play(): void {
    if (this.isRunning && !this.simulationTime.isPaused) return;

    this.simulationTime.isPaused = false;
    this.direction = TimeDirection.FORWARD;

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastUpdate = Date.now();
      this.startUpdateLoop();
    }

    this.emit('play', { time: this.simulationTime.current });
  }

  public pause(): void {
    if (!this.isRunning || this.simulationTime.isPaused) return;

    this.simulationTime.isPaused = true;
    this.direction = TimeDirection.STOPPED;
    this.emit('pause', { time: this.simulationTime.current });
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.simulationTime.isPaused = true;
    this.direction = TimeDirection.STOPPED;

    if (this.updateTimer) {
      (globalThis as any).clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.emit('stop', { time: this.simulationTime.current });
  }

  public setTimeScale(scale: number): void {
    if (scale < 0 || scale > this.config.maxTimeScale) {
      throw new Error(`Time scale must be between 0 and ${this.config.maxTimeScale}`);
    }

    const previousScale = this.simulationTime.scale;
    this.simulationTime.scale = scale;

    this.emit('time_scale_changed', {
      previousScale,
      newScale: scale,
      time: this.simulationTime.current
    });
  }

  public seekTo(time: number): void {
    if (time < 0) {
      throw new Error('Cannot seek to negative time');
    }

    const previousTime = this.simulationTime.current;
    this.simulationTime.current = time;
    this.simulationTime.elapsed = time;

    this.processEventsAt(time);
    this.updateTimelines(0);

    this.emit('time_seek', {
      previousTime,
      newTime: time,
      delta: time - previousTime
    });
  }

  public step(delta: number = 1000 / 60): void {
    this.updateSimulation(delta);
  }

  public reset(): void {
    this.stop();
    this.simulationTime = this.initializeSimulationTime();
    this.eventQueue.clear();
    this.frameCount = 0;

    for (const timeline of this.timelines.values()) {
      timeline.currentTime = 0;
      timeline.isPlaying = false;
    }

    this.emit('reset');
  }

  private startUpdateLoop(): void {
    const targetFrameTime = 1000 / this.config.tickRate;

    this.updateTimer = (globalThis as any).setInterval(() => {
      if (!this.simulationTime.isPaused) {
        const now = Date.now();
        const realDelta = now - this.lastUpdate;
        this.lastUpdate = now;

        this.updateSimulation(realDelta);
      }
    }, targetFrameTime);
  }

  private updateSimulation(realDelta: number): void {
    const startTime = (globalThis as any).performance?.now() || Date.now();

    const scaledDelta = realDelta * this.simulationTime.scale;
    this.simulationTime.delta = scaledDelta;
    this.simulationTime.current += scaledDelta;
    this.simulationTime.elapsed += scaledDelta;
    this.simulationTime.frame = ++this.frameCount;
    this.simulationTime.realTime = Date.now();

    this.processEvents();
    this.updateTimelines(scaledDelta);
    this.processScheduledTasks();
    this.updateMetrics((globalThis as any).performance?.now() || Date.now() - startTime);

    this.emit('tick', {
      time: this.simulationTime.current,
      delta: scaledDelta,
      frame: this.frameCount
    });
  }

  private processEvents(): void {
    const currentTime = this.simulationTime.current;
    const eventsToProcess: TimeEvent[] = [];

    for (const [time, events] of this.eventQueue) {
      if (time <= currentTime) {
        eventsToProcess.push(...events);
        this.eventQueue.delete(time);
      }
    }

    eventsToProcess.sort((a, b) => a.priority - b.priority);

    for (const event of eventsToProcess) {
      this.executeEvent(event);
    }

    this.metrics.eventsProcessed += eventsToProcess.length;
  }

  private processEventsAt(time: number): void {
    const eventsToProcess: TimeEvent[] = [];

    for (const [eventTime, events] of this.eventQueue) {
      if (eventTime <= time) {
        eventsToProcess.push(...events);
      }
    }

    eventsToProcess.sort((a, b) => a.scheduledTime - b.scheduledTime);

    for (const event of eventsToProcess) {
      if (event.scheduledTime <= time) {
        this.executeEvent(event);
      }
    }
  }

  private async executeEvent(event: TimeEvent): Promise<void> {
    try {
      event.status = EventStatus.EXECUTING;
      event.lastExecution = this.simulationTime.current;

      await event.callback(event, this.simulationTime.current);

      if (event.recurring && event.interval) {
        if (!event.remainingExecutions || event.remainingExecutions > 1) {
          if (event.remainingExecutions) {
            event.remainingExecutions--;
          }

          const nextTime = this.simulationTime.current + event.interval;
          this.scheduleEvent({
            ...event,
            scheduledTime: nextTime,
            status: EventStatus.PENDING
          });
        } else {
          event.status = EventStatus.COMPLETED;
        }
      } else {
        event.status = EventStatus.COMPLETED;
      }

      this.emit('event_executed', {
        event,
        time: this.simulationTime.current
      });

    } catch (error) {
      event.status = EventStatus.FAILED;
      this.emit('event_failed', {
        event,
        error,
        time: this.simulationTime.current
      });
    }
  }

  private updateTimelines(delta: number): void {
    for (const timeline of this.timelines.values()) {
      if (timeline.isPlaying) {
        timeline.currentTime += delta * timeline.playbackRate;

        if (timeline.duration > 0 && timeline.currentTime >= timeline.duration) {
          if (timeline.loop) {
            timeline.currentTime = timeline.currentTime % timeline.duration;
          } else {
            timeline.currentTime = timeline.duration;
            timeline.isPlaying = false;
            this.emit('timeline_completed', { timeline });
          }
        }

        this.processTimelineKeyframes(timeline);
        this.metrics.timelineUpdates++;
      }
    }
  }

  private processTimelineKeyframes(timeline: Timeline): void {
    const currentTime = timeline.currentTime;

    for (const keyframe of timeline.keyframes) {
      if (keyframe.time <= currentTime && keyframe.time > currentTime - keyframe.duration) {
        const progress = Math.min(1, (currentTime - keyframe.time) / keyframe.duration);
        const easedProgress = keyframe.easing(progress);

        this.emit('keyframe_update', {
          timeline,
          keyframe,
          progress: easedProgress,
          time: currentTime
        });
      }
    }
  }

  private processScheduledTasks(): void {
    const currentTime = this.simulationTime.current;

    for (const task of this.scheduledTasks.values()) {
      if (task.status === TaskStatus.SCHEDULED && task.scheduledTime <= currentTime) {
        this.executeTask(task);
      }
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      task.status = TaskStatus.RUNNING;
      task.executionCount++;

      const timeoutPromise = task.timeout ?
        new Promise((_, reject) => (globalThis as any).setTimeout(() => reject(new Error('Task timeout')), task.timeout)) :
        null;

      const taskPromise = Promise.resolve(task.callback());

      if (timeoutPromise) {
        await Promise.race([taskPromise, timeoutPromise]);
      } else {
        await taskPromise;
      }

      if (task.interval && (!task.maxExecutions || task.executionCount < task.maxExecutions)) {
        task.scheduledTime = this.simulationTime.current + task.interval;
        task.status = TaskStatus.SCHEDULED;
      } else {
        task.status = TaskStatus.COMPLETED;
        this.scheduledTasks.delete(task.id);
      }

      this.emit('task_executed', { task, time: this.simulationTime.current });

    } catch (error) {
      if (task.retryAttempts < task.maxRetries) {
        task.retryAttempts++;
        task.status = TaskStatus.RETRYING;
        task.scheduledTime = this.simulationTime.current + 1000;

        this.emit('task_retry', {
          task,
          error,
          attempt: task.retryAttempts,
          time: this.simulationTime.current
        });
      } else {
        task.status = TaskStatus.FAILED;
        this.scheduledTasks.delete(task.id);

        this.emit('task_failed', {
          task,
          error,
          time: this.simulationTime.current
        });
      }
    }
  }

  public scheduleEvent(event: TimeEvent): string {
    const eventTime = Math.floor(event.scheduledTime);

    if (!this.eventQueue.has(eventTime)) {
      this.eventQueue.set(eventTime, []);
    }

    this.eventQueue.get(eventTime)!.push(event);

    this.emit('event_scheduled', {
      event,
      scheduledTime: event.scheduledTime
    });

    return event.id;
  }

  public cancelEvent(eventId: string): boolean {
    for (const [time, events] of this.eventQueue) {
      const index = events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        const event = events[index];
        event.status = EventStatus.CANCELLED;
        events.splice(index, 1);

        if (events.length === 0) {
          this.eventQueue.delete(time);
        }

        this.emit('event_cancelled', { event });
        return true;
      }
    }
    return false;
  }

  public scheduleTask(task: ScheduledTask): string {
    this.scheduledTasks.set(task.id, task);

    this.emit('task_scheduled', {
      task,
      scheduledTime: task.scheduledTime
    });

    return task.id;
  }

  public cancelTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (task) {
      task.status = TaskStatus.CANCELLED;
      this.scheduledTasks.delete(taskId);
      this.emit('task_cancelled', { task });
      return true;
    }
    return false;
  }

  public createTimeline(timeline: Timeline): string {
    this.timelines.set(timeline.id, timeline);

    this.emit('timeline_created', { timeline });
    return timeline.id;
  }

  public playTimeline(timelineId: string): boolean {
    const timeline = this.timelines.get(timelineId);
    if (timeline) {
      timeline.isPlaying = true;
      this.emit('timeline_started', { timeline });
      return true;
    }
    return false;
  }

  public pauseTimeline(timelineId: string): boolean {
    const timeline = this.timelines.get(timelineId);
    if (timeline) {
      timeline.isPlaying = false;
      this.emit('timeline_paused', { timeline });
      return true;
    }
    return false;
  }

  public removeTimeline(timelineId: string): boolean {
    const timeline = this.timelines.get(timelineId);
    if (timeline) {
      this.timelines.delete(timelineId);
      this.emit('timeline_removed', { timeline });
      return true;
    }
    return false;
  }

  public createSnapshot(metadata: Record<string, any> = {}): TimeSnapshot {
    const snapshot: TimeSnapshot = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      simulationTime: this.simulationTime.current,
      state: this.getState(),
      events: this.getScheduledEvents(),
      metadata
    };

    this.snapshots.push(snapshot);

    if (this.snapshots.length > this.config.maxHistorySize) {
      this.snapshots = this.snapshots.slice(-this.config.maxHistorySize);
    }

    this.emit('snapshot_created', { snapshot });
    return snapshot;
  }

  public restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    this.stop();
    this.simulationTime.current = snapshot.simulationTime;
    this.simulationTime.elapsed = snapshot.simulationTime;
    this.restoreState(snapshot.state);
    this.restoreEvents(snapshot.events);

    this.emit('snapshot_restored', { snapshot });
    return true;
  }

  private getState(): any {
    return {
      simulationTime: { ...this.simulationTime },
      timelines: Array.from(this.timelines.entries()),
      scheduledTasks: Array.from(this.scheduledTasks.entries()),
      frameCount: this.frameCount
    };
  }

  private restoreState(state: any): void {
    this.simulationTime = { ...state.simulationTime };
    this.timelines = new Map(state.timelines);
    this.scheduledTasks = new Map(state.scheduledTasks);
    this.frameCount = state.frameCount;
  }


  private restoreEvents(events: TimeEvent[]): void {
    this.eventQueue.clear();
    for (const event of events) {
      this.scheduleEvent(event);
    }
  }

  private updateMetrics(frameTime: number): void {
    const alpha = 0.1;
    this.metrics.averageFrameTime = this.metrics.averageFrameTime * (1 - alpha) + frameTime * alpha;
    this.metrics.ticksPerSecond = 1000 / this.metrics.averageFrameTime;
    this.metrics.eventQueueSize = Array.from(this.eventQueue.values()).reduce((sum, events) => sum + events.length, 0);
    this.metrics.activeTimelines = Array.from(this.timelines.values()).filter(t => t.isPlaying).length;

    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process?.memoryUsage) {
      this.metrics.memoryUsage = (globalThis as any).process.memoryUsage().heapUsed / 1024 / 1024;
    }
  }

  public getTime(): SimulationTime {
    return { ...this.simulationTime };
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getTimelines(): Timeline[] {
    return Array.from(this.timelines.values());
  }

  public getTimeline(id: string): Timeline | undefined {
    return this.timelines.get(id);
  }

  public getScheduledEvents(): TimeEvent[] {
    const events: TimeEvent[] = [];
    for (const eventList of this.eventQueue.values()) {
      events.push(...eventList);
    }
    return events;
  }

  public getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  public getSnapshots(): TimeSnapshot[] {
    return [...this.snapshots];
  }

  public setConfig(config: Partial<TimeManagerConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config_changed', { config: this.config });
  }

  public getConfig(): TimeManagerConfig {
    return { ...this.config };
  }

  public getEventQueue(): Map<number, TimeEvent[]> {
    return new Map(this.eventQueue);
  }

  public clearEventQueue(): void {
    this.eventQueue.clear();
    this.emit('event_queue_cleared');
  }

  public clearSnapshots(): void {
    this.snapshots = [];
    this.emit('snapshots_cleared');
  }
}