import { LoaderComponent } from "@/types/dot-motion";
import { getDirectionalOrderMetric } from "@/lib/motion-order";

const TAU = Math.PI * 2;
const REFERENCE_FRAMES = 24;
const wrap = (n: number) => ((n % 1) + 1) % 1;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const wave = (n: number) => (Math.sin(n) + 1) / 2;
const hash = (n: number) => wrap(Math.sin(n * 12.9898 + 78.233) * 43758.5453);

// One deterministic brightness field drives the editor, Web export, and Swift.
// Shared patterns use the reference site's 24-frame spatial parameters, then
// remain continuous where that produces a cleaner result in this editor.
export function sampleMotion(loader: LoaderComponent, cellIndex: number, progress: number) {
  const { rows, cols } = loader.pattern.grid;
  const a = loader.animation;
  const row = Math.floor(cellIndex / cols), col = cellIndex % cols;
  const t = wrap(progress), angle = t * TAU;
  const frame = Math.floor(t * REFERENCE_FRAMES) % REFERENCE_FRAMES;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const x = col - cx, y = row - cy;
  const ox = col - (a.originX - 1), oy = row - (a.originY - 1);
  const distance = Math.hypot(ox, oy);
  const centerDistance = Math.hypot(x, y);
  const radius = Math.max(Math.hypot(cx, cy), 1);
  const originRadius = Math.max(
    Math.hypot(a.originX - 1, a.originY - 1),
    Math.hypot(cols - a.originX, a.originY - 1),
    Math.hypot(a.originX - 1, rows - a.originY),
    Math.hypot(cols - a.originX, rows - a.originY),
    1
  );
  const metric = getDirectionalOrderMetric(row, col, rows, cols, a.direction);
  const diagonal = a.direction.includes("-");
  const vertical = ["up", "down"].includes(a.direction);
  const secondaryMetric = vertical ? col : row;
  const span = diagonal ? rows + cols - 2 : vertical ? rows - 1 : cols - 1;
  let brightness = 0;

  switch (a.presetId) {
    case "wave":
      brightness = wave((diagonal ? metric * .8 : metric * .8 + secondaryMetric * .3) - angle);
      break;
    case "sweep": {
      const d = Math.abs(wrap(metric / (span + 3) - t + .5) - .5) * (span + 3);
      brightness = Math.max(0, 1 - d * .5);
      break;
    }
    case "fish-eye":
      brightness = wave(metric * .8 - angle);
      break;
    case "burst": {
      const ring = t * originRadius * 1.5;
      brightness = Math.max(0, 1 - Math.abs(distance - ring) * .8) * (1 - t * .5);
      break;
    }
    case "bloom": {
      const squareDistance = Math.max(Math.abs(ox), Math.abs(oy));
      const front = t * Math.max(rows, cols) * .75;
      brightness = squareDistance <= front ? Math.max(0, 1 - (front - squareDistance) * .3) : 0;
      break;
    }
    case "diamond-wave": {
      const maxDistance = Math.max(
        a.originX + a.originY - 2,
        cols - a.originX + a.originY - 1,
        a.originX + rows - a.originY - 1,
        cols - a.originX + rows - a.originY
      );
      const front = t * Math.max(maxDistance, 1) * 1.5;
      brightness = Math.max(0, 1 - Math.abs(Math.abs(ox) + Math.abs(oy) - front) * .5);
      break;
    }
    case "radar": {
      let delta = Math.abs(Math.atan2(y, x) - angle);
      if (delta > Math.PI) delta = TAU - delta;
      brightness = Math.max(0, 1 - delta * 1.5);
      break;
    }
    case "random":
      brightness = hash(cellIndex * 97 + frame * 53 + rows * 11 + cols * 7);
      break;
    case "checkerboard":
      brightness = (row + col + (t < .5 ? 0 : 1)) % 2 === 0 ? 1 : .15;
      break;
    case "heartbeat": {
      const strong = Math.max(0, Math.sin(t * Math.PI * 4) * (t < .25 ? 1 : 0));
      const echo = Math.max(0, Math.sin((t - .15) * Math.PI * 4) * (t > .15 && t < .4 ? .7 : 0));
      brightness = Math.max(strong, echo, .1) * Math.max(0, 1 - centerDistance / radius * .5);
      break;
    }
    case "breathing":
      brightness = .2 + wave(angle - Math.PI / 2) * .8;
      break;
    case "pinwheel":
      brightness = Math.pow(wave(Math.atan2(y, x) * 2 - angle), 3) * Math.max(.35, 1 - centerDistance / (radius * 1.5));
      break;
  }

  let scale = 1;
  switch (a.style) {
    case "pulse-size": scale = .3 + .7 * brightness; break;
    case "fisheye": scale = (1.3 - centerDistance / radius * .6) * (.5 + brightness * .5); break;
    case "depth-shift": scale = 1 - .5 * brightness; break;
    case "bloom-pop": scale = brightness > .01 ? Math.min(1.3, brightness * 1.3 - Math.sin(brightness * TAU) * .15) : 0; break;
  }
  scale = 1 + (scale - 1) * (a.scaleIntensity ?? 1);
  return { opacity: clamp(brightness), scale: Math.max(0, Math.min(1.3, scale)) };
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
