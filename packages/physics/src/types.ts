export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Matrix3x3 {
  elements: number[]; // 9 elements in column-major order
}

export interface Matrix4x4 {
  elements: number[]; // 16 elements in column-major order
}

export interface AABB {
  min: Vector3D;
  max: Vector3D;
}

export interface Sphere {
  center: Vector3D;
  radius: number;
}

export interface Plane {
  normal: Vector3D;
  distance: number;
}

export interface Ray {
  origin: Vector3D;
  direction: Vector3D;
}

export interface RigidBodyState {
  position: Vector3D;
  rotation: Quaternion;
  linearVelocity: Vector3D;
  angularVelocity: Vector3D;
  mass: number;
  inverseMass: number;
  inertiaTensor: Matrix3x3;
  inverseInertiaTensor: Matrix3x3;
  restitution: number;
  friction: number;
  isStatic: boolean;
  isKinematic: boolean;
  isActive: boolean;
}

export interface RigidBodyDefinition {
  position?: Vector3D;
  rotation?: Quaternion;
  linearVelocity?: Vector3D;
  angularVelocity?: Vector3D;
  mass?: number;
  restitution?: number;
  friction?: number;
  isStatic?: boolean;
  isKinematic?: boolean;
  shape: CollisionShape;
  material?: PhysicsMaterial;
}

export interface PhysicsMaterial {
  density: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  rollingFriction: number;
}

export interface CollisionShape {
  type: ShapeType;
  data: any;
}

export enum ShapeType {
  BOX = 'box',
  SPHERE = 'sphere',
  CYLINDER = 'cylinder',
  CAPSULE = 'capsule',
  CONE = 'cone',
  PLANE = 'plane',
  MESH = 'mesh',
  CONVEX_HULL = 'convex_hull',
  HEIGHTFIELD = 'heightfield'
}

export interface BoxShape {
  halfExtents: Vector3D;
}

export interface SphereShape {
  radius: number;
}

export interface CylinderShape {
  radius: number;
  height: number;
}

export interface CapsuleShape {
  radius: number;
  height: number;
}

export interface ConeShape {
  radius: number;
  height: number;
}

export interface PlaneShape {
  normal: Vector3D;
  distance: number;
}

export interface MeshShape {
  vertices: Vector3D[];
  indices: number[];
}

export interface ConvexHullShape {
  vertices: Vector3D[];
}

export interface HeightfieldShape {
  width: number;
  height: number;
  heightData: number[];
  scale: Vector3D;
}

export interface Contact {
  pointA: Vector3D;
  pointB: Vector3D;
  normal: Vector3D;
  penetration: number;
  impulse: number;
  tangentImpulse: Vector3D;
  restitution: number;
  friction: number;
}

export interface ContactManifold {
  bodyA: string;
  bodyB: string;
  contacts: Contact[];
  friction: number;
  restitution: number;
  isColliding: boolean;
}

export interface CollisionEvent {
  bodyA: string;
  bodyB: string;
  manifold: ContactManifold;
  impulse: number;
  relativeVelocity: Vector3D;
  timestamp: number;
}

export interface RaycastResult {
  hit: boolean;
  body?: string;
  point?: Vector3D;
  normal?: Vector3D;
  distance?: number;
}

export interface ConstraintDefinition {
  type: ConstraintType;
  bodyA: string;
  bodyB?: string;
  anchorA: Vector3D;
  anchorB?: Vector3D;
  axis?: Vector3D;
  limits?: ConstraintLimits;
  motor?: ConstraintMotor;
  spring?: ConstraintSpring;
}

export enum ConstraintType {
  POINT_TO_POINT = 'point_to_point',
  HINGE = 'hinge',
  SLIDER = 'slider',
  CONE_TWIST = 'cone_twist',
  GENERIC_6DOF = 'generic_6dof',
  SPRING = 'spring',
  DISTANCE = 'distance'
}

export interface ConstraintLimits {
  lower: number;
  upper: number;
  softness: number;
  biasFactor: number;
  relaxationFactor: number;
}

export interface ConstraintMotor {
  targetVelocity: number;
  maxForce: number;
  damping: number;
}

