import type { Note, NoteTargetType } from '../../domain/note.js';

export interface CreateNoteInput {
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  body: string;
  createdBy: string;
}

export interface INoteRepository {
  create(input: CreateNoteInput): Promise<Note>;
  findById(id: string): Promise<Note | null>;
  findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { targetType?: NoteTargetType; targetId?: string },
  ): Promise<Note[]>;
  update(id: string, patch: Partial<Pick<Note, 'body' | 'updatedAt'>>): Promise<Note | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string): Promise<number>;
}
