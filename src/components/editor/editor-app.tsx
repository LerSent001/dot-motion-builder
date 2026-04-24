"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { ColorControl } from "@/components/editor/color-control";
import { DotGridEditor } from "@/components/editor/dot-grid-editor";
import { ExportPanel } from "@/components/editor/export-panel";
import { PreviewStage, SequencePreviewStage } from "@/components/editor/preview-stage";
import { normalizeCellShape, shapeOptions } from "@/lib/cell-shapes";
import { motionPresets } from "@/lib/motion-presets";
import { inactiveStyleCopy, Language, motionPresetCopy, uiCopy } from "@/lib/ui-copy";
import { useEditorStore } from "@/stores/use-editor-store";
import {
  CellShape,
  Direction,
  InactiveStyle,
  LoaderComponent
} from "@/types/dot-motion";
const inactiveStyles: Array<{ value: InactiveStyle }> = [
  { value: "none" },
  { value: "static-dim" },
  { value: "breathe" },
  { value: "ghost" }
];
const directionOptions: Array<{ value: Direction; label: string; icon: string }> = [
  { value: "up-left", label: "Bottom Right to Top Left", icon: "↖" },
  { value: "up", label: "Bottom to Top", icon: "↑" },
  { value: "up-right", label: "Bottom Left to Top Right", icon: "↗" },
  { value: "left", label: "Right to Left", icon: "←" },
  { value: "right", label: "Left to Right", icon: "→" },
  { value: "down-left", label: "Top Right to Bottom Left", icon: "↙" },
  { value: "down", label: "Top to Bottom", icon: "↓" },
  { value: "down-right", label: "Top Left to Bottom Right", icon: "↘" }
];
const directionControlCells = [
  directionOptions[0],
  directionOptions[1],
  directionOptions[2],
  directionOptions[3],
  null,
  directionOptions[4],
  directionOptions[5],
  directionOptions[6],
  directionOptions[7]
];

function getRangeStyle(value: number, min: number, max: number) {
  const progress = max <= min ? 0 : ((value - min) / (max - min)) * 100;
  return { ["--range-progress" as string]: `${Math.min(100, Math.max(0, progress))}%` };
}

