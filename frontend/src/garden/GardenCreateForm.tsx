import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGarden } from '../api/gardens';
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

export interface GardenCreateFormProps {
  onCreated: () => Promise<void>;
}

export function GardenCreateForm({ onCreated }: GardenCreateFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [widthMeters, setWidthMeters] = useState(10);
  const [heightMeters, setHeightMeters] = useState(12);
  const [cellSizeMeters, setCellSizeMeters] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => {
    if (
      !Number.isFinite(widthMeters) ||
      !Number.isFinite(heightMeters) ||
      !Number.isFinite(cellSizeMeters)
    ) {
      return null;
    }
    if (
      widthMeters < MAP_METERS_MIN ||
      widthMeters > MAP_METERS_MAX ||
      heightMeters < MAP_METERS_MIN ||
      heightMeters > MAP_METERS_MAX
    ) {
      return null;
    }
    if (
      cellSizeMeters < CELL_SIZE_MIN_METERS ||
      cellSizeMeters > CELL_SIZE_MAX_METERS ||
      !isCellSizeTenCmStep(cellSizeMeters)
    ) {
      return null;
    }
    const r = metersToGridDimensions(widthMeters, heightMeters, cellSizeMeters);
    if (!r.ok) return null;
    return {
      gridWidth: r.gridWidth,
      gridHeight: r.gridHeight,
      footprintW: r.gridWidth * cellSizeMeters,
      footprintH: r.gridHeight * cellSizeMeters,
    };
  }, [widthMeters, heightMeters, cellSizeMeters]);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t('garden.nameRequired'));
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
      setError(t('garden.mapDimensionsBounds'));
      return;
    }
    if (
      !Number.isFinite(cellSizeMeters) ||
      cellSizeMeters < CELL_SIZE_MIN_METERS ||
      cellSizeMeters > CELL_SIZE_MAX_METERS ||
      !isCellSizeTenCmStep(cellSizeMeters)
    ) {
      setError(t('garden.cellSizeBounds'));
      return;
    }
    const grid = metersToGridDimensions(widthMeters, heightMeters, cellSizeMeters);
    if (!grid.ok) {
      if (grid.reason === 'gridOverflow') {
        setError(t('garden.gridFromMetersTooLarge'));
      } else if (grid.reason === 'gridTooSmall') {
        setError(t('garden.gridFromMetersTooSmall'));
      } else {
        setError(t('garden.mapDimensionsBounds'));
      }
      return;
    }
    setSubmitting(true);
    try {
      await createGarden({
        name: name.trim(),
        gridWidth: grid.gridWidth,
        gridHeight: grid.gridHeight,
        cellSizeMeters,
      });
      setName('');
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      data-testid="garden-create-form"
    >
      <h2 className="text-lg font-semibold text-stone-900">{t('garden.createTitle')}</h2>
      <div>
        <label htmlFor="garden-name" className="block text-sm font-medium text-stone-700">
          {t('garden.name')}
        </label>
        <input
          id="garden-name"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="map-width-m" className="block text-sm font-medium text-stone-700">
            {t('garden.mapWidthMeters')}
          </label>
          <input
            id="map-width-m"
            type="number"
            min={MAP_METERS_MIN}
            max={MAP_METERS_MAX}
            step={0.1}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
            value={widthMeters}
            onChange={(e) => setWidthMeters(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="map-height-m" className="block text-sm font-medium text-stone-700">
            {t('garden.mapHeightMeters')}
          </label>
          <input
            id="map-height-m"
            type="number"
            min={MAP_METERS_MIN}
            max={MAP_METERS_MAX}
            step={0.1}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
            value={heightMeters}
            onChange={(e) => setHeightMeters(parseFloat(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label htmlFor="cell-size" className="block text-sm font-medium text-stone-700">
          {t('garden.cellSizeMeters')}
        </label>
        <input
          id="cell-size"
          type="number"
          min={CELL_SIZE_MIN_METERS}
          max={CELL_SIZE_MAX_METERS}
          step={CELL_SIZE_STEP_METERS}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900"
          value={cellSizeMeters}
          onChange={(e) => setCellSizeMeters(parseFloat(e.target.value))}
          onBlur={() => setCellSizeMeters(snapCellSizeToStepMeters(cellSizeMeters))}
        />
      </div>
      {preview ? (
        <p className="text-sm text-stone-600" data-testid="garden-create-summary">
          {t('garden.createGridSummary', {
            cols: preview.gridWidth,
            rows: preview.gridHeight,
            footprintW: preview.footprintW.toFixed(1),
            footprintH: preview.footprintH.toFixed(1),
          })}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? t('auth.submitting') : t('garden.createSubmit')}
      </button>
    </form>
  );
}
