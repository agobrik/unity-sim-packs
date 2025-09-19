/**
 * Animation System Example
 * Demonstrates advanced timeline and animation capabilities
 * with easing functions, keyframes, and coordinated animations
 */

import { TimeManager, TimeHelpers } from '../src';
import { TimeManagerConfig, EasingType } from '../src/types';

interface AnimatedObject {
  id: string;
  name: string;
  properties: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    color: { r: number; g: number; b: number };
  };
}

interface AnimationKeyframe {
  time: number;
  properties: Partial<AnimatedObject['properties']>;
  easing: EasingType;
  duration: number;
}

class AnimationSystem {
  private timeManager: TimeManager;
  private objects: Map<string, AnimatedObject> = new Map();
  private activeAnimations: Map<string, any> = new Map();
  private animationCallbacks: Map<string, Function[]> = new Map();

  constructor() {
    const config: TimeManagerConfig = {
      baseTimeScale: 1.0,
      maxTimeScale: 5.0,
      tickRate: 60,
      enablePause: true,
      enableRewind: true,
      maxHistorySize: 50,
      eventQueueSize: 200
    };

    this.timeManager = new TimeManager(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.timeManager.on('keyframe_update', (data) => {
      this.handleKeyframeUpdate(data);
    });

    this.timeManager.on('timeline_completed', (data) => {
      (globalThis as any).console?.log(`🎬 Animation "${data.timeline.name}" completed`);
      this.onAnimationComplete(data.timeline.id);
    });

    this.timeManager.on('tick', (data) => {
      this.updateActiveAnimations(data.delta);
    });
  }

  public createObject(id: string, name: string, initialProperties: Partial<AnimatedObject['properties']> = {}): AnimatedObject {
    const obj: AnimatedObject = {
      id,
      name,
      properties: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        color: { r: 255, g: 255, b: 255 },
        ...initialProperties
      }
    };

    this.objects.set(id, obj);
    (globalThis as any).console?.log(`🎯 Created object: ${name} (${id})`);
    return obj;
  }

  public animateObject(
    objectId: string,
    keyframes: AnimationKeyframe[],
    options: {
      loop?: boolean;
      autoReverse?: boolean;
      playbackRate?: number;
      onComplete?: () => void;
      onUpdate?: (progress: number) => void;
    } = {}
  ): string {
    const obj = this.objects.get(objectId);
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    const timelineId = `anim_${objectId}_${Date.now()}`;
    const totalDuration = Math.max(...keyframes.map(k => k.time + k.duration));

    // Convert keyframes to timeline format
    const timelineKeyframes = keyframes.map((keyframe, index) => ({
      id: `keyframe_${index}`,
      time: keyframe.time,
      properties: keyframe.properties,
      easing: TimeHelpers.createEasingFunction(keyframe.easing),
      duration: keyframe.duration,
      metadata: { objectId, keyframeIndex: index }
    }));

    const timeline = {
      id: timelineId,
      name: `Animation for ${obj.name}`,
      events: new Map(),
      keyframes: timelineKeyframes,
      duration: totalDuration,
      loop: options.loop || false,
      autoReverse: options.autoReverse || false,
      currentTime: 0,
      isPlaying: false,
      playbackRate: options.playbackRate || 1.0
    };

    // Store callbacks
    const callbacks: Function[] = [];
    if (options.onComplete) callbacks.push(options.onComplete);
    if (options.onUpdate) callbacks.push(options.onUpdate);
    this.animationCallbacks.set(timelineId, callbacks);

    // Create and start timeline
    this.timeManager.createTimeline(timeline);
    this.timeManager.playTimeline(timelineId);

    (globalThis as any).console?.log(`▶️ Started animation for ${obj.name} (duration: ${TimeHelpers.formatDuration(totalDuration)})`);
    return timelineId;
  }

  private handleKeyframeUpdate(data: any): void {
    const { timeline, keyframe, progress } = data;
    const objectId = keyframe.metadata.objectId;
    const obj = this.objects.get(objectId);

    if (!obj) return;

    // Apply keyframe properties with interpolation
    Object.entries(keyframe.properties).forEach(([prop, targetValue]) => {
      if (prop in obj.properties) {
        const currentValue = (obj.properties as any)[prop];

        if (typeof targetValue === 'number' && typeof currentValue === 'number') {
          (obj.properties as any)[prop] = TimeHelpers.interpolate(
            currentValue,
            targetValue,
            progress,
            keyframe.easing
          );
        } else if (prop === 'color' && typeof targetValue === 'object' && typeof currentValue === 'object') {
          // Handle color interpolation
          const current = currentValue as { r: number; g: number; b: number };
          const target = targetValue as { r: number; g: number; b: number };

          obj.properties.color = {
            r: Math.round(TimeHelpers.interpolate(current.r, target.r, progress, keyframe.easing)),
            g: Math.round(TimeHelpers.interpolate(current.g, target.g, progress, keyframe.easing)),
            b: Math.round(TimeHelpers.interpolate(current.b, target.b, progress, keyframe.easing))
          };
        }
      }
    });

    // Call update callbacks
    const callbacks = this.animationCallbacks.get(timeline.id) || [];
    callbacks.forEach(callback => {
      if (callback.length === 1) { // onUpdate callback
        callback(progress);
      }
    });
  }

