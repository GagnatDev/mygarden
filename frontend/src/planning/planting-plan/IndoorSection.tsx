import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Planting } from '../../api/plantings';
import { IndoorPlantingRow } from './IndoorPlantingRow';

export type IndoorSectionAssignmentFilter = 'all' | 'unassigned' | 'assigned';

export function IndoorSection({
  indoorPlantings,
  locale,
  elementLabelById,
  assignmentFilter,
  setAssignmentFilter,
  includeTransplanted,
  setIncludeTransplanted,
  onOpenRow,
}: {
  indoorPlantings: Planting[];
  locale: string;
  elementLabelById: Map<string, string>;
  assignmentFilter: IndoorSectionAssignmentFilter;
  setAssignmentFilter: (v: IndoorSectionAssignmentFilter) => void;
  includeTransplanted: boolean;
  setIncludeTransplanted: (v: boolean) => void;
  onOpenRow: (plantingId: string) => void;
}) {
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    let list = indoorPlantings;
    if (!includeTransplanted) {
      list = list.filter((p) => p.transplantDate == null);
    }
    if (assignmentFilter === 'unassigned') {
      list = list.filter((p) => p.elementId == null);
    } else if (assignmentFilter === 'assigned') {
      list = list.filter((p) => p.elementId != null);
    }
    return list;
  }, [indoorPlantings, includeTransplanted, assignmentFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const da = a.indoorSowDate;
      const db = b.indoorSowDate;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    });
    return list;
  }, [filtered]);

  return (
    <section data-testid="indoor-section" className="mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {t('planning.indoorSectionTitleWithCount', { count: sorted.length })}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">{t('planning.indoorSectionHint')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-stone-700">
            {t('planning.indoorFilterAssignment')}
            <select
              data-testid="indoor-filter-assignment"
              className="ml-2 rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-800"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as IndoorSectionAssignmentFilter)}
            >
              <option value="all">{t('planning.indoorFilterAllPending')}</option>
              <option value="unassigned">{t('planning.indoorFilterUnassigned')}</option>
              <option value="assigned">{t('planning.indoorFilterAssigned')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-stone-700">
            <input
              data-testid="indoor-filter-include-transplanted"
              type="checkbox"
              checked={includeTransplanted}
              onChange={(e) => setIncludeTransplanted(e.target.checked)}
            />
            {t('planning.indoorFilterIncludeTransplanted')}
          </label>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-stone-500">{t('planning.noIndoorForFilter')}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white px-2 text-sm text-stone-700">
          {sorted.map((pl) => (
            <IndoorPlantingRow
              key={pl.id}
              pl={pl}
              locale={locale}
              elementLabel={pl.elementId ? (elementLabelById.get(pl.elementId) ?? null) : null}
              onOpen={onOpenRow}
              t={t}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

