/**
 * Mathematical Utilities for Steam Simulation Toolkit
 * Collection of mathematical functions for data analysis and chart calculations
 */

import { Point2D, Point3D } from '../core/types';

export class MathUtils {
  // Constants
  public static readonly PI = Math.PI;
  public static readonly TWO_PI = 2 * Math.PI;
  public static readonly HALF_PI = Math.PI / 2;
  public static readonly EPSILON = 1e-10;

  // Static variables for randomGaussian
  private static hasSpare = false;
  private static spare: number = 0;

  // Basic math operations
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  public static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  public static map(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    const t = (value - fromMin) / (fromMax - fromMin);
    return toMin + (toMax - toMin) * t;
  }

  public static normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  public static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  public static smootherstep(edge0: number, edge1: number, x: number): number {
    const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Trigonometry
  public static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  public static radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  public static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= MathUtils.TWO_PI;
    while (angle < -Math.PI) angle += MathUtils.TWO_PI;
    return angle;
  }

  public static angleBetween(angle1: number, angle2: number): number {
    const diff = angle2 - angle1;
    return MathUtils.normalizeAngle(diff);
  }

  // Statistics
  public static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  public static median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  public static mode(values: number[]): number[] {
    if (values.length === 0) return [];

    const frequency = new Map<number, number>();
    let maxFreq = 0;

    values.forEach(value => {
      const freq = (frequency.get(value) || 0) + 1;
      frequency.set(value, freq);
      maxFreq = Math.max(maxFreq, freq);
    });

    return Array.from(frequency.entries())
      .filter(([_, freq]) => freq === maxFreq)
      .map(([value, _]) => value);
  }

  public static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = MathUtils.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = MathUtils.mean(squaredDiffs);