  private updateActiveAnimations(delta: number): void {
    // Update any custom animation logic here
    // This is called every frame for additional processing
  }

  private onAnimationComplete(timelineId: string): void {
    const callbacks = this.animationCallbacks.get(timelineId) || [];
    callbacks.forEach(callback => {
      if (callback.length === 0) { // onComplete callback
        callback();
      }
    });

    this.animationCallbacks.delete(timelineId);
  }

  public createFadeInAnimation(objectId: string, duration: number = 1000): string {
    return this.animateObject(objectId, [
      {
        time: 0,
        properties: { opacity: 0 },
        easing: EasingType.EASE_IN,
        duration: 0
      },
      {
        time: duration,
        properties: { opacity: 1 },
        easing: EasingType.EASE_OUT,
        duration: duration
      }
    ]);
  }

  public createSlideAnimation(
    objectId: string,
    fromX: number,
    toX: number,
    fromY: number,
    toY: number,
    duration: number = 1000
  ): string {
    return this.animateObject(objectId, [
      {
        time: 0,
        properties: { x: fromX, y: fromY },
        easing: EasingType.EASE_IN_OUT,
        duration: 0
      },
      {
        time: duration,
        properties: { x: toX, y: toY },
        easing: EasingType.EASE_IN_OUT,
        duration: duration
      }
    ]);
  }

  public createBounceAnimation(objectId: string, bounceHeight: number = 50, duration: number = 2000): string {
    const obj = this.objects.get(objectId);
    if (!obj) throw new Error(`Object ${objectId} not found`);

    const originalY = obj.properties.y;

    return this.animateObject(objectId, [
      {
        time: 0,
        properties: { y: originalY },
        easing: EasingType.EASE_OUT,
        duration: 0
      },
      {
        time: duration * 0.3,
        properties: { y: originalY - bounceHeight },
        easing: EasingType.EASE_OUT,
        duration: duration * 0.3
      },
      {
        time: duration * 0.6,
        properties: { y: originalY },
        easing: EasingType.BOUNCE,
        duration: duration * 0.3
      },
      {
        time: duration * 0.8,
        properties: { y: originalY - bounceHeight * 0.5 },
        easing: EasingType.EASE_OUT,
        duration: duration * 0.2
      },
      {
        time: duration,
        properties: { y: originalY },
        easing: EasingType.BOUNCE,
        duration: duration * 0.2
      }
    ], { loop: true });
  }

  public createColorCycleAnimation(objectId: string, colors: Array<{ r: number; g: number; b: number }>, duration: number = 3000): string {
    const keyframes: AnimationKeyframe[] = [];
    const segmentDuration = duration / colors.length;

    colors.forEach((color, index) => {
      keyframes.push({
        time: index * segmentDuration,
        properties: { color },
        easing: EasingType.LINEAR,
        duration: segmentDuration
      });
    });

    return this.animateObject(objectId, keyframes, { loop: true });
  }

  public createComplexAnimation(objectId: string): string {
    // A complex animation combining multiple properties
    return this.animateObject(objectId, [
      // Phase 1: Scale up and fade in
      {
        time: 0,
        properties: { scale: 0, opacity: 0, rotation: 0 },
        easing: EasingType.EASE_OUT,
        duration: 0
      },
      {
        time: 1000,
        properties: { scale: 1.2, opacity: 1, rotation: 45 },
        easing: EasingType.EASE_OUT,
        duration: 1000
      },
      // Phase 2: Pulse and rotate
      {
        time: 2000,
        properties: { scale: 0.8, rotation: 180 },
        easing: EasingType.EASE_IN_OUT,
        duration: 1000
      },
      {
        time: 3000,
        properties: { scale: 1.0, rotation: 360 },
        easing: EasingType.EASE_IN_OUT,
        duration: 1000
      },
      // Phase 3: Color change and movement
      {
        time: 4000,
        properties: {
          color: { r: 255, g: 100, b: 100 },
          x: 100,
          y: 50
        },
        easing: EasingType.ELASTIC,
        duration: 1500
      },
      // Phase 4: Return to original state
      {
        time: 6000,
        properties: {
          scale: 1,
          opacity: 1,
          rotation: 0,
          color: { r: 255, g: 255, b: 255 },
          x: 0,
          y: 0
        },
        easing: EasingType.BACK,
        duration: 1500
      }
    ]);
  }

