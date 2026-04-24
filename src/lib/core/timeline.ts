import {
  AnimationMode,
  AnimationStyle,
  CellTrack,
  InactiveStyle,
  LoaderComponent,
  Timeline
} from "@/types/dot-motion";
import { getDirectionalOrderMetric, getMotionOrderIndex, getMotionOrderRange, isOrderedMotionPreset } from "@/lib/motion-order";

type MotionProfile = {
  restScale: number;
  peakScale: number;
  tailScale: number;
  peakOpacity: number;
  tailOpacity: number;
  activeLengthRatio: number;
};

type ModeKeyframeSpec = {
  at: number;
  opacity: number;
  scale: number;
};

type TimelinePlan = {
  activeLengthMs: number;
  cycleDurationMs: number;
  orderStepMs: number;
  inactiveOpacity: number;
  profile: MotionProfile;
};

type OrderedTrack = {
  cellIndex: number;
  orderIndex: number;
};

function cellToRowCol(cellIndex: number, cols: number) {
  return {
    row: Math.floor(cellIndex / cols),
    col: cellIndex % cols
  };
}

function getCellOrderIndex(loader: LoaderComponent, cellIndex: number) {
  const { grid } = loader.pattern;
  const { row, col } = cellToRowCol(cellIndex, grid.cols);
  const { direction, originX, originY, presetId, mode } = loader.animation;

  if (presetId === "blink" || presetId === "pulse") {
    return 0;
  }

  if (isOrderedMotionPreset(presetId)) {
    return getMotionOrderIndex({
      presetId,
      direction,
      rows: grid.rows,
      cols: grid.cols,
      row,
      col,
      originX,
      originY,
      cellIndex
    });
  }

  if (presetId === "bloom" || presetId === "ripple") {
    return Math.abs(col - (originX - 1)) + Math.abs(row - (originY - 1));
  }

  if (presetId === "fish-eye") {
    return getDirectionalOrderMetric(row, col, grid.rows, grid.cols, direction);
  }

  if (presetId === "wave" || presetId === "sweep") {
    return getDirectionalOrderMetric(row, col, grid.rows, grid.cols, direction);
  }

  if (mode === "blink" || mode === "pulse") {
    return 0;
  }

  if (mode === "wave") {
    return Math.abs(col - (originX - 1)) + Math.abs(row - (originY - 1));
  }

  return getDirectionalOrderMetric(row, col, grid.rows, grid.cols, direction);
}

function resolveOrderedTracks(loader: LoaderComponent): OrderedTrack[] {
  const { activeCells, grid } = loader.pattern;
  const orderRange = getMotionOrderRange(loader);

  return [...activeCells]
    .sort((left, right) => {
      const leftOrder = getCellOrderIndex(loader, left) - orderRange.min;
      const rightOrder = getCellOrderIndex(loader, right) - orderRange.min;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const a = cellToRowCol(left, grid.cols);
      const b = cellToRowCol(right, grid.cols);
      return a.row - b.row || a.col - b.col;
    })
    .map((cellIndex) => ({
      cellIndex,
      orderIndex: getCellOrderIndex(loader, cellIndex) - orderRange.min
    }));
}

function resolveInactiveOpacity(style: InactiveStyle) {
  const map: Record<InactiveStyle, number> = {
    none: 0,
    "static-dim": 0.14,
    breathe: 0.1,
    ghost: 0.06
  };

  return map[style];
}

function resolveMotionProfile(style: AnimationStyle): MotionProfile {
  const map: Record<AnimationStyle, MotionProfile> = {
    "opacity-only": {
      restScale: 1,
      peakScale: 1,
      tailScale: 1,
      peakOpacity: 1,
      tailOpacity: 0.16,
      activeLengthRatio: 0.36
    },
    "pulse-size": {
      restScale: 0.82,
      peakScale: 1,
      tailScale: 0.9,
      peakOpacity: 1,
      tailOpacity: 0.18,
      activeLengthRatio: 0.42
    },
    "depth-shift": {
      restScale: 0.76,
      peakScale: 1,
      tailScale: 0.86,
      peakOpacity: 0.96,
      tailOpacity: 0.2,
      activeLengthRatio: 0.44
    },
    "bloom-pop": {
      restScale: 0.78,
      peakScale: 1,
      tailScale: 0.92,
      peakOpacity: 1,
      tailOpacity: 0.24,
      activeLengthRatio: 0.46
    }
  };

  return map[style];
}

