/**
 * Easing Functions for Steam Simulation Toolkit Animations
 * Collection of common easing functions for smooth animations
 */

import { EasingFunction } from '../core/types';

export class Easing {
  // Linear easing
  public static linear: EasingFunction = (t: number): number => t;

  // Quadratic easing
  public static easeInQuad: EasingFunction = (t: number): number => t * t;

  public static easeOutQuad: EasingFunction = (t: number): number => t * (2 - t);

  public static easeInOutQuad: EasingFunction = (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // Cubic easing
  public static easeInCubic: EasingFunction = (t: number): number => t * t * t;

  public static easeOutCubic: EasingFunction = (t: number): number => {
    const t1 = t - 1;
    return t1 * t1 * t1 + 1;
  };

  public static easeInOutCubic: EasingFunction = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

  // Quartic easing
  public static easeInQuart: EasingFunction = (t: number): number => t * t * t * t;

  public static easeOutQuart: EasingFunction = (t: number): number => {
    const t1 = t - 1;
    return 1 - t1 * t1 * t1 * t1;
  };

  public static easeInOutQuart: EasingFunction = (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (t - 1) * (t - 1) * (t - 1) * (t - 1);

  // Quintic easing
  public static easeInQuint: EasingFunction = (t: number): number => t * t * t * t * t;

  public static easeOutQuint: EasingFunction = (t: number): number => {
    const t1 = t - 1;
    return 1 + t1 * t1 * t1 * t1 * t1;
  };

  public static easeInOutQuint: EasingFunction = (t: number): number =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (t - 1) * (t - 1) * (t - 1) * (t - 1) * (t - 1);

  // Sine easing
  public static easeInSine: EasingFunction = (t: number): number =>
    1 - Math.cos(t * Math.PI / 2);

  public static easeOutSine: EasingFunction = (t: number): number =>
    Math.sin(t * Math.PI / 2);

  public static easeInOutSine: EasingFunction = (t: number): number =>
    -(Math.cos(Math.PI * t) - 1) / 2;

  // Exponential easing
  public static easeInExpo: EasingFunction = (t: number): number =>
    t === 0 ? 0 : Math.pow(2, 10 * (t - 1));

  public static easeOutExpo: EasingFunction = (t: number): number =>
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

  public static easeInOutExpo: EasingFunction = (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  };

  // Circular easing
  public static easeInCirc: EasingFunction = (t: number): number =>
    1 - Math.sqrt(1 - t * t);

  public static easeOutCirc: EasingFunction = (t: number): number =>
    Math.sqrt(1 - (t - 1) * (t - 1));

  public static easeInOutCirc: EasingFunction = (t: number): number =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;

  // Back easing
  public static easeInBack: EasingFunction = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  };

  public static easeOutBack: EasingFunction = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  public static easeInOutBack: EasingFunction = (t: number): number => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  };

