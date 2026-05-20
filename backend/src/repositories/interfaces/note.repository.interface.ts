import type { Note, NotePhoto, NoteTargetType } from '../../domain/note.js';
import type { WithMongoSession } from '../mongo-session.js';

export interface CreateNoteInput {
  gardenId: string;
  seasonId: string;
  targetType: NoteTargetType;
  targetId: string;
  body: string;
  createdBy: string;
}

export interface SetNotePhotoInput {
  noteId: string;
  photo: NotePhoto | null;
}

export interface INoteRepository {
  create(input: CreateNoteInput): Promise<Note>;
  findById(id: string): Promise<Note | null>;
  findByGardenSeason(
    gardenId: string,
    seasonId: string,
    filters?: { targetType?: NoteTargetType; targetId?: string },
  ): Promise<Note[]>;
  findByGardenAndTarget(
    gardenId: string,
    targetType: NoteTargetType,
    targetId: string,
  ): Promise<Note[]>;
  deleteByGardenAndTarget(
    gardenId: string,
    targetType: NoteTargetType,
    targetId: string,
    options?: WithMongoSession,
  ): Promise<number>;
  update(id: string, patch: Partial<Pick<Note, 'body' | 'updatedAt'>>): Promise<Note | null>;
  setPhoto(input: SetNotePhotoInput): Promise<Note | null>;
  delete(id: string): Promise<boolean>;
  deleteByGardenId(gardenId: string, options?: WithMongoSession): Promise<number>;
}
