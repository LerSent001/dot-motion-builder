import { sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent, Project } from "@/types/dot-motion";

export function exportPngSequenceManifest(project: Project, loader: LoaderComponent): ExportArtifact {
  const frames = loader.sequenceId
    ? project.loaders
      .filter((item) => item.sequenceId === loader.sequenceId)
      .sort((left, right) => (left.sequenceIndex ?? 0) - (right.sequenceIndex ?? 0))
    : [loader];

  return {
    format: "png-sequence",
    filename: `${sanitizeName(loader.name)}-png-sequence.json`,
    mimeType: "application/json",
    content: JSON.stringify(
      {
        version: "dot-motion-png-sequence-1",
        name: loader.name,
        frameCount: frames.length,
        fps: loader.animation.fps,
        frames: frames.map((frame, index) => ({
          index: index + 1,
          name: frame.name,
          grid: frame.pattern.grid,
          activeCells: frame.pattern.activeCells,
          style: frame.style
        }))
      },
      null,
      2
    ),
    notes: [
      "PNG sequence downloads are rendered in the browser from the selected loader state.",
      "Glow, background cells, shape, alpha, gap and grid size are included in the rendered PNG frames."
    ]
  };
}
