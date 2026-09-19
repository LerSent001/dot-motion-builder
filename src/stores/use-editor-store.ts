"use client";

import { create } from "zustand";
import { normalizeCellShape } from "@/lib/cell-shapes";
import { createMockProject, PROJECT_VERSION } from "@/lib/mock-project";
import { getDefaultMotionConfig } from "@/lib/motion-presets";
import { buildPatternCells } from "@/lib/pattern-presets";
import { loadProject, saveProject } from "@/lib/persistence";
import {
  AnimationConfig,
  AnimationMode,
  CellShape,
  Direction,
  ExportFormat,
  GridConfig,
  LayoutType,
  LoaderKind,
  LoaderComponent,
  MotionPresetId,
  PatternPresetId,
  PatternSnapshot,
  Project
} from "@/types/dot-motion";

type EditorState = {
  hydrated: boolean;
  project: Project;
  selectedLoaderId: string;
  focusModeLoaderId: string | null;
  clipboardLoader: LoaderComponent | null;
  exportFormat: ExportFormat;
  isPreviewing: boolean;
  hydrate: () => void;
  selectLoader: (loaderId: string) => void;
  clearSelection: () => void;
  toggleCell: (cellIndex: number) => void;
  setCellActive: (cellIndex: number, active: boolean) => void;
  toggleCellForLoader: (loaderId: string, cellIndex: number) => void;
  setCellActiveForLoader: (loaderId: string, cellIndex: number, active: boolean) => void;
  setPatternSourceType: (sourceType: "template" | "drawn") => void;
  addLoader: (kind?: LoaderKind) => void;
  addSequenceFrame: (sequenceId: string) => void;
  removeSequenceFrame: (sequenceId: string, loaderId?: string) => void;
  copySelectedLoader: () => void;
  pasteLoader: () => void;
  duplicateSelectedLoader: () => void;
  deleteSelectedLoader: () => void;
  moveLoader: (loaderId: string, position: { x: number; y: number }) => void;
  moveLoaders: (positions: Array<{ id: string; x: number; y: number }>) => void;
  renameLoader: (name: string) => void;
  setAnimationMode: (mode: AnimationMode) => void;
  setMotionPreset: (presetId: MotionPresetId) => void;
  setMotionOrigin: (axis: "x" | "y", value: number) => void;
  setDirection: (direction: Direction) => void;
  setFps: (value: number) => void;
  setScaleIntensity: (value: number) => void;
  setSpeed: (value: number) => void;
  fillGrid: (filled: boolean) => void;
  setAnimationStyle: (value: "opacity-only" | "pulse-size" | "depth-shift" | "bloom-pop") => void;
  setInactiveStyle: (value: "none" | "static-dim" | "breathe" | "ghost") => void;
  setPrimaryColor: (value: string) => void;
  setPrimaryAlpha: (value: number) => void;
  setGlowEnabled: (value: boolean) => void;
  setGlowSize: (value: number) => void;
  setBackgroundColor: (value: string) => void;
  setBackgroundAlpha: (value: number) => void;
  setCellShape: (value: CellShape) => void;
  setGridSize: (size: number) => void;
  setGridGap: (value: number) => void;
  setLayoutType: (type: LayoutType) => void;
  setLabel: (value: string) => void;
  setExportFormat: (format: ExportFormat) => void;
  togglePreview: () => void;
  enterFocusMode: (loaderId?: string) => void;
  exitFocusMode: () => void;
  applyLoaderTemplate: (templateId: string) => void;
  applyPatternPreset: (presetId: PatternPresetId) => void;
  applySavedPattern: (patternId: string) => void;
  captureSnapshot: () => void;
  clearSnapshots: () => void;
  savePatternToLibrary: () => void;
  setCanvasView: (view: { zoom: number; panX: number; panY: number }) => void;
  resetCanvasView: () => void;
};

const DEFAULT_DRAWN_GRID: GridConfig = {
  rows: 6,
  cols: 6,
  cellSize: 16,
  gap: 6
};

const DEFAULT_BACKGROUND_COLOR = "#2D3743";

const ARTBOARD_SIZE = 420;
const SEQUENCE_FRAME_GAP = 28;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cloneGrid(grid: GridConfig): GridConfig {
  return { ...grid };
}

function sanitizeGrid(grid?: GridConfig): GridConfig {
  const source = grid ?? DEFAULT_DRAWN_GRID;

  return {
    rows: clamp(Math.round(source.rows ?? DEFAULT_DRAWN_GRID.rows), 2, 13),
    cols: clamp(Math.round(source.cols ?? DEFAULT_DRAWN_GRID.cols), 2, 13),
    cellSize: source.cellSize ?? DEFAULT_DRAWN_GRID.cellSize,
    gap: clamp(Math.round(source.gap ?? DEFAULT_DRAWN_GRID.gap), 0, 20),
    symmetryX: source.symmetryX,
    symmetryY: source.symmetryY
  };
}

