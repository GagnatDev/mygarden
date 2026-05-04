import type { PlantProfile } from '../../domain/plant-profile.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IPlantProfileRepository } from '../../repositories/interfaces/plant-profile.repository.interface.js';
import type { IFileStorageService } from '../../services/file-storage/file-storage.interface.js';

export class PlantProfileService {
  constructor(
    private readonly plantProfileRepo: IPlantProfileRepository,
    private readonly storage: IFileStorageService,
  ) {}

  async listForUser(userId: string): Promise<PlantProfile[]> {
    return this.plantProfileRepo.findByUserId(userId);
  }

  async createForUser(
    userId: string,
    input: { name: string; type: PlantProfile['type']; notes: string | null },
  ): Promise<PlantProfile> {
    return this.plantProfileRepo.create({
      userId,
      name: input.name,
      type: input.type,
      notes: input.notes,
    });
  }

  async updateForUser(
    userId: string,
    profileId: string,
    patch: Partial<Pick<PlantProfile, 'name' | 'type' | 'notes'>>,
  ): Promise<PlantProfile> {
    const updated = await this.plantProfileRepo.update(profileId, userId, patch);
    if (!updated) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    return updated;
  }

  async deleteForUser(userId: string, profileId: string): Promise<void> {
    const existing = await this.plantProfileRepo.findById(profileId);
    if (!existing || existing.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    const ok = await this.plantProfileRepo.delete(profileId, userId);
    if (!ok) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    await Promise.all(
      existing.images.map((image) =>
        this.storage.deleteObject(image.objectKey).catch(() => {
          /* best-effort */
        }),
      ),
    );
  }

  async getForUser(userId: string, profileId: string): Promise<PlantProfile> {
    const p = await this.plantProfileRepo.findById(profileId);
    if (!p || p.userId !== userId) {
      throw new HttpError(404, 'Plant profile not found', 'Not Found');
    }
    return p;
  }
}
