import { memo } from 'react';

/** Matches Tailwind stone-50/50 and stone-200/80 used by the previous per-cell grid. */
const GRID_FILL = 'rgb(250 250 249 / 0.5)';
const GRID_LINE = 'rgb(231 229 228 / 0.8)';

export interface GridMapCellLayerProps {
  worldW: number;
  worldH: number;
  cell: number;
}

/**
 * Single full-size layer that draws the grid via repeating CSS gradients.
 * Avoids O(gridWidth * gridHeight) DOM nodes for pan/zoom performance.
 */
export const GridMapCellLayer = memo(function GridMapCellLayer({
  worldW,
  worldH,
  cell,
}: GridMapCellLayerProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 box-border"
      data-testid="grid-map-cell-layer"
      style={{
        width: worldW,
        height: worldH,
        backgroundColor: GRID_FILL,
        backgroundImage: `
          linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px),
          linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)
        `,
        backgroundSize: `${cell}px ${cell}px`,
      }}
    />
  );
});
