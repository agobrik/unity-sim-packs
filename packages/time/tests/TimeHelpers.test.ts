import { TimeHelpers } from '../utils/TimeHelpers';
import { TimeUnit, EasingType } from '../types';

describe('TimeHelpers', () => {
  describe('Time Unit Conversion', () => {
    test('should convert between time units correctly', () => {
      expect(TimeHelpers.convertTimeUnit(1, TimeUnit.SECOND, TimeUnit.MILLISECOND)).toBe(1000);
      expect(TimeHelpers.convertTimeUnit(1, TimeUnit.MINUTE, TimeUnit.SECOND)).toBe(60);
      expect(TimeHelpers.convertTimeUnit(1, TimeUnit.HOUR, TimeUnit.MINUTE)).toBe(60);
      expect(TimeHelpers.convertTimeUnit(1, TimeUnit.DAY, TimeUnit.HOUR)).toBe(24);
      expect(TimeHelpers.convertTimeUnit(1, TimeUnit.WEEK, TimeUnit.DAY)).toBe(7);
    });

    test('should convert to milliseconds correctly', () => {
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.MILLISECOND)).toBe(1);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.SECOND)).toBe(1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.MINUTE)).toBe(60 * 1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.HOUR)).toBe(60 * 60 * 1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.DAY)).toBe(24 * 60 * 60 * 1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.WEEK)).toBe(7 * 24 * 60 * 60 * 1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.MONTH)).toBe(30 * 24 * 60 * 60 * 1000);
      expect(TimeHelpers.toMilliseconds(1, TimeUnit.YEAR)).toBe(365 * 24 * 60 * 60 * 1000);
    });

    test('should convert from milliseconds correctly', () => {
      expect(TimeHelpers.fromMilliseconds(1000, TimeUnit.SECOND)).toBe(1);
      expect(TimeHelpers.fromMilliseconds(60000, TimeUnit.MINUTE)).toBe(1);
      expect(TimeHelpers.fromMilliseconds(3600000, TimeUnit.HOUR)).toBe(1);
      expect(TimeHelpers.fromMilliseconds(86400000, TimeUnit.DAY)).toBe(1);
    });

    test('should throw error for unknown time unit', () => {
      expect(() => TimeHelpers.toMilliseconds(1, 'unknown' as TimeUnit)).toThrow();
      expect(() => TimeHelpers.fromMilliseconds(1000, 'unknown' as TimeUnit)).toThrow();
    });
  });

  describe('Duration Formatting', () => {
    test('should format milliseconds', () => {
      expect(TimeHelpers.formatDuration(500)).toBe('500.00ms');
      expect(TimeHelpers.formatDuration(999)).toBe('999.00ms');
    });

    test('should format seconds', () => {
      expect(TimeHelpers.formatDuration(1000)).toBe('1.00s');
      expect(TimeHelpers.formatDuration(30000)).toBe('30.00s');
      expect(TimeHelpers.formatDuration(59999)).toBe('59.00s');
    });

    test('should format minutes', () => {
      expect(TimeHelpers.formatDuration(60000)).toBe('1m');
      expect(TimeHelpers.formatDuration(90000)).toBe('1m 30.00s');
      expect(TimeHelpers.formatDuration(3599000)).toBe('59m 59.00s');
    });

    test('should format hours', () => {
      expect(TimeHelpers.formatDuration(3600000)).toBe('1h');
      expect(TimeHelpers.formatDuration(5400000)).toBe('1h 30m');
      expect(TimeHelpers.formatDuration(86399000)).toBe('23h 59m');
    });

    test('should format days', () => {
      expect(TimeHelpers.formatDuration(86400000)).toBe('1d');
      expect(TimeHelpers.formatDuration(90000000)).toBe('1d 1h');
    });

    test('should respect precision parameter', () => {
      expect(TimeHelpers.formatDuration(1500, 1)).toBe('1.5s');
      expect(TimeHelpers.formatDuration(1500, 3)).toBe('1.500s');
    });
  });

  describe('Time Formatting', () => {
    test('should format time with different formats', () => {
      const timestamp = new Date('2023-01-01T12:30:45.000Z').getTime();

      expect(TimeHelpers.formatTime(timestamp, 'ISO')).toContain('2023-01-01T12:30:45');
      expect(TimeHelpers.formatTime(timestamp, 'locale')).toBeDefined();
      expect(TimeHelpers.formatTime(timestamp, 'date')).toContain('2023');
      expect(TimeHelpers.formatTime(timestamp, 'time')).toContain('12:30:45');
      expect(TimeHelpers.formatTime(timestamp, 'UTC')).toContain('2023');
      expect(TimeHelpers.formatTime(timestamp, 'unix')).toBe(Math.floor(timestamp / 1000).toString());
      expect(TimeHelpers.formatTime(timestamp, 'custom')).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    test('should use ISO format by default', () => {
      const timestamp = Date.now();
      const isoFormat = TimeHelpers.formatTime(timestamp, 'ISO');
      const defaultFormat = TimeHelpers.formatTime(timestamp);
      expect(defaultFormat).toBe(isoFormat);
    });
  });

  describe('Time String Parsing', () => {
    test('should parse simple time strings', () => {
      expect(TimeHelpers.parseTimeString('500ms')).toBe(500);
      expect(TimeHelpers.parseTimeString('2s')).toBe(2000);
      expect(TimeHelpers.parseTimeString('3m')).toBe(3 * 60 * 1000);
      expect(TimeHelpers.parseTimeString('4h')).toBe(4 * 60 * 60 * 1000);
      expect(TimeHelpers.parseTimeString('5d')).toBe(5 * 24 * 60 * 60 * 1000);
      expect(TimeHelpers.parseTimeString('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    test('should parse complex time strings', () => {
      expect(TimeHelpers.parseTimeString('1d 2h 3m 4s 500ms')).toBe(
        1 * 24 * 60 * 60 * 1000 +
        2 * 60 * 60 * 1000 +
        3 * 60 * 1000 +
        4 * 1000 +
        500
      );

      expect(TimeHelpers.parseTimeString('30m 15s')).toBe(30 * 60 * 1000 + 15 * 1000);
    });

    test('should throw error for invalid time string', () => {
      expect(() => TimeHelpers.parseTimeString('invalid')).toThrow();
      expect(() => TimeHelpers.parseTimeString('5x')).toThrow();
      expect(() => TimeHelpers.parseTimeString('')).toThrow();
    });
  });

  describe('Easing Functions', () => {
    test('should create linear easing function', () => {
      const linear = TimeHelpers.createEasingFunction(EasingType.LINEAR);
      expect(linear(0)).toBe(0);
      expect(linear(0.5)).toBe(0.5);
      expect(linear(1)).toBe(1);
    });

    test('should create ease-in function', () => {
      const easeIn = TimeHelpers.createEasingFunction(EasingType.EASE_IN);
      expect(easeIn(0)).toBe(0);
      expect(easeIn(0.5)).toBe(0.25);
      expect(easeIn(1)).toBe(1);
    });

    test('should create ease-out function', () => {
      const easeOut = TimeHelpers.createEasingFunction(EasingType.EASE_OUT);
      expect(easeOut(0)).toBe(0);
      expect(easeOut(1)).toBe(1);
      expect(easeOut(0.5)).toBeCloseTo(0.75, 2);
    });

    test('should create ease-in-out function', () => {
      const easeInOut = TimeHelpers.createEasingFunction(EasingType.EASE_IN_OUT);
      expect(easeInOut(0)).toBe(0);
      expect(easeInOut(1)).toBe(1);
      expect(easeInOut(0.5)).toBe(0.5);
    });

    test('should create bounce easing function', () => {
      const bounce = TimeHelpers.createEasingFunction(EasingType.BOUNCE);
      expect(bounce(0)).toBe(0);
      expect(bounce(1)).toBeCloseTo(1, 5);
    });

    test('should create elastic easing function', () => {
      const elastic = TimeHelpers.createEasingFunction(EasingType.ELASTIC);
      expect(elastic(0)).toBe(0);
      expect(elastic(1)).toBe(1);
    });

    test('should create back easing function', () => {
      const back = TimeHelpers.createEasingFunction(EasingType.BACK);
      expect(back(0)).toBe(0);
      expect(back(1)).toBeCloseTo(1, 5);
    });

    test('should default to linear for unknown easing type', () => {
      const unknown = TimeHelpers.createEasingFunction('unknown' as EasingType);
      expect(unknown(0.5)).toBe(0.5);
    });
  });

  describe('Interpolation', () => {
    test('should interpolate between values', () => {
      expect(TimeHelpers.interpolate(0, 100, 0)).toBe(0);
      expect(TimeHelpers.interpolate(0, 100, 0.5)).toBe(50);
      expect(TimeHelpers.interpolate(0, 100, 1)).toBe(100);
      expect(TimeHelpers.interpolate(10, 20, 0.5)).toBe(15);
    });

    test('should interpolate with easing function', () => {
      const easeIn = TimeHelpers.createEasingFunction(EasingType.EASE_IN);
      expect(TimeHelpers.interpolate(0, 100, 0.5, easeIn)).toBe(25);
    });
  });

  describe('Time Range Operations', () => {
    test('should create time range', () => {
      const range = TimeHelpers.createTimeRange(1000, 5000);
      expect(range.start).toBe(1000);
      expect(range.end).toBe(5000);
      expect(range.duration).toBe(4000);
    });

    test('should check if time is in range', () => {
      const range = TimeHelpers.createTimeRange(1000, 5000);
      expect(TimeHelpers.isTimeInRange(2000, range)).toBe(true);
      expect(TimeHelpers.isTimeInRange(500, range)).toBe(false);
      expect(TimeHelpers.isTimeInRange(6000, range)).toBe(false);
      expect(TimeHelpers.isTimeInRange(1000, range)).toBe(true);
      expect(TimeHelpers.isTimeInRange(5000, range)).toBe(true);
    });

    test('should find overlap between ranges', () => {
      const range1 = TimeHelpers.createTimeRange(1000, 5000);
      const range2 = TimeHelpers.createTimeRange(3000, 7000);
      const range3 = TimeHelpers.createTimeRange(6000, 8000);

      const overlap1 = TimeHelpers.getOverlap(range1, range2);
      expect(overlap1).not.toBeNull();
      expect(overlap1?.start).toBe(3000);
      expect(overlap1?.end).toBe(5000);
      expect(overlap1?.duration).toBe(2000);

      const overlap2 = TimeHelpers.getOverlap(range1, range3);
      expect(overlap2).toBeNull();
    });

    test('should merge overlapping time ranges', () => {
      const ranges = [
        TimeHelpers.createTimeRange(1000, 3000),
        TimeHelpers.createTimeRange(2000, 4000),
        TimeHelpers.createTimeRange(6000, 8000),
        TimeHelpers.createTimeRange(7000, 9000)
      ];

      const merged = TimeHelpers.mergeTimeRanges(ranges);
      expect(merged.length).toBe(2);
      expect(merged[0].start).toBe(1000);
      expect(merged[0].end).toBe(4000);
      expect(merged[1].start).toBe(6000);
      expect(merged[1].end).toBe(9000);
    });

    test('should validate time range', () => {
      const validRange = TimeHelpers.createTimeRange(1000, 5000);
      expect(TimeHelpers.isValidTimeRange(validRange)).toBe(true);

      const invalidRange = { start: 5000, end: 1000, duration: 4000 };
      expect(TimeHelpers.isValidTimeRange(invalidRange)).toBe(false);

      const wrongDuration = { start: 1000, end: 5000, duration: 3000 };
      expect(TimeHelpers.isValidTimeRange(wrongDuration)).toBe(false);
    });
  });

  describe('Frame Rate Calculation', () => {
    test('should calculate frame rate from simulation times', () => {
      const times = [
        { current: 0, elapsed: 0, scale: 1, delta: 16.67, frame: 1, isPaused: false, realTime: 100, startTime: 100 },
        { current: 16.67, elapsed: 16.67, scale: 1, delta: 16.67, frame: 2, isPaused: false, realTime: 116.67, startTime: 100 },
        { current: 33.34, elapsed: 33.34, scale: 1, delta: 16.67, frame: 3, isPaused: false, realTime: 133.34, startTime: 100 }
      ];

      const frameRate = TimeHelpers.calculateFrameRate(times);
      expect(frameRate).toBeCloseTo(60, 0);
    });

    test('should return 0 for insufficient data', () => {
      expect(TimeHelpers.calculateFrameRate([])).toBe(0);
      expect(TimeHelpers.calculateFrameRate([
        { current: 0, elapsed: 0, scale: 1, delta: 16.67, frame: 1, isPaused: false, realTime: 100, startTime: 100 }
      ])).toBe(0);
    });
  });

  describe('Time Transitions', () => {
    test('should create time transition', () => {
      const transition = TimeHelpers.createTimeTransition(0, 100, 1000, EasingType.LINEAR);
      expect(transition.from).toBe(0);
      expect(transition.to).toBe(100);
      expect(transition.duration).toBe(1000);
      expect(typeof transition.easing).toBe('function');
    });

    test('should update time transition', () => {
      const transition = TimeHelpers.createTimeTransition(0, 100, 1000, EasingType.LINEAR);

      const result1 = TimeHelpers.updateTimeTransition(transition, 0);
      expect(result1.value).toBe(0);
      expect(result1.completed).toBe(false);

      const result2 = TimeHelpers.updateTimeTransition(transition, 500);
      expect(result2.value).toBe(50);
      expect(result2.completed).toBe(false);

      const result3 = TimeHelpers.updateTimeTransition(transition, 1000);
      expect(result3.value).toBe(100);
      expect(result3.completed).toBe(true);

      const result4 = TimeHelpers.updateTimeTransition(transition, 1500);
      expect(result4.value).toBe(100);
      expect(result4.completed).toBe(true);
    });
  });

  describe('Clock Management', () => {
    test('should create clock', () => {
      const clock = TimeHelpers.createClock('test-clock', 'Test Clock', 'UTC', 'ISO');
      expect(clock.id).toBe('test-clock');
      expect(clock.name).toBe('Test Clock');
      expect(clock.timezone).toBe('UTC');
      expect(clock.format).toBe('ISO');
      expect(clock.timeScale).toBe(1.0);
      expect(clock.isRunning).toBe(false);
      expect(clock.drift).toBe(0);
    });

    test('should update clock time', () => {
      const clock = TimeHelpers.createClock('test', 'Test');
      clock.isRunning = true;
      const initialTime = clock.time;

      TimeHelpers.updateClock(clock, 100, Date.now());
      expect(clock.time).toBe(initialTime + 100);
    });

    test('should not update stopped clock', () => {
      const clock = TimeHelpers.createClock('test', 'Test');
      clock.isRunning = false;
      const initialTime = clock.time;

      TimeHelpers.updateClock(clock, 100, Date.now());
      expect(clock.time).toBe(initialTime);
    });

    test('should synchronize clock', () => {
      const clock = TimeHelpers.createClock('test', 'Test');
      const referenceTime = Date.now();

      TimeHelpers.synchronizeClock(clock, referenceTime);
      expect(clock.time).toBe(referenceTime);
      expect(clock.drift).toBe(0);
    });
  });

  describe('Time Difference Calculation', () => {
    test('should calculate time difference', () => {
      const time1 = Date.now();
      const time2 = time1 + 5000;

      const diff = TimeHelpers.calculateTimeDifference(time1, time2);
      expect(diff.difference).toBe(5000);
      expect(diff.absoluteDifference).toBe(5000);
      expect(diff.direction).toBe('future');
      expect(diff.humanReadable).toBe('5.00s');
    });

    test('should handle past time difference', () => {
      const time1 = Date.now();
      const time2 = time1 - 3000;

      const diff = TimeHelpers.calculateTimeDifference(time1, time2);
      expect(diff.difference).toBe(-3000);
      expect(diff.absoluteDifference).toBe(3000);
      expect(diff.direction).toBe('past');
    });

    test('should handle same time', () => {
      const time = Date.now();
      const diff = TimeHelpers.calculateTimeDifference(time, time);
      expect(diff.difference).toBe(0);
      expect(diff.direction).toBe('same');
    });
  });

  describe('Time Normalization', () => {
    test('should normalize time', () => {
      expect(TimeHelpers.normalizeTime(50, 0, 100)).toBe(0.5);
      expect(TimeHelpers.normalizeTime(0, 0, 100)).toBe(0);
      expect(TimeHelpers.normalizeTime(100, 0, 100)).toBe(1);
      expect(TimeHelpers.normalizeTime(25, 0, 100)).toBe(0.25);
    });

    test('should denormalize time', () => {
      expect(TimeHelpers.denormalizeTime(0.5, 0, 100)).toBe(50);
      expect(TimeHelpers.denormalizeTime(0, 0, 100)).toBe(0);
      expect(TimeHelpers.denormalizeTime(1, 0, 100)).toBe(100);
      expect(TimeHelpers.denormalizeTime(0.25, 0, 100)).toBe(25);
    });

    test('should throw error for invalid range', () => {
      expect(() => TimeHelpers.normalizeTime(50, 100, 0)).toThrow();
      expect(() => TimeHelpers.denormalizeTime(0.5, 100, 0)).toThrow();
    });
  });

  describe('Time Utilities', () => {
    test('should round to nearest time unit', () => {
      expect(TimeHelpers.roundToNearestTimeUnit(1234, TimeUnit.SECOND)).toBe(1000);
      expect(TimeHelpers.roundToNearestTimeUnit(1567, TimeUnit.SECOND)).toBe(2000);
      expect(TimeHelpers.roundToNearestTimeUnit(45000, TimeUnit.MINUTE)).toBe(60000);
    });

    test('should determine appropriate time unit from duration', () => {
      expect(TimeHelpers.getTimeUnitFromDuration(500)).toBe(TimeUnit.MILLISECOND);
      expect(TimeHelpers.getTimeUnitFromDuration(5000)).toBe(TimeUnit.SECOND);
      expect(TimeHelpers.getTimeUnitFromDuration(300000)).toBe(TimeUnit.MINUTE);
      expect(TimeHelpers.getTimeUnitFromDuration(7200000)).toBe(TimeUnit.HOUR);
      expect(TimeHelpers.getTimeUnitFromDuration(172800000)).toBe(TimeUnit.DAY);
    });

    test('should create unique timestamps', () => {
      const timestamp1 = TimeHelpers.createTimeStamp();
      const timestamp2 = TimeHelpers.createTimeStamp();
      expect(timestamp1).not.toBe(timestamp2);
      expect(timestamp1).toMatch(/^\d+_[a-z0-9]+$/);
    });

    test('should check leap years', () => {
      expect(TimeHelpers.isLeapYear(2020)).toBe(true);
      expect(TimeHelpers.isLeapYear(2021)).toBe(false);
      expect(TimeHelpers.isLeapYear(2000)).toBe(true);
      expect(TimeHelpers.isLeapYear(1900)).toBe(false);
    });

    test('should get days in month', () => {
      expect(TimeHelpers.getDaysInMonth(2023, 0)).toBe(31); // January
      expect(TimeHelpers.getDaysInMonth(2023, 1)).toBe(28); // February (non-leap)
      expect(TimeHelpers.getDaysInMonth(2020, 1)).toBe(29); // February (leap)
      expect(TimeHelpers.getDaysInMonth(2023, 3)).toBe(30); // April
    });

    test('should add and subtract time', () => {
      const baseTime = 1000;
      expect(TimeHelpers.addTime(baseTime, 5, TimeUnit.SECOND)).toBe(6000);
      expect(TimeHelpers.subtractTime(baseTime, 500, TimeUnit.MILLISECOND)).toBe(500);
    });
  });
});