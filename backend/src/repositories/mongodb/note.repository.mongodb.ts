import { v4 as uuidv4 } from 'uuid';
import type { Note, NoteTargetType } from '../../domain/note.js';
import type { CreateNoteInput, INoteRepository } from '../interfaces/note.repository.interface.js';
import type { NoteDoc } from './note.schema.js';
import { NoteModel } from './note.schema.js';

function toNote(doc: NoteDoc): Note {
  return {
    id: doc._id,
    gardenId: doc.gardenId,
    seasonId: doc.seasonId,
    targetType: doc.targetType as NoteTargetType,
    targetId: doc.targetId,
    body: doc.body,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class NoteRepositoryMongo implements INoteRepository {
  async create(input: CreateNoteInput): Promise<Note> {
    const id = uuidv4();
    const doc = await NoteModel.create({
      _id: id,
      gardenId: input.gardenId,
      seasonId: input.seasonId,
      targetType: input.targetType,
      targetId: input.targetId,
      body: input.body,
      createdBy: input.createdBy,
    });
    return toNote(doc.toObject() as NoteDoc);
  }

  async findById(id: string): Promise<Note | null> {
    const doc = await NoteModel.findById(id).lean();
    if (!doc) return null;
    return toNote(doc as NoteDoc);
  }

  async findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { targetType?: NoteTargetType; targetId?: string },
  ): Promise<Note[]> {
    const q: Record<string, unknown> = { gardenId, seasonId };
    if (filters?.targetType) q.targetType = filters.targetType;
    if (filters?.targetId) q.targetId = filters.targetId;
    const docs = await NoteModel.find(q).sort({ updatedAt: -1 }).lean();
    return (docs as NoteDoc[]).map(toNote);
  }

  async update(id: string, patch: Partial<Pick<Note, 'body' | 'updatedAt'>>): Promise<Note | null> {
    const doc = await NoteModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!doc) return null;
    return toNote(doc as NoteDoc);
  }

  async delete(id: string): Promise<boolean> {
    const res = await NoteModel.deleteOne({ _id: id });
    return res.deletedCount === 1;
  }

  async deleteByGardenId(gardenId: string): Promise<number> {
    const res = await NoteModel.deleteMany({ gardenId });
    return res.deletedCount ?? 0;
  }
}
