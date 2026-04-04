import { render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

async function initTestI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
      en: {
        translation: {
          app: { title: 'MyGarden' },
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

describe('App', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows login when there is no session', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const i18nInstance = await initTestI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <App />
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    });
  });
});
