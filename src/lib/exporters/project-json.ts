import { ExportArtifact, Project } from "@/types/dot-motion";

export function exportProjectJson(project: Project): ExportArtifact {
  return {
    format: "project-json",
    filename: `${project.name.toLowerCase().replace(/\s+/g, "-")}.project.json`,
    mimeType: "application/json",
    content: JSON.stringify(project, null, 2)
  };
}
