import {
  TimeUnit,
  EasingType,
  EasingFunction,
  TimeRange,
  SimulationTime,
  TimeTransition,
  Clock
} from '../types';

export class TimeHelpers {
  public static convertTimeUnit(value: number, from: TimeUnit, to: TimeUnit): number {
    const milliseconds = this.toMilliseconds(value, from);
    return this.fromMilliseconds(milliseconds, to);
  }

  public static toMilliseconds(value: number, unit: TimeUnit): number {
    switch (unit) {
      case TimeUnit.MILLISECOND:
        return value;
      case TimeUnit.SECOND:
        return value * 1000;
      case TimeUnit.MINUTE:
        return value * 60 * 1000;
      case TimeUnit.HOUR:
        return value * 60 * 60 * 1000;
      case TimeUnit.DAY:
        return value * 24 * 60 * 60 * 1000;
      case TimeUnit.WEEK:
        return value * 7 * 24 * 60 * 60 * 1000;
      case TimeUnit.MONTH:
        return value * 30 * 24 * 60 * 60 * 1000;
      case TimeUnit.YEAR:
        return value * 365 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  public static fromMilliseconds(milliseconds: number, unit: TimeUnit): number {
    switch (unit) {
      case TimeUnit.MILLISECOND:
        return milliseconds;
      case TimeUnit.SECOND:
        return milliseconds / 1000;
      case TimeUnit.MINUTE:
        return milliseconds / (60 * 1000);
      case TimeUnit.HOUR:
        return milliseconds / (60 * 60 * 1000);
      case TimeUnit.DAY:
        return milliseconds / (24 * 60 * 60 * 1000);
      case TimeUnit.WEEK:
        return milliseconds / (7 * 24 * 60 * 60 * 1000);
      case TimeUnit.MONTH:
        return milliseconds / (30 * 24 * 60 * 60 * 1000);
      case TimeUnit.YEAR:
        return milliseconds / (365 * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  public static formatDuration(milliseconds: number, precision: number = 2): string {
    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(precision)}ms`;
    }

    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(precision)}s`;
    }

    const minutes = seconds / 60;
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ?
        `${Math.floor(minutes)}m ${remainingSeconds.toFixed(precision)}s` :
        `${Math.floor(minutes)}m`;
    }

    const hours = minutes / 60;
    if (hours < 24) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ?
        `${Math.floor(hours)}h ${Math.floor(remainingMinutes)}m` :
        `${Math.floor(hours)}h`;
    }

    const days = hours / 24;
    const remainingHours = hours % 24;
    return remainingHours > 0 ?
      `${Math.floor(days)}d ${Math.floor(remainingHours)}h` :
      `${Math.floor(days)}d`;
  }

  public static formatTime(timestamp: number, format: string = 'ISO'): string {
    const date = new Date(timestamp);

    switch (format) {
      case 'ISO':
        return date.toISOString();
      case 'locale':
        return date.toLocaleString();
      case 'date':
        return date.toDateString();
      case 'time':
        return date.toTimeString();
      case 'UTC':
        return date.toUTCString();
      case 'unix':
        return Math.floor(timestamp / 1000).toString();
      case 'custom':
        return this.formatCustomTime(date);
      default:
        return date.toString();
    }
  }

  private static formatCustomTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  public static parseTimeString(timeString: string): number {
    const patterns = [
      { regex: /^(\d+)ms$/, multiplier: 1 },
      { regex: /^(\d+)s$/, multiplier: 1000 },
      { regex: /^(\d+)m$/, multiplier: 60 * 1000 },
      { regex: /^(\d+)h$/, multiplier: 60 * 60 * 1000 },
      { regex: /^(\d+)d$/, multiplier: 24 * 60 * 60 * 1000 },
      { regex: /^(\d+)w$/, multiplier: 7 * 24 * 60 * 60 * 1000 }
    ];

    for (const pattern of patterns) {
      const match = timeString.match(pattern.regex);
      if (match) {
        return parseInt(match[1]) * pattern.multiplier;
      }
    }

    const complexPattern = /^(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?(?:(\d+)ms)?$/;
    const match = timeString.match(complexPattern);

    if (match) {
      const days = parseInt(match[1] || '0');
      const hours = parseInt(match[2] || '0');
      const minutes = parseInt(match[3] || '0');
      const seconds = parseInt(match[4] || '0');
      const milliseconds = parseInt(match[5] || '0');

      return days * 24 * 60 * 60 * 1000 +
             hours * 60 * 60 * 1000 +
             minutes * 60 * 1000 +
             seconds * 1000 +
             milliseconds;
    }

    throw new Error(`Invalid time string format: ${timeString}`);
  }

  public static createEasingFunction(type: EasingType): EasingFunction {
    switch (type) {
      case EasingType.LINEAR:
        return (t: number) => t;

      case EasingType.EASE_IN:
        return (t: number) => t * t;

      case EasingType.EASE_OUT:
        return (t: number) => 1 - Math.pow(1 - t, 2);

      case EasingType.EASE_IN_OUT:
        return (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      case EasingType.BOUNCE:
        return (t: number) => {
          const n1 = 7.5625;
          const d1 = 2.75;

          if (t < 1 / d1) {
            return n1 * t * t;
          } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
          } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
          } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
          }
        };

      case EasingType.ELASTIC:
        return (t: number) => {
          const c4 = (2 * Math.PI) / 3;
          return t === 0 ? 0 : t === 1 ? 1 :
            -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        };

      case EasingType.BACK:
        return (t: number) => {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return c3 * t * t * t - c1 * t * t;
        };

      default:
        return (t: number) => t;
    }
  }

