import { describe, expect, it } from 'vitest';
import {
  applyTwoFingerGesture,
  computeFitView,
  FIT_VIEW_PADDING_PX,
  MAX_MAP_SCALE,
  MIN_MAP_SCALE,
  zoomToFocal,
  type MapView,
} from './view-helpers';

const rect = { left: 100, top: 50, width: 800, height: 600 };
const cx = rect.left + rect.width / 2;
const cy = rect.top + rect.height / 2;

function clientOfWorld(
  view: MapView,
  wx: number,
  wy: number,
  containerRect: typeof rect,
): { x: number; y: number } {
  const cxi = containerRect.left + containerRect.width / 2;
  const cyi = containerRect.top + containerRect.height / 2;
  return {
    x: cxi + wx * view.scale + view.tx,
    y: cyi + wy * view.scale + view.ty,
  };
}

describe('view-helpers zoomToFocal', () => {
  it('keeps the world point under the focal client position stable within epsilon', () => {
    const view: MapView = { tx: 20, ty: -30, scale: 1 };
    const focalX = 500;
    const focalY = 400;
    const wx = (focalX - cx - view.tx) / view.scale;
    const wy = (focalY - cy - view.ty) / view.scale;
    const next = zoomToFocal(view, rect, focalX, focalY, 1.5);
    const { x, y } = clientOfWorld(next, wx, wy, rect);
    expect(x).toBeCloseTo(focalX, 5);
    expect(y).toBeCloseTo(focalY, 5);
    expect(next.scale).toBeCloseTo(1.5, 5);
  });

  it('focal at container center with tx=ty=0 leaves tx and ty unchanged', () => {
    const view: MapView = { tx: 0, ty: 0, scale: 1 };
    const next = zoomToFocal(view, rect, cx, cy, 2);
    expect(next.tx).toBeCloseTo(0, 5);
    expect(next.ty).toBeCloseTo(0, 5);
    expect(next.scale).toBe(2);
  });

  it('when clamped scale equals current max scale, does not change tx or ty', () => {
    const view: MapView = { tx: 50, ty: 40, scale: MAX_MAP_SCALE };
    const next = zoomToFocal(view, rect, 200, 300, MAX_MAP_SCALE * 1.5);
    expect(next.scale).toBe(MAX_MAP_SCALE);
    expect(next.tx).toBe(view.tx);
    expect(next.ty).toBe(view.ty);
  });

  it('when clamped scale equals current min scale, does not change tx or ty', () => {
    const view: MapView = { tx: 10, ty: -20, scale: MIN_MAP_SCALE };
    const next = zoomToFocal(view, rect, 400, 350, MIN_MAP_SCALE * 0.5);
    expect(next.scale).toBe(MIN_MAP_SCALE);
    expect(next.tx).toBe(view.tx);
    expect(next.ty).toBe(view.ty);
  });

  it('accepts a minScale override below MIN_MAP_SCALE', () => {
    const view: MapView = { tx: 0, ty: 0, scale: 0.1 };
    const next = zoomToFocal(view, rect, 300, 200, 0.01, 0.05);
    expect(next.scale).toBeCloseTo(0.05, 9);
  });

  it('keeps the focal world point stable when zooming below MIN_MAP_SCALE with a minScale override', () => {
    const view: MapView = { tx: 15, ty: -10, scale: 0.2 };
    const focalX = 450;
    const focalY = 250;
    const wx = (focalX - cx - view.tx) / view.scale;
    const wy = (focalY - cy - view.ty) / view.scale;
    const next = zoomToFocal(view, rect, focalX, focalY, 0.08, 0.05);
    expect(next.scale).toBeCloseTo(0.08, 9);
    const { x, y } = clientOfWorld(next, wx, wy, rect);
    expect(x).toBeCloseTo(focalX, 5);
    expect(y).toBeCloseTo(focalY, 5);
  });
});

describe('view-helpers computeFitView', () => {
  it('centers the world (tx = ty = 0) and picks the limiting axis', () => {
    const fit = computeFitView(1000, 100, 500, 400, 24);
    expect(fit.tx).toBe(0);
    expect(fit.ty).toBe(0);
    // width-bound: (500 - 48) / 1000 = 0.452 vs (400 - 48) / 100 = 3.52
    expect(fit.scale).toBeCloseTo(0.452, 9);
  });

  it('uses the height when it is the limiting axis', () => {
    const fit = computeFitView(100, 1000, 500, 400, 24);
    expect(fit.scale).toBeCloseTo((400 - 48) / 1000, 9);
  });

  it('clamps to MAX_MAP_SCALE for small worlds in large containers', () => {
    const fit = computeFitView(50, 50, 800, 600, 24);
    expect(fit.scale).toBe(MAX_MAP_SCALE);
  });

  it('allows scales below MIN_MAP_SCALE so large grids can always be fully shown', () => {
    const fit = computeFitView(5600, 5600, 400, 300, 24);
    expect(fit.scale).toBeCloseTo((300 - 48) / 5600, 9);
    expect(fit.scale).toBeLessThan(MIN_MAP_SCALE);
  });

  it('applies the default padding when none is given', () => {
    const fit = computeFitView(1000, 1000, 500, 500);
    expect(fit.scale).toBeCloseTo((500 - 2 * FIT_VIEW_PADDING_PX) / 1000, 9);
  });

  it('stays positive for containers smaller than the padding', () => {
    const fit = computeFitView(1000, 1000, 20, 20, 24);
    expect(fit.scale).toBeGreaterThan(0);
  });
});

