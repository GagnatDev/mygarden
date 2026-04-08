import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listGardens } from '../api/gardens';
import { GardenContext } from './garden-context';

const STORAGE_KEY = 'mygarden.selectedGardenId';

export function GardenProvider({ children }: { children: ReactNode }) {
  const [gardens, setGardens] = useState<Awaited<ReturnType<typeof listGardens>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGardenId, setSelectedGardenIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const refreshGardens = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await listGardens();
      setGardens(list);
      setSelectedGardenIdState((current) => {
        if (current && list.some((g) => g.id === current)) {
          return current;
        }
        const next = list[0]?.id ?? null;
        try {
          if (next) localStorage.setItem(STORAGE_KEY, next);
          else localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (e) {
      if (!soft) {
        setError(e instanceof Error ? e.message : 'Failed to load gardens');
      }
    } finally {
      if (!soft) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshGardens();
  }, [refreshGardens]);

  const setSelectedGardenId = useCallback((id: string | null) => {
    setSelectedGardenIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const selectedGarden = useMemo(
    () => gardens.find((g) => g.id === selectedGardenId) ?? null,
    [gardens, selectedGardenId],
  );

  const value = useMemo(
    () => ({
      gardens,
      loading,
      error,
      selectedGardenId,
      selectedGarden,
      setSelectedGardenId,
      refreshGardens,
    }),
    [gardens, loading, error, selectedGardenId, selectedGarden, setSelectedGardenId, refreshGardens],
  );

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>;
}
