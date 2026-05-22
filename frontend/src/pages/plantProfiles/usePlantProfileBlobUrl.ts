import type { ImageVariant } from '../../images/image-cache-key';
import { useAuthenticatedImageUrl } from '../../images/useAuthenticatedImageUrl';

/** @deprecated Use useAuthenticatedImageUrl */
export function usePlantProfileBlobUrl(url: string, variant: ImageVariant = 'full') {
  return useAuthenticatedImageUrl(url, variant);
}
