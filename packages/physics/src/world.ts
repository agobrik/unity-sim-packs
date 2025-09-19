import {
  PhysicsWorldConfig,
  BroadphaseType,
  IntegrationMethod,
  PhysicsStats,
  PhysicsDebugConfig,
  ForceGenerator,
  ForceType,
  Vector3D,
  Joint,
  Trigger,
  TriggerEvent,
  TriggerEventType,
  CollisionEvent,
  PhysicsEventHandler,
  CollisionEventHandler,
  TriggerEventHandler,
  PhysicsTimestep,
  PhysicsProfiler,
  Ray,
  QueryResult,
  PhysicsQuery
} from './types';
import { Vec3 } from './math';
import { RigidBody, BodyManager } from './bodies';
import { CollisionWorld } from './collision';
import { ConstraintSolver, ImpulseSolver } from './solver';

export class PhysicsWorld {
  private config: PhysicsWorldConfig;
  private bodyManager: BodyManager = new BodyManager();
  private collisionWorld: CollisionWorld = new CollisionWorld();
  private constraintSolver: ConstraintSolver = new ConstraintSolver();
  private impulseSolver: ImpulseSolver = new ImpulseSolver();

  private forceGenerators: Map<string, ForceGenerator> = new Map();
  private joints: Map<string, Joint> = new Map();
  private triggers: Map<string, Trigger> = new Map();

  private eventHandlers: Map<string, PhysicsEventHandler[]> = new Map();
  private stats: PhysicsStats = this.createEmptyStats();
  private profiler: PhysicsProfiler = new SimpleProfiler();

  private currentTime: number = 0;
  private accumulator: number = 0;
  private lastUpdateTime: number = 0;

  private debugConfig: PhysicsDebugConfig = {
    drawBodies: false,
    drawContacts: false,
    drawConstraints: false,
    drawAABBs: false,
    drawVelocities: false,
    drawForces: false,
    drawParticles: false,
    drawFluid: false,
    contactPointSize: 0.1,
    velocityScale: 1.0,
    forceScale: 1.0
  };

  constructor(config: Partial<PhysicsWorldConfig> = {}) {
    this.config = {
      gravity: config.gravity || { x: 0, y: -9.81, z: 0 },
      broadphaseType: config.broadphaseType || BroadphaseType.SPATIAL_HASH,
      integrationMethod: config.integrationMethod || IntegrationMethod.VERLET,
      timeStep: config.timeStep || 1/60,
      maxSubSteps: config.maxSubSteps || 10,
      solverIterations: config.solverIterations || 10,
      contactSlop: config.contactSlop || 0.01,
      sleepThreshold: config.sleepThreshold || 0.1,
      enableSleeping: config.enableSleeping !== false,
      enableCCD: config.enableCCD || false,
      enableFriction: config.enableFriction !== false,
      enableRestitution: config.enableRestitution !== false
    };

    this.constraintSolver.setIterations(this.config.solverIterations);
    this.constraintSolver.setPenetrationSlop(this.config.contactSlop);
  }

  private createEmptyStats(): PhysicsStats {
    return {
      bodies: 0,
      activeBodies: 0,
      sleepingBodies: 0,
      staticBodies: 0,
      kinematicBodies: 0,
      contacts: 0,
      manifolds: 0,
      constraints: 0,
      particles: 0,
      fluidParticles: 0,
      simulationTime: 0,
      broadphaseTime: 0,
      narrowphaseTime: 0,
      solverTime: 0,
      integrationTime: 0,
      fps: 0
    };
  }

  public addBody(body: RigidBody): void {
    this.bodyManager.addBody(body);
    this.collisionWorld.updateBodyAABB(body);
    this.emit('bodyAdded', { body });
  }

  public removeBody(id: string): void {
    const body = this.bodyManager.getBody(id);
    if (body) {
      this.bodyManager.removeBody(id);
      this.collisionWorld.removeBody(id);
      this.emit('bodyRemoved', { body });
    }
  }

  public getBody(id: string): RigidBody | undefined {
    return this.bodyManager.getBody(id);
  }

  public getAllBodies(): RigidBody[] {
    return this.bodyManager.getAllBodies();
  }

  public addForceGenerator(generator: ForceGenerator): void {
    this.forceGenerators.set(generator.id, generator);
  }