describe('view-helpers applyTwoFingerGesture', () => {
  it('translate-only input pans by the midpoint delta without changing scale', () => {
    const view: MapView = { tx: 5, ty: -8, scale: 1.2 };
    const next = applyTwoFingerGesture(
      view,
      rect,
      { a: { x: 100, y: 100 }, b: { x: 200, y: 100 } },
      { a: { x: 130, y: 120 }, b: { x: 230, y: 120 } },
    );
    expect(next.scale).toBe(view.scale);
    expect(next.tx).toBeCloseTo(view.tx + 30, 9);
    expect(next.ty).toBeCloseTo(view.ty + 20, 9);
  });

  it('pinch-only input zooms by the distance ratio anchored at the fixed midpoint', () => {
    const view: MapView = { tx: 10, ty: 20, scale: 1 };
    const prev = { a: { x: 150, y: 200 }, b: { x: 250, y: 200 } };
    const next = { a: { x: 100, y: 200 }, b: { x: 300, y: 200 } };
    const midX = 200;
    const midY = 200;
    const wx = (midX - cx - view.tx) / view.scale;
    const wy = (midY - cy - view.ty) / view.scale;
    const out = applyTwoFingerGesture(view, rect, prev, next);
    expect(out.scale).toBeCloseTo(2, 9);
    const { x, y } = clientOfWorld(out, wx, wy, rect);
    expect(x).toBeCloseTo(midX, 5);
    expect(y).toBeCloseTo(midY, 5);
  });

  it('combined input keeps the world point under the previous midpoint tracking to the next midpoint', () => {
    const view: MapView = { tx: -12, ty: 7, scale: 0.8 };
    const prev = { a: { x: 100, y: 100 }, b: { x: 200, y: 100 } };
    const next = { a: { x: 130, y: 120 }, b: { x: 330, y: 120 } };
    const prevMid = { x: 150, y: 100 };
    const nextMid = { x: 230, y: 120 };
    const wx = (prevMid.x - cx - view.tx) / view.scale;
    const wy = (prevMid.y - cy - view.ty) / view.scale;
    const out = applyTwoFingerGesture(view, rect, prev, next);
    expect(out.scale).toBeCloseTo(1.6, 9);
    const { x, y } = clientOfWorld(out, wx, wy, rect);
    expect(x).toBeCloseTo(nextMid.x, 5);
    expect(y).toBeCloseTo(nextMid.y, 5);
  });

  it('clamps the zoom to MAX_MAP_SCALE and to a custom minScale', () => {
    const view: MapView = { tx: 0, ty: 0, scale: 3 };
    const spread = applyTwoFingerGesture(
      view,
      rect,
      { a: { x: 150, y: 200 }, b: { x: 250, y: 200 } },
      { a: { x: 0, y: 200 }, b: { x: 400, y: 200 } },
    );
    expect(spread.scale).toBe(MAX_MAP_SCALE);

    const low: MapView = { tx: 0, ty: 0, scale: 0.1 };
    const squeeze = applyTwoFingerGesture(
      low,
      rect,
      { a: { x: 0, y: 200 }, b: { x: 400, y: 200 } },
      { a: { x: 195, y: 200 }, b: { x: 205, y: 200 } },
      0.05,
    );
    expect(squeeze.scale).toBeCloseTo(0.05, 9);
  });

  it('degenerate zero finger distance pans without producing NaN', () => {
    const view: MapView = { tx: 0, ty: 0, scale: 1 };
    const out = applyTwoFingerGesture(
      view,
      rect,
      { a: { x: 100, y: 100 }, b: { x: 100, y: 100 } },
      { a: { x: 110, y: 105 }, b: { x: 110, y: 105 } },
    );
    expect(out.scale).toBe(1);
    expect(out.tx).toBeCloseTo(10, 9);
    expect(out.ty).toBeCloseTo(5, 9);
  });
});
