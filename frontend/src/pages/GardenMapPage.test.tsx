import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/gardens';
import { listAreas, listSeasons } from '../api/gardens';
import { listLogs } from '../api/logs';
import { listPlantings } from '../api/plantings';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { GardenMapPage } from './GardenMapPage';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../garden/GridMapEditor', () => ({
  GridMapEditor: ({
    selectedAreaId,
    onSelectArea,
    onToolChange,
    tool,
  }: {
    selectedAreaId: string | null;
    onSelectArea: (id: string | null) => void;
    onToolChange: (t: 'select' | 'pan' | 'move' | 'draw-polygon') => void;
    tool: string;
  }) => (
    <div>
      <span data-testid="mock-tool">{tool}</span>
      <span data-testid="mock-selected">{selectedAreaId ?? 'none'}</span>
      <button type="button" data-testid="mock-pick-area" onClick={() => onSelectArea('a1')}>
        Pick area
      </button>
      <button type="button" data-testid="mock-tool-pan" onClick={() => onToolChange('pan')}>
        Pan tool
      </button>
      <button type="button" data-testid="mock-tool-polygon" onClick={() => onToolChange('draw-polygon')}>
        Polygon tool
      </button>
      <button type="button" data-testid="mock-tool-move" onClick={() => onToolChange('move')}>
        Move tool
      </button>
      <button type="button" data-testid="mock-tool-select" onClick={() => onToolChange('select')}>
        Select tool
      </button>
    </div>
  ),
}));

vi.mock('../garden/useActiveSeason', () => ({
  useActiveSeason: () => ({
    seasonId: 's1',
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../api/gardens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/gardens')>();
  return {
    ...actual,
    listAreas: vi.fn(),
    listSeasons: vi.fn(),
    deleteGarden: vi.fn(),
    patchArea: vi.fn(),
  };
});

vi.mock('../api/plantings', () => ({
  listPlantings: vi.fn(),
}));

vi.mock('../api/logs', () => ({
  listLogs: vi.fn(),
}));

vi.mock('../api/seasons', () => ({
  getSeasonSnapshot: vi.fn(),
}));

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

const ctx: GardenContextValue = {
  gardens: [garden],
  loading: false,
  error: null,
  selectedGardenId: 'g1',
  selectedGarden: garden,
  setSelectedGardenId: vi.fn(),
  refreshGardens: vi.fn(),
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          nav: { gardenMap: 'Map' },
          auth: { loading: 'Loading…', submitting: 'Wait…', unknownError: 'Error' },
          planning: {
            quickLog: 'Log',
            sowing: { indoor: 'In', direct_outdoor: 'Out' },
          },
          garden: {
            mapHint: 'Hint',
            noGardenHint: 'No garden',
            selectGarden: 'Garden',
            deleteGarden: 'Del',
            deleteGardenWarning: 'Warn',
            cancel: 'Cancel',
            deleteGardenConfirmButton: 'OK',
            historicalSeason: 'Season',
            moveAreaFailed: 'Move failed',
            areaDetails: 'Details',
            close: 'Close',
            editArea: 'Edit',
            areaName: 'Name',
            areaType: 'Type',
            areaColor: 'Color',
            saveChanges: 'Save',
            deleteArea: 'Delete',
            confirmDelete: 'Confirm',
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
            status: {
              notStarted: 'NS',
              sown: 'S',
              planted: 'P',
              harvested: 'H',
            },
            planActual: {
              complete: 'C',
              partial: 'P',
              notStarted: 'NS',
              unplanned: 'U',
            },
          },
          notes: {
            title: 'Notes',
            placeholder: 'Write',
            add: 'Add',
            edit: 'Edit',
            delete: 'Delete',
            save: 'Save',
            confirmDelete: 'OK?',
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('GardenMapPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.mocked(listAreas).mockResolvedValue([area]);
    vi.mocked(listSeasons).mockResolvedValue([]);
    vi.mocked(listPlantings).mockResolvedValue([]);
    vi.mocked(listLogs).mockResolvedValue([]);
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/notes')) {
        return Promise.resolve(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows area details only in select tool and clears selection when switching tools', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <GardenMapPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-pick-area')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('area-detail-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('mock-pick-area'));
    expect(await screen.findByTestId('area-detail-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-tool-pan'));
    expect(screen.queryByTestId('area-detail-panel')).toBeNull();
    expect(screen.getByTestId('mock-selected')).toHaveTextContent('none');

    fireEvent.click(screen.getByTestId('mock-tool-select'));
    expect(screen.queryByTestId('area-detail-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('mock-pick-area'));
    expect(await screen.findByTestId('area-detail-panel')).toBeInTheDocument();
  });

  it('hides area details for polygon and move tools', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <GardenMapPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-pick-area')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('mock-pick-area'));
    expect(await screen.findByTestId('area-detail-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-tool-polygon'));
    expect(screen.queryByTestId('area-detail-panel')).toBeNull();

    fireEvent.click(screen.getByTestId('mock-tool-select'));
    fireEvent.click(screen.getByTestId('mock-pick-area'));
    expect(await screen.findByTestId('area-detail-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-tool-move'));
    expect(screen.queryByTestId('area-detail-panel')).toBeNull();
  });
});
