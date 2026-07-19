import { describe, expect, it } from 'vitest';
import type { GridRect } from './grid-rect';
import {
  handleAnchor,
  handleCursor,
  RESIZE_HANDLES,
  rectsEqual,
  resizeRectToPointer,
} from './resize-helpers';

const rect: GridRect = { gridX: 1, gridY: 1, gridWidth: 2, gridHeight: 2 };
const GW = 6;
const GH = 5;

describe('handleAnchor', () => {
  it('places corner handles on the rect corners and edge handles on edge midpoints', () => {
    expect(handleAnchor(rect, 'nw')).toEqual({ x: 1, y: 1 });
    expect(handleAnchor(rect, 'ne')).toEqual({ x: 3, y: 1 });
    expect(handleAnchor(rect, 'se')).toEqual({ x: 3, y: 3 });
    expect(handleAnchor(rect, 'sw')).toEqual({ x: 1, y: 3 });
    expect(handleAnchor(rect, 'n')).toEqual({ x: 2, y: 1 });
    expect(handleAnchor(rect, 'e')).toEqual({ x: 3, y: 2 });
    expect(handleAnchor(rect, 's')).toEqual({ x: 2, y: 3 });
    expect(handleAnchor(rect, 'w')).toEqual({ x: 1, y: 2 });
  });

  it('every handle has a resize cursor', () => {
    for (const h of RESIZE_HANDLES) {
      expect(handleCursor(h)).toMatch(/-resize$/);
    }
  });
});

describe('resizeRectToPointer', () => {
  it('grows to the east, snapping the dragged edge to the nearest cell boundary', () => {
    expect(resizeRectToPointer(rect, 'e', 4.4, 2, GW, GH)).toEqual({
      gridX: 1,
      gridY: 1,
      gridWidth: 3,
      gridHeight: 2,
    });
    expect(resizeRectToPointer(rect, 'e', 4.6, 2, GW, GH)).toEqual({
      gridX: 1,
      gridY: 1,
      gridWidth: 4,
      gridHeight: 2,
    });
  });

  it('west handle shifts the origin while keeping the right edge fixed', () => {
    expect(resizeRectToPointer(rect, 'w', 0, 2, GW, GH)).toEqual({
      gridX: 0,
      gridY: 1,
      gridWidth: 3,
      gridHeight: 2,
    });
  });

  it('north handle shifts the origin vertically', () => {
    expect(resizeRectToPointer(rect, 'n', 2, 0, GW, GH)).toEqual({
      gridX: 1,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 3,
    });
  });

  it('corner handles move both edges at once', () => {
    expect(resizeRectToPointer(rect, 'se', 5, 4, GW, GH)).toEqual({
      gridX: 1,
      gridY: 1,
      gridWidth: 4,
      gridHeight: 3,
    });
    expect(resizeRectToPointer(rect, 'nw', 0, 0, GW, GH)).toEqual({
      gridX: 0,
      gridY: 0,
      gridWidth: 3,
      gridHeight: 3,
    });
  });

  it('edge handles never change the perpendicular axis', () => {
    const r = resizeRectToPointer(rect, 's', 99, 4, GW, GH);
    expect(r.gridX).toBe(rect.gridX);
    expect(r.gridWidth).toBe(rect.gridWidth);
    expect(r.gridHeight).toBe(3);
  });

  it('enforces min 1×1: dragging an edge across the rect stops one cell short', () => {
    // Right edge dragged far left of the left edge.
    expect(resizeRectToPointer(rect, 'e', -5, 2, GW, GH)).toEqual({
      gridX: 1,
      gridY: 1,
      gridWidth: 1,
      gridHeight: 2,
    });
    // Top edge dragged far below the bottom edge.
    expect(resizeRectToPointer(rect, 'n', 2, 99, GW, GH)).toEqual({
      gridX: 1,
      gridY: 2,
      gridWidth: 2,
      gridHeight: 1,
    });
  });

  it('clamps to the area bounds', () => {
    expect(resizeRectToPointer(rect, 'se', 99, 99, GW, GH)).toEqual({
      gridX: 1,
      gridY: 1,
      gridWidth: GW - 1,
      gridHeight: GH - 1,
    });
    expect(resizeRectToPointer(rect, 'nw', -99, -99, GW, GH)).toEqual({
      gridX: 0,
      gridY: 0,
      gridWidth: 3,
      gridHeight: 3,
    });
  });
});

describe('rectsEqual', () => {
  it('compares all four fields', () => {
    expect(rectsEqual(rect, { ...rect })).toBe(true);
    expect(rectsEqual(rect, { ...rect, gridWidth: 3 })).toBe(false);
    expect(rectsEqual(rect, { ...rect, gridX: 0 })).toBe(false);
  });
});
