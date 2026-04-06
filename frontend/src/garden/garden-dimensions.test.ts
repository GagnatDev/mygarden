import { describe, expect, it } from 'vitest';
import {
  MAX_GRID_CELLS,
  metersToGridDimensions,
  snapCellSizeToStepMeters,
  isCellSizeTenCmStep,
} from './garden-dimensions';

describe('isCellSizeTenCmStep', () => {
  it('accepts tenths of a meter', () => {
    expect(isCellSizeTenCmStep(0.1)).toBe(true);
    expect(isCellSizeTenCmStep(0.5)).toBe(true);
    expect(isCellSizeTenCmStep(1)).toBe(true);
  });

  it('rejects non-tenths', () => {
    expect(isCellSizeTenCmStep(0.15)).toBe(false);
    expect(isCellSizeTenCmStep(0.333)).toBe(false);
  });
});

describe('snapCellSizeToStepMeters', () => {
  it('snaps and clamps to 0.1 … 1', () => {
    expect(snapCellSizeToStepMeters(0.44)).toBe(0.4);
    expect(snapCellSizeToStepMeters(0.46)).toBe(0.5);
    expect(snapCellSizeToStepMeters(0.02)).toBe(0.1);
    expect(snapCellSizeToStepMeters(50)).toBe(1);
  });
});

describe('metersToGridDimensions', () => {
  it('rounds meters per cell to grid size', () => {
    expect(metersToGridDimensions(10, 12, 1)).toEqual({
      ok: true,
      gridWidth: 10,
      gridHeight: 12,
    });
    expect(metersToGridDimensions(5, 5, 0.5)).toEqual({
      ok: true,
      gridWidth: 10,
      gridHeight: 10,
    });
  });

  it('uses symmetric rounding', () => {
    expect(metersToGridDimensions(10.4, 10.4, 1)).toEqual({
      ok: true,
      gridWidth: 10,
      gridHeight: 10,
    });
    expect(metersToGridDimensions(10.5, 10.5, 1)).toEqual({
      ok: true,
      gridWidth: 11,
      gridHeight: 11,
    });
  });

  it('rejects grid larger than max cells', () => {
    const w = (MAX_GRID_CELLS + 1) * 1;
    expect(metersToGridDimensions(w, 5, 1)).toEqual({ ok: false, reason: 'gridOverflow' });
  });

  it('rejects grid smaller than one cell after rounding', () => {
    expect(metersToGridDimensions(0.15, 5, 1)).toEqual({ ok: false, reason: 'gridTooSmall' });
  });

  it('rejects non-positive map dimensions', () => {
    expect(metersToGridDimensions(0, 5, 0.5)).toEqual({
      ok: false,
      reason: 'invalidCellOrDimensions',
    });
    expect(metersToGridDimensions(5, -1, 1)).toEqual({
      ok: false,
      reason: 'invalidCellOrDimensions',
    });
  });

  it('rejects invalid cell size', () => {
    expect(metersToGridDimensions(5, 5, 0.15)).toEqual({
      ok: false,
      reason: 'invalidCellOrDimensions',
    });
    expect(metersToGridDimensions(5, 5, 2)).toEqual({
      ok: false,
      reason: 'invalidCellOrDimensions',
    });
  });
});
