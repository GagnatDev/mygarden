import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { AppShell } from './AppShell';

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          app: { title: 'MyGarden' },
          nav: {
            main: 'Nav',
            openMenu: 'Open menu',
            closeMenu: 'Close menu',
            home: 'Home',
            gardenMap: 'Garden map',
            plantingPlan: 'Plan',
            calendar: 'Calendar',
            plantProfiles: 'Plants',
            notes: 'Notes',
            history: 'History',
          },
          auth: { logout: 'Log out', loading: '…' },
          lang: { nb: 'NB', en: 'EN' },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('AppShell', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubMobileViewport() {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const q = String(query);
      const isMdUp = q.includes('min-width') && q.includes('768');
      return {
        matches: !isMdUp,
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
  }

  it('renders navigation labels and user display name', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'a' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            email: 'ada@example.com',
            displayName: 'Ada Lovelace',
            language: 'en',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<div>child</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-display-name')).toHaveTextContent('Ada Lovelace');
    });

    expect(screen.getAllByRole('link', { name: /garden map/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^plan$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('opens a slide-out menu with full navigation labels on small viewports', async () => {
    stubMobileViewport();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'a' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u1',
            email: 'ada@example.com',
            displayName: 'Ada Lovelace',
            language: 'en',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<div>child</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-display-name-mobile')).toHaveTextContent('Ada Lovelace');
    });

    expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
    });

    const drawer = screen.getByTestId('mobile-nav-drawer');
    expect(drawer.querySelectorAll('a[href]').length).toBeGreaterThanOrEqual(7);

    fireEvent.click(screen.getByTestId('mobile-nav-backdrop'));
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
    });
  });
});
