import { buildMotionData } from "./motion-data";
import { exportWeb } from "./web";
import { exportSwift } from "./swift";
import { ExportArtifact, ExportFormat, LoaderComponent, Project } from "@/types/dot-motion";

export function generateExportArtifact(format: ExportFormat, project: Project, loader: LoaderComponent): ExportArtifact {
  const data = buildMotionData(project, loader);
  return format === "swift" ? exportSwift(data, loader.name) : exportWeb(data, loader.name);
}
