import { describe, expect, it } from 'vitest';
import { computeAlignmentGuides } from './alignment-guides';
import type { GridRect } from './grid-rect';

describe('computeAlignmentGuides', () => {
  it('returns vertical guide when left edges align', () => {
    const moving: GridRect = { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 };
    const others: GridRect[] = [{ gridX: 0, gridY: 3, gridWidth: 1, gridHeight: 1 }];
    const g = computeAlignmentGuides(moving, others);
    expect(g.vertical).toContain(0);
    expect(g.horizontal).toEqual([]);
  });

  it('returns vertical guide when moving right edge aligns with other left edge', () => {
    const moving: GridRect = { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 };
    const others: GridRect[] = [{ gridX: 2, gridY: 0, gridWidth: 2, gridHeight: 1 }];
    const g = computeAlignmentGuides(moving, others);
    expect(g.vertical).toEqual([2]);
  });

  it('returns horizontal guide when top edges align', () => {
    const moving: GridRect = { gridX: 0, gridY: 1, gridWidth: 2, gridHeight: 1 };
    const others: GridRect[] = [{ gridX: 4, gridY: 1, gridWidth: 1, gridHeight: 1 }];
    const g = computeAlignmentGuides(moving, others);
    expect(g.horizontal).toContain(1);
  });

  it('deduplicates guide lines', () => {
    const moving: GridRect = { gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 2 };
    const others: GridRect[] = [
      { gridX: 0, gridY: 2, gridWidth: 1, gridHeight: 1 },
      { gridX: 0, gridY: 3, gridWidth: 1, gridHeight: 1 },
    ];
    const g = computeAlignmentGuides(moving, others);
    expect(g.vertical.filter((x) => x === 0).length).toBeLessThanOrEqual(1);
    expect(g.vertical).toEqual([0]);
  });
});
