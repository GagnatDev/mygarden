import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Element } from '../api/elements';
import { polygonCentroidGrid, polygonPointsPx } from './polygon-helpers';
import { toneClassToHex } from './svg-utils';

export interface ElementBadge {
  text: string;
  /** Tailwind background class, e.g. "bg-amber-500". */
  toneClass: string;
}

export interface GridMapAreasSvgProps {
  elements: Element[];
  cell: number;
  elementIdsWithPlantings?: ReadonlySet<string>;
  elementColorById?: Readonly<Record<string, string>>;
  elementBadgeById?: Readonly<Record<string, ElementBadge>>;
  elementOverlayBadgesById?: Readonly<Record<string, string[]>>;
  selectedElementId: string | null;
  effectiveTool: 'select' | 'pan' | 'move' | 'draw-polygon';
  readOnly: boolean;
  draggingElementId?: string | null;
  onSelectElement: (id: string | null) => void;
  onBeginElementMove?: (e: React.PointerEvent, element: Element) => void;
  onBeginElementMoveTouch?: (clientX: number, clientY: number, element: Element) => void;
}

function elementCenterPx(el: Element, cell: number): { cx: number; cy: number } {
  if (el.shape?.kind === 'polygon') {
    const c = polygonCentroidGrid(el.shape.vertices);
    return { cx: c.x * cell, cy: c.y * cell };
  }
  return {
    cx: (el.gridX + el.gridWidth / 2) * cell,
    cy: (el.gridY + el.gridHeight / 2) * cell,
  };
}

export const GridMapAreasSvg = memo<GridMapAreasSvgProps>(function GridMapAreasSvg({
  elements,
  cell,
  elementIdsWithPlantings,
  elementColorById,
  elementBadgeById,
  elementOverlayBadgesById,
  selectedElementId,
  effectiveTool,
  readOnly,
  draggingElementId = null,
  onSelectElement,
  onBeginElementMove,
  onBeginElementMoveTouch,
}: GridMapAreasSvgProps) {
  const { t } = useTranslation();

  return (
    <>
      {elements.map((a) => {
        const selected = a.id === selectedElementId;
        const hasPlantings = elementIdsWithPlantings?.has(a.id) ?? false;
        const dragging = a.id === draggingElementId;
        const overlayColor = elementColorById?.[a.id];
        const badge = elementBadgeById?.[a.id];
        const overlayBadges = elementOverlayBadgesById?.[a.id] ?? [];
        const fill = overlayColor ?? a.color;

        const x = a.gridX * cell;
        const y = a.gridY * cell;
        const w = a.gridWidth * cell;
        const h = a.gridHeight * cell;
        const polygonShape = a.shape?.kind === 'polygon' ? a.shape : undefined;
        const isPolygon = polygonShape !== undefined;
        const polygonPts = polygonShape ? polygonPointsPx(polygonShape.vertices, cell) : '';
        const ariaLabel = hasPlantings ? `${a.name} (${t('elements.hasPlantingsHint')})` : a.name;

        const pointerEvents: React.SVGAttributes<SVGGElement>['pointerEvents'] =
          effectiveTool === 'pan' || effectiveTool === 'draw-polygon' || readOnly ? 'none' : 'auto';

        const { cx, cy } = elementCenterPx(a, cell);

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
              if (!readOnly && effectiveTool === 'move' && onBeginElementMove) {
                ev.preventDefault();
                onBeginElementMove(ev as unknown as React.PointerEvent, a);
              }
            }}
            onTouchStart={(ev) => {
              ev.stopPropagation();
              if (readOnly || effectiveTool !== 'move' || !onBeginElementMoveTouch) return;
              const touch = ev.touches[0];
              if (!touch) return;
              ev.preventDefault();
              onBeginElementMoveTouch(touch.clientX, touch.clientY, a);
            }}
            onClick={(ev) => {
              if (readOnly || effectiveTool !== 'select') return;
              ev.stopPropagation();
              onSelectElement(a.id);
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
