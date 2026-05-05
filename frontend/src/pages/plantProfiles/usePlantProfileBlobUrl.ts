import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export function usePlantProfileBlobUrl(url: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setBlobUrl(null);

    void (async () => {
      try {
        const res = await apiFetch(url);
        if (!res.ok) {
          if (!cancelled) setBlobUrl(null);
          return;
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return createdUrl;
          });
        } else if (createdUrl) {
          URL.revokeObjectURL(createdUrl);
        }
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [url]);

  return blobUrl;
}
