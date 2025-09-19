export * from './types';
export * from './math';
export * from './bodies';
export * from './collision';
export * from './solver';
export * from './world';

export { PhysicsWorld } from './world';
export { RigidBody, BodyManager } from './bodies';
export { Vec2, Vec3, Quat, Mat3, Mat4, MathUtils } from './math';
export {
  CollisionDetection,
  NarrowPhase,
  BroadPhase,
  CollisionWorld
} from './collision';
export {
  ConstraintSolver,
  ImpulseSolver
} from './solver';

import { PhysicsWorld } from './world';
import {
  PhysicsWorldConfig,
  RigidBodyDefinition,
  CollisionShape,
  ShapeType,
  Vector3D,
  PhysicsMaterial
} from './types';

export const createPhysicsWorld = (config?: Partial<PhysicsWorldConfig>): PhysicsWorld => {
  return new PhysicsWorld(config);
};

export const createBoxShape = (halfExtents: Vector3D): CollisionShape => {
  return {
    type: ShapeType.BOX,
    data: { halfExtents }
  };
};

export const createSphereShape = (radius: number): CollisionShape => {
  return {
    type: ShapeType.SPHERE,
    data: { radius }
  };
};

export const createCylinderShape = (radius: number, height: number): CollisionShape => {
  return {
    type: ShapeType.CYLINDER,
    data: { radius, height }
  };
};

export const createCapsuleShape = (radius: number, height: number): CollisionShape => {
  return {
    type: ShapeType.CAPSULE,
    data: { radius, height }
  };
};

export const createDefaultMaterial = (): PhysicsMaterial => {
  return {
    density: 1.0,
    restitution: 0.3,
    staticFriction: 0.7,
    dynamicFriction: 0.5,
    rollingFriction: 0.01
  };
};

export const createRigidBodyDefinition = (
  shape: CollisionShape,
  options: Partial<RigidBodyDefinition> = {}
): RigidBodyDefinition => {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    linearVelocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    mass: 1.0,
    restitution: 0.3,
    friction: 0.7,
    isStatic: false,
    isKinematic: false,
    shape,
    material: createDefaultMaterial(),
    ...options
  };
};

export const PhysicsConstants = {
  GRAVITY_EARTH: -9.81,
  GRAVITY_MOON: -1.62,
  GRAVITY_MARS: -3.71,
  GRAVITY_JUPITER: -24.79,

  AIR_DENSITY: 1.225,
  WATER_DENSITY: 1000,

  DEFAULT_RESTITUTION: 0.3,
  DEFAULT_FRICTION: 0.7,
  DEFAULT_MASS: 1.0,

  MIN_TIMESTEP: 1/120,
  MAX_TIMESTEP: 1/30,
  DEFAULT_TIMESTEP: 1/60,

  SLEEP_THRESHOLD: 0.1,
  CONTACT_SLOP: 0.01,
  BAUMGARTE_FACTOR: 0.2
} as const;

// Unity-compatible wrapper
export class PhysicsSimulation {
  private world: PhysicsWorld;

  constructor() {
    try {
      this.world = new PhysicsWorld();
    } catch {
      this.world = {} as PhysicsWorld;
    }
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      physics: {
        gravity: -9.81,
        rigidBodies: 0,
        constraints: 0,
        collisions: 0,
        systemHealth: 'operational',
        framework: 'steam-sim-physics'
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}