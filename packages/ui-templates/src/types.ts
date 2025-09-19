export interface UITheme {
  name: string;
  version: string;
  colors: ColorPalette;
  typography: Typography;
  spacing: SpacingScale;
  shadows: ShadowScale;
  borderRadius: BorderRadiusScale;
  animations: AnimationConfig;
  breakpoints: BreakpointConfig;
}

export interface ColorPalette {
  primary: ColorVariants;
  secondary: ColorVariants;
  success: ColorVariants;
  warning: ColorVariants;
  error: ColorVariants;
  info: ColorVariants;
  neutral: NeutralColors;
  background: BackgroundColors;
  surface: SurfaceColors;
  text: TextColors;
}

export interface ColorVariants {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}

export interface NeutralColors {
  white: string;
  black: string;
  gray: ColorVariants;
}

export interface BackgroundColors {
  default: string;
  paper: string;
  elevated: string;
  overlay: string;
}

export interface SurfaceColors {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  disabled: string;
  hint: string;
}

export interface Typography {
  fontFamily: FontFamilyScale;
  fontSize: FontSizeScale;
  fontWeight: FontWeightScale;
  lineHeight: LineHeightScale;
  letterSpacing: LetterSpacingScale;
  headings: HeadingStyles;
  body: BodyStyles;
}

export interface FontFamilyScale {
  primary: string;
  secondary: string;
  monospace: string;
  display: string;
}

export interface FontSizeScale {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
}

export interface FontWeightScale {
  thin: number;
  extraLight: number;
  light: number;
  normal: number;
  medium: number;
  semiBold: number;
  bold: number;
  extraBold: number;
  black: number;
}

export interface LineHeightScale {
  none: number;
  tight: number;
  snug: number;
  normal: number;
  relaxed: number;
  loose: number;
}

export interface LetterSpacingScale {
  tighter: string;
  tight: string;
  normal: string;
  wide: string;
  wider: string;
  widest: string;
}

export interface HeadingStyles {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  h5: TextStyle;
  h6: TextStyle;
}

export interface BodyStyles {
  large: TextStyle;
  base: TextStyle;
  small: TextStyle;
  caption: TextStyle;
}

export interface TextStyle {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
  textTransform?: TextTransform;
}

export type TextTransform = 'none' | 'capitalize' | 'uppercase' | 'lowercase';

export interface SpacingScale {
  px: string;
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
  20: string;
  24: string;
  32: string;
  40: string;
  48: string;
  56: string;
  64: string;
}

export interface ShadowScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

export interface BorderRadiusScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  full: string;
}

export interface AnimationConfig {
  duration: DurationScale;
  timing: TimingFunctionScale;
  transitions: TransitionConfig;
}

export interface DurationScale {
  fast: string;
  normal: string;
  slow: string;
  slower: string;
}

export interface TimingFunctionScale {
  linear: string;
  ease: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
}

export interface TransitionConfig {
  all: string;
  colors: string;
  opacity: string;
  shadow: string;
  transform: string;
}

export interface BreakpointConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ComponentTemplate {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  version: string;
  props: ComponentProps;
  variants: ComponentVariant[];
  states: ComponentState[];
  composition: ComponentComposition;
  accessibility: AccessibilityConfig;
  responsive: ResponsiveConfig;
  theme: ThemeableProps;
}

export enum ComponentCategory {
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  INPUT = 'input',
  FEEDBACK = 'feedback',
  DATA_DISPLAY = 'data_display',
  OVERLAY = 'overlay',
  MEDIA = 'media',
  CHART = 'chart',
  SIMULATION = 'simulation'
}

export interface ComponentProps {
  required: PropDefinition[];
  optional: PropDefinition[];
}

export interface PropDefinition {
  name: string;
  type: PropType;
  description: string;
  defaultValue?: any;
  validation?: ValidationRule[];
  examples?: any[];
}

export enum PropType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FUNCTION = 'function',
  NODE = 'node',
  ELEMENT = 'element',
  ENUM = 'enum',
  UNION = 'union'
}

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message?: string;
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'minLength',
  MAX_LENGTH = 'maxLength',
  MIN = 'min',
  MAX = 'max',
  PATTERN = 'pattern',
  CUSTOM = 'custom'
}

export interface ComponentVariant {
  name: string;
  description: string;
  props: Record<string, any>;
  styles: StyleOverrides;
  preview?: PreviewConfig;
}

export interface ComponentState {
  name: StateType;
  description: string;
  conditions: StateCondition[];
  styles: StyleOverrides;
  behavior: StateBehavior;
}

