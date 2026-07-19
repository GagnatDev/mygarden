import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/areas';
import {
  beginPress,
  classifyRelease,
  DOUBLE_TAP_MS,
  DRAG_THRESHOLD_PX,
  isDoubleTap,
  LONG_PRESS_MS,
  movePress,
  TAP_MOVE_SLOP_PX,
  type PressState,
  type TapRecord,
} from './gesture-helpers';
import {
  computeOverviewTiles,
  computeOverviewWorld,
  dragTilePositionM,
  OVERVIEW_PX_PER_METER,
  type OverviewTile,
} from './overview-helpers';
import {
  applyTwoFingerGesture,
  computeFitView,
  type ContainerRect,
  MAX_MAP_SCALE,
  MIN_MAP_SCALE,
  type MapView,
  zoomToFocal,
} from './view-helpers';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

interface TileDragState {
  areaId: string;
  origXM: number;
  origYM: number;
  curXM: number;
  curYM: number;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
}

export interface GardenOverviewMapProps {
  areas: Area[];
  /** Tap/click on a tile (or Enter on a focused tile) opens the area's map page. */
  onOpenArea: (areaId: string) => void;
  /** A tile was dropped at a new position (garden meters); parent persists via PATCH. */
  onPlaceArea: (areaId: string, overviewX: number, overviewY: number) => void;
}

/**
 * Garden overview map (F2): every area rendered to scale in one meters-based
 * coordinate space, navigated with the browse gesture model (pan, pinch, fit)
 * and arranged by dragging tiles (long-press first on touch). Reuses the
 * GridMapEditor transform model: a centered viewport with translate+scale,
 * per-frame gestures mutating the DOM directly and flushing to state on end.
 */
