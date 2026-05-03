import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { deleteGarden, patchGarden } from '../api/gardens';
import type { Area } from '../api/areas';
import { deleteArea, listAreas } from '../api/areas';
import { AreaCreateModal } from '../garden/AreaCreateModal';
import { useGardenContext } from '../garden/garden-context';

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

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteGardenConfirm, setDeleteGardenConfirm] = useState(false);
  const [deleteGardenBusy, setDeleteGardenBusy] = useState(false);
  const [deleteGardenError, setDeleteGardenError] = useState<string | null>(null);

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

  async function handleDeleteArea(areaId: string) {
    if (!gardenId || !confirm(t('areas.confirmDelete'))) return;
    try {
      await deleteArea(gardenId, areaId);
      await loadAreas();
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteGarden() {
    if (!selectedGarden) return;
    setDeleteGardenBusy(true);
    setDeleteGardenError(null);
    try {
      await deleteGarden(selectedGarden.id);
      setDeleteGardenConfirm(false);
      await refreshGardens();
    } catch (e) {
      setDeleteGardenError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setDeleteGardenBusy(false);
    }
  }

  if (!gardenId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!selectedGarden) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <nav className="text-sm text-stone-600">
        <Link to="/" className="hover:underline">
          {t('nav.home')}
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

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-stone-900">{t('areas.sectionTitle')}</h2>
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            onClick={() => setCreateModalOpen(true)}
          >
            {t('areas.addArea')}
          </button>
        </div>
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

      <AreaCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        gardenId={gardenId}
        sortIndex={areas.length}
        onCreated={loadAreas}
      />
    </div>
  );
}
