import { z } from 'zod';

const CELL_SIZE_EPS = 1e-6;

const cellSizeMetersField = z.coerce
  .number()
  .min(0.1)
  .max(1)
  .refine((v) => Math.abs(Math.round(v * 10) / 10 - v) < CELL_SIZE_EPS, {
    message: 'cellSizeMeters must be in 0.1 m steps',
  });

export const createAreaBodySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  gridWidth: z.coerce.number().int().min(1).max(200),
  gridHeight: z.coerce.number().int().min(1).max(200),
  cellSizeMeters: cellSizeMetersField,
  sortIndex: z.coerce.number().int().min(0).optional(),
});

export const patchAreaBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    gridWidth: z.coerce.number().int().min(1).max(200).optional(),
    gridHeight: z.coerce.number().int().min(1).max(200).optional(),
    cellSizeMeters: cellSizeMetersField.optional(),
    sortIndex: z.coerce.number().int().min(0).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
