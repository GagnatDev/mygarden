import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/areas';
import { patchTask, type GardenTask } from '../api/tasks';
import { LocaleDateField } from '../components/LocaleDateField';
import { getTaskDisplayTitle } from './task-display-title';
import { taskVisualStatus, utcDayKey } from './calendar-day-key';
import { type ElementLocation, groupTasksByArea } from './group-tasks-by-area';

function formatDayHeading(dayKey: string, locale: string): string {
  const parts = dayKey.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (y === undefined || mo === undefined || d === undefined) return dayKey;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(dt);
}

function dueDateInputValue(iso: string): string {
  return utcDayKey(iso);
}

function TaskStatusSpinner({ label }: { label: string }) {
  return (
    <span
      className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-600"
      role="status"
      aria-label={label}
    />
  );
}

export function CalendarDayTasksPanel({
  open,
  dayKey,
  gardenId,
  tasks,
  areas,
  elementLocations,
  locationsLoading,
  locationError,
  todayKey,
  calendarLocale,
  onClose,
  onAfterTaskMutation,
}: {
  open: boolean;
  dayKey: string;
  gardenId: string;
  tasks: GardenTask[];
  areas: Area[] | null;
  elementLocations: ReadonlyMap<string, ElementLocation> | null;
  locationsLoading: boolean;
  locationError: string | null;
  todayKey: string;
  calendarLocale: string;
  onClose: () => void;
  onAfterTaskMutation: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(() => new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string | undefined>>({});
  const [dueDrafts, setDueDrafts] = useState<Record<string, string>>({});

  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
  }, [open, dayKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const tasksSyncKey = useMemo(
    () => tasks.map((x) => `${x.id}:${x.dueDate}:${x.status}`).join('|'),
    [tasks],
  );

  useEffect(() => {
    if (!open) return;
    setDueDrafts(Object.fromEntries(tasks.map((x) => [x.id, dueDateInputValue(x.dueDate)])));
  }, [open, dayKey, tasksSyncKey]);

  const setBusy = useCallback((taskId: string, busy: boolean) => {
    setMutatingIds((prev) => {
      const n = new Set(prev);
      if (busy) n.add(taskId);
      else n.delete(taskId);
      return n;
    });
  }, []);

  const sections = useMemo(() => {
    if (!areas || !elementLocations || locationsLoading || locationError) return [];
    return groupTasksByArea(tasks, areas, elementLocations);
  }, [tasks, areas, elementLocations, locationsLoading, locationError]);

  const rowContext = useCallback(
    (task: GardenTask): { area: string; element: string } => {
      if (task.elementId) {
        const loc = elementLocations?.get(task.elementId);
        if (!loc) {
          return { area: t('planning.tasksUnknownLocation'), element: '—' };
        }
        return { area: loc.areaTitle, element: loc.elementName };
      }
      if (task.areaId && areas) {
        const a = areas.find((x) => x.id === task.areaId);
        return {
          area: a?.title ?? t('planning.tasksUnknownLocation'),
          element: t('planning.taskAreaWhole'),
        };
      }
      return { area: '—', element: '—' };
    },
    [areas, elementLocations, t],
  );

  async function toggleDone(task: GardenTask) {
    setRowErrors((e) => ({ ...e, [task.id]: undefined }));
    setBusy(task.id, true);
    try {
      const nextStatus = task.status === 'done' ? 'pending' : 'done';
      await patchTask(gardenId, task.id, { status: nextStatus });
      await onAfterTaskMutation();
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [task.id]: e instanceof Error ? e.message : t('auth.unknownError'),
      }));
    } finally {
      setBusy(task.id, false);
    }
  }

  async function saveDueDate(task: GardenTask) {
    const draft = dueDrafts[task.id];
    if (!draft || draft === dueDateInputValue(task.dueDate)) return;
    setRowErrors((e) => ({ ...e, [task.id]: undefined }));
    setBusy(task.id, true);
    try {
      const iso = new Date(`${draft}T12:00:00.000Z`).toISOString();
      await patchTask(gardenId, task.id, { dueDate: iso });
      await onAfterTaskMutation();
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [task.id]: e instanceof Error ? e.message : t('auth.unknownError'),
      }));
    } finally {
      setBusy(task.id, false);
    }
  }

  if (!open) return null;

  const heading = formatDayHeading(dayKey, calendarLocale);
  const showBody = !locationsLoading && !locationError && areas && elementLocations;

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-tasks-title"
      data-testid="calendar-day-panel"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <h2
            id="calendar-day-tasks-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-semibold text-stone-900 outline-none"
          >
            {t('planning.dayTasksTitle', { date: heading })}
          </h2>
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-2 py-1 text-sm text-stone-700"
            onClick={onClose}
            aria-label={t('planning.dayTasksCloseAria')}
          >
            {t('garden.close')}
          </button>
        </div>

        {locationError ? (
          <p className="mt-6 text-sm text-red-600" data-testid="calendar-day-panel-location-error">
            {locationError}
          </p>
        ) : locationsLoading || !showBody ? (
          <p className="mt-6 text-sm text-stone-600" data-testid="calendar-day-panel-loading">
            {t('planning.dayTasksLoadingLocations')}
          </p>
        ) : tasks.length === 0 ? (
          <p className="mt-6 text-sm text-stone-600">{t('planning.dayTasksEmpty')}</p>
        ) : (
          <div className="mt-4 space-y-6">
            {sections.map((section) => (
              <section key={`${section.kind}-${section.areaId ?? section.kind}`}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {section.kind === 'area'
                    ? section.headerTitle
                    : section.kind === 'unknown'
                      ? t('planning.tasksUnknownLocation')
                      : t('planning.tasksNoLocation')}
                </h3>
                <ul className="mt-2 space-y-3">
                  {section.tasks.map((task) => {
                    const displayTitle = getTaskDisplayTitle(task, t);
                    const vis = taskVisualStatus(task, todayKey);
                    const ctx = rowContext(task);
                    const busy = mutatingIds.has(task.id);
                    const plantLabel = task.plantName ?? '—';
                    const statusLabel =
                      vis === 'done'
                        ? t('planning.taskStatus.done')
                        : vis === 'overdue'
                          ? t('planning.taskStatus.overdue')
                          : t('planning.taskStatus.pending');
                    const dueLine = dueDateInputValue(task.dueDate);

                    const doneCheckboxLabel =
                      task.status === 'done' ? t('planning.markNotDone') : t('planning.markDone');

                    return (
                      <li
                        key={task.id}
                        data-testid={`day-panel-task-${task.id}`}
                        className="rounded-lg border border-stone-200 p-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 font-medium text-stone-900">{displayTitle}</p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {busy ? <TaskStatusSpinner label={t('auth.loading')} /> : null}
                            <input
                              type="checkbox"
                              data-testid={`day-panel-toggle-done-${task.id}`}
                              className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500"
                              checked={task.status === 'done'}
                              disabled={busy}
                              aria-label={doneCheckboxLabel}
                              onChange={() => void toggleDone(task)}
                            />
                          </div>
                        </div>
                        <dl className="mt-2 grid gap-1 text-xs text-stone-600 sm:grid-cols-2">
                          <div>
                            <dt className="inline text-stone-500">{t('planning.dayTasksPlant')}: </dt>
                            <dd className="inline">{plantLabel}</dd>
                          </div>
                          <div>
                            <dt className="inline text-stone-500">{t('planning.dayTasksArea')}: </dt>
                            <dd className="inline">{ctx.area}</dd>
                          </div>
                          <div>
                            <dt className="inline text-stone-500">{t('planning.element')}: </dt>
                            <dd className="inline">{ctx.element}</dd>
                          </div>
                          <div>
                            <dt className="inline text-stone-500">{t('planning.dayTasksStatus')}: </dt>
                            <dd className="inline">{statusLabel}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="inline text-stone-500">{t('planning.dayTasksDue')}: </dt>
                            <dd className="inline">{dueLine}</dd>
                          </div>
                        </dl>
                        {rowErrors[task.id] ? (
                          <p className="mt-2 text-xs text-red-600">{rowErrors[task.id]}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="block text-xs font-medium text-stone-700">
                              {t('planning.rescheduleDue')}
                              <LocaleDateField
                                testId={`day-panel-due-${task.id}`}
                                className="mt-0.5 w-40 rounded-lg border border-stone-300 px-2 py-1 text-xs"
                                value={dueDrafts[task.id] ?? dueLine}
                                onChange={(v) => setDueDrafts((d) => ({ ...d, [task.id]: v }))}
                                disabled={busy}
                              />
                            </label>
                            <button
                              type="button"
                              disabled={
                                busy ||
                                (dueDrafts[task.id] ?? dueLine) === dueDateInputValue(task.dueDate)
                              }
                              className="rounded-lg border border-stone-300 px-2 py-1 text-xs font-medium text-stone-800 disabled:opacity-60"
                              onClick={() => void saveDueDate(task)}
                            >
                              {t('planning.saveDueDate')}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
