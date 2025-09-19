export interface TimeManagerConfig {
  baseTimeScale: number;
  maxTimeScale: number;
  tickRate: number;
  enablePause: boolean;
  enableRewind: boolean;
  maxHistorySize: number;
  eventQueueSize: number;
}

export interface SimulationTime {
  current: number;
  elapsed: number;
  scale: number;
  delta: number;
  frame: number;
  isPaused: boolean;
  realTime: number;
  startTime: number;
}

export interface TimeEvent {
  id: string;
  name: string;
  scheduledTime: number;
  callback: TimeEventCallback;
  data?: any;
  recurring?: boolean;
  interval?: number;
  priority: number;
  remainingExecutions?: number;
  lastExecution?: number;
  status: EventStatus;
  category: string;
}

export interface Timeline {
  id: string;
  name: string;
  events: Map<string, TimeEvent>;
  keyframes: Keyframe[];
  duration: number;
  loop: boolean;
  autoReverse: boolean;
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
}

export interface Keyframe {
  id: string;
  time: number;
  properties: Record<string, any>;
  easing: EasingFunction;
  duration: number;
  metadata: Record<string, any>;
}

export interface TimeSnapshot {
  id: string;
  timestamp: number;
  simulationTime: number;
  state: any;
  events: TimeEvent[];
  metadata: Record<string, any>;
}

export interface ScheduledTask {
  id: string;
  name: string;
  callback: () => void | Promise<void>;
  scheduledTime: number;
  interval?: number;
  maxExecutions?: number;
  executionCount: number;
  priority: number;
  status: TaskStatus;
  category: string;
  timeout?: number;
  retryAttempts: number;
  maxRetries: number;
}

export interface TimeZone {
  id: string;
  name: string;
  offset: number;
  daylightSaving: boolean;
  rules: TimeZoneRule[];
}

export interface TimeZoneRule {
  startDate: number;
  endDate: number;
  offsetChange: number;
  name: string;
}

export interface PerformanceMetrics {
  averageFrameTime: number;
  ticksPerSecond: number;
  eventsProcessed: number;
  timelineUpdates: number;
  memoryUsage: number;
  cpuUtilization: number;
  eventQueueSize: number;
  activeTimelines: number;
}

export interface TimeController {
  play(): void;
  pause(): void;
  stop(): void;
  setTimeScale(scale: number): void;
  seekTo(time: number): void;
  step(delta?: number): void;
  reset(): void;
}

export interface TimeSynchronizer {
  sync(): Promise<void>;
  getOffset(): number;
  isInSync(): boolean;
  getLastSyncTime(): number;
}

export interface TimeRange {
  start: number;
  end: number;
  duration: number;
}

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number;
  endDate?: number;
  count?: number;
  weekdays?: number[];
  monthDay?: number;
  yearDay?: number;
}

export interface Clock {
  id: string;
  name: string;
  time: number;
  timeScale: number;
  timezone: string;
  format: string;
  isRunning: boolean;
  startTime: number;
  drift: number;
}

export interface TimeTransition {
  from: number;
  to: number;
  duration: number;
  easing: EasingFunction;
  onUpdate?: (progress: number, currentValue: number) => void;
  onComplete?: () => void;
}

export type TimeEventCallback = (event: TimeEvent, currentTime: number) => void | Promise<void>;

export type EasingFunction = (t: number) => number;

export enum EventStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum TaskStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum TimeDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
  STOPPED = 'stopped'
}

export enum TimeUnit {
  MILLISECOND = 'millisecond',
  SECOND = 'second',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

export enum EasingType {
  LINEAR = 'linear',
  EASE_IN = 'ease_in',
  EASE_OUT = 'ease_out',
  EASE_IN_OUT = 'ease_in_out',
  BOUNCE = 'bounce',
  ELASTIC = 'elastic',
  BACK = 'back'
}