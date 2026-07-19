/**
 * Pure geometry for rectangle resize handles (spec #29 C1, R5).
 *
 * A selected rectangle element shows 4 corner + 4 edge handles. Dragging a
 * handle moves the edges it owns to the cell boundary nearest the pointer,
 * keeps the rect at least 1×1 (the anchored edges never move), and clamps to
 * the area bounds. All math is in grid-cell coordinates.
 */

import type { GridRect } from './grid-rect';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const RESIZE_HANDLES: readonly ResizeHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

/** Visible handle dot radius, in screen px (divide by map scale when rendering). */
export const HANDLE_VISIBLE_RADIUS_PX = 5;
/** Invisible hit-target radius, in screen px: a 24 px touch target (C1). */
export const HANDLE_HIT_RADIUS_PX = 12;

export function handleAffectsLeft(h: ResizeHandle): boolean {
  return h === 'nw' || h === 'w' || h === 'sw';
}

export function handleAffectsRight(h: ResizeHandle): boolean {
  return h === 'ne' || h === 'e' || h === 'se';
}

export function handleAffectsTop(h: ResizeHandle): boolean {
  return h === 'nw' || h === 'n' || h === 'ne';
}

export function handleAffectsBottom(h: ResizeHandle): boolean {
  return h === 'sw' || h === 's' || h === 'se';
}

/** CSS cursor for a handle direction. */
export function handleCursor(h: ResizeHandle): string {
  switch (h) {
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'n':
    case 's':
      return 'ns-resize';
    default:
      return 'ew-resize';
  }
}

/** Handle anchor position in grid-cell coordinates (fractional for edge midpoints). */
export function handleAnchor(rect: GridRect, handle: ResizeHandle): { x: number; y: number } {
  const x0 = rect.gridX;
  const x1 = rect.gridX + rect.gridWidth;
  const y0 = rect.gridY;
  const y1 = rect.gridY + rect.gridHeight;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  switch (handle) {
    case 'nw':
      return { x: x0, y: y0 };
    case 'n':
      return { x: mx, y: y0 };
    case 'ne':
      return { x: x1, y: y0 };
    case 'e':
      return { x: x1, y: my };
    case 'se':
      return { x: x1, y: y1 };
    case 's':
      return { x: mx, y: y1 };
    case 'sw':
      return { x: x0, y: y1 };
    default:
      return { x: x0, y: my };
  }
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Resize `orig` by dragging `handle` to the pointer at fractional grid
 * coordinates (gx, gy). The dragged edges snap to the nearest whole cell
 * boundary; the result never inverts (min 1×1) and stays within the
 * `gridWidth`×`gridHeight` area. Left/top handles shift the origin.
 */
export function resizeRectToPointer(
  orig: GridRect,
  handle: ResizeHandle,
  gx: number,
  gy: number,
  gridWidth: number,
  gridHeight: number,
): GridRect {
  let left = orig.gridX;
  let top = orig.gridY;
  let right = orig.gridX + orig.gridWidth;
  let bottom = orig.gridY + orig.gridHeight;
  if (handleAffectsLeft(handle)) left = clampInt(gx, 0, right - 1);
  if (handleAffectsRight(handle)) right = clampInt(gx, left + 1, gridWidth);
  if (handleAffectsTop(handle)) top = clampInt(gy, 0, bottom - 1);
  if (handleAffectsBottom(handle)) bottom = clampInt(gy, top + 1, gridHeight);
  return { gridX: left, gridY: top, gridWidth: right - left, gridHeight: bottom - top };
}

export function rectsEqual(a: GridRect, b: GridRect): boolean {
  return (
    a.gridX === b.gridX &&
    a.gridY === b.gridY &&
    a.gridWidth === b.gridWidth &&
    a.gridHeight === b.gridHeight
  );
}
