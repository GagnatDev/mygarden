import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeDashboard } from './HomeDashboard';

vi.mock('../garden/useActiveSeason', () => ({
  useActiveSeason: () => ({
    seasonId: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const mockRefreshGardens = vi.fn();

vi.mock('../garden/garden-context', () => ({
  useGardenContext: () => ({
    selectedGarden: null,
    selectedGardenId: null,
    setSelectedGardenId: vi.fn(),
    loading: false,
    error: null,
    gardens: [
      {
        id: 'g1',
        name: 'Plot A',
        createdBy: 'u1',
        createdAt: '',
        updatedAt: '',
      },
    ],
    refreshGardens: mockRefreshGardens,
  }),
}));

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
            gardens: 'Gardens',
            createGardenLink: 'Create a garden',
            home: 'Home',
          },
          home: { welcome: 'Welcome.' },
          gardens: {
            listHint: 'Hint.',
            emptyHome: 'Empty.',
            openGarden: 'Open →',
          },
          planning: { quickLog: 'Quick log' },
          auth: { loading: '…' },
          garden: { createTitle: 'Create', name: 'Name', createSubmit: 'Go', nameRequired: 'Need name' },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('HomeDashboard', () => {
  beforeEach(() => {
    mockRefreshGardens.mockReset();
  });

  it('lists gardens as links to the garden areas route', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter>
          <HomeDashboard />
        </MemoryRouter>
      </I18nextProvider>,
    );

    const link = screen.getByRole('link', { name: /plot a/i });
    expect(link).toHaveAttribute('href', '/gardens/g1');
  });

  it('opens create-garden modal with backdrop', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <MemoryRouter>
          <HomeDashboard />
        </MemoryRouter>
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByTestId('home-create-garden'));
    expect(screen.getByTestId('garden-create-modal')).toBeInTheDocument();
    expect(screen.getByTestId('garden-create-modal-backdrop')).toBeInTheDocument();
  });
});