  public pauseAnimation(timelineId: string): boolean {
    return this.timeManager.pauseTimeline(timelineId);
  }

  public resumeAnimation(timelineId: string): boolean {
    return this.timeManager.playTimeline(timelineId);
  }

  public stopAnimation(timelineId: string): boolean {
    this.animationCallbacks.delete(timelineId);
    return this.timeManager.removeTimeline(timelineId);
  }

  public getObject(objectId: string): AnimatedObject | undefined {
    return this.objects.get(objectId);
  }

  public getAllObjects(): AnimatedObject[] {
    return Array.from(this.objects.values());
  }

  public logObjectState(objectId: string): void {
    const obj = this.objects.get(objectId);
    if (!obj) {
      (globalThis as any).console?.log(`❌ Object ${objectId} not found`);
      return;
    }

    (globalThis as any).console?.log(`📍 ${obj.name} (${obj.id}):`);
    (globalThis as any).console?.log(`   Position: (${obj.properties.x.toFixed(2)}, ${obj.properties.y.toFixed(2)})`);
    (globalThis as any).console?.log(`   Scale: ${obj.properties.scale.toFixed(2)}`);
    (globalThis as any).console?.log(`   Rotation: ${obj.properties.rotation.toFixed(2)}°`);
    (globalThis as any).console?.log(`   Opacity: ${obj.properties.opacity.toFixed(2)}`);
    (globalThis as any).console?.log(`   Color: rgb(${obj.properties.color.r}, ${obj.properties.color.g}, ${obj.properties.color.b})`);
  }

  public start(): void {
    this.timeManager.play();
  }

  public pause(): void {
    this.timeManager.pause();
  }

  public stop(): void {
    this.timeManager.stop();
  }

  public setTimeScale(scale: number): void {
    this.timeManager.setTimeScale(scale);
  }

  public getMetrics() {
    return this.timeManager.getMetrics();
  }
}

// Example usage and demonstrations
async function runAnimationExamples() {
  (globalThis as any).console?.log('🎬 Animation System Example\n');
  (globalThis as any).console?.log('============================\n');

  const animationSystem = new AnimationSystem();

  // Create some objects to animate
  const logo = animationSystem.createObject('logo', 'Company Logo', {
    x: 0, y: 0, scale: 1, opacity: 1
  });

  const button = animationSystem.createObject('button', 'Menu Button', {
    x: 50, y: 100, scale: 1, opacity: 0
  });

  const particle = animationSystem.createObject('particle', 'Magic Particle', {
    x: 0, y: 0, scale: 0.5, color: { r: 100, g: 200, b: 255 }
  });

  // Start the animation system
  animationSystem.start();

  (globalThis as any).console?.log('🎯 Created 3 animated objects\n');

  // Example 1: Simple fade-in animation
  (globalThis as any).console?.log('Example 1: Fade-in animation');
  const fadeAnim = animationSystem.createFadeInAnimation('button', 2000);

  // Example 2: Slide animation
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\nExample 2: Slide animation');
    animationSystem.createSlideAnimation('logo', 0, 200, 0, 150, 3000);
  }, 1000);

  // Example 3: Bounce animation
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\nExample 3: Bounce animation');
    animationSystem.createBounceAnimation('particle', 75, 2500);
  }, 2000);

  // Example 4: Color cycle animation
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\nExample 4: Color cycle animation');
    const colors = [
      { r: 255, g: 100, b: 100 },
      { r: 100, g: 255, b: 100 },
      { r: 100, g: 100, b: 255 },
      { r: 255, g: 255, b: 100 },
      { r: 255, g: 100, b: 255 }
    ];
    animationSystem.createColorCycleAnimation('logo', colors, 4000);
  }, 3000);

  // Example 5: Complex multi-phase animation
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\nExample 5: Complex animation sequence');
    animationSystem.createComplexAnimation('button');
  }, 4000);

  // Log object states periodically
  const logInterval = setInterval(() => {
    (globalThis as any).console?.log('\n📊 Current Object States:');
    animationSystem.logObjectState('logo');
    animationSystem.logObjectState('button');
    animationSystem.logObjectState('particle');

    const metrics = animationSystem.getMetrics();
    (globalThis as any).console?.log(`\n⚡ Performance: ${metrics.ticksPerSecond.toFixed(1)} FPS, ${metrics.activeTimelines} active animations`);
    (globalThis as any).console?.log('─'.repeat(50));
  }, 5000);

  // Demonstrate time control
  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🏃‍♂️ Speeding up animations to 2x speed');
    animationSystem.setTimeScale(2.0);
  }, 10000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n🐌 Slowing down animations to 0.5x speed');
    animationSystem.setTimeScale(0.5);
  }, 15000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n⏸️ Pausing all animations');
    animationSystem.pause();
  }, 20000);

  (globalThis as any).setTimeout(() => {
    (globalThis as any).console?.log('\n▶️ Resuming all animations');
    animationSystem.setTimeScale(1.0);
    animationSystem.start();
  }, 22000);

  // Final statistics and cleanup
  (globalThis as any).setTimeout(() => {
    clearInterval(logInterval);

    (globalThis as any).console?.log('\n📈 Final Animation Statistics:');
    const metrics = animationSystem.getMetrics();
    (globalThis as any).console?.log('Metrics:', metrics);

    (globalThis as any).console?.log('\n📍 Final Object States:');
    animationSystem.getAllObjects().forEach(obj => {
      animationSystem.logObjectState(obj.id);
    });

    animationSystem.stop();
    (globalThis as any).console?.log('\n✅ Animation system example completed!');
  }, 30000);
}

