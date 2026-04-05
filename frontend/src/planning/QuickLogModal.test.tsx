import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { QuickLogModal } from './QuickLogModal';

const en = {
  planning: {
    quickLog: 'Quick',
    logTarget: 'Target',
    targetPlanting: 'Planting',
    targetArea: 'Area',
    planting: 'Pl',
    activity: 'Act',
    datePlaceholder: 'Pick',
    openDatePicker: 'Open',
    clearDate: 'Clear',
    logDate: 'Date',
    noteOptional: 'Note',
    saveLog: 'Save',
    logNeedTarget: 'Need target',
    select: 'Select',
    activities: {
      sown_indoors: 'Si',
      sown_outdoors: 'So',
      transplanted: 'T',
      watered: 'W',
      fertilized: 'F',
      pruned: 'P',
      harvested: 'H',
      problem_noted: 'Pr',
    },
  },
  garden: { cancel: 'Cancel', areaDetails: 'Area' },
  auth: { submitting: 'Wait…', unknownError: 'Err' },
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('QuickLogModal', () => {
  it('submits create log with activity and planting', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onClose = vi.fn();
    const i18nInstance = await testI18n();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'l1',
          gardenId: 'g1',
          seasonId: 's1',
          plantingId: 'p1',
          areaId: 'a1',
          activity: 'watered',
          date: '2026-04-05T12:00:00.000Z',
          note: null,
          quantity: null,
          createdBy: 'u1',
          clientTimestamp: '2026-04-05T12:00:00.000Z',
          createdAt: '',
          updatedAt: '',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(
      <I18nextProvider i18n={i18nInstance}>
        <QuickLogModal
          open
          onClose={onClose}
          gardenId="g1"
          seasonId="s1"
          areas={[{ id: 'a1', name: 'Bed' }]}
          plantings={[{ id: 'p1', plantName: 'Tom', areaId: 'a1' }]}
        />
      </I18nextProvider>,
    );

    fireEvent.change(screen.getByTestId('quick-log-planting-select'), { target: { value: 'p1' } });
    fireEvent.change(screen.getByTestId('quick-log-activity'), { target: { value: 'watered' } });
    fireEvent.click(screen.getByTestId('quick-log-submit'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const postCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes('/logs'));
    expect(postCall).toBeDefined();
    const init = postCall![1] as RequestInit;
    const body = JSON.parse(init.body as string) as { activity: string; plantingId: string };
    expect(body.activity).toBe('watered');
    expect(body.plantingId).toBe('p1');

    vi.unstubAllGlobals();
  });
});
