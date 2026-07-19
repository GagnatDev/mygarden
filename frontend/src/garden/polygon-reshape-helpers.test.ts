import { describe, expect, it } from 'vitest';
import type { GridRect } from './grid-rect';
import type { GridPoint } from './polygon-helpers';
import {
  isValidPolygonReshape,
  reshapePolygonVertex,
  verticesEqual,
} from './polygon-reshape-helpers';

const triangle: GridPoint[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 2 },
];
const GW = 6;
const GH = 5;

describe('reshapePolygonVertex', () => {
  it('moves only the targeted vertex and keeps fractional coordinates', () => {
    const next = reshapePolygonVertex(triangle, 1, 2.5, 1.25, GW, GH);
    expect(next).toEqual([
      { x: 0, y: 0 },
      { x: 2.5, y: 1.25 },
      { x: 3, y: 2 },
    ]);
  });

  it('clamps the vertex to the area bounds', () => {
    expect(reshapePolygonVertex(triangle, 2, 99, 99, GW, GH)[2]).toEqual({ x: GW, y: GH });
    expect(reshapePolygonVertex(triangle, 0, -5, -5, GW, GH)[0]).toEqual({ x: 0, y: 0 });
  });

  it('does not mutate the input array', () => {
    const copy = triangle.map((p) => ({ ...p }));
    reshapePolygonVertex(triangle, 0, 1, 1, GW, GH);
    expect(triangle).toEqual(copy);
  });
});

describe('verticesEqual', () => {
  it('compares length and every vertex', () => {
    expect(verticesEqual(triangle, triangle.map((p) => ({ ...p })))).toBe(true);
    expect(verticesEqual(triangle, [{ x: 0, y: 0 }])).toBe(false);
    expect(
      verticesEqual(triangle, [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 2.5 },
      ]),
    ).toBe(false);
  });
});

describe('isValidPolygonReshape', () => {
  it('is valid when the bbox stays within the area and does not overlap others', () => {
    expect(isValidPolygonReshape('p1', triangle, [], GW, GH)).toBe(true);
  });

  it('is invalid when a vertex pushes the bbox out of bounds', () => {
    // Vertex clamping happens in reshapePolygonVertex; an unclamped vertex here
    // exercises the bounds branch of the validity check directly.
    const outside: GridPoint[] = [
      { x: 0, y: 0 },
      { x: GW + 2, y: 0 },
      { x: GW + 2, y: 2 },
    ];
    expect(isValidPolygonReshape('p1', outside, [], GW, GH)).toBe(false);
  });

  it('is invalid when the bbox overlaps another element', () => {
    const other: ({ id: string } & GridRect)[] = [
      { id: 'x', gridX: 2, gridY: 0, gridWidth: 1, gridHeight: 1 },
    ];
    expect(isValidPolygonReshape('p1', triangle, other, GW, GH)).toBe(false);
    // The reshaping element ignores its own (stale) rect entry.
    const selfEntry: ({ id: string } & GridRect)[] = [
      { id: 'p1', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
    ];
    expect(isValidPolygonReshape('p1', triangle, selfEntry, GW, GH)).toBe(true);
  });

  it('is invalid for a degenerate (<3 vertex) polygon', () => {
    expect(isValidPolygonReshape('p1', [{ x: 0, y: 0 }], [], GW, GH)).toBe(false);
  });
});
