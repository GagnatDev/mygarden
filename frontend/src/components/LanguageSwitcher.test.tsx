import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '../api/types';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

const userNb: PublicUser = {
  id: 'u1',
  email: 'a@b.c',
  displayName: 'Ada',
  language: 'nb',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'nb',
    fallbackLng: 'nb',
    resources: {
      nb: { translation: { lang: { nb: 'NB', en: 'EN' } } },
      en: { translation: { lang: { nb: 'NB', en: 'EN' } } },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('LanguageSwitcher', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls setLanguage when logged in and toggles to en', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'a' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(userNb), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...userNb, language: 'en' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter>
          <AuthProvider>
            <LanguageSwitcher />
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lang-en'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const patchCall = fetchMock.mock.calls.find((c) => {
      const init = c[1] as RequestInit | undefined;
      return init?.method === 'PATCH';
    });
    expect(patchCall).toBeDefined();
    const body = JSON.parse((patchCall![1] as RequestInit).body as string);
    expect(body).toEqual({ language: 'en' });
  });
});
