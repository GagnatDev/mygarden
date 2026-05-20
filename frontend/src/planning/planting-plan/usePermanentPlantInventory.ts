import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SitePlant } from '../../api/sitePlants';
import {
  filterAndSortPermanentPlants,
  type PermanentAreaFilter,
  type PermanentElementFilter,
  type PermanentSortDir,
  type PermanentSortKey,
} from './permanent-inventory-helpers';
import { buildSeasonInventoryMaps } from './season-inventory-helpers';
import type { ElementWithArea } from './types';

export function usePermanentPlantInventory(
  sitePlants: SitePlant[],
  elementsWithArea: ElementWithArea[],
) {
  const { t } = useTranslation();
  const [areaFilter, setAreaFilter] = useState<PermanentAreaFilter>('all');
  const [elementFilter, setElementFilter] = useState<PermanentElementFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<PermanentSortKey>('name');
  const [sortDir, setSortDir] = useState<PermanentSortDir>('asc');

  const { elementLabelById, areaIdByElementId } = useMemo(
    () => buildSeasonInventoryMaps(elementsWithArea),
    [elementsWithArea],
  );

  const unassignedLabel = t('planning.unassignedLocation');

  const filteredSitePlants = useMemo(
    () =>
      filterAndSortPermanentPlants({
        sitePlants,
        areaFilter,
        elementFilter,
        search,
        sortKey,
        sortDir,
        areaIdByElementId,
        elementLabelById,
        unassignedLabel,
      }),
    [
      sitePlants,
      areaFilter,
      elementFilter,
      search,
      sortKey,
      sortDir,
      areaIdByElementId,
      elementLabelById,
      unassignedLabel,
    ],
  );

  const elementFilterEnabled = areaFilter !== 'all';

  const elementOptions = useMemo(() => {
    if (!elementFilterEnabled) return [];
    return elementsWithArea.filter((el) => el.areaId === areaFilter);
  }, [elementFilterEnabled, areaFilter, elementsWithArea]);

  function onAreaFilterChange(next: PermanentAreaFilter) {
    setAreaFilter(next);
    setElementFilter('all');
  }

  return {
    areaFilter,
    setAreaFilter: onAreaFilterChange,
    elementFilter,
    setElementFilter,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    filteredSitePlants,
    elementLabelById,
    elementFilterEnabled,
    elementOptions,
  };
}
