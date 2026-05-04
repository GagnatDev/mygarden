import { z } from 'zod';
import { TASK_STATUSES } from '../../domain/task.js';

const dateField = z.union([z.coerce.date(), z.string().datetime()]).transform((v) => new Date(v));

export const createManualTaskBodySchema = z.object({
  seasonId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required'),
  dueDate: dateField,
  areaId: z.string().uuid().nullish(),
  elementId: z.string().uuid().nullish(),
});

export const patchTaskBodySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  title: z.string().trim().min(1).optional(),
  dueDate: dateField.optional(),
  createLinkedLog: z.boolean().optional(),
});
