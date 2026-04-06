import { describe, expect, it } from 'vitest';
import type { ActivityLog } from '../api/logs';
import type { Planting } from '../api/plantings';
import { deriveAreaStatus, derivePlanVsActual } from './layer-helpers';

function planting(id: string, areaId: string): Planting {
  return {
    id,
    gardenId: 'g1',
    seasonId: 's1',
    areaId,
    plantProfileId: null,
    plantName: 'X',
    sowingMethod: 'indoor',
    indoorSowDate: null,
    transplantDate: null,
    outdoorSowDate: null,
    harvestWindowStart: null,
    harvestWindowEnd: null,
    quantity: null,
    notes: null,
    createdBy: 'u1',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  };
}

function log(partial: Partial<ActivityLog> & Pick<ActivityLog, 'activity' | 'date'>): ActivityLog {
  return {
    id: partial.id ?? `l-${Math.random()}`,
    gardenId: 'g1',
    seasonId: 's1',
    plantingId: partial.plantingId ?? null,
    areaId: partial.areaId ?? null,
    activity: partial.activity,
    date: partial.date,
    note: null,
    quantity: null,
    createdBy: 'u1',
    clientTimestamp: '2020-01-01T00:00:00.000Z',
    createdAt: partial.createdAt ?? partial.date,
    updatedAt: partial.updatedAt ?? partial.date,
  };
}

describe('layer-helpers', () => {
  describe('deriveAreaStatus', () => {
    it('returns not-started when area has no plantings', () => {
      expect(deriveAreaStatus('a1', [], [])).toBe('not-started');
    });

    it('returns sown when a planting has a sown log', () => {
      const plantings = [planting('p1', 'a1')];
      const logs = [log({ activity: 'sown_outdoors', date: '2020-02-01', areaId: 'a1', plantingId: 'p1' })];
      expect(deriveAreaStatus('a1', plantings, logs)).toBe('sown');
    });

    it('returns harvested when a planting has a harvested log', () => {
      const plantings = [planting('p1', 'a1')];
      const logs = [log({ activity: 'harvested', date: '2020-03-01', areaId: 'a1', plantingId: 'p1' })];
      expect(deriveAreaStatus('a1', plantings, logs)).toBe('harvested');
    });

    it('multiple plantings: highest status wins', () => {
      const plantings = [planting('p1', 'a1'), planting('p2', 'a1')];
      const logs = [
        log({ activity: 'sown_indoors', date: '2020-02-01', areaId: 'a1', plantingId: 'p1' }),
        log({ activity: 'transplanted', date: '2020-02-02', areaId: 'a1', plantingId: 'p2' }),
      ];
      expect(deriveAreaStatus('a1', plantings, logs)).toBe('planted');
    });
  });

  describe('derivePlanVsActual', () => {
    it('returns complete when all planned plantings have progress logs', () => {
      const plantings = [planting('p1', 'a1'), planting('p2', 'a1')];
      const logs = [
        log({ activity: 'sown_outdoors', date: '2020-02-01', areaId: 'a1', plantingId: 'p1' }),
        log({ activity: 'transplanted', date: '2020-02-02', areaId: 'a1', plantingId: 'p2' }),
      ];
      expect(derivePlanVsActual('a1', plantings, logs)).toBe('complete');
    });

    it('returns partial when some planned plantings have progress logs', () => {
      const plantings = [planting('p1', 'a1'), planting('p2', 'a1')];
      const logs = [log({ activity: 'sown_outdoors', date: '2020-02-01', areaId: 'a1', plantingId: 'p1' })];
      expect(derivePlanVsActual('a1', plantings, logs)).toBe('partial');
    });

    it('returns not-started when no planned plantings have progress logs', () => {
      const plantings = [planting('p1', 'a1')];
      const logs: ActivityLog[] = [];
      expect(derivePlanVsActual('a1', plantings, logs)).toBe('not-started');
    });

    it('returns unplanned when there is progress activity without a planned planting', () => {
      const plantings = [planting('p1', 'a1')];
      const logs = [
        log({ activity: 'sown_outdoors', date: '2020-02-01', areaId: 'a1', plantingId: 'p2' }),
      ];
      expect(derivePlanVsActual('a1', plantings, logs)).toBe('unplanned');
    });
  });
});

