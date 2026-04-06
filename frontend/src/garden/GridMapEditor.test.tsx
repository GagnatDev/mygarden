import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import type { Area, Garden } from '../api/gardens';
import { CELL, GridMapEditor } from './GridMapEditor';

const garden: Garden = {
  id: 'g1',
  name: 'G',
  gridWidth: 4,
  gridHeight: 3,
  cellSizeMeters: 1,
  createdBy: 'u1',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const area: Area = {
  id: 'a1',
  gardenId: 'g1',
  name: 'Bed',
  type: 'raised_bed',
  color: '#8B4513',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 1,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          garden: {
            toolSelect: 'Select',
            toolDrawPolygon: 'Polygon',
            polygonFinish: 'Finish',
            polygonClear: 'Clear',
            toolMove: 'Move',
            toolPan: 'Pan',
            mapLayer: 'Layer',
            layers: {
              areaType: 'Area type',
              status: 'Status',
              planVsActual: 'Plan vs actual',
              historical: 'Historical',
            },
            legend: 'Legend',
            historicalGhostAreaAria: 'Historical area {{name}}',
            zoomIn: 'Zoom in',
            zoomOut: 'Zoom out',
            gridAriaLabel: 'Grid {{width}} by {{height}}',
            hasPlantingsHint: 'has plantings',
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function mockGridMapBoundingRect(map: HTMLElement, gw: number, gh: number) {
  const w = gw * CELL;
  const h = gh * CELL;
  vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: w,
    height: h,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('GridMapEditor', () => {
  it('renders grid with correct number of cells and shows placed areas', async () => {
    const onSelectArea = vi.fn();
    const onSelectionComplete = vi.fn();
    const onToolChange = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={onSelectionComplete}
          tool="select"
          onToolChange={onToolChange}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    expect(map.querySelectorAll('[data-testid="grid-map-cell-layer"]')).toHaveLength(1);
    expect(map.querySelectorAll('[data-cell]')).toHaveLength(0);
    expect(screen.getByRole('grid', { name: /grid 4 by 3/i })).toBeInTheDocument();
    expect(screen.getByTestId('map-area-a1')).toBeInTheDocument();
  });

  it('uses one cell layer for large grids instead of one DOM node per cell', async () => {
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();
    const bigGarden: Garden = {
      ...garden,
      gridWidth: 200,
      gridHeight: 200,
    };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={bigGarden}
          areas={[]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    expect(map.querySelectorAll('[data-testid="grid-map-cell-layer"]')).toHaveLength(1);
    expect(map.querySelectorAll('[data-cell]')).toHaveLength(0);
    const layer = screen.getByTestId('grid-map-cell-layer');
    expect(layer.getAttribute('width')).toBe('5600');
    expect(layer.getAttribute('height')).toBe('5600');
  });

  it('selects an area when its label is clicked in select mode', async () => {
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByTestId('map-area-a1'));
    expect(onSelectArea).toHaveBeenCalledWith('a1');
  });

  it('shows a subtle indicator when the area has plantings', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          areaIdsWithPlantings={new Set(['a1'])}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('map-area-planting-indicator-a1')).toBeInTheDocument();
    expect(screen.getByTestId('map-area-a1')).toHaveAttribute('aria-label', expect.stringMatching(/has plantings/i));
  });

  it('move mode shows ghost and preview, calls onMoveArea with snapped grid coords', async () => {
    const onMoveArea = vi.fn();
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          onMoveArea={onMoveArea}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, garden.gridWidth, garden.gridHeight);

    const bed = screen.getByTestId('map-area-a1');
    fireEvent.pointerDown(bed, {
      clientX: 14,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    expect(screen.getByTestId('map-move-ghost')).toBeInTheDocument();
    expect(screen.getByTestId('map-move-preview')).toBeInTheDocument();

    fireEvent.pointerMove(map, {
      clientX: 14 + 2 * CELL,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });
    const preview = screen.getByTestId('map-move-preview');
    expect(preview.getAttribute('x')).toBe(String(2 * CELL));
    expect(preview.getAttribute('y')).toBe('0');

    fireEvent.pointerUp(map, {
      clientX: 14 + 2 * CELL,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    expect(onMoveArea).toHaveBeenCalledWith('a1', 2, 0);
    expect(onSelectArea).not.toHaveBeenCalled();
  });

  it('move mode shows red preview when position overlaps another area', async () => {
    const onMoveArea = vi.fn();
    const i18nInstance = await testI18n();
    const other: Area = {
      id: 'a2',
      gardenId: 'g1',
      name: 'Other',
      type: 'path',
      color: '#999',
      gridX: 2,
      gridY: 0,
      gridWidth: 1,
      gridHeight: 1,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area, other]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          onMoveArea={onMoveArea}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, garden.gridWidth, garden.gridHeight);
    const bed = screen.getByTestId('map-area-a1');

    fireEvent.pointerDown(bed, {
      clientX: 14,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerMove(map, {
      clientX: 14 + 2 * CELL,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });

    expect(screen.getByTestId('map-move-preview')).toHaveAttribute('data-valid', 'false');
    fireEvent.pointerUp(map, {
      clientX: 14 + 2 * CELL,
      clientY: 7,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    expect(onMoveArea).not.toHaveBeenCalled();
  });

  it('move mode renders alignment guides when edges align with another area', async () => {
    const onMoveArea = vi.fn();
    const i18nInstance = await testI18n();
    const wideGarden: Garden = { ...garden, gridWidth: 6, gridHeight: 4 };
    const a1: Area = {
      ...area,
      gridWidth: 2,
      gridHeight: 2,
    };
    const a2: Area = {
      id: 'a2',
      gardenId: 'g1',
      name: 'East',
      type: 'path',
      color: '#888',
      gridX: 2,
      gridY: 0,
      gridWidth: 2,
      gridHeight: 2,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={wideGarden}
          areas={[a1, a2]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          onMoveArea={onMoveArea}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, wideGarden.gridWidth, wideGarden.gridHeight);
    const bed = screen.getByTestId('map-area-a1');

    fireEvent.pointerDown(bed, {
      clientX: 1,
      clientY: 1,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });

    const verticalGuides = screen.getAllByTestId('map-alignment-guide-vertical');
    expect(verticalGuides.some((el) => el.getAttribute('data-grid-line') === '2')).toBe(true);
  });

  it('renders per-layer badge/color overrides and shows legend for non-default layers', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
          layer="status"
          areaColorById={{ a1: '#00ff00' }}
          areaBadgeById={{ a1: { text: 'Sown', toneClass: 'bg-blue-600' } }}
          legendItems={[
            { label: 'Sown', color: '#00ff00' },
            { label: 'Harvested', color: '#ff00ff' },
          ]}
        />
      </I18nextProvider>,
    );

    expect(screen.getByTestId('map-layer-legend')).toBeInTheDocument();
    expect(screen.getByTestId('map-area-badge-a1')).toHaveTextContent('Sown');
    const rect = screen.getByTestId('map-area-a1').querySelector('rect');
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute('fill')).toBe('#00ff00');
  });

  it('historical layer can render ghost areas and per-area overlay badges', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
          layer="historical"
          historicalGhostAreas={[
            { id: 'old-a', name: 'Old bed', gridX: 2, gridY: 1, gridWidth: 1, gridHeight: 1 },
          ]}
          areaOverlayBadgesById={{ a1: ['Tomato', 'Carrot'] }}
        />
      </I18nextProvider>,
    );

    expect(screen.getAllByTestId('map-historical-ghost-area')).toHaveLength(1);
    expect(screen.getByTestId('map-area-overlay-badges-a1')).toHaveTextContent('Tomato');
  });

  it('draw-polygon tool shows Finish and completes when Finish is tapped', async () => {
    const onSelectionComplete = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="draw-polygon"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, garden.gridWidth, garden.gridHeight);

    fireEvent.pointerDown(map, { clientX: CELL * 0.5, clientY: CELL * 0.5, button: 0, pointerId: 1 });
    fireEvent.pointerDown(map, { clientX: CELL * 2.5, clientY: CELL * 0.5, button: 0, pointerId: 2 });
    fireEvent.pointerDown(map, { clientX: CELL * 2.5, clientY: CELL * 2.0, button: 0, pointerId: 3 });

    fireEvent.click(screen.getByTestId('map-polygon-finish'));
    expect(onSelectionComplete).toHaveBeenCalledTimes(1);
    expect(onSelectionComplete.mock.calls[0]![0]!.shape?.kind).toBe('polygon');
  });

  it('draw-polygon tool collects vertices and completes on double click', async () => {
    const onSelectionComplete = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[]}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="draw-polygon"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, garden.gridWidth, garden.gridHeight);

    fireEvent.pointerDown(map, { clientX: CELL * 0.5, clientY: CELL * 0.5, button: 0, pointerId: 1 });
    fireEvent.pointerDown(map, { clientX: CELL * 2.5, clientY: CELL * 0.5, button: 0, pointerId: 2 });
    fireEvent.pointerDown(map, { clientX: CELL * 2.5, clientY: CELL * 2.0, button: 0, pointerId: 3 });

    expect(screen.getByTestId('map-polygon-draft')).toBeInTheDocument();

    fireEvent.doubleClick(map, { clientX: CELL * 2.5, clientY: CELL * 2.0 });
    expect(onSelectionComplete).toHaveBeenCalledTimes(1);
    const sel = onSelectionComplete.mock.calls[0]![0]!;
    expect(sel.shape?.kind).toBe('polygon');
    expect(sel.gridWidth).toBeGreaterThan(0);
    expect(sel.gridHeight).toBeGreaterThan(0);
  });

  it('renders polygon areas as svg polygon, not only a bounding rect', async () => {
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();
    const polyArea: Area = {
      ...area,
      shape: {
        kind: 'polygon',
        vertices: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 0, y: 1 },
        ],
      },
    };
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[polyArea]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('map-area-polygon-a1')).toBeInTheDocument();
    expect(screen.getByTestId('map-area-a1')).toHaveAttribute('data-area-shape', 'polygon');
  });
});
