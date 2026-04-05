import mongoose from 'mongoose';
import { AREA_TYPES } from '../../domain/area.js';

const areaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: [...AREA_TYPES], required: true },
    color: { type: String, required: true, trim: true },
    gridX: { type: Number, required: true, min: 0 },
    gridY: { type: Number, required: true, min: 0 },
    gridWidth: { type: Number, required: true, min: 1 },
    gridHeight: { type: Number, required: true, min: 1 },
  },
  {
    _id: false,
    timestamps: true,
  },
);

areaSchema.index({ gardenId: 1 });

export type AreaDoc = mongoose.InferSchemaType<typeof areaSchema> & { _id: string };

export const AreaModel =
  (mongoose.models.Area as mongoose.Model<AreaDoc>) ?? mongoose.model<AreaDoc>('Area', areaSchema);
