import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/gardens';
import { AreaDetailPanel } from './AreaDetailPanel';

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
          auth: { submitting: 'Wait', unknownError: 'Err' },
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
        <AreaDetailPanel gardenId="g1" area={area} onClose={onClose} onChanged={onChanged} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: /bed 1/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('textbox', { name: /^name$/i })).toHaveValue('Bed 1');
  });

  it('submits patch when saving edits', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...area, name: 'Updated' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel gardenId="g1" area={area} onClose={onClose} onChanged={onChanged} />
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

  it('shows delete confirmation flow', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaDetailPanel gardenId="g1" area={area} onClose={onClose} onChanged={onChanged} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm delete$/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
