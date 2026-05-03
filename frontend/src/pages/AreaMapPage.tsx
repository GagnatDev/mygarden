import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { Season } from '../api/gardens';
import { deleteGarden, listSeasons } from '../api/gardens';
import type { Area } from '../api/areas';
import { getArea } from '../api/areas';
import type { Element } from '../api/elements';
import { listElements, patchElement } from '../api/elements';
import type { ActivityLog } from '../api/logs';
import { listLogs } from '../api/logs';
import { listPlantings } from '../api/plantings';
import type { SeasonSnapshot } from '../api/seasons';
import { getSeasonSnapshot } from '../api/seasons';
import { CreateElementDialog } from '../garden/CreateElementDialog';
import { ElementDetailPanel } from '../garden/ElementDetailPanel';
import { useGardenContext } from '../garden/garden-context';
import {
  GridMapEditor,
  type ElementDraftSelection,
  type MapLayer,
  type MapTool,
} from '../garden/GridMapEditor';
import { deriveElementStatus, derivePlanVsActual } from '../garden/layer-helpers';
import { useActiveSeason } from '../garden/useActiveSeason';
import { QuickLogModal } from '../planning/QuickLogModal';

export function AreaMapPage() {
  const { t } = useTranslation();
  const { gardenId = '', areaId = '' } = useParams<{ gardenId: string; areaId: string }>();
  const { gardens, loading, error, setSelectedGardenId, refreshGardens } = useGardenContext();

  const [area, setArea] = useState<Area | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<ElementDraftSelection | null>(null);
  const [tool, setTool] = useState<MapTool>('select');
  const [layer, setLayer] = useState<MapLayer>('element-type');
  const [deleteGardenConfirm, setDeleteGardenConfirm] = useState(false);
  const [deleteGardenBusy, setDeleteGardenBusy] = useState(false);
  const [deleteGardenError, setDeleteGardenError] = useState<string | null>(null);

  const selectedGarden = useMemo(
    () => gardens.find((g) => g.id === gardenId) ?? null,
    [gardens, gardenId],
  );

  const { seasonId } = useActiveSeason(gardenId || null);
  const [mapPlantings, setMapPlantings] = useState<Awaited<ReturnType<typeof listPlantings>>>([]);
  const [mapLogs, setMapLogs] = useState<ActivityLog[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [comparisonSeasonId, setComparisonSeasonId] = useState<string | null>(null);
  const [comparisonSnap, setComparisonSnap] = useState<SeasonSnapshot | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [mapMoveError, setMapMoveError] = useState<string | null>(null);

  useEffect(() => {
    if (gardenId) setSelectedGardenId(gardenId);
  }, [gardenId, setSelectedGardenId]);

  const refreshMapPlantings = useCallback(async () => {
    if (!gardenId || !seasonId) return;
    try {
      const list = await listPlantings(gardenId, seasonId);
      setMapPlantings(list);
    } catch {
      setMapPlantings([]);
    }
  }, [gardenId, seasonId]);

  const refreshMapLogs = useCallback(async () => {
    if (!gardenId || !seasonId) return;
    try {
      const list = await listLogs(gardenId, seasonId);
      setMapLogs(list);
    } catch {
      setMapLogs([]);
    }
  }, [gardenId, seasonId]);

  const loadAreaAndElements = useCallback(
    async (opts?: { soft?: boolean }) => {
      const soft = opts?.soft === true;
      if (!gardenId || !areaId) return;
      if (!soft) setMapLoading(true);
      try {
        const [a, els] = await Promise.all([getArea(gardenId, areaId), listElements(gardenId, areaId)]);
        setArea(a);
        setElements(els);
      } catch {
        setArea(null);
        setElements([]);
      } finally {
        if (!soft) setMapLoading(false);
      }
    },
    [gardenId, areaId],
  );

  useEffect(() => {
    if (!gardenId || !areaId) {
      setArea(null);
      setElements([]);
      setSelectedElementId(null);
      setMapPlantings([]);
      setMapLogs([]);
      setSeasons([]);
      setComparisonSeasonId(null);
      setComparisonSnap(null);
      setMapMoveError(null);
      return;
    }
    setMapMoveError(null);
    void loadAreaAndElements();
  }, [gardenId, areaId, loadAreaAndElements]);

  useEffect(() => {
    if (!gardenId || !seasonId) {
      setMapPlantings([]);
      setMapLogs([]);
      return;
    }
    void refreshMapPlantings();
    void refreshMapLogs();
  }, [gardenId, seasonId, refreshMapPlantings, refreshMapLogs]);

  useEffect(() => {
    if (!gardenId) return;
    let cancelled = false;
    void listSeasons(gardenId)
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
  }, [gardenId]);

  useEffect(() => {
    if (!gardenId || layer !== 'historical' || !comparisonSeasonId) {
      setComparisonSnap(null);
      return;
    }
    let cancelled = false;
    void getSeasonSnapshot(gardenId, comparisonSeasonId)
      .then((snap) => {
        if (!cancelled) setComparisonSnap(snap);
      })
      .catch(() => {
        if (!cancelled) setComparisonSnap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gardenId, layer, comparisonSeasonId]);

  const handleMoveElement = useCallback(
    async (elementId: string, gridX: number, gridY: number) => {
      if (!gardenId || !areaId) return;
      setMapMoveError(null);
      try {
        await patchElement(gardenId, areaId, elementId, { gridX, gridY });
        await loadAreaAndElements({ soft: true });
      } catch (e) {
        setMapMoveError(e instanceof Error ? e.message : t('garden.moveAreaFailed'));
      }
    },
    [gardenId, areaId, loadAreaAndElements, t],
  );

  useEffect(() => {
    if (selectedElementId && !elements.some((e) => e.id === selectedElementId)) {
      setSelectedElementId(null);
    }
  }, [elements, selectedElementId]);

  useEffect(() => {
    if (tool !== 'select') {
      setSelectedElementId(null);
    }
  }, [tool]);

  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;

  const elementIdsWithPlantings = useMemo(
    () => new Set(mapPlantings.filter((p) => p.elementId).map((p) => p.elementId!)),
    [mapPlantings],
  );

  const layerComputed = useMemo(() => {
    const elementColorById: Record<string, string> = {};
    const elementBadgeById: Record<string, { text: string; toneClass: string }> = {};
    const elementOverlayBadgesById: Record<string, string[]> = {};
    const legendItems: Array<{ label: string; color: string }> = [];
    const historicalGhostElements: Array<{
      id: string;
      name: string;
      gridX: number;
      gridY: number;
      gridWidth: number;
      gridHeight: number;
    }> = [];

    if (layer === 'status') {
      const palette: Record<
        ReturnType<typeof deriveElementStatus>,
        { color: string; toneClass: string; label: string }
      > = {
        'not-started': { color: '#94a3b8', toneClass: 'bg-slate-500', label: t('garden.status.notStarted') },
        sown: { color: '#3b82f6', toneClass: 'bg-blue-600', label: t('garden.status.sown') },
        planted: { color: '#f59e0b', toneClass: 'bg-amber-500', label: t('garden.status.planted') },
        harvested: { color: '#10b981', toneClass: 'bg-emerald-600', label: t('garden.status.harvested') },
      };
      for (const el of elements) {
        const st = deriveElementStatus(el.id, mapPlantings, mapLogs);
        const p = palette[st];
        elementColorById[el.id] = p.color;
        elementBadgeById[el.id] = { text: p.label, toneClass: p.toneClass };
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
      for (const el of elements) {
        const match = derivePlanVsActual(el.id, mapPlantings, mapLogs);
        const p = palette[match];
        elementColorById[el.id] = p.color;
        elementBadgeById[el.id] = { text: p.label, toneClass: p.toneClass };
      }
      legendItems.push(
        { label: palette.complete.label, color: palette.complete.color },
        { label: palette.partial.label, color: palette.partial.color },
        { label: palette['not-started'].label, color: palette['not-started'].color },
        { label: palette.unplanned.label, color: palette.unplanned.color },
      );
    }

    if (layer === 'historical' && comparisonSnap) {
      const currentIds = new Set(elements.map((e) => e.id));
      for (const el of comparisonSnap.elements) {
        if (el.areaId !== areaId) continue;
        if (!currentIds.has(el.id)) {
          historicalGhostElements.push({
            id: el.id,
            name: el.name,
            gridX: el.gridX,
            gridY: el.gridY,
            gridWidth: el.gridWidth,
            gridHeight: el.gridHeight,
          });
        }
      }
      const byElement = new Map<string, string[]>();
      for (const p of comparisonSnap.plantings) {
        if (!p.elementId) continue;
        const arr = byElement.get(p.elementId) ?? [];
        arr.push(p.plantName);
        byElement.set(p.elementId, arr);
      }
      for (const [elementIdKey, names] of byElement.entries()) {
        const uniq = Array.from(new Set(names));
        elementOverlayBadgesById[elementIdKey] = uniq;
      }
    }

    return {
      elementColorById: Object.keys(elementColorById).length ? elementColorById : undefined,
      elementBadgeById: Object.keys(elementBadgeById).length ? elementBadgeById : undefined,
      elementOverlayBadgesById: Object.keys(elementOverlayBadgesById).length
        ? elementOverlayBadgesById
        : undefined,
      legendItems: legendItems.length ? legendItems : undefined,
      historicalGhostElements: historicalGhostElements.length ? historicalGhostElements : undefined,
    };
  }, [layer, elements, mapPlantings, mapLogs, comparisonSnap, areaId, t]);

  const plantingsForSelectedElement = useMemo(() => {
    if (!selectedElementId) return [];
    return mapPlantings
      .filter((p) => p.elementId === selectedElementId)
      .map((p) => ({ id: p.id, plantName: p.plantName, sowingMethod: p.sowingMethod }));
  }, [mapPlantings, selectedElementId]);

  const quickLogProps = useMemo(() => {
    if (!gardenId || !seasonId) return null;
    return {
      gardenId,
      seasonId,
      elements: elements.map((e) => ({ id: e.id, name: e.name })),
      plantings: mapPlantings.map((p) => ({
        id: p.id,
        plantName: p.plantName,
        elementId: p.elementId ?? '',
      })),
    };
  }, [gardenId, seasonId, elements, mapPlantings]);

  async function handleDeleteGarden() {
    if (!selectedGarden) return;
    setDeleteGardenBusy(true);
    setDeleteGardenError(null);
    try {
      await deleteGarden(selectedGarden.id);
      setDeleteGardenConfirm(false);
      setSelectedElementId(null);
      setPendingSelection(null);
      await refreshGardens();
    } catch (e) {
      setDeleteGardenError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setDeleteGardenBusy(false);
    }
  }

  if (!gardenId || !areaId) {
    return <Navigate to="/" replace />;
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
        <h1 className="text-2xl font-semibold text-stone-900">{t('nav.home')}</h1>
        <p className="mt-2 text-stone-600">{t('garden.noGardenHint')}</p>
        <p className="mt-4">
          <Link to="/" className="text-emerald-700 underline">
            {t('nav.home')}
          </Link>
        </p>
      </div>
    );
  }

  if (!selectedGarden) {
    return <Navigate to="/" replace />;
  }

  if (!area && !mapLoading) {
    return (
      <div>
        <p className="text-red-600">{t('auth.unknownError')}</p>
        <Link to={`/gardens/${gardenId}`} className="mt-4 inline-block text-emerald-700 underline">
          Back to areas
        </Link>
      </div>
    );
  }

  if (!area) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <nav className="text-sm text-stone-600">
              <Link to="/" className="hover:underline">
                {t('nav.home')}
              </Link>
              <span className="mx-1">/</span>
              <Link to={`/gardens/${gardenId}`} className="hover:underline">
                {selectedGarden.name}
              </Link>
              <span className="mx-1">/</span>
              <span className="font-medium text-stone-900">{area.title}</span>
            </nav>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900">{area.title}</h1>
            {area.description ? <p className="mt-1 text-sm text-stone-600">{area.description}</p> : null}
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
          {mapLoading ? (
            <p className="text-stone-600">{t('auth.loading')}</p>
          ) : (
            <GridMapEditor
              gardenId={gardenId}
              area={area}
              onAreaBackgroundChanged={() => {
                void loadAreaAndElements({ soft: true });
                void refreshGardens({ soft: true });
              }}
              elements={elements}
              elementIdsWithPlantings={elementIdsWithPlantings}
              layer={layer}
              onLayerChange={setLayer}
              elementColorById={layerComputed.elementColorById}
              elementBadgeById={layerComputed.elementBadgeById}
              elementOverlayBadgesById={layerComputed.elementOverlayBadgesById}
              legendItems={layerComputed.legendItems}
              historicalGhostElements={layerComputed.historicalGhostElements}
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
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onSelectionComplete={setPendingSelection}
              onMoveElement={handleMoveElement}
              tool={tool}
              onToolChange={setTool}
            />
          )}
        </div>
        {selectedElement && seasonId && tool === 'select' ? (
          <ElementDetailPanel
            gardenId={gardenId}
            areaId={areaId}
            seasonId={seasonId}
            element={selectedElement}
            plantings={plantingsForSelectedElement}
            onClose={() => setSelectedElementId(null)}
            onChanged={async () => {
              await loadAreaAndElements({ soft: true });
              await refreshMapPlantings();
            }}
          />
        ) : null}
      </div>

      {pendingSelection ? (
        <CreateElementDialog
          gardenId={gardenId}
          areaId={areaId}
          selection={pendingSelection}
          onClose={() => setPendingSelection(null)}
          onCreated={async () => loadAreaAndElements({ soft: true })}
        />
      ) : null}

      {quickLogProps ? (
        <QuickLogModal
          open={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
          gardenId={quickLogProps.gardenId}
          seasonId={quickLogProps.seasonId}
          elements={quickLogProps.elements}
          plantings={quickLogProps.plantings}
          onLogged={() => void refreshMapPlantings()}
        />
      ) : null}
    </div>
  );
}
