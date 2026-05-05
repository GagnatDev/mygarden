import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GalleryImage } from './types';
import { usePlantProfileBlobUrl } from './usePlantProfileBlobUrl';

type PlantProfileImageGalleryProps = {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
  labels: {
    back: string;
    close: string;
    slideAlt: string;
    galleryAria: string;
  };
};

const PlantProfileImageGallerySlide = memo(function PlantProfileImageGallerySlide({
  url,
  alt,
}: {
  url: string;
  alt: string;
}) {
  const blobUrl = usePlantProfileBlobUrl(url);

  return (
    <div className="box-border flex h-full min-h-0 min-w-0 shrink-0 grow-0 basis-full snap-center snap-always flex-col bg-black">
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-center justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!blobUrl ? (
          <span className="h-48 w-full max-w-full animate-pulse rounded-lg bg-stone-800" aria-hidden />
        ) : (
          <img
            src={blobUrl}
            alt={alt}
            className="h-auto w-auto max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}
      </div>
    </div>
  );
});

export function PlantProfileImageGallery({
  images,
  startIndex,
  onClose,
  labels,
}: PlantProfileImageGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetPullRef = useRef(0);
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    axis: 'h' | 'v' | null;
  }>({ pointerId: null, startX: 0, startY: 0, axis: null });
  const [sheetPull, setSheetPull] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    const index = Math.min(Math.max(0, startIndex), Math.max(0, images.length - 1));
    el.scrollLeft = index * width;
  }, [startIndex, images.length]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  function resetGesture() {
    gestureRef.current = { pointerId: null, startX: 0, startY: 0, axis: null };
    sheetPullRef.current = 0;
    setSheetPull(0);
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
    };
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const gesture = gestureRef.current;
    if (gesture.pointerId == null || e.pointerId !== gesture.pointerId) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    if (gesture.axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      gesture.axis = Math.abs(dy) > Math.abs(dx) + 2 ? 'v' : 'h';
    }
    if (gesture.axis === 'h') {
      if (sheetPullRef.current !== 0) {
        sheetPullRef.current = 0;
        setSheetPull(0);
      }
      return;
    }
    if (dy > 0) {
      const next = Math.min(dy * 0.88, 280);
      sheetPullRef.current = next;
      setSheetPull(next);
      return;
    }
    sheetPullRef.current = 0;
    setSheetPull(0);
  }

  function handlePointerUp(e: ReactPointerEvent) {
    const gesture = gestureRef.current;
    if (gesture.pointerId == null || e.pointerId !== gesture.pointerId) return;
    const pull = sheetPullRef.current;
    if (gesture.axis === 'v' && pull > 72) {
      onClose();
      return;
    }
    resetGesture();
  }

  function handlePointerCancel(e: ReactPointerEvent) {
    const gesture = gestureRef.current;
    if (gesture.pointerId == null || e.pointerId !== gesture.pointerId) return;
    resetGesture();
  }

  const dismissOpacity = Math.max(0.35, 1 - sheetPull / 420);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={labels.galleryAria}
      data-testid="plant-profile-image-gallery"
    >
      <div
        className="flex min-h-0 flex-1 flex-col transition-[opacity] duration-75"
        style={{
          transform: sheetPull > 0 ? `translateY(${sheetPull}px)` : undefined,
          opacity: sheetPull > 0 ? dismissOpacity : 1,
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-800 bg-black px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            data-testid="plant-profile-image-gallery-back"
            className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-white hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {labels.back}
          </button>
          <button
            type="button"
            data-testid="plant-profile-image-gallery-close"
            aria-label={labels.close}
            className="rounded-lg p-2 text-white hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          className="relative min-h-0 flex-1 touch-pan-x"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div
            ref={scrollRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          >
            {images.map((image) => (
              <PlantProfileImageGallerySlide key={image.id} url={image.url} alt={labels.slideAlt} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
