import { useCallback, useEffect, useState } from 'react';
import { listSeasons } from '../api/gardens';

export function useActiveSeason(gardenId: string | null): {
  seasonId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gardenId) {
      setSeasonId(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const seasons = await listSeasons(gardenId);
      const active = seasons.find((s) => s.isActive);
      setSeasonId(active?.id ?? null);
    } catch (e) {
      setSeasonId(null);
      setError(e instanceof Error ? e.message : 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  }, [gardenId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { seasonId, loading, error, refresh };
}