function resolveModeKeyframes(mode: AnimationMode, profile: MotionProfile, inactiveOpacity: number) {
  const map: Record<AnimationMode, ModeKeyframeSpec[]> = {
    blink: [
      { at: 0, opacity: inactiveOpacity, scale: profile.restScale },
      { at: 0.16, opacity: profile.peakOpacity, scale: profile.peakScale },
      { at: 0.34, opacity: 0.02, scale: profile.restScale },
      { at: 0.54, opacity: profile.peakOpacity * 0.92, scale: profile.peakScale },
      { at: 0.78, opacity: profile.tailOpacity, scale: profile.tailScale },
      { at: 1, opacity: inactiveOpacity, scale: profile.restScale }
    ],
    linear: [
      { at: 0, opacity: inactiveOpacity, scale: profile.restScale },
      { at: 0.3, opacity: 0.18, scale: profile.restScale },
      { at: 0.54, opacity: profile.peakOpacity, scale: profile.peakScale },
      { at: 0.78, opacity: profile.tailOpacity, scale: profile.tailScale },
      { at: 1, opacity: inactiveOpacity, scale: profile.restScale }
    ],
    directional: [
      { at: 0, opacity: inactiveOpacity, scale: profile.restScale },
      { at: 0.22, opacity: 0.14, scale: profile.restScale * 0.98 },
      { at: 0.44, opacity: profile.peakOpacity, scale: profile.peakScale },
      { at: 0.66, opacity: Math.max(profile.tailOpacity, 0.34), scale: profile.tailScale },
      { at: 0.86, opacity: 0.08, scale: profile.restScale },
      { at: 1, opacity: inactiveOpacity, scale: profile.restScale }
    ],
    wave: [
      { at: 0, opacity: inactiveOpacity, scale: profile.restScale },
      { at: 0.2, opacity: 0.16, scale: profile.restScale },
      { at: 0.5, opacity: profile.peakOpacity, scale: profile.peakScale },
      { at: 0.72, opacity: profile.tailOpacity, scale: profile.tailScale },
      { at: 1, opacity: inactiveOpacity, scale: profile.restScale }
    ],
    pulse: [
      { at: 0, opacity: inactiveOpacity, scale: profile.restScale },
      { at: 0.26, opacity: 0.52, scale: profile.peakScale * 0.94 },
      { at: 0.5, opacity: profile.peakOpacity, scale: profile.peakScale },
      { at: 0.76, opacity: profile.tailOpacity, scale: profile.tailScale },
      { at: 1, opacity: inactiveOpacity, scale: profile.restScale }
    ]
  };

  return map[mode];
}

function buildTimelinePlan(loader: LoaderComponent, maxOrderIndex: number): TimelinePlan {
  const profile = resolveMotionProfile(loader.animation.style);
  const inactiveOpacity = resolveInactiveOpacity(loader.animation.inactiveStyle);
  const activeLengthMs = Math.max(280, Math.round(loader.animation.durationMs * profile.activeLengthRatio));
  const orderStepMs = loader.animation.mode === "blink" || loader.animation.mode === "pulse"
    ? 0
    : Math.max(40, loader.animation.staggerMs);
  const finalDelayMs = maxOrderIndex * orderStepMs;
  const tailBufferMs = Math.max(220, Math.round(activeLengthMs * 0.55));
  const cycleDurationMs = Math.max(loader.animation.durationMs, finalDelayMs + activeLengthMs + tailBufferMs);

  return {
    activeLengthMs,
    cycleDurationMs,
    orderStepMs,
    inactiveOpacity,
    profile
  };
}

function buildTrack(loader: LoaderComponent, cellIndex: number, orderIndex: number, plan: TimelinePlan): CellTrack {
  const { grid } = loader.pattern;
  const { row, col } = cellToRowCol(cellIndex, grid.cols);
  const orderDelayMs = orderIndex * plan.orderStepMs;
  const keyframeSpec = resolveModeKeyframes(loader.animation.mode, plan.profile, plan.inactiveOpacity);
  const scaleIntensity = loader.animation.scaleIntensity ?? 0.24;
  const applyScaleIntensity = (scale: number) => 1 + (scale - 1) * scaleIntensity;
  const restScale = applyScaleIntensity(keyframeSpec[0]?.scale ?? plan.profile.restScale);
  const motionFrames = keyframeSpec.map((spec) => ({
    timeMs: orderDelayMs + plan.activeLengthMs * spec.at,
    opacity: spec.opacity,
    scale: applyScaleIntensity(spec.scale)
  }));
  const keyframes = [
    { timeMs: 0, opacity: plan.inactiveOpacity, scale: restScale },
    ...(orderDelayMs > 0 ? [{ timeMs: orderDelayMs, opacity: plan.inactiveOpacity, scale: restScale }] : []),
    ...motionFrames,
    { timeMs: plan.cycleDurationMs, opacity: plan.inactiveOpacity, scale: restScale }
  ].filter((frame, index, frames) => index === 0 || frame.timeMs !== frames[index - 1].timeMs);

  return {
    cellIndex,
    row,
    col,
    x: col * (grid.cellSize + grid.gap),
    y: row * (grid.cellSize + grid.gap),
    size: grid.cellSize,
    delayMs: orderDelayMs,
    keyframes
  };
}

export function compileTimeline(loader: LoaderComponent): Timeline {
  const { grid } = loader.pattern;
  const orderedTracks = resolveOrderedTracks(loader);
  const maxOrderIndex = orderedTracks.reduce((maxValue, item) => Math.max(maxValue, item.orderIndex), 0);
  const width = grid.cols * grid.cellSize + (grid.cols - 1) * grid.gap;
  const height = grid.rows * grid.cellSize + (grid.rows - 1) * grid.gap;
  const plan = buildTimelinePlan(loader, maxOrderIndex);
  const tracks = orderedTracks.map((item) => buildTrack(loader, item.cellIndex, item.orderIndex, plan));

  return {
    durationMs: plan.cycleDurationMs,
    fps: loader.animation.fps,
    totalFrames: Math.ceil((plan.cycleDurationMs / 1000) * loader.animation.fps),
    width,
    height,
    tracks
  };
}

export function getAnimationSummary(mode: AnimationMode) {
  const map: Record<AnimationMode, string> = {
    blink: "All cells pulse together in a compact double flash.",
    linear: "Cells sweep in a clean axis-based order.",
    directional: "Cells sweep with a stronger front and softer tail.",
    wave: "Cells move in grouped waves across the chosen direction.",
    pulse: "All active cells breathe together."
  };

  return map[mode];
}
