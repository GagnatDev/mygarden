import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { Planting } from '../../api/plantings';
import { formatIsoDateUtc } from './format-iso-date-utc';

export const IndoorUnassignedPlantingRow = memo(function IndoorUnassignedPlantingRow({
  pl,
  locale,
  onOpen,
  t,
}: {
  pl: Planting;
  locale: string;
  onOpen: (plantingId: string) => void;
  t: TFunction;
}) {
  const dateLine = pl.indoorSowDate
    ? (formatIsoDateUtc(pl.indoorSowDate, locale) ?? t('planning.indoorSowDateNotSet'))
    : t('planning.indoorSowDateNotSet');
  return (
    <li className="py-2">
      <button
        type="button"
        data-testid={`indoor-unassigned-row-${pl.id}`}
        className="w-full rounded-lg px-2 py-1.5 text-left text-stone-800 hover:bg-stone-50"
        onClick={() => onOpen(pl.id)}
      >
        <div className="font-medium text-stone-900">
          {pl.plantName} · {t(`planning.sowing.${pl.sowingMethod}`)}
        </div>
        <div className="mt-0.5 text-xs text-stone-500">{dateLine}</div>
      </button>
    </li>
  );
});
