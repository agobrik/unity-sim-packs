/**
 * Mathematical Utilities for Supply Chain Simulation
 */

export class MathUtils {
  /**
   * Calculate weighted average
   */
  static weightedAverage(values: number[], weights: number[]): number {
    if (values.length !== weights.length || values.length === 0) {
      throw new Error('Values and weights arrays must be non-empty and same length');
    }

    const weightedSum = values.reduce((sum, value, index) => sum + value * weights[index], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }

  /**
   * Calculate moving average
   */
  static movingAverage(values: number[], windowSize: number): number[] {
    if (windowSize <= 0 || windowSize > values.length) {
      throw new Error('Invalid window size');
    }

    const result: number[] = [];
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(average);
    }

    return result;
  }

  /**
   * Calculate exponential moving average
   */
  static exponentialMovingAverage(values: number[], alpha: number): number[] {
    if (alpha < 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }

    const result: number[] = [];
    let ema = values[0];
    result.push(ema);

    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema;
      result.push(ema);
    }

    return result;
  }

  /**
   * Calculate linear regression
   */
  static linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    if (x.length !== y.length || x.length === 0) {
      throw new Error('X and Y arrays must be non-empty and same length');
    }

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
  }

  /**
   * Calculate distance between two points
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Calculate haversine distance (for geographic coordinates)
   */
  static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Map value from one range to another
   */
  static map(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    const t = (value - fromMin) / (fromMax - fromMin);
    return this.lerp(toMin, toMax, t);
  }

  /**
   * Calculate percentile
   */
  static percentile(values: number[], percentile: number): number {
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate statistical measures
   */
  static statistics(values: number[]): {
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    range: number;
  } {
    if (values.length === 0) {
      throw new Error('Values array cannot be empty');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Mode
    const frequency: { [key: number]: number } = {};
    values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const mode = Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number);

    // Variance and standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

    return { mean, median, mode, standardDeviation, variance, min, max, range };
  }

  /**
   * Generate random number with normal distribution
   */
  static randomNormal(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transformation
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Calculate compound annual growth rate
   */
  static cagr(startValue: number, endValue: number, periods: number): number {
    if (startValue <= 0 || endValue <= 0 || periods <= 0) {
      throw new Error('All values must be positive');
    }
    return Math.pow(endValue / startValue, 1 / periods) - 1;
  }

  /**
   * Calculate net present value
   */
  static npv(rate: number, cashFlows: number[]): number {
    return cashFlows.reduce((npv, cashFlow, index) => {
      return npv + cashFlow / Math.pow(1 + rate, index);
    }, 0);
  }

  /**
   * Calculate internal rate of return (simplified)
   */
  static irr(cashFlows: number[], guess: number = 0.1): number {
    const maxIterations = 1000;
    const tolerance = 1e-6;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      const npvValue = this.npv(rate, cashFlows);
      const npvDerivative = cashFlows.reduce((sum, cashFlow, index) => {
        return sum - index * cashFlow / Math.pow(1 + rate, index + 1);
      }, 0);

      const newRate = rate - npvValue / npvDerivative;

      if (Math.abs(newRate - rate) < tolerance) {
        return newRate;
      }

      rate = newRate;
    }

    throw new Error('IRR calculation did not converge');
  }

  /**
   * Round to specified decimal places
   */
  static round(value: number, decimals: number = 0): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Check if number is within tolerance
   */
  static isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
    return Math.abs(actual - expected) <= tolerance;
  }
}