import { createContext, useContext } from 'react';
import type { Garden } from '../api/gardens';

export interface GardenContextValue {
  gardens: Garden[];
  loading: boolean;
  error: string | null;
  selectedGardenId: string | null;
  selectedGarden: Garden | null;
  setSelectedGardenId: (id: string | null) => void;
  /** When `soft`, updates the garden list without toggling the global loading state. */
  refreshGardens: (opts?: { soft?: boolean }) => Promise<void>;
}

export const GardenContext = createContext<GardenContextValue | null>(null);

export function useGardenContext(): GardenContextValue {
  const v = useContext(GardenContext);
  if (!v) {
    throw new Error('useGardenContext must be used within GardenProvider');
  }
  return v;
}
