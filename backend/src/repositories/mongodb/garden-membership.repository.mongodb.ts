import { v4 as uuidv4 } from 'uuid';
import type { GardenMembership, GardenRole } from '../../domain/garden-membership.js';
import type {
  CreateGardenMembershipInput,
  IGardenMembershipRepository,
} from '../interfaces/garden-membership.repository.interface.js';
import type { WithMongoSession } from '../mongo-session.js';
import type { GardenMembershipDoc } from './garden-membership.schema.js';
import { GardenMembershipModel } from './garden-membership.schema.js';

function toMembership(doc: GardenMembershipDoc): GardenMembership {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    userId: doc.userId,
    role: doc.role as GardenRole,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class GardenMembershipRepositoryMongo implements IGardenMembershipRepository {
  async create(input: CreateGardenMembershipInput): Promise<GardenMembership> {
    const id = uuidv4();
    const doc = await GardenMembershipModel.create({
      _id: id,
      gardenId: input.gardenId,
      userId: input.userId,
      role: input.role,
    });
    return toMembership(doc.toObject() as GardenMembershipDoc);
  }

  async findByUserAndGarden(userId: string, gardenId: string): Promise<GardenMembership | null> {
    const doc = await GardenMembershipModel.findOne({ userId, gardenId }).lean();
    if (!doc) return null;
    return toMembership(doc as GardenMembershipDoc);
  }

  async findByUserId(userId: string): Promise<GardenMembership[]> {
    const docs = await GardenMembershipModel.find({ userId }).lean();
    return (docs as GardenMembershipDoc[]).map(toMembership);
  }

  async findByGardenId(gardenId: string): Promise<GardenMembership[]> {
    const docs = await GardenMembershipModel.find({ gardenId }).lean();
    return (docs as GardenMembershipDoc[]).map(toMembership);
  }

  async deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number> {
    const res = await GardenMembershipModel.deleteMany({ gardenId }, { session: options?.session });
    return res.deletedCount ?? 0;
  }
}
