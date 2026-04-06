import { describe, expect, it } from 'vitest';
import { gridRectsOverlap, isValidMovePosition, rectWithinGarden } from './grid-rect';

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
