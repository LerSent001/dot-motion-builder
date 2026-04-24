import { Project } from "@/types/dot-motion";

export const STORAGE_KEY = "dot-motion-builder.project.v9";

export function saveProject(project: Project) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadProject() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}