    return Math.sqrt(variance);
  }

  public static variance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = MathUtils.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));

    return MathUtils.mean(squaredDiffs);
  }

  public static percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return MathUtils.lerp(sorted[lower], sorted[upper], index - lower);
  }

  public static quartiles(values: number[]): { q1: number; q2: number; q3: number } {
    return {
      q1: MathUtils.percentile(values, 25),
      q2: MathUtils.percentile(values, 50),
      q3: MathUtils.percentile(values, 75)
    };
  }

  public static outliers(values: number[], method: 'iqr' | 'zscore' = 'iqr'): number[] {
    if (values.length === 0) return [];

    if (method === 'iqr') {
      const q = MathUtils.quartiles(values);
      const iqr = q.q3 - q.q1;
      const lowerBound = q.q1 - 1.5 * iqr;
      const upperBound = q.q3 + 1.5 * iqr;

      return values.filter(value => value < lowerBound || value > upperBound);
    } else {
      const mean = MathUtils.mean(values);
      const stdDev = MathUtils.standardDeviation(values);
      const threshold = 2; // 2 standard deviations

      return values.filter(value => Math.abs(value - mean) > threshold * stdDev);
    }
  }

  // Correlation and regression
  public static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const meanX = MathUtils.mean(x);
    const meanY = MathUtils.mean(y);

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;

      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  public static linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    if (x.length !== y.length || x.length === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const n = x.length;
    const meanX = MathUtils.mean(x);
    const meanY = MathUtils.mean(y);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      numerator += diffX * (y[i] - meanY);
      denominator += diffX * diffX;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;

    // Calculate R-squared
    let totalSumSquares = 0;
    let residualSumSquares = 0;

    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept;
      totalSumSquares += Math.pow(y[i] - meanY, 2);
      residualSumSquares += Math.pow(y[i] - predicted, 2);
    }

    const r2 = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);

    return { slope, intercept, r2 };
  }

  // Distance calculations
  public static distance2D(p1: Point2D, p2: Point2D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public static distance3D(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public static manhattanDistance2D(p1: Point2D, p2: Point2D): number {
    return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
  }

  public static chebyshevDistance2D(p1: Point2D, p2: Point2D): number {
    return Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  }

  // Vector operations
  public static addVectors(v1: Point2D, v2: Point2D): Point2D {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  }

  public static subtractVectors(v1: Point2D, v2: Point2D): Point2D {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  }

  public static scaleVector(v: Point2D, scale: number): Point2D {
    return { x: v.x * scale, y: v.y * scale };
  }

  public static dotProduct(v1: Point2D, v2: Point2D): number {
    return v1.x * v2.x + v1.y * v2.y;
  }

  public static crossProduct2D(v1: Point2D, v2: Point2D): number {
    return v1.x * v2.y - v1.y * v2.x;
  }

  public static magnitude(v: Point2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  public static normalize2D(v: Point2D): Point2D {
    const mag = MathUtils.magnitude(v);
    return mag === 0 ? { x: 0, y: 0 } : { x: v.x / mag, y: v.y / mag };
  }

  public static angleBetweenVectors(v1: Point2D, v2: Point2D): number {
    const dot = MathUtils.dotProduct(v1, v2);
    const mag1 = MathUtils.magnitude(v1);
    const mag2 = MathUtils.magnitude(v2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = MathUtils.clamp(dot / (mag1 * mag2), -1, 1);
    return Math.acos(cosAngle);
  }

  // Interpolation
  public static bezierCubic(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    return oneMinusTCubed * p0 +
           3 * oneMinusTSquared * t * p1 +
           3 * oneMinusT * tSquared * p2 +
           tCubed * p3;
  }

  public static bezierQuadratic(t: number, p0: number, p1: number, p2: number): number {
    const oneMinusT = 1 - t;
    return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
  }

  public static catmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const t2 = t * t;
    const t3 = t2 * t;

    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  // Geometry
  public static pointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    const x = point.x;
    const y = point.y;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  public static pointInCircle(point: Point2D, center: Point2D, radius: number): boolean {
    return MathUtils.distance2D(point, center) <= radius;
  }

  public static pointInRectangle(point: Point2D, rect: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  }

  public static lineIntersection(
    p1: Point2D, p2: Point2D,
    p3: Point2D, p4: Point2D
  ): Point2D | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < MathUtils.EPSILON) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null; // No intersection within line segments
  }

  // Fourier Transform (simplified DFT for demonstration)
  public static dft(signal: number[]): { real: number[]; imag: number[] } {
    const N = signal.length;
    const real = new Array(N);
    const imag = new Array(N);

    for (let k = 0; k < N; k++) {
      real[k] = 0;
      imag[k] = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real[k] += signal[n] * Math.cos(angle);
        imag[k] += signal[n] * Math.sin(angle);
      }
    }

    return { real, imag };
  }

  // Noise generation
  public static random(min: number = 0, max: number = 1): number {
    return min + Math.random() * (max - min);
  }

  public static randomInt(min: number, max: number): number {
    return Math.floor(MathUtils.random(min, max + 1));
  }

  public static randomGaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    if (MathUtils.hasSpare) {
      MathUtils.hasSpare = false;
      return MathUtils.spare * stdDev + mean;
    }

    MathUtils.hasSpare = true;
    const u = Math.random();
    const v = Math.random();
    const mag = stdDev * Math.sqrt(-2 * Math.log(u));
    MathUtils.spare = mag * Math.cos(2 * Math.PI * v);

    return mag * Math.sin(2 * Math.PI * v) + mean;
  }

  // Utility functions
  public static isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }

    return true;
  }

  public static gcd(a: number, b: number): number {
    a = Math.abs(Math.floor(a));
    b = Math.abs(Math.floor(b));

    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }

    return a;
  }

  public static lcm(a: number, b: number): number {
    return Math.abs(a * b) / MathUtils.gcd(a, b);
  }

  public static factorial(n: number): number {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }

    return result;
  }

  public static fibonacci(n: number): number {
    if (n < 0) return NaN;
    if (n === 0) return 0;
    if (n === 1) return 1;

    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }

    return b;
  }

  public static isNearlyEqual(a: number, b: number, epsilon: number = MathUtils.EPSILON): boolean {
    return Math.abs(a - b) < epsilon;
  }

  public static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  public static getSignificantDigits(value: number, digits: number): number {
    if (value === 0) return 0;

    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const factor = Math.pow(10, digits - 1 - magnitude);

    return Math.round(value * factor) / factor;
  }
}