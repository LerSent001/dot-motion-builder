import { exportCss } from "@/lib/exporters/css";
import { exportLottie } from "@/lib/exporters/lottie";
import { exportPngSequenceManifest } from "@/lib/exporters/png-sequence";
import { exportProjectJson } from "@/lib/exporters/project-json";
import { exportReact } from "@/lib/exporters/react";
import { exportSvg } from "@/lib/exporters/svg";
import { exportSvga } from "@/lib/exporters/svga";
import { ExportArtifact, ExportFormat, LoaderComponent, Project } from "@/types/dot-motion";

export function generateExportArtifact(
  format: ExportFormat,
  project: Project,
  loader: LoaderComponent
): ExportArtifact {
  if (format === "png-sequence") {
    return exportPngSequenceManifest(project, loader);
  }

  if (loader.sequenceId) {
    const frames = project.loaders
      .filter((item) => item.sequenceId === loader.sequenceId)
      .sort((left, right) => (left.sequenceIndex ?? 0) - (right.sequenceIndex ?? 0));

    if (frames.length > 1) {
      const frameArtifacts = frames.map((frame, index) => ({
        index: index + 1,
        name: frame.name,
        artifact: generateSingleExportArtifact(format, project, frame)
      }));

      return {
        format,
        filename: `${loader.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || "loader"}-sequence.${format}.json`,
        mimeType: "application/json",
        content: JSON.stringify(
          {
            version: "dot-motion-sequence-1",
            format,
            name: loader.name,
            frameCount: frames.length,
            fps: loader.animation.fps,
            frames: frameArtifacts
          },
          null,
          2
        ),
        notes: [
          "Sequence export bundles each frame in order.",
          "Use frameCount and frames[index].artifact.content to hand off to a runtime packer."
        ]
      };
    }
  }

  return generateSingleExportArtifact(format, project, loader);
}

function generateSingleExportArtifact(
  format: ExportFormat,
  project: Project,
  loader: LoaderComponent
): ExportArtifact {
  switch (format) {
    case "project-json":
      return exportProjectJson(project);
    case "svg":
      return exportSvg(loader);
    case "css":
      return exportCss(loader);
    case "react":
      return exportReact(loader);
    case "lottie":
      return exportLottie(loader);
    case "svga":
      return exportSvga(loader);
    case "png-sequence":
      return exportPngSequenceManifest(project, loader);
    default:
      return exportProjectJson(project);
  }
}
