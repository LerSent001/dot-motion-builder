"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { getCellShapeClassName, getCellShapeStyle } from "@/lib/cell-shapes";
import { rgbaWithOpacity } from "@/lib/colors";
import { compileTimeline } from "@/lib/core/timeline";
import { getMotionOrderIndex, getMotionOrderRange, isOrderedMotionPreset } from "@/lib/motion-order";
import { CellTrack, Direction, LoaderComponent, MotionPresetId } from "@/types/dot-motion";

type PreviewStageProps = {
  loader: LoaderComponent;
  showHint?: boolean;
  isAnimated?: boolean;
  variant?: "compact" | "canvas" | "default";
  staticOnly?: boolean;
};

type SequencePreviewStageProps = {
  frames: LoaderComponent[];
  showHint?: boolean;
  isAnimated?: boolean;
  variant?: "compact" | "canvas" | "default";
};

type CellVisualState = {
  opacity: number;
  scale: number;
  glowOpacity: number;
};

type TemplateCellVisualState = CellVisualState & {
  offsetX: number;
  offsetY: number;
  background?: string;
  extraShadows?: string[];
  filter?: string;
  zIndex?: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function clampScale(value: number) {
  return Math.min(1, Math.max(0.05, value));
}

function mixColor(primary: string, secondary: string, primaryWeight: number) {
  const weight = Math.min(100, Math.max(0, Math.round(primaryWeight)));
  return `color-mix(in srgb, ${primary} ${weight}%, ${secondary} ${100 - weight}%)`;
}

function getDirectionalMetric(row: number, col: number, rows: number, cols: number, direction: Direction) {
  switch (direction) {
    case "left":
      return { metric: cols - 1 - col, maxMetric: Math.max(cols - 1, 1) };
    case "down":
      return { metric: row, maxMetric: Math.max(rows - 1, 1) };
    case "up":
      return { metric: rows - 1 - row, maxMetric: Math.max(rows - 1, 1) };
    case "down-right":
      return { metric: row + col, maxMetric: Math.max(rows + cols - 2, 1) };
    case "up-left":
      return { metric: rows - 1 - row + cols - 1 - col, maxMetric: Math.max(rows + cols - 2, 1) };
    case "down-left":
      return { metric: row + cols - 1 - col, maxMetric: Math.max(rows + cols - 2, 1) };
    case "up-right":
      return { metric: rows - 1 - row + col, maxMetric: Math.max(rows + cols - 2, 1) };
    case "right":
    default:
      return { metric: col, maxMetric: Math.max(cols - 1, 1) };
  }
}

function sampleDelayWave(metric: number, maxMetric: number, progress: number, baseStepRatio: number) {
  const stepRatio = Math.min(baseStepRatio, 0.62 / Math.max(maxMetric, 1));
  const phase = ((progress - metric * stepRatio) % 1 + 1) % 1;
  const swell = (1 - Math.cos(phase * Math.PI * 2)) / 2;

  return {
    opacity: clamp01(1 - swell),
    scale: 1 - swell * 0.3,
    offsetY: -2 * swell,
    glowOpacity: clamp01(1 - swell * 0.35)
  };
}

function sampleOrderedPreset(presetId: MotionPresetId, order: number, maxOrder: number, progress: number) {
  const span = Math.max(maxOrder + 1, 1);
  const front = progress * (span + 2.4) - 1.2;
  const distance = Math.abs(order - front);
  const compactPreset = presetId === "checkerboard";
  const scatteredPreset = presetId === "rain";
  const angularPreset = presetId === "pinwheel";
  const width = compactPreset ? 0.26 : scatteredPreset ? 0.34 : angularPreset ? 0.52 : 0.62;
  const tailWidth = compactPreset ? 0.7 : scatteredPreset ? 1 : angularPreset ? 1.65 : 1.95;
  const beam = Math.exp(-(distance * distance) / width);
  const tail = Math.exp(-(distance * distance) / tailWidth);

  return {
    opacity: clamp01(0.04 + beam * 0.9 + tail * 0.16),
    scale: clampScale(0.72 + beam * 0.22 + tail * 0.06),
    glowOpacity: clamp01(beam * 0.9 + tail * 0.28),
    offsetY: scatteredPreset ? -4 * beam : angularPreset ? -1.3 * beam : -2 * beam,
    beam,
    tail
  };
}

function getStaticActiveVisual(loader: LoaderComponent): CellVisualState {
  switch (loader.animation.style) {
    case "opacity-only":
      return { opacity: 0.86, scale: 1, glowOpacity: 0.34 };
    case "depth-shift":
      return { opacity: 0.8, scale: 0.94, glowOpacity: 0.24 };
    case "bloom-pop":
      return { opacity: 0.92, scale: 1, glowOpacity: 0.58 };
    case "pulse-size":
    default:
      return { opacity: 0.9, scale: 1, glowOpacity: 0.46 };
  }
}

function getStaticPreviewTime(loader: LoaderComponent, durationMs: number) {
  switch (loader.animation.presetId) {
    case "blink":
      return durationMs * 0.18;
    case "wave":
      return durationMs * 0.42;
    case "sweep":
      return durationMs * 0.58;
    case "fish-eye":
      return durationMs * 0.12;
    case "ripple":
      return durationMs * 0.18;
    case "spiral":
    case "snake":
    case "pinwheel":
      return durationMs * 0.34;
    case "corners":
    case "checkerboard":
    case "rain":
      return durationMs * 0.2;
    case "bloom":
      return durationMs * 0.44;
    case "pulse":
      return durationMs * 0.5;
    default:
      return durationMs * 0.4;
  }
}

function sampleTrack(track: CellTrack, timeMs: number): CellVisualState {
  const { keyframes } = track;

  if (timeMs <= keyframes[0].timeMs) {
    return {
      opacity: keyframes[0].opacity,
      scale: keyframes[0].scale,
      glowOpacity: keyframes[0].opacity
    };
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const current = keyframes[index];

    if (timeMs <= current.timeMs) {
      const span = Math.max(current.timeMs - previous.timeMs, 1);
      const progress = (timeMs - previous.timeMs) / span;
      const opacity = previous.opacity + (current.opacity - previous.opacity) * progress;
      const scale = previous.scale + (current.scale - previous.scale) * progress;

      return {
        opacity,
        scale,
        glowOpacity: Math.max(opacity, progress > 0.5 ? current.opacity : previous.opacity)
      };
    }
  }

  const last = keyframes[keyframes.length - 1];
  return {
    opacity: last.opacity,
    scale: last.scale,
    glowOpacity: last.opacity
  };
}

function sampleInactive(loader: LoaderComponent, cellIndex: number, timeMs: number, durationMs: number): CellVisualState {
  const cols = loader.pattern.grid.cols;
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  const phase = (timeMs / Math.max(durationMs, 1)) * Math.PI * 2 + row * 0.85 + col * 0.55;
  const wave = (Math.sin(phase) + 1) / 2;

  switch (loader.animation.inactiveStyle) {
    case "none":
      return { opacity: 1, scale: 1, glowOpacity: 0 };
    case "breathe":
      return {
        opacity: 0.58 + wave * 0.32,
        scale: 1,
        glowOpacity: 0
      };
    case "ghost":
      return {
        opacity: 0.34 + wave * 0.24,
        scale: 1,
        glowOpacity: 0
      };
    case "static-dim":
    default:
      return { opacity: 0.62, scale: 1, glowOpacity: 0 };
  }
}

function getTemplateCellVisual(
  loader: LoaderComponent,
  cellIndex: number,
  currentTimeMs: number,
  durationMs: number,
  baseVisual: CellVisualState,
  isActive: boolean
): TemplateCellVisualState {
  const presetId = loader.animation.presetId;
  const cols = loader.pattern.grid.cols;
  const rows = loader.pattern.grid.rows;
  const row = Math.floor(cellIndex / cols);
  const col = cellIndex % cols;
  const progress = durationMs > 0 ? currentTimeMs / durationMs : 0;
  const secondaryColor = loader.style.secondaryColor ?? loader.style.primaryColor;

  if (!isActive) {
    return {
      ...baseVisual,
      offsetX: 0,
      offsetY: 0,
      zIndex: 1
    };
  }

  if (presetId === "blink") {
    const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
    return {
      opacity: isActive ? Math.max(baseVisual.opacity, 0.18 + pulse * 0.82) : baseVisual.opacity,
      scale: clampScale(baseVisual.scale * (0.94 + pulse * 0.06)),
      glowOpacity: Math.max(baseVisual.glowOpacity, 0.12 + pulse * 0.88),
      offsetX: 0,
      offsetY: 0,
      background: isActive ? mixColor(loader.style.primaryColor, secondaryColor, 64 + pulse * 20) : undefined
    };
  }

  if (presetId === "pulse") {
    const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2 + row * 0.2 + col * 0.14);
    return {
      opacity: isActive ? Math.max(baseVisual.opacity, 0.12 + pulse * 0.74) : baseVisual.opacity,
      scale: clampScale(baseVisual.scale * (0.92 + pulse * 0.08)),
      glowOpacity: Math.max(baseVisual.glowOpacity, 0.08 + pulse * 0.6),
      offsetX: 0,
      offsetY: 0,
      background: isActive ? mixColor(loader.style.primaryColor, secondaryColor, 62 + pulse * 18) : undefined
    };
  }

  if (isOrderedMotionPreset(presetId)) {
    const orderRange = getMotionOrderRange(loader);
    const rawOrder = getMotionOrderIndex({
      presetId,
      direction: loader.animation.direction,
      rows,
      cols,
      row,
      col,
      originX: loader.animation.originX,
      originY: loader.animation.originY,
      cellIndex
    });
    const ordered = sampleOrderedPreset(presetId, rawOrder - orderRange.min, orderRange.span, progress);

    return {
      opacity: ordered.opacity,
      scale: ordered.scale,
      glowOpacity: ordered.glowOpacity,
      offsetX: 0,
      offsetY: ordered.offsetY,
      background: mixColor(loader.style.primaryColor, secondaryColor, 56 + ordered.beam * 28 + ordered.tail * 8),
      zIndex: 1 + Math.round(ordered.beam * 3)
    };
  }

  if (presetId === "wave") {
    let metric = col;
    let span = cols;
    if (loader.animation.direction === "up" || loader.animation.direction === "down") {
      metric = row;
      span = rows;
    } else if (
      loader.animation.direction === "down-right" ||
      loader.animation.direction === "up-left" ||
      loader.animation.direction === "down-left" ||
      loader.animation.direction === "up-right"
    ) {
      const directionMetric = getDirectionalMetric(row, col, rows, cols, loader.animation.direction);
      metric = directionMetric.metric;
      span = directionMetric.maxMetric + 1;
    }
    if (loader.animation.direction === "left" || loader.animation.direction === "up") {
      metric = span - 1 - metric;
    }

    const front = progress * span;
    const distance = Math.abs(metric - front);
    const wave = Math.exp(-(distance * distance) / 0.55);
    const tail = Math.exp(-(distance * distance) / 2.1);

    return {
      opacity: clamp01(isActive ? Math.max(baseVisual.opacity * 0.18, 0.08 + wave * 0.92 + tail * 0.14) : baseVisual.opacity),
      scale: clampScale(baseVisual.scale * (0.88 + wave * 0.12)),
      glowOpacity: Math.max(baseVisual.glowOpacity, wave * 0.92 + tail * 0.28),
      offsetX: 0,
      offsetY: -2 * wave,
      background: isActive ? mixColor(loader.style.primaryColor, secondaryColor, 58 + wave * 24) : undefined
    };
  }

  if (presetId === "sweep") {
    let metric = col;
    let span = cols;
    if (loader.animation.direction === "up" || loader.animation.direction === "down") {
      metric = row;
      span = rows;
    } else if (
      loader.animation.direction === "down-right" ||
      loader.animation.direction === "up-left" ||
      loader.animation.direction === "down-left" ||
      loader.animation.direction === "up-right"
    ) {
      const directionMetric = getDirectionalMetric(row, col, rows, cols, loader.animation.direction);
      metric = directionMetric.metric;
      span = directionMetric.maxMetric + 1;
    }
    if (loader.animation.direction === "left" || loader.animation.direction === "up") {
      metric = span - 1 - metric;
    }
    const front = progress * (span + 1.2) - 0.2;
    const distance = Math.abs(metric - front);
    const beam = Math.exp(-(distance * distance) / 0.62);
    const tail = Math.exp(-(distance * distance) / 2.2);

    return {
      opacity: clamp01(isActive ? Math.max(baseVisual.opacity * 0.28, 0.08 + beam * 0.88 + tail * 0.18) : baseVisual.opacity),
      scale: clampScale(baseVisual.scale * (0.92 + beam * 0.08)),
      glowOpacity: Math.max(baseVisual.glowOpacity, beam * 0.96 + tail * 0.24),
      offsetX: 0,
      offsetY: 0,
      background: isActive && tail > 0.04 ? mixColor(loader.style.primaryColor, secondaryColor, 58 + beam * 24) : undefined
    };
  }

  if (presetId === "bloom") {
    const anchorCol = loader.animation.originX - 1;
    const anchorRow = loader.animation.originY - 1;
    const bloomFront = progress * Math.max(rows + cols - 2, 1);
    const distanceMetric = Math.abs(col - anchorCol) + Math.abs(row - anchorRow);
    const bloomDistance = Math.abs(distanceMetric - bloomFront);
    const bloom = Math.exp(-(bloomDistance * bloomDistance) / 1.3);
    const lens = Math.exp(-((Math.hypot(col - anchorCol, row - anchorRow) ** 2) / 3.2));

    return {
      opacity: clamp01(isActive ? Math.max(baseVisual.opacity * 0.32, 0.08 + bloom * 0.74) : baseVisual.opacity),
      scale: clampScale(baseVisual.scale * (0.78 + bloom * 0.1 + lens * 0.12)),
      glowOpacity: Math.max(baseVisual.glowOpacity, bloom * 0.72 + lens * 0.4),
      offsetX: 0,
      offsetY: 0,
      background: isActive ? mixColor(loader.style.primaryColor, secondaryColor, 58 + bloom * 18 + lens * 12) : undefined
    };
  }

  if (presetId === "fish-eye") {
    const { metric, maxMetric } = getDirectionalMetric(row, col, rows, cols, loader.animation.direction);
    const wave = sampleDelayWave(metric, maxMetric, progress, 0.1);
    const visibleGlow = wave.glowOpacity * 0.9 + (1 - wave.opacity) * 0.1;

    return {
      opacity: wave.opacity,
      scale: wave.scale,
      glowOpacity: visibleGlow,
      offsetX: 0,
      offsetY: wave.offsetY,
      background: mixColor(loader.style.primaryColor, secondaryColor, 72),
      zIndex: 1 + Math.round((1 - wave.opacity) * 2)
    };
  }

  if (presetId === "ripple") {
    const anchorCol = loader.animation.originX - 1;
    const anchorRow = loader.animation.originY - 1;
    const metric = Math.abs(col - anchorCol) + Math.abs(row - anchorRow);
    const maxMetric = Math.max(
      anchorCol + anchorRow,
      cols - 1 - anchorCol + anchorRow,
      anchorCol + rows - 1 - anchorRow,
      cols - 1 - anchorCol + rows - 1 - anchorRow,
      1
    );
    const wave = sampleDelayWave(metric, maxMetric, progress, 0.125);

    return {
      opacity: wave.opacity,
      scale: wave.scale,
      glowOpacity: wave.glowOpacity,
      offsetX: 0,
      offsetY: wave.offsetY,
      background: mixColor(loader.style.primaryColor, secondaryColor, 72),
      zIndex: 1 + Math.round((1 - wave.opacity) * 2)
    };
  }

  return {
    ...baseVisual,
    offsetX: 0,
    offsetY: 0
  };
}

