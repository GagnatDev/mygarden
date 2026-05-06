import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { Planting } from '../../api/plantings';
import { formatIsoDateUtc } from './format-iso-date-utc';

export const IndoorPlantingRow = memo(function IndoorPlantingRow({
  pl,
  locale,
  elementLabel,
  onOpen,
  t,
}: {
  pl: Planting;
  locale: string;
  elementLabel: string | null;
  onOpen: (plantingId: string) => void;
  t: TFunction;
}) {
  const sowLine = pl.indoorSowDate
    ? (formatIsoDateUtc(pl.indoorSowDate, locale) ?? t('planning.indoorSowDateNotSet'))
    : t('planning.indoorSowDateNotSet');

  const transplantLine = pl.transplantDate
    ? `${t('planning.transplantDate')}: ${formatIsoDateUtc(pl.transplantDate, locale)}`
    : t('planning.notTransplantedYet');

  const assignmentPill = pl.elementId
    ? { text: t('planning.indoorAssigned'), className: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    : { text: t('planning.indoorUnassigned'), className: 'bg-stone-50 text-stone-700 border-stone-200' };

  return (
    <li className="py-2">
      <button
        type="button"
        data-testid={`indoor-row-${pl.id}`}
        className="w-full rounded-lg px-2 py-1.5 text-left text-stone-800 hover:bg-stone-50"
        onClick={() => onOpen(pl.id)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium text-stone-900">
            {pl.plantName} · {t(`planning.sowing.${pl.sowingMethod}`)}
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${assignmentPill.className}`}>
            {assignmentPill.text}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>
            {t('planning.indoorSowDate')}: {sowLine}
          </span>
          <span>{transplantLine}</span>
          {elementLabel ? <span className="text-stone-600">· {elementLabel}</span> : null}
        </div>
      </button>
    </li>
  );
});

