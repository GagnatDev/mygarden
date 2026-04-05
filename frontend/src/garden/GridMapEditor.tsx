import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area, Garden } from '../api/gardens';

const CELL = 28;

export interface GridSelection {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

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

export type MapTool = 'select' | 'pan';

export interface GridMapEditorProps {
  garden: Garden;
  areas: Area[];
  /** Area IDs that have at least one planting (subtle map indicator only). */
  areaIdsWithPlantings?: ReadonlySet<string>;
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  onSelectionComplete: (sel: GridSelection) => void;
  tool: MapTool;
  onToolChange: (t: MapTool) => void;
  /** When true, map is view-only (pan/zoom only, no new selections or area clicks). */
  readOnly?: boolean;
}

export function GridMapEditor({
  garden,
  areas,
  areaIdsWithPlantings,
  selectedAreaId,
  onSelectArea,
  onSelectionComplete,
  tool,
  onToolChange,
  readOnly = false,
}: GridMapEditorProps) {
  const { t } = useTranslation();
  const effectiveTool: MapTool = readOnly ? 'pan' : tool;
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
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
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) return null;
      return { gx, gy };
    },
    [gw, gh, view.scale],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.001);
      setView((v) => {
        const nextScale = clamp(v.scale * factor, 0.35, 4);
        return { ...v, scale: nextScale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (effectiveTool === 'pan') {
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      return;
    }
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
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'pan') {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      dragRef.current = { kind: 'pan', x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
      return;
    }
    const g = clientToGrid(e.clientX, e.clientY);
    if (!g) return;
    dragRef.current = { ...d, bx: g.gx, by: g.gy };
    setPreview(normalizeRect(d.ax, d.ay, g.gx, g.gy, gw, gh));
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

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    const d = dragRef.current;
    if (d?.kind === 'pan') {
      dragRef.current = null;
      return;
    }
    endDrag(e);
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setPreview(null);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale: view.scale };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      const next = clamp(pinchRef.current.scale * ratio, 0.35, 4);
      setView((v) => ({ ...v, scale: next }));
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

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
                tool === 'pan' ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600'
              }`}
              onClick={() => onToolChange('pan')}
            >
              {t('garden.toolPan')}
            </button>
          </div>
        ) : null}
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
          <div
            ref={worldRef}
            className="relative bg-white shadow-sm"
            style={{ width: worldW, height: worldH }}
            role="grid"
            aria-label={t('garden.gridAriaLabel', { width: gw, height: gh })}
            data-testid="grid-map"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            {Array.from({ length: gh }, (_, y) =>
              Array.from({ length: gw }, (_, x) => (
                <div
                  key={`${x}-${y}`}
                  data-cell={`${x}-${y}`}
                  className="absolute box-border border border-stone-200/80 bg-stone-50/50"
                  style={{
                    left: x * CELL,
                    top: y * CELL,
                    width: CELL,
                    height: CELL,
                  }}
                />
              )),
            )}

            {areas.map((a) => {
              const selected = a.id === selectedAreaId;
              const hasPlantings = areaIdsWithPlantings?.has(a.id) ?? false;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`absolute box-border flex items-center justify-center p-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm transition-[outline] ${
                    selected ? 'outline outline-2 outline-emerald-600 outline-offset-[-2px] z-10' : 'z-[1]'
                  }`}
                  style={{
                    left: a.gridX * CELL,
                    top: a.gridY * CELL,
                    width: a.gridWidth * CELL,
                    height: a.gridHeight * CELL,
                    backgroundColor: a.color,
                    pointerEvents: effectiveTool === 'pan' || readOnly ? 'none' : 'auto',
                  }}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    if (readOnly || effectiveTool !== 'select') return;
                    ev.stopPropagation();
                    onSelectArea(a.id);
                  }}
                  aria-label={
                    hasPlantings
                      ? `${a.name} (${t('garden.hasPlantingsHint')})`
                      : a.name
                  }
                >
                  {hasPlantings ? (
                    <span
                      className="pointer-events-none absolute right-0.5 top-0.5 z-20 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-white/90"
                      data-testid={`map-area-planting-indicator-${a.id}`}
                      aria-hidden
                    />
                  ) : null}
                  <span className="line-clamp-3 break-words px-0.5 drop-shadow-sm">
                    <span className="block font-semibold">{a.name}</span>
                  </span>
                </button>
              );
            })}

            {preview && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-emerald-600 bg-emerald-400/20"
                style={{
                  left: preview.gridX * CELL,
                  top: preview.gridY * CELL,
                  width: preview.gridWidth * CELL,
                  height: preview.gridHeight * CELL,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
