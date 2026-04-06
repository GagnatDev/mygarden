import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area, Garden } from '../api/gardens';
import type { AreaShape } from '../api/gardens';
import { computeAlignmentGuides } from './alignment-guides';
import { GridMapAreasSvg } from './GridMapAreasSvg';
import { GridMapSvgGridLayer } from './GridMapSvgGridLayer';
import { isValidMovePosition } from './grid-rect';
import {
  polygonPointsPx,
  polygonVerticesToGridBBox,
  translateVertices,
} from './polygon-helpers';

/** CSS pixels per grid cell (world space). Exported for tests. */
export const CELL = 28;

export interface GridSelection {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

export type AreaDraftSelection = GridSelection & { shape?: AreaShape };

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
export type MapLayer = 'area-type' | 'plan-vs-actual' | 'status' | 'historical';

export interface MapLegendItem {
  label: string;
  color: string;
}

export interface HistoricalGhostArea {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

interface MoveDragState {
  areaId: string;
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
  garden: Garden;
  areas: Area[];
  /** Area IDs that have at least one planting (subtle map indicator only). */
  areaIdsWithPlantings?: ReadonlySet<string>;
  /** Controls how areas are colored/badged. */
  layer?: MapLayer;
  onLayerChange?: (layer: MapLayer) => void;
  /** Optional per-area background color overrides for the active layer. */
  areaColorById?: Readonly<Record<string, string>>;
  /** Optional per-area badge for the active layer. */
  areaBadgeById?: Readonly<
    Record<string, { text: string; toneClass: string }>
  >;
  /** Optional per-area overlay badges (e.g. historical plant names). */
  areaOverlayBadgesById?: Readonly<Record<string, string[]>>;
  /** Legend items displayed under the toolbar for non-default layers. */
  legendItems?: readonly MapLegendItem[];
  /** Historical comparison: show deleted areas as dashed ghosts. */
  historicalGhostAreas?: readonly HistoricalGhostArea[];
  /** Optional UI fragment shown in the toolbar (e.g. season picker for historical layer). */
  toolbarAddon?: React.ReactNode;
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  onSelectionComplete: (sel: AreaDraftSelection) => void;
  /** Reposition an existing area (grid top-left); parent persists via API. */
  onMoveArea?: (areaId: string, gridX: number, gridY: number) => void;
  tool: MapTool;
  onToolChange: (t: MapTool) => void;
  /** When true, map is view-only (pan/zoom only, no new selections or area clicks). */
  readOnly?: boolean;
}

export function GridMapEditor({
  garden,
  areas,
  areaIdsWithPlantings,
  layer = 'area-type',
  onLayerChange,
  areaColorById,
  areaBadgeById,
  areaOverlayBadgesById,
  legendItems,
  historicalGhostAreas,
  toolbarAddon,
  selectedAreaId,
  onSelectArea,
  onSelectionComplete,
  onMoveArea,
  tool,
  onToolChange,
  readOnly = false,
}: GridMapEditorProps) {
  const { t } = useTranslation();
  const effectiveTool: MapTool = readOnly ? 'pan' : tool;
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 });
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
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const [preview, setPreview] = useState<GridSelection | null>(null);
  const moveRef = useRef<MoveDragState | null>(null);
  const [move, setMove] = useState<MoveDragState | null>(null);
  const [poly, setPoly] = useState<Array<{ x: number; y: number }> | null>(null);

  const gw = garden.gridWidth;
  const gh = garden.gridHeight;
  const worldW = gw * CELL;
  const worldH = gh * CELL;

