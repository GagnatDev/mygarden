import type { SitePlant } from '../../domain/site-plant.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IElementRepository } from '../../repositories/interfaces/element.repository.interface.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IPlantProfileRepository } from '../../repositories/interfaces/plant-profile.repository.interface.js';
import type { ISitePlantRepository } from '../../repositories/interfaces/site-plant.repository.interface.js';
import type { NoteService } from '../notes/note.service.js';

export class SitePlantService {
  constructor(
    private readonly sitePlantRepo: ISitePlantRepository,
    private readonly elementRepo: IElementRepository,
    private readonly areaRepo: IAreaRepository,
    private readonly plantProfileRepo: IPlantProfileRepository,
    private readonly noteService: NoteService,
  ) {}

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

  async listByGarden(gardenId: string): Promise<SitePlant[]> {
    return this.sitePlantRepo.findByGardenId(gardenId);
  }

  async create(
    gardenId: string,
    userId: string,
    body: {
      elementId: string;
      plantProfileId?: string | null;
      plantName?: string;
      establishedDate: Date | null;
      notes: string | null;
    },
  ): Promise<SitePlant> {
    await this.assertElementInGarden(gardenId, body.elementId);

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

    return this.sitePlantRepo.create({
      gardenId,
      elementId: body.elementId,
      plantProfileId,
      plantName,
      establishedDate: body.establishedDate,
      notes: body.notes,
      createdBy: userId,
    });
  }

  async update(
    gardenId: string,
    userId: string,
    sitePlantId: string,
    patch: Partial<{
      elementId: string;
      plantProfileId: string | null;
      plantName: string;
      establishedDate: Date | null;
      notes: string | null;
    }>,
  ): Promise<SitePlant> {
    const current = await this.sitePlantRepo.findById(sitePlantId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Site plant not found', 'Not Found');
    }

    const nextElementId = patch.elementId !== undefined ? patch.elementId : current.elementId;
    await this.assertElementInGarden(gardenId, nextElementId);

    let plantName = patch.plantName !== undefined ? patch.plantName.trim() : current.plantName;
    const plantProfileId =
      patch.plantProfileId !== undefined ? patch.plantProfileId : current.plantProfileId;
    if (patch.plantProfileId !== undefined && patch.plantProfileId) {
      const profile = await this.plantProfileRepo.findById(patch.plantProfileId);
      if (!profile || profile.userId !== userId) {
        throw new HttpError(404, 'Plant profile not found', 'Not Found');
      }
      plantName = profile.name;
    }

    const updated = await this.sitePlantRepo.update(sitePlantId, {
      ...patch,
      plantName,
      plantProfileId,
    });
    if (!updated) {
      throw new HttpError(404, 'Site plant not found', 'Not Found');
    }
    return updated;
  }

  async delete(gardenId: string, sitePlantId: string): Promise<void> {
    const current = await this.sitePlantRepo.findById(sitePlantId);
    if (!current || current.gardenId !== gardenId) {
      throw new HttpError(404, 'Site plant not found', 'Not Found');
    }
    await this.noteService.deleteAllNotesForTarget(gardenId, 'site_plant', sitePlantId);
    const ok = await this.sitePlantRepo.delete(sitePlantId);
    if (!ok) {
      throw new HttpError(404, 'Site plant not found', 'Not Found');
    }
  }
}
