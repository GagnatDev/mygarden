import { v4 as uuidv4 } from 'uuid';
import type { AllowedEmail } from '../../domain/allowed-email.js';
import type {
  CreateAllowedEmailInput,
  IAllowedEmailRepository,
} from '../interfaces/allowed-email.repository.interface.js';
import type { AllowedEmailDoc } from './allowed-email.schema.js';
import { AllowedEmailModel } from './allowed-email.schema.js';

function toAllowedEmail(doc: AllowedEmailDoc): AllowedEmail {
  return {
    id: doc._id,
    email: doc.email,
    addedBy: doc.addedBy ?? null,
    registeredAt: doc.registeredAt ?? null,
    createdAt: doc.createdAt,
  };
}

export class AllowedEmailRepositoryMongo implements IAllowedEmailRepository {
  async findByEmail(email: string): Promise<AllowedEmail | null> {
    const doc = await AllowedEmailModel.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!doc) return null;
    return toAllowedEmail(doc as AllowedEmailDoc);
  }

  async findById(id: string): Promise<AllowedEmail | null> {
    const doc = await AllowedEmailModel.findById(id).lean();
    if (!doc) return null;
    return toAllowedEmail(doc as AllowedEmailDoc);
  }

  async create(input: CreateAllowedEmailInput): Promise<AllowedEmail> {
    const id = uuidv4();
    const doc = await AllowedEmailModel.create({
      _id: id,
      email: input.email.toLowerCase().trim(),
      addedBy: input.addedBy ?? null,
      registeredAt: null,
    });
    const lean = doc.toObject();
    return toAllowedEmail(lean as AllowedEmailDoc);
  }

  async deleteById(id: string): Promise<boolean> {
    const res = await AllowedEmailModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  }

  async list(): Promise<AllowedEmail[]> {
    const docs = await AllowedEmailModel.find().sort({ createdAt: 1 }).lean();
    return docs.map((d) => toAllowedEmail(d as AllowedEmailDoc));
  }

  async markRegistered(email: string, registeredAt: Date): Promise<void> {
    await AllowedEmailModel.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { registeredAt } },
    );
  }
}
