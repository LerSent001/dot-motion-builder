import { LoaderComponent, Timeline, AnimationMode } from "@/types/dot-motion";
import { getCycleDuration, sampleMotion } from "@/lib/core/motion-sampler";
function cellToRowCol(cellIndex: number, cols: number) {return {row: Math.floor(cellIndex / cols), col: cellIndex % cols};}

export function compileTimeline(loader: LoaderComponent): Timeline {
  const { grid } = loader.pattern;
  const width = grid.cols * grid.cellSize + (grid.cols - 1) * grid.gap;
  const height = grid.rows * grid.cellSize + (grid.rows - 1) * grid.gap;
  const durationMs = getCycleDuration(loader);
  const samples = Math.max(120, Math.ceil(durationMs * .06));
  const tracks = loader.pattern.activeCells.map((cellIndex) => {
    const {row, col} = cellToRowCol(cellIndex, grid.cols);
    return { cellIndex, row, col, x: col * (grid.cellSize + grid.gap), y: row * (grid.cellSize + grid.gap), size: grid.cellSize, delayMs: 0,
      keyframes: Array.from({length: samples + 1}, (_, i) => ({timeMs: durationMs * i / samples, ...sampleMotion(loader, cellIndex, i / samples)})) };
  });

  return {
    durationMs,
    fps: loader.animation.fps,
    totalFrames: Math.ceil((durationMs / 1000) * loader.animation.fps),
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
