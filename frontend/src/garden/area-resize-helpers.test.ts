import { describe, expect, it } from 'vitest';
import {
  AREA_RESIZE_HANDLES,
  areaHandleAnchor,
  areaSizesEqual,
  MAX_AREA_CELLS,
  minAreaSizeForElements,
  resizeAreaToPointer,
} from './area-resize-helpers';

describe('minAreaSizeForElements', () => {
  it('is 1×1 with no elements', () => {
    expect(minAreaSizeForElements([])).toEqual({ gridWidth: 1, gridHeight: 1 });
  });

  it('is the largest right/bottom extent across elements', () => {
    expect(
      minAreaSizeForElements([
        { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 },
        { gridX: 3, gridY: 2, gridWidth: 1, gridHeight: 2 },
      ]),
    ).toEqual({ gridWidth: 4, gridHeight: 4 });
  });
});

describe('areaHandleAnchor', () => {
  const size = { gridWidth: 5, gridHeight: 3 };
  it('places each live corner at the right/bottom edges it owns', () => {
    expect(areaHandleAnchor(size, 'ne')).toEqual({ x: 5, y: 0 });
    expect(areaHandleAnchor(size, 'se')).toEqual({ x: 5, y: 3 });
    expect(areaHandleAnchor(size, 'sw')).toEqual({ x: 0, y: 3 });
  });

  it('exposes only the three non-origin corners', () => {
    expect([...AREA_RESIZE_HANDLES]).toEqual(['ne', 'se', 'sw']);
  });
});

describe('resizeAreaToPointer', () => {
  const orig = { gridWidth: 5, gridHeight: 3 };
  const min = { gridWidth: 2, gridHeight: 2 };

  it('se grows both dimensions with grid snapping', () => {
    expect(resizeAreaToPointer(orig, 'se', 7.4, 6.6, min)).toEqual({
      gridWidth: 7,
      gridHeight: 7,
    });
  });

  it('ne changes only width (top edge is anchored)', () => {
    expect(resizeAreaToPointer(orig, 'ne', 8, 1, min)).toEqual({
      gridWidth: 8,
      gridHeight: 3,
    });
  });

  it('sw changes only height (left edge is anchored)', () => {
    expect(resizeAreaToPointer(orig, 'sw', 1, 6, min)).toEqual({
      gridWidth: 5,
      gridHeight: 6,
    });
  });

  it('never shrinks below the element bounding box', () => {
    expect(resizeAreaToPointer(orig, 'se', 0, 0, min)).toEqual({
      gridWidth: 2,
      gridHeight: 2,
    });
  });

  it('never grows past the grid cap', () => {
    expect(resizeAreaToPointer(orig, 'se', 999, 999, min)).toEqual({
      gridWidth: MAX_AREA_CELLS,
      gridHeight: MAX_AREA_CELLS,
    });
  });

  it('floors the minimum at 1×1 even when min is smaller', () => {
    expect(
      resizeAreaToPointer(orig, 'se', -3, -3, { gridWidth: 0, gridHeight: 0 }),
    ).toEqual({ gridWidth: 1, gridHeight: 1 });
  });
});

describe('areaSizesEqual', () => {
  it('compares both dimensions', () => {
    expect(areaSizesEqual({ gridWidth: 4, gridHeight: 3 }, { gridWidth: 4, gridHeight: 3 })).toBe(
      true,
    );
    expect(areaSizesEqual({ gridWidth: 4, gridHeight: 3 }, { gridWidth: 4, gridHeight: 2 })).toBe(
      false,
    );
  });
});
