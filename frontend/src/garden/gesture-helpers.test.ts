import { describe, expect, it } from 'vitest';
import {
  beginPress,
  classifyRelease,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  DRAG_THRESHOLD_PX,
  exceedsDragThreshold,
  isDoubleTap,
  isLongPress,
  LONG_PRESS_MS,
  LONG_PRESS_SLOP_PX,
  movePress,
} from './gesture-helpers';

describe('gesture-helpers press classification', () => {
  it('a new press starts pending at its start point', () => {
    const p = beginPress(10, 20, 1000);
    expect(p.intent).toBe('pending');
    expect(p.lastX).toBe(10);
    expect(p.lastY).toBe(20);
    expect(p.slopPx).toBe(LONG_PRESS_SLOP_PX);
  });

  it('movement within the slop keeps the press pending', () => {
    let p = beginPress(100, 100, 0);
    p = movePress(p, 103, 104); // 5px travel, slop is 8
    expect(p.intent).toBe('pending');
    expect(p.lastX).toBe(103);
  });

  it('movement beyond the slop becomes a drag and stays a drag', () => {
    let p = beginPress(100, 100, 0);
    p = movePress(p, 100, 110); // 10px > 8px slop
    expect(p.intent).toBe('drag');
    p = movePress(p, 100, 100); // returning to the start does not un-drag
    expect(p.intent).toBe('drag');
  });

  it('honors a custom slop', () => {
    let p = beginPress(0, 0, 0, 20);
    p = movePress(p, 0, 15);
    expect(p.intent).toBe('pending');
    p = movePress(p, 0, 25);
    expect(p.intent).toBe('drag');
  });

  it('isLongPress fires only after LONG_PRESS_MS while still pending', () => {
    const p = beginPress(0, 0, 1000);
    expect(isLongPress(p, 1000 + LONG_PRESS_MS - 1)).toBe(false);
    expect(isLongPress(p, 1000 + LONG_PRESS_MS)).toBe(true);
  });

  it('isLongPress never fires once the press became a drag', () => {
    let p = beginPress(0, 0, 1000);
    p = movePress(p, 0, 50);
    expect(isLongPress(p, 1000 + LONG_PRESS_MS + 100)).toBe(false);
  });

  it('classifyRelease returns tap under the drag threshold and drag over it', () => {
    const p = beginPress(50, 50, 0);
    expect(classifyRelease(p, 52, 52)).toBe('tap');
    expect(classifyRelease(p, 50 + DRAG_THRESHOLD_PX, 50)).toBe('drag');
  });

  it('classifyRelease is drag when the press already dragged, even if released at the start', () => {
    let p = beginPress(50, 50, 0);
    p = movePress(p, 80, 80);
    expect(classifyRelease(p, 50, 50)).toBe('drag');
  });

  it('exceedsDragThreshold matches the shared 6px threshold', () => {
    expect(exceedsDragThreshold(0, 0, 5, 0)).toBe(false);
    expect(exceedsDragThreshold(0, 0, 6, 0)).toBe(true);
  });
});

describe('gesture-helpers double tap', () => {
  it('no previous tap is never a double tap', () => {
    expect(isDoubleTap(null, { x: 0, y: 0, time: 100 })).toBe(false);
  });

  it('two quick nearby taps are a double tap', () => {
    const first = { x: 30, y: 30, time: 1000 };
    const second = { x: 32, y: 31, time: 1000 + DOUBLE_TAP_MS - 50 };
    expect(isDoubleTap(first, second)).toBe(true);
  });

  it('a slow second tap is not a double tap', () => {
    const first = { x: 30, y: 30, time: 1000 };
    const second = { x: 30, y: 30, time: 1000 + DOUBLE_TAP_MS };
    expect(isDoubleTap(first, second)).toBe(false);
  });

  it('a far-away second tap is not a double tap', () => {
    const first = { x: 30, y: 30, time: 1000 };
    const second = { x: 30 + DOUBLE_TAP_SLOP_PX, y: 30, time: 1100 };
    expect(isDoubleTap(first, second)).toBe(false);
  });
});
