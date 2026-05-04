import type { Area } from '../api/areas';
import type { GardenTask } from '../api/tasks';

/** Resolved location for a task tied to an element. */
export interface ElementLocation {
  areaId: string;
  areaTitle: string;
  elementName: string;
}

export type GroupedSectionKind = 'area' | 'unknown' | 'no_location';

export interface GroupedTaskSection {
  kind: GroupedSectionKind;
  /** Set when kind === 'area'. */
  areaId?: string;
  /** Display title for the section header (area title, or empty when header comes from i18n). */
  headerTitle: string;
  sortIndex: number;
  tasks: GardenTask[];
}

function sortTasksInSection(tasks: GardenTask[], elementLocations: ReadonlyMap<string, ElementLocation>): GardenTask[] {
  return [...tasks].sort((a, b) => {
    const elA = a.elementId ? (elementLocations.get(a.elementId)?.elementName ?? '\uffff') : '';
    const elB = b.elementId ? (elementLocations.get(b.elementId)?.elementName ?? '\uffff') : '';
    if (elA !== elB) return elA.localeCompare(elB);
    if (elA === '' && elB === '') {
      const areaCmp = (a.areaId ?? '').localeCompare(b.areaId ?? '');
      if (areaCmp !== 0) return areaCmp;
    }
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

/**
 * Groups tasks for a single calendar day: one section per area (by sortIndex), then unknown element, then no location.
 */
export function groupTasksByArea(
  tasks: GardenTask[],
  areas: Area[],
  elementLocations: ReadonlyMap<string, ElementLocation>,
): GroupedTaskSection[] {
  const sortedAreas = [...areas].sort((a, b) => a.sortIndex - b.sortIndex || a.id.localeCompare(b.id));
  const byAreaId = new Map<string, GardenTask[]>();
  for (const a of sortedAreas) {
    byAreaId.set(a.id, []);
  }

  const unknown: GardenTask[] = [];
  const noLocation: GardenTask[] = [];

  for (const task of tasks) {
    if (task.elementId) {
      const loc = elementLocations.get(task.elementId);
      if (!loc) {
        unknown.push(task);
        continue;
      }
      const bucket = byAreaId.get(loc.areaId);
      if (bucket) {
        bucket.push(task);
      } else {
        unknown.push(task);
      }
      continue;
    }
    if (task.areaId) {
      const bucket = byAreaId.get(task.areaId);
      if (bucket) {
        bucket.push(task);
      } else {
        unknown.push(task);
      }
      continue;
    }
    noLocation.push(task);
  }

  const sections: GroupedTaskSection[] = [];
  for (const a of sortedAreas) {
    const list = byAreaId.get(a.id) ?? [];
    if (list.length === 0) continue;
    sections.push({
      kind: 'area',
      areaId: a.id,
      headerTitle: a.title,
      sortIndex: a.sortIndex,
      tasks: sortTasksInSection(list, elementLocations),
    });
  }
  if (unknown.length > 0) {
    sections.push({
      kind: 'unknown',
      headerTitle: '',
      sortIndex: 1_000_000,
      tasks: sortTasksInSection(unknown, elementLocations),
    });
  }
  if (noLocation.length > 0) {
    sections.push({
      kind: 'no_location',
      headerTitle: '',
      sortIndex: 1_000_001,
      tasks: sortTasksInSection(noLocation, elementLocations),
    });
  }
  return sections;
}
