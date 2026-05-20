import type { Area } from '../../api/areas';
import type { Planting } from '../../api/plantings';
import type { ElementWithArea } from './types';

export type SeasonAreaFilter = 'all' | 'unassigned' | string;
export type SeasonElementFilter = 'all' | string;
export type SeasonSowingMethodFilter = 'all' | Planting['sowingMethod'];
export type SeasonAssignmentFilter = 'all' | 'assigned' | 'unassigned';
export type SeasonTransplantFilter = 'all' | 'transplanted' | 'not_transplanted';
export type SeasonSortKey = 'sow_date' | 'name' | 'location' | 'transplant_date';
export type SeasonSortDir = 'asc' | 'desc';

export function primarySowDate(planting: Planting): string | null {
  if (planting.sowingMethod === 'indoor') return planting.indoorSowDate;
  if (planting.sowingMethod === 'direct_outdoor') return planting.outdoorSowDate;
  return null;
}

export function locationLabel(
  planting: Planting,
  elementLabelById: Map<string, string>,
  unassignedLabel: string,
): string {
  if (!planting.elementId) return unassignedLabel;
  return elementLabelById.get(planting.elementId) ?? planting.elementId;
}

export function compareNullableIso(a: string | null, b: string | null, dir: SeasonSortDir): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const cmp = a.localeCompare(b);
  return dir === 'asc' ? cmp : -cmp;
}

export function filterAndSortSeasonPlantings({
  plantings,
  areas: _areas,
  areaFilter,
  elementFilter,
  sowingMethodFilter,
  assignmentFilter,
  transplantFilter,
  search,
  sortKey,
  sortDir,
  areaIdByElementId,
  elementLabelById,
  transplantedPlantingIds,
  unassignedLabel,
}: {
  plantings: Planting[];
  areas: Area[];
  areaFilter: SeasonAreaFilter;
  elementFilter: SeasonElementFilter;
  sowingMethodFilter: SeasonSowingMethodFilter;
  assignmentFilter: SeasonAssignmentFilter;
  transplantFilter: SeasonTransplantFilter;
  search: string;
  sortKey: SeasonSortKey;
  sortDir: SeasonSortDir;
  areaIdByElementId: Map<string, string>;
  elementLabelById: Map<string, string>;
  transplantedPlantingIds: ReadonlySet<string>;
  unassignedLabel: string;
}): Planting[] {
  const q = search.trim().toLowerCase();
  let list = plantings;

  if (areaFilter === 'unassigned') {
    list = list.filter((p) => p.elementId == null);
  } else if (areaFilter !== 'all') {
    list = list.filter((p) => {
      if (!p.elementId) return false;
      return areaIdByElementId.get(p.elementId) === areaFilter;
    });
  }

  if (elementFilter !== 'all') {
    list = list.filter((p) => p.elementId === elementFilter);
  }

  if (sowingMethodFilter !== 'all') {
    list = list.filter((p) => p.sowingMethod === sowingMethodFilter);
  }

  if (assignmentFilter === 'assigned') {
    list = list.filter((p) => p.elementId != null);
  } else if (assignmentFilter === 'unassigned') {
    list = list.filter((p) => p.elementId == null);
  }

  if (transplantFilter !== 'all') {
    list = list.filter((p) => {
      if (p.sowingMethod !== 'indoor') return false;
      const transplanted =
        transplantedPlantingIds.has(p.id) || p.transplantDate != null;
      return transplantFilter === 'transplanted' ? transplanted : !transplanted;
    });
  }

  if (q) {
    list = list.filter((p) => p.plantName.toLowerCase().includes(q));
  }

  const sorted = [...list];
  sorted.sort((a, b) => {
    if (sortKey === 'name') {
      const cmp = a.plantName.localeCompare(b.plantName, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    }
    if (sortKey === 'location') {
      const la = locationLabel(a, elementLabelById, unassignedLabel);
      const lb = locationLabel(b, elementLabelById, unassignedLabel);
      const aUn = !a.elementId;
      const bUn = !b.elementId;
      if (aUn !== bUn) return aUn ? 1 : -1;
      const cmp = la.localeCompare(lb, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    }
    if (sortKey === 'transplant_date') {
      return compareNullableIso(a.transplantDate, b.transplantDate, sortDir);
    }
    return compareNullableIso(primarySowDate(a), primarySowDate(b), sortDir);
  });

  return sorted;
}

export function buildSeasonInventoryMaps(elementsWithArea: ElementWithArea[]) {
  const elementLabelById = new Map<string, string>();
  const areaIdByElementId = new Map<string, string>();
  for (const el of elementsWithArea) {
    elementLabelById.set(el.id, `${el.areaTitle} · ${el.name}`);
    areaIdByElementId.set(el.id, el.areaId);
  }
  return { elementLabelById, areaIdByElementId };
}
