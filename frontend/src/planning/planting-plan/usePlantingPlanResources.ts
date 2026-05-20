import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [gardenId, seasonId]);

  const loadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!gardenId || !seasonId) return;
      const silent = options?.silent === true || hasLoadedRef.current;
      if (silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
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
        hasLoadedRef.current = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.unknownError'));
        if (!silent) {
          setSitePlants([]);
        }
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [gardenId, seasonId, t],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshAll = useCallback(() => loadAll({ silent: true }), [loadAll]);

  return {
    areas,
    elementsWithArea,
    plantings,
    setPlantings,
    sitePlants,
    setSitePlants,
    profiles,
    logs,
    loading,
    isRefreshing,
    error,
    setError,
    loadAll,
    refreshAll,
  };
}
