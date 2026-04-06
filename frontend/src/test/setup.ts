import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/** jsdom has no PointerEvent; map gestures use pointer capture + client coords. */
/** jsdom has no blob: URLs; GridMapEditor uses createObjectURL for authenticated image fetch. */
let __blobUrlSeq = 0;
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = (_blob: Blob) => {
    __blobUrlSeq += 1;
    return `blob:http://localhost/${__blobUrlSeq}`;
  };
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {
    /* no-op in test env */
  };
}

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