export enum StateType {
  DEFAULT = 'default',
  HOVER = 'hover',
  FOCUS = 'focus',
  ACTIVE = 'active',
  DISABLED = 'disabled',
  LOADING = 'loading',
  ERROR = 'error',
  SUCCESS = 'success',
  SELECTED = 'selected',
  EXPANDED = 'expanded',
  COLLAPSED = 'collapsed'
}

export interface StateCondition {
  type: ConditionType;
  selector?: string;
  value?: any;
}

export enum ConditionType {
  PROP = 'prop',
  CLASS = 'class',
  ATTRIBUTE = 'attribute',
  PSEUDO = 'pseudo',
  MEDIA = 'media',
  CUSTOM = 'custom'
}

export interface StateBehavior {
  triggers: BehaviorTrigger[];
  effects: BehaviorEffect[];
  duration?: string;
  delay?: string;
}

export interface BehaviorTrigger {
  event: string;
  condition?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface BehaviorEffect {
  type: EffectType;
  target?: string;
  properties: Record<string, any>;
  duration?: string;
  delay?: string;
  easing?: string;
}

export enum EffectType {
  STYLE = 'style',
  CLASS = 'class',
  ATTRIBUTE = 'attribute',
  ANIMATION = 'animation',
  CALLBACK = 'callback'
}

export interface ComponentComposition {
  structure: ComponentStructure;
  children: ComponentChild[];
  slots: ComponentSlot[];
}

export interface ComponentStructure {
  tag: string;
  attributes: Record<string, string>;
  classes: string[];
  styles: StyleDefinition;
}

export interface ComponentChild {
  id: string;
  component: string;
  props: Record<string, any>;
  conditions?: RenderCondition[];
}

export interface ComponentSlot {
  name: string;
  description: string;
  required: boolean;
  defaultContent?: string;
  validation?: SlotValidation;
}

export interface SlotValidation {
  allowedComponents?: string[];
  maxChildren?: number;
  minChildren?: number;
}

export interface RenderCondition {
  type: ConditionType;
  expression: string;
}

export interface AccessibilityConfig {
  roles: AriaRole[];
  properties: AriaProperty[];
  states: AriaState[];
  keyboardNavigation: KeyboardConfig;
  screenReader: ScreenReaderConfig;
}

export interface AriaRole {
  name: string;
  required: boolean;
  description: string;
}

export interface AriaProperty {
  name: string;
  value: string | boolean | number;
  description: string;
}

export interface AriaState {
  name: string;
  value: string | boolean;
  condition: string;
}

export interface KeyboardConfig {
  shortcuts: KeyboardShortcut[];
  focusable: boolean;
  tabIndex?: number;
  focusManagement: FocusManagement;
}

export interface KeyboardShortcut {
  key: string;
  modifiers: KeyModifier[];
  action: string;
  description: string;
}

export enum KeyModifier {
  CTRL = 'ctrl',
  ALT = 'alt',
  SHIFT = 'shift',
  META = 'meta'
}

export interface FocusManagement {
  strategy: FocusStrategy;
  initialFocus?: string;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

export enum FocusStrategy {
  AUTO = 'auto',
  MANUAL = 'manual',
  FIRST_ELEMENT = 'firstElement',
  LAST_ELEMENT = 'lastElement'
}

export interface ScreenReaderConfig {
  announcements: Announcement[];
  descriptions: Description[];
  labels: Label[];
}

export interface Announcement {
  trigger: string;
  message: string;
  priority: AnnouncementPriority;
}

export enum AnnouncementPriority {
  POLITE = 'polite',
  ASSERTIVE = 'assertive'
}

export interface Description {
  target: string;
  text: string;
  context?: string;
}

export interface Label {
  target: string;
  text: string;
  required: boolean;
}

export interface ResponsiveConfig {
  breakpoints: ResponsiveBreakpoint[];
  strategy: ResponsiveStrategy;
  layout: ResponsiveLayout;
}

export interface ResponsiveBreakpoint {
  name: string;
  minWidth: string;
  maxWidth?: string;
  orientation?: Orientation;
}

export enum Orientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

export enum ResponsiveStrategy {
  MOBILE_FIRST = 'mobileFirst',
  DESKTOP_FIRST = 'desktopFirst',
  ADAPTIVE = 'adaptive'
}

export interface ResponsiveLayout {
  columns: ResponsiveColumns;
  spacing: ResponsiveSpacing;
  typography: ResponsiveTypography;
}

export interface ResponsiveColumns {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ResponsiveSpacing {
  padding: ResponsiveValue;
  margin: ResponsiveValue;
  gap: ResponsiveValue;
}

export interface ResponsiveTypography {
  fontSize: ResponsiveValue;
  lineHeight: ResponsiveValue;
  letterSpacing: ResponsiveValue;
}

export interface ResponsiveValue {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeableProps {
  colorProps: string[];
  spacingProps: string[];
  typographyProps: string[];
  borderProps: string[];
  shadowProps: string[];
  customProps: CustomThemeProp[];
}

export interface CustomThemeProp {
  name: string;
  themeKey: string;
  transform?: ThemeTransform;
}

export interface ThemeTransform {
  type: TransformType;
  function: string;
}

export enum TransformType {
  SCALE = 'scale',
  MAP = 'map',
  FUNCTION = 'function'
}

export interface StyleDefinition {
  base: CSSProperties;
  variants: Record<string, CSSProperties>;
  states: Record<string, CSSProperties>;
  responsive: Record<string, CSSProperties>;
}

export interface CSSProperties {
  [key: string]: string | number | undefined;
}

export interface StyleOverrides {
  [selector: string]: Record<string, string | number | undefined>;
}

export interface PreviewConfig {
  width?: string;
  height?: string;
  background?: string;
  padding?: string;
  centered?: boolean;
  props?: Record<string, any>;
}

export interface TemplateLibrary {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  themes: UITheme[];
  components: ComponentTemplate[];
  patterns: DesignPattern[];
  assets: AssetDefinition[];
  metadata: LibraryMetadata;
}

export interface DesignPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  components: string[];
  composition: PatternComposition;
  guidelines: DesignGuideline[];
  examples: PatternExample[];
}

export enum PatternCategory {
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  FORM = 'form',
  CONTENT = 'content',
  FEEDBACK = 'feedback',
  ACTION = 'action'
}

export interface PatternComposition {
  structure: ComponentStructure[];
  relationships: ComponentRelationship[];
  constraints: CompositionConstraint[];
}

export interface ComponentRelationship {
  parent: string;
  child: string;
  type: RelationshipType;
  properties: Record<string, any>;
}

export enum RelationshipType {
  CONTAINS = 'contains',
  REFERENCES = 'references',
  DEPENDS_ON = 'dependsOn',
  TRIGGERS = 'triggers'
}

export interface CompositionConstraint {
  type: ConstraintType;
  target: string;
  condition: string;
  message: string;
}

export enum ConstraintType {
  REQUIRED = 'required',
  FORBIDDEN = 'forbidden',
  CONDITIONAL = 'conditional',
  COUNT = 'count'
}

export interface DesignGuideline {
  title: string;
  description: string;
  type: GuidelineType;
  examples: GuidelineExample[];
}

export enum GuidelineType {
  DO = 'do',
  DONT = 'dont',
  CONSIDER = 'consider',
  WARNING = 'warning'
}

export interface GuidelineExample {
  description: string;
  code?: string;
  image?: string;
}

export interface PatternExample {
  name: string;
  description: string;
  code: string;
  preview?: PreviewConfig;
}

export interface AssetDefinition {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  metadata: AssetMetadata;
}

export enum AssetType {
  IMAGE = 'image',
  ICON = 'icon',
  FONT = 'font',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export interface AssetMetadata {
  size: number;
  format: string;
  dimensions?: AssetDimensions;
  altText?: string;
  tags: string[];
}

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface LibraryMetadata {
  created: string;
  updated: string;
  tags: string[];
  dependencies: LibraryDependency[];
  compatibility: CompatibilityInfo;
}

export interface LibraryDependency {
  name: string;
  version: string;
  optional: boolean;
}

export interface CompatibilityInfo {
  frameworks: string[];
  browsers: BrowserSupport[];
  devices: DeviceSupport[];
}

export interface BrowserSupport {
  name: string;
  version: string;
  support: SupportLevel;
}

export interface DeviceSupport {
  type: DeviceType;
  support: SupportLevel;
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  WEARABLE = 'wearable'
}

export enum SupportLevel {
  FULL = 'full',
  PARTIAL = 'partial',
  NONE = 'none'
}

export interface TemplateBuilder {
  createComponent(template: ComponentTemplate): ComponentInstance;
  createPattern(pattern: DesignPattern): PatternInstance;
  applyTheme(theme: UITheme): void;
  generateCode(target: CodeTarget): string;
  validate(instance: ComponentInstance): ValidationResult;
}

export interface ComponentInstance {
  id: string;
  template: ComponentTemplate;
  props: Record<string, any>;
  children: ComponentInstance[];
  styles: ComputedStyles;
}

export interface PatternInstance {
  id: string;
  pattern: DesignPattern;
  components: ComponentInstance[];
  relationships: ResolvedRelationship[];
}

export interface ResolvedRelationship extends ComponentRelationship {
  parentInstance: ComponentInstance;
  childInstance: ComponentInstance;
}

export interface ComputedStyles {
  base: CSSProperties;
  state: CSSProperties;
  responsive: Record<string, CSSProperties>;
  custom: CSSProperties;
}

export enum CodeTarget {
  REACT = 'react',
  VUE = 'vue',
  ANGULAR = 'angular',
  HTML = 'html',
  CSS = 'css',
  SCSS = 'scss',
  STYLED_COMPONENTS = 'styled-components',
  EMOTION = 'emotion'
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: ErrorType;
  message: string;
  property?: string;
  value?: any;
}

export interface ValidationWarning {
  type: WarningType;
  message: string;
  suggestion?: string;
}

export enum ErrorType {
  REQUIRED_PROP = 'requiredProp',
  INVALID_TYPE = 'invalidType',
  INVALID_VALUE = 'invalidValue',
  CONSTRAINT_VIOLATION = 'constraintViolation',
  ACCESSIBILITY_ERROR = 'accessibilityError'
}

export enum WarningType {
  DEPRECATED_PROP = 'deprecatedProp',
  PERFORMANCE_WARNING = 'performanceWarning',
  ACCESSIBILITY_WARNING = 'accessibilityWarning',
  DESIGN_WARNING = 'designWarning'
}

export type TemplateEventHandler = (event: TemplateEvent) => void;

export interface TemplateEvent {
  type: TemplateEventType;
  target: ComponentInstance | PatternInstance;
  data: any;
  timestamp: number;
}

export enum TemplateEventType {
  COMPONENT_CREATED = 'componentCreated',
  COMPONENT_UPDATED = 'componentUpdated',
  COMPONENT_DESTROYED = 'componentDestroyed',
  THEME_CHANGED = 'themeChanged',
  VALIDATION_ERROR = 'validationError',
  RENDER_ERROR = 'renderError'
}

export interface TemplateCustomizer {
  customizeComponent(template: ComponentTemplate, customizations: ComponentCustomization): ComponentTemplate;
  customizeTheme(theme: UITheme, customizations: ThemeCustomization): UITheme;
  createVariant(base: ComponentTemplate, variant: VariantDefinition): ComponentTemplate;
}

export interface ComponentCustomization {
  props?: PropCustomization[];
  styles?: StyleCustomization;
  behavior?: BehaviorCustomization;
  accessibility?: AccessibilityCustomization;
}

export interface PropCustomization {
  name: string;
  defaultValue?: any;
  validation?: ValidationRule[];
  required?: boolean;
}

export interface StyleCustomization {
  base?: CSSProperties;
  variants?: Record<string, CSSProperties>;
  states?: Record<string, CSSProperties>;
  responsive?: Record<string, CSSProperties>;
}

export interface BehaviorCustomization {
  events?: EventCustomization[];
  animations?: AnimationCustomization[];
}

export interface EventCustomization {
  event: string;
  handler: string;
  conditions?: string[];
}

export interface AnimationCustomization {
  name: string;
  keyframes: Keyframe[];
  options: AnimationOptions;
}

export interface Keyframe {
  offset: number;
  styles: CSSProperties;
}

export interface AnimationOptions {
  duration: string;
  easing: string;
  iterations: number | 'infinite';
  direction: AnimationDirection;
  fillMode: AnimationFillMode;
}

export enum AnimationDirection {
  NORMAL = 'normal',
  REVERSE = 'reverse',
  ALTERNATE = 'alternate',
  ALTERNATE_REVERSE = 'alternate-reverse'
}

export enum AnimationFillMode {
  NONE = 'none',
  FORWARDS = 'forwards',
  BACKWARDS = 'backwards',
  BOTH = 'both'
}

export interface AccessibilityCustomization {
  roles?: AriaRole[];
  properties?: AriaProperty[];
  states?: AriaState[];
  keyboard?: KeyboardConfig;
}

export interface ThemeCustomization {
  colors?: Partial<ColorPalette>;
  typography?: Partial<Typography>;
  spacing?: Partial<SpacingScale>;
  shadows?: Partial<ShadowScale>;
  borderRadius?: Partial<BorderRadiusScale>;
  animations?: Partial<AnimationConfig>;
}

export interface VariantDefinition {
  name: string;
  description: string;
  baseProps: Record<string, any>;
  styleOverrides: StyleOverrides;
  behaviorOverrides?: BehaviorCustomization;
}