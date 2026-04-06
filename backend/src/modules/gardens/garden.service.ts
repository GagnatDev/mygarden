import type { Garden } from '../../domain/garden.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IActivityLogRepository } from '../../repositories/interfaces/activity-log.repository.interface.js';
import type { INoteRepository } from '../../repositories/interfaces/note.repository.interface.js';
import type { IAreaRepository } from '../../repositories/interfaces/area.repository.interface.js';
import type { IGardenMembershipRepository } from '../../repositories/interfaces/garden-membership.repository.interface.js';
import type { IGardenRepository } from '../../repositories/interfaces/garden.repository.interface.js';
import type { IPlantingRepository } from '../../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../../repositories/interfaces/season.repository.interface.js';
import type { ITaskRepository } from '../../repositories/interfaces/task.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

export interface CreateGardenDto {
  name: string;
  gridWidth: number;
  gridHeight: number;
  cellSizeMeters: number;
}

export class GardenService {
  constructor(
    private readonly gardenRepo: IGardenRepository,
    private readonly membershipRepo: IGardenMembershipRepository,
    private readonly seasonRepo: ISeasonRepository,
    private readonly areaRepo: IAreaRepository,
    private readonly plantingRepo: IPlantingRepository,
    private readonly taskRepo: ITaskRepository,
    private readonly activityLogRepo: IActivityLogRepository,
    private readonly noteRepo: INoteRepository,
    private readonly fileStorage: IFileStorageService,
  ) {}

  async listForUser(userId: string): Promise<Garden[]> {
    const memberships = await this.membershipRepo.findByUserId(userId);
    const ids = [...new Set(memberships.map((m) => m.gardenId))];
    const gardens = await this.gardenRepo.findByIds(ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    gardens.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return gardens;
  }

  async createForUser(userId: string, dto: CreateGardenDto): Promise<Garden> {
    const garden = await this.gardenRepo.create({
      name: dto.name,
      gridWidth: dto.gridWidth,
      gridHeight: dto.gridHeight,
      cellSizeMeters: dto.cellSizeMeters,
      createdBy: userId,
    });
    await this.membershipRepo.create({
      gardenId: garden.id,
      userId,
      role: 'owner',
    });
    const year = new Date().getFullYear();
    await this.seasonRepo.deactivateAllInGarden(garden.id);
    await this.seasonRepo.create({
      gardenId: garden.id,
      name: String(year),
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
      isActive: true,
    });
    return garden;
  }

  async getForMember(gardenId: string, userId: string): Promise<Garden> {
    const m = await this.membershipRepo.findByUserAndGarden(userId, gardenId);
    if (!m) {
      throw new HttpError(403, 'You are not a member of this garden', 'Forbidden');
    }
    const garden = await this.gardenRepo.findById(gardenId);
    if (!garden) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    return garden;
  }

  async updateForMember(
    gardenId: string,
    userId: string,
    patch: Partial<Pick<Garden, 'name' | 'gridWidth' | 'gridHeight' | 'cellSizeMeters'>>,
  ): Promise<Garden> {
    await this.getForMember(gardenId, userId);
    const updated = await this.gardenRepo.update(gardenId, patch);
    if (!updated) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
    return updated;
  }

  async deleteAsOwner(gardenId: string, userId: string): Promise<void> {
    const m = await this.membershipRepo.findByUserAndGarden(userId, gardenId);
    if (!m) {
      throw new HttpError(403, 'You are not a member of this garden', 'Forbidden');
    }
    if (m.role !== 'owner') {
      throw new HttpError(403, 'Only the garden owner can delete the garden', 'Forbidden');
    }
    const garden = await this.gardenRepo.findById(gardenId);
    if (garden?.backgroundImageKey) {
      await this.fileStorage.deleteObject(garden.backgroundImageKey).catch(() => {
        /* best-effort */
      });
    }
    await this.noteRepo.deleteByGardenId(gardenId);
    await this.activityLogRepo.deleteByGardenId(gardenId);
    await this.taskRepo.deleteByGardenId(gardenId);
    await this.plantingRepo.deleteByGardenId(gardenId);
    await this.areaRepo.deleteByGardenId(gardenId);
    await this.seasonRepo.deleteByGardenId(gardenId);
    await this.membershipRepo.deleteByGardenId(gardenId);
    const ok = await this.gardenRepo.delete(gardenId);
    if (!ok) {
      throw new HttpError(404, 'Garden not found', 'Not Found');
    }
  }
}