  public removeForceGenerator(id: string): void {
    this.forceGenerators.delete(id);
  }

  public addJoint(joint: Joint): void {
    this.joints.set(joint.id, joint);
  }

  public removeJoint(id: string): void {
    this.joints.delete(id);
  }

  public addTrigger(trigger: Trigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  public removeTrigger(id: string): void {
    this.triggers.delete(id);
  }

  public step(deltaTime: number): void {
    this.profiler.startTiming('total');

    const now = (globalThis as any).performance?.now() || Date.now();
    if (this.lastUpdateTime > 0) {
      this.stats.fps = 1000 / (now - this.lastUpdateTime);
    }
    this.lastUpdateTime = now;

    this.currentTime += deltaTime;
    this.accumulator += deltaTime;

    let steps = 0;
    while (this.accumulator >= this.config.timeStep && steps < this.config.maxSubSteps) {
      this.fixedStep(this.config.timeStep);
      this.accumulator -= this.config.timeStep;
      steps++;
    }

    const alpha = this.accumulator / this.config.timeStep;
    this.interpolateStates(alpha);

    this.updateStats();
    this.stats.simulationTime = this.profiler.endTiming('total');
  }

  private fixedStep(deltaTime: number): void {
    this.profiler.startTiming('forces');
    this.applyForces(deltaTime);
    this.profiler.endTiming('forces');

    this.profiler.startTiming('broadphase');
    this.updateAABBs();
    const manifolds = this.collisionWorld.detectCollisions(
      new Map(this.bodyManager.getAllBodies().map(b => [b.id, b]))
    );
    this.stats.broadphaseTime = this.profiler.endTiming('broadphase');

    this.profiler.startTiming('narrowphase');
    this.stats.manifolds = manifolds.length;
    this.stats.contacts = manifolds.reduce((sum, m) => sum + m.contacts.length, 0);
    this.stats.narrowphaseTime = this.profiler.endTiming('narrowphase');

    if (this.config.enableFriction || this.config.enableRestitution) {
      this.profiler.startTiming('solver');
      this.constraintSolver.prepareContacts(manifolds,
        new Map(this.bodyManager.getAllBodies().map(b => [b.id, b])), deltaTime);
      this.constraintSolver.prepareJoints(Array.from(this.joints.values()),
        new Map(this.bodyManager.getAllBodies().map(b => [b.id, b])), deltaTime);
      this.constraintSolver.solveVelocityConstraints();
      this.stats.solverTime = this.profiler.endTiming('solver');

      for (const manifold of manifolds) {
        this.emitCollisionEvent(manifold);
      }
    }

    this.profiler.startTiming('integration');
    this.bodyManager.integrateAllBodies(deltaTime);
    this.stats.integrationTime = this.profiler.endTiming('integration');

    this.bodyManager.clearAllForces();
    this.constraintSolver.clear();

    this.updateTriggers();
  }

  private applyForces(deltaTime: number): void {
    for (const body of this.bodyManager.getActiveBodies()) {
      body.addForce(Vec3.multiply(this.config.gravity, body.state.mass));
    }

    for (const generator of this.forceGenerators.values()) {
      if (!generator.isActive) continue;

      this.applyForceGenerator(generator, deltaTime);
    }
  }

  private applyForceGenerator(generator: ForceGenerator, deltaTime: number): void {
    switch (generator.type) {
      case ForceType.CONSTANT:
        this.applyConstantForce(generator);
        break;
      case ForceType.SPRING:
        this.applySpringForce(generator);
        break;
      case ForceType.DAMPING:
        this.applyDampingForce(generator);
        break;
      case ForceType.DRAG:
        this.applyDragForce(generator);
        break;
      case ForceType.WIND:
        this.applyWindForce(generator);
        break;
    }
  }

  private applyConstantForce(generator: ForceGenerator): void {
    const force = generator.direction ?
      Vec3.multiply(generator.direction, generator.magnitude) :
      { x: 0, y: generator.magnitude, z: 0 };

    for (const bodyId of generator.bodies) {
      const body = this.bodyManager.getBody(bodyId);
      if (body) {
        body.addForce(force);
      }
    }
  }

  private applySpringForce(generator: ForceGenerator): void {
    if (!generator.position || generator.bodies.length < 1) return;

    const anchorPoint = generator.position;
    const restLength = generator.radius || 1.0;
    const springConstant = generator.magnitude;

    for (const bodyId of generator.bodies) {
      const body = this.bodyManager.getBody(bodyId);
      if (body) {
        const displacement = Vec3.subtract(body.state.position, anchorPoint);
        const distance = Vec3.magnitude(displacement);

        if (distance > 0) {
          const extension = distance - restLength;
          const forceDirection = Vec3.normalize(displacement);
          const force = Vec3.multiply(forceDirection, -springConstant * extension);
          body.addForce(force);
        }
      }
    }
  }

  private applyDampingForce(generator: ForceGenerator): void {
    const dampingCoefficient = generator.magnitude;

    for (const bodyId of generator.bodies) {
      const body = this.bodyManager.getBody(bodyId);
      if (body) {
        const dampingForce = Vec3.multiply(body.state.linearVelocity, -dampingCoefficient);
        body.addForce(dampingForce);

        const angularDamping = Vec3.multiply(body.state.angularVelocity, -dampingCoefficient * 0.1);
        body.addTorque(angularDamping);
      }
    }
  }

  private applyDragForce(generator: ForceGenerator): void {
    const dragCoefficient = generator.magnitude;

    for (const bodyId of generator.bodies) {
      const body = this.bodyManager.getBody(bodyId);
      if (body) {
        const velocity = body.state.linearVelocity;
        const speed = Vec3.magnitude(velocity);

        if (speed > 0) {
          const dragDirection = Vec3.normalize(velocity);
          const dragForce = Vec3.multiply(dragDirection, -dragCoefficient * speed * speed);
          body.addForce(dragForce);
        }
      }
    }
  }

  private applyWindForce(generator: ForceGenerator): void {
    const windForce = generator.direction ?
      Vec3.multiply(generator.direction, generator.magnitude) :
      { x: generator.magnitude, y: 0, z: 0 };

    for (const bodyId of generator.bodies) {
      const body = this.bodyManager.getBody(bodyId);
      if (body) {
        body.addForce(windForce);
      }
    }
  }

  private updateAABBs(): void {
    for (const body of this.bodyManager.getAllBodies()) {
      this.collisionWorld.updateBodyAABB(body);
    }
  }

  private interpolateStates(alpha: number): void {
    // Interpolation logic would be implemented here for smooth rendering
  }

  private updateTriggers(): void {
    for (const trigger of this.triggers.values()) {
      if (!trigger.isActive) continue;

      const currentBodies = new Set<string>();

      for (const body of this.bodyManager.getAllBodies()) {
        if (this.isBodyInTrigger(body, trigger)) {
          currentBodies.add(body.id);

          if (!trigger.bodies.has(body.id)) {
            const event: TriggerEvent = {
              trigger: trigger.id,
              body: body.id,
              eventType: TriggerEventType.ENTER,
              timestamp: this.currentTime
            };
            this.emitTriggerEvent(event);
          }
        }
      }

      for (const bodyId of trigger.bodies) {
        if (!currentBodies.has(bodyId)) {
          const event: TriggerEvent = {
            trigger: trigger.id,
            body: bodyId,
            eventType: TriggerEventType.EXIT,
            timestamp: this.currentTime
          };
          this.emitTriggerEvent(event);
        }
      }

      for (const bodyId of currentBodies) {
        if (trigger.bodies.has(bodyId)) {
          const event: TriggerEvent = {
            trigger: trigger.id,
            body: bodyId,
            eventType: TriggerEventType.STAY,
            timestamp: this.currentTime
          };
          this.emitTriggerEvent(event);
        }
      }

      trigger.bodies = currentBodies;
    }
  }

  private isBodyInTrigger(body: RigidBody, trigger: Trigger): boolean {
    return this.collisionWorld.overlapTest(trigger.shape, trigger.position).some(
      result => result.body === body.id
    );
  }

  private emitCollisionEvent(manifold: any): void {
    const event: CollisionEvent = {
      bodyA: manifold.bodyA,
      bodyB: manifold.bodyB,
      manifold,
      impulse: manifold.contacts.reduce((sum: number, c: any) => sum + c.impulse, 0),
      relativeVelocity: { x: 0, y: 0, z: 0 }, // Would be calculated from actual velocities
      timestamp: this.currentTime
    };

    this.emit('collision', event);
  }

  private emitTriggerEvent(event: TriggerEvent): void {
    this.emit('trigger', event);
  }

  private updateStats(): void {
    const allBodies = this.bodyManager.getAllBodies();
    this.stats.bodies = allBodies.length;
    this.stats.activeBodies = this.bodyManager.getActiveBodyCount();
    this.stats.staticBodies = this.bodyManager.getStaticBodyCount();
    this.stats.sleepingBodies = allBodies.filter(b => !b.state.isActive && !b.state.isStatic).length;
    this.stats.kinematicBodies = allBodies.filter(b => b.state.isKinematic).length;
    this.stats.constraints = this.joints.size;
  }

  public raycast(ray: Ray, maxResults: number = 1): QueryResult[] {
    return this.collisionWorld.raycast(ray, maxResults);
  }

  public query(query: PhysicsQuery): QueryResult[] {
    return this.collisionWorld.overlapTest(query.shape!, query.position!, query.maxResults);
  }

  public setGravity(gravity: Vector3D): void {
    this.config.gravity = gravity;
  }

  public getGravity(): Vector3D {
    return this.config.gravity;
  }

  public setTimeStep(timeStep: number): void {
    this.config.timeStep = timeStep;
  }

  public getTimeStep(): number {
    return this.config.timeStep;
  }

  public getStats(): PhysicsStats {
    return { ...this.stats };
  }

  public getProfiler(): PhysicsProfiler {
    return this.profiler;
  }

  public setDebugConfig(config: Partial<PhysicsDebugConfig>): void {
    this.debugConfig = { ...this.debugConfig, ...config };
  }

  public getDebugConfig(): PhysicsDebugConfig {
    return { ...this.debugConfig };
  }

  public on(event: string, handler: PhysicsEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: PhysicsEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  public clear(): void {
    this.bodyManager.clear();
    this.collisionWorld.clear();
    this.constraintSolver.clear();
    this.forceGenerators.clear();
    this.joints.clear();
    this.triggers.clear();
    this.eventHandlers.clear();
    this.stats = this.createEmptyStats();
    this.profiler.reset();
  }

  public serialize(): any {
    return {
      config: this.config,
      bodies: this.bodyManager.getAllBodies().map(b => b.serialize()),
      forceGenerators: Array.from(this.forceGenerators.values()),
      joints: Array.from(this.joints.values()),
      triggers: Array.from(this.triggers.values()),
      currentTime: this.currentTime
    };
  }

  public deserialize(data: any): void {
    this.clear();

    this.config = data.config;
    this.currentTime = data.currentTime || 0;

    for (const bodyData of data.bodies || []) {
      const body = RigidBody.deserialize(bodyData);
      this.addBody(body);
    }

    for (const generator of data.forceGenerators || []) {
      this.addForceGenerator(generator);
    }

    for (const joint of data.joints || []) {
      this.addJoint(joint);
    }

    for (const trigger of data.triggers || []) {
      this.addTrigger(trigger);
    }
  }
}

class SimpleProfiler implements PhysicsProfiler {
  private timings: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  private samples: Map<string, number[]> = new Map();

  startTiming(name: string): void {
    this.startTimes.set(name, (globalThis as any).performance?.now() || Date.now());
  }

  endTiming(name: string): number {
    const startTime = this.startTimes.get(name);
    if (startTime === undefined) return 0;

    const duration = ((globalThis as any).performance?.now() || Date.now()) - startTime;
    this.timings.set(name, duration);
    this.startTimes.delete(name);

    if (!this.samples.has(name)) {
      this.samples.set(name, []);
    }
    const sampleArray = this.samples.get(name)!;
    sampleArray.push(duration);
    if (sampleArray.length > 100) {
      sampleArray.shift();
    }

    return duration;
  }

  getTimings(): Map<string, number> {
    return new Map(this.timings);
  }

  reset(): void {
    this.timings.clear();
    this.startTimes.clear();
    this.samples.clear();
  }

  getAverageTime(name: string, samples: number = 10): number {
    const sampleArray = this.samples.get(name);
    if (!sampleArray || sampleArray.length === 0) return 0;

    const recentSamples = sampleArray.slice(-samples);
    return recentSamples.reduce((sum, time) => sum + time, 0) / recentSamples.length;
  }
}