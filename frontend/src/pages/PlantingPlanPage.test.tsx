import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAreas } from '../api/gardens';
import { listLogs } from '../api/logs';
import { deletePlanting, listPlantings, patchPlanting } from '../api/plantings';
import { listPlantProfiles } from '../api/plantProfiles';
import { GardenContext, type GardenContextValue } from '../garden/garden-context';
import { PlantingPlanPage } from './PlantingPlanPage';

vi.mock('../garden/useActiveSeason', () => ({
  useActiveSeason: () => ({
    seasonId: 's1',
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../api/gardens', () => ({
  listAreas: vi.fn(),
}));

vi.mock('../api/plantings', () => ({
  listPlantings: vi.fn(),
  patchPlanting: vi.fn(),
  deletePlanting: vi.fn(),
  createPlanting: vi.fn(),
}));

vi.mock('../api/plantProfiles', () => ({
  listPlantProfiles: vi.fn(),
}));

vi.mock('../api/logs', () => ({
  listLogs: vi.fn(),
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
  nav: { plantingPlan: 'Plan' },
  auth: { loading: 'Loading…', submitting: 'Wait…', unknownError: 'Error' },
  garden: { noGardenHint: 'No garden', areaDetails: 'Area' },
  planning: {
    planHint: 'Hint',
    quickLog: 'Log',
    noPlantingsInArea: 'Empty',
    addPlanting: 'Add',
    plantSource: 'Source',
    fromProfile: 'Profile',
    adhocName: 'Adhoc',
    plantProfile: 'Profile sel',
    select: 'Select',
    plantName: 'Name',
    sowingMethod: 'Method',
    sowing: { indoor: 'Indoor', direct_outdoor: 'Outdoor' },
    datePlaceholder: 'Pick',
    openDatePicker: 'Open',
    clearDate: 'Clear',
    indoorSowDate: 'In',
    transplantDate: 'Out',
    outdoorSowDate: 'Outd',
    harvestStartOptional: 'Harv',
    savePlanting: 'Save',
    moveToArea: 'Area',
    removePlanting: 'Remove',
    confirmRemovePlanting: 'Sure remove?',
    activityTimeline: 'Timeline',
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

describe('PlantingPlanPage', () => {
  beforeEach(() => {
    vi.mocked(listAreas).mockResolvedValue([
      {
        id: 'a1',
        gardenId: 'g1',
        name: 'Bed A',
        type: 'raised_bed',
        color: '#333',
        gridX: 0,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'a2',
        gardenId: 'g1',
        name: 'Bed B',
        type: 'raised_bed',
        color: '#633',
        gridX: 2,
        gridY: 0,
        gridWidth: 2,
        gridHeight: 2,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl1',
        gardenId: 'g1',
        seasonId: 's1',
        areaId: 'a1',
        plantProfileId: null,
        plantName: 'Lettuce',
        sowingMethod: 'indoor',
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
      },
    ]);
    vi.mocked(listPlantProfiles).mockResolvedValue([]);
    vi.mocked(listLogs).mockResolvedValue([
      {
        id: 'l2',
        gardenId: 'g1',
        seasonId: 's1',
        plantingId: null,
        areaId: 'a1',
        activity: 'watered',
        date: '2026-06-02T12:00:00.000Z',
        note: 'newer',
        quantity: null,
        createdBy: 'u1',
        clientTimestamp: '',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'l1',
        gardenId: 'g1',
        seasonId: 's1',
        plantingId: null,
        areaId: 'a1',
        activity: 'pruned',
        date: '2026-05-01T12:00:00.000Z',
        note: 'older',
        quantity: null,
        createdBy: 'u1',
        clientTimestamp: '',
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows plantings grouped by area, timeline order, and sowing method fields', async () => {
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('plantings-by-area')).toBeInTheDocument());
    expect(screen.getByTestId('area-plantings-a1')).toHaveTextContent('Lettuce');

    const timeline = screen.getByTestId('activity-timeline');
    const entries = timeline.querySelectorAll('[data-testid^="log-entry-"]');
    expect(entries[0]).toHaveTextContent('newer');
    expect(entries[1]).toHaveTextContent('older');

    fireEvent.change(screen.getByTestId('sowing-method'), { target: { value: 'indoor' } });
    expect(screen.getByTestId('indoor-sow-date')).toBeInTheDocument();
    expect(screen.getByTestId('transplant-date')).toBeInTheDocument();
    expect(screen.queryByTestId('outdoor-sow-date')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('sowing-method'), { target: { value: 'direct_outdoor' } });
    expect(screen.getByTestId('outdoor-sow-date')).toBeInTheDocument();
    expect(screen.queryByTestId('indoor-sow-date')).not.toBeInTheDocument();
  });

  it('patches planting area when move select changes', async () => {
    vi.mocked(patchPlanting).mockResolvedValue({
      id: 'pl1',
      gardenId: 'g1',
      seasonId: 's1',
      areaId: 'a2',
      plantProfileId: null,
      plantName: 'Lettuce',
      sowingMethod: 'indoor',
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
    });

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('planting-area-select-pl1')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('planting-area-select-pl1'), { target: { value: 'a2' } });

    await waitFor(() => {
      expect(patchPlanting).toHaveBeenCalledWith('g1', 'pl1', { areaId: 'a2' });
    });
  });

  it('deletes planting after confirm', async () => {
    vi.stubGlobal('confirm', () => true);
    vi.mocked(deletePlanting).mockResolvedValue(undefined);

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('planting-delete-pl1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('planting-delete-pl1'));

    await waitFor(() => {
      expect(deletePlanting).toHaveBeenCalledWith('g1', 'pl1');
    });

    vi.unstubAllGlobals();
  });
});
