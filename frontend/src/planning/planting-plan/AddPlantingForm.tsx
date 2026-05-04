import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import { createPlanting } from '../../api/plantings';
import type { PlantProfile } from '../../api/plantProfiles';
import { LocaleDateField } from '../../components/LocaleDateField';
import type { ElementWithArea, PlanMode } from './types';

export function AddPlantingForm({
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
  const [planMode, setPlanMode] = useState<PlanMode>('outdoor');
  const [useProfile, setUseProfile] = useState(true);
  const [plantProfileId, setPlantProfileId] = useState('');
  const [adhocName, setAdhocName] = useState('');
  const [elementId, setElementId] = useState('');
  const [indoorSow, setIndoorSow] = useState('');
  const [transplant, setTransplant] = useState('');
  const [outdoorSow, setOutdoorSow] = useState('');
  const [harvestStart, setHarvestStart] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (planMode === 'outdoor' && !elementId) return;
    onBeginSubmit?.();
    setFormBusy(true);
    try {
      const harvestWindowStart = harvestStart
        ? new Date(`${harvestStart}T12:00:00.000Z`).toISOString()
        : null;
      const base = {
        seasonId,
        harvestWindowStart,
        ...(useProfile && plantProfileId
          ? { plantProfileId }
          : { plantName: adhocName.trim() }),
      };
      const body: Parameters<typeof createPlanting>[1] =
        planMode === 'outdoor'
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
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setFormBusy(false);
    }
  }

  return (
    <form
      data-testid="add-planting-form"
      className="mt-6 max-w-xl space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <h2 className="text-sm font-semibold text-stone-800">{t('planning.addPlanting')}</h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="plan-mode-outdoor"
          aria-pressed={planMode === 'outdoor'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            planMode === 'outdoor'
              ? 'bg-emerald-800 text-white'
              : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
          onClick={() => setPlanMode('outdoor')}
        >
          {t('planning.planModeOutdoor')}
        </button>
        <button
          type="button"
          data-testid="plan-mode-indoor"
          aria-pressed={planMode === 'indoor'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            planMode === 'indoor'
              ? 'bg-emerald-800 text-white'
              : 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
          onClick={() => setPlanMode('indoor')}
        >
          {t('planning.planModeIndoor')}
        </button>
      </div>

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
      {planMode === 'outdoor' ? (
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
      ) : null}
      {planMode === 'indoor' ? (
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
        </>
      ) : (
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.outdoorSowDate')}
          <LocaleDateField
            testId="outdoor-sow-date"
            required
            value={outdoorSow}
            onChange={setOutdoorSow}
          />
        </label>
      )}
      <label className="block text-sm font-medium text-stone-700">
        {t('planning.harvestStartOptional')}
        <LocaleDateField allowClear value={harvestStart} onChange={setHarvestStart} />
      </label>
      <button
        type="submit"
        disabled={formBusy}
        data-testid="add-planting-submit"
        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {formBusy ? t('auth.submitting') : t('planning.savePlanting')}
      </button>
    </form>
  );
}
