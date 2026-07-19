import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/areas';
import { OVERVIEW_PX_PER_METER } from '../garden/overview-helpers';
import { GardenAreasPage } from './GardenAreasPage';

const { listAreasMock, patchAreaMock } = vi.hoisted(() => ({
  listAreasMock: vi.fn(),
  patchAreaMock: vi.fn(),
}));

vi.mock('../api/areas', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../api/areas')>();
  return { ...mod, listAreas: listAreasMock, patchArea: patchAreaMock };
});

vi.mock('../garden/garden-context', () => ({
  useGardenContext: () => ({
    gardens: [{ id: 'g1', name: 'My Garden' }],
    loading: false,
    error: null,
    setSelectedGardenId: vi.fn(),
    refreshGardens: vi.fn(),
  }),
}));

function makeArea(overrides: Partial<Area> & { id: string }): Area {
  return {
    gardenId: 'g1',
    title: overrides.id,
    description: '',
    gridWidth: 4,
    gridHeight: 4,
    cellSizeMeters: 1,
    sortIndex: 0,
    backgroundImageUrl: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          nav: { home: 'Home' },
          auth: { loading: 'Loading' },
          areas: {
            sectionTitle: 'Areas',
            addArea: 'Add area',
            emptyHint: 'No areas yet.',
            delete: 'Delete',
            viewList: 'List',
            viewMap: 'Map',
            overviewAriaLabel: 'Garden overview map',
            overviewTileAria: 'Open area {{title}}',
            overviewHint: 'Overview hint',
            placeFailed: 'Could not save the area placement.',
          },
          garden: {
            editArea: 'Edit',
            deleteGarden: 'Delete garden',
            zoomIn: 'Zoom in',
            zoomOut: 'Zoom out',
            zoomFit: 'Zoom to fit',
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

async function renderPage() {
  const instance = await testI18n();
  return render(
    <I18nextProvider i18n={instance}>
      <MemoryRouter initialEntries={['/gardens/g1']}>
        <Routes>
          <Route path="/gardens/:gardenId" element={<GardenAreasPage />} />
          <Route path="/gardens/:gardenId/areas/:areaId" element={<div data-testid="area-map-page" />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  listAreasMock.mockReset();
  patchAreaMock.mockReset();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('GardenAreasPage areas view toggle', () => {
  it('shows the list by default and switches to the overview map', async () => {
    listAreasMock.mockResolvedValue([
      makeArea({ id: 'a1', title: 'Front', overviewX: 0, overviewY: 0 }),
      makeArea({ id: 'a2', title: 'Back' }),
    ]);
    await renderPage();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Front' })).toBeTruthy());
    expect(screen.queryByTestId('garden-overview-map')).toBeNull();

    fireEvent.click(screen.getByTestId('areas-view-map'));
    expect(screen.getByTestId('garden-overview-map')).toBeTruthy();
    expect(screen.getByTestId('overview-tile-a1')).toBeTruthy();
    expect(screen.getByTestId('overview-tile-a2').dataset.placed).toBe('false');
    expect(localStorage.getItem('mygarden.areasView')).toBe('map');
  });

  it('remembers the map view across mounts', async () => {
    localStorage.setItem('mygarden.areasView', 'map');
    listAreasMock.mockResolvedValue([makeArea({ id: 'a1', overviewX: 0, overviewY: 0 })]);
    await renderPage();
    await waitFor(() => expect(screen.getByTestId('overview-tile-a1')).toBeTruthy());
  });

  it('opens the area map page when a tile is tapped', async () => {
    localStorage.setItem('mygarden.areasView', 'map');
    listAreasMock.mockResolvedValue([makeArea({ id: 'a1', overviewX: 0, overviewY: 0 })]);
    await renderPage();
    const tile = await screen.findByTestId('overview-tile-a1');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(tile, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(screen.getByTestId('area-map-page')).toBeTruthy();
  });

  it('persists a tile drop via PATCH and keeps the tile placed optimistically', async () => {
    localStorage.setItem('mygarden.areasView', 'map');
    const unplaced = makeArea({ id: 'a1', gridWidth: 2, gridHeight: 2 });
    listAreasMock.mockResolvedValue([unplaced]);
    patchAreaMock.mockResolvedValue({ ...unplaced, overviewX: 2, overviewY: 0 });
    await renderPage();
    const tile = await screen.findByTestId('overview-tile-a1');
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      clientX: 100 + 2 * OVERVIEW_PX_PER_METER,
      clientY: 100,
    });
    fireEvent.pointerUp(svg, {
      pointerId: 1,
      clientX: 100 + 2 * OVERVIEW_PX_PER_METER,
      clientY: 100,
    });
    expect(patchAreaMock).toHaveBeenCalledWith('g1', 'a1', { overviewX: 2, overviewY: 0 });
    // Optimistic update: the tile is placed without waiting for a reload.
    await waitFor(() =>
      expect(screen.getByTestId('overview-tile-a1').dataset.placed).toBe('true'),
    );
    expect(listAreasMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed placement and reloads the areas', async () => {
    localStorage.setItem('mygarden.areasView', 'map');
    const unplaced = makeArea({ id: 'a1', gridWidth: 2, gridHeight: 2 });
    listAreasMock.mockResolvedValue([unplaced]);
    patchAreaMock.mockRejectedValue(new Error('boom'));
    await renderPage();
    const tile = await screen.findByTestId('overview-tile-a1');
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 148, clientY: 100 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 148, clientY: 100 });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('boom'));
    expect(listAreasMock).toHaveBeenCalledTimes(2);
  });
});
