import { memo, useId } from 'react';

/** Matches Tailwind stone-50/50 and stone-200/80 used by the previous per-cell grid. */
const GRID_FILL = 'rgb(250 250 249 / 0.5)';
const GRID_LINE = 'rgb(231 229 228 / 0.8)';

export interface GridMapSvgGridLayerProps {
  worldW: number;
  worldH: number;
  cell: number;
}

export const GridMapSvgGridLayer = memo(function GridMapSvgGridLayer({
  worldW,
  worldH,
  cell,
}: GridMapSvgGridLayerProps) {
  const patternId = useId();

  return (
    <>
      <defs>
        <pattern id={patternId} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={cell} height={cell} fill={GRID_FILL} />
          <path d={`M ${cell} 0 L 0 0 0 ${cell}`} fill="none" stroke={GRID_LINE} strokeWidth={1} />
        </pattern>
      </defs>
      <rect
        data-testid="grid-map-cell-layer"
        x={0}
        y={0}
        width={worldW}
        height={worldH}
        fill={`url(#${patternId})`}
        pointerEvents="none"
      />
    </>
  );
});

