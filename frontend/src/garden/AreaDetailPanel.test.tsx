import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/gardens';
import { AreaDetailPanel } from './AreaDetailPanel';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const area: Area = {
  id: 'a1',
  gardenId: 'g1',
  name: 'Bed 1',
  type: 'raised_bed',
  color: '#8B4513',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 2,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const gardenKeys = {
  areaDetails: 'Details',
  close: 'Close',
  editArea: 'Edit',
  areaName: 'Name',
  areaType: 'Type',
  areaColor: 'Color',
  saveChanges: 'Save',
  cancel: 'Cancel',
  deleteArea: 'Delete',
  confirmDelete: 'Confirm delete',
  cells: 'cells',
  plantingsThisSeason: 'Plantings',
  areaTypes: {
    raised_bed: 'Raised',
    open_bed: 'Open',
    tree_zone: 'Tree',
    path: 'Path',
    lawn: 'Lawn',
    other: 'Other',
  },
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          garden: gardenKeys,
          auth: { submitting: 'Wait', unknownError: 'Err', loading: 'Loading' },
          notes: {
            title: 'Notes',
            placeholder: 'Write…',
            add: 'Add',
            edit: 'Edit',
            delete: 'Delete note',
            save: 'Save',
            confirmDelete: 'Delete?',
          },
          planning: {
            sowing: { indoor: 'Indoor', direct_outdoor: 'Outdoor' },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('AreaDetailPanel', () => {
  const fetchMock = vi.fn();
  const onClose = vi.fn();
  const onChanged = vi.fn(async () => {});

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/notes')) {
        return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    onClose.mockClear();
    onChanged.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows area info and opens edit form', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel gardenId="g1" seasonId="s1" area={area} onClose={onClose} onChanged={onChanged} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: /bed 1/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox', { name: /^name$/i })).toHaveValue('Bed 1');
  });

  it('submits patch when saving edits', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/notes')) {
        return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url.includes('/areas/a1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...area, name: 'Updated' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel gardenId="g1" seasonId="s1" area={area} onClose={onClose} onChanged={onChanged} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /^name$/i }), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalled();
    });

    const patchCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes('/areas/a1'));
    expect(patchCall).toBeTruthy();
    const init = patchCall![1] as RequestInit;
    expect(init.method).toBe('PATCH');
  });

  it('lists plantings for this area when provided', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel
          gardenId="g1"
          seasonId="s1"
          area={area}
          plantings={[{ id: 'p1', plantName: 'Tomato', sowingMethod: 'indoor' }]}
          onClose={onClose}
          onChanged={onChanged}
        />
      </I18nextProvider>,
    );

    expect(screen.getByTestId('area-plantings-section')).toBeInTheDocument();
    expect(screen.getByTestId('area-planting-p1')).toHaveTextContent('Tomato');
    expect(screen.getByTestId('area-planting-p1')).toHaveTextContent('Indoor');
  });

  it('shows delete confirmation flow', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/notes')) {
        return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url.includes('/areas/a1')) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel gardenId="g1" seasonId="s1" area={area} onClose={onClose} onChanged={onChanged} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm delete$/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
