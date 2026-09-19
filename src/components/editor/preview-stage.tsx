"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { getCellShapeClassName, getCellShapeStyle } from "@/lib/cell-shapes";
import { rgbaWithOpacity } from "@/lib/colors";
import { compileTimeline } from "@/lib/core/timeline";
import { sampleMotion, sampleBackground } from "@/lib/core/motion-sampler";
import { LoaderComponent } from "@/types/dot-motion";

type PreviewStageProps = {
  loader: LoaderComponent;
  showHint?: boolean;
  isAnimated?: boolean;
  variant?: "compact" | "canvas" | "default";
  staticOnly?: boolean;
  backgroundProgress?: number;
};

type SequencePreviewStageProps = {
  frames: LoaderComponent[];
  showHint?: boolean;
  isAnimated?: boolean;
  variant?: "compact" | "canvas" | "default";
};

export function SequencePreviewStage({ frames, showHint = true, isAnimated = true, variant = "default" }: SequencePreviewStageProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const safeFrames = frames.length > 0 ? frames : [];
  const activeFrame = safeFrames[Math.min(frameIndex, Math.max(safeFrames.length - 1, 0))] ?? safeFrames[0];
  const fps = activeFrame?.animation.fps ?? 6;

  useEffect(() => {
    setFrameIndex(0);
  }, [safeFrames.length]);

  useEffect(() => {
    if (!isAnimated || safeFrames.length === 0) {
      setFrameIndex(0);
      setSequenceProgress(0);
      return;
    }

    let frameId = 0;
    let lastIndex = -1;
    const startTime = performance.now();
    const frameMs = 1000 / Math.max(1, fps);
    const cycleMs = frameMs * safeFrames.length;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const nextIndex = Math.floor(elapsed / frameMs) % safeFrames.length;
      if (nextIndex !== lastIndex) {
        lastIndex = nextIndex;
        setFrameIndex(nextIndex);
      }
      setSequenceProgress((elapsed % cycleMs) / cycleMs);
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
      backgroundProgress={sequenceProgress}
    />
  );
}

export function PreviewStage({ loader, showHint = true, isAnimated = true, variant = "default", staticOnly = false, backgroundProgress }: PreviewStageProps) {
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
  const displayTimeMs = staticOnly ? 0 : isAnimated ? currentTimeMs : timeline.durationMs * .25;
  const backgroundPhase = backgroundProgress ?? displayTimeMs / timeline.durationMs;
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
    const frameMs = 1000 / 60;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) % timeline.durationMs;
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
  const glowColor = loader.style.primaryColor;
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
            const visual = staticOnly || !isAnimated ? {opacity: 1, scale: 1} : sampleMotion(loader, cellIndex, displayTimeMs / timeline.durationMs);
            const row = Math.floor(cellIndex / loader.pattern.grid.cols);
            const col = cellIndex % loader.pattern.grid.cols;
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);
            const shapeStyle = getCellShapeStyle(loader, cellSize);
            const active = Boolean(track);
            const glow = loader.style.shadow ? loader.style.glow : 0;
            return (
<span key={cellIndex} style={{position: "absolute", left: x, top: y, width: cellSize, height: cellSize}}>
                <span className={`preview-loader__cell ${getCellShapeClassName(loader)}`} style={{...shapeStyle, inset: 0, width: cellSize, height: cellSize, background: backgroundColor, opacity: sampleBackground(loader, cellIndex, backgroundPhase)}} />
                {active && <span className={`preview-loader__cell ${getCellShapeClassName(loader)}`} style={{...shapeStyle, inset: 0, width: cellSize, height: cellSize, background: primaryColor, opacity: visual.opacity, transform: `scale(${visual.scale})`, boxShadow: glow > 0 ? `0 0 ${glow}px ${rgbaWithOpacity(glowColor, .65, loader.style.primaryAlpha ?? 1)}` : "none"}} />}
              </span>
            );
          })}

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
