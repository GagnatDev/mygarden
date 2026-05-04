import type { Area } from '../api/areas';
import type { GardenTask } from '../api/tasks';
import { describe, expect, it } from 'vitest';
import { type ElementLocation, groupTasksByArea } from './group-tasks-by-area';

function task(overrides: Partial<GardenTask> & Pick<GardenTask, 'id' | 'title' | 'elementId'>): GardenTask {
  return {
    gardenId: 'g1',
    seasonId: 's1',
    plantingId: null,
    areaId: null,
    plantName: null,
    dueDate: '2026-05-01T12:00:00.000Z',
    source: 'manual',
    status: 'pending',
    completedAt: null,
    completedBy: null,
    linkedLogId: null,
    autoKind: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function area(overrides: Partial<Area> & Pick<Area, 'id' | 'title' | 'sortIndex'>): Area {
  return {
    gardenId: 'g1',
    description: '',
    gridWidth: 4,
    gridHeight: 4,
    cellSizeMeters: 1,
    backgroundImageUrl: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('groupTasksByArea', () => {
  it('orders area sections by sortIndex', () => {
    const areas = [
      area({ id: 'b', title: 'Back', sortIndex: 20 }),
      area({ id: 'f', title: 'Front', sortIndex: 10 }),
    ];
    const loc = new Map<string, ElementLocation>([
      ['e1', { areaId: 'b', areaTitle: 'Back', elementName: 'Bed' }],
      ['e2', { areaId: 'f', areaTitle: 'Front', elementName: 'Pot' }],
    ]);
    const tasks = [task({ id: 't1', title: 'A', elementId: 'e1' }), task({ id: 't2', title: 'B', elementId: 'e2' })];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections.map((s) => s.kind)).toEqual(['area', 'area']);
    expect(sections.map((s) => s.headerTitle)).toEqual(['Front', 'Back']);
    expect(sections[0]!.tasks.map((t) => t.id)).toEqual(['t2']);
    expect(sections[1]!.tasks.map((t) => t.id)).toEqual(['t1']);
  });

  it('buckets tasks with areaId but no element into that area section', () => {
    const areas = [area({ id: 'a1', title: 'North', sortIndex: 0 })];
    const loc = new Map<string, ElementLocation>([['e1', { areaId: 'a1', areaTitle: 'North', elementName: 'Bed' }]]);
    const tasks = [
      task({ id: 'whole', title: 'Fence', elementId: null, areaId: 'a1' }),
      task({ id: 'bed', title: 'Sow', elementId: 'e1', areaId: null }),
    ];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections.map((s) => s.kind)).toEqual(['area']);
    expect(sections[0]!.tasks.map((t) => t.id)).toEqual(['whole', 'bed']);
  });

  it('puts tasks without elementId in no_location last', () => {
    const areas = [area({ id: 'a1', title: 'Only', sortIndex: 0 })];
    const loc = new Map<string, ElementLocation>([['e1', { areaId: 'a1', areaTitle: 'Only', elementName: 'X' }]]);
    const tasks = [
      task({ id: 'manual', title: 'M', elementId: null }),
      task({ id: 'placed', title: 'P', elementId: 'e1' }),
    ];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections.map((s) => s.kind)).toEqual(['area', 'no_location']);
    expect(sections[1]!.tasks.map((t) => t.id)).toEqual(['manual']);
  });

  it('buckets unknown elementId between area and no_location', () => {
    const areas = [area({ id: 'a1', title: 'A', sortIndex: 0 })];
    const loc = new Map<string, ElementLocation>();
    const tasks = [
      task({ id: 'nl', title: 'No loc', elementId: null }),
      task({ id: 'bad', title: 'Gone el', elementId: 'missing' }),
    ];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections.map((s) => s.kind)).toEqual(['unknown', 'no_location']);
    expect(sections[0]!.tasks[0]!.id).toBe('bad');
    expect(sections[1]!.tasks[0]!.id).toBe('nl');
  });

  it('sorts tasks within an area by element name then title', () => {
    const areas = [area({ id: 'a1', title: 'A', sortIndex: 0 })];
    const loc = new Map<string, ElementLocation>([
      ['e2', { areaId: 'a1', areaTitle: 'A', elementName: 'Zebra' }],
      ['e1', { areaId: 'a1', areaTitle: 'A', elementName: 'Alpha' }],
    ]);
    const tasks = [
      task({ id: 't2', title: 'b', elementId: 'e2' }),
      task({ id: 't1', title: 'a', elementId: 'e1' }),
    ];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections[0]!.tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('omits empty area sections', () => {
    const areas = [
      area({ id: 'empty', title: 'Empty', sortIndex: 0 }),
      area({ id: 'full', title: 'Full', sortIndex: 1 }),
    ];
    const loc = new Map<string, ElementLocation>([['e1', { areaId: 'full', areaTitle: 'Full', elementName: 'E' }]]);
    const tasks = [task({ id: 't1', title: 'T', elementId: 'e1' })];
    const sections = groupTasksByArea(tasks, areas, loc);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.areaId).toBe('full');
  });
});
