/**
 * Centralized, validated environment access.
 * Import `env` everywhere instead of reading `process.env` directly so a missing
 * required variable fails loudly at boot rather than silently at runtime.
 */
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_NAME: z.string().default('PayCore'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),

  FIELD_ENCRYPTION_KEY: z.string().min(16, 'FIELD_ENCRYPTION_KEY is required'),

  REDIS_URL: z.string().optional(),

  SEED_COMPANY_NAME: z.string().default('Acme Corp Pvt Ltd'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@paycore.local'),
  SEED_ADMIN_PASSWORD: z.string().default('ChangeMe@123'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // Throwing here surfaces config problems at server start, not mid-request.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
