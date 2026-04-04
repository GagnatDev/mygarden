import { useTranslation } from 'react-i18next';

export function HomeDashboard() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{t('app.title')}</h1>
      <p className="mt-2 text-stone-600">{t('home.welcome')}</p>
    </div>
  );
}
