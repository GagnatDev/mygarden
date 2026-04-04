import mongoose from 'mongoose';

const allowedEmailSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    addedBy: { type: String, default: null },
    registeredAt: { type: Date, default: null },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
  },
);

allowedEmailSchema.index({ email: 1 }, { unique: true });

export type AllowedEmailDoc = mongoose.InferSchemaType<typeof allowedEmailSchema> & {
  _id: string;
};

export const AllowedEmailModel =
  (mongoose.models.AllowedEmail as mongoose.Model<AllowedEmailDoc>) ??
  mongoose.model<AllowedEmailDoc>('AllowedEmail', allowedEmailSchema);
