import mongoose from 'mongoose';
import { NOTE_TARGET_TYPES } from '../../domain/note.js';

const noteSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    targetType: { type: String, enum: [...NOTE_TARGET_TYPES], required: true },
    targetId: { type: String, required: true },
    body: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { _id: false, timestamps: true },
);

noteSchema.index({ gardenId: 1, seasonId: 1, targetType: 1, targetId: 1 });

export type NoteDoc = mongoose.InferSchemaType<typeof noteSchema> & { _id: string };

export const NoteModel =
  (mongoose.models.Note as mongoose.Model<NoteDoc>) ??
  mongoose.model<NoteDoc>('Note', noteSchema);
