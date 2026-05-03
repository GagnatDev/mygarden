import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Planting } from '../api/plantings';
import * as gardensApi from '../api/gardens';
import * as seasonsApi from '../api/seasons';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { HistoryPage } from './HistoryPage';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('../api/notes', () => ({
  listNotes: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../garden/useActiveSeason', () => ({
  useActiveSeason: () => ({
    seasonId: 's-active',
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

const garden = {
  id: 'g1',
  name: 'Home',
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

const planting: Planting = {
  id: 'p1',
  gardenId: 'g1',
  seasonId: 's-old',
  elementId: 'e1',
  plantProfileId: null,
  plantName: 'Carrot',
  sowingMethod: 'direct_outdoor',
  indoorSowDate: null,
  transplantDate: null,
  outdoorSowDate: null,
  harvestWindowStart: null,
  harvestWindowEnd: null,
  quantity: null,
  notes: null,
  createdBy: 'u1',
  createdAt: '',
  updatedAt: '',
};

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.spyOn(gardensApi, 'listSeasons').mockResolvedValue([
      {
        id: 's-old',
        gardenId: 'g1',
        name: '2025',
        startDate: '',
        endDate: '',
        isActive: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 's-active',
        gardenId: 'g1',
        name: '2026',
        startDate: '',
        endDate: '',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    vi.spyOn(seasonsApi, 'getSeasonSnapshot').mockResolvedValue({
      season: {
        id: 's-old',
        gardenId: 'g1',
        name: '2025',
        startDate: '',
        endDate: '',
        isActive: false,
        createdAt: '',
        updatedAt: '',
      },
      areas: [
        {
          id: 'ar1',
          gardenId: 'g1',
          title: 'Area one',
          description: '',
          gridWidth: 4,
          gridHeight: 4,
          cellSizeMeters: 1,
          sortIndex: 0,
          backgroundImageUrl: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
      elements: [],
      plantings: [planting],
      logs: [],
      notes: [],
    });
  });

  it('loads snapshot when season selected', async () => {
    const instance = i18n.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            nav: { history: 'History' },
            auth: { loading: 'Loading', unknownError: 'Err' },
            garden: {
              noGardenHint: 'No',
              toolSelect: 'S',
              toolMove: 'M',
              toolDrawPolygon: 'Poly',
              polygonFinish: 'F',
              polygonClear: 'C',
              toolPan: 'P',
              mapLayer: 'L',
              layers: {
                areaType: 'AT',
                status: 'St',
                planVsActual: 'PvA',
                historical: 'Hi',
              },
              legend: 'Leg',
              zoomIn: '+',
              zoomOut: '-',
              gridAriaLabel: 'Grid {{width}} {{height}}',
              hasPlantingsHint: 'h',
              backgroundUpload: 'Up',
              backgroundRemove: 'Rm',
              backgroundOpacity: 'Op',
              backgroundUploading: 'Ing',
              backgroundUploadFailed: 'Bad',
            },
            elements: {
              hasPlantingsHint: 'hp',
              layers: { elementType: 'ET' },
              historicalGhostAria: 'ghost {{name}}',
            },
            history: {
              hint: 'H',
              seasonPicker: 'Season',
              active: 'active',
              archiveSeason: 'Archive',
              confirmArchive: 'Sure?',
              pickSeason: 'Pick',
              mapCaption: 'Map',
              plantings: 'Plants',
            },
            planning: {
              noPlantingsInArea: 'None',
              activityTimeline: 'Log',
              sowing: { direct_outdoor: 'Out', indoor: 'In' },
            },
            notes: {
              title: 'N',
              placeholder: 'P',
              add: 'A',
              edit: 'E',
              delete: 'D',
              save: 'S',
              confirmDelete: '?',
              seasonNotes: 'SN',
              seasonPageHint: 'x',
            },
          },
        },
      },
    });

    render(
      <I18nextProvider i18n={instance}>
        <GardenContext.Provider value={ctx}>
          <HistoryPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('history-season-picker')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('history-season-picker'), { target: { value: 's-old' } });
    await waitFor(() => expect(screen.getByTestId('history-planting-p1')).toHaveTextContent('Carrot'));
    expect(seasonsApi.getSeasonSnapshot).toHaveBeenCalledWith('g1', 's-old');
  });
});
