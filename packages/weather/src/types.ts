export interface WeatherState {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: Precipitation;
  visibility: number;
  dewPoint: number;
  uvIndex: number;
  timestamp: number;
  location: GeographicLocation;
}

export interface Precipitation {
  type: PrecipitationType;
  intensity: number;
  accumulation: number;
  probability: number;
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
}

export interface AtmosphericLayer {
  altitude: number;
  temperature: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  density: number;
  visibility: number;
}

export interface WeatherForecast {
  timestamp: number;
  location: GeographicLocation;
  conditions: WeatherCondition[];
  confidence: number;
  validUntil: number;
}

export interface WeatherCondition {
  time: number;
  temperature: TemperatureRange;
  humidity: number;
  pressure: number;
  wind: WindCondition;
  precipitation: Precipitation;
  cloudCover: number;
  visibility: number;
  phenomena: WeatherPhenomenon[];
}

export interface TemperatureRange {
  current: number;
  min: number;
  max: number;
  feelsLike: number;
}

export interface WindCondition {
  speed: number;
  direction: number;
  gusts: number;
  variability: number;
}

export interface WeatherPhenomenon {
  type: PhenomenonType;
  intensity: PhenomenonIntensity;
  coverage: number;
  duration: number;
  startTime: number;
  endTime?: number;
}

export interface ClimateZone {
  id: string;
  name: string;
  type: ClimateType;
  characteristics: ClimateCharacteristics;
  seasonalPatterns: SeasonalPattern[];
  extremes: ClimateExtremes;
}

export interface ClimateCharacteristics {
  averageTemperature: MonthlyAverages;
  temperatureRange: MonthlyAverages;
  humidity: MonthlyAverages;
  precipitation: MonthlyAverages;
  windPatterns: WindPattern[];
  stormFrequency: number;
}

export interface MonthlyAverages {
  january: number;
  february: number;
  march: number;
  april: number;
  may: number;
  june: number;
  july: number;
  august: number;
  september: number;
  october: number;
  november: number;
  december: number;
}

export interface SeasonalPattern {
  season: Season;
  temperatureModifier: number;
  humidityModifier: number;
  precipitationModifier: number;
  stormProbability: number;
  dayLength: number;
}

export interface ClimateExtremes {
  maxTemperature: number;
  minTemperature: number;
  maxWindSpeed: number;
  maxPrecipitation: number;
  droughtProbability: number;
  floodProbability: number;
}

export interface WindPattern {
  direction: number;
  strength: number;
  seasonality: number;
  altitude: number;
}

export interface WeatherSystem {
  id: string;
  type: WeatherSystemType;
  intensity: number;
  center: GeographicLocation;
  radius: number;
  speed: number;
  direction: number;
  pressure: number;
  lifecycle: SystemLifecycle;
  effects: SystemEffects;
}

export interface SystemLifecycle {
  stage: SystemStage;
  age: number;
  maxIntensity: number;
  decayRate: number;
  expectedLifetime: number;
}

export interface SystemEffects {
  temperatureChange: number;
  humidityChange: number;
  pressureChange: number;
  windSpeedChange: number;
  precipitationChange: number;
  cloudCoverChange: number;
}

export interface WeatherAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  area: GeographicArea;
  validFrom: number;
  validUntil: number;
  conditions: AlertCondition[];
  recommendations: string[];
}

export interface GeographicArea {
  type: 'circle' | 'polygon' | 'rectangle';
  coordinates: number[][];
  radius?: number;
}

export interface AlertCondition {
  parameter: WeatherParameter;
  threshold: number;
  operator: ComparisonOperator;
  duration: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  location: GeographicLocation;
  instruments: WeatherInstrument[];
  lastReading: WeatherReading;
  status: StationStatus;
  calibration: CalibrationData;
}

export interface WeatherInstrument {
  id: string;
  type: InstrumentType;
  model: string;
  accuracy: number;
  range: MeasurementRange;
  lastCalibration: number;
  nextCalibration: number;
  status: InstrumentStatus;
}

export interface MeasurementRange {
  min: number;
  max: number;
  unit: string;
}

export interface WeatherReading {
  timestamp: number;
  stationId: string;
  measurements: Measurement[];
  quality: DataQuality;
}

