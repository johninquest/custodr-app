import { z } from 'zod';

/**
 * Environment schema, validated through Nest 12's Standard Schema support in
 * `@nestjs/config` (no Joi).
 *
 * Secrets are never committed. `.env` is owned by the human; this schema only
 * describes and validates what the process receives at runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default('info'),

  // Firebase is optional: when unset and NODE_ENV !== 'production', the
  // DevAuthProvider accepts the fixed bearer token below so protected routes
  // can be exercised locally without a Firebase project.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Development-only bearer token accepted by DevAuthProvider. Ignored when
  // Firebase is configured or NODE_ENV === 'production'. Owned by the human;
  // never commit a real value.
  DEV_AUTH_TOKEN: z.string().optional(),

  MAILJET_API_KEY: z.string().optional(),
  MAILJET_API_SECRET: z.string().optional(),
  MAILJET_FROM_EMAIL: z.string().email().optional(),
  MAILJET_FROM_NAME: z.string().default('Custodr'),
});

export type Env = z.infer<typeof envSchema>;
