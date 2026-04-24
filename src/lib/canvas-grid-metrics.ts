import { LoaderComponent } from "@/types/dot-motion";

export const CANVAS_FRAME_INSET = 14;
export const CANVAS_GRID_PADDING = 20;

export type CanvasGridMetrics = {
  rows: number;
  cols: number;
  cellSize: number;
  gap: number;
  gridWidth: number;
  gridHeight: number;
  panelWidth: number;
  panelHeight: number;
  padding: number;
};

export function getCanvasGridMetrics(loader: LoaderComponent): CanvasGridMetrics {
  const { rows, cols, gap } = loader.pattern.grid;
  const renderGap = Math.max(0, Math.round(gap));
  const squareStage = Math.min(loader.artboard.width, loader.artboard.height);
  const availableSide = squareStage - CANVAS_FRAME_INSET * 2 - CANVAS_GRID_PADDING * 2;
  const availableWidth = availableSide - (cols - 1) * renderGap;
  const availableHeight = availableSide - (rows - 1) * renderGap;
  const cellSize = Math.max(22, Math.floor(Math.min(availableWidth / cols, availableHeight / rows)));
  const gridWidth = cols * cellSize + (cols - 1) * renderGap;
  const gridHeight = rows * cellSize + (rows - 1) * renderGap;

  return {
    rows,
    cols,
    cellSize,
    gap: renderGap,
    gridWidth,
    gridHeight,
    panelWidth: gridWidth + CANVAS_GRID_PADDING * 2,
    panelHeight: gridHeight + CANVAS_GRID_PADDING * 2,
    padding: CANVAS_GRID_PADDING
  };
}
