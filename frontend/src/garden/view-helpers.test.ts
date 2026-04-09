import { describe, expect, it } from 'vitest';
import {
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
});
