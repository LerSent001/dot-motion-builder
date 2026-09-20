"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { DotGridEditor } from "@/components/editor/dot-grid-editor";
import { ExportPanel } from "@/components/editor/export-panel";
import { PreviewStage, SequencePreviewStage } from "@/components/editor/preview-stage";
import { normalizeCellShape, shapeOptions } from "@/lib/cell-shapes";
import { motionPresets } from "@/lib/motion-presets";
import { inactiveStyleCopy, Language, motionPresetCopy, uiCopy } from "@/lib/ui-copy";
import { useEditorStore } from "@/stores/use-editor-store";
import { Button } from "@/toolcraft/ui/components/primitives/button";
import { Panel } from "@/toolcraft/ui/components/panel/panel";
import { PanelSection } from "@/toolcraft/ui/components/panel/panel-section";
import { Sheet, SheetContent } from "@/toolcraft/ui/components/composites/sheet";
import { SegmentedControl } from "@/toolcraft/ui/components/controls/segmented/segmented-control";
import { SliderControl } from "@/toolcraft/ui/components/controls/slider/slider-control";
import { SelectControl } from "@/toolcraft/ui/components/controls/select/select-control";
import { SwitchControl } from "@/toolcraft/ui/components/controls/boolean/boolean-controls";
import { ColorOpacityControl } from "@/toolcraft/ui/components/controls/color/color-control";
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
  const setMotionPreset = useEditorStore((state) => state.setMotionPreset);
  const setMotionOrigin = useEditorStore((state) => state.setMotionOrigin);
  const setDirection = useEditorStore((state) => state.setDirection);
  const setSpeed = useEditorStore(state => state.setSpeed);
  const fillGrid = useEditorStore(state => state.fillGrid);
  const setScaleIntensity = useEditorStore(state => state.setScaleIntensity);
  const setAnimationStyle = useEditorStore(state => state.setAnimationStyle);
  const setFps = useEditorStore((state) => state.setFps);
  const setInactiveStyle = useEditorStore((state) => state.setInactiveStyle);
  const setPrimaryColor = useEditorStore((state) => state.setPrimaryColor);
  const setPrimaryAlpha = useEditorStore((state) => state.setPrimaryAlpha);
  const setGlowEnabled = useEditorStore((state) => state.setGlowEnabled);
  const setGlowSize = useEditorStore((state) => state.setGlowSize);
  const setBackgroundColor = useEditorStore((state) => state.setBackgroundColor);
  const setBackgroundAlpha = useEditorStore((state) => state.setBackgroundAlpha);
  const setCellShape = useEditorStore((state) => state.setCellShape);
  const setGridSize = useEditorStore((state) => state.setGridSize);
  const setGridGap = useEditorStore((state) => state.setGridGap);
  const setCanvasView = useEditorStore((state) => state.setCanvasView);
  const selectedLoader = project.loaders.find((loader) => loader.id === selectedLoaderId) ?? null;
  const editingLoader = selectedLoader ?? project.loaders[0];
  const hasSelection = Boolean(selectedLoader);
  const selectedShape = normalizeCellShape(editingLoader.style.cellShape);
  const selectedSequenceId = selectedLoader?.sequenceId;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [propertiesCollapsed, setPropertiesCollapsed] = useState(false);
  const [previewScope, setPreviewScope] = useState<"none" | "selected" | "all">("none");
  const [language, setLanguage] = useState<Language>("cn");
  const [showZoomHud, setShowZoomHud] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    grid: false,
    pattern: false,
    animation: false,
    colors: true,
    effects: true
  });
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

  function centerCanvasContent() {
    const viewport = viewportRef.current;
    if (!viewport || project.loaders.length === 0) {
      return;
    }

    const contentLeft = Math.min(...project.loaders.map((loader) => loader.artboard.x));
    const contentTop = Math.min(...project.loaders.map((loader) => loader.artboard.y));
    const contentRight = Math.max(...project.loaders.map((loader) => loader.artboard.x + loader.artboard.width));
    const contentBottom = Math.max(...project.loaders.map((loader) => loader.artboard.y + loader.artboard.height));
    const contentWidth = Math.max(contentRight - contentLeft, 1);
    const contentHeight = Math.max(contentBottom - contentTop, 1);
    const viewportRect = viewport.getBoundingClientRect();
    const edgePadding = 48;
    let visibleLeft = edgePadding;
    let visibleRight = viewportRect.width - edgePadding;
    const visibleTop = 64;
    const visibleBottom = viewportRect.height - 72;
    const sidebar = document.querySelector<HTMLElement>(".settings-sidebar.is-open:not(.is-hidden)");

    if (sidebar) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const overlapsViewport = sidebarRect.top < viewportRect.bottom && sidebarRect.bottom > viewportRect.top;
      const occupiesRightSide = sidebarRect.left > viewportRect.left + viewportRect.width / 2;
      if (overlapsViewport && occupiesRightSide) {
        visibleRight = Math.min(visibleRight, sidebarRect.left - viewportRect.left - 24);
      }
    }

    const availableWidth = Math.max(visibleRight - visibleLeft, 1);
    const availableHeight = Math.max(visibleBottom - visibleTop, 1);
    const targetZoom = Math.min(
      1,
      Math.max(
        .25,
        Math.min(
          (availableWidth - edgePadding * 2) / contentWidth,
          (availableHeight - edgePadding * 2) / contentHeight
        )
      )
    );
    const targetCenterX = (visibleLeft + visibleRight) / 2;
    const targetCenterY = (visibleTop + visibleBottom) / 2;
    const contentCenterX = contentLeft + contentWidth / 2;
    const contentCenterY = contentTop + contentHeight / 2;

    setCanvasView({
      zoom: Number(targetZoom.toFixed(3)),
      panX: Number((targetCenterX - contentCenterX * targetZoom).toFixed(2)),
      panY: Number((targetCenterY - contentCenterY * targetZoom).toFixed(2))
    });
    pulseZoomHud();
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
        <a
          className="github-entry"
          href="https://github.com/LerSent001/dot-motion-builder"
          target="_blank"
          rel="noreferrer"
          aria-label="Open Dot Motion Builder on GitHub"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-.88-.02-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1 .08 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.71a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.18.6.69.49A10.27 10.27 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
          </svg>
          <span>GitHub</span>
        </a>
        <div className="builder-topbar__center">
          <Button
            type="button"
            className="toolbar-button"
            variant="default"
            size="default"
            onClick={() => setIsAddMenuOpen((value) => !value)}
            aria-expanded={isAddMenuOpen}
          >
            {t.add}
          </Button>
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
          <Button type="button" className="toolbar-button" variant="outline" size="default" onClick={togglePreviewAll}>
            {previewScope === "all" ? t.stopPreview : t.previewAll}
          </Button>
          <Button type="button" className="toolbar-button" variant="default" size="default" onClick={openExport}>
            {t.export}
          </Button>
        </div>
      </div>

      <div className={`zoom-hud${showZoomHud ? " is-visible" : ""}`}>{Math.round(canvas.zoom * 100)}%</div>
      <div className="language-switch" aria-label="Language switch">
        <SegmentedControl
          ariaLabel="Language switch"
          name="Language"
          value={language}
          options={[{ value: "cn", label: "中文" }, { value: "en", label: "EN" }]}
          onValueChange={(value) => {
            if (value === "cn" || value === "en") setLanguage(value);
          }}
        />
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

          <button
            type="button"
            className="canvas-center-button"
            onClick={centerCanvasContent}
            aria-label={t.centerCanvas}
            title={t.centerCanvas}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4H6a2 2 0 0 0-2 2v3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" />
              <circle cx="12" cy="12" r="2.25" />
            </svg>
          </button>

        </div>

        <aside className={`settings-sidebar${hasSelection ? " is-open" : " is-hidden"}${propertiesCollapsed ? " is-collapsed" : ""}`} data-artboard-interactive="true">
          <Panel
            title={t.settings}
            className="settings-toolcraft-panel h-full max-h-none w-full rounded-lg"
            collapsed={propertiesCollapsed}
            collapseDirection="right"
            collapseLabel={language === "cn" ? "收起参数面板" : "Collapse controls"}
            expandLabel={language === "cn" ? "展开参数面板" : "Expand controls"}
            onCollapsedChange={setPropertiesCollapsed}
          >
            {hasSelection ? (
              <>
                <PanelSection
                  title={t.grid}
                  collapsible
                  collapsed={collapsedSections.grid}
                  collapseLabel={language === "cn" ? "收起网格" : "Collapse grid"}
                  expandLabel={language === "cn" ? "展开网格" : "Expand grid"}
                  onCollapsedChange={(value) => setCollapsedSections(current => ({ ...current, grid: value }))}
                >
                  <div className="toolcraft-control-stack">
                    <SliderControl showFill variant="discrete" markerCount={11} name={t.gridSize} min={3} max={13} step={1} value={editingLoader.pattern.grid.rows} valueLabel={`${editingLoader.pattern.grid.rows}×${editingLoader.pattern.grid.cols}`} onValueChange={changeGridSize} />
                    <SelectControl
                      name={t.shape}
                      value={selectedShape}
                      options={shapeOptions.map(option => ({ value: option.value, label: t[option.value] }))}
                      onValueChange={(value) => setCellShape(value as CellShape)}
                    />
                    <SliderControl showFill name={t.gap} min={0} max={20} step={1} unit="px" value={editingLoader.pattern.grid.gap} onValueChange={changeGridGap} />
                  </div>
                </PanelSection>

                <PanelSection
                  title={t.preset}
                  collapsible
                  collapsed={collapsedSections.pattern}
                  collapseLabel={language === "cn" ? "收起预设" : "Collapse preset"}
                  expandLabel={language === "cn" ? "展开预设" : "Expand preset"}
                  onCollapsedChange={(value) => setCollapsedSections(current => ({ ...current, pattern: value }))}
                >
                  <div className="toolcraft-control-stack">
                    {!editingLoader.sequenceId ? (
                      <>
                        <SelectControl
                          name={t.preset}
                          value={editingLoader.animation.presetId}
                          options={motionPresets.map(preset => ({ value: preset.id, label: motionPresetCopy[language][preset.id].name }))}
                          onValueChange={(value) => setMotionPreset(value as typeof editingLoader.animation.presetId)}
                        />
                        <p className="field-help">{activeMotionCopy.description}</p>
                      </>
                    ) : null}
                    <div className="motion-grid-actions">
                      <Button type="button" variant="outline" onClick={() => fillGrid(true)}>{language === "cn" ? "填满点阵" : "Fill grid"}</Button>
                      <Button type="button" variant="outline" onClick={() => fillGrid(false)}>{language === "cn" ? "清空点阵" : "Clear grid"}</Button>
                    </div>
                  </div>
                </PanelSection>

                <PanelSection
                  title={t.animation}
                  collapsible
                  collapsed={collapsedSections.animation}
                  collapseLabel={language === "cn" ? "收起动画" : "Collapse animation"}
                  expandLabel={language === "cn" ? "展开动画" : "Expand animation"}
                  onCollapsedChange={(value) => setCollapsedSections(current => ({ ...current, animation: value }))}
                >
                  <div className="toolcraft-control-stack">
                    {!editingLoader.sequenceId ? (
                      <>
                        <SliderControl showFill name={t.playbackSpeed} min={0.25} max={3} step={0.05} unit="×" value={editingLoader.animation.speed ?? 1} onValueChange={setSpeed} />
                        <SelectControl
                          name={t.activeCells}
                          value={editingLoader.animation.style}
                          options={[
                            { value: "opacity-only", label: language === "cn" ? "透明度" : "Opacity Only" },
                            { value: "pulse-size", label: language === "cn" ? "亮度缩放" : "Brightness Scale" },
                            { value: "fisheye", label: language === "cn" ? "鱼眼镜头" : "Fish-eye Lens" },
                            { value: "depth-shift", label: language === "cn" ? "收缩激活点" : "Shrink Active" },
                            { value: "bloom-pop", label: language === "cn" ? "弹性出现" : "Pop In/Out" }
                          ]}
                          onValueChange={(value) => setAnimationStyle(value as typeof editingLoader.animation.style)}
                        />
                        {editingLoader.animation.style === "opacity-only" ? null : (
                          <SliderControl showFill name={language === "cn" ? "缩放强度" : "Scale Intensity"} min={0} max={100} step={5} unit="%" value={Math.round((editingLoader.animation.scaleIntensity ?? 1) * 100)} onValueChange={(value) => setScaleIntensity(value / 100)} />
                        )}
                      </>
                    ) : (
                      <SliderControl showFill variant="discrete" markerCount={6} name={t.speed} min={1} max={30} step={1} value={editingLoader.animation.fps} onValueChange={setFps} />
                    )}
                    <SelectControl
                      name={t.inactiveCells}
                      value={editingLoader.animation.inactiveStyle}
                      options={inactiveStyles.map(style => ({ value: style.value, label: inactiveStyleCopy[language][style.value] }))}
                      onValueChange={(value) => setInactiveStyle(value as InactiveStyle)}
                    />
                    {activeMotionPreset.supportsDirection ? (
                      <div className="toolcraft-direction-control">
                        <span className="toolcraft-field-label">{t.direction}</span>
                        <div className="direction-picker" role="radiogroup" aria-label="Animation direction">
                          {directionControlCells.map((option, index) =>
                            option ? (
                              <Button
                                key={option.value}
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className={`direction-picker__item${editingLoader.animation.direction === option.value ? " is-active" : ""}`}
                                onClick={() => setDirection(option.value)}
                                role="radio"
                                aria-checked={editingLoader.animation.direction === option.value}
                                aria-pressed={editingLoader.animation.direction === option.value}
                                title={option.label}
                              >
                                <span aria-hidden="true" className="direction-picker__icon">{option.icon}</span>
                              </Button>
                            ) : (
                              <span key={`direction-center-${index}`} className="direction-picker__center" aria-hidden="true" />
                            )
                          )}
                        </div>
                      </div>
                    ) : null}
                    {activeMotionPreset.supportsOrigin ? (
                      <>
                        <SliderControl showFill variant="discrete" markerCount={editingLoader.pattern.grid.cols} name={t.originX} min={1} max={editingLoader.pattern.grid.cols} step={1} value={editingLoader.animation.originX} onValueChange={(value) => setMotionOrigin("x", value)} />
                        <SliderControl showFill variant="discrete" markerCount={editingLoader.pattern.grid.rows} name={t.originY} min={1} max={editingLoader.pattern.grid.rows} step={1} value={editingLoader.animation.originY} onValueChange={(value) => setMotionOrigin("y", value)} />
                      </>
                    ) : null}
                  </div>
                </PanelSection>

                <PanelSection
                  title={t.colors}
                  collapsible
                  collapsed={collapsedSections.colors}
                  collapseLabel={language === "cn" ? "收起颜色" : "Collapse colors"}
                  expandLabel={language === "cn" ? "展开颜色" : "Expand colors"}
                  onCollapsedChange={(value) => setCollapsedSections(current => ({ ...current, colors: value }))}
                >
                  <div className="toolcraft-control-stack">
                    <ColorOpacityControl
                      showLabel
                      name={t.primaryColor}
                      hex={editingLoader.style.primaryColor}
                      opacity={(editingLoader.style.primaryAlpha ?? 1) * 100}
                      onValueChange={({ hex, opacity }) => { setPrimaryColor(hex); setPrimaryAlpha(opacity / 100); }}
                    />
                    <ColorOpacityControl
                      showLabel
                      name={t.backgroundColor}
                      hex={editingLoader.style.backgroundColor ?? "#2D3743"}
                      opacity={(editingLoader.style.backgroundAlpha ?? 1) * 100}
                      onValueChange={({ hex, opacity }) => { setBackgroundColor(hex); setBackgroundAlpha(opacity / 100); }}
                    />
                  </div>
                </PanelSection>

                <PanelSection
                  title={t.effects}
                  collapsible
                  collapsed={collapsedSections.effects}
                  collapseLabel={language === "cn" ? "收起效果" : "Collapse effects"}
                  expandLabel={language === "cn" ? "展开效果" : "Expand effects"}
                  onCollapsedChange={(value) => setCollapsedSections(current => ({ ...current, effects: value }))}
                >
                  <div className="toolcraft-control-stack">
                    <SwitchControl checked={editingLoader.style.shadow} name={t.glow} onCheckedChange={setGlowEnabled} />
                    {editingLoader.style.shadow ? (
                      <SliderControl showFill name={t.spread} min={0} max={48} step={1} unit="px" value={editingLoader.style.glow} onValueChange={setGlowSize} />
                    ) : null}
                  </div>
                </PanelSection>
              </>
            ) : null}
          {hasSelection ? (
            <PanelSection actionGroup="primary">
              <Button type="button" className="motion-preview-button" size="default" onClick={togglePreviewSelected}>
                {previewScope === "selected" ? t.stopPreview : t.previewAnimation}
              </Button>
            </PanelSection>
          ) : null}
          </Panel>
        </aside>
      </section>

      <Sheet open={isExportOpen} onOpenChange={setIsExportOpen}>
        <SheetContent className="export-drawer" closeLabel={t.closeExport} id="export-center" side="bottom">
          <ExportPanel language={language} />
        </SheetContent>
      </Sheet>
    </main>
  );
}
