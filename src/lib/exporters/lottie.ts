import { compileTimeline } from "@/lib/core/timeline";
import { normalizeCellShape } from "@/lib/cell-shapes";
import { sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent } from "@/types/dot-motion";

type LottieKeyframe = {
  t: number;
  s: number[];
  i?: { x: number[]; y: number[] };
  o?: { x: number[]; y: number[] };
};

function toFrame(timeMs: number, fps: number) {
  return Number(((timeMs / 1000) * fps).toFixed(2));
}

function buildAnimatedValue(values: LottieKeyframe[]) {
  return {
    a: 1,
    k: values
  };
}

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

export function exportLottie(loader: LoaderComponent): ExportArtifact {
  const timeline = compileTimeline(loader);
  const grid = loader.pattern.grid;
  const totalCells = grid.rows * grid.cols;
  const inactiveOpacity = Math.round(getInactiveOpacity(loader) * (loader.style.backgroundAlpha ?? 1) * 100);
  const backgroundLayers = Array.from({ length: totalCells }, (_, cellIndex) => {
    const row = Math.floor(cellIndex / grid.cols);
    const col = cellIndex % grid.cols;
    const x = col * (grid.cellSize + grid.gap);
    const y = row * (grid.cellSize + grid.gap);

    return {
      ddd: 0,
      ind: cellIndex + 1,
      ty: 4,
      nm: `background-cell-${cellIndex}`,
      sr: 1,
      ks: {
        o: { a: 0, k: inactiveOpacity },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [x + grid.cellSize / 2, y + grid.cellSize / 2, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] }
      },
      ao: 0,
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [grid.cellSize, grid.cellSize] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: getCellRadius(loader, grid.cellSize) },
          nm: "Rect Path"
        },
        {
          ty: "fl",
          c: {
            a: 0,
            k: hexToLottieColor(loader.style.backgroundColor ?? "#2D3743")
          },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Background Fill"
        },
        {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 }
        }
      ],
      ip: 0,
      op: timeline.totalFrames,
      st: 0,
      bm: 0
    };
  });
  const activeLayers = timeline.tracks.map((track, index) => {
    const opacity = track.keyframes.map((keyframe) => ({
      t: toFrame(keyframe.timeMs, timeline.fps),
      s: [Math.round(keyframe.opacity * (loader.style.primaryAlpha ?? 1) * 100)],
      i: { x: [0.667], y: [1] },
      o: { x: [0.333], y: [0] }
    }));
    const scale = track.keyframes.map((keyframe) => ({
      t: toFrame(keyframe.timeMs, timeline.fps),
      s: [Math.round(keyframe.scale * 100), Math.round(keyframe.scale * 100), 100],
      i: { x: [0.667], y: [1] },
      o: { x: [0.333], y: [0] }
    }));

    return {
      ddd: 0,
      ind: totalCells + index + 1,
      ty: 4,
      nm: `cell-${track.cellIndex}`,
      sr: 1,
      ks: {
        o: buildAnimatedValue(opacity),
        r: { a: 0, k: 0 },
        p: { a: 0, k: [track.x + track.size / 2, track.y + track.size / 2, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: buildAnimatedValue(scale)
      },
      ao: 0,
      shapes: [
        {
          ty: "rc",
          d: 1,
          s: { a: 0, k: [track.size, track.size] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: getCellRadius(loader, track.size) },
          nm: "Rect Path"
        },
        {
          ty: "fl",
          c: {
            a: 0,
            k: hexToLottieColor(loader.style.primaryColor)
          },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Fill"
        },
        {
          ty: "tr",
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 }
        }
      ],
      ip: 0,
      op: timeline.totalFrames,
      st: 0,
      bm: 0
    };
  });
  const activeGlowLayers = loader.style.shadow && loader.style.glow > 0
    ? timeline.tracks.map((track, index) => {
      const glowSize = track.size + loader.style.glow * 0.9;
      const glowOpacity = track.keyframes.map((keyframe) => ({
        t: toFrame(keyframe.timeMs, timeline.fps),
        s: [Math.round(keyframe.opacity * (loader.style.glowAlpha ?? loader.style.primaryAlpha ?? 1) * 42)],
        i: { x: [0.667], y: [1] },
        o: { x: [0.333], y: [0] }
      }));
      const scale = track.keyframes.map((keyframe) => ({
        t: toFrame(keyframe.timeMs, timeline.fps),
        s: [Math.round(keyframe.scale * 100), Math.round(keyframe.scale * 100), 100],
        i: { x: [0.667], y: [1] },
        o: { x: [0.333], y: [0] }
      }));

      return {
        ddd: 0,
        ind: totalCells + timeline.tracks.length + index + 1,
        ty: 4,
        nm: `glow-${track.cellIndex}`,
        sr: 1,
        ks: {
          o: buildAnimatedValue(glowOpacity),
          r: { a: 0, k: 0 },
          p: { a: 0, k: [track.x + track.size / 2, track.y + track.size / 2, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: buildAnimatedValue(scale)
        },
        ao: 0,
        shapes: [
          {
            ty: "rc",
            d: 1,
            s: { a: 0, k: [glowSize, glowSize] },
            p: { a: 0, k: [0, 0] },
            r: { a: 0, k: getCellRadius(loader, glowSize) },
            nm: "Glow Path"
          },
          {
            ty: "fl",
            c: {
              a: 0,
              k: hexToLottieColor(loader.style.glowColor ?? loader.style.primaryColor)
            },
            o: { a: 0, k: 100 },
            r: 1,
            nm: "Glow Fill"
          },
          {
            ty: "tr",
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
            sk: { a: 0, k: 0 },
            sa: { a: 0, k: 0 }
          }
        ],
        ip: 0,
        op: timeline.totalFrames,
        st: 0,
        bm: 0
      };
    })
    : [];
  const layers = [...activeLayers, ...activeGlowLayers, ...backgroundLayers];

  return {
    format: "lottie",
    filename: `${sanitizeName(loader.name)}.lottie.json`,
    mimeType: "application/json",
    content: JSON.stringify(
      {
        v: "5.12.2",
        fr: timeline.fps,
        ip: 0,
        op: timeline.totalFrames,
        w: timeline.width,
        h: timeline.height,
        nm: loader.name,
        ddd: 0,
        assets: [],
        layers
      },
      null,
      2
    ),
    notes: [
      "Lottie export includes active cells, background cells, opacity, scale, and an approximated glow layer."
    ]
  };
}

function hexToLottieColor(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  return [
    Number.parseInt(safe.slice(0, 2), 16) / 255,
    Number.parseInt(safe.slice(2, 4), 16) / 255,
    Number.parseInt(safe.slice(4, 6), 16) / 255,
    1
  ];
}
