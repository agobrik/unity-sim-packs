export interface SimulationConfig {
  timeStep: number;
  maxSteps: number;
  precision: number;
  randomSeed?: number;
  parallelization?: ParallelizationConfig;
  optimization?: OptimizationConfig;
}

export interface ParallelizationConfig {
  enabled: boolean;
  threadCount?: number;
  strategy: ParallelizationStrategy;
  chunkSize?: number;
}

export enum ParallelizationStrategy {
  THREAD_POOL = 'thread_pool',
  WORKER_THREADS = 'worker_threads',
  CLUSTER = 'cluster',
  WEB_WORKERS = 'web_workers'
}

export interface OptimizationConfig {
  spatialHashing: boolean;
  levelOfDetail: boolean;
  culling: CullingConfig;
  caching: CachingConfig;
}

export interface CullingConfig {
  frustumCulling: boolean;
  occlusionCulling: boolean;
  distanceCulling: boolean;
  maxDistance?: number;
}

export interface CachingConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  strategy: CacheStrategy;
}

export enum CacheStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  ADAPTIVE = 'adaptive'
}

export interface SimulationStep {
  id: string;
  name: string;
  order: number;
  enabled: boolean;
  dependencies: string[];
  execute(context: SimulationContext, deltaTime: number): Promise<void> | void;
  validate?(context: SimulationContext): boolean;
  cleanup?(): void;
}

export interface SimulationContext {
  currentTime: number;
  deltaTime: number;
  stepCount: number;
  entities: EntityManager;
  resources: ResourceManager;
  events: EventSystem;
  random: RandomGenerator;
  profiler: Profiler;
  [key: string]: any;
}

export interface EntityManager {
  create(data?: any): Entity;
  get(id: string): Entity | undefined;
  query(filter: EntityFilter): Entity[];
  update(id: string, data: any): void;
  destroy(id: string): void;
  clear(): void;
  count(): number;
}

export interface Entity {
  id: string;
  type: string;
  data: Record<string, any>;
  active: boolean;
  created: number;
  updated: number;
}

export interface EntityFilter {
  type?: string;
  active?: boolean;
  hasComponents?: string[];
  customFilter?(entity: Entity): boolean;
}

export interface ResourceManager {
  allocate<T>(type: string, count: number): T[];
  deallocate<T>(type: string, resources: T[]): void;
  get<T>(type: string): T[];
  clear(): void;
  getUsage(): ResourceUsage;
}

export interface ResourceUsage {
  allocated: Record<string, number>;
  used: Record<string, number>;
  peak: Record<string, number>;
  efficiency: number;
}

export interface EventSystem {
  emit(event: SimulationEvent): void;
  on(type: string, handler: EventHandler): void;
  off(type: string, handler: EventHandler): void;
  once(type: string, handler: EventHandler): void;
  clear(): void;
}

export interface SimulationEvent {
  type: string;
  data: any;
  timestamp: number;
  source?: string;
}

export type EventHandler = (event: SimulationEvent) => void;

export interface RandomGenerator {
  seed(value: number): void;
  random(): number;
  randomInt(min: number, max: number): number;
  randomFloat(min: number, max: number): number;
  randomBool(probability?: number): boolean;
  randomChoice<T>(array: T[]): T;
  randomGaussian(mean: number, stdDev: number): number;
  randomPoisson(lambda: number): number;
  randomExponential(lambda: number): number;
}

export interface Profiler {
  startTimer(name: string): void;
  endTimer(name: string): number;
  mark(name: string): void;
  measure(name: string, startMark: string, endMark: string): number;
  getResults(): ProfilerResults;
  reset(): void;
}

export interface ProfilerResults {
  timers: Record<string, TimerStats>;
  measures: Record<string, number>;
  marks: Record<string, number>;
  memory: MemoryStats;
}

