import { useTranslation } from 'react-i18next';
import type { Planting } from '../../api/plantings';
import { IndoorUnassignedPlantingRow } from './IndoorUnassignedPlantingRow';

export function IndoorUnassignedSection({
  indoorUnassignedCount,
  sortedIndoorUnassigned,
  locale,
  onOpenRow,
}: {
  indoorUnassignedCount: number;
  sortedIndoorUnassigned: Planting[];
  locale: string;
  onOpenRow: (plantingId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <section data-testid="indoor-unassigned-section" className="mt-6 space-y-3">
      <h2 className="text-lg font-semibold text-stone-900">
        {t('planning.indoorUnassignedSectionWithCount', { count: indoorUnassignedCount })}
      </h2>
      {indoorUnassignedCount === 0 ? (
        <p className="text-sm text-stone-500">{t('planning.noIndoorUnassigned')}</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white px-2 text-sm text-stone-700">
          {sortedIndoorUnassigned.map((pl) => (
            <IndoorUnassignedPlantingRow key={pl.id} pl={pl} locale={locale} onOpen={onOpenRow} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
