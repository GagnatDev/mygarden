import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlantProfile } from '../../api/plantProfiles';
import { PlantProfileImageThumb } from './PlantProfileImageThumb';
import type { GalleryImage } from './types';

type PlantProfileCardProps = {
  profile: PlantProfile;
  busy: boolean;
  onSaveEdit: (id: string, updates: { name: string; notes: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadImage: (profileId: string, file: File) => Promise<void>;
  onDeleteImage: (profileId: string, imageId: string) => Promise<void>;
  onOpenGallery: (state: { profileName: string; images: GalleryImage[]; startIndex: number }) => void;
};

export const PlantProfileCard = memo(function PlantProfileCard({
  profile,
  busy,
  onSaveEdit,
  onDelete,
  onUploadImage,
  onDeleteImage,
  onOpenGallery,
}: PlantProfileCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editNotes, setEditNotes] = useState(profile.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const node = menuRef.current;
      if (!node || node.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (editing) return;
    setEditName(profile.name);
    setEditNotes(profile.notes ?? '');
  }, [editing, profile.name, profile.notes]);

  const profileImages = profile.images ?? [];
  const profileGalleryImages = useMemo(
    () => profileImages.map((image) => ({ id: image.id, url: image.url })),
    [profileImages],
  );

  async function handleSave() {
    await onSaveEdit(profile.id, {
      name: editName.trim(),
      notes: editNotes.trim() || null,
    });
    setEditing(false);
  }

  async function handleConfirmDelete() {
    await onDelete(profile.id);
    setConfirmDelete(false);
  }

  return (
    <li
      className={menuOpen ? 'relative z-50 rounded-xl border border-stone-200 bg-white p-4' : 'rounded-xl border border-stone-200 bg-white p-4'}
      data-testid={`plant-profile-row-${profile.id}`}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            data-testid={`profile-edit-name-${profile.id}`}
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
              data-testid={`profile-save-${profile.id}`}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
              onClick={() => void handleSave()}
              disabled={busy}
            >
              {t('garden.saveChanges')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
              onClick={() => setEditing(false)}
            >
              {t('garden.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative pr-10">
            <div ref={menuRef} className="absolute right-0 top-0 z-10">
              <button
                type="button"
                data-testid={`profile-card-menu-trigger-${profile.id}`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={t('planning.profileCardSettings')}
                className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                onClick={() => setMenuOpen((current) => !current)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={`profile-edit-btn-${profile.id}`}
                    className="flex w-full px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                  >
                    {t('garden.editArea')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={`profile-menu-add-image-${profile.id}`}
                    disabled={busy || profileImages.length >= 5}
                    className="flex w-full px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      setMenuOpen(false);
                      if (profileImages.length < 5) {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    {t('planning.addImage')}
                  </button>
                  <div className="my-1 border-t border-stone-100" role="presentation" />
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={`profile-delete-btn-${profile.id}`}
                    className="flex w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
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
              data-testid={`profile-image-input-${profile.id}`}
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) {
                  void onUploadImage(profile.id, file);
                }
              }}
            />
            <div>
              <p className="font-medium text-stone-900">{profile.name}</p>
              <p className="text-sm text-stone-500">{t(`planning.plantTypes.${profile.type}`)}</p>
              {profile.notes ? <p className="mt-1 text-sm text-stone-600">{profile.notes}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profileImages.map((image, imageIndex) => (
                  <div key={image.id} className="relative">
                    <button
                      type="button"
                      data-testid={`profile-image-open-gallery-${profile.id}-${image.id}`}
                      className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      aria-label={t('planning.openImageGallery')}
                      onClick={() =>
                        onOpenGallery({
                          profileName: profile.name,
                          images: profileGalleryImages,
                          startIndex: imageIndex,
                        })
                      }
                    >
                      <PlantProfileImageThumb
                        url={image.url}
                        alt={t('planning.profileImageAlt', { name: profile.name })}
                      />
                    </button>
                    <button
                      type="button"
                      data-testid={`profile-image-delete-${profile.id}-${image.id}`}
                      className="absolute -right-1 -top-1 z-10 rounded-full border border-stone-300 bg-white px-1 text-xs"
                      onClick={() => void onDeleteImage(profile.id, image.id)}
                      disabled={busy}
                    >
                      {t('planning.removeImage')}
                    </button>
                  </div>
                ))}
              </div>
              {profileImages.length >= 5 ? (
                <p className="mt-2 text-xs text-stone-500">{t('planning.maxImagesReached')}</p>
              ) : null}
            </div>
          </div>
          {confirmDelete ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-900">{t('planning.confirmDeleteProfile')}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  data-testid={`profile-delete-confirm-${profile.id}`}
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
                  onClick={() => void handleConfirmDelete()}
                  disabled={busy}
                >
                  {t('garden.confirmDelete')}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  {t('garden.cancel')}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </li>
  );
});
