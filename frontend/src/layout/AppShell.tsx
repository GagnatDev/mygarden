import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const APP_NAV = [
  { to: '/', key: 'nav.home', end: true as boolean },
  { to: '/garden', key: 'nav.gardenMap', end: false },
  { to: '/plan', key: 'nav.plantingPlan', end: false },
  { to: '/calendar', key: 'nav.calendar', end: false },
  { to: '/plants', key: 'nav.plantProfiles', end: false },
  { to: '/notes', key: 'nav.notes', end: false },
] as const;

function navClassName({ isActive }: { isActive: boolean }): string {
  return [
    'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-3 md:py-2 md:text-sm',
    isActive ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100',
  ].join(' ');
}

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 md:flex-row">
      <aside className="hidden w-52 shrink-0 border-r border-stone-200 bg-white md:flex md:flex-col">
        <div className="border-b border-stone-100 p-4">
          <p className="text-lg font-semibold tracking-tight">{t('app.title')}</p>
          <p className="mt-1 truncate text-sm text-stone-500" data-testid="user-display-name">
            {user?.displayName}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label={t('nav.main')}>
          {APP_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClassName}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-stone-100 p-3">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            data-testid="logout-button"
          >
            {t('auth.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <div className="min-w-0">
            <p className="font-semibold">{t('app.title')}</p>
            <p className="truncate text-xs text-stone-500" data-testid="user-display-name-mobile">
              {user?.displayName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs font-medium text-stone-700"
              data-testid="logout-button-mobile"
            >
              {t('auth.logout')}
            </button>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex justify-around border-t border-stone-200 bg-white px-1 py-2 md:hidden"
        aria-label={t('nav.main')}
      >
        {APP_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center rounded-md px-1 py-1 text-[10px] font-medium ${
                isActive ? 'text-emerald-800' : 'text-stone-500'
              }`
            }
          >
            <span className="truncate text-center">{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
