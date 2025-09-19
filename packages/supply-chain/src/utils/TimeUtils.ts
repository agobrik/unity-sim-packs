/**
 * Time Management Utilities for Supply Chain Simulation
 */

import { TimeStamp, Duration } from '../core/types';

export class TimeUtils {
  private static gameTimeStart: number = 0;
  private static realTimeStart: number = Date.now();
  private static timeScale: number = 1; // 1:1 real time to game time

  /**
   * Set the time scale for simulation
   */
  static setTimeScale(scale: number): void {
    if (scale <= 0) {
      throw new Error('Time scale must be positive');
    }
    this.timeScale = scale;
  }

  /**
   * Get current time scale
   */
  static getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Reset simulation time
   */
  static resetTime(startTime: number = 0): void {
    this.gameTimeStart = startTime;
    this.realTimeStart = Date.now();
  }

  /**
   * Get current timestamp
   */
  static now(): TimeStamp {
    const realTime = Date.now();
    const gameTime = this.gameTimeStart + (realTime - this.realTimeStart) * this.timeScale;

    return {
      gameTime,
      realTime
    };
  }

  /**
   * Convert real time to game time
   */
  static realToGameTime(realTime: number): number {
    return this.gameTimeStart + (realTime - this.realTimeStart) * this.timeScale;
  }

  /**
   * Convert game time to real time
   */
  static gameToRealTime(gameTime: number): number {
    return this.realTimeStart + (gameTime - this.gameTimeStart) / this.timeScale;
  }

  /**
   * Create timestamp from game time
   */
  static fromGameTime(gameTime: number): TimeStamp {
    return {
      gameTime,
      realTime: this.gameToRealTime(gameTime)
    };
  }

  /**
   * Create timestamp from real time
   */
  static fromRealTime(realTime: number): TimeStamp {
    return {
      gameTime: this.realToGameTime(realTime),
      realTime
    };
  }

  /**
   * Calculate duration between timestamps
   */
  static duration(start: TimeStamp, end: TimeStamp): Duration {
    return {
      gameTime: end.gameTime - start.gameTime,
      realTime: end.realTime - start.realTime
    };
  }

  /**
   * Add duration to timestamp
   */
  static addDuration(timestamp: TimeStamp, duration: Duration): TimeStamp {
    return {
      gameTime: timestamp.gameTime + duration.gameTime,
      realTime: timestamp.realTime + duration.realTime
    };
  }

  /**
   * Subtract duration from timestamp
   */
  static subtractDuration(timestamp: TimeStamp, duration: Duration): TimeStamp {
    return {
      gameTime: timestamp.gameTime - duration.gameTime,
      realTime: timestamp.realTime - duration.realTime
    };
  }

  /**
   * Create duration from milliseconds
   */
  static milliseconds(ms: number): Duration {
    return {
      gameTime: ms * this.timeScale,
      realTime: ms
    };
  }

  /**
   * Create duration from seconds
   */
  static seconds(seconds: number): Duration {
    return this.milliseconds(seconds * 1000);
  }

  /**
   * Create duration from minutes
   */
  static minutes(minutes: number): Duration {
    return this.seconds(minutes * 60);
  }

  /**
   * Create duration from hours
   */
  static hours(hours: number): Duration {
    return this.minutes(hours * 60);
  }

  /**
   * Create duration from days
   */
  static days(days: number): Duration {
    return this.hours(days * 24);
  }

  /**
   * Compare timestamps
   */
  static compare(a: TimeStamp, b: TimeStamp): number {
    return a.gameTime - b.gameTime;
  }

  /**
   * Check if timestamp is before another
   */
  static isBefore(a: TimeStamp, b: TimeStamp): boolean {
    return a.gameTime < b.gameTime;
  }

  /**
   * Check if timestamp is after another
   */
  static isAfter(a: TimeStamp, b: TimeStamp): boolean {
    return a.gameTime > b.gameTime;
  }

  /**
   * Check if timestamps are equal
   */
  static isEqual(a: TimeStamp, b: TimeStamp): boolean {
    return a.gameTime === b.gameTime;
  }

