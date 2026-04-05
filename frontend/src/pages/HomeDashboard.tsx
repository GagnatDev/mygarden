import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAreas } from '../api/gardens';
import { listPlantings } from '../api/plantings';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';
import { QuickLogModal } from '../planning/QuickLogModal';

export function HomeDashboard() {
  const { t } = useTranslation();
  const { selectedGarden, loading, error } = useGardenContext();
  const { seasonId } = useActiveSeason(selectedGarden?.id ?? null);
  const [areas, setAreas] = useState<Awaited<ReturnType<typeof listAreas>>>([]);
  const [plantings, setPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const loadQuickLogData = useCallback(async () => {
    if (!selectedGarden || !seasonId) {
      setAreas([]);
      setPlantings([]);
      return;
    }
    try {
      const [a, p] = await Promise.all([
        listAreas(selectedGarden.id),
        listPlantings(selectedGarden.id, seasonId),
      ]);
      setAreas(a);
      setPlantings(p);
    } catch {
      setAreas([]);
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
      areas: areas.map((a) => ({ id: a.id, name: a.name })),
      plantings: plantings.map((p) => ({ id: p.id, plantName: p.plantName, areaId: p.areaId })),
    };
  }, [selectedGarden, seasonId, areas, plantings]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t('app.title')}</h1>
      <p className="mt-2 text-stone-600">{t('home.welcome')}</p>
      {!loading && !error && quickLogProps ? (
        <button
          type="button"
          data-testid="home-quick-log"
          className="mt-6 rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white"
          onClick={() => setQuickLogOpen(true)}
        >
          {t('planning.quickLog')}
        </button>
      ) : null}
      {quickLogProps ? (
        <QuickLogModal
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          gardenId={quickLogProps.gardenId}
          seasonId={quickLogProps.seasonId}
          areas={quickLogProps.areas}
          plantings={quickLogProps.plantings}
          onLogged={() => void loadQuickLogData()}
        />
      ) : null}
    </div>
  );
}
