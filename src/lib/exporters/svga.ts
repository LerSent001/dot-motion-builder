import { compileTimeline } from "@/lib/core/timeline";
import { normalizeCellShape } from "@/lib/cell-shapes";
import { sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent } from "@/types/dot-motion";

function getInactiveOpacity(loader: LoaderComponent) {
  const map: Record<LoaderComponent["animation"]["inactiveStyle"], number> = {
    none: 1,
    "static-dim": 0.62,
    breathe: 0.58,
    ghost: 0.34
  };

  return map[loader.animation.inactiveStyle];
}

function getCellRadius(loader: LoaderComponent, size: number) {
  return normalizeCellShape(loader.style.cellShape) === "rectangle" ? loader.style.radius : size / 2;
}

export function exportSvga(loader: LoaderComponent): ExportArtifact {
  const timeline = compileTimeline(loader);
  const grid = loader.pattern.grid;
  const backgroundSprites = Array.from({ length: grid.rows * grid.cols }, (_, cellIndex) => {
    const row = Math.floor(cellIndex / grid.cols);
    const col = cellIndex % grid.cols;
    const x = col * (grid.cellSize + grid.gap);
    const y = row * (grid.cellSize + grid.gap);

    return {
      imageKey: `background-cell-${cellIndex}`,
      matteKey: "",
      role: "background",
      frames: [
        {
          frame: 0,
          alpha: Number((getInactiveOpacity(loader) * (loader.style.backgroundAlpha ?? 1)).toFixed(3)),
          layout: {
            x,
            y,
            width: grid.cellSize,
            height: grid.cellSize
          },
          transform: {
            scaleX: 1,
            scaleY: 1
          },
          shape: normalizeCellShape(loader.style.cellShape),
          radius: getCellRadius(loader, grid.cellSize),
          fill: loader.style.backgroundColor ?? "#2D3743"
        },
        {
          frame: timeline.totalFrames,
          alpha: Number((getInactiveOpacity(loader) * (loader.style.backgroundAlpha ?? 1)).toFixed(3)),
          layout: {
            x,
            y,
            width: grid.cellSize,
            height: grid.cellSize
          },
          transform: {
            scaleX: 1,
            scaleY: 1
          },
          shape: normalizeCellShape(loader.style.cellShape),
          radius: getCellRadius(loader, grid.cellSize),
          fill: loader.style.backgroundColor ?? "#2D3743"
        }
      ]
    };
  });

  const content = {
    version: "dot-motion-svga-beta-0",
    generator: "Dot Motion Builder",
    exportIntent: "SVGA-like structured animation package",
    movie: {
      fps: timeline.fps,
      frames: timeline.totalFrames,
      viewBoxWidth: timeline.width,
      viewBoxHeight: timeline.height
    },
    sprites: [
      ...backgroundSprites,
      ...timeline.tracks.map((track) => ({
        imageKey: `cell-${track.cellIndex}`,
        matteKey: "",
        role: "active",
        frames: track.keyframes.map((keyframe) => ({
          frame: Math.round((keyframe.timeMs / 1000) * timeline.fps),
          alpha: Number((keyframe.opacity * (loader.style.primaryAlpha ?? 1)).toFixed(3)),
          layout: {
            x: track.x,
            y: track.y,
            width: track.size,
            height: track.size
          },
          transform: {
            scaleX: Number(keyframe.scale.toFixed(3)),
            scaleY: Number(keyframe.scale.toFixed(3))
          },
          shape: normalizeCellShape(loader.style.cellShape),
          radius: getCellRadius(loader, track.size),
          fill: loader.style.primaryColor,
          glow: loader.style.shadow && loader.style.glow > 0
            ? {
              color: loader.style.glowColor ?? loader.style.primaryColor,
              alpha: Number((loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1).toFixed(3)),
              radius: loader.style.glow
            }
            : null
        }))
      }))
    ]
  };

  return {
    format: "svga",
    filename: `${sanitizeName(loader.name)}.svga.json`,
    mimeType: "application/json",
    content: JSON.stringify(content, null, 2),
    notes: [
      "This V1 exporter emits a structured SVGA package description instead of a packed binary .svga file.",
      "The timeline and sprite schema are ready for a future protobuf/zip packer."
    ]
  };
}