  /**
   * Format game time as human-readable string
   */
  static formatGameTime(gameTime: number): string {
    const totalSeconds = Math.floor(gameTime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Format duration as human-readable string
   */
  static formatDuration(duration: Duration): string {
    return this.formatGameTime(duration.gameTime);
  }

  /**
   * Parse duration string (e.g., "1h 30m", "45s", "2d 3h")
   */
  static parseDuration(durationStr: string): Duration {
    const regex = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/;
    const match = durationStr.match(regex);

    if (!match) {
      throw new Error(`Invalid duration format: ${durationStr}`);
    }

    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseInt(match[4] || '0', 10);

    const totalMs = (days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds) * 1000;

    return this.milliseconds(totalMs);
  }

  /**
   * Get time until future timestamp
   */
  static timeUntil(futureTime: TimeStamp): Duration {
    const now = this.now();
    if (this.isAfter(now, futureTime)) {
      return { gameTime: 0, realTime: 0 };
    }
    return this.duration(now, futureTime);
  }

  /**
   * Get time since past timestamp
   */
  static timeSince(pastTime: TimeStamp): Duration {
    const now = this.now();
    if (this.isBefore(now, pastTime)) {
      return { gameTime: 0, realTime: 0 };
    }
    return this.duration(pastTime, now);
  }

  /**
   * Create a timer that fires after specified duration
   */
  static setTimeout(callback: () => void, duration: Duration): number {
    const realTimeMs = duration.realTime / this.timeScale;
    return (globalThis as any).setTimeout(callback, realTimeMs) as any;
  }

  /**
   * Create an interval timer
   */
  static setInterval(callback: () => void, duration: Duration): number {
    const realTimeMs = duration.realTime / this.timeScale;
    return (globalThis as any).setInterval(callback, realTimeMs) as any;
  }

  /**
   * Clear timeout
   */
  static clearTimeout(id: number): void {
    (globalThis as any).clearTimeout(id);
  }

  /**
   * Clear interval
   */
  static clearInterval(id: number): void {
    (globalThis as any).clearInterval(id);
  }

  /**
   * Sleep for specified duration (returns promise)
   */
  static sleep(duration: Duration): Promise<void> {
    return new Promise(resolve => {
      this.setTimeout(resolve, duration);
    });
  }

  /**
   * Convert timestamp to ISO string
   */
  static toISOString(timestamp: TimeStamp): string {
    return new Date(timestamp.realTime).toISOString();
  }

  /**
   * Create timestamp from ISO string
   */
  static fromISOString(isoString: string): TimeStamp {
    const realTime = new Date(isoString).getTime();
    return this.fromRealTime(realTime);
  }

  /**
   * Get start of day for timestamp
   */
  static startOfDay(timestamp: TimeStamp): TimeStamp {
    const date = new Date(timestamp.realTime);
    date.setHours(0, 0, 0, 0);
    return this.fromRealTime(date.getTime());
  }

  /**
   * Get end of day for timestamp
   */
  static endOfDay(timestamp: TimeStamp): TimeStamp {
    const date = new Date(timestamp.realTime);
    date.setHours(23, 59, 59, 999);
    return this.fromRealTime(date.getTime());
  }

  /**
   * Check if timestamp is within time window
   */
  static isWithinWindow(timestamp: TimeStamp, start: TimeStamp, end: TimeStamp): boolean {
    return !this.isBefore(timestamp, start) && !this.isAfter(timestamp, end);
  }

  /**
   * Get simulation statistics
   */
  static getStats(): {
    gameTimeStart: number;
    realTimeStart: number;
    timeScale: number;
    currentGameTime: number;
    currentRealTime: number;
    uptime: number;
  } {
    const now = this.now();
    return {
      gameTimeStart: this.gameTimeStart,
      realTimeStart: this.realTimeStart,
      timeScale: this.timeScale,
      currentGameTime: now.gameTime,
      currentRealTime: now.realTime,
      uptime: now.realTime - this.realTimeStart
    };
  }
}