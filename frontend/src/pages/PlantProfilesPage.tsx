import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
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
import { PlantProfileCard } from './plantProfiles/PlantProfileCard';
import { PlantProfileCreateForm } from './plantProfiles/PlantProfileCreateForm';
import { PlantProfileImageGallery } from './plantProfiles/PlantProfileImageGallery';
import type { ImageGalleryState } from './plantProfiles/types';

export function PlantProfilesPage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PlantProfileType>('vegetable');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageGallery, setImageGallery] = useState<ImageGalleryState | null>(null);

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

  const handleCreate = useCallback(async (e: FormEvent<HTMLFormElement>) => {
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
  }, [load, name, notes, t, type]);

  const handleSaveEdit = useCallback(async (id: string, updates: { name: string; notes: string | null }) => {
    setBusy(true);
    setError(null);
    try {
      await patchPlantProfile(id, updates);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  const handleDelete = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await deletePlantProfile(id);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  const handleUploadImage = useCallback(async (profileId: string, file: File) => {
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
  }, [t]);

  const handleDeleteImage = useCallback(async (profileId: string, imageId: string) => {
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
  }, [t]);

  const createFormLabels = useMemo(
    () => ({
      title: t('planning.newProfile'),
      name: t('planning.plantName'),
      type: t('garden.areaType'),
      notes: t('planning.notesOptional'),
      submit: t('planning.createProfile'),
      typeLabel: (value: PlantProfileType) => t(`planning.plantTypes.${value}`),
    }),
    [t],
  );

  const imageGalleryLabels = useMemo(
    () =>
      imageGallery
        ? {
            back: t('planning.imageGalleryBack'),
            close: t('planning.imageGalleryClose'),
            slideAlt: t('planning.profileImageAlt', { name: imageGallery.profileName }),
            galleryAria: t('planning.imageGalleryForProfile', { name: imageGallery.profileName }),
          }
        : null,
    [imageGallery, t],
  );

  return (
    <div data-testid="plant-profiles-page">
      <h1 className="text-2xl font-semibold text-stone-900">{t('nav.plantProfiles')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('planning.profilesHint')}</p>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <PlantProfileCreateForm
        name={name}
        type={type}
        notes={notes}
        busy={busy}
        submittingLabel={t('auth.submitting')}
        labels={createFormLabels}
        onNameChange={setName}
        onTypeChange={setType}
        onNotesChange={setNotes}
        onSubmit={(e) => void handleCreate(e)}
      />

      {loading ? (
        <p className="mt-6 text-stone-600">{t('auth.loading')}</p>
      ) : (
        <ul data-testid="plant-profile-list" className="mt-8 space-y-3">
          {profiles.map((profile) => (
            <PlantProfileCard
              key={profile.id}
              profile={profile}
              busy={busy}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
              onOpenGallery={setImageGallery}
            />
          ))}
        </ul>
      )}
      {imageGallery && imageGalleryLabels ? (
        <PlantProfileImageGallery
          images={imageGallery.images}
          startIndex={imageGallery.startIndex}
          onClose={() => setImageGallery(null)}
          labels={imageGalleryLabels}
        />
      ) : null}
    </div>
  );
}
