import { CellShape, LoaderComponent } from "@/types/dot-motion";

export const shapeOptions: Array<{ value: Exclude<CellShape, "square" | "rounded-rect" | "circle" | "pill"> }> = [
  { value: "rectangle" },
  { value: "triangle" },
  { value: "star" },
  { value: "diamond" },
  { value: "heart" }
];

export function normalizeCellShape(value: unknown): CellShape {
  switch (value) {
    case "rectangle":
    case "triangle":
    case "star":
    case "diamond":
    case "heart":
      return value;
    case "square":
    case "rounded-rect":
    case "circle":
    case "pill":
    default:
      return "rectangle";
  }
}

function formatPoint(value: number) {
  return `${Number(value.toFixed(2))}%`;
}

function buildStarPolygon(innerRadius = 0.48) {
  const points: string[] = [];
  const center = 50;
  const outer = 47;
  const inner = Math.max(18, Math.min(38, innerRadius * 50));

  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outer : inner;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    points.push(`${formatPoint(x)} ${formatPoint(y)}`);
  }

  return `polygon(${points.join(", ")})`;
}

export function getCellClipPath(shape: CellShape, innerRadius?: number) {
  switch (normalizeCellShape(shape)) {
    case "triangle":
      return "polygon(50% 0%, 100% 100%, 0% 100%)";
    case "star":
      return buildStarPolygon(innerRadius);
    case "diamond":
      return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
    case "heart":
      return "polygon(50% 94%, 11% 58%, 4% 48%, 1% 35%, 5% 21%, 15% 10%, 29% 6%, 40% 10%, 50% 22%, 60% 10%, 71% 6%, 85% 10%, 95% 21%, 99% 35%, 96% 48%, 89% 58%)";
    case "rectangle":
    default:
      return undefined;
  }
}

export function getCellShapeClassName(loader: LoaderComponent) {
  return `cell-shape cell-shape--${normalizeCellShape(loader.style.cellShape)}`;
}

export function getCellShapeStyle(loader: LoaderComponent, renderedCellSize: number): Record<string, string | number | undefined> {
  const shape = normalizeCellShape(loader.style.cellShape);
  const clipPath = getCellClipPath(shape, loader.style.innerRadius);
  const radius = Math.min(
    renderedCellSize / 2,
    Math.max(loader.style.radius, loader.style.radius * (renderedCellSize / Math.max(loader.pattern.grid.cellSize, 1)))
  );

  return {
    borderRadius: shape === "rectangle" ? radius : 0,
    clipPath,
    ["--cell-clip-path"]: clipPath
  };
}
