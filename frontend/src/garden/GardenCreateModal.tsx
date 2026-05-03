import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GardenCreateForm } from './GardenCreateForm';

export function GardenCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCreated() {
    await onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-stone-900/30 backdrop-blur-sm"
        aria-label={t('garden.close')}
        onClick={onClose}
        data-testid="garden-create-modal-backdrop"
      />
      <div className="pointer-events-none fixed inset-0 flex items-end justify-center p-4 md:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="garden-create-modal-title"
          className="pointer-events-auto w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl"
          data-testid="garden-create-modal"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="garden-create-modal-title" className="text-lg font-semibold text-stone-900">
              {t('garden.createTitle')}
            </h2>
            <button
              type="button"
              className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              onClick={onClose}
            >
              {t('garden.close')}
            </button>
          </div>
          <div className="mt-4">
            <GardenCreateForm embedded onCreated={handleCreated} />
          </div>
        </div>
      </div>
    </div>
  );
}
