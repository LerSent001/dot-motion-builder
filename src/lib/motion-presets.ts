import { AnimationConfig, MotionPreset } from "@/types/dot-motion";

export const motionPresets: MotionPreset[] = [
  ...["radar", "orbit", "heartbeat", "equalizer", "dna", "sparkle", "breathing", "sine", "collapse"].map(id => ({id: id as AnimationConfig["presetId"], name: id, description: id, supportsOrigin: id === "collapse"})),
  {
    id: "wave",
    name: "Wave",
    description: "A staggered wave that can travel left, right, up, down, or diagonally.",
    supportsDirection: true
  },
  {
    id: "sweep",
    name: "Sweep",
    description: "A cleaner scanning sweep with visible front and softer tail.",
    supportsDirection: true
  },
  {
    id: "bloom",
    name: "Bloom",
    description: "A center-out bloom that expands from a chosen origin point.",
    supportsOrigin: true
  },
  {
    id: "fish-eye",
    name: "Fish-eye Lens",
    description: "A diagonal brightness wave shaped by the reference's radial fish-eye lens.",
    supportsDirection: true
  },
  {
    id: "spiral",
    name: "Spiral",
    description: "Clockwise spiral path generalized from the 3-pixel-grid spiral-cw preset."
  },
  {
    id: "corners",
    name: "Corners First",
    description: "Corners fire first, then edges, then the center."
  },
  {
    id: "snake",
    name: "Snake",
    description: "A continuous row-by-row snake path through the grid."
  },
  {
    id: "checkerboard",
    name: "Checkerboard",
    description: "Alternating parity groups pulse in a checker rhythm."
  },
  {
    id: "rain",
    name: "Rain",
    description: "Deterministic scattered drops create a random-rain loading feel."
  },
  {
    id: "pinwheel",
    name: "Pinwheel",
    description: "Angular quadrants spin around the center like a pinwheel."
  }
];

export function getDefaultMotionConfig(presetId: AnimationConfig["presetId"]): Partial<AnimationConfig> {
  switch (presetId) {
    case "wave":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "breathe",
        durationMs: 1200,
        staggerMs: 150,
        scaleIntensity: 0.26
      };
    case "sweep":
      return {
        presetId,
        mode: "directional",
        direction: "right",
        style: "depth-shift",
        inactiveStyle: "static-dim",
        durationMs: 1320,
        staggerMs: 72,
        scaleIntensity: 0.16
      };
    case "bloom":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "bloom-pop",
        inactiveStyle: "ghost",
        durationMs: 1480,
        staggerMs: 70,
        scaleIntensity: 0.28
      };
    case "fish-eye":
      return {
        presetId,
        mode: "wave",
        direction: "down-right",
        style: "fisheye",
        inactiveStyle: "none",
        durationMs: 1200,
        staggerMs: 120,
        scaleIntensity: 1
      };
    case "spiral":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "breathe",
        durationMs: 1360,
        staggerMs: 80,
        scaleIntensity: 0.22
      };
    case "corners":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "static-dim",
        durationMs: 1240,
        staggerMs: 100,
        scaleIntensity: 0.18
      };
    case "snake":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "ghost",
        durationMs: 1420,
        staggerMs: 76,
        scaleIntensity: 0.2
      };
    case "checkerboard":
      return {
        presetId,
        mode: "blink",
        direction: "right",
        style: "opacity-only",
        inactiveStyle: "static-dim",
        durationMs: 1180,
        staggerMs: 240,
        scaleIntensity: 0.1
      };
    case "rain":
      return {
        presetId,
        mode: "wave",
        direction: "down",
        style: "depth-shift",
        inactiveStyle: "ghost",
        durationMs: 1380,
        staggerMs: 72,
        scaleIntensity: 0.18
      };
    case "pinwheel":
      return {
        presetId,
        mode: "wave",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "ghost",
        durationMs: 1220,
        staggerMs: 82,
        scaleIntensity: 0.2
      };
    default:
      return {
        presetId,
        mode: "pulse",
        direction: "right",
        style: "pulse-size",
        inactiveStyle: "breathe",
        durationMs: 1520,
        staggerMs: 0,
        scaleIntensity: 0.18
      };
  }
}
