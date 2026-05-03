import mongoose from 'mongoose';

const gardenSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true },
  },
  {
    _id: false,
    timestamps: true,
  },
);

gardenSchema.index({ createdBy: 1 });

export type GardenDoc = mongoose.InferSchemaType<typeof gardenSchema> & { _id: string };

export const GardenModel =
  (mongoose.models.Garden as mongoose.Model<GardenDoc>) ??
  mongoose.model<GardenDoc>('Garden', gardenSchema);
