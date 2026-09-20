import { LoaderComponent } from "@/types/dot-motion";
import { getDirectionalOrderMetric, getMotionOrderIndex } from "@/lib/motion-order";

const TAU = Math.PI * 2;
const REFERENCE_FRAMES = 24;
const wrap = (n: number) => ((n % 1) + 1) % 1;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const wave = (n: number) => (Math.sin(n) + 1) / 2;
const hash = (n: number) => wrap(Math.sin(n * 12.9898 + 78.233) * 43758.5453);

function perimeterOrder(row: number, col: number, rows: number, cols: number) {
  if (row === 0) return col;
  if (col === cols - 1) return cols - 1 + row;
  if (row === rows - 1) return cols - 1 + rows - 1 + cols - 1 - col;
  if (col === 0) return cols - 1 + rows - 1 + cols - 1 + rows - 1 - row;
  return -1;
}

function letterMask(id: "letter-t" | "letter-x" | "letter-o", row: number, col: number, rows: number, cols: number) {
  const u = cols > 1 ? col / (cols - 1) : .5;
  const v = rows > 1 ? row / (rows - 1) : .5;
  const thickness = Math.max(.11, .7 / Math.max(rows, cols));
  if (id === "letter-t") return v <= thickness || Math.abs(u - .5) <= thickness / 2;
  if (id === "letter-x") return Math.abs(u - v) <= thickness || Math.abs(u + v - 1) <= thickness;
  const edge = Math.min(u, v, 1 - u, 1 - v);
  return edge <= thickness;
}

