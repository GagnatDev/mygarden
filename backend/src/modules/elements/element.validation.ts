import { z } from 'zod';
import { ELEMENT_TYPES } from '../../domain/element.js';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Color must be a hex code like #aabbcc');

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const shapeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rectangle') }),
  z.object({ kind: z.literal('polygon'), vertices: z.array(pointSchema).min(3).max(256) }),
  z.object({ kind: z.literal('path'), d: z.string().trim().min(1).max(50_000) }),
]);

export const createElementBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(ELEMENT_TYPES),
  color: hexColor,
  gridX: z.coerce.number().int().min(0),
  gridY: z.coerce.number().int().min(0),
  gridWidth: z.coerce.number().int().min(1),
  gridHeight: z.coerce.number().int().min(1),
  shape: shapeSchema.optional(),
});

export const patchElementBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    type: z.enum(ELEMENT_TYPES).optional(),
    color: hexColor.optional(),
    gridX: z.coerce.number().int().min(0).optional(),
    gridY: z.coerce.number().int().min(0).optional(),
    gridWidth: z.coerce.number().int().min(1).optional(),
    gridHeight: z.coerce.number().int().min(1).optional(),
    shape: shapeSchema.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
