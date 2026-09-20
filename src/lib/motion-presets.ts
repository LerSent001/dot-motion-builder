import { AnimationConfig, MotionPreset, MotionPresetId } from "@/types/dot-motion";

const preset = (
  id: MotionPresetId,
  description: string,
  capabilities: Pick<MotionPreset, "supportsDirection" | "supportsOrigin"> = {}
): MotionPreset => ({ id, name: id, description, ...capabilities });

// Every preset below animates each selected cell independently of the mask.
// Fixed paths, icons, letters, state drawings, and fill-dependent effects are
// intentionally excluded because they break when users draw a sparse grid.
export const motionPresets: MotionPreset[] = [
  preset("wave", "A sine field travels horizontally, vertically, or diagonally.", { supportsDirection: true }),
  preset("sweep", "A clean scanning front with a softer trailing edge.", { supportsDirection: true }),
  preset("fish-eye", "A directional brightness wave shaped by a radial lens.", { supportsDirection: true }),
  preset("burst", "A single explosive ring expands and fades.", { supportsOrigin: true }),
  preset("bloom", "A square-distance front expands from a chosen origin.", { supportsOrigin: true }),
  preset("diamond-wave", "A Manhattan-distance diamond expands from the origin.", { supportsOrigin: true }),
  preset("radar", "A rotating angular beam sweeps the grid."),
  preset("random", "Deterministic frame noise flickers across the grid."),
  preset("checkerboard", "Parity groups alternate in a checker rhythm."),
  preset("heartbeat", "A strong beat is followed by a softer echo."),
  preset("breathing", "All selected cells breathe together."),
  preset("pinwheel", "Angular lobes rotate around the center.")
];

const defaultOverrides: Partial<Record<MotionPresetId, Partial<AnimationConfig>>> = {
  "fish-eye": { direction: "down-right", style: "fisheye", scaleIntensity: 1 },
  sweep: { style: "depth-shift", scaleIntensity: .32 },
  burst: { style: "bloom-pop", scaleIntensity: .7 },
  bloom: { style: "bloom-pop", scaleIntensity: .7 },
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
