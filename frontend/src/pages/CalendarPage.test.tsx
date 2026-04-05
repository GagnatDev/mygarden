import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { CalendarPage } from './CalendarPage';

const garden = {
  id: 'g1',
  name: 'Home',
  gridWidth: 10,
  gridHeight: 10,
  cellSizeMeters: 1,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
};

const ctx: GardenContextValue = {
  gardens: [garden],
  loading: false,
  error: null,
  selectedGardenId: 'g1',
  selectedGarden: garden,
  setSelectedGardenId: vi.fn(),
  refreshGardens: vi.fn(),
};

const en = {
  nav: { calendar: 'Cal' },
  auth: { loading: 'Loading…', unknownError: 'Error' },
  garden: { noGardenHint: 'No' },
  planning: {
    datePlaceholder: 'Pick',
    openDatePicker: 'Open',
    clearDate: 'Clear',
    calendarHint: 'Hint',
    manualTask: 'Manual',
    taskTitle: 'Title',
    addTask: 'Add',
    taskClickToDone: 'Done',
    taskClickToUndo: 'Undo',
  },
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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('CalendarPage', () => {
  it('marks task done on click and reverts to pending on second click', async () => {
    const ref = new Date();
    const y = ref.getUTCFullYear();
    const mo = ref.getUTCMonth();
    const taskDay = 15;
    const dueDate = new Date(Date.UTC(y, mo, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(taskDay).padStart(2, '0')}`;

    const pendingTask = {
      id: 't1',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: null,
      areaId: null,
      title: 'Sow',
      dueDate,
      source: 'manual',
      status: 'pending',
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: null,
      createdAt: '',
      updatedAt: '',
    };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    let tasksVersion: 'pending' | 'done' = 'pending';

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (url.includes('/seasons')) {
        return Promise.resolve(
          jsonResponse([
            {
              id: 's1',
              gardenId: 'g1',
              name: '2026',
              startDate: '',
              endDate: '',
              isActive: true,
              createdAt: '',
              updatedAt: '',
            },
          ]),
        );
      }
      if (method === 'PATCH' && url.includes('/tasks/t1')) {
        const raw = init?.body;
        const body =
          typeof raw === 'string'
            ? (JSON.parse(raw) as { status?: string })
            : raw
              ? (JSON.parse(String(raw)) as { status?: string })
              : {};
        if (body.status === 'done') {
          tasksVersion = 'done';
          return Promise.resolve(
            jsonResponse({
              ...pendingTask,
              status: 'done',
              completedAt: '2026-04-05T12:00:00.000Z',
              completedBy: 'u1',
              linkedLogId: 'x',
            }),
          );
        }
        if (body.status === 'pending') {
          tasksVersion = 'pending';
          return Promise.resolve(jsonResponse({ ...pendingTask }));
        }
      }
      if (url.includes('/tasks')) {
        if (tasksVersion === 'done') {
          return Promise.resolve(
            jsonResponse([
              {
                ...pendingTask,
                status: 'done',
                completedBy: 'u1',
                linkedLogId: 'x',
              },
            ]),
          );
        }
        return Promise.resolve(jsonResponse([pendingTask]));
      }
      return Promise.resolve(jsonResponse([]));
    });

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <CalendarPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('calendar-grid')).toBeInTheDocument());

    await waitFor(() => {
      expect(screen.getByTestId(`calendar-day-${dayKey}`)).toBeInTheDocument();
    });

    const taskBtn = screen.getByTestId('calendar-task-t1');
    expect(taskBtn).toHaveAttribute('data-status', 'pending');
    expect(taskBtn.getAttribute('title')).toContain('Done');

    fireEvent.click(taskBtn);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-task-t1')).toHaveAttribute('data-status', 'done');
    });

    const patchCalls = fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'PATCH');
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(JSON.parse(String((patchCalls[0]![1] as RequestInit).body))).toEqual({ status: 'done' });

    fireEvent.click(screen.getByTestId('calendar-task-t1'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-task-t1')).toHaveAttribute('data-status', 'pending');
    });

    const patchCallsAfter = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method === 'PATCH',
    );
    expect(patchCallsAfter.length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(String((patchCallsAfter[patchCallsAfter.length - 1]![1] as RequestInit).body))).toEqual({
      status: 'pending',
    });

    vi.unstubAllGlobals();
  });
});
