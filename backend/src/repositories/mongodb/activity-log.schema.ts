import mongoose from 'mongoose';
import { ACTIVITY_TYPES } from '../../domain/activity-log.js';

const activityLogSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    plantingId: { type: String, default: null },
    areaId: { type: String, default: null },
    activity: { type: String, enum: [...ACTIVITY_TYPES], required: true },
    date: { type: Date, required: true },
    note: { type: String, default: null },
    quantity: { type: Number, default: null },
    createdBy: { type: String, required: true },
    clientTimestamp: { type: Date, required: true },
  },
  { _id: false, timestamps: true },
);

activityLogSchema.index({ gardenId: 1, seasonId: 1, date: -1 });
activityLogSchema.index({ plantingId: 1 });
activityLogSchema.index({ areaId: 1 });
activityLogSchema.index({ createdBy: 1 });

export type ActivityLogDoc = mongoose.InferSchemaType<typeof activityLogSchema> & { _id: string };

export const ActivityLogModel =
  (mongoose.models.ActivityLog as mongoose.Model<ActivityLogDoc>) ??
  mongoose.model<ActivityLogDoc>('ActivityLog', activityLogSchema);
