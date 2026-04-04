import { z } from 'zod';

export const createAllowedEmailBodySchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export type CreateAllowedEmailBody = z.infer<typeof createAllowedEmailBodySchema>;
