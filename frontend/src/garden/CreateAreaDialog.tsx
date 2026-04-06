import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AreaType } from '../api/gardens';
import { createArea } from '../api/gardens';
import type { AreaDraftSelection } from './GridMapEditor';

const TYPES: AreaType[] = ['raised_bed', 'open_bed', 'tree_zone', 'path', 'lawn', 'other'];

export interface CreateAreaDialogProps {
  gardenId: string;
  selection: AreaDraftSelection;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function CreateAreaDialog({ gardenId, selection, onClose, onCreated }: CreateAreaDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<AreaType>('raised_bed');
  const [color, setColor] = useState('#8B4513');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t('garden.areaNameRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createArea(gardenId, {
        name: name.trim(),
        type,
        color,
        gridX: selection.gridX,
        gridY: selection.gridY,
        gridWidth: selection.gridWidth,
        gridHeight: selection.gridHeight,
        shape: selection.shape,
      });
      await onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-area-title"
    >
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
        <h2 id="create-area-title" className="text-lg font-semibold text-stone-900">
          {t('garden.createAreaTitle')}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {selection.gridWidth}×{selection.gridHeight} {t('garden.cells')}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="area-name" className="block text-sm font-medium text-stone-700">
              {t('garden.areaName')}
            </label>
            <input
              id="area-name"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="area-type" className="block text-sm font-medium text-stone-700">
              {t('garden.areaType')}
            </label>
            <select
              id="area-type"
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
            <label htmlFor="area-color" className="block text-sm font-medium text-stone-700">
              {t('garden.areaColor')}
            </label>
            <input
              id="area-color"
              type="color"
              className="mt-1 h-10 w-full cursor-pointer rounded border border-stone-300"
              value={color.length === 7 ? color : '#8B4513'}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-stone-200 py-2 font-medium text-stone-700"
              onClick={onClose}
            >
              {t('garden.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-emerald-700 py-2 font-medium text-white disabled:opacity-60"
            >
              {submitting ? t('auth.submitting') : t('garden.saveArea')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
