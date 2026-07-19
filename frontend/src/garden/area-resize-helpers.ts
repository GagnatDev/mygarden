/**
 * Pure geometry for resizing an area (the grid itself) via corner handles.
 *
 * The area is anchored at its top-left origin (0,0): elements use absolute grid
 * coordinates, so only the right/bottom edges may move — the origin never
 * shifts and placed elements never move. That leaves three live corners (NE,
 * SE, SW); the NW corner is the fixed anchor. Dragging a corner snaps the
 * affected dimension(s) to whole cells and clamps to
 * `[minSize, MAX_AREA_CELLS]`, so an area can never be shrunk smaller than the
 * elements it contains. All math is in grid-cell coordinates.
 */

import type { GridRect } from './grid-rect';
import { handleAffectsBottom, handleAffectsRight, type ResizeHandle } from './resize-helpers';

/** The corners that resize a top-left-anchored area (NW is the fixed origin). */
export const AREA_RESIZE_HANDLES: readonly ResizeHandle[] = ['ne', 'se', 'sw'];

/** Grid dimension cap (mirrors the backend limit in area.validation.ts). */
export const MAX_AREA_CELLS = 200;

export interface AreaSize {
  gridWidth: number;
  gridHeight: number;
}

/**
 * The smallest area (in cells) that still contains every element: the largest
 * right/bottom extent across all elements, floored at 1×1. Shrinking below this
 * would push an element outside the grid, which the backend rejects.
 */
export function minAreaSizeForElements(elements: ReadonlyArray<GridRect>): AreaSize {
  let gridWidth = 1;
  let gridHeight = 1;
  for (const e of elements) {
    gridWidth = Math.max(gridWidth, e.gridX + e.gridWidth);
    gridHeight = Math.max(gridHeight, e.gridY + e.gridHeight);
  }
  return { gridWidth, gridHeight };
}

/** Handle anchor position in grid-cell coordinates for a top-left-anchored area. */
export function areaHandleAnchor(size: AreaSize, handle: ResizeHandle): { x: number; y: number } {
  return {
    x: handleAffectsRight(handle) ? size.gridWidth : 0,
    y: handleAffectsBottom(handle) ? size.gridHeight : 0,
  };
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Resize a top-left-anchored area by dragging `handle` to the pointer at
 * fractional grid coordinates (gx, gy). Only the edges the handle owns move;
 * each moved dimension snaps to a whole cell and clamps to
 * `[max(1, min), MAX_AREA_CELLS]`.
 */
export function resizeAreaToPointer(
  orig: AreaSize,
  handle: ResizeHandle,
  gx: number,
  gy: number,
  min: AreaSize,
): AreaSize {
  let { gridWidth, gridHeight } = orig;
  if (handleAffectsRight(handle)) {
    gridWidth = clampInt(gx, Math.max(1, min.gridWidth), MAX_AREA_CELLS);
  }
  if (handleAffectsBottom(handle)) {
    gridHeight = clampInt(gy, Math.max(1, min.gridHeight), MAX_AREA_CELLS);
  }
  return { gridWidth, gridHeight };
}

export function areaSizesEqual(a: AreaSize, b: AreaSize): boolean {
  return a.gridWidth === b.gridWidth && a.gridHeight === b.gridHeight;
}
