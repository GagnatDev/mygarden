import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type { Area } from '../../api/areas';
import type { Planting } from '../../api/plantings';
import { SeasonPlantInventoryRow } from './SeasonPlantInventoryRow';
import { useSeasonPlantInventory } from './useSeasonPlantInventory';
import type { ElementWithArea } from './types';

export const SeasonPlantInventorySection = memo(function SeasonPlantInventorySection({
  plantings,
  areas,
  elementsWithArea,
  elementsByAreaId,
  transplantedPlantingIds,
  gardenId,
  seasonId,
  locale,
  notesPlantingId,
  setNotesPlantingId,
  onMovePlanting,
  onDeletePlanting,
  onOpenIndoorDetail,
  movingPlantingId,
  t,
}: {
  plantings: Planting[];
  areas: Area[];
  elementsWithArea: ElementWithArea[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  transplantedPlantingIds: ReadonlySet<string>;
  gardenId: string;
  seasonId: string;
  locale: string;
  notesPlantingId: string | null;
  setNotesPlantingId: Dispatch<SetStateAction<string | null>>;
  onMovePlanting: (plantingId: string, elementId: string) => void;
  onDeletePlanting: (plantingId: string) => void;
  onOpenIndoorDetail: (plantingId: string) => void;
  movingPlantingId: string | null;
  t: TFunction;
}) {
  const inv = useSeasonPlantInventory(plantings, areas, elementsWithArea, transplantedPlantingIds);

  return (
    <section data-testid="season-plant-inventory" className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-stone-900">
        {t('planning.seasonPlantsTitleWithCount', { count: inv.filteredPlantings.length })}
      </h2>

      <div
        className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
        data-testid="season-plant-filters"
      >
        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterArea')}
          <select
            data-testid="season-filter-area"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.areaFilter}
            onChange={(e) => inv.setAreaFilter(e.target.value)}
          >
            <option value="all">{t('planning.filterAll')}</option>
            <option value="unassigned">{t('planning.filterAreaUnassigned')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterElement')}
          <select
            data-testid="season-filter-element"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm disabled:opacity-50"
            value={inv.elementFilter}
            disabled={!inv.elementFilterEnabled}
            onChange={(e) => inv.setElementFilter(e.target.value)}
          >
            <option value="all">{t('planning.filterAll')}</option>
            {inv.elementOptions.map((el) => (
              <option key={el.id} value={el.id}>
                {el.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterSowingMethod')}
          <select
            data-testid="season-filter-sowing"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.sowingMethodFilter}
            onChange={(e) =>
              inv.setSowingMethodFilter(e.target.value as typeof inv.sowingMethodFilter)
            }
          >
            <option value="all">{t('planning.filterAll')}</option>
            <option value="indoor">{t('planning.sowing.indoor')}</option>
            <option value="direct_outdoor">{t('planning.sowing.direct_outdoor')}</option>
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterAssignment')}
          <select
            data-testid="season-filter-assignment"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.assignmentFilter}
            onChange={(e) =>
              inv.setAssignmentFilter(e.target.value as typeof inv.assignmentFilter)
            }
          >
            <option value="all">{t('planning.filterAll')}</option>
            <option value="assigned">{t('planning.filterAssigned')}</option>
            <option value="unassigned">{t('planning.filterUnassigned')}</option>
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterTransplant')}
          <select
            data-testid="season-filter-transplant"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.transplantFilter}
            onChange={(e) =>
              inv.setTransplantFilter(e.target.value as typeof inv.transplantFilter)
            }
          >
            <option value="all">{t('planning.filterAll')}</option>
            <option value="not_transplanted">{t('planning.filterNotTransplanted')}</option>
            <option value="transplanted">{t('planning.filterTransplanted')}</option>
          </select>
        </label>

        <label className="min-w-[10rem] flex-1 text-xs font-medium text-stone-700">
          {t('planning.filterSearch')}
          <input
            data-testid="season-filter-search"
            type="search"
            className="mt-1 block w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.search}
            onChange={(e) => inv.setSearch(e.target.value)}
          />
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.sortBy')}
          <select
            data-testid="season-sort-key"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.sortKey}
            onChange={(e) => inv.setSortKey(e.target.value as typeof inv.sortKey)}
          >
            <option value="sow_date">{t('planning.sortSowDate')}</option>
            <option value="name">{t('planning.sortName')}</option>
            <option value="location">{t('planning.sortLocation')}</option>
            <option value="transplant_date">{t('planning.sortTransplantDate')}</option>
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.sortDirection')}
          <select
            data-testid="season-sort-dir"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.sortDir}
            onChange={(e) => inv.setSortDir(e.target.value as typeof inv.sortDir)}
          >
            <option value="asc">{t('planning.sortAsc')}</option>
            <option value="desc">{t('planning.sortDesc')}</option>
          </select>
        </label>
      </div>

      {inv.filteredPlantings.length === 0 ? (
        <p className="text-sm text-stone-500" data-testid="season-plant-empty">
          {t('planning.noPlantsForFilter')}
        </p>
      ) : (
        <ul className="space-y-3">
          {inv.filteredPlantings.map((pl) => (
            <SeasonPlantInventoryRow
              key={pl.id}
              pl={pl}
              gardenId={gardenId}
              seasonId={seasonId}
              areas={areas}
              elementsByAreaId={elementsByAreaId}
              locale={locale}
              elementLabelById={inv.elementLabelById}
              unassignedLabel={inv.unassignedLabel}
              notesPlantingId={notesPlantingId}
              setNotesPlantingId={setNotesPlantingId}
              onMove={onMovePlanting}
              onDelete={onDeletePlanting}
              onOpenIndoorDetail={onOpenIndoorDetail}
              isMoving={movingPlantingId === pl.id}
              t={t}
            />
          ))}
        </ul>
      )}
    </section>
  );
});
