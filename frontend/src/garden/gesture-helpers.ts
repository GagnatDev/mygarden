/**
 * Pure gesture sequencing helpers for the map editor (B6, R9).
 *
 * All classification (tap vs long-press vs drag), slop distances, and timing
 * constants live here so they are unit-testable and tunable in one place.
 * `GridMapEditor` wires DOM events to these functions; nothing in this module
 * touches the DOM.
 */

/** Press-and-hold duration before a touch press on an element starts a move. */
export const LONG_PRESS_MS = 450;
/** Max finger travel for a press to still qualify as a long-press (or tap). */
export const LONG_PRESS_SLOP_PX = 8;
/** Min pointer travel for a gesture to count as a drag instead of a click/tap. */
export const DRAG_THRESHOLD_PX = 6;
/** Max delay between two taps, and max distance between them, for double-tap-to-fit. */
export const DOUBLE_TAP_MS = 350;
export const DOUBLE_TAP_SLOP_PX = 24;
/** Max movement within a single tap for it to feed the double-tap detector. */
export const TAP_MOVE_SLOP_PX = 10;

export type PressIntent = 'pending' | 'drag';

/** State of one in-progress press (finger or button held down). */
export interface PressState {
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  /** 'pending' until movement exceeds the slop, then 'drag' (sticky). */
  intent: PressIntent;
  slopPx: number;
}

export function beginPress(
  x: number,
  y: number,
  time: number,
  slopPx: number = LONG_PRESS_SLOP_PX,
): PressState {
  return { startX: x, startY: y, startTime: time, lastX: x, lastY: y, intent: 'pending', slopPx };
}

/**
 * Track pointer movement within a press. Once total travel from the start
 * exceeds the slop the intent becomes (and stays) 'drag'.
 */
export function movePress(state: PressState, x: number, y: number): PressState {
  const moved =
    state.intent === 'drag' ||
    Math.hypot(x - state.startX, y - state.startY) > state.slopPx;
  return { ...state, lastX: x, lastY: y, intent: moved ? 'drag' : 'pending' };
}

/**
 * True when a press has been held long enough, without exceeding its slop,
 * to qualify as a long-press (touch move-start).
 */
export function isLongPress(state: PressState, now: number): boolean {
  return state.intent === 'pending' && now - state.startTime >= LONG_PRESS_MS;
}

/** Classify a finished press by total travel: below the drag threshold it is a tap/click. */
export function classifyRelease(state: PressState, x: number, y: number): 'tap' | 'drag' {
  if (state.intent === 'drag') return 'drag';
  return Math.hypot(x - state.startX, y - state.startY) < DRAG_THRESHOLD_PX ? 'tap' : 'drag';
}

/** True when the pointer has travelled at least DRAG_THRESHOLD_PX from (startX, startY). */
export function exceedsDragThreshold(
  startX: number,
  startY: number,
  x: number,
  y: number,
): boolean {
  return Math.hypot(x - startX, y - startY) >= DRAG_THRESHOLD_PX;
}

/** A completed tap, as remembered by the double-tap detector. */
export interface TapRecord {
  x: number;
  y: number;
  time: number;
}

/**
 * True when `next` completes a double-tap: both taps happen within
 * DOUBLE_TAP_MS of each other and land within DOUBLE_TAP_SLOP_PX.
 */
export function isDoubleTap(prev: TapRecord | null, next: TapRecord): boolean {
  if (!prev) return false;
  return (
    next.time - prev.time < DOUBLE_TAP_MS &&
    Math.hypot(next.x - prev.x, next.y - prev.y) < DOUBLE_TAP_SLOP_PX
  );
}
