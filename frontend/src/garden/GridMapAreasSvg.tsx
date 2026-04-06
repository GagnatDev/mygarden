import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/gardens';
import { polygonCentroidGrid, polygonPointsPx } from './polygon-helpers';
import { toneClassToHex } from './svg-utils';

export interface AreaBadge {
  text: string;
  /** Tailwind background class, e.g. "bg-amber-500". */
  toneClass: string;
}

export interface GridMapAreasSvgProps {
  areas: Area[];
  cell: number;
  areaIdsWithPlantings?: ReadonlySet<string>;
  areaColorById?: Readonly<Record<string, string>>;
  areaBadgeById?: Readonly<Record<string, AreaBadge>>;
  areaOverlayBadgesById?: Readonly<Record<string, string[]>>;
  selectedAreaId: string | null;
  effectiveTool: 'select' | 'pan' | 'move' | 'draw-polygon';
  readOnly: boolean;
  draggingAreaId?: string | null;
  onSelectArea: (id: string | null) => void;
  onBeginAreaMove?: (e: React.PointerEvent, area: Area) => void;
  onBeginAreaMoveTouch?: (clientX: number, clientY: number, area: Area) => void;
}

function areaCenterPx(a: Area, cell: number): { cx: number; cy: number } {
  if (a.shape?.kind === 'polygon') {
    const c = polygonCentroidGrid(a.shape.vertices);
    return { cx: c.x * cell, cy: c.y * cell };
  }
  return {
    cx: (a.gridX + a.gridWidth / 2) * cell,
    cy: (a.gridY + a.gridHeight / 2) * cell,
  };
}

export const GridMapAreasSvg = memo<GridMapAreasSvgProps>(function GridMapAreasSvg({
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
}: GridMapAreasSvgProps) {
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
        const fill = overlayColor ?? a.color;

        const x = a.gridX * cell;
        const y = a.gridY * cell;
        const w = a.gridWidth * cell;
        const h = a.gridHeight * cell;
        const polygonShape = a.shape?.kind === 'polygon' ? a.shape : undefined;
        const isPolygon = polygonShape !== undefined;
        const polygonPts = polygonShape ? polygonPointsPx(polygonShape.vertices, cell) : '';
        const ariaLabel = hasPlantings ? `${a.name} (${t('garden.hasPlantingsHint')})` : a.name;

        const pointerEvents: React.SVGAttributes<SVGGElement>['pointerEvents'] =
          effectiveTool === 'pan' || effectiveTool === 'draw-polygon' || readOnly ? 'none' : 'auto';

        const { cx, cy } = areaCenterPx(a, cell);

        return (
          <g
            key={a.id}
            data-testid={`map-area-${a.id}`}
            data-area-shape={isPolygon ? 'polygon' : 'rectangle'}
            role="button"
            aria-label={ariaLabel}
            tabIndex={readOnly || effectiveTool === 'pan' || effectiveTool === 'draw-polygon' ? -1 : 0}
            pointerEvents={pointerEvents}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              if (!readOnly && effectiveTool === 'move' && onBeginAreaMove) {
                ev.preventDefault();
                onBeginAreaMove(ev as unknown as React.PointerEvent, a);
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
          >
            {isPolygon ? (
              <polygon
                data-testid={`map-area-polygon-${a.id}`}
                points={polygonPts}
                fill={fill}
                opacity={dragging ? 0.35 : 1}
                stroke={selected ? '#059669' : 'none'}
                strokeWidth={selected ? 2 : 0}
              />
            ) : (
              <>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={fill}
                  opacity={dragging ? 0.35 : 1}
                  rx={4}
                  ry={4}
                />

                {selected ? (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={2}
                  />
                ) : null}
              </>
            )}

            {badge ? (
              <g data-testid={`map-area-badge-${a.id}`} aria-hidden="true" pointerEvents="none">
                <rect x={x + 4} y={y + 4} width={Math.max(24, badge.text.length * 6 + 10)} height={14} rx={3} ry={3} fill={toneClassToHex(badge.toneClass)} opacity={0.95} />
                <text x={x + 9} y={y + 14} fontSize={9} fontWeight={700} fill="rgba(255,255,255,0.95)">
                  {badge.text}
                </text>
              </g>
            ) : null}

            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={700}
              fill="rgba(255,255,255,0.96)"
              style={{ userSelect: 'none' }}
              pointerEvents="none"
            >
              {a.name}
              {hasPlantings ? (
                <tspan
                  data-testid={`map-area-planting-indicator-${a.id}`}
                  fill="#6ee7b7"
                  aria-hidden="true"
                >
                  {' '}
                  ●
                </tspan>
              ) : null}
            </text>

            {overlayBadges.length > 0 ? (
              <g data-testid={`map-area-overlay-badges-${a.id}`} aria-hidden="true" pointerEvents="none">
                {overlayBadges.slice(0, 2).map((txt, idx) => (
                  <text
                    key={txt}
                    x={cx}
                    y={y + h - 6 - idx * 12}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="rgba(255,255,255,0.95)"
                  >
                    {txt}
                  </text>
                ))}
              </g>
            ) : null}
          </g>
        );
      })}
    </>
  );
});

