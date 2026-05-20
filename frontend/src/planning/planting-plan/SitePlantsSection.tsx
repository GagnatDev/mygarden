import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteSitePlant, type SitePlant } from '../../api/sitePlants';
import { NotesSection } from '../../components/NotesSection';
import type { ElementWithArea } from './types';

export function SitePlantsSection({
  gardenId,
  seasonId,
  elementsByAreaId,
  sitePlants = [],
  onRefresh,
  onMoveSitePlant,
  movingSitePlantId = null,
  onError,
}: {
  gardenId: string;
  seasonId: string;
  elementsByAreaId: Map<string, ElementWithArea[]>;
  sitePlants: SitePlant[];
  onRefresh: () => void | Promise<void>;
  onMoveSitePlant: (sitePlantId: string, newElementId: string) => Promise<boolean>;
  movingSitePlantId?: string | null;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [notesSitePlantId, setNotesSitePlantId] = useState<string | null>(null);

  const elementsFlat = useMemo(
    () => Array.from(elementsByAreaId.values()).flat(),
    [elementsByAreaId],
  );

  const labelByElementId = new Map<string, string>();
  for (const el of elementsFlat) {
    labelByElementId.set(el.id, `${el.areaTitle} · ${el.name}`);
  }

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
    <section data-testid="site-plants-section" className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold text-stone-900">{t('planning.permanentPlantings')}</h2>
      <p className="text-sm text-stone-600">{t('planning.permanentPlantingsHint')}</p>

      {sitePlants.length === 0 ? (
        <p className="text-sm text-stone-500">{t('planning.noSitePlants')}</p>
      ) : (
        <ul className="space-y-3">
          {sitePlants.map((sp) => (
            <li
              key={sp.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
              data-testid={`site-plant-row-${sp.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-stone-900">{sp.plantName}</p>
                  <p className="text-sm text-stone-500">{labelByElementId.get(sp.elementId) ?? sp.elementId}</p>
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
                    <select
                      data-testid={`site-plant-element-select-${sp.id}`}
                      className="max-w-[14rem] rounded border border-stone-300 px-2 py-1 text-sm text-stone-800"
                      value={sp.elementId}
                      disabled={movingSitePlantId === sp.id}
                      aria-busy={movingSitePlantId === sp.id || undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v || v === sp.elementId) return;
                        void onMoveSitePlant(sp.id, v);
                      }}
                    >
                      {elementsFlat.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.areaTitle} · {el.name}
                        </option>
                      ))}
                    </select>
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