export interface Measurement {
  parameter: WeatherParameter;
  value: number;
  unit: string;
  quality: MeasurementQuality;
  source: string;
}

export interface DataQuality {
  overall: QualityLevel;
  completeness: number;
  accuracy: number;
  reliability: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  affectedParameters: WeatherParameter[];
}

export interface CalibrationData {
  lastCalibration: number;
  nextCalibration: number;
  drift: number;
  adjustments: CalibrationAdjustment[];
}

export interface CalibrationAdjustment {
  parameter: WeatherParameter;
  offset: number;
  scale: number;
  timestamp: number;
}

export interface WeatherModel {
  id: string;
  name: string;
  type: ModelType;
  resolution: ModelResolution;
  timeStep: number;
  forecastHorizon: number;
  parameters: ModelParameter[];
  accuracy: ModelAccuracy;
}

export interface ModelResolution {
  horizontal: number;
  vertical: number;
  temporal: number;
}

export interface ModelParameter {
  name: string;
  description: string;
  unit: string;
  range: MeasurementRange;
  importance: number;
}

export interface ModelAccuracy {
  overall: number;
  shortTerm: number;
  mediumTerm: number;
  longTerm: number;
  byParameter: Record<WeatherParameter, number>;
}

export interface WeatherEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  timestamp: number;
  location: GeographicLocation;
  data: EventData;
  impact: EventImpact;
  confidence: number;
}

export interface EventData {
  duration: number;
  intensity: number;
  parameters: Record<string, number>;
  description: string;
  metadata: Record<string, any>;
}

export interface EventImpact {
  visibility: number;
  transportation: TransportationImpact;
  agriculture: AgricultureImpact;
  energy: EnergyImpact;
  safety: SafetyImpact;
}

export interface TransportationImpact {
  road: ImpactLevel;
  air: ImpactLevel;
  sea: ImpactLevel;
  rail: ImpactLevel;
}

export interface AgricultureImpact {
  crops: ImpactLevel;
  livestock: ImpactLevel;
  irrigation: ImpactLevel;
}

export interface EnergyImpact {
  solar: number;
  wind: number;
  hydroelectric: number;
  demand: number;
}

export interface SafetyImpact {
  level: SafetyLevel;
  risks: SafetyRisk[];
  recommendations: string[];
}

export interface SafetyRisk {
  type: RiskType;
  probability: number;
  severity: number;
  description: string;
}

export enum PrecipitationType {
  NONE = 'none',
  RAIN = 'rain',
  SNOW = 'snow',
  SLEET = 'sleet',
  HAIL = 'hail',
  FREEZING_RAIN = 'freezing_rain',
  DRIZZLE = 'drizzle'
}

export enum PhenomenonType {
  FOG = 'fog',
  MIST = 'mist',
  HAZE = 'haze',
  DUST = 'dust',
  SMOKE = 'smoke',
  TORNADO = 'tornado',
  THUNDERSTORM = 'thunderstorm',
  LIGHTNING = 'lightning',
  RAINBOW = 'rainbow',
  AURORA = 'aurora'
}

export enum PhenomenonIntensity {
  LIGHT = 'light',
  MODERATE = 'moderate',
  HEAVY = 'heavy',
  SEVERE = 'severe',
  EXTREME = 'extreme'
}

export enum ClimateType {
  TROPICAL = 'tropical',
  DRY = 'dry',
  TEMPERATE = 'temperate',
  CONTINENTAL = 'continental',
  POLAR = 'polar',
  HIGHLAND = 'highland'
}

export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

export enum WeatherSystemType {
  HIGH_PRESSURE = 'high_pressure',
  LOW_PRESSURE = 'low_pressure',
  COLD_FRONT = 'cold_front',
  WARM_FRONT = 'warm_front',
  OCCLUDED_FRONT = 'occluded_front',
  HURRICANE = 'hurricane',
  TYPHOON = 'typhoon',
  CYCLONE = 'cyclone',
  TORNADO = 'tornado',
  THUNDERSTORM = 'thunderstorm'
}