function renderReadingDocsOverlay(
  loader: LoaderComponent,
  gridWidth: number,
  gridHeight: number,
  cellSize: number,
  gap: number,
  currentTimeMs: number,
  durationMs: number
) {
  return null;
}

export function SequencePreviewStage({ frames, showHint = true, isAnimated = true, variant = "default" }: SequencePreviewStageProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const safeFrames = frames.length > 0 ? frames : [];
  const activeFrame = safeFrames[Math.min(frameIndex, Math.max(safeFrames.length - 1, 0))] ?? safeFrames[0];
  const fps = activeFrame?.animation.fps ?? 12;

  useEffect(() => {
    setFrameIndex(0);
  }, [safeFrames.length]);

  useEffect(() => {
    if (!isAnimated || safeFrames.length <= 1) {
      setFrameIndex(0);
      return;
    }

    let frameId = 0;
    let lastIndex = -1;
    const startTime = performance.now();
    const frameMs = 1000 / Math.max(1, fps);

    const tick = (now: number) => {
      const nextIndex = Math.floor((now - startTime) / frameMs) % safeFrames.length;
      if (nextIndex !== lastIndex) {
        lastIndex = nextIndex;
        setFrameIndex(nextIndex);
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [fps, isAnimated, safeFrames.length]);

  if (!activeFrame) {
    return null;
  }

  return (
    <PreviewStage
      loader={activeFrame}
      showHint={showHint}
      isAnimated={false}
      variant={variant}
      staticOnly
    />
  );
}

export function PreviewStage({ loader, showHint = true, isAnimated = true, variant = "default", staticOnly = false }: PreviewStageProps) {
  const timeline = useMemo(() => compileTimeline(loader), [loader]);
  const label = loader.text?.enabled ? loader.text.content : "";
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const lastFrameRef = useRef(-1);
  const compact = variant === "compact";
  const canvasVariant = variant === "canvas";
  const canvasMetrics = useMemo(() => getCanvasGridMetrics(loader), [loader]);
  const gap = canvasVariant ? canvasMetrics.gap : loader.pattern.grid.gap;
  const cellSize = canvasVariant ? canvasMetrics.cellSize : loader.pattern.grid.cellSize;
  const gridWidth = canvasVariant
    ? canvasMetrics.gridWidth
    : loader.pattern.grid.cols * cellSize + (loader.pattern.grid.cols - 1) * gap;
  const gridHeight = canvasVariant
    ? canvasMetrics.gridHeight
    : loader.pattern.grid.rows * cellSize + (loader.pattern.grid.rows - 1) * gap;
  const displayTimeMs = staticOnly ? 0 : isAnimated ? currentTimeMs : getStaticPreviewTime(loader, timeline.durationMs);
  const resetKey = [
    loader.pattern.grid.rows,
    loader.pattern.grid.cols,
    loader.pattern.activeCells.join(","),
    loader.animation.presetId,
    loader.animation.direction,
    loader.animation.originX,
    loader.animation.originY,
    loader.animation.inactiveStyle
  ].join(":");

  useEffect(() => {
    setCurrentTimeMs(0);
    lastFrameRef.current = -1;
  }, [resetKey]);

  useEffect(() => {
    if (!isAnimated) {
      setCurrentTimeMs(0);
      lastFrameRef.current = -1;
      return;
    }

    let frameId = 0;
    const cellCount = loader.pattern.grid.rows * loader.pattern.grid.cols;
    const renderFpsCap = cellCount >= 64 ? 16 : cellCount >= 49 ? 18 : 24;
    const frameMs = 1000 / Math.min(Math.max(loader.animation.fps, 1), renderFpsCap);
    const speedFactor =
      loader.animation.fps <= 18
        ? 0.3 + ((loader.animation.fps - 1) / 17) * 0.7
        : 1 + ((loader.animation.fps - 18) / 12) * 0.65;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = ((now - startTime) * speedFactor) % timeline.durationMs;
      const quantized = Math.floor(elapsed / frameMs) * frameMs;

      if (quantized !== lastFrameRef.current) {
        lastFrameRef.current = quantized;
        setCurrentTimeMs(quantized);
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isAnimated, loader.animation.fps, loader.pattern.grid.cols, loader.pattern.grid.rows, timeline.durationMs]);

  const tracksByIndex = useMemo(() => new Map(timeline.tracks.map((track) => [track.cellIndex, track])), [timeline.tracks]);
  const totalCells = loader.pattern.grid.rows * loader.pattern.grid.cols;
  const denseGrid = totalCells >= 49;
  const secondaryColor = loader.style.secondaryColor ?? loader.style.primaryColor;
  const primaryColor = rgbaWithOpacity(loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1);
  const glowColor = loader.style.glowColor ?? loader.style.primaryColor;
  const backgroundColor = rgbaWithOpacity(loader.style.backgroundColor ?? "#2D3743", 1, loader.style.backgroundAlpha ?? 1);
  return (
    <div className={`preview-card preview-card--${loader.layout.type}${canvasVariant ? " preview-card--canvas" : ""}`}>
      <div
        className={`preview-loader${compact ? " preview-loader--compact" : ""}${canvasVariant ? " preview-loader--canvas" : ""}`}
        style={{
          borderRadius: canvasVariant ? 30 : loader.style.containerRadius,
          gap: compact ? 0 : loader.layout.gap,
          width: canvasVariant ? canvasMetrics.panelWidth : undefined,
          height: canvasVariant ? canvasMetrics.panelHeight : undefined,
          padding: canvasVariant
            ? `${canvasMetrics.padding}px`
            : compact
              ? "18px"
              : `${loader.layout.paddingY}px ${loader.layout.paddingX}px`
        }}
      >
        <div
          className="preview-loader__grid"
          style={{
            width: gridWidth,
            height: gridHeight
          }}
        >
          {Array.from({ length: totalCells }, (_, cellIndex) => {
            const track = tracksByIndex.get(cellIndex);
            const backgroundVisual = sampleInactive(loader, cellIndex, displayTimeMs, timeline.durationMs);
            const sampledVisual = track
              ? staticOnly
                ? { opacity: 1, scale: 1, glowOpacity: 0.56 }
                : isAnimated
                  ? sampleTrack(track, displayTimeMs)
                  : getStaticActiveVisual(loader)
              : backgroundVisual;
            const templateVisual = staticOnly && track
              ? {
                  ...sampledVisual,
                  offsetX: 0,
                  offsetY: 0,
                  background: primaryColor,
                  zIndex: 2
                }
              : getTemplateCellVisual(
                  loader,
                  cellIndex,
                  displayTimeMs,
                  timeline.durationMs,
                  sampledVisual,
                  Boolean(track)
                );
            const row = Math.floor(cellIndex / loader.pattern.grid.cols);
            const col = cellIndex % loader.pattern.grid.cols;
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);
            const isActiveCell = Boolean(track);
            const litIntensity = isActiveCell ? clamp01(templateVisual.opacity) : 0;
            const isLit = litIntensity > 0.42;
            const glowStrength = loader.style.shadow && isLit
              ? loader.style.glow * (denseGrid ? 0.68 : 1) * (0.18 + templateVisual.glowOpacity * 0.88)
              : 0;
            const renderScale = clampScale(isLit ? templateVisual.scale : backgroundVisual.scale);
            const renderOpacity = isLit
              ? clamp01(Math.max(backgroundVisual.opacity, templateVisual.opacity))
              : backgroundVisual.opacity;
            const colorState = litIntensity > 0.7 ? "foreground" : litIntensity > 0.24 ? "tail" : "inactive";
            const shapeStyle = getCellShapeStyle(loader, cellSize);
            const defaultBackground =
              isLit
                ? colorState === "foreground"
                  ? loader.style.primaryColor
                  : colorState === "tail"
                    ? mixColor(loader.style.primaryColor, secondaryColor, 42)
                    : mixColor(loader.style.primaryColor, "#0d1018", 20)
                : backgroundColor;
            const boxShadowParts = [
              glowStrength > 0
                ? `0 0 ${glowStrength.toFixed(1)}px ${rgbaWithOpacity(glowColor, Math.min(0.88, templateVisual.glowOpacity), loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1)}`
                : "",
              !denseGrid && glowStrength > 8
                ? `0 0 ${(glowStrength * 1.8).toFixed(1)}px ${rgbaWithOpacity(glowColor, Math.min(0.34, templateVisual.glowOpacity * 0.42), loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1)}`
                : "",
              ...(templateVisual.extraShadows ?? [])
            ].filter(Boolean);

            return (
              <span
                key={cellIndex}
                className={`preview-loader__cell ${getCellShapeClassName(loader)}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  left: x,
                  top: y,
                  zIndex: templateVisual.zIndex ?? 1,
                  opacity: Number(renderOpacity.toFixed(3)),
                  transform: `translate(${isLit ? templateVisual.offsetX.toFixed(2) : "0.00"}px, ${isLit ? templateVisual.offsetY.toFixed(2) : "0.00"}px) scale(${renderScale.toFixed(3)})`,
                  ...shapeStyle,
                  background: isLit ? templateVisual.background ?? (colorState === "foreground" ? primaryColor : defaultBackground) : backgroundColor,
                  boxShadow: boxShadowParts.length > 0 ? boxShadowParts.join(", ") : "none",
                  filter: templateVisual.filter ?? "none"
                }}
              />
            );
          })}
          {renderReadingDocsOverlay(loader, gridWidth, gridHeight, cellSize, gap, displayTimeMs, timeline.durationMs)}
        </div>
        {label && !compact && !canvasVariant ? (
          <div className="preview-loader__label">
            <span
              style={{
                color: loader.text?.color,
                fontSize: loader.text?.fontSize,
                fontWeight: loader.text?.fontWeight,
                letterSpacing: `${loader.text?.letterSpacing ?? 0}em`
              }}
            >
              {label}
            </span>
          </div>
        ) : null}
      </div>
      {showHint && !compact && !canvasVariant ? (
        <p className="preview-card__hint">
          {loader.layout.type.replace(/-/g, " ")} preview, optimized around {loader.animation.mode} sequencing.
        </p>
      ) : null}
    </div>
  );
}
