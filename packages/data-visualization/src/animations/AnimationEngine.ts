/**
 * Animation Engine for Steam Simulation Toolkit
 * Handles smooth chart animations and transitions
 */

import { EventEmitter, timer, perf } from '../utils/EventEmitter';
import { AnimationConfig, AnimationFrame, EasingFunction } from '../core/types';
import { Easing } from './Easing';

export interface Animation {
  id: string;
  target: any;
  properties: Record<string, { from: any; to: any; current?: any }>;
  config: AnimationConfig;
  startTime: number;
  currentTime: number;
  isRunning: boolean;
  isComplete: boolean;
  onUpdate?: (frame: AnimationFrame) => void;
  onComplete?: () => void;
}

export class AnimationEngine extends EventEmitter {
  private animations: Map<string, Animation> = new Map();
  private animationFrame: any = null;
  private isRunning = false;
  private lastTime = 0;

  public createAnimation(
    id: string,
    target: any,
    properties: Record<string, { from: any; to: any }>,
    config: Partial<AnimationConfig> = {}
  ): Animation {
    if (this.animations.has(id)) {
      this.cancelAnimation(id);
    }

    const animation: Animation = {
      id,
      target,
      properties: { ...properties },
      config: {
        duration: config.duration || 1000,
        delay: config.delay || 0,
        easing: config.easing || Easing.easeInOutCubic,
        repeat: config.repeat || 1,
        direction: config.direction || 'normal',
        fillMode: config.fillMode || 'forwards'
      },
      startTime: 0,
      currentTime: 0,
      isRunning: false,
      isComplete: false
    };

    // Initialize current values
    Object.keys(animation.properties).forEach(prop => {
      animation.properties[prop].current = animation.properties[prop].from;
    });

    this.animations.set(id, animation);
    return animation;
  }

  public startAnimation(id: string, onUpdate?: (frame: AnimationFrame) => void, onComplete?: () => void): void {
    const animation = this.animations.get(id);
    if (!animation) {
      throw new Error(`Animation with id '${id}' not found`);
    }

    animation.onUpdate = onUpdate;
    animation.onComplete = onComplete;
    animation.startTime = perf.now() + animation.config.delay!;
    animation.currentTime = 0;
    animation.isRunning = true;
    animation.isComplete = false;

    this.startEngine();
    this.emit('animation-started', id);
  }