function sanitizeActiveCells(cells: number[] | undefined, grid: GridConfig) {
  const maxIndex = grid.rows * grid.cols;
  return [...new Set((cells ?? []).filter((cellIndex) => Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < maxIndex))].sort(
    (left, right) => left - right
  );
}

function normalizeDirection(direction: unknown): Direction {
  switch (direction) {
    case "up":
    case "down":
    case "left":
    case "right":
    case "up-left":
    case "up-right":
    case "down-left":
    case "down-right":
      return direction;
    case "diag-up":
      return "up-right";
    case "diag-down":
      return "down-right";
    default:
      return "right";
  }
}

function normalizeMotionPresetId(value: unknown, fallbackPresetId: MotionPresetId = "wave"): MotionPresetId {
  switch (value) {
    case "blink":
    case "wave":
    case "sweep":
    case "bloom":
    case "fish-eye":
    case "ripple":
    case "pulse":
    case "spiral":
    case "corners":
    case "snake":
    case "checkerboard":
    case "rain":
    case "pinwheel":
    case "radar": case "orbit": case "heartbeat": case "equalizer": case "dna": case "sparkle": case "breathing": case "sine": case "collapse":
      return value;
    case "center-out":
    case "converge":
      return "ripple";
    case "cross":
      return "checkerboard";

    case "zigzag":
      return "wave";
    default:
      return fallbackPresetId;
  }
}

function normalizeAnimation(
  animation: Partial<AnimationConfig> | undefined,
  grid: GridConfig,
  fallbackPresetId: MotionPresetId = "wave"
): AnimationConfig {
  const presetId = normalizeMotionPresetId(animation?.presetId, fallbackPresetId);
  const defaults = getDefaultMotionConfig(presetId);
  const merged = {
    presetId,
    mode: "wave" as const,
    direction: "right" as const,
    originX: Math.ceil(grid.cols / 2),
    originY: Math.ceil(grid.rows / 2),
    fps: 18,
    loop: true,
    durationMs: 1200,
    staggerMs: 120,
    segment: 4,
    easing: "ease-in-out" as const,
    style: "pulse-size" as const,
    inactiveStyle: "breathe" as const,
    scaleIntensity: 0.24,
    ...defaults,
    ...animation
  };

  return {
    ...merged,
    presetId,
    direction: normalizeDirection(merged.direction),
    originX: clamp(Math.round(merged.originX ?? Math.ceil(grid.cols / 2)), 1, grid.cols),
    originY: clamp(Math.round(merged.originY ?? Math.ceil(grid.rows / 2)), 1, grid.rows),
    fps: clamp(Math.round(merged.fps ?? 30), 1, 60),
    speed: clamp(Number(merged.speed ?? 1), .25, 3),
    durationMs: clamp(Math.round(merged.durationMs ?? 1200), 520, 4800),
    staggerMs: Math.max(0, Math.round(merged.staggerMs ?? 0)),
    scaleIntensity: clamp(Number(merged.scaleIntensity ?? 0.24), 0, 1)
  };
}

function getArtboardPosition(index: number) {
  const columns = 3;
  const baseX = 120;
  const baseY = 140;
  const gapX = 460;
  const gapY = 520;
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: baseX + col * gapX,
    y: baseY + row * gapY,
    width: ARTBOARD_SIZE,
    height: ARTBOARD_SIZE
  };
}

function artboardsOverlap(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
  margin = 44
) {
  return !(
    left.x + left.width + margin <= right.x ||
    right.x + right.width + margin <= left.x ||
    left.y + left.height + margin <= right.y ||
    right.y + right.height + margin <= left.y
  );
}