export interface TimerStats {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface MemoryStats {
  used: number;
  allocated: number;
  peak: number;
  collections: number;
}

export interface Algorithm {
  id: string;
  name: string;
  version: string;
  description: string;
  category: AlgorithmCategory;
  complexity: ComplexityInfo;
  parameters: AlgorithmParameter[];
  execute(input: any, parameters?: Record<string, any>): AlgorithmResult;
  validate?(input: any, parameters?: Record<string, any>): ValidationResult;
}

export enum AlgorithmCategory {
  PATHFINDING = 'pathfinding',
  PHYSICS = 'physics',
  OPTIMIZATION = 'optimization',
  SEARCH = 'search',
  SORTING = 'sorting',
  GRAPH = 'graph',
  MACHINE_LEARNING = 'machine_learning',
  NUMERICAL = 'numerical',
  GENETIC = 'genetic',
  CELLULAR_AUTOMATA = 'cellular_automata',
  PARTICLE_SYSTEMS = 'particle_systems',
  FLUID_DYNAMICS = 'fluid_dynamics',
  CROWD_SIMULATION = 'crowd_simulation'
}

export interface ComplexityInfo {
  time: ComplexityNotation;
  space: ComplexityNotation;
  description?: string;
}

export enum ComplexityNotation {
  CONSTANT = 'O(1)',
  LOGARITHMIC = 'O(log n)',
  LINEAR = 'O(n)',
  LINEARITHMIC = 'O(n log n)',
  QUADRATIC = 'O(n²)',
  CUBIC = 'O(n³)',
  EXPONENTIAL = 'O(2^n)',
  FACTORIAL = 'O(n!)'
}

export interface AlgorithmParameter {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  defaultValue?: any;
  constraints?: ParameterConstraints;
}

export enum ParameterType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FUNCTION = 'function',
  ENUM = 'enum'
}

export interface ParameterConstraints {
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  options?: string[];
  validator?: (value: any) => boolean;
}

export interface AlgorithmResult {
  success: boolean;
  result?: any;
  error?: string;
  metrics: AlgorithmMetrics;
  metadata?: Record<string, any>;
}

export interface AlgorithmMetrics {
  executionTime: number;
  memoryUsage: number;
  iterations: number;
  convergence?: ConvergenceInfo;
}

export interface ConvergenceInfo {
  converged: boolean;
  iterations: number;
  tolerance: number;
  finalError: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PathfindingNode {
  id: string;
  x: number;
  y: number;
  z?: number;
  walkable: boolean;
  cost: number;
  heuristic?: number;
  parent?: PathfindingNode;
  gCost: number;
  hCost: number;
  fCost: number;
}

export interface PathfindingGrid {
  width: number;
  height: number;
  depth?: number;
  nodes: PathfindingNode[][][];
  getNode(x: number, y: number, z?: number): PathfindingNode | undefined;
  getNeighbors(node: PathfindingNode): PathfindingNode[];
  isWalkable(x: number, y: number, z?: number): boolean;
}

export interface PathfindingRequest {
  start: { x: number; y: number; z?: number };
  goal: { x: number; y: number; z?: number };
  grid: PathfindingGrid;
  algorithm: PathfindingAlgorithm;
  heuristic?: HeuristicFunction;
  options?: PathfindingOptions;
}

export enum PathfindingAlgorithm {
  A_STAR = 'a_star',
  DIJKSTRA = 'dijkstra',
  BREADTH_FIRST = 'breadth_first',
  DEPTH_FIRST = 'depth_first',
  GREEDY_BEST_FIRST = 'greedy_best_first',
  JPS = 'jump_point_search',
  THETA_STAR = 'theta_star',
  HIERARCHICAL = 'hierarchical'
}

export enum HeuristicFunction {
  MANHATTAN = 'manhattan',
  EUCLIDEAN = 'euclidean',
  CHEBYSHEV = 'chebyshev',
  OCTILE = 'octile',
  CUSTOM = 'custom'
}

export interface PathfindingOptions {
  allowDiagonal?: boolean;
  cutCorners?: boolean;
  weight?: number;
  maxSearchNodes?: number;
  timeout?: number;
  smoothPath?: boolean;
}

export interface PathfindingResult {
  path: PathfindingNode[];
  cost: number;
  searchedNodes: number;
  found: boolean;
  executionTime: number;
}

export interface OptimizationProblem {
  objectiveFunction: (variables: number[]) => number;
  constraints: OptimizationConstraint[];
  variables: OptimizationVariable[];
  bounds?: OptimizationBounds;
  type: OptimizationType;
}

export interface OptimizationConstraint {
  type: ConstraintType;
  function: (variables: number[]) => number;
  bound: number;
  tolerance?: number;
}

export enum ConstraintType {
  EQUALITY = 'equality',
  INEQUALITY = 'inequality',
  BOUNDS = 'bounds'
}

export interface OptimizationVariable {
  name: string;
  initialValue: number;
  bounds?: { min: number; max: number };
  type: VariableType;
}

export enum VariableType {
  CONTINUOUS = 'continuous',
  INTEGER = 'integer',
  BINARY = 'binary'
}

export interface OptimizationBounds {
  lower: number[];
  upper: number[];
}

export enum OptimizationType {
  MINIMIZE = 'minimize',
  MAXIMIZE = 'maximize'
}

export interface OptimizationResult {
  solution: number[];
  objectiveValue: number;
  converged: boolean;
  iterations: number;
  executionTime: number;
  message: string;
}

export interface GeneticAlgorithmConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  selectionMethod: SelectionMethod;
  crossoverMethod: CrossoverMethod;
  mutationMethod: MutationMethod;
  fitnessFunction: (individual: any) => number;
  convergenceTolerance?: number;
  maxStagnantGenerations?: number;
}

