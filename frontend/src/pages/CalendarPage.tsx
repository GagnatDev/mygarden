import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { listAreas, type Area } from '../api/areas';
import { listElements } from '../api/elements';
import { createManualTask, listTasks, type GardenTask } from '../api/tasks';
import { LocaleDateField } from '../components/LocaleDateField';
import { CalendarDayTasksPanel } from '../planning/CalendarDayTasksPanel';
import { taskVisualStatus, utcDayKey } from '../planning/calendar-day-key';
import type { ElementLocation } from '../planning/group-tasks-by-area';
import { getTaskDisplayTitle } from '../planning/task-display-title';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';

/** Max task preview rows per day cell (non-interactive). */
export const CALENDAR_PREVIEW_TASK_CAP = 3;

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function calendarLocale(language: string): string {
  return language.toLowerCase().startsWith('nb') ? 'nb-NO' : 'en-GB';
}

function parseDayQueryParam(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return value;
}

/** Monday-first weekday labels (short) for the calendar header. */
export function getWeekdayShortLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d);
  });
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = calendarLocale(i18n.language);
  const weekdayLabels = useMemo(() => getWeekdayShortLabels(locale), [locale]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedGarden, loading: gardenLoading, error: gardenError } = useGardenContext();
  const { seasonId, loading: seasonLoading, error: seasonError } = useActiveSeason(
    selectedGarden?.id ?? null,
  );
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDue, setManualDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualAreaId, setManualAreaId] = useState('');
  const [manualElementId, setManualElementId] = useState('');
  const [busy, setBusy] = useState(false);
  const [locationData, setLocationData] = useState<{ areas: Area[]; map: Map<string, ElementLocation> } | null>(
    null,
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const rawDayParam = searchParams.get('day');
  const openDayKey = parseDayQueryParam(rawDayParam);

  const todayKey = utcDayKey(new Date().toISOString());

  const loadTasks = useCallback(async () => {
    if (!selectedGarden || !seasonId) return;
    setLoading(true);
    setError(null);
    try {
      setTasks(await listTasks(selectedGarden.id, seasonId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setLoading(false);
    }
  }, [selectedGarden, seasonId, t]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setLocationData(null);
    setLocationError(null);
  }, [selectedGarden?.id]);

  useEffect(() => {
    if (!openDayKey) return;
    const parts = openDayKey.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y === undefined || m === undefined || d === undefined) return;
    const dayMonth = startOfMonth(new Date(Date.UTC(y, m - 1, d)));
    setCursor((c) => {
      if (c.getUTCFullYear() === dayMonth.getUTCFullYear() && c.getUTCMonth() === dayMonth.getUTCMonth()) {
        return c;
      }
      return dayMonth;
    });
  }, [openDayKey]);

  const loadLocationData = useCallback(async () => {
    if (!selectedGarden) return;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const areas = await listAreas(selectedGarden.id);
      const map = new Map<string, ElementLocation>();
      await Promise.all(
        areas.map(async (area) => {
          const els = await listElements(selectedGarden.id, area.id);
          for (const el of els) {
            map.set(el.id, { areaId: area.id, areaTitle: area.title, elementName: el.name });
          }
        }),
      );
      setLocationData({ areas, map });
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : t('auth.unknownError'));
      setLocationData(null);
    } finally {
      setLocationLoading(false);
    }
  }, [selectedGarden, t]);

  useEffect(() => {
    if (!selectedGarden) return;
    if (locationData !== null) return;
    if (locationError) return;
    void loadLocationData();
  }, [selectedGarden, locationData, locationError, loadLocationData]);

  const sortedAreasForManual = useMemo(
    () =>
      [...(locationData?.areas ?? [])].sort(
        (a, b) => a.sortIndex - b.sortIndex || a.id.localeCompare(b.id),
      ),
    [locationData?.areas],
  );

  const manualElementChoices = useMemo(() => {
    if (!manualAreaId || !locationData) return [];
    return [...locationData.map.entries()]
      .filter(([, loc]) => loc.areaId === manualAreaId)
      .map(([id, loc]) => ({ id, name: loc.elementName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [manualAreaId, locationData]);

  const invalidateLocationData = useCallback(() => {
    setLocationData(null);
  }, []);

  const tasksForOpenDay = useMemo(() => {
    if (!openDayKey) return [];
    return tasks.filter((task) => utcDayKey(task.dueDate) === openDayKey);
  }, [tasks, openDayKey]);

  /** Refetch tasks only; day-panel edits do not change area/element data, so avoid invalidating locations (prevents modal flash). */
  const afterTaskMutation = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const byDay = useMemo(() => {
    const m = new Map<string, GardenTask[]>();
    for (const task of tasks) {
      const k = utcDayKey(task.dueDate);
      const list = m.get(k) ?? [];
      list.push(task);
      m.set(k, list);
    }
    return m;
  }, [tasks]);

  function openDayPanel(dayKey: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('day', dayKey);
        return next;
      },
      { replace: false },
    );
  }

  function closeDayPanel() {
    setLocationError(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('day');
        return next;
      },
      { replace: true },
    );
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGarden || !seasonId || !manualTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createManualTask(selectedGarden.id, {
        seasonId,
        title: manualTitle.trim(),
        dueDate: new Date(`${manualDue}T12:00:00.000Z`).toISOString(),
        ...(manualElementId
          ? { elementId: manualElementId }
          : manualAreaId
            ? { areaId: manualAreaId }
            : {}),
      });
      setManualTitle('');
      setManualAreaId('');
      setManualElementId('');
      await loadTasks();
      invalidateLocationData();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  if (gardenLoading || seasonLoading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }
  if (gardenError || seasonError) {
    return <p className="text-red-600">{gardenError ?? seasonError}</p>;
  }
  if (!selectedGarden || !seasonId) {
    return <p className="text-stone-600">{t('garden.noGardenHint')}</p>;
  }

  const blanks = (firstDow + 6) % 7;
  const cells: (number | null)[] = [...Array(blanks).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function formatShortDayLabel(dayKey: string): string {
    const parts = dayKey.split('-').map(Number);
    const y = parts[0];
    const mo = parts[1];
    const d = parts[2];
    if (y === undefined || mo === undefined || d === undefined) return dayKey;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(dt);
  }

  return (
    <div data-testid="calendar-page">
      <h1 className="text-2xl font-semibold text-stone-900">{t('nav.calendar')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('planning.calendarHint')}</p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
          onClick={() => setCursor((c) => addMonths(c, -1))}
        >
          ←
        </button>
        <p className="text-lg font-semibold text-stone-800" data-testid="calendar-month-label">
          {new Date(Date.UTC(year, month, 1)).toLocaleDateString(locale, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </p>
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
          onClick={() => setCursor((c) => addMonths(c, 1))}
        >
          →
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <div
          data-testid="calendar-grid"
          className="mt-4 grid grid-cols-7 gap-1 text-center text-xs md:text-sm"
        >
          {weekdayLabels.map((d, idx) => (
            <div key={idx} data-testid={`calendar-weekday-${idx}`} className="font-medium text-stone-500">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`b-${i}`} className="min-h-[4.5rem] rounded-md bg-stone-50/80" />;
            }
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = byDay.get(key) ?? [];
            const previews = dayTasks.slice(0, CALENDAR_PREVIEW_TASK_CAP);
            const moreCount = dayTasks.length - previews.length;
            return (
              <div
                key={key}
                data-testid={`calendar-day-${key}`}
                className="min-h-[4.5rem] rounded-md border border-stone-200 bg-white p-1 text-left"
              >
                <button
                  type="button"
                  data-testid={`calendar-day-open-${key}`}
                  className="w-full rounded px-0.5 py-0.5 text-left text-[10px] font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label={t('planning.calendarDayOpenTasksAria', { date: formatShortDayLabel(key) })}
                  onClick={() => openDayPanel(key)}
                >
                  {day}
                </button>
                <div className="mt-0.5 space-y-0.5" aria-hidden={previews.length > 0 ? true : undefined}>
                  {previews.map((task) => {
                    const displayTitle = getTaskDisplayTitle(task, t);
                    const vis = taskVisualStatus(task, todayKey);
                    const color =
                      vis === 'done'
                        ? 'bg-stone-200 text-stone-700 line-through'
                        : vis === 'overdue'
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-emerald-100 text-emerald-900';
                    return (
                      <div
                        key={task.id}
                        data-testid={`calendar-task-preview-${task.id}`}
                        data-status={vis}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${color}`}
                        title={displayTitle}
                      >
                        {displayTitle}
                      </div>
                    );
                  })}
                  {moreCount > 0 ? (
                    <p className="px-1 text-[10px] font-medium text-stone-500">
                      {t('planning.tasksMoreCount', { count: moreCount })}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form
        className="mt-8 max-w-md space-y-2 rounded-xl border border-stone-200 bg-white p-4"
        onSubmit={(e) => void addManual(e)}
      >
        <h2 className="text-sm font-semibold text-stone-800">{t('planning.manualTask')}</h2>
        <input
          data-testid="manual-task-title"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          placeholder={t('planning.taskTitle')}
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
        />
        <LocaleDateField
          testId="manual-task-due"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          value={manualDue}
          onChange={setManualDue}
        />
        <label className="block text-xs font-medium text-stone-700">
          {t('planning.manualTaskArea')}
          <select
            data-testid="manual-task-area"
            className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            value={manualAreaId}
            disabled={locationLoading || !locationData}
            onChange={(e) => {
              setManualAreaId(e.target.value);
              setManualElementId('');
            }}
          >
            <option value="">{t('planning.manualTaskAreaNone')}</option>
            {sortedAreasForManual.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        {manualAreaId ? (
          <label className="block text-xs font-medium text-stone-700">
            {t('planning.manualTaskElementOptional')}
            <select
              data-testid="manual-task-element"
              className="mt-0.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              value={manualElementId}
              disabled={locationLoading || !locationData}
              onChange={(e) => setManualElementId(e.target.value)}
            >
              <option value="">{t('planning.manualTaskElementWholeArea')}</option>
              {manualElementChoices.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          data-testid="manual-task-submit"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {t('planning.addTask')}
        </button>
      </form>

      {openDayKey ? (
        <CalendarDayTasksPanel
          open
          dayKey={openDayKey}
          gardenId={selectedGarden.id}
          tasks={tasksForOpenDay}
          areas={locationData?.areas ?? null}
          elementLocations={locationData?.map ?? null}
          locationsLoading={locationLoading}
          locationError={locationError}
          todayKey={todayKey}
          calendarLocale={locale}
          onClose={closeDayPanel}
          onAfterTaskMutation={afterTaskMutation}
        />
      ) : null}
    </div>
  );
}
