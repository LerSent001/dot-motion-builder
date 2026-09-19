import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { getCellClipPath, normalizeCellShape } from "@/lib/cell-shapes";
import { hexToRgb } from "@/lib/colors";
import { getCycleDuration, sampleBackground, sampleMotion } from "@/lib/core/motion-sampler";
import { LoaderComponent, Project } from "@/types/dot-motion";

const round = (n: number) => Number(n.toFixed(5));
function color(hex: string, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return [r / 255, g / 255, b / 255, alpha].map(round);
}

/** Shared samples keep exported runtimes independent of preset implementations. */
export function buildMotionData(project: Project, loader: LoaderComponent) {
  const sequence = loader.sequenceId
    ? project.loaders.filter(f => f.sequenceId === loader.sequenceId).sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0))
    : [loader];
  const frames = sequence.length ? sequence : [loader];
  const discrete = Boolean(loader.sequenceId);
  const duration = discrete ? frames.length / Math.max(1, loader.animation.fps) : getCycleDuration(loader) / 1000;
  const scenes = frames.map(frame => {
    const m = getCanvasGridMetrics(frame);
    // Sequence masks remain frame-based, but inactive-cell effects still need a
    // continuous shared phase in both exported runtimes.
    const count = discrete ? 60 : Math.max(120, Math.ceil(duration * 60));
    const active = new Set(frame.pattern.activeCells);
    const shape = normalizeCellShape(frame.style.cellShape);
    const polygon = getCellClipPath(shape, frame.style.innerRadius)?.match(/[\d.]+/g)?.map(Number) ?? [];
    const label = frame.text?.enabled ? frame.text.content : "";
    return {
      width: m.panelWidth, height: m.panelHeight + (label ? (frame.text?.fontSize ?? 14) * 1.5 + 8 : 0),
      cellSize: m.cellSize,
      radius: shape === "circle"
        ? m.cellSize / 2
        : shape === "rectangle" || shape === "rounded-rect" || shape === "pill"
          ? m.cellSize * 0.22
          : 0,
      polygon: polygon.map(n => n / 100),
      primary: color(frame.style.primaryColor, frame.style.primaryAlpha ?? 1),
      background: color(frame.style.backgroundColor ?? "#2D3743", frame.style.backgroundAlpha ?? 1),
      glowColor: color(frame.style.primaryColor, frame.style.primaryAlpha ?? 1),
      glow: frame.style.shadow ? frame.style.glow : 0,
      label, fontSize: frame.text?.fontSize ?? 14, fontWeight: frame.text?.fontWeight ?? 600,
      letterSpacing: frame.text?.letterSpacing ?? 0,
      textColor: color(frame.text?.color ?? "#FFFFFF"), labelY: m.panelHeight + 8,
      cells: Array.from({length: m.rows * m.cols}, (_, index) => ({
        x: m.padding + (index % m.cols) * (m.cellSize + m.gap),
        y: m.padding + Math.floor(index / m.cols) * (m.cellSize + m.gap),
        active: active.has(index),
        samples: Array.from({length: count + 1}, (_, step) => {
          const phase = step / count;
          const v = discrete ? {opacity: 1, scale: 1} : sampleMotion(frame, index, phase);
          return [v.opacity, v.scale, sampleBackground(frame, index, phase)].map(round);
        })
      }))
    };
  });
  return { version: 1, duration, loop: loader.animation.loop, discrete, width: Math.max(...scenes.map(s => s.width)), height: Math.max(...scenes.map(s => s.height)), scenes };
}

export type MotionData = ReturnType<typeof buildMotionData>;
