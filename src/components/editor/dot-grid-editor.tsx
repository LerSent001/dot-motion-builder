"use client";

import { useEffect, useMemo, useRef } from "react";
import { getCellShapeClassName, getCellShapeStyle } from "@/lib/cell-shapes";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { rgbaWithOpacity } from "@/lib/colors";
import { LoaderComponent } from "@/types/dot-motion";

type DotGridEditorProps = {
  loader: LoaderComponent;
  onToggleCell: (cellIndex: number) => void;
  onSetCellActive?: (cellIndex: number, active: boolean) => void;
  variant?: "default" | "canvas";
  frameLabel?: string;
};

export function DotGridEditor({
  loader,
  onToggleCell,
  onSetCellActive,
  variant = "default",
  frameLabel
}: DotGridEditorProps) {
  const { rows, cols, cellSize, gap } = loader.pattern.grid;
  const cells = Array.from({ length: rows * cols }, (_, index) => index);
  const canvasMetrics = useMemo(() => getCanvasGridMetrics(loader), [loader]);
  const dragStateRef = useRef<{
    nextValue: boolean;
    visited: Set<number>;
  } | null>(null);
  const renderGap = useMemo(() => {
    if (variant === "canvas") {
      return canvasMetrics.gap;
    }

    return gap;
  }, [canvasMetrics.gap, gap, variant]);

  const renderCellSize = useMemo(() => {
    if (variant === "canvas") {
      return canvasMetrics.cellSize;
    }

    return cellSize;
  }, [canvasMetrics.cellSize, cellSize, variant]);

  useEffect(() => {
    function endDrag() {
      dragStateRef.current = null;
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  function applyCell(cellIndex: number, active: boolean) {
    if (onSetCellActive) {
      onSetCellActive(cellIndex, active);
      return;
    }

    const isActive = loader.pattern.activeCells.includes(cellIndex);
    if (isActive !== active) {
      onToggleCell(cellIndex);
    }
  }

  function handlePointerDown(cellIndex: number) {
    const isActive = loader.pattern.activeCells.includes(cellIndex);
    const nextValue = !isActive;
    dragStateRef.current = {
      nextValue,
      visited: new Set([cellIndex])
    };
    applyCell(cellIndex, nextValue);
  }

  function handlePointerEnter(cellIndex: number) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.visited.has(cellIndex)) {
      return;
    }

    dragState.visited.add(cellIndex);
    applyCell(cellIndex, dragState.nextValue);
  }

  return (
    <div className={`dot-grid-editor-shell${variant === "canvas" ? " dot-grid-editor-shell--canvas" : ""}`}>
      <div
        className={`dot-grid${variant === "canvas" ? " dot-grid--canvas" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, ${renderCellSize}px)`,
          gap: renderGap,
          padding:
            variant === "canvas"
              ? `${canvasMetrics.padding}px`
              : undefined
        }}
      >
        {cells.map((cellIndex) => {
          const active = loader.pattern.activeCells.includes(cellIndex);
          return (
            <button
              key={cellIndex}
              type="button"
              data-dot-cell="true"
              className={`dot-grid__cell ${getCellShapeClassName(loader)}${active ? " is-active" : ""}${variant === "canvas" ? " dot-grid__cell--canvas" : ""}`}
              onClick={(event) => event.preventDefault()}
              onPointerDown={() => handlePointerDown(cellIndex)}
              onPointerEnter={() => handlePointerEnter(cellIndex)}
              style={{
                width: renderCellSize,
                height: renderCellSize,
                ...getCellShapeStyle(loader, renderCellSize),
                background: active
                  ? undefined
                  : rgbaWithOpacity(loader.style.backgroundColor ?? "#2D3743", 1, loader.style.backgroundAlpha ?? 1),
                ["--cell-color" as string]: rgbaWithOpacity(loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1),
                ["--cell-glow-color" as string]: rgbaWithOpacity(
                  loader.style.primaryColor,
                  1,
                  loader.style.primaryAlpha ?? 1
                ),
                ["--cell-glow-size" as string]: `${loader.style.shadow ? loader.style.glow : 0}px`
              }}
              aria-label={`Toggle cell ${cellIndex + 1}`}
            />
          );
        })}
      </div>
      {variant === "canvas" && frameLabel ? (
        <div className="dot-grid-editor-shell__badge">{frameLabel}</div>
      ) : null}
    </div>
  );
}
