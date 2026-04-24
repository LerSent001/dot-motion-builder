"use client";

import { CSSProperties } from "react";
import { LoaderComponent } from "@/types/dot-motion";

type TemplateLoaderProps = {
  loader: LoaderComponent;
  animated?: boolean;
  canvas?: boolean;
};

function buildLoaderVars(loader: LoaderComponent, size: number): CSSProperties {
  return {
    ["--loader-color" as string]: loader.style.primaryColor,
    ["--loader-secondary" as string]: loader.style.secondaryColor ?? loader.style.primaryColor,
    ["--loader-size" as string]: `${size}px`,
    ["--loader-speed" as string]: `${Math.max(loader.animation.durationMs / 1000, 0.6).toFixed(2)}s`,
    ["--loader-glow" as string]: `${loader.style.glow}px`,
    ["--loader-radius" as string]: `${loader.style.radius}px`
  };
}

function getTemplatePreviewSize(loader: LoaderComponent, canvas: boolean, fallback: number) {
  if (!canvas) {
    return fallback;
  }

  return Math.max(188, Math.min(loader.artboard.width, loader.artboard.height) - 96);
}

function TemplateShell({
  loader,
  className,
  size,
  canvas,
  children
}: {
  loader: LoaderComponent;
  className: string;
  size: number;
  canvas: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`template-loader ${canvas ? "template-loader--canvas" : ""} ${className}`}
      style={buildLoaderVars(loader, size)}
    >
      <div className="template-loader__icon">{children}</div>
      {!canvas && loader.text?.enabled ? <span className="template-loader__label">{loader.text.content}</span> : null}
    </div>
  );
}

function GridPulseLoader({ loader, animated = true, canvas = false }: TemplateLoaderProps) {
  const rows = loader.pattern.grid.rows || 4;
  const cols = loader.pattern.grid.cols || 4;
  const activeCells = loader.pattern.activeCells ?? [];
  const size = getTemplatePreviewSize(loader, canvas, 72);
  const cells = Array.from({ length: rows * cols }, (_, index) => activeCells.includes(index));

  return (
    <TemplateShell loader={loader} className={`template-loader--grid-pulse${animated ? "" : " is-static"}`} size={size} canvas={canvas}>
      <div
        className="grid-pulse-icon"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cells.map((active, index) => (
          <span
            key={index}
            className={`grid-pulse-icon__cell${active ? " is-active" : ""}`}
            style={{ ["--pulse-delay" as string]: `${((index % cols) + Math.floor(index / cols)) * 90}ms` }}
          />
        ))}
      </div>
    </TemplateShell>
  );
}

function DiagonalScanLoader({ loader, animated = true, canvas = false }: TemplateLoaderProps) {
  const { rows, cols } = loader.pattern.grid;
  const size = getTemplatePreviewSize(loader, canvas, 78);
  const centerDiag = (rows + cols - 2) / 2;
  const cells = Array.from({ length: rows * cols }, (_, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { index, diag: row + col };
  });

  return (
    <TemplateShell loader={loader} className={`template-loader--diagonal-scan${animated ? "" : " is-static"}`} size={size} canvas={canvas}>
      <div
        className="diagonal-scan-icon"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {cells.map((cell) => (
          <span
            key={cell.index}
            className={`diagonal-scan-icon__cell${Math.abs(cell.diag - centerDiag) <= 1 ? " is-static-accent" : ""}`}
            style={{
              ["--diag" as string]: cell.diag,
              ["--diag-distance" as string]: Math.abs(cell.diag - centerDiag).toFixed(2)
            }}
          />
        ))}
      </div>
    </TemplateShell>
  );
}

function GlitchBarsLoader({ loader, animated = true, canvas = false }: TemplateLoaderProps) {
  const size = getTemplatePreviewSize(loader, canvas, 76);

  return (
    <TemplateShell loader={loader} className={`template-loader--glitch-bars${animated ? "" : " is-static"}`} size={size} canvas={canvas}>
      <div className="glitch-bars-icon">
        <span className="glitch-bars-icon__bars" />
      </div>
    </TemplateShell>
  );
}

function TopologyPulseLoader({ loader, animated = true, canvas = false }: TemplateLoaderProps) {
  const size = getTemplatePreviewSize(loader, canvas, 78);

  return (
    <TemplateShell loader={loader} className={`template-loader--topology-pulse${animated ? "" : " is-static"}`} size={size} canvas={canvas}>
      <div className="topology-pulse-icon">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <line className="topology-pulse-icon__edge topology-pulse-icon__edge--ab" x1="18" y1="18" x2="54" y2="18" />
          <line className="topology-pulse-icon__edge topology-pulse-icon__edge--bc" x1="54" y1="18" x2="36" y2="52" />
          <line className="topology-pulse-icon__edge topology-pulse-icon__edge--ca" x1="36" y1="52" x2="18" y2="18" />
          <circle className="topology-pulse-icon__node topology-pulse-icon__node--a" cx="18" cy="18" r="4" />
          <circle className="topology-pulse-icon__node topology-pulse-icon__node--b" cx="54" cy="18" r="4" />
          <circle className="topology-pulse-icon__node topology-pulse-icon__node--c" cx="36" cy="52" r="4" />
        </svg>
      </div>
    </TemplateShell>
  );
}

export function TemplateLoaderPreview({ loader, animated = true, canvas = false }: TemplateLoaderProps) {
  switch (loader.pattern.templateId) {
    case "thinking-template":
      return <GridPulseLoader loader={loader} animated={animated} canvas={canvas} />;
    case "debugging-template":
      return <DiagonalScanLoader loader={loader} animated={animated} canvas={canvas} />;
    case "analysing-template":
      return <GlitchBarsLoader loader={loader} animated={animated} canvas={canvas} />;
    case "reading-docs-template":
      return <TopologyPulseLoader loader={loader} animated={animated} canvas={canvas} />;
    default:
      return null;
  }
}
