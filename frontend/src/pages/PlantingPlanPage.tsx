import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deletePlanting, patchPlanting } from '../api/plantings';
import { createLog } from '../api/logs';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';
import { ActivityTimelineSection } from '../planning/planting-plan/ActivityTimelineSection';
import { AddPlantingForm } from '../planning/planting-plan/AddPlantingForm';
import { IndoorPlantingDetailModal } from '../planning/planting-plan/IndoorPlantingDetailModal';
import {
  IndoorSection,
  type IndoorSectionAssignmentFilter,
} from '../planning/planting-plan/IndoorSection';
import { PlantingsByAreaSection } from '../planning/planting-plan/PlantingsByAreaSection';
import { usePlantingPlanResources } from '../planning/planting-plan/usePlantingPlanResources';
import { QuickLogModal } from '../planning/QuickLogModal';

export function PlantingPlanPage() {
  const { t, i18n } = useTranslation();
  const { selectedGarden, loading: gardenLoading, error: gardenError } = useGardenContext();
  const { seasonId, loading: seasonLoading, error: seasonError } = useActiveSeason(
    selectedGarden?.id ?? null,
  );

  const gardenId = selectedGarden?.id ?? null;
  const {
    areas,
    elementsWithArea,
    plantings,
    profiles,
    logs,
    loading,
    error,
    setError,
    loadAll,
  } = usePlantingPlanResources(gardenId, seasonId);

  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [notesPlantingId, setNotesPlantingId] = useState<string | null>(null);
  const [indoorDetailPlantingId, setIndoorDetailPlantingId] = useState<string | null>(null);
  const [indoorAssignmentFilter, setIndoorAssignmentFilter] = useState<IndoorSectionAssignmentFilter>('all');
  const [indoorIncludeTransplanted, setIndoorIncludeTransplanted] = useState(false);

  const byElement = useMemo(() => {
    const m = new Map<string, typeof plantings>();
    for (const pl of plantings) {
      if (!pl.elementId) continue;
      const list = m.get(pl.elementId) ?? [];
      list.push(pl);
      m.set(pl.elementId, list);
    }
    return m;
  }, [plantings]);

  const indoorAll = useMemo(() => plantings.filter((p) => p.sowingMethod === 'indoor'), [plantings]);

  const transplantedPlantingIds = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) {
      if (l.activity === 'transplanted' && l.plantingId) set.add(l.plantingId);
    }
    return set;
  }, [logs]);

  const indoorDetailPlanting = useMemo(() => {
    if (!indoorDetailPlantingId) return null;
    const p = plantings.find((x) => x.id === indoorDetailPlantingId);
    if (!p || p.sowingMethod !== 'indoor') return null;
    return p;
  }, [plantings, indoorDetailPlantingId]);

  useEffect(() => {
    if (indoorDetailPlantingId && !indoorDetailPlanting) {
      setIndoorDetailPlantingId(null);
    }
  }, [indoorDetailPlantingId, indoorDetailPlanting]);

  const elementsByAreaId = useMemo(() => {
    const m = new Map<string, typeof elementsWithArea>();
    for (const el of elementsWithArea) {
      const list = m.get(el.areaId) ?? [];
      list.push(el);
      m.set(el.areaId, list);
    }
    return m;
  }, [elementsWithArea]);

  const elementLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const el of elementsWithArea) {
      m.set(el.id, `${el.areaTitle} · ${el.name}`);
    }
    return m;
  }, [elementsWithArea]);

  const handleMovePlanting = useCallback(
    async (plantingId: string, newElementId: string): Promise<boolean> => {
      if (!selectedGarden) return false;
      setError(null);
      try {
        await patchPlanting(selectedGarden.id, plantingId, { elementId: newElementId });
        await loadAll();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.unknownError'));
        return false;
      }
    },
    [selectedGarden, loadAll, t, setError],
  );

  const handleDeletePlanting = useCallback(
    async (plantingId: string): Promise<boolean> => {
      if (!selectedGarden) return false;
      if (!window.confirm(t('planning.confirmRemovePlanting'))) return false;
      setError(null);
      try {
        await deletePlanting(selectedGarden.id, plantingId);
        await loadAll();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.unknownError'));
        return false;
      }
    },
    [selectedGarden, loadAll, t, setError],
  );

  const handleMarkTransplanted = useCallback(
    async (plantingId: string): Promise<boolean> => {
      if (!selectedGarden) return false;
      if (!seasonId) return false;
      setError(null);
      const now = new Date().toISOString();
      try {
        await createLog(selectedGarden.id, {
          seasonId,
          plantingId,
          activity: 'transplanted',
          date: now,
          note: null,
          quantity: null,
          clientTimestamp: now,
        });
        await patchPlanting(selectedGarden.id, plantingId, { transplantDate: now });
        await loadAll();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('auth.unknownError'));
        return false;
      }
    },
    [selectedGarden, seasonId, loadAll, t, setError],
  );

  const onMovePlantingRow = useCallback(
    (plantingId: string, elementId: string) => {
      void handleMovePlanting(plantingId, elementId);
    },
    [handleMovePlanting],
  );

  const onDeletePlantingRow = useCallback(
    (plantingId: string) => {
      void handleDeletePlanting(plantingId);
    },
    [handleDeletePlanting],
  );

  const closeIndoorDetail = useCallback(() => {
    setIndoorDetailPlantingId(null);
  }, []);

  const closeQuickLog = useCallback(() => {
    setQuickLogOpen(false);
  }, []);

  const quickLogElements = useMemo(
    () =>
      elementsWithArea.map((el) => ({
        id: el.id,
        name: `${el.areaTitle} · ${el.name}`,
      })),
    [elementsWithArea],
  );

  const quickLogPlantings = useMemo(
    () =>
      plantings.map((p) => ({
        id: p.id,
        plantName: p.plantName,
        elementId: p.elementId,
      })),
    [plantings],
  );

  const onQuickLogged = useCallback(() => {
    void loadAll();
  }, [loadAll]);

  const clearPageError = useCallback(() => {
    setError(null);
  }, [setError]);

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

      <AddPlantingForm
        gardenId={selectedGarden.id}
        seasonId={seasonId}
        areas={areas}
        elementsByAreaId={elementsByAreaId}
        profiles={profiles}
        onCreated={loadAll}
        onError={setError}
        onBeginSubmit={clearPageError}
      />

      {loading ? (
        <p className="mt-4 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <>
          <IndoorSection
            indoorPlantings={indoorAll}
            transplantedPlantingIds={transplantedPlantingIds}
            locale={i18n.language}
            elementLabelById={elementLabelById}
            assignmentFilter={indoorAssignmentFilter}
            setAssignmentFilter={setIndoorAssignmentFilter}
            includeTransplanted={indoorIncludeTransplanted}
            setIncludeTransplanted={setIndoorIncludeTransplanted}
            onOpenRow={setIndoorDetailPlantingId}
          />

          {indoorDetailPlanting ? (
            <IndoorPlantingDetailModal
              planting={indoorDetailPlanting}
              gardenId={selectedGarden.id}
              seasonId={seasonId}
              elementsWithArea={elementsWithArea}
              profiles={profiles}
              locale={i18n.language}
              onClose={closeIndoorDetail}
              onMove={handleMovePlanting}
              onMarkTransplanted={handleMarkTransplanted}
              isActuallyTransplanted={transplantedPlantingIds.has(indoorDetailPlanting.id)}
              onDelete={handleDeletePlanting}
              t={t}
            />
          ) : null}

          <PlantingsByAreaSection
            areas={areas}
            elementsByAreaId={elementsByAreaId}
            byElement={byElement}
            gardenId={selectedGarden.id}
            seasonId={seasonId}
            elementsWithArea={elementsWithArea}
            locale={i18n.language}
            notesPlantingId={notesPlantingId}
            setNotesPlantingId={setNotesPlantingId}
            onMovePlanting={onMovePlantingRow}
            onDeletePlanting={onDeletePlantingRow}
            t={t}
          />
        </>
      )}

      <ActivityTimelineSection logs={logs} />

      <QuickLogModal
        open={quickLogOpen}
        onClose={closeQuickLog}
        gardenId={selectedGarden.id}
        seasonId={seasonId}
        elements={quickLogElements}
        plantings={quickLogPlantings}
        onLogged={onQuickLogged}
      />
    </div>
  );
}
