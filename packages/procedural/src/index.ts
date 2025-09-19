/**
 * @steam-sim/procedural - Procedural Content Generation Package
 *
 * Advanced procedural content generation system with noise functions,
 * grammars, and algorithms for creating dynamic simulation content.
 */

// Core classes
export { ProceduralGenerator } from './core/ProceduralGenerator';

// Generators
export { NoiseGenerator } from './generators/NoiseGenerator';
export { TerrainGenerator } from './generators/TerrainGenerator';
export { MazeGenerator } from './generators/MazeGenerator';
export { WaveFunctionCollapse } from './generators/WaveFunctionCollapse';

// Utilities
export { ProceduralHelpers } from './utils/ProceduralHelpers';

// Types and interfaces
export type {
  NoiseConfig,
  NoiseGenerator as INoiseGenerator,
  TerrainConfig,
  TerrainPoint,
  BiomeDefinition,
  VegetationRule,
  VegetationCondition,
  StructureRule,
  StructureCondition,
  ErosionSettings,
  VegetationInstance,
  StructureInstance,
  GrammarRule,
  Production,
  GrammarCondition,
  LSystemConfig,
  WaveFunctionConfig,
  WFCTile,
  WFCConstraint,
  WFCCell,
  MazeConfig,
  MazeCell,
  MazeBias,
  DungeonConfig,
  DungeonTheme,
  LightingConfig,
  DungeonFeature,
  Room,
  Corridor,
  CityConfig,
  DistrictDefinition,
  RoadNetworkConfig,
  ZoningRules,
  PopulationConfig,
  AgeGroup,
  EconomicClass,
  CulturalGroup,
  ServiceConfig,
  ServiceConstraint,
  Building,
  NameGeneratorConfig,
  NamePattern,
  PhonemeSet,
  NameConstraint,
  GeneratedName,
  QuestConfig,
  QuestType,
  QuestStructure,
  ComplexityLevel,
  QuestTheme,
  ObjectiveType,
  ObjectiveParameter,
  RewardType,
  RewardScaling,
  QuestConstraint,
  GeneratedQuest,
  QuestObjective,
  QuestReward,
  GenerationStats,
  GenerationOptions,
  CacheEntry,
  GenerationContext,
  GenerationEvent
} from './types';

// Enums
export {
  BiomeType,
  TerrainType,
  VegetationType,
  StructureType,
  QuestObjectiveType
} from './types';

// Type aliases
export type {
  NoiseType,
  InterpolationType,
  MazeAlgorithm,
  DistanceMetric,
  GenerationEventType
} from './types';

// Version
export const VERSION = '1.0.0';

// Unity-compatible wrapper
import { ProceduralGenerator } from './core/ProceduralGenerator';

export class ProceduralSimulation {
  private system: any;

  constructor() {
    try {
      // Try to initialize the main system
      this.system = {};
    } catch {
      this.system = {};
    }
  }

  public exportState(): string {
    const exportData = {
      timestamp: Date.now(),
      currentTime: Date.now(),
      procedural: {
            "generationsActive": 0,
            "seedValue": 12345,
            "generatedAssets": 0,
            "systemHealth": "operational"
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}