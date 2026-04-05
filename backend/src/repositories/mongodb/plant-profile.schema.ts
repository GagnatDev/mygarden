import mongoose from 'mongoose';
import { PLANT_PROFILE_TYPES } from '../../domain/plant-profile.js';

const plantProfileSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: [...PLANT_PROFILE_TYPES], required: true },
    notes: { type: String, default: null },
  },
  { _id: false, timestamps: true },
);

plantProfileSchema.index({ userId: 1, name: 1 });

export type PlantProfileDoc = mongoose.InferSchemaType<typeof plantProfileSchema> & { _id: string };

export const PlantProfileModel =
  (mongoose.models.PlantProfile as mongoose.Model<PlantProfileDoc>) ??
  mongoose.model<PlantProfileDoc>('PlantProfile', plantProfileSchema);
