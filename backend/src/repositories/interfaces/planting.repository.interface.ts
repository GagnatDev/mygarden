import type { Planting, SowingMethod } from '../../domain/planting.js';

export interface CreatePlantingInput {
  gardenId: string;
  seasonId: string;
  areaId: string;
  plantProfileId: string | null;
  plantName: string;
  sowingMethod: SowingMethod;
  indoorSowDate: Date | null;
  transplantDate: Date | null;
  outdoorSowDate: Date | null;
  harvestWindowStart: Date | null;
  harvestWindowEnd: Date | null;
  quantity: number | null;
  notes: string | null;
  createdBy: string;
}

export interface IPlantingRepository {
  create(input: CreatePlantingInput): Promise<Planting>;
  findById(id: string): Promise<Planting | null>;
  findByGardenAndSeason(gardenId: string, seasonId: string): Promise<Planting[]>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Planting,
        | 'areaId'
        | 'plantProfileId'
        | 'plantName'
        | 'sowingMethod'
        | 'indoorSowDate'
        | 'transplantDate'
        | 'outdoorSowDate'
        | 'harvestWindowStart'
        | 'harvestWindowEnd'
        | 'quantity'
        | 'notes'
      >
    >,
  ): Promise<Planting | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string): Promise<number>;
}
