import { CellShape, LoaderComponent } from "@/types/dot-motion";

export const shapeOptions = [
  { value: "rectangle" },
  { value: "square" },
  { value: "circle" },
  { value: "diamond" },
  { value: "hexagon" },
  { value: "star" }
] as const satisfies ReadonlyArray<{ value: CellShape }>;

export function normalizeCellShape(value: unknown): CellShape {
  switch (value) {
    case "rectangle":
    case "triangle":
    case "star":
    case "diamond":
    case "hexagon":
    case "heart":
    case "square":
    case "rounded-rect":
    case "circle":
    case "pill":
      return value;
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
    case "hexagon":
      return "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)";
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
  const radius = shape === "circle"
    ? renderedCellSize / 2
    : shape === "rectangle" || shape === "rounded-rect" || shape === "pill"
      ? renderedCellSize * 0.22
      : 0;

  return {
    borderRadius: radius,
    clipPath,
    ["--cell-clip-path"]: clipPath
  };
}
