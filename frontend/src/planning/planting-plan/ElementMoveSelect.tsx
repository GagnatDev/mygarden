import { useTranslation } from 'react-i18next';
import type { Area } from '../../api/areas';
import type { ElementWithArea } from './types';

export function ElementMoveSelect({
  value,
  areas,
  elementsByAreaId,
  onChange,
  disabled,
  testId,
  allowEmptyOption,
}: {
  value: string | null;
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  onChange: (elementId: string) => void;
  disabled?: boolean;
  testId?: string;
  allowEmptyOption?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <select
      data-testid={testId}
      className="max-w-[14rem] rounded border border-stone-300 px-2 py-1 text-sm text-stone-800"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onChange(v);
      }}
    >
      {allowEmptyOption && !value ? (
        <option value="">{t('planning.select')}</option>
      ) : null}
      {areas.map((area) => (
        <optgroup key={area.id} label={area.title}>
          {(elementsByAreaId.get(area.id) ?? []).map((el) => (
            <option key={el.id} value={el.id}>
              {el.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
