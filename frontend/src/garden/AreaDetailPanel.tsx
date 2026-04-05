import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area, AreaType } from '../api/gardens';
import { deleteArea, patchArea } from '../api/gardens';

const TYPES: AreaType[] = ['raised_bed', 'open_bed', 'tree_zone', 'path', 'lawn', 'other'];

export interface AreaPlantingSummary {
  id: string;
  plantName: string;
  sowingMethod: string;
}

export interface AreaDetailPanelProps {
  gardenId: string;
  area: Area;
  /** Plantings in this area for the active season (shown when area is selected). */
  plantings?: AreaPlantingSummary[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

export function AreaDetailPanel({ gardenId, area, plantings = [], onClose, onChanged }: AreaDetailPanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(area.name);
  const [type, setType] = useState<AreaType>(area.type);
  const [color, setColor] = useState(area.color);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await patchArea(gardenId, area.id, { name: name.trim(), type, color });
      setEditing(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteArea(gardenId, area.id);
      await onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <aside
      className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:mt-0 md:w-72 md:shrink-0"
      data-testid="area-detail-panel"
      aria-label={t('garden.areaDetails')}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{area.name}</h2>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
          onClick={onClose}
        >
          {t('garden.close')}
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {t(`garden.areaTypes.${area.type}`)} · {area.gridWidth}×{area.gridHeight} {t('garden.cells')}
      </p>

      {plantings.length > 0 ? (
        <section className="mt-4 border-t border-stone-100 pt-4" data-testid="area-plantings-section">
          <h3 className="text-sm font-semibold text-stone-800">{t('garden.plantingsThisSeason')}</h3>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {plantings.map((p) => (
              <li key={p.id} data-testid={`area-planting-${p.id}`}>
                {p.plantName} · {t(`planning.sowing.${p.sowingMethod}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="edit-area-name" className="block text-sm font-medium text-stone-700">
              {t('garden.areaName')}
            </label>
            <input
              id="edit-area-name"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-area-type" className="block text-sm font-medium text-stone-700">
              {t('garden.areaType')}
            </label>
            <select
              id="edit-area-type"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as AreaType)}
            >
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`garden.areaTypes.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-area-color" className="block text-sm font-medium text-stone-700">
              {t('garden.areaColor')}
            </label>
            <input
              id="edit-area-color"
              type="color"
              className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-300"
              value={color.length === 7 ? color : '#8B4513'}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-emerald-700 py-2 font-medium text-white disabled:opacity-60"
              onClick={() => void save()}
            >
              {busy ? t('auth.submitting') : t('garden.saveChanges')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-200 py-2 font-medium text-stone-700"
              onClick={() => {
                setEditing(false);
                setName(area.name);
                setType(area.type);
                setColor(area.color);
                setError(null);
              }}
            >
              {t('garden.cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-stone-200 py-2 font-medium text-stone-700"
            onClick={() => setEditing(true)}
          >
            {t('garden.editArea')}
          </button>
        )}

        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-stone-200 py-2 text-sm font-medium"
              onClick={() => setConfirmDelete(false)}
            >
              {t('garden.cancel')}
            </button>
            <button
              type="button"
              disabled={busy}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => void remove()}
            >
              {t('garden.confirmDelete')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-red-200 py-2 font-medium text-red-700"
            onClick={() => setConfirmDelete(true)}
          >
            {t('garden.deleteArea')}
          </button>
        )}
      </div>
    </aside>
  );
}
