"use client";

import { useMemo, useState } from "react";
import { getCanvasGridMetrics } from "@/lib/canvas-grid-metrics";
import { normalizeCellShape } from "@/lib/cell-shapes";
import { compileTimeline } from "@/lib/core/timeline";
import { hexToRgb } from "@/lib/colors";
import { generateExportArtifact } from "@/lib/exporters";
import { sanitizeName } from "@/lib/exporters/utils";
import { Language, uiCopy } from "@/lib/ui-copy";
import { useEditorStore, useSelectedLoader } from "@/stores/use-editor-store";
import { CellTrack, ExportFormat, LoaderComponent } from "@/types/dot-motion";

const formats: { value: ExportFormat; label: string }[] = [
  { value: "lottie", label: "Lottie JSON" },
  { value: "svga", label: "SVGA Beta" },
  { value: "png-sequence", label: "PNG Sequence" },
  { value: "svg", label: "SVG" },
  { value: "css", label: "HTML + CSS" }
];

type ExportPanelProps = {
  language: Language;
  onClose: () => void;
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function buildZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const localHeader = new Uint8Array(30 + name.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, entry.data.byteLength);
    writeUint32(localHeader, 22, entry.data.byteLength);
    writeUint16(localHeader, 26, name.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(name, 30);
    fileParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + name.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, entry.data.byteLength);
    writeUint32(centralHeader, 24, entry.data.byteLength);
    writeUint16(centralHeader, 28, name.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);

    offset += localHeader.byteLength + entry.data.byteLength;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const endHeader = new Uint8Array(22);
  writeUint32(endHeader, 0, 0x06054b50);
  writeUint16(endHeader, 4, 0);
  writeUint16(endHeader, 6, 0);
  writeUint16(endHeader, 8, entries.length);
  writeUint16(endHeader, 10, entries.length);
  writeUint32(endHeader, 12, centralSize);
  writeUint32(endHeader, 16, centralOffset);
  writeUint16(endHeader, 20, 0);

  const blobParts: ArrayBuffer[] = [...fileParts, ...centralParts, endHeader].map((part) => {
    const copy = new Uint8Array(part.byteLength);
    copy.set(part);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "application/zip" });
}

