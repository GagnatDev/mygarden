import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/areas';
import {
  deleteAreaBackgroundImage,
  uploadAreaBackgroundImage,
} from '../api/areas';
import type { Element, ElementShape } from '../api/elements';
import { apiFetch } from '../api/client';
import { computeAlignmentGuides } from './alignment-guides';
import { GridMapAreasSvg } from './GridMapAreasSvg';
import { GridMapSvgGridLayer } from './GridMapSvgGridLayer';
import { isValidMovePosition } from './grid-rect';
import {
  polygonPointsPx,
  polygonVerticesToGridBBox,
  translateVertices,
} from './polygon-helpers';
import {
  MAX_MAP_SCALE,
  MIN_MAP_SCALE,
  type MapView,
  zoomToFocal,
} from './view-helpers';

/** CSS pixels per grid cell (world space). Exported for tests. */
export const CELL = 28;

export interface GridSelection {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

export type ElementDraftSelection = GridSelection & { shape?: ElementShape };

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  gw: number,
  gh: number,
): GridSelection | null {
  const x0 = clamp(Math.min(ax, bx), 0, gw - 1);
  const y0 = clamp(Math.min(ay, by), 0, gh - 1);
  const x1 = clamp(Math.max(ax, bx), 0, gw - 1);
  const y1 = clamp(Math.max(ay, by), 0, gh - 1);
  const gridWidth = x1 - x0 + 1;
  const gridHeight = y1 - y0 + 1;
  if (gridWidth < 1 || gridHeight < 1) return null;
  return { gridX: x0, gridY: y0, gridWidth, gridHeight };
}

export type MapTool = 'select' | 'pan' | 'move' | 'draw-polygon';
export type MapLayer = 'element-type' | 'plan-vs-actual' | 'status' | 'historical';

export interface MapLegendItem {
  label: string;
  color: string;
}