  public pauseAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation && animation.isRunning) {
      animation.isRunning = false;
      this.emit('animation-paused', id);
    }
  }

  public resumeAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation && !animation.isRunning && !animation.isComplete) {
      animation.isRunning = true;
      animation.startTime = perf.now() - animation.currentTime;
      this.startEngine();
      this.emit('animation-resumed', id);
    }
  }

  public cancelAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isRunning = false;
      animation.isComplete = true;
      this.animations.delete(id);
      this.emit('animation-cancelled', id);
    }
  }

  public seekAnimation(id: string, progress: number): void {
    const animation = this.animations.get(id);
    if (!animation) return;

    progress = Math.max(0, Math.min(1, progress));
    animation.currentTime = progress * animation.config.duration;

    this.updateAnimation(animation, animation.currentTime);
  }

  public getAnimation(id: string): Animation | null {
    return this.animations.get(id) || null;
  }

  public getAllAnimations(): Animation[] {
    return Array.from(this.animations.values());
  }

  public getRunningAnimations(): Animation[] {
    return Array.from(this.animations.values()).filter(anim => anim.isRunning);
  }

  public cancelAllAnimations(): void {
    Array.from(this.animations.keys()).forEach(id => {
      this.cancelAnimation(id);
    });
  }

  public pauseAllAnimations(): void {
    this.animations.forEach((animation, id) => {
      if (animation.isRunning) {
        this.pauseAnimation(id);
      }
    });
  }

  public resumeAllAnimations(): void {
    this.animations.forEach((animation, id) => {
      if (!animation.isRunning && !animation.isComplete) {
        this.resumeAnimation(id);
      }
    });
  }

  // Predefined animation types
  public fadeIn(
    id: string,
    target: any,
    duration: number = 500,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    this.createAnimation(id, target, {
      opacity: { from: 0, to: 1 }
    }, { duration });

    this.startAnimation(id, onUpdate);
  }

  public fadeOut(
    id: string,
    target: any,
    duration: number = 500,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    this.createAnimation(id, target, {
      opacity: { from: 1, to: 0 }
    }, { duration });

    this.startAnimation(id, onUpdate);
  }

  public slideIn(
    id: string,
    target: any,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number,
    duration: number = 500,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    let fromX = 0, fromY = 0;

    switch (direction) {
      case 'left':
        fromX = -distance;
        break;
      case 'right':
        fromX = distance;
        break;
      case 'up':
        fromY = -distance;
        break;
      case 'down':
        fromY = distance;
        break;
    }

    this.createAnimation(id, target, {
      translateX: { from: fromX, to: 0 },
      translateY: { from: fromY, to: 0 }
    }, { duration });

    this.startAnimation(id, onUpdate);
  }

  public scale(
    id: string,
    target: any,
    fromScale: number,
    toScale: number,
    duration: number = 500,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    this.createAnimation(id, target, {
      scaleX: { from: fromScale, to: toScale },
      scaleY: { from: fromScale, to: toScale }
    }, { duration });

    this.startAnimation(id, onUpdate);
  }

  public bounce(
    id: string,
    target: any,
    intensity: number = 20,
    duration: number = 1000,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    this.createAnimation(id, target, {
      translateY: { from: 0, to: -intensity }
    }, {
      duration: duration / 4,
      easing: Easing.easeOutBounce,
      repeat: 4,
      direction: 'alternate'
    });

    this.startAnimation(id, onUpdate);
  }

  public pulse(
    id: string,
    target: any,
    minScale: number = 0.8,
    maxScale: number = 1.2,
    duration: number = 1000,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    this.createAnimation(id, target, {
      scaleX: { from: minScale, to: maxScale },
      scaleY: { from: minScale, to: maxScale }
    }, {
      duration: duration / 2,
      repeat: 2,
      direction: 'alternate',
      easing: Easing.easeInOutSine
    });

    this.startAnimation(id, onUpdate);
  }

  public morphPath(
    id: string,
    target: any,
    fromPath: any[],
    toPath: any[],
    duration: number = 1000,
    onUpdate?: (frame: AnimationFrame) => void
  ): void {
    if (fromPath.length !== toPath.length) {
      throw new Error('Path arrays must have the same length for morphing');
    }

    const properties: Record<string, { from: any; to: any }> = {};

    fromPath.forEach((fromPoint, index) => {
      const toPoint = toPath[index];
      properties[`point${index}X`] = { from: fromPoint.x, to: toPoint.x };
      properties[`point${index}Y`] = { from: fromPoint.y, to: toPoint.y };
    });

    this.createAnimation(id, target, properties, {
      duration,
      easing: Easing.easeInOutCubic
    });

    this.startAnimation(id, onUpdate);
  }

  private startEngine(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = perf.now();
    this.tick();
  }

  private stopEngine(): void {
    if (this.animationFrame) {
      (globalThis as any).cancelAnimationFrame?.(this.animationFrame);
      this.animationFrame = null;
    }
    this.isRunning = false;
  }

  private tick = (): void => {
    const currentTime = perf.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    let hasRunningAnimations = false;

    this.animations.forEach((animation, id) => {
      if (animation.isRunning) {
        hasRunningAnimations = true;

        if (currentTime >= animation.startTime) {
          animation.currentTime = currentTime - animation.startTime;
          this.updateAnimation(animation, animation.currentTime);

          if (animation.currentTime >= animation.config.duration) {
            this.completeAnimation(animation);
          }
        }
      }
    });

    if (hasRunningAnimations) {
      this.animationFrame = (globalThis as any).requestAnimationFrame?.(this.tick) ||
                          timer.setTimeout(this.tick, 16); // 60fps fallback
    } else {
      this.stopEngine();
    }
  };

  private updateAnimation(animation: Animation, currentTime: number): void {
    const progress = Math.min(currentTime / animation.config.duration, 1);
    const easedProgress = animation.config.easing(progress);

    const frame: AnimationFrame = {
      timestamp: perf.now(),
      progress: easedProgress,
      values: {}
    };

    // Update all animated properties
    Object.keys(animation.properties).forEach(prop => {
      const property = animation.properties[prop];
      const interpolatedValue = this.interpolateValue(
        property.from,
        property.to,
        easedProgress
      );

      property.current = interpolatedValue;
      frame.values[prop] = interpolatedValue;

      // Apply to target if it's a direct property
      if (animation.target && typeof animation.target === 'object') {
        animation.target[prop] = interpolatedValue;
      }
    });

    // Call update callback
    if (animation.onUpdate) {
      animation.onUpdate(frame);
    }

    this.emit('animation-updated', animation.id, frame);
  }

  private completeAnimation(animation: Animation): void {
    animation.isRunning = false;
    animation.isComplete = true;

    // Apply final values based on fill mode
    if (animation.config.fillMode === 'forwards' || animation.config.fillMode === 'both') {
      Object.keys(animation.properties).forEach(prop => {
        const property = animation.properties[prop];
        property.current = property.to;

        if (animation.target && typeof animation.target === 'object') {
          animation.target[prop] = property.to;
        }
      });
    }

    // Call completion callback
    if (animation.onComplete) {
      animation.onComplete();
    }

    this.emit('animation-completed', animation.id);

    // Clean up completed animation
    timer.setTimeout(() => {
      this.animations.delete(animation.id);
    }, 100);
  }

  private interpolateValue(from: any, to: any, progress: number): any {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * progress;
    }

    if (typeof from === 'object' && typeof to === 'object') {
      if (from.r !== undefined && to.r !== undefined) {
        // Color interpolation
        return {
          r: Math.round(from.r + (to.r - from.r) * progress),
          g: Math.round(from.g + (to.g - from.g) * progress),
          b: Math.round(from.b + (to.b - from.b) * progress),
          a: from.a !== undefined ? from.a + (to.a - from.a) * progress : 1
        };
      }

      if (from.x !== undefined && to.x !== undefined) {
        // Point interpolation
        return {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress
        };
      }
    }

    if (Array.isArray(from) && Array.isArray(to) && from.length === to.length) {
      // Array interpolation
      return from.map((fromVal, index) => {
        const toVal = to[index];
        return this.interpolateValue(fromVal, toVal, progress);
      });
    }

    // Default: return 'to' value when progress >= 0.5, otherwise 'from'
    return progress >= 0.5 ? to : from;
  }

  public getPerformanceMetrics(): {
    activeAnimations: number;
    totalAnimations: number;
    engineRunning: boolean;
    averageFrameTime: number;
  } {
    const activeAnimations = this.getRunningAnimations().length;
    const totalAnimations = this.animations.size;

    return {
      activeAnimations,
      totalAnimations,
      engineRunning: this.isRunning,
      averageFrameTime: 16.67 // Approximate, would need proper measurement
    };
  }

  public destroy(): void {
    this.cancelAllAnimations();
    this.stopEngine();
    this.removeAllListeners();
  }
}