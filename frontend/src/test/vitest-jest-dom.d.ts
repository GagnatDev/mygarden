import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

/**
 * Vitest 5's `Assertion` has two type parameters, so jest-dom's single-parameter
 * augmentation does not merge. Matchers is the extension point Vitest 5 checks.
 */
declare module 'vitest' {
  // Declaration merge only; members come from TestingLibraryMatchers.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<T, R> {}
}
