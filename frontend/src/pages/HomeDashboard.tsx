import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { listAreas } from '../api/areas';
import { listElements } from '../api/elements';
import { listPlantings } from '../api/plantings';
import { GardenCreateModal } from '../garden/GardenCreateModal';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';
import { QuickLogModal } from '../planning/QuickLogModal';

export function HomeDashboard() {
  const { t } = useTranslation();
  const { selectedGarden, loading, error, gardens, refreshGardens } = useGardenContext();
  const { seasonId } = useActiveSeason(selectedGarden?.id ?? null);
  const [elementsLabelled, setElementsLabelled] = useState<{ id: string; name: string }[]>([]);
  const [plantings, setPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [createGardenOpen, setCreateGardenOpen] = useState(false);

  const loadQuickLogData = useCallback(async () => {
    if (!selectedGarden || !seasonId) {
      setElementsLabelled([]);
      setPlantings([]);
      return;
    }
    try {
      const areas = await listAreas(selectedGarden.id);
      const lists = await Promise.all(
        areas.map((a) => listElements(selectedGarden.id, a.id)),
      );
      const flat = areas.flatMap((a, i) =>
        (lists[i] ?? []).map((el) => ({
          id: el.id,
          name: `${a.title} · ${el.name}`,
        })),
      );
      const p = await listPlantings(selectedGarden.id, seasonId);
      setElementsLabelled(flat);
      setPlantings(p);
    } catch {
      setElementsLabelled([]);
      setPlantings([]);
    }
  }, [selectedGarden, seasonId]);

  useEffect(() => {
    void loadQuickLogData();
  }, [loadQuickLogData]);

  const quickLogProps = useMemo(() => {
    if (!selectedGarden || !seasonId) return null;
    return {
      gardenId: selectedGarden.id,
      seasonId,
      elements: elementsLabelled,
      plantings: plantings.map((p) => ({
        id: p.id,
        plantName: p.plantName,
        elementId: p.elementId ?? '',
      })),
    };
  }, [selectedGarden, seasonId, elementsLabelled, plantings]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t('app.title')}</h1>
        <p className="mt-2 text-stone-600">{t('home.welcome')}</p>
      </div>

      <section aria-labelledby="home-gardens-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="home-gardens-heading" className="text-lg font-semibold text-stone-900">
              {t('nav.gardens')}
            </h2>
            <p className="mt-1 text-sm text-stone-600">{t('gardens.listHint')}</p>
          </div>
          <button
            type="button"
            data-testid="home-create-garden"
            className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50"
            onClick={() => setCreateGardenOpen(true)}
          >
            {t('nav.createGardenLink')}
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-stone-600">{t('auth.loading')}</p>
        ) : error ? (
          <p className="mt-6 text-red-600">{error}</p>
        ) : gardens.length === 0 ? (
          <p className="mt-6 text-stone-600">{t('gardens.emptyHome')}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gardens.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/gardens/${g.id}`}
                  className="flex h-full min-h-[5.5rem] flex-col justify-center rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md"
                >
                  <span className="font-medium text-stone-900">{g.name}</span>
                  <span className="mt-2 text-sm text-emerald-800">{t('gardens.openGarden')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!loading && !error && quickLogProps ? (
        <div>
          <button
            type="button"
            data-testid="home-quick-log"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setQuickLogOpen(true)}
          >
            {t('planning.quickLog')}
          </button>
        </div>
      ) : null}
      {quickLogProps ? (
        <QuickLogModal
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          gardenId={quickLogProps.gardenId}
          seasonId={quickLogProps.seasonId}
          elements={quickLogProps.elements}
          plantings={quickLogProps.plantings}
          onLogged={() => void loadQuickLogData()}
        />
      ) : null}

      <GardenCreateModal
        open={createGardenOpen}
        onClose={() => setCreateGardenOpen(false)}
        onCreated={async () => {
          await refreshGardens();
        }}
      />
    </div>
  );
}
