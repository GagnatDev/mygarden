import { describe, expect, it } from 'vitest';
import type { Planting } from '../../api/plantings';
import {
  filterAndSortSeasonPlantings,
  primarySowDate,
} from './season-inventory-helpers';

const base = (overrides: Partial<Planting>): Planting => ({
  id: 'p1',
  gardenId: 'g1',
  seasonId: 's1',
  elementId: 'e1',
  plantProfileId: null,
  plantName: 'Alpha',
  sowingMethod: 'indoor',
  indoorSowDate: '2026-03-01T12:00:00.000Z',
  transplantDate: null,
  outdoorSowDate: null,
  harvestWindowStart: null,
  harvestWindowEnd: null,
  quantity: null,
  notes: null,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('season-inventory-helpers', () => {
  it('primarySowDate picks indoor or outdoor date', () => {
    expect(primarySowDate(base({ sowingMethod: 'indoor', indoorSowDate: '2026-01-01' }))).toBe(
      '2026-01-01',
    );
    expect(
      primarySowDate(
        base({
          sowingMethod: 'direct_outdoor',
          indoorSowDate: null,
          outdoorSowDate: '2026-05-01',
        }),
      ),
    ).toBe('2026-05-01');
  });

  it('filters by area and sorts by sow date ascending', () => {
    const plantings = [
      base({ id: 'p1', plantName: 'B', indoorSowDate: '2026-04-01T12:00:00.000Z', elementId: 'e1' }),
      base({ id: 'p2', plantName: 'A', indoorSowDate: '2026-02-01T12:00:00.000Z', elementId: 'e1' }),
      base({ id: 'p3', plantName: 'C', elementId: null }),
    ];
    const result = filterAndSortSeasonPlantings({
      plantings,
      areas: [{ id: 'ar1', title: 'Front' } as never],
      areaFilter: 'ar1',
      elementFilter: 'all',
      sowingMethodFilter: 'all',
      assignmentFilter: 'all',
      transplantFilter: 'all',
      search: '',
      sortKey: 'sow_date',
      sortDir: 'asc',
      areaIdByElementId: new Map([['e1', 'ar1']]),
      elementLabelById: new Map([
        ['e1', 'Front · Bed A'],
        ['e2', 'Back · Bed B'],
      ]),
      transplantedPlantingIds: new Set(),
      unassignedLabel: 'Unassigned',
    });
    expect(result.map((p) => p.id)).toEqual(['p2', 'p1']);
  });
});
