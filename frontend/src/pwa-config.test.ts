import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('PWA configuration', () => {
  it('vite config registers MyGarden manifest via vite-plugin-pwa', () => {
    const raw = readFileSync(resolve(here, '../vite.config.ts'), 'utf8');
    expect(raw).toContain('vite-plugin-pwa');
    expect(raw).toContain('MyGarden');
    expect(raw).toContain('standalone');
  });
});
