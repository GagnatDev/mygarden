import type { SitePlant } from '../../api/sitePlants';
import { compareNullableIso } from './season-inventory-helpers';

export type PermanentAreaFilter = 'all' | string;
export type PermanentElementFilter = 'all' | string;
export type PermanentSortKey = 'name' | 'established' | 'location';
export type PermanentSortDir = 'asc' | 'desc';

export function filterAndSortPermanentPlants({
  sitePlants,
  areaFilter,
  elementFilter,
  search,
  sortKey,
  sortDir,
  areaIdByElementId,
  elementLabelById,
  unassignedLabel,
}: {
  sitePlants: SitePlant[];
  areaFilter: PermanentAreaFilter;
  elementFilter: PermanentElementFilter;
  search: string;
  sortKey: PermanentSortKey;
  sortDir: PermanentSortDir;
  areaIdByElementId: Map<string, string>;
  elementLabelById: Map<string, string>;
  unassignedLabel: string;
}): SitePlant[] {
  const q = search.trim().toLowerCase();
  let list = sitePlants ?? [];

  if (areaFilter !== 'all') {
    list = list.filter((sp) => areaIdByElementId.get(sp.elementId) === areaFilter);
  }

  if (elementFilter !== 'all') {
    list = list.filter((sp) => sp.elementId === elementFilter);
  }

  if (q) {
    list = list.filter((sp) => sp.plantName.toLowerCase().includes(q));
  }

  const sorted = [...list];
  sorted.sort((a, b) => {
    if (sortKey === 'established') {
      return compareNullableIso(a.establishedDate, b.establishedDate, sortDir);
    }
    if (sortKey === 'location') {
      const la = elementLabelById.get(a.elementId) ?? unassignedLabel;
      const lb = elementLabelById.get(b.elementId) ?? unassignedLabel;
      const cmp = la.localeCompare(lb, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    }
    const cmp = a.plantName.localeCompare(b.plantName, undefined, { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return sorted;
}
