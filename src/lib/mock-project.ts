import { getDefaultMotionConfig } from "@/lib/motion-presets";
import { LoaderComponent, Project } from "@/types/dot-motion";

export const PROJECT_VERSION = "0.17.0";

function buildLoader(overrides: Partial<LoaderComponent> = {}): LoaderComponent {
  return {
      id: overrides.id ?? crypto.randomUUID(),
      name: overrides.name ?? "Loader 1",
      kind: "custom",
      visible: true,
    artboard: {
      x: 180,
      y: 140,
      width: 420,
      height: 420
    },
    layout: {
      type: "status-pill",
      width: 220,
      height: 56,
      paddingX: 18,
      paddingY: 14,
      gap: 12,
      align: "left"
    },
    pattern: {
      grid: {
        rows: 6,
        cols: 6,
        cellSize: 16,
        gap: 6
      },
      activeCells: [],
      snapshots: [],
      sourceType: "drawn",
      presetId: "custom"
    },
    animation: {
      presetId: "wave",
      mode: "wave",
      direction: "right",
      originX: 3,
      originY: 3,
      fps: 18,
      loop: true,
      durationMs: 1200,
      staggerMs: 150,
      segment: 4,
      easing: "ease-in-out",
      style: "pulse-size",
      inactiveStyle: "breathe",
      ...getDefaultMotionConfig("wave")
    },
    style: {
      cellShape: "rectangle",
      radius: 8,
      innerRadius: 0.48,
      primaryColor: "#66BDFF",
      primaryAlpha: 1,
      secondaryColor: "#B9E3FF",
      backgroundColor: "#2D3743",
      backgroundAlpha: 1,
      glow: 16,
      glowColor: undefined,
      glowAlpha: 1,
      shadow: true,
      backgroundStyle: "glass",
      containerRadius: 42
    },
    text: {
      content: "Loader 1",
      enabled: false,
      fontSize: 14,
      fontWeight: 600,
      letterSpacing: 0.04,
      color: "rgba(255,255,255,0.92)"
    },
    effects: {
      shimmer: false
    },
    ...overrides
  };
}

function createInitialLoaders() {
  return [
    buildLoader({
      id: "loader-initial"
    })
  ];
}

export const defaultTemplates = [];

export function createMockProject(): Project {
  const now = new Date().toISOString();

  return {
    id: "project-dot-motion-v11",
    name: "Dot Motion Builder V1",
    version: PROJECT_VERSION,
    createdAt: now,
    updatedAt: now,
    canvas: {
      zoom: 1,
      panX: 0,
      panY: 0,
      background: "dark-grid",
      previewMode: "split"
    },
    loaders: createInitialLoaders(),
    assets: {
      patterns: [],
      templates: []
    },
    settings: {
      autosave: true,
      theme: "dark"
    }
  };
}
