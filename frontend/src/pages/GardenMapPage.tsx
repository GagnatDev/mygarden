import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area, Season } from '../api/gardens';
import { deleteGarden, listAreas, listSeasons, patchArea } from '../api/gardens';
import type { ActivityLog } from '../api/logs';
import { listLogs } from '../api/logs';
import { listPlantings } from '../api/plantings';
import type { SeasonSnapshot } from '../api/seasons';
import { getSeasonSnapshot } from '../api/seasons';
import { AreaDetailPanel } from '../garden/AreaDetailPanel';
import { CreateAreaDialog } from '../garden/CreateAreaDialog';
import { GardenCreateForm } from '../garden/GardenCreateForm';
import { useGardenContext } from '../garden/garden-context';
import {
  GridMapEditor,
  type GridSelection,
  type MapLayer,
  type MapTool,
} from '../garden/GridMapEditor';
import { deriveAreaStatus, derivePlanVsActual } from '../garden/layer-helpers';
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
  const [layer, setLayer] = useState<MapLayer>('area-type');
  const [deleteGardenConfirm, setDeleteGardenConfirm] = useState(false);
  const [deleteGardenBusy, setDeleteGardenBusy] = useState(false);
  const [deleteGardenError, setDeleteGardenError] = useState<string | null>(null);
  const { seasonId } = useActiveSeason(selectedGarden?.id ?? null);
  const [mapPlantings, setMapPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [mapLogs, setMapLogs] = useState<ActivityLog[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [comparisonSeasonId, setComparisonSeasonId] = useState<string | null>(null);
  const [comparisonSnap, setComparisonSnap] = useState<SeasonSnapshot | null>(null);
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

  const refreshMapLogs = useCallback(async () => {
    if (!selectedGarden || !seasonId) return;
    try {
      const list = await listLogs(selectedGarden.id, seasonId);
      setMapLogs(list);
    } catch {
      setMapLogs([]);
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
      setMapLogs([]);
      setSeasons([]);
      setComparisonSeasonId(null);
      setComparisonSnap(null);
      setMapMoveError(null);
      return;
    }
    setMapMoveError(null);
    void loadAreas(selectedGarden.id);
  }, [selectedGarden, loadAreas]);

  useEffect(() => {
    if (!selectedGarden || !seasonId) {
      setMapPlantings([]);
      setMapLogs([]);
      return;
    }
    void refreshMapPlantings();
    void refreshMapLogs();
  }, [selectedGarden, seasonId, refreshMapPlantings]);

  useEffect(() => {
    if (!selectedGarden) return;
    let cancelled = false;
    void listSeasons(selectedGarden.id)
      .then((list) => {
        if (cancelled) return;
        setSeasons(list);
        setComparisonSeasonId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur;
          const firstArchived = list.find((s) => !s.isActive);
          const active = list.find((s) => s.isActive);
          return (firstArchived ?? active ?? list[0])?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) setSeasons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGarden]);

  useEffect(() => {
    if (!selectedGarden || layer !== 'historical' || !comparisonSeasonId) {
      setComparisonSnap(null);
      return;
    }
    let cancelled = false;
    void getSeasonSnapshot(selectedGarden.id, comparisonSeasonId)
      .then((snap) => {
        if (!cancelled) setComparisonSnap(snap);
      })
      .catch(() => {
        if (!cancelled) setComparisonSnap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGarden, layer, comparisonSeasonId]);

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

  const layerComputed = useMemo(() => {
    const areaColorById: Record<string, string> = {};
    const areaBadgeById: Record<string, { text: string; toneClass: string }> = {};
    const areaOverlayBadgesById: Record<string, string[]> = {};
    const legendItems: Array<{ label: string; color: string }> = [];
    const historicalGhostAreas: Array<{
      id: string;
      name: string;
      gridX: number;
      gridY: number;
      gridWidth: number;
      gridHeight: number;
    }> = [];

    if (layer === 'status') {
      const palette: Record<
        ReturnType<typeof deriveAreaStatus>,
        { color: string; toneClass: string; label: string }
      > = {
        'not-started': { color: '#94a3b8', toneClass: 'bg-slate-500', label: t('garden.status.notStarted') },
        sown: { color: '#3b82f6', toneClass: 'bg-blue-600', label: t('garden.status.sown') },
        planted: { color: '#f59e0b', toneClass: 'bg-amber-500', label: t('garden.status.planted') },
        harvested: { color: '#10b981', toneClass: 'bg-emerald-600', label: t('garden.status.harvested') },
      };
      for (const a of areas) {
        const st = deriveAreaStatus(a.id, mapPlantings, mapLogs);
        const p = palette[st];
        areaColorById[a.id] = p.color;
        areaBadgeById[a.id] = { text: p.label, toneClass: p.toneClass };
      }
      legendItems.push(
        { label: palette['not-started'].label, color: palette['not-started'].color },
        { label: palette.sown.label, color: palette.sown.color },
        { label: palette.planted.label, color: palette.planted.color },
        { label: palette.harvested.label, color: palette.harvested.color },
      );
    }

    if (layer === 'plan-vs-actual') {
      const palette: Record<
        ReturnType<typeof derivePlanVsActual>,
        { color: string; toneClass: string; label: string }
      > = {
        complete: { color: '#10b981', toneClass: 'bg-emerald-600', label: t('garden.planActual.complete') },
        partial: { color: '#f59e0b', toneClass: 'bg-amber-500', label: t('garden.planActual.partial') },
        'not-started': { color: '#94a3b8', toneClass: 'bg-slate-500', label: t('garden.planActual.notStarted') },
        unplanned: { color: '#ef4444', toneClass: 'bg-red-600', label: t('garden.planActual.unplanned') },
      };
      for (const a of areas) {
        const match = derivePlanVsActual(a.id, mapPlantings, mapLogs);
        const p = palette[match];
        areaColorById[a.id] = p.color;
        areaBadgeById[a.id] = { text: p.label, toneClass: p.toneClass };
      }
      legendItems.push(
        { label: palette.complete.label, color: palette.complete.color },
        { label: palette.partial.label, color: palette.partial.color },
        { label: palette['not-started'].label, color: palette['not-started'].color },
        { label: palette.unplanned.label, color: palette.unplanned.color },
      );
    }

    if (layer === 'historical' && comparisonSnap) {
      const currentAreaIds = new Set(areas.map((a) => a.id));
      for (const a of comparisonSnap.areas) {
        if (!currentAreaIds.has(a.id)) {
          historicalGhostAreas.push({
            id: a.id,
            name: a.name,
            gridX: a.gridX,
            gridY: a.gridY,
            gridWidth: a.gridWidth,
            gridHeight: a.gridHeight,
          });
        }
      }
      const byArea = new Map<string, string[]>();
      for (const p of comparisonSnap.plantings) {
        const arr = byArea.get(p.areaId) ?? [];
        arr.push(p.plantName);
        byArea.set(p.areaId, arr);
      }
      for (const [areaId, names] of byArea.entries()) {
        const uniq = Array.from(new Set(names));
        areaOverlayBadgesById[areaId] = uniq;
      }
    }

    return {
      areaColorById: Object.keys(areaColorById).length ? areaColorById : undefined,
      areaBadgeById: Object.keys(areaBadgeById).length ? areaBadgeById : undefined,
      areaOverlayBadgesById: Object.keys(areaOverlayBadgesById).length ? areaOverlayBadgesById : undefined,
      legendItems: legendItems.length ? legendItems : undefined,
      historicalGhostAreas: historicalGhostAreas.length ? historicalGhostAreas : undefined,
    };
  }, [layer, areas, mapPlantings, mapLogs, comparisonSnap, t]);

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
              layer={layer}
              onLayerChange={setLayer}
              areaColorById={layerComputed.areaColorById}
              areaBadgeById={layerComputed.areaBadgeById}
              areaOverlayBadgesById={layerComputed.areaOverlayBadgesById}
              legendItems={layerComputed.legendItems}
              historicalGhostAreas={layerComputed.historicalGhostAreas}
              toolbarAddon={
                layer === 'historical' ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                    <span className="sr-only">{t('garden.historicalSeason')}</span>
                    <select
                      data-testid="map-historical-season"
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm font-normal text-stone-700"
                      value={comparisonSeasonId ?? ''}
                      onChange={(e) => setComparisonSeasonId(e.target.value || null)}
                    >
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null
              }
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
