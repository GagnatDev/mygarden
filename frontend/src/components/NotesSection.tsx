import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createNote,
  deleteNote,
  listNotes,
  patchNote,
  type Note,
  type NoteTargetType,
} from '../api/notes';
import { useAuth } from '../auth/useAuth';

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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

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
      await createNote(gardenId, { seasonId, targetType, targetId, body });
      setDraft('');
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
      setEditingId(null);
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
                      onClick={() => setEditingId(null)}
                    >
                      {t('garden.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  {!readOnly && user?.id === n.createdBy ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        data-testid={`note-edit-btn-${n.id}`}
                        className="text-xs font-medium text-emerald-800"
                        onClick={() => {
                          setEditingId(n.id);
                          setEditBody(n.body);
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
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? t('auth.submitting') : t('notes.add')}
          </button>
        </form>
      ) : null}
    </section>
  );
}
