import { describe, expect, it } from 'vitest';
import {
  gridRectsOverlap,
  isValidMovePosition,
  isValidResizeRect,
  rectWithinGarden,
} from './grid-rect';

describe('gridRectsOverlap', () => {
  it('returns false when rectangles only touch on an edge', () => {
    const a = { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 };
    const b = { gridX: 2, gridY: 0, gridWidth: 2, gridHeight: 2 };
    expect(gridRectsOverlap(a, b)).toBe(false);
  });

  it('returns true when rectangles overlap', () => {
    const a = { gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 };
    const b = { gridX: 2, gridY: 0, gridWidth: 2, gridHeight: 2 };
    expect(gridRectsOverlap(a, b)).toBe(true);
  });
});

describe('rectWithinGarden', () => {
  it('rejects rectangles outside bounds', () => {
    expect(rectWithinGarden({ gridX: -1, gridY: 0, gridWidth: 1, gridHeight: 1 }, 10, 10)).toBe(
      false,
    );
    expect(rectWithinGarden({ gridX: 0, gridY: 0, gridWidth: 11, gridHeight: 1 }, 10, 10)).toBe(
      false,
    );
  });

  it('accepts rectangles fully inside', () => {
    expect(rectWithinGarden({ gridX: 0, gridY: 0, gridWidth: 10, gridHeight: 10 }, 10, 10)).toBe(
      true,
    );
  });
});

describe('isValidMovePosition', () => {
  const areas = [
    { id: 'a', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 },
    { id: 'b', gridX: 3, gridY: 0, gridWidth: 1, gridHeight: 1 },
  ];

  it('allows move that does not overlap others', () => {
    expect(
      isValidMovePosition('a', { gridX: 0, gridY: 1, gridWidth: 2, gridHeight: 1 }, areas, 5, 5),
    ).toBe(true);
  });

  it('rejects overlap with another area', () => {
    expect(
      isValidMovePosition('a', { gridX: 3, gridY: 0, gridWidth: 2, gridHeight: 1 }, areas, 5, 5),
    ).toBe(false);
  });

  it('ignores overlap with self', () => {
    expect(
      isValidMovePosition('a', { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 }, areas, 5, 5),
    ).toBe(true);
  });
});

describe('isValidResizeRect', () => {
  const areas = [
    { id: 'a', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 },
    { id: 'b', gridX: 3, gridY: 0, gridWidth: 1, gridHeight: 1 },
  ];

  it('allows growing into free space', () => {
    expect(
      isValidResizeRect('a', { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 3 }, areas, 5, 5),
    ).toBe(true);
  });

  it('rejects growing over another element', () => {
    expect(
      isValidResizeRect('a', { gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 1 }, areas, 5, 5),
    ).toBe(false);
  });

  it('rejects sizes below 1×1 and rects outside the area', () => {
    expect(
      isValidResizeRect('a', { gridX: 0, gridY: 0, gridWidth: 0, gridHeight: 1 }, areas, 5, 5),
    ).toBe(false);
    expect(
      isValidResizeRect('a', { gridX: 4, gridY: 0, gridWidth: 2, gridHeight: 1 }, areas, 5, 5),
    ).toBe(false);
  });

  it('ignores overlap with the element being resized', () => {
    expect(
      isValidResizeRect('b', { gridX: 3, gridY: 0, gridWidth: 2, gridHeight: 2 }, areas, 5, 5),
    ).toBe(true);
  });
});
