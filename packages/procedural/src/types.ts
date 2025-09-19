export interface NoiseConfig {
  seed: number;
  octaves: number;
  frequency: number;
  amplitude: number;
  persistence: number;
  lacunarity: number;
}

export interface NoiseGenerator {
  generate(x: number, y?: number, z?: number): number;
  generate2D(x: number, y: number): number;
  generate3D(x: number, y: number, z: number): number;
  setSeed(seed: number): void;
  setFrequency(frequency: number): void;
  setOctaves(octaves: number): void;
}

export interface TerrainConfig {
  width: number;
  height: number;
  scale: number;
  heightMultiplier: number;
  noiseConfig: NoiseConfig;
  biomes: BiomeDefinition[];
  erosionSettings?: ErosionSettings;
}

export interface BiomeDefinition {
  id: string;
  name: string;
  temperature: { min: number; max: number };
  humidity: { min: number; max: number };
  elevation: { min: number; max: number };
  color: { r: number; g: number; b: number };
  vegetation: VegetationRule[];
  structures: StructureRule[];
}

export interface VegetationRule {
  type: string;
  density: number;
  minSize: number;
  maxSize: number;
  probability: number;
  conditions: VegetationCondition[];
}

export interface VegetationCondition {
  property: 'elevation' | 'temperature' | 'humidity' | 'slope';
  min: number;
  max: number;
}

export interface StructureRule {
  type: string;
  probability: number;
  minDistance: number;
  size: { width: number; height: number; depth: number };
  conditions: StructureCondition[];
}

export interface StructureCondition {
  property: 'elevation' | 'biome' | 'proximity';
  value: string | number;
  operator: 'equals' | 'greater' | 'less' | 'contains';
}

export interface ErosionSettings {
  iterations: number;
  evaporationRate: number;
  sedimentCapacity: number;
  erosionRadius: number;
  erosionSpeed: number;
  depositionSpeed: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
  elevation: number;
  temperature: number;
  humidity: number;
  biome: string;
  vegetation: VegetationInstance[];
  structures: StructureInstance[];
}

export interface VegetationInstance {
  type: string;
  x: number;
  y: number;
  size: number;
  health: number;
  age: number;
}

export interface StructureInstance {
  type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotation: number;
  metadata: Record<string, any>;
}

export interface GrammarRule {
  symbol: string;
  productions: Production[];
  weight: number;
  conditions?: GrammarCondition[];
}

export interface Production {
  result: string;
  probability: number;
  parameters?: Record<string, any>;
}

export interface GrammarCondition {
  property: string;
  value: any;
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'not';
}

export interface LSystemConfig {
  axiom: string;
  rules: GrammarRule[];
  iterations: number;
  angleIncrement: number;
  lengthMultiplier: number;
  context: Record<string, any>;
}

export interface WaveFunctionConfig {
  width: number;
  height: number;
  tileSize: number;
  tiles: WFCTile[];
  constraints: WFCConstraint[];
  borderTile?: string;
  retryCount: number;
}

export interface WFCTile {
  id: string;
  name: string;
  weight: number;
  sockets: {
    north: string[];
    east: string[];
    south: string[];
    west: string[];
  };
  rotation: boolean;
  metadata: Record<string, any>;
}

export interface WFCConstraint {
  type: 'adjacency' | 'position' | 'count' | 'distance';
  tile1: string;
  tile2?: string;
  direction?: 'north' | 'east' | 'south' | 'west';
  position?: { x: number; y: number };
  minCount?: number;
  maxCount?: number;
  minDistance?: number;
  maxDistance?: number;
}

export interface WFCCell {
  x: number;
  y: number;
  possibilities: Set<string>;
  collapsed: boolean;
  tileId?: string;
  entropy: number;
}

export interface MazeConfig {
  width: number;
  height: number;
  algorithm: 'recursive_backtrack' | 'kruskal' | 'prim' | 'binary_tree' | 'sidewinder';
  seed: number;
  bias?: MazeBias;
  deadEndRemoval?: number; // 0-1, percentage of dead ends to remove
}

export interface MazeBias {
  horizontal: number; // -1 to 1, negative favors vertical, positive favors horizontal
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface MazeCell {
  x: number;
  y: number;
  walls: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  };
  visited: boolean;
  distance?: number;
  parent?: MazeCell;
}

