import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { patchGarden } from '../api/gardens';
import type { Area } from '../api/areas';
import { createArea, deleteArea, listAreas } from '../api/areas';
import { useGardenContext } from '../garden/garden-context';
import {
  CELL_SIZE_MAX_METERS,
  CELL_SIZE_MIN_METERS,
  CELL_SIZE_STEP_METERS,
  MAP_METERS_MAX,
  MAP_METERS_MIN,
  isCellSizeTenCmStep,
  metersToGridDimensions,
  snapCellSizeToStepMeters,
} from '../garden/garden-dimensions';

export function GardenAreasPage() {
  const { t } = useTranslation();
  const { gardenId = '' } = useParams<{ gardenId: string }>();
  const { gardens, loading, error, setSelectedGardenId, refreshGardens } = useGardenContext();

  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [gardenName, setGardenName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [widthMeters, setWidthMeters] = useState(10);
  const [heightMeters, setHeightMeters] = useState(12);
  const [cellSizeMeters, setCellSizeMeters] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const selectedGarden = gardens.find((g) => g.id === gardenId) ?? null;

  useEffect(() => {
    if (gardenId) setSelectedGardenId(gardenId);
  }, [gardenId, setSelectedGardenId]);

  useEffect(() => {
    if (selectedGarden) setGardenName(selectedGarden.name);
  }, [selectedGarden]);

  const loadAreas = useCallback(async () => {
    if (!gardenId) return;
    setAreasLoading(true);
    try {
      const list = await listAreas(gardenId);
      setAreas(list);
    } catch {
      setAreas([]);
    } finally {
      setAreasLoading(false);
    }
  }, [gardenId]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  async function saveGardenName() {
    if (!selectedGarden || !gardenName.trim()) return;
    setNameBusy(true);
    setNameError(null);
    try {
      await patchGarden(selectedGarden.id, { name: gardenName.trim() });
      setEditingName(false);
      await refreshGardens({ soft: true });
    } catch (e) {
      setNameError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setNameBusy(false);
    }
  }

  async function handleCreateArea(ev: React.FormEvent) {
    ev.preventDefault();
    setCreateError(null);
    if (!gardenId || !title.trim()) {
      setCreateError(t('areas.titleRequired'));
      return;
    }
    if (
      !Number.isFinite(widthMeters) ||
      !Number.isFinite(heightMeters) ||
      widthMeters < MAP_METERS_MIN ||
      widthMeters > MAP_METERS_MAX ||
      heightMeters < MAP_METERS_MIN ||
      heightMeters > MAP_METERS_MAX
    ) {
      setCreateError(t('garden.mapDimensionsBounds'));
      return;
    }
    if (
      !Number.isFinite(cellSizeMeters) ||
      cellSizeMeters < CELL_SIZE_MIN_METERS ||
      cellSizeMeters > CELL_SIZE_MAX_METERS ||
      !isCellSizeTenCmStep(cellSizeMeters)
    ) {
      setCreateError(t('garden.cellSizeBounds'));
      return;
    }
    const grid = metersToGridDimensions(widthMeters, heightMeters, cellSizeMeters);
    if (!grid.ok) {
      setCreateError(
        grid.reason === 'gridOverflow'
          ? t('garden.gridFromMetersTooLarge')
          : grid.reason === 'gridTooSmall'
            ? t('garden.gridFromMetersTooSmall')
            : t('garden.mapDimensionsBounds'),
      );
      return;
    }
    setCreateBusy(true);
    try {
      await createArea(gardenId, {
        title: title.trim(),
        description: description.trim(),
        gridWidth: grid.gridWidth,
        gridHeight: grid.gridHeight,
        cellSizeMeters,
        sortIndex: areas.length,
      });
      setTitle('');
      setDescription('');
      await loadAreas();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleDeleteArea(areaId: string) {
    if (!gardenId || !confirm(t('areas.confirmDelete'))) return;
    try {
      await deleteArea(gardenId, areaId);
      await loadAreas();
    } catch {
      /* ignore */
    }
  }

  if (!gardenId) {
    return <Navigate to="/gardens" replace />;
  }

  if (loading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!selectedGarden) {
    return <Navigate to="/gardens" replace />;
  }

  const gridPreview = metersToGridDimensions(widthMeters, heightMeters, cellSizeMeters);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <nav className="text-sm text-stone-600">
        <Link to="/gardens" className="hover:underline">
          {t('nav.gardens')}
        </Link>
        <span className="mx-1">/</span>
        <span className="font-medium text-stone-900">{selectedGarden.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">{t('garden.name')}</span>
                <input
                  className="mt-1 block w-full max-w-md rounded-lg border border-stone-300 px-3 py-2"
                  value={gardenName}
                  onChange={(e) => setGardenName(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
                disabled={nameBusy}
                onClick={() => void saveGardenName()}
              >
                {t('garden.saveChanges')}
              </button>
              <button
                type="button"
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
                onClick={() => {
                  setEditingName(false);
                  setGardenName(selectedGarden.name);
                  setNameError(null);
                }}
              >
                {t('garden.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-stone-900">{selectedGarden.name}</h1>
              <button
                type="button"
                className="text-sm text-emerald-700 underline"
                onClick={() => setEditingName(true)}
              >
                {t('garden.editArea')}
              </button>
            </div>
          )}
          {nameError ? <p className="mt-2 text-sm text-red-600">{nameError}</p> : null}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-stone-900">{t('areas.sectionTitle')}</h2>
        {areasLoading ? (
          <p className="mt-4 text-stone-600">{t('auth.loading')}</p>
        ) : areas.length === 0 ? (
          <p className="mt-2 text-stone-600">{t('areas.emptyHint')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {areas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link to={`/gardens/${gardenId}/areas/${a.id}`} className="font-medium text-emerald-800 hover:underline">
                  {a.title}
                </Link>
                <button
                  type="button"
                  className="text-sm text-red-700 hover:underline"
                  onClick={() => void handleDeleteArea(a.id)}
                >
                  {t('areas.delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">{t('areas.createTitle')}</h2>
        <form onSubmit={(e) => void handleCreateArea(e)} className="mt-4 max-w-xl space-y-4">
          <div>
            <label htmlFor="area-title" className="block text-sm font-medium text-stone-700">
              {t('areas.title')}
            </label>
            <input
              id="area-title"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="area-desc" className="block text-sm font-medium text-stone-700">
              {t('areas.description')}
            </label>
            <textarea
              id="area-desc"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700">{t('garden.mapWidthMeters')}</label>
              <input
                type="number"
                min={MAP_METERS_MIN}
                max={MAP_METERS_MAX}
                step={0.1}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                value={widthMeters}
                onChange={(e) => setWidthMeters(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700">{t('garden.mapHeightMeters')}</label>
              <input
                type="number"
                min={MAP_METERS_MIN}
                max={MAP_METERS_MAX}
                step={0.1}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                value={heightMeters}
                onChange={(e) => setHeightMeters(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">{t('garden.cellSizeMeters')}</label>
            <input
              type="number"
              min={CELL_SIZE_MIN_METERS}
              max={CELL_SIZE_MAX_METERS}
              step={CELL_SIZE_STEP_METERS}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={cellSizeMeters}
              onChange={(e) => setCellSizeMeters(parseFloat(e.target.value))}
              onBlur={() => setCellSizeMeters(snapCellSizeToStepMeters(cellSizeMeters))}
            />
          </div>
          {gridPreview.ok ? (
            <p className="text-sm text-stone-600">
              {t('garden.createGridSummary', {
                cols: gridPreview.gridWidth,
                rows: gridPreview.gridHeight,
                footprintW: (gridPreview.gridWidth * cellSizeMeters).toFixed(1),
                footprintH: (gridPreview.gridHeight * cellSizeMeters).toFixed(1),
              })}
            </p>
          ) : null}
          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {createBusy ? t('auth.submitting') : t('areas.createSubmit')}
          </button>
        </form>
      </section>
    </div>
  );
}