function findNearbyArtboardPosition(loaders: LoaderComponent[], baseLoader?: LoaderComponent) {
  const base = baseLoader?.artboard ?? loaders[loaders.length - 1]?.artboard ?? getArtboardPosition(0);
  const step = ARTBOARD_SIZE + 72;
  const candidates: Array<{ x: number; y: number; width: number; height: number }> = [
    { x: base.x + step, y: base.y, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x, y: base.y + step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x - step, y: base.y, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x, y: base.y - step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x + step, y: base.y + step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x + step, y: base.y - step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x - step, y: base.y + step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
    { x: base.x - step, y: base.y - step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE }
  ];

  for (let ring = 2; ring <= 6; ring += 1) {
    candidates.push(
      { x: base.x + step * ring, y: base.y, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
      { x: base.x, y: base.y + step * ring, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
      { x: base.x + step * ring, y: base.y + step, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE },
      { x: base.x + step, y: base.y + step * ring, width: ARTBOARD_SIZE, height: ARTBOARD_SIZE }
    );
  }

  return candidates.find((candidate) => loaders.every((loader) => !artboardsOverlap(candidate, loader.artboard))) ?? getArtboardPosition(loaders.length);
}

function sortSequenceFrames(loaders: LoaderComponent[], sequenceId: string) {
  return loaders
    .filter((loader) => loader.sequenceId === sequenceId)
    .sort((left, right) => (left.sequenceIndex ?? 0) - (right.sequenceIndex ?? 0));
}

function reindexSequenceLoaders(loaders: LoaderComponent[]) {
  const sequenceIds = [...new Set(loaders.map((loader) => loader.sequenceId).filter(Boolean))] as string[];
  let nextLoaders = loaders;

  sequenceIds.forEach((sequenceId) => {
    const frames = sortSequenceFrames(nextLoaders, sequenceId);
    const firstFrame = frames[0];
    nextLoaders = nextLoaders.map((loader) => {
      if (loader.sequenceId !== sequenceId) {
        return loader;
      }

      const sequenceIndex = frames.findIndex((frame) => frame.id === loader.id);
      const safeIndex = Math.max(0, sequenceIndex);
      return {
        ...loader,
        kind: "sequence",
        sequenceIndex: safeIndex,
        artboard: firstFrame
          ? {
              ...loader.artboard,
              x: firstFrame.artboard.x + safeIndex * (ARTBOARD_SIZE + SEQUENCE_FRAME_GAP),
              y: firstFrame.artboard.y,
              width: ARTBOARD_SIZE,
              height: ARTBOARD_SIZE
            }
          : loader.artboard
      };
    });
  });

  return nextLoaders;
}

function shouldUpdateWithSelected(loader: LoaderComponent, selectedLoader: LoaderComponent | undefined, updateSequence = false) {
  if (!selectedLoader) {
    return false;
  }

  return loader.id === selectedLoader.id || Boolean(updateSequence && selectedLoader.sequenceId && loader.sequenceId === selectedLoader.sequenceId);
}

function normalizeLoader(loader: LoaderComponent, index: number): LoaderComponent {
  const grid = sanitizeGrid(loader.pattern.grid);
  const animation = normalizeAnimation(loader.animation, grid, loader.animation.presetId ?? "wave");
  const activeCells = sanitizeActiveCells(loader.pattern.activeCells, grid);

  return {
    ...loader,
    id: loader.id ?? crypto.randomUUID(),
    name: loader.name || `Loader ${index + 1}`,
    kind: loader.sequenceId ? "sequence" : loader.kind ?? "custom",
    sequenceId: loader.sequenceId,
    sequenceIndex: loader.sequenceIndex,
    visible: loader.visible ?? true,
    artboard: {
      ...getArtboardPosition(index),
      ...(loader.artboard ?? {})
    },
    layout: {
      type: loader.layout?.type ?? "status-pill",
      width: loader.layout?.width ?? 220,
      height: loader.layout?.height ?? 56,
      paddingX: loader.layout?.paddingX ?? 18,
      paddingY: loader.layout?.paddingY ?? 14,
      gap: loader.layout?.gap ?? 12,
      align: loader.layout?.align ?? "left"
    },
    pattern: {
      ...loader.pattern,
      grid: cloneGrid(grid),
      activeCells,
      snapshots: (loader.pattern.snapshots ?? []).map((snapshot) => ({
        ...snapshot,
        rows: snapshot.rows ?? grid.rows,
        cols: snapshot.cols ?? grid.cols,
        presetId: snapshot.presetId ?? "custom"
      })),
      sourceType: "drawn",
      presetId: "custom",
      templateId: undefined
    },
    animation,
    style: {
      cellShape: normalizeCellShape(loader.style?.cellShape),
      radius: clamp(loader.style?.radius ?? 8, 0, grid.cellSize / 2),
      innerRadius: clamp(Number(loader.style?.innerRadius ?? 0.48), 0.2, 0.8),
      primaryColor: loader.style?.primaryColor ?? "#66BDFF",
      primaryAlpha: clamp(loader.style?.primaryAlpha ?? 1, 0, 1),
      secondaryColor: loader.style?.secondaryColor ?? "#B9E3FF",
      backgroundColor: loader.style?.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
      backgroundAlpha: clamp(loader.style?.backgroundAlpha ?? 1, 0, 1),
      glow: clamp(loader.style?.glow ?? 16, 0, 48),
      glowColor: loader.style?.glowColor,
      glowAlpha: clamp(loader.style?.glowAlpha ?? 1, 0, 1),
      shadow: loader.style?.shadow ?? true,
      backgroundStyle: loader.style?.backgroundStyle ?? "glass",
      containerRadius: loader.style?.containerRadius ?? 42
    },
    text: loader.text
      ? {
          ...loader.text,
          content: loader.text.content || loader.name || `Loader ${index + 1}`
        }
      : {
          content: loader.name || `Loader ${index + 1}`,
          enabled: false,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.04,
          color: "rgba(255,255,255,0.92)"
        },
    effects: {
      shimmer: loader.effects?.shimmer ?? false
    }
  };
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    canvas: {
      zoom: project.canvas?.zoom ?? 1,
      panX: project.canvas?.panX ?? 0,
      panY: project.canvas?.panY ?? 0,
      background: project.canvas?.background ?? "dark-grid",
      previewMode: project.canvas?.previewMode ?? "split"
    },
    assets: {
      ...project.assets,
      patterns: (project.assets.patterns ?? []).map((pattern) => ({
        ...pattern,
        rows: clamp(Math.round(pattern.rows ?? DEFAULT_DRAWN_GRID.rows), 2, 13),
        cols: clamp(Math.round(pattern.cols ?? DEFAULT_DRAWN_GRID.cols), 2, 13),
        presetId: pattern.presetId ?? "custom"
      })),
      templates: []
    },
    loaders: reindexSequenceLoaders(project.loaders.map((loader, index) => normalizeLoader(loader, index)))
  };
}

function createBlankCustomLoader(index: number, baseLoader?: LoaderComponent, kind: LoaderKind = "custom", sequenceId?: string): LoaderComponent {
  const grid = sanitizeGrid(baseLoader?.pattern.grid ?? DEFAULT_DRAWN_GRID);
  const animation = normalizeAnimation(
    {
      ...(baseLoader?.animation ?? getDefaultMotionConfig("wave")),
      presetId: baseLoader?.animation.presetId ?? "wave",
      originX: Math.ceil(grid.cols / 2),
      originY: Math.ceil(grid.rows / 2)
    },
    grid,
    baseLoader?.animation.presetId ?? "wave"
  );

  return normalizeLoader(
    {
      id: crypto.randomUUID(),
      name: `Loader ${index + 1}`,
      kind,
      sequenceId,
      sequenceIndex: kind === "sequence" ? 0 : undefined,
      visible: true,
      artboard: getArtboardPosition(index),
      layout: baseLoader?.layout ?? {
        type: "status-pill",
        width: 220,
        height: 56,
        paddingX: 18,
        paddingY: 14,
        gap: 12,
        align: "left"
      },
      pattern: {
        grid,
        activeCells: [],
        snapshots: [],
        sourceType: "drawn",
        presetId: "custom"
      },
      animation,
      style: {
        cellShape: normalizeCellShape(baseLoader?.style.cellShape),
        radius: clamp(baseLoader?.style.radius ?? 8, 0, grid.cellSize / 2),
        innerRadius: clamp(Number(baseLoader?.style.innerRadius ?? 0.48), 0.2, 0.8),
        primaryColor: baseLoader?.style.primaryColor ?? "#66BDFF",
        primaryAlpha: clamp(baseLoader?.style.primaryAlpha ?? 1, 0, 1),
        secondaryColor: baseLoader?.style.secondaryColor ?? "#B9E3FF",
        backgroundColor: baseLoader?.style.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
        backgroundAlpha: clamp(baseLoader?.style.backgroundAlpha ?? 1, 0, 1),
        glow: clamp(baseLoader?.style.glow ?? 16, 0, 48),
        glowColor: baseLoader?.style.glowColor,
        glowAlpha: clamp(baseLoader?.style.glowAlpha ?? 1, 0, 1),
        shadow: baseLoader?.style.shadow ?? true,
        backgroundStyle: baseLoader?.style.backgroundStyle ?? "glass",
        containerRadius: baseLoader?.style.containerRadius ?? 42
      },
      text: {
        content: `Loader ${index + 1}`,
        enabled: false,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 0.04,
        color: "rgba(255,255,255,0.92)"
      },
      effects: {
        shimmer: false
      }
    },
    index
  );
}

function cloneLoader(loader: LoaderComponent, index: number): LoaderComponent {
  return normalizeLoader(
    {
      ...loader,
      id: crypto.randomUUID(),
      name: `${loader.name} Copy`,
      kind: "custom",
      sequenceId: undefined,
      sequenceIndex: undefined,
      artboard: {
        ...loader.artboard,
        x: loader.artboard.x + 56,
        y: loader.artboard.y + 56
      },
      pattern: {
        ...loader.pattern,
        activeCells: [...loader.pattern.activeCells],
        snapshots: [...loader.pattern.snapshots]
      },
      animation: {
        ...loader.animation
      },
      style: {
        ...loader.style
      }
    },
    index
  );
}

function updateSelectedLoader(
  project: Project,
  selectedLoaderId: string,
  update: (loader: LoaderComponent) => LoaderComponent,
  options: { updateSequence?: boolean } = {}
) {
  const selectedLoader = project.loaders.find((loader) => loader.id === selectedLoaderId);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    loaders: project.loaders.map((loader, index) => {
      if (!shouldUpdateWithSelected(loader, selectedLoader, options.updateSequence)) {
        return loader;
      }

      return normalizeLoader(update(loader), index);
    })
  };
}

function updateLoaderById(
  project: Project,
  loaderId: string,
  update: (loader: LoaderComponent) => LoaderComponent
) {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    loaders: project.loaders.map((loader, index) => (
      loader.id === loaderId ? normalizeLoader(update(loader), index) : loader
    ))
  };
}

