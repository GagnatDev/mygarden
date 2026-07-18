import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/areas';
import type { Element } from '../api/elements';
import { CELL, GridMapEditor } from './GridMapEditor';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../api/client', () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
}));

const mapArea: Area = {
  id: 'ar1',
  gardenId: 'g1',
  title: 'Map',
  description: '',
  gridWidth: 4,
  gridHeight: 3,
  cellSizeMeters: 1,
  sortIndex: 0,
  backgroundImageUrl: null,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const bedElement: Element = {
  id: 'a1',
  areaId: 'ar1',
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
            zoomFit: 'Zoom to fit',
            gridAriaLabel: 'Grid {{width}} by {{height}}',
            hasPlantingsHint: 'has plantings',
            backgroundUpload: 'Upload',
            backgroundRemove: 'Remove',
            backgroundOpacity: 'Opacity',
            backgroundUploading: 'Uploading',
            backgroundUploadFailed: 'Failed',
          },
          elements: {
            hasPlantingsHint: 'has plantings',
            layers: {
              elementType: 'Element type',
            },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/**
 * Mock the map container's measured size before mount so the fit-on-mount
 * layout effect sees a real viewport. Returns a mutable size object; change
 * it to simulate a container resize.
 */
function mockMapContainerSize(width: number, height: number) {
  const size = { width, height };
  const orig = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.dataset?.testid === 'grid-map-container') {
      return {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
        top: 0,
        left: 0,
        right: size.width,
        bottom: size.height,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return orig.call(this);
  });
  return size;
}

function parseMapViewportTransform(viewport: HTMLElement): { tx: number; ty: number; scale: number } {
  const t = viewport.style.transform;
  const m = t.match(
    /translate\(calc\(-50% \+ ([-\d.]+)px\), calc\(-50% \+ ([-\d.]+)px\)\) scale\(([-\d.]+)\)/,
  );
  if (!m) throw new Error(`Could not parse transform: ${t}`);
  return { tx: Number(m[1]), ty: Number(m[2]), scale: Number(m[3]) };
}

async function flushMapWheelRaf() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
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
  it('renders grid with correct number of cells and shows placed elements', async () => {
    const onSelectElement = vi.fn();
    const onSelectionComplete = vi.fn();
    const onToolChange = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
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
    const onSelectElement = vi.fn();
    const i18nInstance = await testI18n();
    const bigMapArea: Area = {
      ...mapArea,
      gridWidth: 200,
      gridHeight: 200,
    };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={bigMapArea} elements={[]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
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

  it('selects an element when its label is clicked in select mode', async () => {
    const onSelectElement = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByTestId('map-area-a1'));
    expect(onSelectElement).toHaveBeenCalledWith('a1');
  });

  it('shows a subtle indicator when the element has plantings', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          elementIdsWithPlantings={new Set(['a1'])}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('map-area-planting-indicator-a1')).toBeInTheDocument();
    expect(screen.getByTestId('map-area-a1')).toHaveAttribute('aria-label', expect.stringMatching(/has plantings/i));
  });

  it('move mode shows ghost and preview, calls onMoveElement with snapped grid coords', async () => {
    const onMoveElement = vi.fn();
    const onSelectElement = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
          onSelectionComplete={vi.fn()}
          onMoveElement={onMoveElement}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

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
    expect(onMoveElement).toHaveBeenCalledWith('a1', 2, 0);
    expect(onSelectElement).not.toHaveBeenCalled();
  });

  it('move mode shows red preview when position overlaps another area', async () => {
    const onMoveElement = vi.fn();
    const i18nInstance = await testI18n();
    const otherEl: Element = {
      id: 'a2',
      areaId: 'ar1',
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
          gardenId="g1"
          area={mapArea}
          elements={[bedElement, otherEl]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          onMoveElement={onMoveElement}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);
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
    expect(onMoveElement).not.toHaveBeenCalled();
  });

  it('move mode renders alignment guides when edges align with another area', async () => {
    const onMoveElement = vi.fn();
    const i18nInstance = await testI18n();
    const wideMapArea: Area = { ...mapArea, gridWidth: 6, gridHeight: 4 };
    const alignEl1: Element = {
      ...bedElement,
      gridWidth: 2,
      gridHeight: 2,
    };
    const alignEl2: Element = {
      id: 'a2',
      areaId: 'ar1',
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
          gardenId="g1"
          area={wideMapArea}
          elements={[alignEl1, alignEl2]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          onMoveElement={onMoveElement}
          tool="move"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, wideMapArea.gridWidth, wideMapArea.gridHeight);
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
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
          layer="status"
          elementColorById={{ a1: '#00ff00' }}
          elementBadgeById={{ a1: { text: 'Sown', toneClass: 'bg-blue-600' } }}
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
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
          layer="historical"
          historicalGhostElements={[
            { id: 'old-a', name: 'Old bed', gridX: 2, gridY: 1, gridWidth: 1, gridHeight: 1 },
          ]}
          elementOverlayBadgesById={{ a1: ['Tomato', 'Carrot'] }}
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
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="draw-polygon"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

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
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="draw-polygon"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

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
    const onSelectElement = vi.fn();
    const i18nInstance = await testI18n();
    const polyElement: Element = {
      ...bedElement,
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
          gardenId="g1"
          area={mapArea}
          elements={[polyElement]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('map-area-polygon-a1')).toBeInTheDocument();
    expect(screen.getByTestId('map-area-a1')).toHaveAttribute('data-area-shape', 'polygon');
  });

  it('renders svg background image under the grid when url loads', async () => {
    const pngB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const bytes = Uint8Array.from(atob(pngB64), (ch) => ch.charCodeAt(0));
    apiFetchMock.mockResolvedValue(
      new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );
    const onSelectElement = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1"
          area={{ ...mapArea, backgroundImageUrl: '/gardens/g1/areas/ar1/background-image' }}
          elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={onSelectElement}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    await waitFor(() => {
      expect(apiFetchMock.mock.calls.some((c) => c[0] === '/gardens/g1/areas/ar1/background-image')).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId('map-background-image')).toBeInTheDocument();
    });
    const img = screen.getByTestId('map-background-image');
    expect(img).toHaveAttribute('width', String(mapArea.gridWidth * CELL));
    expect(img).toHaveAttribute('height', String(mapArea.gridHeight * CELL));
    expect(img).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
    expect(apiFetchMock.mock.calls.some((c) => c[0] === '/gardens/g1/areas/ar1/background-image')).toBe(true);
  });

  it('opacity slider updates rendered opacity and persists to localStorage', async () => {
    apiFetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      }),
    );
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1"
          area={{ ...mapArea, backgroundImageUrl: '/gardens/g1/areas/ar1/background-image' }}
          elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    const slider = await waitFor(() => screen.getByTestId('map-background-opacity'));
    fireEvent.change(slider, { target: { value: '30' } });
    const img = screen.getByTestId('map-background-image');
    expect(img.getAttribute('opacity')).toBe('0.3');
    expect(localStorage.getItem('mygarden.mapBgOpacity.g1.ar1')).toBe('30');
  });

  it('pan tool drags update viewport transform and do not start marquee selection', async () => {
    const onSelectionComplete = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1"
          area={mapArea}
          elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="pan"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    const before = parseMapViewportTransform(viewport);
    fireEvent.pointerDown(map, {
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerMove(map, {
      clientX: 50 + 12,
      clientY: 50 + 8,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });
    fireEvent.pointerMove(map, {
      clientX: 50 + 24,
      clientY: 50 + 16,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });
    const mid = parseMapViewportTransform(viewport);
    expect(mid.tx).toBeCloseTo(before.tx + 24, 5);
    expect(mid.ty).toBeCloseTo(before.ty + 16, 5);
    expect(screen.queryByTestId('map-selection-preview')).toBeNull();

    fireEvent.pointerUp(map, {
      clientX: 50 + 24,
      clientY: 50 + 16,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    const after = parseMapViewportTransform(viewport);
    expect(after.tx).toBeCloseTo(mid.tx, 5);
    expect(after.ty).toBeCloseTo(mid.ty, 5);
    expect(onSelectionComplete).not.toHaveBeenCalled();
  });

  it('Space+drag pans in select mode without starting a selection preview', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(map).toHaveStyle({ cursor: 'grab' });

    const before = parseMapViewportTransform(viewport);
    fireEvent.pointerDown(map, {
      clientX: 40,
      clientY: 40,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    expect(map).toHaveStyle({ cursor: 'grabbing' });

    fireEvent.pointerMove(map, {
      clientX: 40 + 30,
      clientY: 40 + 20,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });
    const after = parseMapViewportTransform(viewport);
    expect(after.tx).toBeCloseTo(before.tx + 30, 5);
    expect(after.ty).toBeCloseTo(before.ty + 20, 5);
    expect(after.scale).toBe(before.scale);
    expect(screen.queryByTestId('map-selection-preview')).toBeNull();

    fireEvent.pointerUp(map, {
      clientX: 40 + 30,
      clientY: 40 + 20,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    fireEvent.keyUp(document.body, { code: 'Space', key: ' ' });
  });

  it('Space+drag during polygon draw pans without adding vertices', async () => {
    const onSelectionComplete = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="draw-polygon"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    fireEvent.pointerDown(map, { clientX: CELL * 0.5, clientY: CELL * 0.5, button: 0, pointerId: 1 });
    fireEvent.pointerDown(map, { clientX: CELL * 2.5, clientY: CELL * 0.5, button: 0, pointerId: 2 });
    expect(screen.getByTestId('map-polygon-draft').querySelectorAll('circle')).toHaveLength(2);

    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    const before = parseMapViewportTransform(viewport);
    fireEvent.pointerDown(map, {
      clientX: 10,
      clientY: 10,
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerMove(map, {
      clientX: 40,
      clientY: 30,
      pointerId: 3,
      pointerType: 'mouse',
      buttons: 1,
    });
    const after = parseMapViewportTransform(viewport);
    expect(after.tx).not.toBe(before.tx);
    expect(screen.getByTestId('map-polygon-draft').querySelectorAll('circle')).toHaveLength(2);
    expect(onSelectionComplete).not.toHaveBeenCalled();

    fireEvent.pointerUp(map, {
      clientX: 40,
      clientY: 30,
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    fireEvent.keyUp(document.body, { code: 'Space', key: ' ' });
  });

  it('does not switch an in-progress marquee to Space+pan when Space is pressed mid-drag', async () => {
    const onSelectionComplete = vi.fn();
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={onSelectionComplete}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    const before = parseMapViewportTransform(viewport);
    fireEvent.pointerDown(map, {
      clientX: CELL * 0.5,
      clientY: CELL * 0.5,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
    });
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    fireEvent.pointerMove(map, {
      clientX: CELL * 2.5,
      clientY: CELL * 1.5,
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
    });
    expect(parseMapViewportTransform(viewport).tx).toBe(before.tx);
    expect(parseMapViewportTransform(viewport).ty).toBe(before.ty);
    expect(screen.getByTestId('map-selection-preview')).toBeInTheDocument();

    fireEvent.pointerUp(map, {
      clientX: CELL * 2.5,
      clientY: CELL * 1.5,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
    });
    fireEvent.keyUp(document.body, { code: 'Space', key: ' ' });
    expect(onSelectionComplete).toHaveBeenCalledTimes(1);
  });

  it('Shift+wheel pans horizontally without changing scale; Alt+wheel pans vertically; plain wheel changes scale', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const container = screen.getByTestId('grid-map-container');
    const viewport = screen.getByTestId('grid-map-viewport');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300,
      toJSON: () => ({}),
    } as DOMRect);

    const initial = parseMapViewportTransform(viewport);

    container.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 0,
        deltaY: 40,
        clientX: 100,
        clientY: 100,
        shiftKey: true,
      }),
    );
    await flushMapWheelRaf();
    await waitFor(() => {
      const v = parseMapViewportTransform(viewport);
      expect(v.scale).toBe(initial.scale);
      expect(v.tx).not.toBe(initial.tx);
      expect(v.ty).toBe(initial.ty);
    });
    const afterShift = parseMapViewportTransform(viewport);

    container.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 0,
        deltaY: 35,
        clientX: 100,
        clientY: 100,
        altKey: true,
      }),
    );
    await flushMapWheelRaf();
    await waitFor(() => {
      const v = parseMapViewportTransform(viewport);
      expect(v.scale).toBe(afterShift.scale);
      expect(v.tx).toBe(afterShift.tx);
      expect(v.ty).not.toBe(afterShift.ty);
    });
    const afterAlt = parseMapViewportTransform(viewport);

    container.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaX: 0,
        deltaY: -120,
        clientX: 150,
        clientY: 120,
      }),
    );
    await flushMapWheelRaf();
    await waitFor(() => {
      const v = parseMapViewportTransform(viewport);
      expect(v.scale).not.toBe(afterAlt.scale);
    });
  });

  it('fits the whole grid on mount, centered, even below MIN_MAP_SCALE for large grids', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();
    const bigMapArea: Area = { ...mapArea, gridWidth: 200, gridHeight: 200 };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={bigMapArea} elements={[]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const v = parseMapViewportTransform(screen.getByTestId('grid-map-viewport'));
    // world = 200 * 28 = 5600px; fit = (300 - 48) / 5600 = 0.045, below MIN_MAP_SCALE (0.35)
    expect(v.scale).toBeCloseTo(0.045, 9);
    expect(v.tx).toBe(0);
    expect(v.ty).toBe(0);
  });

  it('clamps the mount fit to MAX_MAP_SCALE for small grids in large containers', async () => {
    mockMapContainerSize(800, 600);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const v = parseMapViewportTransform(screen.getByTestId('grid-map-viewport'));
    expect(v.scale).toBe(4);
  });

  it('fit button restores the fitted view after zooming, and zoom out clamps at the fit scale', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const viewport = screen.getByTestId('grid-map-viewport');
    // world = 112 x 84; fit = min(352/112, 252/84) = 3
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom to fit/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);
    expect(parseMapViewportTransform(viewport).tx).toBe(0);
    expect(parseMapViewportTransform(viewport).ty).toBe(0);
  });

  it('zoom out button can go below MIN_MAP_SCALE down to the fit scale of a large grid', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();
    const bigMapArea: Area = { ...mapArea, gridWidth: 200, gridHeight: 200 };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={bigMapArea} elements={[]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const viewport = screen.getByTestId('grid-map-viewport');
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(0.045, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(0.045 * 1.15, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(0.045, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(0.045, 9);
  });

  it('double-click on empty background re-fits; double-click on an element does not', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    fireEvent.doubleClick(screen.getByTestId('map-area-a1'));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    fireEvent.doubleClick(map);
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);
  });

  it('double-click re-fits in readOnly mode', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
          readOnly
        />
      </I18nextProvider>,
    );

    const viewport = screen.getByTestId('grid-map-viewport');
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    fireEvent.doubleClick(screen.getByTestId('grid-map'));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);
  });

  it('double-tap on empty background re-fits', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    fireEvent.touchStart(map, { touches: [{ clientX: 30, clientY: 30 }] });
    fireEvent.touchEnd(map, { touches: [], changedTouches: [{ clientX: 30, clientY: 30 }] });
    fireEvent.touchStart(map, { touches: [{ clientX: 32, clientY: 31 }] });
    fireEvent.touchEnd(map, { touches: [], changedTouches: [{ clientX: 32, clientY: 31 }] });

    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);
  });

  it('re-fits on container resize until the user zooms manually', async () => {
    const roInstances: Array<{ cb: ResizeObserverCallback }> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        cb: ResizeObserverCallback;
        constructor(cb: ResizeObserverCallback) {
          this.cb = cb;
          roInstances.push(this);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const size = mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const viewport = screen.getByTestId('grid-map-viewport');
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3, 9);

    size.width = 300;
    size.height = 300;
    act(() => {
      roInstances.forEach((ro) => ro.cb([], ro as unknown as ResizeObserver));
    });
    // fit = min((300-48)/112, (300-48)/84) = 252/112 = 2.25
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(2.25, 9);

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    const manual = parseMapViewportTransform(viewport).scale;
    expect(manual).toBeCloseTo(2.25 * 1.15, 9);

    size.width = 400;
    act(() => {
      roInstances.forEach((ro) => ro.cb([], ro as unknown as ResizeObserver));
    });
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(manual, 9);
  });

  it('re-fits when switching to another area', async () => {
    mockMapContainerSize(400, 300);
    const i18nInstance = await testI18n();

    const { rerender } = render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={mapArea} elements={[bedElement]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const viewport = screen.getByTestId('grid-map-viewport');
    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(3.45, 9);

    const otherArea: Area = { ...mapArea, id: 'ar2', gridWidth: 8, gridHeight: 6 };
    rerender(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          gardenId="g1" area={otherArea} elements={[]}
          selectedElementId={null}
          onSelectElement={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    // world = 224 x 168; fit = min(352/224, 252/168) = 1.5
    expect(parseMapViewportTransform(viewport).scale).toBeCloseTo(1.5, 9);
  });
});
