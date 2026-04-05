import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createPlantProfile,
  deletePlantProfile,
  listPlantProfiles,
  patchPlantProfile,
  type PlantProfile,
  type PlantProfileType,
} from '../api/plantProfiles';

const TYPES: PlantProfileType[] = ['vegetable', 'herb', 'flower', 'berry', 'tree_shrub'];

export function PlantProfilesPage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PlantProfileType>('vegetable');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(await listPlantProfiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPlantProfile({ name: name.trim(), type, notes: notes.trim() || null });
      setName('');
      setNotes('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      await patchPlantProfile(id, { name: editName.trim(), notes: editNotes.trim() || null });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deletePlantProfile(id);
      setDeleteId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="plant-profiles-page">
      <h1 className="text-2xl font-semibold text-stone-900">{t('nav.plantProfiles')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('planning.profilesHint')}</p>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <form
        data-testid="plant-profile-create-form"
        className="mt-6 max-w-lg space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        onSubmit={(e) => void handleCreate(e)}
      >
        <h2 className="text-sm font-semibold text-stone-800">{t('planning.newProfile')}</h2>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.plantName')}
          <input
            data-testid="profile-name-input"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('garden.areaType')}
          <select
            data-testid="profile-type-select"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as PlantProfileType)}
          >
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`planning.plantTypes.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.notesOptional')}
          <textarea
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          data-testid="profile-create-submit"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? t('auth.submitting') : t('planning.createProfile')}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <ul data-testid="plant-profile-list" className="mt-8 space-y-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
              data-testid={`plant-profile-row-${p.id}`}
            >
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    data-testid={`profile-edit-name-${p.id}`}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid={`profile-save-${p.id}`}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
                      onClick={() => void handleSaveEdit(p.id)}
                      disabled={busy}
                    >
                      {t('garden.saveChanges')}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t('garden.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{p.name}</p>
                      <p className="text-sm text-stone-500">{t(`planning.plantTypes.${p.type}`)}</p>
                      {p.notes ? <p className="mt-1 text-sm text-stone-600">{p.notes}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-testid={`profile-edit-btn-${p.id}`}
                        className="text-sm font-medium text-emerald-800"
                        onClick={() => {
                          setEditingId(p.id);
                          setEditName(p.name);
                          setEditNotes(p.notes ?? '');
                        }}
                      >
                        {t('garden.editArea')}
                      </button>
                      <button
                        type="button"
                        data-testid={`profile-delete-btn-${p.id}`}
                        className="text-sm font-medium text-red-700"
                        onClick={() => setDeleteId(p.id)}
                      >
                        {t('planning.deleteProfile')}
                      </button>
                    </div>
                  </div>
                  {deleteId === p.id ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-900">{t('planning.confirmDeleteProfile')}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          data-testid={`profile-delete-confirm-${p.id}`}
                          className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
                          onClick={() => void handleDelete(p.id)}
                          disabled={busy}
                        >
                          {t('garden.confirmDelete')}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm"
                          onClick={() => setDeleteId(null)}
                        >
                          {t('garden.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
