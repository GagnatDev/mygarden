import mongoose from 'mongoose';

const sitePlantSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true, index: true },
    elementId: { type: String, required: true, index: true },
    plantProfileId: { type: String, default: null },
    plantName: { type: String, required: true, trim: true },
    establishedDate: { type: Date, default: null },
    notes: { type: String, default: null },
    createdBy: { type: String, required: true },
  },
  {
    _id: false,
    timestamps: true,
  },
);

sitePlantSchema.index({ gardenId: 1, elementId: 1 });

export type SitePlantDoc = mongoose.InferSchemaType<typeof sitePlantSchema> & { _id: string };

export const SitePlantModel =
  (mongoose.models.SitePlant as mongoose.Model<SitePlantDoc>) ??
  mongoose.model<SitePlantDoc>('SitePlant', sitePlantSchema);
