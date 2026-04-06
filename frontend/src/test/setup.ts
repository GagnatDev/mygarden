import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** jsdom does not implement matchMedia; AppShell and other code subscribe to `(min-width: …)`. */
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) => {
    const listeners = new Set<(e: MediaQueryListEvent) => void>();
    const evaluate = (): boolean => {
      const min = query.match(/\(min-width:\s*(\d+)px\)/);
      if (min) return window.innerWidth >= Number(min[1]);
      const max = query.match(/\(max-width:\s*(\d+)px\)/);
      if (max) return window.innerWidth <= Number(max[1]);
      return false;
    };
    const mql = {
      media: query,
      get matches() {
        return evaluate();
      },
      onchange: null as ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener(type: string, listener: EventListener) {
        if (type === 'change') listeners.add(listener as (e: MediaQueryListEvent) => void);
      },
      removeEventListener(type: string, listener: EventListener) {
        if (type === 'change') listeners.delete(listener as (e: MediaQueryListEvent) => void);
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    return mql;
  };
}

/** jsdom has no PointerEvent; map gestures use pointer capture + client coords. */
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  } as typeof PointerEvent;
}

afterEach(() => {
  cleanup();
});
