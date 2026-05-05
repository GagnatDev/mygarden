import { memo } from 'react';
import { usePlantProfileBlobUrl } from './usePlantProfileBlobUrl';

type PlantProfileImageThumbProps = {
  url: string;
  alt: string;
};

export const PlantProfileImageThumb = memo(function PlantProfileImageThumb({
  url,
  alt,
}: PlantProfileImageThumbProps) {
  const blobUrl = usePlantProfileBlobUrl(url);

  return (
    <span className="relative inline-block h-20 w-20 shrink-0">
      {!blobUrl ? (
        <span
          className="block h-20 w-20 animate-pulse rounded-lg border border-stone-200 bg-stone-100"
          aria-hidden
        />
      ) : null}
      {blobUrl ? (
        <img
          src={blobUrl}
          alt={alt}
          className="pointer-events-none absolute inset-0 h-20 w-20 rounded-lg border border-stone-200 object-cover"
        />
      ) : null}
    </span>
  );
});
