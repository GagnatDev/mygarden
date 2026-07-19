import { describe, expect, it } from 'vitest';
import type { Area } from '../api/areas';
import {
  areaSizeMeters,
  computeOverviewTiles,
  computeOverviewWorld,
  dragTilePositionM,
  isAreaPlaced,
  OVERVIEW_EMPTY_WORLD_M,
  OVERVIEW_PX_PER_METER,
  OVERVIEW_UNPLACED_GAP_M,
  OVERVIEW_WORLD_MARGIN_M,
} from './overview-helpers';

function makeArea(overrides: Partial<Area> & { id: string }): Area {
  return {
    gardenId: 'g1',
    title: overrides.id,
    description: '',
    gridWidth: 10,
    gridHeight: 8,
    cellSizeMeters: 0.5,
    sortIndex: 0,
    backgroundImageUrl: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('areaSizeMeters', () => {
  it('multiplies grid dimensions by cell size', () => {
    expect(areaSizeMeters(makeArea({ id: 'a', gridWidth: 10, gridHeight: 8, cellSizeMeters: 0.5 }))).toEqual({
      wM: 5,
      hM: 4,
    });
  });
});

describe('isAreaPlaced', () => {
  it('requires both coordinates to be numbers', () => {
    expect(isAreaPlaced({ overviewX: 1, overviewY: 2 })).toBe(true);
    expect(isAreaPlaced({ overviewX: 0, overviewY: 0 })).toBe(true);
    expect(isAreaPlaced({ overviewX: null, overviewY: 2 })).toBe(false);
    expect(isAreaPlaced({ overviewX: 1, overviewY: null })).toBe(false);
    expect(isAreaPlaced({ overviewX: null, overviewY: null })).toBe(false);
    expect(isAreaPlaced({})).toBe(false);
  });
});

describe('computeOverviewTiles', () => {
  it('keeps stored coordinates for placed areas', () => {
    const tiles = computeOverviewTiles([
      makeArea({ id: 'a', overviewX: 3, overviewY: -2, gridWidth: 4, gridHeight: 4, cellSizeMeters: 1 }),
    ]);
    expect(tiles).toEqual([
      { areaId: 'a', title: 'a', xM: 3, yM: -2, wM: 4, hM: 4, placed: true },
    ]);
  });

  it('lays unplaced areas out in a row below the placed content', () => {
    const tiles = computeOverviewTiles([
      makeArea({ id: 'p1', overviewX: 2, overviewY: 1, gridWidth: 4, gridHeight: 3, cellSizeMeters: 1 }),
      makeArea({ id: 'u1', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 }),
      makeArea({ id: 'u2', gridWidth: 3, gridHeight: 1, cellSizeMeters: 1 }),
    ]);
    const rowY = 1 + 3 + OVERVIEW_UNPLACED_GAP_M;
    expect(tiles[1]).toMatchObject({ areaId: 'u1', xM: 2, yM: rowY, placed: false });
    expect(tiles[2]).toMatchObject({
      areaId: 'u2',
      xM: 2 + 2 + OVERVIEW_UNPLACED_GAP_M,
      yM: rowY,
      placed: false,
    });
  });

  it('starts the row at the origin when nothing is placed', () => {
    const tiles = computeOverviewTiles([
      makeArea({ id: 'u1', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 }),
      makeArea({ id: 'u2', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 }),
    ]);
    expect(tiles[0]).toMatchObject({ xM: 0, yM: 0, placed: false });
    expect(tiles[1]).toMatchObject({ xM: 2 + OVERVIEW_UNPLACED_GAP_M, yM: 0, placed: false });
  });

  it('preserves the input order', () => {
    const tiles = computeOverviewTiles([
      makeArea({ id: 'u1' }),
      makeArea({ id: 'p1', overviewX: 0, overviewY: 0 }),
    ]);
    expect(tiles.map((t) => t.areaId)).toEqual(['u1', 'p1']);
  });
});

describe('computeOverviewWorld', () => {
  it('wraps all tiles with a margin', () => {
    const world = computeOverviewWorld([
      { areaId: 'a', title: 'a', xM: -3, yM: 2, wM: 4, hM: 2, placed: true },
      { areaId: 'b', title: 'b', xM: 5, yM: 8, wM: 1, hM: 1, placed: true },
    ]);
    expect(world.originXM).toBe(-3 - OVERVIEW_WORLD_MARGIN_M);
    expect(world.originYM).toBe(2 - OVERVIEW_WORLD_MARGIN_M);
    expect(world.widthM).toBe(6 - -3 + 2 * OVERVIEW_WORLD_MARGIN_M);
    expect(world.heightM).toBe(9 - 2 + 2 * OVERVIEW_WORLD_MARGIN_M);
    expect(world.widthPx).toBe(world.widthM * OVERVIEW_PX_PER_METER);
    expect(world.heightPx).toBe(world.heightM * OVERVIEW_PX_PER_METER);
  });

  it('falls back to a fixed square for an empty garden', () => {
    const world = computeOverviewWorld([]);
    expect(world.widthM).toBe(OVERVIEW_EMPTY_WORLD_M);
    expect(world.heightM).toBe(OVERVIEW_EMPTY_WORLD_M);
    expect(world.originXM).toBe(0);
    expect(world.originYM).toBe(0);
  });
});

describe('dragTilePositionM', () => {
  it('converts a client-pixel delta to meters at the view scale', () => {
    const pos = dragTilePositionM(2, 3, OVERVIEW_PX_PER_METER * 2, -OVERVIEW_PX_PER_METER, 1);
    expect(pos).toEqual({ xM: 4, yM: 2 });
  });

  it('divides the delta by the zoom scale', () => {
    const pos = dragTilePositionM(0, 0, OVERVIEW_PX_PER_METER * 2, 0, 2);
    expect(pos).toEqual({ xM: 1, yM: 0 });
  });

  it('snaps to 0.1 m', () => {
    const pos = dragTilePositionM(0, 0, OVERVIEW_PX_PER_METER * 0.123, 0, 1);
    expect(pos.xM).toBeCloseTo(0.1, 9);
  });

  it('allows negative coordinates (no bounds at overview level)', () => {
    const pos = dragTilePositionM(0, 0, -OVERVIEW_PX_PER_METER * 5, -OVERVIEW_PX_PER_METER * 5, 1);
    expect(pos).toEqual({ xM: -5, yM: -5 });
  });
});
