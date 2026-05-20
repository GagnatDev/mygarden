import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { Planting } from '../../api/plantings';
import type { PlantProfile } from '../../api/plantProfiles';
import { NotesSection } from '../../components/NotesSection';
import type { Area } from '../../api/areas';
import { ElementMoveSelect } from './ElementMoveSelect';
import { formatIsoDateUtc } from './format-iso-date-utc';
import type { ElementWithArea } from './types';

export const IndoorPlantingDetailModal = memo(function IndoorPlantingDetailModal({
  planting,
  gardenId,
  seasonId,
  areas,
  elementsByAreaId,
  elementsWithArea,
  profiles,
  onClose,
  onMove,
  onMarkTransplanted,
  isActuallyTransplanted,
  onDelete,
  t,
  locale,
}: {
  planting: Planting;
  gardenId: string;
  seasonId: string;
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  elementsWithArea: ElementWithArea[];
  profiles: PlantProfile[];
  onClose: () => void;
  onMove: (plantingId: string, elementId: string) => Promise<boolean>;
  onMarkTransplanted: (plantingId: string) => Promise<boolean>;
  isActuallyTransplanted: boolean;
  onDelete: (plantingId: string) => Promise<boolean>;
  t: TFunction;
  locale: string;
}) {
  const profileName =
    planting.plantProfileId != null
      ? profiles.find((p) => p.id === planting.plantProfileId)?.name
      : undefined;

  const assignedElement =
    planting.elementId != null
      ? elementsWithArea.find((el) => el.id === planting.elementId)
      : undefined;
  const locationLabel = assignedElement
    ? `${assignedElement.areaTitle} · ${assignedElement.name}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="indoor-planting-detail-title"
      data-testid="indoor-planting-detail-modal"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-4 shadow-lg">
        <h2 id="indoor-planting-detail-title" className="text-lg font-semibold text-stone-900">
          {planting.plantName}
        </h2>
        <p className="mt-0.5 text-sm text-stone-500">{t('planning.plantingDetailTitle')}</p>

        <dl className="mt-4 space-y-2 text-sm text-stone-700">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {t('planning.sowingMethod')}
            </dt>
            <dd>{t(`planning.sowing.${planting.sowingMethod}`)}</dd>
          </div>
          {locationLabel ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantingDetailLocation')}
              </dt>
              <dd data-testid={`indoor-detail-location-${planting.id}`}>{locationLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {t('planning.indoorSowDate')}
            </dt>
            <dd>
              {planting.indoorSowDate
                ? (formatIsoDateUtc(planting.indoorSowDate, locale) ?? t('planning.indoorSowDateNotSet'))
                : t('planning.indoorSowDateNotSet')}
            </dd>
          </div>
          {planting.transplantDate ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.transplantDate')}
              </dt>
              <dd>{formatIsoDateUtc(planting.transplantDate, locale)}</dd>
            </div>
          ) : null}
          {planting.harvestWindowStart ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantingDetailHarvestStart')}
              </dt>
              <dd>{formatIsoDateUtc(planting.harvestWindowStart, locale)}</dd>
            </div>
          ) : null}
          {planting.harvestWindowEnd ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantingDetailHarvestEnd')}
              </dt>
              <dd>{formatIsoDateUtc(planting.harvestWindowEnd, locale)}</dd>
            </div>
          ) : null}
          {planting.quantity != null ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantingDetailQuantity')}
              </dt>
              <dd>{planting.quantity}</dd>
            </div>
          ) : null}
          {profileName ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantProfile')}
              </dt>
              <dd>{profileName}</dd>
            </div>
          ) : null}
          {planting.notes?.trim() ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                {t('planning.plantingDetailDescription')}
              </dt>
              <dd className="whitespace-pre-wrap">{planting.notes}</dd>
            </div>
          ) : null}
        </dl>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-stone-700">
          {t('planning.moveToElement')}
          <ElementMoveSelect
            testId={`indoor-detail-area-select-${planting.id}`}
            value={planting.elementId}
            areas={areas}
            elementsByAreaId={elementsByAreaId}
            allowEmptyOption={!planting.elementId}
            onChange={(elementId) => {
              void (async () => {
                if (await onMove(planting.id, elementId)) onClose();
              })();
            }}
          />
        </label>

        <div className="mt-4 border-t border-stone-100 pt-4">
          <NotesSection
            gardenId={gardenId}
            seasonId={seasonId}
            targetType="planting"
            targetId={planting.id}
            className="border-stone-200"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-4">
          {!isActuallyTransplanted ? (
            <button
              type="button"
              data-testid={`indoor-detail-mark-transplanted-${planting.id}`}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              onClick={() =>
                void (async () => {
                  if (await onMarkTransplanted(planting.id)) onClose();
                })()
              }
            >
              {t('planning.markAsTransplanted')}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700"
            onClick={onClose}
          >
            {t('planning.plantingDetailClose')}
          </button>
          <button
            type="button"
            data-testid={`indoor-detail-delete-${planting.id}`}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
            onClick={() =>
              void (async () => {
                if (await onDelete(planting.id)) onClose();
              })()
            }
          >
            {t('planning.removePlanting')}
          </button>
        </div>
      </div>
    </div>
  );
});