export const GardenOverviewMap = memo(function GardenOverviewMap({
  areas,
  onOpenArea,
  onPlaceArea,
}: GardenOverviewMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<SVGSVGElement>(null);

  const tiles = useMemo(() => computeOverviewTiles(areas), [areas]);
  const world = useMemo(() => computeOverviewWorld(tiles), [tiles]);

  const [view, setView] = useState<MapView>({ tx: 0, ty: 0, scale: 1 });
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

  const minScaleRef = useRef(MIN_MAP_SCALE);
  /** True once the user pans/zooms manually; resizes and drops then keep their view. */
  const viewTouchedRef = useRef(false);

  const applyFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const fit = computeFitView(world.widthPx, world.heightPx, r.width, r.height);
    minScaleRef.current = Math.min(MIN_MAP_SCALE, fit.scale);
    viewTouchedRef.current = false;
    setView(fit);
  }, [world.widthPx, world.heightPx]);

  /**
   * Fit before first paint, and keep the view coherent when the world's
   * bounding box changes (a tile drop can grow/shrink it): untouched views
   * re-fit; touched views get tx/ty compensated so the content under the
   * viewport does not jump when the world's center moves.
   */
  const prevWorldCenterRef = useRef<{ xM: number; yM: number } | null>(null);
  useLayoutEffect(() => {
    const centerM = {
      xM: world.originXM + world.widthM / 2,
      yM: world.originYM + world.heightM / 2,
    };
    const prev = prevWorldCenterRef.current;
    prevWorldCenterRef.current = centerM;
    if (!viewTouchedRef.current || !prev) {
      applyFitView();
      return;
    }
    const el = containerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const fit = computeFitView(world.widthPx, world.heightPx, r.width, r.height);
        minScaleRef.current = Math.min(MIN_MAP_SCALE, fit.scale);
      }
    }
    const dxM = centerM.xM - prev.xM;
    const dyM = centerM.yM - prev.yM;
    if (dxM === 0 && dyM === 0) return;
    setView((v) => ({
      ...v,
      tx: v.tx + dxM * OVERVIEW_PX_PER_METER * v.scale,
      ty: v.ty + dyM * OVERVIEW_PX_PER_METER * v.scale,
    }));
  }, [world, applyFitView]);

  /** Re-fit on container resize until the user pans/zooms; always track min zoom. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const fit = computeFitView(world.widthPx, world.heightPx, r.width, r.height);
      minScaleRef.current = Math.min(MIN_MAP_SCALE, fit.scale);
      if (!viewTouchedRef.current) setView(fit);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [world.widthPx, world.heightPx]);

  const flushLiveView = useCallback(() => {
    setView({ ...liveViewRef.current });
  }, []);

  /** Both open paths (pointer and touch) fire in real browsers; navigate once. */
  const lastOpenRef = useRef(0);
  const openArea = useCallback(
    (areaId: string) => {
      const now = Date.now();
      if (now - lastOpenRef.current < 500) return;
      lastOpenRef.current = now;
      onOpenArea(areaId);
    },
    [onOpenArea],
  );

  const dragRef = useRef<{
    kind: 'pan';
    x: number;
    y: number;
    startClientX: number;
    startClientY: number;
    /** Tile under the finger/pointer at press time; a sub-threshold release opens it. */
    pressedAreaId: string | null;
  } | null>(null);

  const tileDragRef = useRef<TileDragState | null>(null);
  const [tileDrag, setTileDrag] = useState<TileDragState | null>(null);
  const draggedTileNodeRef = useRef<SVGGElement | null>(null);

  const setTileDragBoth = useCallback((next: TileDragState | null) => {
    // Per-frame drag offsets are written straight to the DOM transform (the
    // editor's E1 convention). React never renders that attribute, so clear it
    // when the drag ends or the tile would keep a stale offset on top of the
    // position React renders next. The node must NOT remount mid-gesture:
    // touch events keep targeting the original element for the whole touch.
    if (next === null) {
      draggedTileNodeRef.current?.removeAttribute('transform');
      draggedTileNodeRef.current = null;
    }
    tileDragRef.current = next;
    setTileDrag(next);
  }, []);

  /** Apply one tile-drag frame straight to the mounted tile group (E1 pattern). */
  const applyTileDragFrame = useCallback((td: TileDragState) => {
    const node = draggedTileNodeRef.current;
    if (!node) return;
    node.setAttribute(
      'transform',
      `translate(${(td.curXM - td.origXM) * OVERVIEW_PX_PER_METER}, ${(td.curYM - td.origYM) * OVERVIEW_PX_PER_METER})`,
    );
  }, []);

  const beginTileDrag = useCallback(
    (tile: OverviewTile, clientX: number, clientY: number, pointerId?: number) => {
      if (typeof pointerId === 'number') {
        worldRef.current?.setPointerCapture?.(pointerId);
      }
      setTileDragBoth({
        areaId: tile.areaId,
        origXM: tile.xM,
        origYM: tile.yM,
        curXM: tile.xM,
        curYM: tile.yM,
        startClientX: clientX,
        startClientY: clientY,
        lastClientX: clientX,
        lastClientY: clientY,
      });
    },
    [setTileDragBoth],
  );

  const moveTileDragTo = useCallback(
    (clientX: number, clientY: number) => {
      const td = tileDragRef.current;
      if (!td) return;
      const pos = dragTilePositionM(
        td.origXM,
        td.origYM,
        clientX - td.startClientX,
        clientY - td.startClientY,
        liveViewRef.current.scale,
      );
      const next = { ...td, curXM: pos.xM, curYM: pos.yM, lastClientX: clientX, lastClientY: clientY };
      tileDragRef.current = next;
      applyTileDragFrame(next);
    },
    [applyTileDragFrame],
  );

  const finishTileDrag = useCallback(
    (pointerId: number | undefined, clientX: number, clientY: number) => {
      const td = tileDragRef.current;
      if (!td) return;
      setTileDragBoth(null);
      try {
        if (typeof pointerId === 'number') {
          worldRef.current?.releasePointerCapture(pointerId);
        }
      } catch {
        /* ignore */
      }
      const dragPx = Math.hypot(clientX - td.startClientX, clientY - td.startClientY);
      if (dragPx < DRAG_THRESHOLD_PX) {
        openArea(td.areaId);
        return;
      }
      onPlaceArea(td.areaId, td.curXM, td.curYM);
    },
    [setTileDragBoth, openArea, onPlaceArea],
  );

  /** Long-press tracking for touch presses on tiles (R2, R9). */
  const longPressRef = useRef<{ tile: OverviewTile; press: PressState } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelLongPress = useCallback(() => {
    longPressRef.current = null;
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  /** Anchor of an active two-finger pan+zoom gesture. */
  const twoFingerRef = useRef<{
    a: { id: number; x: number; y: number };
    b: { id: number; x: number; y: number };
    containerRect: ContainerRect;
  } | null>(null);

  const handleTileTouchStart = useCallback(
    (clientX: number, clientY: number, tile: OverviewTile) => {
      cancelLongPress();
      longPressRef.current = { tile, press: beginPress(clientX, clientY, Date.now()) };
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        const lp = longPressRef.current;
        if (!lp || lp.press.intent !== 'pending') return;
        if (tileDragRef.current || twoFingerRef.current) return;
        longPressRef.current = null;
        // A browse pan candidate may be live for this same finger; the drag takes over.
        if (dragRef.current?.kind === 'pan') {
          dragRef.current = null;
          flushLiveView();
        }
        beginTileDrag(lp.tile, lp.press.lastX, lp.press.lastY);
      }, LONG_PRESS_MS);
    },
    [cancelLongPress, beginTileDrag, flushLiveView],
  );

  const handleTilePointerDown = useCallback(
    (e: React.PointerEvent, tile: OverviewTile) => {
      if (typeof e.button === 'number' && e.button !== 0) return;
      if (tileDragRef.current) return;
      if (e.pointerType === 'touch') {
        // Touch: pan until the long-press timer promotes this press to a drag.
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = {
          kind: 'pan',
          x: e.clientX,
          y: e.clientY,
          startClientX: e.clientX,
          startClientY: e.clientY,
          pressedAreaId: tile.areaId,
        };
        return;
      }
      e.preventDefault();
      beginTileDrag(tile, e.clientX, e.clientY, e.pointerId);
    },
    [beginTileDrag],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (tileDragRef.current) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      kind: 'pan',
      x: e.clientX,
      y: e.clientY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      pressedAreaId: null,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (tileDragRef.current) {
      moveTileDragTo(e.clientX, e.clientY);
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    dragRef.current = { ...d, x: e.clientX, y: e.clientY };
    viewTouchedRef.current = true;
    const lv = liveViewRef.current;
    liveViewRef.current = { ...lv, tx: lv.tx + dx, ty: lv.ty + dy };
    applyViewportTransform(liveViewRef.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    if (tileDragRef.current) {
      finishTileDrag(e.pointerId, e.clientX, e.clientY);
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    flushLiveView();
    const dragPx = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
    if (dragPx < DRAG_THRESHOLD_PX && d.pressedAreaId) {
      openArea(d.pressedAreaId);
    }
  };

  const onPointerCancel = () => {
    const wasPan = dragRef.current?.kind === 'pan';
    setTileDragBoth(null);
    dragRef.current = null;
    cancelLongPress();
    if (wasPan) flushLiveView();
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const targetEl = e.target as globalThis.Element | null;
    if (targetEl?.closest('[data-overview-tile]')) return;
    e.preventDefault();
    applyFitView();
  };

  /** Single-finger tap in progress (background only); feeds double-tap-to-fit. */
  const tapCandidateRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastTapRef = useRef<TapRecord | null>(null);

  const anchorTwoFingerGesture = useCallback(
    (a: { identifier: number; clientX: number; clientY: number }, b: typeof a) => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const r = containerEl.getBoundingClientRect();
      viewTouchedRef.current = true;
      twoFingerRef.current = {
        a: { id: a.identifier, x: a.clientX, y: a.clientY },
        b: { id: b.identifier, x: b.clientX, y: b.clientY },
        containerRect: { left: r.left, top: r.top, width: r.width, height: r.height },
      };
    },
    [],
  );

  /** A second finger cancels any single-finger gesture in progress (B2). */
  const cancelSingleTouchGestures = useCallback(() => {
    cancelLongPress();
    if (tileDragRef.current) setTileDragBoth(null);
    const d = dragRef.current;
    if (d) {
      dragRef.current = null;
      flushLiveView();
    }
  }, [cancelLongPress, setTileDragBoth, flushLiveView]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      const targetEl = e.target as globalThis.Element | null;
      tapCandidateRef.current = !targetEl?.closest('[data-overview-tile]')
        ? { time: Date.now(), x: touch.clientX, y: touch.clientY }
        : null;
      return;
    }
    tapCandidateRef.current = null;
    lastTapRef.current = null;
    cancelSingleTouchGestures();
    if (e.touches.length === 2) {
      anchorTwoFingerGesture(e.touches[0]!, e.touches[1]!);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const cand = tapCandidateRef.current;
    if (cand && e.touches.length === 1) {
      const touch = e.touches[0]!;
      if (Math.hypot(touch.clientX - cand.x, touch.clientY - cand.y) > TAP_MOVE_SLOP_PX) {
        tapCandidateRef.current = null;
      }
    }
    const lp = longPressRef.current;
    if (lp && e.touches.length === 1 && !tileDragRef.current) {
      const touch = e.touches[0]!;
      const nextPress = movePress(lp.press, touch.clientX, touch.clientY);
      if (nextPress.intent === 'drag') {
        // Finger left the slop before the long-press fired: it is a pan, not a drag.
        cancelLongPress();
      } else {
        longPressRef.current = { tile: lp.tile, press: nextPress };
      }
    }
    if (e.touches.length === 1 && tileDragRef.current) {
      e.preventDefault();
      const touch = e.touches[0]!;
      moveTileDragTo(touch.clientX, touch.clientY);
      return;
    }
    if (e.touches.length === 2) {
      e.preventDefault();
      cancelSingleTouchGestures();
      const [t0, t1] = [e.touches[0]!, e.touches[1]!];
      const g = twoFingerRef.current;
      if (!g) {
        anchorTwoFingerGesture(t0, t1);
        return;
      }
      const ta = t0.identifier === g.a.id ? t0 : t1.identifier === g.a.id ? t1 : null;
      const tb = t1.identifier === g.b.id ? t1 : t0.identifier === g.b.id ? t0 : null;
      if (!ta || !tb || ta === tb) {
        anchorTwoFingerGesture(t0, t1);
        return;
      }
      const next = applyTwoFingerGesture(
        liveViewRef.current,
        g.containerRect,
        { a: { x: g.a.x, y: g.a.y }, b: { x: g.b.x, y: g.b.y } },
        { a: { x: ta.clientX, y: ta.clientY }, b: { x: tb.clientX, y: tb.clientY } },
        minScaleRef.current,
      );
      g.a = { id: g.a.id, x: ta.clientX, y: ta.clientY };
      g.b = { id: g.b.id, x: tb.clientX, y: tb.clientY };
      liveViewRef.current = next;
      applyViewportTransform(next);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (tileDragRef.current && e.touches.length === 0) {
      const td = tileDragRef.current;
      finishTileDrag(undefined, td.lastClientX, td.lastClientY);
      return;
    }
    const lp = longPressRef.current;
    if (lp && e.touches.length === 0) {
      cancelLongPress();
      if (classifyRelease(lp.press, lp.press.lastX, lp.press.lastY) === 'tap') {
        openArea(lp.tile.areaId);
      }
    }
    const wasPinching = twoFingerRef.current !== null;
    twoFingerRef.current = null;
    if (e.touches.length >= 2) {
      anchorTwoFingerGesture(e.touches[0]!, e.touches[1]!);
    } else if (wasPinching) {
      flushLiveView();
    }
    const cand = tapCandidateRef.current;
    if (cand && e.touches.length === 0) {
      tapCandidateRef.current = null;
      const now = Date.now();
      if (now - cand.time < DOUBLE_TAP_MS) {
        const tap: TapRecord = { time: now, x: cand.x, y: cand.y };
        if (isDoubleTap(lastTapRef.current, tap)) {
          lastTapRef.current = null;
          applyFitView();
        } else {
          lastTapRef.current = tap;
        }
      } else {
        lastTapRef.current = null;
      }
    }
  };

  const onTouchCancel = () => {
    cancelLongPress();
    cancelSingleTouchGestures();
    tapCandidateRef.current = null;
    if (twoFingerRef.current) {
      twoFingerRef.current = null;
      flushLiveView();
    }
  };

  /** Wheel: zoom toward the cursor; shift/alt wheel pans (matches the editor). */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (wheelEvent: WheelEvent) => {
      if (wheelEvent.ctrlKey || wheelEvent.metaKey) return;
      wheelEvent.preventDefault();
      viewTouchedRef.current = true;
      if (wheelEvent.shiftKey || wheelEvent.altKey) {
        const dx = wheelEvent.shiftKey ? wheelEvent.deltaX + wheelEvent.deltaY : 0;
        const dy = wheelEvent.shiftKey ? 0 : wheelEvent.deltaY;
        setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
        return;
      }
      const r = el.getBoundingClientRect();
      const containerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      const factor = Math.exp(-wheelEvent.deltaY * 0.001);
      setView((v) => {
        const nextScale = clamp(v.scale * factor, minScaleRef.current, MAX_MAP_SCALE);
        return zoomToFocal(
          v,
          containerRect,
          wheelEvent.clientX,
          wheelEvent.clientY,
          nextScale,
          minScaleRef.current,
        );
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toWorldX = (xM: number) => (xM - world.originXM) * OVERVIEW_PX_PER_METER;
  const toWorldY = (yM: number) => (yM - world.originYM) * OVERVIEW_PX_PER_METER;

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 touch-none"
      data-testid="garden-overview-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ touchAction: 'none' }}
    >
      {/* Floating view controls: same placement and touch targets as the area map (D2). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-end p-3">
        <div
          data-testid="overview-view-controls"
          className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white/95 shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-lg text-stone-700 hover:bg-stone-100"
            onClick={() => {
              viewTouchedRef.current = true;
              setView((v) => ({
                ...v,
                scale: clamp(v.scale * 1.15, minScaleRef.current, MAX_MAP_SCALE),
              }));
            }}
            aria-label={t('garden.zoomIn')}
          >
            +
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center border-t border-stone-200 text-lg text-stone-700 hover:bg-stone-100"
            onClick={() => {
              viewTouchedRef.current = true;
              setView((v) => ({
                ...v,
                scale: clamp(v.scale / 1.15, minScaleRef.current, MAX_MAP_SCALE),
              }));
            }}
            aria-label={t('garden.zoomOut')}
          >
            −
          </button>
          <button
            type="button"
            data-testid="overview-zoom-fit"
            className="flex h-11 w-11 items-center justify-center border-t border-stone-200 text-lg text-stone-700 hover:bg-stone-100"
            onClick={applyFitView}
            aria-label={t('garden.zoomFit')}
          >
            ⤢
          </button>
        </div>
      </div>
      <div ref={viewportRef} data-testid="garden-overview-viewport" className="absolute left-1/2 top-1/2">
        <svg
          ref={worldRef}
          className="bg-white shadow-sm"
          width={world.widthPx}
          height={world.heightPx}
          viewBox={`0 0 ${world.widthPx} ${world.heightPx}`}
          role="application"
          aria-label={t('areas.overviewAriaLabel')}
          data-testid="garden-overview-map"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onDoubleClick={onDoubleClick}
        >
          {tiles.map((tile) => {
            const x = toWorldX(tile.xM);
            const y = toWorldY(tile.yM);
            const w = tile.wM * OVERVIEW_PX_PER_METER;
            const h = tile.hM * OVERVIEW_PX_PER_METER;
            const dragging = tileDrag?.areaId === tile.areaId;
            return (
              <g
                key={tile.areaId}
                ref={dragging ? (n) => {
                  if (n) draggedTileNodeRef.current = n;
                } : undefined}
                data-testid={`overview-tile-${tile.areaId}`}
                data-overview-tile={tile.areaId}
                data-placed={tile.placed ? 'true' : 'false'}
                role="button"
                aria-label={t('areas.overviewTileAria', { title: tile.title })}
                tabIndex={0}
                style={{ cursor: dragging ? 'grabbing' : 'pointer' }}
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  handleTilePointerDown(ev, tile);
                }}
                onTouchStart={(ev) => {
                  ev.stopPropagation();
                  if (ev.touches.length !== 1) return;
                  const touch = ev.touches[0];
                  if (!touch) return;
                  handleTileTouchStart(touch.clientX, touch.clientY, tile);
                }}
                onKeyDown={(ev) => {
                  if (ev.key !== 'Enter' && ev.key !== ' ') return;
                  ev.preventDefault();
                  openArea(tile.areaId);
                }}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  ry={4}
                  fill={tile.placed ? '#d1fae5' : '#fef3c7'}
                  opacity={dragging ? 0.7 : 1}
                  stroke={tile.placed ? '#059669' : '#d97706'}
                  strokeWidth={2}
                  strokeDasharray={tile.placed ? undefined : '6 4'}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#1c1917"
                  style={{ userSelect: 'none' }}
                  pointerEvents="none"
                >
                  {tile.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});
