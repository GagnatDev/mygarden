import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type { Planting } from '../../api/plantings';
import { NotesSection } from '../../components/NotesSection';
import type { ElementWithArea } from './types';

export const PlantingListRow = memo(function PlantingListRow({
  pl,
  gardenId,
  seasonId,
  elementsWithArea,
  notesPlantingId,
  setNotesPlantingId,
  onMove,
  onDelete,
  t,
}: {
  pl: Planting;
  gardenId: string;
  seasonId: string;
  elementsWithArea: ElementWithArea[];
  notesPlantingId: string | null;
  setNotesPlantingId: Dispatch<SetStateAction<string | null>>;
  onMove: (plantingId: string, elementId: string) => void;
  onDelete: (plantingId: string) => void;
  t: TFunction;
}) {
  return (
    <li
      data-testid={`planting-row-${pl.id}`}
      className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        {pl.plantName} · {t(`planning.sowing.${pl.sowingMethod}`)}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid={`planting-notes-toggle-${pl.id}`}
          className="rounded border border-stone-200 px-2 py-1 text-xs font-medium text-stone-800 hover:bg-stone-50"
          onClick={() => setNotesPlantingId((cur) => (cur === pl.id ? null : pl.id))}
        >
          {t('notes.title')}
        </button>
        <label className="flex items-center gap-1 text-xs text-stone-600">
          <span>{t('planning.moveToElement')}</span>
          <select
            data-testid={`planting-area-select-${pl.id}`}
            className="max-w-[14rem] rounded border border-stone-300 px-2 py-1 text-sm text-stone-800"
            value={pl.elementId ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              onMove(pl.id, v);
            }}
          >
            {!pl.elementId ? <option value="">{t('planning.select')}</option> : null}
            {elementsWithArea.map((el) => (
              <option key={el.id} value={el.id}>
                {el.areaTitle} · {el.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid={`planting-delete-${pl.id}`}
          className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
          onClick={() => void onDelete(pl.id)}
        >
          {t('planning.removePlanting')}
        </button>
      </div>
      {notesPlantingId === pl.id ? (
        <NotesSection
          className="mt-3 border-stone-200"
          gardenId={gardenId}
          seasonId={seasonId}
          targetType="planting"
          targetId={pl.id}
          hideHeading
        />
      ) : null}
    </li>
  );
});
