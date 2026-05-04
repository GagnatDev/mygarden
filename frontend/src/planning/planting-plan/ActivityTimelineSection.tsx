import { useTranslation } from 'react-i18next';
import type { listLogs } from '../../api/logs';

type LogEntry = Awaited<ReturnType<typeof listLogs>>[number];

export function ActivityTimelineSection({ logs }: { logs: LogEntry[] }) {
  const { t } = useTranslation();

  return (
    <section data-testid="activity-timeline" className="mt-10">
      <h2 className="text-lg font-semibold text-stone-900">{t('planning.activityTimeline')}</h2>
      <ul className="mt-3 space-y-2">
        {logs.map((log) => (
          <li
            key={log.id}
            data-testid={`log-entry-${log.id}`}
            className="rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm text-stone-700"
          >
            <span className="font-medium">{t(`planning.activities.${log.activity}`)}</span>
            <span className="text-stone-500"> · {log.date.slice(0, 10)}</span>
            {log.note ? <p className="text-stone-600">{log.note}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
