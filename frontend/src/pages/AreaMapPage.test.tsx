import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/areas';
import type { Element } from '../api/elements';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { AreaMapPage } from './AreaMapPage';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ gardenId: 'g1', areaId: 'ar1' }) };
});

const area: Area = {
  id: 'ar1',
  gardenId: 'g1',
  title: 'Area one',
  description: '',
  gridWidth: 6,
  gridHeight: 6,
  cellSizeMeters: 1,
  sortIndex: 0,
  backgroundImageUrl: null,
  createdAt: '',
  updatedAt: '',
};

const element: Element = {
  id: 'e1',
  gardenId: 'g1',
  areaId: 'ar1',
  name: 'Bed A',
  type: 'raised_bed',
  color: '#84cc16',
  gridX: 1,
  gridY: 1,
  gridWidth: 2,
  gridHeight: 2,
  shape: null,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
} as unknown as Element;

vi.mock('../api/areas', () => ({
  getArea: vi.fn(() => Promise.resolve(area)),
  patchArea: vi.fn(() => Promise.resolve(area)),
}));
vi.mock('../api/elements', () => ({
  listElements: vi.fn(() => Promise.resolve([element])),
  patchElement: vi.fn(() => Promise.resolve(element)),
}));
vi.mock('../api/gardens', () => ({ listSeasons: vi.fn(() => Promise.resolve([])) }));
vi.mock('../api/logs', () => ({ listLogs: vi.fn(() => Promise.resolve([])) }));
vi.mock('../api/plantings', () => ({ listPlantings: vi.fn(() => Promise.resolve([])) }));
vi.mock('../api/sitePlants', () => ({ listSitePlants: vi.fn(() => Promise.resolve([])) }));
vi.mock('../api/seasons', () => ({ getSeasonSnapshot: vi.fn(() => Promise.resolve(null)) }));
vi.mock('../garden/useActiveSeason', () => ({
  useActiveSeason: () => ({ seasonId: 's1', loading: false, error: null, refresh: vi.fn() }),
}));

// Mock the editor so the test drives selection directly and stays free of gesture/DOM plumbing.
vi.mock('../garden/GridMapEditor', () => ({
  GridMapEditor: (props: {
    onSelectElement: (id: string | null) => void;
    onResizeArea?: (gridWidth: number, gridHeight: number) => void;
  }) => (
    <>
      <button type="button" data-testid="mock-select" onClick={() => props.onSelectElement('e1')}>
        select
      </button>
      <button
        type="button"
        data-testid="mock-resize-area"
        onClick={() => props.onResizeArea?.(8, 9)}
      >
        resize area
      </button>
    </>
  ),
}));

// Mock the detail panel so we can assert its visibility class (collapsed vs expanded).
vi.mock('../garden/ElementDetailPanel', () => ({
  ElementDetailPanel: (props: { className?: string; onClose: () => void }) => (
    <div data-testid="area-detail-panel" className={props.className}>
      <button type="button" data-testid="panel-close" onClick={props.onClose}>
        close
      </button>
    </div>
  ),
}));

const garden = { id: 'g1', name: 'Home', createdBy: 'u1', createdAt: '', updatedAt: '' };

const ctx: GardenContextValue = {
  gardens: [garden],
  loading: false,
  error: null,
  selectedGardenId: 'g1',
  selectedGarden: garden,
  setSelectedGardenId: vi.fn(),
  refreshGardens: vi.fn(),
};

async function renderPage() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    resources: {
      en: {
        translation: {
          nav: { home: 'Home' },
          auth: { loading: 'Loading', unknownError: 'Err' },
          garden: {
            mapHint: 'hint',
            elementSelected: '{{name}} selected',
            openDetails: 'Details',
            close: 'Close',
            moveAreaFailed: 'fail',
            noGardenHint: 'no',
          },
          planning: { quickLog: 'Quick log' },
        },
      },
    },
  });

  render(
    <I18nextProvider i18n={instance}>
      <MemoryRouter>
        <GardenContext.Provider value={ctx}>
          <AreaMapPage />
        </GardenContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );

  await waitFor(() => expect(screen.getByTestId('mock-select')).toBeInTheDocument());
}

describe('AreaMapPage mobile selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selecting an element shows the peek bar and keeps the detail sheet hidden on mobile', async () => {
    await renderPage();

    fireEvent.click(screen.getByTestId('mock-select'));

    await waitFor(() => expect(screen.getByTestId('element-peek-bar')).toBeInTheDocument());
    expect(screen.getByTestId('element-peek-bar')).toHaveTextContent('Bed A selected');
    // The sheet is rendered for desktop but hidden on mobile while collapsed,
    // so the on-map handles stay visible and grabbable on touch.
    expect(screen.getByTestId('area-detail-panel')).toHaveClass('hidden');
  });

  it('tapping Details expands the full sheet and drops the peek bar', async () => {
    await renderPage();

    fireEvent.click(screen.getByTestId('mock-select'));
    await waitFor(() => expect(screen.getByTestId('element-peek-details')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('element-peek-details'));

    await waitFor(() =>
      expect(screen.queryByTestId('element-peek-bar')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('area-detail-panel')).not.toHaveClass('hidden');
  });

  it('resizing the area persists the new dimensions via patchArea', async () => {
    const { patchArea } = await import('../api/areas');
    await renderPage();

    fireEvent.click(screen.getByTestId('mock-resize-area'));

    await waitFor(() =>
      expect(patchArea).toHaveBeenCalledWith('g1', 'ar1', { gridWidth: 8, gridHeight: 9 }),
    );
  });

  it('closing from the peek bar deselects the element', async () => {
    await renderPage();

    fireEvent.click(screen.getByTestId('mock-select'));
    await waitFor(() => expect(screen.getByTestId('element-peek-close')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('element-peek-close'));

    await waitFor(() =>
      expect(screen.queryByTestId('area-detail-panel')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('element-peek-bar')).not.toBeInTheDocument();
  });
});
