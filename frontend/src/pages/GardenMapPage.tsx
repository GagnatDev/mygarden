import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/gardens';
import { deleteGarden, listAreas, patchArea } from '../api/gardens';
import { listPlantings } from '../api/plantings';
import { AreaDetailPanel } from '../garden/AreaDetailPanel';
import { CreateAreaDialog } from '../garden/CreateAreaDialog';
import { GardenCreateForm } from '../garden/GardenCreateForm';
import { useGardenContext } from '../garden/garden-context';
import { GridMapEditor, type GridSelection, type MapTool } from '../garden/GridMapEditor';
import { useActiveSeason } from '../garden/useActiveSeason';
import { QuickLogModal } from '../planning/QuickLogModal';

export function GardenMapPage() {
  const { t } = useTranslation();
  const { gardens, loading, error, selectedGarden, setSelectedGardenId, refreshGardens } =
    useGardenContext();
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<GridSelection | null>(null);
  const [tool, setTool] = useState<MapTool>('select');
  const [deleteGardenConfirm, setDeleteGardenConfirm] = useState(false);
  const [deleteGardenBusy, setDeleteGardenBusy] = useState(false);
  const [deleteGardenError, setDeleteGardenError] = useState<string | null>(null);
  const { seasonId } = useActiveSeason(selectedGarden?.id ?? null);
  const [mapPlantings, setMapPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [mapMoveError, setMapMoveError] = useState<string | null>(null);

  const refreshMapPlantings = useCallback(async () => {
    if (!selectedGarden || !seasonId) return;
    try {
      const list = await listPlantings(selectedGarden.id, seasonId);
      setMapPlantings(list);
    } catch {
      setMapPlantings([]);
    }
  }, [selectedGarden, seasonId]);

  const loadAreas = useCallback(async (gardenId: string, opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) {
      setAreasLoading(true);
    }
    try {
      const list = await listAreas(gardenId);
      setAreas(list);
    } catch {
      setAreas([]);
    } finally {
      if (!soft) {
        setAreasLoading(false);
      }
    }
  }, []);

  const handleMoveArea = useCallback(
    async (areaId: string, gridX: number, gridY: number) => {
      if (!selectedGarden) return;
      setMapMoveError(null);
      try {
        await patchArea(selectedGarden.id, areaId, { gridX, gridY });
        await loadAreas(selectedGarden.id, { soft: true });
      } catch (e) {
        setMapMoveError(e instanceof Error ? e.message : t('garden.moveAreaFailed'));
      }
    },
    [selectedGarden, loadAreas, t],
  );

  useEffect(() => {
    if (!selectedGarden) {
      setAreas([]);
      setSelectedAreaId(null);
      setMapPlantings([]);
      setMapMoveError(null);
      return;
    }
    setMapMoveError(null);
    void loadAreas(selectedGarden.id);
  }, [selectedGarden, loadAreas]);

  useEffect(() => {
    if (!selectedGarden || !seasonId) {
      setMapPlantings([]);
      return;
    }
    void refreshMapPlantings();
  }, [selectedGarden, seasonId, refreshMapPlantings]);

  useEffect(() => {
    if (selectedAreaId && !areas.some((a) => a.id === selectedAreaId)) {
      setSelectedAreaId(null);
    }
  }, [areas, selectedAreaId]);

  const selectedArea = areas.find((a) => a.id === selectedAreaId) ?? null;

  const areaIdsWithPlantings = useMemo(
    () => new Set(mapPlantings.map((p) => p.areaId)),
    [mapPlantings],
  );

  const plantingsForSelectedArea = useMemo(() => {
    if (!selectedAreaId) return [];
    return mapPlantings
      .filter((p) => p.areaId === selectedAreaId)
      .map((p) => ({ id: p.id, plantName: p.plantName, sowingMethod: p.sowingMethod }));
  }, [mapPlantings, selectedAreaId]);

  const quickLogProps = useMemo(() => {
    if (!selectedGarden || !seasonId) return null;
    return {
      gardenId: selectedGarden.id,
      seasonId,
      areas: areas.map((a) => ({ id: a.id, name: a.name })),
      plantings: mapPlantings.map((p) => ({ id: p.id, plantName: p.plantName, areaId: p.areaId })),
    };
  }, [selectedGarden, seasonId, areas, mapPlantings]);

  async function handleDeleteGarden() {
    if (!selectedGarden) return;
    setDeleteGardenBusy(true);
    setDeleteGardenError(null);
    try {
      await deleteGarden(selectedGarden.id);
      setDeleteGardenConfirm(false);
      setSelectedAreaId(null);
      setPendingSelection(null);
      await refreshGardens();
    } catch (e) {
      setDeleteGardenError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setDeleteGardenBusy(false);
    }
  }

  if (loading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (gardens.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{t('nav.gardenMap')}</h1>
        <p className="mt-2 text-stone-600">{t('garden.noGardenHint')}</p>
        <div className="mt-6">
          <GardenCreateForm onCreated={refreshGardens} />
        </div>
      </div>
    );
  }

  if (!selectedGarden) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">{t('nav.gardenMap')}</h1>
            <p className="mt-1 text-sm text-stone-600">{t('garden.mapHint')}</p>
          </div>
          {quickLogProps ? (
            <button
              type="button"
              data-testid="map-quick-log"
              className="shrink-0 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white"
              onClick={() => setQuickLogOpen(true)}
            >
              {t('planning.quickLog')}
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          {gardens.length > 1 ? (
            <label className="flex w-full flex-col text-sm font-medium text-stone-700 md:w-auto md:min-w-[12rem]">
              {t('garden.selectGarden')}
              <select
                className="mt-1 rounded-lg border border-stone-300 px-3 py-2 font-normal"
                value={selectedGarden.id}
                onChange={(e) => setSelectedGardenId(e.target.value)}
              >
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {deleteGardenError ? (
            <p className="max-w-md text-sm text-red-600 md:text-right">{deleteGardenError}</p>
          ) : null}
          {!deleteGardenConfirm ? (
            <button
              type="button"
              className="self-start rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 md:self-end"
              onClick={() => {
                setDeleteGardenConfirm(true);
                setDeleteGardenError(null);
              }}
            >
              {t('garden.deleteGarden')}
            </button>
          ) : (
            <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-4 md:text-right">
              <p className="text-left text-sm text-red-900 md:text-right">{t('garden.deleteGardenWarning')}</p>
              <div className="mt-3 flex flex-wrap justify-start gap-2 md:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                  onClick={() => {
                    setDeleteGardenConfirm(false);
                    setDeleteGardenError(null);
                  }}
                >
                  {t('garden.cancel')}
                </button>
                <button
                  type="button"
                  disabled={deleteGardenBusy}
                  className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  onClick={() => void handleDeleteGarden()}
                >
                  {deleteGardenBusy ? t('auth.submitting') : t('garden.deleteGardenConfirmButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {mapMoveError ? (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {mapMoveError}
            </p>
          ) : null}
          {areasLoading ? (
            <p className="text-stone-600">{t('auth.loading')}</p>
          ) : (
            <GridMapEditor
              garden={selectedGarden}
              areas={areas}
              areaIdsWithPlantings={areaIdsWithPlantings}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
              onSelectionComplete={setPendingSelection}
              onMoveArea={handleMoveArea}
              tool={tool}
              onToolChange={setTool}
            />
          )}
        </div>
        {selectedArea && seasonId && tool !== 'move' ? (
          <AreaDetailPanel
            gardenId={selectedGarden.id}
            seasonId={seasonId}
            area={selectedArea}
            plantings={plantingsForSelectedArea}
            onClose={() => setSelectedAreaId(null)}
            onChanged={async () => {
              await loadAreas(selectedGarden.id, { soft: true });
              await refreshMapPlantings();
            }}
          />
        ) : null}
      </div>

      {pendingSelection ? (
        <CreateAreaDialog
          gardenId={selectedGarden.id}
          selection={pendingSelection}
          onClose={() => setPendingSelection(null)}
          onCreated={async () => loadAreas(selectedGarden.id, { soft: true })}
        />
      ) : null}

      {quickLogProps ? (
        <QuickLogModal
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          gardenId={quickLogProps.gardenId}
          seasonId={quickLogProps.seasonId}
          areas={quickLogProps.areas}
          plantings={quickLogProps.plantings}
          onLogged={() => void refreshMapPlantings()}
        />
      ) : null}
    </div>
  );
}