export interface ConstraintSpring {
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface ParticleDefinition {
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  mass: number;
  lifetime: number;
  size: number;
  color: Color;
  material?: ParticleMaterial;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ParticleMaterial {
  texture?: string;
  emissive: boolean;
  transparent: boolean;
  blendMode: BlendMode;
}

export enum BlendMode {
  NORMAL = 'normal',
  ADDITIVE = 'additive',
  MULTIPLY = 'multiply',
  SUBTRACT = 'subtract'
}

export interface ParticleEmitter {
  id: string;
  position: Vector3D;
  direction: Vector3D;
  rate: number;
  burstCount: number;
  lifetime: number;
  shape: EmitterShape;
  velocityRange: VelocityRange;
  sizeRange: Range;
  colorStart: Color;
  colorEnd: Color;
  forces: Vector3D[];
  isActive: boolean;
}

export interface EmitterShape {
  type: EmitterShapeType;
  data: any;
}

export enum EmitterShapeType {
  POINT = 'point',
  SPHERE = 'sphere',
  BOX = 'box',
  CONE = 'cone',
  CYLINDER = 'cylinder',
  MESH = 'mesh'
}

export interface VelocityRange {
  min: Vector3D;
  max: Vector3D;
}

export interface Range {
  min: number;
  max: number;
}

export interface FluidDefinition {
  density: number;
  viscosity: number;
  surfaceTension: number;
  gasConstant: number;
  restDensity: number;
  particleRadius: number;
  supportRadius: number;
}

export interface FluidParticle {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  density: number;
  pressure: number;
  viscosityForce: Vector3D;
  pressureForce: Vector3D;
  surfaceNormal: Vector3D;
  colorField: number;
  neighbors: string[];
}

export interface SoftBodyDefinition {
  vertices: Vector3D[];
  indices: number[];
  mass: number;
  stiffness: number;
  damping: number;
  pressure: number;
  volume: number;
}

export interface SoftBodyNode {
  position: Vector3D;
  velocity: Vector3D;
  force: Vector3D;
  mass: number;
  inverseMass: number;
  isFixed: boolean;
}

export interface SoftBodyEdge {
  nodeA: number;
  nodeB: number;
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface SoftBodyFace {
  nodeA: number;
  nodeB: number;
  nodeC: number;
  normal: Vector3D;
  area: number;
}

export interface PhysicsWorldConfig {
  gravity: Vector3D;
  broadphaseType: BroadphaseType;
  integrationMethod: IntegrationMethod;
  timeStep: number;
  maxSubSteps: number;
  solverIterations: number;
  contactSlop: number;
  sleepThreshold: number;
  enableSleeping: boolean;
  enableCCD: boolean;
  enableFriction: boolean;
  enableRestitution: boolean;
}

export enum BroadphaseType {
  NAIVE = 'naive',
  SPATIAL_HASH = 'spatial_hash',
  OCTREE = 'octree',
  SWEEP_AND_PRUNE = 'sweep_and_prune',
  DYNAMIC_AABB_TREE = 'dynamic_aabb_tree'
}

export enum IntegrationMethod {
  EULER = 'euler',
  VERLET = 'verlet',
  RUNGE_KUTTA = 'runge_kutta',
  LEAPFROG = 'leapfrog'
}

export interface PhysicsDebugConfig {
  drawBodies: boolean;
  drawContacts: boolean;
  drawConstraints: boolean;
  drawAABBs: boolean;
  drawVelocities: boolean;
  drawForces: boolean;
  drawParticles: boolean;
  drawFluid: boolean;
  contactPointSize: number;
  velocityScale: number;
  forceScale: number;
}

export interface PhysicsStats {
  bodies: number;
  activeBodies: number;
  sleepingBodies: number;
  staticBodies: number;
  kinematicBodies: number;
  contacts: number;
  manifolds: number;
  constraints: number;
  particles: number;
  fluidParticles: number;
  simulationTime: number;
  broadphaseTime: number;
  narrowphaseTime: number;
  solverTime: number;
  integrationTime: number;
  fps: number;
}

export interface ForceGenerator {
  id: string;
  type: ForceType;
  bodies: string[];
  magnitude: number;
  direction?: Vector3D;
  position?: Vector3D;
  radius?: number;
  isActive: boolean;
}

export enum ForceType {
  CONSTANT = 'constant',
  GRAVITY = 'gravity',
  SPRING = 'spring',
  DAMPING = 'damping',
  DRAG = 'drag',
  BUOYANCY = 'buoyancy',
  MAGNETIC = 'magnetic',
  EXPLOSION = 'explosion',
  WIND = 'wind'
}

export interface Joint {
  id: string;
  type: JointType;
  bodyA: string;
  bodyB: string;
  anchorA: Vector3D;
  anchorB: Vector3D;
  axis?: Vector3D;
  limits?: JointLimits;
  motor?: JointMotor;
  spring?: JointSpring;
  breakForce?: number;
  breakTorque?: number;
  isBroken: boolean;
}

export enum JointType {
  FIXED = 'fixed',
  REVOLUTE = 'revolute',
  PRISMATIC = 'prismatic',
  SPHERICAL = 'spherical',
  UNIVERSAL = 'universal',
  PLANAR = 'planar',
  GEAR = 'gear',
  RACK_AND_PINION = 'rack_and_pinion'
}

export interface JointLimits {
  lower: number;
  upper: number;
  stiffness: number;
  damping: number;
}

export interface JointMotor {
  targetVelocity: number;
  targetPosition: number;
  maxForce: number;
  maxTorque: number;
  isPositionDriven: boolean;
}

export interface JointSpring {
  restLength: number;
  stiffness: number;
  damping: number;
  preload: number;
}

export interface Trigger {
  id: string;
  shape: CollisionShape;
  position: Vector3D;
  rotation: Quaternion;
  isActive: boolean;
  bodies: Set<string>;
}

export interface TriggerEvent {
  trigger: string;
  body: string;
  eventType: TriggerEventType;
  timestamp: number;
}

export enum TriggerEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  STAY = 'stay'
}

export interface PhysicsQuery {
  type: QueryType;
  shape?: CollisionShape;
  position?: Vector3D;
  rotation?: Quaternion;
  ray?: Ray;
  maxResults?: number;
  layers?: number;
  excludeBodies?: string[];
}

export enum QueryType {
  RAYCAST = 'raycast',
  SHAPECAST = 'shapecast',
  OVERLAP = 'overlap',
  CLOSEST_POINT = 'closest_point'
}

export interface QueryResult {
  body: string;
  point: Vector3D;
  normal: Vector3D;
  distance: number;
  fraction: number;
}

export interface CollisionLayer {
  name: string;
  bit: number;
  collidesWith: number;
}

export interface PhysicsTimestep {
  deltaTime: number;
  fixedTimeStep: number;
  accumulator: number;
  currentTime: number;
  maxSubSteps: number;
  interpolationAlpha: number;
}

export type PhysicsEventHandler = (event: any) => void;
export type CollisionEventHandler = (event: CollisionEvent) => void;
export type TriggerEventHandler = (event: TriggerEvent) => void;

export interface PhysicsProfiler {
  startTiming(name: string): void;
  endTiming(name: string): number;
  getTimings(): Map<string, number>;
  reset(): void;
  getAverageTime(name: string, samples: number): number;
}