export type ImageVariant = 'full' | 'thumb';

export function parseImageVariant(query: Record<string, unknown>): ImageVariant {
  const raw = query.variant;
  if (raw === 'thumb') return 'thumb';
  return 'full';
}
