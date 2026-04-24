import { Direction, LoaderComponent, MotionPresetId } from "@/types/dot-motion";

export const orderedMotionPresetIds = [
  "spiral",
  "corners",
  "snake",
  "checkerboard",
  "rain",
  "pinwheel"
] as const satisfies readonly MotionPresetId[];

type OrderedMotionPresetId = (typeof orderedMotionPresetIds)[number];

type OrderInput = {
  presetId: MotionPresetId;
  direction: Direction;
  rows: number;
  cols: number;
  row: number;
  col: number;
  originX: number;
  originY: number;
  cellIndex: number;
};

export function isOrderedMotionPreset(presetId: MotionPresetId): presetId is OrderedMotionPresetId {
  return orderedMotionPresetIds.includes(presetId as OrderedMotionPresetId);
}

export function getDirectionalOrderMetric(row: number, col: number, rows: number, cols: number, direction: Direction) {
  switch (direction) {
    case "left":
      return cols - 1 - col;
    case "down":
      return row;
    case "up":
      return rows - 1 - row;
    case "down-right":
      return row + col;
    case "up-right":
      return rows - 1 - row + col;
    case "down-left":
      return row + cols - 1 - col;
    case "up-left":
      return rows - 1 - row + cols - 1 - col;
    case "right":
    default:
      return col;
  }
}

function getSpiralOrder(rows: number, cols: number, targetRow: number, targetCol: number) {
  let order = 0;
  let top = 0;
  let right = cols - 1;
  let bottom = rows - 1;
  let left = 0;

  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col += 1) {
      if (top === targetRow && col === targetCol) return order;
      order += 1;
    }
    top += 1;

    for (let row = top; row <= bottom; row += 1) {
      if (row === targetRow && right === targetCol) return order;
      order += 1;
    }
    right -= 1;

    if (top <= bottom) {
      for (let col = right; col >= left; col -= 1) {
        if (bottom === targetRow && col === targetCol) return order;
        order += 1;
      }
      bottom -= 1;
    }

    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) {
        if (row === targetRow && left === targetCol) return order;
        order += 1;
      }
      left += 1;
    }
  }

  return order;
}

function getAngleOrder(row: number, col: number, rows: number, cols: number, offsetTurns = 0) {
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  const angle = Math.atan2(row - centerRow, col - centerCol);
  const turns = ((angle / (Math.PI * 2)) + 1 + offsetTurns) % 1;
  return turns * Math.max(rows, cols);
}

function seededRainOrder(cellIndex: number, row: number, col: number, rows: number, cols: number) {
  const total = Math.max(rows * cols, 1);
  return (cellIndex * 37 + row * 17 + col * 29 + rows * 13 + cols * 7) % total;
}

export function getMotionOrderIndex(input: OrderInput) {
  const { presetId, direction, rows, cols, row, col, originX, originY, cellIndex } = input;
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  const originCol = Math.min(cols - 1, Math.max(0, originX - 1));
  const originRow = Math.min(rows - 1, Math.max(0, originY - 1));

  switch (presetId) {
    case "spiral":
      return getSpiralOrder(rows, cols, row, col);
    case "corners":
      return Math.min(
        row + col,
        row + cols - 1 - col,
        rows - 1 - row + col,
        rows - 1 - row + cols - 1 - col
      );
    case "snake":
      return row * cols + (row % 2 === 0 ? col : cols - 1 - col);
    case "checkerboard":
      return (row + col) % 2;
    case "rain":
      return seededRainOrder(cellIndex, row, col, rows, cols);
    case "pinwheel":
      return getAngleOrder(row, col, rows, cols, 0.375) + Math.hypot(row - centerRow, col - centerCol) * 0.18;
    case "bloom":
    case "ripple":
      return Math.abs(col - originCol) + Math.abs(row - originRow);
    case "fish-eye":
    case "wave":
    case "sweep":
      return getDirectionalOrderMetric(row, col, rows, cols, direction);
    case "blink":
    case "pulse":
    default:
      return 0;
  }
}

function getCellOrder(loader: LoaderComponent, cellIndex: number) {
  const { grid } = loader.pattern;
  const row = Math.floor(cellIndex / grid.cols);
  const col = cellIndex % grid.cols;

  return getMotionOrderIndex({
    presetId: loader.animation.presetId,
    direction: loader.animation.direction,
    rows: grid.rows,
    cols: grid.cols,
    row,
    col,
    originX: loader.animation.originX,
    originY: loader.animation.originY,
    cellIndex
  });
}

export function getMotionOrderRange(loader: LoaderComponent) {
  const { grid, activeCells } = loader.pattern;
  const totalCells = grid.rows * grid.cols;
  const cellIndexes = activeCells.length > 0
    ? activeCells
    : Array.from({ length: totalCells }, (_, index) => index);
  const orders = cellIndexes.map((cellIndex) => getCellOrder(loader, cellIndex));
  const min = orders.length > 0 ? Math.min(...orders) : 0;
  const max = orders.length > 0 ? Math.max(...orders) : 0;

  return {
    min,
    max,
    span: Math.max(max - min, 1)
  };
}
