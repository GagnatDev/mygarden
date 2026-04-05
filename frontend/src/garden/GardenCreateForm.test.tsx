import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GardenCreateForm } from './GardenCreateForm';

const gardenKeys = {
  createTitle: 'Create garden',
  name: 'Name',
  nameRequired: 'Name required',
  gridWidth: 'W',
  gridHeight: 'H',
  gridBounds: 'Grid bounds',
  cellSizeMeters: 'Cell',
  cellSizeBounds: 'Cell bounds',
  createSubmit: 'Submit',
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: { garden: gardenKeys, auth: { submitting: 'Wait', unknownError: 'Err' } } } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('GardenCreateForm', () => {
  const fetchMock = vi.fn();
  const onCreated = vi.fn(async () => {});

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    onCreated.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows validation when name is empty', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenCreateForm onCreated={onCreated} />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText('Name required')).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits valid grid dimensions to API', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'g1',
          name: 'Home',
          gridWidth: 10,
          gridHeight: 12,
          cellSizeMeters: 1,
          createdBy: 'u1',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenCreateForm onCreated={onCreated} />
      </I18nextProvider>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Home' } });
    fireEvent.change(screen.getByLabelText(/^w$/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/^h$/i), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });

    const call = fetchMock.mock.calls.find((c) => (c[0] as string).includes('/gardens'));
    expect(call).toBeTruthy();
    const init = call![1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.name).toBe('Home');
    expect(body.gridWidth).toBe(10);
    expect(body.gridHeight).toBe(12);
    expect(body.cellSizeMeters).toBe(1);
  });
});
