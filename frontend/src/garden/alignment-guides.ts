import type { GridRect } from './grid-rect';

export interface AlignmentGuides {
  /** Grid row indices (y) where a horizontal guide line is shown. */
  horizontal: number[];
  /** Grid column indices (x) where a vertical guide line is shown. */
  vertical: number[];
}

/**
 * When dragging a rectangle, find edge alignments with other rectangles (same grid cell edges).
 */
export function computeAlignmentGuides(moving: GridRect, others: GridRect[]): AlignmentGuides {
  const horizontal = new Set<number>();
  const vertical = new Set<number>();

  const mLeft = moving.gridX;
  const mRight = moving.gridX + moving.gridWidth;
  const mTop = moving.gridY;
  const mBottom = moving.gridY + moving.gridHeight;

  for (const o of others) {
    const oLeft = o.gridX;
    const oRight = o.gridX + o.gridWidth;
    const oTop = o.gridY;
    const oBottom = o.gridY + o.gridHeight;

    if (mLeft === oLeft || mLeft === oRight) vertical.add(mLeft);
    if (mRight === oLeft || mRight === oRight) vertical.add(mRight);
    if (mTop === oTop || mTop === oBottom) horizontal.add(mTop);
    if (mBottom === oTop || mBottom === oBottom) horizontal.add(mBottom);
  }

  return {
    horizontal: [...horizontal].sort((a, b) => a - b),
    vertical: [...vertical].sort((a, b) => a - b),
  };
}
