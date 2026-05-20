import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import { createSitePlant, deleteSitePlant, updateSitePlant, type SitePlant } from '../../api/sitePlants';
import type { PlantProfile } from '../../api/plantProfiles';
import { NotesSection } from '../../components/NotesSection';
import { LocaleDateField } from '../../components/LocaleDateField';
import type { ElementWithArea } from './types';

export function SitePlantsSection({
  gardenId,
  seasonId,
  areas,
  elementsByAreaId,
  profiles,
  sitePlants = [],
  onRefresh,
  onError,
}: {
  gardenId: string;
  seasonId: string;
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  profiles: PlantProfile[];
  sitePlants: SitePlant[];
  onRefresh: () => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [useProfile, setUseProfile] = useState(true);
  const [plantProfileId, setPlantProfileId] = useState('');
  const [adhocName, setAdhocName] = useState('');
  const [elementId, setElementId] = useState('');
  const [established, setEstablished] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [notesSitePlantId, setNotesSitePlantId] = useState<string | null>(null);

  const elementsFlat = useMemo(
    () => Array.from(elementsByAreaId.values()).flat(),
    [elementsByAreaId],
  );

  const labelByElementId = new Map<string, string>();
  for (const el of elementsFlat) {
    labelByElementId.set(el.id, `${el.areaTitle} · ${el.name}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!elementId) return;
    setFormBusy(true);
    try {
      await createSitePlant(gardenId, {
        elementId,
        ...(useProfile && plantProfileId ? { plantProfileId } : { plantName: adhocName.trim() }),
        ...(established.trim() ? { establishedDate: established } : {}),
        ...(notesDraft.trim() ? { notes: notesDraft.trim() } : {}),
      });
      setAdhocName('');
      setNotesDraft('');
      setEstablished('');
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setFormBusy(false);
    }
  }

  async function handleMove(sitePlantId: string, newElementId: string) {
    try {
      await updateSitePlant(gardenId, sitePlantId, { elementId: newElementId });
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('auth.unknownError'));
    }
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

      <form
        className="max-w-xl space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h3 className="text-sm font-semibold text-stone-800">{t('planning.addSitePlant')}</h3>
        <fieldset className="space-y-2 text-sm">
          <legend className="font-medium text-stone-700">{t('planning.plantSource')}</legend>
          <label className="flex items-center gap-2">
            <input type="radio" checked={useProfile} onChange={() => setUseProfile(true)} />
            {t('planning.fromProfile')}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!useProfile} onChange={() => setUseProfile(false)} />
            {t('planning.adhocName')}
          </label>
        </fieldset>
        {useProfile ? (
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.plantProfile')}
            <select
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={plantProfileId}
              onChange={(e) => setPlantProfileId(e.target.value)}
              required={useProfile}
            >
              <option value="">{t('planning.select')}</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.plantName')}
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={adhocName}
              onChange={(e) => setAdhocName(e.target.value)}
              required={!useProfile}
            />
          </label>
        )}
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.element')}
          <select
            data-testid="site-plant-element"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={elementId}
            onChange={(e) => setElementId(e.target.value)}
            required
          >
            <option value="">{t('planning.select')}</option>
            {areas.map((area) => (
              <optgroup key={area.id} label={area.title}>
                {(elementsByAreaId.get(area.id) ?? []).map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.establishedDateOptional')}
          <LocaleDateField allowClear value={established} onChange={setEstablished} />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.sitePlantNotesField')}
          <textarea
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            rows={2}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={formBusy}
          data-testid="site-plant-submit"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {formBusy ? t('auth.submitting') : t('planning.saveSitePlant')}
        </button>
      </form>

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
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v || v === sp.elementId) return;
                        void handleMove(sp.id, v);
                      }}
                    >
                      {elementsFlat.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.areaTitle} · {el.name}
                        </option>
                      ))}
                    </select>
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
