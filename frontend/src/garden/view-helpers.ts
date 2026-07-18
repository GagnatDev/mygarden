/** Matches map zoom limits in GridMapEditor. */
export const MIN_MAP_SCALE = 0.35;
export const MAX_MAP_SCALE = 4;

export interface MapView {
  tx: number;
  ty: number;
  scale: number;
}

export interface ContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clampScale(n: number, minScale = MIN_MAP_SCALE): number {
  return Math.max(minScale, Math.min(MAX_MAP_SCALE, n));
}

/** Default screen padding around a fitted map, in CSS pixels. */
export const FIT_VIEW_PADDING_PX = 24;

/**
 * Compute the view that shows the whole world (grid) centered in the container
 * with `paddingPx` breathing room on every side. The fit scale is clamped to
 * MAX_MAP_SCALE but deliberately allowed below MIN_MAP_SCALE so grids larger
 * than the viewport can always be fully zoomed out; callers should use
 * `min(MIN_MAP_SCALE, fitScale)` as the effective minimum zoom.
 * Centering means tx = ty = 0 in GridMapEditor's centered transform model.
 */
export function computeFitView(
  worldW: number,
  worldH: number,
  containerW: number,
  containerH: number,
  paddingPx = FIT_VIEW_PADDING_PX,
): MapView {
  const availW = Math.max(1, containerW - 2 * paddingPx);
  const availH = Math.max(1, containerH - 2 * paddingPx);
  const fit = Math.min(availW / Math.max(1, worldW), availH / Math.max(1, worldH));
  const scale = Math.min(MAX_MAP_SCALE, fit);
  return { tx: 0, ty: 0, scale };
}

/**
 * Zoom toward a focal point in client coordinates while keeping the world point
 * under that focal fixed. Uses the same transform model as GridMapEditor:
 * `translate` from container center plus `scale` (transform-origin center).
 * `minScale` may be below MIN_MAP_SCALE when a fitted view requires it.
 */
export function zoomToFocal(
  view: MapView,
  containerRect: ContainerRect,
  focalClientX: number,
  focalClientY: number,
  nextScale: number,
  minScale = MIN_MAP_SCALE,
): MapView {
  const { tx, ty, scale: s } = view;
  const s2 = clampScale(nextScale, minScale);
  if (Math.abs(s2 - s) < 1e-9) {
    return { tx, ty, scale: s2 };
  }
  const cx = containerRect.left + containerRect.width / 2;
  const cy = containerRect.top + containerRect.height / 2;
  const wx = (focalClientX - cx - tx) / s;
  const wy = (focalClientY - cy - ty) / s;
  return {
    scale: s2,
    tx: tx + wx * (s - s2),
    ty: ty + wy * (s - s2),
  };
}

export interface GesturePoint {
  x: number;
  y: number;
}

/**
 * Apply one frame of a combined two-finger gesture: pan by the finger-midpoint
 * delta, then zoom by the finger-distance ratio around the new midpoint. Pure
 * translation (distance unchanged) pans, pure spread (midpoint unchanged)
 * zooms, and mixed input does both — the world point that was under the
 * previous midpoint tracks the fingers to the next midpoint.
 */
export function applyTwoFingerGesture(
  view: MapView,
  containerRect: ContainerRect,
  prev: { a: GesturePoint; b: GesturePoint },
  next: { a: GesturePoint; b: GesturePoint },
  minScale = MIN_MAP_SCALE,
): MapView {
  const prevMidX = (prev.a.x + prev.b.x) / 2;
  const prevMidY = (prev.a.y + prev.b.y) / 2;
  const nextMidX = (next.a.x + next.b.x) / 2;
  const nextMidY = (next.a.y + next.b.y) / 2;
  const panned: MapView = {
    scale: view.scale,
    tx: view.tx + (nextMidX - prevMidX),
    ty: view.ty + (nextMidY - prevMidY),
  };
  const prevDist = Math.hypot(prev.a.x - prev.b.x, prev.a.y - prev.b.y);
  const nextDist = Math.hypot(next.a.x - next.b.x, next.a.y - next.b.y);
  if (prevDist <= 0 || nextDist <= 0) return panned;
  const nextScale = clampScale(view.scale * (nextDist / prevDist), minScale);
  return zoomToFocal(panned, containerRect, nextMidX, nextMidY, nextScale, minScale);
}