export interface DungeonConfig {
  width: number;
  height: number;
  minRoomSize: number;
  maxRoomSize: number;
  maxRooms: number;
  roomConnectionProbability: number;
  corridorWidth: number;
  theme: DungeonTheme;
  features: DungeonFeature[];
}

export interface DungeonTheme {
  name: string;
  wallTile: string;
  floorTile: string;
  doorTile: string;
  decorations: string[];
  lighting: LightingConfig;
}

export interface LightingConfig {
  ambient: number;
  torchRadius: number;
  torchIntensity: number;
  shadowOpacity: number;
}

export interface DungeonFeature {
  type: 'treasure' | 'trap' | 'monster' | 'decoration' | 'secret';
  probability: number;
  roomTypes: string[];
  placement: 'center' | 'corner' | 'wall' | 'random';
  metadata: Record<string, any>;
}

export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'start' | 'end' | 'treasure' | 'boss' | 'normal';
  connections: string[];
  features: DungeonFeature[];
}

export interface Corridor {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  width: number;
  waypoints: { x: number; y: number }[];
}

export interface CityConfig {
  size: number;
  districts: DistrictDefinition[];
  roadNetwork: RoadNetworkConfig;
  zoning: ZoningRules;
  population: PopulationConfig;
  services: ServiceConfig[];
}

export interface DistrictDefinition {
  id: string;
  name: string;
  center: { x: number; y: number };
  radius: number;
  type: 'residential' | 'commercial' | 'industrial' | 'civic' | 'recreational';
  density: number;
  buildingStyles: string[];
  constraints: DistrictConstraint[];
}

export interface DistrictConstraint {
  type: 'elevation' | 'water' | 'proximity' | 'noise';
  value: number;
  operator: 'greater' | 'less' | 'equals';
}

export interface RoadNetworkConfig {
  mainRoadWidth: number;
  streetWidth: number;
  gridSpacing: number;
  curvature: number;
  hierarchical: boolean;
}

export interface ZoningRules {
  minBuildingSpacing: number;
  maxBuildingHeight: number;
  setbackDistance: number;
  mixedUseAllowed: boolean;
}

export interface PopulationConfig {
  density: number;
  ageDistribution: AgeGroup[];
  economicClasses: EconomicClass[];
  culturalGroups: CulturalGroup[];
}

export interface AgeGroup {
  range: { min: number; max: number };
  percentage: number;
}

export interface EconomicClass {
  name: string;
  percentage: number;
  housingPreference: string[];
  workplaceTypes: string[];
}

export interface CulturalGroup {
  name: string;
  percentage: number;
  architecturalStyle: string;
  businessTypes: string[];
}

export interface ServiceConfig {
  type: 'school' | 'hospital' | 'police' | 'fire' | 'library' | 'park';
  coverage: number; // radius in units
  population: number; // people served per facility
  constraints: ServiceConstraint[];
}

export interface ServiceConstraint {
  type: 'district' | 'proximity' | 'accessibility';
  requirement: string | number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  type: string;
  style: string;
  purpose: string;
  residents?: number;
  workers?: number;
  metadata: Record<string, any>;
}

export interface NameGeneratorConfig {
  language: string;
  style: 'fantasy' | 'scifi' | 'modern' | 'historical';
  patterns: NamePattern[];
  phonemes: PhonemeSet;
  constraints: NameConstraint[];
}

export interface NamePattern {
  pattern: string; // e.g., "CV(C)V" where C=consonant, V=vowel
  weight: number;
  minLength: number;
  maxLength: number;
}

export interface PhonemeSet {
  consonants: string[];
  vowels: string[];
  clusters: string[];
  forbidden: string[];
}

export interface NameConstraint {
  type: 'length' | 'phoneme' | 'pattern' | 'meaning';
  rule: string;
  weight: number;
}

export interface GeneratedName {
  name: string;
  pronunciation: string;
  meaning?: string;
  origin: string;
  variants: string[];
}

export interface QuestConfig {
  types: QuestType[];
  complexityLevels: ComplexityLevel[];
  themes: QuestTheme[];
  objectives: ObjectiveType[];
  rewards: RewardType[];
  constraints: QuestConstraint[];
}

export interface QuestType {
  id: string;
  name: string;
  structure: QuestStructure;
  minSteps: number;
  maxSteps: number;
  prerequisites: string[];
}

