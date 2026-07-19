/**
 * Pure layout helpers for the garden overview map (F2, R8).
 *
 * The overview renders every area of a garden as a rectangle in one shared,
 * meters-based coordinate space so areas stay mutually to scale regardless of
 * their cell sizes. Placed areas use their `overviewX`/`overviewY` (meters,
 * garden-level coordinates, may be negative); unplaced areas (null coords)
 * are auto-laid out in a row below the placed content until dragged.
 */
import type { Area } from '../api/areas';

/** CSS pixels per meter in the overview world space (before pan/zoom). */
export const OVERVIEW_PX_PER_METER = 24;
/** Gap between auto-laid-out unplaced tiles, and above their row, in meters. */
export const OVERVIEW_UNPLACED_GAP_M = 1;
/** Breathing room around the world content, in meters. */
export const OVERVIEW_WORLD_MARGIN_M = 2;
/** World size when the garden has no areas at all, in meters. */
export const OVERVIEW_EMPTY_WORLD_M = 10;
/** Placement snap while dragging tiles, in meters. */
export const OVERVIEW_SNAP_M = 0.1;

/** Area footprint in meters. */
export function areaSizeMeters(
  area: Pick<Area, 'gridWidth' | 'gridHeight' | 'cellSizeMeters'>,
): { wM: number; hM: number } {
  return {
    wM: area.gridWidth * area.cellSizeMeters,
    hM: area.gridHeight * area.cellSizeMeters,
  };
}

export function isAreaPlaced(area: Pick<Area, 'overviewX' | 'overviewY'>): boolean {
  return typeof area.overviewX === 'number' && typeof area.overviewY === 'number';
}

export interface OverviewTile {
  areaId: string;
  title: string;
  /** Tile top-left in garden meters. */
  xM: number;
  yM: number;
  wM: number;
  hM: number;
  /** False for tiles sitting in the auto-layout row (overviewX/Y null). */
  placed: boolean;
}

/**
 * Lay every area out as a tile. Placed areas keep their stored coordinates;
 * unplaced areas form a left-to-right row starting at the placed content's
 * left edge, one gap below its bottom edge (at the origin for an all-unplaced
 * garden). Input order is preserved so tiles match the areas list.
 */
export function computeOverviewTiles(areas: readonly Area[]): OverviewTile[] {
  const placed = areas.filter(isAreaPlaced);
  let rowX = 0;
  let rowY = 0;
  if (placed.length > 0) {
    rowX = Math.min(...placed.map((a) => a.overviewX!));
    rowY =
      Math.max(...placed.map((a) => a.overviewY! + areaSizeMeters(a).hM)) +
      OVERVIEW_UNPLACED_GAP_M;
  }
  return areas.map((area) => {
    const { wM, hM } = areaSizeMeters(area);
    if (isAreaPlaced(area)) {
      return { areaId: area.id, title: area.title, xM: area.overviewX!, yM: area.overviewY!, wM, hM, placed: true };
    }
    const tile = { areaId: area.id, title: area.title, xM: rowX, yM: rowY, wM, hM, placed: false };
    rowX += wM + OVERVIEW_UNPLACED_GAP_M;
    return tile;
  });
}

export interface OverviewWorld {
  /** Garden meters at the world's top-left corner (margin included). */
  originXM: number;
  originYM: number;
  /** World canvas size in meters (margin included). */
  widthM: number;
  heightM: number;
  /** World canvas size in CSS pixels at scale 1. */
  widthPx: number;
  heightPx: number;
}

/** Bounding box of all tiles plus a margin; a fixed square when there are none. */
export function computeOverviewWorld(tiles: readonly OverviewTile[]): OverviewWorld {
  if (tiles.length === 0) {
    return {
      originXM: 0,
      originYM: 0,
      widthM: OVERVIEW_EMPTY_WORLD_M,
      heightM: OVERVIEW_EMPTY_WORLD_M,
      widthPx: OVERVIEW_EMPTY_WORLD_M * OVERVIEW_PX_PER_METER,
      heightPx: OVERVIEW_EMPTY_WORLD_M * OVERVIEW_PX_PER_METER,
    };
  }
  const minX = Math.min(...tiles.map((t) => t.xM)) - OVERVIEW_WORLD_MARGIN_M;
  const minY = Math.min(...tiles.map((t) => t.yM)) - OVERVIEW_WORLD_MARGIN_M;
  const maxX = Math.max(...tiles.map((t) => t.xM + t.wM)) + OVERVIEW_WORLD_MARGIN_M;
  const maxY = Math.max(...tiles.map((t) => t.yM + t.hM)) + OVERVIEW_WORLD_MARGIN_M;
  const widthM = maxX - minX;
  const heightM = maxY - minY;
  return {
    originXM: minX,
    originYM: minY,
    widthM,
    heightM,
    widthPx: widthM * OVERVIEW_PX_PER_METER,
    heightPx: heightM * OVERVIEW_PX_PER_METER,
  };
}

function snapToGrid(m: number): number {
  return Math.round(m / OVERVIEW_SNAP_M) * OVERVIEW_SNAP_M;
}

/**
 * Tile position after dragging by a client-pixel delta at the given view
 * scale, snapped to OVERVIEW_SNAP_M. There are no bounds and overlap is
 * allowed at the overview level (F1) — any position is valid.
 */
export function dragTilePositionM(
  origXM: number,
  origYM: number,
  dxPx: number,
  dyPx: number,
  viewScale: number,
): { xM: number; yM: number } {
  const pxPerM = OVERVIEW_PX_PER_METER * Math.max(viewScale, 1e-6);
  return {
    xM: snapToGrid(origXM + dxPx / pxPerM),
    yM: snapToGrid(origYM + dyPx / pxPerM),
  };
}
