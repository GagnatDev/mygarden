import { useTranslation } from 'react-i18next';
import { NotesSection } from '../components/NotesSection';
import { useGardenContext } from '../garden/garden-context';
import { useActiveSeason } from '../garden/useActiveSeason';

export function SeasonNotesPage() {
  const { t } = useTranslation();
  const { selectedGarden, loading: gardenLoading, error: gardenError } = useGardenContext();
  const { seasonId, loading: seasonLoading, error: seasonError } = useActiveSeason(
    selectedGarden?.id ?? null,
  );

  if (gardenLoading || seasonLoading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }
  if (gardenError || seasonError) {
    return <p className="text-red-600">{gardenError ?? seasonError}</p>;
  }
  if (!selectedGarden) {
    return <p className="text-stone-600">{t('garden.noGardenHint')}</p>;
  }
  if (!seasonId) {
    return <p className="text-stone-600">{t('planning.noSeason')}</p>;
  }

  return (
    <div data-testid="season-notes-page">
      <h1 className="text-2xl font-semibold text-stone-900">{t('nav.notes')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('notes.seasonPageHint')}</p>
      <NotesSection
        className="mt-6 border-t-0 pt-0"
        gardenId={selectedGarden.id}
        seasonId={seasonId}
        targetType="season"
        targetId={seasonId}
      />
    </div>
  );
}
