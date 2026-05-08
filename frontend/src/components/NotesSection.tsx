import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createNote,
  deleteNote,
  deleteNotePhoto,
  listNotes,
  notePhotoUrl,
  patchNote,
  uploadNotePhoto,
  type Note,
  type NoteTargetType,
} from '../api/notes';
import { useAuth } from '../auth/useAuth';
import { PlantProfileImageGallery } from '../pages/plantProfiles/PlantProfileImageGallery';
import type { GalleryImage } from '../pages/plantProfiles/types';
import { PlantProfileImageThumb } from '../pages/plantProfiles/PlantProfileImageThumb';

export interface NotesSectionProps {
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  /** When true, hide add/edit/delete (read-only history). */
  readOnly?: boolean;
  hideHeading?: boolean;
  className?: string;
}

export function NotesSection({
  gardenId,
  seasonId,
  targetType,
  targetId,
  readOnly = false,
  hideHeading = false,
  className = '',
}: NotesSectionProps) {
  const { t, i18n } = useTranslation();
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language, i18n.resolvedLanguage],
  );
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [draftPhoto, setDraftPhoto] = useState<File | null>(null);
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [gallery, setGallery] = useState<{ images: GalleryImage[]; startIndex: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listNotes(gardenId, seasonId, { targetType, targetId });
      setNotes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.unknownError'));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [gardenId, seasonId, targetType, targetId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createNote(gardenId, { seasonId, targetType, targetId, body });
      if ('queued' in created) {
        setDraft('');
        setDraftPhoto(null);
        await refresh();
        return;
      }
      if (draftPhoto) {
        await uploadNotePhoto(gardenId, created.id, draftPhoto);
      }
      setDraft('');
      setDraftPhoto(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const body = editBody.trim();
    if (!body) return;
    setBusy(true);
    setError(null);
    try {
      await patchNote(gardenId, id, body);
      if (editRemovePhoto) {
        await deleteNotePhoto(gardenId, id);
      } else if (editPhoto) {
        await uploadNotePhoto(gardenId, id, editPhoto);
      }
      setEditingId(null);
      setEditPhoto(null);
      setEditRemovePhoto(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('notes.confirmDelete'))) return;
    setBusy(true);
    setError(null);
    try {
      await deleteNote(gardenId, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`mt-4 border-t border-stone-100 pt-4 ${className}`.trim()}
      data-testid="notes-section"
    >
      {!hideHeading ? (
        <h3 className="text-sm font-semibold text-stone-800">{t('notes.title')}</h3>
      ) : null}
      {loading ? (
        <p className="mt-2 text-sm text-stone-500">{t('auth.loading')}</p>
      ) : (
        <ul className="mt-2 space-y-2" data-testid="notes-list">
          {notes.map((n) => (
            <li
              key={n.id}
              data-testid={`note-item-${n.id}`}
              className="rounded-lg border border-stone-100 bg-stone-50/80 p-2 text-sm text-stone-800"
            >
              {editingId === n.id && !readOnly ? (
                <div className="space-y-2">
                  <textarea
                    data-testid={`note-edit-${n.id}`}
                    className="w-full rounded border border-stone-300 px-2 py-1"
                    rows={3}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  {n.photo ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        onClick={() =>
                          setGallery({
                            images: [{ id: n.id, url: notePhotoUrl(gardenId, n.id) }],
                            startIndex: 0,
                          })
                        }
                        aria-label="View photo"
                      >
                        <PlantProfileImageThumb url={notePhotoUrl(gardenId, n.id)} alt="Note photo" />
                      </button>
                      <label className="flex items-center gap-2 text-xs text-stone-700">
                        <input
                          data-testid={`note-edit-remove-photo-${n.id}`}
                          type="checkbox"
                          checked={editRemovePhoto}
                          disabled={busy}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditRemovePhoto(checked);
                            if (checked) setEditPhoto(null);
                          }}
                        />
                        {t('notes.removePhoto', { defaultValue: 'Remove photo' })}
                      </label>
                    </div>
                  ) : null}
                  <input
                    data-testid={`note-edit-photo-input-${n.id}`}
                    className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-800"
                    type="file"
                    accept="image/*"
                    disabled={busy || editRemovePhoto}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setEditPhoto(f);
                      if (f) setEditRemovePhoto(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                      disabled={busy}
                      onClick={() => void handleSaveEdit(n.id)}
                    >
                      {t('notes.save')}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-stone-200 px-2 py-1 text-xs"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(null);
                        setEditPhoto(null);
                        setEditRemovePhoto(false);
                      }}
                    >
                      {t('garden.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  {n.createdAt ? (
                    <time
                      className="mt-1 block text-xs text-stone-600"
                      dateTime={n.createdAt}
                      data-testid={`note-created-at-${n.id}`}
                    >
                      {dateTimeFormatter.format(new Date(n.createdAt))}
                    </time>
                  ) : null}
                  {n.photo ? (
                    <button
                      type="button"
                      className="mt-2 block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      onClick={() =>
                        setGallery({
                          images: [{ id: n.id, url: notePhotoUrl(gardenId, n.id) }],
                          startIndex: 0,
                        })
                      }
                      aria-label="View photo"
                    >
                      <PlantProfileImageThumb url={notePhotoUrl(gardenId, n.id)} alt="Note photo" />
                    </button>
                  ) : null}
                  {!readOnly && user?.id === n.createdBy ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        data-testid={`note-edit-btn-${n.id}`}
                        className="text-xs font-medium text-emerald-800"
                        onClick={() => {
                          setEditingId(n.id);
                          setEditBody(n.body);
                        setEditPhoto(null);
                        setEditRemovePhoto(false);
                        }}
                      >
                        {t('notes.edit')}
                      </button>
                      <button
                        type="button"
                        data-testid={`note-delete-btn-${n.id}`}
                        className="text-xs font-medium text-red-700"
                        onClick={() => void handleDelete(n.id)}
                      >
                        {t('notes.delete')}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {!readOnly ? (
        <form className="mt-3 space-y-2" data-testid="note-add-form" onSubmit={(e) => void handleAdd(e)}>
          <textarea
            data-testid="note-draft"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            rows={3}
            placeholder={t('notes.placeholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <input
            data-testid="note-photo-input"
            className="block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-800"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setDraftPhoto(f);
            }}
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? t('auth.submitting') : t('notes.add')}
          </button>
        </form>
      ) : null}

      {gallery ? (
        <PlantProfileImageGallery
          images={gallery.images}
          startIndex={gallery.startIndex}
          onClose={() => setGallery(null)}
          labels={{
            back: t('planning.imageGalleryBack', { defaultValue: 'Back' }),
            close: t('planning.imageGalleryClose', { defaultValue: 'Close' }),
            slideAlt: 'Note photo',
            galleryAria: 'Note photos',
          }}
        />
      ) : null}
    </section>
  );
}
