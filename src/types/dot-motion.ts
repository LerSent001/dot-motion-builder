export type CanvasBackground = "dark-grid" | "plain-dark" | "glass";
export type PreviewMode = "split" | "focus";
export type AnimationMode = "blink" | "linear" | "directional" | "wave" | "pulse";
export type Direction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";
export type Easing = "linear" | "ease-in" | "ease-out" | "ease-in-out";
export type AnimationStyle = "opacity-only" | "pulse-size" | "depth-shift" | "bloom-pop";
export type InactiveStyle = "none" | "static-dim" | "breathe" | "ghost";
export type MotionPresetId =
  | "blink"
  | "wave"
  | "sweep"
  | "bloom"
  | "fish-eye"
  | "ripple"
  | "pulse"
  | "spiral"
  | "corners"
  | "snake"
  | "checkerboard"
  | "rain"
  | "pinwheel";
export type CellShape =
  | "rectangle"
  | "triangle"
  | "star"
  | "diamond"
  | "heart"
  | "square"
  | "rounded-rect"
  | "circle"
  | "pill";
export type LoaderKind = "custom" | "sequence";
export type LayoutType =
  | "icon-only"
  | "icon-label"
  | "status-pill"
  | "button-loader"
  | "card-loader";
export type ExportFormat = "project-json" | "svg" | "css" | "react" | "lottie" | "svga" | "png-sequence";
export type PatternPresetId = "spinner" | "checker" | "ring" | "wave-diagonal";

export type Project = {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasConfig;
  loaders: LoaderComponent[];
  assets: AssetLibrary;
  settings: ProjectSettings;
};

export type CanvasConfig = {
  zoom: number;
  panX: number;
  panY: number;
  background: CanvasBackground;
  previewMode: PreviewMode;
};

export type LoaderComponent = {
  id: string;
  name: string;
  kind?: LoaderKind;
  sequenceId?: string;
  sequenceIndex?: number;
  visible: boolean;
  artboard: ArtboardConfig;
  layout: LayoutConfig;
  pattern: PatternConfig;
  animation: AnimationConfig;
  style: StyleConfig;
  text?: TextConfig;
  effects?: EffectsConfig;
  modes?: LoaderModes;
};

export type ArtboardConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PatternConfig = {
  grid: GridConfig;
  activeCells: number[];
  snapshots: PatternSnapshot[];
  sourceType: "drawn" | "template" | "generated";
  presetId?: PatternPresetId | "custom";
  templateId?: string;
};

export type LoaderModeState = {
  grid: GridConfig;
  activeCells: number[];
  animation: AnimationConfig;
  templateId?: string;
};

export type LoaderModes = {
  drawn: LoaderModeState;
  template: LoaderModeState;
};

export type GridConfig = {
  rows: number;
  cols: number;
  cellSize: number;
  gap: number;
  symmetryX?: boolean;
  symmetryY?: boolean;
};

export type PatternSnapshot = {
  id: string;
  name?: string;
  activeCells: number[];
  duration?: number;
  rows?: number;
  cols?: number;
  presetId?: PatternPresetId | "custom";
};

export type AnimationConfig = {
  presetId: MotionPresetId;
  mode: AnimationMode;
  direction: Direction;
  originX: number;
  originY: number;
  fps: number;
  loop: boolean;
  durationMs: number;
  staggerMs: number;
  segment: number;
  easing: Easing;
  style: AnimationStyle;
  inactiveStyle: InactiveStyle;
  scaleIntensity?: number;
};

export type StyleConfig = {
  cellShape: CellShape;
  radius: number;
  innerRadius?: number;
  primaryColor: string;
  primaryAlpha?: number;
  secondaryColor?: string;
  backgroundColor?: string;
  backgroundAlpha?: number;
  glow: number;
  glowColor?: string;
  glowAlpha?: number;
  shadow: boolean;
  backgroundStyle: "none" | "grid" | "panel" | "glass";
  containerRadius: number;
};

export type TextConfig = {
  content: string;
  enabled: boolean;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  letterSpacing: number;
  color: string;
};

export type LayoutConfig = {
  type: LayoutType;
  width?: number;
  height?: number;
  paddingX: number;
  paddingY: number;
  gap: number;
  align: "left" | "center";
};

export type EffectsConfig = {
  shimmer?: boolean;
};

export type AssetLibrary = {
  patterns: PatternSnapshot[];
  templates: LoaderTemplate[];
};

export type LoaderTemplate = {
  id: string;
  name: string;
  category: string;
  description?: string;
  loader: LoaderComponent;
};

export type PatternPreset = {
  id: PatternPresetId;
  name: string;
  description: string;
};

export type MotionPreset = {
  id: MotionPresetId;
  name: string;
  description: string;
  supportsDirection?: boolean;
  supportsOrigin?: boolean;
};

export type ProjectSettings = {
  autosave: boolean;
  theme: "dark";
};

export type Timeline = {
  durationMs: number;
  fps: number;
  totalFrames: number;
  width: number;
  height: number;
  tracks: CellTrack[];
};

export type CellTrack = {
  cellIndex: number;
  row: number;
  col: number;
  x: number;
  y: number;
  size: number;
  delayMs: number;
  keyframes: CellKeyframe[];
};

export type CellKeyframe = {
  timeMs: number;
  opacity: number;
  scale: number;
};

export type ExportArtifact = {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  content: string;
  notes?: string[];
};
