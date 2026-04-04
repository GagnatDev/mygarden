import { v4 as uuidv4 } from 'uuid';
import type { User } from '../../domain/user.js';
import type {
  CreateUserInput,
  IUserRepository,
} from '../interfaces/user.repository.interface.js';
import type { UserDoc } from './user.schema.js';
import { UserModel } from './user.schema.js';

function toUser(doc: UserDoc): User {
  return {
    id: doc._id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    displayName: doc.displayName,
    language: doc.language as User['language'],
    refreshJti: doc.refreshJti ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class UserRepositoryMongo implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id).lean();
    if (!doc) return null;
    return toUser(doc as UserDoc);
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!doc) return null;
    return toUser(doc as UserDoc);
  }

  async findOldestUser(): Promise<User | null> {
    const doc = await UserModel.findOne().sort({ createdAt: 1 }).limit(1).lean();
    if (!doc) return null;
    return toUser(doc as UserDoc);
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const doc = await UserModel.create({
      _id: id,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      language: input.language ?? 'nb',
      refreshJti: null,
    });
    const lean = doc.toObject();
    return toUser(lean as UserDoc);
  }

  async update(
    id: string,
    patch: Partial<Pick<User, 'displayName' | 'language' | 'passwordHash' | 'refreshJti'>>,
  ): Promise<User | null> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) return null;
    return toUser(doc as UserDoc);
  }
}
