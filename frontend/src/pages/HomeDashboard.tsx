import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAreas } from '../api/areas';
import { listElements } from '../api/elements';
import { listPlantings } from '../api/plantings';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';
import { QuickLogModal } from '../planning/QuickLogModal';

export function HomeDashboard() {
  const { t } = useTranslation();
  const { selectedGarden, loading, error } = useGardenContext();
  const { seasonId } = useActiveSeason(selectedGarden?.id ?? null);
  const [elementsLabelled, setElementsLabelled] = useState<{ id: string; name: string }[]>([]);
  const [plantings, setPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

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
          elements={quickLogProps.elements}
          plantings={quickLogProps.plantings}
          onLogged={() => void loadQuickLogData()}
        />
      ) : null}
    </div>
  );
}