export enum SelectionMethod {
  TOURNAMENT = 'tournament',
  ROULETTE = 'roulette',
  RANK = 'rank',
  ELITISM = 'elitism',
  RANDOM = 'random'
}

export enum CrossoverMethod {
  SINGLE_POINT = 'single_point',
  TWO_POINT = 'two_point',
  UNIFORM = 'uniform',
  ARITHMETIC = 'arithmetic',
  BLEND = 'blend'
}

export enum MutationMethod {
  GAUSSIAN = 'gaussian',
  UNIFORM = 'uniform',
  BOUNDARY = 'boundary',
  NON_UNIFORM = 'non_uniform',
  POLYNOMIAL = 'polynomial'
}

export interface Individual {
  id: string;
  genes: any[];
  fitness: number;
  age: number;
  generation: number;
}

export interface Population {
  individuals: Individual[];
  generation: number;
  bestIndividual: Individual;
  averageFitness: number;
  diversity: number;
}

export interface CellularAutomaton {
  id: string;
  name: string;
  dimensions: number;
  size: number[];
  states: CellState[];
  rules: CellRule[];
  neighborhood: NeighborhoodType;
  boundaryCondition: BoundaryCondition;
  currentGeneration: number;
  maxGenerations?: number;
}

export interface CellState {
  id: string;
  name: string;
  value: any;
  color?: string;
  probability?: number;
}

export interface CellRule {
  id: string;
  name: string;
  condition: (cell: Cell, neighbors: Cell[]) => boolean;
  action: (cell: Cell, neighbors: Cell[]) => CellState;
  priority: number;
}

export interface Cell {
  id: string;
  position: number[];
  state: CellState;
  previousState?: CellState;
  neighbors: Cell[];
  data?: Record<string, any>;
}

export enum NeighborhoodType {
  MOORE = 'moore',
  VON_NEUMANN = 'von_neumann',
  HEXAGONAL = 'hexagonal',
  CUSTOM = 'custom'
}

export enum BoundaryCondition {
  PERIODIC = 'periodic',
  FIXED = 'fixed',
  REFLECTIVE = 'reflective',
  ABSORBING = 'absorbing'
}

export interface FluidSimulationConfig {
  gridSize: { width: number; height: number; depth?: number };
  cellSize: number;
  density: number;
  viscosity: number;
  diffusion: number;
  velocityDamping: number;
  pressureIterations: number;
  boundaryConditions: FluidBoundaryConditions;
  forces: FluidForce[];
}

export interface FluidBoundaryConditions {
  left: FluidBoundaryType;
  right: FluidBoundaryType;
  top: FluidBoundaryType;
  bottom: FluidBoundaryType;
  front?: FluidBoundaryType;
  back?: FluidBoundaryType;
}

export enum FluidBoundaryType {
  WALL = 'wall',
  OPEN = 'open',
  PERIODIC = 'periodic',
  INFLOW = 'inflow',
  OUTFLOW = 'outflow'
}

export interface FluidForce {
  type: ForceType;
  strength: number;
  position?: { x: number; y: number; z?: number };
  radius?: number;
  direction?: { x: number; y: number; z?: number };
}

export enum ForceType {
  GRAVITY = 'gravity',
  WIND = 'wind',
  VORTEX = 'vortex',
  SOURCE = 'source',
  SINK = 'sink',
  CUSTOM = 'custom'
}

export interface FluidCell {
  x: number;
  y: number;
  z?: number;
  density: number;
  velocity: { x: number; y: number; z?: number };
  pressure: number;
  temperature?: number;
  divergence?: number;
  vorticity?: number;
}

