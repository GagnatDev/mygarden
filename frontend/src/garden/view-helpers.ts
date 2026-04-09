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

function clampScale(n: number): number {
  return Math.max(MIN_MAP_SCALE, Math.min(MAX_MAP_SCALE, n));
}

/**
 * Zoom toward a focal point in client coordinates while keeping the world point
 * under that focal fixed. Uses the same transform model as GridMapEditor:
 * `translate` from container center plus `scale` (transform-origin center).
 */
export function zoomToFocal(
  view: MapView,
  containerRect: ContainerRect,
  focalClientX: number,
  focalClientY: number,
  nextScale: number,
): MapView {
  const { tx, ty, scale: s } = view;
  const s2 = clampScale(nextScale);
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
