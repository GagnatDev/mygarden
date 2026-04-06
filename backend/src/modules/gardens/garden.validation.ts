import { z } from 'zod';

const CELL_SIZE_EPS = 1e-6;

const cellSizeMetersField = z.coerce
  .number()
  .min(0.1)
  .max(1)
  .refine(
    (v) => Math.abs(Math.round(v * 10) / 10 - v) < CELL_SIZE_EPS,
    { message: 'cellSizeMeters must be in 0.1 m steps' },
  );

export const createGardenBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  gridWidth: z.coerce.number().int().min(1).max(200),
  gridHeight: z.coerce.number().int().min(1).max(200),
  cellSizeMeters: cellSizeMetersField,
});

export const patchGardenBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    gridWidth: z.coerce.number().int().min(1).max(200).optional(),
    gridHeight: z.coerce.number().int().min(1).max(200).optional(),
    cellSizeMeters: cellSizeMetersField.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
