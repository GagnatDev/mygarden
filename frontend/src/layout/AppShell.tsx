import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useGardenContext } from '../garden/garden-context';
import { GardenPickerPopover } from './GardenPickerPopover';

export const APP_NAV = [
  { to: '/', key: 'nav.home', end: true as boolean },
  { to: '/gardens', key: 'nav.gardens', end: false },
  { to: '/plan', key: 'nav.plantingPlan', end: false },
  { to: '/calendar', key: 'nav.calendar', end: false },
  { to: '/plants', key: 'nav.plantProfiles', end: false },
  { to: '/notes', key: 'nav.notes', end: false },
  { to: '/history', key: 'nav.history', end: false },
] as const;

function navClassName({ isActive }: { isActive: boolean }): string {
  return [
    'flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-3 md:py-2 md:text-sm',
    isActive ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100',
  ].join(' ');
}

function mobileDrawerNavClassName({ isActive }: { isActive: boolean }): string {
  return [
    'flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors',
    isActive ? 'bg-emerald-100 text-emerald-900' : 'text-stone-600 hover:bg-stone-100',
  ].join(' ');
}

function MenuGlyph({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden
        className="text-stone-800"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden
      className="text-stone-800"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { gardens, selectedGarden, loading: gardensLoading } = useGardenContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const shellBrandTitle = useMemo(() => {
    if (selectedGarden) return selectedGarden.name;
    return t('app.title');
  }, [selectedGarden, t]);

  const showGardenPicker = !gardensLoading && gardens.length > 1;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onViewportChange = () => {
      if (mql.matches) setMobileNavOpen(false);
    };
    onViewportChange();
    mql.addEventListener('change', onViewportChange);
    return () => mql.removeEventListener('change', onViewportChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 md:flex-row">
      <OfflineIndicator />
      <aside className="hidden w-52 shrink-0 border-r border-stone-200 bg-white md:flex md:flex-col">
        <div className="border-b border-stone-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <p
              className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight"
              data-testid="shell-brand-title"
            >
              {shellBrandTitle}
            </p>
            {showGardenPicker ? <GardenPickerPopover /> : null}
          </div>
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-3 md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileNavOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setMobileNavOpen((o) => !o)}
            data-testid="mobile-menu-toggle"
          >
            <MenuGlyph open={mobileNavOpen} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 flex-1 truncate font-semibold" data-testid="shell-brand-title-mobile">
                {shellBrandTitle}
              </p>
              {showGardenPicker ? <GardenPickerPopover /> : null}
            </div>
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

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label={t('nav.closeMenu')}
            onClick={() => setMobileNavOpen(false)}
            data-testid="mobile-nav-backdrop"
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.main')}
            data-testid="mobile-nav-drawer"
            className="absolute inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col border-r border-stone-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <p
                className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight"
                data-testid="shell-brand-title-drawer"
              >
                {shellBrandTitle}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {showGardenPicker ? <GardenPickerPopover /> : null}
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50"
                  aria-label={t('nav.closeMenu')}
                  onClick={() => setMobileNavOpen(false)}
                  data-testid="mobile-nav-drawer-close"
                >
                  <MenuGlyph open />
                </button>
              </div>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label={t('nav.main')}>
              {APP_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={mobileDrawerNavClassName}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
