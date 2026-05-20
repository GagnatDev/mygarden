import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import type { Planting } from '../../api/plantings';
import {
  buildSeasonInventoryMaps,
  filterAndSortSeasonPlantings,
  type SeasonAreaFilter,
  type SeasonAssignmentFilter,
  type SeasonElementFilter,
  type SeasonSortDir,
  type SeasonSortKey,
  type SeasonSowingMethodFilter,
  type SeasonTransplantFilter,
} from './season-inventory-helpers';
import type { ElementWithArea } from './types';

export function useSeasonPlantInventory(
  plantings: Planting[],
  areas: Area[],
  elementsWithArea: ElementWithArea[],
  transplantedPlantingIds: ReadonlySet<string>,
) {
  const { t } = useTranslation();
  const [areaFilter, setAreaFilter] = useState<SeasonAreaFilter>('all');
  const [elementFilter, setElementFilter] = useState<SeasonElementFilter>('all');
  const [sowingMethodFilter, setSowingMethodFilter] = useState<SeasonSowingMethodFilter>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<SeasonAssignmentFilter>('all');
  const [transplantFilter, setTransplantFilter] = useState<SeasonTransplantFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SeasonSortKey>('sow_date');
  const [sortDir, setSortDir] = useState<SeasonSortDir>('asc');

  const { elementLabelById, areaIdByElementId } = useMemo(
    () => buildSeasonInventoryMaps(elementsWithArea),
    [elementsWithArea],
  );

  const unassignedLabel = t('planning.unassignedLocation');

  const filteredPlantings = useMemo(
    () =>
      filterAndSortSeasonPlantings({
        plantings,
        areas,
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
      }),
    [
      plantings,
      areas,
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
    ],
  );

  const elementFilterEnabled =
    areaFilter !== 'all' && areaFilter !== 'unassigned';

  const elementOptions = useMemo(() => {
    if (!elementFilterEnabled || areaFilter === 'all' || areaFilter === 'unassigned') {
      return [];
    }
    return elementsWithArea.filter((el) => el.areaId === areaFilter);
  }, [elementFilterEnabled, areaFilter, elementsWithArea]);

  function onAreaFilterChange(next: SeasonAreaFilter) {
    setAreaFilter(next);
    setElementFilter('all');
  }

  return {
    areaFilter,
    setAreaFilter: onAreaFilterChange,
    elementFilter,
    setElementFilter,
    sowingMethodFilter,
    setSowingMethodFilter,
    assignmentFilter,
    setAssignmentFilter,
    transplantFilter,
    setTransplantFilter,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    filteredPlantings,
    elementLabelById,
    elementFilterEnabled,
    elementOptions,
    unassignedLabel,
  };
}
