import { compileTimeline } from "@/lib/core/timeline";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { getCellClipPath, normalizeCellShape } from "@/lib/cell-shapes";
import { getLabel, rgbaWithOpacity, sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent } from "@/types/dot-motion";

function getInactiveOpacity(loader: LoaderComponent) {
  const map = {
    none: 1,
    "static-dim": 0.62,
    breathe: 0.58,
    ghost: 0.34
  } as const;

  return map[loader.animation.inactiveStyle];
}

function getMotionValues(loader: LoaderComponent) {
  const map = {
    "opacity-only": { restScale: 1, peakScale: 1, tailScale: 1, tailOpacity: 0.54 },
    "pulse-size": { restScale: 0.82, peakScale: 1, tailScale: 0.9, tailOpacity: 0.58 },
    "depth-shift": { restScale: 0.76, peakScale: 1, tailScale: 0.86, tailOpacity: 0.42 },
    "bloom-pop": { restScale: 0.78, peakScale: 1, tailScale: 0.92, tailOpacity: 0.7 }
  } as const;

  return map[loader.animation.style];
}

export function exportCss(loader: LoaderComponent): ExportArtifact {
  const timeline = compileTimeline(loader);
  const metrics = getCanvasGridMetrics(loader);
  const className = sanitizeName(loader.name);
  const animationName = `${className}-cell-pulse`;
  const label = getLabel(loader);
  const inactiveOpacity = getInactiveOpacity(loader);
  const inactive = rgbaWithOpacity(loader.style.backgroundColor ?? "#2D3743", inactiveOpacity, loader.style.backgroundAlpha ?? 1);
  const motion = getMotionValues(loader);
  const glowColor = loader.style.glowColor ?? loader.style.primaryColor;
  const primary = rgbaWithOpacity(loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1);
  const secondary = rgbaWithOpacity(loader.style.secondaryColor ?? loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1);
  const glow = rgbaWithOpacity(glowColor, 1, loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1);
  const glowSpread = loader.style.shadow ? loader.style.glow : 0;
  const normalizedShape = normalizeCellShape(loader.style.cellShape);
  const clipPath = getCellClipPath(normalizedShape, loader.style.innerRadius);
  const radius = normalizedShape === "rectangle"
    ? Math.min(
      metrics.cellSize / 2,
      Math.max(loader.style.radius, loader.style.radius * (metrics.cellSize / Math.max(loader.pattern.grid.cellSize, 1)))
    )
    : 0;
  const activeTracks = new Map(timeline.tracks.map((track) => [track.cellIndex, track]));
  const totalCells = loader.pattern.grid.rows * loader.pattern.grid.cols;
  const html = [
    `<div class="${className}">`,
    `  <div class="${className}__grid">`,
    ...Array.from({ length: totalCells }, (_, cellIndex) => {
      const track = activeTracks.get(cellIndex);
      const row = Math.floor(cellIndex / loader.pattern.grid.cols);
      const col = cellIndex % loader.pattern.grid.cols;
      const activeClass = track ? ` ${className}__cell--active` : "";
      const delay = track ? ` --delay:${track.delayMs}ms;` : "";
      return `    <span class="${className}__cell${activeClass}" style="--row:${row}; --col:${col};${delay}"></span>`;
    }),
    "  </div>",
    label ? `  <span class="${className}__label">${label}</span>` : "",
    "</div>"
  ]
    .filter(Boolean)
    .join("\n");

  const css = `.${className} {
  --cell-size: ${metrics.cellSize}px;
  --gap: ${metrics.gap}px;
  --radius: ${radius}px;
  --clip-path: ${clipPath ?? "none"};
  --primary: ${primary};
  --secondary: ${secondary};
  --glow: ${glow};
  --glow-spread: ${glowSpread}px;
  --inactive: ${inactive};
  --inactive-opacity: ${inactiveOpacity};
  display: inline-grid;
  place-items: center;
  width: ${metrics.panelWidth}px;
  height: ${metrics.panelHeight}px;
  padding: ${metrics.padding}px;
  border-radius: 30px;
  background: #06080a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

.${className}__grid {
  position: relative;
  width: ${metrics.gridWidth}px;
  height: ${metrics.gridHeight}px;
}

.${className}__cell {
  position: absolute;
  left: calc(var(--col) * (var(--cell-size) + var(--gap)));
  top: calc(var(--row) * (var(--cell-size) + var(--gap)));
  width: var(--cell-size);
  height: var(--cell-size);
  border-radius: var(--radius);
  clip-path: var(--clip-path);
  background: var(--inactive);
  opacity: var(--inactive-opacity);
}

.${className}__cell--active {
  animation: ${animationName} ${timeline.durationMs}ms infinite;
  animation-delay: var(--delay);
  box-shadow: 0 0 var(--glow-spread) color-mix(in srgb, var(--glow) 60%, transparent);
}

.${className}__label {
  color: ${loader.text?.color ?? "rgba(255,255,255,0.92)"};
  font-size: ${loader.text?.fontSize ?? 14}px;
  font-weight: ${loader.text?.fontWeight ?? 600};
  letter-spacing: ${loader.text?.letterSpacing ?? 0}em;
  white-space: nowrap;
}

@keyframes ${animationName} {
  0%, 100% {
    opacity: ${inactiveOpacity};
    transform: scale(${motion.restScale});
    background: var(--inactive);
  }

  45% {
    opacity: 1;
    transform: scale(${motion.peakScale});
    background: var(--primary);
  }

  70% {
    opacity: ${motion.tailOpacity};
    transform: scale(${motion.tailScale});
    background: var(--secondary);
  }
}`;

  return {
    format: "css",
    filename: `${className}.html-css.txt`,
    mimeType: "text/plain",
    content: `${html}\n\n<style>\n${css}\n</style>`
  };
}