export interface ParticleSystemConfig {
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  velocity: { min: VectorRange; max: VectorRange };
  acceleration: VectorRange;
  size: { min: number; max: number };
  color: { start: Color; end: Color };
  opacity: { start: number; end: number };
  forces: ParticleForce[];
  constraints: ParticleConstraint[];
}

export interface VectorRange {
  x: number;
  y: number;
  z?: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Particle {
  id: string;
  position: VectorRange;
  velocity: VectorRange;
  acceleration: VectorRange;
  size: number;
  color: Color;
  opacity: number;
  lifetime: number;
  age: number;
  active: boolean;
  data?: Record<string, any>;
}

export interface ParticleForce {
  type: ParticleForceType;
  strength: number;
  position?: VectorRange;
  radius?: number;
  falloff?: FalloffType;
}

export enum ParticleForceType {
  GRAVITY = 'gravity',
  DRAG = 'drag',
  MAGNETIC = 'magnetic',
  SPRING = 'spring',
  ATTRACTION = 'attraction',
  REPULSION = 'repulsion'
}

export enum FalloffType {
  LINEAR = 'linear',
  QUADRATIC = 'quadratic',
  EXPONENTIAL = 'exponential',
  CONSTANT = 'constant'
}

export interface ParticleConstraint {
  type: ParticleConstraintType;
  parameters: Record<string, any>;
}

export enum ParticleConstraintType {
  BOX = 'box',
  SPHERE = 'sphere',
  PLANE = 'plane',
  CYLINDER = 'cylinder',
  CUSTOM = 'custom'
}

export interface CrowdSimulationConfig {
  agents: CrowdAgentConfig[];
  environment: CrowdEnvironment;
  behaviors: CrowdBehavior[];
  socialForces: SocialForce[];
  pathfinding: PathfindingConfig;
  visualization?: CrowdVisualizationConfig;
}

export interface CrowdAgentConfig {
  count: number;
  radius: number;
  maxSpeed: number;
  maxAcceleration: number;
  mass: number;
  personality: PersonalityTraits;
  goals: AgentGoal[];
}

export interface PersonalityTraits {
  aggressiveness: number;
  patience: number;
  socialDistance: number;
  riskTolerance: number;
  groupAffinity: number;
}

export interface AgentGoal {
  type: GoalType;
  position: { x: number; y: number };
  priority: number;
  radius?: number;
  condition?: (agent: CrowdAgent) => boolean;
}

export enum GoalType {
  SEEK = 'seek',
  AVOID = 'avoid',
  FOLLOW = 'follow',
  WANDER = 'wander',
  QUEUE = 'queue'
}

export interface CrowdAgent {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  radius: number;
  maxSpeed: number;
  mass: number;
  personality: PersonalityTraits;
  currentGoal?: AgentGoal;
  path?: PathfindingNode[];
  state: AgentState;
  neighbors: CrowdAgent[];
}

export enum AgentState {
  IDLE = 'idle',
  MOVING = 'moving',
  WAITING = 'waiting',
  FOLLOWING = 'following',
  AVOIDING = 'avoiding',
  PANICKED = 'panicked'
}

export interface CrowdEnvironment {
  boundaries: Boundary[];
  obstacles: Obstacle[];
  exits: Exit[];
  areas: EnvironmentArea[];
}

export interface Boundary {
  type: BoundaryType;
  points: { x: number; y: number }[];
  properties: BoundaryProperties;
}

export enum BoundaryType {
  WALL = 'wall',
  FENCE = 'fence',
  BARRIER = 'barrier',
  WATER = 'water'
}

export interface BoundaryProperties {
  passable: boolean;
  friction: number;
  height?: number;
  material?: string;
}

export interface Obstacle {
  id: string;
  type: ObstacleType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  properties: ObstacleProperties;
}

export enum ObstacleType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  INTERACTIVE = 'interactive'
}

export interface ObstacleProperties {
  solid: boolean;
  friction: number;
  pushable?: boolean;
  weight?: number;
}

export interface Exit {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  capacity: number;
  flowRate: number;
  active: boolean;
}

export interface EnvironmentArea {
  id: string;
  type: AreaType;
  bounds: { x: number; y: number; width: number; height: number };
  properties: AreaProperties;
}

export enum AreaType {
  SPAWN = 'spawn',
  DESTINATION = 'destination',
  RESTRICTED = 'restricted',
  SLOW = 'slow',
  FAST = 'fast'
}

export interface AreaProperties {
  speedModifier: number;
  capacity?: number;
  restrictions?: AgentRestriction[];
}

