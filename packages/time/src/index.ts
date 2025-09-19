/**
 * @steam-sim/time - Time Management Package
 *
 * A sophisticated time control and scheduling system for simulations,
 * providing precise time management, event scheduling, and performance monitoring.
 */

// Core classes
export { TimeManager } from './core/TimeManager';
export { EventScheduler } from './core/EventScheduler';

// Utilities
export { TimeHelpers } from './utils/TimeHelpers';

// Types and interfaces
export type {
  TimeManagerConfig,
  SimulationTime,
  TimeEvent,
  Timeline,
  Keyframe,
  TimeSnapshot,
  ScheduledTask,
  TimeZone,
  TimeZoneRule,
  PerformanceMetrics,
  TimeController,
  TimeSynchronizer,
  TimeRange,
  RecurrencePattern,
  Clock,
  TimeTransition,
  TimeEventCallback,
  EasingFunction
} from './types';

// Enums
export {
  EventStatus,
  TaskStatus,
  RecurrenceType,
  TimeDirection,
  TimeUnit,
  EasingType
} from './types';

// Version
export const VERSION = '1.0.0';

// Unity-compatible wrapper
export class TimeSimulation {
  constructor() {}

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      time: {
        simulationTime: 0,
        timeScale: 1.0,
        paused: false,
        systemHealth: 'operational',
        framework: 'steam-sim-time'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}