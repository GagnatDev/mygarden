import { useEffect, useState } from 'react';
import { getAuthenticatedImageBlobUrl } from './authenticated-image-cache';
import type { ImageVariant } from './image-cache-key';

export function useAuthenticatedImageUrl(path: string, variant: ImageVariant = 'full'): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBlobUrl(null);

    void (async () => {
      const url = await getAuthenticatedImageBlobUrl(path, variant);
      if (!cancelled) setBlobUrl(url);
    })();

    return () => {
      cancelled = true;
      setBlobUrl(null);
    };
  }, [path, variant]);

  return blobUrl;
}
