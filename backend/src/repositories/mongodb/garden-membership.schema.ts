import mongoose from 'mongoose';

const gardenMembershipSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ['owner', 'member'], required: true },
  },
  {
    _id: false,
    timestamps: true,
  },
);

gardenMembershipSchema.index({ gardenId: 1, userId: 1 }, { unique: true });
gardenMembershipSchema.index({ userId: 1 });
gardenMembershipSchema.index({ gardenId: 1 });

export type GardenMembershipDoc = mongoose.InferSchemaType<typeof gardenMembershipSchema> & {
  _id: string;
};

export const GardenMembershipModel =
  (mongoose.models.GardenMembership as mongoose.Model<GardenMembershipDoc>) ??
  mongoose.model<GardenMembershipDoc>('GardenMembership', gardenMembershipSchema);