  // Elastic easing
  public static easeInElastic: EasingFunction = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  };

  public static easeOutElastic: EasingFunction = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  };

  public static easeInOutElastic: EasingFunction = (t: number): number => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  };

  // Bounce easing
  public static easeInBounce: EasingFunction = (t: number): number =>
    1 - Easing.easeOutBounce(1 - t);

  public static easeOutBounce: EasingFunction = (t: number): number => {
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

  public static easeInOutBounce: EasingFunction = (t: number): number =>
    t < 0.5
      ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easing.easeOutBounce(2 * t - 1)) / 2;

  // Custom easing functions
  public static easeInOutSmoothStep: EasingFunction = (t: number): number =>
    t * t * (3 - 2 * t);

  public static easeInOutSmootherStep: EasingFunction = (t: number): number =>
    t * t * t * (t * (t * 6 - 15) + 10);

  // Parametric easing functions
  public static createBezierEasing(x1: number, y1: number, x2: number, y2: number): EasingFunction {
    return (t: number): number => {
      // Simplified cubic Bezier approximation
      // For a more accurate implementation, you'd solve the cubic Bezier equation
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;

      const cy = 3 * y1;
      const by = 3 * (y2 - y1) - cy;
      const ay = 1 - cy - by;

      const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
      const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;

      // Binary search to find t for given x
      let t1 = 0, t2 = 1, epsilon = 0.001;
      let currentT = t;
      let currentX = sampleCurveX(currentT) - t;

      while (Math.abs(currentX) > epsilon && t1 < t2) {
        if (currentX > 0) {
          t2 = currentT;
        } else {
          t1 = currentT;
        }
        currentT = (t1 + t2) / 2;
        currentX = sampleCurveX(currentT) - t;
      }

      return sampleCurveY(currentT);
    };
  }

  public static createSpringEasing(damping: number = 0.8, stiffness: number = 0.3): EasingFunction {
    return (t: number): number => {
      if (t === 0 || t === 1) return t;

      const oscillation = Math.sin(t * Math.PI * stiffness * 10);
      const decay = Math.pow(damping, t * 10);

      return t - (oscillation * decay * (1 - t));
    };
  }

  public static createAnticipateEasing(tension: number = 2): EasingFunction {
    return (t: number): number => t * t * ((tension + 1) * t - tension);
  }

  public static createOvershootEasing(tension: number = 2): EasingFunction {
    return (t: number): number => {
      const t1 = t - 1;
      return t1 * t1 * ((tension + 1) * t1 + tension) + 1;
    };
  }

  // Utility functions
  public static chain(...easings: EasingFunction[]): EasingFunction {
    return (t: number): number => {
      const segment = Math.floor(t * easings.length);
      const localT = (t * easings.length) % 1;
      const easing = easings[Math.min(segment, easings.length - 1)];
      return easing(localT);
    };
  }

  public static reverse(easing: EasingFunction): EasingFunction {
    return (t: number): number => 1 - easing(1 - t);
  }

  public static mirror(easing: EasingFunction): EasingFunction {
    return (t: number): number =>
      t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2;
  }

  public static scale(easing: EasingFunction, factor: number): EasingFunction {
    return (t: number): number => easing(t) * factor;
  }

  public static combine(easing1: EasingFunction, easing2: EasingFunction, weight: number = 0.5): EasingFunction {
    return (t: number): number =>
      easing1(t) * (1 - weight) + easing2(t) * weight;
  }

  // Get all available easing functions
  public static getAllEasings(): Record<string, EasingFunction> {
    return {
      linear: Easing.linear,
      easeInQuad: Easing.easeInQuad,
      easeOutQuad: Easing.easeOutQuad,
      easeInOutQuad: Easing.easeInOutQuad,
      easeInCubic: Easing.easeInCubic,
      easeOutCubic: Easing.easeOutCubic,
      easeInOutCubic: Easing.easeInOutCubic,
      easeInQuart: Easing.easeInQuart,
      easeOutQuart: Easing.easeOutQuart,
      easeInOutQuart: Easing.easeInOutQuart,
      easeInQuint: Easing.easeInQuint,
      easeOutQuint: Easing.easeOutQuint,
      easeInOutQuint: Easing.easeInOutQuint,
      easeInSine: Easing.easeInSine,
      easeOutSine: Easing.easeOutSine,
      easeInOutSine: Easing.easeInOutSine,
      easeInExpo: Easing.easeInExpo,
      easeOutExpo: Easing.easeOutExpo,
      easeInOutExpo: Easing.easeInOutExpo,
      easeInCirc: Easing.easeInCirc,
      easeOutCirc: Easing.easeOutCirc,
      easeInOutCirc: Easing.easeInOutCirc,
      easeInBack: Easing.easeInBack,
      easeOutBack: Easing.easeOutBack,
      easeInOutBack: Easing.easeInOutBack,
      easeInElastic: Easing.easeInElastic,
      easeOutElastic: Easing.easeOutElastic,
      easeInOutElastic: Easing.easeInOutElastic,
      easeInBounce: Easing.easeInBounce,
      easeOutBounce: Easing.easeOutBounce,
      easeInOutBounce: Easing.easeInOutBounce,
      easeInOutSmoothStep: Easing.easeInOutSmoothStep,
      easeInOutSmootherStep: Easing.easeInOutSmootherStep
    };
  }

  public static getEasingByName(name: string): EasingFunction | null {
    const easings = Easing.getAllEasings();
    return easings[name] || null;
  }
}