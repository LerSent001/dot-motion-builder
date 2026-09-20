import { LoaderComponent } from "@/types/dot-motion";
import { getDirectionalOrderMetric, getMotionOrderIndex } from "@/lib/motion-order";

const TAU = Math.PI * 2;
const wrap = (n: number) => ((n % 1) + 1) % 1;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const wave = (n: number) => (Math.sin(n) + 1) / 2;

// A single, deterministic signal drives the canvas and all export timelines.
// Reference: loaders.wtf's spatial brightness fields and separate size styles.
export function sampleMotion(loader: LoaderComponent, cellIndex: number, progress: number) {
  const { rows, cols } = loader.pattern.grid;
  const a = loader.animation;
  const row = Math.floor(cellIndex / cols), col = cellIndex % cols;
  const t = wrap(progress), angle = t * TAU;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const x = col - cx, y = row - cy;
  const distance = Math.hypot(col - (a.originX - 1), row - (a.originY - 1));
  const centerDistance = Math.hypot(x, y);
  const radius = Math.max(Math.hypot(cx, cy), 1);
  const metric = getDirectionalOrderMetric(row, col, rows, cols, a.direction);
  const diagonal = a.direction.includes("-");
  const span = diagonal ? rows + cols - 2 : ["up", "down"].includes(a.direction) ? rows - 1 : cols - 1;
  let brightness = 0;
  switch (a.presetId) {
    case "wave": brightness = wave(metric * .8 - angle); break;
    case "sweep": {
      // Wrapped distance removes the discontinuity when the scan crosses the edge.
      const d = Math.abs(wrap(metric / (span + 3) - t + .5) - .5) * (span + 3);
      brightness = Math.max(0, 1 - d * .5); break;
    }
    case "bloom": brightness = Math.pow(wave(distance * 1.1 - angle), 3); break;
    case "fish-eye": brightness = wave(metric * .8 - angle); break;
    case "checkerboard": brightness = .15 + .85 * wave(angle + ((row + col) % 2) * Math.PI); break;
    case "spiral":
    case "snake": {
      const order = getMotionOrderIndex({ presetId: a.presetId, direction: a.direction, rows, cols, row, col, originX: a.originX, originY: a.originY, cellIndex });
      const tail = wrap(t - order / (rows * cols));
      brightness = tail < .32 ? Math.pow(1 - tail / .32, 1.4) : 0; break;
    }
    case "corners": brightness = wave(Math.min(row, rows - 1 - row, col, cols - 1 - col) * 1.5 - angle); break;
    case "rain": {
      const phase = wrap(t + col * .61803398875);
      const d = Math.abs(wrap(row / (rows + 2) - phase + .5) - .5) * (rows + 2);
      brightness = Math.max(0, 1 - d * .65); break;
    }
    case "pinwheel": brightness = Math.pow(wave(Math.atan2(y, x) * 2 - angle), 3); break;
    case "radar": {
      const tail = wrap(t - Math.atan2(y, x) / TAU);
      brightness = Math.pow(1 - tail, 5); break;
    }
    case "orbit": {
      const dx = x - Math.cos(angle) * cx * .75, dy = y - Math.sin(angle) * cy * .75;
      brightness = Math.exp(-(dx * dx + dy * dy) / 1.4); break;
    }
    case "heartbeat": brightness = Math.max(Math.exp(-(((t - .18) / .055) ** 2)), .7 * Math.exp(-(((t - .35) / .065) ** 2)), .04) * (1 - centerDistance / radius * .5); break;
    case "equalizer": {
      const height = (.18 + .82 * wave(angle + col * 1.7) * (.6 + .4 * wave(angle * 2 - col))) * rows;
      brightness = clamp(height - (rows - 1 - row)); break;
    }
    case "dna": {
      const p = Math.sin(angle + row * .7) * cx;
      brightness = Math.max(Math.exp(-((x - p) ** 2) / .4), .6 * Math.exp(-((x + p) ** 2) / .4)); break;
    }
    case "sparkle": brightness = Math.pow(wave(angle + cellIndex * 2.399963), 10); break;
    case "breathing": brightness = .2 + .8 * (1 - Math.cos(angle)) / 2; break;
    case "sine": brightness = Math.exp(-((y - Math.sin(angle + col * .7) * cy * .75) ** 2) / .6); break;
    case "collapse": brightness = Math.pow(wave(distance * 1.1 + angle), 3); break;
  }
  let scale = 1;
  switch (a.style) {
    case "pulse-size": scale = .3 + .7 * brightness; break;
    case "fisheye": scale = (1.3 - centerDistance / radius * .6) * (.5 + brightness * .5); break;
    case "depth-shift": scale = 1 - .5 * brightness; break;
    case "bloom-pop": scale = brightness > .01 ? Math.min(1, brightness * 1.3 - Math.sin(brightness * TAU) * .15) : 0; break;
  }
  scale = 1 + (scale - 1) * (a.scaleIntensity ?? 1);
  return { opacity: clamp(brightness), scale: Math.max(0, scale) };
}

export function getCycleDuration(loader: LoaderComponent) {
  return loader.animation.durationMs / (loader.animation.speed ?? 1);
}

export function sampleBackground(loader: LoaderComponent, cellIndex: number, progress: number) {
  const row = Math.floor(cellIndex / loader.pattern.grid.cols), col = cellIndex % loader.pattern.grid.cols;
  const breathe = wave(wrap(progress) * TAU + row * .85 + col * .55);
  switch (loader.animation.inactiveStyle) {
    case "breathe": return .58 + breathe * .32;
    case "ghost": return .34 + breathe * .24;
    case "static-dim": return .62;
    default: return 1;
  }
}
