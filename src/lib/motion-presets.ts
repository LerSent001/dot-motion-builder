import { AnimationConfig, MotionPreset, MotionPresetId } from "@/types/dot-motion";

const preset = (
  id: MotionPresetId,
  description: string,
  capabilities: Pick<MotionPreset, "supportsDirection" | "supportsOrigin"> = {}
): MotionPreset => ({ id, name: id, description, ...capabilities });

// Keep the reference site's reusable grid-motion families. Brand words, fixed
// icons, games, and the intentionally removed Pulse, Ripple, and Blink presets
// do not belong in this general-purpose editor.
export const motionPresets: MotionPreset[] = [
  preset("spinner", "A fading head travels around the outside edge."),
  preset("wave", "A sine field travels horizontally, vertically, or diagonally.", { supportsDirection: true }),
  preset("sweep", "A clean scanning front with a softer trailing edge.", { supportsDirection: true }),
  preset("fish-eye", "A directional brightness wave shaped by a radial lens.", { supportsDirection: true }),
  preset("sine", "A bright sine curve travels through the grid."),
  preset("burst", "A single explosive ring expands and fades.", { supportsOrigin: true }),
  preset("bloom", "A square-distance front expands from a chosen origin.", { supportsOrigin: true }),
  preset("collapse", "A square-distance front closes toward a chosen origin.", { supportsOrigin: true }),
  preset("diamond-wave", "A Manhattan-distance diamond expands from the origin.", { supportsOrigin: true }),
  preset("snake", "A continuous row-by-row snake path through the grid."),
  preset("spiral", "A clockwise spiral path through the grid."),
  preset("typewriter", "Cells fill in reading order with a bright cursor."),
  preset("row-scan", "One complete row scans from top to bottom."),
  preset("column-scan", "One complete column scans from left to right."),
  preset("radar", "A rotating angular beam sweeps the grid."),
  preset("searching", "A horizontal scanner bounces with a faint noise bed."),
  preset("rain", "Offset drops fall down each column."),
  preset("matrix", "Columns fall at different deterministic speeds and lengths."),
  preset("glitch", "Short horizontal glitches interrupt a dim idle field."),
  preset("random", "Deterministic frame noise flickers across the grid."),
  preset("sparkle", "Small deterministic stars appear with soft neighbors."),
  preset("corners", "The four corners take turns emitting a soft field."),
  preset("box-trace", "A bright head traces the outside box."),
  preset("cross-wave", "The center cross breathes while the rest stays dim."),
  preset("heart-wave", "A heart silhouette beats at the center."),
  preset("checkerboard", "Parity groups alternate in a checker rhythm."),
  preset("thinking-dots", "Three phase-shifted dots bounce around the center row."),
  preset("neural-network", "A centered angular-distance field suggests network activity."),
  preset("connecting", "Signals travel from a center node toward all four corners."),
  preset("progress-bar", "A centered bar fills from left to right."),
  preset("success", "A check mark draws itself across the grid."),
  preset("error", "A shaking cross resolves into an error state."),
  preset("arrow-right", "A soft arrow front travels to the right."),
  preset("arrow-left", "A soft arrow front travels to the left."),
  preset("equalizer", "Columns rise and fall with phase offsets."),
  preset("orbit", "A fading particle tail follows a circular orbit."),
  preset("hourglass", "Brightness transfers from the top bulb to the bottom."),
  preset("dna", "Two stepped strands weave through each other."),
  preset("heartbeat", "A strong beat is followed by a softer echo."),
  preset("breathing", "All selected cells breathe together."),
  preset("pinwheel", "Angular lobes rotate around the center."),
  preset("letter-t", "A reusable animated T mask."),
  preset("letter-x", "A reusable animated X mask."),
  preset("letter-o", "A reusable animated O mask.")
];

const defaultOverrides: Partial<Record<MotionPresetId, Partial<AnimationConfig>>> = {
  "fish-eye": { direction: "down-right", style: "fisheye", scaleIntensity: 1 },
  sweep: { style: "depth-shift", scaleIntensity: .32 },
  burst: { style: "bloom-pop", scaleIntensity: .7 },
  bloom: { style: "bloom-pop", scaleIntensity: .7 },
  "thinking-dots": { style: "pulse-size", scaleIntensity: .45 },
  heartbeat: { style: "pulse-size", scaleIntensity: .35 },
  breathing: { style: "pulse-size", scaleIntensity: .28 },
  pinwheel: { style: "pulse-size", scaleIntensity: .3 }
};

export function getDefaultMotionConfig(presetId: AnimationConfig["presetId"]): Partial<AnimationConfig> {
  return {
    presetId,
    mode: "wave",
    direction: "right",
    style: "opacity-only",
    inactiveStyle: "none",
    durationMs: 1000,
    staggerMs: 0,
    scaleIntensity: 0,
    ...defaultOverrides[presetId]
  };
}
