import mongoose from 'mongoose';
import { TASK_AUTO_KINDS, TASK_SOURCES, TASK_STATUSES } from '../../domain/task.js';

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    gardenId: { type: String, required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    plantingId: { type: String, default: null },
    areaId: { type: String, default: null },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true },
    source: { type: String, enum: [...TASK_SOURCES], required: true },
    status: { type: String, enum: [...TASK_STATUSES], required: true, default: 'pending' },
    completedAt: { type: Date, default: null },
    completedBy: { type: String, default: null },
    linkedLogId: { type: String, default: null },
    autoKind: { type: String, enum: [...TASK_AUTO_KINDS], default: null },
  },
  { _id: false, timestamps: true },
);

taskSchema.index({ gardenId: 1, seasonId: 1, status: 1, dueDate: 1 });
taskSchema.index({ plantingId: 1 });

export type TaskDoc = mongoose.InferSchemaType<typeof taskSchema> & { _id: string };

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<TaskDoc>) ?? mongoose.model<TaskDoc>('Task', taskSchema);
