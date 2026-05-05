import { memo } from 'react';
import type { FormEvent } from 'react';
import type { PlantProfileType } from '../../api/plantProfiles';
import { PLANT_PROFILE_TYPES } from './constants';

type PlantProfileCreateFormProps = {
  name: string;
  type: PlantProfileType;
  notes: string;
  busy: boolean;
  submittingLabel: string;
  labels: {
    title: string;
    name: string;
    type: string;
    notes: string;
    submit: string;
    typeLabel: (type: PlantProfileType) => string;
  };
  onNameChange: (value: string) => void;
  onTypeChange: (value: PlantProfileType) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export const PlantProfileCreateForm = memo(function PlantProfileCreateForm({
  name,
  type,
  notes,
  busy,
  submittingLabel,
  labels,
  onNameChange,
  onTypeChange,
  onNotesChange,
  onSubmit,
}: PlantProfileCreateFormProps) {
  return (
    <form
      data-testid="plant-profile-create-form"
      className="mt-6 max-w-lg space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      onSubmit={onSubmit}
    >
      <h2 className="text-sm font-semibold text-stone-800">{labels.title}</h2>
      <label className="block text-sm font-medium text-stone-700">
        {labels.name}
        <input
          data-testid="profile-name-input"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm font-medium text-stone-700">
        {labels.type}
        <select
          data-testid="profile-type-select"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          value={type}
          onChange={(e) => onTypeChange(e.target.value as PlantProfileType)}
        >
          {PLANT_PROFILE_TYPES.map((item) => (
            <option key={item} value={item}>
              {labels.typeLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-stone-700">
        {labels.notes}
        <textarea
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        data-testid="profile-create-submit"
        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? submittingLabel : labels.submit}
      </button>
    </form>
  );
});
