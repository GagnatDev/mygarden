import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    language: { type: String, enum: ['nb', 'en'], default: 'nb' },
    refreshJti: { type: String, default: null },
  },
  {
    _id: false,
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDoc = mongoose.InferSchemaType<typeof userSchema> & { _id: string };

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ??
  mongoose.model<UserDoc>('User', userSchema);
