import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { CALENDAR_PREVIEW_TASK_CAP, CalendarPage } from './CalendarPage';

const garden = {
  id: 'g1',
  name: 'Home',
  gridWidth: 10,
  gridHeight: 10,
  cellSizeMeters: 1,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
  backgroundImageUrl: null as string | null,
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

const enPlanning = {
  datePlaceholder: 'Pick',
  openDatePicker: 'Open',
  clearDate: 'Clear',
  calendarHint: 'Hint',
  manualTask: 'Manual',
  taskTitle: 'Title',
  addTask: 'Add',
  taskClickToDone: 'Done',
  taskClickToUndo: 'Undo',
  tasksMoreCount: '+{{count}} more',
  tasksNoLocation: 'No map',
  tasksUnknownLocation: 'Unknown',
  dayTasksTitle: 'Tasks — {{date}}',
  dayTasksCloseAria: 'Close',
  dayTasksLoadingLocations: 'Loading…',
  dayTasksEmpty: 'Empty day',
  dayTasksPlant: 'Plant',
  dayTasksArea: 'Area',
  dayTasksStatus: 'Status',
  dayTasksDue: 'Due',
  markDone: 'Mark done',
  markNotDone: 'Undo',
  rescheduleDue: 'Reschedule',
  saveDueDate: 'Save date',
  taskStatus: { done: 'Done', pending: 'Pending', overdue: 'Overdue' },
  calendarDayOpenTasksAria: 'Open tasks for {{date}}',
  manualTaskArea: 'Area',
  manualTaskAreaNone: 'None',
  manualTaskElementOptional: 'Element',
  manualTaskElementWholeArea: 'Whole',
  taskAreaWhole: 'Whole area',
  autoTaskTitle: {
    sow_indoor: 'Sow {{plant}} indoors',
    sow_outdoor: 'Sow {{plant}} outdoors',
    transplant: 'Transplant {{plant}}',
    harvest_start: 'Start harvesting {{plant}}',
  },
};

const en = {
  nav: { calendar: 'Cal' },
  auth: { loading: 'Loading…', unknownError: 'Error' },
  garden: { noGardenHint: 'No', close: 'Close', cancel: 'Cancel' },
  planning: enPlanning,
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

const defaultArea = {
  id: 'a1',
  gardenId: 'g1',
  title: 'Bed area',
  description: '',
  gridWidth: 4,
  gridHeight: 4,
  cellSizeMeters: 1,
  sortIndex: 0,
  backgroundImageUrl: null as string | null,
  createdAt: '',
  updatedAt: '',
};

function seasonsResponse() {
  return jsonResponse([
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
  ]);
}

function renderWithRouter(i18nInstance: typeof i18n, initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      {
        path: '/calendar',
        element: (
          <I18nextProvider i18n={i18nInstance}>
            <GardenContext.Provider value={ctx}>
              <CalendarPage />
            </GardenContext.Provider>
          </I18nextProvider>
        ),
      },
    ],
    { initialEntries },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('CalendarPage', () => {
  it('marks task done from day panel and refetches tasks', async () => {
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
      elementId: null,
      plantName: null,
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
        return Promise.resolve(seasonsResponse());
      }
      if (method === 'GET' && url.includes('/areas') && !url.includes('/elements')) {
        return Promise.resolve(jsonResponse([defaultArea]));
      }
      if (method === 'GET' && url.includes('/elements')) {
        return Promise.resolve(jsonResponse([]));
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

    renderWithRouter(i18nInstance, ['/calendar']);

    await waitFor(() => expect(screen.getByTestId('calendar-grid')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId(`calendar-day-${dayKey}`)).toBeInTheDocument());

    fireEvent.click(screen.getByTestId(`calendar-day-open-${dayKey}`));

    await waitFor(() => expect(screen.getByTestId('calendar-day-panel')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByTestId('calendar-day-panel-loading')).not.toBeInTheDocument());

    const areaCalls = fetchMock.mock.calls.filter((c) => {
      const url = typeof c[0] === 'string' ? c[0] : c[0] instanceof Request ? c[0].url : String(c[0]);
      return (c[1] as RequestInit | undefined)?.method !== 'POST' && url.includes('/areas') && !url.includes('/elements');
    });
    expect(areaCalls.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByTestId('day-panel-toggle-done-t1'));

    await waitFor(() => {
      expect(screen.getByTestId('day-panel-task-t1')).toBeInTheDocument();
    });

    const patchCalls = fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'PATCH');
    expect(patchCalls.some((c) => JSON.parse(String((c[1] as RequestInit).body))?.status === 'done')).toBe(true);

    await waitFor(() => expect(screen.queryByTestId('calendar-day-panel-loading')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('day-panel-toggle-done-t1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('day-panel-toggle-done-t1'));

    await waitFor(() => {
      const patchAfter = fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'PATCH');
      expect(patchAfter.some((c) => JSON.parse(String((c[1] as RequestInit).body))?.status === 'pending')).toBe(true);
    });

    vi.unstubAllGlobals();
  });

  it('shows at most preview cap and a +more line for extra tasks', async () => {
    const ref = new Date();
    const y = ref.getUTCFullYear();
    const mo = ref.getUTCMonth();
    const taskDay = 8;
    const dueDate = new Date(Date.UTC(y, mo, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(taskDay).padStart(2, '0')}`;

    const mk = (id: string, title: string) => ({
      id,
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: null,
      areaId: null,
      elementId: null,
      plantName: null,
      title,
      dueDate,
      source: 'manual' as const,
      status: 'pending' as const,
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: null,
      createdAt: '',
      updatedAt: '',
    });
    const four = [mk('a', 'A'), mk('b', 'B'), mk('c', 'C'), mk('d', 'D')];

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/seasons')) return Promise.resolve(seasonsResponse());
      if (url.includes('/tasks')) return Promise.resolve(jsonResponse(four));
      return Promise.resolve(jsonResponse([]));
    });

    renderWithRouter(i18nInstance, ['/calendar']);

    const cell = await waitFor(() => {
      const el = screen.getByTestId(`calendar-day-${dayKey}`);
      expect(el.querySelector('[data-testid="calendar-task-preview-a"]')).toBeTruthy();
      return el;
    });

    const previews = CALENDAR_PREVIEW_TASK_CAP;
    for (let i = 0; i < previews; i++) {
      expect(cell.querySelector(`[data-testid="calendar-task-preview-${four[i]!.id}"]`)).toBeTruthy();
    }
    expect(cell.querySelector('[data-testid="calendar-task-preview-d"]')).toBeNull();
    expect(cell.textContent).toContain('+1 more');

    vi.unstubAllGlobals();
  });

  it('opens day panel when day query param is present', async () => {
    const y = 2026;
    const taskDay = 10;
    const dueDate = new Date(Date.UTC(y, 4, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-05-${String(taskDay).padStart(2, '0')}`;

    const task = {
      id: 't-deep',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: null,
      areaId: null,
      elementId: null,
      plantName: null,
      title: 'Deep',
      dueDate,
      source: 'manual' as const,
      status: 'pending' as const,
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

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/seasons')) return Promise.resolve(seasonsResponse());
      if (url.includes('/tasks')) return Promise.resolve(jsonResponse([task]));
      if (url.includes('/areas') && !url.includes('/elements')) return Promise.resolve(jsonResponse([defaultArea]));
      if (url.includes('/elements')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse([]));
    });

    renderWithRouter(i18nInstance, [`/calendar?day=${dayKey}`]);

    await waitFor(() => expect(screen.getByTestId('calendar-day-panel')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('day-panel-task-t-deep')).toBeInTheDocument());

    vi.unstubAllGlobals();
  });

  it('uses history push when opening a day and back closes the panel', async () => {
    const ref = new Date();
    const y = ref.getUTCFullYear();
    const mo = ref.getUTCMonth();
    const taskDay = 12;
    const dueDate = new Date(Date.UTC(y, mo, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(taskDay).padStart(2, '0')}`;

    const task = {
      id: 't-nav',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: null,
      areaId: null,
      elementId: null,
      plantName: null,
      title: 'Nav',
      dueDate,
      source: 'manual' as const,
      status: 'pending' as const,
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

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/seasons')) return Promise.resolve(seasonsResponse());
      if (url.includes('/tasks')) return Promise.resolve(jsonResponse([task]));
      if (url.includes('/areas') && !url.includes('/elements')) return Promise.resolve(jsonResponse([defaultArea]));
      if (url.includes('/elements')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse([]));
    });

    const router = renderWithRouter(i18nInstance, ['/calendar']);

    await waitFor(() => expect(screen.getByTestId('calendar-grid')).toBeInTheDocument());

    expect(router.state.location.search).toBe('');

    fireEvent.click(screen.getByTestId(`calendar-day-open-${dayKey}`));

    await waitFor(() => expect(screen.getByTestId('calendar-day-panel')).toBeInTheDocument());
    expect(router.state.location.search).toContain(`day=${dayKey}`);

    router.navigate(-1);

    await waitFor(() => expect(screen.queryByTestId('calendar-day-panel')).not.toBeInTheDocument());
    expect(router.state.location.search).not.toContain('day=');

    vi.unstubAllGlobals();
  });

  it('closes panel via Close without leaving day in the URL', async () => {
    const ref = new Date();
    const y = ref.getUTCFullYear();
    const mo = ref.getUTCMonth();
    const taskDay = 14;
    const dueDate = new Date(Date.UTC(y, mo, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(taskDay).padStart(2, '0')}`;

    const task = {
      id: 't-close',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: null,
      areaId: null,
      elementId: null,
      plantName: null,
      title: 'Close me',
      dueDate,
      source: 'manual' as const,
      status: 'pending' as const,
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

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/seasons')) return Promise.resolve(seasonsResponse());
      if (url.includes('/tasks')) return Promise.resolve(jsonResponse([task]));
      if (url.includes('/areas') && !url.includes('/elements')) return Promise.resolve(jsonResponse([defaultArea]));
      if (url.includes('/elements')) return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse([]));
    });

    const router = renderWithRouter(i18nInstance, ['/calendar']);

    await waitFor(() => expect(screen.getByTestId('calendar-grid')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`calendar-day-open-${dayKey}`));
    await waitFor(() => expect(screen.getByTestId('calendar-day-panel')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByTestId('calendar-day-panel')).not.toBeInTheDocument());
    expect(router.state.location.search).not.toContain('day=');

    vi.unstubAllGlobals();
  });

  it('shows Norwegian auto-task title in grid preview when plantName and autoKind are set', async () => {
    const ref = new Date();
    const y = ref.getUTCFullYear();
    const mo = ref.getUTCMonth();
    const taskDay = 15;
    const dueDate = new Date(Date.UTC(y, mo, taskDay, 12, 0, 0)).toISOString();
    const dayKey = `${y}-${String(mo + 1).padStart(2, '0')}-${String(taskDay).padStart(2, '0')}`;

    const autoTask = {
      id: 't-nb',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: 'p1',
      areaId: null,
      elementId: null,
      plantName: 'Tomato',
      title: 'Sow Tomato indoors',
      dueDate,
      source: 'auto' as const,
      status: 'pending' as const,
      completedAt: null,
      completedBy: null,
      linkedLogId: null,
      autoKind: 'sow_indoor',
      createdAt: '',
      updatedAt: '',
    };

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const nb = {
      nav: { calendar: 'Kalender' },
      auth: { loading: 'Laster…', unknownError: 'Feil' },
      garden: { noGardenHint: 'Ingen', close: 'Lukk', cancel: 'Avbryt' },
      planning: {
        ...enPlanning,
        autoTaskTitle: {
          sow_indoor: 'Så {{plant}} innendørs',
          sow_outdoor: 'Så {{plant}} utendørs',
          transplant: 'Omplant {{plant}}',
          harvest_start: 'Begynn å høste {{plant}}',
        },
      },
    };

    const nbInstance = i18n.createInstance();
    await nbInstance.use(initReactI18next).init({
      lng: 'nb',
      resources: { nb: { translation: nb } },
      interpolation: { escapeValue: false },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/seasons')) return Promise.resolve(seasonsResponse());
      if (url.includes('/tasks')) return Promise.resolve(jsonResponse([autoTask]));
      return Promise.resolve(jsonResponse([]));
    });

    const router = createMemoryRouter(
      [
        {
          path: '/calendar',
          element: (
            <I18nextProvider i18n={nbInstance}>
              <GardenContext.Provider value={ctx}>
                <CalendarPage />
              </GardenContext.Provider>
            </I18nextProvider>
          ),
        },
      ],
      { initialEntries: ['/calendar'] },
    );
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByTestId('calendar-grid')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId(`calendar-day-${dayKey}`)).toBeInTheDocument());

    const preview = screen.getByTestId('calendar-task-preview-t-nb');
    expect(preview.textContent).toBe('Så Tomato innendørs');
    expect(preview.textContent).not.toBe(autoTask.title);

    vi.unstubAllGlobals();
  });

  it('sends elementId in manual task POST when area and element are selected', async () => {
    const el = {
      id: 'e1',
      areaId: 'a1',
      name: 'Raised',
      type: 'raised_bed' as const,
      color: '#336633',
      gridX: 0,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 2,
      createdAt: '',
      updatedAt: '',
    };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const path = url.split('?')[0] ?? url;
      if (url.includes('/seasons')) {
        return Promise.resolve(seasonsResponse());
      }
      if (method === 'GET' && url.includes('/areas') && !url.includes('/elements')) {
        return Promise.resolve(jsonResponse([defaultArea]));
      }
      if (method === 'GET' && url.includes('/elements')) {
        return Promise.resolve(jsonResponse([el]));
      }
      if (method === 'POST' && path.endsWith('/tasks')) {
        return Promise.resolve(
          jsonResponse(
            {
              id: 'new-t',
              gardenId: 'g1',
              seasonId: 's1',
              plantingId: null,
              areaId: 'a1',
              elementId: 'e1',
              plantName: null,
              title: 'Paint',
              dueDate: new Date().toISOString(),
              source: 'manual' as const,
              status: 'pending' as const,
              completedAt: null,
              completedBy: null,
              linkedLogId: null,
              autoKind: null,
              createdAt: '',
              updatedAt: '',
            },
            201,
          ),
        );
      }
      if (url.includes('/tasks')) {
        return Promise.resolve(jsonResponse([]));
      }
      return Promise.resolve(jsonResponse([]));
    });

    renderWithRouter(i18nInstance, ['/calendar']);

    await waitFor(() => expect(screen.getByTestId('manual-task-area')).not.toBeDisabled());
    fireEvent.change(screen.getByTestId('manual-task-area'), { target: { value: 'a1' } });
    await waitFor(() => expect(screen.getByTestId('manual-task-element')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('manual-task-element'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByTestId('manual-task-title'), { target: { value: 'Paint fence' } });
    fireEvent.click(screen.getByTestId('manual-task-submit'));

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'POST');
      const taskPosts = postCalls.filter((c) => {
        const u = typeof c[0] === 'string' ? c[0] : c[0] instanceof Request ? c[0].url : String(c[0]);
        return (u.split('?')[0] ?? u).endsWith('/tasks');
      });
      expect(taskPosts.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(String((taskPosts[taskPosts.length - 1]![1] as RequestInit).body)) as {
        elementId?: string;
        areaId?: string;
      };
      expect(body.elementId).toBe('e1');
      expect(body.areaId).toBeUndefined();
    });

    vi.unstubAllGlobals();
  });
});
