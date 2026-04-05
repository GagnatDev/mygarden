import { z } from 'zod';
import { AREA_TYPES } from '../../domain/area.js';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Color must be a hex code like #aabbcc');

export const createAreaBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(AREA_TYPES),
  color: hexColor,
  gridX: z.coerce.number().int().min(0),
  gridY: z.coerce.number().int().min(0),
  gridWidth: z.coerce.number().int().min(1),
  gridHeight: z.coerce.number().int().min(1),
});

export const patchAreaBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    type: z.enum(AREA_TYPES).optional(),
    color: hexColor.optional(),
    gridX: z.coerce.number().int().min(0).optional(),
    gridY: z.coerce.number().int().min(0).optional(),
    gridWidth: z.coerce.number().int().min(1).optional(),
    gridHeight: z.coerce.number().int().min(1).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
