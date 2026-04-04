import { z } from 'zod';

export const patchMeBodySchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    language: z.enum(['nb', 'en']).optional(),
  })
  .strict()
  .refine((o) => o.displayName !== undefined || o.language !== undefined, {
    message: 'At least one of displayName or language is required',
  });

export type PatchMeBody = z.infer<typeof patchMeBodySchema>;
