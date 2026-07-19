import { describe, expect, it } from 'vitest';
import type { Element } from '../api/elements';
import {
  computeMovePreviewFrame,
  computeReshapePreviewFrame,
  computeResizePreviewFrame,
} from './drag-preview-helpers';

const base = {
  areaId: 'ar1',
  type: 'raised_bed' as const,
  color: '#8B4513',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const bed: Element = {
  ...base,
  id: 'a1',
  name: 'Bed',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 1,
};

const other: Element = {
  ...base,
  id: 'a2',
  name: 'Other',
  gridX: 3,
  gridY: 2,
  gridWidth: 1,
  gridHeight: 1,
};

const triangle: Element = {
  ...base,
  id: 'p1',
  name: 'Pond',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 2,
  shape: {
    kind: 'polygon',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ],
  },
};

describe('computeMovePreviewFrame', () => {
  const ms = (curGridX: number, curGridY: number) => ({
    elementId: 'a1',
    origGridX: 0,
    origGridY: 0,
    curGridX,
    curGridY,
    w: 2,
    h: 1,
  });

  it('returns the candidate rect, validity, and no polygon points for a rectangle', () => {
    const frame = computeMovePreviewFrame(ms(1, 1), bed, [bed, other], 6, 4, 28);
    expect(frame.rect).toEqual({ gridX: 1, gridY: 1, gridWidth: 2, gridHeight: 1 });
    expect(frame.valid).toBe(true);
    expect(frame.polygonPointsPx).toBeNull();
  });

  it('flags an overlap with another element as invalid', () => {
    const frame = computeMovePreviewFrame(ms(2, 2), bed, [bed, other], 6, 4, 28);
    expect(frame.valid).toBe(false);
  });

  it('reports alignment guides against the other elements only', () => {
    // At (3, 1) the left edge (x=3) aligns with other's left edge and the
    // bottom edge (y=2) aligns with other's top edge.
    const frame = computeMovePreviewFrame(ms(3, 1), bed, [bed, other], 8, 4, 28);
    expect(frame.guides.vertical).toContain(3);
    expect(frame.guides.horizontal).toContain(2);
  });

  it('translates polygon vertices by the drag delta', () => {
    const frame = computeMovePreviewFrame(
      { elementId: 'p1', origGridX: 0, origGridY: 0, curGridX: 1, curGridY: 1, w: 2, h: 2 },
      triangle,
      [triangle],
      6,
      6,
      10,
    );
    expect(frame.polygonPointsPx).toBe('10,10 30,10 30,30');
  });
});

describe('computeResizePreviewFrame', () => {
  it('returns pixel geometry and all 8 handle anchors for the current rect', () => {
    const cur = { gridX: 1, gridY: 1, gridWidth: 2, gridHeight: 2 };
    const frame = computeResizePreviewFrame({ elementId: 'a1', cur }, [bed], 6, 6, 10);
    expect(frame).toMatchObject({ valid: true, xPx: 10, yPx: 10, widthPx: 20, heightPx: 20 });
    expect(frame.handleAnchorsPx).toHaveLength(8);
    const se = frame.handleAnchorsPx.find((a) => a.handle === 'se');
    expect(se).toEqual({ handle: 'se', cxPx: 30, cyPx: 30 });
  });

  it('marks a rect overlapping another element as invalid', () => {
    const cur = { gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3 };
    const frame = computeResizePreviewFrame({ elementId: 'a1', cur }, [bed, other], 6, 6, 10);
    expect(frame.valid).toBe(false);
  });
});

describe('computeReshapePreviewFrame', () => {
  it('returns preview points and one anchor per vertex', () => {
    const curVertices = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 2 },
    ];
    const frame = computeReshapePreviewFrame({ elementId: 'p1', curVertices }, [triangle], 6, 6, 10);
    expect(frame.valid).toBe(true);
    expect(frame.pointsPx).toBe('0,0 30,0 20,20');
    expect(frame.vertexAnchorsPx).toEqual([
      { cxPx: 0, cyPx: 0 },
      { cxPx: 30, cyPx: 0 },
      { cxPx: 20, cyPx: 20 },
    ]);
  });

  it('marks a reshape whose bbox overlaps another element as invalid', () => {
    const curVertices = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ];
    const frame = computeReshapePreviewFrame(
      { elementId: 'p1', curVertices },
      [triangle, other],
      6,
      6,
      10,
    );
    expect(frame.valid).toBe(false);
  });
});
