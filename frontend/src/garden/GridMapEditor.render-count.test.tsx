/**
 * Render-count regression tests (E2): pins the E1 guarantee that per-frame
 * drag updates (pan, pinch, element move, resize, reshape) never re-render
 * React — a full drag causes O(1) commits and `GridMapAreasSvg` does not
 * re-render at all mid-gesture. These tests fail on the pre-phase code, where
 * move/resize/reshape called setState per pointer/touch move.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { Profiler } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area } from '../api/areas';
import type { Element } from '../api/elements';
import { CELL, GridMapEditor, type GridMapEditorProps } from './GridMapEditor';

const counters = vi.hoisted(() => ({ areasSvg: 0, commits: 0 }));

/**
 * Wrap the real GridMapAreasSvg in a counting memo component. The wrapper uses
 * the same default shallow prop comparison as the real component's memo, so
 * `counters.areasSvg` counts exactly the renders the real component would run.
 */
vi.mock('./GridMapAreasSvg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./GridMapAreasSvg')>();
  const { createElement, memo } = await import('react');
  const Actual = actual.GridMapAreasSvg;
  const Counting = memo(function CountingGridMapAreasSvg(
    props: import('./GridMapAreasSvg').GridMapAreasSvgProps,
  ) {
    counters.areasSvg += 1;
    return createElement(Actual, props);
  });
  return { ...actual, GridMapAreasSvg: Counting };
});

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

const triangleElement: Element = {
  id: 'p1',
  areaId: 'ar1',
  name: 'Pond',
  type: 'other',
  color: '#3366cc',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 2,
  shape: {
    kind: 'polygon',
    vertices: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ],
  },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: {} } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