  public static interpolate(from: number, to: number, progress: number, easing?: EasingFunction): number {
    const easedProgress = easing ? easing(progress) : progress;
    return from + (to - from) * easedProgress;
  }

  public static createTimeRange(start: number, end: number): TimeRange {
    return {
      start,
      end,
      duration: end - start
    };
  }

  public static isTimeInRange(time: number, range: TimeRange): boolean {
    return time >= range.start && time <= range.end;
  }

  public static getOverlap(range1: TimeRange, range2: TimeRange): TimeRange | null {
    const start = Math.max(range1.start, range2.start);
    const end = Math.min(range1.end, range2.end);

    if (start <= end) {
      return {
        start,
        end,
        duration: end - start
      };
    }

    return null;
  }

  public static mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
    if (ranges.length === 0) return [];

    const sorted = ranges.sort((a, b) => a.start - b.start);
    const merged: TimeRange[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
        last.duration = last.end - last.start;
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  public static calculateFrameRate(times: SimulationTime[]): number {
    if (times.length < 2) return 0;

    const recentTimes = times.slice(-60);
    let totalDelta = 0;

    for (let i = 1; i < recentTimes.length; i++) {
      totalDelta += recentTimes[i].delta;
    }

    const averageDelta = totalDelta / (recentTimes.length - 1);
    return averageDelta > 0 ? 1000 / averageDelta : 0;
  }

  public static createTimeTransition(
    from: number,
    to: number,
    duration: number,
    easing: EasingType = EasingType.LINEAR
  ): TimeTransition {
    return {
      from,
      to,
      duration,
      easing: this.createEasingFunction(easing)
    };
  }

  public static updateTimeTransition(
    transition: TimeTransition,
    elapsedTime: number
  ): { value: number; completed: boolean } {
    const progress = Math.min(1, elapsedTime / transition.duration);
    const value = this.interpolate(transition.from, transition.to, progress, transition.easing);

    return {
      value,
      completed: progress >= 1
    };
  }

  public static createClock(
    id: string,
    name: string,
    timezone: string = 'UTC',
    format: string = 'ISO'
  ): Clock {
    return {
      id,
      name,
      time: Date.now(),
      timeScale: 1.0,
      timezone,
      format,
      isRunning: false,
      startTime: Date.now(),
      drift: 0
    };
  }

  public static updateClock(clock: Clock, delta: number, realTime: number): void {
    if (clock.isRunning) {
      const scaledDelta = delta * clock.timeScale;
      clock.time += scaledDelta;

      const expectedTime = clock.startTime + (realTime - clock.startTime) * clock.timeScale;
      clock.drift = clock.time - expectedTime;
    }
  }

  public static synchronizeClock(clock: Clock, referenceTime: number): void {
    clock.time = referenceTime;
    clock.drift = 0;
    clock.startTime = Date.now();
  }

  public static getTimeZoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const target = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
      return utc.getTime() - target.getTime();
    } catch (error) {
      (globalThis as any).console?.warn(`Invalid timezone: ${timezone}, using UTC`);
      return 0;
    }
  }

  public static calculateTimeDifference(time1: number, time2: number): {
    difference: number;
    absoluteDifference: number;
    direction: 'past' | 'future' | 'same';
    humanReadable: string;
  } {
    const difference = time2 - time1;
    const absoluteDifference = Math.abs(difference);

    let direction: 'past' | 'future' | 'same';
    if (difference > 0) {
      direction = 'future';
    } else if (difference < 0) {
      direction = 'past';
    } else {
      direction = 'same';
    }

    const humanReadable = this.formatDuration(absoluteDifference);

    return {
      difference,
      absoluteDifference,
      direction,
      humanReadable
    };
  }

  public static isValidTimeRange(range: TimeRange): boolean {
    return range.start <= range.end && range.duration === (range.end - range.start);
  }

  public static normalizeTime(time: number, min: number, max: number): number {
    if (max <= min) {
      throw new Error('Max time must be greater than min time');
    }
    return (time - min) / (max - min);
  }

  public static denormalizeTime(normalizedTime: number, min: number, max: number): number {
    if (max <= min) {
      throw new Error('Max time must be greater than min time');
    }
    return min + normalizedTime * (max - min);
  }

  public static roundToNearestTimeUnit(time: number, unit: TimeUnit): number {
    const unitInMs = this.toMilliseconds(1, unit);
    return Math.round(time / unitInMs) * unitInMs;
  }

  public static getTimeUnitFromDuration(duration: number): TimeUnit {
    if (duration < 1000) return TimeUnit.MILLISECOND;
    if (duration < 60 * 1000) return TimeUnit.SECOND;
    if (duration < 60 * 60 * 1000) return TimeUnit.MINUTE;
    if (duration < 24 * 60 * 60 * 1000) return TimeUnit.HOUR;
    if (duration < 7 * 24 * 60 * 60 * 1000) return TimeUnit.DAY;
    if (duration < 30 * 24 * 60 * 60 * 1000) return TimeUnit.WEEK;
    if (duration < 365 * 24 * 60 * 60 * 1000) return TimeUnit.MONTH;
    return TimeUnit.YEAR;
  }

  public static createTimeStamp(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  public static getDaysInMonth(year: number, month: number): number {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 1 && this.isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month];
  }

  public static addTime(baseTime: number, amount: number, unit: TimeUnit): number {
    return baseTime + this.toMilliseconds(amount, unit);
  }

  public static subtractTime(baseTime: number, amount: number, unit: TimeUnit): number {
    return baseTime - this.toMilliseconds(amount, unit);
  }

  public static getStartOfTimeUnit(time: number, unit: TimeUnit): number {
    const date = new Date(time);

    switch (unit) {
      case TimeUnit.SECOND:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
          date.getHours(), date.getMinutes(), date.getSeconds()).getTime();

      case TimeUnit.MINUTE:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
          date.getHours(), date.getMinutes()).getTime();

      case TimeUnit.HOUR:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
          date.getHours()).getTime();

      case TimeUnit.DAY:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

      case TimeUnit.WEEK:
        const dayOfWeek = date.getDay();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        return new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(),
          startOfWeek.getDate()).getTime();

      case TimeUnit.MONTH:
        return new Date(date.getFullYear(), date.getMonth()).getTime();

      case TimeUnit.YEAR:
        return new Date(date.getFullYear(), 0).getTime();

      default:
        return time;
    }
  }
}