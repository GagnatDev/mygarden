import mongoose from 'mongoose';

const areaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    gridWidth: { type: Number, required: true, min: 1 },
    gridHeight: { type: Number, required: true, min: 1 },
    cellSizeMeters: { type: Number, required: true, min: 0.1, max: 1 },
    sortIndex: { type: Number, required: true, default: 0 },
    backgroundImageKey: { type: String, required: false },
  },
  {
    _id: false,
    timestamps: true,
  },
);

areaSchema.index({ gardenId: 1, sortIndex: 1 });

export type AreaDoc = mongoose.InferSchemaType<typeof areaSchema> & { _id: string };

export const AreaModel =
  (mongoose.models.Area as mongoose.Model<AreaDoc>) ?? mongoose.model<AreaDoc>('Area', areaSchema);
