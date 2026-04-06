/** Max cells per axis (matches backend). */
export const MAX_GRID_CELLS = 200;

/** Cell size step and bounds (10 cm … 1 m). */
export const CELL_SIZE_STEP_METERS = 0.1;
export const CELL_SIZE_MIN_METERS = 0.1;
export const CELL_SIZE_MAX_METERS = 1;

/** Suggested range for map width/height in the create form (meters). */
export const MAP_METERS_MIN = 0.5;
export const MAP_METERS_MAX = 200;

export type MetersToGridFailureReason = 'gridTooSmall' | 'gridOverflow' | 'invalidCellOrDimensions';

export type MetersToGridResult =
  | { ok: true; gridWidth: number; gridHeight: number }
  | { ok: false; reason: MetersToGridFailureReason };

const FLOAT_EPS = 1e-6;

/** True if `value` is a multiple of 0.1 m within float tolerance. */
export function isCellSizeTenCmStep(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const tenths = Math.round(value * 10);
  return Math.abs(value - tenths / 10) < FLOAT_EPS;
}

/** Snap to nearest 0.1 m, clamped to [0.1, 1]. */
export function snapCellSizeToStepMeters(value: number): number {
  if (!Number.isFinite(value)) return CELL_SIZE_MIN_METERS;
  const snapped = Math.round(value / CELL_SIZE_STEP_METERS) * CELL_SIZE_STEP_METERS;
  return Math.min(
    CELL_SIZE_MAX_METERS,
    Math.max(CELL_SIZE_MIN_METERS, snapped),
  );
}

/**
 * Converts map size in meters + cell size into integer grid dimensions.
 * Uses Math.round(meters / cell) per plan; fails if result is outside 1…MAX_GRID_CELLS.
 */
export function metersToGridDimensions(
  widthMeters: number,
  heightMeters: number,
  cellSizeMeters: number,
): MetersToGridResult {
  if (
    !Number.isFinite(widthMeters) ||
    !Number.isFinite(heightMeters) ||
    !Number.isFinite(cellSizeMeters) ||
    cellSizeMeters <= 0 ||
    widthMeters <= 0 ||
    heightMeters <= 0
  ) {
    return { ok: false, reason: 'invalidCellOrDimensions' };
  }
  if (
    cellSizeMeters < CELL_SIZE_MIN_METERS - FLOAT_EPS ||
    cellSizeMeters > CELL_SIZE_MAX_METERS + FLOAT_EPS ||
    !isCellSizeTenCmStep(cellSizeMeters)
  ) {
    return { ok: false, reason: 'invalidCellOrDimensions' };
  }

  const rawW = Math.round(widthMeters / cellSizeMeters);
  const rawH = Math.round(heightMeters / cellSizeMeters);
  if (rawW < 1 || rawH < 1) {
    return { ok: false, reason: 'gridTooSmall' };
  }
  if (rawW > MAX_GRID_CELLS || rawH > MAX_GRID_CELLS) {
    return { ok: false, reason: 'gridOverflow' };
  }
  return { ok: true, gridWidth: rawW, gridHeight: rawH };
}
