import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import { listAreas } from '../../api/areas';
import { listElements } from '../../api/elements';
import { listLogs } from '../../api/logs';
import { listPlantings, type Planting } from '../../api/plantings';
import { listSitePlants, type SitePlant } from '../../api/sitePlants';
import { listPlantProfiles, type PlantProfile } from '../../api/plantProfiles';
import type { ElementWithArea } from './types';

export function usePlantingPlanResources(gardenId: string | null, seasonId: string | null) {
  const { t } = useTranslation();
  const [areas, setAreas] = useState<Area[]>([]);
  const [elementsWithArea, setElementsWithArea] = useState<ElementWithArea[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [sitePlants, setSitePlants] = useState<SitePlant[]>([]);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listLogs>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!gardenId || !seasonId) return;
    setLoading(true);
    setError(null);
    try {
      const ars = await listAreas(gardenId);
      const elementLists = await Promise.all(ars.map((a) => listElements(gardenId, a.id)));
      const flat: ElementWithArea[] = ars.flatMap((a, i) =>
        (elementLists[i] ?? []).map((el) => ({ ...el, areaTitle: a.title })),
      );
      const [p, pr, lg, sp] = await Promise.all([
        listPlantings(gardenId, seasonId),
        listPlantProfiles(),
        listLogs(gardenId, seasonId),
        listSitePlants(gardenId),
      ]);
      setAreas(ars);
      setElementsWithArea(flat);
      setPlantings(p);
      setProfiles(pr);
      setLogs(lg);
      setSitePlants(sp);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
      setSitePlants([]);
    } finally {
      setLoading(false);
    }
  }, [gardenId, seasonId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return {
    areas,
    elementsWithArea,
    plantings,
    sitePlants,
    profiles,
    logs,
    loading,
    error,
    setError,
    loadAll,
  };
}
