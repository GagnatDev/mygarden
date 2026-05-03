import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createArea } from '../api/areas';
import {
  CELL_SIZE_MAX_METERS,
  CELL_SIZE_MIN_METERS,
  CELL_SIZE_STEP_METERS,
  MAP_METERS_MAX,
  MAP_METERS_MIN,
  isCellSizeTenCmStep,
  metersToGridDimensions,
  snapCellSizeToStepMeters,
} from './garden-dimensions';

export function AreaCreateModal({
  open,
  onClose,
  gardenId,
  sortIndex,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  gardenId: string;
  sortIndex: number;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [widthMeters, setWidthMeters] = useState(10);
  const [heightMeters, setHeightMeters] = useState(12);
  const [cellSizeMeters, setCellSizeMeters] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setWidthMeters(10);
    setHeightMeters(12);
    setCellSizeMeters(1);
    setCreateError(null);
    setCreateBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function handleCreateArea(ev: React.FormEvent) {
    ev.preventDefault();
    setCreateError(null);
    if (!title.trim()) {
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
        sortIndex,
      });
      await onCreated();
      onClose();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setCreateBusy(false);
    }
  }

  if (!open) return null;

  const gridPreview = metersToGridDimensions(widthMeters, heightMeters, cellSizeMeters);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
        aria-label={t('garden.close')}
        onClick={onClose}
        data-testid="area-create-modal-backdrop"
      />
      <div className="pointer-events-none fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="area-create-modal-title"
          className="pointer-events-auto max-h-[min(90vh,calc(100vh-2rem))] w-full max-w-xl overflow-y-auto rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
          data-testid="area-create-modal"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="area-create-modal-title" className="text-lg font-semibold text-stone-900">
              {t('areas.createTitle')}
            </h2>
            <button
              type="button"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              onClick={onClose}
            >
              {t('garden.close')}
            </button>
          </div>
          <form onSubmit={(e) => void handleCreateArea(e)} className="mt-4 space-y-4">
            <div>
              <label htmlFor="area-modal-title" className="block text-sm font-medium text-stone-700">
                {t('areas.title')}
              </label>
              <input
                id="area-modal-title"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="area-modal-desc" className="block text-sm font-medium text-stone-700">
                {t('areas.description')}
              </label>
              <textarea
                id="area-modal-desc"
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
        </div>
      </div>
    </div>
  );
}
