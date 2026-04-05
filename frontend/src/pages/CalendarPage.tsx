import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createManualTask, listTasks, patchTask, type GardenTask } from '../api/tasks';
import { LocaleDateField } from '../components/LocaleDateField';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function utcDayKey(iso: string): string {
  const x = new Date(iso);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

function taskVisualStatus(t: GardenTask, todayKey: string): 'done' | 'overdue' | 'pending' {
  if (t.status === 'done') return 'done';
  const due = utcDayKey(t.dueDate);
  if (due < todayKey) return 'overdue';
  return 'pending';
}

function calendarLocale(language: string): string {
  return language.toLowerCase().startsWith('nb') ? 'nb-NO' : 'en-GB';
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
  const [busy, setBusy] = useState(false);

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
      });
      setManualTitle('');
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleTaskDone(task: GardenTask) {
    if (!selectedGarden) return;
    setBusy(true);
    setError(null);
    try {
      if (task.status === 'done') {
        await patchTask(selectedGarden.id, task.id, { status: 'pending' });
      } else {
        await patchTask(selectedGarden.id, task.id, { status: 'done' });
      }
      await loadTasks();
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
            return (
              <div
                key={key}
                data-testid={`calendar-day-${key}`}
                className="min-h-[4.5rem] rounded-md border border-stone-200 bg-white p-1 text-left"
              >
                <div className="text-[10px] font-medium text-stone-500">{day}</div>
                <div className="mt-0.5 space-y-0.5">
                  {dayTasks.map((task) => {
                    const vis = taskVisualStatus(task, todayKey);
                    const color =
                      vis === 'done'
                        ? 'bg-stone-200 text-stone-700 line-through'
                        : vis === 'overdue'
                          ? 'bg-orange-100 text-orange-900'
                          : 'bg-emerald-100 text-emerald-900';
                    return (
                      <button
                        key={task.id}
                        type="button"
                        data-testid={`calendar-task-${task.id}`}
                        data-status={vis}
                        disabled={busy}
                        className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${color} disabled:opacity-60`}
                        title={
                          task.status === 'done'
                            ? `${task.title} — ${t('planning.taskClickToUndo')}`
                            : `${task.title} — ${t('planning.taskClickToDone')}`
                        }
                        onClick={() => void toggleTaskDone(task)}
                      >
                        {task.title}
                      </button>
                    );
                  })}
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
        <button
          type="submit"
          disabled={busy}
          data-testid="manual-task-submit"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {t('planning.addTask')}
        </button>
      </form>
    </div>
  );
}
