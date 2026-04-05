import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/gardens';
import { deleteGarden, listAreas } from '../api/gardens';
import { AreaDetailPanel } from '../garden/AreaDetailPanel';
import { CreateAreaDialog } from '../garden/CreateAreaDialog';
import { GardenCreateForm } from '../garden/GardenCreateForm';
import { useGardenContext } from '../garden/garden-context';
import { GridMapEditor, type GridSelection, type MapTool } from '../garden/GridMapEditor';

export function GardenMapPage() {
  const { t } = useTranslation();
  const { gardens, loading, error, selectedGarden, setSelectedGardenId, refreshGardens } =
    useGardenContext();
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<GridSelection | null>(null);
  const [tool, setTool] = useState<MapTool>('select');
  const [deleteGardenConfirm, setDeleteGardenConfirm] = useState(false);
  const [deleteGardenBusy, setDeleteGardenBusy] = useState(false);
  const [deleteGardenError, setDeleteGardenError] = useState<string | null>(null);

  const loadAreas = useCallback(async (gardenId: string) => {
    setAreasLoading(true);
    try {
      const list = await listAreas(gardenId);
      setAreas(list);
    } catch {
      setAreas([]);
    } finally {
      setAreasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGarden) {
      setAreas([]);
      setSelectedAreaId(null);
      return;
    }
    void loadAreas(selectedGarden.id);
  }, [selectedGarden, loadAreas]);

  useEffect(() => {
    if (selectedAreaId && !areas.some((a) => a.id === selectedAreaId)) {
      setSelectedAreaId(null);
    }
  }, [areas, selectedAreaId]);

  const selectedArea = areas.find((a) => a.id === selectedAreaId) ?? null;

  async function handleDeleteGarden() {
    if (!selectedGarden) return;
    setDeleteGardenBusy(true);
    setDeleteGardenError(null);
    try {
      await deleteGarden(selectedGarden.id);
      setDeleteGardenConfirm(false);
      setSelectedAreaId(null);
      setPendingSelection(null);
      await refreshGardens();
    } catch (e) {
      setDeleteGardenError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setDeleteGardenBusy(false);
    }
  }

  if (loading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (gardens.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{t('nav.gardenMap')}</h1>
        <p className="mt-2 text-stone-600">{t('garden.noGardenHint')}</p>
        <div className="mt-6">
          <GardenCreateForm onCreated={refreshGardens} />
        </div>
      </div>
    );
  }

  if (!selectedGarden) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{t('nav.gardenMap')}</h1>
          <p className="mt-1 text-sm text-stone-600">{t('garden.mapHint')}</p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          {gardens.length > 1 ? (
            <label className="flex w-full flex-col text-sm font-medium text-stone-700 md:w-auto md:min-w-[12rem]">
              {t('garden.selectGarden')}
              <select
                className="mt-1 rounded-lg border border-stone-300 px-3 py-2 font-normal"
                value={selectedGarden.id}
                onChange={(e) => setSelectedGardenId(e.target.value)}
              >
                {gardens.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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

      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {areasLoading ? (
            <p className="text-stone-600">{t('auth.loading')}</p>
          ) : (
            <GridMapEditor
              garden={selectedGarden}
              areas={areas}
              selectedAreaId={selectedAreaId}
              onSelectArea={setSelectedAreaId}
              onSelectionComplete={setPendingSelection}
              tool={tool}
              onToolChange={setTool}
            />
          )}
        </div>
        {selectedArea ? (
          <AreaDetailPanel
            gardenId={selectedGarden.id}
            area={selectedArea}
            onClose={() => setSelectedAreaId(null)}
            onChanged={async () => loadAreas(selectedGarden.id)}
          />
        ) : null}
      </div>

      {pendingSelection ? (
        <CreateAreaDialog
          gardenId={selectedGarden.id}
          selection={pendingSelection}
          onClose={() => setPendingSelection(null)}
          onCreated={async () => loadAreas(selectedGarden.id)}
        />
      ) : null}
    </div>
  );
}
