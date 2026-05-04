import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { Planting } from '../../api/plantings';
import type { PlantProfile } from '../../api/plantProfiles';
import { NotesSection } from '../../components/NotesSection';
import { formatIsoDateUtc } from './format-iso-date-utc';
import type { ElementWithArea } from './types';

export const IndoorPlantingDetailModal = memo(function IndoorPlantingDetailModal({
  planting,
  gardenId,
  seasonId,
  elementsWithArea,
  profiles,
  onClose,
  onMove,
  onDelete,
  t,
  locale,
}: {
  planting: Planting;
  gardenId: string;
  seasonId: string;
  elementsWithArea: ElementWithArea[];
  profiles: PlantProfile[];
  onClose: () => void;
  onMove: (plantingId: string, elementId: string) => Promise<boolean>;
  onDelete: (plantingId: string) => Promise<boolean>;
  t: TFunction;
  locale: string;
}) {
  const profileName =
    planting.plantProfileId != null
      ? profiles.find((p) => p.id === planting.plantProfileId)?.name
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

        <label className="mt-4 block text-sm font-medium text-stone-700">
          {t('planning.moveToElement')}
          <select
            data-testid={`indoor-detail-area-select-${planting.id}`}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              void (async () => {
                if (await onMove(planting.id, v)) onClose();
              })();
            }}
          >
            <option value="">{t('planning.select')}</option>
            {elementsWithArea.map((el) => (
              <option key={el.id} value={el.id}>
                {el.areaTitle} · {el.name}
              </option>
            ))}
          </select>
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