export interface HistoricalGhostElement {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

interface MoveDragState {
  elementId: string;
  origGridX: number;
  origGridY: number;
  grabDx: number;
  grabDy: number;
  w: number;
  h: number;
  curGridX: number;
  curGridY: number;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
}

export interface GridMapEditorProps {
  gardenId: string;
  area: Area;
  elements: Element[];
  /** Element IDs that have at least one planting (subtle map indicator only). */
  elementIdsWithPlantings?: ReadonlySet<string>;
  /** Controls how elements are colored/badged. */
  layer?: MapLayer;
  onLayerChange?: (layer: MapLayer) => void;
  /** Optional per-element background color overrides for the active layer. */
  elementColorById?: Readonly<Record<string, string>>;
  /** Optional per-element badge for the active layer. */
  elementBadgeById?: Readonly<
    Record<string, { text: string; toneClass: string }>
  >;
  /** Optional per-element overlay badges (e.g. historical plant names). */
  elementOverlayBadgesById?: Readonly<Record<string, string[]>>;
  /** Legend items displayed under the toolbar for non-default layers. */
  legendItems?: readonly MapLegendItem[];
  /** Historical comparison: show deleted elements as dashed ghosts. */
  historicalGhostElements?: readonly HistoricalGhostElement[];
  /** Optional UI fragment shown in the toolbar (e.g. season picker for historical layer). */
  toolbarAddon?: React.ReactNode;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onSelectionComplete: (sel: ElementDraftSelection) => void;
  /** Reposition an existing element (grid top-left); parent persists via API. */
  onMoveElement?: (elementId: string, gridX: number, gridY: number) => void;
  tool: MapTool;
  onToolChange: (t: MapTool) => void;
  /** When true, map is view-only (pan/zoom only, no new selections or element clicks). */
  readOnly?: boolean;
  /** Called after a successful background upload or remove (e.g. refresh area). */
  onAreaBackgroundChanged?: () => void | Promise<void>;
}

export function GridMapEditor({
  gardenId,
  area,
  elements,
  elementIdsWithPlantings,
  layer = 'element-type',
  onLayerChange,
  elementColorById,
  elementBadgeById,
  elementOverlayBadgesById,
  legendItems,
  historicalGhostElements,
  toolbarAddon,
  selectedElementId,
  onSelectElement,
  onSelectionComplete,
  onMoveElement,
  tool,
  onToolChange,
  readOnly = false,
  onAreaBackgroundChanged,
}: GridMapEditorProps) {
  const { t } = useTranslation();
  const backgroundImageUrl = area.backgroundImageUrl ?? null;
  const effectiveTool: MapTool = readOnly ? 'pan' : tool;
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<MapView>({ tx: 0, ty: 0, scale: 1 });
  /** Matches the CSS transform on the viewport; may diverge from `view` during pan/pinch until flushed. */
  const liveViewRef = useRef<MapView>(view);

  const applyViewportTransform = useCallback((v: MapView) => {
    const node = viewportRef.current;
    if (!node) return;
    node.style.transform = `translate(calc(-50% + ${v.tx}px), calc(-50% + ${v.ty}px)) scale(${v.scale})`;
    node.style.transformOrigin = 'center center';
  }, []);

  useLayoutEffect(() => {
    liveViewRef.current = view;
    applyViewportTransform(view);
  }, [view, applyViewportTransform]);

  const dragRef = useRef<
    | { kind: 'pan'; x: number; y: number }
    | {
        kind: 'select';
        ax: number;
        ay: number;
        bx: number;
        by: number;
        startClientX: number;
        startClientY: number;
      }
    | null
  >(null);
  const pinchRef = useRef<{
    dist: number;
    scale: number;
    containerRect: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  } | null>(null);
  type WheelAccum =
    | { kind: 'zoom'; factor: number; focalX: number; focalY: number }
    | { kind: 'pan'; dx: number; dy: number };
  const wheelAccumRef = useRef<WheelAccum | null>(null);
  const wheelRafRef = useRef<number | null>(null);
  const spaceHeldRef = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  /** True while pointer is down for a pan that started with Space held (for grab/grabbing cursor). */
  const [spacePanPointerDown, setSpacePanPointerDown] = useState(false);
  const [preview, setPreview] = useState<GridSelection | null>(null);
  const moveRef = useRef<MoveDragState | null>(null);
  const [move, setMove] = useState<MoveDragState | null>(null);
  /** While move tool is active: last area finished via pointer (nudge target + outline); not synced to parent. */
  const [moveNudgeElementId, setMoveNudgeElementId] = useState<string | null>(null);
  const [poly, setPoly] = useState<Array<{ x: number; y: number }> | null>(null);

  const bgStorageKey = `mygarden.mapBgOpacity.${gardenId}.${area.id}`;
  const [bgOpacityPct, setBgOpacityPct] = useState(50);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(bgStorageKey);
      if (raw == null) {
        setBgOpacityPct(50);
        return;
      }
      const n = Number(raw);
      setBgOpacityPct(!Number.isFinite(n) ? 50 : Math.min(100, Math.max(0, n)));
    } catch {
      setBgOpacityPct(50);
    }
  }, [bgStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(bgStorageKey, String(bgOpacityPct));
    } catch {
      /* ignore */
    }
  }, [bgStorageKey, bgOpacityPct]);

  const [bgObjectUrl, setBgObjectUrl] = useState<string | null>(null);
  const [bgActionBusy, setBgActionBusy] = useState(false);
  const [bgActionError, setBgActionError] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!backgroundImageUrl) {
      setBgObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    void (async () => {
      try {
        const res = await apiFetch(backgroundImageUrl);
        if (!res.ok) {
          if (!cancelled) {
            setBgObjectUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
          return;
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBgObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return createdUrl;
          });
        } else if (createdUrl) {
          URL.revokeObjectURL(createdUrl);
        }
      } catch {
        if (!cancelled) {
          setBgObjectUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      setBgObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [backgroundImageUrl, area.updatedAt]);

  const onBackgroundFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setBgActionBusy(true);
      setBgActionError(null);
      try {
        await uploadAreaBackgroundImage(gardenId, area.id, file);
        await onAreaBackgroundChanged?.();
      } catch (err) {
        setBgActionError(err instanceof Error ? err.message : t('garden.backgroundUploadFailed'));
      } finally {
        setBgActionBusy(false);
      }
    },
    [gardenId, area.id, onAreaBackgroundChanged, t],
  );

  const onRemoveBackground = useCallback(async () => {
    setBgActionBusy(true);
    setBgActionError(null);
    try {
      await deleteAreaBackgroundImage(gardenId, area.id);
      await onAreaBackgroundChanged?.();
    } catch (err) {
      setBgActionError(err instanceof Error ? err.message : t('garden.backgroundUploadFailed'));
    } finally {
      setBgActionBusy(false);
    }
  }, [gardenId, area.id, onAreaBackgroundChanged, t]);

  useEffect(() => {
    if (effectiveTool !== 'move') {
      setMoveNudgeElementId(null);
    }
  }, [effectiveTool]);

  const elementOutlineId =
    effectiveTool === 'move' ? moveNudgeElementId ?? selectedElementId : selectedElementId;

  const gw = area.gridWidth;
  const gh = area.gridHeight;
  const worldW = gw * CELL;
  const worldH = gh * CELL;

  const clientToGrid = useCallback(
    (clientX: number, clientY: number): { gx: number; gy: number } | null => {
      const el = worldRef.current;
      const box = el?.getBoundingClientRect();
      if (!box || box.width <= 0 || box.height <= 0) return null;
      const x = ((clientX - box.left) / box.width) * worldW;
      const y = ((clientY - box.top) / box.height) * worldH;
      const gx = Math.floor(x / CELL);
      const gy = Math.floor(y / CELL);
      if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null;
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return null;
      return { gx, gy };
    },
    [gw, gh, worldW, worldH],
  );

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = worldRef.current;
      const box = el?.getBoundingClientRect();
      if (!box || box.width <= 0 || box.height <= 0) return null;
      const x = ((clientX - box.left) / box.width) * worldW;
      const y = ((clientY - box.top) / box.height) * worldH;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < 0 || y < 0 || x > worldW || y > worldH) return null;
      return { x, y };
    },
    [worldW, worldH],
  );

  const polygonDraft = poly;
  const polygonPreviewPointsPx = useMemo(() => {
    if (!polygonDraft || polygonDraft.length === 0) return '';
    return polygonPointsPx(polygonDraft, CELL);
  }, [polygonDraft]);

  const completePolygonDraft = useCallback(
    (draft: Array<{ x: number; y: number }>) => {
      const bbox = polygonVerticesToGridBBox(draft);
      if (!bbox) return;
      onSelectionComplete({
        ...bbox,
        shape: { kind: 'polygon', vertices: draft },
      });
      setPoly(null);
    },
    [onSelectionComplete],
  );

  /** Tap within this many SVG pixels of the first vertex closes the polygon (touch-friendly). */
  const POLYGON_CLOSE_RADIUS_PX = 18;

  useEffect(() => {
    if (readOnly || effectiveTool !== 'draw-polygon') {
      setPoly(null);
    }
  }, [readOnly, effectiveTool]);

  const setMoveBoth = useCallback((next: MoveDragState | null) => {
    moveRef.current = next;
    setMove(next);
  }, []);

  const beginElementMoveAt = useCallback(
    (element: Element, clientX: number, clientY: number, pointerId?: number) => {
      if (!onMoveElement) return;
      const world = worldRef.current;
      if (!world) return;
      const g = clientToGrid(clientX, clientY);
      if (!g) return;
      if (typeof pointerId === 'number') {
        world.setPointerCapture?.(pointerId);
      }
      const next: MoveDragState = {
        elementId: element.id,
        origGridX: element.gridX,
        origGridY: element.gridY,
        grabDx: g.gx - element.gridX,
        grabDy: g.gy - element.gridY,
        w: element.gridWidth,
        h: element.gridHeight,
        curGridX: element.gridX,
        curGridY: element.gridY,
        startClientX: clientX,
        startClientY: clientY,
        lastClientX: clientX,
        lastClientY: clientY,
      };
      setMoveBoth(next);
    },
    [clientToGrid, onMoveElement, setMoveBoth],
  );

  const beginElementMove = useCallback(
    (e: React.PointerEvent, element: Element) => {
      if (typeof e.button === 'number' && e.button !== 0) return;
      e.preventDefault();
      beginElementMoveAt(element, e.clientX, e.clientY, e.pointerId);
    },
    [beginElementMoveAt],
  );

  const beginElementMoveTouch = useCallback(
    (clientX: number, clientY: number, element: Element) => {
      beginElementMoveAt(element, clientX, clientY);
    },
    [beginElementMoveAt],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applyWheelAccum = () => {
      const acc = wheelAccumRef.current;
      wheelAccumRef.current = null;
      if (!acc) return;
      if (acc.kind === 'pan') {
        setView((v) => ({ ...v, tx: v.tx + acc.dx, ty: v.ty + acc.dy }));
        return;
      }
      const r = el.getBoundingClientRect();
      const containerRect = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
      setView((v) => {
        const nextScale = clamp(v.scale * acc.factor, MIN_MAP_SCALE, MAX_MAP_SCALE);
        return zoomToFocal(v, containerRect, acc.focalX, acc.focalY, nextScale);
      });
    };

    const flushWheel = () => {
      wheelRafRef.current = null;
      applyWheelAccum();
    };

    const onWheel = (wheelEvent: WheelEvent) => {
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) return;
      wheelEvent.preventDefault();

      let next: WheelAccum;
      if (wheelEvent.shiftKey) {
        const dx = wheelEvent.deltaX + wheelEvent.deltaY;
        next = { kind: 'pan', dx, dy: 0 };
      } else if (wheelEvent.altKey) {
        next = { kind: 'pan', dx: 0, dy: wheelEvent.deltaY };
      } else {
        const factor = Math.exp(-wheelEvent.deltaY * 0.001);
        next = {
          kind: 'zoom',
          factor,
          focalX: wheelEvent.clientX,
          focalY: wheelEvent.clientY,
        };
      }

      const prev = wheelAccumRef.current;
      if (prev && prev.kind !== next.kind) {
        applyWheelAccum();
      }

      const merged = wheelAccumRef.current;
      if (next.kind === 'pan') {
        wheelAccumRef.current = {
          kind: 'pan',
          dx: (merged?.kind === 'pan' ? merged.dx : 0) + next.dx,
          dy: (merged?.kind === 'pan' ? merged.dy : 0) + next.dy,
        };
      } else {
        wheelAccumRef.current = {
          kind: 'zoom',
          factor: (merged?.kind === 'zoom' ? merged.factor : 1) * next.factor,
          focalX: next.focalX,
          focalY: next.focalY,
        };
      }

      if (wheelRafRef.current == null) {
        wheelRafRef.current = requestAnimationFrame(flushWheel);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelRafRef.current != null) {
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = null;
      }
      wheelAccumRef.current = null;
    };
  }, []);

  const isSpacePanTargetIgnored = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return Boolean(el?.closest('input, textarea, select, [contenteditable="true"]'));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (isSpacePanTargetIgnored(e.target)) return;
      if (e.repeat) return;
      e.preventDefault();
      spaceHeldRef.current = true;
      setSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };
    const onBlur = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (readOnly || !elementOutlineId || !onMoveElement) return;
    const onKey = (e: KeyboardEvent) => {
      if (moveRef.current) return;
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('input, textarea, select, [contenteditable="true"]')) return;
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':
          dx = -1;
          break;
        case 'ArrowRight':
          dx = 1;
          break;
        case 'ArrowUp':
          dy = -1;
          break;
        case 'ArrowDown':
          dy = 1;
          break;
        default:
          return;
      }
      const hit = elements.find((it) => it.id === elementOutlineId);
      if (!hit) return;
      e.preventDefault();
      const rect = {
        gridX: hit.gridX + dx,
        gridY: hit.gridY + dy,
        gridWidth: hit.gridWidth,
        gridHeight: hit.gridHeight,
      };
      if (!isValidMovePosition(hit.id, rect, elements, gw, gh)) return;
      onMoveElement(hit.id, rect.gridX, rect.gridY);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, elementOutlineId, elements, gw, gh, onMoveElement]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (moveRef.current) return;
    if (effectiveTool === 'pan') {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      return;
    }
    if (spaceHeldRef.current) {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      setSpacePanPointerDown(true);
      return;
    }
    if (effectiveTool === 'move') {
      return;
    }
    if (effectiveTool === 'draw-polygon') {
      e.preventDefault();
      const w = clientToWorld(e.clientX, e.clientY);
      if (!w) return;
      const vx = w.x / CELL;
      const vy = w.y / CELL;
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) return;
      setPoly((prev) => {
        const draft = prev ?? [];
        if (draft.length >= 3) {
          const first = draft[0]!;
          const dist = Math.hypot(w.x - first.x * CELL, w.y - first.y * CELL);
          if (dist < POLYGON_CLOSE_RADIUS_PX) {
            queueMicrotask(() => completePolygonDraft(draft));
            return null;
          }
        }
        return [...draft, { x: vx, y: vy }];
      });
      return;
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const g = clientToGrid(e.clientX, e.clientY);
    if (!g) return;
    dragRef.current = {
      kind: 'select',
      ax: g.gx,
      ay: g.gy,
      bx: g.gx,
      by: g.gy,
      startClientX: e.clientX,
      startClientY: e.clientY,
    };
    setPreview(normalizeRect(g.gx, g.gy, g.gx, g.gy, gw, gh));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ms = moveRef.current;
    if (ms) {
      const g = clientToGrid(e.clientX, e.clientY);
      if (!g) return;
      const nx = clamp(g.gx - ms.grabDx, 0, gw - ms.w);
      const ny = clamp(g.gy - ms.grabDy, 0, gh - ms.h);
      const next = { ...ms, curGridX: nx, curGridY: ny, lastClientX: e.clientX, lastClientY: e.clientY };
      moveRef.current = next;
      setMove(next);
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'pan') {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      const lv = liveViewRef.current;
      liveViewRef.current = { ...lv, tx: lv.tx + dx, ty: lv.ty + dy };
      applyViewportTransform(liveViewRef.current);
      return;
    }
    const gridPos = clientToGrid(e.clientX, e.clientY);
    if (!gridPos) return;
    dragRef.current = { ...d, bx: gridPos.gx, by: gridPos.gy };
    setPreview(normalizeRect(d.ax, d.ay, gridPos.gx, gridPos.gy, gw, gh));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    if (!d) return;
    if (d.kind === 'pan') return;
    const dragPx = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
    if (dragPx < 6) return;
    const rect = normalizeRect(d.ax, d.ay, d.bx, d.by, gw, gh);
    if (rect) {
      onSelectionComplete(rect);
    }
  };

  const finishMoveAt = (pointerId: number | undefined, clientX: number, clientY: number) => {
    const ms = moveRef.current;
    if (!ms) return;
    setMoveBoth(null);
    try {
      if (typeof pointerId === 'number') {
        worldRef.current?.releasePointerCapture(pointerId);
      }
    } catch {
      /* ignore */
    }
    const rect = {
      gridX: ms.curGridX,
      gridY: ms.curGridY,
      gridWidth: ms.w,
      gridHeight: ms.h,
    };
    const valid = isValidMovePosition(ms.elementId, rect, elements, gw, gh);
    const dragPx = Math.hypot(clientX - ms.startClientX, clientY - ms.startClientY);
    if (dragPx < 6) {
      setMoveNudgeElementId(ms.elementId);
      return;
    }
    if (
      valid &&
      onMoveElement &&
      (ms.curGridX !== ms.origGridX || ms.curGridY !== ms.origGridY)
    ) {
      setMoveNudgeElementId(ms.elementId);
      onMoveElement(ms.elementId, ms.curGridX, ms.curGridY);
      return;
    }
    setMoveNudgeElementId(ms.elementId);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const finishingMove = moveRef.current !== null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    if (finishingMove) {
      finishMoveAt(e.pointerId, e.clientX, e.clientY);
      return;
    }
    const d = dragRef.current;
    if (d?.kind === 'pan') {
      dragRef.current = null;
      setSpacePanPointerDown(false);
      setView({ ...liveViewRef.current });
      return;
    }
    endDrag(e);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (effectiveTool !== 'draw-polygon') return;
    if (!polygonDraft || polygonDraft.length < 3) return;
    e.preventDefault();
    completePolygonDraft(polygonDraft);
  };

  const onPointerCancel = () => {
    const wasPan = dragRef.current?.kind === 'pan';
    moveRef.current = null;
    setMove(null);
    dragRef.current = null;
    setSpacePanPointerDown(false);
    setPreview(null);
    setPoly(null);
    if (wasPan) {
      setView({ ...liveViewRef.current });
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const r = containerEl.getBoundingClientRect();
      pinchRef.current = {
        dist,
        scale: liveViewRef.current.scale,
        containerRect: {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        },
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && moveRef.current) {
      e.preventDefault();
      const touch = e.touches[0]!;
      const ms = moveRef.current;
      const g = clientToGrid(touch.clientX, touch.clientY);
      if (!g) return;
      const nx = clamp(g.gx - ms.grabDx, 0, gw - ms.w);
      const ny = clamp(g.gy - ms.grabDy, 0, gh - ms.h);
      const next = { ...ms, curGridX: nx, curGridY: ny, lastClientX: touch.clientX, lastClientY: touch.clientY };
      moveRef.current = next;
      setMove(next);
      return;
    }
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      const nextScale = clamp(
        pinchRef.current.scale * ratio,
        MIN_MAP_SCALE,
        MAX_MAP_SCALE,
      );
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      const { containerRect } = pinchRef.current;
      const next = zoomToFocal(liveViewRef.current, containerRect, midX, midY, nextScale);
      liveViewRef.current = next;
      applyViewportTransform(next);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (moveRef.current && e.touches.length === 0) {
      const ms = moveRef.current;
      finishMoveAt(undefined, ms.lastClientX, ms.lastClientY);
      return;
    }
    const wasPinching = pinchRef.current !== null;
    pinchRef.current = null;
    if (wasPinching && e.touches.length < 2) {
      setView({ ...liveViewRef.current });
    }
  };

  const movingElement = move
    ? elements.find((a) => a.id === move.elementId)
    : undefined;
  const effectiveToolForElements: 'select' | 'pan' | 'move' =
    effectiveTool === 'draw-polygon' ? 'pan' : effectiveTool;
  const moveRect = move
    ? {
        gridX: move.curGridX,
        gridY: move.curGridY,
        gridWidth: move.w,
        gridHeight: move.h,
      }
    : null;
  const moveValid =
    move && moveRect
      ? isValidMovePosition(move.elementId, moveRect, elements, gw, gh)
      : false;
  const otherRects =
    move && moveRect
      ? elements.filter((a) => a.id !== move.elementId).map((a) => ({
          gridX: a.gridX,
          gridY: a.gridY,
          gridWidth: a.gridWidth,
          gridHeight: a.gridHeight,
        }))
      : [];
  const guides =
    move && moveRect ? computeAlignmentGuides(moveRect, otherRects) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly ? (
          <div className="flex rounded-lg border border-stone-200 bg-white p-0.5 text-sm">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium ${
                tool === 'select' ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600'
              }`}
              onClick={() => onToolChange('select')}
            >
              {t('garden.toolSelect')}
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium ${
                tool === 'draw-polygon' ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600'
              }`}
              onClick={() => onToolChange('draw-polygon')}
            >
              {t('garden.toolDrawPolygon')}
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium ${
                tool === 'move' ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600'
              }`}
              onClick={() => onToolChange('move')}
              disabled={!onMoveElement}
            >
              {t('garden.toolMove')}
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 font-medium ${
                tool === 'pan' ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600'
              }`}
              onClick={() => onToolChange('pan')}
            >
              {t('garden.toolPan')}
            </button>
          </div>
        ) : null}
        {!readOnly && tool === 'draw-polygon' && polygonDraft && polygonDraft.length > 0 ? (
          <div
            className="flex rounded-lg border border-stone-200 bg-white p-0.5 text-sm"
            data-testid="map-polygon-draft-actions"
          >
            {polygonDraft.length >= 3 ? (
              <button
                type="button"
                data-testid="map-polygon-finish"
                className="rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white"
                onClick={() => completePolygonDraft(polygonDraft)}
              >
                {t('garden.polygonFinish')}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="map-polygon-clear"
              className="rounded-md px-3 py-1.5 font-medium text-stone-600"
              onClick={() => setPoly(null)}
            >
              {t('garden.polygonClear')}
            </button>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <span className="sr-only">{t('garden.mapLayer')}</span>
          <select
            data-testid="map-layer-selector"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-normal text-stone-700"
            value={layer}
            onChange={(e) => onLayerChange?.(e.target.value as MapLayer)}
          >
            <option value="element-type">{t('elements.layers.elementType')}</option>
            <option value="status">{t('garden.layers.status')}</option>
            <option value="plan-vs-actual">{t('garden.layers.planVsActual')}</option>
            <option value="historical">{t('garden.layers.historical')}</option>
          </select>
        </label>
        {toolbarAddon ? <div className="flex items-center gap-2">{toolbarAddon}</div> : null}
        {!readOnly ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm">
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              data-testid="map-background-file-input"
              onChange={onBackgroundFileSelected}
            />
            <button
              type="button"
              data-testid="map-background-upload"
              disabled={bgActionBusy}
              className="rounded-md px-2 py-1 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              onClick={() => bgFileInputRef.current?.click()}
            >
              {bgActionBusy ? t('garden.backgroundUploading') : t('garden.backgroundUpload')}
            </button>
            {backgroundImageUrl ? (
              <button
                type="button"
                data-testid="map-background-remove"
                disabled={bgActionBusy}
                className="rounded-md px-2 py-1 font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                onClick={() => void onRemoveBackground()}
              >
                {t('garden.backgroundRemove')}
              </button>
            ) : null}
            {bgActionError ? (
              <span className="text-xs text-red-600" role="alert">
                {bgActionError}
              </span>
            ) : null}
          </div>
        ) : null}
        {backgroundImageUrl ? (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <span className="font-medium">{t('garden.backgroundOpacity')}</span>
            <input
              data-testid="map-background-opacity"
              type="range"
              min={0}
              max={100}
              value={bgOpacityPct}
              onChange={(e) => setBgOpacityPct(Number(e.target.value))}
            />
            <span className="tabular-nums text-stone-600">{bgOpacityPct}%</span>
          </label>
        ) : null}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            onClick={() =>
              setView((v) => ({
                ...v,
                scale: clamp(v.scale / 1.15, MIN_MAP_SCALE, MAX_MAP_SCALE),
              }))
            }
            aria-label={t('garden.zoomOut')}
          >
            −
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            onClick={() =>
              setView((v) => ({
                ...v,
                scale: clamp(v.scale * 1.15, MIN_MAP_SCALE, MAX_MAP_SCALE),
              }))
            }
            aria-label={t('garden.zoomIn')}
          >
            +
          </button>
        </div>
      </div>

      {layer !== 'element-type' && legendItems && legendItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-700" data-testid="map-layer-legend">
          <span className="font-medium">{t('garden.legend')}</span>
          {legendItems.map((it) => (
            <span key={it.label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-stone-200">
              <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/10" style={{ backgroundColor: it.color }} />
              <span>{it.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 touch-none"
        data-testid="grid-map-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <div
          ref={viewportRef}
          data-testid="grid-map-viewport"
          className="absolute left-1/2 top-1/2"
        >
          <svg
            ref={worldRef}
            className="bg-white shadow-sm"
            style={{
              cursor: spacePanPointerDown ? 'grabbing' : spaceHeld ? 'grab' : undefined,
            }}
            width={worldW}
            height={worldH}
            viewBox={`0 0 ${worldW} ${worldH}`}
            role="grid"
            aria-label={t('garden.gridAriaLabel', { width: gw, height: gh })}
            data-testid="grid-map"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onDoubleClick={onDoubleClick}
          >
            {bgObjectUrl ? (
              <image
                data-testid="map-background-image"
                href={bgObjectUrl}
                x={0}
                y={0}
                width={worldW}
                height={worldH}
                preserveAspectRatio="xMidYMid slice"
                opacity={bgOpacityPct / 100}
                pointerEvents="none"
              />
            ) : null}
            <GridMapSvgGridLayer worldW={worldW} worldH={worldH} cell={CELL} />

            {historicalGhostElements?.map((ga) => (
              <rect
                key={ga.id}
                data-testid="map-historical-ghost-area"
                x={ga.gridX * CELL}
                y={ga.gridY * CELL}
                width={ga.gridWidth * CELL}
                height={ga.gridHeight * CELL}
                fill="rgba(231,229,228,0.1)"
                stroke="rgba(68,64,60,0.6)"
                strokeWidth={2}
                strokeDasharray="6 4"
                pointerEvents="none"
                aria-label={t('elements.historicalGhostAria', { name: ga.name })}
              />
            ))}

            <GridMapAreasSvg
              elements={elements}
              cell={CELL}
              elementIdsWithPlantings={elementIdsWithPlantings}
              elementColorById={elementColorById}
              elementBadgeById={elementBadgeById}
              elementOverlayBadgesById={elementOverlayBadgesById}
              selectedElementId={elementOutlineId}
              effectiveTool={effectiveToolForElements}
              readOnly={readOnly}
              draggingElementId={move?.elementId ?? null}
              onSelectElement={onSelectElement}
              onBeginElementMove={onMoveElement ? beginElementMove : undefined}
              onBeginElementMoveTouch={onMoveElement ? beginElementMoveTouch : undefined}
            />

            {move && movingElement ? (
              movingElement.shape?.kind === 'polygon' ? (
                <polygon
                  data-testid="map-move-ghost"
                  points={polygonPointsPx(movingElement.shape.vertices, CELL)}
                  fill={`${movingElement.color}99`}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  pointerEvents="none"
                />
              ) : (
                <rect
                  data-testid="map-move-ghost"
                  x={move.origGridX * CELL}
                  y={move.origGridY * CELL}
                  width={move.w * CELL}
                  height={move.h * CELL}
                  fill={`${movingElement.color}99`}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  pointerEvents="none"
                />
              )
            ) : null}

            {move && movingElement ? (
              movingElement.shape?.kind === 'polygon' ? (
                <polygon
                  data-testid="map-move-preview"
                  data-valid={moveValid ? 'true' : 'false'}
                  points={polygonPointsPx(
                    translateVertices(movingElement.shape.vertices, move.curGridX - move.origGridX, move.curGridY - move.origGridY),
                    CELL,
                  )}
                  fill="rgba(0,0,0,0.08)"
                  stroke={moveValid ? '#059669' : '#dc2626'}
                  strokeWidth={2}
                  pointerEvents="none"
                />
              ) : (
                <rect
                  data-testid="map-move-preview"
                  data-valid={moveValid ? 'true' : 'false'}
                  x={move.curGridX * CELL}
                  y={move.curGridY * CELL}
                  width={move.w * CELL}
                  height={move.h * CELL}
                  fill="rgba(0,0,0,0.08)"
                  stroke={moveValid ? '#059669' : '#dc2626'}
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )
            ) : null}

            {guides
              ? guides.vertical.map((x) => (
                  <line
                    key={`gv-${x}`}
                    data-testid="map-alignment-guide-vertical"
                    data-grid-line={x}
                    x1={x * CELL}
                    y1={0}
                    x2={x * CELL}
                    y2={worldH}
                    stroke="rgba(244,63,94,0.8)"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                ))
              : null}
            {guides
              ? guides.horizontal.map((y) => (
                  <line
                    key={`gh-${y}`}
                    data-testid="map-alignment-guide-horizontal"
                    data-grid-line={y}
                    x1={0}
                    y1={y * CELL}
                    x2={worldW}
                    y2={y * CELL}
                    stroke="rgba(244,63,94,0.8)"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                ))
              : null}

            {preview && (
              <rect
                data-testid="map-selection-preview"
                x={preview.gridX * CELL}
                y={preview.gridY * CELL}
                width={preview.gridWidth * CELL}
                height={preview.gridHeight * CELL}
                fill="rgba(52,211,153,0.2)"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            )}

            {effectiveTool === 'draw-polygon' && polygonDraft && polygonDraft.length > 0 ? (
              <g data-testid="map-polygon-draft" pointerEvents="none">
                <polyline
                  points={polygonPreviewPointsPx}
                  fill="none"
                  stroke="#059669"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                {polygonDraft.map((p, idx) => (
                  <circle
                    key={`${idx}-${p.x}-${p.y}`}
                    cx={p.x * CELL}
                    cy={p.y * CELL}
                    r={idx === 0 && polygonDraft.length >= 3 ? 7 : 4}
                    fill={idx === 0 && polygonDraft.length >= 3 ? '#10b981' : '#34d399'}
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={2}
                    data-testid={idx === 0 ? 'map-polygon-first-vertex' : undefined}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        </div>
      </div>
    </div>
  );
}
