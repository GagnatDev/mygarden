import { render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when online', async () => {
    const instance = i18n.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { translation: { offline: { banner: 'Offline' } } } },
    });
    render(
      <I18nextProvider i18n={instance}>
        <OfflineIndicator />
      </I18nextProvider>,
    );
    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
  });

  it('shows banner when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const instance = i18n.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { translation: { offline: { banner: 'You are offline' } } } },
    });
    render(
      <I18nextProvider i18n={instance}>
        <OfflineIndicator />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('offline-indicator')).toHaveTextContent('You are offline');
  });
});
