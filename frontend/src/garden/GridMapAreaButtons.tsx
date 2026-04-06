import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/gardens';

export interface AreaBadge {
  text: string;
  /** Tailwind background class, e.g. "bg-amber-500". */
  toneClass: string;
}

export interface GridMapAreaButtonsProps {
  areas: Area[];
  cell: number;
  areaIdsWithPlantings?: ReadonlySet<string>;
  /** Optional per-area background color override (e.g. layer coloring). */
  areaColorById?: Readonly<Record<string, string>>;
  /** Optional per-area badge (e.g. status / plan-vs-actual). */
  areaBadgeById?: Readonly<Record<string, AreaBadge>>;
  /** Optional per-area overlay badges (e.g. historical plant names). */
  areaOverlayBadgesById?: Readonly<Record<string, string[]>>;
  selectedAreaId: string | null;
  effectiveTool: 'select' | 'pan' | 'move';
  readOnly: boolean;
  /** While an area is being repositioned, dim its button (ghost shows the original slot). */
  draggingAreaId?: string | null;
  onSelectArea: (id: string | null) => void;
  /** Start drag-to-move (move tool); caller should set pointer capture on the map surface. */
  onBeginAreaMove?: (e: React.PointerEvent, area: Area) => void;
  /** Touch fallback for browsers without reliable pointer events. */
  onBeginAreaMoveTouch?: (clientX: number, clientY: number, area: Area) => void;
}

export const GridMapAreaButtons = memo(function GridMapAreaButtons({
  areas,
  cell,
  areaIdsWithPlantings,
  areaColorById,
  areaBadgeById,
  areaOverlayBadgesById,
  selectedAreaId,
  effectiveTool,
  readOnly,
  draggingAreaId = null,
  onSelectArea,
  onBeginAreaMove,
  onBeginAreaMoveTouch,
}: GridMapAreaButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      {areas.map((a) => {
        const selected = a.id === selectedAreaId;
        const hasPlantings = areaIdsWithPlantings?.has(a.id) ?? false;
        const dragging = a.id === draggingAreaId;
        const overlayColor = areaColorById?.[a.id];
        const badge = areaBadgeById?.[a.id];
        const overlayBadges = areaOverlayBadgesById?.[a.id] ?? [];
        return (
          <button
            key={a.id}
            type="button"
            className={`absolute box-border flex items-center justify-center p-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm transition-[outline] ${
              selected ? 'outline outline-2 outline-emerald-600 outline-offset-[-2px] z-10' : 'z-[1]'
            }`}
            style={{
              left: a.gridX * cell,
              top: a.gridY * cell,
              width: a.gridWidth * cell,
              height: a.gridHeight * cell,
              backgroundColor: overlayColor ?? a.color,
              opacity: dragging ? 0.35 : 1,
              pointerEvents: effectiveTool === 'pan' || readOnly ? 'none' : 'auto',
            }}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              if (!readOnly && effectiveTool === 'move' && onBeginAreaMove) {
                ev.preventDefault();
                onBeginAreaMove(ev, a);
              }
            }}
            onTouchStart={(ev) => {
              ev.stopPropagation();
              if (readOnly || effectiveTool !== 'move' || !onBeginAreaMoveTouch) return;
              const touch = ev.touches[0];
              if (!touch) return;
              ev.preventDefault();
              onBeginAreaMoveTouch(touch.clientX, touch.clientY, a);
            }}
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
            {badge ? (
              <span
                className={`pointer-events-none absolute left-0.5 top-0.5 z-20 rounded px-1 py-0.5 text-[9px] font-semibold leading-none text-white/95 ring-1 ring-white/70 ${badge.toneClass}`}
                data-testid={`map-area-badge-${a.id}`}
                aria-hidden
              >
                {badge.text}
              </span>
            ) : null}
            <span className="line-clamp-3 break-words px-0.5 drop-shadow-sm">
              <span className="block font-semibold">{a.name}</span>
            </span>
            {overlayBadges.length > 0 ? (
              <span
                className="pointer-events-none absolute bottom-0.5 left-0.5 right-0.5 z-20 flex flex-wrap justify-center gap-0.5"
                data-testid={`map-area-overlay-badges-${a.id}`}
                aria-hidden
              >
                {overlayBadges.slice(0, 4).map((txt) => (
                  <span
                    key={txt}
                    className="max-w-full truncate rounded bg-white/20 px-1 py-0.5 text-[9px] font-semibold leading-none text-white/95 ring-1 ring-white/30 backdrop-blur"
                  >
                    {txt}
                  </span>
                ))}
                {overlayBadges.length > 4 ? (
                  <span className="rounded bg-white/20 px-1 py-0.5 text-[9px] font-semibold leading-none text-white/95 ring-1 ring-white/30">
                    +{overlayBadges.length - 4}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
});
