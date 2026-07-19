import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/areas';
import { LONG_PRESS_MS } from './gesture-helpers';
import { GardenOverviewMap } from './GardenOverviewMap';
import { OVERVIEW_PX_PER_METER, OVERVIEW_WORLD_MARGIN_M } from './overview-helpers';

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
          areas: {
            overviewAriaLabel: 'Garden overview map',
            overviewTileAria: 'Open area {{title}}',
          },
          garden: {
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

async function renderOverview(
  areas: Area[],
  handlers?: Partial<{ onOpenArea: (id: string) => void; onPlaceArea: (id: string, x: number, y: number) => void }>,
) {
  const onOpenArea = handlers?.onOpenArea ?? vi.fn();
  const onPlaceArea = handlers?.onPlaceArea ?? vi.fn();
  const instance = await testI18n();
  const utils = render(
    <I18nextProvider i18n={instance}>
      <GardenOverviewMap areas={areas} onOpenArea={onOpenArea} onPlaceArea={onPlaceArea} />
    </I18nextProvider>,
  );
  return { ...utils, onOpenArea, onPlaceArea };
}

/** Mock the overview container's measured size before mount (jsdom rects are 0×0). */
function mockContainerSize(width: number, height: number) {
  const orig = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.dataset?.testid === 'garden-overview-container') {
      return {
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return orig.call(this);
  });
}

