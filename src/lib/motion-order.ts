import { Direction } from "@/types/dot-motion";

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
