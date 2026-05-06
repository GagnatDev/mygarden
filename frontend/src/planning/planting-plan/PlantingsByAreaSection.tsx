import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import type { Area } from '../../api/areas';
import type { Planting } from '../../api/plantings';
import { PlantingListRow } from './PlantingListRow';
import type { ElementWithArea } from './types';

const ElementPlantingsBlock = memo(function ElementPlantingsBlock({
  element,
  plantings,
  gardenId,
  seasonId,
  elementsWithArea,
  locale,
  notesPlantingId,
  setNotesPlantingId,
  onMovePlanting,
  onDeletePlanting,
  t,
}: {
  element: ElementWithArea;
  plantings: Planting[];
  gardenId: string;
  seasonId: string;
  elementsWithArea: ElementWithArea[];
  locale: string;
  notesPlantingId: string | null;
  setNotesPlantingId: Dispatch<SetStateAction<string | null>>;
  onMovePlanting: (plantingId: string, elementId: string) => void;
  onDeletePlanting: (plantingId: string) => void;
  t: TFunction;
}) {
  return (
    <div
      data-testid={`element-plantings-${element.id}`}
      className="rounded-xl border border-stone-200 bg-white p-4"
    >
      <h3 className="font-semibold text-stone-900">
        {element.name}{' '}
        <span className="text-sm font-normal text-stone-500">({t(`garden.areaTypes.${element.type}`)})</span>
      </h3>
      {plantings.length === 0 ? (
        <p className="mt-1 text-sm text-stone-500">{t('planning.noPlantingsInArea')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 text-sm text-stone-700">
          {plantings.map((pl) => (
            <PlantingListRow
              key={pl.id}
              pl={pl}
              gardenId={gardenId}
              seasonId={seasonId}
              elementsWithArea={elementsWithArea}
              locale={locale}
              notesPlantingId={notesPlantingId}
              setNotesPlantingId={setNotesPlantingId}
              onMove={onMovePlanting}
              onDelete={onDeletePlanting}
              t={t}
            />
          ))}
        </ul>
      )}
    </div>
  );
});

export const PlantingsByAreaSection = memo(function PlantingsByAreaSection({
  areas,
  elementsByAreaId,
  byElement,
  gardenId,
  seasonId,
  elementsWithArea,
  locale,
  notesPlantingId,
  setNotesPlantingId,
  onMovePlanting,
  onDeletePlanting,
  t,
}: {
  areas: Area[];
  elementsByAreaId: Map<string, ElementWithArea[]>;
  byElement: Map<string, Planting[]>;
  gardenId: string;
  seasonId: string;
  elementsWithArea: ElementWithArea[];
  locale: string;
  notesPlantingId: string | null;
  setNotesPlantingId: Dispatch<SetStateAction<string | null>>;
  onMovePlanting: (plantingId: string, elementId: string) => void;
  onDeletePlanting: (plantingId: string) => void;
  t: TFunction;
}) {
  return (
    <section data-testid="plantings-by-area" className="mt-8 space-y-8">
      {areas.map((area) => {
        const els = elementsByAreaId.get(area.id) ?? [];
        return (
          <div key={area.id} data-testid={`area-block-${area.id}`} className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">{area.title}</h2>
            {els.length === 0 ? (
              <p className="text-sm text-stone-500">{t('planning.noElementsInArea')}</p>
            ) : (
              els.map((element) => (
                <ElementPlantingsBlock
                  key={element.id}
                  element={element}
                  plantings={byElement.get(element.id) ?? []}
                  gardenId={gardenId}
                  seasonId={seasonId}
                  elementsWithArea={elementsWithArea}
                  locale={locale}
                  notesPlantingId={notesPlantingId}
                  setNotesPlantingId={setNotesPlantingId}
                  onMovePlanting={onMovePlanting}
                  onDeletePlanting={onDeletePlanting}
                  t={t}
                />
              ))
            )}
          </div>
        );
      })}
    </section>
  );
});
