import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { RegisterPage } from './RegisterPage';

const en = {
  auth: {
    registerTitle: 'Create account',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    registerSubmit: 'Register',
    submitting: 'Please wait…',
    goToLogin: 'Log in',
    unknownError: 'Error',
    passwordHint: '8 chars',
    loading: 'Loading…',
    logout: 'Log out',
  },
  app: { title: 'MyGarden' },
  lang: { nb: 'NB', en: 'EN' },
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('RegisterPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows Problem Details message when email is not approved', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'https://mygarden.app/problems/email-not-approved',
          title: 'Forbidden',
          status: 403,
          detail: 'This email is not approved for registration',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    );

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password12' } });
    fireEvent.click(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('register-error')).toHaveTextContent(
        'This email is not approved for registration',
      );
    });
  });

  it('redirects to home on successful registration', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<h1>Registered</h1>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'tok',
          user: {
            id: 'u1',
            email: 'bob@example.com',
            displayName: 'Bob',
            language: 'nb',
            createdAt: '2020-01-01T00:00:00.000Z',
            updatedAt: '2020-01-01T00:00:00.000Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password12' } });
    fireEvent.click(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /registered/i })).toBeInTheDocument();
    });
  });
});
