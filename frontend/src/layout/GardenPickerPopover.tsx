import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGardenContext } from '../garden/garden-context';

function SettingsGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function GardenPickerPopover() {
  const { t } = useTranslation();
  const { gardens, selectedGardenId, setSelectedGardenId } = useGardenContext();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const btnClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50';

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.chooseActiveGarden')}
        data-testid="garden-picker-toggle"
        onClick={() => setOpen((o) => !o)}
        className={btnClass}
      >
        <SettingsGlyph />
      </button>
      {open ? (
        <ul
          role="menu"
          aria-label={t('nav.chooseActiveGarden')}
          className="absolute right-0 z-[100] mt-1 max-h-64 min-w-[12rem] overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
        >
          {gardens.map((g) => (
            <li key={g.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={[
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  g.id === selectedGardenId ? 'bg-emerald-50 font-medium text-emerald-900' : 'text-stone-800 hover:bg-stone-50',
                ].join(' ')}
                onClick={() => {
                  setSelectedGardenId(g.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {g.id === selectedGardenId ? (
                  <span className="shrink-0 text-emerald-700" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
