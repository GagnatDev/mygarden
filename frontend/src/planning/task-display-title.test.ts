import { describe, expect, it, vi } from 'vitest';

import type { GardenTask } from '../api/tasks';
import { getTaskDisplayTitle } from './task-display-title';

function t(key: string, opts?: { plant?: string }): string {
  if (key === 'planning.autoTaskTitle.sow_indoor' && opts?.plant) {
    return `Så ${opts.plant} innendørs`;
  }
  return key;
}

describe('getTaskDisplayTitle', () => {
  it('returns translated title for auto task with plantName and autoKind', () => {
    const task: GardenTask = {
      id: '1',
      gardenId: 'g',
      seasonId: 's',
      plantingId: 'p',
      areaId: null,
      elementId: null,
      plantName: 'Basil',
      title: 'Sow Basil indoors',
      dueDate: '',
      source: 'auto',
      status: 'pending',
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: 'sow_indoor',
      createdAt: '',
      updatedAt: '',
    };
    expect(getTaskDisplayTitle(task, t)).toBe('Så Basil innendørs');
  });

  it('falls back to title for manual tasks', () => {
    const task: GardenTask = {
      id: '1',
      gardenId: 'g',
      seasonId: 's',
      plantingId: null,
      areaId: null,
      elementId: null,
      plantName: null,
      title: 'Water beds',
      dueDate: '',
      source: 'manual',
      status: 'pending',
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: null,
      createdAt: '',
      updatedAt: '',
    };
    expect(getTaskDisplayTitle(task, vi.fn())).toBe('Water beds');
  });

  it('falls back to title when plantName is missing', () => {
    const task: GardenTask = {
      id: '1',
      gardenId: 'g',
      seasonId: 's',
      plantingId: 'p',
      areaId: null,
      elementId: null,
      plantName: null,
      title: 'Sow Basil indoors',
      dueDate: '',
      source: 'auto',
      status: 'pending',
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: 'sow_indoor',
      createdAt: '',
      updatedAt: '',
    };
    expect(getTaskDisplayTitle(task, t)).toBe('Sow Basil indoors');
  });
});