// One deterministic brightness field drives the editor, Web export, and Swift.
// Shared patterns use the reference site's 24-frame spatial parameters, then
// remain continuous where that produces a cleaner result in this editor.
export function sampleMotion(loader: LoaderComponent, cellIndex: number, progress: number) {
  const { rows, cols } = loader.pattern.grid;
  const a = loader.animation;
  const row = Math.floor(cellIndex / cols), col = cellIndex % cols;
  const t = wrap(progress), angle = t * TAU;
  const frame = Math.floor(t * REFERENCE_FRAMES) % REFERENCE_FRAMES;
  const framePhase = frame / REFERENCE_FRAMES;
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
  const total = Math.max(rows * cols, 1);
  let brightness = 0;

  switch (a.presetId) {
    case "spinner": {
      const order = perimeterOrder(row, col, rows, cols);
      const length = Math.max(2 * (rows + cols) - 4, 1);
      const tail = Math.max(3, Math.floor(length / 3));
      if (order >= 0) {
        const delta = wrap(t - order / length) * length;
        brightness = delta < tail ? 1 - delta / tail * .7 : 0;
      }
      break;
    }
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
    case "sine":
      brightness = Math.exp(-((y - Math.sin(angle + col * .7) * cy * .75) ** 2) / .6);
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
    case "collapse": {
      const squareDistance = Math.max(Math.abs(ox), Math.abs(oy));
      const front = Math.max(rows, cols) * .75 * (1 - t);
      brightness = squareDistance >= front ? Math.max(0, 1 - (squareDistance - front) * .3) : 0;
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
    case "spiral":
    case "snake": {
      const order = getMotionOrderIndex({ presetId: a.presetId, direction: a.direction, rows, cols, row, col, originX: a.originX, originY: a.originY, cellIndex });
      const tailLength = Math.max(3, Math.floor(total / (a.presetId === "spiral" ? 3 : 4)));
      const delta = wrap(t - order / total) * total;
      brightness = delta < tailLength ? 1 - delta / tailLength * .8 : 0;
      break;
    }
    case "typewriter": {
      const step = Math.floor(t * (total + 8));
      brightness = step >= total ? .6 : cellIndex < step ? .6 : cellIndex === step ? 1 : 0;
      break;
    }
    case "row-scan":
      brightness = row === Math.floor(t * rows) ? 1 : .15;
      break;
    case "column-scan":
      brightness = col === Math.floor(t * cols) ? 1 : .15;
      break;
    case "radar": {
      let delta = Math.abs(Math.atan2(y, x) - angle);
      if (delta > Math.PI) delta = TAU - delta;
      brightness = Math.max(0, 1 - delta * 1.5);
      break;
    }
    case "searching": {
      const travel = framePhase * rows * 2;
      const scanRow = travel < rows ? Math.floor(travel) : Math.floor(rows * 2 - travel - 1);
      const delta = Math.abs(row - Math.max(0, Math.min(rows - 1, scanRow)));
      brightness = delta === 0 ? 1 : delta <= 2 ? .5 - delta * .15 : (row + col + frame) % 5 === 0 ? .2 : .05;
      break;
    }
    case "rain": {
      const start = hash(col * 17 + cols * 7) * rows;
      const drop = (start + frame * .5) % (rows + 2) - 1;
      brightness = Math.max(0, 1 - Math.abs(row - drop) * .5);
      break;
    }
    case "matrix": {
      const start = hash(col * 31 + cols) * rows * 2 - rows;
      const speed = .3 + hash(col * 47 + rows) * .4;
      const length = 2 + Math.floor(hash(col * 61 + total) * 3);
      const delta = start + frame * speed - row;
      brightness = delta >= 0 && delta < length ? 1 - delta / length * .7 : 0;
      break;
    }
    case "glitch":
      if (frame % 5 < 2) {
        const stripes = 1 + frame % 3;
        for (let stripe = 0; stripe < stripes; stripe += 1) {
          if (row === (frame * 3 + stripe * 7) % rows) brightness = .5 + (frame + col) % 3 * .2;
        }
      } else brightness = .15 + Math.sin(frame * .3) * .05;
      break;
    case "random":
      brightness = hash(cellIndex * 97 + frame * 53 + rows * 11 + cols * 7);
      break;
    case "sparkle": {
      const count = 2 + frame % 3;
      for (let sparkle = 0; sparkle < count; sparkle += 1) {
        const target = (frame * 7 + sparkle * 13) % total;
        const targetRow = target % rows;
        const targetCol = Math.floor(target / rows) % cols;
        const level = .5 + wave(frame * .5 + sparkle) * .5;
        const delta = Math.max(Math.abs(row - targetRow), Math.abs(col - targetCol));
        if (delta <= 1) brightness = Math.max(brightness, delta === 0 ? level : level * .3);
      }
      break;
    }
    case "corners": {
      const corners = [[0, 0], [0, cols - 1], [rows - 1, cols - 1], [rows - 1, 0]];
      const [cornerRow, cornerCol] = corners[Math.floor(t * 4) % 4];
      brightness = Math.max(.1, 1 - Math.hypot(row - cornerRow, col - cornerCol) * .3);
      break;
    }
    case "box-trace": {
      const order = perimeterOrder(row, col, rows, cols);
      if (order < 0) brightness = .1;
      else {
        const length = Math.max(2 * (rows + cols) - 4, 1);
        const delta = Math.abs(wrap(order / length - t + .5) - .5) * length;
        brightness = Math.max(.3, 1 - delta * .5);
      }
      break;
    }
    case "cross-wave":
      brightness = row === Math.floor(cy) || col === Math.floor(cx) ? .3 + wave(angle) * .7 : .1;
      break;
    case "heart-wave": {
      const nx = x / Math.max(cx, 1) * 1.15;
      const ny = -y / Math.max(cy, 1) * 1.15;
      const q = nx * nx + ny * ny - 1;
      const inside = q * q * q - nx * nx * ny * ny * ny <= 0;
      brightness = inside ? .35 + Math.abs(Math.sin(angle)) * .65 : .05;
      break;
    }
    case "checkerboard":
      brightness = (row + col + (t < .5 ? 0 : 1)) % 2 === 0 ? 1 : .15;
      break;
    case "thinking-dots": {
      const dotCount = Math.min(3, cols);
      const spacing = Math.floor(cols / (dotCount + 1));
      const centerRow = Math.floor(rows / 2);
      for (let dot = 0; dot < dotCount; dot += 1) {
        const dotCol = spacing * (dot + 1);
        const signal = Math.sin((t + dot * .25) * TAU);
        const dotRow = Math.max(0, Math.min(rows - 1, centerRow - Math.round(signal * Math.min(2, rows / 4))));
        const level = .3 + (signal + 1) / 2 * .7;
        if (col === dotCol) {
          if (row === dotRow) brightness = level;
          else if (Math.abs(row - dotRow) === 1) brightness = level * .3;
        }
      }
      break;
    }
    case "neural-network": {
      const field = Math.sin(angle - centerDistance * .5 + Math.atan2(y, x));
      brightness = Math.max(.1, (field + 1) / 2 * .8) * (1 - centerDistance / Math.max(rows, cols) * .5);
      if (row === Math.floor(cy) && col === Math.floor(cx)) brightness = Math.max(brightness, .8);
      break;
    }
    case "connecting": {
      brightness = Math.exp(-(centerDistance ** 2) / .35) * .8;
      const phase = wrap(t * 5);
      const cornerIndex = Math.floor(t * 5) % 4;
      const [targetRow, targetCol] = [[0, 0], [0, cols - 1], [rows - 1, cols - 1], [rows - 1, 0]][cornerIndex];
      const signalRow = cy + (targetRow - cy) * phase;
      const signalCol = cx + (targetCol - cx) * phase;
      brightness = Math.max(brightness, Math.exp(-((row - signalRow) ** 2 + (col - signalCol) ** 2) / .45));
      break;
    }
    case "progress-bar": {
      const middle = Math.floor(rows / 2);
      if (Math.abs(row - middle) <= 1) {
        const front = Math.floor(t * (cols + 1));
        brightness = col < front ? 1 : col === front ? .5 + Math.sin(frame * .5) * .3 : .15;
      }
      break;
    }
    case "success": {
      const u = cols > 1 ? col / (cols - 1) : .5;
      const v = rows > 1 ? row / (rows - 1) : .5;
      const first = Math.abs(v - (.3 + u * .4)) < .15 && u < .5;
      const second = Math.abs(v - (.7 - u * .6)) < .15 && u >= .3;
      const pathProgress = first ? u * 2 : .5 + (u - .3) * .7;
      brightness = (first || second) && pathProgress <= t ? 1 : 0;
      break;
    }
    case "error": {
      const v = rows > 1 ? row / (rows - 1) : .5;
      const shake = t < .5 ? Math.sin(frame * .8) * .03 : 0;
      const u = (cols > 1 ? col / (cols - 1) : .5) + shake;
      brightness = Math.abs(v - u) < .2 || Math.abs(v - (1 - u)) < .2 ? 1 : t < .25 ? (1 - t * 4) * .3 : 0;
      break;
    }
    case "arrow-right":
    case "arrow-left": {
      const head = a.presetId === "arrow-right" ? t * (cols + 4) - 2 : cols - 1 - t * (cols + 4) + 2;
      const delta = a.presetId === "arrow-right" ? head - col : col - head;
      if (delta >= 0 && delta < 3) {
        const width = Math.floor(delta * (rows / 4));
        const rowDistance = Math.abs(row - Math.floor(rows / 2));
        if (rowDistance <= width + 1) brightness = Math.max(0, (1 - delta * .25) * (1 - rowDistance / Math.max(rows / 2, 1)));
      }
      break;
    }
    case "equalizer": {
      const columnAngle = angle + col * .2 * TAU;
      const height = Math.floor(wave(columnAngle) * rows * .8 + rows * .1);
      if (row >= Math.max(0, rows - height)) brightness = .4 + (rows - 1 - row) / Math.max(1, height) * .6;
      break;
    }
    case "orbit": {
      const orbitRadius = Math.max(0, Math.min(rows, cols) / 2 - .5);
      if (row === Math.floor(cy) && col === Math.floor(cx)) brightness = .5;
      for (let tail = 0; tail < 5; tail += 1) {
        const tailAngle = angle - tail * .3;
        const targetRow = Math.round(cy + Math.sin(tailAngle) * orbitRadius);
        const targetCol = Math.round(cx + Math.cos(tailAngle) * orbitRadius);
        if (row === targetRow && col === targetCol) brightness = Math.max(brightness, 1 - tail * .2);
      }
      break;
    }
    case "hourglass": {
      const normalizedRow = rows > 1 ? row / (rows - 1) : .5;
      const distanceFromCenter = Math.abs(col - Math.floor(cols / 2));
      const width = Math.floor(cols / 2 * Math.abs(normalizedRow - .5) * 2) + 1;
      if (distanceFromCenter <= width) brightness = normalizedRow < .5 ? normalizedRow < t * .5 ? .2 : .8 : normalizedRow > 1 - t * .5 ? .8 : .2;
      break;
    }
    case "dna": {
      const strandAngle = angle + col / Math.max(1, cols - 1) * TAU;
      const strandA = Math.floor(wave(strandAngle) * (rows - 1));
      const strandB = Math.floor(wave(strandAngle + Math.PI) * (rows - 1));
      if (row === strandA) brightness = 1;
      if (row === strandB) brightness = Math.max(brightness, .8);
      if (col % 2 === 0 && row >= Math.min(strandA, strandB) && row <= Math.max(strandA, strandB)) brightness = Math.max(brightness, .4);
      break;
    }
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
    case "letter-t":
    case "letter-x":
    case "letter-o":
      brightness = letterMask(a.presetId, row, col, rows, cols) ? .7 + wave(centerDistance * .5 - angle) * .3 : .05;
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
