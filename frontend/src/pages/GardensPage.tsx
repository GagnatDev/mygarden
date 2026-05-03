import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { GardenCreateForm } from '../garden/GardenCreateForm';
import { useGardenContext } from '../garden/garden-context';

export function GardensPage() {
  const { t } = useTranslation();
  const { gardens, loading, error, refreshGardens } = useGardenContext();

  if (loading) {
    return <p className="text-stone-600">{t('auth.loading')}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{t('nav.gardens')}</h1>
        <p className="mt-2 text-stone-600">{t('gardens.listHint')}</p>
      </div>

      {gardens.length === 0 ? (
        <GardenCreateForm onCreated={() => refreshGardens()} />
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {gardens.map((g) => (
            <li key={g.id}>
              <Link
                to={`/gardens/${g.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-stone-50"
              >
                <span className="font-medium text-stone-900">{g.name}</span>
                <span className="text-sm text-stone-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {gardens.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-stone-900">{t('garden.createTitle')}</h2>
          <div className="mt-4">
            <GardenCreateForm onCreated={() => refreshGardens()} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
