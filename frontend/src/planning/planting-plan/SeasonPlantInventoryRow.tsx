import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type { Area } from '../../api/areas';
import type { Planting } from '../../api/plantings';
import { NotesSection } from '../../components/NotesSection';
import { ElementMoveSelect } from './ElementMoveSelect';
import { formatIsoDateUtc } from './format-iso-date-utc';
import { locationLabel, primarySowDate } from './season-inventory-helpers';
import type { ElementWithArea } from './types';

export const SeasonPlantInventoryRow = memo(function SeasonPlantInventoryRow({
  pl,
  gardenId,
  seasonId,
  areas,
  elementsByAreaId,
  locale,
  elementLabelById,
  unassignedLabel,
  notesPlantingId,
  setNotesPlantingId,
  onMove,
  onDelete,
  onOpenIndoorDetail,
  isMoving,
  t,
}: {
  pl: Planting;
  gardenId: string;
  seasonId: string;
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  locale: string;
  elementLabelById: Map<string, string>;
  unassignedLabel: string;
  notesPlantingId: string | null;
  setNotesPlantingId: Dispatch<SetStateAction<string | null>>;
  onMove: (plantingId: string, elementId: string) => void;
  onDelete: (plantingId: string) => void;
  onOpenIndoorDetail: (plantingId: string) => void;
  isMoving?: boolean;
  t: TFunction;
}) {
  const sowDate = primarySowDate(pl);
  const sowLabel =
    pl.sowingMethod === 'indoor' ? t('planning.indoorSowDate') : t('planning.outdoorSowDate');
  const sowLine = sowDate
    ? (formatIsoDateUtc(sowDate, locale) ?? t('planning.dateNotSet'))
    : t('planning.dateNotSet');

  const transplantLine =
    pl.sowingMethod === 'indoor'
      ? pl.transplantDate
        ? `${t('planning.transplantDate')}: ${formatIsoDateUtc(pl.transplantDate, locale)}`
        : t('planning.notTransplantedYet')
      : null;

  const loc = locationLabel(pl, elementLabelById, unassignedLabel);

  return (
    <li
      data-testid={`season-plant-row-${pl.id}`}
      aria-busy={isMoving || undefined}
      className="rounded-xl border border-stone-200 bg-white p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {pl.sowingMethod === 'indoor' ? (
              <button
                type="button"
                className="font-medium text-stone-900 hover:underline"
                data-testid={`season-plant-name-${pl.id}`}
                onClick={() => onOpenIndoorDetail(pl.id)}
              >
                {pl.plantName}
              </button>
            ) : (
              <span className="font-medium text-stone-900">{pl.plantName}</span>
            )}
            <span className="text-sm text-stone-500">{t(`planning.sowing.${pl.sowingMethod}`)}</span>
          </div>
          <dl className="mt-1 grid gap-0.5 text-xs text-stone-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">{sowLabel}: </dt>
              <dd className="inline">{sowLine}</dd>
            </div>
            {transplantLine ? (
              <div>
                <dd className="inline">{transplantLine}</dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="inline font-medium">{t('planning.locationLabel')}: </dt>
              <dd className="inline" data-testid={`season-plant-location-${pl.id}`}>
                {loc}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pl.sowingMethod === 'indoor' ? (
            <button
              type="button"
              data-testid={`season-plant-details-${pl.id}`}
              className="rounded border border-stone-200 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50"
              onClick={() => onOpenIndoorDetail(pl.id)}
            >
              {t('planning.plantDetails')}
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`planting-notes-toggle-${pl.id}`}
            className="rounded border border-stone-200 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50"
            onClick={() => setNotesPlantingId((cur) => (cur === pl.id ? null : pl.id))}
          >
            {t('notes.title')}
          </button>
          <label className="flex items-center gap-1 text-xs text-stone-600">
            <span>{t('planning.moveToElement')}</span>
            <ElementMoveSelect
              testId={`planting-area-select-${pl.id}`}
              value={pl.elementId}
              areas={areas}
              elementsByAreaId={elementsByAreaId}
              disabled={isMoving}
              allowEmptyOption={!pl.elementId}
              onChange={(elementId) => onMove(pl.id, elementId)}
            />
            {isMoving ? (
              <span className="text-stone-500" data-testid={`planting-move-saving-${pl.id}`}>
                {t('planning.savingMove')}
              </span>
            ) : null}
          </label>
          <button
            type="button"
            data-testid={`planting-delete-${pl.id}`}
            className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
            onClick={() => void onDelete(pl.id)}
          >
            {t('planning.removePlanting')}
          </button>
        </div>
      </div>
      {notesPlantingId === pl.id ? (
        <NotesSection
          className="mt-3 border-stone-200"
          gardenId={gardenId}
          seasonId={seasonId}
          targetType="planting"
          targetId={pl.id}
          hideHeading
        />
      ) : null}
    </li>
  );
});
