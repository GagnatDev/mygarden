import mongoose from 'mongoose';
import { AREA_TYPES } from '../../domain/area.js';

const shapeSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['rectangle', 'polygon', 'path'], required: true },
    vertices: {
      type: [{ x: { type: Number, required: true }, y: { type: Number, required: true } }],
      required: false,
    },
    d: { type: String, required: false, trim: true },
  },
  { _id: false },
);

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
    shape: { type: shapeSchema, required: false },
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
