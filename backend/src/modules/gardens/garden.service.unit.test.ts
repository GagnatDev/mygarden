import { describe, expect, it, vi } from 'vitest';
import type { Garden } from '../../domain/garden.js';
import type { GardenMembership } from '../../domain/garden-membership.js';
import { GardenService } from './garden.service.js';

function createService() {
  const gardenRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const membershipRepo = {
    create: vi.fn(),
    findByUserAndGarden: vi.fn(),
    findByUserId: vi.fn(),
    findByGardenId: vi.fn(),
    deleteByGardenId: vi.fn(),
  };
  const service = new GardenService(
    gardenRepo as any,
    membershipRepo as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenId: vi.fn(), findActiveByGardenId: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByGardenId: vi.fn(), deactivateAllInGarden: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenId: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByGardenId: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByAreaId: vi.fn(), findByAreaIds: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByAreaId: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenAndSeason: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByGardenId: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenSeason: vi.fn(), deleteAutoTasksByPlantingId: vi.fn(), deleteAllTasksByPlantingId: vi.fn(), deleteByGardenId: vi.fn(), update: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenSeason: vi.fn(), deleteByGardenId: vi.fn(), update: vi.fn() } as any,
    { create: vi.fn(), findById: vi.fn(), findByGardenSeason: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteByGardenId: vi.fn() } as any,
    { putObject: vi.fn(), deleteObject: vi.fn(), getObject: vi.fn() } as any,
  );
  return { service, gardenRepo, membershipRepo };
}

function fixtureMembership(partial?: Partial<GardenMembership>): GardenMembership {
  return {
    id: 'mem-1',
    gardenId: 'garden-1',
    userId: 'user-1',
    role: 'owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...partial,
  };
}

function fixtureGarden(partial?: Partial<Garden>): Garden {
  return {
    id: 'garden-1',
    name: 'Backyard',
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...partial,
  };
}

describe('GardenService (unit)', () => {
  it('getForMembership fetches garden without re-querying membership', async () => {
    const { service, gardenRepo, membershipRepo } = createService();
    gardenRepo.findById.mockResolvedValue(fixtureGarden());

    const result = await service.getForMembership('garden-1', fixtureMembership());

    expect(result.id).toBe('garden-1');
    expect(gardenRepo.findById).toHaveBeenCalledWith('garden-1');
    expect(membershipRepo.findByUserAndGarden).not.toHaveBeenCalled();
  });

  it('updateForMembership enforces gardenId consistency', async () => {
    const { service, membershipRepo } = createService();

    await expect(
      service.updateForMembership('garden-1', fixtureMembership({ gardenId: 'garden-2' }), { name: 'New' }),
    ).rejects.toMatchObject({ status: 403 });
    expect(membershipRepo.findByUserAndGarden).not.toHaveBeenCalled();
  });

  it('deleteAsOwnerForMembership rejects non-owner without membership lookup', async () => {
    const { service, membershipRepo } = createService();

    await expect(
      service.deleteAsOwnerForMembership('garden-1', fixtureMembership({ role: 'member' })),
    ).rejects.toMatchObject({ status: 403 });
    expect(membershipRepo.findByUserAndGarden).not.toHaveBeenCalled();
  });
});
