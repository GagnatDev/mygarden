import mongoose from 'mongoose';
import { SOWING_METHODS } from '../../domain/planting.js';

const plantingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    elementId: { type: String, default: null },
    plantProfileId: { type: String, default: null },
    plantName: { type: String, required: true, trim: true },
    sowingMethod: { type: String, enum: [...SOWING_METHODS], required: true },
    indoorSowDate: { type: Date, default: null },
    transplantDate: { type: Date, default: null },
    outdoorSowDate: { type: Date, default: null },
    harvestWindowStart: { type: Date, default: null },
    harvestWindowEnd: { type: Date, default: null },
    quantity: { type: Number, default: null },
    notes: { type: String, default: null },
    createdBy: { type: String, required: true },
  },
  { _id: false, timestamps: true },
);

plantingSchema.index({ gardenId: 1, seasonId: 1 });
plantingSchema.index({ elementId: 1 });
plantingSchema.index({ plantProfileId: 1 });

export type PlantingDoc = mongoose.InferSchemaType<typeof plantingSchema> & { _id: string };

export const PlantingModel =
  (mongoose.models.Planting as mongoose.Model<PlantingDoc>) ??
  mongoose.model<PlantingDoc>('Planting', plantingSchema);