function mockMapContainerSize(width: number, height: number) {
  const orig = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.dataset?.testid === 'grid-map-container') {
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

async function renderEditor(props: Partial<GridMapEditorProps> = {}) {
  const i18nInstance = await testI18n();
  const merged: GridMapEditorProps = {
    gardenId: 'g1',
    area: mapArea,
    elements: [bedElement],
    selectedElementId: null,
    onSelectElement: vi.fn(),
    onSelectionComplete: vi.fn(),
    ...props,
  };
  const utils = render(
    <I18nextProvider i18n={i18nInstance}>
      <Profiler
        id="grid-map-editor"
        onRender={() => {
          counters.commits += 1;
        }}
      >
        <GridMapEditor {...merged} />
      </Profiler>
    </I18nextProvider>,
  );
  return { ...utils, props: merged };
}

const mouseEvt = (clientX: number, clientY: number, extra: Record<string, unknown> = {}) => ({
  clientX,
  clientY,
  pointerId: 1,
  pointerType: 'mouse',
  button: 0,
  buttons: 1,
  ...extra,
});

beforeEach(() => {
  counters.areasSvg = 0;
  counters.commits = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GridMapEditor render counts during drags (E2)', () => {
  it('a background pan drag causes no re-renders per frame and O(1) commits total', async () => {
    mockMapContainerSize(400, 300);
    await renderEditor();
    const map = screen.getByTestId('grid-map');
    const viewport = screen.getByTestId('grid-map-viewport');

    const commitsBefore = counters.commits;
    const areasBefore = counters.areasSvg;
    fireEvent.pointerDown(map, mouseEvt(50, 50));
    const transformAtStart = viewport.style.transform;
    for (let i = 1; i <= 15; i += 1) {
      fireEvent.pointerMove(map, mouseEvt(50 + i * 4, 50 + i * 2));
    }
    // The view really moved — via direct DOM writes, not React.
    expect(viewport.style.transform).not.toBe(transformAtStart);
    expect(counters.commits).toBe(commitsBefore);
    fireEvent.pointerUp(map, mouseEvt(110, 80, { buttons: 0 }));

    expect(counters.commits - commitsBefore).toBeLessThanOrEqual(2);
    expect(counters.areasSvg - areasBefore).toBe(0);
  });

  it('a two-finger pinch/pan causes no re-renders per frame and O(1) commits total', async () => {
    mockMapContainerSize(400, 300);
    await renderEditor();
    const container = screen.getByTestId('grid-map-container');
    const viewport = screen.getByTestId('grid-map-viewport');

    const commitsBefore = counters.commits;
    const areasBefore = counters.areasSvg;
    fireEvent.touchStart(container, {
      touches: [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 200, clientY: 100 },
      ],
    });
    const transformAtStart = viewport.style.transform;
    for (let i = 1; i <= 15; i += 1) {
      fireEvent.touchMove(container, {
        touches: [
          { identifier: 0, clientX: 100 - i * 3, clientY: 100 + i },
          { identifier: 1, clientX: 200 + i * 3, clientY: 100 + i },
        ],
      });
    }
    expect(viewport.style.transform).not.toBe(transformAtStart);
    expect(counters.commits).toBe(commitsBefore);
    fireEvent.touchEnd(container, { touches: [], changedTouches: [] });

    expect(counters.commits - commitsBefore).toBeLessThanOrEqual(2);
    expect(counters.areasSvg - areasBefore).toBe(0);
  });

  it('an element move drag re-renders only at gesture begin/end', async () => {
    mockMapContainerSize(400, 300);
    await renderEditor({ onMoveElement: vi.fn() });
    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    const commitsBefore = counters.commits;
    const areasBefore = counters.areasSvg;
    fireEvent.pointerDown(screen.getByTestId('map-area-a1'), mouseEvt(14, 7));
    const commitsAfterBegin = counters.commits;
    const areasAfterBegin = counters.areasSvg;

    for (let i = 1; i <= 15; i += 1) {
      fireEvent.pointerMove(map, mouseEvt(14 + i * 3, 7));
    }
    // The preview really tracked the pointer — via direct DOM writes.
    expect(screen.getByTestId('map-move-preview').getAttribute('x')).toBe(String(2 * CELL));
    // ...but no React work happened during the 15 move frames.
    expect(counters.commits).toBe(commitsAfterBegin);
    expect(counters.areasSvg).toBe(areasAfterBegin);

    fireEvent.pointerUp(map, mouseEvt(59, 7, { buttons: 0 }));

    // Full drag: begin + end commits only.
    expect(counters.commits - commitsBefore).toBeLessThanOrEqual(3);
    expect(counters.areasSvg - areasBefore).toBeLessThanOrEqual(2);
  });

  it('a rectangle resize drag re-renders only at gesture begin/end and never re-renders GridMapAreasSvg', async () => {
    mockMapContainerSize(400, 300);
    await renderEditor({ selectedElementId: 'a1', onResizeElement: vi.fn() });
    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    const commitsBefore = counters.commits;
    const areasBefore = counters.areasSvg;
    fireEvent.pointerDown(screen.getByTestId('map-resize-handle-se'), mouseEvt(2 * CELL, CELL));
    const commitsAfterBegin = counters.commits;

    for (let i = 1; i <= 15; i += 1) {
      fireEvent.pointerMove(map, mouseEvt(2 * CELL + i, CELL + i));
    }
    // The preview really resized — via direct DOM writes.
    expect(screen.getByTestId('map-resize-preview').getAttribute('width')).toBe(String(3 * CELL));
    expect(counters.commits).toBe(commitsAfterBegin);

    fireEvent.pointerUp(map, mouseEvt(2 * CELL + 15, CELL + 15, { buttons: 0 }));

    expect(counters.commits - commitsBefore).toBeLessThanOrEqual(3);
    // Resize never touches GridMapAreasSvg props.
    expect(counters.areasSvg - areasBefore).toBe(0);
  });

  it('a polygon reshape drag re-renders only at gesture begin/end and never re-renders GridMapAreasSvg', async () => {
    mockMapContainerSize(400, 300);
    await renderEditor({
      elements: [triangleElement],
      selectedElementId: 'p1',
      onReshapeElement: vi.fn(),
    });
    const map = screen.getByTestId('grid-map');
    mockGridMapBoundingRect(map, mapArea.gridWidth, mapArea.gridHeight);

    const commitsBefore = counters.commits;
    const areasBefore = counters.areasSvg;
    fireEvent.pointerDown(screen.getByTestId('map-reshape-handle-1'), mouseEvt(2 * CELL, 0));
    const commitsAfterBegin = counters.commits;

    for (let i = 1; i <= 15; i += 1) {
      fireEvent.pointerMove(map, mouseEvt(2 * CELL + i * 2, 0));
    }
    // The preview polygon really tracked the vertex — via direct DOM writes.
    expect(screen.getByTestId('map-reshape-preview').getAttribute('points')).toContain(
      `${2 * CELL + 30},0`,
    );
    expect(counters.commits).toBe(commitsAfterBegin);

    fireEvent.pointerUp(map, mouseEvt(2 * CELL + 30, 0, { buttons: 0 }));

    expect(counters.commits - commitsBefore).toBeLessThanOrEqual(3);
    expect(counters.areasSvg - areasBefore).toBe(0);
  });
});