function blobToUint8Array(blob: Blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Unable to render PNG frame."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ language, onClose }: ExportPanelProps) {
  const project = useEditorStore((state) => state.project);
  const format = useEditorStore((state) => state.exportFormat);
  const setFormat = useEditorStore((state) => state.setExportFormat);
  const loader = useSelectedLoader();
  const [copied, setCopied] = useState(false);
  const t = uiCopy[language];
  const effectiveFormat = formats.some((item) => item.value === format) ? format : "lottie";
  const artifact = useMemo(
    () => generateExportArtifact(effectiveFormat, project, loader),
    [effectiveFormat, project, loader]
  );

  function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCellPath(ctx: CanvasRenderingContext2D, frame: LoaderComponent, x: number, y: number, size: number) {
    const shape = normalizeCellShape(frame.style.cellShape);
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    ctx.beginPath();

    if (shape === "triangle") {
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      return;
    }

    if (shape === "diamond") {
      ctx.moveTo(centerX, y);
      ctx.lineTo(x + size, centerY);
      ctx.lineTo(centerX, y + size);
      ctx.lineTo(x, centerY);
      ctx.closePath();
      return;
    }

    if (shape === "star") {
      const outer = size / 2;
      const inner = Math.max(size * 0.18, Math.min(size * 0.38, (frame.style.innerRadius ?? 0.48) * size / 2));
      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (index * Math.PI) / 5;
        const radius = index % 2 === 0 ? outer : inner;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (index === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      return;
    }

    if (shape === "heart") {
      const s = size / 32;
      ctx.moveTo(centerX, y + 27 * s);
      ctx.bezierCurveTo(x + 2 * s, y + 15 * s, x + 4 * s, y + 4 * s, centerX, y + 8 * s);
      ctx.bezierCurveTo(x + 28 * s, y + 4 * s, x + 30 * s, y + 15 * s, centerX, y + 27 * s);
      ctx.closePath();
      return;
    }

    const scaledRadius = Math.min(
      size / 2,
      Math.max(frame.style.radius, frame.style.radius * (size / Math.max(frame.pattern.grid.cellSize, 1)))
    );
    drawRoundedRect(ctx, x, y, size, size, scaledRadius);
  }

  function rgba(color: string, alpha: number) {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(1, Math.max(0, alpha))})`;
  }

  function sampleTrack(track: CellTrack, timeMs: number, durationMs: number) {
    const normalizedTime = durationMs > 0 ? timeMs % durationMs : timeMs;
    for (let index = 0; index < track.keyframes.length - 1; index += 1) {
      const current = track.keyframes[index];
      const next = track.keyframes[index + 1];
      if (normalizedTime < current.timeMs || normalizedTime > next.timeMs) {
        continue;
      }

      const span = Math.max(1, next.timeMs - current.timeMs);
      const progress = (normalizedTime - current.timeMs) / span;
      return {
        opacity: current.opacity + (next.opacity - current.opacity) * progress,
        scale: current.scale + (next.scale - current.scale) * progress
      };
    }

    const last = track.keyframes[track.keyframes.length - 1];
    return { opacity: last?.opacity ?? 1, scale: last?.scale ?? 1 };
  }

  function drawCell(
    ctx: CanvasRenderingContext2D,
    frame: LoaderComponent,
    x: number,
    y: number,
    size: number,
    color: string,
    alpha: number,
    withGlow: boolean
  ) {
    ctx.save();
    if (withGlow && frame.style.shadow && frame.style.glow > 0) {
      ctx.shadowBlur = frame.style.glow;
      ctx.shadowColor = rgba(frame.style.glowColor ?? frame.style.primaryColor, frame.style.glowAlpha ?? frame.style.primaryAlpha ?? 1);
    }
    drawCellPath(ctx, frame, x, y, size);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
    ctx.restore();
  }

  async function renderPngFrame(frame: LoaderComponent, timeMs = 0, staticOnly = false) {
    const timeline = compileTimeline(frame);
    const metrics = getCanvasGridMetrics(frame);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = metrics.panelWidth * scale;
    canvas.height = metrics.panelHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoundedRect(ctx, 0, 0, metrics.panelWidth, metrics.panelHeight, 30);
    ctx.fillStyle = "#06080a";
    ctx.fill();

    const activeCells = new Set(frame.pattern.activeCells);
    const getCellPosition = (cellIndex: number) => {
      const row = Math.floor(cellIndex / metrics.cols);
      const col = cellIndex % metrics.cols;
      return {
        x: metrics.padding + col * (metrics.cellSize + metrics.gap),
        y: metrics.padding + row * (metrics.cellSize + metrics.gap)
      };
    };

    for (let cellIndex = 0; cellIndex < metrics.rows * metrics.cols; cellIndex += 1) {
      const { x, y } = getCellPosition(cellIndex);
      drawCell(
        ctx,
        frame,
        x,
        y,
        metrics.cellSize,
        frame.style.backgroundColor ?? "#2D3743",
        frame.style.backgroundAlpha ?? 1,
        false
      );
    }

    if (staticOnly) {
      activeCells.forEach((cellIndex) => {
        const { x, y } = getCellPosition(cellIndex);
        drawCell(
          ctx,
          frame,
          x,
          y,
          metrics.cellSize,
          frame.style.primaryColor,
          frame.style.primaryAlpha ?? 1,
          true
        );
      });
    } else {
      timeline.tracks.forEach((track) => {
        const sample = sampleTrack(track, timeMs, timeline.durationMs);
        const renderedSize = metrics.cellSize * sample.scale;
        const offset = (metrics.cellSize - renderedSize) / 2;
        const { x, y } = getCellPosition(track.cellIndex);
        drawCell(
          ctx,
          frame,
          x + offset,
          y + offset,
          renderedSize,
          frame.style.primaryColor,
          sample.opacity * (frame.style.primaryAlpha ?? 1),
          true
        );
      });
    }

    return canvasToBlob(canvas);
  }

  async function handlePngSequenceDownload() {
    const frames = loader.sequenceId
      ? project.loaders
        .filter((item) => item.sequenceId === loader.sequenceId)
        .sort((left, right) => (left.sequenceIndex ?? 0) - (right.sequenceIndex ?? 0))
      : [loader];
    const baseName = sanitizeName(loader.name);
    const entries: ZipEntry[] = [];

    if (loader.sequenceId && frames.length > 1) {
      for (const [index, frame] of frames.entries()) {
        const blob = await renderPngFrame(frame, 0, true);
        if (blob) {
          entries.push({
            name: `${baseName}-${String(index + 1).padStart(2, "0")}.png`,
            data: await blobToUint8Array(blob)
          });
        }
      }
      downloadBlob(buildZip(entries), `${baseName}-png-sequence.zip`);
      return;
    }

    const timeline = compileTimeline(loader);
    const totalFrames = Math.min(timeline.totalFrames, 120);
    const step = Math.max(1, timeline.totalFrames / totalFrames);
    for (let index = 0; index < totalFrames; index += 1) {
      const timelineFrame = Math.floor(index * step);
      const blob = await renderPngFrame(loader, (timelineFrame / timeline.fps) * 1000, false);
      if (blob) {
        entries.push({
          name: `${baseName}-${String(index + 1).padStart(3, "0")}.png`,
          data: await blobToUint8Array(blob)
        });
      }
    }
    downloadBlob(buildZip(entries), `${baseName}-png-sequence.zip`);
  }

  async function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(artifact.content);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function handleDownload() {
    if (effectiveFormat === "png-sequence") {
      await handlePngSequenceDownload();
      return;
    }

    downloadBlob(new Blob([artifact.content], { type: artifact.mimeType }), artifact.filename);
  }

  return (
    <section className="panel panel--export">
      <div className="panel__header">
        <div>
          <h2>{t.exportFile}</h2>
        </div>
        <button type="button" className="export-close-button" onClick={onClose} aria-label={t.closeExport}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5.4 4.3 4.6 4.6 4.6-4.6 1.1 1.1-4.6 4.6 4.6 4.6-1.1 1.1-4.6-4.6-4.6 4.6-1.1-1.1 4.6-4.6-4.6-4.6 1.1-1.1Z" />
          </svg>
        </button>
      </div>
      <div className="segmented-control">
        {formats.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`segmented-control__item${effectiveFormat === item.value ? " is-active" : ""}`}
            onClick={() => setFormat(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="export-meta">
        <span>{artifact.filename}</span>
        <span>{artifact.mimeType}</span>
      </div>
      <pre className="export-code">{artifact.content}</pre>
      {artifact.notes?.length ? (
        <div className="export-notes">
          {artifact.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
      <div className="panel__actions">
        <button type="button" className="button button--secondary" onClick={handleCopy}>
          {copied ? t.copied : t.copyOutput}
        </button>
        <button type="button" className="button" onClick={handleDownload}>
          {t.downloadFile}
        </button>
      </div>
    </section>
  );
}