export interface QuestStructure {
  introduction: string[];
  body: string[];
  climax: string[];
  resolution: string[];
}

export interface ComplexityLevel {
  name: string;
  multiplier: number;
  additionalObjectives: number;
  timeLimit?: number;
}

export interface QuestTheme {
  id: string;
  name: string;
  elements: string[];
  mood: string;
  setting: string;
}

export interface ObjectiveType {
  id: string;
  name: string;
  template: string;
  parameters: ObjectiveParameter[];
  difficulty: number;
}

export interface ObjectiveParameter {
  name: string;
  type: 'string' | 'number' | 'location' | 'item' | 'character';
  options?: string[];
  constraints?: any;
}

export interface RewardType {
  type: 'experience' | 'item' | 'currency' | 'reputation' | 'unlock';
  baseValue: number;
  scaling: RewardScaling;
}

export interface RewardScaling {
  factor: number;
  property: 'level' | 'difficulty' | 'time' | 'reputation';
}

export interface QuestConstraint {
  type: 'level' | 'location' | 'prerequisite' | 'faction' | 'time';
  value: any;
  operator: 'equals' | 'greater' | 'less' | 'contains';
}

export interface GeneratedQuest {
  id: string;
  title: string;
  description: string;
  type: string;
  theme: string;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: string[];
  timeLimit?: number;
  difficulty: number;
  location?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: string;
  parameters: Record<string, any>;
  completed: boolean;
  optional: boolean;
}

export interface QuestReward {
  type: string;
  amount: number;
  item?: string;
  description: string;
}

export interface GenerationStats {
  totalTime: number;
  iterationsCount: number;
  successRate: number;
  failureReasons: string[];
  memoryUsage: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface GenerationOptions {
  seed?: number;
  useCache?: boolean;
  maxRetries?: number;
  timeout?: number;
  progressCallback?: (progress: number, stage: string) => void;
  errorCallback?: (error: Error, context: string) => void;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  size: number;
}

export interface GenerationContext {
  seed: number;
  random: () => number;
  cache: Map<string, CacheEntry<any>>;
  stats: GenerationStats;
  options: GenerationOptions;
  metadata: Record<string, any>;
}

export type NoiseType = 'perlin' | 'simplex' | 'worley' | 'fractal' | 'ridge' | 'billow';

export type InterpolationType = 'linear' | 'cosine' | 'cubic' | 'quintic';

export type MazeAlgorithm = 'recursive_backtrack' | 'kruskal' | 'prim' | 'binary_tree' | 'sidewinder';

export type DistanceMetric = 'euclidean' | 'manhattan' | 'chebyshev' | 'minkowski';

export type GenerationEventType =
  | 'generation_started'
  | 'generation_progress'
  | 'generation_completed'
  | 'generation_failed'
  | 'cache_hit'
  | 'cache_miss'
  | 'performance_warning';

export interface GenerationEvent {
  type: GenerationEventType;
  timestamp: number;
  data: any;
  context: string;
}

export enum BiomeType {
  OCEAN = 'ocean',
  LAKE = 'lake',
  BEACH = 'beach',
  DESERT = 'desert',
  GRASSLAND = 'grassland',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  TUNDRA = 'tundra',
  SWAMP = 'swamp',
  JUNGLE = 'jungle'
}

export enum TerrainType {
  WATER = 'water',
  SAND = 'sand',
  GRASS = 'grass',
  DIRT = 'dirt',
  STONE = 'stone',
  SNOW = 'snow',
  ICE = 'ice',
  LAVA = 'lava'
}

export enum VegetationType {
  TREE = 'tree',
  BUSH = 'bush',
  GRASS = 'grass',
  FLOWER = 'flower',
  MUSHROOM = 'mushroom',
  VINE = 'vine',
  CACTUS = 'cactus'
}

export enum StructureType {
  BUILDING = 'building',
  ROAD = 'road',
  BRIDGE = 'bridge',
  WALL = 'wall',
  TOWER = 'tower',
  MONUMENT = 'monument',
  RUIN = 'ruin'
}

export enum QuestObjectiveType {
  KILL = 'kill',
  COLLECT = 'collect',
  DELIVER = 'deliver',
  ESCORT = 'escort',
  EXPLORE = 'explore',
  INTERACT = 'interact',
  SURVIVE = 'survive',
  CRAFT = 'craft'
}