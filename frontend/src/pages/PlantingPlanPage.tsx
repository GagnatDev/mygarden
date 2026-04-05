import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAreas } from '../api/gardens';
import { listLogs } from '../api/logs';
import {
  createPlanting,
  deletePlanting,
  listPlantings,
  patchPlanting,
  type Planting,
  type SowingMethod,
} from '../api/plantings';
import { listPlantProfiles, type PlantProfile } from '../api/plantProfiles';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';
import { LocaleDateField } from '../components/LocaleDateField';
import { QuickLogModal } from '../planning/QuickLogModal';

export function PlantingPlanPage() {
  const { t } = useTranslation();
  const { selectedGarden, loading: gardenLoading, error: gardenError } = useGardenContext();
  const { seasonId, loading: seasonLoading, error: seasonError } = useActiveSeason(
    selectedGarden?.id ?? null,
  );

  const [areas, setAreas] = useState<Awaited<ReturnType<typeof listAreas>>>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listLogs>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const [useProfile, setUseProfile] = useState(true);
  const [plantProfileId, setPlantProfileId] = useState('');
  const [adhocName, setAdhocName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [sowingMethod, setSowingMethod] = useState<SowingMethod>('indoor');
  const [indoorSow, setIndoorSow] = useState('');
  const [transplant, setTransplant] = useState('');
  const [outdoorSow, setOutdoorSow] = useState('');
  const [harvestStart, setHarvestStart] = useState('');
  const [formBusy, setFormBusy] = useState(false);

  const loadAll = useCallback(async () => {
    if (!selectedGarden || !seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const [a, p, pr, lg] = await Promise.all([
        listAreas(selectedGarden.id),
        listPlantings(selectedGarden.id, seasonId),
        listPlantProfiles(),
        listLogs(selectedGarden.id, seasonId),
      ]);
      setAreas(a);
      setPlantings(p);
      setProfiles(pr);
      setLogs(lg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [selectedGarden, seasonId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const byArea = useMemo(() => {
    const m = new Map<string, Planting[]>();
    for (const pl of plantings) {
      const list = m.get(pl.areaId) ?? [];
      list.push(pl);
      m.set(pl.areaId, list);
    }
    return m;
  }, [plantings]);

  async function handleMovePlanting(plantingId: string, newAreaId: string) {
    if (!selectedGarden) return;
    setError(null);
    try {
      await patchPlanting(selectedGarden.id, plantingId, { areaId: newAreaId });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    }
  }

  async function handleDeletePlanting(plantingId: string) {
    if (!selectedGarden) return;
    if (!window.confirm(t('planning.confirmRemovePlanting'))) return;
    setError(null);
    try {
      await deletePlanting(selectedGarden.id, plantingId);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    }
  }

  async function handleAddPlanting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGarden || !seasonId || !areaId) return;
    setFormBusy(true);
    setError(null);
    try {
      const body: Parameters<typeof createPlanting>[1] = {
        seasonId,
        areaId,
        sowingMethod,
        harvestWindowStart: harvestStart ? new Date(`${harvestStart}T12:00:00.000Z`).toISOString() : null,
      };
      if (useProfile && plantProfileId) {
        body.plantProfileId = plantProfileId;
      } else {
        body.plantName = adhocName.trim();
      }
      if (sowingMethod === 'indoor') {
        body.indoorSowDate = new Date(`${indoorSow}T12:00:00.000Z`).toISOString();
        body.transplantDate = new Date(`${transplant}T12:00:00.000Z`).toISOString();
      } else {
        body.outdoorSowDate = new Date(`${outdoorSow}T12:00:00.000Z`).toISOString();
      }
      await createPlanting(selectedGarden.id, body);
      setAdhocName('');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setFormBusy(false);
    }
  }

  if (gardenLoading || seasonLoading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }
  if (gardenError || seasonError) {
    return <p className="text-red-600">{gardenError ?? seasonError}</p>;
  }
  if (!selectedGarden) {
    return <p className="text-stone-600">{t('garden.noGardenHint')}</p>;
  }
  if (!seasonId) {
    return <p className="text-stone-600">{t('planning.noSeason')}</p>;
  }

  return (
    <div data-testid="planting-plan-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{t('nav.plantingPlan')}</h1>
          <p className="mt-1 text-sm text-stone-600">{t('planning.planHint')}</p>
        </div>
        <button
          type="button"
          data-testid="quick-log-open"
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setQuickLogOpen(true)}
        >
          {t('planning.quickLog')}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <section data-testid="plantings-by-area" className="mt-6 space-y-6">
          {areas.map((a) => {
            const list = byArea.get(a.id) ?? [];
            return (
              <div key={a.id} data-testid={`area-plantings-${a.id}`} className="rounded-xl border border-stone-200 bg-white p-4">
                <h2 className="font-semibold text-stone-900">{a.name}</h2>
                {list.length === 0 ? (
                  <p className="mt-1 text-sm text-stone-500">{t('planning.noPlantingsInArea')}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-stone-100 text-sm text-stone-700">
                    {list.map((pl) => (
                      <li
                        key={pl.id}
                        data-testid={`planting-row-${pl.id}`}
                        className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          {pl.plantName} · {t(`planning.sowing.${pl.sowingMethod}`)}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-stone-600">
                            <span>{t('planning.moveToArea')}</span>
                            <select
                              data-testid={`planting-area-select-${pl.id}`}
                              className="max-w-[10rem] rounded border border-stone-300 px-2 py-1 text-sm text-stone-800"
                              value={pl.areaId}
                              onChange={(e) => void handleMovePlanting(pl.id, e.target.value)}
                            >
                              {areas.map((ar) => (
                                <option key={ar.id} value={ar.id}>
                                  {ar.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            data-testid={`planting-delete-${pl.id}`}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
                            onClick={() => void handleDeletePlanting(pl.id)}
                          >
                            {t('planning.removePlanting')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}

      <form
        data-testid="add-planting-form"
        className="mt-8 max-w-xl space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        onSubmit={(e) => void handleAddPlanting(e)}
      >
        <h2 className="text-sm font-semibold text-stone-800">{t('planning.addPlanting')}</h2>
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
        <label className="block text-sm font-medium text-stone-700">
          {t('garden.areaDetails')}
          <select
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            required
          >
            <option value="">{t('planning.select')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.sowingMethod')}
          <select
            data-testid="sowing-method"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={sowingMethod}
            onChange={(e) => setSowingMethod(e.target.value as SowingMethod)}
          >
            <option value="indoor">{t('planning.sowing.indoor')}</option>
            <option value="direct_outdoor">{t('planning.sowing.direct_outdoor')}</option>
          </select>
        </label>
        {sowingMethod === 'indoor' ? (
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
              {t('planning.transplantDate')}
              <LocaleDateField
                testId="transplant-date"
                required
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

      <section data-testid="activity-timeline" className="mt-10">
        <h2 className="text-lg font-semibold text-stone-900">{t('planning.activityTimeline')}</h2>
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              data-testid={`log-entry-${log.id}`}
              className="rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm text-stone-700"
            >
              <span className="font-medium">{t(`planning.activities.${log.activity}`)}</span>
              <span className="text-stone-500"> · {log.date.slice(0, 10)}</span>
              {log.note ? <p className="text-stone-600">{log.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        gardenId={selectedGarden.id}
        seasonId={seasonId}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        plantings={plantings.map((p) => ({ id: p.id, plantName: p.plantName, areaId: p.areaId }))}
        onLogged={() => void loadAll()}
      />
    </div>
  );
}
