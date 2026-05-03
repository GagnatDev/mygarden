import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/areas';
import type { Element } from '../api/elements';
import { listSeasons, type Season } from '../api/gardens';
import { archiveSeason, getSeasonSnapshot, type SeasonSnapshot } from '../api/seasons';
import { NotesSection } from '../components/NotesSection';
import { useGardenContext } from '../garden/garden-context';
import { GridMapEditor, type MapTool } from '../garden/GridMapEditor';
import { useActiveSeason } from '../garden/useActiveSeason';

export function HistoryPage() {
  const { t } = useTranslation();
  const { selectedGarden, loading: gardenLoading, error: gardenError } = useGardenContext();
  const { seasonId: activeSeasonId, refresh: refreshActiveSeason } = useActiveSeason(
    selectedGarden?.id ?? null,
  );

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SeasonSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<MapTool>('pan');
  const [archiveBusy, setArchiveBusy] = useState(false);

  const loadSeasons = useCallback(async () => {
    if (!selectedGarden) {
      setSeasons([]);
      return;
    }
    try {
      const list = await listSeasons(selectedGarden.id);
      setSeasons(list);
      setPickedId((cur) => {
        if (cur && list.some((s) => s.id === cur)) return cur;
        const active = list.find((s) => s.isActive);
        return active?.id ?? list[0]?.id ?? null;
      });
    } catch (e) {
      setSeasons([]);
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    }
  }, [selectedGarden, t]);

  useEffect(() => {
    void loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    if (!selectedGarden || !pickedId) {
      setSnap(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getSeasonSnapshot(selectedGarden.id, pickedId)
      .then((s) => {
        if (!cancelled) setSnap(s);
      })
      .catch((e) => {
        if (!cancelled) {
          setSnap(null);
          setError(e instanceof Error ? e.message : t('auth.unknownError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedGarden, pickedId, t]);

  const elementIdsWithPlantings = useMemo(
    () => new Set(snap?.plantings.map((p) => p.elementId).filter((id): id is string => Boolean(id)) ?? []),
    [snap],
  );

  const historyMap = useMemo(() => {
    if (!snap || snap.areas.length === 0) {
      return { area: null as Area | null, elements: [] as Element[] };
    }
    const area = snap.areas[0];
    if (!area) {
      return { area: null as Area | null, elements: [] as Element[] };
    }
    const els = snap.elements.filter((e) => e.areaId === area.id);
    return { area, elements: els };
  }, [snap]);

  const canArchive = pickedId && activeSeasonId && pickedId === activeSeasonId;

  async function handleArchive() {
    if (!selectedGarden || !pickedId || !canArchive) return;
    if (!window.confirm(t('history.confirmArchive'))) return;
    setArchiveBusy(true);
    setError(null);
    try {
      await archiveSeason(selectedGarden.id, pickedId, {});
      await loadSeasons();
      await refreshActiveSeason();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setArchiveBusy(false);
    }
  }

  if (gardenLoading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }
  if (gardenError) {
    return <p className="text-red-600">{gardenError}</p>;
  }
  if (!selectedGarden) {
    return <p className="text-stone-600">{t('garden.noGardenHint')}</p>;
  }

  const notesReadOnly = !!(pickedId && activeSeasonId && pickedId !== activeSeasonId);

  return (
    <div data-testid="history-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{t('nav.history')}</h1>
          <p className="mt-1 text-sm text-stone-600">{t('history.hint')}</p>
        </div>
        <label className="flex flex-col text-sm font-medium text-stone-700 md:min-w-[14rem]">
          {t('history.seasonPicker')}
          <select
            data-testid="history-season-picker"
            className="mt-1 rounded-lg border border-stone-300 px-3 py-2 font-normal"
            value={pickedId ?? ''}
            onChange={(e) => setPickedId(e.target.value || null)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.isActive ? ` (${t('history.active')})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {canArchive ? (
        <div className="mt-4">
          <button
            type="button"
            data-testid="archive-season"
            disabled={archiveBusy}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 disabled:opacity-60"
            onClick={() => void handleArchive()}
          >
            {archiveBusy ? t('auth.submitting') : t('history.archiveSeason')}
          </button>
        </div>
      ) : null}

      {loading || !snap ? (
        <p className="mt-6 text-stone-600">{loading ? t('auth.loading') : t('history.pickSeason')}</p>
      ) : !historyMap.area ? (
        <p className="mt-6 text-sm text-stone-600">{t('history.noAreaInSnapshot')}</p>
      ) : (
        <div className="mt-6 space-y-8">
          <div className="flex min-h-[280px] flex-col md:min-h-[360px]">
            <p className="mb-2 text-sm text-stone-600">{t('history.mapCaption')}</p>
            <GridMapEditor
              gardenId={selectedGarden.id}
              area={historyMap.area}
              elements={historyMap.elements}
              elementIdsWithPlantings={elementIdsWithPlantings}
              selectedElementId={null}
              onSelectElement={() => {}}
              onSelectionComplete={() => {}}
              tool={tool}
              onToolChange={setTool}
              readOnly
            />
          </div>

          <section data-testid="history-plantings">
            <h2 className="text-lg font-semibold text-stone-900">{t('history.plantings')}</h2>
            {snap.plantings.length === 0 ? (
              <p className="mt-1 text-sm text-stone-500">{t('planning.noPlantingsInArea')}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {snap.plantings.map((p) => (
                  <li key={p.id} data-testid={`history-planting-${p.id}`}>
                    {p.plantName} · {t(`planning.sowing.${p.sowingMethod}`)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-testid="history-logs">
            <h2 className="text-lg font-semibold text-stone-900">{t('planning.activityTimeline')}</h2>
            <ul className="mt-2 space-y-2">
              {snap.logs.map((log) => (
                <li
                  key={log.id}
                  data-testid={`history-log-${log.id}`}
                  className="rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium">{t(`planning.activities.${log.activity}`)}</span>
                  <span className="text-stone-500"> · {log.date.slice(0, 10)}</span>
                  {log.note ? <p className="text-stone-600">{log.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>

          <section data-testid="history-notes">
            <h2 className="text-lg font-semibold text-stone-900">{t('notes.seasonNotes')}</h2>
            <NotesSection
              gardenId={selectedGarden.id}
              seasonId={snap.season.id}
              targetType="season"
              targetId={snap.season.id}
              readOnly={notesReadOnly}
              hideHeading
            />
          </section>
        </div>
      )}
    </div>
  );
}