type CanvasArtboardProps = {
  loader: LoaderComponent;
  selected: boolean;
  dimmed: boolean;
  previewMode: "none" | "selected" | "all";
  editable: boolean;
  onSelect: () => void;
  onToggleCell: (cellIndex: number) => void;
  onSetCellActive: (cellIndex: number, active: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  sequenceSelected: boolean;
  hideChrome?: boolean;
};

function CanvasArtboard({
  loader,
  selected,
  dimmed,
  previewMode,
  editable,
  onSelect,
  onToggleCell,
  onSetCellActive,
  onDuplicate,
  onDelete,
  canDelete,
  sequenceSelected,
  hideChrome = false
}: CanvasArtboardProps) {
  const previewingThis = previewMode === "all" || (previewMode === "selected" && selected);

  return (
    <div
      role="button"
      tabIndex={0}
      data-artboard-interactive="true"
      data-artboard-id={loader.id}
      className={`canvas-artboard${selected ? " is-selected" : ""}${sequenceSelected ? " is-sequence-selected" : ""}${dimmed ? " is-dimmed" : ""}`}
      style={{
        left: loader.artboard.x,
        top: loader.artboard.y,
        width: loader.artboard.width,
        height: loader.artboard.height,
        zIndex: selected ? 4 : 1
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {selected && !hideChrome ? (
        <div className="canvas-artboard__actions" aria-label="Artboard actions">
          <button
            type="button"
            data-artboard-action="true"
            className="canvas-artboard__action"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
            aria-label="Duplicate artboard"
            title="Duplicate"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7 4.5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4.5Z" />
              <path d="M3.5 8a2 2 0 0 1 2-2H7v4a2 2 0 0 0 2 2h4v1.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8Z" />
            </svg>
          </button>
          <button
            type="button"
            data-artboard-action="true"
            className="canvas-artboard__action canvas-artboard__action--danger"
            disabled={!canDelete}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label="Delete artboard"
            title="Delete"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7.2 3.5h5.6l.6 1.5H17v1.6H3V5h3.6l.6-1.5Z" />
              <path d="M5.1 8h9.8l-.6 7a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8L5.1 8Z" />
            </svg>
          </button>
        </div>
      ) : null}
      <div className="canvas-artboard__frame">
        {(selected || sequenceSelected) && editable && !previewingThis ? (
          <DotGridEditor
            loader={loader}
            onToggleCell={onToggleCell}
            onSetCellActive={onSetCellActive}
            variant="canvas"
            frameLabel={hideChrome ? undefined : loader.name}
          />
        ) : (
          <PreviewStage
            loader={loader}
            showHint={false}
            isAnimated={previewingThis}
            variant="canvas"
            staticOnly={Boolean(loader.sequenceId)}
          />
        )}
      </div>
    </div>
  );
}

type SequenceGroupChromeProps = {
  bounds: { left: number; top: number; width: number; height: number };
  name: string;
  frameCount: number;
  canDelete: boolean;
  onAddFrame: () => void;
  onRemoveFrame: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  copy: typeof uiCopy[Language];
};

function SequenceGroupChrome({
  bounds,
  name,
  frameCount,
  canDelete,
  onAddFrame,
  onRemoveFrame,
  onDuplicate,
  onDelete,
  copy
}: SequenceGroupChromeProps) {
  return (
    <div
      className="sequence-group-chrome"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height
      }}
    >
      <div className="canvas-artboard__actions sequence-group-chrome__actions" aria-label="Sequence actions">
        <button
          type="button"
          data-artboard-action="true"
          className="canvas-artboard__action canvas-artboard__action--text"
          disabled={frameCount >= 10}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onAddFrame();
          }}
          aria-label={copy.addFrame}
          title={copy.addFrame}
        >
          <span>{copy.addFrame}</span>
        </button>
        {frameCount > 1 ? (
          <button
            type="button"
            data-artboard-action="true"
            className="canvas-artboard__action canvas-artboard__action--text"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveFrame();
            }}
            aria-label={copy.removeFrame}
            title={copy.removeFrame}
          >
            <span>{copy.removeFrame}</span>
          </button>
        ) : null}
        <button
          type="button"
          data-artboard-action="true"
          className="canvas-artboard__action"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
          aria-label="Duplicate sequence"
          title="Duplicate"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7 4.5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4.5Z" />
            <path d="M3.5 8a2 2 0 0 1 2-2H7v4a2 2 0 0 0 2 2h4v1.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8Z" />
          </svg>
        </button>
        <button
          type="button"
          data-artboard-action="true"
          className="canvas-artboard__action canvas-artboard__action--danger"
          disabled={!canDelete}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label="Delete sequence"
          title="Delete"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.2 3.5h5.6l.6 1.5H17v1.6H3V5h3.6l.6-1.5Z" />
            <path d="M5.1 8h9.8l-.6 7a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8L5.1 8Z" />
          </svg>
        </button>
      </div>
      <div className="dot-grid-editor-shell__badge sequence-group-chrome__badge">{name}</div>
    </div>
  );
}

