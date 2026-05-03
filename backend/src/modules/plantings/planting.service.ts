import type { Planting, SowingMethod } from '../../domain/planting.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { IPlantProfileRepository } from '../../repositories/interfaces/plant-profile.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';
import type { ITaskRepository } from '../../repositories/interfaces/task.repository.interface.js';
import { replaceAutoTasksForPlanting, removeAllTasksForPlanting } from './planting-tasks.js';

function assertPlantingDates(p: {
  sowingMethod: SowingMethod;
  elementId: string | null;
  indoorSowDate: Date | null;
  outdoorSowDate: Date | null;
}): void {
  if (p.sowingMethod === 'indoor') {
    if (!p.indoorSowDate) {
      throw new HttpError(400, 'Indoor sowing requires indoorSowDate', 'Bad Request');
    }
  }
  if (p.sowingMethod === 'direct_outdoor') {
    if (p.elementId == null) {
      throw new HttpError(400, 'Direct outdoor sowing requires elementId', 'Bad Request');
    }
    if (!p.outdoorSowDate) {
      throw new HttpError(400, 'Direct outdoor sowing requires outdoorSowDate', 'Bad Request');
    }
  }
}

export class PlantingService {
  constructor(
    private readonly plantingRepo: IPlantingRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly elementRepo: IElementRepository,
    private readonly areaRepo: IAreaRepository,
    private readonly plantProfileRepo: IPlantProfileRepository,
    private readonly taskRepo: ITaskRepository,
  ) {}

  async list(gardenId: string, seasonId: string): Promise<Planting[]> {
    const season = await this.seasonRepo.findById(seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    return this.plantingRepo.findByGardenAndSeason(gardenId, seasonId);
  }

  private async assertElementInGarden(gardenId: string, elementId: string): Promise<void> {
    const element = await this.elementRepo.findById(elementId);
    if (!element) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
    const area = await this.areaRepo.findById(element.areaId);
    if (!area || area.gardenId !== gardenId) {
      throw new HttpError(404, 'Element not found', 'Not Found');
    }
  }

  async create(
    gardenId: string,
    userId: string,
    body: {
      seasonId: string;
      elementId: string | null;
      plantProfileId?: string | null;
      plantName?: string;
      sowingMethod: SowingMethod;
      indoorSowDate: Date | null;
      transplantDate: Date | null;
      outdoorSowDate: Date | null;
      harvestWindowStart: Date | null;
      harvestWindowEnd: Date | null;
      quantity: number | null;
      notes: string | null;
    },
  ): Promise<Planting> {
    const season = await this.seasonRepo.findById(body.seasonId);
    if (!season || season.gardenId !== gardenId) {
      throw new HttpError(404, 'Season not found', 'Not Found');
    }
    if (body.elementId != null) {
      await this.assertElementInGarden(gardenId, body.elementId);
    }

    let plantName = body.plantName?.trim() ?? '';
    const plantProfileId: string | null = body.plantProfileId ?? null;
    if (plantProfileId) {
      const profile = await this.plantProfileRepo.findById(plantProfileId);
      if (!profile || profile.userId !== userId) {
        throw new HttpError(404, 'Plant profile not found', 'Not Found');
      }
      plantName = profile.name;
    }
    if (!plantName) {
      throw new HttpError(400, 'plantName is required when plantProfileId is not set', 'Bad Request');
    }

    assertPlantingDates({
      sowingMethod: body.sowingMethod,
      elementId: body.elementId,
      indoorSowDate: body.indoorSowDate,
      outdoorSowDate: body.outdoorSowDate,
    });

    const planting = await this.plantingRepo.create({
      gardenId,
      seasonId: body.seasonId,
      elementId: body.elementId ?? null,
      plantProfileId,
      plantName,
      sowingMethod: body.sowingMethod,
      indoorSowDate: body.indoorSowDate,
      transplantDate: body.transplantDate,
      outdoorSowDate: body.outdoorSowDate,
      harvestWindowStart: body.harvestWindowStart,
      harvestWindowEnd: body.harvestWindowEnd,
      quantity: body.quantity,
      notes: body.notes,
      createdBy: userId,
    });

    await replaceAutoTasksForPlanting(this.taskRepo, planting);
    return planting;
  }

  async update(
    gardenId: string,
    userId: string,
    plantingId: string,
    patch: Partial<{
      elementId: string | null;
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
    }>,
  ): Promise<Planting> {
    const current = await this.plantingRepo.findById(plantingId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Planting not found', 'Not Found');
    }

    const nextElementId = patch.elementId !== undefined ? patch.elementId : current.elementId;
    if (nextElementId != null) {
      await this.assertElementInGarden(gardenId, nextElementId);
    }

    let plantName = patch.plantName?.trim() ?? current.plantName;
    const plantProfileId =
      patch.plantProfileId !== undefined ? patch.plantProfileId : current.plantProfileId;
    if (patch.plantProfileId !== undefined && patch.plantProfileId) {
      const profile = await this.plantProfileRepo.findById(patch.plantProfileId);
      if (!profile || profile.userId !== userId) {
        throw new HttpError(404, 'Plant profile not found', 'Not Found');
      }
      plantName = profile.name;
    }

    const sowingMethod = patch.sowingMethod ?? current.sowingMethod;
    const indoorSowDate =
      patch.indoorSowDate !== undefined ? patch.indoorSowDate : current.indoorSowDate;
    const outdoorSowDate =
      patch.outdoorSowDate !== undefined ? patch.outdoorSowDate : current.outdoorSowDate;

    assertPlantingDates({
      sowingMethod,
      elementId: nextElementId,
      indoorSowDate,
      outdoorSowDate,
    });

    const updated = await this.plantingRepo.update(plantingId, {
      ...patch,
      plantName,
      plantProfileId,
    });
    if (!updated) {
      throw new HttpError(404, 'Planting not found', 'Not Found');
    }
    await replaceAutoTasksForPlanting(this.taskRepo, updated);
    return updated;
  }

  async delete(gardenId: string, plantingId: string): Promise<void> {
    const current = await this.plantingRepo.findById(plantingId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Planting not found', 'Not Found');
    }
    await removeAllTasksForPlanting(this.taskRepo, plantingId);
    const ok = await this.plantingRepo.delete(plantingId);
    if (!ok) {
      throw new HttpError(404, 'Planting not found', 'Not Found');
    }
  }
}
