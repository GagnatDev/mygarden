import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleDateField } from '../components/LocaleDateField';
import { createLog, type ActivityType } from '../api/logs';

const ACTIVITIES: ActivityType[] = [
  'sown_indoors',
  'sown_outdoors',
  'transplanted',
  'watered',
  'fertilized',
  'pruned',
  'harvested',
  'problem_noted',
];

export interface QuickLogElementOption {
  id: string;
  name: string;
}

export interface QuickLogPlantingOption {
  id: string;
  plantName: string;
  elementId: string;
}

export function QuickLogModal({
  open,
  onClose,
  gardenId,
  seasonId,
  elements,
  plantings,
  onLogged,
}: {
  open: boolean;
  onClose: () => void;
  gardenId: string;
  seasonId: string;
  elements: QuickLogElementOption[];
  plantings: QuickLogPlantingOption[];
  onLogged?: () => void;
}) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<'planting' | 'element'>('planting');
  const [plantingId, setPlantingId] = useState('');
  const [elementId, setElementId] = useState('');
  const [activity, setActivity] = useState<ActivityType>('watered');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    let plantingIdOut: string | null = null;
    let elementIdOut: string | null = null;
    if (target === 'planting') {
      plantingIdOut = plantingId || null;
      if (plantingIdOut) {
        elementIdOut = plantings.find((p) => p.id === plantingIdOut)?.elementId ?? null;
      }
    } else {
      elementIdOut = elementId || null;
    }
    if (!plantingIdOut && !elementIdOut) {
      setErr(t('planning.logNeedTarget'));
      return;
    }
    setBusy(true);
    try {
      const day = new Date(`${date}T12:00:00.000Z`);
      const clientTimestamp = new Date().toISOString();
      await createLog(gardenId, {
        seasonId,
        plantingId: plantingIdOut,
        elementId: elementIdOut,
        activity,
        date: day.toISOString(),
        note: note.trim() || null,
        clientTimestamp,
      });
      onLogged?.();
      onClose();
      setNote('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-log-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-4 shadow-lg">
        <h2 id="quick-log-title" className="text-lg font-semibold text-stone-900">
          {t('planning.quickLog')}
        </h2>
        <form className="mt-4 space-y-3" onSubmit={(e) => void submit(e)}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-stone-700">{t('planning.logTarget')}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                checked={target === 'planting'}
                onChange={() => setTarget('planting')}
              />
              {t('planning.targetPlanting')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                checked={target === 'element'}
                onChange={() => setTarget('element')}
              />
              {t('planning.targetElement')}
            </label>
          </fieldset>

          {target === 'planting' ? (
            <label className="block text-sm font-medium text-stone-700">
              {t('planning.planting')}
              <select
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                value={plantingId}
                onChange={(e) => setPlantingId(e.target.value)}
                data-testid="quick-log-planting-select"
              >
                <option value="">{t('planning.select')}</option>
                {plantings.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.plantName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block text-sm font-medium text-stone-700">
              {t('planning.targetElement')}
              <select
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                value={elementId}
                onChange={(e) => setElementId(e.target.value)}
              >
                <option value="">{t('planning.select')}</option>
                {elements.map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium text-stone-700">
            {t('planning.activity')}
            <select
              data-testid="quick-log-activity"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityType)}
            >
              {ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {t(`planning.activities.${a}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-stone-700">
            {t('planning.logDate')}
            <LocaleDateField testId="quick-log-date" required value={date} onChange={setDate} />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            {t('planning.noteOptional')}
            <textarea
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {err ? <p className="text-sm text-red-600">{err}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
              onClick={onClose}
            >
              {t('garden.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy}
              data-testid="quick-log-submit"
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? t('auth.submitting') : t('planning.saveLog')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