function parseViewportTransform(viewport: HTMLElement): { tx: number; ty: number; scale: number } {
  const m = viewport.style.transform.match(
    /translate\(calc\(-50% \+ ([-\d.]+)px\), calc\(-50% \+ ([-\d.]+)px\)\) scale\(([-\d.]+)\)/,
  );
  if (!m) throw new Error(`Could not parse transform: ${viewport.style.transform}`);
  return { tx: Number(m[1]), ty: Number(m[2]), scale: Number(m[3]) };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GardenOverviewMap', () => {
  it('renders placed areas to scale in the shared meters space', async () => {
    await renderOverview([
      makeArea({ id: 'a', overviewX: 0, overviewY: 0, gridWidth: 10, gridHeight: 8, cellSizeMeters: 0.5 }),
    ]);
    const tile = screen.getByTestId('overview-tile-a');
    expect(tile.dataset.placed).toBe('true');
    const rect = tile.querySelector('rect')!;
    // 10×8 cells at 0.5 m = 5×4 m.
    expect(rect.getAttribute('width')).toBe(String(5 * OVERVIEW_PX_PER_METER));
    expect(rect.getAttribute('height')).toBe(String(4 * OVERVIEW_PX_PER_METER));
    // Tile at (0,0) sits one world margin from the canvas edge.
    expect(rect.getAttribute('x')).toBe(String(OVERVIEW_WORLD_MARGIN_M * OVERVIEW_PX_PER_METER));
    expect(rect.getAttribute('y')).toBe(String(OVERVIEW_WORLD_MARGIN_M * OVERVIEW_PX_PER_METER));
  });

  it('labels each tile with its title', async () => {
    await renderOverview([makeArea({ id: 'a', title: 'Front yard', overviewX: 0, overviewY: 0 })]);
    expect(screen.getByTestId('overview-tile-a').textContent).toContain('Front yard');
  });

  it('renders unplaced areas as a dashed auto-layout row', async () => {
    await renderOverview([
      makeArea({ id: 'u1', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 }),
      makeArea({ id: 'u2', gridWidth: 2, gridHeight: 2, cellSizeMeters: 1 }),
    ]);
    const u1 = screen.getByTestId('overview-tile-u1');
    const u2 = screen.getByTestId('overview-tile-u2');
    expect(u1.dataset.placed).toBe('false');
    expect(u2.dataset.placed).toBe('false');
    const r1 = u1.querySelector('rect')!;
    const r2 = u2.querySelector('rect')!;
    expect(r1.getAttribute('stroke-dasharray')).toBeTruthy();
    // Same row, left to right.
    expect(r1.getAttribute('y')).toBe(r2.getAttribute('y'));
    expect(Number(r2.getAttribute('x'))).toBeGreaterThan(Number(r1.getAttribute('x')));
  });

  it('opens an area on click (sub-threshold press)', async () => {
    const { onOpenArea, onPlaceArea } = await renderOverview([
      makeArea({ id: 'a', overviewX: 0, overviewY: 0 }),
    ]);
    const tile = screen.getByTestId('overview-tile-a');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(tile, { pointerId: 1, clientX: 101, clientY: 100 });
    expect(onOpenArea).toHaveBeenCalledTimes(1);
    expect(onOpenArea).toHaveBeenCalledWith('a');
    expect(onPlaceArea).not.toHaveBeenCalled();
  });

  it('opens an area with the keyboard', async () => {
    const { onOpenArea } = await renderOverview([makeArea({ id: 'a', overviewX: 0, overviewY: 0 })]);
    fireEvent.keyDown(screen.getByTestId('overview-tile-a'), { key: 'Enter' });
    expect(onOpenArea).toHaveBeenCalledWith('a');
  });

  it('drags a tile with the mouse and reports the drop position in meters', async () => {
    const { onOpenArea, onPlaceArea } = await renderOverview([
      makeArea({ id: 'a', overviewX: 1, overviewY: 2 }),
    ]);
    const tile = screen.getByTestId('overview-tile-a');
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    // View scale is 1 (no measured container in jsdom): 2 m right, 0.5 m down.
    fireEvent.pointerMove(svg, {
      pointerId: 1,
      clientX: 100 + 2 * OVERVIEW_PX_PER_METER,
      clientY: 100 + 0.5 * OVERVIEW_PX_PER_METER,
    });
    fireEvent.pointerUp(svg, {
      pointerId: 1,
      clientX: 100 + 2 * OVERVIEW_PX_PER_METER,
      clientY: 100 + 0.5 * OVERVIEW_PX_PER_METER,
    });
    expect(onPlaceArea).toHaveBeenCalledTimes(1);
    expect(onPlaceArea).toHaveBeenCalledWith('a', 3, 2.5);
    expect(onOpenArea).not.toHaveBeenCalled();
  });

  it('moves the dragged tile per frame without re-render, then clears the offset', async () => {
    await renderOverview([makeArea({ id: 'a', overviewX: 0, overviewY: 0 })]);
    const tile = screen.getByTestId('overview-tile-a');
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(tile, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: OVERVIEW_PX_PER_METER, clientY: 0 });
    expect(screen.getByTestId('overview-tile-a').getAttribute('transform')).toBe(
      `translate(${OVERVIEW_PX_PER_METER}, 0)`,
    );
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: OVERVIEW_PX_PER_METER, clientY: 0 });
    expect(screen.getByTestId('overview-tile-a').getAttribute('transform')).toBeNull();
  });

  it('drags a tile with touch after a long-press', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { onOpenArea, onPlaceArea } = await renderOverview([
      makeArea({ id: 'u1', gridWidth: 2, gridHeight: 2 }),
    ]);
    const tile = screen.getByTestId('overview-tile-u1');
    const container = screen.getByTestId('garden-overview-container');
    fireEvent.touchStart(tile, {
      touches: [{ identifier: 1, clientX: 100, clientY: 100 }],
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    fireEvent.touchMove(container, {
      touches: [{ identifier: 1, clientX: 100 + 2 * OVERVIEW_PX_PER_METER, clientY: 100 }],
    });
    fireEvent.touchEnd(container, { touches: [] });
    // Unplaced tile started the auto-layout row at (0,0); dragged 2 m right.
    expect(onPlaceArea).toHaveBeenCalledWith('u1', 2, 0);
    expect(onOpenArea).not.toHaveBeenCalled();
  });

  it('opens an area on a quick tap (before the long-press fires)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { onOpenArea, onPlaceArea } = await renderOverview([
      makeArea({ id: 'a', overviewX: 0, overviewY: 0 }),
    ]);
    const tile = screen.getByTestId('overview-tile-a');
    const container = screen.getByTestId('garden-overview-container');
    fireEvent.touchStart(tile, {
      touches: [{ identifier: 1, clientX: 100, clientY: 100 }],
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.touchEnd(container, { touches: [] });
    expect(onOpenArea).toHaveBeenCalledWith('a');
    expect(onPlaceArea).not.toHaveBeenCalled();
  });

  it('pans on background drag without opening anything', async () => {
    const { onOpenArea, onPlaceArea } = await renderOverview([
      makeArea({ id: 'a', overviewX: 0, overviewY: 0 }),
    ]);
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 50, clientY: 30 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 50, clientY: 30 });
    const view = parseViewportTransform(screen.getByTestId('garden-overview-viewport'));
    expect(view.tx).toBe(40);
    expect(view.ty).toBe(20);
    expect(onOpenArea).not.toHaveBeenCalled();
    expect(onPlaceArea).not.toHaveBeenCalled();
  });

  it('fits the world to the container on mount and via the fit button', async () => {
    mockContainerSize(800, 600);
    await renderOverview([
      makeArea({ id: 'a', overviewX: 0, overviewY: 0, gridWidth: 4, gridHeight: 4, cellSizeMeters: 1 }),
    ]);
    // World = 4 m + 2×2 m margin = 8 m = 192 px; fit = min(752/192, 552/192).
    const expectedScale = (600 - 48) / (8 * OVERVIEW_PX_PER_METER);
    const viewport = screen.getByTestId('garden-overview-viewport');
    expect(parseViewportTransform(viewport).scale).toBeCloseTo(expectedScale, 5);

    // Pan away, then the fit control restores the fitted view.
    const svg = screen.getByTestId('garden-overview-map');
    fireEvent.pointerDown(svg, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 120, clientY: 0 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 120, clientY: 0 });
    expect(parseViewportTransform(viewport).tx).toBe(120);
    fireEvent.click(screen.getByTestId('overview-zoom-fit'));
    const after = parseViewportTransform(viewport);
    expect(after.tx).toBe(0);
    expect(after.scale).toBeCloseTo(expectedScale, 5);
  });

  it('zooms with the wheel', async () => {
    await renderOverview([makeArea({ id: 'a', overviewX: 0, overviewY: 0 })]);
    const container = screen.getByTestId('garden-overview-container');
    fireEvent.wheel(container, { deltaY: -100, clientX: 0, clientY: 0 });
    const view = parseViewportTransform(screen.getByTestId('garden-overview-viewport'));
    expect(view.scale).toBeCloseTo(Math.exp(0.1), 5);
  });
});
