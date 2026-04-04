import { render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { AuthProvider } from '../auth/AuthContext';

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          auth: {
            loading: 'Loading…',
            loginTitle: 'Log in',
            registerTitle: 'Create account',
            email: 'Email',
            password: 'Password',
            displayName: 'Display name',
            loginSubmit: 'Log in',
            registerSubmit: 'Register',
            submitting: 'Wait',
            logout: 'Log out',
            goToRegister: 'Reg',
            goToLogin: 'Login',
            unknownError: 'Err',
            passwordHint: 'hint',
          },
          app: { title: 'MyGarden' },
          nav: {
            main: 'Nav',
            home: 'Home',
            gardenMap: 'Garden',
            plantingPlan: 'Plan',
            calendar: 'Cal',
            plantProfiles: 'Plants',
            notes: 'Notes',
          },
          lang: { nb: 'NB', en: 'EN' },
          home: { welcome: 'Welcome' },
          placeholders: { comingSoon: 'Soon' },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function TestApp({ initialEntries }: { initialEntries: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('route guards', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends unauthenticated user from / to login', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <TestApp initialEntries={['/']} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    });
  });

  it('allows authenticated user to reach app shell', async () => {
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
            email: 'a@b.c',
            displayName: 'Ada',
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
        <TestApp initialEntries={['/']} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mygarden/i })).toBeInTheDocument();
    });
  });

  it('redirects authenticated user away from /login', async () => {
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
            email: 'a@b.c',
            displayName: 'Ada',
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
        <TestApp initialEntries={['/login']} />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mygarden/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 1, name: /log in/i })).not.toBeInTheDocument();
    });
  });
});
