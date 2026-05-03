import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { GardenProvider } from '../garden/GardenContext';
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
            gardens: 'Gardens',
            gardenMap: 'Garden map',
            plantingPlan: 'Plan',
            calendar: 'Calendar',
            plantProfiles: 'Plants',
            notes: 'Notes',
            history: 'History',
            currentGarden: 'Current garden',
            noGardensYet: 'No gardens yet.',
            createGardenLink: 'Create a garden',
            gardenListLoading: 'Loading gardens…',
            chooseActiveGarden: 'Choose active garden',
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

const TEST_GARDEN = {
  id: 'g1',
  name: 'Test Garden',
  createdBy: 'u1',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

function gardensOkResponse() {
  return new Response(JSON.stringify([TEST_GARDEN]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AppShell', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(u, 'http://localhost').pathname;
      if (path.endsWith('/auth/refresh')) {
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'a' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (path.endsWith('/users/me')) {
        return Promise.resolve(
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
      }
      if (path === '/api/v1/gardens') {
        return Promise.resolve(gardensOkResponse());
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
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

  /** Tailwind `md` breakpoint; supports firing `change` when toggling desktop. */
  function stubDynamicMdBreakpoint() {
    let desktop = false;
    const listeners = new Set<(e: { matches: boolean }) => void>();

    function notify() {
      const ev = { matches: desktop };
      listeners.forEach((cb) => cb(ev));
    }

    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      const q = String(query);
      if (q.includes('min-width') && q.includes('768')) {
        return {
          get matches() {
            return desktop;
          },
          media: q,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((type: string, listener: unknown) => {
            if (type === 'change' && typeof listener === 'function') {
              listeners.add(listener as (e: { matches: boolean }) => void);
            }
          }),
          removeEventListener: vi.fn((type: string, listener: unknown) => {
            if (type === 'change' && typeof listener === 'function') {
              listeners.delete(listener as (e: { matches: boolean }) => void);
            }
          }),
          dispatchEvent: vi.fn(),
        } as MediaQueryList;
      }
      return {
        matches: false,
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList;
    });

    return {
      setDesktop(next: boolean) {
        if (desktop === next) return;
        desktop = next;
        notify();
      },
    };
  }

  it('renders navigation labels and user display name', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <GardenProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<div>child</div>} />
                </Route>
              </Routes>
            </GardenProvider>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-display-name')).toHaveTextContent('Ada Lovelace');
    });

    expect(screen.getByRole('link', { name: /^Home$/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^Plan$/ })).toHaveAttribute('href', '/plan');
    await waitFor(() => {
      expect(screen.getByTestId('shell-brand-title')).toHaveTextContent('Test Garden');
    });
    expect(screen.queryByTestId('garden-picker-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('shows settings control to switch gardens when multiple gardens exist', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(u, 'http://localhost').pathname;
      if (path.endsWith('/auth/refresh')) {
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: 'a' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      if (path.endsWith('/users/me')) {
        return Promise.resolve(
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
      }
      if (path === '/api/v1/gardens') {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              TEST_GARDEN,
              { ...TEST_GARDEN, id: 'g2', name: 'Second plot' },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <GardenProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<div>child</div>} />
                </Route>
              </Routes>
            </GardenProvider>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('garden-picker-toggle').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens a slide-out menu with full navigation labels on small viewports', async () => {
    stubMobileViewport();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <GardenProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<div>child</div>} />
                </Route>
              </Routes>
            </GardenProvider>
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
    expect(drawer.querySelectorAll('a[href]').length).toBeGreaterThanOrEqual(6);

    fireEvent.click(screen.getByTestId('mobile-nav-backdrop'));
    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
    });
  });

  it('clears mobile drawer and body scroll lock when viewport crosses md breakpoint', async () => {
    const viewport = stubDynamicMdBreakpoint();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <GardenProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<div>child</div>} />
                </Route>
              </Routes>
            </GardenProvider>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-display-name-mobile')).toHaveTextContent('Ada Lovelace');
    });

    fireEvent.click(screen.getByTestId('mobile-menu-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe('hidden');

    viewport.setDesktop(true);

    await waitFor(() => {
      expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });
});
