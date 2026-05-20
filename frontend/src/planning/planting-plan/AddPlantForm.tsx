import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import { createPlanting } from '../../api/plantings';
import { createSitePlant } from '../../api/sitePlants';
import type { PlantProfile } from '../../api/plantProfiles';
import { LocaleDateField } from '../../components/LocaleDateField';
import type { ElementWithArea } from './types';

export type AddPlantType = 'permanent' | 'outdoor' | 'indoor';

export function AddPlantForm({
  gardenId,
  seasonId,
  areas,
  elementsByAreaId,
  profiles,
  onCreated,
  onError,
  onBeginSubmit,
}: {
  gardenId: string;
  seasonId: string;
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  profiles: PlantProfile[];
  onCreated: () => void | Promise<void>;
  onError: (message: string) => void;
  onBeginSubmit?: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [plantType, setPlantType] = useState<AddPlantType>('outdoor');
  const [useProfile, setUseProfile] = useState(true);
  const [plantProfileId, setPlantProfileId] = useState('');
  const [adhocName, setAdhocName] = useState('');
  const [elementId, setElementId] = useState('');
  const [indoorSow, setIndoorSow] = useState('');
  const [transplant, setTransplant] = useState('');
  const [outdoorSow, setOutdoorSow] = useState('');
  const [harvestStart, setHarvestStart] = useState('');
  const [established, setEstablished] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  const elementSelect = (
    <label className="block text-sm font-medium text-stone-700">
      {t('planning.element')}
      <select
        data-testid="add-form-element"
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
  );

  const plantSourceFields = (
    <>
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
            data-testid="adhoc-plant-name"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={adhocName}
            onChange={(e) => setAdhocName(e.target.value)}
            required={!useProfile}
          />
        </label>
      )}
    </>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (plantType !== 'indoor' && !elementId) return;
    onBeginSubmit?.();
    setFormBusy(true);
    try {
      const plantSource =
        useProfile && plantProfileId
          ? { plantProfileId }
          : { plantName: adhocName.trim() };

      if (plantType === 'permanent') {
        await createSitePlant(gardenId, {
          elementId,
          ...plantSource,
          ...(established.trim() ? { establishedDate: established } : {}),
          ...(notesDraft.trim() ? { notes: notesDraft.trim() } : {}),
        });
        setAdhocName('');
        setNotesDraft('');
        setEstablished('');
      } else {
        const harvestWindowStart = harvestStart
          ? new Date(`${harvestStart}T12:00:00.000Z`).toISOString()
          : null;
        const base = {
          seasonId,
          harvestWindowStart,
          ...plantSource,
        };
        const body: Parameters<typeof createPlanting>[1] =
          plantType === 'outdoor'
            ? {
                ...base,
                elementId,
                sowingMethod: 'direct_outdoor',
                outdoorSowDate: new Date(`${outdoorSow}T12:00:00.000Z`).toISOString(),
              }
            : {
                ...base,
                elementId: null,
                sowingMethod: 'indoor',
                indoorSowDate: new Date(`${indoorSow}T12:00:00.000Z`).toISOString(),
                ...(transplant.trim()
                  ? { transplantDate: new Date(`${transplant}T12:00:00.000Z`).toISOString() }
                  : {}),
              };
        await createPlanting(gardenId, body);
        setAdhocName('');
      }
      setExpanded(false);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setFormBusy(false);
    }
  }

  const saveLabel =
    plantType === 'permanent'
      ? t('planning.saveSitePlant')
      : t('planning.savePlanting');

  if (!expanded) {
    return (
      <div className="mt-6" data-testid="add-plant-form">
        <button
          type="button"
          data-testid="add-plant-expand"
          className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          onClick={() => setExpanded(true)}
        >
          {t('planning.addPlant')}
        </button>
      </div>
    );
  }

  return (
    <form
      data-testid="add-plant-form"
      className="mt-6 max-w-xl space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800">{t('planning.addPlant')}</h2>
        <button
          type="button"
          data-testid="add-plant-collapse"
          className="text-xs font-medium text-stone-600 hover:text-stone-900"
          onClick={() => setExpanded(false)}
        >
          {t('planning.addPlantCollapse')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('planning.addPlantTypeLabel')}>
        <button
          type="button"
          data-testid="add-plant-type-permanent"
          aria-pressed={plantType === 'permanent'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            plantType === 'permanent'
              ? 'bg-emerald-800 text-white'
              : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
          onClick={() => setPlantType('permanent')}
        >
          {t('planning.addPlantTypePermanent')}
        </button>
        <button
          type="button"
          data-testid="plan-mode-outdoor"
          aria-pressed={plantType === 'outdoor'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            plantType === 'outdoor'
              ? 'bg-emerald-800 text-white'
              : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
          onClick={() => setPlantType('outdoor')}
        >
          {t('planning.addPlantTypeOutdoor')}
        </button>
        <button
          type="button"
          data-testid="plan-mode-indoor"
          aria-pressed={plantType === 'indoor'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            plantType === 'indoor'
              ? 'bg-emerald-800 text-white'
              : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
          onClick={() => setPlantType('indoor')}
        >
          {t('planning.addPlantTypeIndoor')}
        </button>
      </div>

      {plantSourceFields}

      {plantType === 'permanent' ? (
        <>
          {elementSelect}
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
        </>
      ) : null}

      {plantType === 'outdoor' ? (
        <>
          {elementSelect}
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.outdoorSowDate')}
            <LocaleDateField
              testId="outdoor-sow-date"
              required
              value={outdoorSow}
              onChange={setOutdoorSow}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.harvestStartOptional')}
            <LocaleDateField allowClear value={harvestStart} onChange={setHarvestStart} />
          </label>
        </>
      ) : null}

      {plantType === 'indoor' ? (
        <>
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.indoorSowDate')}
            <LocaleDateField
              testId="indoor-sow-date"
              required
              value={indoorSow}
              onChange={setIndoorSow}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            <span>{t('planning.transplantDateOptional')}</span>
            <LocaleDateField
              testId="transplant-date"
              allowClear
              value={transplant}
              onChange={setTransplant}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            {t('planning.harvestStartOptional')}
            <LocaleDateField allowClear value={harvestStart} onChange={setHarvestStart} />
          </label>
        </>
      ) : null}

      <button
        type="submit"
        disabled={formBusy}
        data-testid="add-plant-submit"
        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {formBusy ? t('auth.submitting') : saveLabel}
      </button>
    </form>
  );
}
