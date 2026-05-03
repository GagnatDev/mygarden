import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as areasApi from '../api/areas';
import { AreaCreateModal } from './AreaCreateModal';

vi.mock('../api/areas', async (importOriginal) => {
  const mod = await importOriginal<typeof areasApi>();
  return { ...mod, createArea: vi.fn() };
});

const translation = {
  areas: {
    createTitle: 'New area',
    title: 'Title',
    description: 'Description',
    createSubmit: 'Create area',
    titleRequired: 'Title required',
  },
  garden: {
    close: 'Close',
    mapWidthMeters: 'Width',
    mapHeightMeters: 'Height',
    cellSizeMeters: 'Cell',
    createGridSummary:
      '{{cols}}×{{rows}} cells, {{footprintW}}×{{footprintH}} m',
    mapDimensionsBounds: 'Map bounds',
    cellSizeBounds: 'Cell bounds',
    gridFromMetersTooLarge: 'Too large',
    gridFromMetersTooSmall: 'Too small',
  },
  auth: { submitting: 'Wait', unknownError: 'Err' },
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('AreaCreateModal', () => {
  const onClose = vi.fn();
  const onCreated = vi.fn(async () => {});

  beforeEach(() => {
    onClose.mockClear();
    onCreated.mockClear();
    vi.mocked(areasApi.createArea).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaCreateModal
          open={false}
          onClose={onClose}
          gardenId="g1"
          sortIndex={0}
          onCreated={onCreated}
        />
      </I18nextProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when backdrop is clicked', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaCreateModal open onClose={onClose} gardenId="g1" sortIndex={0} onCreated={onCreated} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByTestId('area-create-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits and calls onCreated then onClose', async () => {
    vi.mocked(areasApi.createArea).mockResolvedValueOnce({
      id: 'a1',
      gardenId: 'g1',
      title: 'Bed',
      description: '',
      gridWidth: 10,
      gridHeight: 12,
      cellSizeMeters: 1,
      sortIndex: 0,
      backgroundImageUrl: null,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <AreaCreateModal open onClose={onClose} gardenId="g1" sortIndex={0} onCreated={onCreated} />
      </I18nextProvider>,
    );

    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'Bed' } });
    fireEvent.click(screen.getByRole('button', { name: /create area/i }));

    await waitFor(() => {
      expect(areasApi.createArea).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          title: 'Bed',
          gridWidth: 10,
          gridHeight: 12,
          cellSizeMeters: 1,
          sortIndex: 0,
        }),
      );
    });
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
