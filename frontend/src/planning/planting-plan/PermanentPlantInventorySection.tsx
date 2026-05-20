import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import { deleteSitePlant, type SitePlant } from '../../api/sitePlants';
import { NotesSection } from '../../components/NotesSection';
import { ElementMoveSelect } from './ElementMoveSelect';
import { usePermanentPlantInventory } from './usePermanentPlantInventory';
import type { ElementWithArea } from './types';

export function PermanentPlantInventorySection({
  gardenId,
  seasonId,
  areas,
  elementsWithArea,
  elementsByAreaId,
  sitePlants,
  onRefresh,
  onMoveSitePlant,
  movingSitePlantId = null,
  onError,
}: {
  gardenId: string;
  seasonId: string;
  areas: Area[];
  elementsWithArea: ElementWithArea[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  sitePlants: SitePlant[];
  onRefresh: () => void | Promise<void>;
  onMoveSitePlant: (sitePlantId: string, newElementId: string) => Promise<boolean>;
  movingSitePlantId?: string | null;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [notesSitePlantId, setNotesSitePlantId] = useState<string | null>(null);
  const inv = usePermanentPlantInventory(sitePlants, areas, elementsWithArea);

  async function handleDelete(id: string) {
    if (!window.confirm(t('planning.confirmRemoveSitePlant'))) return;
    try {
      await deleteSitePlant(gardenId, id);
      if (notesSitePlantId === id) setNotesSitePlantId(null);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('auth.unknownError'));
    }
  }

  return (
    <section data-testid="permanent-plant-inventory" className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-stone-900">
        {t('planning.permanentPlantsTitleWithCount', { count: inv.filteredSitePlants.length })}
      </h2>
      <p className="text-sm text-stone-600">{t('planning.permanentPlantingsHint')}</p>

      <div
        className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
        data-testid="permanent-plant-filters"
      >
        <label className="text-xs font-medium text-stone-700">
          {t('planning.filterArea')}
          <select
            data-testid="permanent-filter-area"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.areaFilter}
            onChange={(e) => inv.setAreaFilter(e.target.value)}
          >
            <option value="all">{t('planning.filterAll')}</option>
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
            data-testid="permanent-filter-element"
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

        <label className="min-w-[10rem] flex-1 text-xs font-medium text-stone-700">
          {t('planning.filterSearch')}
          <input
            data-testid="permanent-filter-search"
            type="search"
            className="mt-1 block w-full rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.search}
            onChange={(e) => inv.setSearch(e.target.value)}
          />
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.sortBy')}
          <select
            data-testid="permanent-sort-key"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.sortKey}
            onChange={(e) => inv.setSortKey(e.target.value as typeof inv.sortKey)}
          >
            <option value="name">{t('planning.sortName')}</option>
            <option value="established">{t('planning.sortEstablished')}</option>
            <option value="location">{t('planning.sortLocation')}</option>
          </select>
        </label>

        <label className="text-xs font-medium text-stone-700">
          {t('planning.sortDirection')}
          <select
            data-testid="permanent-sort-dir"
            className="mt-1 block rounded border border-stone-300 bg-white px-2 py-1 text-sm"
            value={inv.sortDir}
            onChange={(e) => inv.setSortDir(e.target.value as typeof inv.sortDir)}
          >
            <option value="asc">{t('planning.sortAsc')}</option>
            <option value="desc">{t('planning.sortDesc')}</option>
          </select>
        </label>
      </div>

      {inv.filteredSitePlants.length === 0 ? (
        <p className="text-sm text-stone-500" data-testid="permanent-plant-empty">
          {sitePlants.length === 0 ? t('planning.noSitePlants') : t('planning.noPlantsForFilter')}
        </p>
      ) : (
        <ul className="space-y-3">
          {inv.filteredSitePlants.map((sp) => (
            <li
              key={sp.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
              data-testid={`site-plant-row-${sp.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-stone-900">{sp.plantName}</p>
                  <p className="text-sm text-stone-500" data-testid={`permanent-plant-location-${sp.id}`}>
                    {inv.elementLabelById.get(sp.elementId) ?? sp.elementId}
                  </p>
                  {sp.establishedDate ? (
                    <p className="text-xs text-stone-500">
                      {t('planning.establishedLabel')}: {sp.establishedDate}
                    </p>
                  ) : null}
                  {sp.notes ? <p className="mt-1 text-sm text-stone-600">{sp.notes}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-stone-600">
                    <span>{t('planning.moveToElement')}</span>
                    <ElementMoveSelect
                      testId={`site-plant-element-select-${sp.id}`}
                      value={sp.elementId}
                      areas={areas}
                      elementsByAreaId={elementsByAreaId}
                      disabled={movingSitePlantId === sp.id}
                      onChange={(elementId) => void onMoveSitePlant(sp.id, elementId)}
                    />
                    {movingSitePlantId === sp.id ? (
                      <span className="text-stone-500" data-testid={`site-plant-move-saving-${sp.id}`}>
                        {t('planning.savingMove')}
                      </span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-200 px-2 py-1 text-sm text-stone-700 hover:bg-stone-50"
                    onClick={() => setNotesSitePlantId((cur) => (cur === sp.id ? null : sp.id))}
                  >
                    {notesSitePlantId === sp.id ? t('planning.hideNotes') : t('planning.showNotes')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                    onClick={() => void handleDelete(sp.id)}
                  >
                    {t('planning.remove')}
                  </button>
                </div>
              </div>
              {notesSitePlantId === sp.id ? (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <NotesSection
                    gardenId={gardenId}
                    seasonId={seasonId}
                    targetType="site_plant"
                    targetId={sp.id}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
