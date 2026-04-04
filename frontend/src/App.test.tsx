import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
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
        translation: { app: { title: 'MyGarden' } },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('App', () => {
  it('renders MyGarden heading', async () => {
    const i18nInstance = await initTestI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <App />
      </I18nextProvider>,
    );
    expect(screen.getByRole('heading', { name: /MyGarden/i })).toBeInTheDocument();
  });
});
