import { describe, expect, it } from 'vitest';
import { polygonCentroidGrid, polygonVerticesToGridBBox } from './polygon-helpers';

describe('polygon-helpers', () => {
  it('polygonVerticesToGridBBox matches ceil/floor bounds', () => {
    const v = [
      { x: 0.2, y: 0.1 },
      { x: 2.7, y: 0.2 },
      { x: 2.5, y: 2.4 },
    ];
    expect(polygonVerticesToGridBBox(v)).toEqual({ gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 3 });
  });

  it('polygonCentroidGrid returns interior point for a triangle', () => {
    const v = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ];
    const c = polygonCentroidGrid(v);
    expect(c.x).toBeCloseTo(1, 5);
    expect(c.y).toBeCloseTo(2 / 3, 5);
  });
});