export enum SystemStage {
  FORMING = 'forming',
  DEVELOPING = 'developing',
  MATURE = 'mature',
  WEAKENING = 'weakening',
  DISSIPATING = 'dissipating'
}

export enum AlertType {
  TEMPERATURE = 'temperature',
  WIND = 'wind',
  PRECIPITATION = 'precipitation',
  STORM = 'storm',
  FLOOD = 'flood',
  DROUGHT = 'drought',
  FIRE_WEATHER = 'fire_weather',
  AIR_QUALITY = 'air_quality'
}

export enum AlertSeverity {
  ADVISORY = 'advisory',
  WATCH = 'watch',
  WARNING = 'warning',
  EMERGENCY = 'emergency'
}

export enum WeatherParameter {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  PRESSURE = 'pressure',
  WIND_SPEED = 'wind_speed',
  WIND_DIRECTION = 'wind_direction',
  PRECIPITATION = 'precipitation',
  CLOUD_COVER = 'cloud_cover',
  VISIBILITY = 'visibility',
  UV_INDEX = 'uv_index',
  DEW_POINT = 'dew_point'
}

export enum ComparisonOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal'
}

export enum InstrumentType {
  THERMOMETER = 'thermometer',
  HYGROMETER = 'hygrometer',
  BAROMETER = 'barometer',
  ANEMOMETER = 'anemometer',
  WIND_VANE = 'wind_vane',
  RAIN_GAUGE = 'rain_gauge',
  PYRANOMETER = 'pyranometer',
  VISIBILITY_METER = 'visibility_meter'
}

export enum InstrumentStatus {
  OPERATIONAL = 'operational',
  MAINTENANCE = 'maintenance',
  CALIBRATION = 'calibration',
  FAULTY = 'faulty',
  OFFLINE = 'offline'
}

export enum StationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DECOMMISSIONED = 'decommissioned'
}

export enum QualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNRELIABLE = 'unreliable'
}

export enum MeasurementQuality {
  VERIFIED = 'verified',
  ESTIMATED = 'estimated',
  INTERPOLATED = 'interpolated',
  SUSPECT = 'suspect',
  INVALID = 'invalid'
}

export enum IssueType {
  MISSING_DATA = 'missing_data',
  OUTLIER = 'outlier',
  CALIBRATION_DRIFT = 'calibration_drift',
  SENSOR_FAILURE = 'sensor_failure',
  COMMUNICATION_ERROR = 'communication_error'
}

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ModelType {
  NUMERICAL = 'numerical',
  STATISTICAL = 'statistical',
  MACHINE_LEARNING = 'machine_learning',
  ENSEMBLE = 'ensemble',
  HYBRID = 'hybrid'
}

export enum EventType {
  PRECIPITATION_START = 'precipitation_start',
  PRECIPITATION_END = 'precipitation_end',
  TEMPERATURE_EXTREME = 'temperature_extreme',
  WIND_GUST = 'wind_gust',
  PRESSURE_CHANGE = 'pressure_change',
  VISIBILITY_CHANGE = 'visibility_change',
  STORM_FORMATION = 'storm_formation',
  WEATHER_FRONT = 'weather_front'
}

export enum EventCategory {
  ATMOSPHERIC = 'atmospheric',
  HYDROLOGICAL = 'hydrological',
  THERMAL = 'thermal',
  DYNAMIC = 'dynamic',
  OPTICAL = 'optical'
}

export enum ImpactLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SIGNIFICANT = 'significant',
  SEVERE = 'severe'
}

export enum SafetyLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  WARNING = 'warning',
  DANGER = 'danger',
  EXTREME = 'extreme'
}

export enum RiskType {
  FLOODING = 'flooding',
  LIGHTNING = 'lightning',
  STRONG_WINDS = 'strong_winds',
  EXTREME_TEMPERATURE = 'extreme_temperature',
  POOR_VISIBILITY = 'poor_visibility',
  ICE = 'ice',
  FIRE = 'fire'
}

export type WeatherEventHandler = (event: WeatherEvent) => void;
export type WeatherStateHandler = (state: WeatherState) => void;
export type WeatherAlertHandler = (alert: WeatherAlert) => void;
export type WeatherSystemHandler = (system: WeatherSystem) => void;