const initialProject = normalizeProject(createMockProject());

export const useEditorStore = create<EditorState>((set, get) => ({
  hydrated: false,
  project: initialProject,
  selectedLoaderId: initialProject.loaders[0]?.id ?? "",
  focusModeLoaderId: null,
  clipboardLoader: null,
  exportFormat: "web",
  isPreviewing: false,
  hydrate: () => {
    const persisted = loadProject();
    if (persisted && persisted.version === PROJECT_VERSION) {
      const normalized = normalizeProject(persisted);
      set({
        hydrated: true,
        project: normalized,
        selectedLoaderId: normalized.loaders[0]?.id ?? "",
        focusModeLoaderId: null
      });
      return;
    }

    saveProject(initialProject);
    set({
      hydrated: true,
      project: initialProject,
      selectedLoaderId: initialProject.loaders[0]?.id ?? "",
      focusModeLoaderId: null
    });
  },
  selectLoader: (loaderId) => set({ selectedLoaderId: loaderId }),
  clearSelection: () => set({ selectedLoaderId: "", focusModeLoaderId: null }),
  toggleCell: (cellIndex) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => {
        const hasCell = loader.pattern.activeCells.includes(cellIndex);
        const nextCells = hasCell
          ? loader.pattern.activeCells.filter((value) => value !== cellIndex)
          : [...loader.pattern.activeCells, cellIndex].sort((left, right) => left - right);

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            activeCells: sanitizeActiveCells(nextCells, loader.pattern.grid)
          }
        };
      });

      saveProject(project);
      return { project };
    }),
  setCellActive: (cellIndex, active) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => {
        const hasCell = loader.pattern.activeCells.includes(cellIndex);
        if (hasCell === active) {
          return loader;
        }

        const nextCells = active
          ? [...loader.pattern.activeCells, cellIndex].sort((left, right) => left - right)
          : loader.pattern.activeCells.filter((value) => value !== cellIndex);

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            activeCells: sanitizeActiveCells(nextCells, loader.pattern.grid)
          }
        };
      });

      saveProject(project);
      return { project };
    }),
  toggleCellForLoader: (loaderId, cellIndex) =>
    set((state) => {
      const project = updateLoaderById(state.project, loaderId, (loader) => {
        const hasCell = loader.pattern.activeCells.includes(cellIndex);
        const nextCells = hasCell
          ? loader.pattern.activeCells.filter((value) => value !== cellIndex)
          : [...loader.pattern.activeCells, cellIndex].sort((left, right) => left - right);

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            activeCells: sanitizeActiveCells(nextCells, loader.pattern.grid)
          }
        };
      });

      saveProject(project);
      return { project };
    }),
  setCellActiveForLoader: (loaderId, cellIndex, active) =>
    set((state) => {
      const project = updateLoaderById(state.project, loaderId, (loader) => {
        const hasCell = loader.pattern.activeCells.includes(cellIndex);
        if (hasCell === active) {
          return loader;
        }

        const nextCells = active
          ? [...loader.pattern.activeCells, cellIndex].sort((left, right) => left - right)
          : loader.pattern.activeCells.filter((value) => value !== cellIndex);

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            activeCells: sanitizeActiveCells(nextCells, loader.pattern.grid)
          }
        };
      });

      saveProject(project);
      return { project };
    }),
  setPatternSourceType: () => undefined,
  addLoader: (kind = "custom") =>
    set((state) => {
      const base =
        state.project.loaders.find((loader) => loader.id === state.selectedLoaderId) ??
        state.project.loaders[state.project.loaders.length - 1];
      const sequenceId = kind === "sequence" ? crypto.randomUUID() : undefined;
      const loader = createBlankCustomLoader(state.project.loaders.length, base, kind, sequenceId);
      const nextLoader = {
        ...loader,
        animation: kind === "sequence"
          ? { ...loader.animation, fps: 6 }
          : loader.animation,
        artboard: findNearbyArtboardPosition(state.project.loaders, base)
      };
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders: [...state.project.loaders, nextLoader]
      };

      saveProject(project);
      return {
        project,
        selectedLoaderId: nextLoader.id
      };
    }),
  addSequenceFrame: (sequenceId) =>
    set((state) => {
      const frames = sortSequenceFrames(state.project.loaders, sequenceId);
      if (!frames.length || frames.length >= 10) {
        return {};
      }

      const base = frames[frames.length - 1];
      const nextLoader = {
        ...createBlankCustomLoader(state.project.loaders.length, base, "sequence", sequenceId),
        name: base.name,
        sequenceIndex: frames.length,
        artboard: {
          x: base.artboard.x + ARTBOARD_SIZE + SEQUENCE_FRAME_GAP,
          y: base.artboard.y,
          width: ARTBOARD_SIZE,
          height: ARTBOARD_SIZE
        },
        pattern: {
          ...base.pattern,
          grid: cloneGrid(base.pattern.grid),
          activeCells: [...base.pattern.activeCells],
          snapshots: [...base.pattern.snapshots]
        },
        text: base.text
          ? {
              ...base.text,
              content: base.name
            }
          : base.text
      };
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders: reindexSequenceLoaders([...state.project.loaders, nextLoader])
      };

      saveProject(project);
      return {
        project,
        selectedLoaderId: nextLoader.id
      };
    }),
  removeSequenceFrame: (sequenceId) =>
    set((state) => {
      const frames = sortSequenceFrames(state.project.loaders, sequenceId);
      if (frames.length <= 1) {
        return {};
      }

      const target = frames[frames.length - 1];
      const loaders = reindexSequenceLoaders(state.project.loaders.filter((loader) => loader.id !== target.id));
      const remainingFrames = sortSequenceFrames(loaders, sequenceId);
      const fallback = remainingFrames[remainingFrames.length - 1] ?? loaders[0];
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders
      };

      saveProject(project);
      return {
        project,
        selectedLoaderId: fallback?.id ?? ""
      };
    }),
  copySelectedLoader: () =>
    set((state) => ({
      clipboardLoader: state.project.loaders.find((loader) => loader.id === state.selectedLoaderId) ?? null
    })),
  pasteLoader: () =>
    set((state) => {
      const source =
        state.clipboardLoader ??
        state.project.loaders.find((loader) => loader.id === state.selectedLoaderId) ??
        state.project.loaders[0];
      if (!source) {
        return {};
      }

      const nextLoader = {
        ...cloneLoader(source, state.project.loaders.length),
        artboard: findNearbyArtboardPosition(state.project.loaders, source)
      };
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders: [...state.project.loaders, nextLoader]
      };

      saveProject(project);
      return {
        project,
        selectedLoaderId: nextLoader.id
      };
    }),
  duplicateSelectedLoader: () => {
    get().copySelectedLoader();
    get().pasteLoader();
  },
  deleteSelectedLoader: () =>
    set((state) => {
      if (state.project.loaders.length <= 1) {
        return {};
      }

      const currentIndex = state.project.loaders.findIndex((loader) => loader.id === state.selectedLoaderId);
      if (currentIndex === -1) {
        return {};
      }

      const currentLoader = state.project.loaders[currentIndex];
      const loaders = currentLoader.sequenceId
        ? state.project.loaders.filter((loader) => loader.sequenceId !== currentLoader.sequenceId)
        : state.project.loaders.filter((loader) => loader.id !== state.selectedLoaderId);
      if (!loaders.length) {
        return {};
      }
      const fallback = loaders[Math.max(0, currentIndex - 1)] ?? loaders[0];
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders: reindexSequenceLoaders(loaders)
      };

      saveProject(project);
      return {
        project,
        selectedLoaderId: fallback?.id ?? ""
      };
    }),
  moveLoader: (loaderId, position) =>
    set((state) => {
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders: state.project.loaders.map((loader) =>
          loader.id === loaderId
            ? {
                ...loader,
                artboard: {
                  ...loader.artboard,
                  x: position.x,
                  y: position.y
                }
              }
            : loader
        )
      };

      saveProject(project);
      return { project };
    }),
  moveLoaders: (positions) =>
    set((state) => {
      const updates = new Map(positions.map((position) => [position.id, position]));
      if (!updates.size) {
        return {};
      }

      let changed = false;
      const loaders = state.project.loaders.map((loader) => {
        const nextPosition = updates.get(loader.id);
        if (!nextPosition) {
          return loader;
        }

        changed = true;
        return {
          ...loader,
          artboard: {
            ...loader.artboard,
            x: nextPosition.x,
            y: nextPosition.y
          }
        };
      });

      if (!changed) {
        return {};
      }

      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        loaders
      };

      saveProject(project);
      return { project };
    }),
  renameLoader: (name) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        name,
        text: loader.text
          ? {
              ...loader.text,
              content: name
            }
          : loader.text
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setAnimationMode: () => undefined,
  fillGrid: (filled) => set((state) => {
    const project = updateSelectedLoader(state.project, state.selectedLoaderId, loader => ({...loader, pattern: {...loader.pattern, activeCells: filled ? Array.from({length: loader.pattern.grid.rows * loader.pattern.grid.cols}, (_, i) => i) : []}}));
    saveProject(project); return {project};
  }),
  setMotionPreset: (presetId) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => {
        const defaults = getDefaultMotionConfig(presetId);
        const grid = loader.pattern.grid;

        return {
          ...loader,
          animation: normalizeAnimation(
            {
              ...loader.animation,
              ...defaults,
              fps: loader.animation.fps,
              inactiveStyle: loader.animation.inactiveStyle,
              originX: clamp(loader.animation.originX || Math.ceil(grid.cols / 2), 1, grid.cols),
              originY: clamp(loader.animation.originY || Math.ceil(grid.rows / 2), 1, grid.rows)
            },
            grid,
            presetId
          )
        };
      });

      saveProject(project);
      return { project };
    }),
  setMotionOrigin: (axis, value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        animation: {
          ...loader.animation,
          originX: axis === "x" ? clamp(Math.round(value), 1, loader.pattern.grid.cols) : loader.animation.originX,
          originY: axis === "y" ? clamp(Math.round(value), 1, loader.pattern.grid.rows) : loader.animation.originY
        }
      }));

      saveProject(project);
      return { project };
    }),
  setDirection: (direction) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        animation: {
          ...loader.animation,
          direction
        }
      }));

      saveProject(project);
      return { project };
    }),
  setFps: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        animation: {
          ...loader.animation,
          fps: clamp(Math.round(value), 1, 30)
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setScaleIntensity: (value) => set((state) => {
    const project = updateSelectedLoader(state.project, state.selectedLoaderId, loader => ({...loader, animation: {...loader.animation, scaleIntensity: clamp(value, 0, 1)}}));
    saveProject(project); return {project};
  }),
  setSpeed: (value) => set((state) => {
    const project = updateSelectedLoader(state.project, state.selectedLoaderId, loader => ({...loader, animation: {...loader.animation, speed: clamp(value, .25, 3)}}));
    saveProject(project); return {project};
  }),
  setAnimationStyle: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        animation: {
          ...loader.animation,
          style: value
        }
      }));

      saveProject(project);
      return { project };
    }),
  setInactiveStyle: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        animation: {
          ...loader.animation,
          inactiveStyle: value
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setPrimaryColor: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          primaryColor: value
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setPrimaryAlpha: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          primaryAlpha: clamp(value, 0, 1)
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setGlowEnabled: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          shadow: value
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setGlowSize: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          glow: clamp(value, 0, 48)
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setBackgroundColor: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          backgroundColor: value
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setBackgroundAlpha: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          backgroundAlpha: clamp(value, 0, 1)
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setCellShape: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        style: {
          ...loader.style,
          cellShape: normalizeCellShape(value)
        }
      }), { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setGridSize: (size) =>
    set((state) => {
      const nextSize = clamp(Math.round(size), 3, 13);
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => {
        const nextGrid = sanitizeGrid({
          ...loader.pattern.grid,
          rows: nextSize,
          cols: nextSize
        });

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            grid: cloneGrid(nextGrid),
            activeCells: sanitizeActiveCells(loader.pattern.activeCells, nextGrid)
          },
          animation: normalizeAnimation(
            {
              ...loader.animation,
              originX: clamp(loader.animation.originX, 1, nextGrid.cols),
              originY: clamp(loader.animation.originY, 1, nextGrid.rows)
            },
            nextGrid,
            loader.animation.presetId
          ),
          style: {
            ...loader.style,
            radius: clamp(loader.style.radius, 0, nextGrid.cellSize / 2)
          }
        };
      }, { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setGridGap: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => {
        const nextGrid = sanitizeGrid({
          ...loader.pattern.grid,
          gap: value
        });

        return {
          ...loader,
          pattern: {
            ...loader.pattern,
            grid: cloneGrid(nextGrid)
          }
        };
      }, { updateSequence: true });

      saveProject(project);
      return { project };
    }),
  setLayoutType: (type) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        layout: {
          ...loader.layout,
          type
        }
      }));

      saveProject(project);
      return { project };
    }),
  setLabel: (value) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        text: {
          ...(loader.text ?? {
            enabled: true,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 0.04,
            color: "rgba(255,255,255,0.92)"
          }),
          content: value,
          enabled: true
        }
      }));

      saveProject(project);
      return { project };
    }),
  setExportFormat: (format) => set({ exportFormat: format }),
  togglePreview: () => set((state) => ({ isPreviewing: !state.isPreviewing })),
  enterFocusMode: (loaderId) => set((state) => ({ focusModeLoaderId: loaderId ?? state.selectedLoaderId })),
  exitFocusMode: () => set({ focusModeLoaderId: null }),
  applyLoaderTemplate: () => undefined,
  applyPatternPreset: (presetId) =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        pattern: {
          ...loader.pattern,
          activeCells: buildPatternCells(presetId, loader.pattern.grid.rows, loader.pattern.grid.cols)
        }
      }));

      saveProject(project);
      return { project };
    }),
  applySavedPattern: (patternId) =>
    set((state) => {
      const savedPattern = state.project.assets.patterns.find((pattern) => pattern.id === patternId);
      if (!savedPattern) {
        return {};
      }

      const nextGrid = sanitizeGrid({
        ...DEFAULT_DRAWN_GRID,
        rows: savedPattern.rows ?? DEFAULT_DRAWN_GRID.rows,
        cols: savedPattern.cols ?? DEFAULT_DRAWN_GRID.cols
      });
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        pattern: {
          ...loader.pattern,
          grid: nextGrid,
          activeCells: sanitizeActiveCells(savedPattern.activeCells, nextGrid)
        },
        animation: normalizeAnimation(
          {
            ...loader.animation,
            originX: clamp(loader.animation.originX, 1, nextGrid.cols),
            originY: clamp(loader.animation.originY, 1, nextGrid.rows)
          },
          nextGrid,
          loader.animation.presetId
        )
      }));

      saveProject(project);
      return { project };
    }),
  captureSnapshot: () =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        pattern: {
          ...loader.pattern,
          snapshots: [
            ...loader.pattern.snapshots,
            {
              id: crypto.randomUUID(),
              name: `Frame ${loader.pattern.snapshots.length + 1}`,
              activeCells: [...loader.pattern.activeCells],
              rows: loader.pattern.grid.rows,
              cols: loader.pattern.grid.cols,
              presetId: "custom"
            }
          ]
        }
      }));

      saveProject(project);
      return { project };
    }),
  clearSnapshots: () =>
    set((state) => {
      const project = updateSelectedLoader(state.project, state.selectedLoaderId, (loader) => ({
        ...loader,
        pattern: {
          ...loader.pattern,
          snapshots: []
        }
      }));

      saveProject(project);
      return { project };
    }),
  savePatternToLibrary: () =>
    set((state) => {
      const loader = state.project.loaders.find((item) => item.id === state.selectedLoaderId) ?? state.project.loaders[0];
      if (!loader) {
        return {};
      }

      const nextPattern: PatternSnapshot = {
        id: crypto.randomUUID(),
        name: `${loader.name} Pattern ${state.project.assets.patterns.length + 1}`,
        activeCells: [...loader.pattern.activeCells],
        rows: loader.pattern.grid.rows,
        cols: loader.pattern.grid.cols,
        presetId: "custom"
      };
      const project = {
        ...state.project,
        updatedAt: new Date().toISOString(),
        assets: {
          ...state.project.assets,
          patterns: [nextPattern, ...state.project.assets.patterns]
        }
      };

      saveProject(project);
      return { project };
    }),
  setCanvasView: (view) =>
    set((state) => {
      const project = {
        ...state.project,
        canvas: {
          ...state.project.canvas,
          ...view
        }
      };

      saveProject(project);
      return { project };
    }),
  resetCanvasView: () =>
    set((state) => {
      const project = {
        ...state.project,
        canvas: {
          ...state.project.canvas,
          zoom: 1,
          panX: 0,
          panY: 0
        }
      };

      saveProject(project);
      return { project };
    })
}));

export function useSelectedLoader() {
  return useEditorStore((state) =>
    state.project.loaders.find((loader) => loader.id === state.selectedLoaderId) ?? state.project.loaders[0]
  );
}
