import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ElementType } from '../api/elements';
import { createElement } from '../api/elements';
import type { ElementDraftSelection } from './GridMapEditor';

const TYPES: ElementType[] = ['raised_bed', 'open_bed', 'tree_zone', 'path', 'lawn', 'other'];

export interface CreateElementDialogProps {
  gardenId: string;
  areaId: string;
  selection: ElementDraftSelection;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function CreateElementDialog({
  gardenId,
  areaId,
  selection,
  onClose,
  onCreated,
}: CreateElementDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<ElementType>('raised_bed');
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
      await createElement(gardenId, areaId, {
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
      aria-labelledby="create-element-title"
    >
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
        <h2 id="create-element-title" className="text-lg font-semibold text-stone-900">
          {t('garden.createAreaTitle')}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {selection.gridWidth}×{selection.gridHeight} {t('garden.cells')}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="element-name" className="block text-sm font-medium text-stone-700">
              {t('garden.areaName')}
            </label>
            <input
              id="element-name"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="element-type" className="block text-sm font-medium text-stone-700">
              {t('garden.areaType')}
            </label>
            <select
              id="element-type"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as ElementType)}
            >
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`garden.areaTypes.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="element-color" className="block text-sm font-medium text-stone-700">
              {t('garden.areaColor')}
            </label>
            <input
              id="element-color"
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