export function EditorApp() {
  const hydrated = useEditorStore((state) => state.hydrated);
  const project = useEditorStore((state) => state.project);
  const selectedLoaderId = useEditorStore((state) => state.selectedLoaderId);
  const canvas = useEditorStore((state) => state.project.canvas);
  const hydrate = useEditorStore((state) => state.hydrate);
  const selectLoader = useEditorStore((state) => state.selectLoader);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const toggleCell = useEditorStore((state) => state.toggleCell);
  const setCellActive = useEditorStore((state) => state.setCellActive);
  const toggleCellForLoader = useEditorStore((state) => state.toggleCellForLoader);
  const setCellActiveForLoader = useEditorStore((state) => state.setCellActiveForLoader);
  const addLoader = useEditorStore((state) => state.addLoader);
  const addSequenceFrame = useEditorStore((state) => state.addSequenceFrame);
  const removeSequenceFrame = useEditorStore((state) => state.removeSequenceFrame);
  const copySelectedLoader = useEditorStore((state) => state.copySelectedLoader);
  const pasteLoader = useEditorStore((state) => state.pasteLoader);
  const duplicateSelectedLoader = useEditorStore((state) => state.duplicateSelectedLoader);
  const deleteSelectedLoader = useEditorStore((state) => state.deleteSelectedLoader);
  const moveLoader = useEditorStore((state) => state.moveLoader);
  const moveLoaders = useEditorStore((state) => state.moveLoaders);
  const renameLoader = useEditorStore((state) => state.renameLoader);
  const setMotionPreset = useEditorStore((state) => state.setMotionPreset);
  const setMotionOrigin = useEditorStore((state) => state.setMotionOrigin);
  const setDirection = useEditorStore((state) => state.setDirection);
  const setFps = useEditorStore((state) => state.setFps);
  const setInactiveStyle = useEditorStore((state) => state.setInactiveStyle);
  const setPrimaryColor = useEditorStore((state) => state.setPrimaryColor);
  const setPrimaryAlpha = useEditorStore((state) => state.setPrimaryAlpha);
  const setGlowEnabled = useEditorStore((state) => state.setGlowEnabled);
  const setGlowColor = useEditorStore((state) => state.setGlowColor);
  const setGlowAlpha = useEditorStore((state) => state.setGlowAlpha);
  const setGlowSize = useEditorStore((state) => state.setGlowSize);
  const setBackgroundColor = useEditorStore((state) => state.setBackgroundColor);
  const setBackgroundAlpha = useEditorStore((state) => state.setBackgroundAlpha);
  const setCellShape = useEditorStore((state) => state.setCellShape);
  const setShapeInnerRadius = useEditorStore((state) => state.setShapeInnerRadius);
  const setGridSize = useEditorStore((state) => state.setGridSize);
  const setGridGap = useEditorStore((state) => state.setGridGap);
  const setRadius = useEditorStore((state) => state.setRadius);
  const setCanvasView = useEditorStore((state) => state.setCanvasView);
  const selectedLoader = project.loaders.find((loader) => loader.id === selectedLoaderId) ?? null;
  const editingLoader = selectedLoader ?? project.loaders[0];
  const hasSelection = Boolean(selectedLoader);
  const maxRadius = editingLoader.pattern.grid.cellSize / 2;
  const selectedShape = normalizeCellShape(editingLoader.style.cellShape);
  const selectedSequenceId = selectedLoader?.sequenceId;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [previewScope, setPreviewScope] = useState<"none" | "selected" | "all">("none");
  const [language, setLanguage] = useState<Language>("cn");
  const [showZoomHud, setShowZoomHud] = useState(false);
  const zoomHudTimeoutRef = useRef<number | null>(null);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    moved: boolean;
  } | null>(null);
  const dragArtboardRef = useRef<{
    pointerId: number;
    loaderId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    loaderOrigins: Array<{ id: string; x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelectedLoader();
        return;
      }
      if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteLoader();
        return;
      }
      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedLoader();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelectedLoader();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelectedLoader, deleteSelectedLoader, duplicateSelectedLoader, pasteLoader]);

  const t = uiCopy[language];
  const canvasBounds = useMemo(() => {
    const right = Math.max(...project.loaders.map((item) => item.artboard.x + item.artboard.width), 1800);
    const bottom = Math.max(...project.loaders.map((item) => item.artboard.y + item.artboard.height), 1200);

    return {
      width: right + 420,
      height: bottom + 360
    };
  }, [project.loaders]);

  const sequenceGroups = useMemo(() => {
    const groups = new Map<string, LoaderComponent[]>();
    project.loaders.forEach((loader) => {
      if (!loader.sequenceId) {
        return;
      }
      const frames = groups.get(loader.sequenceId) ?? [];
      frames.push(loader);
      groups.set(loader.sequenceId, frames);
    });
    groups.forEach((frames) => {
      frames.sort((left, right) => (left.sequenceIndex ?? 0) - (right.sequenceIndex ?? 0));
    });
    return groups;
  }, [project.loaders]);
  const sequenceFrameCount = selectedSequenceId ? sequenceGroups.get(selectedSequenceId)?.length ?? 0 : 0;
  const previewingSequenceIds = useMemo(() => {
    if (previewScope === "all") {
      return new Set(sequenceGroups.keys());
    }
    if (previewScope === "selected" && selectedSequenceId) {
      return new Set([selectedSequenceId]);
    }
    return new Set<string>();
  }, [previewScope, selectedSequenceId, sequenceGroups]);
  const selectedSequenceBounds = useMemo(() => {
    if (!selectedSequenceId) {
      return null;
    }

    const frames = sequenceGroups.get(selectedSequenceId) ?? [];
    if (!frames.length) {
      return null;
    }

    const boundsFrames = previewingSequenceIds.has(selectedSequenceId) ? [frames[0]] : frames;
    const padding = 8;
    const left = Math.min(...boundsFrames.map((loader) => loader.artboard.x)) - padding;
    const top = Math.min(...boundsFrames.map((loader) => loader.artboard.y)) - padding;
    const right = Math.max(...boundsFrames.map((loader) => loader.artboard.x + loader.artboard.width)) + padding;
    const bottom = Math.max(...boundsFrames.map((loader) => loader.artboard.y + loader.artboard.height)) + padding;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top
    };
  }, [previewingSequenceIds, selectedSequenceId, sequenceGroups]);
  const visibleLoaders = useMemo(
    () => project.loaders.filter((loader) => !loader.sequenceId || !previewingSequenceIds.has(loader.sequenceId)),
    [previewingSequenceIds, project.loaders]
  );
  const sequencePreviewGroups = useMemo(
    () => [...previewingSequenceIds].map((sequenceId) => sequenceGroups.get(sequenceId) ?? []).filter((frames) => frames.length > 0),
    [previewingSequenceIds, sequenceGroups]
  );

  const activeMotionPreset = motionPresets.find((preset) => preset.id === editingLoader.animation.presetId) ?? motionPresets[0];
  const activeMotionCopy = motionPresetCopy[language][activeMotionPreset.id];
  function openExport() {
    setIsExportOpen(true);
  }

  function createArtboard(kind: "custom" | "sequence") {
    addLoader(kind);
    setIsAddMenuOpen(false);
    setPreviewScope("none");
  }

  function togglePreviewAll() {
    setPreviewScope((value) => (value === "all" ? "none" : "all"));
  }

  function togglePreviewSelected() {
    if (!hasSelection) {
      return;
    }
    setPreviewScope((value) => (value === "selected" ? "none" : "selected"));
  }

  function changeGridSize(value: number) {
    setPreviewScope("none");
    setGridSize(value);
  }

  function changeGridGap(value: number) {
    setPreviewScope("none");
    setGridGap(value);
  }

  function selectCanvasLoader(loaderId: string) {
    selectLoader(loaderId);
    setPreviewScope("none");
  }

  function clearCanvasSelection() {
    clearSelection();
    setPreviewScope("none");
  }

  function pulseZoomHud() {
    setShowZoomHud(true);
    if (zoomHudTimeoutRef.current) {
      window.clearTimeout(zoomHudTimeoutRef.current);
    }
    zoomHudTimeoutRef.current = window.setTimeout(() => {
      setShowZoomHud(false);
      zoomHudTimeoutRef.current = null;
    }, 900);
  }

  function zoomTo(nextZoom: number, clientX?: number, clientY?: number) {
    const viewport = viewportRef.current;
    const clampedZoom = Math.min(2.4, Math.max(0.25, Number(nextZoom.toFixed(3))));
    pulseZoomHud();

    if (!viewport || clientX === undefined || clientY === undefined) {
      setCanvasView({
        zoom: clampedZoom,
        panX: canvas.panX,
        panY: canvas.panY
      });
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const anchorX = clientX - rect.left;
    const anchorY = clientY - rect.top;
    const worldX = (anchorX - canvas.panX) / canvas.zoom;
    const worldY = (anchorY - canvas.panY) / canvas.zoom;

    setCanvasView({
      zoom: clampedZoom,
      panX: anchorX - worldX * clampedZoom,
      panY: anchorY - worldY * clampedZoom
    });
  }

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.92 : 1.08;
    zoomTo(canvas.zoom * delta, event.clientX, event.clientY);
  }

  function handleViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const artboard = target.closest("[data-artboard-id]") as HTMLElement | null;
    const hitDotCell = target.closest("[data-dot-cell='true']");
    const hitArtboardAction = target.closest("[data-artboard-action='true']");

    if (hitArtboardAction) {
      return;
    }

    if (artboard && !hitDotCell) {
      const loaderId = artboard.dataset.artboardId;
      const loader = project.loaders.find((item) => item.id === loaderId);
      if (!loaderId || !loader) {
        return;
      }
      const framesToMove = loader.sequenceId ? sequenceGroups.get(loader.sequenceId) ?? [loader] : [loader];
      dragArtboardRef.current = {
        pointerId: event.pointerId,
        loaderId,
        startX: event.clientX,
        startY: event.clientY,
        originX: loader.artboard.x,
        originY: loader.artboard.y,
        loaderOrigins: framesToMove.map((item) => ({
          id: item.id,
          x: item.artboard.x,
          y: item.artboard.y
        }))
      };
      if (previewScope !== "none" || selectedLoaderId !== loaderId) {
        setPreviewScope("none");
      }
      selectLoader(loaderId);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (artboard || target.closest("[data-artboard-interactive='true']")) {
      return;
    }

    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPanX: canvas.panX,
      originPanY: canvas.panY,
      moved: false
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleViewportPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragArtboardRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      const deltaX = (event.clientX - dragState.startX) / canvas.zoom;
      const deltaY = (event.clientY - dragState.startY) / canvas.zoom;
      if (dragState.loaderOrigins.length > 1) {
        moveLoaders(dragState.loaderOrigins.map((origin) => ({
          id: origin.id,
          x: origin.x + deltaX,
          y: origin.y + deltaY
        })));
        return;
      }

      moveLoader(dragState.loaderId, {
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY
      });
      return;
    }

    const state = panStateRef.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 4) {
      state.moved = true;
    }

    setCanvasView({
      zoom: canvas.zoom,
      panX: state.originPanX + (event.clientX - state.startX),
      panY: state.originPanY + (event.clientY - state.startY)
    });
  }

  function endPan(event?: ReactPointerEvent<HTMLDivElement>) {
    const panState = panStateRef.current;
    const shouldClearSelection = Boolean(
      event &&
        panState &&
        panState.pointerId === event.pointerId &&
        !panState.moved &&
        !((event.target as HTMLElement | null)?.closest("[data-artboard-id], [data-artboard-action='true']"))
    );
    const activePointerId = panStateRef.current?.pointerId ?? dragArtboardRef.current?.pointerId;
    if (event && activePointerId !== undefined && event.currentTarget.hasPointerCapture(activePointerId)) {
      event.currentTarget.releasePointerCapture(activePointerId);
    }
    panStateRef.current = null;
    dragArtboardRef.current = null;
    setIsPanning(false);
    if (shouldClearSelection) {
      clearCanvasSelection();
    }
  }

  if (!hydrated) {
    return <div className="loading-shell">Loading editor...</div>;
  }

  return (
    <main className="builder-shell">
      <div className="builder-topbar">
        <div className="builder-topbar__center">
          <button
            type="button"
            className="toolbar-button toolbar-button--primary"
            onClick={() => setIsAddMenuOpen((value) => !value)}
            aria-expanded={isAddMenuOpen}
          >
            {t.add}
          </button>
          {isAddMenuOpen ? (
            <div className="add-artboard-menu">
              <button type="button" className="add-artboard-card" onClick={() => createArtboard("custom")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-13Zm4 4.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM9 13.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM9 16.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm3 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
                </svg>
                <span>{t.customMode}</span>
              </button>
              <button type="button" className="add-artboard-card" onClick={() => createArtboard("sequence")}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 6A2.5 2.5 0 0 1 7 3.5h7A2.5 2.5 0 0 1 16.5 6v1H17A2.5 2.5 0 0 1 19.5 9.5v8A2.5 2.5 0 0 1 17 20h-7a2.5 2.5 0 0 1-2.5-2.5V17H7a2.5 2.5 0 0 1-2.5-2.5V6Zm4.6 11.5A.9.9 0 0 0 10 18.4h7a.9.9 0 0 0 .9-.9v-8a.9.9 0 0 0-.9-.9h-.5v5.9A2.5 2.5 0 0 1 14 17H9.1v.5Zm-2-11.2v8.4h7.8V6.3H7.1Z" />
                </svg>
                <span>{t.sequenceMode}</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="builder-topbar__actions">
          <button type="button" className="toolbar-button" onClick={togglePreviewAll}>
            {previewScope === "all" ? t.stopPreview : t.previewAll}
          </button>
          <button type="button" className="toolbar-button" onClick={openExport}>
            {t.export}
          </button>
        </div>
      </div>

      <div className={`zoom-hud${showZoomHud ? " is-visible" : ""}`}>{Math.round(canvas.zoom * 100)}%</div>
      <div className="language-switch" aria-label="Language switch">
        {(["cn", "en"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`language-switch__item${language === item ? " is-active" : ""}`}
            onClick={() => setLanguage(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      <section className="builder-workspace">
        <div className="builder-canvas-shell">
          <div
            className={`builder-canvas${isPanning ? " is-panning" : ""}`}
            ref={viewportRef}
            onWheel={handleCanvasWheel}
            onPointerDown={handleViewportPointerDown}
            onPointerMove={handleViewportPointerMove}
            onPointerUp={endPan}
            onPointerCancel={endPan}
          >
            <div
              className={`builder-canvas__surface${previewScope !== "none" ? " is-previewing" : ""}`}
              style={{
                width: canvasBounds.width,
                height: canvasBounds.height,
                transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
                ["--canvas-zoom" as string]: canvas.zoom,
                ["--inverse-canvas-zoom" as string]: Number((1 / canvas.zoom).toFixed(4))
              }}
            >
              {selectedSequenceBounds ? (
                <div
                  className="sequence-selection-outline"
                  style={{
                    left: selectedSequenceBounds.left,
                    top: selectedSequenceBounds.top,
                    width: selectedSequenceBounds.width,
                    height: selectedSequenceBounds.height
                  }}
                />
              ) : null}
              {selectedSequenceId && selectedSequenceBounds ? (
                <SequenceGroupChrome
                  bounds={selectedSequenceBounds}
                  name={selectedLoader?.name ?? ""}
                  frameCount={sequenceFrameCount}
                  canDelete={project.loaders.some((loader) => loader.sequenceId !== selectedSequenceId)}
                  onAddFrame={() => {
                    setPreviewScope("none");
                    addSequenceFrame(selectedSequenceId);
                  }}
                  onRemoveFrame={() => {
                    setPreviewScope("none");
                    removeSequenceFrame(selectedSequenceId);
                  }}
                  onDuplicate={duplicateSelectedLoader}
                  onDelete={deleteSelectedLoader}
                  copy={t}
                />
              ) : null}
              {sequencePreviewGroups.map((frames) => {
                const first = frames[0];
                const sequenceSelected = Boolean(selectedSequenceId && first.sequenceId === selectedSequenceId);
                return (
                  <div
                    key={`sequence-preview-${first.sequenceId}`}
                    role="button"
                    tabIndex={0}
                    data-artboard-interactive="true"
                    data-artboard-id={first.id}
                    className={`canvas-artboard canvas-artboard--sequence-preview${sequenceSelected ? " is-selected is-sequence-selected" : ""}`}
                    style={{
                      left: first.artboard.x,
                      top: first.artboard.y,
                      width: first.artboard.width,
                      height: first.artboard.height,
                      zIndex: sequenceSelected ? 4 : 1
                    }}
                    onClick={() => selectCanvasLoader(first.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectCanvasLoader(first.id);
                      }
                    }}
                  >
                    <div className="canvas-artboard__frame">
                      <SequencePreviewStage
                        frames={frames}
                        showHint={false}
                        isAnimated={previewScope !== "none"}
                        variant="canvas"
                      />
                    </div>
                  </div>
                );
              })}
              {visibleLoaders.map((item) => (
                <CanvasArtboard
                  key={item.id}
                  loader={item}
                  selected={item.id === selectedLoaderId}
                  sequenceSelected={Boolean(selectedSequenceId && item.sequenceId === selectedSequenceId)}
                  dimmed={false}
                  previewMode={previewScope}
                  editable={previewScope === "none" && (item.id === selectedLoaderId || Boolean(selectedSequenceId && item.sequenceId === selectedSequenceId))}
                  onSelect={() => selectCanvasLoader(item.id)}
                  onToggleCell={(cellIndex) => (
                    item.id === selectedLoaderId ? toggleCell(cellIndex) : toggleCellForLoader(item.id, cellIndex)
                  )}
                  onSetCellActive={(cellIndex, active) => (
                    item.id === selectedLoaderId ? setCellActive(cellIndex, active) : setCellActiveForLoader(item.id, cellIndex, active)
                  )}
                  onDuplicate={duplicateSelectedLoader}
                  onDelete={deleteSelectedLoader}
                  canDelete={
                    item.sequenceId
                      ? project.loaders.some((loader) => loader.sequenceId !== item.sequenceId)
                      : project.loaders.length > 1
                  }
                  hideChrome={Boolean(item.sequenceId)}
                />
              ))}
            </div>
          </div>

        </div>

        <aside className={`settings-sidebar${hasSelection ? " is-open" : " is-hidden"}`} data-artboard-interactive="true">
          <div className="settings-sidebar__header">
            <div>
              <h2>{t.settings}</h2>
            </div>
          </div>

          <div className="settings-sidebar__content">
            {!hasSelection ? (
              <div className="settings-empty">
                <p>{t.empty}</p>
              </div>
            ) : null}

            {hasSelection ? (
            <>
          <section className="inspector-group inspector-group--flat">
            <div className="inspector-group__title">{t.appearance}</div>
            <div className="inspector-group__body">
              <label className="field">
                <span>{t.loaderName}</span>
                <input value={editingLoader.name} onChange={(event) => renameLoader(event.target.value)} />
              </label>
              <label className="field">
                <span>{t.shape}</span>
                <select
                  value={selectedShape}
                  onChange={(event) => setCellShape(event.target.value as CellShape)}
                >
                  {shapeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t[option.value]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="appearance-controls">
                <ColorControl
                  label={t.primaryColor}
                  color={editingLoader.style.primaryColor}
                  alpha={editingLoader.style.primaryAlpha ?? 1}
                  onColorChange={setPrimaryColor}
                  onAlphaChange={setPrimaryAlpha}
                />
                <div className="appearance-card appearance-card--glow">
                  <div className="appearance-card__row">
                    <span className="appearance-card__label">{t.glow}</span>
                    <button
                      type="button"
                      className={`switch-toggle${editingLoader.style.shadow ? " is-on" : ""}`}
                      onClick={() => setGlowEnabled(!editingLoader.style.shadow)}
                      aria-pressed={editingLoader.style.shadow}
                      aria-label={editingLoader.style.shadow ? "Turn glow off" : "Turn glow on"}
                    >
                      <span aria-hidden="true" />
                    </button>
                  </div>
                  <ColorControl
                    label={t.glowColor}
                    color={editingLoader.style.glowColor ?? editingLoader.style.primaryColor}
                    alpha={editingLoader.style.glowAlpha ?? editingLoader.style.primaryAlpha ?? 1}
                    onColorChange={setGlowColor}
                    onAlphaChange={setGlowAlpha}
                    disabled={!editingLoader.style.shadow}
                  />
                  <label className="glow-control">
                    <div className="appearance-card__row">
                      <span className="appearance-card__label">{t.spread}</span>
                      <strong>{Math.round(editingLoader.style.glow)} px</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="48"
                      step="1"
                      value={editingLoader.style.glow}
                      style={getRangeStyle(editingLoader.style.glow, 0, 48)}
                      onChange={(event) => setGlowSize(Number(event.target.value))}
                      disabled={!editingLoader.style.shadow}
                    />
                  </label>
                </div>
                <ColorControl
                  label={t.backgroundColor}
                  color={editingLoader.style.backgroundColor ?? "#2D3743"}
                  alpha={editingLoader.style.backgroundAlpha ?? 1}
                  onColorChange={setBackgroundColor}
                  onAlphaChange={setBackgroundAlpha}
                />
                {selectedShape === "rectangle" ? (
                <label className="field slider-field">
                  <div className="appearance-card__row">
                    <span className="appearance-card__label">{t.cornerRadius}</span>
                    <strong>{Math.round(Math.min(editingLoader.style.radius, maxRadius))} px</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxRadius}
                    step="1"
                    value={Math.min(editingLoader.style.radius, maxRadius)}
                    style={getRangeStyle(Math.min(editingLoader.style.radius, maxRadius), 0, maxRadius)}
                    onChange={(event) => setRadius(Number(event.target.value))}
                  />
                  <div className="range-labels range-labels--tight">
                    <span>{t.sharp}</span>
                    <span>{t.round}</span>
                  </div>
                </label>
                ) : null}
                {selectedShape === "star" ? (
                <label className="field slider-field">
                  <div className="appearance-card__row">
                    <span className="appearance-card__label">{t.innerRadius}</span>
                    <strong>{Math.round((editingLoader.style.innerRadius ?? 0.48) * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.8"
                    step="0.01"
                    value={editingLoader.style.innerRadius ?? 0.48}
                    style={getRangeStyle(editingLoader.style.innerRadius ?? 0.48, 0.2, 0.8)}
                    onChange={(event) => setShapeInnerRadius(Number(event.target.value))}
                  />
                  <div className="range-labels range-labels--tight">
                    <span>20%</span>
                    <span>80%</span>
                  </div>
                </label>
                ) : null}
                <label className="field slider-field">
                  <div className="appearance-card__row">
                    <span className="appearance-card__label">{t.gridSize}</span>
                    <strong>
                      {editingLoader.pattern.grid.rows}x{editingLoader.pattern.grid.cols}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={editingLoader.pattern.grid.rows}
                    style={getRangeStyle(editingLoader.pattern.grid.rows, 2, 8)}
                    onChange={(event) => changeGridSize(Number(event.target.value))}
                  />
                  <div className="range-labels range-labels--tight">
                    <span>2x2</span>
                    <span>8x8</span>
                  </div>
                </label>
                <label className="field slider-field">
                  <div className="appearance-card__row">
                    <span className="appearance-card__label">{t.gap}</span>
                    <strong>{Math.round(editingLoader.pattern.grid.gap)} px</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={editingLoader.pattern.grid.gap}
                    style={getRangeStyle(editingLoader.pattern.grid.gap, 0, 20)}
                    onChange={(event) => changeGridGap(Number(event.target.value))}
                  />
                  <div className="range-labels range-labels--tight">
                    <span>0</span>
                    <span>20</span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          <section className="inspector-group inspector-group--flat">
            <div className="inspector-group__title">{t.motion}</div>
            <div className="inspector-group__body">
              {!editingLoader.sequenceId ? (
              <>
              <label className="field">
                <span>{t.motionPreset}</span>
                <select
                  value={editingLoader.animation.presetId}
                  onChange={(event) => setMotionPreset(event.target.value as typeof editingLoader.animation.presetId)}
                >
                  {motionPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {motionPresetCopy[language][preset.id].name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="field-help">{activeMotionCopy.description}</p>
              {activeMotionPreset.supportsDirection ? (
                <div className="field">
                  <span>{t.direction}</span>
                  <div className="direction-picker" role="radiogroup" aria-label="Animation direction">
                    {directionControlCells.map((option, index) =>
                      option ? (
                        <button
                          key={option.value}
                          type="button"
                          className={`direction-picker__item${editingLoader.animation.direction === option.value ? " is-active" : ""}`}
                          onClick={() => setDirection(option.value)}
                          role="radio"
                          aria-checked={editingLoader.animation.direction === option.value}
                          title={option.label}
                        >
                          <span aria-hidden="true" className="direction-picker__icon">
                            {option.icon}
                          </span>
                        </button>
                      ) : (
                        <span key={`direction-center-${index}`} className="direction-picker__center" aria-hidden="true" />
                      )
                    )}
                  </div>
                </div>
              ) : null}
              {activeMotionPreset.supportsOrigin ? (
                <>
                  <label className="field">
                    <span>{t.originX}: {editingLoader.animation.originX}</span>
                    <input
                      type="range"
                      min="1"
                      max={editingLoader.pattern.grid.cols}
                      step="1"
                      value={editingLoader.animation.originX}
                      style={getRangeStyle(editingLoader.animation.originX, 1, editingLoader.pattern.grid.cols)}
                      onChange={(event) => setMotionOrigin("x", Number(event.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>{t.originY}: {editingLoader.animation.originY}</span>
                    <input
                      type="range"
                      min="1"
                      max={editingLoader.pattern.grid.rows}
                      step="1"
                      value={editingLoader.animation.originY}
                      style={getRangeStyle(editingLoader.animation.originY, 1, editingLoader.pattern.grid.rows)}
                      onChange={(event) => setMotionOrigin("y", Number(event.target.value))}
                    />
                  </label>
                </>
              ) : null}
              </>
              ) : null}
              <label className="field">
                <span>{t.backgroundStyle}</span>
                <select
                  value={editingLoader.animation.inactiveStyle}
                  onChange={(event) => setInactiveStyle(event.target.value as InactiveStyle)}
                >
                  {inactiveStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {inactiveStyleCopy[language][style.value]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="field-help">{t.backgroundHelp}</p>
              <label className="field slider-field">
                <div className="appearance-card__row">
                  <span className="appearance-card__label">{t.speed}</span>
                  <strong>{editingLoader.animation.fps}</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={editingLoader.animation.fps}
                  style={getRangeStyle(editingLoader.animation.fps, 1, 30)}
                  onChange={(event) => setFps(Number(event.target.value))}
                />
                <div className="range-labels range-labels--tight">
                  <span>{t.slower}</span>
                  <span>{t.faster}</span>
                </div>
              </label>
            </div>
          </section>
            </>
            ) : null}
          </div>
          {hasSelection ? (
            <div className="motion-preview-dock">
              <button type="button" className="button motion-preview-button" onClick={togglePreviewSelected}>
                {previewScope === "selected" ? t.stopPreview : t.previewAnimation}
              </button>
            </div>
          ) : null}
        </aside>
      </section>

      <div className={`export-drawer${isExportOpen ? " is-open" : ""}`} id="export-center">
        {isExportOpen ? <ExportPanel language={language} onClose={() => setIsExportOpen(false)} /> : null}
      </div>
    </main>
  );
}
