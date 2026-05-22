export type ImageVariant = 'full' | 'thumb';

export function imageCacheKey(path: string, variant: ImageVariant = 'full'): string {
  const base = path.split('?')[0] ?? path;
  if (variant === 'full') return base;
  return `${base}?variant=thumb`;
}

export function imageFetchPath(path: string, variant: ImageVariant = 'full'): string {
  if (variant === 'full') return path;
  const [base, query] = path.split('?');
  const params = new URLSearchParams(query ?? '');
  params.set('variant', 'thumb');
  const qs = params.toString();
  return qs ? `${base}?${qs}` : `${base}?variant=thumb`;
}
