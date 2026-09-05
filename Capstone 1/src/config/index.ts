import { z } from 'zod';

/**
 * Centralized configuration schema with Zod validation.
 * All environment variables are validated at startup.
 */
export const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Mailpit
  MAILPIT_HOST: z.string().default('localhost'),
  MAILPIT_PORT: z.coerce.number().int().positive().default(1025),
  MAILPIT_HTTP_PORT: z.coerce.number().int().positive().default(8025),
  MAILPIT_FROM: z.string().email().default('noreply@widget.local'),

  // Submission Limits
  SUBMISSION_MAX_BYTES: z.coerce.number().int().positive().default(51200),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(30000),

  // Geo Enrichment
  GEO_PROVIDER_A_URL: z.string().url().default('http://ip-api.com/json/'),
  GEO_PROVIDER_B_URL: z.string().url().default('https://ipapi.co/json/'),
  GEO_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  GEO_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().int().positive().default(3),
  GEO_CIRCUIT_BREAKER_RESET_MS: z.coerce.number().int().positive().default(60000),

  // Mock toggles for deterministic testing
  MOCK_GEO_FAILURE_A: z.coerce.boolean().default(false),
  MOCK_GEO_FAILURE_ALL: z.coerce.boolean().default(false),

  // Widget Cache
  WIDGET_CONFIG_CACHE_MAX_AGE: z.coerce.number().int().positive().default(60),
  WIDGET_JS_CACHE_MAX_AGE: z.coerce.number().int().positive().default(31536000),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Parsed and validated configuration.
 * Throws on invalid configuration at startup.
 */
let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      console.error('❌ Invalid configuration:', JSON.stringify(errors, null, 2));
      process.exit(1);
    }
    config = result.data;
  }
  return config;
}

/**
 * Reset config for testing purposes.
 */
export function resetConfig(): void {
  config = null;
}