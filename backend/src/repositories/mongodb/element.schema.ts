import mongoose from 'mongoose';
import { ELEMENT_TYPES } from '../../domain/element.js';

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

const elementSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    areaId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: [...ELEMENT_TYPES], required: true },
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

elementSchema.index({ areaId: 1 });

export type ElementDoc = mongoose.InferSchemaType<typeof elementSchema> & { _id: string };

export const ElementModel =
  (mongoose.models.Element as mongoose.Model<ElementDoc>) ??
  mongoose.model<ElementDoc>('Element', elementSchema);