// Advanced animation builder
class AnimationBuilder {
  private keyframes: AnimationKeyframe[] = [];
  private currentTime: number = 0;

  public fadeIn(duration: number = 1000, easing: EasingType = EasingType.EASE_IN): AnimationBuilder {
    this.keyframes.push({
      time: this.currentTime,
      properties: { opacity: 0 },
      easing,
      duration: 0
    });

    this.currentTime += duration;
    this.keyframes.push({
      time: this.currentTime,
      properties: { opacity: 1 },
      easing,
      duration
    });

    return this;
  }

  public moveTo(x: number, y: number, duration: number = 1000, easing: EasingType = EasingType.EASE_IN_OUT): AnimationBuilder {
    this.currentTime += duration;
    this.keyframes.push({
      time: this.currentTime,
      properties: { x, y },
      easing,
      duration
    });

    return this;
  }

  public scaleTo(scale: number, duration: number = 1000, easing: EasingType = EasingType.EASE_IN_OUT): AnimationBuilder {
    this.currentTime += duration;
    this.keyframes.push({
      time: this.currentTime,
      properties: { scale },
      easing,
      duration
    });

    return this;
  }

  public rotateTo(rotation: number, duration: number = 1000, easing: EasingType = EasingType.LINEAR): AnimationBuilder {
    this.currentTime += duration;
    this.keyframes.push({
      time: this.currentTime,
      properties: { rotation },
      easing,
      duration
    });

    return this;
  }

  public colorTo(color: { r: number; g: number; b: number }, duration: number = 1000, easing: EasingType = EasingType.LINEAR): AnimationBuilder {
    this.currentTime += duration;
    this.keyframes.push({
      time: this.currentTime,
      properties: { color },
      easing,
      duration
    });

    return this;
  }

  public wait(duration: number): AnimationBuilder {
    this.currentTime += duration;
    return this;
  }

  public build(): AnimationKeyframe[] {
    return [...this.keyframes];
  }

  public static create(): AnimationBuilder {
    return new AnimationBuilder();
  }
}

// Example using the animation builder
function demonstrateAnimationBuilder(animationSystem: AnimationSystem) {
  (globalThis as any).console?.log('\n🏗️ Demonstrating Animation Builder');

  const obj = animationSystem.createObject('builder-demo', 'Builder Demo Object');

  const animation = AnimationBuilder.create()
    .fadeIn(1000, EasingType.EASE_OUT)
    .wait(500)
    .moveTo(100, 50, 2000, EasingType.EASE_IN_OUT)
    .scaleTo(1.5, 1000, EasingType.BOUNCE)
    .rotateTo(360, 2000, EasingType.LINEAR)
    .colorTo({ r: 255, g: 100, b: 100 }, 1500, EasingType.EASE_IN_OUT)
    .wait(1000)
    .scaleTo(1.0, 1000, EasingType.BACK)
    .colorTo({ r: 255, g: 255, b: 255 }, 1000, EasingType.EASE_IN_OUT)
    .build();

  animationSystem.animateObject('builder-demo', animation, {
    onComplete: () => (globalThis as any).console?.log('🎉 Builder animation completed!'),
    onUpdate: (progress) => {
      if (Math.floor(progress * 10) % 2 === 0) { // Log every 20%
        (globalThis as any).console?.log(`📊 Builder animation progress: ${(progress * 100).toFixed(0)}%`);
      }
    }
  });
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAnimationExamples().catch((globalThis as any).console?.error);
}

export { AnimationSystem, AnimationBuilder, runAnimationExamples };