  const clientToGrid = useCallback(
    (clientX: number, clientY: number): { gx: number; gy: number } | null => {
      const el = worldRef.current;
      const box = el?.getBoundingClientRect();
      if (!box) return null;
      const x = (clientX - box.left) / view.scale;
      const y = (clientY - box.top) / view.scale;
      const gx = Math.floor(x / CELL);
      const gy = Math.floor(y / CELL);
      if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null;
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return null;
      return { gx, gy };
    },
    [gw, gh, view.scale],
  );

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const el = worldRef.current;
      const box = el?.getBoundingClientRect();
      if (!box) return null;
      const x = (clientX - box.left) / view.scale;
      const y = (clientY - box.top) / view.scale;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      if (x < 0 || y < 0 || x > worldW || y > worldH) return null;
      return { x, y };
    },
    [view.scale, worldW, worldH],
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

  const beginAreaMoveAt = useCallback(
    (area: Area, clientX: number, clientY: number, pointerId?: number) => {
      if (!onMoveArea) return;
      const world = worldRef.current;
      if (!world) return;
      const g = clientToGrid(clientX, clientY);
      if (!g) return;
      if (typeof pointerId === 'number') {
        world.setPointerCapture?.(pointerId);
      }
      const next: MoveDragState = {
        areaId: area.id,
        origGridX: area.gridX,
        origGridY: area.gridY,
        grabDx: g.gx - area.gridX,
        grabDy: g.gy - area.gridY,
        w: area.gridWidth,
        h: area.gridHeight,
        curGridX: area.gridX,
        curGridY: area.gridY,
        startClientX: clientX,
        startClientY: clientY,
        lastClientX: clientX,
        lastClientY: clientY,
      };
      setMoveBoth(next);
    },
    [clientToGrid, onMoveArea, setMoveBoth],
  );

  const beginAreaMove = useCallback(
    (e: React.PointerEvent, area: Area) => {
      if (typeof e.button === 'number' && e.button !== 0) return;
      e.preventDefault();
      beginAreaMoveAt(area, e.clientX, e.clientY, e.pointerId);
    },
    [beginAreaMoveAt],
  );

  const beginAreaMoveTouch = useCallback(
    (clientX: number, clientY: number, area: Area) => {
      beginAreaMoveAt(area, clientX, clientY);
    },
    [beginAreaMoveAt],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (wheelEvent: WheelEvent) => {
      wheelEvent.preventDefault();
      const factor = Math.exp(-wheelEvent.deltaY * 0.001);
      setView((v) => {
        const nextScale = clamp(v.scale * factor, 0.35, 4);
        return { ...v, scale: nextScale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (readOnly || !selectedAreaId || !onMoveArea) return;
    const onKey = (e: KeyboardEvent) => {
      if (moveRef.current) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
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
      const area = areas.find((a) => a.id === selectedAreaId);
      if (!area) return;
      e.preventDefault();
      const rect = {
        gridX: area.gridX + dx,
        gridY: area.gridY + dy,
        gridWidth: area.gridWidth,
        gridHeight: area.gridHeight,
      };
      if (!isValidMovePosition(area.id, rect, areas, gw, gh)) return;
      onMoveArea(area.id, rect.gridX, rect.gridY);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, selectedAreaId, areas, gw, gh, onMoveArea]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (moveRef.current) return;
    if (effectiveTool === 'pan') {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
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
      setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
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
    const valid = isValidMovePosition(ms.areaId, rect, areas, gw, gh);
    const dragPx = Math.hypot(clientX - ms.startClientX, clientY - ms.startClientY);
    if (dragPx < 6) {
      onSelectArea(ms.areaId);
      return;
    }
    if (
      valid &&
      onMoveArea &&
      (ms.curGridX !== ms.origGridX || ms.curGridY !== ms.origGridY)
    ) {
      // Select on release (not on drag start) to avoid opening the detail panel mid-drag on touch.
      onSelectArea(ms.areaId);
      onMoveArea(ms.areaId, ms.curGridX, ms.curGridY);
      return;
    }
    // Invalid move or unchanged position: still select on release so keyboard nudges/editing is easy.
    onSelectArea(ms.areaId);
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
    moveRef.current = null;
    setMove(null);
    dragRef.current = null;
    setPreview(null);
    setPoly(null);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale: view.scale };
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
      const next = clamp(pinchRef.current.scale * ratio, 0.35, 4);
      setView((v) => ({ ...v, scale: next }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (moveRef.current && e.touches.length === 0) {
      const ms = moveRef.current;
      finishMoveAt(undefined, ms.lastClientX, ms.lastClientY);
      return;
    }
    pinchRef.current = null;
  };

  const movingArea = move
    ? areas.find((a) => a.id === move.areaId)
    : undefined;
  const effectiveToolForAreas: 'select' | 'pan' | 'move' =
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
      ? isValidMovePosition(move.areaId, moveRect, areas, gw, gh)
      : false;
  const otherRects =
    move && moveRect
      ? areas.filter((a) => a.id !== move.areaId).map((a) => ({
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
              disabled={!onMoveArea}
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
            <option value="area-type">{t('garden.layers.areaType')}</option>
            <option value="status">{t('garden.layers.status')}</option>
            <option value="plan-vs-actual">{t('garden.layers.planVsActual')}</option>
            <option value="historical">{t('garden.layers.historical')}</option>
          </select>
        </label>
        {toolbarAddon ? <div className="flex items-center gap-2">{toolbarAddon}</div> : null}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale / 1.15, 0.35, 4) }))}
            aria-label={t('garden.zoomOut')}
          >
            −
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
            onClick={() => setView((v) => ({ ...v, scale: clamp(v.scale * 1.15, 0.35, 4) }))}
            aria-label={t('garden.zoomIn')}
          >
            +
          </button>
        </div>
      </div>

      {layer !== 'area-type' && legendItems && legendItems.length > 0 ? (
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
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(calc(-50% + ${view.tx}px), calc(-50% + ${view.ty}px)) scale(${view.scale})`,
            transformOrigin: 'center center',
          }}
        >
          <svg
            ref={worldRef}
            className="bg-white shadow-sm"
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
            <GridMapSvgGridLayer worldW={worldW} worldH={worldH} cell={CELL} />

            {historicalGhostAreas?.map((ga) => (
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
                aria-label={t('garden.historicalGhostAreaAria', { name: ga.name })}
              />
            ))}

            <GridMapAreasSvg
              areas={areas}
              cell={CELL}
              areaIdsWithPlantings={areaIdsWithPlantings}
              areaColorById={areaColorById}
              areaBadgeById={areaBadgeById}
              areaOverlayBadgesById={areaOverlayBadgesById}
              selectedAreaId={selectedAreaId}
              effectiveTool={effectiveToolForAreas}
              readOnly={readOnly}
              draggingAreaId={move?.areaId ?? null}
              onSelectArea={onSelectArea}
              onBeginAreaMove={onMoveArea ? beginAreaMove : undefined}
              onBeginAreaMoveTouch={onMoveArea ? beginAreaMoveTouch : undefined}
            />

            {move && movingArea ? (
              movingArea.shape?.kind === 'polygon' ? (
                <polygon
                  data-testid="map-move-ghost"
                  points={polygonPointsPx(movingArea.shape.vertices, CELL)}
                  fill={`${movingArea.color}99`}
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
                  fill={`${movingArea.color}99`}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  pointerEvents="none"
                />
              )
            ) : null}

            {move && movingArea ? (
              movingArea.shape?.kind === 'polygon' ? (
                <polygon
                  data-testid="map-move-preview"
                  data-valid={moveValid ? 'true' : 'false'}
                  points={polygonPointsPx(
                    translateVertices(movingArea.shape.vertices, move.curGridX - move.origGridX, move.curGridY - move.origGridY),
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