export interface AgentRestriction {
  type: RestrictionType;
  condition: (agent: CrowdAgent) => boolean;
}

export enum RestrictionType {
  NO_ENTRY = 'no_entry',
  ONE_WAY = 'one_way',
  TIME_LIMITED = 'time_limited',
  GROUP_SIZE = 'group_size'
}

export interface CrowdBehavior {
  id: string;
  name: string;
  type: BehaviorType;
  weight: number;
  radius: number;
  apply: (agent: CrowdAgent, neighbors: CrowdAgent[]) => { x: number; y: number };
}

export enum BehaviorType {
  SEPARATION = 'separation',
  ALIGNMENT = 'alignment',
  COHESION = 'cohesion',
  SEEK = 'seek',
  FLEE = 'flee',
  WANDER = 'wander',
  FOLLOW_LEADER = 'follow_leader',
  QUEUE_FORMATION = 'queue_formation'
}

export interface SocialForce {
  id: string;
  type: SocialForceType;
  strength: number;
  range: number;
  calculate: (agent: CrowdAgent, target: CrowdAgent | Obstacle) => { x: number; y: number };
}

export enum SocialForceType {
  PERSONAL_SPACE = 'personal_space',
  WALL_REPULSION = 'wall_repulsion',
  GOAL_ATTRACTION = 'goal_attraction',
  GROUP_COHESION = 'group_cohesion',
  PANIC_SPREAD = 'panic_spread'
}

export interface PathfindingConfig {
  algorithm: PathfindingAlgorithm;
  gridResolution: number;
  updateFrequency: number;
  smoothing: boolean;
  dynamicReplanning: boolean;
}

export interface CrowdVisualizationConfig {
  showAgents: boolean;
  showPaths: boolean;
  showForces: boolean;
  showDensity: boolean;
  colorByState: boolean;
  trailLength: number;
}

export interface NumericalIntegrator {
  id: string;
  name: string;
  order: number;
  stable: boolean;
  adaptive: boolean;
  integrate: (
    f: (t: number, y: number[]) => number[],
    t0: number,
    y0: number[],
    h: number,
    steps: number
  ) => IntegrationResult;
}

export interface IntegrationResult {
  t: number[];
  y: number[][];
  error?: number[];
  steps: number;
  evaluations: number;
}

export interface ODESystem {
  equations: ODEEquation[];
  initialConditions: number[];
  parameters: Record<string, number>;
  timeSpan: { start: number; end: number };
}

export interface ODEEquation {
  variable: string;
  derivative: (t: number, y: Record<string, number>, params: Record<string, number>) => number;
}

export interface StateMachine {
  id: string;
  name: string;
  states: State[];
  transitions: Transition[];
  currentState: string;
  context: Record<string, any>;
}

export interface State {
  id: string;
  name: string;
  type: StateType;
  onEnter?: (context: Record<string, any>) => void;
  onExit?: (context: Record<string, any>) => void;
  onUpdate?: (context: Record<string, any>, deltaTime: number) => void;
}

export enum StateType {
  SIMPLE = 'simple',
  COMPOSITE = 'composite',
  PARALLEL = 'parallel',
  HISTORY = 'history'
}

export interface Transition {
  id: string;
  from: string;
  to: string;
  trigger?: string;
  condition?: (context: Record<string, any>) => boolean;
  action?: (context: Record<string, any>) => void;
  priority?: number;
}

export interface AlgorithmBenchmark {
  algorithm: Algorithm;
  testCases: BenchmarkTestCase[];
  results: BenchmarkResult[];
  environment: BenchmarkEnvironment;
}

export interface BenchmarkTestCase {
  id: string;
  name: string;
  input: any;
  expectedOutput?: any;
  parameters?: Record<string, any>;
  timeout?: number;
}

export interface BenchmarkResult {
  testCaseId: string;
  success: boolean;
  output: any;
  executionTime: number;
  memoryUsage: number;
  accuracy?: number;
  error?: string;
}

export interface BenchmarkEnvironment {
  platform: string;
  runtime: string;
  cpuInfo: CPUInfo;
  memoryInfo: MemoryInfo;
  timestamp: number;
}

export interface CPUInfo {
  model: string;
  cores: number;
  frequency: number;
  architecture: string;
}

export interface MemoryInfo {
  total: number;
  available: number;
  used: number;
}

export type AlgorithmFactory<T extends Algorithm = Algorithm> = (config?: any) => T;