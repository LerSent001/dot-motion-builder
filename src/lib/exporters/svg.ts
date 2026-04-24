import { compileTimeline } from "@/lib/core/timeline";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { getCellClipPath, normalizeCellShape } from "@/lib/cell-shapes";
import { hexToRgb } from "@/lib/colors";
import { getLabel, rgbaWithOpacity, sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent } from "@/types/dot-motion";

function getRectRadius(loader: LoaderComponent, cellSize: number) {
  if (normalizeCellShape(loader.style.cellShape) !== "rectangle") {
    return 0;
  }

  return Math.min(
    cellSize / 2,
    Math.max(loader.style.radius, loader.style.radius * (cellSize / Math.max(loader.pattern.grid.cellSize, 1)))
  );
}

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

export function exportSvg(loader: LoaderComponent): ExportArtifact {
  const timeline = compileTimeline(loader);
  const metrics = getCanvasGridMetrics(loader);
  const durationSeconds = (timeline.durationMs / 1000).toFixed(2);
  const radius = getRectRadius(loader, metrics.cellSize);
  const clipPath = getCellClipPath(normalizeCellShape(loader.style.cellShape), loader.style.innerRadius);
  const clipStyle = clipPath ? ` style="clip-path:${clipPath};transform-box:fill-box;transform-origin:center"` : "";
  const inactiveOpacity = getInactiveOpacity(loader);
  const inactive = rgbaWithOpacity(loader.style.backgroundColor ?? "#2D3743", inactiveOpacity, loader.style.backgroundAlpha ?? 1);
  const backgroundFill = rgbaWithOpacity(loader.style.backgroundColor ?? "#2D3743", 1, loader.style.backgroundAlpha ?? 1);
  const primaryFill = rgbaWithOpacity(loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1);
  const secondaryFill = rgbaWithOpacity(loader.style.secondaryColor ?? loader.style.primaryColor, 1, loader.style.primaryAlpha ?? 1);
  const glowColor = loader.style.glowColor ?? loader.style.primaryColor;
  const glowRgb = hexToRgb(glowColor);
  const glowAlpha = loader.style.shadow ? loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1 : 0;
  const glowFilterId = `${sanitizeName(loader.name)}-glow`;
  const glowFilter = loader.style.shadow && loader.style.glow > 0
    ? `<defs>
    <filter id="${glowFilterId}" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="0" stdDeviation="${Number((loader.style.glow / 3).toFixed(2))}" flood-color="rgb(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b})" flood-opacity="${Number(glowAlpha.toFixed(3))}" />
    </filter>
  </defs>`
    : "";
  const activeFilter = glowFilter ? ` filter="url(#${glowFilterId})"` : "";
  const motion = getMotionValues(loader);
  const animationName = `${sanitizeName(loader.name)}-pulse`;
  const label = getLabel(loader);
  const activeCells = new Set(timeline.tracks.map((track) => track.cellIndex));

  const backgroundCells = Array.from({ length: loader.pattern.grid.rows * loader.pattern.grid.cols }, (_, cellIndex) => {
    const row = Math.floor(cellIndex / metrics.cols);
    const col = cellIndex % metrics.cols;
    const x = metrics.padding + col * (metrics.cellSize + metrics.gap);
    const y = metrics.padding + row * (metrics.cellSize + metrics.gap);
    const opacity = activeCells.has(cellIndex) ? inactiveOpacity * 0.72 : inactiveOpacity;

    return `<rect x="${x}" y="${y}" width="${metrics.cellSize}" height="${metrics.cellSize}" rx="${radius}" fill="${backgroundFill}" opacity="${Number(opacity.toFixed(3))}"${clipStyle} />`;
  }).join("\n    ");

  const cells = timeline.tracks
    .map((track) => {
      const animationDelay = `${(track.delayMs / 1000).toFixed(2)}s`;
      const row = Math.floor(track.cellIndex / metrics.cols);
      const col = track.cellIndex % metrics.cols;
      const x = metrics.padding + col * (metrics.cellSize + metrics.gap);
      const y = metrics.padding + row * (metrics.cellSize + metrics.gap);
      return `<rect x="${x}" y="${y}" width="${metrics.cellSize}" height="${metrics.cellSize}" rx="${radius}" fill="${primaryFill}" opacity="0.2"${activeFilter} style="animation:${animationName} ${durationSeconds}s infinite;animation-delay:${animationDelay}${clipPath ? `;clip-path:${clipPath}` : ""}" />`;
    })
    .join("\n    ");

  const textNode = label
    ? `<text x="${metrics.panelWidth / 2}" y="${metrics.panelHeight + 28}" text-anchor="middle" fill="${loader.text?.color ?? "#FFFFFF"}" font-family="Inter, Arial, sans-serif" font-size="${loader.text?.fontSize ?? 14}" font-weight="${loader.text?.fontWeight ?? 600}" letter-spacing="${loader.text?.letterSpacing ?? 0}em">${label}</text>`
    : "";
  const exportHeight = label ? metrics.panelHeight + 42 : metrics.panelHeight;

  return {
    format: "svg",
    filename: `${sanitizeName(loader.name)}.svg`,
    mimeType: "image/svg+xml",
    content: `<svg width="${metrics.panelWidth}" height="${exportHeight}" viewBox="0 0 ${metrics.panelWidth} ${exportHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes ${animationName} {
      0%, 100% { opacity: ${inactiveOpacity}; transform-box: fill-box; transform-origin: center; transform: scale(${motion.restScale}); fill: ${inactive}; }
      45% { opacity: 1; transform: scale(${motion.peakScale}); fill: ${primaryFill}; }
      70% { opacity: ${motion.tailOpacity}; transform: scale(${motion.tailScale}); fill: ${secondaryFill}; }
    }
  </style>
  ${glowFilter}
  <rect width="${metrics.panelWidth}" height="${metrics.panelHeight}" rx="30" fill="#06080A" />
  <g>
    ${backgroundCells}
  </g>
  <g>
    ${cells}
  </g>
  ${textNode}
</svg>`
  };
}
