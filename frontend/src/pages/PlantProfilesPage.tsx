import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createPlantProfile,
  deletePlantProfileImage,
  deletePlantProfile,
  listPlantProfiles,
  patchPlantProfile,
  uploadPlantProfileImage,
  type PlantProfile,
  type PlantProfileType,
} from '../api/plantProfiles';
import { apiFetch } from '../api/client';

const TYPES: PlantProfileType[] = ['vegetable', 'herb', 'flower', 'berry', 'tree_shrub'];

function usePlantProfileBlobUrl(url: string) {
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

function PlantProfileImageThumb({ url, alt }: { url: string; alt: string }) {
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
}

type GalleryImage = { id: string; url: string };

function PlantProfileImageGallerySlide({ url, alt }: { url: string; alt: string }) {
  const blobUrl = usePlantProfileBlobUrl(url);

  return (
    <div className="box-border flex h-full min-h-0 min-w-0 shrink-0 grow-0 basis-full snap-center snap-always flex-col bg-black">
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-center justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!blobUrl ? (
          <span
            className="h-48 w-full max-w-full animate-pulse rounded-lg bg-stone-800"
            aria-hidden
          />
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
}

function PlantProfileImageGallery({
  images,
  startIndex,
  onClose,
  labels,
}: {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
  labels: {
    back: string;
    close: string;
    slideAlt: string;
    galleryAria: string;
  };
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetPullRef = useRef(0);
  const gestureRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    axis: 'h' | 'v' | null;
  }>({ pointerId: null, startX: 0, startY: 0, axis: null });
  const [sheetPull, setSheetPull] = useState(0);
  const alt = labels.slideAlt;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const i = Math.min(Math.max(0, startIndex), Math.max(0, images.length - 1));
    el.scrollLeft = i * w;
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

  function handlePointerDown(e: React.PointerEvent) {
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

  function handlePointerMove(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (g.pointerId == null || e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (g.axis === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      g.axis = Math.abs(dy) > Math.abs(dx) + 2 ? 'v' : 'h';
    }
    if (g.axis === 'h') {
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
    } else {
      sheetPullRef.current = 0;
      setSheetPull(0);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (g.pointerId == null || e.pointerId !== g.pointerId) return;
    const pull = sheetPullRef.current;
    if (g.axis === 'v' && pull > 72) {
      onClose();
      return;
    }
    resetGesture();
  }

  function handlePointerCancel(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (g.pointerId == null || e.pointerId !== g.pointerId) return;
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
              <PlantProfileImageGallerySlide key={image.id} url={image.url} alt={alt} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlantProfilesPage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PlantProfileType>('vegetable');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageGallery, setImageGallery] = useState<{
    profileName: string;
    images: GalleryImage[];
    startIndex: number;
  } | null>(null);
  const [profileMenuOpenId, setProfileMenuOpenId] = useState<string | null>(null);
  const openProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputByProfileId = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!profileMenuOpenId) return;
    function handlePointerDown(e: PointerEvent) {
      const node = openProfileMenuRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setProfileMenuOpenId(null);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfileMenuOpenId(null);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpenId]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    setError(null);
    try {
      setProfiles(await listPlantProfiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPlantProfile({ name: name.trim(), type, notes: notes.trim() || null });
      setName('');
      setNotes('');
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      await patchPlantProfile(id, { name: editName.trim(), notes: editNotes.trim() || null });
      setEditingId(null);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deletePlantProfile(id);
      setDeleteId(null);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadImage(profileId: string, file: File) {
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadPlantProfileImage(profileId, file);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteImage(profileId: string, imageId: string) {
    setBusy(true);
    setError(null);
    try {
      const updated = await deletePlantProfileImage(profileId, imageId);
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="plant-profiles-page">
      <h1 className="text-2xl font-semibold text-stone-900">{t('nav.plantProfiles')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('planning.profilesHint')}</p>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <form
        data-testid="plant-profile-create-form"
        className="mt-6 max-w-lg space-y-3 rounded-xl border border-stone-200 bg-white p-4"
        onSubmit={(e) => void handleCreate(e)}
      >
        <h2 className="text-sm font-semibold text-stone-800">{t('planning.newProfile')}</h2>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.plantName')}
          <input
            data-testid="profile-name-input"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('garden.areaType')}
          <select
            data-testid="profile-type-select"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as PlantProfileType)}
          >
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`planning.plantTypes.${x}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {t('planning.notesOptional')}
          <textarea
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          data-testid="profile-create-submit"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? t('auth.submitting') : t('planning.createProfile')}
        </button>
      </form>

      {loading ? (
        <p className="mt-6 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <ul data-testid="plant-profile-list" className="mt-8 space-y-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className={
                profileMenuOpenId === p.id
                  ? 'relative z-50 rounded-xl border border-stone-200 bg-white p-4'
                  : 'rounded-xl border border-stone-200 bg-white p-4'
              }
              data-testid={`plant-profile-row-${p.id}`}
            >
              {editingId === p.id ? (
                <div className="space-y-2">
                  <input
                    data-testid={`profile-edit-name-${p.id}`}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-testid={`profile-save-${p.id}`}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
                      onClick={() => void handleSaveEdit(p.id)}
                      disabled={busy}
                    >
                      {t('garden.saveChanges')}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                      onClick={() => setEditingId(null)}
                    >
                      {t('garden.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative pr-10">
                    <div
                      ref={profileMenuOpenId === p.id ? openProfileMenuRef : undefined}
                      className="absolute right-0 top-0 z-10"
                    >
                      <button
                        type="button"
                        data-testid={`profile-card-menu-trigger-${p.id}`}
                        aria-expanded={profileMenuOpenId === p.id}
                        aria-haspopup="menu"
                        aria-label={t('planning.profileCardSettings')}
                        className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        onClick={() =>
                          setProfileMenuOpenId((current) => (current === p.id ? null : p.id))
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-5 w-5"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.65.87.174.107.377.17.597.17.207 0 .405-.057.583-.169l1.145-.663a1.125 1.125 0 011.298.21l1.84 1.84a1.125 1.125 0 01.21 1.298l-.663 1.145c-.112.178-.17.376-.17.583 0 .22.063.423.17.597.184.337.496.587.87.65l1.281.213c.542.09.94.56.94 1.11v2.593c0 .55-.398 1.02-.94 1.11l-1.281.213c-.374.063-.686.313-.87.65a1.125 1.125 0 00-.17.597c0 .207.057.405.169.583l.663 1.145a1.125 1.125 0 01-.21 1.298l-1.84 1.84a1.125 1.125 0 01-1.298.21l-1.145-.663a1.125 1.125 0 00-.583-.169c-.22 0-.423.063-.597.17-.337.184-.587.496-.65.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.65-.87a1.125 1.125 0 00-.597-.17c-.207 0-.405.057-.583.169l-1.145.663a1.125 1.125 0 01-1.298-.21l-1.84-1.84a1.125 1.125 0 01-.21-1.298l.663-1.145c.112-.178.17-.376.17-.583 0-.22-.063-.423-.17-.597-.184-.337-.496-.587-.87-.65l-1.281-.213a1.125 1.125 0 01-.94-1.11v-2.593c0-.55.398-1.02.94-1.11l1.281-.213c.374-.063.686-.313.87-.65.107-.174.17-.377.17-.597 0-.207-.057-.405-.169-.583l-.663-1.145a1.125 1.125 0 01.21-1.298l1.84-1.84a1.125 1.125 0 011.298-.21l1.145.663c.178.112.376.17.583.17.22 0 .423-.063.597-.17.337-.184.587-.496.65-.87l.213-1.281z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                      {profileMenuOpenId === p.id ? (
                        <div
                          className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
                          role="menu"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            data-testid={`profile-edit-btn-${p.id}`}
                            className="flex w-full px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50"
                            onClick={() => {
                              setProfileMenuOpenId(null);
                              setEditingId(p.id);
                              setEditName(p.name);
                              setEditNotes(p.notes ?? '');
                            }}
                          >
                            {t('garden.editArea')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            data-testid={`profile-menu-add-image-${p.id}`}
                            disabled={busy || (p.images?.length ?? 0) >= 5}
                            className="flex w-full px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              setProfileMenuOpenId(null);
                              if ((p.images?.length ?? 0) < 5) {
                                fileInputByProfileId.current.get(p.id)?.click();
                              }
                            }}
                          >
                            {t('planning.addImage')}
                          </button>
                          <div className="my-1 border-t border-stone-100" role="presentation" />
                          <button
                            type="button"
                            role="menuitem"
                            data-testid={`profile-delete-btn-${p.id}`}
                            className="flex w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setProfileMenuOpenId(null);
                              setDeleteId(p.id);
                            }}
                          >
                            {t('planning.deleteProfile')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      tabIndex={-1}
                      data-testid={`profile-image-input-${p.id}`}
                      ref={(el) => {
                        if (el) fileInputByProfileId.current.set(p.id, el);
                        else fileInputByProfileId.current.delete(p.id);
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) {
                          void handleUploadImage(p.id, file);
                        }
                      }}
                    />
                    <div>
                      <p className="font-medium text-stone-900">{p.name}</p>
                      <p className="text-sm text-stone-500">{t(`planning.plantTypes.${p.type}`)}</p>
                      {p.notes ? <p className="mt-1 text-sm text-stone-600">{p.notes}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {(p.images ?? []).map((image, imageIndex) => (
                          <div key={image.id} className="relative">
                            <button
                              type="button"
                              data-testid={`profile-image-open-gallery-${p.id}-${image.id}`}
                              className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                              aria-label={t('planning.openImageGallery')}
                              onClick={() =>
                                setImageGallery({
                                  profileName: p.name,
                                  images: (p.images ?? []).map((im) => ({ id: im.id, url: im.url })),
                                  startIndex: imageIndex,
                                })
                              }
                            >
                              <PlantProfileImageThumb
                                url={image.url}
                                alt={t('planning.profileImageAlt', { name: p.name })}
                              />
                            </button>
                            <button
                              type="button"
                              data-testid={`profile-image-delete-${p.id}-${image.id}`}
                              className="absolute -right-1 -top-1 z-10 rounded-full border border-stone-300 bg-white px-1 text-xs"
                              onClick={() => void handleDeleteImage(p.id, image.id)}
                              disabled={busy}
                            >
                              {t('planning.removeImage')}
                            </button>
                          </div>
                        ))}
                      </div>
                      {(p.images?.length ?? 0) >= 5 ? (
                        <p className="mt-2 text-xs text-stone-500">{t('planning.maxImagesReached')}</p>
                      ) : null}
                    </div>
                  </div>
                  {deleteId === p.id ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-900">{t('planning.confirmDeleteProfile')}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          data-testid={`profile-delete-confirm-${p.id}`}
                          className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
                          onClick={() => void handleDelete(p.id)}
                          disabled={busy}
                        >
                          {t('garden.confirmDelete')}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm"
                          onClick={() => setDeleteId(null)}
                        >
                          {t('garden.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {imageGallery ? (
        <PlantProfileImageGallery
          images={imageGallery.images}
          startIndex={imageGallery.startIndex}
          onClose={() => setImageGallery(null)}
          labels={{
            back: t('planning.imageGalleryBack'),
            close: t('planning.imageGalleryClose'),
            slideAlt: t('planning.profileImageAlt', { name: imageGallery.profileName }),
            galleryAria: t('planning.imageGalleryForProfile', { name: imageGallery.profileName }),
          }}
        />
      ) : null}
    </div>
  );
}
