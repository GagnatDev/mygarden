import type { Element } from '../api/elements';
import { computeAlignmentGuides, type AlignmentGuides } from './alignment-guides';
import { isValidMovePosition, isValidResizeRect, type GridRect } from './grid-rect';
import { polygonPointsPx, translateVertices, type GridPoint } from './polygon-helpers';
import { isValidPolygonReshape } from './polygon-reshape-helpers';
import { handleAnchor, RESIZE_HANDLES, type ResizeHandle } from './resize-helpers';

/** Stroke colors shared by every drag preview (move, resize, reshape). */
export const PREVIEW_VALID_STROKE = '#059669';
export const PREVIEW_INVALID_STROKE = '#dc2626';

/**
 * Pure per-frame computations for the three drag previews (E1). The editor
 * applies each frame to the mounted SVG nodes directly, so nothing here may
 * touch the DOM or React.
 */

export interface MovePreviewFrame {
  /** Current candidate rect (grid units). */
  rect: GridRect;
  valid: boolean;
  /** Pixel-space `points` for a polygon element's preview; null for rectangles. */
  polygonPointsPx: string | null;
  guides: AlignmentGuides;
}

export function computeMovePreviewFrame(
  move: {
    elementId: string;
    origGridX: number;
    origGridY: number;
    curGridX: number;
    curGridY: number;
    w: number;
    h: number;
  },
  movingElement: Element | undefined,
  elements: Element[],
  gridWidth: number,
  gridHeight: number,
  cell: number,
): MovePreviewFrame {
  const rect: GridRect = {
    gridX: move.curGridX,
    gridY: move.curGridY,
    gridWidth: move.w,
    gridHeight: move.h,
  };
  const valid = isValidMovePosition(move.elementId, rect, elements, gridWidth, gridHeight);
  const others = elements
    .filter((a) => a.id !== move.elementId)
    .map((a) => ({
      gridX: a.gridX,
      gridY: a.gridY,
      gridWidth: a.gridWidth,
      gridHeight: a.gridHeight,
    }));
  const guides = computeAlignmentGuides(rect, others);
  const points =
    movingElement?.shape?.kind === 'polygon'
      ? polygonPointsPx(
          translateVertices(
            movingElement.shape.vertices,
            move.curGridX - move.origGridX,
            move.curGridY - move.origGridY,
          ),
          cell,
        )
      : null;
  return { rect, valid, polygonPointsPx: points, guides };
}

export interface ResizePreviewFrame {
  valid: boolean;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  /** Pixel-space anchor for each of the 8 handles at the current rect. */
  handleAnchorsPx: ReadonlyArray<{ handle: ResizeHandle; cxPx: number; cyPx: number }>;
}

export function computeResizePreviewFrame(
  resize: { elementId: string; cur: GridRect },
  elements: Element[],
  gridWidth: number,
  gridHeight: number,
  cell: number,
): ResizePreviewFrame {
  return {
    valid: isValidResizeRect(resize.elementId, resize.cur, elements, gridWidth, gridHeight),
    xPx: resize.cur.gridX * cell,
    yPx: resize.cur.gridY * cell,
    widthPx: resize.cur.gridWidth * cell,
    heightPx: resize.cur.gridHeight * cell,
    handleAnchorsPx: RESIZE_HANDLES.map((handle) => {
      const a = handleAnchor(resize.cur, handle);
      return { handle, cxPx: a.x * cell, cyPx: a.y * cell };
    }),
  };
}

export interface ReshapePreviewFrame {
  valid: boolean;
  /** Pixel-space `points` for the preview polygon at the current vertices. */
  pointsPx: string;
  /** Pixel-space anchor per vertex handle at the current vertices. */
  vertexAnchorsPx: ReadonlyArray<{ cxPx: number; cyPx: number }>;
}

export function computeReshapePreviewFrame(
  reshape: { elementId: string; curVertices: readonly GridPoint[] },
  elements: Element[],
  gridWidth: number,
  gridHeight: number,
  cell: number,
): ReshapePreviewFrame {
  return {
    valid: isValidPolygonReshape(
      reshape.elementId,
      reshape.curVertices,
      elements,
      gridWidth,
      gridHeight,
    ),
    pointsPx: polygonPointsPx(reshape.curVertices, cell),
    vertexAnchorsPx: reshape.curVertices.map((p) => ({ cxPx: p.x * cell, cyPx: p.y * cell })),
  };
}
