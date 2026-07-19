/**
 * Pure geometry for polygon vertex reshaping (spec #29 C2, R5).
 *
 * A selected polygon element shows one draggable handle per vertex. Dragging a
 * handle moves that vertex in grid-cell space (fractional coordinates allowed,
 * matching creation) and clamps it to the area bounds. On release the caller
 * recomputes the bounding box with `polygonVerticesToGridBBox` and persists the
 * new `shape` + bbox.
 *
 * Live validity is evaluated at the *bounding-box* level (a documented
 * approximation): the reshaped polygon's bbox must stay within the area and
 * not overlap another element's bbox. The backend re-checks with true polygon
 * overlap rules and rejects anything the approximation lets through.
 */

import { isValidResizeRect, type GridRect } from './grid-rect';
import { polygonVerticesToGridBBox, type GridPoint } from './polygon-helpers';

/** Handle sizing is shared with rectangle resize handles. */
export {
  HANDLE_VISIBLE_RADIUS_PX,
  HANDLE_HIT_RADIUS_PX,
} from './resize-helpers';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Move vertex `index` to the fractional grid coordinate (gx, gy), clamped to
 * the `gridWidth`×`gridHeight` area. Other vertices are unchanged. Returns a
 * new array; the input is not mutated.
 */
export function reshapePolygonVertex(
  vertices: readonly GridPoint[],
  index: number,
  gx: number,
  gy: number,
  gridWidth: number,
  gridHeight: number,
): GridPoint[] {
  const cx = clamp(gx, 0, gridWidth);
  const cy = clamp(gy, 0, gridHeight);
  return vertices.map((p, i) => (i === index ? { x: cx, y: cy } : { x: p.x, y: p.y }));
}

/** Exact per-vertex equality (used to skip no-op persists). */
export function verticesEqual(a: readonly GridPoint[], b: readonly GridPoint[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.x !== b[i]!.x || a[i]!.y !== b[i]!.y) return false;
  }
  return true;
}

/**
 * Bounding-box-level validity for a reshape-in-progress: the polygon's bbox
 * must fit in the area (min 1×1) and not overlap any other element. Mirrors the
 * rectangle resize check; the backend enforces true polygon overlap on persist.
 */
export function isValidPolygonReshape(
  reshapingId: string,
  vertices: readonly GridPoint[],
  all: ReadonlyArray<{ id: string } & GridRect>,
  gardenWidth: number,
  gardenHeight: number,
): boolean {
  const bbox = polygonVerticesToGridBBox(vertices);
  if (!bbox) return false;
  return isValidResizeRect(reshapingId, bbox, all, gardenWidth, gardenHeight);
}
