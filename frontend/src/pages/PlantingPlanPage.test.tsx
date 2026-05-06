import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listAreas } from '../api/areas';
import { listElements } from '../api/elements';
import { createLog, listLogs } from '../api/logs';
import { listNotes } from '../api/notes';
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

vi.mock('../api/areas', () => ({
  listAreas: vi.fn(),
}));

vi.mock('../api/elements', () => ({
  listElements: vi.fn(),
}));

vi.mock('../api/plantings', () => ({
  listPlantings: vi.fn(),
  patchPlanting: vi.fn(),
  deletePlanting: vi.fn(),
  createPlanting: vi.fn(() =>
    Promise.resolve({
      id: 'new',
      gardenId: 'g1',
      seasonId: 's1',
      elementId: null,
      plantProfileId: null,
      plantName: 'X',
      sowingMethod: 'indoor' as const,
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
    }),
  ),
}));

vi.mock('../api/plantProfiles', () => ({
  listPlantProfiles: vi.fn(),
}));

vi.mock('../api/logs', () => ({
  listLogs: vi.fn(),
  createLog: vi.fn(),
}));

vi.mock('../api/notes', () => ({
  listNotes: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
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

const baseEl = {
  type: 'raised_bed' as const,
  color: '#333',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 2,
  createdAt: '',
  updatedAt: '',
};

const en = {
  nav: { plantingPlan: 'Plan' },
  auth: { loading: 'Loading…', submitting: 'Wait…', unknownError: 'Error' },
  notes: {
    title: 'Notes',
    placeholder: 'Write',
    add: 'Add note',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    confirmDelete: 'OK?',
  },
  garden: {
    noGardenHint: 'No garden',
    areaDetails: 'Area',
    areaTypes: {
      raised_bed: 'Raised',
      open_bed: 'Open',
      tree_zone: 'Tree',
      path: 'Path',
      lawn: 'Lawn',
      other: 'Other',
    },
  },
  planning: {
    planHint: 'Hint',
    planModeOutdoor: 'Outdoor',
    planModeIndoor: 'Indoor mode',
    indoorSectionTitleWithCount: 'Indoor sowings ({{count}})',
    indoorSectionHint: 'Hint indoor section',
    indoorFilterAssignment: 'Show',
    indoorFilterAllPending: 'All pending',
    indoorFilterUnassigned: 'Unassigned only',
    indoorFilterAssigned: 'Assigned only',
    indoorFilterIncludeTransplanted: 'Include transplanted',
    noIndoorForFilter: 'No indoor',
    indoorAssigned: 'Assigned',
    indoorUnassigned: 'Unassigned',
    notTransplantedYet: 'Not transplanted yet',
    dateNotSet: 'Date not set',
    indoorUnassignedSection: 'Indoor pending',
    indoorUnassignedSectionWithCount: 'Indoor pending ({{count}})',
    indoorSowDateNotSet: 'No date',
    plantingDetailHarvestStart: 'Harvest start',
    plantingDetailHarvestEnd: 'Harvest end',
    plantingDetailQuantity: 'Qty',
    plantingDetailDescription: 'Desc',
    plantingDetailClose: 'Close',
    plantingDetailTitle: 'Indoor detail',
    noIndoorUnassigned: 'No pending',
    transplantDateOptional: 'Trans optional',
    quickLog: 'Log',
    noPlantingsInArea: 'Empty',
    noElementsInArea: 'No elements',
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
    moveToElement: 'Move',
    element: 'Element',
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
        id: 'ar1',
        gardenId: 'g1',
        title: 'Front',
        description: '',
        gridWidth: 10,
        gridHeight: 10,
        cellSizeMeters: 1,
        sortIndex: 0,
        backgroundImageUrl: null,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'ar2',
        gardenId: 'g1',
        title: 'Back',
        description: '',
        gridWidth: 10,
        gridHeight: 10,
        cellSizeMeters: 1,
        sortIndex: 1,
        backgroundImageUrl: null,
        createdAt: '',
        updatedAt: '',
      },
    ]);
    vi.mocked(listElements).mockImplementation(async (_g, areaId) => {
      if (areaId === 'ar1') {
        return [
          {
            id: 'e1',
            areaId: 'ar1',
            name: 'Bed A',
            ...baseEl,
          },
        ];
      }
      if (areaId === 'ar2') {
        return [
          {
            id: 'e2',
            areaId: 'ar2',
            name: 'Bed B',
            ...baseEl,
            gridX: 2,
          },
        ];
      }
      return [];
    });
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl1',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: 'e1',
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
        elementId: 'e1',
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
        elementId: 'e1',
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

  it('shows plantings grouped by area and element, timeline order, and sowing method fields', async () => {
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('plantings-by-area')).toBeInTheDocument());
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (1)');
    expect(screen.getByTestId('element-plantings-e1')).toHaveTextContent('Lettuce');
    expect(screen.getByTestId('element-plantings-e1')).toHaveTextContent('In');
    expect(screen.getByTestId('element-plantings-e1')).toHaveTextContent('Not transplanted yet');

    const timeline = screen.getByTestId('activity-timeline');
    const entries = timeline.querySelectorAll('[data-testid^="log-entry-"]');
    expect(entries[0]).toHaveTextContent('newer');
    expect(entries[1]).toHaveTextContent('older');

    fireEvent.click(screen.getByTestId('plan-mode-indoor'));
    expect(screen.getByTestId('indoor-sow-date')).toBeInTheDocument();
    expect(screen.getByTestId('transplant-date')).toBeInTheDocument();
    expect(screen.queryByTestId('outdoor-sow-date')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-form-element')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('plan-mode-outdoor'));
    expect(screen.getByTestId('outdoor-sow-date')).toBeInTheDocument();
    expect(screen.queryByTestId('indoor-sow-date')).not.toBeInTheDocument();
    expect(screen.getByTestId('add-form-element')).toBeInTheDocument();
  });

  it('lists indoor plantings awaiting transplant in the indoor section (assigned + unassigned)', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl1',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: 'e1',
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
      {
        id: 'pl2',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Basil',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-01T12:00:00.000Z',
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

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('indoor-section')).toHaveTextContent('Basil'));
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Lettuce');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (2)');
    expect(screen.getByTestId('element-plantings-e1')).toHaveTextContent('Lettuce');
  });

  it('sorts indoor plantings by oldest indoor sow date first, null dates last', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl1',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Later',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-04-01T12:00:00.000Z',
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
      {
        id: 'pl2',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Earlier',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-01T12:00:00.000Z',
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
      {
        id: 'pl3',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'NoDate',
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

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('indoor-row-pl2')).toBeInTheDocument());
    const section = screen.getByTestId('indoor-section');
    const rows = section.querySelectorAll('[data-testid^="indoor-row-"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute('data-testid', 'indoor-row-pl2');
    expect(rows[1]).toHaveAttribute('data-testid', 'indoor-row-pl1');
    expect(rows[2]).toHaveAttribute('data-testid', 'indoor-row-pl3');
  });

  it('filters indoor list by assignment and can include transplanted indoor sowings', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl1',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'UnassignedPending',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-01T12:00:00.000Z',
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
      {
        id: 'pl2',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: 'e1',
        plantProfileId: null,
        plantName: 'AssignedPending',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-02T12:00:00.000Z',
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
      {
        id: 'pl3',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: 'e1',
        plantProfileId: null,
        plantName: 'AssignedTransplanted',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-03-03T12:00:00.000Z',
        transplantDate: '2026-04-01T12:00:00.000Z',
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
    vi.mocked(listLogs).mockResolvedValue([
      {
        id: 'lt1',
        gardenId: 'g1',
        seasonId: 's1',
        plantingId: 'pl3',
        elementId: 'e1',
        activity: 'transplanted',
        date: '2026-04-15T12:00:00.000Z',
        note: null,
        quantity: null,
        createdBy: 'u1',
        clientTimestamp: '',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('indoor-section')).toBeInTheDocument());

    // Default: includeTransplanted=false, assignment=all -> only pending (pl1 + pl2)
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (2)');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('UnassignedPending');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('AssignedPending');
    expect(screen.getByTestId('indoor-section')).not.toHaveTextContent('AssignedTransplanted');

    // Unassigned only
    fireEvent.change(screen.getByTestId('indoor-filter-assignment'), { target: { value: 'unassigned' } });
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (1)');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('UnassignedPending');
    expect(screen.getByTestId('indoor-section')).not.toHaveTextContent('AssignedPending');

    // Assigned only
    fireEvent.change(screen.getByTestId('indoor-filter-assignment'), { target: { value: 'assigned' } });
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (1)');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('AssignedPending');

    // Include transplanted adds pl3 (still assigned-only)
    fireEvent.click(screen.getByTestId('indoor-filter-include-transplanted'));
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('Indoor sowings (2)');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('AssignedPending');
    expect(screen.getByTestId('indoor-section')).toHaveTextContent('AssignedTransplanted');
  });

  it('marks an indoor sowing as actually transplanted from the detail modal', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl9',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Chard',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-02-01T12:00:00.000Z',
        transplantDate: '2026-05-01T12:00:00.000Z',
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
    vi.mocked(listLogs).mockResolvedValue([]);
    vi.mocked(createLog).mockResolvedValue({
      id: 'lg1',
      gardenId: 'g1',
      seasonId: 's1',
      plantingId: 'pl9',
      elementId: null,
      activity: 'transplanted',
      date: '2026-04-20T10:00:00.000Z',
      note: null,
      quantity: null,
      createdBy: 'u1',
      clientTimestamp: '',
      createdAt: '',
      updatedAt: '',
    });
    vi.mocked(patchPlanting).mockResolvedValue({
      id: 'pl9',
      gardenId: 'g1',
      seasonId: 's1',
      elementId: null,
      plantProfileId: null,
      plantName: 'Chard',
      sowingMethod: 'indoor',
      indoorSowDate: '2026-02-01T12:00:00.000Z',
      transplantDate: '2026-04-20T10:00:00.000Z',
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

    await waitFor(() => expect(screen.getByTestId('indoor-row-pl9')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('indoor-row-pl9'));
    await waitFor(() => expect(screen.getByTestId('indoor-planting-detail-modal')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('indoor-detail-mark-transplanted-pl9'));

    await waitFor(() => {
      expect(createLog).toHaveBeenCalled();
    });

    const [, body] = vi.mocked(createLog).mock.calls[0];
    expect(body).toMatchObject({
      seasonId: 's1',
      plantingId: 'pl9',
      activity: 'transplanted',
      note: null,
      quantity: null,
    });
    expect(body.date).toBe(body.clientTimestamp);

    await waitFor(() => expect(patchPlanting).toHaveBeenCalled());
    const [, , patch] = vi.mocked(patchPlanting).mock.calls[0];
    expect(patch).toEqual({ transplantDate: body.date });
  });

  it('opens indoor unassigned detail modal and patches element from move select', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl9',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Chard',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-02-01T12:00:00.000Z',
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
    vi.mocked(patchPlanting).mockResolvedValue({
      id: 'pl9',
      gardenId: 'g1',
      seasonId: 's1',
      elementId: 'e2',
      plantProfileId: null,
      plantName: 'Chard',
      sowingMethod: 'indoor',
      indoorSowDate: '2026-02-01T12:00:00.000Z',
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

    await waitFor(() => expect(screen.getByTestId('indoor-row-pl9')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('indoor-row-pl9'));
    await waitFor(() => expect(screen.getByTestId('indoor-planting-detail-modal')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('indoor-detail-area-select-pl9'), { target: { value: 'e2' } });

    await waitFor(() => {
      expect(patchPlanting).toHaveBeenCalledWith('g1', 'pl9', { elementId: 'e2' });
    });
  });

  it('shows notes in indoor unassigned detail modal', async () => {
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl8',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Mint',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-01-15T12:00:00.000Z',
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

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('indoor-row-pl8')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('indoor-row-pl8'));
    await waitFor(() => expect(screen.getByTestId('notes-section')).toBeInTheDocument());
    expect(listNotes).toHaveBeenCalledWith('g1', 's1', { targetType: 'planting', targetId: 'pl8' });
  });

  it('deletes planting from indoor unassigned detail modal after confirm', async () => {
    vi.stubGlobal('confirm', () => true);
    vi.mocked(deletePlanting).mockResolvedValue(undefined);
    vi.mocked(listPlantings).mockResolvedValue([
      {
        id: 'pl7',
        gardenId: 'g1',
        seasonId: 's1',
        elementId: null,
        plantProfileId: null,
        plantName: 'Dill',
        sowingMethod: 'indoor',
        indoorSowDate: '2026-01-10T12:00:00.000Z',
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

    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('indoor-row-pl7')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('indoor-row-pl7'));
    await waitFor(() => expect(screen.getByTestId('indoor-detail-delete-pl7')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('indoor-detail-delete-pl7'));

    await waitFor(() => {
      expect(deletePlanting).toHaveBeenCalledWith('g1', 'pl7');
    });

    vi.unstubAllGlobals();
  });

  it('patches planting element when move select changes', async () => {
    vi.mocked(patchPlanting).mockResolvedValue({
      id: 'pl1',
      gardenId: 'g1',
      seasonId: 's1',
      elementId: 'e2',
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

    fireEvent.change(screen.getByTestId('planting-area-select-pl1'), { target: { value: 'e2' } });

    await waitFor(() => {
      expect(patchPlanting).toHaveBeenCalledWith('g1', 'pl1', { elementId: 'e2' });
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

  it('opens planting notes section when toggled', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GardenContext.Provider value={ctx}>
          <PlantingPlanPage />
        </GardenContext.Provider>
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('planting-notes-toggle-pl1')).toBeInTheDocument());
    expect(screen.queryByTestId('notes-section')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('planting-notes-toggle-pl1'));
    await waitFor(() => expect(screen.getByTestId('notes-section')).toBeInTheDocument());
    expect(listNotes).toHaveBeenCalledWith('g1', 's1', { targetType: 'planting', targetId: 'pl1' });
  });
});
