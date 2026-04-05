import { z } from 'zod';
import { PLANT_PROFILE_TYPES } from '../../domain/plant-profile.js';

export const createPlantProfileBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(PLANT_PROFILE_TYPES),
  notes: z.string().nullable().optional(),
});

export const patchPlantProfileBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(PLANT_PROFILE_TYPES).optional(),
  notes: z.string().nullable().optional(),
});
