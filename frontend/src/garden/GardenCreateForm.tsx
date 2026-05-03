import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGarden } from '../api/gardens';

export interface GardenCreateFormProps {
  onCreated: () => Promise<void>;
}

export function GardenCreateForm({ onCreated }: GardenCreateFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t('garden.nameRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createGarden({
        name: name.trim(),
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
