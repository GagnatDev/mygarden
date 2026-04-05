import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, required: true, default: false },
  },
  {
    _id: false,
    timestamps: true,
  },
);

seasonSchema.index({ gardenId: 1 });
seasonSchema.index({ gardenId: 1, name: 1 }, { unique: true });

export type SeasonDoc = mongoose.InferSchemaType<typeof seasonSchema> & { _id: string };

export const SeasonModel =
  (mongoose.models.Season as mongoose.Model<SeasonDoc>) ??
  mongoose.model<SeasonDoc>('Season', seasonSchema);
