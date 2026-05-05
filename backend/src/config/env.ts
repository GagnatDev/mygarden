import { z } from 'zod';
import { isCompactDuration } from '../lib/compact-duration.js';

const compactDurationError =
  'Must be a compact duration: digits followed by s, m, h, or d (e.g. 15m, 24h, 7d).';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES: z
    .string()
    .default('15m')
    .refine(isCompactDuration, { message: `ACCESS_TOKEN_EXPIRES: ${compactDurationError}` }),
  REFRESH_TOKEN_EXPIRES: z
    .string()
    .default('7d')
    .refine(isCompactDuration, { message: `REFRESH_TOKEN_EXPIRES: ${compactDurationError}` }),
  ADMIN_EMAIL: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : undefined)),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  S3_ENDPOINT: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  S3_REGION: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  S3_BUCKET: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  S3_ACCESS_KEY_ID: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  S3_SECRET_ACCESS_KEY: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive().optional(),
  AUTH_RATE_LIMIT_LOGOUT_MAX: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(overrides?: Record<string, string | undefined>): Env {
  const source = { ...process.env, ...overrides };
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(detail)}`);
  }
  return parsed.data;
}
