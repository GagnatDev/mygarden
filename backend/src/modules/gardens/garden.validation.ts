import { z } from 'zod';

export const createGardenBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
});

export const patchGardenBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
