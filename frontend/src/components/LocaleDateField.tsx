import { format, isValid, parse } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enUS, nb } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';

function fromIsoDate(value: string): Date | undefined {
  if (!value.trim()) return undefined;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export interface LocaleDateFieldProps {
  value: string;
  onChange: (isoDate: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  /** For form / RTL tests */
  testId?: string;
  /** Show control to clear value (optional fields). */
  allowClear?: boolean;
}

export function LocaleDateField({
  value,
  onChange,
  id,
  className = 'w-full rounded-lg border border-stone-300 px-3 py-2 text-left text-sm text-stone-900',
  required = false,
  disabled = false,
  testId,
  allowClear = false,
}: LocaleDateFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isNb = i18n.language.startsWith('nb');
  const locale = isNb ? nb : enUS;

  const selected = useMemo(() => fromIsoDate(value), [value]);

  const displayText = useMemo(() => {
    if (!selected) return t('planning.datePlaceholder');
    return isNb ? format(selected, 'dd/MM/yyyy', { locale: nb }) : format(selected, 'P', { locale: enUS });
  }, [selected, isNb, t]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative mt-1" data-testid={testId}>
      <div className="flex items-stretch gap-1">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`${className} flex-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer bg-white hover:bg-stone-50'}`}
          onClick={() => {
            if (!disabled) setOpen((o) => !o);
          }}
        >
          {displayText}
        </button>
        {allowClear && value && !disabled ? (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-stone-300 px-2 py-2 text-sm text-stone-600 hover:bg-stone-50"
            aria-label={t('planning.clearDate')}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg"
          role="dialog"
          aria-label={t('planning.openDatePicker')}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toIsoDate(d));
                setOpen(false);
              }
            }}
            locale={locale}
            weekStartsOn={1}
            defaultMonth={selected ?? new Date()}
          />
        </div>
      ) : null}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only"
        aria-hidden
        value={value}
        readOnly
        required={required}
        onChange={() => {}}
      />
    </div>
  );
}
