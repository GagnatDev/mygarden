import { useTranslation } from 'react-i18next';

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t(titleKey)}</h1>
      <p className="mt-2 text-stone-600">{t('placeholders.comingSoon')}</p>
    </div>
  );
}
