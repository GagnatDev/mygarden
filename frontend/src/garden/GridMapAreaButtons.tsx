import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area } from '../api/gardens';

export interface GridMapAreaButtonsProps {
  areas: Area[];
  cell: number;
  areaIdsWithPlantings?: ReadonlySet<string>;
  selectedAreaId: string | null;
  effectiveTool: 'select' | 'pan';
  readOnly: boolean;
  onSelectArea: (id: string | null) => void;
}

export const GridMapAreaButtons = memo(function GridMapAreaButtons({
  areas,
  cell,
  areaIdsWithPlantings,
  selectedAreaId,
  effectiveTool,
  readOnly,
  onSelectArea,
}: GridMapAreaButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      {areas.map((a) => {
        const selected = a.id === selectedAreaId;
        const hasPlantings = areaIdsWithPlantings?.has(a.id) ?? false;
        return (
          <button
            key={a.id}
            type="button"
            className={`absolute box-border flex items-center justify-center p-0.5 text-center text-[10px] font-medium leading-tight text-white shadow-sm transition-[outline] ${
              selected ? 'outline outline-2 outline-emerald-600 outline-offset-[-2px] z-10' : 'z-[1]'
            }`}
            style={{
              left: a.gridX * cell,
              top: a.gridY * cell,
              width: a.gridWidth * cell,
              height: a.gridHeight * cell,
              backgroundColor: a.color,
              pointerEvents: effectiveTool === 'pan' || readOnly ? 'none' : 'auto',
            }}
            onPointerDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => {
              if (readOnly || effectiveTool !== 'select') return;
              ev.stopPropagation();
              onSelectArea(a.id);
            }}
            aria-label={
              hasPlantings
                ? `${a.name} (${t('garden.hasPlantingsHint')})`
                : a.name
            }
          >
            {hasPlantings ? (
              <span
                className="pointer-events-none absolute right-0.5 top-0.5 z-20 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-white/90"
                data-testid={`map-area-planting-indicator-${a.id}`}
                aria-hidden
              />
            ) : null}
            <span className="line-clamp-3 break-words px-0.5 drop-shadow-sm">
              <span className="block font-semibold">{a.name}</span>
            </span>
          </button>
        );
      })}
    </>
  );
});
